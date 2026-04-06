import React, { useState } from 'react';
import { User, Lock, Bell, Moon, Database, Shield, Smartphone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const Settings = () => {
  const { user } = useAuth();
  const { theme, switchTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('profile');
  
  const renderContent = () => {
    switch(activeTab) {
      case 'security':
        return (
          <>
            <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
              <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                <Lock size={20} />
              </div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Security Parameters</h2>
            </div>
            <div className="p-8 space-y-8">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Change Password</h3>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Current Password</label>
                  <input type="password" placeholder="••••••••" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue/20 dark:text-white transition-all" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-800 pt-4 mt-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">New Password</label>
                    <input type="password" placeholder="••••••••" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 dark:text-white transition-all" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Confirm Password</label>
                    <input type="password" placeholder="••••••••" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 dark:text-white transition-all" />
                  </div>
                </div>
                <button className="bg-primary-blue text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition duration-200 shadow-sm mt-2">Update Password</button>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-8 space-y-4">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2"><Shield size={18} className="text-emerald-500" /> Two-Factor Authentication (2FA)</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Adds an extra layer of security to your account natively.</p>
                <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800">
                  <div className="flex items-center gap-3">
                    <Smartphone size={20} className="text-slate-400" />
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">Authenticator App</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Not configured</p>
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">Setup</button>
                </div>
              </div>
            </div>
          </>
        );

      case 'notifications':
        return (
          <>
            <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                <Bell size={20} />
              </div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Notification Hub</h2>
            </div>
            <div className="p-8 space-y-8">
              <div className="space-y-4">
                 {[ 
                   { title: "Weekly Audit Digest", desc: "Get a summary of all flagged risks every Monday." },
                   { title: "Critical Alert Pings", desc: "Instant email when a 'High' severity risk is found." },
                   { title: "Team Tagging", desc: "Notify me when someone tags me in a documented note." }
                 ].map((item, idx) => (
                   <div key={idx} className="flex justify-between items-center py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
                     <div>
                       <p className="font-semibold text-slate-800 dark:text-slate-200">{item.title}</p>
                       <p className="text-sm text-slate-500 dark:text-slate-400">{item.desc}</p>
                     </div>
                     <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" value="" className="sr-only peer" defaultChecked={idx !== 0} />
                      <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 dark:after:border-slate-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-blue"></div>
                    </label>
                   </div>
                 ))}
              </div>
              <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                <button className="px-5 py-2.5 bg-primary-blue text-white font-medium hover:bg-blue-700 rounded-lg transition-colors shadow-sm">Save Preferences</button>
              </div>
            </div>
          </>
        );
        
      case 'appearance':
        return (
          <>
            <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
              <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                <Moon size={20} />
              </div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Appearance</h2>
            </div>
            <div className="p-8 space-y-8">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Theme Preference</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div 
                    onClick={() => switchTheme('light')} 
                    className={`border-2 ${theme === 'light' ? 'border-primary-blue' : 'border-slate-200 dark:border-slate-700'} bg-white dark:bg-slate-800 p-4 rounded-xl cursor-pointer hover:border-primary-blue/50`}
                  >
                    <div className="h-20 bg-slate-100 rounded mb-3 flex flex-col gap-2 p-2 border border-slate-200">
                       <div className="w-1/2 h-3 bg-slate-200 rounded"></div>
                       <div className="w-full h-8 bg-white rounded"></div>
                    </div>
                    <p className="text-center font-semibold text-slate-800 dark:text-white text-sm">Light Mode</p>
                  </div>
                   <div 
                    onClick={() => switchTheme('dark')}
                    className={`border-2 ${theme === 'dark' ? 'border-primary-blue' : 'border-slate-200 dark:border-slate-700'} bg-slate-900 p-4 rounded-xl cursor-pointer hover:border-primary-blue/50`}
                   >
                    <div className="h-20 bg-slate-800 rounded mb-3 flex flex-col gap-2 p-2 border border-slate-700">
                       <div className="w-1/2 h-3 bg-slate-700 rounded"></div>
                       <div className="w-full h-8 bg-slate-950 border border-slate-700 rounded"></div>
                    </div>
                    <p className="text-center font-semibold text-white text-sm">Dark Mode</p>
                  </div>
                  <div 
                    onClick={() => switchTheme('system')}
                    className={`border-2 ${theme === 'system' ? 'border-primary-blue' : 'border-slate-200 dark:border-slate-700'} bg-white dark:bg-slate-800 p-4 rounded-xl cursor-pointer hover:border-primary-blue/50`}
                  >
                    <div className="h-20 bg-gradient-to-br from-slate-100 to-slate-800 rounded mb-3 border border-slate-300 dark:border-slate-600"></div>
                    <p className="text-center font-semibold text-slate-800 dark:text-white text-sm">System Default</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        );

      case 'profile':
      default:
        return (
          <>
            <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <User size={20} />
              </div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Profile Information</h2>
            </div>
            
            <div className="p-8 space-y-8">
              <div className="flex items-center gap-6">
                <img
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'Patrick')}&background=eff6ff&color=2563eb&size=100`}
                  alt="Profile"
                  className="w-24 h-24 rounded-full border-4 border-white shadow-md"
                />
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-white">{user?.name || 'Patrick'}</h3>
                  <p className="text-slate-500 dark:text-slate-400 mb-3">{user?.role || 'Senior Counsel'}</p>
                  <div className="flex gap-2">
                    <button className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg transition-colors border border-slate-200 dark:border-slate-700">
                      Change Photo
                    </button>
                    <button className="px-4 py-2 hover:bg-red-50 dark:hover:bg-red-500/10 text-red-600 text-sm font-medium rounded-lg transition-colors">
                      Remove
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Full Name</label>
                    <input
                      type="text"
                      defaultValue={user?.name || 'Patrick'}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue/20 dark:text-white transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email Address</label>
                    <input
                      type="email"
                      defaultValue={user?.email || 'patrick@example.com'}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue/20 dark:text-white transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Role / Title</label>
                  <input
                    type="text"
                    defaultValue={user?.role || 'Senior Counsel'}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue/20 dark:text-white transition-all"
                  />
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                <button className="px-5 py-2.5 text-slate-600 dark:text-slate-400 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors">
                  Cancel
                </button>
                <button className="px-5 py-2.5 bg-primary-blue text-white font-medium hover:bg-blue-700 rounded-lg transition-colors shadow-sm shadow-blue-200">
                  Save Changes
                </button>
              </div>
            </div>
          </>
        );
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Settings</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your account preferences and application settings</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Settings Sidebar */}
        <div className="w-full md:w-64 space-y-1 shrink-0">
          <button 
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors text-left ${activeTab === 'profile' ? 'bg-blue-50 dark:bg-blue-900/30 text-primary-blue dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'}`}
          >
            <User size={18} />
            Profile Settings
          </button>
          <button 
            onClick={() => setActiveTab('security')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors text-left ${activeTab === 'security' ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'}`}
          >
            <Lock size={18} />
            Security
          </button>
          <button 
            onClick={() => setActiveTab('notifications')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors text-left ${activeTab === 'notifications' ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'}`}
          >
            <Bell size={18} />
            Notifications
          </button>
          <button 
            onClick={() => setActiveTab('appearance')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors text-left ${activeTab === 'appearance' ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'}`}
          >
            <Moon size={18} />
            Appearance
          </button>
        </div>

        {/* Settings Content Rendered Dynamically */}
        <div className="flex-1 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden h-fit transition-colors duration-200">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default Settings;
