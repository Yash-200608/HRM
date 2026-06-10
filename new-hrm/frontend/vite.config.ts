// import { defineConfig } from "vite";
// import react from "@vitejs/plugin-react-swc";
// import path from "path";
// import { componentTagger } from "lovable-tagger";

// // https://vitejs.dev/config/
// export default defineConfig(({ mode }) => ({
//   base:"/",
//   server: {
//     host: "::",
//     port: 8080,
//   },
//   plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
//   resolve: {
//     alias: {
//       "@": path.resolve(__dirname, "./src"),
//     },
//   },
// }));






import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

const monorepoRoot = path.resolve(__dirname, "../..");
const rootReact = path.resolve(monorepoRoot, "node_modules/react");
const rootReactDom = path.resolve(monorepoRoot, "node_modules/react-dom");

export default defineConfig(({ mode }) => ({
  base: "/",
  publicDir: "public",

  server: {
    host: "::",
    port: 8080,
  },

  plugins: [
    react(),
    mode === "development" && componentTagger()
  ].filter(Boolean),

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      react: rootReact,
      "react-dom": rootReactDom,
      "react-dom/client": path.join(rootReactDom, "client.js"),
      "react/jsx-dev-runtime": path.join(rootReact, "jsx-dev-runtime.js"),
      "react/jsx-runtime": path.join(rootReact, "jsx-runtime.js"),
    },
    dedupe: ["react", "react-dom"],
  },

  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react/jsx-dev-runtime",
      "react/jsx-runtime",
    ],
  },

  build: {
    outDir: "dist",
  },
}));