import { pipeline, env } from '@xenova/transformers';
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
    tips.push(`⚠️ You've used ${pctUsed.toFixed(0)}% of your allowance — slow down!`);
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

  // Tip 3 – days remaining or savings encouragement
  if (remaining <= 0) {
    tips.push('You have exceeded your allowance. Avoid new expenses today!');
  } else if (daysLeft < 3) {
    tips.push(`Only ₱${remaining.toFixed(0)} left — budget carefully for the next few days.`);
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
    return { isAnomaly: true, message: `This expense is unusually high — ${newTx.amount.toFixed(0)} is ${zScore.toFixed(1)}× above your average.` };
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


}

export default OfflineAIService;
