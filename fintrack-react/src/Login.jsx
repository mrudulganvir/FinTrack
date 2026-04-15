import React, { useState, useEffect } from 'react';
import { useUser } from './UserContext';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL, GOOGLE_CLIENT_ID } from './constants';
import { Mail, Lock, LogIn, AlertCircle } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useUser();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const res = await axios.post(`${API_BASE_URL}/auth/login`, formData);
      login(res.data.access_token);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

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
           document.getElementById('gsi-login'),
           { theme: 'outline', size: 'large', width: '100%', shape: 'pill' }
        );
     }
  }, []);

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
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-glass-border"></div></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-[#0e0e16] px-2 text-gray-500 tracking-widest font-bold">Or continue with</span></div>
          </div>

          <div id="gsi-login" className="flex justify-center"></div>

          <p className="text-center text-gray-500 text-sm mt-8">
            New here? <Link to="/signup" className="text-teal-400 font-bold hover:underline">Create an account</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
