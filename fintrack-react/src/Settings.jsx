import React, { useState } from 'react';
import { useUser } from './UserContext';
import { 
  User, 
  Settings as SettingsIcon, 
  Shield, 
  Bell, 
  Smartphone, 
  Activity,
  Globe,
  Palette,
  Check
} from 'lucide-react';

const SettingsItem = ({ icon: Icon, title, description, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-4 p-5 rounded-3xl transition-all border ${active ? 'bg-teal-500/10 border-teal-500/30' : 'bg-white/5 border-transparent hover:bg-white/10'}`}
  >
    <div className={`p-3 rounded-xl ${active ? 'bg-teal-500 text-white' : 'bg-white/10 text-gray-400'}`}>
      <Icon size={20} />
    </div>
    <div className="text-left flex-1">
      <h4 className={`font-bold text-sm ${active ? 'text-white' : 'text-gray-300'}`}>{title}</h4>
      <p className="text-xs text-gray-500 mt-0.5">{description}</p>
    </div>
    {active && <Check size={18} className="text-teal-400" />}
  </button>
);

const Settings = () => {
  const { user } = useUser();
  const [activeSection, setActiveSection] = useState('profile');

  return (
    <div className="max-w-6xl mx-auto space-y-10 slide-in">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 shadow-2xl">
          <SettingsIcon size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Configuration</h1>
          <p className="text-gray-500 mt-1">Manage your account preferences and security</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
         <div className="space-y-3">
            <p className="px-4 text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-4">Account Settings</p>
            <SettingsItem 
              icon={User} 
              title="Personal Profile" 
              description="Name, email, and biometric data" 
              active={activeSection === 'profile'} 
              onClick={() => setActiveSection('profile')}
            />
            <SettingsItem 
              icon={Shield} 
              title="Security & Privacy" 
              description="Password, 2FA, and sessions" 
              active={activeSection === 'security'} 
              onClick={() => setActiveSection('security')}
            />
            <SettingsItem 
              icon={Bell} 
              title="Notifications" 
              description="Email alerts and push settings" 
              active={activeSection === 'notifications'} 
              onClick={() => setActiveSection('notifications')}
            />
            
            <p className="px-4 text-[10px] font-bold text-gray-600 uppercase tracking-widest mt-8 mb-4">Preferences</p>
            <SettingsItem 
              icon={Palette} 
              title="Appearance" 
              description="Dark mode, colors and themes" 
              active={activeSection === 'appearance'} 
              onClick={() => setActiveSection('appearance')}
            />
            <SettingsItem 
              icon={Globe} 
              title="Language & Region" 
              description="Currency and date formats" 
              active={activeSection === 'language'} 
              onClick={() => setActiveSection('language')}
            />
         </div>

         <div className="lg:col-span-2 space-y-8">
            <div className="glass rounded-[3rem] p-10 border-glass-border shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
               
               {activeSection === 'profile' && (
                 <div className="relative z-10 space-y-10">
                    <div className="flex items-center gap-6">
                       <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-tr from-teal-500/20 to-cyan-500/20 border-2 border-teal-500/30 flex items-center justify-center text-4xl font-black text-teal-400 shadow-2xl">
                          {user?.initials}
                       </div>
                       <div>
                          <h3 className="text-2xl font-black mb-1">{user?.name}</h3>
                          <p className="text-gray-500 text-sm">FinTrack Premium Member since 2024</p>
                          <button className="text-teal-400 text-xs font-bold mt-3 hover:underline">Change Avatar</button>
                       </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-2">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-2">Display Name</label>
                          <input type="text" defaultValue={user?.name} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 focus:border-teal-500 transition-all outline-none" />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-2">Email Identity</label>
                          <input type="email" defaultValue="user@example.com" disabled className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-gray-600 cursor-not-allowed" />
                       </div>
                    </div>

                    <div className="pt-6 border-t border-white/5 flex gap-4">
                       <button className="bg-teal-500 hover:bg-teal-400 text-white px-8 py-3.5 rounded-2xl font-bold shadow-xl shadow-teal-500/20 transition-all">Save Changes</button>
                       <button className="bg-white/5 border border-white/10 text-white px-8 py-3.5 rounded-2xl font-bold hover:bg-white/10 transition-all">Reset</button>
                    </div>
                 </div>
               )}

               {activeSection !== 'profile' && (
                 <div className="h-[300px] flex flex-col items-center justify-center text-center opacity-50">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                       <Smartphone size={32} />
                    </div>
                    <p className="font-bold">Module Loading...</p>
                    <p className="text-xs text-gray-500 mt-2">This configuration panel is coming soon to React.</p>
                 </div>
               )}
            </div>

            <div className="glass p-8 rounded-[2.5rem] flex items-center justify-between border-glass-border bg-gradient-to-r from-teal-500/5 to-transparent">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-dark text-white flex items-center justify-center border border-white/5 shadow-xl">
                     <Activity size={24} />
                  </div>
                  <div>
                     <h4 className="font-bold">Stable Architecture v4.2</h4>
                     <p className="text-[10px] text-gray-500 uppercase tracking-[0.15em] font-black">Core Engine Up-to-date</p>
                  </div>
               </div>
               <div className="flex items-center gap-2 group cursor-pointer">
                  <span className="text-xs font-bold text-gray-400 group-hover:text-white transition-all">View Changelog</span>
                  <ArrowRight size={14} className="text-gray-600 group-hover:text-teal-400 group-hover:translate-x-1 transition-all" />
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default Settings;
