import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './api';
import { CAT_EMOJI, CAT_COLORS } from './constants';
import {
  BrainCircuit,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  ArrowRight,
  Sparkles,
  PieChart as PieIcon,
  ShoppingBag,
  X,
  CheckCircle,
  ExternalLink,
  Clock,
  Repeat,
  Flame,
  ChevronRight,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n) =>
  '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

// ─── Backdrop / Modal wrapper ─────────────────────────────────────────────────

const Backdrop = ({ onClose, children }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center p-4"
    style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
    onClick={onClose}
  >
    <div
      className="relative w-full max-w-lg glass rounded-[2rem] p-8 border border-white/10 shadow-2xl"
      style={{ maxHeight: '90vh', overflowY: 'auto' }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={onClose}
        className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all"
      >
        <X size={16} />
      </button>
      {children}
    </div>
  </div>
);

// ─── Fix This Now Modal ───────────────────────────────────────────────────────

const FixNowModal = ({ data, onClose }) => {
  const navigate = useNavigate();
  const savings10 = Math.round((data.topCatAmount || 0) * 0.1);
  const savings20 = Math.round((data.topCatAmount || 0) * 0.2);

  return (
    <Backdrop onClose={onClose}>
      <div className="flex items-center gap-2 text-teal-400 font-bold text-xs uppercase tracking-widest mb-6">
        <Sparkles size={14} /> Action Plan
      </div>
      <h2 className="text-2xl font-black mb-2">Fix Your Finances Now</h2>
      <p className="text-gray-400 text-sm mb-6">
        Based on your spending data, here's a personalised action plan:
      </p>

      <div className="space-y-4 mb-8">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Biggest Spending Area</p>
          <p className="text-xl font-black capitalize">{data.topCategory || 'General'}</p>
          <p className="text-teal-400 font-semibold">{fmt(data.topCatAmount)} this month</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-center">
            <p className="text-xs text-gray-400 mb-1">Cut 10% → Save</p>
            <p className="text-2xl font-black text-emerald-400">{fmt(savings10)}</p>
          </div>
          <div className="bg-teal-500/10 border border-teal-500/20 rounded-2xl p-4 text-center">
            <p className="text-xs text-gray-400 mb-1">Cut 20% → Save</p>
            <p className="text-2xl font-black text-teal-400">{fmt(savings20)}</p>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-2">
          <p className="text-sm font-bold mb-3">Recommended actions:</p>
          {[
            `Review all "${data.topCategory || 'General'}" transactions`,
            'Set a monthly budget cap for this category',
            'Enable spending alerts at 80% of budget',
          ].map((tip, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-gray-300">
              <CheckCircle size={16} className="text-teal-400 mt-0.5 shrink-0" />
              {tip}
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => { onClose(); navigate('/expenses'); }}
          className="flex-1 bg-teal-500 text-white py-3 rounded-2xl font-black shadow-xl shadow-teal-500/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          Review Expenses <ExternalLink size={16} />
        </button>
        <button
          onClick={() => { onClose(); navigate('/budgets'); }}
          className="flex-1 bg-white/5 border border-white/10 py-3 rounded-2xl font-bold hover:bg-white/10 transition-all"
        >
          Set Budget
        </button>
      </div>
    </Backdrop>
  );
};

// ─── Dismiss Modal ────────────────────────────────────────────────────────────

const DismissModal = ({ summary, onClose, onDismiss }) => (
  <Backdrop onClose={onClose}>
    <div className="text-center">
      <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-6">
        <CheckCircle size={32} className="text-green-400" />
      </div>
      <h2 className="text-2xl font-black mb-3">Dismiss Alert</h2>
      <p className="text-gray-400 text-sm mb-2 leading-relaxed">{summary}</p>
      <p className="text-gray-500 text-xs mb-8">
        This alert will be hidden until new data triggers a fresh analysis.
      </p>
      <div className="flex gap-3">
        <button
          onClick={onDismiss}
          className="flex-1 bg-green-500 text-white py-3 rounded-2xl font-black hover:scale-105 active:scale-95 transition-all"
        >
          Yes, Dismiss
        </button>
        <button
          onClick={onClose}
          className="flex-1 bg-white/5 border border-white/10 py-3 rounded-2xl font-bold hover:bg-white/10 transition-all"
        >
          Keep Alert
        </button>
      </div>
    </div>
  </Backdrop>
);

// ─── Potential Savings Modal ──────────────────────────────────────────────────

const SavingsModal = ({ data, onClose }) => {
  const navigate = useNavigate();
  const categories = data.categoryBreakdown || [];

  return (
    <Backdrop onClose={onClose}>
      <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-widest mb-4">
        <TrendingUp size={14} /> Potential Savings
      </div>
      <h2 className="text-2xl font-black mb-1">Where You Can Save</h2>
      <p className="text-gray-400 text-sm mb-6">
        Reducing top categories by 10% could free up significant money monthly.
      </p>

      <div className="space-y-3 mb-6">
        {categories.length > 0 ? (
          categories.slice(0, 5).map((cat, i) => {
            const save = Math.round(cat.amount * 0.1);
            const color = CAT_COLORS[cat.name] || '#10b981';
            return (
              <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{CAT_EMOJI[cat.name?.toLowerCase()] || '💳'}</span>
                  <div>
                    <p className="font-semibold capitalize">{cat.name}</p>
                    <p className="text-xs text-gray-500">{fmt(cat.amount)} / month</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Save 10%</p>
                  <p className="font-black" style={{ color }}>{fmt(save)}</p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-white/5 rounded-2xl p-6 text-center text-gray-400 text-sm">
            No expense data available yet. Add some transactions to unlock this.
          </div>
        )}
      </div>

      <button
        onClick={() => { onClose(); navigate('/reports'); }}
        className="w-full bg-emerald-500 text-white py-3 rounded-2xl font-black hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20"
      >
        Full Report <ExternalLink size={16} />
      </button>
    </Backdrop>
  );
};

// ─── Heatmap Modal ────────────────────────────────────────────────────────────

const HeatmapModal = ({ data, onClose }) => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const heatmap = data.heatmap || {};
  const maxVal = Math.max(...Object.values(heatmap), 1);

  return (
    <Backdrop onClose={onClose}>
      <div className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-widest mb-4">
        <Flame size={14} /> Spending Heatmap
      </div>
      <h2 className="text-2xl font-black mb-1">When You Spend Most</h2>
      <p className="text-gray-400 text-sm mb-6">
        Your spending patterns by day of the week — based on your actual transactions.
      </p>

      <div className="space-y-3 mb-6">
        {days.map((day) => {
          const amount = heatmap[day] || 0;
          const pct = maxVal > 0 ? (amount / maxVal) * 100 : 0;
          const isHigh = pct > 60;
          return (
            <div key={day} className="flex items-center gap-4">
              <p className="text-sm font-semibold w-8 text-gray-400">{day}</p>
              <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, backgroundColor: isHigh ? '#f43f5e' : '#3b82f6' }}
                />
              </div>
              <p className="text-sm font-bold w-20 text-right text-gray-300">{fmt(amount)}</p>
            </div>
          );
        })}
      </div>

      {data.peakDay && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 text-sm text-blue-200">
          <span className="font-black">Tip:</span> You spend the most on{' '}
          <span className="font-black text-blue-300">{data.peakDay}s</span>. Consider deferring
          large purchases to weekdays.
        </div>
      )}
    </Backdrop>
  );
};

// ─── Anomalies Modal ──────────────────────────────────────────────────────────

const AnomaliesModal = ({ data, onClose }) => {
  const navigate = useNavigate();
  const anomalies = data.anomalies || [];

  return (
    <Backdrop onClose={onClose}>
      <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-widest mb-4">
        <AlertTriangle size={14} /> Anomalies
      </div>
      <h2 className="text-2xl font-black mb-1">Unusual Transactions</h2>
      <p className="text-gray-400 text-sm mb-6">
        Transactions significantly higher than your category averages.
      </p>

      <div className="space-y-3 mb-6">
        {anomalies.length > 0 ? (
          anomalies.map((a, i) => (
            <div key={i} className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{a.description || a.category}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {a.category} •{' '}
                    {new Date(a.transaction_date).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short',
                    })}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-black text-rose-400">{fmt(a.amount)}</p>
                  {a.avg && (
                    <p className="text-[10px] text-gray-500">avg {fmt(a.avg)}</p>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white/5 rounded-2xl p-6 text-center">
            <CheckCircle size={32} className="text-green-400 mx-auto mb-3" />
            <p className="text-gray-300 font-semibold">No anomalies found!</p>
            <p className="text-gray-500 text-sm mt-1">Your spending looks consistent.</p>
          </div>
        )}
      </div>

      <button
        onClick={() => { onClose(); navigate('/expenses'); }}
        className="w-full bg-rose-500 text-white py-3 rounded-2xl font-black hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-xl shadow-rose-500/20"
      >
        Review All Expenses <ExternalLink size={16} />
      </button>
    </Backdrop>
  );
};

// ─── Recurrence Modal ─────────────────────────────────────────────────────────

const RecurrenceModal = ({ data, onClose }) => {
  const recurrents = data.recurrents || [];
  const total = recurrents.reduce((s, r) => s + (r.amount || 0), 0);

  return (
    <Backdrop onClose={onClose}>
      <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-widest mb-4">
        <Repeat size={14} /> Smart Recurrence
      </div>
      <h2 className="text-2xl font-black mb-1">Recurring Payments</h2>
      <p className="text-gray-400 text-sm mb-6">
        Transactions we detected repeating monthly — subscriptions, rent, bills.
      </p>

      <div className="space-y-3 mb-6">
        {recurrents.length > 0 ? (
          recurrents.map((r, i) => (
            <div key={i} className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{CAT_EMOJI[r.category?.toLowerCase()] || '🔄'}</span>
                <div>
                  <p className="font-semibold">{r.description || r.category}</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Clock size={10} /> Repeats monthly
                  </p>
                </div>
              </div>
              <p className="font-black text-amber-400">{fmt(r.amount)}</p>
            </div>
          ))
        ) : (
          <div className="bg-white/5 rounded-2xl p-6 text-center text-gray-400 text-sm">
            No recurring patterns detected yet. Add more transactions for analysis.
          </div>
        )}
      </div>

      {recurrents.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-sm text-amber-200">
          <span className="font-black">Total monthly commitments:</span>{' '}
          <span className="font-black text-amber-300">{fmt(total)}</span>
        </div>
      )}
    </Backdrop>
  );
};

// ─── Insight Card ─────────────────────────────────────────────────────────────

const InsightCard = ({ title, description, icon: Icon, color, action, onClick }) => (
  <div
    className="glass p-8 rounded-[2rem] border-glass-border relative overflow-hidden group cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
    onClick={onClick}
  >
    <div
      className="absolute -bottom-6 -right-6 w-32 h-32 rounded-full blur-3xl opacity-20 transition-opacity duration-300 group-hover:opacity-40"
      style={{ backgroundColor: color }}
    />
    <div className="relative z-10">
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6 shadow-lg"
        style={{ backgroundColor: `${color}20`, color }}
      >
        <Icon size={24} />
      </div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-gray-400 text-sm leading-relaxed mb-6">{description}</p>
      {action && (
        <button
          className="flex items-center gap-2 text-sm font-bold transition-all hover:gap-3 pointer-events-none"
          style={{ color }}
        >
          {action} <ArrowRight size={16} />
        </button>
      )}
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const Insights = () => {
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [modal, setModal] = useState(null); // 'fix' | 'dismiss' | 'savings' | 'heatmap' | 'anomalies' | 'recurrence'

  const [forecast, setForecast] = useState({ summary: '', topCategory: '', topCatAmount: 0 });
  const [savingsData, setSavingsData] = useState({ categoryBreakdown: [] });
  const [heatmapData, setHeatmapData] = useState({ heatmap: {}, peakDay: null });
  const [anomalyData, setAnomalyData] = useState({ anomalies: [] });
  const [recurrenceData, setRecurrenceData] = useState({ recurrents: [] });

  // ── Local analysis from transaction data ───────────────────────────────────

  const buildInsights = (transactions) => {
    const expenses = transactions.filter((t) => t.type === 'expense');

    // Category totals
    const catMap = {};
    expenses.forEach((t) => {
      const cat = t.category || 'Others';
      catMap[cat] = (catMap[cat] || 0) + parseFloat(t.amount || 0);
    });
    const categoryBreakdown = Object.entries(catMap)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
    const topCat = categoryBreakdown[0] || { name: 'General', amount: 0 };

    // Day-of-week heatmap
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayMap = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
    expenses.forEach((t) => {
      const d = dayNames[new Date(t.transaction_date).getDay()];
      dayMap[d] = (dayMap[d] || 0) + parseFloat(t.amount || 0);
    });
    const peakDay = Object.entries(dayMap).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    // Anomaly detection (2.5× category average)
    const catTotal = {};
    const catCount = {};
    expenses.forEach((t) => {
      const cat = t.category || 'Others';
      catTotal[cat] = (catTotal[cat] || 0) + parseFloat(t.amount || 0);
      catCount[cat] = (catCount[cat] || 0) + 1;
    });
    const anomalies = expenses
      .filter((t) => {
        const cat = t.category || 'Others';
        if (catCount[cat] < 2) return false;
        const avg = catTotal[cat] / catCount[cat];
        return parseFloat(t.amount) > avg * 2.5;
      })
      .map((t) => {
        const cat = t.category || 'Others';
        return { ...t, avg: catTotal[cat] / catCount[cat] };
      })
      .slice(0, 5);

    // Recurring payments (same description in ≥2 different months)
    const descMap = {};
    expenses.forEach((t) => {
      const key = (t.description || t.category || '').toLowerCase().trim();
      if (!key) return;
      if (!descMap[key]) descMap[key] = [];
      descMap[key].push(t);
    });
    const recurrents = Object.entries(descMap)
      .filter(([, txs]) => {
        const months = new Set(txs.map((t) => new Date(t.transaction_date).getMonth()));
        return months.size >= 2;
      })
      .map(([, txs]) => ({
        ...txs[0],
        amount: txs.reduce((s, t) => s + parseFloat(t.amount || 0), 0) / txs.length,
      }))
      .slice(0, 6);

    return { topCat, categoryBreakdown, dayMap, peakDay, anomalies, recurrents };
  };

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchData = async () => {
    setLoading(true);
    try {
      const [alertRes, txRes] = await Promise.all([
        api.get('/budgets/predict').catch(() => ({ data: {} })),
        api.get('/transactions/').catch(() => ({ data: { transactions: [] } })),
      ]);

      const transactions = txRes.data.transactions || [];
      const { topCat, categoryBreakdown, dayMap, peakDay, anomalies, recurrents } =
        buildInsights(transactions);

      setForecast({
        summary:
          alertRes.data.alert ||
          (topCat.amount > 0
            ? `Your top spending category is "${topCat.name}" at ${fmt(topCat.amount)} this month.`
            : "No immediate financial alerts. You're doing great!"),
        topCategory: alertRes.data.top_category || topCat.name || 'General',
        topCatAmount: topCat.amount,
      });

      setSavingsData({ categoryBreakdown });
      setHeatmapData({ heatmap: dayMap, peakDay });
      setAnomalyData({ anomalies });
      setRecurrenceData({ recurrents });
    } catch (err) {
      console.error('Failed to load insights', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDismissConfirm = () => {
    setDismissed(true);
    setModal(null);
  };

  // ── Derived display ────────────────────────────────────────────────────────

  const savings10 = Math.round((savingsData.categoryBreakdown[0]?.amount || 0) * 0.1);
  const anomalyCount = anomalyData.anomalies.length;
  const recurrentCount = recurrenceData.recurrents.length;
  const recurrentTotal = recurrenceData.recurrents.reduce((s, r) => s + (r.amount || 0), 0);

  return (
    <div className="max-w-6xl mx-auto space-y-10 slide-in">

      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-16">
        <div className="w-16 h-16 rounded-3xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 mx-auto mb-6 shadow-2xl shadow-teal-500/20">
          <BrainCircuit size={32} />
        </div>
        <h1 className="text-4xl font-black mb-4 tracking-tight">Financial Intelligence</h1>
        <p className="text-gray-500">AI-powered analysis of your spending habits and financial health</p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

        {/* AI Forecast hero card */}
        <div className="md:col-span-2 lg:col-span-2 glass rounded-[3rem] p-10 bg-gradient-to-br from-teal-500/10 via-transparent to-transparent border-teal-500/10 relative overflow-hidden min-h-[350px] flex flex-col justify-center">
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-teal-400 font-bold text-xs uppercase tracking-[0.2em] mb-6">
              <Sparkles size={14} /> AI Forecast
            </div>
            <h2 className="text-3xl font-black mb-6 leading-tight max-w-md">
              {loading
                ? 'Analyzing your financial behavior…'
                : dismissed
                ? '✅ Alert dismissed. Keep up the good work!'
                : forecast.summary}
            </h2>
            {!loading && !dismissed && (
              <div className="flex gap-4 flex-wrap">
                <button
                  onClick={() => setModal('fix')}
                  className="bg-teal-500 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-teal-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                >
                  Fix This Now <ChevronRight size={18} />
                </button>
                <button
                  onClick={() => setModal('dismiss')}
                  className="bg-white/5 border border-white/10 text-white px-8 py-4 rounded-2xl font-black hover:bg-white/10 active:scale-95 transition-all"
                >
                  Dismiss
                </button>
              </div>
            )}
            {dismissed && (
              <button
                onClick={() => { setDismissed(false); fetchData(); }}
                className="bg-white/5 border border-white/10 text-white px-6 py-3 rounded-2xl font-bold hover:bg-white/10 transition-all text-sm"
              >
                Refresh Insights
              </button>
            )}
          </div>
          <div className="absolute top-1/2 right-12 -translate-y-1/2 opacity-10 hidden lg:block">
            <BrainCircuit size={200} className="text-teal-400" />
          </div>
        </div>

        {/* Potential Savings */}
        <InsightCard
          title="Potential Savings"
          description={
            savings10 > 0
              ? `By reducing "${forecast.topCategory}" spending by 10%, you could save roughly ${fmt(savings10)} this month.`
              : 'Start tracking expenses to see personalised saving opportunities.'
          }
          icon={TrendingUp}
          color="#10b981"
          action="View Breakdown"
          onClick={() => setModal('savings')}
        />

        {/* Spending Heatmap */}
        <InsightCard
          title="Spending Heatmap"
          description={
            heatmapData.peakDay
              ? `Most of your spending happens on ${heatmapData.peakDay}s. Consider moving large purchases to quieter days.`
              : 'Add more transactions to reveal your spending patterns by day of week.'
          }
          icon={Flame}
          color="#3b82f6"
          action="See Heatmap"
          onClick={() => setModal('heatmap')}
        />

        {/* Anomalies Found */}
        <InsightCard
          title="Anomalies Found"
          description={
            anomalyCount > 0
              ? `Detected ${anomalyCount} unusually large transaction${anomalyCount > 1 ? 's' : ''} compared to your category averages. Worth reviewing.`
              : 'No anomalies detected — your spending looks consistent across all categories.'
          }
          icon={AlertTriangle}
          color="#f43f5e"
          action="Verify Transactions"
          onClick={() => setModal('anomalies')}
        />

        {/* Smart Recurrence */}
        <InsightCard
          title="Smart Recurrence"
          description={
            recurrentCount > 0
              ? `Detected ${recurrentCount} recurring payment${recurrentCount > 1 ? 's' : ''} (subscriptions, bills, rent). Total monthly commitment: ${fmt(recurrentTotal)}.`
              : 'No recurring patterns found yet. Keep adding transactions for smarter analysis.'
          }
          icon={Lightbulb}
          color="#f59e0b"
          action="Manage Subs"
          onClick={() => setModal('recurrence')}
        />
      </div>

      {/* Shopping habits banner */}
      <div className="glass p-10 rounded-[3rem] border-glass-border flex flex-col items-center text-center gap-8">
        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
          <ShoppingBag size={28} className="text-white" />
        </div>
        <div className="max-w-xl">
          <h3 className="text-2xl font-bold mb-2">Shopping habits look consistent</h3>
          <p className="text-gray-500 leading-relaxed text-sm">
            Your overall shopping frequency has stabilized. You are spending 5% less than your
            6-month average in non-essential categories. Keep it up!
          </p>
        </div>
        <div className="flex gap-2">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full ${i < 4 ? 'bg-teal-500 shadow-[0_0_10px_rgba(20,184,166,0.5)]' : 'bg-white/10'}`}
            />
          ))}
        </div>
      </div>

      {/* ── Modals ── */}
      {modal === 'fix' && (
        <FixNowModal data={forecast} onClose={() => setModal(null)} />
      )}
      {modal === 'dismiss' && (
        <DismissModal
          summary={forecast.summary}
          onClose={() => setModal(null)}
          onDismiss={handleDismissConfirm}
        />
      )}
      {modal === 'savings' && (
        <SavingsModal data={savingsData} onClose={() => setModal(null)} />
      )}
      {modal === 'heatmap' && (
        <HeatmapModal data={heatmapData} onClose={() => setModal(null)} />
      )}
      {modal === 'anomalies' && (
        <AnomaliesModal data={anomalyData} onClose={() => setModal(null)} />
      )}
      {modal === 'recurrence' && (
        <RecurrenceModal data={recurrenceData} onClose={() => setModal(null)} />
      )}
    </div>
  );
};

export default Insights;