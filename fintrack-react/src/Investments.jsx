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
  Globe
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
    switch(action) {
      case 'BUY': return { color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20', icon: <ArrowUpRight size={16}/> };
      case 'SELL': return { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: <ArrowDownRight size={16}/> };
      default: return { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: <MinusCircle size={16}/> };
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

       {/* ── AI ADVISOR SECTION ── */}
       <div className="glass p-8 rounded-[2.5rem] border-blue-500/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-3xl rounded-full"></div>
          <div className="flex items-center gap-3 mb-6 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Bot size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold flex items-center gap-2">Robo-Advisor Signals</h3>
              <p className="text-xs text-gray-400">Algorithmic recommendations based on your {advisorData.risk_profile?.toLowerCase() || 'current'} risk profile.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
            {advisorData.signals?.map((signal, idx) => {
              const styles = getActionStyles(signal.action);
              return (
                <div key={idx} className={`p-5 rounded-3xl border bg-white/5 ${styles.border} flex flex-col justify-between hover:bg-white/10 transition-colors`}>
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest ${styles.bg} ${styles.color} flex items-center gap-1`}>
                        {styles.icon} {signal.action}
                      </span>
                      <span className="text-xs text-gray-500 uppercase font-bold">{signal.type}</span>
                    </div>
                    <h4 className="font-bold text-white mb-2">{signal.asset}</h4>
                    <p className="text-xs text-gray-400 leading-relaxed">{signal.reason}</p>
                  </div>
                </div>
              )
            })}
          </div>
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