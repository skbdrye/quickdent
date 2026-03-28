import { defineConfig, PluginOption } from "vite";
import path from "path";

// Stub functions to replace vite-plugin-enter-dev (which has Vite 7 compatibility issues)
const enterProdPlugin = () => [];
const enterDevPlugin = () => [];

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const plugins = [
    ...enterProdPlugin(),
  ];
  if (mode === 'development') {
    plugins.push(...enterDevPlugin());
  }
  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: plugins.filter(Boolean) as PluginOption[],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    base: '/',
    build: {
      outDir: 'dist',
    }
  };
});