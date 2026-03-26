import { useEffect, useState } from 'react';
import { getAllRecords, getProfile } from '../lib/db';
import { MedicalRecord, UserProfile } from '../types';
import { format } from 'date-fns';
import { Activity, Calendar, MapPin, FileText, X, ShieldCheck, Clock, ClipboardList, Loader2, Download, Share2 } from 'lucide-react';
import { useTranslation } from '../lib/translations';
import { generateClinicianBrief } from '../lib/ai';
import Markdown from 'react-markdown';

export default function HealthTimeline() {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const { t } = useTranslation(profile?.language || 'en');
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
  const [brief, setBrief] = useState<string | null>(null);
  const [generatingBrief, setGeneratingBrief] = useState(false);
  const [showBriefModal, setShowBriefModal] = useState(false);

  useEffect(() => {
    async function load() {
      const [data, p] = await Promise.all([getAllRecords(), getProfile()]);
      setRecords(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setProfile(p || null);
      setLoading(false);
    }
    load();
  }, []);

  const handleGenerateBrief = async () => {
    setGeneratingBrief(true);
    try {
      const result = await generateClinicianBrief();
      setBrief(result);
      setShowBriefModal(true);
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingBrief(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">{t.reconstructingTimeline}</p>
      </div>
    </div>
  );

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 mb-2">{t.healthTimeline}</h2>
          <p className="text-slate-500">{t.chronologicalView}</p>
        </div>
        
        {records.length > 0 && (
          <button 
            onClick={handleGenerateBrief}
            disabled={generatingBrief}
            className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 disabled:opacity-50"
          >
            {generatingBrief ? <Loader2 size={18} className="animate-spin" /> : <ClipboardList size={18} />}
            {t.generateBrief}
          </button>
        )}
      </header>

      <div className="relative space-y-12 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
        {records.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-300">
            <p className="text-slate-500 font-medium">{t.noEvents}</p>
          </div>
        ) : (
          records.map((record) => (
            <div key={record.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              {/* Icon */}
              <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-100 group-[.is-active]:bg-teal-600 text-slate-500 group-[.is-active]:text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                <Activity size={18} />
              </div>
              {/* Card */}
              <div 
                onClick={() => setSelectedRecord(record)}
                className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-6 rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md hover:border-teal-300 transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between space-x-2 mb-2">
                  <div className="font-bold text-slate-900">{record.title}</div>
                  <time className="font-mono text-[10px] font-bold text-teal-600 uppercase tracking-widest">
                    {format(new Date(record.date), 'MMM yyyy')}
                  </time>
                </div>
                <div className="text-slate-500 text-sm mb-4 line-clamp-2 leading-relaxed">
                  {record.content.slice(0, 150)}...
                </div>
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <Calendar size={12} />
                    {format(new Date(record.date), 'dd MMM')}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <MapPin size={12} />
                    {record.source}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <FileText size={12} />
                    {record.type.replace('_', ' ')}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Clinician Brief Modal */}
      {showBriefModal && brief && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <header className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                  <ClipboardList size={24} className="text-teal-400" />
                </div>
                <div>
                  <h3 className="font-bold text-xl">{t.clinicianBrief}</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                    {t.briefDescription}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowBriefModal(false)}
                className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors"
              >
                <X size={20} />
              </button>
            </header>
            
            <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
              <div className="bg-white p-10 rounded-2xl border border-slate-200 shadow-sm max-w-3xl mx-auto">
                <div className="flex justify-between items-start mb-10 pb-6 border-b border-slate-100">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900 mb-1">Clinician Briefing</h1>
                    <p className="text-sm text-slate-500">Generated on {format(new Date(), 'MMMM dd, yyyy')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Patient</p>
                    <p className="font-bold text-slate-900">{profile?.name || 'Anonymous'}</p>
                  </div>
                </div>

                <div className="prose prose-slate max-w-none prose-headings:text-slate-900 prose-headings:font-bold prose-p:text-slate-600 prose-p:leading-relaxed">
                  <Markdown>{brief}</Markdown>
                </div>

                <div className="mt-12 pt-6 border-t border-slate-100 flex items-center justify-between">
                  <p className="text-[10px] text-slate-400 italic">
                    This brief was generated by AI based on local medical vault records. For clinical use only.
                  </p>
                  <div className="flex items-center gap-1 text-teal-600 font-bold text-xs">
                    <ShieldCheck size={14} />
                    Verified Local Context
                  </div>
                </div>
              </div>
            </div>

            <footer className="p-6 border-t border-slate-100 bg-white flex justify-end gap-3">
              <button 
                onClick={() => setShowBriefModal(false)}
                className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition-all"
              >
                {t.close}
              </button>
              <button className="px-6 py-2.5 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 transition-all flex items-center gap-2">
                <Download size={18} />
                Export PDF
              </button>
              <button className="px-6 py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all flex items-center gap-2">
                <Share2 size={18} />
                Secure Share
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* Record Detail Modal (Shared Pattern) */}
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
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t.source}</p>
                  <p className="text-sm font-bold text-slate-900">{selectedRecord.source}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t.createdAt}</p>
                  <p className="text-sm font-bold text-slate-900">{format(new Date(selectedRecord.createdAt), 'MMM dd, HH:mm')}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t.security}</p>
                  <div className="flex items-center gap-1.5 text-teal-600 text-sm font-bold">
                    <ShieldCheck size={14} />
                    {t.vaulted}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                    <Clock size={16} className="text-teal-600" />
                    {t.extractedContent}
                  </h4>
                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 text-slate-700 text-sm leading-relaxed whitespace-pre-wrap font-mono">
                    {selectedRecord.content}
                  </div>
                </div>
              </div>
            </div>

            <footer className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button 
                onClick={() => setSelectedRecord(null)}
                className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition-all"
              >
                {t.close}
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
