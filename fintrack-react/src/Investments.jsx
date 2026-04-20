import React, { useState, useEffect } from 'react';
import api from './api';
import { 
  TrendingUp, 
  Plus, 
  ArrowUpRight, 
  ArrowDownRight,
  Activity,
  DollarSign,
  Bot,
  CheckCircle2,
  MinusCircle,
  X,
  RefreshCw,
  Globe,
  BrainCircuit
} from 'lucide-react';

const InvestmentCard = ({ title, amount, profit, percent, color }) => (
  <div className="glass p-6 rounded-3xl border-glass-border relative overflow-hidden group">
    <div className={`absolute top-0 right-0 w-24 h-24 blur-3xl opacity-10 -mr-8 -mt-8`} style={{ backgroundColor: color }}></div>
    <div className="flex justify-between items-start mb-6">
       <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}20`, color: color }}>
          <Activity size={20} />
       </div>
       <div className={`flex items-center gap-1 text-xs font-bold ${profit > 0 ? 'text-green-400' : profit < 0 ? 'text-red-400' : 'text-gray-400'}`}>
          {profit > 0 ? <ArrowUpRight size={14} /> : profit < 0 ? <ArrowDownRight size={14} /> : <MinusCircle size={14} />}
          {Math.abs(percent)}%
       </div>
    </div>
    <p className="text-gray-500 text-[10px] uppercase tracking-widest font-bold mb-1">{title}</p>
    <h3 className="text-2xl font-black mb-1">₹{amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</h3>
    <p className={`text-xs font-medium ${profit >= 0 ? 'text-green-500/80' : 'text-red-500/80'}`}>
      {profit >= 0 ? '+' : ''}₹{profit.toLocaleString('en-IN', { maximumFractionDigits: 0 })} total gain
    </p>
  </div>
);

const Investments = () => {
  const [data, setData] = useState([]);
  const [advisorData, setAdvisorData] = useState({ signals: [], risk_profile: 'Scanning...' });
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [riskAppetite, setRiskAppetite] = useState('moderate');
  const [suggestions, setSuggestions] = useState(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // ── Modal State ──
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newAsset, setNewAsset] = useState({
    name: '',
    ticker: '',
    type: 'Equity',
    amount: '',
    units: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [invRes, advRes] = await Promise.all([
        api.get('/investments/').catch(() => ({ data: [] })),
        api.get('/reports/smart-advisor').catch(() => ({ data: { signals: [], risk_profile: 'Moderate' } }))
      ]);
      
      // Seed initial data if DB is empty for UI visualization
      setData(invRes.data?.length ? invRes.data : [
        { id: 1, name: "Reliance Ind.", ticker: "RELIANCE", type: "Equity", current_value: 85000, amount: 72600 },
        { id: 2, name: "Quant Small Cap", ticker: "0P0000XW8F.BO", type: "Mutual Funds", current_value: 42000, amount: 38800 },
        { id: 3, name: "SGB 2024", ticker: "SGB", type: "Gold", current_value: 15000, amount: 14200 },
        { id: 4, name: "Ethereum", ticker: "ethereum", type: "Crypto", current_value: 5000, amount: 6200 },
      ]);
      
      setAdvisorData(advRes.data);
    } catch (error) {
       console.error("Data fetch failed", error);
    } finally {
       setLoading(false);
    }
  };

  const fetchSuggestions = async (appetite) => {
    setLoadingSuggestions(true);
    try {
      const res = await api.get(`/advisor/suggest?risk_appetite=${appetite}`);
      setSuggestions(res.data);
    } catch (error) {
       console.error("Failed to fetch suggestions", error);
    } finally {
       setLoadingSuggestions(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchSuggestions(riskAppetite);
  }, []);

  const handleRiskChange = (e) => {
    const app = e.target.value;
    setRiskAppetite(app);
    fetchSuggestions(app);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ── Sync Live Prices Handler ──
  const handleSyncPrices = async () => {
    setIsSyncing(true);
    try {
      await api.post('/investments/sync-live-prices');
      await fetchData(); // Refresh data after backend updates it
    } catch (error) {
      console.error("Failed to sync live prices", error);
      alert("Failed to connect to market APIs. Check backend configuration.");
    } finally {
      setIsSyncing(false);
    }
  };

  // ── Add Asset Handler ──
  const handleAddAsset = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/investments/', {
        ...newAsset,
        amount: Number(newAsset.amount),
        units: Number(newAsset.units),
        current_value: Number(newAsset.amount)
      });
      setShowModal(false);
      setNewAsset({ name: '', ticker: '', type: 'Equity', amount: '', units: '' });
      fetchData(); 
    } catch (error) {
      console.error("Failed to add asset", error);
      setData(prev => [{ 
        ...newAsset, 
        id: Date.now(), 
        amount: Number(newAsset.amount), 
        current_value: Number(newAsset.amount) 
      }, ...prev]);
      setShowModal(false);
      setNewAsset({ name: '', ticker: '', type: 'Equity', amount: '', units: '' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalValue = data.reduce((s, i) => s + (i.current_value || i.amount), 0);
  const totalInvested = data.reduce((s, i) => s + i.amount, 0);
  const totalProfit = totalValue - totalInvested;

  const getActionStyles = (action) => {
    switch(action?.toUpperCase()) {
      case 'BUY': return { color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20', icon: <ArrowUpRight size={16}/> };
      case 'SELL': return { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: <ArrowDownRight size={16}/> };
      case 'HOLD': return { color: 'text-gray-400', bg: 'bg-white/5', border: 'border-white/10', icon: <MinusCircle size={16}/> };
      default: return { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: <Activity size={16}/> };
    }
  };

  // Group data by category for the cards
  const categoryTotals = data.reduce((acc, curr) => {
    const type = curr.type.toLowerCase();
    if (!acc[type]) acc[type] = { amount: 0, current_value: 0 };
    acc[type].amount += curr.amount;
    acc[type].current_value += curr.current_value || curr.amount;
    return acc;
  }, {});

  const getCatStats = (key) => {
    const stat = categoryTotals[key] || { amount: 0, current_value: 0 };
    const profit = stat.current_value - stat.amount;
    const pct = stat.amount > 0 ? ((profit / stat.amount) * 100).toFixed(1) : 0;
    return { val: stat.current_value, profit, pct };
  };

  const eq = getCatStats('equity');
  const mf = getCatStats('mutual funds');
  const go = getCatStats('gold');
  const cr = getCatStats('crypto');

  return (
    <div className="max-w-6xl mx-auto space-y-10 slide-in pb-20 relative">
       
       {/* ── ADD ASSET MODAL ── */}
       {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-[#0f172a] border border-white/10 p-8 rounded-[2rem] w-full max-w-md relative shadow-2xl">
            <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors">
              <X size={24} />
            </button>
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
               <Plus size={24} className="text-blue-400" /> Track New Asset
            </h3>
            
            <form onSubmit={handleAddAsset} className="space-y-4">
              <div>
                <label className="block text-[10px] text-gray-400 mb-1 font-bold uppercase tracking-widest">Asset Name</label>
                <input required type="text" value={newAsset.name} onChange={(e) => setNewAsset({...newAsset, name: e.target.value})} 
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:bg-white/10 transition-colors" placeholder="e.g. Reliance Industries" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-gray-400 mb-1 font-bold uppercase tracking-widest">Category</label>
                  <select value={newAsset.type} onChange={(e) => setNewAsset({...newAsset, type: e.target.value})} 
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 appearance-none">
                    <option value="Equity">Stocks</option>
                    <option value="Mutual Funds">Mutual Funds</option>
                    <option value="Gold">Gold</option>
                    <option value="Crypto">Crypto</option>
                    <option value="Debt">Debt</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 mb-1 font-bold uppercase tracking-widest">Ticker / Symbol</label>
                  <input required type="text" value={newAsset.ticker} onChange={(e) => setNewAsset({...newAsset, ticker: e.target.value})} 
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:bg-white/10 transition-colors" placeholder="RELIANCE.NS" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-gray-400 mb-1 font-bold uppercase tracking-widest">Total Invested (₹)</label>
                  <input required type="number" min="1" value={newAsset.amount} onChange={(e) => setNewAsset({...newAsset, amount: e.target.value})} 
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:bg-white/10 transition-colors" placeholder="0" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 mb-1 font-bold uppercase tracking-widest">Quantity / Units</label>
                  <input required type="number" step="any" min="0.0001" value={newAsset.units} onChange={(e) => setNewAsset({...newAsset, units: e.target.value})} 
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:bg-white/10 transition-colors" placeholder="0" />
                </div>
              </div>

              <button type="submit" disabled={isSubmitting} 
                className="w-full bg-blue-500 hover:bg-blue-400 text-white font-bold py-4 rounded-xl mt-4 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20">
                {isSubmitting ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Save Asset to Portfolio'}
              </button>
              <p className="text-[10px] text-gray-500 text-center mt-2 flex justify-center items-center gap-1"><Globe size={10}/> Real-time prices will sync automatically via ticker symbol.</p>
            </form>
          </div>
        </div>
       )}

       {/* ── HEADER ── */}
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              Wealth Portfolio
              <TrendingUp size={28} className="text-blue-400" />
            </h1>
            <p className="text-gray-500 mt-1">Growth overview and real-time asset allocation</p>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <button 
              onClick={handleSyncPrices}
              disabled={isSyncing}
              className="bg-white/5 border border-white/10 hover:bg-white/10 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all flex-1 md:flex-none disabled:opacity-50"
            >
              <RefreshCw size={18} className={isSyncing ? "animate-spin text-blue-400" : "text-blue-400"} />
              {isSyncing ? 'Syncing...' : 'Live Sync'}
            </button>
            <button 
              onClick={() => setShowModal(true)}
              className="bg-blue-500 hover:bg-blue-400 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex-1 md:flex-none"
            >
              <Plus size={20} /> New
            </button>
          </div>
       </div>

       {/* ── TOP STATS ── */}
       <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-2 glass p-8 rounded-[2.5rem] bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/10 flex flex-col justify-between">
             <div>
                <div className="flex justify-between items-center">
                  <span className="px-3 py-1 rounded-full bg-blue-500/10 text-[10px] font-bold text-blue-400 uppercase tracking-widest border border-blue-500/10">Live Portfolio Value</span>
                  {isSyncing && <span className="text-[10px] text-blue-400 font-bold animate-pulse">MARKET DATA SYNCING...</span>}
                </div>
                <h2 className="text-5xl font-black mt-4 tracking-tighter">₹{totalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</h2>
                <div className={`flex items-center gap-2 font-bold mt-2 ${totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                   {totalProfit >= 0 ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                   <span>{totalProfit >= 0 ? '+' : ''}₹{totalProfit.toLocaleString('en-IN', { maximumFractionDigits: 0 })} ({((totalProfit/totalInvested)*100 || 0).toFixed(1)}%)</span>
                </div>
             </div>
             <div className="grid grid-cols-2 gap-4 mt-12 bg-white/5 p-6 rounded-3xl border border-white/5">
                <div>
                   <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Total Invested</p>
                   <p className="font-bold">₹{totalInvested.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                </div>
                <div>
                   <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Risk Profile</p>
                   <p className="font-bold text-blue-400">{advisorData.risk_profile}</p>
                </div>
             </div>
          </div>

          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
             <InvestmentCard title="Stocks & Equity" amount={eq.val} profit={eq.profit} percent={eq.pct} color="#3b82f6" />
             <InvestmentCard title="Mutual Funds" amount={mf.val} profit={mf.profit} percent={mf.pct} color="#8b5cf6" />
             <InvestmentCard title="Gold / Metals" amount={go.val} profit={go.profit} percent={go.pct} color="#f59e0b" />
             <InvestmentCard title="Crypto Assets" amount={cr.val} profit={cr.profit} percent={cr.pct} color="#ec4899" />
          </div>
       </div>

        <div className="glass p-8 rounded-[2.5rem] border-blue-500/20 relative overflow-hidden bg-gradient-to-br from-[#1e293b] to-transparent">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 blur-[100px] rounded-full"></div>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-[1.25rem] bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/20">
                <Bot size={32} />
              </div>
              <div>
                <h3 className="text-2xl font-black flex items-center gap-2">Hybrid Suggestion Engine</h3>
                <p className="text-sm text-gray-400">Ground Truth via yfinance • Personalized Strategy via ML</p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white/5 p-1.5 rounded-2xl border border-white/10">
              {['conservative', 'moderate', 'aggressive'].map(app => (
                 <button 
                  key={app}
                  onClick={() => handleRiskChange({ target: { value: app } })}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${riskAppetite === app ? 'bg-blue-500 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                 >
                   {app}
                 </button>
              ))}
            </div>
          </div>

          {!suggestions ? (
            <div className="py-20 text-center text-gray-500 animate-pulse">Analyzing market data for {riskAppetite} profile...</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
               {/* Strategy Recommendations */}
               <div className="lg:col-span-2 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {suggestions.recommendations.map((rec, i) => (
                      <div key={i} className="p-6 rounded-[2rem] bg-white/5 border border-white/5 hover:border-blue-500/30 transition-all group">
                         <div className="flex justify-between items-start mb-4">
                            <span className="px-3 py-1 bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase tracking-widest rounded-lg">{rec.weight} Allocation</span>
                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform"><CheckCircle2 size={16} className="text-blue-500" /></div>
                         </div>
                         <h4 className="text-lg font-bold mb-2">{rec.asset}</h4>
                         <p className="text-xs text-blue-400 font-bold mb-1">₹{rec.amount.toLocaleString()} suggested</p>
                         <p className="text-[11px] text-gray-500 leading-relaxed italic">"{rec.why}"</p>
                      </div>
                    ))}
                  </div>

                  {/* AI BRAIN SECTION */}
                  {suggestions.ai_advice && (
                    <div className="p-8 rounded-[2rem] bg-gradient-to-br from-blue-600/20 to-purple-600/10 border border-blue-500/30 relative overflow-hidden">
                       <div className="absolute top-0 right-0 p-4 opacity-10">
                          <BrainCircuit size={80} />
                       </div>
                       <h5 className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-4 flex items-center gap-2">
                          <Activity size={14} /> AI Strategist Analysis
                       </h5>
                       <div className="text-sm text-gray-200 leading-relaxed space-y-3 relative z-10">
                          {suggestions.ai_advice.split('\n').map((line, i) => (
                            <p key={i}>{line}</p>
                          ))}
                       </div>
                    </div>
                  )}

                  <div className="p-6 rounded-[2rem] bg-blue-500/5 border border-blue-500/10">
                     <h5 className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-3 ml-1">The "Why" (Historical Backtesting)</h5>
                     <p className="text-xs text-gray-300 leading-relaxed mb-4">{suggestions.explanation.summary}</p>
                     <div className="flex items-center gap-6">
                        <div>
                           <p className="text-[9px] text-gray-500 uppercase font-black tracking-tighter">Avg Market Return (3Y)</p>
                           <p className="text-xl font-black text-green-400">{suggestions.explanation.market_return_avg}%</p>
                        </div>
                        <div className="h-8 w-[1px] bg-white/10" />
                        <div>
                           <p className="text-[9px] text-gray-500 uppercase font-black tracking-tighter">Growth Projection (₹{suggestions.suggested_investment.toLocaleString()})</p>
                           <p className="text-xl font-black text-blue-400">₹{suggestions.explanation.historic_3y_projection.toLocaleString()}</p>
                        </div>
                     </div>
                  </div>
               </div>

               {/* Ground Truth Assets (yfinance) */}
               <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Market Signals & Trends</h4>
                  <div className="space-y-3">
                    {suggestions.market_context.map((mark, i) => {
                      const sig = suggestions.signals.find(s => s.ticker === mark.name) || { signal: 'HOLD', reason: '' };
                      const style = getActionStyles(sig.signal);
                      
                      return (
                        <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-3 group hover:border-white/20 transition-all">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                               <div className={`w-2 h-2 rounded-full ${mark.trend === 'up' ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
                               <div>
                                  <p className="text-xs font-bold text-white uppercase">{mark.name}</p>
                                  <p className="text-[10px] text-gray-500">Live: ₹{mark.current_price.toLocaleString()}</p>
                               </div>
                            </div>
                            <div className={`flex items-center gap-1 px-3 py-1 rounded-lg text-[10px] font-black ${style.bg} ${style.color} border ${style.border}`}>
                               {style.icon} {sig.signal}
                            </div>
                          </div>
                          {sig.reason && (
                            <p className="text-[9px] text-gray-500 leading-relaxed border-t border-white/5 pt-2 italic">
                              {sig.reason}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <p className="text-[10px] text-gray-500 italic text-center leading-relaxed">
                      "Historical data provides the context; our ML model provides the personalization. Both work together to minimize your risk."
                    </p>
                  </div>
               </div>
            </div>
          )}
       </div>

       {/* ── LEDGER & ALLOCATION ── */}
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
             <h3 className="text-xl font-bold px-2">Live Ledger</h3>
             <div className="glass rounded-[2rem] overflow-hidden">
                <table className="w-full border-collapse">
                   <thead>
                      <tr className="bg-white/5 text-gray-400 text-[10px] uppercase tracking-widest text-left">
                         <th className="px-6 py-4 font-bold">Asset & Ticker</th>
                         <th className="px-6 py-4 font-bold">Invested</th>
                         <th className="px-6 py-4 font-bold">Live Value</th>
                         <th className="px-6 py-4 font-bold text-right">Returns</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-white/5">
                      {loading ? (
                         <tr><td colSpan="4" className="py-20 text-center text-gray-500 animate-pulse">Loading market data...</td></tr>
                      ) : (
                         data.map(asset => {
                            const profit = (asset.current_value || asset.amount || 0) - (asset.amount || 0);
                            const isPositive = profit >= 0;
                            const returnPct = asset.amount > 0 && profit !== 0 ? ((profit / asset.amount) * 100).toFixed(1) : "0.0";
                            
                            return (
                              <tr key={asset.id} className="hover:bg-white/5 transition-colors group">
                                 <td className="px-6 py-5">
                                    <div className="flex items-center gap-3">
                                       <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center"><DollarSign size={14} /></div>
                                       <div>
                                          <p className="font-bold text-sm">{asset.name || 'Asset'}</p>
                                          <p className="text-[10px] text-gray-500 uppercase font-bold">{asset.ticker || 'N/A'}</p>
                                       </div>
                                    </div>
                                 </td>
                                 <td className="px-6 py-5 text-sm text-gray-400">₹{asset.amount?.toLocaleString('en-IN')}</td>
                                 <td className="px-6 py-5 font-bold">
                                    ₹{asset.current_value?.toLocaleString('en-IN', { maximumFractionDigits: 0 }) || asset.amount?.toLocaleString('en-IN')}
                                 </td>
                                 <td className={`px-6 py-5 text-right font-bold ${isPositive && profit > 0 ? 'text-green-400' : profit < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                                   {isPositive && profit > 0 ? '+' : ''}{returnPct}%
                                 </td>
                              </tr>
                            )
                         })
                      )}
                      {!loading && data.length === 0 && (
                        <tr><td colSpan="4" className="py-20 text-center text-gray-600">No assets tracked yet.</td></tr>
                      )}
                   </tbody>
                </table>
             </div>
          </div>

          <div className="space-y-6">
             <h3 className="text-xl font-bold px-2">Allocation</h3>
             <div className="glass p-8 rounded-[2rem] flex flex-col items-center justify-center min-h-[300px] border-glass-border">
                <div className="relative w-48 h-48 mb-8">
                   <div className="absolute inset-0 border-[16px] border-blue-500/20 rounded-full"></div>
                   <div className="absolute inset-0 border-[16px] border-blue-500 border-t-transparent border-r-transparent rounded-full rotate-45"></div>
                   <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <p className="text-3xl font-black">{totalValue > 0 ? Math.round((eq.val / totalValue) * 100) : 0}%</p>
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Equity</p>
                   </div>
                </div>
                <div className="w-full space-y-3">
                   <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-gray-300"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Equity</div>
                      <span className="font-bold">{totalValue > 0 ? ((eq.val / totalValue) * 100).toFixed(1) : 0}%</span>
                   </div>
                   <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-gray-300"><div className="w-2 h-2 rounded-full bg-purple-500"></div> Funds</div>
                      <span className="font-bold">{totalValue > 0 ? ((mf.val / totalValue) * 100).toFixed(1) : 0}%</span>
                   </div>
                   <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-gray-300"><div className="w-2 h-2 rounded-full bg-orange-500"></div> Gold</div>
                      <span className="font-bold">{totalValue > 0 ? ((go.val / totalValue) * 100).toFixed(1) : 0}%</span>
                   </div>
                   <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-gray-300"><div className="w-2 h-2 rounded-full bg-pink-500"></div> Crypto</div>
                      <span className="font-bold">{totalValue > 0 ? ((cr.val / totalValue) * 100).toFixed(1) : 0}%</span>
                   </div>
                </div>
             </div>
          </div>
       </div>
    </div>
  );
};

export default Investments;