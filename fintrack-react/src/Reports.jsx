import React, { useState, useEffect, useRef } from 'react';
import api from './api';
import { 
  FileText, 
  Download, 
  BarChart3, 
  Filter,
  ArrowUpRight,
  TrendingDown,
  PieChart,
  TrendingUp,
  Sparkles,
  Target
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
} from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';
import { CAT_EMOJI } from './constants';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Filler, Title, Tooltip, Legend
);

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const PALETTE = [
  '#14b8a6','#f59e0b','#ec4899','#8b5cf6',
  '#ef4444','#3b82f6','#10b981','#f43f5e',
  '#0ea5e9','#64748b','#a78bfa','#fb923c',
];

// ── Savings Gauge ──────────────────────────────────────────────────────────────
const SavingsGauge = ({ rate }) => {
  const clamped = Math.max(0, Math.min(100, rate || 0));
  const r = 54, cx = 70, cy = 70;
  const circumference = Math.PI * r;
  const dash = (clamped / 100) * circumference;
  const color = clamped >= 50 ? '#10b981' : clamped >= 20 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex flex-col items-center">
      <svg width="140" height="82" viewBox="0 0 140 82">
        <path d={`M ${cx-r},${cy} A ${r},${r} 0 0,1 ${cx+r},${cy}`}
          fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" strokeLinecap="round"/>
        <path d={`M ${cx-r},${cy} A ${r},${r} 0 0,1 ${cx+r},${cy}`}
          fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          style={{ transition: 'stroke-dasharray 1.2s ease' }}/>
        <text x={cx} y={cy-12} textAnchor="middle" fill={color} fontSize="22" fontWeight="bold">{clamped.toFixed(0)}%</text>
        <text x={cx} y={cy+4}  textAnchor="middle" fill="#6b7280" fontSize="9">Savings Rate</text>
      </svg>
      <p className="text-xs text-gray-500 mt-1 text-center">
        {clamped >= 50 ? '🏆 Excellent! Keep it up' : clamped >= 20 ? '👍 Good, room to grow' : '⚠️ Try to cut expenses'}
      </p>
    </div>
  );
};

// ── PDF Generator (Professional Multi-Page Report) ─────────────────────────────
const generatePDF = async (chartRefs, transactions) => {
  const [jsPdfModule, htmlToImage, autoTableModule] = await Promise.all([
    import('jspdf'),
    import('html-to-image'),
    import('jspdf-autotable') 
  ]);

  const jsPDF = jsPdfModule.default?.jsPDF || jsPdfModule.jsPDF || jsPdfModule.default;
  
  // FIXED: Extract the standalone autoTable function directly from the module
  const autoTable = autoTableModule.default || autoTableModule;

  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  let y = 15;

  const now = new Date();
  
  // 1. DATA PROCESSING (Current Month Deep Dive)
  const currentMonthTx = transactions.filter(t => {
    if (!t.transaction_date) return false;
    const d = new Date(t.transaction_date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const mExpenses = currentMonthTx.filter(t => t.type === 'expense');
  const mIncomeTx = currentMonthTx.filter(t => t.type === 'income');

  const mTotalExpense = mExpenses.reduce((sum, t) => sum + Number(t.amount), 0);
  const mTotalIncome = mIncomeTx.reduce((sum, t) => sum + Number(t.amount), 0);
  const mNet = mTotalIncome - mTotalExpense;
  const mSavingsRate = mTotalIncome > 0 ? ((mNet / mTotalIncome) * 100).toFixed(1) : 0;
  
  const largestExpense = mExpenses.reduce((max, t) => Number(t.amount) > Number(max?.amount || 0) ? t : max, null);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const currentDay = now.getDate();
  const avgDailySpend = currentDay > 0 ? (mTotalExpense / currentDay).toFixed(2) : 0;
  const projectedMonthlySpend = (avgDailySpend * daysInMonth).toFixed(2);

  // ── PAGE 1: EXECUTIVE SUMMARY ──
  // Header Ribbon
  doc.setFillColor(17, 24, 39); // Slate-900
  doc.rect(0, 0, pw, 40, 'F');
  
  doc.setTextColor(45, 212, 191); // Teal-400
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.text('FINANCIAL INTELLIGENCE REPORT', 15, 20);
  
  doc.setFontSize(11);
  doc.setTextColor(156, 163, 175); // Gray-400
  doc.setFont('helvetica', 'normal');
  doc.text(`Reporting Period: ${now.toLocaleString('default', { month: 'long', year: 'numeric' })}`, 15, 28);
  doc.text(`Generated on: ${now.toLocaleDateString('en-IN')}`, 15, 34);

  y = 50;

  // Key Performance Indicators (KPIs)
  doc.setTextColor(31, 41, 55); // Gray-800
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Executive Summary (Current Month)', 15, y);
  y += 8;

  const drawBox = (x, y, w, h, title, val, color) => {
    doc.setFillColor(249, 250, 251);
    doc.setDrawColor(229, 231, 235);
    doc.roundedRect(x, y, w, h, 2, 2, 'FD');
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.setFont('helvetica', 'normal');
    doc.text(title, x + 4, y + 7);
    doc.setFontSize(14);
    doc.setTextColor(...color);
    doc.setFont('helvetica', 'bold');
    doc.text(val, x + 4, y + 15);
  };

  const boxW = (pw - 38) / 3;
  drawBox(15, y, boxW, 20, 'Total Inflow', fmt(mTotalIncome), [16, 185, 129]);
  drawBox(15 + boxW + 4, y, boxW, 20, 'Total Outflow', fmt(mTotalExpense), [239, 68, 68]);
  drawBox(15 + (boxW + 4)*2, y, boxW, 20, 'Net Savings', fmt(mNet), [14, 165, 233]);
  
  y += 24;
  
  drawBox(15, y, boxW, 20, 'Savings Rate', `${mSavingsRate}%`, mSavingsRate > 20 ? [16, 185, 129] : [245, 158, 11]);
  drawBox(15 + boxW + 4, y, boxW, 20, 'Avg Daily Spend', fmt(avgDailySpend), [239, 68, 68]);
  drawBox(15 + (boxW + 4)*2, y, boxW, 20, 'Projected Mo. Spend', fmt(projectedMonthlySpend), [107, 114, 128]);

  y += 28;

  if (largestExpense) {
    doc.setFontSize(11);
    doc.setTextColor(55, 65, 81);
    doc.text(`Largest Single Expense: ${fmt(largestExpense.amount)} on ${largestExpense.category} (${largestExpense.description || 'N/A'})`, 15, y);
    y += 12;
  }

  // ── PAGE 1: CATEGORY AVERAGES ──
  doc.setFontSize(16);
  doc.setTextColor(31, 41, 55);
  doc.setFont('helvetica', 'bold');
  doc.text('Category Analysis', 15, y);
  y += 5;

  const catMap = {};
  mExpenses.forEach(t => {
    const c = t.category || 'Others';
    if (!catMap[c]) catMap[c] = { total: 0, count: 0 };
    catMap[c].total += Number(t.amount);
    catMap[c].count += 1;
  });

  const catTableData = Object.keys(catMap)
    .map(c => [
      c, 
      fmt(catMap[c].total), 
      catMap[c].count.toString(), 
      fmt(catMap[c].total / catMap[c].count), 
      mTotalExpense > 0 ? ((catMap[c].total / mTotalExpense) * 100).toFixed(1) + '%' : '0%'
    ])
    .sort((a, b) => Number(b[1].replace(/[^0-9.-]+/g,"")) - Number(a[1].replace(/[^0-9.-]+/g,"")));

  // FIXED: Using the imported autoTable function
  autoTable(doc, {
    startY: y,
    head: [['Category', 'Total Spent', '# of Txns', 'Avg per Txn', '% of Total']],
    body: catTableData.length ? catTableData : [['No expenses this month', '-', '-', '-', '-']],
    theme: 'grid',
    headStyles: { fillColor: [45, 212, 191], textColor: [255, 255, 255] },
    styles: { fontSize: 9, cellPadding: 4 }
  });
  
  y = doc.lastAutoTable.finalY + 15;

  // ── PAGE 2: TRANSACTION LEDGER ──
  doc.addPage();
  y = 20;
  doc.setFontSize(16);
  doc.setTextColor(31, 41, 55);
  doc.setFont('helvetica', 'bold');
  doc.text('Monthly Transaction Ledger', 15, y);
  
  const txTableData = currentMonthTx
    .sort((a,b) => new Date(b.transaction_date) - new Date(a.transaction_date))
    .map(t => [
      new Date(t.transaction_date).toLocaleDateString('en-IN'),
      t.type.toUpperCase(),
      t.category || 'N/A',
      t.description || '',
      fmt(t.amount)
    ]);

  // FIXED: Using the imported autoTable function
  autoTable(doc, {
    startY: y + 8,
    head: [['Date', 'Type', 'Category', 'Description', 'Amount']],
    body: txTableData.length ? txTableData : [['No transactions recorded this month.', '', '', '', '']],
    theme: 'striped',
    headStyles: { fillColor: [31, 41, 55] },
    didParseCell: function(data) {
      if (data.section === 'body' && data.column.index === 1) {
         data.cell.styles.textColor = data.cell.raw === 'INCOME' ? [16, 185, 129] : [239, 68, 68];
         data.cell.styles.fontStyle = 'bold';
      }
    },
    styles: { fontSize: 8, cellPadding: 3 }
  });

  // ── PAGE 3: VISUAL INSIGHTS (Charts) ──
  doc.addPage();
  y = 20;
  doc.setFontSize(16);
  doc.setTextColor(31, 41, 55);
  doc.setFont('helvetica', 'bold');
  doc.text('Visual Analytics', 15, y);
  y += 10;

  for (const { el, title } of chartRefs) {
    if (!el || title === 'Report Summary') continue;

    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) continue;

    const dataUrl = await htmlToImage.toJpeg(el, { 
      quality: 0.95, 
      backgroundColor: '#111827', 
      pixelRatio: 2,
      filter: (node) => {
        // Skip external stylesheets that cause SecurityError (mostly Google Fonts)
        if (node.tagName === 'LINK' && node.rel === 'stylesheet' && !node.href.includes(window.location.origin)) {
          return false;
        }
        return true;
      }
    });
    const imgW = pw - 30;
    const imgH = (rect.height / rect.width) * imgW;

    if (y + imgH > ph - 20) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(11);
    doc.setTextColor(55, 65, 81);
    doc.text(title, 15, y + 4);
    y += 8;

    doc.addImage(dataUrl, 'JPEG', 15, y, imgW, imgH);
    y += imgH + 12;
  }

  // Footer Pagination applied to all generated pages
  const pageCount = doc.internal.getNumberOfPages();
  for(let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.setFont('helvetica', 'normal');
    doc.text(`Page ${i} of ${pageCount} | FinTrack Personal Finance Intelligence`, pw / 2, ph - 10, { align: 'center' });
  }

  doc.save(`FinTrack_Professional_Report_${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, '0')}.pdf`);
};

// ── Main ───────────────────────────────────────────────────────────────────────
const Reports = () => {
  const [data,         setData]       = useState({ income: 0, expenses: 0 });
  const [transactions, setTx]         = useState([]);
  const [loading,      setLoading]    = useState(true);
  const [pdfLoading,   setPdfLoading] = useState(false);

  const barRef     = useRef();
  const pieRef     = useRef();
  const lineRef    = useRef();

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [sumRes, txRes] = await Promise.all([
          api.get('/reports/summary'),
          api.get('/transactions/'),
        ]);
        setData({ income: sumRes.data.total_income || 0, expenses: sumRes.data.total_expense || 0 });
        setTx(txRes.data.transactions || []);
      } catch (e) {
        console.error('Report fetch failed:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Category breakdown
  const catMap = {};
  transactions.filter(t => t.type === 'expense').forEach(t => {
    const c = t.category || 'Others';
    catMap[c] = (catMap[c] || 0) + Number(t.amount);
  });
  const catLabels  = Object.keys(catMap);
  const catAmounts = Object.values(catMap);

  // Monthly trend
  const monthlyMap = {};
  transactions.forEach(t => {
    if (!t.transaction_date) return;
    const d   = new Date(t.transaction_date);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    if (!monthlyMap[key]) monthlyMap[key] = { income:0, expense:0 };
    monthlyMap[key][t.type === 'income' ? 'income' : 'expense'] += Number(t.amount);
  });
  const monthKeys   = Object.keys(monthlyMap).sort().slice(-6);
  const monthLabels = monthKeys.map(k => {
    const [y,m] = k.split('-');
    return new Date(y, m-1).toLocaleDateString('en-IN', { month:'short', year:'2-digit' });
  });

  const savingsRate = data.income > 0 ? Math.round(((data.income - data.expenses) / data.income) * 100) : 0;

  // Chart data
  const barData = {
    labels: ['Income','Expenses'],
    datasets: [{ label:'Amount', data:[data.income, data.expenses], backgroundColor:['#10b981','#ef4444'], borderRadius:12 }],
  };
  const pieData = {
    labels: catLabels,
    datasets: [{ data: catAmounts, backgroundColor: PALETTE.slice(0, catLabels.length), borderWidth:2, borderColor:'#0a0a1a' }],
  };
  const lineData = {
    labels: monthLabels,
    datasets: [
      { label:'Income',   data: monthKeys.map(k=>monthlyMap[k].income),  borderColor:'#10b981', backgroundColor:'rgba(16,185,129,0.1)', fill:true, tension:0.4, pointBackgroundColor:'#10b981', pointRadius:4 },
      { label:'Expenses', data: monthKeys.map(k=>monthlyMap[k].expense), borderColor:'#ef4444', backgroundColor:'rgba(239,68,68,0.07)',  fill:true, tension:0.4, pointBackgroundColor:'#ef4444', pointRadius:4 },
    ],
  };

  const baseOpts = {
    responsive:true, maintainAspectRatio:false,
    plugins:{ legend:{ display:false } },
    scales:{
      y:{ grid:{ color:'rgba(255,255,255,0.05)' }, ticks:{ color:'#666' } },
      x:{ grid:{ display:false }, ticks:{ color:'#666' } },
    },
  };
  const lineOpts = { ...baseOpts, plugins:{ legend:{ display:true, labels:{ color:'#9ca3af', boxWidth:12, padding:12 } } } };
  const pieOpts  = {
    responsive:true, maintainAspectRatio:false,
    plugins:{ legend:{ position:'bottom', labels:{ color:'#9ca3af', boxWidth:12, padding:10, font:{ size:11 } } } },
  };

  const handleDownloadPDF = async () => {
    setPdfLoading(true);
    try {
      // Pass raw transactions into our new detailed PDF generator
      await generatePDF([
        { el: barRef.current,     title: 'Income vs Expenses'             },
        { el: pieRef.current,     title: 'Expense Breakdown by Category'  },
        { el: lineRef.current,    title: 'Monthly Income & Expense Trend' }
      ], transactions);
    } catch (err) {
      console.error('PDF failed:', err);
      alert('PDF generation failed — please try again.');
    } finally {
      setPdfLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const res = await api.get('/reports/export/csv', { responseType:'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type:'text/csv' }));
      const a   = Object.assign(document.createElement('a'), { href:url, download:`FinTrack_${new Date().toISOString().split('T')[0]}.csv` });
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch { alert('Failed to export CSV.'); }
  };

  if (loading) return <div className="p-20 text-center text-teal-400 animate-pulse">Loading Financial Data…</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 slide-in">

      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            Financial Reports <FileText size={28} className="text-teal-400" />
          </h1>
          <p className="text-gray-500 mt-1">Analyze your financial statements &amp; visualizations</p>
        </div>
        <div className="flex gap-3">
          <button className="bg-white/5 border border-white/10 text-white px-5 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-white/10 transition-all">
            <Filter size={18}/> Filter
          </button>
          <button onClick={handleExport} className="bg-teal-500 hover:bg-teal-400 text-white px-5 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-teal-500/20 active:scale-95 transition-all">
            <Download size={18}/> Export CSV
          </button>
        </div>
      </div>

      {/* Row 1: Bar + Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass p-8 rounded-[2.5rem] border-glass-border">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <BarChart3 size={20} className="text-teal-400"/> Income vs Expenses
            </h3>
            <div className="flex gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block"/> Income</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block"/> Expenses</span>
            </div>
          </div>
          <div ref={barRef} style={{ height:'260px' }}>
            <Bar data={barData} options={baseOpts}/>
          </div>
        </div>

        <div className="glass p-8 rounded-[2.5rem] border-glass-border">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-6">
            <PieChart size={20} className="text-teal-400"/> Expense by Category
          </h3>
          <div ref={pieRef} style={{ height:'260px' }}>
            {catLabels.length > 0
              ? <Pie data={pieData} options={pieOpts}/>
              : <p className="text-gray-500 text-sm flex h-full items-center justify-center">No expense data yet</p>
            }
          </div>
        </div>
      </div>

      {/* Row 2: Monthly trend */}
      <div className="glass p-8 rounded-[2.5rem] border-glass-border">
        <h3 className="text-lg font-bold flex items-center gap-2 mb-6">
          <TrendingUp size={20} className="text-teal-400"/> Monthly Income &amp; Expense Trend
        </h3>
        <div ref={lineRef} style={{ height:'220px' }}>
          {monthKeys.length > 0
            ? <Line data={lineData} options={lineOpts}/>
            : <p className="text-gray-500 text-sm text-center pt-16">Not enough data to show trend</p>
          }
        </div>
      </div>

      {/* Row 3: Summary + Gauge + PDF */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Summary */}
        <div className="glass rounded-[2rem] p-6 border-glass-border space-y-5">
          <h3 className="text-lg font-bold border-b border-white/5 pb-4">Report Summary (All Time)</h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-400"><ArrowUpRight size={18}/></div>
              <div><p className="font-bold text-sm">Total Inflow</p><p className="text-[11px] text-gray-500">Cash received</p></div>
            </div>
            <p className="font-black text-green-400">{fmt(data.income)}</p>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400"><TrendingDown size={18}/></div>
              <div><p className="font-bold text-sm">Total Outflow</p><p className="text-[11px] text-gray-500">Expenditure tracked</p></div>
            </div>
            <p className="font-black text-red-400">{fmt(data.expenses)}</p>
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-400"><Target size={18}/></div>
              <p className="font-bold text-sm">Net Savings</p>
            </div>
            <p className="font-black text-white">{fmt(data.income - data.expenses)}</p>
          </div>
        </div>

        {/* Savings gauge */}
        <div className="glass p-6 rounded-[2rem] border-glass-border flex flex-col items-center justify-center gap-3">
          <h3 className="text-lg font-bold flex items-center gap-2 self-start">
            <Sparkles size={20} className="text-teal-400"/> Savings Health
          </h3>
          <SavingsGauge rate={savingsRate}/>
          <p className="text-xs text-gray-500 text-center">
            You're saving <span className="text-white font-bold">{savingsRate}%</span> of your total income this period.
          </p>
        </div>

        {/* PDF download */}
        <div className="glass p-6 rounded-[2rem] bg-gradient-to-tr from-teal-500/10 to-transparent border-teal-500/10 flex flex-col justify-between gap-4">
          <div>
            <h3 className="font-bold mb-2 flex items-center gap-2">
              <FileText size={18} className="text-teal-400"/> Deep Dive PDF Report
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Download a professional multi-page document featuring your current month's KPIs, category averages, full transaction ledger, and visual analytics.
            </p>
          </div>
          <button
            onClick={handleDownloadPDF}
            disabled={pdfLoading}
            className="w-full py-3.5 rounded-xl bg-teal-500 text-white font-bold hover:shadow-lg hover:shadow-teal-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {pdfLoading ? (
              <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> Generating Report…</>
            ) : (
              <><Download size={18}/> Generate Professional PDF</>
            )}
          </button>
        </div>
      </div>

      {/* Row 4: Top categories breakdown */}
      {catLabels.length > 0 && (
        <div className="glass p-8 rounded-[2.5rem] border-glass-border">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-6">🏷️ Top Spending Categories</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {catLabels
              .map((cat, i) => ({ cat, amt: catAmounts[i], color: PALETTE[i % PALETTE.length] }))
              .sort((a,b) => b.amt - a.amt)
              .slice(0, 8)
              .map(({ cat, amt, color }) => {
                const pct   = data.expenses > 0 ? Math.round((amt / data.expenses) * 100) : 0;
                const emoji = CAT_EMOJI[cat.toLowerCase()] || '💳';
                return (
                  <div key={cat} className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{emoji}</span>
                      <span className="text-xs font-bold text-gray-300 truncate">{cat}</span>
                    </div>
                    <p className="font-black text-white text-sm">{fmt(amt)}</p>
                    <div className="mt-2 h-1.5 rounded-full bg-white/10">
                      <div className="h-1.5 rounded-full" style={{ width:`${pct}%`, backgroundColor:color, transition:'width 0.8s ease' }}/>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1">{pct}% of expenses</p>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;