import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from './UserContext';
import api from './api';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  ArrowUpRight, 
  Plus, 
  ChevronRight,
  Clock,
  BrainCircuit
} from 'lucide-react';
import { CAT_EMOJI } from './constants';
import TransactionModal from './TransactionModal';

const StatCard = ({ title, amount, icon: Icon, color, trend }) => (
  <div className="glass p-6 rounded-2xl relative overflow-hidden group">
    <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 opacity-10 rounded-full transition-transform duration-500 group-hover:scale-125`} style={{ backgroundColor: color }}></div>
    <div className="relative z-10">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-xl`} style={{ backgroundColor: `${color}20`, color: color }}>
          <Icon size={24} />
        </div>
        {trend && (
          <span className={`text-xs font-medium px-2 py-1 rounded-lg ${trend > 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <p className="text-gray-400 text-sm font-medium">{title}</p>
      <h3 className="text-3xl font-bold mt-1 tracking-tight">₹{amount.toLocaleString('en-IN')}</h3>
    </div>
  </div>
);

const TransactionRow = ({ tx }) => {
  const isIncome = tx.type === 'income';
  const emoji = CAT_EMOJI[tx.category?.toLowerCase()] || '💰';
  
  return (
    <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-all border border-transparent hover:border-white/5 active:scale-[0.98]">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${isIncome ? 'bg-green-500/15' : 'bg-red-500/15'}`}>
          {emoji}
        </div>
        <div>
          <h4 className="font-semibold text-white">{tx.description || tx.category}</h4>
          <p className="text-xs text-gray-500">{tx.category} • {new Date(tx.transaction_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
        </div>
      </div>
      <div className="text-right">
        <p className={`font-bold ${isIncome ? 'text-green-400' : 'text-red-400'}`}>
          {isIncome ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN')}
        </p>
        <p className="text-[10px] text-gray-600 uppercase tracking-tighter">Completed</p>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const [data, setData] = useState({ transactions: [], balance: 0, income: 0, expenses: 0 });
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [txRes, summaryRes, insightsRes] = await Promise.all([
        api.get('/transactions/'),
        api.get('/reports/summary'),
        api.get('/reports/insights')
      ]);

      const txs = txRes.data.transactions || [];
      const summary = summaryRes.data;
      const insights = insightsRes.data;

      setData({ 
        transactions: txs, 
        balance: summary.balance, 
        income: summary.total_income, 
        expenses: summary.total_expense, 
        topCategory: { 
          name: insights.top_category || 'None', 
          amount: insights.top_category_amount || 0 
        } 
      });
    } catch (error) {
      console.error("Failed to fetch dashboard data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 10000); // Live update every 10s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-6xl mx-auto slide-in">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            Welcome back, {user?.name.split(' ')[0]} 👋
            <span className="px-2 py-0.5 rounded-lg bg-teal-500/10 text-teal-400 text-[10px] uppercase tracking-widest border border-teal-500/20 flex items-center h-fit">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 mr-1.5 animate-pulse"></span>
              Live
            </span>
          </h1>
          <p className="text-gray-500 mt-1">Overview for {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 font-semibold hover:bg-white/10 transition-all flex items-center gap-2">
             <Clock size={18} />
             History
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 font-bold shadow-lg shadow-teal-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
          >
             <Plus size={20} />
             Add Transaction
          </button>
        </div>
      </div>

      <TransactionModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchDashboardData} 
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        <StatCard title="Total Balance" amount={data.balance} icon={Wallet} color="#14b8a6" />
        <StatCard title="Monthly Income" amount={data.income} icon={TrendingUp} color="#10b981" />
        <StatCard title="Monthly Expenses" amount={data.expenses} icon={TrendingDown} color="#ef4444" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Transactions */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center px-2">
            <h3 className="text-xl font-bold">Recent Transactions</h3>
            <button className="text-teal-400 text-sm font-semibold hover:underline flex items-center gap-1">
              View All <ChevronRight size={16} />
            </button>
          </div>
          <div className="glass p-2 rounded-3xl space-y-2">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading your transactions...</div>
            ) : data.transactions.length > 0 ? (
              data.transactions.slice(0, 6).map(tx => (
                <TransactionRow key={tx.id} tx={tx} />
              ))
            ) : (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl text-gray-600">🕳️</div>
                <p className="text-gray-500 text-sm">No transactions yet.</p>
                <button className="text-teal-400 text-sm font-bold mt-2">Start tracking now</button>
              </div>
            )}
          </div>
        </div>

        {/* Quick Insights / Prediction */}
        <div className="space-y-6">
           <div className="glass p-6 rounded-3xl bg-gradient-to-br from-teal-500/10 to-transparent border-teal-500/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center shadow-lg shadow-teal-500/40">
                  <BrainCircuit size={20} className="text-white" />
                </div>
                <h3 className="font-bold">Finny Insights</h3>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed mb-6">
                Your spending in <span className="text-teal-400 font-bold">{data.topCategory?.name || 'various categories'}</span> is the highest this month. 
                {data.topCategory?.amount > 1000 ? " Consider reviewing these expenses to save more." : " You're doing great with your spending habits!"}
              </p>
              <button 
                onClick={() => navigate('/reports')}
                className="w-full py-3 rounded-xl bg-white text-[#0a0a1a] font-bold hover:bg-teal-50 transition-all shadow-lg"
              >
                View Insights Report
              </button>
           </div>

           <div className="glass p-6 rounded-3xl border-glass-border">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <ArrowUpRight size={18} className="text-teal-400" />
                Top Category
              </h3>
              <div className="flex items-center gap-4">
                 <div className="text-4xl">{CAT_EMOJI[data.topCategory?.name?.toLowerCase()] || '📊'}</div>
                 <div>
                    <h4 className="text-2xl font-bold">{data.topCategory?.name || 'N/A'}</h4>
                    <p className="text-xs text-gray-500 truncate mt-1">₹{(data.topCategory?.amount || 0).toLocaleString()} spent this month</p>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
