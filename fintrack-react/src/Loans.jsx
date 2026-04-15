import React, { useState, useEffect } from 'react';
import api from './api';
import { 
  HandCoins, 
  Plus, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertCircle
} from 'lucide-react';

const Loans = () => {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({ lender: '', amount: '', interest_rate: '', due_date: '', type: 'borrowed' });

  const fetchLoans = async () => {
    try {
      const res = await api.get('/loans/');
      setLoans(res.data || []);
    } catch (error) {
      console.error("Failed to fetch loans", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoans();
  }, []);

  const handleAddLoan = async (e) => {
    e.preventDefault();
    try {
      await api.post('/loans/', {
        ...formData,
        amount: parseFloat(formData.amount),
        interest_rate: parseFloat(formData.interest_rate)
      });
      fetchLoans();
      setShowAddModal(false);
      setFormData({ lender: '', amount: '', interest_rate: '', due_date: '', type: 'borrowed' });
    } catch (err) {
      alert('Failed to add loan');
    }
  };

  const handleRepay = async (id) => {
    try {
      await api.post(`/loans/${id}/repay`);
      fetchLoans();
    } catch (err) {
      alert('Repayment failed');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 slide-in">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            Debt Management
            <HandCoins size={28} className="text-orange-400" />
          </h1>
          <p className="text-gray-500 mt-1">Track your loans and lending activity</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-orange-500 hover:bg-orange-400 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-orange-500/20 active:scale-95 transition-all"
        >
          <Plus size={20} />
          Record New Loan
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-20 text-center text-gray-500">Retrieving loan records...</div>
        ) : loans.length > 0 ? (
          loans.map(loan => (
            <div key={loan.id} className={`glass p-6 rounded-[2rem] border-glass-border relative overflow-hidden group ${loan.status === 'paid' ? 'opacity-60' : ''}`}>
               <div className={`absolute top-0 right-0 w-24 h-24 blur-3xl opacity-10 -mr-8 -mt-8 ${loan.type === 'borrowed' ? 'bg-red-500' : 'bg-green-500'}`}></div>
               
               <div className="flex justify-between items-start mb-6">
                  <div className={`p-3 rounded-xl ${loan.type === 'borrowed' ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                    <HandCoins size={20} />
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${loan.status === 'paid' ? 'bg-gray-500/10 text-gray-400' : 'bg-orange-500/10 text-orange-400'}`}>
                    {loan.status}
                  </span>
               </div>

               <h3 className="text-xl font-bold mb-1 truncate">{loan.lender}</h3>
               <p className="text-gray-500 text-xs mb-4 flex items-center gap-1 uppercase tracking-widest font-bold">
                 {loan.type}
               </p>

               <div className="space-y-4 mb-6">
                  <div className="flex justify-between items-end">
                     <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Principal</p>
                     <p className="text-2xl font-black">₹{loan.amount.toLocaleString()}</p>
                  </div>
                  <div className="flex justify-between text-xs font-semibold">
                     <span className="text-gray-500">Interest</span>
                     <span className="text-orange-400">{loan.interest_rate}% p.a.</span>
                  </div>
                  <div className="flex justify-between text-xs font-semibold">
                     <span className="text-gray-500">Due Date</span>
                     <span className="flex items-center gap-1 text-gray-300">
                        <Calendar size={12} /> {new Date(loan.due_date).toLocaleDateString()}
                     </span>
                  </div>
               </div>

               {loan.status === 'active' ? (
                 <button 
                   onClick={() => handleRepay(loan.id)}
                   className="w-full py-3 rounded-xl bg-white text-dark font-bold hover:bg-orange-50 transition-all flex items-center justify-center gap-2"
                 >
                   <CheckCircle2 size={18} /> Mark as Paid
                 </button>
               ) : (
                 <div className="w-full py-3 rounded-xl bg-white/5 border border-white/5 text-gray-400 font-bold flex items-center justify-center gap-2">
                   <CheckCircle2 size={18} className="text-green-500" /> Settled
                 </div>
               )}
            </div>
          ))
        ) : (
          <div className="col-span-full glass p-20 rounded-[3rem] text-center border-dashed border-white/10">
             <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <HandCoins size={32} className="text-gray-700" />
             </div>
             <h3 className="text-xl font-bold mb-2">No active loans found</h3>
             <p className="text-gray-500 text-sm max-w-sm mx-auto mb-8">Maintain a healthy financial life by tracking all your lending and borrowing in one place.</p>
             <button onClick={() => setShowAddModal(true)} className="px-8 py-3 rounded-2xl bg-orange-500 text-white font-bold shadow-lg shadow-orange-500/20 hover:scale-105 transition-all">Record First Loan</button>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-dark/95 backdrop-blur-md" onClick={() => setShowAddModal(false)}></div>
          <div className="relative w-full max-w-lg glass p-8 rounded-[2.5rem] slide-in border-orange-500/30">
            <h2 className="text-2xl font-bold mb-6">Record New Loan</h2>
            <form onSubmit={handleAddLoan} className="space-y-6">
               <div className="grid grid-cols-2 gap-4 p-1 bg-white/5 rounded-2xl mb-2">
                  <button type="button" onClick={() => setFormData({...formData, type: 'borrowed'})} className={`py-3 rounded-xl font-bold transition-all ${formData.type === 'borrowed' ? 'bg-red-500 text-white shadow-lg' : 'text-gray-500'}`}>Borrowed</button>
                  <button type="button" onClick={() => setFormData({...formData, type: 'lent'})} className={`py-3 rounded-xl font-bold transition-all ${formData.type === 'lent' ? 'bg-green-500 text-white shadow-lg' : 'text-gray-500'}`}>Lent</button>
               </div>

               <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-2">Title / Lender Name</label>
                    <input type="text" required value={formData.lender} onChange={(e)=>setFormData({...formData, lender: e.target.value})} placeholder="e.g. HDFC Bank, Uncle Joe" className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:border-orange-500/50 outline-none text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-2">Amount (₹)</label>
                        <input type="number" required value={formData.amount} onChange={(e)=>setFormData({...formData, amount: e.target.value})} placeholder="10000" className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:border-orange-500/50 outline-none text-sm" />
                     </div>
                     <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-2">Interest Rate (%)</label>
                        <input type="number" step="0.5" required value={formData.interest_rate} onChange={(e)=>setFormData({...formData, interest_rate: e.target.value})} placeholder="12" className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:border-orange-500/50 outline-none text-sm" />
                     </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-2">Due Date</label>
                    <input type="date" required value={formData.due_date} onChange={(e)=>setFormData({...formData, due_date: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:border-orange-500/50 outline-none text-sm" />
                  </div>
               </div>

               <div className="flex gap-4 pt-4">
                  <button onClick={() => setShowAddModal(false)} type="button" className="flex-1 py-4 rounded-2xl bg-white/5 font-bold hover:bg-white/10 transition-all">Cancel</button>
                  <button type="submit" className="flex-1 py-4 rounded-2xl bg-orange-500 font-bold shadow-lg shadow-orange-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all">Save Loan</button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Loans;
