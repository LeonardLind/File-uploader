// src/app/routes.tsx
import type { JSX } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { UploadPage } from "../routes/UploadPage";
import { StagingPage } from "../routes/StagingPage";
import { GalleryPage } from "../routes/GalleryPage";
import { LoginPage } from "../routes/LoginPage";

/**
 * Simple auth gate based on localStorage.
 * If the user is not authenticated, redirect to the login page.
 */
function PrivateRoute({ children }: { children: JSX.Element }) {
  const isAuth = localStorage.getItem("auth") === "true";
  return isAuth ? children : <Navigate to="/" replace />;
}

/**
 * Central route configuration for the application.
 * This keeps all routes in one place and makes App.tsx smaller and clearer.
 */
export function AppRoutes() {
  return (
    <Routes>
      {/* Public login route */}
      <Route path="/" element={<LoginPage />} />

      {/* Auth-protected routes */}
      <Route
        path="/upload"
        element={
          <PrivateRoute>
            <UploadPage />
          </PrivateRoute>
        }
      />

      <Route
        path="/staging/:id"
        element={
          <PrivateRoute>
            <StagingPage />
          </PrivateRoute>
        }
      />

      <Route
        path="/gallery"
        element={
          <PrivateRoute>
            <GalleryPage />
          </PrivateRoute>
        }
      />

      {/* Fallback: unknown paths go to login */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
