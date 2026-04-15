import React, { useState } from 'react';
import { X, Plus, Calendar, Tag, MessageCircle, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import api from './api';

const TransactionModal = ({ isOpen, onClose, onSuccess, type: initialType = 'expense' }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    type: initialType,
    category: '',
    description: '',
    transaction_date: new Date().toISOString().split('T')[0]
  });

  const categories = formData.type === 'expense' 
    ? ['Food', 'Shopping', 'Rent', 'Bills', 'Travel', 'Medical', 'Others']
    : ['Salary', 'Investment', 'Gift', 'Others'];

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.amount || !formData.description) return;
    
    setLoading(true);
    try {
      await api.post('/transactions/', {
        ...formData,
        amount: parseFloat(formData.amount)
      });
      onSuccess();
      onClose();
      // Reset form
      setFormData({
        amount: '',
        type: initialType,
        category: '',
        description: '',
        transaction_date: new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      alert('Failed to add transaction. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-dark/80 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative w-full max-w-lg glass rounded-3xl overflow-hidden shadow-2xl border-white/10 slide-in">
        <div className="p-6 border-b border-white/5 flex justify-between items-center">
           <h3 className="text-xl font-bold">Add New Transaction</h3>
           <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-gray-400 transition-colors">
             <X size={20} />
           </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
           <div className="flex p-1 bg-white/5 rounded-2xl">
              <button 
                type="button"
                onClick={() => setFormData({...formData, type: 'income', category: ''})}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all font-bold ${formData.type === 'income' ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : 'text-gray-500 hover:text-white'}`}
              >
                <ArrowUpRight size={18} /> Income
              </button>
              <button 
                type="button"
                onClick={() => setFormData({...formData, type: 'expense', category: ''})}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all font-bold ${formData.type === 'expense' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'text-gray-500 hover:text-white'}`}
              >
                <ArrowDownRight size={18} /> Expense
              </button>
           </div>

           <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-2">Amount (₹)</label>
                <input 
                  type="number" 
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-2xl font-bold focus:outline-none focus:border-teal-500/50 transition-all text-white placeholder-gray-700"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {formData.type === 'income' && (
                   <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-2">Category</label>
                      <div className="relative">
                         <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
                         <select 
                           required
                           value={formData.category}
                           onChange={(e) => setFormData({...formData, category: e.target.value})}
                           className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-11 pr-4 focus:outline-none focus:border-teal-500/50 appearance-none text-sm"
                         >
                           <option value="" disabled>Select Category</option>
                           {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                         </select>
                      </div>
                   </div>
                 )}
                 <div className={formData.type === 'income' ? '' : 'col-span-2'}>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-2">Date</label>
                    <div className="relative">
                       <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
                       <input 
                         type="date" 
                         required
                         value={formData.transaction_date}
                         onChange={(e) => setFormData({...formData, transaction_date: e.target.value})}
                         className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-11 pr-4 focus:outline-none focus:border-teal-500/50 text-sm"
                       />
                    </div>
                 </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-2">Description</label>
                <div className="relative">
                   <MessageCircle className="absolute left-4 top-4 text-gray-600" size={16} />
                   <textarea 
                     rows="3"
                     required
                     placeholder="What was this for? (e.g. Starbucks Coffee, Gym Membership)"
                     value={formData.description}
                     onChange={(e) => setFormData({...formData, description: e.target.value})}
                     className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-11 pr-4 focus:outline-none focus:border-teal-500/50 text-sm resize-none"
                   ></textarea>
                </div>
                <p className="text-[9px] text-gray-600 mt-2 ml-2 italic">※ AI will automatically detect the category from your description</p>
              </div>
           </div>

           <button 
             type="submit" 
             disabled={loading}
             className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-xl hover:scale-[1.01] active:scale-[0.99] ${
               formData.type === 'income' 
                 ? 'bg-green-500 shadow-green-500/20 hover:shadow-green-500/30' 
                 : 'bg-red-500 shadow-red-500/20 hover:shadow-red-500/30'
             }`}
           >
             {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : (
               <>Confirm Transaction <Plus size={20} /></>
             )}
           </button>
        </form>
      </div>
    </div>
  );
};

export default TransactionModal;
