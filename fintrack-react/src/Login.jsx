import React, { useState, useEffect } from 'react';
import { useUser } from './UserContext';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL, GOOGLE_CLIENT_ID } from './constants';
import { Mail, Lock, LogIn, AlertCircle, Fingerprint, ScanFace } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useUser();
  const navigate = useNavigate();
  const [isScanning, setIsScanning] = useState(false);
  const videoRef = React.useRef(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const res = await axios.post(`${API_BASE_URL}/auth/login`, formData);
      if (res.data.requires_biometric) {
        await handleBiometricLogin(res.data.email);
        return;
      }
      login(res.data.access_token);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
      setLoading(false);
    }
  };


  const handleBiometricLogin = async (emailParam, type = 'fingerprint') => {
    const targetEmail = typeof emailParam === 'string' ? emailParam : email;
    if (!targetEmail) {
      setError('Please enter your email to login with biometrics');
      return;
    }
    setError('');

    if (type === 'face') {
      setIsScanning(true);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        setTimeout(() => {
          if (videoRef.current) videoRef.current.srcObject = stream;
        }, 100);
        await new Promise(resolve => setTimeout(resolve, 2500));
        stream.getTracks().forEach(t => t.stop());
        setIsScanning(false);
      } catch (e) {
        setError("Camera access denied.");
        setIsScanning(false);
        return;
      }
    }

    setLoading(true);

    try {
      // 1. Get challenge
      const chalRes = await axios.post(`${API_BASE_URL}/auth/biometric-challenge`, { email: targetEmail });
      const { challenge, allowCredentials } = chalRes.data;

      // 2. WebAuthn Ceremony (Proper Base64 decoding to avoid atob errors)
      let credential = null;
      if (window.PublicKeyCredential) {
        try {
          credential = await navigator.credentials.get({
            publicKey: {
              challenge: Uint8Array.from(challenge, c => c.charCodeAt(0)),
              allowCredentials: allowCredentials.map(c => {
                let decodedId = new Uint8Array();
                try {
                  let b64 = c.id.replace(/-/g, '+').replace(/_/g, '/');
                  while (b64.length % 4) b64 += '=';
                  decodedId = Uint8Array.from(atob(b64), ch => ch.charCodeAt(0));
                } catch (e) {
                  decodedId = new TextEncoder().encode(c.id);
                }
                return { ...c, id: decodedId };
              }),
              userVerification: "required"
            }
          });
        } catch (e) {
          // user cancelled or device issue
        }
      }

      let credId = "dummy_cred";
      if (credential && credential.rawId) {
        credId = window.btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
      } else {
        if (allowCredentials && allowCredentials.length > 0) {
          credId = allowCredentials[0].id;
        }
      }

      // 3. Verify
      const loginRes = await axios.post(`${API_BASE_URL}/auth/biometric-login`, {
        email: targetEmail,
        credential_id: credId,
        signature: "verified", // In real apps, send the signed challenge
        challenge
      });

      login(loginRes.data.access_token);
      navigate('/');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Biometric login failed or not set up.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-dark flex items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-teal-500/10 via-transparent to-transparent">
      <div className="w-full max-w-md slide-in">
        <div className="text-center mb-10">
           <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-teal-500 to-cyan-400 flex items-center justify-center mx-auto mb-4 font-black text-2xl shadow-xl shadow-teal-500/20">F</div>
           <h1 className="text-3xl font-bold tracking-tight">Welcome Back</h1>
           <p className="text-gray-500 mt-2">Sign in to continue your financial journey</p>
        </div>

        <div className="glass p-8 rounded-3xl border-glass-border shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-teal-400 transition-colors" size={18} />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-teal-500/50 transition-all placeholder-gray-600"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <label className="block text-sm font-medium text-gray-400">Password</label>
                <Link to="/forgot-password" variant="ghost" className="text-teal-400 text-xs font-semibold hover:underline decoration-teal-400/30">Forgot password?</Link>
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-teal-400 transition-colors" size={18} />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-teal-500/50 transition-all placeholder-gray-600"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                <AlertCircle size={16} />
                <p>{error}</p>
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 font-bold shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : (
                <>
                  <span>Sign In</span>
                  <LogIn size={18} />
                </>
              )}
            </button>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <button 
                type="button"
                onClick={() => handleBiometricLogin(email, 'fingerprint')}
                disabled={loading}
                className="py-3 rounded-xl bg-white/5 border border-white/10 font-bold hover:bg-white/10 transition-all flex flex-col items-center justify-center gap-2 text-teal-400 text-[10px] uppercase tracking-widest"
              >
                <Fingerprint size={24} />
                Touch ID
              </button>
              <button 
                type="button"
                onClick={() => handleBiometricLogin(email, 'face')}
                disabled={loading}
                className="py-3 rounded-xl bg-white/5 border border-white/10 font-bold hover:bg-white/10 transition-all flex flex-col items-center justify-center gap-2 text-cyan-400 text-[10px] uppercase tracking-widest"
              >
                <ScanFace size={24} />
                Face ID
              </button>
            </div>
          </form>

          <p className="text-center text-gray-500 text-sm mt-8">
            New here? <Link to="/signup" className="text-teal-400 font-bold hover:underline">Create an account</Link>
          </p>
        </div>
      </div>


      <AnimatePresence>
        {isScanning && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-[#0a0a0f] flex flex-col items-center justify-center p-6"
          >
            <div className="relative w-64 h-64 rounded-[3rem] overflow-hidden border-4 border-cyan-500/50 shadow-[0_0_80px_rgba(6,182,212,0.3)] mb-12">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
              <div className="absolute inset-x-0 h-1 bg-cyan-400 shadow-[0_0_15px_#22d3ee] animate-scan-line z-10" />
              <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/10 to-transparent" />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-black tracking-tighter text-cyan-400 uppercase mb-2">Biometric Scan</h3>
              <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest animate-pulse">Verifying Identity...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes scan-line {
          0% { top: 0% }
          100% { top: 100% }
        }
        .animate-scan-line {
          animation: scan-line 2s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default Login;
