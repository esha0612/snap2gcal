import os
import re
import json
import base64
import hashlib
import uuid
from datetime import datetime
from typing import Any, Dict, List, Tuple, Optional

import boto3
from botocore.config import Config

# Native libs you must package in a container/layer
import faiss  # faiss-cpu
import numpy as np
import fitz  # PyMuPDF
from PIL import Image
import io


# =========================
# Config / Clients
# =========================
AWS_REGION = os.environ.get("AWS_REGION", "us-east-1")

S3_BUCKET = os.environ["RAG_BUCKET"]
INDEX_PREFIX = os.environ.get("INDEX_PREFIX", "index/")
UPLOAD_PREFIX = os.environ.get("UPLOAD_PREFIX", "uploads/")
PRESIGNED_EXPIRY = int(os.environ.get("PRESIGNED_EXPIRY", "3600"))  # seconds
EMBED_MODEL_ID = os.environ["EMBED_MODEL_ID"]
GEN_MODEL_ID = os.environ["GEN_MODEL_ID"]

TOP_K = int(os.environ.get("TOP_K", "5"))
CHUNK_SIZE = int(os.environ.get("CHUNK_SIZE", "800"))
CHUNK_OVERLAP = int(os.environ.get("CHUNK_OVERLAP", "150"))

# PDF multimodal controls (safe defaults for Lambda)
PDF_MAX_PAGES = int(os.environ.get("PDF_MAX_PAGES", "10"))     # render/embed only first N pages
PDF_IMAGE_DPI = int(os.environ.get("PDF_IMAGE_DPI", "120"))    # 100-150 is usually fine

LOCAL_INDEX_PATH = "/tmp/faiss.index"
LOCAL_META_PATH = "/tmp/meta.jsonl"
LOCAL_DOC_PATH = "/tmp/upload.pdf"

s3 = boto3.client(
    "s3",
    region_name=AWS_REGION,
    config=Config(signature_version="s3v4"),
)
brt = boto3.client("bedrock-runtime", region_name=AWS_REGION)


# =========================
# Utilities
# =========================
def _resp(status: int, body: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "statusCode": status,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
            "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS"
        },
        "body": json.dumps(body),
    }

def _now_iso() -> str:
    return datetime.utcnow().isoformat() + "Z"

def _sha1(s: str) -> str:
    return hashlib.sha1(s.encode("utf-8")).hexdigest()

def chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> List[str]:
    text = (text or "").replace("\r\n", "\n").strip()
    if not text:
        return []

    # paragraph split
    paras = [p.strip() for p in text.split("\n\n") if p.strip()]

    chunks = []
    cur = ""
    for p in paras:
        if len(cur) + len(p) + 2 <= chunk_size:
            cur = (cur + "\n\n" + p).strip() if cur else p
        else:
            if cur:
                chunks.append(cur)
            cur = p

    if cur:
        chunks.append(cur)

    # overlap by tail chars (simple + effective)
    if overlap > 0 and len(chunks) > 1:
        overlapped = [chunks[0]]
        for i in range(1, len(chunks)):
            prev_tail = chunks[i - 1][-overlap:]
            overlapped.append((prev_tail + "\n" + chunks[i]).strip())
        chunks = overlapped

    return chunks

def s3_key_exists(bucket: str, key: str) -> bool:
    try:
        s3.head_object(Bucket=bucket, Key=key)
        return True
    except Exception:
        return False

def download_s3_file(bucket: str, key: str, local_path: str) -> None:
    s3.download_file(bucket, key, local_path)

def upload_s3_file(local_path: str, bucket: str, key: str) -> None:
    s3.upload_file(local_path, bucket, key)

def append_meta_rows(rows: List[Dict[str, Any]]) -> None:
    with open(LOCAL_META_PATH, "a", encoding="utf-8") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")

def load_meta_rows() -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    if not os.path.exists(LOCAL_META_PATH):
        return rows
    with open(LOCAL_META_PATH, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows

def embed_text(text: str) -> List[float]:
    request_body = {
        "schemaVersion": "nova-multimodal-embed-v1",
        "taskType": "SINGLE_EMBEDDING",
        "singleEmbeddingParams": {
            "embeddingPurpose": "GENERIC_INDEX",
            "embeddingDimension": 1024,
            "text": {
                "truncationMode": "END",
                "value": text
            }
        }
    }

    r = brt.invoke_model(
        modelId=EMBED_MODEL_ID,
        body=json.dumps(request_body).encode("utf-8"),
        accept="application/json",
        contentType="application/json",
    )

    out = json.loads(r["body"].read())
    return out["embeddings"][0]["embedding"]

def embed_image_base64(image_b64: str) -> List[float]:
    request_body = {
        "schemaVersion": "nova-multimodal-embed-v1",
        "taskType": "SINGLE_EMBEDDING",
        "singleEmbeddingParams": {
            "embeddingPurpose": "GENERIC_INDEX",
            "embeddingDimension": 1024,
            "image": {
                "format": "png",
                "detailLevel": "DOCUMENT_IMAGE",
                "source": {
                    "bytes": image_b64
                }
            }
        }
    }

    r = brt.invoke_model(
        modelId=EMBED_MODEL_ID,
        body=json.dumps(request_body).encode("utf-8"),
        accept="application/json",
        contentType="application/json",
    )

    out = json.loads(r["body"].read())
    return out["embeddings"][0]["embedding"]

def generate_answer(question: str, contexts: List[Dict[str, Any]]) -> Dict[str, Any]:
    ctx_lines = []
    for i, c in enumerate(contexts):
        ctx_lines.append(
            f"[{i+1}] SOURCE={c.get('source','')} CHUNK_ID={c.get('chunk_id','')} "
            f"MODALITY={c.get('modality','text')} PAGE={c.get('page')}\n"
            f"{c.get('text','')}\n"
        )
    ctx_block = "\n".join(ctx_lines)

    user_prompt = (
        "You are a helpful assistant. Use ONLY the provided CONTEXT to answer.\n"
        "If the answer is not in the context, say: \"I don't have enough information in the provided documents.\".\n"
        "Return STRICT JSON with keys: answer, citations, confidence.\n"
        "citations must be a list of {chunk_id, source, page, modality}.\n\n"
        f"QUESTION:\n{question}\n\n"
        f"CONTEXT:\n{ctx_block}\n"
    )

    request_body = {
        "messages": [
            {
                "role": "user",
                "content": [
                    {"text": user_prompt}
                ]
            }
        ],
        "inferenceConfig": {
            "maxTokens": 600,
            "temperature": 0.2
        }
    }

    r = brt.invoke_model(
        modelId=GEN_MODEL_ID,
        body=json.dumps(request_body).encode("utf-8"),
        accept="application/json",
        contentType="application/json",
    )

    out = json.loads(r["body"].read())

    # Nova Lite response format
    content_blocks = out["output"]["message"]["content"]
    text_block = next((b for b in content_blocks if "text" in b), None)
    text_out = text_block["text"] if text_block else None

    if not text_out:
        return {"raw_model_response": out}

    try:
        return json.loads(text_out)
    except Exception:
        return {
            "answer": text_out,
            "citations": [],
            "confidence": None
        }


def generate_calendar_event(question: str, contexts: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Extract calendar event data from context and return as JSON."""
    ctx_lines = []
    for i, c in enumerate(contexts):
        ctx_lines.append(
            f"[{i+1}] SOURCE={c.get('source','')} CHUNK_ID={c.get('chunk_id','')} "
            f"MODALITY={c.get('modality','text')} PAGE={c.get('page')}\n"
            f"{c.get('text','')}\n"
        )
    ctx_block = "\n".join(ctx_lines)

    user_prompt = (
        "You are an expert at extracting event information from documents and images.\n"
        "Extract calendar event details from the provided CONTEXT. Use your best judgment to infer missing information.\n"
        "Return STRICT JSON with the following schema:\n"
        "{\n"
        "  \"title\": \"event name/title (string, required)\",\n"
        "  \"date\": \"date in ISO 8601 format or human readable format (string, required)\",\n"
        "  \"time\": \"time range or start time, e.g. '6:00 PM - 9:00 PM' (string, optional)\",\n"
        "  \"start_time\": \"start time in HH:MM format (string, optional)\",\n"
        "  \"end_time\": \"end time in HH:MM format (string, optional)\",\n"
        "  \"location\": \"venue or location name (string, optional)\",\n"
        "  \"description\": \"event description and details (string, optional)\",\n"
        "  \"notes\": \"additional notes, dress code, requirements (string, optional)\",\n"
        "  \"extracted_from\": \"source page or modality where info was found (string, optional)\"\n"
        "}\n\n"
        "Important instructions:\n"
        "- Always extract a title and date if possible\n"
        "- Resolve relative dates (e.g., 'next Friday') to actual dates when possible\n"
        "- Combine multiple pieces of information found in context\n"
        "- Return ONLY valid JSON, no additional text\n"
        "- If required fields are missing, return them as null\n\n"
        f"QUESTION:\n{question}\n\n"
        f"CONTEXT:\n{ctx_block}\n"
    )

    request_body = {
        "messages": [
            {
                "role": "user",
                "content": [
                    {"text": user_prompt}
                ]
            }
        ],
        "inferenceConfig": {
            "maxTokens": 1000,
            "temperature": 0.1
        }
    }

    r = brt.invoke_model(
        modelId=GEN_MODEL_ID,
        body=json.dumps(request_body).encode("utf-8"),
        accept="application/json",
        contentType="application/json",
    )

    out = json.loads(r["body"].read())

    # Nova Lite response format
    content_blocks = out["output"]["message"]["content"]
    text_block = next((b for b in content_blocks if "text" in b), None)
    text_out = text_block["text"] if text_block else None

    if not text_out:
        return {"error": "Failed to extract calendar event", "raw_model_response": out}

    try:
        result = json.loads(text_out)
        # Ensure required fields
        if "title" not in result:
            result["title"] = None
        if "date" not in result:
            result["date"] = None
        return result
    except Exception as e:
        return {
            "error": f"Failed to parse calendar event JSON: {str(e)}",
            "raw_response": text_out
        }


# =========================
# FAISS Index Handling
# =========================
def index_s3_key() -> str:
    return f"{INDEX_PREFIX}faiss.index"

def meta_s3_key() -> str:
    return f"{INDEX_PREFIX}meta.jsonl"

def load_or_init_index(dim: int) -> faiss.Index:
    if s3_key_exists(S3_BUCKET, index_s3_key()) and s3_key_exists(S3_BUCKET, meta_s3_key()):
        download_s3_file(S3_BUCKET, index_s3_key(), LOCAL_INDEX_PATH)
        download_s3_file(S3_BUCKET, meta_s3_key(), LOCAL_META_PATH)
        return faiss.read_index(LOCAL_INDEX_PATH)

    idx = faiss.IndexFlatL2(dim)
    open(LOCAL_META_PATH, "a", encoding="utf-8").close()
    return idx

def save_index_to_s3(idx: faiss.Index) -> None:
    faiss.write_index(idx, LOCAL_INDEX_PATH)
    upload_s3_file(LOCAL_INDEX_PATH, S3_BUCKET, index_s3_key())
    upload_s3_file(LOCAL_META_PATH, S3_BUCKET, meta_s3_key())

def add_vectors(idx: faiss.Index, vectors: List[List[float]]) -> None:
    arr = np.array(vectors, dtype="float32")
    idx.add(arr)

def search_vectors(idx: faiss.Index, query_vec: List[float], top_k: int = TOP_K) -> Tuple[List[int], List[float]]:
    q = np.array([query_vec], dtype="float32")
    D, I = idx.search(q, top_k)
    return I[0].tolist(), D[0].tolist()


# =========================
# PDF Extraction (Text + Page Images)
# =========================
def extract_pdf_text_and_page_images(
    local_pdf_path: str,
    max_pages: int = PDF_MAX_PAGES,
    dpi: int = PDF_IMAGE_DPI
) -> Tuple[str, List[Dict[str, Any]]]:
    """
    Returns:
      - combined text
      - list of {"page": int, "image_b64": str} for each rendered page
    """
    doc = fitz.open(local_pdf_path)
    pages_to_process = min(len(doc), max_pages)

    # Render scale
    zoom = dpi / 72.0
    mat = fitz.Matrix(zoom, zoom)

    texts: List[str] = []
    page_images: List[Dict[str, Any]] = []

    for i in range(pages_to_process):
        page = doc.load_page(i)

        # Text
        t = page.get_text("text") or ""
        if t.strip():
            texts.append(f"\n--- PAGE {i+1} ---\n{t}")

        # Render page image -> base64 PNG
        pix = page.get_pixmap(matrix=mat, alpha=False)
        png_bytes = pix.tobytes("png")
        page_images.append({
            "page": i + 1,
            "image_b64": base64.b64encode(png_bytes).decode("utf-8"),
        })

    doc.close()
    return ("".join(texts), page_images)


# =========================
# Handlers
# =========================
def handle_ingest(body: Dict[str, Any]) -> Dict[str, Any]:
    s3_key = body.get("s3_key")
    if not s3_key:
        return _resp(400, {"error": "Missing s3_key"})

    content_type = body.get("content_type") or "application/octet-stream"

    # Download to /tmp
    download_s3_file(S3_BUCKET, s3_key, LOCAL_DOC_PATH)

    if content_type != "application/pdf":
        return _resp(400, {"error": "This version expects PDFs. Set content_type to application/pdf."})

    pdf_text, page_images = extract_pdf_text_and_page_images(LOCAL_DOC_PATH)

    # Chunk the extracted text
    text_chunks = chunk_text(pdf_text)

    if not text_chunks and not page_images:
        return _resp(400, {"error": "No content extracted from PDF (text empty and no page images)."})

    # We need an embedding dimension to init index.
    # Prefer text chunk if available, else use first image embedding.
    if text_chunks:
        first_vec = embed_text(text_chunks[0])
    else:
        first_vec = embed_image_base64(page_images[0]["image_b64"])

    dim = len(first_vec)
    idx = load_or_init_index(dim)

    doc_id = _sha1(s3_key)

    vectors: List[List[float]] = []
    meta_rows: List[Dict[str, Any]] = []

    # We'll add vectors in one batch; track starting faiss id
    start_row = idx.ntotal

    # --- Text chunk vectors ---
    for i, ch in enumerate(text_chunks):
        vec = first_vec if (i == 0 and text_chunks and len(vectors) == 0) else embed_text(ch)
        vectors.append(vec)
        meta_rows.append({
            "faiss_id": int(start_row + len(vectors) - 1),
            "chunk_id": f"{doc_id}#text#c{i}",
            "source": f"s3://{S3_BUCKET}/{s3_key}",
            "s3_key": s3_key,
            "modality": "text",
            "page": None,
            "text": ch,
            "ingested_at": _now_iso(),
        })

    # --- Page image vectors ---
    for img in page_images:
        vec = embed_image_base64(img["image_b64"])
        vectors.append(vec)
        meta_rows.append({
            "faiss_id": int(start_row + len(vectors) - 1),
            "chunk_id": f"{doc_id}#image#p{img['page']}",
            "source": f"s3://{S3_BUCKET}/{s3_key}",
            "s3_key": s3_key,
            "modality": "image",
            "page": int(img["page"]),
            # keep a readable stub for prompts/citations
            "text": f"[Page image] {s3_key} page {img['page']}",
            "ingested_at": _now_iso(),
        })

    # Add all vectors to FAISS
    add_vectors(idx, vectors)

    # Append metadata + save
    append_meta_rows(meta_rows)
    save_index_to_s3(idx)

    return _resp(200, {
        "message": "Ingested PDF successfully",
        "s3_key": s3_key,
        "text_chunks_added": len(text_chunks),
        "page_images_added": len(page_images),
        "index_total_vectors": int(idx.ntotal),
        "pdf_pages_processed": min(PDF_MAX_PAGES, len(page_images)),
    })


def _sanitize_filename(name: str) -> str:
    """Keep alphanumeric, dots, hyphens, underscores; collapse repeated dots."""
    base = re.sub(r"[^\w.\-]", "_", (name or "file").strip())
    return re.sub(r"\.+", ".", base).strip(".") or "file"

def handle_upload_url(body: Dict[str, Any]) -> Dict[str, Any]:
    """
    Return a presigned PUT URL so the client can upload a file directly to S3.
    Body: { "filename": "doc.pdf", "content_type": "application/pdf" }
    Returns: { "upload_url": "...", "s3_key": "uploads/..." }
    """
    filename = (body.get("filename") or "").strip()
    if not filename:
        return _resp(400, {"error": "Missing filename"})

    content_type = (body.get("content_type") or "application/octet-stream").strip()
    safe_name = _sanitize_filename(filename)
    s3_key = f"{UPLOAD_PREFIX}{uuid.uuid4().hex}_{safe_name}"

    params = {"Bucket": S3_BUCKET, "Key": s3_key, "ContentType": content_type}
    upload_url = s3.generate_presigned_url(
        "put_object",
        Params=params,
        ExpiresIn=PRESIGNED_EXPIRY,
    )

    return _resp(200, {
        "upload_url": upload_url,
        "s3_key": s3_key,
        "content_type": content_type,
    })


def handle_query(body: Dict[str, Any]) -> Dict[str, Any]:
    top_k = int(body.get("top_k", TOP_K))

    if not (s3_key_exists(S3_BUCKET, index_s3_key()) and s3_key_exists(S3_BUCKET, meta_s3_key())):
        return _resp(400, {"error": "No index found. Run /ingest first."})

    # Load artifacts
    download_s3_file(S3_BUCKET, index_s3_key(), LOCAL_INDEX_PATH)
    download_s3_file(S3_BUCKET, meta_s3_key(), LOCAL_META_PATH)
    idx = faiss.read_index(LOCAL_INDEX_PATH)
    meta_rows = load_meta_rows()
    meta_by_id = {int(r["faiss_id"]): r for r in meta_rows if "faiss_id" in r}

    # Embed query (text only for now)
    qtext = body.get("text")
    if not qtext:
        return _resp(400, {"error": "Provide {\"text\": \"...\"} for query."})

    q_vec = embed_text(qtext)

    ids, dists = search_vectors(idx, q_vec, top_k=top_k)

    contexts = []
    seen = set()
    for faiss_id, dist in zip(ids, dists):
        if faiss_id is None or faiss_id < 0:
            continue
        if faiss_id in seen:
            continue
        seen.add(faiss_id)

        row = meta_by_id.get(faiss_id)
        if not row:
            continue

        contexts.append({
            "faiss_id": faiss_id,
            "distance": dist,
            "chunk_id": row.get("chunk_id"),
            "source": row.get("source"),
            "modality": row.get("modality"),
            "page": row.get("page"),
            "text": row.get("text"),
        })

    result = generate_answer(qtext, contexts)

    # If model didn't include citations, add them
    if "citations" not in result or not isinstance(result.get("citations"), list):
        result["citations"] = [{
            "chunk_id": c["chunk_id"],
            "source": c["source"],
            "page": c.get("page"),
            "modality": c.get("modality"),
        } for c in contexts]

    return _resp(200, {
        "result": result,
        "retrieval": {
            "top_k": top_k,
            "matches": [
                {
                    "chunk_id": c["chunk_id"],
                    "source": c["source"],
                    "page": c.get("page"),
                    "modality": c.get("modality"),
                    "distance": c["distance"],
                } for c in contexts
            ],
        },
    })


def handle_query_calendar(body: Dict[str, Any]) -> Dict[str, Any]:
    """Extract calendar event data from uploaded documents using RAG."""
    top_k = int(body.get("top_k", TOP_K))

    if not (s3_key_exists(S3_BUCKET, index_s3_key()) and s3_key_exists(S3_BUCKET, meta_s3_key())):
        return _resp(400, {"error": "No index found. Run /ingest first."})

    # Load artifacts
    download_s3_file(S3_BUCKET, index_s3_key(), LOCAL_INDEX_PATH)
    download_s3_file(S3_BUCKET, meta_s3_key(), LOCAL_META_PATH)
    idx = faiss.read_index(LOCAL_INDEX_PATH)
    meta_rows = load_meta_rows()
    meta_by_id = {int(r["faiss_id"]): r for r in meta_rows if "faiss_id" in r}

    # Use a generic calendar event extraction query
    qtext = body.get("text", "Extract all calendar event information including date, time, location, and title.")

    q_vec = embed_text(qtext)
    ids, dists = search_vectors(idx, q_vec, top_k=top_k)

    contexts = []
    seen = set()
    for faiss_id, dist in zip(ids, dists):
        if faiss_id is None or faiss_id < 0:
            continue
        if faiss_id in seen:
            continue
        seen.add(faiss_id)

        row = meta_by_id.get(faiss_id)
        if not row:
            continue

        contexts.append({
            "faiss_id": faiss_id,
            "distance": dist,
            "chunk_id": row.get("chunk_id"),
            "source": row.get("source"),
            "modality": row.get("modality"),
            "page": row.get("page"),
            "text": row.get("text"),
        })

    if not contexts:
        return _resp(400, {"error": "No relevant content found in the index. Please ensure the document has been ingested."})

    # Extract calendar event from contexts
    calendar_event = generate_calendar_event(qtext, contexts)

    return _resp(200, {
        "event": calendar_event,
        "retrieval": {
            "top_k": top_k,
            "matches": [
                {
                    "chunk_id": c["chunk_id"],
                    "source": c["source"],
                    "page": c.get("page"),
                    "modality": c.get("modality"),
                    "distance": c["distance"],
                } for c in contexts
            ],
        },
    })

# =========================
# Lambda entrypoint + routing
# =========================
def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    print("AWS_REGION:", AWS_REGION)
    print("EMBED_MODEL_ID:", EMBED_MODEL_ID)
    print("GEN_MODEL_ID:", GEN_MODEL_ID)
    path = event.get("rawPath") or event.get("path") or "/"
    method = (
        (event.get("requestContext", {}).get("http", {}) or {}).get("method")
        or event.get("httpMethod")
        or "GET"
    )

    body_str = event.get("body") or "{}"
    if event.get("isBase64Encoded"):
        body_str = base64.b64decode(body_str).decode("utf-8")

    try:
        body = json.loads(body_str) if isinstance(body_str, str) else (body_str or {})
    except Exception:
        return _resp(400, {"error": "Invalid JSON body"})

    if method.upper() == "OPTIONS":
        return _resp(200, {})

    if method.upper() != "POST":
        return _resp(405, {"error": "Use POST"})

    if path.endswith("/upload-url"):
        return handle_upload_url(body)
    if path.endswith("/ingest"):
        return handle_ingest(body)
    if path.endswith("/query"):
        return handle_query(body)
    if path.endswith("/query-calendar"):
        return handle_query_calendar(body)

    return _resp(404, {"error": f"Unknown route: {method} {path}", "routes": ["/upload-url", "/ingest", "/query", "/query-calendar"]})
