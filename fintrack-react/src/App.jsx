import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { UserProvider, useUser } from './UserContext';
import Layout from './Layout';
import Dashboard from './Dashboard';
import Expenses from './Expenses';
import Income from './Income';
import Budgets from './Budgets';
import Loans from './Loans';
import Reports from './Reports';
import Insights from './Insights';
import Investments from './Investments';
import Settings from './Settings';
import Chatbot from './Chatbot';
import Login from './Login';
import Signup from './Signup';
import ForgotPassword from './ForgotPassword';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { token, loading } = useUser();
  
  if (loading) return <div className="h-screen bg-dark flex items-center justify-center text-teal-400 font-bold tracking-widest animate-pulse">FINTRACK...</div>;
  if (!token) return <Navigate to="/login" />;
  
  return <Layout>{children}</Layout>;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      
      {/* Protected Pages */}
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/expenses" element={<ProtectedRoute><Expenses /></ProtectedRoute>} />
      <Route path="/income" element={<ProtectedRoute><Income /></ProtectedRoute>} />
      <Route path="/budgets" element={<ProtectedRoute><Budgets /></ProtectedRoute>} />
      <Route path="/loans" element={<ProtectedRoute><Loans /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
      <Route path="/insights" element={<ProtectedRoute><Insights /></ProtectedRoute>} />
      <Route path="/investments" element={<ProtectedRoute><Investments /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/chatbot" element={<ProtectedRoute><Chatbot /></ProtectedRoute>} />
      
      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

function App() {
  return (
    <UserProvider>
      <Router>
        <AppRoutes />
      </Router>
    </UserProvider>
  );
}

export default App;
