import React, { useState, useEffect, useRef } from 'react';
import { useUser } from './UserContext';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL, GOOGLE_CLIENT_ID } from './constants';
import {
  Mail, Lock, User, Phone, UserPlus, AlertCircle, Eye, EyeOff,
  ShieldCheck, Building2, CreditCard, Fingerprint, CheckCircle2,
  ChevronRight, ArrowLeft, Loader2, Globe, ScanFace
} from 'lucide-react';

/* ─── constants ──────────────────────────────────────────────────────────── */
const STEPS = [
  { id: 1, label: 'Profile', Icon: User },
  { id: 2, label: 'KYC', Icon: ShieldCheck },
  { id: 3, label: 'Finance', Icon: Building2 },
  { id: 4, label: 'Security', Icon: Fingerprint },
];

const slide = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.4, ease: 'easeOut' } },
  exit: { opacity: 0, x: -20, transition: { duration: 0.3 } },
};

export default function Signup() {
  const [step, setStep] = useState(1);
  const [showBankChoice, setShowBankChoice] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // KYC State (Clerk integration)
  const [kyc, setKyc] = useState({ documentType: 'PAN', documentNumber: '', fullName: '' });
  
  // Mastercard Integration State
  const [bankLinked, setBankLinked] = useState(false);
  const [card, setCard] = useState({ cardType: 'Credit', network: 'Mastercard', last4: '', expiryMonth: 12, expiryYear: 2028 });
  const [cardLinked, setCardLinked] = useState(false);
  
  // Biometric State
  const [bioEnabled, setBioEnabled] = useState(false);
  const [bioPreference, setBioPreference] = useState(null); // 'fingerprint' | 'face'
  const [showBioModal, setShowBioModal] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const videoRef = useRef(null);

  const navigate = useNavigate();
  const { login, token, user: userContext } = useUser();
  const gsiRef = useRef(false);

  const authHeaders = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

  /* ── Mastercard Event Listener ────────────────────────────────────────── */
  useEffect(() => {
    const handleMessage = (event) => {
      // Listen for Mastercard (Finicity) events
      if (event.data && event.data.type === 'finicityConnectSuccess') {
        console.log("Bank linked successfully!", event.data.details);
        setBankLinked(true);
      }
    };

    window.addEventListener('message', handleMessage);
    
    // Also check for redirect status if postMessage was missed
    const params = new URLSearchParams(window.location.search);
    if (params.get('status') === 'success' && !bankLinked) {
      setBankLinked(true);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    return () => window.removeEventListener('message', handleMessage);
  }, [bankLinked]);

  /* ── Auto-resume logic ─────────────────────────────────────────────────── */
  useEffect(() => {
    // Only show choice if we have a token AND the user isn't onboarded AND we are at step 1
    if (token && userContext && !userContext.is_onboarded && step === 1 && !showBankChoice) {
      setShowBankChoice(true);
    } else if (token && userContext?.is_onboarded) {
      // If already onboarded, just go home
      navigate('/');
    }
  }, [token, userContext, navigate, step, showBankChoice]);

  /* ── Google Sign-In button ─────────────────────────────────────────────── */
  useEffect(() => {
    let tries = 0;
    const init = () => {
      if (gsiRef.current) return;
      if (typeof window.google === 'undefined') {
        if (++tries < 20) setTimeout(init, 500);
        return;
      }
      gsiRef.current = true;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleResponse,
        ux_mode: 'popup',
      });
      const el = document.getElementById('gsi-signup');
      if (el) window.google.accounts.id.renderButton(el, { theme: 'outline', size: 'large', width: '350', shape: 'pill' });
    };
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGoogleResponse = async (response) => {
    try {
      setLoading(true); setError('');
      const res = await axios.post(`${API_BASE_URL}/auth/google`, { id_token: response.credential });
      
      // Decode JWT to get name/email for local state if needed
      const payload = JSON.parse(atob(res.data.access_token.split('.')[1]));
      setFormData(prev => ({ ...prev, name: payload.name, email: payload.email }));
      
      login(res.data.access_token);
      if (res.data.is_new_user || !res.data.is_onboarded) {
        setShowBankChoice(true);
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Google sign-up failed. Please try again.');
    } finally { setLoading(false); }
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.id]: e.target.value });

  /* ── Step 1: Create Account ────────────────────────────────────────────── */
  const handleInitialSignup = async (e) => {
    e.preventDefault();
    setError('');
    if (formData.password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (!/^\d{10}$/.test(formData.phone)) { setError('Enter a valid 10-digit phone number.'); return; }

    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/auth/signup`, formData);
      login(res.data.access_token);
      navigate('/onboarding');
    } catch (err) {
      if (err.response?.status === 400 && err.response?.data?.detail === 'Email already registered') {
        setError('This email is already registered. Please login or use a different email.');
      } else {
        setError(err.response?.data?.detail || 'Registration failed. Please try again.');
      }
    } finally { setLoading(false); }
  };


  /* ── Step 2: KYC (Clerk) ────────────────────────────────────────────────── */
  const handleKycSubmit = async () => {
    setError(''); setLoading(true);
    const activeToken = token || localStorage.getItem('ft_token');
    
    if (!activeToken) {
      setError('Auth session not found. Please try again.');
      setLoading(false);
      return;
    }

    try {
      await axios.post(`${API_BASE_URL}/onboarding/kyc`, {
        document_type: kyc.documentType,
        document_number: kyc.documentNumber.trim().toUpperCase(),
        full_name: kyc.fullName.trim() || formData.name,
      }, { headers: { Authorization: `Bearer ${activeToken}` } });
      setStep(3); // Move to Bank/Card
    } catch (e) {
      if (e.response?.status === 401) {
        setError('Your session has expired. Please sign up again.');
        // Clear invalid session
        localStorage.removeItem('ft_token');
        window.location.reload(); 
      } else {
        setError(e.response?.data?.detail || 'KYC verification failed.');
      }
    } finally { setLoading(false); }
  };

  /* ── Step 3: Mastercard Links ───────────────────────────────────────────── */
  const handleLinkBank = async () => {
    setError(''); setLoading(true);
    const activeToken = token || localStorage.getItem('ft_token');
    try {
      const res = await axios.post(`${API_BASE_URL}/onboarding/mastercard-connect`, {}, { headers: { Authorization: `Bearer ${activeToken}` } });
      const { connect_url } = res.data;
      
      if (connect_url) {
        if (connect_url.includes('localhost') || connect_url.includes('127.0.0.1')) {
          // Mock Flow (Backend WAF fallback)
          setTimeout(() => {
            setBankLinked(true);
            console.log("Mock Bank linked successfully!");
          }, 1500);
        } else {
          // Option B: Popup approach (Professional)
          const width = 500;
          const height = 700;
          const left = window.screenX + (window.outerWidth - width) / 2;
          const top = window.screenY + (window.outerHeight - height) / 2;
          
          window.open(
            connect_url, 
            'FinicityConnect', 
            `width=${width},height=${height},left=${left},top=${top},status=0,menubar=0,toolbar=0,location=0`
          );
        }
      } else {
        throw new Error('Failed to get Connect URL');
      }
    } catch (e) {
      setError('Failed to launch Mastercard Connect. Please try again.');
    } finally { setLoading(false); }
  };

  const linkFinancials = async () => {
    setError(''); setLoading(true);
    const activeToken = token || localStorage.getItem('ft_token');
    
    // If bank isn't linked yet, we should probably encourage linking it first
    // but for the sake of completion, we allow proceeding if at least something is done
    if (!bankLinked) {
      setError('Please link your bank account using Mastercard Connect first.');
      setLoading(false);
      return;
    }

    try {
      // 1. Trigger background sync for the bank (mocking the account_id for now)
      // In a real scenario, you'd get the account_id from the 'finicityConnectSuccess' event
      await axios.post(`${API_BASE_URL}/onboarding/link-mock-account`, {}, { headers: { Authorization: `Bearer ${activeToken}` } });
      
      // 2. Link Card if details provided
      if (card.last4) {
        await axios.post(`${API_BASE_URL}/onboarding/link-card`, {
          card_type: card.cardType,
          network: card.network,
          last4: card.last4,
          expiry_month: parseInt(card.expiryMonth, 10),
          expiry_year: parseInt(card.expiryYear, 10),
        }, { headers: { Authorization: `Bearer ${activeToken}` } });
        setCardLinked(true);
      }
      
      setStep(4); // Move to Biometric
    } catch (e) {
      setError('Failed to finalize financial integration.');
    } finally { setLoading(false); }
  };

  /* ── Step 4: Biometric & Finish ────────────────────────────────────────── */
  // Standard Base64 helpers to avoid 'atob' errors
  const toBase64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
  const fromBase64 = (str) => Uint8Array.from(atob(str), c => c.charCodeAt(0));

  const handleBiometricSetup = async (type) => {
    setError('');
    const activeToken = token || localStorage.getItem('ft_token');
    
    // If Face ID, show camera scan first
    if (type === 'face') {
      setIsScanning(true);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        setTimeout(() => {
          if (videoRef.current) videoRef.current.srcObject = stream;
        }, 100);

        // Simulate scan for 3 seconds
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Stop stream
        stream.getTracks().forEach(track => track.stop());
        setIsScanning(false);
      } catch (e) {
        setError("Camera access denied. Please allow camera for Face ID.");
        setIsScanning(false);
        return;
      }
    }

    setLoading(true);
    try {
      if (!window.PublicKeyCredential) {
        throw new Error('Biometrics not supported on this browser.');
      }

      const isAvailable = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!isAvailable) {
        throw new Error('Biometric hardware not available on this device.');
      }

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          rp: { name: "FinTrack" },
          user: {
            id: new TextEncoder().encode(formData.email),
            name: formData.email,
            displayName: formData.name || "FinTrack User",
          },
          pubKeyCredParams: [{ alg: -7, type: "public-key" }],
          authenticatorSelection: { 
            authenticatorAttachment: "platform", 
            userVerification: "required" 
          },
          timeout: 60000,
        }
      });

      const payload = {
        credential_id: toBase64(credential.rawId), // Store rawId as standard Base64
        public_key: toBase64(credential.response.attestationObject),
        biometric_type: type // Save the preference
      };

      await axios.post(`${API_BASE_URL}/onboarding/setup-biometrics`, payload, { headers: { Authorization: `Bearer ${activeToken}` } });
      setBioEnabled(true);
      setShowBioModal(false);
      
      await axios.post(`${API_BASE_URL}/onboarding/complete`, {}, { headers: { Authorization: `Bearer ${activeToken}` } });
      navigate('/');
    } catch (e) {
      setError(e.message || 'Biometric enrollment failed.');
      setShowBioModal(false);
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#0e0e16] text-white flex flex-col items-center justify-center p-6 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-teal-500/10 via-transparent to-transparent">
      
      {/* ── Progress Indicator ── */}
      <div className="w-full max-w-md mb-8 px-4">
        <div className="flex justify-between relative">
          <div className="absolute top-5 left-0 w-full h-[2px] bg-white/10" />
          <div className="absolute top-5 left-0 h-[2px] bg-teal-500 transition-all duration-500" style={{ width: `${((step - 1) / (STEPS.length - 1)) * 100}%` }} />
          {STEPS.map((s) => (
            <div key={s.id} className="relative z-10 flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${step >= s.id ? 'bg-teal-500 text-white shadow-[0_0_15px_rgba(20,184,166,0.5)]' : 'bg-white/5 text-gray-500 border border-white/10'}`}>
                <s.Icon size={18} />
              </div>
              <span className={`text-[9px] uppercase font-bold tracking-widest mt-2 ${step >= s.id ? 'text-teal-400' : 'text-gray-600'}`}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-teal-500 to-cyan-400 flex items-center justify-center mx-auto mb-4 font-black text-2xl shadow-xl shadow-teal-500/20">F</div>
          <h1 className="text-3xl font-bold tracking-tight">
            {step === 1 && 'Create Account'}
            {step === 2 && 'Identity Verification'}
            {step === 3 && 'Financial Integration'}
            {step === 4 && 'Secure Access'}
          </h1>
          <p className="text-gray-500 mt-2">
            {step === 1 && 'Start managing your wealth smarter'}
            {step === 2 && 'Powered by Clerk Identity'}
            {step === 3 && 'Seamless link via Mastercard API'}
            {step === 4 && 'Activate biometric protection'}
          </p>
        </div>

        <div className="glass p-8 rounded-3xl border-glass-border shadow-2xl relative overflow-hidden">
          <AnimatePresence mode="wait">
            
            {/* ══ STEP 1: INITIAL SIGNUP ══ */}
            {step === 1 && (
              <motion.form key="step1" {...slide} onSubmit={handleInitialSignup} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Full Name</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-teal-400 transition-colors" size={18} />
                    <input id="name" type="text" value={formData.name} onChange={handleChange} placeholder="John Doe" required autoComplete="name" className="input-field" />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Email Address</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-teal-400 transition-colors" size={18} />
                    <input id="email" type="email" value={formData.email} onChange={handleChange} placeholder="you@email.com" required autoComplete="email" className="input-field" />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Phone Number</label>
                  <div className="relative group">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-teal-400 transition-colors" size={18} />
                    <input id="phone" type="tel" value={formData.phone} onChange={handleChange} placeholder="10-digit mobile number" required autoComplete="tel" maxLength={10} className="input-field" />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Set Password</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-teal-400 transition-colors" size={18} />
                    <input id="password" type={showPw ? 'text' : 'password'} value={formData.password} onChange={handleChange} placeholder="Min. 6 characters" required autoComplete="new-password" className="input-field" />
                    <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-teal-400 transition-colors">
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                {error && <div className="error-box"><AlertCircle size={16} />{error}</div>}
                <button type="submit" disabled={loading} className="btn-primary">
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <><span>Next Step</span><ChevronRight size={18} /></>}
                </button>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5" /></div>
                  <div className="relative flex justify-center text-[10px] uppercase"><span className="bg-[#12121a] px-2 text-gray-500 font-bold">Or sign up with</span></div>
                </div>
                <div id="gsi-signup" className="flex justify-center min-h-[44px]" />
                <p className="text-center text-gray-500 text-sm mt-6">Already have an account? <Link to="/login" className="text-teal-400 font-bold hover:underline">Sign in</Link></p>
              </motion.form>
            )}

            {/* ══ STEP 2: KYC (CLERK) ══ */}
            {step === 2 && (
              <motion.div key="step2" {...slide} className="space-y-6">
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center font-bold text-lg">C</div>
                  <div>
                    <p className="text-sm font-bold">Clerk Identity Sync</p>
                    <p className="text-[10px] text-blue-400/80 uppercase font-black tracking-widest">Secure KYC Verification</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Document Type</label>
                    <select value={kyc.documentType} onChange={e => setKyc({...kyc, documentType: e.target.value})} className="input-field appearance-none">
                      <option value="PAN">PAN Card</option>
                      <option value="AADHAAR">Aadhaar Card</option>
                      <option value="PASSPORT">Passport</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Document Number</label>
                    <input type="text" value={kyc.documentNumber} onChange={e => setKyc({...kyc, documentNumber: e.target.value.toUpperCase()})} placeholder="XXXXX0000X" className="input-field font-mono" />
                  </div>
                </div>
                {error && <div className="error-box"><AlertCircle size={16} />{error}</div>}
                <button onClick={handleKycSubmit} disabled={loading || !kyc.documentNumber} className="btn-primary">
                   {loading ? <Loader2 className="animate-spin" size={20} /> : <><span>Verify with Clerk</span><ShieldCheck size={18} /></>}
                </button>
                <button onClick={() => setStep(3)} className="w-full text-center text-[11px] text-gray-500 font-bold uppercase tracking-widest hover:text-white transition-colors">Skip for now</button>
              </motion.div>
            )}

            {/* ══ STEP 3: FINANCIALS (MASTERCARD) ══ */}
            {step === 3 && (
              <motion.div key="step3" {...slide} className="space-y-6">
                 <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl flex items-center justify-center gap-3">
                  <div className="flex -space-x-4">
                    <div className="w-8 h-8 bg-red-500 rounded-full opacity-80" />
                    <div className="w-8 h-8 bg-yellow-500 rounded-full opacity-80" />
                  </div>
                  <div>
                    <p className="text-sm font-bold ml-2">Mastercard Connect</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <button 
                    onClick={handleLinkBank}
                    disabled={loading || bankLinked}
                    className={`w-full p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${bankLinked ? 'bg-teal-500/10 border-teal-500/50' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                  >
                    <div className="flex items-center gap-3">
                       <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bankLinked ? 'bg-teal-500 text-white' : 'bg-white/10 text-gray-400'}`}>
                         {bankLinked ? <CheckCircle2 size={20} /> : <Building2 size={20} />}
                       </div>
                       <div className="text-left">
                         <p className="text-sm font-bold">{bankLinked ? 'Bank Account Linked' : 'Link Bank Account'}</p>
                         <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">via Mastercard Connect</p>
                       </div>
                    </div>
                    {!bankLinked && <ChevronRight size={18} className="text-gray-600" />}
                  </button>

                  <div className="p-4 bg-gradient-to-br from-gray-800 to-gray-950 border border-white/10 rounded-2xl relative overflow-hidden">
                    <div className="flex justify-between items-start mb-4">
                      <CreditCard size={24} className="text-white/20" />
                      <span className="text-[9px] font-black uppercase tracking-tighter text-gray-500">Mastercard</span>
                    </div>
                    <div className="space-y-3">
                      <input type="text" maxLength={4} value={card.last4} onChange={e => setCard({...card, last4: e.target.value.replace(/\D/g,'')})} placeholder="Last 4 Digits" className="w-full bg-transparent border-b border-white/20 py-1 text-lg font-mono tracking-widest focus:outline-none focus:border-teal-500" />
                      <div className="flex gap-4">
                        <select value={card.network} onChange={e => setCard({...card, network: e.target.value})} className="bg-transparent text-xs font-bold focus:outline-none">
                          <option value="Mastercard" className="bg-dark">Mastercard</option>
                          <option value="Visa" className="bg-dark">Visa</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {error && <div className="error-box"><AlertCircle size={16} />{error}</div>}
                <button onClick={linkFinancials} disabled={loading || !bankLinked} className="btn-primary">
                   {loading ? <Loader2 className="animate-spin" size={20} /> : <><span>Continue Onboarding</span><ChevronRight size={18} /></>}
                </button>
              </motion.div>
            )}

            {/* ══ STEP 4: BIOMETRIC ══ */}
            {step === 4 && (
              <motion.div key="step4" {...slide} className="text-center space-y-6 py-4">
                <div className="relative mx-auto w-20 h-20">
                  <div className="absolute inset-0 bg-teal-500/20 rounded-full animate-ping" />
                  <div className="relative w-20 h-20 bg-teal-500/10 rounded-full flex items-center justify-center border border-teal-500/30">
                    <Fingerprint size={40} className="text-teal-400" />
                  </div>
                </div>
                <h2 className="text-xl font-bold">Secure Your Account</h2>
                <p className="text-gray-400 text-sm">Enable biometric login for faster and more secure access to your finances.</p>
                {error && <div className="error-box"><AlertCircle size={16} />{error}</div>}
                
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => { setBioPreference('fingerprint'); setShowBioModal(true); }} 
                    disabled={loading} 
                    className="p-6 rounded-3xl bg-teal-500/10 border border-teal-500/20 hover:bg-teal-500/20 transition-all flex flex-col items-center gap-3"
                  >
                    <Fingerprint size={32} className="text-teal-400" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-teal-400">Touch ID</span>
                  </button>
                  <button 
                    onClick={() => { setBioPreference('face'); setShowBioModal(true); }} 
                    disabled={loading} 
                    className="p-6 rounded-3xl bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 transition-all flex flex-col items-center gap-3"
                  >
                    <ScanFace size={32} className="text-cyan-400" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-400">Face ID</span>
                  </button>
                </div>

                {showBioModal && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
                    <div className="glass p-8 rounded-[2.5rem] border-glass-border w-full max-w-sm text-center">
                      <div className="w-16 h-16 bg-teal-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <ShieldCheck size={32} className="text-teal-400" />
                      </div>
                      <h3 className="text-xl font-bold mb-2">Enable Biometrics?</h3>
                      <p className="text-gray-400 text-sm mb-8 leading-relaxed">This will allow you to sign in securely using your device's biometric sensors.</p>
                      <div className="space-y-3">
                        <button onClick={() => handleBiometricSetup(bioPreference || 'fingerprint')} className="btn-primary">Yes, Enable Now</button>
                        <button onClick={() => setShowBioModal(false)} className="w-full py-3 text-sm text-gray-500 font-bold hover:text-white transition-colors">Maybe later</button>
                      </div>
                    </div>
                  </div>
                )}
                <button onClick={async () => {
                  setLoading(true);
                  const activeToken = token || localStorage.getItem('ft_token');
                  try {
                    await axios.post(`${API_BASE_URL}/onboarding/complete`, {}, { headers: { Authorization: `Bearer ${activeToken}` } });
                    navigate('/');
                  } catch { navigate('/'); }
                }} className="block w-full text-[11px] text-gray-500 font-bold uppercase tracking-widest hover:text-white transition-colors">Skip and Enter Dashboard</button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>

      {/* ══ BANK LINKING CHOICE MODAL ══ */}
      <AnimatePresence>
        {showBankChoice && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-md p-6">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="glass p-8 rounded-[2.5rem] border-glass-border w-full max-w-sm text-center shadow-2xl"
            >
              <div className="w-20 h-20 bg-gradient-to-tr from-orange-500/20 to-yellow-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-orange-500/20 shadow-lg">
                <Building2 size={40} className="text-orange-400" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Link Bank Account?</h3>
              <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                Connect your bank to automatically track spending, get smart insights, and manage your wealth effortlessly.
              </p>
              <div className="space-y-3">
                <button 
                  onClick={() => { setStep(2); setShowBankChoice(false); }} 
                  className="btn-primary w-full py-4"
                >
                  <Building2 size={18} />
                  <span>Yes, Link My Bank</span>
                </button>
                <button 
                  onClick={() => { setStep(4); setShowBankChoice(false); }} 
                  className="w-full py-3 text-sm text-gray-500 font-bold hover:text-white transition-colors uppercase tracking-widest"
                >
                  I'll enter data manually
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      


      {/* ══ FACE SCANNER OVERLAY ══ */}
      <AnimatePresence>
        {isScanning && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-[#0a0a0f] flex flex-col items-center justify-center p-6"
          >
            <div className="relative w-72 h-72 rounded-[3rem] overflow-hidden border-4 border-cyan-500/50 shadow-[0_0_80px_rgba(6,182,212,0.3)] mb-12">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
              <div className="absolute inset-0 border-[40px] border-[#0a0a0f]/40 pointer-events-none" />
              <div className="absolute inset-x-0 h-1 bg-cyan-400 shadow-[0_0_15px_#22d3ee] animate-scan-line z-10" />
              <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/10 to-transparent" />
            </div>
            
            <div className="text-center">
              <h3 className="text-2xl font-black tracking-tighter text-cyan-400 uppercase mb-2">Analyzing Face</h3>
              <p className="text-gray-500 text-xs font-bold uppercase tracking-widest animate-pulse">Position your face within the frame</p>
            </div>

            <div className="absolute bottom-12 flex items-center gap-4 text-cyan-500/40">
              <div className="w-2 h-2 rounded-full bg-cyan-500 animate-ping" />
              <span className="text-[10px] font-black uppercase tracking-widest">Encrypted Session Active</span>
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
        .input-field {
          width: 100%;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 0.75rem;
          padding: 0.75rem 1rem 0.75rem 3rem;
          transition: all 0.2s;
          outline: none;
        }
        .input-field:focus {
          border-color: rgba(20, 184, 166, 0.5);
          background: rgba(255, 255, 255, 0.08);
        }
        .error-box {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem;
          border-radius: 0.75rem;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #f87171;
          font-size: 0.875rem;
        }
        .btn-primary {
          width: 100%;
          padding: 0.875rem;
          border-radius: 0.75rem;
          background: linear-gradient(to right, #14b8a6, #06b6d4);
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: all 0.2s;
          box-shadow: 0 10px 15px -3px rgba(20, 184, 166, 0.3);
        }
        .btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 15px 20px -3px rgba(20, 184, 166, 0.4);
        }
        .btn-primary:active {
          transform: translateY(0);
        }
        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
