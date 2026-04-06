import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react';

const RecentAudits = () => {
  const [audits, setAudits] = useState([]);

  useEffect(() => {
    const fetchAudits = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:8000/api/audits/recent', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const result = await response.json();
          
          const formatted = result.map(a => {
             let level = 'Low';
             const hasHigh = a.risks?.some(r => r.severity === 'High');
             const hasMed = a.risks?.some(r => r.severity === 'Medium' || r.severity === 'Moderate');
             if (hasHigh) level = 'Critical';
             else if (hasMed) level = 'Moderate';
             
             const date = new Date(a.created_at);
             const diffMins = Math.round((new Date() - date) / 60000);
             let timestamp = 'Just now';
             if (diffMins > 1440) timestamp = `${Math.round(diffMins/1440)} days ago`;
             else if (diffMins > 60) timestamp = `${Math.round(diffMins/60)} hours ago`;
             else if (diffMins > 0) timestamp = `${diffMins} mins ago`;

             return {
                id: a._id,
                title: a.file_name,
                timestamp: timestamp,
                level: level,
                description: a.summary || 'No summary provided',
                tags: a.risks?.map(r => `#${r.title?.split(' ')[0] || 'Risk'}`).slice(0, 3) || []
             };
          });
          setAudits(formatted);
        }
      } catch (error) {
        console.error('Failed to fetch recent audits:', error);
      }
    };
    fetchAudits();
  }, []);

   const getRiskBadge = (level) => {
    switch (level) {
      case 'Critical':
        return <span className="flex items-center gap-1.5 px-2.5 py-1 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-semibold rounded-md border border-red-100 dark:border-red-500/20"><AlertCircle size={14}/> Critical Risk</span>;
      case 'Moderate':
        return <span className="flex items-center gap-1.5 px-2.5 py-1 bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 text-xs font-semibold rounded-md border border-yellow-100 dark:border-yellow-500/20"><AlertTriangle size={14}/> Moderate</span>;
      case 'Low':
      default:
        return <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold rounded-md border border-emerald-100 dark:border-emerald-500/20"><CheckCircle size={14}/> Low Risk</span>;
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200/60 dark:border-slate-800 overflow-hidden flex flex-col h-full transition-colors duration-200">
      <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">Recent Audits</h2>
        <a href="#" className="text-sm font-semibold text-primary-blue dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">View All</a>
      </div>
      
      <div className="p-6 flex-1 flex flex-col gap-4">
        {audits.map((audit) => (
          <div key={audit.id} className="p-5 border border-slate-100 dark:border-slate-800 rounded-lg hover:border-blue-100 dark:hover:border-blue-900/50 hover:shadow-sm transition-all bg-slate-50/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 group cursor-pointer">
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-semibold text-slate-800 dark:text-white text-base group-hover:text-primary-blue dark:group-hover:text-blue-400 transition-colors">
                {audit.title}
              </h3>
              <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 text-xs font-medium">
                <Clock size={14} />
                {audit.timestamp}
              </div>
            </div>
            
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
              {audit.description}
            </p>
            
            <div className="flex items-center justify-between border-t border-slate-100/60 dark:border-slate-700/60 pt-4 mt-auto">
              <div className="flex gap-2">
                {audit.tags.map(tag => (
                  <span key={tag} className="text-xs font-medium bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-300 px-2 py-1 rounded-md">
                    {tag}
                  </span>
                ))}
              </div>
              {getRiskBadge(audit.level)}
            </div>
          </div>
        ))}
        {audits.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            <p>No recent audits found.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentAudits;
