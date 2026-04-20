/**
 * copy-wasm.mjs
 * 
 * Cross-platform postinstall script that copies the four ONNX Runtime WASM
 * binaries from node_modules into /public so Vite bundles them into /dist,
 * and Capacitor packages them inside the APK assets.
 * 
 * Runs on both Windows and Unix without requiring any shell tools.
 */

import { cpSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const src  = join(__dirname, 'node_modules', 'onnxruntime-web', 'dist');
const dest = join(__dirname, 'public');

// Create /public if it doesn't exist yet
if (!existsSync(dest)) {
  mkdirSync(dest, { recursive: true });
  console.log('[copy-wasm] Created /public directory.');
}

// Check that the source folder exists
if (!existsSync(src)) {
  console.warn('[copy-wasm] onnxruntime-web/dist not found — skipping WASM copy.');
  process.exit(0);
}

// Copy every .wasm file
let copied = 0;
for (const file of readdirSync(src)) {
  if (!file.endsWith('.wasm')) continue;
  cpSync(join(src, file), join(dest, file));
  console.log(`[copy-wasm] Copied ${file} → public/`);
  copied++;
}

if (copied === 0) {
  console.warn('[copy-wasm] No .wasm files found in onnxruntime-web/dist.');
} else {
  console.log(`[copy-wasm] Done — ${copied} WASM file(s) ready for the APK build.`);
}
