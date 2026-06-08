/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { db } from './lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { LanguageProvider, useTranslation, SupportedLanguage } from './components/TranslationSystem';
import VoiceAnnouncement from './components/VoiceAnnouncement';
import ReceptionPanel from './components/ReceptionPanel';
import DoctorPanel from './components/DoctorPanel';
import TVScreen from './components/TVScreen';
import PatientCheck from './components/PatientCheck';
import ReportsScreen from './components/ReportsScreen';
import SettingsPanel from './components/SettingsPanel';
import { 
  HeartPulse, ShieldCheck, Tv, ClipboardList, Stethoscope, 
  Users, BarChart3, Settings, Bell, Globe, Sparkles, Menu 
} from 'lucide-react';

interface ToastNotify {
  id: string;
  title: string;
  body: string;
}

function MainApplicationShell() {
  const { translate, language, setLanguage, isRtl } = useTranslation();
  const [activeTab, setActiveTab] = useState<'reception' | 'doctor' | 'tv' | 'patient' | 'analytics' | 'settings'>('reception');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Theme state
  const [theme, setTheme] = useState<'teal' | 'dark' | 'luxury' | 'light'>('teal');
  const [hospitalName, setHospitalName] = useState('Emerald General Hospital');
  const [hospitalPrefix, setHospitalPrefix] = useState('MED');

  // Alarm/Live notifications stack
  const [toasts, setToasts] = useState<ToastNotify[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "config"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.hospitalName) setHospitalName(data.hospitalName);
        if (data.tokenPrefix) setHospitalPrefix(data.tokenPrefix);
        if (data.displayTheme) setTheme(data.displayTheme);
      }
    });
    return () => unsub();
  }, []);

  const handleNotify = (title: string, body: string) => {
    const id = Math.random().toString(36).substring(7);
    setToasts(prev => [...prev, { id, title, body }]);
    
    // Auto erase toast after 5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  // Setup theme-specific class variables
  const getThemeClasses = () => {
    switch (theme) {
      case 'dark':
        return {
          bg: "bg-[#090d16] text-slate-100",
          sidebar: "bg-slate-900 border-slate-800",
          header: "bg-slate-900/60 border-slate-800/80",
          card: "bg-slate-900/40 border-slate-800",
          accentColor: "text-slate-400 border-slate-500",
          primaryBtn: "bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-750",
          gradientText: "bg-gradient-to-r from-slate-200 via-slate-400 to-slate-200"
        };
      case 'luxury':
        return {
          bg: "bg-[#100e0b] text-slate-100",
          sidebar: "bg-[#1a1512] border-[#2c231a]",
          header: "bg-[#1a1512]/70 border-[#2c231a]",
          card: "bg-[#221c17]/50 border-[#2c231a]",
          accentColor: "text-amber-400 border-amber-500",
          primaryBtn: "bg-amber-600 hover:bg-amber-500 text-black border-amber-600",
          gradientText: "bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-100"
        };
      case 'light':
        return {
          bg: "bg-slate-50 text-slate-800",
          sidebar: "bg-white border-slate-200",
          header: "bg-white/70 border-slate-200 backdrop-blur",
          card: "bg-white border-slate-200 shadow-sm",
          accentColor: "text-emerald-600 border-emerald-500",
          primaryBtn: "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-600",
          gradientText: "bg-gradient-to-r from-slate-900 to-emerald-850"
        };
      case 'teal':
      default:
        return {
          bg: "bg-slate-950 text-slate-200",
          sidebar: "bg-slate-900 border-slate-800",
          header: "bg-slate-900/50 border-slate-800",
          card: "bg-slate-900/40 border-slate-800",
          accentColor: "text-teal-400 border-teal-500",
          primaryBtn: "bg-teal-500 hover:bg-teal-400 text-slate-950 border-teal-400 font-bold shadow-[0_0_20px_rgba(20,184,166,0.3)]",
          gradientText: "bg-gradient-to-r from-white via-slate-200 to-teal-400"
        };
    }
  };

  const currentStyle = getThemeClasses();

  const tabsList = [
    { id: 'reception', label: translate('reception'), icon: ClipboardList },
    { id: 'doctor', label: translate('doctorRoom'), icon: Stethoscope },
    { id: 'patient', label: translate('pwaCheck'), icon: Users },
    { id: 'analytics', label: translate('reports'), icon: BarChart3 },
    { id: 'settings', label: translate('settings'), icon: Settings }
  ] as const;

  return (
    <div className={`flex h-screen w-full select-none overflow-hidden ${currentStyle.bg} transition-all duration-300 font-sans`}>
      
      {/* 1. Sidebar Navigation (Left Pane) */}
      {activeTab !== 'tv' && (
        <aside className={`
          fixed inset-y-0 left-0 z-40 w-64 ${currentStyle.sidebar} border-r flex flex-col transition-transform duration-300
          md:static md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(20,184,166,0.5)]">
                <div className="w-4 h-4 bg-white rounded-sm rotate-45"></div>
              </div>
              <h1 className="text-xl font-bold tracking-tight text-white font-sans">SmartPulse <span className="text-teal-400 font-light italic">AI</span></h1>
            </div>
            
            {/* Mobile close sidebar */}
            <button 
              onClick={() => setSidebarOpen(false)}
              className="md:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5"
            >
              ✕
            </button>
          </div>

          <nav className="flex-1 px-4 space-y-1.5 mt-4 overflow-y-auto">
            {tabsList.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSidebarOpen(false);
                    handleNotify("Tab Switched", `Accessing ${tab.label}`);
                  }}
                  className={`w-full text-left transition-all flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-semibold cursor-pointer ${
                    isActive 
                      ? "bg-teal-500/10 border-l-2 border-teal-500 text-teal-400 font-bold"
                      : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-teal-400' : 'text-slate-500'}`} />
                  {tab.label}
                </button>
              );
            })}
            
            <button
              onClick={() => {
                setActiveTab('tv');
                setSidebarOpen(false);
              }}
              className={`w-full text-left transition-all flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-semibold cursor-pointer ${
                activeTab === 'tv'
                  ? "bg-teal-500/10 border-l-2 border-teal-500 text-teal-400 font-bold"
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
              }`}
            >
              <Tv className="w-4 h-4 text-slate-500" />
              {translate('tvDisplay')}
            </button>
          </nav>

          <div className="p-4">
            <div className="bg-slate-800/35 rounded-xl p-4 border border-slate-700/50">
              <div className="text-[10px] uppercase tracking-widest text-slate-550 mb-2">Voice System</div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-emerald-400 flex items-center gap-1.5 font-bold">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span> Ready
                </span>
                <span className="text-[10px] text-slate-500">EN | AR | BN</span>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* 2. Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        
        {activeTab === 'tv' ? (
          <div className="flex-1 overflow-y-auto relative">
            <div className="absolute top-4 right-4 z-50 flex gap-2">
              <button
                onClick={() => setActiveTab('reception')}
                className="bg-slate-900/90 text-slate-200 hover:bg-slate-800 border border-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold shadow-2xl flex items-center gap-2 cursor-pointer transition-all"
              >
                ← Back to Reception
              </button>
            </div>
            <TVScreen hospitalName={hospitalName} hospitalPrefix={hospitalPrefix} />
          </div>
        ) : (
          <>
            {/* Header / Topbar */}
            <header className={`h-16 border-b ${currentStyle.header} flex items-center justify-between px-6 bg-slate-900/50 backdrop-blur-md`}>
              <div className="flex items-center gap-6">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="md:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5"
                >
                  <Menu className="w-5 h-5" />
                </button>

                <div className="text-xs text-slate-400 flex items-center gap-2 font-medium">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                  <span className="hidden sm:inline">Cloud Sync Active</span>
                </div>
                <div className="h-4 w-px bg-slate-850 hidden sm:inline"></div>
                <div className="text-xs text-slate-350">
                  Hospital: <span className="font-semibold text-white">{hospitalName}</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {/* Languages selectors */}
                <div className="flex bg-slate-800 rounded-lg p-0.5 border border-slate-700/40">
                  {[
                    { code: 'en', label: 'English' },
                    { code: 'ar', label: 'العربية' },
                    { code: 'bn', label: 'বাংলা' }
                  ].map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => setLanguage(lang.code as SupportedLanguage)}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                        language === lang.code
                          ? "bg-slate-700 text-white"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {lang.code === 'en' ? 'EN' : lang.code === 'ar' ? 'عربي' : 'বাংলা'}
                    </button>
                  ))}
                </div>
                
                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-teal-400">
                  <Sparkles className="w-4 h-4 animate-pulse" />
                </div>
              </div>
            </header>

            {/* Content box */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              <VoiceAnnouncement />

              <div className="min-h-[450px]">
                {activeTab === 'reception' && (
                  <ReceptionPanel onNotify={handleNotify} hospitalPrefix={hospitalPrefix} />
                )}
                {activeTab === 'doctor' && (
                  <DoctorPanel onNotify={handleNotify} hospitalPrefix={hospitalPrefix} />
                )}
                {activeTab === 'patient' && (
                  <PatientCheck hospitalPrefix={hospitalPrefix} />
                )}
                {activeTab === 'analytics' && (
                  <ReportsScreen />
                )}
                {activeTab === 'settings' && (
                  <SettingsPanel 
                    onNotify={handleNotify} 
                    currentTheme={theme} 
                    setTheme={setTheme} 
                  />
                )}
              </div>
            </div>

            {/* Bottom Ticker */}
            <footer className="h-10 bg-slate-900 border-t border-slate-800 flex items-center px-6 gap-6 overflow-hidden flex-shrink-0">
              <div className="bg-teal-500/20 text-teal-400 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-tighter">AI Predictor</div>
              <div className="flex-1 text-[11px] text-slate-400 italic truncate">
                Current peak hour detected. Estimated wait for G-series is increasing. Suggested shift: add 1 medical assistant to Pediatrics.
              </div>
              <div className="text-[11px] text-slate-500 flex items-center gap-4 hidden md:flex">
                <span>System v2.4.0</span>
                <span className="text-slate-700 text-lg">•</span>
                <span>Server Latency: 14ms</span>
              </div>
            </footer>
          </>
        )}
      </main>

      {/* 3. Live Layer Toast Alerts System */}
      <div className={`fixed bottom-6 ${isRtl ? 'left-6' : 'right-6'} z-50 space-y-3 pointer-events-none max-w-sm w-full px-4 sm:px-0`}>
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl bg-slate-950/95 border border-teal-500/30 text-white shadow-2xl animate-fade-in shadow-teal-500/5`}
          >
            <div className="mt-0.5 bg-teal-500/10 p-1 rounded-lg border border-teal-500/20 text-teal-400">
              <Bell className="w-4 h-4 animate-bounce" />
            </div>
            <div className="space-y-1">
              <h5 className="text-xs font-bold font-sans text-white leading-tight">{toast.title}</h5>
              <p className="text-[11px] text-slate-400 font-sans leading-relaxed">{toast.body}</p>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <MainApplicationShell />
    </LanguageProvider>
  );
}
