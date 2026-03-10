import type { NextApiRequest, NextApiResponse } from 'next';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import formidable from 'formidable';

export const config = {
  api: {
    bodyParser: false,
  },
};

interface ParsePdfResponse {
  data?: any;
  error?: string;
}

export default function handler(req: NextApiRequest, res: NextApiResponse<ParsePdfResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  const form = formidable({
    maxFileSize: 10 * 1024 * 1024,
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to parse form data' });
    }

    const file = files.file?.[0];
    if (!file || !file.filepath) {
      return res.status(400).json({ error: 'No file provided' });
    }

    try {
      const pythonScript = path.join(process.cwd(), 'pdf-to-json.py');
      
      await new Promise<void>((resolve, reject) => {
        const pythonProcess = spawn('python', [pythonScript, file.filepath], {
          env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
        });
        
        let output = '';
        let errorOutput = '';

        pythonProcess.stdout.setEncoding('utf8');
        pythonProcess.stderr.setEncoding('utf8');

        pythonProcess.stdout.on('data', (data) => {
          output += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
          errorOutput += data.toString();
        });

        pythonProcess.on('close', (code) => {
          // Clean up temp file
          try {
            fs.unlinkSync(file.filepath!);
          } catch (e) {}

          if (code !== 0) {
            reject(new Error(errorOutput || 'Failed to parse PDF'));
            return;
          }

          try {
            const result = JSON.parse(output);
            res.status(200).json(result);
            resolve();
          } catch (e) {
            console.error('JSON parse error:', e);
            reject(new Error('Failed to parse Python output'));
          }
        });

        pythonProcess.on('error', (err) => {
          try {
            fs.unlinkSync(file.filepath!);
          } catch (e) {}
          reject(err);
        });
      });

    } catch (error) {
      console.error('API error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });
}
