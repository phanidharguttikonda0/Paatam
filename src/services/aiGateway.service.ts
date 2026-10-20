import { GoogleGenAI } from '@google/genai';

export interface VisionFilePart {
  inlineData: {
    data: string; // base64
    mimeType: string;
  };
}

export class AiGatewayService {
  private static geminiClient: GoogleGenAI | null = null;

  public static getGeminiClient(): GoogleGenAI {
    if (!this.geminiClient) {
      const apiKey = process.env.GEMINI_API_KEY || '';
      if (!apiKey && process.env.NODE_ENV === 'production') {
        console.warn('⚠️ [AI GATEWAY] GEMINI_API_KEY is not configured in environment variables.');
      }
      this.geminiClient = new GoogleGenAI({ apiKey });
    }
    return this.geminiClient;
  }

  /**
   * Module 2: Dynamic Model Determination
   */
  public static determineReasoningModel(
    subject: string,
    questionsText: string = '',
    language: string = 'English'
  ): string {
    const lowerSubject = (subject || '').toLowerCase();
    const lowerLang = (language || '').toLowerCase();

    // 1. Regional Indian Languages Trigger -> Sarvam AI
    const isIndic = ['hindi', 'telugu', 'tamil', 'marathi', 'kannada', 'bengali', 'gujarati', 'malayalam', 'odia', 'punjabi', 'urdu'].some(
      (l) => lowerSubject.includes(l) || lowerLang.includes(l)
    );

    if (isIndic && process.env.SARVAM_API_KEY) {
      return 'sarvam';
    }

    if (process.env.PRIMARY_AI_PROVIDER?.toLowerCase() === 'sarvam' && process.env.SARVAM_API_KEY) {
      return 'sarvam';
    }

    // 2. STEM / Derivations / LaTeX / Advanced Formulas
    const hasAdvancedStem = /\\frac|\\sqrt|\\sum|\\int|geometry|circuit|kinematics|equilibrium|thermodynamics|differentiation|integration/i.test(
      questionsText
    );

    if (hasAdvancedStem) {
      return process.env.ADVANCED_REASONING_MODEL || 'gemini-1.5-pro';
    }

    // 3. Default High-Throughput Reasoning Engine
    return process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  }

  /**
   * Invokes Google Gemini Multimodal Vision API with base64 image / PDF page buffers
   */
  public static async callGeminiVision(
    prompt: string,
    imageBuffers: Buffer[],
    mimeType: string = 'image/jpeg',
    modelName?: string
  ): Promise<string> {
    const client = this.getGeminiClient();
    const model = modelName || process.env.GEMINI_MODEL || 'gemini-2.5-flash';

    const parts: any[] = [{ text: prompt }];

    imageBuffers.forEach((buffer) => {
      parts.push({
        inlineData: {
          data: buffer.toString('base64'),
          mimeType,
        },
      });
    });

    try {
      const response = await client.models.generateContent({
        model,
        contents: parts,
      });

      return response.text || '';
    } catch (err: any) {
      console.error(`⚠️ [AI GATEWAY] Gemini Vision call failed (${model}):`, err.message);
      throw err;
    }
  }

  /**
   * Invokes Google Gemini Text / Reasoning API
   */
  public static async callGeminiText(prompt: string, modelName?: string): Promise<string> {
    const client = this.getGeminiClient();
    const model = modelName || process.env.GEMINI_MODEL || 'gemini-2.5-flash';

    try {
      const response = await client.models.generateContent({
        model,
        contents: [{ text: prompt }],
      });

      return response.text || '';
    } catch (err: any) {
      console.error(`⚠️ [AI GATEWAY] Gemini Text call failed (${model}):`, err.message);
      throw err;
    }
  }

  /**
   * Calls Sarvam AI API for Indic languages (with automatic fallback to Gemini)
   */
  public static async callSarvamOrFallback(prompt: string, fallbackModel = 'gemini-2.5-flash'): Promise<string> {
    const sarvamApiKey = process.env.SARVAM_API_KEY;
    if (!sarvamApiKey) {
      return await this.callGeminiText(prompt, fallbackModel);
    }

    try {
      const response = await fetch('https://api.sarvam.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-subscription-key': sarvamApiKey,
        },
        body: JSON.stringify({
          model: process.env.SARVAM_CHAT_MODEL || 'sarvam-105b',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
        }),
      });

      if (!response.ok) {
        throw new Error(`Sarvam API returned HTTP ${response.status}`);
      }

      const data: any = await response.json();
      return data.choices?.[0]?.message?.content || '';
    } catch (err: any) {
      console.warn('⚠️ [AI GATEWAY] Sarvam API call failed, falling back to Gemini:', err.message);
      return await this.callGeminiText(prompt, fallbackModel);
    }
  }
}
