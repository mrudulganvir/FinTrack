export const API_BASE_URL = ['localhost', '127.0.0.1', '0.0.0.0'].includes(window.location.hostname)
  ? 'http://localhost:8000'
  : 'https://fintrack-1-7p43.onrender.com';

export const CAT_EMOJI = {
  grocery: '🛒', shopping: '🛍️', food: '🍱', utilities: '💡',
  rent: '🏠', travel: '✈️', medical: '💊', health: '🩺',
  education: '📚', gift: '🎁', salary: '💰', general: '💳',
  others: '📦', investment: '📈', drinks: '🍸', fuel: '⛽',
};

export const CAT_COLORS = {
  Food: '#f59e0b', Shopping: '#ec4899', Rent: '#ef4444',
  Bills: '#3b82f6', Salary: '#10b981', Travel: '#8b5cf6',
  Medical: '#f43f5e', Investment: '#0ea5e9', Others: '#64748b'
};

export const GOOGLE_CLIENT_ID = '630519194830-11vr207sh054kkap7ttegarh65li7djn.apps.googleusercontent.com';
