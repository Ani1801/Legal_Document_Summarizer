import React from 'react';
import { BookOpen, FolderOpen, FileText, Search, Filter } from 'lucide-react';

const Library = () => {
  const documents = [
    { id: 1, name: 'Q3 Financial Report.pdf', type: 'PDF', size: '2.4 MB', date: '2026-04-01' },
    { id: 2, name: 'Employee Handbook.docx', type: 'DOCX', size: '1.1 MB', date: '2026-03-28' },
    { id: 3, name: 'Project Alpha Requirements.pdf', type: 'PDF', size: '4.7 MB', date: '2026-03-15' },
    { id: 4, name: 'Vendor Contract Q2.pdf', type: 'PDF', size: '3.2 MB', date: '2026-03-10' },
  ];

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Library</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage and organize all your uploaded documents</p>
        </div>
        <button className="bg-primary-blue text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition duration-200 flex items-center gap-2">
          <FolderOpen size={18} />
          New Folder
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 transition-colors duration-200">
        <div className="flex justify-between items-center mb-6">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search library..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-blue/20 transition-all"
            />
          </div>
          <button className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-lg transition-colors">
            <Filter size={18} />
            Filter
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-sm">
                <th className="pb-3 px-4 font-medium">Document Name</th>
                <th className="pb-3 px-4 font-medium">Type</th>
                <th className="pb-3 px-4 font-medium">Size</th>
                <th className="pb-3 px-4 font-medium">Date Modified</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group cursor-pointer">
                  <td className="py-4 px-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      <FileText size={16} />
                    </div>
                    <span className="font-medium text-slate-800 dark:text-white">{doc.name}</span>
                  </td>
                  <td className="py-4 px-4 text-sm text-slate-600 dark:text-slate-400 font-medium">
                    <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-1 rounded text-xs font-semibold">{doc.type}</span>
                  </td>
                  <td className="py-4 px-4 text-sm text-slate-500 dark:text-slate-400">{doc.size}</td>
                  <td className="py-4 px-4 text-sm text-slate-500 dark:text-slate-400">{doc.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {documents.length === 0 && (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">
            <BookOpen size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
            <p className="text-lg font-medium text-slate-700 dark:text-slate-300">No documents found</p>
            <p className="text-sm">Upload some documents to see them in your library.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Library;
