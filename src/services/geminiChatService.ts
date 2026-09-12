import { GoogleGenAI } from '@google/genai';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export class GeminiChatService {
  private client: GoogleGenAI | null = null;
  private chatSession: any = null;

  constructor() {
    this.init();
  }

  private init() {
    let apiKey: string | undefined;
    try {
      if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
        apiKey = process.env.API_KEY;
      }
    } catch {
      // Ignored
    }

    if (apiKey) {
      try {
        this.client = new GoogleGenAI({ apiKey });
        this.chatSession = this.client.chats.create({
          model: 'gemini-2.5-flash',
        });
      } catch (e) {
        console.warn('Gemini chat initialization error:', e);
      }
    }
  }

  isAvailable(): boolean {
    return !!this.chatSession;
  }

  async *sendMessageStream(message: string): AsyncGenerator<string, void, unknown> {
    if (!this.chatSession) {
      // Simulated response in demo mode
      await new Promise(r => setTimeout(r, 400));
      const demoReply = `I am running in local assistant mode. You said: "${message}". You can explore folders, manage bookmarks, inspect RSS feeds, and run commands in the console.`;
      const words = demoReply.split(' ');
      for (const word of words) {
        yield word + ' ';
        await new Promise(r => setTimeout(r, 30));
      }
      return;
    }

    try {
      const responseStream = await this.chatSession.sendMessageStream({ message });
      for await (const chunk of responseStream) {
        yield chunk.text || '';
      }
    } catch (e: any) {
      yield `\n[Error from AI service: ${e.message || 'Unable to complete request'}]`;
    }
  }
}
