import { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Loader2, Info, Activity, Database } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ChatMessage, UserProfile } from '../types';
import { getChatHistory, saveMessage, getAllRecords, getProfile, saveRecord, updateProfileInsights } from '../lib/db';
import { searchContext, generateGroundedResponse, extractInsightsFromChat } from '../lib/ai';
import { v4 as uuidv4 } from 'uuid';
import { motion, AnimatePresence } from 'motion/react';
import { seedMedicalDatabase } from '../lib/seed';
import { useTranslation } from '../lib/translations';

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const { t } = useTranslation(profile?.language || 'en');
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [hasRecords, setHasRecords] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      const [history, records, p] = await Promise.all([getChatHistory(), getAllRecords(), getProfile()]);
      setMessages(history.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()));
      setHasRecords(records.length > 0);
      setProfile(p || null);
    }
    load();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isThinking) return;

    setError(null);
    const userMsg: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      text: input,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsThinking(true);
    await saveMessage(userMsg);

    try {
      // RAG Flow
      const context = await searchContext(input);
      const responseText = await generateGroundedResponse(input, context);

      const botMsg: ChatMessage = {
        id: uuidv4(),
        role: 'model',
        text: responseText || t.noInfoFound,
        timestamp: new Date().toISOString(),
        sources: context.map(c => c.recordId)
      };

      setMessages(prev => [...prev, botMsg]);
      await saveMessage(botMsg);

      // Continuous Learning & Auto-Curation
      const chatHistory = [...messages, userMsg, botMsg].map(m => ({
        role: m.role === 'model' ? 'assistant' as const : 'user' as const,
        content: m.text
      }));

      const insights = await extractInsightsFromChat(chatHistory);
      if (insights) {
        // 1. Save new medical records extracted from chat
        if (insights.newRecords && insights.newRecords.length > 0) {
          for (const record of insights.newRecords) {
            await saveRecord({
              id: uuidv4(),
              title: record.title,
              content: record.content,
              type: 'symptom_log', // Default to symptom log for chat-extracted data
              date: new Date().toISOString(),
              source: 'AI Chat Extraction',
              tags: ['auto-curated', record.type],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
          }
        }

        // 2. Update profile with preferences and nuances
        if ((insights.preferences && insights.preferences.length > 0) || 
            (insights.nuances && insights.nuances.length > 0)) {
          await updateProfileInsights(insights.preferences || [], insights.nuances || []);
          // Refresh profile state
          const updatedProfile = await getProfile();
          if (updatedProfile) setProfile(updatedProfile);
        }
      }
    } catch (err) {
      console.error(err);
      setError(t.errorBrain);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <header className="p-6 bg-white border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center text-white">
            <Bot size={24} />
          </div>
          <div>
            <h2 className="font-bold text-slate-900">{t.medicalBrain}</h2>
            <p className="text-xs text-teal-600 font-bold uppercase tracking-wider">{t.groundedMode}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 rounded-full text-amber-700 text-xs font-bold border border-amber-100">
          <Info size={14} />
          {t.offlineOnly}
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto">
            <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-600 mb-6">
              <Activity size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              {profile?.name ? `${t.hello}, ${profile.name.split(' ')[0]}` : t.askBrain}
            </h3>
            <p className="text-slate-500 mb-6">
              {t.chatDescription}
            </p>
            {!hasRecords && (
              <button 
                onClick={async () => {
                  setIsSeeding(true);
                  try {
                    await seedMedicalDatabase();
                    window.location.reload();
                  } catch (err) {
                    console.error(err);
                  } finally {
                    setIsSeeding(false);
                  }
                }}
                disabled={isSeeding}
                className="flex items-center gap-2 px-6 py-3 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 transition-all disabled:opacity-50"
              >
                {isSeeding ? <Loader2 size={20} className="animate-spin" /> : <Database size={20} />}
                {isSeeding ? t.seeding : t.seedData}
              </button>
            )}
          </div>
        )}

        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={msg.id}
              className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                msg.role === 'user' ? 'bg-slate-200 text-slate-600' : 'bg-teal-600 text-white'
              }`}>
                {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
              </div>
              <div className={`max-w-[80%] p-4 rounded-2xl ${
                msg.role === 'user' 
                  ? 'bg-white border border-slate-200 text-slate-900' 
                  : 'bg-white border border-teal-100 text-slate-900 shadow-sm'
              }`}>
                <div className="markdown-body prose prose-slate prose-sm max-w-none">
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                </div>
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest w-full">{t.sources}</span>
                    {Array.from(new Set(msg.sources)).map((source, i) => (
                      <span key={i} className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-medium text-slate-500">
                        {source.slice(0, 8)}...
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isThinking && (
          <div className="flex gap-4">
            <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center text-white shrink-0">
              <Bot size={20} />
            </div>
            <div className="bg-white border border-teal-100 p-4 rounded-2xl flex items-center gap-3">
              <Loader2 className="animate-spin text-teal-600" size={18} />
              <span className="text-sm font-medium text-slate-500">{t.thinking}</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-6 bg-white border-t border-slate-200">
        {error && (
          <div className="max-w-4xl mx-auto mb-4 p-3 bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold rounded-xl flex items-center gap-2">
            <Info size={14} />
            {error}
          </div>
        )}
        <div className="max-w-4xl mx-auto relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={t.askPlaceholder}
            className="w-full pl-6 pr-14 py-4 bg-slate-50 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isThinking}
            className="absolute right-2 top-2 bottom-2 px-4 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={20} />
          </button>
        </div>
        <p className="text-center text-[10px] text-slate-400 mt-4 uppercase tracking-widest font-bold">
          Encrypted • Offline Context • Patient Owned
        </p>
      </div>
    </div>
  );
}
