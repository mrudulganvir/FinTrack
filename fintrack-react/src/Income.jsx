import React, { useState, useEffect } from 'react';
import api from './api';
import { 
  TrendingUp,
  Plus, 
  Trash2, 
  Calendar,
} from 'lucide-react';
import { CAT_EMOJI } from './constants';
import TransactionModal from './TransactionModal';

const Income = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchData = async () => {
    try {
      const res = await api.get('/transactions/');
      setData(res.data.transactions?.filter(t => t.type === 'income') || []);
    } catch (error) {
      console.error("Failed to fetch income", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalIncome = data.reduce((s, t) => s + t.amount, 0);

  return (
    <div className="max-w-6xl mx-auto space-y-8 slide-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            Income Streams
            <TrendingUp size={24} className="text-green-400" />
          </h1>
          <p className="text-gray-500 mt-1">Manage and track your earnings</p>
        </div>
        <div className="glass p-4 sm:p-6 rounded-2xl flex items-center gap-6 border-green-500/20 bg-green-500/5">
           <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Total Earnings</p>
              <h3 className="text-3xl font-bold text-green-400">₹{totalIncome.toLocaleString()}</h3>
           </div>
           <button 
             onClick={() => setShowAddModal(true)}
             className="bg-green-500 hover:bg-green-400 text-white p-3 rounded-xl shadow-lg shadow-green-500/20 transition-all hover:scale-110 active:scale-90"
           >
             <Plus size={24} />
           </button>
        </div>
      </div>

      <TransactionModal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)} 
        onSuccess={fetchData} 
        type="income"
      />

      <div className="glass rounded-3xl overflow-hidden shadow-xl border-glass-border">
        {loading ? (
          <div className="p-20 text-center text-gray-500">Loading earnings...</div>
        ) : data.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
            {data.map(item => (
              <div key={item.id} className="p-5 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between group hover:bg-white/10 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center text-xl">
                    {CAT_EMOJI[item.category?.toLowerCase()] || '💰'}
                  </div>
                  <div>
                    <h4 className="font-bold text-white uppercase text-xs tracking-wider mb-0.5">{item.category}</h4>
                    <p className="font-medium text-gray-100">{item.description || 'Earnings'}</p>
                    <div className="flex items-center gap-2 text-[10px] text-gray-500 mt-1">
                      <Calendar size={12} />
                      {new Date(item.transaction_date).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-2">
                   <p className="text-xl font-black text-green-400">+₹{item.amount.toLocaleString()}</p>
                   <button 
                     onClick={async () => {
                        if(window.confirm('Delete this record?')) {
                          await api.delete(`/transactions/${item.id}`);
                          fetchData();
                        }
                     }}
                     className="p-1.5 rounded-lg text-gray-500 hover:bg-red-500/10 hover:text-red-400 transition-all opacity-20 group-hover:opacity-100"
                   >
                     <Trash2 size={14} />
                   </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-20 text-center">
            <p className="text-gray-500 mb-4">No income records found.</p>
            <button onClick={() => setShowAddModal(true)} className="text-green-400 font-bold hover:underline">Add your first earning</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Income;
