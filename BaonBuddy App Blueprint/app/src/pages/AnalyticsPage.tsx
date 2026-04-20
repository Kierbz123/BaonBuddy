import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '@/context/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  TrendingDown,
  TrendingUp,
  Calendar,
  PieChart,
  BarChart3,
  Cpu,
  Loader2,
  Sparkles
} from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';
import OfflineAIService from '@/services/aiSkills';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface AnalyticsPageProps {
  onNavigate: (page: string) => void;
}

export function AnalyticsPage({ onNavigate }: AnalyticsPageProps) {
  const { transactions, allowance } = useApp();
  const [period, setPeriod] = useState<'7days' | '30days' | '90days'>('30days');

  const [isAskingAI, setIsAskingAI] = useState(false);
  const [aiTips, setAiTips] = useState<string[]>([]);

  const periodDays = {
    '7days': 7,
    '30days': 30,
    '90days': 90,
  };

  const filteredTransactions = useMemo(() => {
    const cutoffDate = subDays(new Date(), periodDays[period]);
    return transactions.filter(t => new Date(t.date) >= cutoffDate);
  }, [transactions, period]);

  const stats = useMemo(() => {
    const total = filteredTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
    const count = filteredTransactions.length;
    const average = count > 0 ? total / count : 0;
    const dailyAverage = total / periodDays[period];
    
    return { total, count, average, dailyAverage };
  }, [filteredTransactions, period]);

  const dailyData = useMemo(() => {
    const days: { [key: string]: number } = {};
    const daysList = Array.from({ length: periodDays[period] }, (_, i) => {
      const date = subDays(new Date(), periodDays[period] - 1 - i);
      const key = format(date, 'yyyy-MM-dd');
      days[key] = 0;
      return key;
    });

    filteredTransactions.forEach(t => {
      if (days[t.date] !== undefined) {
        days[t.date] += Number(t.amount);
      }
    });

    return {
      labels: daysList.map(d => format(new Date(d), 'MMM dd')),
      data: daysList.map(d => days[d]),
    };
  }, [filteredTransactions, period]);

  const categoryData = useMemo(() => {
    const catTotals: { [key: string]: { total: number; name: string; color: string } } = {};
    
    filteredTransactions.forEach(t => {
      const catId = t.category_id?.toString() || 'uncategorized';
      const catName = t.category_name || 'Uncategorized';
      const catColor = t.category_color || '#636E72';
      
      if (!catTotals[catId]) {
        catTotals[catId] = { total: 0, name: catName, color: catColor };
      }
      catTotals[catId].total += Number(t.amount);
    });

    const sorted = Object.values(catTotals).sort((a, b) => b.total - a.total);
    
    return {
      labels: sorted.map(c => c.name),
      data: sorted.map(c => c.total),
      colors: sorted.map(c => c.color),
    };
  }, [filteredTransactions]);

  // ── Weekly comparison: this week vs last week (Mon–Sun) ──
  const weeklyComparisonData = useMemo(() => {
    const now = new Date();
    const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
    const lastWeekStart = startOfWeek(subDays(now, 7), { weekStartsOn: 1 });

    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const thisWeekAmounts = Array(7).fill(0);
    const lastWeekAmounts = Array(7).fill(0);

    transactions.forEach(t => {
      const d = new Date(t.date);
      const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
      const lastWeekEnd = endOfWeek(subDays(now, 7), { weekStartsOn: 1 });

      if (d >= thisWeekStart && d <= thisWeekEnd) {
        // 0=Mon … 6=Sun
        const idx = (d.getDay() + 6) % 7;
        thisWeekAmounts[idx] += Number(t.amount);
      } else if (d >= lastWeekStart && d <= lastWeekEnd) {
        const idx = (d.getDay() + 6) % 7;
        lastWeekAmounts[idx] += Number(t.amount);
      }
    });

    const thisWeekTotal = thisWeekAmounts.reduce((a, b) => a + b, 0);
    const lastWeekTotal = lastWeekAmounts.reduce((a, b) => a + b, 0);
    const diff = thisWeekTotal - lastWeekTotal;
    const diffPct = lastWeekTotal > 0 ? ((diff / lastWeekTotal) * 100).toFixed(1) : null;

    return { dayLabels, thisWeekAmounts, lastWeekAmounts, thisWeekTotal, lastWeekTotal, diff, diffPct };
  }, [transactions]);

  const weeklyChartData = {
    labels: weeklyComparisonData.dayLabels,
    datasets: [
      {
        label: 'This Week',
        data: weeklyComparisonData.thisWeekAmounts,
        backgroundColor: 'rgba(108, 92, 231, 0.85)',
        borderColor: 'rgba(108, 92, 231, 1)',
        borderWidth: 1,
        borderRadius: 4,
      },
      {
        label: 'Last Week',
        data: weeklyComparisonData.lastWeekAmounts,
        backgroundColor: 'rgba(108, 92, 231, 0.25)',
        borderColor: 'rgba(108, 92, 231, 0.5)',
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const weeklyChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: { boxWidth: 12, padding: 12, font: { size: 11 } },
      },
    },
    scales: {
      y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
      x: { grid: { display: false } },
    },
  };

  const barChartData = {
    labels: dailyData.labels,
    datasets: [
      {
        label: 'Daily Spending',
        data: dailyData.data,
        backgroundColor: 'rgba(108, 92, 231, 0.8)',
        borderColor: 'rgba(108, 92, 231, 1)',
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const pieChartData = {
    labels: categoryData.labels,
    datasets: [
      {
        data: categoryData.data,
        backgroundColor: categoryData.colors,
        borderWidth: 0,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          boxWidth: 12,
          padding: 10,
          font: {
            size: 11,
          },
        },
      },
    },
  };

  const handleAskAI = () => {
    setIsAskingAI(true);
    setAiTips([]);
    // Instant local analysis — no API call, no quota
    const tips = OfflineAIService.generateInsights(filteredTransactions, allowance.amount);
    setAiTips(tips);
    setIsAskingAI(false);
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2"
      >
        <Button variant="ghost" size="icon" onClick={() => onNavigate('dashboard')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
      </motion.div>

      {/* Period Selector */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex gap-2"
      >
        {(['7days', '30days', '90days'] as const).map((p) => (
          <Button
            key={p}
            variant={period === p ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriod(p)}
            className={period === p ? 'bg-[#6C5CE7]' : ''}
          >
            {p === '7days' ? '7 Days' : p === '30days' ? '30 Days' : '90 Days'}
          </Button>
        ))}
      </motion.div>

      {/* AI Smart Insights */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <Card className="border-0 shadow-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-20 pointer-events-none">
            <Cpu className="w-24 h-24" />
          </div>
          <CardContent className="p-5 relative z-10">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-300" />
                <h3 className="font-bold text-lg">AI Coach</h3>
              </div>
            </div>
            
            {aiTips.length > 0 ? (
              <div className="space-y-3 mt-3">
                {aiTips.map((tip, idx) => (
                  <motion.div 
                    key={idx} 
                    initial={{ opacity: 0, x: -10 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    transition={{ delay: idx * 0.2 }}
                    className="flex gap-2 items-start bg-white/10 p-3 rounded-xl backdrop-blur-sm"
                  >
                    <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">
                      {idx + 1}
                    </div>
                    <p className="text-sm font-medium leading-tight">{tip}</p>
                  </motion.div>
                ))}
                <Button 
                  onClick={() => setAiTips([])}
                  variant="ghost" 
                  className="w-full mt-2 h-8 text-white/70 hover:text-white hover:bg-white/10"
                >
                  Clear thoughts
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleAskAI}
                disabled={isAskingAI}
                className="w-full mt-2 bg-white text-indigo-600 hover:bg-gray-50 font-bold h-12 rounded-xl shadow-md"
              >
                {isAskingAI ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Thinking...</>
                ) : (
                  'Analyze My Spending'
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-2 gap-3"
      >
        <Card className="border-0 shadow-lg bg-white dark:bg-[#2D2D44]">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="w-4 h-4 text-red-500" />
              <span className="text-xs text-gray-500 dark:text-gray-400">Total Spent</span>
            </div>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(stats.total)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg bg-white dark:bg-[#2D2D44]">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-gray-500 dark:text-gray-400">Daily Avg</span>
            </div>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(stats.dailyAverage)}
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Charts */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Tabs defaultValue="daily" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="daily">
              <BarChart3 className="w-4 h-4 mr-1" />
              Daily
            </TabsTrigger>
            <TabsTrigger value="weekly">
              <Calendar className="w-4 h-4 mr-1" />
              Weekly
            </TabsTrigger>
            <TabsTrigger value="category">
              <PieChart className="w-4 h-4 mr-1" />
              Categories
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="daily">
            <Card className="border-0 shadow-lg bg-white dark:bg-[#2D2D44]">
              <CardHeader>
                <CardTitle className="text-lg">Daily Spending</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <Bar data={barChartData} options={chartOptions} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="weekly">
            <div className="space-y-3">
              {/* Summary comparison strip */}
              <div className="grid grid-cols-2 gap-3">
                <Card className="border-0 shadow-sm bg-white dark:bg-[#2D2D44]">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#6C5CE7]" />
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">This Week</span>
                    </div>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      {formatCurrency(weeklyComparisonData.thisWeekTotal)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-sm bg-white dark:bg-[#2D2D44]">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#6C5CE7] opacity-30" />
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Last Week</span>
                    </div>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      {formatCurrency(weeklyComparisonData.lastWeekTotal)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Trend badge */}
              {weeklyComparisonData.diffPct !== null && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold ${
                    weeklyComparisonData.diff > 0
                      ? 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30'
                      : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30'
                  }`}
                >
                  {weeklyComparisonData.diff > 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  <span>
                    {weeklyComparisonData.diff > 0 ? '+' : ''}{weeklyComparisonData.diffPct}% vs last week
                    {weeklyComparisonData.diff > 0 ? ' — spending increased' : ' — spending decreased 🎉'}
                  </span>
                </motion.div>
              )}

              {/* Grouped bar chart */}
              <Card className="border-0 shadow-lg bg-white dark:bg-[#2D2D44]">
                <CardHeader>
                  <CardTitle className="text-lg">This Week vs Last Week</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <Bar data={weeklyChartData} options={weeklyChartOptions} />
                  </div>
                </CardContent>
              </Card>

              {/* Per-day breakdown */}
              <div className="space-y-2">
                {weeklyComparisonData.dayLabels.map((day, i) => {
                  const thisAmt = weeklyComparisonData.thisWeekAmounts[i];
                  const lastAmt = weeklyComparisonData.lastWeekAmounts[i];
                  const higher = thisAmt > lastAmt;
                  return (
                    <Card key={day} className="border-0 shadow-sm bg-white dark:bg-[#2D2D44]">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 w-10">{day}</span>
                          <div className="flex-1 mx-3">
                            <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{
                                  width: weeklyComparisonData.thisWeekTotal > 0
                                    ? `${(thisAmt / Math.max(...weeklyComparisonData.thisWeekAmounts, ...weeklyComparisonData.lastWeekAmounts, 1)) * 100}%`
                                    : '0%'
                                }}
                                transition={{ duration: 0.5, delay: i * 0.05 }}
                                className="h-full rounded-full bg-[#6C5CE7]"
                              />
                            </div>
                          </div>
                          <div className="text-right min-w-[100px]">
                            <span className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(thisAmt)}</span>
                            <span className="text-[10px] text-gray-400 ml-2">
                              {lastAmt > 0 ? (
                                <span className={higher ? 'text-red-400' : 'text-emerald-400'}>
                                  vs {formatCurrency(lastAmt)}
                                </span>
                              ) : 'no data'}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="category">
            <Card className="border-0 shadow-lg bg-white dark:bg-[#2D2D44]">
              <CardHeader>
                <CardTitle className="text-lg">Spending by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  {categoryData.data.length > 0 ? (
                    <Pie data={pieChartData} options={pieOptions} />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      No data available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Category Breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Category Breakdown</h2>
        <div className="space-y-2">
          {categoryData.labels.map((label, index) => {
            const amount = categoryData.data[index];
            const percentage = stats.total > 0 ? (amount / stats.total) * 100 : 0;
            const color = categoryData.colors[index];
            
            return (
              <Card key={label} className="border-0 shadow-sm bg-white dark:bg-[#2D2D44]">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span className="font-medium text-gray-900 dark:text-white">{label}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(amount)}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                        ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: color }}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}

export default AnalyticsPage;
