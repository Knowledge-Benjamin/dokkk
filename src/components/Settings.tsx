import { useState, useEffect } from 'react';
import { User, Shield, History, Download, Trash2, Save, CheckCircle2, Activity, Database, Loader2, Globe } from 'lucide-react';
import { getProfile, saveProfile, getAuditLogs, getAllRecords, logAction, wipeAllData } from '../lib/db';
import { UserProfile, AuditLog } from '../types';
import { format } from 'date-fns';
import { seedMedicalDatabase } from '../lib/seed';
import { useTranslation, Language } from '../lib/translations';

export default function Settings() {
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    allergies: [],
    chronicConditions: [],
    language: 'en'
  });
  const { t } = useTranslation(profile.language);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    async function load() {
      const p = await getProfile();
      if (p) setProfile(p);
      const l = await getAuditLogs();
      setLogs(l.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    }
    load();
  }, []);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    await saveProfile(profile);
    await logAction('access', 'Updated user profile');
    setIsSaving(false);
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      window.location.reload(); // Reload to apply language changes globally
    }, 1000);
  };

  const handleExportData = async () => {
    const records = await getAllRecords();
    const data = {
      profile,
      records,
      logs,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pmi_vault_export_${format(new Date(), 'yyyyMMdd')}.json`;
    a.click();
    await logAction('export', 'Exported full medical vault');
  };

  const handleWipeVault = async () => {
    if (window.confirm('Are you absolutely sure? This will permanently delete all records, profile data, and chat history.')) {
      await wipeAllData();
      window.location.reload();
    }
  };

  const handleSeedData = async () => {
    setIsSeeding(true);
    try {
      await seedMedicalDatabase();
      window.location.reload();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <header className="mb-10">
        <h2 className="text-3xl font-bold text-slate-900 mb-2">{t.settings}</h2>
        <p className="text-slate-500">Manage your identity, security, and data portability.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Profile Section */}
          <section className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <User className="text-teal-600" size={24} />
              {t.patientProfile}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">{t.fullName}</label>
                <input 
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">{t.bloodType}</label>
                <input 
                  type="text"
                  value={profile.bloodType}
                  onChange={(e) => setProfile({ ...profile, bloodType: e.target.value })}
                  className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">{t.language}</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <select 
                    value={profile.language || 'en'}
                    onChange={(e) => setProfile({ ...profile, language: e.target.value as Language })}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 outline-none appearance-none"
                  >
                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="fr">Français</option>
                    <option value="de">Deutsch</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">{t.knownAllergies} ({t.fullName})</label>
              <input 
                type="text"
                value={profile.allergies.join(', ')}
                onChange={(e) => setProfile({ ...profile, allergies: e.target.value.split(',').map(s => s.trim()) })}
                className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>

            <div className="mb-8">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">{t.chronicConditions}</label>
              <input 
                type="text"
                value={profile.chronicConditions.join(', ')}
                onChange={(e) => setProfile({ ...profile, chronicConditions: e.target.value.split(',').map(s => s.trim()) })}
                className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>

            <button 
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="flex items-center justify-center gap-2 w-full py-4 bg-teal-600 text-white font-bold rounded-2xl hover:bg-teal-700 transition-all"
            >
              {showSuccess ? <CheckCircle2 size={20} /> : <Save size={20} />}
              {showSuccess ? t.profileUpdated : t.saveProfile}
            </button>
          </section>

          {/* Audit Logs */}
          <section className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <History className="text-teal-600" size={24} />
              {t.securityAudit}
            </h3>
            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start gap-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="p-2 bg-white rounded-lg text-slate-400">
                    <Activity size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{log.details}</p>
                    <p className="text-[10px] text-slate-400 font-mono uppercase">
                      {format(new Date(log.timestamp), 'MMM dd, HH:mm:ss')} • {log.action}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-8">
          {/* Security Card */}
          <section className="bg-teal-900 text-white rounded-3xl p-8 shadow-lg">
            <Shield className="text-teal-300 mb-4" size={32} />
            <h3 className="text-xl font-bold mb-2">{t.vaultSecurity}</h3>
            <p className="text-teal-100 text-sm mb-6">
              Your data is stored strictly on this device using AES-256 encryption. No cloud sync is active.
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-teal-300 uppercase tracking-widest">
                <CheckCircle2 size={14} />
                Encrypted at Rest
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-teal-300 uppercase tracking-widest">
                <CheckCircle2 size={14} />
                Zero-Knowledge RAG
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-teal-300 uppercase tracking-widest">
                <CheckCircle2 size={14} />
                Local OCR Engine
              </div>
            </div>
          </section>

          {/* Data Portability */}
          <section className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-4">{t.dataPortability}</h3>
            <p className="text-slate-500 text-sm mb-6">
              Download your entire medical vault as a JSON file for backup or transfer to another device.
            </p>
            <div className="space-y-3">
              <button 
                onClick={handleExportData}
                className="flex items-center justify-center gap-2 w-full py-3 border-2 border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-all"
              >
                <Download size={20} />
                {t.exportVault}
              </button>
              <button 
                onClick={handleSeedData}
                disabled={isSeeding}
                className="flex items-center justify-center gap-2 w-full py-3 bg-teal-50 text-teal-600 font-bold rounded-xl hover:bg-teal-100 transition-all"
              >
                {isSeeding ? <Loader2 size={20} className="animate-spin" /> : <Database size={20} />}
                {isSeeding ? t.seeding : t.seedData}
              </button>
            </div>
            
            <div className="mt-8 pt-8 border-t border-slate-100">
              <h4 className="text-rose-600 font-bold mb-2">{t.dangerZone}</h4>
              <p className="text-slate-500 text-xs mb-4">
                Permanently delete all records and history. This action cannot be undone.
              </p>
              <button 
                onClick={handleWipeVault}
                className="flex items-center justify-center gap-2 w-full py-3 bg-rose-50 text-rose-600 font-bold rounded-xl hover:bg-rose-100 transition-all"
              >
                <Trash2 size={20} />
                {t.wipeVault}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
