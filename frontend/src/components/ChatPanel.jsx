import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Loader2, FileText, ChevronDown, Sparkles, AlertCircle } from 'lucide-react';

const API_URL = 'http://localhost:8000/api';

/**
 * ChatPanel — Slide-out drawer for RAG-based document chat.
 * 
 * Props:
 *   auditId  — The audit_id of the document to chat with
 *   fileName — The original PDF file name (for display)
 *   isOpen   — Whether the drawer is visible
 *   onClose  — Callback to close the drawer
 */
const ChatPanel = ({ auditId, fileName, isOpen, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cooldown, setCooldown] = useState(0);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Focus input when drawer opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(c => Math.max(0, c - 1)), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const sendMessage = async () => {
    const question = input.trim();
    if (!question || isLoading || cooldown > 0) return;

    setError(null);
    setInput('');
    
    // Add user message
    const userMessage = { role: 'user', content: question, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          audit_id: auditId,
          question: question
        })
      });

      if (response.status === 429) {
        const data = await response.json();
        setError(data.detail || 'Rate limited. Please wait a moment.');
        setCooldown(4);
        setIsLoading(false);
        return;
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to get response');
      }

      const data = await response.json();
      
      // Add AI message
      const aiMessage = {
        role: 'assistant',
        content: data.answer,
        sources: data.sources || [],
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
      setCooldown(4); // Enforce cooldown after successful request
    } catch (err) {
      setError(err.message);
      // Remove the user message if we got an error (optional — keep for transparency)
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const suggestedQuestions = [
    "What are the key terms of this document?",
    "Are there any liability or indemnity clauses?",
    "What is the termination policy?",
    "Summarize the payment terms.",
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/30 dark:bg-black/50 z-40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Slide-out drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed top-0 right-0 h-full w-full sm:w-[480px] bg-white dark:bg-slate-900 shadow-2xl z-50 flex flex-col border-l border-slate-200 dark:border-slate-800"
          >
            {/* ── Header ─────────────────────────────────── */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <Sparkles size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">Chat with Document</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[260px]">
                    <FileText size={10} className="inline mr-1" />
                    {fileName || 'Document'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg hover:bg-slate-200/80 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
              >
                <X size={18} className="text-slate-500 dark:text-slate-400" />
              </button>
            </div>

            {/* ── Messages Area ──────────────────────────── */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && !isLoading && (
                <div className="flex flex-col items-center justify-center h-full text-center px-6">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 dark:from-blue-500/20 dark:to-indigo-500/20 flex items-center justify-center mb-4">
                    <MessageSquare size={28} className="text-blue-500 dark:text-blue-400" />
                  </div>
                  <h4 className="font-bold text-slate-800 dark:text-white mb-1.5">Ask anything about your document</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                    I'll answer based only on the contents of your uploaded document — no hallucinations.
                  </p>
                  <div className="w-full space-y-2">
                    <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Suggested Questions</p>
                    {suggestedQuestions.map((q, idx) => (
                      <button
                        key={idx}
                        onClick={() => { setInput(q); inputRef.current?.focus(); }}
                        className="w-full text-left px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-500/5 text-sm text-slate-600 dark:text-slate-300 transition-all duration-200 group"
                      >
                        <span className="group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{q}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Message bubbles */}
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] ${msg.role === 'user' ? 'order-1' : 'order-0'}`}>
                    {/* Message bubble */}
                    <div
                      className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-br-md shadow-lg shadow-blue-500/20'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-md border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {msg.role === 'assistant' && (
                        <div className="flex items-center gap-1.5 mb-2">
                          <Sparkles size={12} className="text-blue-500 dark:text-blue-400" />
                          <span className="text-[10px] font-bold text-blue-500 dark:text-blue-400 uppercase tracking-wider">Auditor AI</span>
                        </div>
                      )}
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    </div>

                    {/* Source citations */}
                    {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                      <div className="mt-2 ml-1">
                        <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Sources</p>
                        <div className="flex flex-wrap gap-1.5">
                          {[...new Map(msg.sources.map(s => [s.page_number, s])).values()].map((source, sIdx) => (
                            <span
                              key={sIdx}
                              title={source.text}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[11px] font-medium border border-blue-100 dark:border-blue-500/20 cursor-default"
                            >
                              <FileText size={10} />
                              Page {source.page_number}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Loading indicator */}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-bl-md px-4 py-3 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Sparkles size={12} className="text-blue-500 dark:text-blue-400" />
                      <span className="text-[10px] font-bold text-blue-500 dark:text-blue-400 uppercase tracking-wider">Auditor AI</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                      </div>
                      <span className="text-xs text-slate-400 dark:text-slate-500 ml-1">Analyzing document...</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="flex justify-center">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium">
                    <AlertCircle size={14} />
                    {error}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* ── Input Area ─────────────────────────────── */}
            <div className="border-t border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900">
              {cooldown > 0 && !isLoading && (
                <div className="flex items-center justify-center gap-1.5 mb-2 text-[11px] text-slate-400 dark:text-slate-500">
                  <Loader2 size={11} className="animate-spin" />
                  Cooldown: {cooldown}s
                </div>
              )}
              <div className="flex items-end gap-2">
                <div className="flex-1 relative">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={cooldown > 0 ? `Wait ${cooldown}s...` : "Ask about this document..."}
                    disabled={isLoading || cooldown > 0}
                    rows={1}
                    className="w-full resize-none rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 dark:focus:border-blue-500 transition-all disabled:opacity-50"
                    style={{ maxHeight: '120px', minHeight: '44px' }}
                    onInput={(e) => {
                      e.target.style.height = '44px';
                      e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                    }}
                  />
                </div>
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || isLoading || cooldown > 0}
                  className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed shrink-0"
                >
                  {isLoading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Send size={18} />
                  )}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 text-center">
                Answers are generated from your document only. Always verify with a legal professional.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ChatPanel;
