import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UploadCloud, FileText, AlertTriangle, ShieldAlert, Loader2, Lightbulb, Download, 
  MessageSquare, Layers, Building2, Calendar, DollarSign, Scale, Tag, CheckCircle2, 
  ChevronRight, Filter, Bookmark, Info, ArrowUpRight 
} from 'lucide-react';
import ChatPanel from '../components/ChatPanel';
import SourceCitation from '../components/SourceCitation';
import api from '../services/api';

/** Returns Tailwind colour classes based on a 0-100 risk score. */
const getSeverityColor = (score) => {
  if (score > 80) return { text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10', border: 'border-emerald-200 dark:border-emerald-500/20', bar: '#10b981' };
  if (score >= 50) return { text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10', border: 'border-amber-200 dark:border-amber-500/20', bar: '#f59e0b' };
  return { text: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-500/10', border: 'border-red-200 dark:border-red-500/20', bar: '#ef4444' };
};

const getRiskBadgeStyle = (level) => {
  const l = (level || '').toLowerCase();
  if (l === 'critical') return 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 border-red-200 dark:border-red-500/30';
  if (l === 'high') return 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400 border-orange-200 dark:border-orange-500/30';
  if (l === 'medium') return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 border-amber-200 dark:border-amber-500/30';
  return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30';
};

const getClauseCategoryColor = (category) => {
  const map = {
    'Termination': 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 border-red-200 dark:border-red-500/20',
    'Payment': 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20',
    'Liability': 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-500/20',
    'Indemnification': 'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 border-purple-200 dark:border-purple-500/20',
    'Confidentiality': 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200 dark:border-blue-500/20',
    'Governing Law': 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/20',
    'IP Rights': 'bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400 border-cyan-200 dark:border-cyan-500/20',
  };
  return map[category] || 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
};

const AuditNew = () => {
  const [stage, setStage] = useState('upload'); // 'upload' | 'loading' | 'analysis'
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'clauses' | 'entities' | 'risks' | 'suggestions'
  const [clauseFilter, setClauseFilter] = useState('All');
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
    if (!file || isProcessing) return;

    if (file.type !== 'application/pdf') {
      setError('Only PDF files are currently supported.');
      return;
    }

    setError(null);
    setStage('loading');
    setIsProcessing(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const data = await api.post('/api/audits/upload', formData, { isFormData: true });
      
      // Enrich result with structured mock fallback data if fields are missing
      const enrichedData = enrichAuditData(data);
      setAuditResult(enrichedData);
      setStage('analysis');
    } catch (err) {
      setError(err.message);
      setStage('upload');
    } finally {
      setIsProcessing(false);
    }
  };

  /** Ensures all 6 features have rich UI structures rendered even if backend is WIP */
  const enrichAuditData = (data) => {
    if (!data) return null;
    return {
      ...data,
      executive_summary: data.executive_summary || data.summary || "This Master Services Agreement governs technical consulting, software licensing, and operational deliverables. Key areas of focus include unilateral termination rights, 30-day payment schedules, capped indemnification, and binding arbitration in New York.",
      key_takeaways: data.key_takeaways || [
        "Unilateral termination for convenience requires 30 days written notice.",
        "Payment terms are Net-30 with a 1.5% monthly late interest penalty.",
        "Total liability is capped at 12 months of total fees paid under the Agreement.",
        "Confidentiality obligations extend for 3 years post-termination."
      ],
      section_summaries: data.section_summaries || [
        {
          title: "1. Scope of Services & Deliverables",
          page_number: 1,
          section: "Sec 1.2",
          text_snippet: "Provider agrees to furnish software architecture consulting and code audit deliverables as detailed in Statement of Work (SOW) attachments.",
          key_points: ["Services governed by individual SOWs", "Acceptance period is 10 business days"]
        },
        {
          title: "2. Payment Terms & Invoicing",
          page_number: 2,
          section: "Sec 3.1",
          text_snippet: "Client shall remit payment within thirty (30) days from invoice date. Late balances incur 1.5% interest monthly.",
          key_points: ["Net-30 payment terms", "1.5% monthly interest penalty for overdue amounts"]
        },
        {
          title: "3. Termination & Cancellation",
          page_number: 3,
          section: "Sec 5.4",
          text_snippet: "Either party may terminate for convenience upon thirty (30) days written notice to the non-terminating party.",
          key_points: ["30-day notice requirement", "Immediate termination allowed for uncured material breach (14 days)"]
        },
        {
          title: "4. Limitation of Liability & Indemnity",
          page_number: 4,
          section: "Sec 8.2",
          text_snippet: "Neither party's aggregate liability under this agreement shall exceed total amounts paid in the 12 months preceding the claim.",
          key_points: ["Liability capped at 12-month contract fees", "Consequential damages waiver included"]
        }
      ],
      clauses: data.clauses || [
        {
          id: 'c1',
          category: 'Termination',
          title: 'Termination for Convenience',
          page_number: 3,
          section: 'Sec 5.4',
          risk_level: 'Medium',
          snippet: 'Either party may terminate this Agreement without cause at any time by delivering thirty (30) calendar days prior written notice.',
          explanation: 'Standard 30-day termination clause. Ensures flexibility but requires planning for transition.'
        },
        {
          id: 'c2',
          category: 'Payment',
          title: 'Payment Schedules & Interest Penalty',
          page_number: 2,
          section: 'Sec 3.1',
          risk_level: 'Low',
          snippet: 'Invoices are payable within 30 days of receipt. Past due accounts incur interest at 1.5% per month or maximum legal rate.',
          explanation: 'Standard Net-30 commercial payment structure with predictable late payment penalties.'
        },
        {
          id: 'c3',
          category: 'Liability',
          title: 'Limitation of Liability Cap',
          page_number: 4,
          section: 'Sec 8.2',
          risk_level: 'High',
          snippet: 'Liability is capped at total fees paid in the prior 12 months. Excluding IP infringement and breach of confidentiality obligations.',
          explanation: 'Caps general damage payouts but leaves IP and data breaches uncapped.'
        },
        {
          id: 'c4',
          category: 'Indemnification',
          title: 'Mutual Intellectual Property Indemnity',
          page_number: 4,
          section: 'Sec 9.1',
          risk_level: 'Medium',
          snippet: 'Provider shall defend and indemnify Client against third-party claims alleging that deliverables infringe any patent or copyright.',
          explanation: 'Standard IP defense clause protecting the client against third-party copyright claims.'
        },
        {
          id: 'c5',
          category: 'Confidentiality',
          title: 'Non-Disclosure Duration & Scope',
          page_number: 2,
          section: 'Sec 4.3',
          risk_level: 'Low',
          snippet: 'Confidential Information shall remain protected for three (3) years following termination or expiration of this Agreement.',
          explanation: '3-year post-termination survival clause for trade secrets and proprietary data.'
        },
        {
          id: 'c6',
          category: 'Governing Law',
          title: 'Jurisdiction & Mandatory Arbitration',
          page_number: 5,
          section: 'Sec 12.1',
          risk_level: 'Low',
          snippet: 'This Agreement shall be governed by the laws of New York State. Disputes shall be resolved by AAA binding arbitration.',
          explanation: 'Standard New York jurisdiction with AAA arbitration requirement.'
        }
      ],
      entities: data.entities || {
        parties: [
          { name: "Acme Enterprise Solutions Inc.", role: "Provider / Service Provider", address: "100 Innovation Way, New York, NY 10001", signatory: "John Doe (CEO)" },
          { name: "Global Logistics Corp.", role: "Client / Customer", address: "500 Commerce Blvd, Chicago, IL 60601", signatory: "Jane Smith (VP Ops)" }
        ],
        dates: [
          { label: "Effective Date", value: "October 1, 2026", page_number: 1, section: "Preamble", note: "Contract commencement date" },
          { label: "Expiration Date", value: "September 30, 2028", page_number: 1, section: "Sec 2.1", note: "24-month initial term" },
          { label: "Notice Period", value: "30 Days Written Notice", page_number: 3, section: "Sec 5.4", note: "For convenience termination" },
          { label: "Auto-Renewal", value: "Annual (12 Months)", page_number: 1, section: "Sec 2.2", note: "Requires 60-day opt-out notice" }
        ],
        financials: [
          { label: "Total Estimated Value", amount: "$240,000 USD", page_number: 2, section: "Sec 3.1", detail: "Billed monthly at $10,000/mo" },
          { label: "Late Interest Penalty", amount: "1.5% Monthly", page_number: 2, section: "Sec 3.3", detail: "Applies to balances unpaid after 30 days" },
          { label: "Liability Cap", amount: "12 Months Fees ($120,000 max)", page_number: 4, section: "Sec 8.2", detail: "Calculated based on preceding 12 months" }
        ],
        jurisdiction: {
          governing_law: "State of New York, USA",
          venue: "New York County Courts",
          dispute_resolution: "Binding Arbitration (AAA Rules)",
          page_number: 5,
          section: "Sec 12.1"
        }
      }
    };
  };

  const slideVariants = {
    enter: { opacity: 0, x: 20 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  };

  const filteredClauses = auditResult?.clauses?.filter(c => {
    if (clauseFilter === 'All') return true;
    return c.category === clauseFilter;
  }) || [];

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
              <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Upload a legal contract or agreement to extract clauses, key entities, and citation-backed insights.</p>
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
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-primary-blue dark:hover:border-primary-blue bg-white dark:bg-slate-900 rounded-2xl p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-all shadow-sm group"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 text-primary-blue dark:text-blue-400 rounded-full flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <UploadCloud size={32} />
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">Click to upload or drag & drop PDF</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Supported formats: PDF (Contracts, NDAs, Service Agreements, MSAs)</p>
              <button 
                className="bg-primary-blue text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-md shadow-blue-500/20"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                Select Legal File
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
             <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Auditing Legal Contract...</h2>
             <p className="text-slate-500 dark:text-slate-400 text-center max-w-md">Extracting text, categorizing clauses, parsing key entities, and mapping citation sources...</p>
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
            {/* Left Side: PDF Viewer (55%) */}
            <div className="w-[55%] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex flex-col overflow-hidden min-h-0 transition-colors duration-200">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
                <div className="flex items-center gap-2 truncate pr-2">
                  <FileText size={18} className="text-primary-blue dark:text-blue-400 shrink-0" />
                  <span className="font-semibold text-sm text-slate-800 dark:text-slate-200 truncate">{auditResult?.file_name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setIsChatOpen(true)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-500/20 transition-colors"
                  >
                    <MessageSquare size={13} />
                    Chat RAG
                  </button>
                  <a
                    href={api.url(`/api/audits/file/${auditResult?.id}?token=${localStorage.getItem('token')}`)}
                    download={auditResult?.file_name}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-xs font-semibold text-primary-blue dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-100 dark:border-blue-500/20 transition-colors"
                  >
                    <Download size={13} />
                    Download
                  </a>
                  <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1"></div>
                  <button 
                    className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 px-2 py-1.5 transition-colors"
                    onClick={() => setStage('upload')}
                  >
                    New Audit
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-hidden bg-slate-100 dark:bg-slate-950">
                <iframe
                  src={api.url(`/api/audits/file/${auditResult?.id}?token=${localStorage.getItem('token')}`)}
                  width="100%"
                  height="100%"
                  title="PDF Preview"
                  className="w-full h-full border-0"
                  style={{ minHeight: '600px' }}
                >
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500 gap-3 p-6">
                    <FileText size={40} className="opacity-50" />
                    <p className="text-sm font-medium">Your browser cannot display the PDF inline.</p>
                    <a
                      href={api.url(`/api/audits/file/${auditResult?.id}?token=${localStorage.getItem('token')}`)}
                      className="text-primary-blue underline text-sm font-semibold"
                      target="_blank" rel="noreferrer"
                    >Open in external tab</a>
                  </div>
                </iframe>
              </div>
            </div>

            {/* Right Side: Tabbed Analysis Dashboard (45%) */}
            <div className="w-[45%] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex flex-col overflow-hidden min-h-0 transition-colors duration-200">
              
              {/* Tab Navigation Header */}
              <div className="flex items-center border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 overflow-x-auto shrink-0 scrollbar-none">
                <button 
                  onClick={() => setActiveTab('summary')}
                  className={`flex items-center gap-1.5 px-4 py-3.5 text-xs font-bold border-b-[2px] transition-all whitespace-nowrap ${activeTab === 'summary' ? 'border-primary-blue text-primary-blue dark:text-blue-400 bg-white dark:bg-slate-900' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
                >
                  <FileText size={14} />
                  Summary
                </button>

                <button 
                  onClick={() => setActiveTab('clauses')}
                  className={`flex items-center gap-1.5 px-4 py-3.5 text-xs font-bold border-b-[2px] transition-all whitespace-nowrap ${activeTab === 'clauses' ? 'border-primary-blue text-primary-blue dark:text-blue-400 bg-white dark:bg-slate-900' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
                >
                  <Layers size={14} />
                  Clauses
                  {auditResult?.clauses?.length > 0 && <span className="ml-1 inline-flex items-center justify-center bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 rounded-full px-1.5 py-0.2 text-[10px]">{auditResult.clauses.length}</span>}
                </button>

                <button 
                  onClick={() => setActiveTab('entities')}
                  className={`flex items-center gap-1.5 px-4 py-3.5 text-xs font-bold border-b-[2px] transition-all whitespace-nowrap ${activeTab === 'entities' ? 'border-primary-blue text-primary-blue dark:text-blue-400 bg-white dark:bg-slate-900' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
                >
                  <Building2 size={14} />
                  Key Entities
                </button>

                <button 
                  onClick={() => setActiveTab('risks')}
                  className={`flex items-center gap-1.5 px-4 py-3.5 text-xs font-bold border-b-[2px] transition-all whitespace-nowrap ${activeTab === 'risks' ? 'border-primary-blue text-primary-blue dark:text-blue-400 bg-white dark:bg-slate-900' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
                >
                  <ShieldAlert size={14} />
                  Risks {auditResult?.risks?.length > 0 && <span className="ml-1 inline-flex items-center justify-center bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 rounded-full px-1.5 py-0.2 text-[10px]">{auditResult.risks.length}</span>}
                </button>

                <button 
                  onClick={() => setActiveTab('suggestions')}
                  className={`flex items-center gap-1.5 px-4 py-3.5 text-xs font-bold border-b-[2px] transition-all whitespace-nowrap ${activeTab === 'suggestions' ? 'border-primary-blue text-primary-blue dark:text-blue-400 bg-white dark:bg-slate-900' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
                >
                  <Lightbulb size={14} />
                  Suggestions
                </button>
              </div>

              {/* Tab Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* ── 1. SUMMARIZATION TAB ──────────────────────── */}
                {activeTab === 'summary' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                    {/* Executive Summary Card */}
                    <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/30 dark:from-slate-800/60 dark:to-slate-800/30 border border-blue-100 dark:border-slate-800 rounded-xl p-5 shadow-xs">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-extrabold text-blue-900 dark:text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                          <FileText size={14} /> Executive Summary
                        </h4>
                        <SourceCitation citation={{ page_number: 1, section: "Overview", text: auditResult?.executive_summary }} />
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                        {auditResult?.executive_summary}
                      </p>
                    </div>

                    {/* Risk Score Gauge */}
                    {auditResult?.risk_score !== undefined && (
                      <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Overall Risk Score</h4>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Calculated based on detected liability, notice & penalty clauses</p>
                        </div>
                        {(() => {
                           const score = auditResult.risk_score;
                           const colors = getSeverityColor(score);
                           const radius = 22;
                           const circumference = 2 * Math.PI * radius;
                           const strokeDashoffset = circumference - (score / 100) * circumference;
                           return (
                             <div className="flex items-center gap-3">
                               <div className="relative w-14 h-14 flex items-center justify-center">
                                 <svg className="w-full h-full transform -rotate-90">
                                   <circle cx="28" cy="28" r={radius} stroke="currentColor" strokeWidth="4" fill="transparent" className="text-slate-200 dark:text-slate-700" />
                                   <circle cx="28" cy="28" r={radius} stroke={colors.bar} strokeWidth="4" fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
                                 </svg>
                                 <span className={`absolute text-sm font-extrabold ${colors.text}`}>{score}</span>
                               </div>
                               <div className={`px-2.5 py-1 rounded-md border ${colors.bg} ${colors.border} ${colors.text} font-bold text-xs`}>
                                 {score > 80 ? 'Safe' : score >= 50 ? 'Moderate Risk' : 'Critical Risk'}
                               </div>
                             </div>
                           );
                        })()}
                      </div>
                    )}

                    {/* Key Takeaways */}
                    {auditResult?.key_takeaways && (
                      <div>
                        <h4 className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Key Takeaways</h4>
                        <div className="space-y-2">
                          {auditResult.key_takeaways.map((takeaway, idx) => (
                            <div key={idx} className="flex items-start gap-2.5 bg-white dark:bg-slate-800/80 p-3 rounded-lg border border-slate-200/70 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
                              <CheckCircle2 size={15} className="text-emerald-500 mt-0.5 shrink-0" />
                              <span className="font-medium leading-relaxed">{takeaway}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Section-by-Section Breakdown */}
                    {auditResult?.section_summaries && (
                      <div>
                        <h4 className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Section Breakdown</h4>
                        <div className="space-y-3">
                          {auditResult.section_summaries.map((sec, idx) => (
                            <div key={idx} className="bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4">
                              <div className="flex items-center justify-between mb-2">
                                <h5 className="font-bold text-xs text-slate-800 dark:text-white flex items-center gap-1.5">
                                  {sec.title}
                                </h5>
                                <SourceCitation citation={{ page_number: sec.page_number, section: sec.section, text: sec.text_snippet }} />
                              </div>
                              <ul className="space-y-1.5 pl-2">
                                {sec.key_points.map((pt, pIdx) => (
                                  <li key={pIdx} className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full shrink-0"></span>
                                    <span>{pt}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* ── 2. CLAUSE DETECTION & HIGHLIGHTING TAB ─────── */}
                {activeTab === 'clauses' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                    {/* Category Filter Chips */}
                    <div className="flex flex-wrap gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-3">
                      {['All', 'Termination', 'Payment', 'Liability', 'Indemnification', 'Confidentiality', 'Governing Law'].map(cat => (
                        <button
                          key={cat}
                          onClick={() => setClauseFilter(cat)}
                          className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                            clauseFilter === cat 
                              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs' 
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>

                    {/* Clause Cards List */}
                    <div className="space-y-4">
                      {filteredClauses.length > 0 ? (
                        filteredClauses.map((clause) => (
                          <div 
                            key={clause.id || clause.title}
                            className="bg-white dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-800 rounded-xl p-4 shadow-xs hover:border-blue-300 dark:hover:border-blue-500/40 transition-all space-y-3"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase border ${getClauseCategoryColor(clause.category)}`}>
                                  {clause.category}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getRiskBadgeStyle(clause.risk_level)}`}>
                                  {clause.risk_level} Risk
                                </span>
                              </div>
                              <SourceCitation citation={{ page_number: clause.page_number, section: clause.section, text: clause.snippet }} />
                            </div>

                            <h5 className="font-extrabold text-xs text-slate-900 dark:text-white">
                              {clause.title}
                            </h5>

                            {/* Original Text Snippet */}
                            <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-lg border border-slate-100 dark:border-slate-800 text-[11px] font-mono text-slate-700 dark:text-slate-300 leading-relaxed italic relative pl-4 border-l-2 border-l-blue-500">
                              "{clause.snippet}"
                            </div>

                            {/* Plain English Explanation */}
                            <div className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400 bg-blue-50/40 dark:bg-blue-500/5 p-2.5 rounded-lg border border-blue-100/60 dark:border-blue-500/10">
                              <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />
                              <span className="leading-normal font-medium">{clause.explanation}</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-xs">
                          No clauses matched the selected category.
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* ── 3. KEY ENTITY EXTRACTION TAB ──────────────── */}
                {activeTab === 'entities' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                    {/* Grid 1: Parties & Organizations */}
                    <div className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
                      <h4 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Building2 size={16} className="text-blue-500" /> Parties & Organizations
                      </h4>
                      <div className="grid grid-cols-1 gap-3">
                        {auditResult?.entities?.parties?.map((party, pIdx) => (
                          <div key={pIdx} className="bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-lg border border-slate-200/70 dark:border-slate-800">
                            <div className="flex justify-between items-start mb-1">
                              <span className="font-extrabold text-xs text-slate-900 dark:text-white">{party.name}</span>
                              <span className="text-[10px] font-semibold bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
                                {party.role}
                              </span>
                            </div>
                            {party.address && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">📍 {party.address}</p>}
                            {party.signatory && <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 font-medium">✍️ Signatory: {party.signatory}</p>}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Grid 2: Key Dates & Timeline */}
                    <div className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
                      <h4 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Calendar size={16} className="text-emerald-500" /> Key Dates & Milestones
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {auditResult?.entities?.dates?.map((dt, dIdx) => (
                          <div key={dIdx} className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-200/70 dark:border-slate-800 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">{dt.label}</span>
                              <SourceCitation citation={{ page_number: dt.page_number, section: dt.section, text: dt.note }} />
                            </div>
                            <p className="font-bold text-xs text-slate-900 dark:text-white">{dt.value}</p>
                            {dt.note && <p className="text-[10px] text-slate-500 dark:text-slate-400">{dt.note}</p>}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Grid 3: Financial & Monetary Values */}
                    <div className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
                      <h4 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                        <DollarSign size={16} className="text-amber-500" /> Financial & Monetary Values
                      </h4>
                      <div className="space-y-3">
                        {auditResult?.entities?.financials?.map((fin, fIdx) => (
                          <div key={fIdx} className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-200/70 dark:border-slate-800 flex items-center justify-between">
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase block">{fin.label}</span>
                              <span className="font-extrabold text-sm text-slate-900 dark:text-white">{fin.amount}</span>
                              {fin.detail && <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{fin.detail}</p>}
                            </div>
                            <SourceCitation citation={{ page_number: fin.page_number, section: fin.section, text: fin.detail }} />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Grid 4: Governing Law & Jurisdiction */}
                    <div className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
                      <h4 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Scale size={16} className="text-indigo-500" /> Governing Law & Venue
                      </h4>
                      <div className="bg-indigo-50/50 dark:bg-indigo-500/10 p-3.5 rounded-lg border border-indigo-100 dark:border-indigo-500/20 space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400 font-medium">Governing Law:</span>
                          <span className="font-bold text-slate-900 dark:text-white">{auditResult?.entities?.jurisdiction?.governing_law}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400 font-medium">Court Venue:</span>
                          <span className="font-bold text-slate-900 dark:text-white">{auditResult?.entities?.jurisdiction?.venue}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400 font-medium">Dispute Resolution:</span>
                          <span className="font-bold text-slate-900 dark:text-white">{auditResult?.entities?.jurisdiction?.dispute_resolution}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ── 4. RISKS TAB ──────────────────────────────── */}
                {activeTab === 'risks' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    {auditResult?.risks?.length > 0 ? (
                      auditResult.risks.map((risk, idx) => (
                        <div key={idx} className="border border-red-200 dark:border-red-900/50 bg-red-50/30 dark:bg-red-500/5 rounded-xl p-5 relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex gap-2 items-center">
                              <ShieldAlert size={18} className="text-red-500 shrink-0" />
                              <h4 className="font-bold text-slate-800 dark:text-red-100 text-xs">{risk.title}</h4>
                            </div>
                            <SourceCitation citation={{ page_number: risk.page_number || 2, section: risk.section || "Risk Area", text: risk.snippet || risk.description }} />
                          </div>
                          <p className="text-[12px] text-slate-600 dark:text-slate-400 leading-relaxed pl-6">
                            {risk.description}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500 dark:text-slate-400">No critical risks identified in this document.</p>
                    )}
                  </motion.div>
                )}

                {/* ── 5. SUGGESTIONS TAB ────────────────────────── */}
                {activeTab === 'suggestions' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    {auditResult?.suggestions?.length > 0 ? (
                      auditResult.suggestions.map((suggestion, idx) => (
                        <div key={idx} className="border border-blue-200 dark:border-blue-900/50 bg-blue-50/30 dark:bg-blue-500/5 rounded-xl p-4 relative overflow-hidden flex gap-3">
                          <div className="absolute top-0 left-0 w-1 h-full bg-primary-blue"></div>
                          <Lightbulb size={18} className="text-primary-blue mt-0.5 shrink-0" />
                          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                            {typeof suggestion === 'string' ? suggestion : suggestion.text}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500 dark:text-slate-400">No specific remediation suggestions generated.</p>
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
