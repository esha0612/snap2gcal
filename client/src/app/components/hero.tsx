import { Button } from "./ui/button";
import { Upload, Sparkles } from "lucide-react";

export function Hero() {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2 text-sm">
            <Sparkles className="h-4 w-4 text-blue-600" />
            <span className="text-blue-700">Nova AI Hackathon 2026</span>
          </div>
          
          <h1 className="mb-6 text-5xl font-extrabold tracking-tight text-gray-900 sm:text-6xl">
            Never manually enter
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> events </span>
            again
          </h1>
          
          <p className="mb-10 text-lg leading-8 text-gray-600">
            AI Event Scheduler transforms screenshots into Google Calendar events instantly. 
            Just upload a photo—our AI extracts details, resolves ambiguities, and schedules it for you.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">
              <Upload className="mr-2 h-5 w-5" />
              Upload Screenshot
            </Button>
          </div>
          
          <div className="mt-10 flex items-center justify-center gap-x-6 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              <span>Supports Instagram, Slack, Email & more</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Decorative gradient blobs */}
      <div className="absolute top-0 right-0 -z-10 h-96 w-96 rounded-full bg-purple-200 opacity-20 blur-3xl"></div>
      <div className="absolute bottom-0 left-0 -z-10 h-96 w-96 rounded-full bg-blue-200 opacity-20 blur-3xl"></div>
    </div>
  );
}