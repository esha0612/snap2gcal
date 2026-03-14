import React, { useMemo } from "react";
import { Button } from "./ui/button";
import { Upload, Sparkles, LogOut } from "lucide-react";

export function Hero() {
  const userName = useMemo(() => {
    try {
      const raw = sessionStorage.getItem("user");
      if (!raw) return null;
      const u = JSON.parse(raw);
      return u?.name ?? null;
    } catch {
      return null;
    }
  }, []);

  const scrollToUpload = () => {
    const el = document.getElementById("demo");
    el?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSignOut = () => {
    sessionStorage.removeItem("user");
    window.location.href = "/signin";
  };

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50 py-24 sm:py-32">
      {userName && (
        <div className="absolute top-6 right-6 z-10">
          <Button variant="outline" size="sm" onClick={handleSignOut} className="gap-2">
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      )}
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="mb-6 text-5xl font-extrabold tracking-tight text-gray-900 sm:text-6xl">
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Snap2GCal</span>
          </h1>

          <p className="mb-10 text-lg leading-8 text-gray-600">
            Don&apos;t worry about spending time creating your event in your Google Calendar. Simply upload a screenshot, and Snap2GCal takes care of the rest.
          </p>

          {userName && (
            <p className="mb-6 text-lg text-gray-700">
              Welcome, <span className="font-semibold">{userName}</span>
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              onClick={scrollToUpload}
            >
              <Upload className="mr-2 h-5 w-5" />
              Upload screenshot
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

      <div className="absolute top-0 right-0 -z-10 h-96 w-96 rounded-full bg-purple-200 opacity-20 blur-3xl"></div>
      <div className="absolute bottom-0 left-0 -z-10 h-96 w-96 rounded-full bg-blue-200 opacity-20 blur-3xl"></div>
    </div>
  );
}