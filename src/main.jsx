import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Dashboard from './Dashboard.jsx'

// Service Worker nur in der Standalone-App registrieren, nicht in WordPress
const isWordPress = typeof window !== 'undefined' && !!window.elektrotools_config?.wp_mode;

if (!isWordPress && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

// Unterstützt beide Root-IDs: Standalone (#root) und WordPress (#elektronikertools-root)
const container = document.getElementById('elektronikertools-root') || document.getElementById('root');
if (container) {
  createRoot(container).render(
    <StrictMode>
      <Dashboard />
    </StrictMode>,
  );
}
