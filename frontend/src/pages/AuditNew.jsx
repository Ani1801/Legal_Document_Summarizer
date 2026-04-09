import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, FileText, AlertTriangle, ShieldAlert, Loader2, Lightbulb, Download, MessageSquare, FileDown } from 'lucide-react';
import ChatPanel from '../components/ChatPanel';

/** Returns Tailwind colour classes based on a 0-100 risk score. */
const getSeverityColor = (score) => {
  if (score > 80) return { text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10', border: 'border-emerald-200 dark:border-emerald-500/20', bar: '#10b981' };
  if (score >= 50) return { text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10', border: 'border-amber-200 dark:border-amber-500/20', bar: '#f59e0b' };
  return { text: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-500/10', border: 'border-red-200 dark:border-red-500/20', bar: '#ef4444' };
};

const AuditNew = () => {
  const [stage, setStage] = useState('upload'); // 'upload' | 'loading' | 'analysis'
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'risks' | 'suggestions'
  const [auditResult, setAuditResult] = useState(null);
  const [error, setError] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = async (file) => {
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Only PDF files are currently supported.');
      return;
    }

    setError(null);
    setStage('loading');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/api/audits/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Upload failed');
      }

      const data = await response.json();
      setAuditResult(data);
      setStage('analysis');
    } catch (err) {
      setError(err.message);
      setStage('upload');
    }
  };

  const slideVariants = {
    enter: { opacity: 0, x: 20 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto w-full h-full flex flex-col">
      <AnimatePresence mode="wait">
        {stage === 'upload' ? (
          <motion.div
            key="upload"
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col max-w-4xl mx-auto w-full pt-8"
          >
            <div className="mb-6">
              <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Audit New Document</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Upload a contract, agreement, or form to scan for legal risks.</p>
            </div>

            {error && (
              <div className="mb-4 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 flex items-center gap-3">
                <AlertTriangle size={20} />
                <span className="font-medium text-sm">{error}</span>
              </div>
            )}

            {/* Drop Zone */}
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".pdf" 
              onChange={handleFileChange} 
            />
            <div 
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-primary-blue dark:hover:border-primary-blue bg-white dark:bg-slate-900 rounded-2xl p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-colors shadow-sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 text-primary-blue dark:text-blue-400 rounded-full flex items-center justify-center mb-4">
                <UploadCloud size={32} />
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">Click to upload or drag & drop</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Supported formats: PDF</p>
              <button 
                className="bg-primary-blue text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                Select File
              </button>
            </div>
          </motion.div>
        ) : stage === 'loading' ? (
          <motion.div
            key="loading"
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto w-full pt-8"
          >
             <Loader2 size={48} className="text-primary-blue dark:text-blue-400 animate-spin mb-4" />
             <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Analyzing Document...</h2>
             <p className="text-slate-500 dark:text-slate-400 text-center max-w-md">Our AI is extracting text, analyzing clauses, and identifying potential legal risks. This may take a moment.</p>
          </motion.div>
        ) : (
          <motion.div
            key="analysis"
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.4 }}
            className="flex-1 flex gap-6 h-full pb-4"
          >
            {/* Left Side: PDF Preview (60%) */}
            <div className="w-[60%] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex flex-col overflow-hidden min-h-0 transition-colors duration-200">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
                <div className="flex items-center gap-2">
                  <FileText size={18} className="text-primary-blue dark:text-blue-400" />
                  <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">{auditResult?.file_name}</span>
                </div>
                <div className="flex items-center gap-3">
                  {/* Download PDF button */}
                  <a
                    href={`http://localhost:8000/api/audits/file/${auditResult?.id}?token=${localStorage.getItem('token')}`}
                    download={auditResult?.file_name}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-xs font-semibold text-primary-blue dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-500/10 px-2.5 py-1 rounded border border-blue-100 dark:border-blue-500/20 transition-colors"
                  >
                    <Download size={13} />
                    Download PDF
                  </a>
                  <button className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors" onClick={() => setStage('upload')}>Audit Another</button>
                  <button
                    onClick={() => setIsChatOpen(true)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/10 px-2.5 py-1 rounded border border-indigo-100 dark:border-indigo-500/20 transition-colors"
                  >
                    <MessageSquare size={13} />
                    Chat with Doc
                  </button>
                  <a
                    href={`http://localhost:8000/api/export/${auditResult?.id}?format=pdf`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => {
                      e.preventDefault();
                      const token = localStorage.getItem('token');
                      fetch(`http://localhost:8000/api/export/${auditResult?.id}?format=pdf`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                      }).then(r => r.blob()).then(blob => {
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${auditResult?.file_name?.replace('.pdf', '')}_audit_report.pdf`;
                        a.click();
                        URL.revokeObjectURL(url);
                      });
                    }}
                    className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-100 dark:border-emerald-500/20 transition-colors cursor-pointer"
                  >
                    <FileDown size={13} />
                    Export PDF
                  </a>
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      const token = localStorage.getItem('token');
                      fetch(`http://localhost:8000/api/export/${auditResult?.id}?format=docx`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                      }).then(r => r.blob()).then(blob => {
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${auditResult?.file_name?.replace('.pdf', '')}_audit_report.docx`;
                        a.click();
                        URL.revokeObjectURL(url);
                      });
                    }}
                    className="flex items-center gap-1.5 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 bg-violet-50 dark:bg-violet-500/10 px-2.5 py-1 rounded border border-violet-100 dark:border-violet-500/20 transition-colors cursor-pointer"
                  >
                    <FileDown size={13} />
                    Export DOCX
                  </a>
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded border border-emerald-100 dark:border-emerald-500/20">Scanned ✔</span>
                </div>
              </div>
              {/* PDF iframe previewer */}
              <div className="flex-1 overflow-hidden">
                <iframe
                  src={`http://localhost:8000/api/audits/file/${auditResult?.id}?token=${localStorage.getItem('token')}`}
                  width="100%"
                  height="600px"
                  title="PDF Preview"
                  className="w-full h-full border-0"
                  style={{ minHeight: '600px' }}
                >
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500 gap-3">
                    <FileText size={40} className="opacity-50" />
                    <p className="text-sm font-medium">Your browser cannot display the PDF inline.</p>
                    <a
                      href={`http://localhost:8000/api/audits/file/${auditResult?.id}?token=${localStorage.getItem('token')}`}
                      className="text-primary-blue underline text-sm"
                      target="_blank" rel="noreferrer"
                    >Open in new tab</a>
                  </div>
                </iframe>
              </div>
            </div>

            {/* Right Side: Tabbed Analysis Panel (40%) */}
            <div className="w-[40%] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex flex-col overflow-hidden min-h-0 transition-colors duration-200">
              <div className="flex items-center border-b border-slate-200 dark:border-slate-800 shrink-0">
                <button 
                  onClick={() => setActiveTab('summary')}
                  className={`flex-1 py-3.5 text-sm font-semibold border-b-[3px] transition-colors ${activeTab === 'summary' ? 'border-primary-blue text-primary-blue dark:text-blue-400 dark:border-blue-500' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                >
                  Summary
                </button>
                <button 
                  onClick={() => setActiveTab('risks')}
                  className={`flex-1 py-3.5 text-sm font-semibold border-b-[3px] transition-colors ${activeTab === 'risks' ? 'border-primary-blue text-primary-blue dark:text-blue-400 dark:border-blue-500' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                >
                  Risks {auditResult?.risks?.length > 0 && <span className="ml-1.5 inline-flex items-center justify-center bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 rounded-full px-1.5 py-0.5 text-[10px] font-bold">{auditResult.risks.length}</span>}
                </button>
                <button 
                  onClick={() => setActiveTab('suggestions')}
                  className={`flex-1 py-3.5 text-sm font-semibold border-b-[3px] transition-colors ${activeTab === 'suggestions' ? 'border-primary-blue text-primary-blue dark:text-blue-400 dark:border-blue-500' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                >
                  Suggestions
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {activeTab === 'summary' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                    <div>
                      <h4 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Overall Assessment</h4>
                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                        {auditResult?.summary || "No summary available."}
                      </p>
                    </div>
                    {auditResult?.risk_score !== undefined && (
                      <div>
                        <h4 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Risk Score</h4>
                        {(() => {
                           const score = auditResult.risk_score;
                           const colors = getSeverityColor(score);
                           const radius = 24;
                           const circumference = 2 * Math.PI * radius;
                           const strokeDashoffset = circumference - (score / 100) * circumference;
                           return (
                             <div className="flex items-center gap-4">
                               <div className="relative w-16 h-16 flex items-center justify-center">
                                 <svg className="w-full h-full transform -rotate-90">
                                   <circle cx="32" cy="32" r={radius} stroke="currentColor" strokeWidth="5" fill="transparent" className="text-slate-100 dark:text-slate-800" />
                                   <circle cx="32" cy="32" r={radius} stroke={colors.bar} strokeWidth="5" fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
                                 </svg>
                                 <span className={`absolute text-lg font-bold ${colors.text}`}>{score}</span>
                               </div>
                               <div className={`px-3 py-1 rounded-md border ${colors.bg} ${colors.border} ${colors.text} font-semibold text-sm`}>
                                 {score > 80 ? 'Safe' : score >= 50 ? 'Moderate Risk' : 'Critical Risk'}
                               </div>
                             </div>
                           );
                        })()}
                      </div>
                    )}
                  </motion.div>
                )}

                {activeTab === 'risks' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                    {auditResult?.risks?.length > 0 ? (
                      auditResult.risks.map((risk, idx) => (
                        <div key={idx} className="border border-red-200 dark:border-red-900/50 bg-red-50/30 dark:bg-red-500/5 rounded-xl p-5 relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
                          <div className="flex gap-2 items-start mb-3">
                            <ShieldAlert size={18} className="text-red-500 mt-0.5 shrink-0" />
                            <h4 className="font-bold text-slate-800 dark:text-red-100 text-sm">{risk.title}</h4>
                          </div>
                          <div className="pl-6 flex items-start gap-2.5">
                            <AlertTriangle size={16} className="text-orange-500 mt-0.5 shrink-0" />
                            <p className="text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed">
                              {risk.description}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500 dark:text-slate-400">No critical risks identified.</p>
                    )}
                  </motion.div>
                )}

                {activeTab === 'suggestions' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                    {auditResult?.suggestions?.length > 0 ? (
                      auditResult.suggestions.map((suggestion, idx) => (
                        <div key={idx} className="border border-blue-200 dark:border-blue-900/50 bg-blue-50/30 dark:bg-blue-500/5 rounded-xl p-5 relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-1 h-full bg-primary-blue"></div>
                          <div className="flex gap-2 items-start mb-3">
                            <Lightbulb size={18} className="text-primary-blue mt-0.5 shrink-0" />
                            <p className="text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                              {suggestion}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500 dark:text-slate-400">No specific suggestions provided.</p>
                    )}
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Drawer */}
      <ChatPanel
        auditId={auditResult?.id}
        fileName={auditResult?.file_name}
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />
    </div>
  );
};

export default AuditNew;
