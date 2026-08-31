import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { AuthProvider } from "./lib/auth-context";
import App from "./App";
import "./index.css";

// In dev, use same origin so Vite proxy forwards /api to Convex backend
// In production, use the configured VITE_CONVEX_URL
const convexUrl = import.meta.env.DEV ? window.location.origin : import.meta.env.VITE_CONVEX_URL;
const convex = new ConvexReactClient(convexUrl as string);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ConvexProvider client={convex}>
      <AuthProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
    </ConvexProvider>
  </React.StrictMode>
);
