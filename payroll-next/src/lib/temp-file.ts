import fs from 'fs';
import path from 'path';

const TEMP_DIR = path.join(process.cwd(), 'public', 'temp');

/**
 * Ensure temp directory exists
 */
export function ensureTempDir() {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
}

/**
 * Create a temp file and return its path
 */
export function createTempFile(prefix: string, content: string): string {
  ensureTempDir();
  const filename = `${prefix}_${Date.now()}.json`;
  const filepath = path.join(TEMP_DIR, filename);
  fs.writeFileSync(filepath, content, 'utf-8');
  return filepath;
}

/**
 * Delete a temp file
 */
export function deleteTempFile(filepath: string) {
  try {
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
  } catch (e) {
    console.error('Failed to delete temp file:', e);
  }
}

/**
 * Clean up old temp files (older than 1 hour)
 */
export function cleanupOldTempFiles(maxAgeMs: number = 3600000) {
  if (!fs.existsSync(TEMP_DIR)) return;

  const now = Date.now();
  const files = fs.readdirSync(TEMP_DIR);

  files.forEach(file => {
    const filepath = path.join(TEMP_DIR, file);
    try {
      const stats = fs.statSync(filepath);
      if (now - stats.mtimeMs > maxAgeMs) {
        fs.unlinkSync(filepath);
      }
    } catch (e) {
      // Ignore errors
    }
  });
}
