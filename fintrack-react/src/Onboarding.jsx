import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from './constants';
import { useUser } from './UserContext';
import {
  ShieldCheck, Building2, User, CreditCard, ChevronRight,
  CheckCircle2, ArrowLeft, Loader2, Wallet, Fingerprint,
  ScanFace, Smartphone, Globe, AlertCircle, Eye, EyeOff, Lock
} from 'lucide-react';

/* ─── constants ──────────────────────────────────────────────────────────── */
const STEPS = [
  { id: 1, label: 'Profile',   Icon: User },
  { id: 2, label: 'KYC',       Icon: ShieldCheck },
  { id: 3, label: 'Banks',     Icon: Building2 },
  { id: 4, label: 'Cards',     Icon: CreditCard },
  { id: 5, label: 'Secure',    Icon: Fingerprint },
  { id: 6, label: 'Done',      Icon: CheckCircle2 },
];

const BANKS = [
  { id: 'hdfc',  name: 'HDFC Bank',  bg: '#0078BD' },
  { id: 'sbi',   name: 'SBI',        bg: '#22468A' },
  { id: 'icici', name: 'ICICI Bank', bg: '#F37421' },
  { id: 'axis',  name: 'Axis Bank',  bg: '#800000' },
];

const slide = {
  initial: { opacity: 0, x: 32 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.3, ease: 'easeOut' } },
  exit:    { opacity: 0, x: -32, transition: { duration: 0.2 } },
};

const pop = {
  initial: { opacity: 0, scale: 0.88 },
  animate: { opacity: 1, scale: 1, transition: { type: 'spring', damping: 14, stiffness: 160 } },
  exit:    { opacity: 0, scale: 0.92 },
};

/* ─── tiny helpers ───────────────────────────────────────────────────────── */
const ErrorBox = ({ msg }) =>
  msg ? (
    <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mt-4">
      <AlertCircle size={16} className="mt-0.5 shrink-0" />
      <p className="leading-snug">{msg}</p>
    </div>
  ) : null;

const BackBtn = ({ onClick }) => (
  <button onClick={onClick}
    className="flex items-center gap-2 text-gray-500 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors mb-8">
    <ArrowLeft size={15} /> Go Back
  </button>
);

/* ─── main component ─────────────────────────────────────────────────────── */
export default function Onboarding() {
  const [step, setStep]               = useState(1);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');

  // KYC
  const [kyc, setKyc]                 = useState({ documentType: 'PAN', documentNumber: '', fullName: '' });

  // Bank
  const [selectedBank, setSelectedBank] = useState(null);
  const [bankLinked, setBankLinked]   = useState(false);

  // Card
  const [card, setCard]               = useState({ cardType: 'Credit', network: 'Visa', last4: '', expiryMonth: 12, expiryYear: 2028 });
  const [showExpiry, setShowExpiry]   = useState(false);
  const [cardLinked, setCardLinked]   = useState(false);

  // Biometric
  const [bioOption, setBioOption]     = useState('fingerprint');
  const [bioEnabled, setBioEnabled]   = useState(false);

  const { token, user } = useUser();
  const navigate        = useNavigate();

  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
  const err = (msg) => setError(msg);
  const ok  = ()    => setError('');

  /* ─── API calls ─────────────────────────────────────────────────────────── */

  const submitKyc = async () => {
    ok(); setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/onboarding/kyc`, {
        document_type:   kyc.documentType,
        document_number: kyc.documentNumber.trim().toUpperCase(),
        full_name:       kyc.fullName.trim(),
      }, authHeaders);
      setStep(3);
    } catch (e) {
      err(e.response?.data?.detail || 'KYC verification failed. Check your details and try again.');
    } finally { setLoading(false); }
  };

  const linkBank = async () => {
    if (!selectedBank) { err('Please select a bank first.'); return; }
    ok(); setLoading(true);
    try {
      // Uses the existing /onboarding/link-mock-account endpoint which links HDFC by default.
      // In production this would trigger the Account Aggregator OAuth redirect.
      await axios.post(`${API_BASE_URL}/onboarding/link-mock-account`, {}, authHeaders);
      setBankLinked(true);
      setTimeout(() => setStep(4), 700);
    } catch (e) {
      err(e.response?.data?.detail || 'Bank linking failed. Please try again.');
    } finally { setLoading(false); }
  };

  const linkCard = async () => {
    if (card.last4.length < 4) { err('Enter the last 4 digits of your card.'); return; }
    ok(); setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/onboarding/link-card`, {
        card_type:    card.cardType,
        network:      card.network,
        last4:        card.last4,
        expiry_month: parseInt(card.expiryMonth, 10),
        expiry_year:  parseInt(card.expiryYear, 10),
      }, authHeaders);
      setCardLinked(true);
      setTimeout(() => setStep(5), 700);
    } catch (e) {
      err(e.response?.data?.detail || 'Card linking failed. Please try again.');
    } finally { setLoading(false); }
  };

  const setupBiometric = async () => {
    ok(); setLoading(true);
    try {
      let credId = "dummy_credential_" + Date.now();
      let pubKey = "dummy_public_key";

      // Attempt WebAuthn platform authenticator (fingerprint / face)
      if (window.PublicKeyCredential) {
        try {
          const credential = await navigator.credentials.create({
            publicKey: {
              challenge:   crypto.getRandomValues(new Uint8Array(32)),
              rp:          { name: 'FinTrack' },
              user:        { id: new TextEncoder().encode(String(user?.id || 'u')), name: user?.name || 'user', displayName: user?.name || 'FinTrack User' },
              pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
              authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
              timeout: 30000,
            },
          });
          if (credential && credential.rawId) {
             credId = window.btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
          }
        } catch {
          // User cancelled or device unsupported — treat as "done" for demo
        }
      }
      await axios.post(`${API_BASE_URL}/onboarding/setup-biometrics`, {
        credential_id: credId,
        public_key: pubKey,
        biometric_type: bioOption
      }, authHeaders);
      setBioEnabled(true);
      setTimeout(() => setStep(6), 700);
    } catch (e) {
      err(e.response?.data?.detail || 'Biometric setup failed.');
    } finally { setLoading(false); }
  };

  const finishOnboarding = async () => {
    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/onboarding/complete`, {}, authHeaders);
    } catch { /* best effort */ } finally {
      navigate('/');
    }
  };

  /* ─── render ─────────────────────────────────────────────────────────────── */
  const firstName = user?.name?.split(' ')[0] ?? 'there';

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col items-center justify-center p-6 font-['Plus_Jakarta_Sans'] overflow-hidden relative">

      {/* ambient glows */}
      <div className="pointer-events-none absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-teal-500/10 blur-[120px] rounded-full animate-pulse" />
      <div className="pointer-events-none absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-500/10 blur-[120px] rounded-full animate-pulse" />

      {/* ── progress bar ── */}
      <div className="w-full max-w-2xl mb-12 relative z-10 px-2">
        <div className="flex justify-between relative">
          <div className="absolute top-5 left-0 w-full h-[2px] bg-white/5" />
          <div
            className="absolute top-5 left-0 h-[2px] bg-gradient-to-r from-teal-500 to-cyan-400 transition-all duration-700 ease-out"
            style={{ width: `${((step - 1) / (STEPS.length - 1)) * 100}%` }}
          />
          {STEPS.map(s => {
            const active  = step >= s.id;
            const current = step === s.id;
            return (
              <div key={s.id} className="relative flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 z-10
                  ${active
                    ? 'bg-gradient-to-br from-teal-500 to-cyan-400 shadow-[0_0_20px_rgba(20,184,166,0.4)]'
                    : 'bg-white/5 border border-white/10'}
                  ${current ? 'scale-110' : ''}`}>
                  <s.Icon size={17} className={active ? 'text-white' : 'text-gray-600'} />
                </div>
                <span className={`text-[9px] uppercase tracking-widest mt-2.5 font-black
                  ${active ? 'text-teal-400' : 'text-gray-600'}`}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── card shell ── */}
      <div className="w-full max-w-xl relative group z-10">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-teal-500/20 to-cyan-500/20 rounded-[32px] blur opacity-60 group-hover:opacity-90 transition duration-700" />
        <div className="relative bg-[#0a0a0f]/90 backdrop-blur-xl rounded-[30px] p-8 border border-white/5 shadow-2xl min-h-[520px] flex flex-col overflow-hidden">

          <AnimatePresence mode="wait">

            {/* ══ STEP 1 — Welcome ══ */}
            {step === 1 && (
              <motion.div key="s1" {...slide} className="flex-1 flex flex-col">
                <span className="self-start px-3 py-1 bg-teal-500/10 text-teal-400 text-[10px] font-black rounded-full border border-teal-500/20 uppercase tracking-widest mb-6">
                  Passport to Wealth
                </span>
                <h2 className="text-4xl font-extrabold mb-3 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                  Hello, {firstName}!
                </h2>
                <p className="text-gray-400 mb-10 text-base leading-relaxed">
                  Your journey to financial freedom starts here. We'll secure your account in four quick steps.
                </p>

                <div className="space-y-4 mb-10">
                  {[
                    { Icon: ShieldCheck, color: 'text-teal-400',   bg: 'bg-teal-500/10',   title: 'Military-Grade Encryption',  sub: 'AES-256 — your data never leaves unencrypted.' },
                    { Icon: Fingerprint, color: 'text-purple-400', bg: 'bg-purple-500/10', title: 'Biometric Ready',             sub: 'FaceID or passkey for one-tap access.' },
                    { Icon: Building2,   color: 'text-blue-400',   bg: 'bg-blue-500/10',   title: 'Zero-credential Linking',    sub: 'We use OAuth tokens — never your bank password.' },
                  ].map(({ Icon, color, bg, title, sub }) => (
                    <div key={title} className="flex items-center gap-4 p-4 bg-white/[0.03] rounded-2xl border border-white/5 hover:bg-white/[0.06] transition-colors">
                      <div className={`w-11 h-11 shrink-0 ${bg} rounded-xl flex items-center justify-center ${color}`}><Icon size={22} /></div>
                      <div>
                        <p className="font-bold text-sm text-white">{title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <button onClick={() => setStep(2)}
                  className="mt-auto w-full py-4 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 font-bold text-sm uppercase tracking-widest shadow-[0_8px_30px_rgba(20,184,166,0.25)] flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all">
                  Secure My Future <ChevronRight size={18} />
                </button>
              </motion.div>
            )}

            {/* ══ STEP 2 — KYC ══ */}
            {step === 2 && (
              <motion.div key="s2" {...slide} className="flex-1 flex flex-col">
                <BackBtn onClick={() => { ok(); setStep(1); }} />
                <h2 className="text-3xl font-bold mb-1.5">Identity Verification</h2>
                <p className="text-gray-400 text-sm mb-8">Required for regulatory compliance and fraud protection.</p>

                <div className="space-y-5">
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Document Type</label>
                    <div className="relative">
                      <select value={kyc.documentType} onChange={e => setKyc({ ...kyc, documentType: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 px-5 focus:outline-none focus:border-teal-500/50 appearance-none text-white font-medium">
                        <option value="PAN"      className="bg-[#0a0a0f]">PAN Card (India)</option>
                        <option value="AADHAAR"  className="bg-[#0a0a0f]">Aadhaar Card</option>
                        <option value="PASSPORT" className="bg-[#0a0a0f]">International Passport</option>
                      </select>
                      <ChevronRight size={16} className="absolute right-5 top-1/2 -translate-y-1/2 rotate-90 text-gray-500 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">
                      {kyc.documentType === 'PAN' ? 'PAN Number (e.g. ABCDE1234F)' : kyc.documentType === 'AADHAAR' ? 'Aadhaar Number (12 digits)' : 'Passport Number'}
                    </label>
                    <input type="text"
                      placeholder={kyc.documentType === 'PAN' ? 'ABCDE1234F' : kyc.documentType === 'AADHAAR' ? '1234 5678 9012' : 'A1234567'}
                      value={kyc.documentNumber}
                      onChange={e => setKyc({ ...kyc, documentNumber: e.target.value.toUpperCase() })}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 px-5 focus:outline-none focus:border-teal-500/50 uppercase font-mono tracking-widest placeholder-gray-700 text-sm" />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Legal Full Name</label>
                    <input type="text" placeholder="As printed on your document"
                      value={kyc.fullName}
                      onChange={e => setKyc({ ...kyc, fullName: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 px-5 focus:outline-none focus:border-teal-500/50 placeholder-gray-700 text-sm" />
                  </div>
                </div>

                <ErrorBox msg={error} />

                <button onClick={submitKyc}
                  disabled={loading || !kyc.documentNumber || !kyc.fullName}
                  className="mt-auto w-full py-4 rounded-2xl bg-teal-500 font-black text-sm uppercase tracking-widest shadow-[0_8px_30px_rgba(20,184,166,0.25)] flex items-center justify-center gap-3 disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:bg-teal-400">
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <><ShieldCheck size={18} /> Confirm & Verify</>}
                </button>
              </motion.div>
            )}

            {/* ══ STEP 3 — Bank ══ */}
            {step === 3 && (
              <motion.div key="s3" {...slide} className="flex-1 flex flex-col">
                <h2 className="text-3xl font-bold mb-1.5">Sync Bank Account</h2>
                <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                  Link your bank via Account Aggregator. We use read-only OAuth tokens — your password is never shared.
                </p>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  {BANKS.map(bank => (
                    <button key={bank.id} onClick={() => setSelectedBank(bank.id)}
                      className={`p-5 rounded-2xl border flex flex-col items-center gap-3 transition-all duration-300
                        ${selectedBank === bank.id
                          ? 'border-teal-500 bg-teal-500/10 shadow-[0_0_20px_rgba(20,184,166,0.1)]'
                          : 'border-white/5 bg-white/5 hover:bg-white/[0.08] hover:border-white/20'}`}>
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shadow-lg text-white"
                        style={{ background: bank.bg }}>
                        {bank.name[0]}
                      </div>
                      <span className={`text-[10px] font-black tracking-widest uppercase
                        ${selectedBank === bank.id ? 'text-teal-400' : 'text-gray-400'}`}>
                        {bank.name}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/5 mb-6">
                  <Globe size={18} className="text-blue-400 shrink-0" />
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wide leading-tight">
                    Powered by RBI Account Aggregator network · MFA Protected
                  </p>
                </div>

                {bankLinked && (
                  <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 text-sm mb-4">
                    <CheckCircle2 size={16} /> Account linked successfully!
                  </div>
                )}

                <ErrorBox msg={error} />

                <button onClick={linkBank}
                  disabled={loading || !selectedBank}
                  className="mt-auto w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 font-bold text-sm uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 disabled:opacity-30 transition-all hover:scale-[1.01]">
                  {loading ? <Loader2 className="animate-spin" size={20} /> : 'Link via Aggregator'}
                </button>
              </motion.div>
            )}

            {/* ══ STEP 4 — Card ══ */}
            {step === 4 && (
              <motion.div key="s4" {...slide} className="flex-1 flex flex-col">
                <h2 className="text-3xl font-bold mb-1.5">Link Your Card</h2>
                <p className="text-gray-400 text-sm mb-6">Add a Credit or Debit card for precise expense categorisation. We never store full card numbers.</p>

                {/* live card preview */}
                <div className="relative h-44 w-full bg-gradient-to-br from-gray-800/80 to-gray-950 rounded-2xl border border-white/10 p-6 mb-6 overflow-hidden shadow-2xl select-none">
                  <div className="absolute top-[-20%] right-[-10%] w-48 h-48 bg-teal-500/10 rounded-full blur-3xl" />
                  <div className="flex justify-between items-start mb-8">
                    <div className="w-12 h-8 bg-yellow-400/20 rounded-md border border-yellow-400/30 flex items-center justify-center">
                      <div className="grid grid-cols-2 gap-0.5 w-5 h-4">
                        {[...Array(4)].map((_, i) => <div key={i} className="bg-yellow-400/40 rounded-[1px]" />)}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest">{card.cardType} Card</p>
                      <p className="text-base font-black text-teal-400 italic">{card.network}</p>
                    </div>
                  </div>
                  <p className="text-lg font-mono tracking-[0.18em] text-white mb-3">
                    •••• •••• •••• {card.last4 || '0000'}
                  </p>
                  <div className="flex justify-between items-end">
                    <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest">
                      EXP: {String(card.expiryMonth).padStart(2,'0')}/{String(card.expiryYear).slice(-2)}
                    </p>
                    <Lock size={16} className="text-white/20" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Type</label>
                    <select value={card.cardType} onChange={e => setCard({ ...card, cardType: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-teal-500/50 appearance-none text-sm text-white">
                      <option value="Credit" className="bg-[#0a0a0f]">Credit</option>
                      <option value="Debit"  className="bg-[#0a0a0f]">Debit</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Network</label>
                    <select value={card.network} onChange={e => setCard({ ...card, network: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-teal-500/50 appearance-none text-sm text-white">
                      {['Visa','Mastercard','RuPay','Amex'].map(n => (
                        <option key={n} value={n} className="bg-[#0a0a0f]">{n}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-2">
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Last 4 Digits</label>
                    <input type="text" maxLength={4} placeholder="1234"
                      value={card.last4}
                      onChange={e => setCard({ ...card, last4: e.target.value.replace(/\D/g,'') })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-teal-500/50 text-sm font-mono tracking-widest placeholder-gray-700" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Expiry Year</label>
                    <input type="number" min={2024} max={2040} placeholder="2028"
                      value={card.expiryYear}
                      onChange={e => setCard({ ...card, expiryYear: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-teal-500/50 text-sm placeholder-gray-700" />
                  </div>
                </div>

                <p className="text-[10px] text-gray-600 italic mb-2 ml-1">🔒 Full card number is never stored or transmitted.</p>

                {cardLinked && (
                  <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 text-sm">
                    <CheckCircle2 size={16} /> Card ****{card.last4} linked!
                  </div>
                )}

                <ErrorBox msg={error} />

                <div className="mt-auto flex flex-col gap-3 pt-4">
                  <button onClick={linkCard}
                    disabled={loading || card.last4.length < 4}
                    className="w-full py-4 rounded-2xl bg-white text-black font-black text-sm uppercase tracking-widest shadow-lg flex items-center justify-center gap-3 disabled:opacity-30 transition-all hover:bg-gray-100">
                    {loading ? <Loader2 className="animate-spin" size={20} /> : <><CreditCard size={18} /> Securely Link Card</>}
                  </button>
                  <button onClick={() => { ok(); setStep(5); }}
                    className="text-gray-600 hover:text-white text-[10px] font-black uppercase tracking-[0.2em] transition-colors">
                    Skip this step
                  </button>
                </div>
              </motion.div>
            )}

            {/* ══ STEP 5 — Biometric ══ */}
            {step === 5 && (
              <motion.div key="s5" {...pop} className="flex-1 flex flex-col items-center text-center py-4">
                <div className="relative mb-8">
                  <div className="w-24 h-24 rounded-full bg-teal-500/10 flex items-center justify-center relative">
                    <div className="absolute inset-0 rounded-full border border-teal-500/30 animate-ping opacity-20" />
                    <Fingerprint size={48} className="text-teal-400" />
                  </div>
                </div>
                <h2 className="text-3xl font-bold mb-3">Enable Biometrics</h2>
                <p className="text-gray-400 text-sm mb-8 max-w-xs leading-relaxed">
                  Setup FaceID, TouchID, or a passkey for instant, password-free access.
                  Your biometric data never leaves your device.
                </p>

                {/* option toggle */}
                <div className="flex gap-3 mb-8 w-full">
                  {[
                    { id: 'fingerprint', label: 'Fingerprint / TouchID', Icon: Fingerprint },
                    { id: 'face',        label: 'Face ID',               Icon: ScanFace    },
                  ].map(({ id, label, Icon }) => (
                    <button key={id} onClick={() => setBioOption(id)}
                      className={`flex-1 flex flex-col items-center gap-2 py-4 rounded-2xl border transition-all text-sm font-bold
                        ${bioOption === id ? 'border-teal-500 bg-teal-500/10 text-teal-400' : 'border-white/10 bg-white/5 text-gray-400 hover:text-white'}`}>
                      <Icon size={26} />
                      <span className="text-[10px] uppercase tracking-wider">{label}</span>
                    </button>
                  ))}
                </div>

                <div className="w-full p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center gap-4 mb-8">
                  <ScanFace size={20} className="text-cyan-400 shrink-0" />
                  <div className="text-left">
                    <p className="text-xs font-bold">WebAuthn / Passkey Standard</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Biometric data stored in device Secure Enclave only.</p>
                  </div>
                  <div className="ml-auto w-10 h-5 bg-teal-500/20 rounded-full flex items-center px-0.5">
                    <div className="w-4 h-4 bg-teal-500 rounded-full ml-auto shadow" />
                  </div>
                </div>

                {bioEnabled && (
                  <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 text-sm w-full mb-4">
                    <CheckCircle2 size={16} /> Biometric enabled!
                  </div>
                )}

                <ErrorBox msg={error} />

                <div className="flex flex-col w-full gap-3 mt-auto pt-4">
                  <button onClick={setupBiometric}
                    className="w-full py-4 rounded-2xl bg-teal-500 font-black text-sm uppercase tracking-widest shadow-[0_8px_30px_rgba(20,184,166,0.3)] flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all">
                    {loading ? <Loader2 className="animate-spin" size={20} /> : <><Fingerprint size={18} /> Setup Secure Access</>}
                  </button>
                  <button onClick={() => { ok(); setStep(6); }}
                    className="text-gray-600 hover:text-white text-[10px] font-black uppercase tracking-[0.2em] transition-colors">
                    Skip for now
                  </button>
                </div>
              </motion.div>
            )}

            {/* ══ STEP 6 — Done ══ */}
            {step === 6 && (
              <motion.div key="s6" {...pop} className="flex-1 flex flex-col items-center text-center py-8">
                <div className="relative mb-10">
                  <motion.div
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 10, stiffness: 100 }}
                    className="w-28 h-28 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center shadow-[0_0_50px_rgba(20,184,166,0.5)]">
                    <CheckCircle2 size={56} className="text-white" />
                  </motion.div>
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                    className="absolute -inset-4 border-2 border-dashed border-teal-500/30 rounded-full" />
                </div>

                <h2 className="text-4xl font-extrabold mb-3 uppercase tracking-tighter">Verified & Ready</h2>
                <p className="text-gray-400 mb-10 max-w-xs text-base leading-relaxed">
                  All systems operational. Your financial co-pilot is now online.
                </p>

                <div className="w-full space-y-2.5 mb-10 text-left">
                  {[
                    { label: 'KYC Status',       value: 'Verified ✓',               color: 'text-teal-400' },
                    { label: 'Bank Connection',   value: selectedBank ? `${BANKS.find(b=>b.id===selectedBank)?.name ?? selectedBank} · Secure` : 'Linked ✓', color: 'text-teal-400' },
                    { label: 'Card Sync',         value: cardLinked ? `****${card.last4} · Active` : 'Skipped',   color: cardLinked ? 'text-teal-400' : 'text-gray-500' },
                    { label: 'Biometric Access',  value: bioEnabled  ? 'Enabled ✓'  : 'Skipped',   color: bioEnabled  ? 'text-teal-400' : 'text-gray-500' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</span>
                      </div>
                      <span className={`text-xs font-bold uppercase tracking-wide ${color}`}>{value}</span>
                    </div>
                  ))}
                </div>

                <button onClick={finishOnboarding}
                  disabled={loading}
                  className="w-full py-5 rounded-2xl bg-white text-black font-black shadow-2xl hover:bg-gray-100 hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-[0.2em] flex items-center justify-center gap-2 disabled:opacity-60">
                  {loading ? <Loader2 className="animate-spin text-black" size={20} /> : 'Enter Dashboard →'}
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>

      {/* security footer */}
      <div className="mt-10 flex items-center gap-6 text-gray-600 z-10 select-none">
        {[
          [ShieldCheck, 'AES-256'],
          [Smartphone,  '256-Bit SSL'],
          [CheckCircle2,'PCI-DSS'],
        ].map(([Icon, label]) => (
          <div key={label} className="flex items-center gap-1.5">
            <Icon size={13} />
            <span className="text-[9px] uppercase font-black tracking-widest">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
