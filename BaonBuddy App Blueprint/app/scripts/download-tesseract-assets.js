import fs from 'fs';
import path from 'path';
import https from 'https';

const ASSETS = [
  {
    url: 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js',
    dest: 'worker.min.js'
  },
  {
    url: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5/tesseract-core-simd-lstm.wasm.js',
    dest: 'tesseract-core.wasm.js'
  },
  {
    url: 'https://tessdata.projectnaptha.com/4.0.0/eng.traineddata.gz',
    dest: 'eng.traineddata.gz'
  }
];

const TARGET_DIR = path.join(process.cwd(), 'public', 'tesseract');

if (!fs.existsSync(TARGET_DIR)) {
  fs.mkdirSync(TARGET_DIR, { recursive: true });
}

async function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(destPath)) {
      console.log(`Skipping: ${path.basename(destPath)} already exists.`);
      resolve();
      return;
    }
    
    console.log(`Downloading ${url} to ${destPath}...`);
    const file = fs.createWriteStream(destPath);
    
    https.get(url, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        // Handle redirect
        downloadFile(response.headers.location, destPath).then(resolve).catch(reject);
        return;
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

async function run() {
  try {
    for (const asset of ASSETS) {
      await downloadFile(asset.url, path.join(TARGET_DIR, asset.dest));
    }
    console.log('Tesseract assets downloaded successfully.');
  } catch (err) {
    console.error('Error downloading Tesseract assets:', err);
    process.exit(1);
  }
}

run();
