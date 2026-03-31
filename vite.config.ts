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
    ssr: false,
    build: {
      outDir: 'dist',
      target: ['es2020', 'edge89'],
      minify: 'esbuild',
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        external: ['react-is'],
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'supabase': ['@supabase/supabase-js'],
            'ui-motion': ['framer-motion'],
            'ui-charts': ['recharts'],
            'ui-utils': ['date-fns', 'sonner', 'class-variance-authority', 'clsx', 'tailwind-merge', 'zustand'],
            'crypto': ['bcryptjs'],
            'radix-core': [
              '@radix-ui/react-dialog',
              '@radix-ui/react-select',
              '@radix-ui/react-tabs',
              '@radix-ui/react-tooltip',
              '@radix-ui/react-popover',
              '@radix-ui/react-scroll-area',
              '@radix-ui/react-alert-dialog',
              '@radix-ui/react-slot',
              '@radix-ui/react-label',
            ],
            'radix-ext': [
              '@radix-ui/react-dropdown-menu',
              '@radix-ui/react-checkbox',
              '@radix-ui/react-radio-group',
              '@radix-ui/react-switch',
              '@radix-ui/react-separator',
              '@radix-ui/react-accordion',
              '@radix-ui/react-progress',
              '@radix-ui/react-toggle',
              '@radix-ui/react-toggle-group',
            ],
            'lucide': ['lucide-react'],
          },
        },
      },
    }
  };
});