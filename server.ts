import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// System instruction for AutoCare AI
const AUTOCARE_SYSTEM_INSTRUCTION = `You are AutoCare AI, an assistant inside the AutoCare vehicle management application.

Your role is to help users with general vehicle ownership, maintenance, fuel economy, documents, expenses, reminders, and automotive questions.

At this stage you do not have access to the user's private vehicle records.

Never claim that you can see or know the user's vehicle data unless it is explicitly provided in the conversation.

Be concise, practical, and easy to understand.

If the user asks for information from their personal AutoCare records, explain that vehicle-data integration is not enabled yet rather than inventing an answer.

Do not fabricate vehicle information, service history, mileage, expenses, document dates, or reminders.`;

// Secure server-side endpoint for Gemini requests
app.post('/api/ai/chat', async (req: Request, res: Response) => {
  try {
    const { message, history } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Message must not be empty.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY is not configured in server environment.');
      return res.status(503).json({
        unconfigured: true,
        response: 'AutoCare AI is not connected yet. Please configure the Gemini API connection.',
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    // Add current user turn
    const rawTurns: Array<{ role: string; parts: Array<{ text: string }> }> = [];

    if (Array.isArray(history)) {
      // Keep last 10 messages for short conversation context
      const recentHistory = history.slice(-10);
      for (const item of recentHistory) {
        if (item && item.text && typeof item.text === 'string' && (item.role === 'user' || item.role === 'model' || item.role === 'assistant')) {
          rawTurns.push({
            role: item.role === 'assistant' ? 'model' : item.role,
            parts: [{ text: String(item.text).trim() }],
          });
        }
      }
    }

    rawTurns.push({
      role: 'user',
      parts: [{ text: message.trim() }],
    });

    // Ensure valid turn alternation (user -> model -> user) for Gemini API
    const formattedContents: Array<{ role: string; parts: Array<{ text: string }> }> = [];
    for (const turn of rawTurns) {
      if (formattedContents.length > 0 && formattedContents[formattedContents.length - 1].role === turn.role) {
        formattedContents[formattedContents.length - 1].parts[0].text += `\n${turn.parts[0].text}`;
      } else {
        formattedContents.push(turn);
      }
    }
    while (formattedContents.length > 0 && formattedContents[0].role === 'model') {
      formattedContents.shift();
    }
    if (formattedContents.length === 0) {
      formattedContents.push({
        role: 'user',
        parts: [{ text: message.trim() }],
      });
    }

    // Call Gemini using flash lite model for fast, reliable responses
    const result = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: formattedContents,
      config: {
        systemInstruction: AUTOCARE_SYSTEM_INSTRUCTION,
        temperature: 0.7,
      },
    });

    const reply = result.text || 'I apologize, but I could not formulate a response. Please try again.';

    return res.json({ response: reply });
  } catch (error: any) {
    // Log technical error server-side only; never expose details or keys to client
    console.error('Server error handling Gemini request:', error?.message || error);
    return res.status(500).json({
      error: "Sorry, I couldn't process that request right now. Please try again.",
    });
  }
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AutoCare server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
