import LocalDB from './localDB';
import type { Transaction } from '@/types';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

export const AIService = {
  async getApiKey(): Promise<string | null> {
    const key = await LocalDB.meta.getGeminiKey();
    // Default to the provided API key if the user hasn't set their own
    return key || 'AIzaSyAQTTGZkqAD90Tvi6YSDznuBJq1QssgOzw';
  },

  async hasApiKey(): Promise<boolean> {
    const key = await this.getApiKey();
    return !!key;
  },

  async callGemini(
    prompt: string, 
    systemInstruction?: string, 
    audioData?: { base64: string; mimeType: string }
  ): Promise<string> {
    const apiKey = await this.getApiKey();
    if (!apiKey) throw new Error('Gemini API Key missing');

    const contents: any[] = [];
    const parts: any[] = [{ text: prompt }];

    if (audioData) {
      parts.push({
        inlineData: {
          mimeType: audioData.mimeType,
          data: audioData.base64
        }
      });
    }

    contents.push({ parts });

    const payload: any = { contents };
    
    if (systemInstruction) {
      payload.systemInstruction = {
        parts: [{ text: systemInstruction }]
      };
    }

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData?.error?.message || 'Failed to communicate with AI');
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  },

  async generateInsights(transactions: Transaction[], allowanceAmount: number): Promise<string[]> {
    if (!transactions.length) return ["Start adding expenses to get insights!", "Keep tracking to see your patterns.", "Setup your allowance in settings."];

    const simplifiedData = transactions.map(t => ({ amount: t.amount, note: t.note, category: t.category_name }));
    
    const prompt = `
I have an allowance budget of ${allowanceAmount} PHP.
Here are my recent transactions: ${JSON.stringify(simplifiedData)}.
Provide exactly 3 short, personalized financial tips/advice. Keep each tip under 12 words. Do not use markdown like * or #. Return them separated by a pipe character "|".
Example output: Tip 1|Tip 2|Tip 3
`;
    try {
      const response = await this.callGemini(prompt, "You are a concise, helpful financial coach.");
      const tips = response.split('|').map(s => s.trim()).filter(s => s.length > 0);
      return tips.length >= 3 ? tips.slice(0, 3) : [response.trim(), "Keep up the good tracking!", "Stay on top of your budget."];
    } catch (e) {
      console.error("AI Coach Error:", e);
      return ["Could not generate insights at this time.", "Check your internet connection.", "Or verify your API Key in Settings."];
    }
  },

  async checkAnomaly(newTransaction: any, history: Transaction[], allowanceAmount: number): Promise<{ isAnomaly: boolean; message: string }> {
    const recentSpending = history.map(t => ({ amount: t.amount, note: t.note, category: t.category_name }));
    
    const prompt = `
Allowance: ${allowanceAmount}
History: ${JSON.stringify(recentSpending.slice(0, 15))}
New Expense: { amount: ${newTransaction.amount}, note: '${newTransaction.note}' }

Analyze. Is this new expense dangerously abnormal or extremely high given their budget and past spending?
Return ONLY raw JSON with no backticks: { "isAnomaly": boolean, "message": "Short warning message under 15 words" }
`;
    try {
      const responseText = await this.callGemini(prompt, "You are a precise financial anomaly detector.");
      const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleaned);
    } catch (e) {
      console.error("Anomaly Detect Error:", e);
      return { isAnomaly: false, message: "" };
    }
  },

  async predictBurnRate(transactions: Transaction[], allowanceAmount: number): Promise<string> {
    if (transactions.length < 3) return "Need more data to predict burn rate.";

    const sumsByDate: Record<string, number> = {};
    transactions.forEach(t => {
      const d = new Date(t.date).toISOString().split('T')[0];
      sumsByDate[d] = (sumsByDate[d] || 0) + t.amount;
    });

    const prompt = `
Allowance: ${allowanceAmount}
Daily Spending: ${JSON.stringify(sumsByDate)}

Based on this, when will the user run out of money completely? 
Return a single concise sentence under 12 words.
`;
    try {
      const response = await this.callGemini(prompt, "You predict money runout dates simply.");
      return response.trim().replace(/[*#]/g, '');
    } catch {
      return "Unable to predict burn rate at the moment.";
    }
  },

  async parseVoiceExpense(audioBase64: string, mimeType: string): Promise<any> {
    const systemPrompt = `You are an automated financial extraction assistant for an expense-tracking app. 
I am providing you with a short audio recording of a user dictating an expense. 

Your task is to listen to the audio, extract the core financial details, and return the data STRICTLY as a raw JSON object. Do not wrap the response in markdown code blocks (e.g., \`\`\`json), do not include greetings, and do not add any conversational text.

Extract the information using the following JSON schema:
{
  "is_valid_expense": boolean (true if the audio clearly describes a purchase or expense. false if it is gibberish, empty, or unrelated),
  "amount": number (the exact numerical cost. Return null if none is mentioned),
  "currency": string (the 3-letter currency code. If unspecified, default to "PHP"),
  "category": string (Categorize the expense into one of these strict options: Food, Transport, Utilities, Entertainment, Shopping, Health, Education, or Other),
  "merchant": string (The name of the store, service, or person paid. Return null if not mentioned),
  "description": string (A concise 2-to-5 word summary of the item or service),
  "date_spoken": string (The exact time reference spoken by the user, such as "today", "yesterday", "this morning", or null if not mentioned)
}

If the audio is unclear or does not describe an expense, set "is_valid_expense" to false and return null for the remaining fields.`;

    try {
      const responseText = await this.callGemini(
        "Listen to the audio and return the required JSON.", 
        systemPrompt, 
        { base64: audioBase64, mimeType }
      );
      
      const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleaned);
    } catch (e) {
      console.error("Voice Parse Error:", e);
      return { is_valid_expense: false };
    }
  }
};

export default AIService;
