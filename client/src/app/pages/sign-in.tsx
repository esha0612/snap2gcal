import React, { useState } from "react";
import { Navigate } from "react-router";
import { GoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";

function GoogleCalendarLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Calendar body */}
      <rect x="6" y="14" width="36" height="28" rx="3" fill="#fff" fillOpacity="0.98" stroke="rgba(0,0,0,0.06)" strokeWidth="1.5" />
      {/* Top colored strips (Google Calendar colors) */}
      <rect x="6" y="6" width="9" height="12" rx="1.5" fill="#4285F4" />
      <rect x="15" y="6" width="9" height="12" rx="1.5" fill="#34A853" />
      <rect x="24" y="6" width="9" height="12" rx="1.5" fill="#FBBC04" />
      <rect x="33" y="6" width="9" height="12" rx="1.5" fill="#EA4335" />
      {/* Grid lines */}
      <line x1="6" y1="22" x2="42" y2="22" stroke="rgba(0,0,0,0.06)" strokeWidth="1" />
      <line x1="18" y1="14" x2="18" y2="42" stroke="rgba(0,0,0,0.06)" strokeWidth="1" />
      <line x1="30" y1="14" x2="30" y2="42" stroke="rgba(0,0,0,0.06)" strokeWidth="1" />
    </svg>
  );
}

export function SignInPage() {
  const [error, setError] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState(false);

  const handleSuccess = (credentialResponse: { credential?: string }) => {
    if (!credentialResponse.credential) return;
    setError(null);
    try {
      const decoded = jwtDecode<{ name?: string; email?: string }>(credentialResponse.credential);
      if (decoded?.name) {
        sessionStorage.setItem("user", JSON.stringify(decoded));
      }
      setSignedIn(true);
    } catch {
      setError("Could not sign you in. Please try again.");
    }
  };

  if (signedIn) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen flex">
      {/* Left half – sign-in */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-12 lg:px-16 xl:px-24 bg-white">
        <div className="flex items-center gap-2 mb-12">
          <div className="flex gap-0.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-600" />
            <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500" />
            <span className="w-2.5 h-2.5 rounded-sm bg-violet-500" />
            <span className="w-2.5 h-2.5 rounded-sm bg-purple-600" />
          </div>
          <span className="text-lg font-semibold text-gray-900 tracking-tight">Snap2GCal</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 mb-2">
          Welcome to Snap2GCal!
        </h1>
        <p className="text-gray-600 mb-10">
          Don&apos;t worry about spending time creating your event in your Google Calendar. Simply upload a screenshot, and Snap2GCal takes care of the rest. Sign in to begin!
        </p>

        {error && (
          <p className="text-sm text-red-600 mb-6 bg-red-50 border border-red-100 px-4 py-3 rounded-lg">
            {error}
          </p>
        )}

        <div className="w-full max-w-sm">
          <GoogleLogin
            onSuccess={handleSuccess}
            onError={() => setError("Google sign-in was cancelled or failed.")}
            useOneTap={false}
          />
        </div>

        <p className="mt-10 text-sm text-gray-500 max-w-sm">
          By signing in, you agree to use this app to create calendar events from your uploads.
        </p>
      </div>

      {/* Right half – ombre + calendar */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 35%, #d946ef 65%, #ec4899 100%)",
        }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent" />
        <div className="relative z-10 flex flex-col items-center justify-center gap-8">
          <div className="w-52 h-52 rounded-2xl bg-white/95 shadow-2xl flex items-center justify-center p-5 backdrop-blur-sm">
            <GoogleCalendarLogo className="w-full h-full" />
          </div>
          <p className="text-white/95 text-center text-lg font-medium drop-shadow-sm max-w-xs">
            Turn screenshots into calendar events in one click
          </p>
        </div>
        <div className="absolute bottom-8 left-8 right-8 h-24 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />
      </div>
    </div>
  );
}
