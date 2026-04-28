import { defineConfig, PluginOption } from "vite";
import { enterDevPlugin, enterProdPlugin } from 'vite-plugin-enter-dev';
import path from "path";

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
      chunkSizeWarningLimit: 800,
      cssCodeSplit: true,
      sourcemap: false,
      rollupOptions: {
        output: {
          // Split vendor bundles to keep the main entry small. We deliberately
          // group React + every React-coupled helper (scheduler, react-is,
          // use-sync-external-store, react-router) together so that React's
          // named exports (createContext, etc.) are always initialized BEFORE
          // any consumer module evaluates. Anything else is left to Rollup so
          // it ends up in the chunk that actually imports it — this avoids
          // the "Cannot read properties of undefined (reading 'createContext')"
          // race that comes from a generic catch-all vendor chunk.
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;

            // Normalize Windows-style paths.
            const norm = id.replace(/\\/g, '/');

            // React core + everything that imports React internals.
            if (
              /\/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler|react-is|use-sync-external-store|@tanstack\/react-query|zustand)\//.test(
                norm,
              )
            ) {
              return 'react';
            }

            if (norm.includes('/@radix-ui/')) return 'radix';
            if (norm.includes('/@supabase/')) return 'supabase';
            if (norm.includes('/lucide-react/')) return 'icons';
            if (norm.includes('/recharts/') || /\/d3-[a-z]+\//.test(norm)) return 'charts';
            if (
              norm.includes('/react-hook-form/') ||
              norm.includes('/@hookform/') ||
              norm.includes('/zod/')
            ) {
              return 'forms';
            }
            if (norm.includes('/date-fns/')) return 'date';
            if (
              norm.includes('/embla-carousel') ||
              norm.includes('/react-day-picker/') ||
              norm.includes('/cmdk/')
            ) {
              return 'ui-extras';
            }

            // Everything else: let Rollup co-locate with its importer.
            return undefined;
          },
        },
      },
    },
  };
});