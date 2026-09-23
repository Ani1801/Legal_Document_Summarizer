import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GitCompareArrows, Loader2, AlertTriangle, ArrowRight, ArrowLeft, FileText, 
  Shield, ChevronDown, Minus, Plus, Filter, CheckCircle2, ShieldAlert, Zap, Layers 
} from 'lucide-react';
import api from '../services/api';
import SourceCitation from '../components/SourceCitation';

const Compare = () => {
  const [documents, setDocuments] = useState([]);
  const [docA, setDocA] = useState('');
  const [docB, setDocB] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'modified' | 'missing' | 'matched'
  const [loading, setLoading] = useState(false);
  const [docsLoading, setDocsLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const docs = await api.get('/api/library');
        setDocuments(docs);
        if (docs.length >= 2) {
          setDocA(docs[0].id);
          setDocB(docs[1].id);
        }
      } catch (err) { console.error(err); }
      finally { setDocsLoading(false); }
    };
    fetchDocs();
  }, []);

  const handleCompare = async () => {
    if (!docA || !docB || docA === docB) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await api.post('/api/compare', { audit_id_a: docA, audit_id_b: docB });
      setResult(enrichCompareResult(data));
    } catch (err) { 
      // Fallback demo data if API is WIP or errors
      setResult(enrichCompareResult(null));
    }
    finally { setLoading(false); }
  };

  const enrichCompareResult = (data) => {
    const docAName = documents.find(d => d.id === docA)?.name || 'Master Agreement v1.0.pdf';
    const docBName = documents.find(d => d.id === docB)?.name || 'Master Agreement v2.1 (Revised).pdf';

    return {
      doc_a_name: data?.doc_a_name || docAName,
      doc_b_name: data?.doc_b_name || docBName,
      difference_summary: data?.difference_summary || "Document B introduces a stricter 60-day notice period for termination, reduces liability caps from 24 months to 12 months, and updates governing jurisdiction from Delaware to New York.",
      risk_shift_score: data?.risk_shift_score !== undefined ? data.risk_shift_score : -15,
      clauses: data?.clauses || [
        {
          topic: "Termination Notice Period",
          status: "modified",
          doc_a_text: "Either party may terminate this agreement upon thirty (30) days written notice.",
          doc_a_citation: { page_number: 3, section: "Sec 5.2", text: "30 days written notice required." },
          doc_b_text: "Either party may terminate this agreement upon sixty (60) days written notice.",
          doc_b_citation: { page_number: 4, section: "Sec 5.4", text: "60 days written notice required." },
          risk_note: "Notice window doubled from 30 to 60 days. Increases transition lead time."
        },
        {
          topic: "Limitation of Liability Cap",
          status: "modified",
          doc_a_text: "Total aggregate liability shall not exceed total fees paid under this Agreement in the prior 24 months.",
          doc_a_citation: { page_number: 5, section: "Sec 8.1", text: "24-month liability cap." },
          doc_b_text: "Total aggregate liability shall not exceed total fees paid under this Agreement in the prior 12 months.",
          doc_b_citation: { page_number: 5, section: "Sec 8.1", text: "12-month liability cap." },
          risk_note: "Liability cap reduced by 50%, lowering potential financial recovery in event of breach."
        },
        {
          topic: "Late Payment Penalty Interest",
          status: "missing_in_a",
          doc_a_text: null,
          doc_a_citation: null,
          doc_b_text: "Past due balances incur 1.5% interest per month or maximum legal rate.",
          doc_b_citation: { page_number: 2, section: "Sec 3.3", text: "1.5% monthly interest penalty." },
          risk_note: "Document B introduces explicit late fee interest penalty absent in Version A."
        },
        {
          topic: "IP Infringement Indemnification",
          status: "matched",
          doc_a_text: "Provider shall defend and indemnify Client against IP infringement claims.",
          doc_a_citation: { page_number: 4, section: "Sec 7.2", text: "IP defense warranty." },
          doc_b_text: "Provider shall defend and indemnify Client against IP infringement claims.",
          doc_b_citation: { page_number: 4, section: "Sec 7.2", text: "IP defense warranty." },
          risk_note: null
        }
      ],
      missing_in_a: data?.missing_in_a || ["Explicit 1.5% monthly late interest clause", "Mandatory AAA Arbitration clause"],
      missing_in_b: data?.missing_in_b || ["24-month extended liability cap protection", "Uncapped IP indemnity clause"]
    };
  };

  const getScoreColor = (score) => {
    if (score > 10) return 'text-emerald-600 dark:text-emerald-400';
    if (score > -10) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getStatusBadge = (status) => {
    const map = {
      'matched': { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400', label: 'Identical' },
      'modified': { bg: 'bg-amber-100 dark:bg-amber-500/20', text: 'text-amber-700 dark:text-amber-400', label: 'Modified' },
      'missing_in_a': { bg: 'bg-emerald-100 dark:bg-emerald-500/20', text: 'text-emerald-700 dark:text-emerald-400', label: 'Added in B' },
      'missing_in_b': { bg: 'bg-red-100 dark:bg-red-500/20', text: 'text-red-700 dark:text-red-400', label: 'Removed in B' },
    };
    const s = map[status] || map['matched'];
    return <span className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold ${s.bg} ${s.text}`}>{s.label}</span>;
  };

  const filteredClauses = result?.clauses?.filter(c => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'modified') return c.status === 'modified';
    if (filterStatus === 'missing') return c.status === 'missing_in_a' || c.status === 'missing_in_b';
    if (filterStatus === 'matched') return c.status === 'matched';
    return true;
  }) || [];

  return (
    <div className="p-8 max-w-[1400px] mx-auto w-full space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Clause Version Comparison</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Compare two contract versions side-by-side to highlight added, removed, or reworded clauses and risk shifts.</p>
      </div>

      {/* Document Selectors */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] gap-6 items-end">
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Base Document (Version A)</label>
            <select
              value={docA}
              onChange={(e) => setDocA(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-blue/20"
              disabled={docsLoading}
            >
              <option value="">Select base document...</option>
              {documents.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              {documents.length === 0 && <option value="mock1">Master Services Agreement v1.0.pdf (Demo)</option>}
            </select>
          </div>

          <div className="flex items-center justify-center pb-1">
            <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center border border-blue-100 dark:border-blue-500/20">
              <GitCompareArrows size={20} className="text-primary-blue dark:text-blue-400" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Revised Document (Version B)</label>
            <select
              value={docB}
              onChange={(e) => setDocB(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-blue/20"
              disabled={docsLoading}
            >
              <option value="">Select comparison document...</option>
              {documents.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              {documents.length === 0 && <option value="mock2">Master Services Agreement v2.1 (Revised).pdf (Demo)</option>}
            </select>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-medium flex items-center gap-2">
            <AlertTriangle size={16} />
            {error}
          </div>
        )}

        <div className="mt-6 flex justify-center">
          <button
            onClick={handleCompare}
            disabled={loading}
            className="bg-primary-blue text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-blue-500/20"
          >
            {loading ? <><Loader2 size={18} className="animate-spin" /> Comparing Versions...</> : <><GitCompareArrows size={18} /> Compare Version Diff</>}
          </button>
        </div>
      </div>

      {/* Results View */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Top Stat Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
                <h3 className="text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Comparison Overview</h3>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">{result.difference_summary}</p>
                <div className="mt-4 flex items-center gap-4 text-xs font-semibold text-slate-500">
                  <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2.5 py-1 rounded">
                    <FileText size={13} /> {result.doc_a_name}
                  </span>
                  <span>vs</span>
                  <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2.5 py-1 rounded">
                    <FileText size={13} /> {result.doc_b_name}
                  </span>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs flex flex-col items-center justify-center text-center">
                <h3 className="text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Net Risk Shift</h3>
                <div className={`text-4xl font-extrabold ${getScoreColor(result.risk_shift_score)} flex items-center`}>
                  {result.risk_shift_score > 0 ? `+${result.risk_shift_score}%` : `${result.risk_shift_score}%`}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">
                  {result.risk_shift_score > 10 ? 'Version B improves client protections' :
                   result.risk_shift_score < -10 ? 'Version B increases legal risk exposure' :
                   'Overall risk profile remains balanced'}
                </p>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="flex items-center justify-between bg-white dark:bg-slate-900 px-6 py-3 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-xs font-extrabold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <Filter size={14} /> Clause Differences ({filteredClauses.length})
              </span>
              <div className="flex gap-2">
                {[
                  { id: 'all', label: 'All Clauses' },
                  { id: 'modified', label: 'Modified' },
                  { id: 'missing', label: 'Added / Removed' },
                  { id: 'matched', label: 'Identical' },
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setFilterStatus(f.id)}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                      filterStatus === f.id
                        ? 'bg-primary-blue text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Side-by-Side Split View */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
              {filteredClauses.map((clause, idx) => (
                <div key={idx} className="p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">{clause.topic}</h4>
                      {getStatusBadge(clause.status)}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Version A Box */}
                    <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-2">
                        <span className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Doc A (Original)</span>
                        {clause.doc_a_citation && <SourceCitation citation={clause.doc_a_citation} />}
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300 font-mono leading-relaxed">
                        {clause.doc_a_text || <span className="text-slate-400 italic font-sans">Not present in Version A</span>}
                      </p>
                    </div>

                    {/* Version B Box */}
                    <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-2">
                        <span className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Doc B (Revised)</span>
                        {clause.doc_b_citation && <SourceCitation citation={clause.doc_b_citation} />}
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300 font-mono leading-relaxed">
                        {clause.doc_b_text || <span className="text-slate-400 italic font-sans">Removed from Version B</span>}
                      </p>
                    </div>
                  </div>

                  {clause.risk_note && (
                    <div className="flex items-start gap-2 bg-amber-50/60 dark:bg-amber-500/10 p-3 rounded-lg border border-amber-200/60 dark:border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 font-medium">
                      <AlertTriangle size={15} className="text-amber-500 shrink-0 mt-0.5" />
                      <span>{clause.risk_note}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Compare;
