import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  // Import Alias
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  server: {
    watch: {
      ignored: [
        "**/*.go",
        "**/go.mod",
        "**/go.sum",
        "**/*.sqlite",
        "**/*.sqlite3",
      ],
    },
  },
  plugins: [react(), tailwindcss()],
});
