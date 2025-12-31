import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "fs";

const geojsonPlugin = (): Plugin => ({
  name: "geojson-loader",
  load(id) {
    if (id.endsWith(".geojson")) {
      const content = readFileSync(id, "utf-8");
      return `export default ${content}`;
    }
  },
});

export default defineConfig({
  plugins: [react(), geojsonPlugin()],
});
