import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Vite-Plugin: generiertes index.html nach dem Build löschen (WP braucht es nicht)
const removeHtmlPlugin = {
  name: 'remove-wp-index-html',
  closeBundle() {
    const htmlOut = path.resolve(__dirname, 'assets/index.html');
    if (fs.existsSync(htmlOut)) fs.unlinkSync(htmlOut);
  },
};

export default defineConfig({
  plugins: [react(), removeHtmlPlugin],

  root: __dirname,

  resolve: {
    // Alle Pakete aus dem Plugin-node_modules auflösen,
    // nicht aus dem Parent-Verzeichnis
    dedupe: ['react', 'react-dom'],
    alias: {
      'react':                 path.resolve(__dirname, 'node_modules/react'),
      'react-dom':             path.resolve(__dirname, 'node_modules/react-dom'),
      'react/jsx-runtime':     path.resolve(__dirname, 'node_modules/react/jsx-runtime'),
      '@supabase/supabase-js': path.resolve(__dirname, 'node_modules/@supabase/supabase-js'),
      'jspdf':                 path.resolve(__dirname, 'node_modules/jspdf'),
      'jspdf-autotable':       path.resolve(__dirname, 'node_modules/jspdf-autotable'),
    },
  },

  build: {
    outDir:      path.resolve(__dirname, 'assets'),
    emptyOutDir: true,

    rollupOptions: {
      input: path.resolve(__dirname, 'index.html'),

      output: {
        // Alles in eine JS-Datei bündeln — kein Code-Splitting —
        // damit dynamische Imports (jsPDF etc.) in WordPress korrekt laden.
        inlineDynamicImports: true,

        entryFileNames: 'elektronikertools.js',
        assetFileNames: ({ name }) =>
          name?.endsWith('.css') ? 'elektronikertools.css' : (name || 'asset'),
      },
    },

    sourcemap: false,
  },
});
