import { useEffect, useState } from 'react';
import { getAllRecords, getProfile } from '../lib/db';
import { MedicalRecord, UserProfile } from '../types';
import { Activity, FileText, Calendar, ShieldCheck, User, ArrowUpRight, Search, X, Clock, Database, Loader2 } from 'lucide-react';
import { format, subMonths, isAfter } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { seedMedicalDatabase } from '../lib/seed';
import { useTranslation } from '../lib/translations';

interface DashboardProps {
  onNavigate?: (tab: string) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const { t } = useTranslation(profile?.language || 'en');
  const [loading, setLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);

  useEffect(() => {
    async function load() {
      const [data, p] = await Promise.all([getAllRecords(), getProfile()]);
      setRecords(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setProfile(p || null);
      setLoading(false);
    }
    load();
  }, []);

  // Prepare chart data (records per month)
  const chartData = Array.from({ length: 6 }).map((_, i) => {
    const date = subMonths(new Date(), 5 - i);
    const monthStr = format(date, 'MMM');
    const count = records.filter(r => {
      const rDate = new Date(r.date);
      return rDate.getMonth() === date.getMonth() && rDate.getFullYear() === date.getFullYear();
    }).length;
    return { name: monthStr, count };
  });

  const handleSeed = async () => {
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

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Accessing Secure Vault...</p>
      </div>
    </div>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 mb-2">
            {profile?.name ? `${t.welcomeBack}, ${profile.name.split(' ')[0]}` : t.patientIntelligence}
          </h2>
          <p className="text-slate-500">{t.longitudinalView}</p>
        </div>
        
        {profile && (
          <div className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center text-teal-600">
              <User size={24} />
            </div>
            <div>
              <h4 className="font-bold text-slate-900">{profile.name}</h4>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                {profile.bloodType || 'Blood Type N/A'} • {profile.allergies.length} Allergies
              </p>
            </div>
          </div>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <div className="medical-card">
          <div className="p-3 bg-teal-50 rounded-xl w-fit mb-4">
            <FileText className="text-teal-600" size={24} />
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{t.totalRecords}</p>
          <h3 className="text-3xl font-bold text-slate-900">{records.length}</h3>
        </div>
        
        <div className="medical-card">
          <div className="p-3 bg-amber-50 rounded-xl w-fit mb-4">
            <Calendar className="text-amber-600" size={24} />
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{t.lastInteraction}</p>
          <h3 className="text-xl font-bold text-slate-900">
            {records.length > 0 ? format(new Date(records[0].date), 'MMM dd, yyyy') : 'No records'}
          </h3>
        </div>

        <div className="medical-card">
          <div className="p-3 bg-rose-50 rounded-xl w-fit mb-4">
            <Activity className="text-rose-600" size={24} />
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{t.healthSignals}</p>
          <h3 className="text-xl font-bold text-slate-900">{t.stable}</h3>
        </div>

        <div className="medical-card bg-teal-900 text-white border-none">
          <div className="p-3 bg-white/10 rounded-xl w-fit mb-4">
            <ShieldCheck className="text-teal-300" size={24} />
          </div>
          <p className="text-xs font-bold text-teal-300 uppercase tracking-widest mb-1">{t.security}</p>
          <h3 className="text-xl font-bold">{t.encrypted}</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Activity Chart */}
          <section className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold text-slate-900">{t.ingestionTrends}</h3>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Last 6 Months</div>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: '#0f766e', fontWeight: 'bold' }}
                  />
                  <Line type="monotone" dataKey="count" stroke="#0f766e" strokeWidth={4} dot={{ r: 6, fill: '#0f766e', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Recent Records */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900">{t.recentVaultEntries}</h3>
              <button 
                onClick={() => onNavigate?.('timeline')}
                className="flex items-center gap-1 text-sm font-bold text-teal-600 hover:text-teal-700"
              >
                {t.viewAll} <ArrowUpRight size={16} />
              </button>
            </div>

            <div className="space-y-4">
              {records.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-300 flex flex-col items-center gap-4">
                  <p className="text-slate-500 font-medium">{t.noRecords}</p>
                  <button 
                    onClick={handleSeed}
                    disabled={isSeeding}
                    className="flex items-center gap-2 px-6 py-2.5 bg-teal-50 text-teal-600 font-bold rounded-xl hover:bg-teal-100 transition-all disabled:opacity-50"
                  >
                    {isSeeding ? <Loader2 size={18} className="animate-spin" /> : <Database size={18} />}
                    {isSeeding ? t.seeding : t.seedData}
                  </button>
                </div>
              ) : (
                records.slice(0, 4).map((record) => (
                  <div 
                    key={record.id} 
                    onClick={() => setSelectedRecord(record)}
                    className="flex items-center gap-4 p-5 bg-white rounded-2xl border border-slate-200 hover:border-teal-300 hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-teal-50 group-hover:text-teal-600 transition-colors">
                      <Activity size={20} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-900">{record.title}</h4>
                      <p className="text-xs text-slate-500 font-medium">{record.source} • {format(new Date(record.date), 'MMM dd, yyyy')}</p>
                    </div>
                    <div className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      {record.type.replace('_', ' ')}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <div className="space-y-8">
          {/* Health Summary Card */}
          <section className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-6">{t.clinicalSummary}</h3>
            <div className="space-y-6">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{t.knownAllergies}</p>
                <div className="flex flex-wrap gap-2">
                  {profile?.allergies.length ? profile.allergies.map(a => (
                    <span key={a} className="px-2 py-1 bg-rose-50 text-rose-600 text-[10px] font-bold rounded-lg border border-rose-100">
                      {a}
                    </span>
                  )) : <span className="text-sm text-slate-400 italic">None reported</span>}
                </div>
              </div>
              
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{t.chronicConditions}</p>
                <div className="flex flex-wrap gap-2">
                  {profile?.chronicConditions.length ? profile.chronicConditions.map(c => (
                    <span key={c} className="px-2 py-1 bg-amber-50 text-amber-600 text-[10px] font-bold rounded-lg border border-amber-100">
                      {c}
                    </span>
                  )) : <span className="text-sm text-slate-400 italic">None reported</span>}
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-bold text-slate-900">{t.vaultIntegrity}</p>
                  <span className="text-xs font-bold text-teal-600">100%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-teal-600 h-full w-full" />
                </div>
              </div>
            </div>
          </section>

          {/* Quick Action */}
          <section className="bg-slate-900 rounded-3xl p-8 text-white">
            <h3 className="font-bold mb-4">{t.emergencyAccess}</h3>
            <p className="text-xs text-slate-400 mb-6">
              In case of emergency, this device contains your critical medical history. Hand it to a clinician.
            </p>
            <button className="w-full py-3 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition-all flex items-center justify-center gap-2">
              <ShieldCheck size={18} />
              {t.emergencyProfile}
            </button>
          </section>
        </div>
      </div>

      {/* Record Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <header className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-teal-600 rounded-xl flex items-center justify-center text-white">
                  <FileText size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-xl text-slate-900">{selectedRecord.title}</h3>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                    {selectedRecord.type.replace('_', ' ')} • {format(new Date(selectedRecord.date), 'MMMM dd, yyyy')}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedRecord(null)}
                className="w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors"
              >
                <X size={20} />
              </button>
            </header>
            
            <div className="flex-1 overflow-y-auto p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Source</p>
                  <p className="text-sm font-bold text-slate-900">{selectedRecord.source}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Created At</p>
                  <p className="text-sm font-bold text-slate-900">{format(new Date(selectedRecord.createdAt), 'MMM dd, HH:mm')}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Security</p>
                  <div className="flex items-center gap-1.5 text-teal-600 text-sm font-bold">
                    <ShieldCheck size={14} />
                    Vaulted
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                    <Clock size={16} className="text-teal-600" />
                    Extracted Content
                  </h4>
                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 text-slate-700 text-sm leading-relaxed whitespace-pre-wrap font-mono">
                    {selectedRecord.content}
                  </div>
                </div>

                {selectedRecord.tags.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 mb-2">Semantic Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedRecord.tags.map(tag => (
                        <span key={tag} className="px-3 py-1 bg-teal-50 text-teal-700 text-[10px] font-bold rounded-full border border-teal-100">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <footer className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button 
                onClick={() => setSelectedRecord(null)}
                className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition-all"
              >
                Close
              </button>
              <button className="px-6 py-2.5 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 transition-all">
                Export Record
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
