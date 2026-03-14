import React from "react";
import { Navigate, useLocation } from "react-router";

/**
 * Renders children only if the user is signed in (sessionStorage has "user").
 * Otherwise redirects to /signin, preserving the intended URL so we can send them back after login.
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const user = sessionStorage.getItem("user");

  if (!user) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
