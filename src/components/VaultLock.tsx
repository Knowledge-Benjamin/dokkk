import { useState } from 'react';
import { Lock, Unlock, AlertTriangle, ShieldCheck, Database, Trash2 } from 'lucide-react';
import { setVaultPassword } from '../lib/crypto';
import { wipeAllData } from '../lib/db';

interface VaultLockProps {
  onUnlock: () => void;
}

export default function VaultLock({ onUnlock }: VaultLockProps) {
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  
  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    
    // In a production app, we would verify the password against a hashed stored value.
    // Here we just set it in memory to be used for encryption/decryption keys.
    setVaultPassword(password);
    onUnlock();
  };

  const handleWipe = async () => {
    if (window.confirm('Are you absolutely sure? This will delete all your local records and chat history to restart with a fresh encrypted vault.')) {
      await wipeAllData();
      window.location.reload();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 p-8 text-center text-slate-100 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="z-10 bg-slate-800/80 backdrop-blur-xl p-10 rounded-3xl border border-slate-700 shadow-2xl max-w-md w-full">
        <div className="w-20 h-20 bg-teal-500/20 text-teal-400 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldCheck size={40} />
        </div>
        
        <h1 className="text-3xl font-bold mb-2">Encrypted Vault</h1>
        <p className="text-slate-400 mb-8 max-w-sm mx-auto">
          Your Personal Medical Intelligence is strictly offline. Unlock your vault to derive the decryption keys.
        </p>

        <form onSubmit={handleUnlock} className="space-y-4">
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
            <input 
              type="password"
              placeholder="Master Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-white pl-12 pr-4 py-4 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all placeholder-slate-600 font-mono"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-rose-400 text-sm bg-rose-950/50 p-3 rounded-lg border border-rose-900">
              <AlertTriangle size={16} />
              {error}
            </div>
          )}

          <button 
            type="submit"
            className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-teal-900/50"
          >
            <Unlock size={20} />
            Unlock Medical Brain
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-slate-700 flex flex-col items-center">
          <p className="text-xs text-slate-500 mb-4 flex items-center gap-1">
            <Database size={14} /> Local storage only. No password recovery available.
          </p>
          <button 
            onClick={handleWipe}
            className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1 transition-colors"
          >
            <Trash2 size={12} /> Wipe Vault (Delete All Data)
          </button>
        </div>
      </div>
    </div>
  );
}
