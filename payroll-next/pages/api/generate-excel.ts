import type { NextApiRequest, NextApiResponse } from 'next';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

interface GenerateExcelResponse {
  excelBase64?: string;
  error?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<GenerateExcelResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { command, data } = req.body;

  if (!command || !data) {
    return res.status(400).json({ error: 'Missing command or data' });
  }

  try {
    const pythonScript = path.join(process.cwd(), 'excel-generator.py');
    console.log('Python script path:', pythonScript);
    console.log('Command:', command);

    // Check if Python script exists
    if (!fs.existsSync(pythonScript)) {
      throw new Error(`Python script not found: ${pythonScript}`);
    }

    // Write data to temp file (use absolute path)
    const tempDir = path.resolve(process.cwd(), 'public', 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const tempFile = path.resolve(tempDir, `excel_data_${Date.now()}.json`);

    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf8');
    console.log('Temp file:', tempFile);

    const excelBase64 = await new Promise<string>((resolve, reject) => {
      // Use 'python' or 'python.exe' depending on platform
      const pythonCmd = process.platform === 'win32' ? 'python.exe' : 'python';
      console.log('Using Python command:', pythonCmd);
      
      const pythonProcess = spawn(pythonCmd, [pythonScript, command, tempFile], {
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
        cwd: process.cwd(), // Set working directory
      });

      let output = '';
      let errorOutput = '';

      console.log('Python process started');

      pythonProcess.stdout.setEncoding('utf8');
      pythonProcess.stderr.setEncoding('utf8');

      pythonProcess.stdout.on('data', (data) => {
        console.log('Python stdout:', data.toString().substring(0, 100));
        output += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        console.error('Python stderr:', data.toString());
        errorOutput += data.toString();
      });

      pythonProcess.on('close', (code) => {
        console.log('Python process closed with code:', code);
        // Clean up temp file
        try {
          fs.unlinkSync(tempFile);
        } catch (e) {}

        if (code !== 0) {
          console.error('Python error output:', errorOutput);
          reject(new Error(errorOutput || `Python process exited with code ${code}`));
          return;
        }

        resolve(output.trim());
      });

      pythonProcess.on('error', (err) => {
        console.error('Python process error:', err);
        try {
          fs.unlinkSync(tempFile);
        } catch (e) {}
        reject(err);
      });
    });

    console.log('Excel generated successfully, length:', excelBase64.length);
    res.status(200).json({ excelBase64 });

  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
