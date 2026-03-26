import { defineConfig, PluginOption } from "vite";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const plugins: PluginOption[] = [];
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