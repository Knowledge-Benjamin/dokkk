import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Chat from './components/Chat';
import RecordUpload from './components/RecordUpload';
import HealthTimeline from './components/HealthTimeline';
import Settings from './components/Settings';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, RefreshCcw } from 'lucide-react';

// Simple Error Boundary Fallback
function ErrorFallback({ error, resetErrorBoundary }: { error: Error, resetErrorBoundary: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-screen p-8 text-center bg-rose-50">
      <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-6">
        <AlertCircle size={32} />
      </div>
      <h2 className="text-2xl font-bold text-slate-900 mb-2">System Interruption</h2>
      <p className="text-slate-600 mb-8 max-w-md">
        An unexpected error occurred in the medical brain. Your data remains secure in the local vault.
      </p>
      <pre className="text-xs bg-white p-4 rounded-xl border border-rose-200 mb-8 max-w-lg overflow-auto text-rose-700 font-mono">
        {error.message}
      </pre>
      <button 
        onClick={resetErrorBoundary}
        className="flex items-center gap-2 px-6 py-3 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition-all"
      >
        <RefreshCcw size={20} />
        Restart PMI System
      </button>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [error, setError] = useState<Error | null>(null);

  const renderContent = () => {
    try {
      switch (activeTab) {
        case 'dashboard':
          return <Dashboard key="dashboard" onNavigate={setActiveTab} />;
        case 'chat':
          return <Chat key="chat" />;
        case 'upload':
          return <RecordUpload key="upload" />;
        case 'timeline':
          return <HealthTimeline key="timeline" />;
        case 'settings':
          return <Settings key="settings" />;
        default:
          return <Dashboard key="dashboard" />;
      }
    } catch (e) {
      setError(e as Error);
      return null;
    }
  };

  if (error) {
    return <ErrorFallback error={error} resetErrorBoundary={() => { setError(null); setActiveTab('dashboard'); }} />;
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 overflow-y-auto relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Offline Status Indicator */}
      <div className="fixed bottom-4 right-4 px-3 py-1.5 bg-teal-600 text-white text-[10px] font-bold rounded-full shadow-lg flex items-center gap-2 uppercase tracking-widest z-50 border border-teal-400">
        <div className="w-2 h-2 bg-teal-200 rounded-full animate-pulse" />
        Encrypted Local Vault Active
      </div>
    </div>
  );
}

