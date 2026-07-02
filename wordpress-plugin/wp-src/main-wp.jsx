import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './wp-index.css';
import Dashboard from '../../src/Dashboard.jsx';

// Kein Service Worker im WordPress-Kontext

const container = document.getElementById('elektronikertools-root');
if (container) {
  createRoot(container).render(
    <StrictMode>
      <Dashboard />
    </StrictMode>
  );
}
