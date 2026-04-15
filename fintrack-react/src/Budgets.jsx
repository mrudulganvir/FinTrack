import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './api';
import { 
  PieChart,
  Plus,
  Trash2,
  Calendar,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  Target
} from 'lucide-react';

const Budgets = () => {
  const navigate = useNavigate();
  const [budgets, setBudgets] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBudget, setNewBudget] = useState({ monthly_limit: '', month: new Date().getMonth() + 1, year: new Date().getFullYear() });

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const fetchData = async () => {
    try {
      const [budRes, txRes] = await Promise.all([
        api.get(`/budgets/status?month=${currentMonth}&year=${currentYear}`).catch(() => ({ data: null })),
        api.get('/transactions/')
      ]);
      setBudgets(budRes.data ? [budRes.data] : []);
      setExpenses(txRes.data.transactions?.filter(t => t.type === 'expense') || []);
    } catch (error) {
      console.error("Failed to fetch budgets", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddBudget = async (e) => {
    e.preventDefault();
    try {
      await api.post('/budgets/', {
        ...newBudget,
        monthly_limit: parseFloat(newBudget.monthly_limit)
      });
      fetchData();
      setShowAddModal(false);
      setNewBudget({ monthly_limit: '', month: new Date().getMonth() + 1, year: new Date().getFullYear() });
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to add budget');
    }
  };

  const currentMonthExpenses = expenses.filter(e => {
    const d = new Date(e.transaction_date);
    return d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear;
  }).reduce((s, e) => s + e.amount, 0);

  const activeBudget = budgets[0]; 
  const spent = activeBudget ? activeBudget.total_spent : currentMonthExpenses;
  const limit = activeBudget ? activeBudget.monthly_limit : 0;
  const percentUsed = limit > 0 ? (spent / limit) * 100 : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-8 slide-in">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            Monthly Budgets
            <PieChart size={24} className="text-teal-400" />
          </h1>
          <p className="text-gray-500 mt-1">Plan your spending and save more</p>
        </div>
        {!activeBudget && (
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-teal-500 hover:bg-teal-400 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-teal-500/20 active:scale-95 transition-all"
          >
            <Plus size={20} />
            Set Monthly Budget
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         {/* Monthly Status Card */}
         <div className="lg:col-span-2 glass rounded-[2.5rem] p-8 relative overflow-hidden flex flex-col justify-between min-h-[400px]">
            <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
            
            <div className="relative z-10">
               <div className="flex justify-between items-start mb-12">
                  <div>
                    <span className="px-3 py-1 rounded-full bg-white/10 text-[10px] font-bold text-gray-300 uppercase tracking-widest border border-white/5">Current Status</span>
                    <h2 className="text-4xl font-black mt-4">
                      {new Date().toLocaleString('default', { month: 'long' })} Spending
                    </h2>
                  </div>
                  <Calendar className="text-teal-500" size={32} />
               </div>

               <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <p className="text-gray-400 font-medium">Progress</p>
                    <p className="text-2xl font-black">{percentUsed.toFixed(1)}%</p>
                  </div>
                  <div className="h-4 bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <div 
                      className={`h-full transition-all duration-1000 ${percentUsed > 90 ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-teal-500 shadow-[0_0_15px_rgba(20,184,166,0.3)]'}`}
                      style={{ width: `${Math.min(percentUsed, 100)}%` }}
                    ></div>
                  </div>
               </div>
            </div>

            <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 gap-6 mt-12 bg-white/5 p-6 rounded-3xl border border-white/5">
                <div>
                   <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Spent</p>
                   <p className="text-xl font-bold text-white">₹{(activeBudget?.total_spent || currentMonthExpenses).toLocaleString()}</p>
                </div>
                <div>
                   <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Limit</p>
                   <p className="text-xl font-bold text-gray-300">₹{activeBudget ? activeBudget.monthly_limit.toLocaleString() : '—'}</p>
                </div>
                <div className="col-span-2 sm:col-span-1">
                   <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Remaining</p>
                   <p className={`text-xl font-bold ${activeBudget && activeBudget.remaining_budget < 0 ? 'text-red-400' : 'text-teal-400'}`}>
                     ₹{activeBudget ? activeBudget.remaining_budget.toLocaleString() : '—'}
                   </p>
                </div>
            </div>
         </div>

         {/* Stats / Actions Side */}
         <div className="flex flex-col gap-6">
            <div className="glass p-8 rounded-[2rem] border-glass-border">
               <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                 <Target size={20} className="text-orange-400" />
                 Insights
               </h3>
               <div className="space-y-6">
                  {percentUsed > 80 && (
                    <div className="flex gap-4 p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
                       <AlertTriangle className="text-red-400 shrink-0" size={24} />
                       <p className="text-xs text-red-100 leading-relaxed">
                         <span className="font-bold block mb-1">Critical Limit!</span>
                         You've used {percentUsed.toFixed(0)}% of your monthly budget. Watch out for unnecessary expenses.
                       </p>
                    </div>
                  )}
                  <div className="flex gap-4 p-4 rounded-2xl bg-teal-500/10 border border-teal-500/20">
                     <TrendingUp className="text-teal-400 shrink-0" size={24} />
                     <p className="text-xs text-teal-100 leading-relaxed">
                       <span className="font-bold block mb-1">Smart Tip</span>
                       Saving 20% of your budget this month could add ₹{(activeBudget?.monthly_limit * 0.2 || 0).toLocaleString()} to your investments.
                     </p>
                  </div>
               </div>
            </div>

            <button 
              onClick={() => navigate('/reports')}
              className="w-full py-3 rounded-xl bg-white text-[#0a0a1a] font-bold hover:bg-teal-50 transition-colors"
            >
              View Insights Report
            </button>
         </div>
      </div>

      {/* Manual Modals would go here (simplified as inline for demo or created separately) */}
      {showAddModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-dark/90 backdrop-blur-md" onClick={() => setShowAddModal(false)}></div>
          <div className="relative w-full max-w-md glass p-8 rounded-[2.5rem] slide-in border-teal-500/30">
            <h2 className="text-2xl font-bold mb-6">Set New Budget</h2>
            <form onSubmit={handleAddBudget} className="space-y-6">
               <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 ml-2">Monthly Limit (₹)</label>
                  <input 
                    type="number"
                    required
                    value={newBudget.monthly_limit}
                    onChange={(e) => setNewBudget({...newBudget, monthly_limit: e.target.value})}
                    placeholder="Enter amount..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-2xl font-bold focus:outline-none focus:border-teal-500 transition-all"
                  />
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 ml-2">Month</label>
                    <select 
                      value={newBudget.month}
                      onChange={(e) => setNewBudget({...newBudget, month: parseInt(e.target.value)})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-teal-500 transition-all text-sm"
                    >
                      {[...Array(12)].map((_, i) => <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 ml-2">Year</label>
                    <select 
                      value={newBudget.year}
                      onChange={(e) => setNewBudget({...newBudget, year: parseInt(e.target.value)})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-teal-500 transition-all text-sm"
                    >
                      {[currentYear, currentYear+1].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
               </div>
               <div className="flex gap-4 pt-4">
                  <button onClick={() => setShowAddModal(false)} type="button" className="flex-1 py-4 rounded-2xl bg-white/5 font-bold hover:bg-white/10 transition-all">Cancel</button>
                  <button type="submit" className="flex-1 py-4 rounded-2xl bg-teal-500 font-bold shadow-lg shadow-teal-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all">Set Budget</button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Budgets;
