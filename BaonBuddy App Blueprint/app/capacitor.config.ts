import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.baonbuddy.app',
  appName: 'BaonBuddy',
  webDir: 'dist',
  server: {
    // Use 'https' scheme so the WebView runs on https://localhost
    // This avoids mixed-content blocks when calling the Gemini HTTPS API
    // and is the recommended scheme for Capacitor 4+.
    androidScheme: 'https',
    // Allow navigation to external HTTPS origins (HuggingFace CDN for model
    // download, Google Generative Language API for Gemini).
    allowNavigation: [
      'https://generativelanguage.googleapis.com',
      'https://huggingface.co',
      'https://cdn-lfs.huggingface.co',
      'https://cdn-lfs-us-1.huggingface.co',
    ],
  },
  plugins: {
    CapacitorHttp: {
      // Use Capacitor's native HTTP bridge for outbound fetch() calls.
      // This bypasses WebView CORS restrictions and works reliably on Android.
      enabled: true,
    },
  },
};

export default config;
