import { useState, useCallback } from "react";
import { uid } from "../lib/utils.js";

export function useToasts() {
  const [toasts, setToasts] = useState([]);
  const addToast = useCallback((msg, type = "success") => {
    const id = uid();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000);
  }, []);
  return { toasts, addToast };
}

export default function Toast({ toasts }) {
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 9999,
      display: "flex", flexDirection: "column", gap: 8, pointerEvents: "none"
    }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: t.type === "error" ? "#2a1515" : t.type === "success" ? "#0f2a1a" : "var(--bg3)",
          border: `1px solid ${t.type === "error" ? "var(--red)" : t.type === "success" ? "var(--green)" : "var(--border2)"}`,
          borderRadius: 10, padding: "10px 16px",
          color: t.type === "error" ? "var(--red)" : t.type === "success" ? "var(--green)" : "var(--text2)",
          fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8,
          animation: "slideIn 0.2s ease", boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
          minWidth: 200, maxWidth: 320
        }}>
          <span>{t.type === "error" ? "⚠" : "✓"}</span>
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}
