import React, { useState, useEffect } from 'react';
import api from './api';
import { 
  Search, 
  Filter, 
  Plus, 
  Trash2, 
  MoreVertical,
  ChevronDown,
  Calendar,
  X
} from 'lucide-react';
import { CAT_EMOJI } from './constants';
import TransactionModal from './TransactionModal';

const Expenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catSearch, setCatSearch] = useState('');
  const [filter, setFilter] = useState('all'); // 'all', 'today', 'weekly'
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchExpenses = async () => {
    try {
      const res = await api.get('/transactions/');
      setExpenses(res.data.transactions?.filter(t => t.type === 'expense') || []);
    } catch (error) {
      console.error("Failed to fetch expenses", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;
    try {
      await api.delete(`/transactions/${id}`);
      setExpenses(expenses.filter(e => e.id !== id));
    } catch (error) {
      alert('Failed to delete transaction');
    }
  };

  const filteredExpenses = expenses.filter(e => {
    const txDate = new Date(e.transaction_date);
    const today = new Date();
    today.setHours(0,0,0,0);
    
    // Check Date Filter
    if (filter === 'today') {
      if (txDate.toDateString() !== today.toDateString()) return false;
    } else if (filter === 'weekly') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      if (txDate < weekAgo) return false;
    }

    const matchesSearch = (e.description || "").toLowerCase().includes(search.toLowerCase());
    const matchesCat = (e.category || "").toLowerCase().includes(catSearch.toLowerCase());
    
    return matchesSearch && matchesCat;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8 slide-in">
      <div className="flex justify-between items-center bg-[#0d0d12] p-2 rounded-2xl border border-glass-border">
         <div className="flex p-1 gap-1">
            <button 
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${filter === 'all' ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/20' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
            >
              All Expenses
            </button>
            <button 
              onClick={() => setFilter('today')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${filter === 'today' ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/20' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
            >
              Today
            </button>
            <button 
              onClick={() => setFilter('weekly')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${filter === 'weekly' ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/20' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
            >
              Weekly
            </button>
         </div>
         <button 
           onClick={() => setShowAddModal(true)}
           className="bg-teal-500 hover:bg-teal-400 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all"
         >
           <Plus size={18} />
           Add Expense
         </button>
      </div>

      <TransactionModal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)} 
        onSuccess={fetchExpenses} 
        type="expense"
      />

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between px-2">
         <h2 className="text-2xl font-bold">Transaction History</h2>
         <div className="flex gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
               <input 
                 type="text" 
                 value={search}
                 onChange={(e) => setSearch(e.target.value)}
                 placeholder="Search by description..." 
                 className="w-full bg-[#161625] border border-gray-800 rounded-xl py-2 pl-11 pr-4 focus:outline-none focus:border-teal-500/40 text-sm"
               />
            </div>
            <button className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white">
              <Filter size={20} />
            </button>
         </div>
      </div>

      <div className="glass rounded-3xl overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-white/5 text-gray-400 text-[10px] uppercase tracking-widest text-left">
              <th className="px-6 py-4 font-bold">Category</th>
              <th className="px-6 py-4 font-bold">Description</th>
              <th className="px-6 py-4 font-bold">Date</th>
              <th className="px-6 py-4 font-bold">Amount</th>
              <th className="px-6 py-4 font-bold text-center w-24">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr><td colSpan="5" className="px-6 py-12 text-center text-gray-500">Loading your expenses...</td></tr>
            ) : filteredExpenses.length > 0 ? (
              filteredExpenses.map(item => (
                <tr key={item.id} className="group hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xl w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center border border-red-500/10">
                        {CAT_EMOJI[item.category?.toLowerCase()] || '❓'}
                      </span>
                      <span className="font-semibold text-sm">{item.category}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">
                    {item.description || "—"}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Calendar size={14} />
                      {new Date(item.transaction_date).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-bold text-red-400">₹{item.amount.toLocaleString()}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center items-center gap-2">
                      <button 
                        onClick={() => handleDelete(item.id)}
                        className="p-2 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-400/10 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={16} />
                      </button>
                      <button className="p-2 rounded-lg text-gray-600 hover:text-white transition-all">
                        <MoreVertical size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="5" className="px-6 py-12 text-center text-gray-500">No expenses found matching your criteria.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Expenses;
