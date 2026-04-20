import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GitCompareArrows, Loader2, AlertTriangle, ArrowRight, ArrowLeft, FileText, Shield, ChevronDown, Minus, Plus } from 'lucide-react';

const API_URL = 'http://127.0.0.1:8000/api';

const Compare = () => {
  const [documents, setDocuments] = useState([]);
  const [docA, setDocA] = useState('');
  const [docB, setDocB] = useState('');
  const [loading, setLoading] = useState(false);
  const [docsLoading, setDocsLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/library`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) setDocuments(await res.json());
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
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ audit_id_a: docA, audit_id_b: docB })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Comparison failed');
      }
      setResult(await res.json());
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const getScoreColor = (score) => {
    if (score > 20) return 'text-emerald-500';
    if (score > -20) return 'text-amber-500';
    return 'text-red-500';
  };

  const getStatusBadge = (status) => {
    const map = {
      'matched': { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400', label: 'Matched' },
      'modified': { bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', label: 'Modified' },
      'missing_in_a': { bg: 'bg-red-50 dark:bg-red-500/10', text: 'text-red-600 dark:text-red-400', label: 'Missing in A' },
      'missing_in_b': { bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', label: 'Missing in B' },
    };
    const s = map[status] || map['matched'];
    return <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${s.bg} ${s.text}`}>{s.label}</span>;
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Compare Documents</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Compare two audited contracts side-by-side to identify differences and risk shifts.</p>
      </div>

      {/* Document Selectors */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm mb-6">
        <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] gap-4 items-end">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Document A (Base)</label>
            <select
              value={docA}
              onChange={(e) => setDocA(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-blue/20"
              disabled={docsLoading}
            >
              <option value="">Select base document...</option>
              {documents.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          <div className="flex items-center justify-center pb-1">
            <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
              <GitCompareArrows size={20} className="text-primary-blue dark:text-blue-400" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Document B (New/Revised)</label>
            <select
              value={docB}
              onChange={(e) => setDocB(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-blue/20"
              disabled={docsLoading}
            >
              <option value="">Select comparison document...</option>
              {documents.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-medium flex items-center gap-2">
            <AlertTriangle size={16} />
            {error}
          </div>
        )}

        <div className="mt-4 flex justify-center">
          <button
            onClick={handleCompare}
            disabled={!docA || !docB || docA === docB || loading}
            className="bg-primary-blue text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-blue-500/20"
          >
            {loading ? <><Loader2 size={18} className="animate-spin" /> Analyzing...</> : <><GitCompareArrows size={18} /> Compare Documents</>}
          </button>
        </div>
      </div>

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Summary + Risk Shift Score */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                <h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Difference Summary</h3>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{result.difference_summary}</p>
                <div className="mt-4 flex gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><FileText size={12} className="text-blue-500" /> {result.doc_a_name}</span>
                  <span>vs</span>
                  <span className="flex items-center gap-1"><FileText size={12} className="text-indigo-500" /> {result.doc_b_name}</span>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col items-center justify-center">
                <h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Risk Shift</h3>
                <div className={`text-5xl font-extrabold ${getScoreColor(result.risk_shift_score)} flex items-center`}>
                  {result.risk_shift_score > 0 ? <Plus size={24} /> : result.risk_shift_score < 0 ? <Minus size={24} /> : null}
                  {Math.abs(result.risk_shift_score)}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium text-center">
                  {result.risk_shift_score > 20 ? 'Doc B has improved protections' :
                   result.risk_shift_score < -20 ? 'Doc B introduces more risk' :
                   'Similar risk levels'}
                </p>
              </div>
            </div>

            {/* Clause Comparison */}
            {result.clauses?.length > 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Clause-by-Clause Comparison ({result.clauses.length})</h3>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {result.clauses.map((clause, idx) => (
                    <div key={idx} className="p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <h4 className="font-bold text-sm text-slate-800 dark:text-white">{clause.topic}</h4>
                        {getStatusBadge(clause.status)}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-blue-50/50 dark:bg-blue-500/5 rounded-lg p-3 border border-blue-100 dark:border-blue-500/20">
                          <p className="text-[10px] font-bold text-blue-500 uppercase mb-1">Doc A</p>
                          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{clause.doc_a_text || 'â€”'}</p>
                        </div>
                        <div className="bg-indigo-50/50 dark:bg-indigo-500/5 rounded-lg p-3 border border-indigo-100 dark:border-indigo-500/20">
                          <p className="text-[10px] font-bold text-indigo-500 uppercase mb-1">Doc B</p>
                          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{clause.doc_b_text || 'â€”'}</p>
                        </div>
                      </div>
                      {clause.risk_note && (
                        <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                          <AlertTriangle size={12} /> {clause.risk_note}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Missing Protections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {result.missing_in_a?.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-red-200 dark:border-red-900/50 p-6 shadow-sm">
                  <h3 className="text-sm font-bold text-red-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Shield size={14} /> Missing in Document A
                  </h3>
                  <ul className="space-y-2">
                    {result.missing_in_a.map((item, idx) => (
                      <li key={idx} className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2">
                        <span className="text-red-400 mt-1">â€¢</span> {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {result.missing_in_b?.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-blue-200 dark:border-blue-900/50 p-6 shadow-sm">
                  <h3 className="text-sm font-bold text-blue-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Shield size={14} /> Missing in Document B
                  </h3>
                  <ul className="space-y-2">
                    {result.missing_in_b.map((item, idx) => (
                      <li key={idx} className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2">
                        <span className="text-blue-400 mt-1">â€¢</span> {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Compare;
