import React, { useState } from "react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { Upload, Image as ImageIcon, Calendar, MapPin, Clock, FileText, Edit2, Check, X, FileUp, Loader2 } from "lucide-react";

const API_BASE = (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL ?? "";

export function DemoSection() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedS3Key, setUploadedS3Key] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedContentType, setUploadedContentType] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Event details state
  const [eventDetails, setEventDetails] = useState({
    title: "Tech Startup Networking Mixer",
    date: "Friday, March 14, 2026",
    time: "6:00 PM - 9:00 PM",
    location: "Innovation Hub, Downtown",
    notes: "Bring business cards. Casual dress code."
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setShowResult(false);
    const isPdfFile = file.type === "application/pdf";
    const isTxtFile = file.type === "text/plain";
    const showFileCard = isPdfFile || isTxtFile;

    if (!API_BASE) {
      setUploadError("VITE_API_URL is not set. Configure your API URL to upload to S3.");
      return;
    }

    setIsUploading(true);
    try {
      const res = await fetch(`${API_BASE.replace(/\/$/, "")}/upload-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          content_type: file.type || (isPdfFile ? "application/pdf" : "image/png"),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Upload URL request failed: ${res.status}`);
      }
      const { upload_url, s3_key, content_type } = data;

      const putRes = await fetch(upload_url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": content_type },
      });
      if (!putRes.ok) {
        throw new Error(`S3 upload failed: ${putRes.status}`);
      }

      setUploadedS3Key(s3_key);
      setUploadedFileName(file.name);
      setUploadedContentType(content_type || file.type || null);
      setIsPdf(showFileCard);

      if (showFileCard) {
        setUploadedImage(null);
      } else {
        const reader = new FileReader();
        reader.onloadend = () => setUploadedImage(reader.result as string);
        reader.readAsDataURL(file);
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
      setUploadedImage(null);
      setUploadedS3Key(null);
      setUploadedFileName(null);
      setUploadedContentType(null);
    } finally {
      setIsUploading(false);
    }
    event.target.value = "";
  };

  const handleProcess = async () => {
    if (!uploadedS3Key) {
      setUploadError("Upload a file first before processing.");
      return;
    }

    if (!uploadedContentType || uploadedContentType !== "application/pdf") {
      setUploadError("Processing is currently only supported for PDF files.");
      return;
    }

    if (!API_BASE) {
      setUploadError("VITE_API_URL is not set. Configure your API URL to process files.");
      return;
    }

    setIsProcessing(true);
    setUploadError(null);
    setShowResult(false);

    try {
      const res = await fetch(`${API_BASE.replace(/\/$/, "")}/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          s3_key: uploadedS3Key,
          content_type: uploadedContentType,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as any).error || `Processing failed: ${res.status}`);
      }

      setShowResult(true);
      setIsEditing(false);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Failed to process document.");
      setShowResult(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(!isEditing);
  };

  const handleClearImage = () => {
    setUploadedImage(null);
    setUploadedS3Key(null);
    setUploadedFileName(null);
    setUploadedContentType(null);
    setIsPdf(false);
    setUploadError(null);
    setShowResult(false);
    setIsEditing(false);
  };

  const hasUpload = !!uploadedS3Key || !!uploadedImage;

  return (
    <div className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            See It In Action
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Experience the magic of AI-powered event scheduling
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div>
            <h3 className="mb-4 text-xl font-semibold text-gray-900">Input Source</h3>
            
            <Card className="mb-4 border-2 border-dashed border-gray-300 bg-gray-50">
              <CardContent className="flex flex-col items-center justify-center py-12">
                {uploadError && (
                  <div className="mb-4 w-full rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
                    {uploadError}
                  </div>
                )}
                {isUploading ? (
                  <div className="flex flex-col items-center gap-3 py-8">
                    <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
                    <p className="text-gray-600">Uploading to S3...</p>
                  </div>
                ) : hasUpload ? (
                  <>
                    <div className="relative w-full mb-4">
                      {uploadedImage ? (
                        <img
                          src={uploadedImage}
                          alt="Uploaded screenshot"
                          className="h-64 w-full object-cover rounded-lg"
                        />
                      ) : isPdf && uploadedFileName ? (
                        <div className="h-64 flex flex-col items-center justify-center rounded-lg bg-gray-100 border border-gray-200">
                          <FileUp className="h-16 w-16 text-gray-500 mb-2" />
                          <p className="text-sm font-medium text-gray-700 truncate max-w-full px-4">{uploadedFileName}</p>
                          <p className="text-xs text-gray-500 mt-1">Uploaded to S3</p>
                        </div>
                      ) : null}
                      <button
                        onClick={handleClearImage}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    {uploadedS3Key && (
                      <p className="text-xs text-gray-500 mb-3 font-mono truncate max-w-full" title={uploadedS3Key}>
                        S3: {uploadedS3Key}
                      </p>
                    )}
                    <Button onClick={handleProcess} disabled={isProcessing} className="bg-blue-600 hover:bg-blue-700">
                      <Upload className="mr-2 h-4 w-4" />
                      {isProcessing ? "Processing..." : "Process Screenshot"}
                    </Button>
                  </>
                ) : (
                  <>
                    <Upload className="h-16 w-16 text-gray-400 mb-4" />
                    <p className="text-gray-600 mb-4 text-center">
                      Upload any screenshot or PDF from Instagram, Slack, Email, Flyers, or Group Chats
                    </p>
                    <label htmlFor="file-upload">
                      <Button asChild className="bg-blue-600 hover:bg-blue-700 cursor-pointer">
                        <span>
                          <Upload className="mr-2 h-4 w-4" />
                          Choose File
                        </span>
                      </Button>
                    </label>
                    <input
                      id="file-upload"
                      type="file"
                      accept="image/*,.pdf,application/pdf,.txt,text/plain"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <p className="text-xs text-gray-500 mt-4">
                      Supports images (PNG, JPG, WebP, etc.), PDF, TXT
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-gray-700">
                <strong className="text-blue-900">💡 Pro Tip:</strong> Works with screenshots from any source - social media posts, email invites, event flyers, or group chat messages!
              </p>
            </div>
          </div>

          {/* Output Section */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">Extracted Event Details</h3>
              {showResult && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEdit}
                  className="gap-2"
                >
                  {isEditing ? <Check className="h-4 w-4" /> : <Edit2 className="h-4 w-4" />}
                  {isEditing ? "Done" : "Edit"}
                </Button>
              )}
            </div>
            
            <Card className={`border-2 ${showResult ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}>
              <CardContent className="py-8">
                {!showResult ? (
                  <div className="flex flex-col items-center justify-center text-center py-16">
                    <ImageIcon className="h-16 w-16 text-gray-300 mb-4" />
                    <p className="text-gray-500">Upload and process a screenshot to see extracted event details</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-start gap-3">
                        <FileText className="h-5 w-5 text-gray-600 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-500 mb-1">Event Title</p>
                          {isEditing ? (
                            <Input
                              value={eventDetails.title}
                              onChange={(e) => setEventDetails({ ...eventDetails, title: e.target.value })}
                              className="font-semibold"
                            />
                          ) : (
                            <p className="text-lg font-semibold text-gray-900">{eventDetails.title}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-start gap-3">
                        <Calendar className="h-5 w-5 text-gray-600 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-500 mb-1">Date</p>
                          {isEditing ? (
                            <Input
                              value={eventDetails.date}
                              onChange={(e) => setEventDetails({ ...eventDetails, date: e.target.value })}
                              className="font-semibold"
                            />
                          ) : (
                            <>
                              <p className="text-lg font-semibold text-gray-900">{eventDetails.date}</p>
                              <p className="text-sm text-blue-600 mt-1">✓ Resolved from "next Friday"</p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-start gap-3">
                        <Clock className="h-5 w-5 text-gray-600 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-500 mb-1">Time</p>
                          {isEditing ? (
                            <Input
                              value={eventDetails.time}
                              onChange={(e) => setEventDetails({ ...eventDetails, time: e.target.value })}
                              className="font-semibold"
                            />
                          ) : (
                            <p className="text-lg font-semibold text-gray-900">{eventDetails.time}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-start gap-3">
                        <MapPin className="h-5 w-5 text-gray-600 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-500 mb-1">Location</p>
                          {isEditing ? (
                            <Input
                              value={eventDetails.location}
                              onChange={(e) => setEventDetails({ ...eventDetails, location: e.target.value })}
                              className="font-semibold"
                            />
                          ) : (
                            <p className="text-lg font-semibold text-gray-900">{eventDetails.location}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-start gap-3">
                        <FileText className="h-5 w-5 text-gray-600 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-500 mb-1">Notes</p>
                          {isEditing ? (
                            <Textarea
                              value={eventDetails.notes}
                              onChange={(e) => setEventDetails({ ...eventDetails, notes: e.target.value })}
                              className="min-h-[80px]"
                            />
                          ) : (
                            <p className="text-gray-900">{eventDetails.notes}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <Badge className="bg-green-600 hover:bg-green-700 mb-3">No Conflicts Found</Badge>
                      <Button className="w-full bg-blue-600 hover:bg-blue-700">
                        <Calendar className="mr-2 h-4 w-4" />
                        Add to Google Calendar
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {showResult && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-900">
                  <strong>AI Insight:</strong> Detected potential traffic delay. Reminder set for 5:00 PM to leave early.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}