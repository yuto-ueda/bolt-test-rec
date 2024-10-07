import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import fetch from 'node-fetch';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const form = new formidable.IncomingForm();
    form.parse(req, async (err, fields, files) => {
      if (err) {
        return res.status(500).json({ error: 'ファイルのアップロードに失敗しました。' });
      }

      const file = files.file as formidable.File;
      if (!file) {
        return res.status(400).json({ error: 'ファイルが見つかりません。' });
      }

      try {
        // ここで実際の文字起こしAPIを呼び出します
        // この例では、ダミーの応答を返しています
        // const transcription = await transcribeAudio(file.filepath);
        const transcription = "これはダミーの文字起こし結果です。実際のAPIでは、音声ファイルの内容に基づいた結果が返されます。";

        res.status(200).json({ transcription });
      } catch (error) {
        console.error('Transcription error:', error);
        res.status(500).json({ error: '文字起こし処理中にエラーが発生しました。' });
      }
    });
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

// 実際の文字起こしAPIを呼び出す関数（この例ではダミー実装）
// async function transcribeAudio(filePath: string): Promise<string> {
//   const audioFile = fs.readFileSync(filePath);
//   const response = await fetch('https://api.example.com/transcribe', {
//     method: 'POST',
//     body: audioFile,
//     headers: { 'Content-Type': 'audio/wav' },
//   });
//   const data = await response.json();
//   return data.transcription;
// }