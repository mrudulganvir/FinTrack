import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from './constants';
import { Mail, Phone, Lock, ShieldCheck, ArrowRight, ArrowLeft, Loader2, KeyRound } from 'lucide-react';

const ForgotPassword = () => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    let interval;
    if (timer > 0) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    let formattedPhone = phone.trim();
    if (/^\d{10}$/.test(formattedPhone)) {
      formattedPhone = `+91${formattedPhone}`;
    }
    
    if (!formattedPhone.startsWith('+')) {
      return setError('Phone must include country code (e.g. +91...)');
    }

    setLoading(true);
    setError('');
    try {
      await axios.post(`${API_BASE_URL}/auth/forgot-password`, { email, phone: formattedPhone });
      setStep(2);
      setTimer(60);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await axios.post(`${API_BASE_URL}/auth/verify-otp`, { email, otp });
      setResetToken(res.data.reset_token);
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid OTP code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await axios.post(`${API_BASE_URL}/auth/reset-password`, { 
        email, 
        reset_token: resetToken, 
        new_password: newPassword 
      });
      navigate('/login', { state: { message: 'Password reset successful!' } });
    } catch (err) {
      setError(err.response?.data?.detail || 'Reset failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center p-6 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-orange-500/10 via-transparent to-transparent">
      <div className="w-full max-w-md slide-in">
        <div className="text-center mb-10">
           <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4 text-orange-400 shadow-xl">
              <KeyRound size={28} />
           </div>
           <h1 className="text-2xl font-black tracking-tight">Recover Account</h1>
           <p className="text-gray-500 mt-2 text-sm px-8">Follow the steps to securely reset your login credentials</p>
        </div>

        <div className="glass p-8 rounded-3xl border-glass-border shadow-2xl relative">
          <div className="flex justify-between items-center mb-8 px-4">
             {[1, 2, 3].map(i => (
               <div key={i} className="flex flex-col items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border-2 transition-all ${
                    step >= i ? 'bg-orange-500 border-orange-500 text-white' : 'bg-white/5 border-white/10 text-gray-500'
                  }`}>
                    {i}
                  </div>
               </div>
             ))}
             <div className="absolute top-[52px] left-[70px] right-[70px] h-[2px] bg-white/5 -z-10">
                <div className="h-full bg-orange-500 transition-all duration-500" style={{ width: `${(step-1)*50}%` }}></div>
             </div>
          </div>

          {step === 1 && (
            <form onSubmit={handleSendOtp} className="space-y-6">
               <div className="space-y-4">
                  <div className="relative group">
                     <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                     <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Registration Email" className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 outline-none focus:border-orange-500/50" />
                  </div>
                  <div className="relative group">
                     <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                     <input type="tel" required value={phone} onChange={e => setPhone(e.target.value)} placeholder="10-digit Mobile" className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 outline-none focus:border-orange-500/50" />
                  </div>
               </div>
               <button type="submit" disabled={loading} className="w-full py-4 rounded-xl bg-orange-500 text-white font-bold shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 hover:bg-orange-400">
                  {loading ? <Loader2 className="animate-spin" /> : <>Request OTP <ArrowRight size={18} /></>}
               </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
               <div className="text-center px-4 mb-2">
                 <p className="text-xs text-gray-400 leading-relaxed">We've sent a 6-digit code to your mobile. Enter it below within the next 2 minutes.</p>
               </div>
               <div className="relative group">
                  <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  <input type="text" maxLength={6} required value={otp} onChange={e => setOtp(e.target.value)} placeholder="Enter 6-digit OTP" className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-center text-2xl font-black tracking-[0.4em] outline-none focus:border-orange-500/50" />
               </div>
               <div className="flex justify-center">
                  {timer > 0 ? (
                    <p className="text-xs text-gray-500">Resend available in <span className="text-orange-400 font-bold">{timer}s</span></p>
                  ) : (
                    <button type="button" onClick={handleSendOtp} className="text-xs text-orange-400 font-bold hover:underline">Resend OTP Now</button>
                  )}
               </div>
               <button type="submit" disabled={loading} className="w-full py-4 rounded-xl bg-orange-500 text-white font-bold shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 hover:bg-orange-400">
                  {loading ? <Loader2 className="animate-spin" /> : <>Verify & Continue <ArrowRight size={18} /></>}
               </button>
               <button type="button" onClick={() => setStep(1)} className="w-full text-xs text-gray-500 hover:text-white flex items-center justify-center gap-2">
                  <ArrowLeft size={14} /> Back to details
               </button>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-6">
               <div className="text-center px-4 mb-2">
                 <p className="text-xs text-gray-400 leading-relaxed">Verification complete. Choose a strong new password for your account.</p>
               </div>
               <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  <input type="password" required value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Minimum 6 characters" className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 outline-none focus:border-orange-500/50" />
               </div>
               <button type="submit" disabled={loading} className="w-full py-4 rounded-xl bg-orange-500 text-white font-bold shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 hover:bg-orange-400">
                  {loading ? <Loader2 className="animate-spin" /> : <>Complete Reset <ArrowRight size={18} /></>}
               </button>
            </form>
          )}

          {error && <p className="text-center text-xs text-red-400 mt-6 font-bold">{error}</p>}

          <p className="text-center text-sm mt-8">
            <Link to="/login" className="text-gray-500 font-bold hover:text-white transition-colors flex items-center justify-center gap-1">
               <ArrowLeft size={16} /> Back to Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
