import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, FileText, CheckCircle, AlertTriangle, ChevronRight, File, ShieldAlert, CheckSquare } from 'lucide-react';

const AuditNew = () => {
  const [stage, setStage] = useState('upload'); // 'upload' | 'analysis'
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'risks' | 'trail'

  const handleSimulateUpload = (e) => {
    e.preventDefault();
    setStage('analysis');
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

            {/* Drop Zone */}
            <div 
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-primary-blue dark:hover:border-primary-blue bg-white dark:bg-slate-900 rounded-2xl p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-colors shadow-sm"
              onClick={handleSimulateUpload}
            >
              <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 text-primary-blue dark:text-blue-400 rounded-full flex items-center justify-center mb-4">
                <UploadCloud size={32} />
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">Click to upload or drag & drop</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Supported formats: PDF, DOCX, TXT (Max size 25MB)</p>
              <button 
                className="bg-primary-blue text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                onClick={handleSimulateUpload}
              >
                Select File
              </button>
            </div>

            {/* Sample Documents */}
            <div className="mt-12">
              <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-4">Or try a sample document</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div 
                  onClick={handleSimulateUpload}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex items-center gap-4 cursor-pointer hover:border-primary-blue dark:hover:border-primary-blue hover:shadow-sm transition-all group"
                >
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 group-hover:text-primary-blue dark:group-hover:text-blue-400 transition-colors">
                    <FileText size={24} />
                  </div>
                  <div className="flex-1">
                    <h5 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">Standard Non-Disclosure Agreement</h5>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">3 pages • PDF</p>
                  </div>
                  <ChevronRight size={18} className="text-slate-300 dark:text-slate-600 group-hover:text-primary-blue dark:group-hover:text-blue-400" />
                </div>
                <div 
                  onClick={handleSimulateUpload}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex items-center gap-4 cursor-pointer hover:border-primary-blue dark:hover:border-primary-blue hover:shadow-sm transition-all group"
                >
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 group-hover:text-primary-blue dark:group-hover:text-blue-400 transition-colors">
                    <File size={24} />
                  </div>
                  <div className="flex-1">
                    <h5 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">SaaS Master Service Agreement</h5>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">14 pages • DOCX</p>
                  </div>
                  <ChevronRight size={18} className="text-slate-300 dark:text-slate-600 group-hover:text-primary-blue dark:group-hover:text-blue-400" />
                </div>
              </div>
            </div>
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
            {/* Left Side: Document Preview (60%) */}
            <div className="w-[60%] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex flex-col overflow-hidden min-h-0 transition-colors duration-200">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
                <div className="flex items-center gap-2">
                  <FileText size={18} className="text-primary-blue dark:text-blue-400" />
                  <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">Acme_Corp_NDA_v2.1.pdf</span>
                </div>
                <div className="flex items-center gap-3">
                  <button className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors" onClick={() => setStage('upload')}>Back</button>
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded border border-emerald-100 dark:border-emerald-500/20">Scanned ✔</span>
                </div>
              </div>
              <div className="flex-1 bg-slate-200 dark:bg-slate-950 flex items-center justify-center p-8 overflow-y-auto w-full transition-colors duration-200">
                <div className="w-full max-w-2xl bg-white dark:bg-slate-800 min-h-[800px] shadow-sm flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 border border-slate-300 dark:border-slate-700 transition-colors duration-200">
                  <FileText size={48} className="mb-4 opacity-50" />
                  <p className="font-medium">Document Preview</p>
                  <p className="text-sm mt-2">Simulated PDF viewer placeholder</p>
                </div>
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
                  Risks <span className="ml-1.5 inline-flex items-center justify-center bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 rounded-full px-1.5 py-0.5 text-[10px] font-bold">2</span>
                </button>
                <button 
                  onClick={() => setActiveTab('trail')}
                  className={`flex-1 py-3.5 text-sm font-semibold border-b-[3px] transition-colors ${activeTab === 'trail' ? 'border-primary-blue text-primary-blue dark:text-blue-400 dark:border-blue-500' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                >
                  Audit Trail
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {activeTab === 'summary' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                    <div>
                      <h4 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Document Purpose</h4>
                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                        To protect proprietary information shared during exploratory partnership discussions regarding a new software integration.
                      </p>
                    </div>
                    <div>
                      <h4 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Key Parties</h4>
                      <ul className="space-y-3">
                        <li className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm">
                          <CheckCircle size={18} className="text-primary-blue dark:text-blue-400" />
                          <span className="font-semibold text-slate-900 dark:text-white w-24">Discloser:</span> Acme Corp
                        </li>
                        <li className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm">
                          <CheckCircle size={18} className="text-primary-blue dark:text-blue-400" />
                          <span className="font-semibold text-slate-900 dark:text-white w-24">Recipient:</span> Global Tech LLC
                        </li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Core Terms</h4>
                      <ul className="list-disc pl-5 space-y-2 text-sm text-slate-700 dark:text-slate-300">
                        <li>Definition of Confidential Information is broad.</li>
                        <li>Exclusions from Confidentiality are standard.</li>
                        <li>Governing Law: <span className="font-medium text-slate-900 dark:text-white">Delaware</span>.</li>
                      </ul>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'risks' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                    <div className="border border-red-200 dark:border-red-900/50 bg-red-50/30 dark:bg-red-500/5 rounded-xl p-5 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
                      <div className="flex gap-2 items-start mb-3">
                        <ShieldAlert size={18} className="text-red-500 mt-0.5 shrink-0" />
                        <h4 className="font-bold text-slate-800 dark:text-red-100 text-sm">Perpetual Term Length</h4>
                      </div>
                      <p className="text-sm text-slate-700 dark:text-slate-300 pl-6 mb-4 font-medium bg-white dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 rounded-md shadow-sm italic mx-1">
                        "The obligations of confidentiality herein shall survive termination of this Agreement and continue in perpetuity."
                      </p>
                      <div className="pl-6 flex items-start gap-2.5">
                        <AlertTriangle size={16} className="text-orange-500 mt-0.5 shrink-0" />
                        <p className="text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed">
                          <strong className="text-slate-800 dark:text-slate-200 font-bold block mb-0.5">Why it's a risk:</strong> Standard mutual NDAs cap confidentiality terms at 3–5 years. Perpetual terms can create permanent compliance burdens and are hard to enforce legally for non-trade secret information.
                        </p>
                      </div>
                    </div>

                    <div className="border border-orange-200 dark:border-orange-900/50 bg-orange-50/20 dark:bg-orange-500/5 rounded-xl p-5 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-orange-400"></div>
                      <div className="flex gap-2 items-start mb-3">
                        <ShieldAlert size={18} className="text-orange-500 mt-0.5 shrink-0" />
                        <h4 className="font-bold text-slate-800 dark:text-orange-100 text-sm">Broad Indemnification</h4>
                      </div>
                      <p className="text-sm text-slate-700 dark:text-slate-300 pl-6 mb-4 font-medium bg-white dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 rounded-md shadow-sm italic mx-1">
                        "Recipient agrees to indemnify, defend and hold harmless Discloser against all liabilities, damages, and costs arising out of any breach..."
                      </p>
                      <div className="pl-6 flex items-start gap-2.5">
                        <AlertTriangle size={16} className="text-orange-500 mt-0.5 shrink-0" />
                        <p className="text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed">
                          <strong className="text-slate-800 dark:text-slate-200 font-bold block mb-0.5">Why it's a risk:</strong> Indemnification in standard NDAs is uncommon and disproportionately favors the Discloser. Suggest striking this clause or making it reciprocal.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'trail' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative pl-7 space-y-6 pt-2">
                    <div className="absolute top-4 bottom-4 left-4 w-px bg-slate-200 dark:bg-slate-700"></div>
                    
                    {[
                      { time: '10:42 AM', action: 'Document Uploaded', state: 'done' },
                      { time: '10:42 AM', action: 'OCR & Text Extraction Complete', state: 'done' },
                      { time: '10:43 AM', action: 'Entities Extracted (Parties, Dates)', state: 'done' },
                      { time: '10:43 AM', action: 'Clauses Validated vs Master Playbook', state: 'done' },
                      { time: '10:44 AM', action: 'Risk Detection & Scoring Completed', state: 'done' },
                    ].map((step, idx) => (
                      <div key={idx} className="relative">
                        <div className="absolute -left-[1.85rem] top-0 bg-white dark:bg-slate-900 p-0.5">
                          <CheckSquare size={16} className="text-emerald-500 bg-white dark:bg-slate-900" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 mb-0.5">{step.time}</p>
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{step.action}</p>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AuditNew;
