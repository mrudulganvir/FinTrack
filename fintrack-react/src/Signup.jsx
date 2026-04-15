import React, { useState, useEffect } from 'react';
import { useUser } from './UserContext';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL, GOOGLE_CLIENT_ID } from './constants';
import { Mail, Lock, User, Phone, UserPlus, AlertCircle } from 'lucide-react';

const Signup = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useUser();

  const handleGoogleResponse = async (response) => {
     try {
        setLoading(true);
        const res = await axios.post(`${API_BASE_URL}/auth/google`, { 
           id_token: response.credential 
        });
        login(res.data.access_token);
        navigate('/');
     } catch (err) {
        setError('Google Login failed');
     } finally {
        setLoading(false);
     }
  };

  useEffect(() => {
     /* global google */
     if (typeof google !== 'undefined') {
        google.accounts.id.initialize({
           client_id: GOOGLE_CLIENT_ID,
           callback: handleGoogleResponse
        });
        google.accounts.id.renderButton(
           document.getElementById('gsi-signup'),
           { theme: 'outline', size: 'large', width: '100%', shape: 'pill' }
        );
     }
  }, []);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (!/^\d{10}$/.test(formData.phone)) {
      setError('Please enter a valid 10-digit phone number.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await axios.post(`${API_BASE_URL}/auth/signup`, formData);
      navigate('/login', { state: { message: 'Account created! Please sign in.' } });
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center p-6 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-cyan-500/10 via-transparent to-transparent">
      <div className="w-full max-w-md slide-in">
        <div className="text-center mb-8">
           <h1 className="text-3xl font-bold tracking-tight">Join FinTrack</h1>
           <p className="text-gray-500 mt-2">Start managing your wealth smarter today</p>
        </div>

        <div className="glass p-8 rounded-3xl border-glass-border shadow-2xl">
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Full Name</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-teal-400 transition-colors" size={18} />
                <input 
                  id="name"
                  type="text" 
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="John Doe"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-teal-500/50 transition-all placeholder-gray-600"
                />
              </div>
            </div>

            <div>
               <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-teal-400 transition-colors" size={18} />
                <input 
                  id="email"
                  type="email" 
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="you@email.com"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-teal-500/50 transition-all placeholder-gray-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Phone Number</label>
              <div className="relative group">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-teal-400 transition-colors" size={18} />
                <input 
                  id="phone"
                  type="tel" 
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="10-digit number"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-teal-500/50 transition-all placeholder-gray-600"
                />
              </div>
            </div>

            <div className="pb-2">
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Set Password</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-teal-400 transition-colors" size={18} />
                <input 
                  id="password"
                  type="password" 
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Min. 6 characters"
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
                  <span>Create Account</span>
                  <UserPlus size={18} />
                </>
              )}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-glass-border"></div></div>
            <div className="relative flex justify-center text-[10px] uppercase"><span className="bg-[#0e0e16] px-2 text-gray-500 tracking-widest font-bold">Or sign up with</span></div>
          </div>

          <div id="gsi-signup" className="flex justify-center"></div>

          <p className="text-center text-gray-500 text-sm mt-8">
            Already have an account? <Link to="/login" className="text-teal-400 font-bold hover:underline">Sign in instead</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
