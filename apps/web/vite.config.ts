import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  optimizeDeps: {
    include: [
      "use-sync-external-store/shim/with-selector.js",
      "use-sync-external-store/shim/index.js",
    ],
  },
  plugins: [tailwindcss(), tanstackStart(), viteReact()],
});
