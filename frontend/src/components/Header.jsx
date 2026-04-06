import React from 'react';
import { Search, Bell, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Header = () => {
  const { user } = useAuth();
  const name = user?.name || 'Patrick';
  const role = user?.role || 'Researcher';
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=eff6ff&color=2563eb`;

  return (
    <header className="h-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 sticky top-0 z-10 w-full transition-colors duration-200">
      <div className="flex-1 max-w-xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search documents, entities, or labels..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-blue/20 focus:border-primary-blue transition-all"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-6 ml-4">
        <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
          <button className="hover:text-slate-800 dark:hover:text-slate-200 transition-colors relative">
            <Mail size={20} />
            <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-slate-900"></span>
          </button>
          <button className="hover:text-slate-800 dark:hover:text-slate-200 transition-colors relative">
            <Bell size={20} />
            <span className="absolute top-0 right-0 w-2 h-2 bg-primary-blue rounded-full border border-white dark:border-slate-900"></span>
          </button>
        </div>
        
        <div className="h-8 w-px bg-slate-200 dark:bg-slate-700"></div>
        
        <div className="flex items-center gap-3 cursor-pointer group">
          <img
            src={avatarUrl}
            alt="User profile"
            className="w-9 h-9 rounded-full object-cover border-2 border-slate-100 dark:border-slate-800 group-hover:border-primary-blue/30 transition-colors"
          />
          <div className="hidden md:block">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{role}</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
