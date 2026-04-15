import React, { useState } from 'react';
import { useUser } from './UserContext';
import { 
  LayoutDashboard, 
  Receipt, 
  Wallet, 
  PieChart, 
  HandCoins, 
  FileText, 
  BrainCircuit, 
  TrendingUp, 
  MessageSquare, 
  Settings, 
  LogOut,
  Bell,
  Search,
  Menu,
  X
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const SidebarItem = ({ icon: Icon, label, to, active, collapsed }) => (
  <Link 
    to={to} 
    className={`flex items-center gap-3 px-5 py-3 transition-all duration-200 ${
      active 
        ? 'text-white bg-gradient-to-r from-teal-500/20 to-transparent border-l-4 border-teal-500 font-semibold' 
        : 'text-gray-400 hover:text-white hover:bg-white/5'
    }`}
  >
    <Icon size={20} />
    {!collapsed && <span>{label}</span>}
  </Link>
);

const Layout = ({ children }) => {
  const { user, logout } = useUser();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', to: '/' },
    { icon: Receipt, label: 'Expenses', to: '/expenses' },
    { icon: Wallet, label: 'Income', to: '/income' },
    { icon: PieChart, label: 'Budgets', to: '/budgets' },
    { icon: HandCoins, label: 'Loans', to: '/loans' },
    { icon: FileText, label: 'Reports', to: '/reports' },
    { icon: BrainCircuit, label: 'AI Insights', to: '/insights' },
    { icon: TrendingUp, label: 'Investments', to: '/investments' },
    { icon: MessageSquare, label: 'Finny AI', to: '/chatbot' },
  ];

  return (
    <div className="flex h-screen bg-dark text-white overflow-hidden">
      {/* Sidebar */}
      <aside className={`glass border-r border-glass-border flex flex-col transition-all duration-300 ${collapsed ? 'w-20' : 'w-72'}`}>
        <div className="p-6 flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-teal-500 to-cyan-400 flex items-center justify-center font-bold">F</div>
              <span className="text-xl font-bold tracking-tight">FinTrack</span>
            </div>
          )}
          <button onClick={() => setCollapsed(!collapsed)} className="text-gray-400 hover:text-white">
            {collapsed ? <Menu size={20} /> : <X size={20} />}
          </button>
        </div>

        <nav className="flex-1 mt-4 overflow-y-auto">
          <p className={`px-5 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 ${collapsed ? 'text-center' : ''}`}>Main Menu</p>
          {navItems.map((item) => (
            <SidebarItem 
              key={item.to} 
              {...item} 
              active={location.pathname === item.to}
              collapsed={collapsed}
            />
          ))}
        </nav>

        <div className="p-4 border-t border-glass-border">
          <SidebarItem 
            icon={Settings} 
            label="Settings" 
            to="/settings" 
            active={location.pathname === '/settings'}
            collapsed={collapsed}
          />
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-5 py-3 text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={20} />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-20 glass border-b border-glass-border px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4 flex-1">
             {(location.pathname !== '/expenses' && location.pathname !== '/income') && (
                <div className="relative group max-w-md w-full hidden md:block">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-teal-400" size={18} />
                   <input 
                     type="text" 
                     placeholder="Search transactions, bills..." 
                     className="w-full bg-[#1a1a2e] border border-gray-800 rounded-xl py-2.5 pl-11 pr-4 focus:outline-none focus:border-teal-500/50 transition-all"
                   />
                </div>
             )}
          </div>

          <div className="flex items-center gap-6">
            <button className="relative text-gray-400 hover:text-white transition-colors">
              <Bell size={22} />
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-dark"></span>
            </button>
            <div className="h-8 w-[1px] bg-glass-border"></div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold truncate max-w-[150px]">{user?.name}</p>
                <p className="text-[10px] text-gray-400">Pro Member</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500/20 to-cyan-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400 font-bold">
                {user?.initials}
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 bg-[#07070a]">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
