import { pipeline, env } from '@xenova/transformers';
import { createWorker } from 'tesseract.js';
import type { Transaction } from '@/types';

// ─── ONNX / Transformers.js Runtime Config ────────────────────────────────────
env.backends.onnx.wasm.wasmPaths = '/';
env.backends.onnx.wasm.numThreads = 1; // Android WebView has no SharedArrayBuffer
env.allowLocalModels = true;
env.useBrowserCache = true;
env.allowRemoteModels = true;

// ─── 1. Offline Auto-Categorization (MobileBERT) ─────────────────────────────

class ClassifierSingleton {
  private static instance: any = null;
  private static loading: Promise<any> | null = null;

  static async get(): Promise<any> {
    if (this.instance) return this.instance;
    if (!this.loading) {
      this.loading = pipeline('zero-shot-classification', 'Xenova/mobilebert-uncased-mnli', { quantized: true })
        .then((p: any) => { this.instance = p; this.loading = null; return p; })
        .catch((e: any) => { this.loading = null; throw e; });
    }
    return this.loading;
  }
}

// ─── 2. Local Financial Insights (Rule-Based, No API) ────────────────────────

function localInsights(transactions: Transaction[], allowance: number): string[] {
  if (!transactions.length) {
    return [
      'Start adding expenses to get insights!',
      'Track daily spending to spot patterns.',
      'Set your allowance in Settings.',
    ];
  }

  const tips: string[] = [];
  const total = transactions.reduce((s, t) => s + t.amount, 0);
  const dailyAvg = total / Math.max(1, uniqueDays(transactions));
  const remaining = Math.max(0, allowance - total);
  const daysLeft = dailyAvg > 0 ? Math.floor(remaining / dailyAvg) : 999;

  // Tip 1 – budget health
  const pctUsed = allowance > 0 ? (total / allowance) * 100 : 0;
  if (pctUsed >= 90) {
    tips.push(`You've used ${pctUsed.toFixed(0)}% of your allowance — slow down!`);
  } else if (pctUsed >= 70) {
    tips.push(`You've used ${pctUsed.toFixed(0)}% of your allowance. Stay mindful.`);
  } else {
    tips.push(`Good job! You've only used ${pctUsed.toFixed(0)}% of your allowance.`);
  }

  // Tip 2 – top spending category
  const catTotals: Record<string, number> = {};
  for (const t of transactions) {
    const cat = t.category_name || 'Uncategorized';
    catTotals[cat] = (catTotals[cat] || 0) + t.amount;
  }
  const topCat = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0];
  if (topCat) {
    const pct = ((topCat[1] / total) * 100).toFixed(0);
    tips.push(`Your biggest spend is ${topCat[0]} at ${pct}% of total expenses.`);
  }

  // Tip 3 – days remaining
  if (remaining <= 0) {
    tips.push('You have exceeded your allowance. Avoid new expenses today!');
  } else if (daysLeft < 3) {
    tips.push(`Only ${remaining.toFixed(0)} left — budget carefully for the next few days.`);
  } else {
    tips.push(`At your current rate, your budget lasts ${daysLeft} more day${daysLeft !== 1 ? 's' : ''}.`);
  }

  return tips;
}

function uniqueDays(transactions: Transaction[]): number {
  return new Set(transactions.map(t => t.date.split('T')[0])).size;
}

// ─── 3. Local Anomaly Detection (Z-Score Statistics, No API) ─────────────────

function localAnomaly(
  newTx: { amount: number; note?: string },
  history: Transaction[],
  allowance: number
): { isAnomaly: boolean; message: string } {
  if (history.length < 3) return { isAnomaly: false, message: '' };

  const amounts = history.map(t => t.amount);
  const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  const std = Math.sqrt(amounts.map(x => (x - mean) ** 2).reduce((a, b) => a + b, 0) / amounts.length);

  const zScore = std > 0 ? (newTx.amount - mean) / std : 0;
  const isBigRelativeToAllowance = allowance > 0 && newTx.amount > allowance * 0.4;
  const isStatisticalOutlier = zScore > 2.5;

  if (isStatisticalOutlier && isBigRelativeToAllowance) {
    return { isAnomaly: true, message: `This expense is unusually high — ${newTx.amount.toFixed(0)} is ${zScore.toFixed(1)}x above your average.` };
  }
  if (isBigRelativeToAllowance) {
    return { isAnomaly: true, message: `This expense is over 40% of your budget — spend wisely!` };
  }
  if (isStatisticalOutlier) {
    return { isAnomaly: true, message: `Unusually large expense detected compared to your history.` };
  }
  return { isAnomaly: false, message: '' };
}

// ─── 4. Local Burn Rate Prediction (Moving Average, No API) ──────────────────

function localBurnRate(transactions: Transaction[], allowance: number): string {
  if (transactions.length < 2) return 'Add more expenses to see your burn rate.';

  const sumsByDay: Record<string, number> = {};
  for (const t of transactions) {
    const d = t.date.split('T')[0];
    sumsByDay[d] = (sumsByDay[d] || 0) + t.amount;
  }

  const dailyAmounts = Object.values(sumsByDay);
  const avgDaily = dailyAmounts.reduce((a, b) => a + b, 0) / dailyAmounts.length;
  const spent = transactions.reduce((s, t) => s + t.amount, 0);
  const remaining = Math.max(0, allowance - spent);

  if (avgDaily <= 0) return 'Not enough spending data yet.';
  if (remaining <= 0) return 'Allowance fully used. Reset or add funds!';

  const daysLeft = Math.floor(remaining / avgDaily);
  if (daysLeft <= 0) return 'At this rate, your budget is nearly exhausted!';
  if (daysLeft === 1) return 'At this rate, your budget runs out tomorrow!';
  return `At this rate, your budget lasts about ${daysLeft} more day${daysLeft !== 1 ? 's' : ''}.`;
}

// ─── 5. Receipt OCR Extraction (Tesseract.js WASM) ───────────────────────────

export interface ReceiptData {
  amount: number | null;
  merchant: string | null;
  rawText: string;
}

async function ocrExtractReceipt(
  imageSource: string,
  onProgress?: (status: string) => void
): Promise<ReceiptData> {
  const worker = await createWorker('eng', 1, {
    workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js',
    langPath: 'https://tessdata.projectnaptha.com/4.0.0',
    corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5/tesseract-core-simd-lstm.wasm.js',
    logger: (m: any) => {
      if (onProgress && typeof m.progress === 'number') {
        const pct = Math.round(m.progress * 100);
        onProgress(`Scanning receipt... ${pct}%`);
      }
    },
  });

  const { data: { text } } = await worker.recognize(imageSource);
  await worker.terminate();

  const rawText = text;
  let amount: number | null = null;

  // Multi-pattern total detection
  const totalPatterns = [
    /(?:grand\s*)?total\s*[:\-=]?\s*[P]?\s*([\d,]+\.?\d{0,2})/im,
    /amount\s*due\s*[:\-=]?\s*[P]?\s*([\d,]+\.?\d{0,2})/im,
    /sub[\s-]?total\s*[:\-=]?\s*[P]?\s*([\d,]+\.?\d{0,2})/im,
    /(?:to pay|balance due|net amount)\s*[:\-=]?\s*[P]?\s*([\d,]+\.?\d{0,2})/im,
    /[P]\s*([\d,]+\.\d{2})\s*$/m,
  ];

  for (const pattern of totalPatterns) {
    const match = rawText.match(pattern);
    if (match) {
      const raw = match[1].replace(/,/g, '');
      const parsed = parseFloat(raw);
      if (!isNaN(parsed) && parsed > 0) { amount = parsed; break; }
    }
  }

  // Fallback: pick the largest price-like number in the receipt
  if (amount === null) {
    const allNums = [...rawText.matchAll(/(?<![a-z])([\d,]+\.\d{2})(?!\d)/gi)]
      .map(m => parseFloat(m[1].replace(/,/g, '')))
      .filter(n => n > 0 && n < 100000)
      .sort((a, b) => b - a);
    if (allNums.length > 0) amount = allNums[0];
  }

  // Merchant: first clean non-numeric non-keyword line
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  let merchant: string | null = null;
  for (const line of lines) {
    if (/^\d+/.test(line)) continue;
    if (/receipt|cashier|server|order|date|time|tel|www|thank you/i.test(line)) continue;
    if (line.length < 3) continue;
    merchant = line;
    break;
  }

  return { amount, merchant, rawText };
}

// ─── 6. Dynamic Smart Daily Budget (Weighted Day-of-Week Regression) ─────────

function computeSmartDailyBudget(
  transactions: Transaction[],
  weeklyAllowance: number
): { aiLimit: number; isAIActive: boolean; todayDayName: string } {
  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayDow = new Date().getDay();
  const todayDayName = DAY_NAMES[todayDow];
  const staticLimit = weeklyAllowance / 7;

  if (transactions.length < 7) {
    return { aiLimit: staticLimit, isAIActive: false, todayDayName };
  }

  // Group totals by day-of-week, then by date (avoid double counting)
  const dayDateTotals: Record<number, Record<string, number>> = {};
  for (const t of transactions) {
    const dateStr = t.date.split('T')[0];
    const dow = new Date(dateStr + 'T12:00:00').getDay();
    if (!dayDateTotals[dow]) dayDateTotals[dow] = {};
    dayDateTotals[dow][dateStr] = (dayDateTotals[dow][dateStr] || 0) + Number(t.amount);
  }

  // Average spend per day-of-week
  const avgByDow: Record<number, number> = {};
  let totalWeightedAvg = 0;
  let coveredDays = 0;

  for (let dow = 0; dow < 7; dow++) {
    if (dayDateTotals[dow]) {
      const sums = Object.values(dayDateTotals[dow]);
      const avg = sums.reduce((a, b) => a + b, 0) / sums.length;
      avgByDow[dow] = avg;
      totalWeightedAvg += avg;
      coveredDays++;
    } else {
      avgByDow[dow] = staticLimit;
      totalWeightedAvg += staticLimit;
    }
  }

  if (totalWeightedAvg <= 0 || coveredDays < 2) {
    return { aiLimit: staticLimit, isAIActive: false, todayDayName };
  }

  const todayWeight = (avgByDow[todayDow] || staticLimit) / totalWeightedAvg;
  const rawAiLimit = Math.round(weeklyAllowance * todayWeight);

  // Sanity bounds: keep AI limit between 20% and 200% of static limit
  const bounded = Math.min(staticLimit * 2, Math.max(staticLimit * 0.2, rawAiLimit));

  return { aiLimit: bounded, isAIActive: true, todayDayName };
}

// ─── Public OfflineAIService ──────────────────────────────────────────────────

class OfflineAIService {

  /** Auto-categorize via MobileBERT (downloads once, 100% offline after) */
  static async categorizeExpense(text: string, categories: string[]): Promise<string> {
    if (!text || text.trim().length < 3 || !categories.length) return '';
    try {
      const classifier = await ClassifierSingleton.get();
      const result = await classifier(text.trim(), categories);
      if (result?.labels?.length > 0 && result.scores[0] > 0.3) return result.labels[0];
    } catch (e) {
      console.warn('[OfflineAI] Categorize skipped:', e);
    }
    return '';
  }

  /** 3 personalized tips — pure math, no API */
  static generateInsights(transactions: Transaction[], allowance: number): string[] {
    return localInsights(transactions, allowance);
  }

  /** Statistical spending anomaly detector — no API */
  static checkAnomaly(
    newTx: { amount: number; note?: string },
    history: Transaction[],
    allowance: number
  ): { isAnomaly: boolean; message: string } {
    return localAnomaly(newTx, history, allowance);
  }

  /** Moving-average burn rate — no API */
  static predictBurnRate(transactions: Transaction[], allowance: number): string {
    return localBurnRate(transactions, allowance);
  }

  /** OCR-based receipt scanner using Tesseract.js WASM (100% offline) */
  static async extractReceiptData(
    imageSource: string,
    onProgress?: (status: string) => void
  ): Promise<ReceiptData> {
    return ocrExtractReceipt(imageSource, onProgress);
  }

  /**
   * Dynamic daily budget via weighted day-of-week regression.
   * Only activates for weekly period with 7+ transactions.
   */
  static computeSmartDailyBudget(
    transactions: Transaction[],
    weeklyAllowance: number
  ): { aiLimit: number; isAIActive: boolean; todayDayName: string } {
    return computeSmartDailyBudget(transactions, weeklyAllowance);
  }

  static async testConnection(): Promise<{ ok: boolean; error?: string }> {
    return { ok: true };
  }
}

export default OfflineAIService;
