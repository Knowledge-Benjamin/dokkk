import { useState, useEffect } from 'react';
import { LayoutDashboard, MessageSquare, FileUp, Settings as SettingsIcon, Activity, Shield, User } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { getProfile } from '../lib/db';
import { UserProfile } from '../types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    async function load() {
      const p = await getProfile();
      setProfile(p || null);
    }
    load();
  }, []);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'chat', label: 'Medical Brain', icon: MessageSquare },
    { id: 'upload', label: 'Ingestion', icon: FileUp },
    { id: 'timeline', label: 'Timeline', icon: Activity },
    { id: 'settings', label: 'Vault Settings', icon: SettingsIcon },
  ];

  return (
    <div className="w-64 h-screen bg-white border-r border-slate-200 flex flex-col p-4">
      <div className="flex items-center gap-3 mb-10 px-2">
        <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-teal-200">
          <Activity size={24} />
        </div>
        <div>
          <h1 className="font-bold text-lg text-slate-900 leading-tight">PMI Brain</h1>
          <p className="text-[10px] text-teal-600 font-bold tracking-widest uppercase">Enterprise v2.0</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group",
              activeTab === tab.id 
                ? "bg-teal-600 text-white shadow-lg shadow-teal-100" 
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <tab.icon size={20} className={cn(
              "transition-colors",
              activeTab === tab.id ? "text-white" : "text-slate-400 group-hover:text-slate-600"
            )} />
            <span className="font-bold text-sm tracking-tight">{tab.label}</span>
          </button>
        ))}
      </nav>

      <div className="mt-auto p-4 bg-slate-50 rounded-2xl border border-slate-100">
        {profile && (
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-200">
            <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center text-teal-600">
              <User size={16} />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-900 truncate">{profile.name}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Patient</p>
            </div>
          </div>
        )}
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
          <Shield size={12} className="text-teal-600" />
          Security Status
        </div>
        <p className="text-xs text-slate-600 font-medium">AES-256 Active</p>
        <p className="text-[10px] text-slate-400">Local Storage Only</p>
      </div>
    </div>
  );
}
