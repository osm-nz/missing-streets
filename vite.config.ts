import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/missing-streets",
  plugins: [react()],
  build: {
    outDir: "build",
  },
  envPrefix: "REACT_APP_",
});
