import { useEffect, useState } from 'react';
import { getAllRecords } from '../lib/db';
import { MedicalRecord } from '../types';
import { format } from 'date-fns';
import { Activity, Calendar, MapPin, FileText, X, ShieldCheck, Clock } from 'lucide-react';

export default function HealthTimeline() {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);

  useEffect(() => {
    async function load() {
      const data = await getAllRecords();
      setRecords(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Reconstructing Timeline...</p>
      </div>
    </div>
  );

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <header className="mb-12">
        <h2 className="text-3xl font-bold text-slate-900 mb-2">Health Timeline</h2>
        <p className="text-slate-500">A chronological view of your medical journey.</p>
      </header>

      <div className="relative space-y-12 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
        {records.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-300">
            <p className="text-slate-500 font-medium">No events to display in your timeline.</p>
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
              </div>
            </div>

            <footer className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button 
                onClick={() => setSelectedRecord(null)}
                className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition-all"
              >
                Close
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
