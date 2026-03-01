import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react";

// Plugin to inline CSS into the JS bundle as a <style> tag injection
function cssInlinePlugin(): Plugin {
  return {
    name: "css-inline",
    enforce: "post",
    generateBundle(_, bundle) {
      let cssCode = "";
      const cssFiles: string[] = [];

      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (fileName.endsWith(".css")) {
          cssCode += (chunk as any).source;
          cssFiles.push(fileName);
        }
      }

      // Remove CSS files from bundle
      for (const f of cssFiles) {
        delete bundle[f];
      }

      // Inject CSS into JS
      if (cssCode) {
        for (const [, chunk] of Object.entries(bundle)) {
          if (chunk.type === "chunk" && chunk.isEntry) {
            const injection = `(function(){var s=document.createElement("style");s.textContent=${JSON.stringify(cssCode)};document.head.appendChild(s)})();`;
            chunk.code = injection + chunk.code;
            break;
          }
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), cssInlinePlugin()],
  build: {
    lib: {
      entry: "src/main.tsx",
      formats: ["iife"],
      name: "UtilityDashboard",
      fileName: () => "utility-dashboard.js",
    },
    outDir: "../custom_components/utility_manual_tracking/frontend",
    emptyOutDir: false,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
});
