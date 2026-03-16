## Snap2GCal

Snap2GCal lets you turn screenshots and PDFs into Google Calendar events in a few clicks.

### What it does

- **Upload screenshots/PDFs** of event flyers, emails, or chat messages.
- **Extract event details** (title, date, time, location, notes) using your AWS Bedrock-powered Lambda.
- **Review and edit** the extracted fields in the UI.
- **Add to Google Calendar** via a one-click “Add to Google Calendar” button.

### Architecture

- **Frontend (`client/`)**
  - Vite + React UI
  - Google OAuth via `@react-oauth/google`
  - Protected routes:
    - `/signin` – Google sign-in page
    - `/` – main Snap2GCal dashboard (screenshot upload + event details)
  - Calls your Lambda via `VITE_API_URL`:
    - `POST /upload-url` – get S3 presigned URL
    - `POST /ingest` – ingest PDF into the RAG index
    - `POST /query-calendar` – extract calendar event fields

- **Backend (`lambda_handler.py`)**
  - AWS Lambda (container image) + Nova 2 Lite for image detail extraction
  - Ingests PDFs from S3, chunks + embeds them into a FAISS index stored back in S3.
  - Handles `/ingest`, `/query`, and `/query-calendar` routes for RAG and event extraction.

- **Local Google Calendar helper (`client/google_api_calendar.py`)**
  - CLI helper for creating events via the Google Calendar API using OAuth credentials (`client-secret.json`/`token.json`).
  - Not used by the web UI directly; the UI uses the “Add to Google Calendar” URL flow instead.

### Getting started

#### Prerequisites

- Node.js 18+ and npm
- Python 3.10+ (for Lambda/dev tooling)
- An AWS account with:
  - S3 bucket for RAG artifacts and uploads
  - Bedrock access (embedding + generation models)
- A Google Cloud project with:
  - **OAuth 2.0 Web client** for the frontend (client ID only)
  - Authorized JavaScript origin: `http://localhost:5173` (for local dev)

#### Frontend (client)

1. Install dependencies:

   ```bash
   cd client
   npm install
   ```

2. Configure environment:

   ```bash
   cp .env.example .env
   ```

   Fill in:

   ```bash
   VITE_API_URL=https://<your-lambda-or-apigw-url>
   ```

3. Start the dev server:

   ```bash
   npm run dev
   ```

   Open `http://localhost:5173`.

#### Lambda / backend

- Build and push your Lambda container image (contains `lambda_handler.py` and dependencies).
- Configure environment variables on the function:
  - `RAG_BUCKET` – S3 bucket name
  - `INDEX_PREFIX` – optional prefix (default `index/`)
  - `EMBED_MODEL_ID`, `GEN_MODEL_ID` – Bedrock model IDs
  - Any other tuning variables (`TOP_K`, `CHUNK_SIZE`, etc.).
- Expose the Lambda via **Function URL** or API Gateway and use that URL as `VITE_API_URL`.

### Google sign-in

- The frontend uses `GoogleOAuthProvider` and `GoogleLogin` from `@react-oauth/google`.
- The **client ID** must match your Google Cloud Web OAuth client.
- User information is stored in `sessionStorage` and used only for gating the protected routes and personalizing the UI.

### Add to Google Calendar

- The “Add to Google Calendar” button builds a URL like:

  `https://calendar.google.com/calendar/render?action=TEMPLATE&text=...&dates=...&location=...&details=...`

- Google opens the user’s calendar with the fields pre-filled; they can review and save the event.

### Running the local Google Calendar helper (optional)

From `client/`:

```bash
python google_api_calendar.py
```

This script uses `client-secret.json` and `token.json` to talk directly to the Google Calendar API for testing and debugging; it is **not** required for the main web flow.

