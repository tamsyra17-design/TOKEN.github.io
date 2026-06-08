/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, collection, onSnapshot, deleteDoc } from 'firebase/firestore';
import { Settings as SettingsType, Doctor } from '../types';
import { Settings, Save, ShieldAlert, Sliders, BellDot, HeartPulse, RefreshCw, Stethoscope, Plus, Trash2, UserPlus } from 'lucide-react';
import { useTranslation } from './TranslationSystem';

interface SettingsPanelProps {
  onNotify: (title: string, body: string) => void;
  currentTheme: string;
  setTheme: (theme: any) => void;
}

export default function SettingsPanel({ onNotify, currentTheme, setTheme }: SettingsPanelProps) {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<SettingsType>({
    hospitalName: "Emerald General Hospital",
    logo: "",
    tokenPrefix: "MED",
    tokenResetTime: "00:00 AM",
    languages: ["en", "ar", "bn"],
    voiceEnabled: true,
    whatsappEnabled: true,
    qrEnabled: true,
    displayTheme: "teal"
  });

  const { translate } = useTranslation();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [newDocName, setNewDocName] = useState('');
  const [newDocSpeciality, setNewDocSpeciality] = useState('');
  const [newDocRoom, setNewDocRoom] = useState('');
  const [newDocStart, setNewDocStart] = useState('09:00 AM');
  const [newDocEnd, setNewDocEnd] = useState('05:00 PM');
  const [newDocAvgTime, setNewDocAvgTime] = useState(10);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "doctors"), (snap) => {
      const list: Doctor[] = [];
      snap.forEach((d) => {
        list.push(d.data() as Doctor);
      });
      setDoctors(list);
    });
    return () => unsub();
  }, []);

  const handleAddDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocName.trim() || !newDocSpeciality.trim() || !newDocRoom.trim()) {
      onNotify("Missing Information", "Please fill in Name, Speciality, and Room Number.");
      return;
    }

    setLoading(true);
    try {
      const formattedName = newDocName.trim();
      const cleanId = 'doc_' + Date.now().toString();
      
      const newDoctor: Doctor = {
        doctorId: cleanId,
        doctorName: formattedName.startsWith("Dr. ") ? formattedName : `Dr. ${formattedName}`,
        speciality: newDocSpeciality.trim(),
        roomNumber: formattedName.toLowerCase().includes("room") ? newDocRoom.trim() : `${newDocRoom.trim()}`,
        photo: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
        activeStatus: "active",
        onlineStatus: "online",
        chamberStartTime: newDocStart,
        chamberEndTime: newDocEnd,
        averageConsultationTime: Number(newDocAvgTime) || 10,
        totalPatientsToday: 0
      };

      await setDoc(doc(db, "doctors", cleanId), newDoctor);
      onNotify("Doctor Registered", `${newDoctor.doctorName} has been enrolled successfully!`);
      
      setNewDocName('');
      setNewDocSpeciality('');
      setNewDocRoom('');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "doctors");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDoctor = async (doctorId: string, doctorName: string) => {
    try {
      await deleteDoc(doc(db, "doctors", doctorId));
      onNotify("Doctor Deleted", `${doctorName} has been deleted successfully.`);
      if (deleteConfirmId === doctorId) {
        setDeleteConfirmId(null);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `doctors/${doctorId}`);
    }
  };

  useEffect(() => {
    // Read current settings document from firestore
    const fetchSettings = async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "config"));
        if (snap.exists()) {
          const data = snap.data() as SettingsType;
          setConfig(data);
          if (data.displayTheme) {
            setTheme(data.displayTheme);
          }
        } else {
          // Setup initial configuration automatically if missing (bootstrapping)
          await setDoc(doc(db, "settings", "config"), config);
        }
      } catch (err) {
        console.warn("Using offline state cache for settings:", err);
      }
    };
    fetchSettings();
  }, []);

  const handleUpdate = async (updatedFields: Partial<SettingsType>) => {
    const nextConfig = { ...config, ...updatedFields };
    setConfig(nextConfig);
    if (updatedFields.displayTheme) {
      setTheme(updatedFields.displayTheme);
    }
  };

  const handleSaveConfig = async () => {
    setLoading(true);
    try {
      await setDoc(doc(db, "settings", "config"), config);
      onNotify("Settings Configured Successfully", "Hospital settings dynamically synchronized with all TV displays and clinics");
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "settings/config");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Settings Header */}
      <div className="flex items-center justify-between bg-slate-900/40 border border-teal-500/10 p-6 rounded-2xl backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-teal-500/10 rounded-xl border border-teal-500/20 text-teal-400">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100 font-sans tracking-tight">
              Hospital Configuration Centre
            </h2>
            <p className="text-sm text-slate-400 font-mono">
              Role: System Administrator & Reception Supervisor
            </p>
          </div>
        </div>
        <button
          onClick={handleSaveConfig}
          disabled={loading}
          className="flex items-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-500 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg text-sm active:scale-95 transition-all hover:brightness-110 disabled:opacity-50"
        >
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Global Config
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Core Identity Form */}
        <div className="bg-slate-900/30 border border-teal-500/10 p-6 rounded-2xl backdrop-blur-md space-y-4">
          <div className="flex items-center gap-2 text-teal-400 border-b border-white/5 pb-3">
            <HeartPulse className="w-5 h-5" />
            <h3 className="font-semibold text-slate-200">Clinical Identity</h3>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-slate-400 font-mono block">HOSPITAL NAME</label>
            <input
              type="text"
              value={config.hospitalName}
              onChange={(e) => handleUpdate({ hospitalName: e.target.value })}
              className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-all font-sans text-sm"
              placeholder="e.g. Emerald General Hospital"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs text-slate-400 font-mono block">TOKEN PREFIX PREFIX</label>
              <input
                type="text"
                value={config.tokenPrefix}
                maxLength={4}
                onChange={(e) => handleUpdate({ tokenPrefix: e.target.value.toUpperCase() })}
                className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 focus:outline-none focus:border-teal-500 transition-all font-mono text-sm"
                placeholder="Prefix"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-slate-400 font-mono block">RESET HOUR</label>
              <input
                type="text"
                value={config.tokenResetTime}
                onChange={(e) => handleUpdate({ tokenResetTime: e.target.value })}
                className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 focus:outline-none focus:border-teal-500 transition-all font-mono text-sm"
              />
            </div>
          </div>
        </div>

        {/* Feature Switches & Integrations */}
        <div className="bg-slate-900/30 border border-teal-500/10 p-6 rounded-2xl backdrop-blur-md space-y-5">
          <div className="flex items-center gap-2 text-cyan-400 border-b border-white/5 pb-3">
            <Sliders className="w-5 h-5" />
            <h3 className="font-semibold text-slate-200">Integration Gateways</h3>
          </div>

          {/* Voice Announcements Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-semibold text-slate-200 block">Vocal Broadcasting</span>
              <span className="text-xs text-slate-400 block">Synthesize speaker announcements automatically</span>
            </div>
            <input
              type="checkbox"
              checked={config.voiceEnabled}
              onChange={(e) => handleUpdate({ voiceEnabled: e.target.checked })}
              className="w-10 h-5 bg-slate-800 checked:bg-teal-500 rounded-full cursor-pointer focus:outline-none accent-teal-500"
            />
          </div>

          {/* WhatsApp Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-semibold text-slate-200 block">WhatsApp Notification SMS</span>
              <span className="text-xs text-slate-400 block">Push text warnings on token creation/triage turn</span>
            </div>
            <input
              type="checkbox"
              checked={config.whatsappEnabled}
              onChange={(e) => handleUpdate({ whatsappEnabled: e.target.checked })}
              className="w-10 h-5 bg-slate-800 checked:bg-teal-500 rounded-full cursor-pointer focus:outline-none accent-teal-500"
            />
          </div>

          {/* QR Scan Tracking */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-semibold text-slate-200 block">QR Patient Tracker URL</span>
              <span className="text-xs text-slate-400 block">Generate dynamic checking links on receipt</span>
            </div>
            <input
              type="checkbox"
              checked={config.qrEnabled}
              onChange={(e) => handleUpdate({ qrEnabled: e.target.checked })}
              className="w-10 h-5 bg-slate-800 checked:bg-teal-500 rounded-full cursor-pointer focus:outline-none accent-teal-500"
            />
          </div>
        </div>

        {/* CSS Display Theme Switcher */}
        <div className="bg-slate-900/30 border border-teal-500/10 p-6 rounded-2xl backdrop-blur-md md:col-span-2 space-y-4">
          <div className="flex items-center gap-2 text-emerald-400 border-b border-white/5 pb-3">
            <BellDot className="w-5 h-5" />
            <h3 className="font-semibold text-slate-200">System Dashboard Styling</h3>
          </div>

          <div>
            <label className="text-xs text-slate-400 font-mono block mb-3">SELECT INTERFACE CHROMATIC PRESET</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { id: 'teal', label: 'Ethereal Teal', class: 'border-teal-500/50 bg-teal-900/20 text-teal-300' },
                { id: 'dark', label: 'Cyber Obsidian', class: 'border-slate-500/50 bg-slate-900/30 text-slate-300' },
                { id: 'luxury', label: 'Golden Orchid', class: 'border-amber-500/50 bg-amber-900/20 text-amber-300' },
                { id: 'light', label: 'Hospital Crisp', class: 'border-emerald-400/50 bg-white text-slate-800' }
              ].map((style) => (
                <button
                  key={style.id}
                  onClick={() => handleUpdate({ displayTheme: style.id as any })}
                  className={`p-4 rounded-xl border text-center text-xs font-semibold cursor-pointer transition-all duration-300 ${
                    config.displayTheme === style.id 
                    ? "border-teal-400 scale-105 shadow-md shadow-teal-500/10" 
                    : "border-slate-700/60 hover:border-slate-600 bg-slate-900/10"
                  } ${style.class}`}
                >
                  {style.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Doctor & Clinic Management Section */}
      <div className="bg-slate-900/30 border border-teal-500/10 p-6 rounded-2xl backdrop-blur-md space-y-6">
        <div className="flex items-center gap-3 text-teal-400 border-b border-white/5 pb-3">
          <Stethoscope className="w-5 h-5" />
          <div>
            <h3 className="font-semibold text-slate-100 font-sans tracking-tight">
              Doctor & Clinic Management / ডাক্তার ও চেম্বার ব্যবস্থাপনা
            </h3>
            <p className="text-xs text-slate-400 font-sans">
              Register new doctor profiles and allot consultation chambers instantly
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* 1. Register Doctor Form */}
          <form onSubmit={handleAddDoctor} className="lg:col-span-5 bg-slate-950/45 p-5 rounded-xl border border-white/5 space-y-4">
            <h4 className="text-xs font-bold text-teal-400 font-mono tracking-wider uppercase mb-2">
              ADD NEW DOCTOR / নতুন ডাক্তার যুক্ত করুন
            </h4>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-sans block">
                Doctor's Name / ডাক্তারের নাম <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={newDocName}
                onChange={(e) => setNewDocName(e.target.value)}
                placeholder="e.g. Dr. Rafiqul Islam"
                className="w-full bg-slate-900/60 border border-slate-700/80 rounded-xl px-3.5 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-all font-sans text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-sans block">
                Department / Speciality / বিশেষজ্ঞ শাখা <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={newDocSpeciality}
                onChange={(e) => setNewDocSpeciality(e.target.value)}
                placeholder="e.g. Pediatrician, Cardiologist"
                className="w-full bg-slate-900/60 border border-slate-700/80 rounded-xl px-3.5 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-all font-sans text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 font-sans block">
                  Room No. / রুম নম্বর <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newDocRoom}
                  onChange={(e) => setNewDocRoom(e.target.value)}
                  placeholder="e.g. Room 104"
                  className="w-full bg-slate-900/60 border border-slate-700/80 rounded-xl px-3.5 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-all font-mono text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 font-sans block">
                  Avg Time / গড় সময় (Min)
                </label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={newDocAvgTime}
                  onChange={(e) => setNewDocAvgTime(Number(e.target.value))}
                  className="w-full bg-slate-900/60 border border-slate-700/80 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-teal-500 transition-all font-mono text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-mono block">START H. / শুরু</label>
                <input
                  type="text"
                  value={newDocStart}
                  onChange={(e) => setNewDocStart(e.target.value)}
                  placeholder="09:00 AM"
                  className="w-full bg-slate-900/60 border border-slate-700/80 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-teal-500 transition-all font-mono text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-mono block">END H. / শেষ</label>
                <input
                  type="text"
                  value={newDocEnd}
                  onChange={(e) => setNewDocEnd(e.target.value)}
                  placeholder="05:00 PM"
                  className="w-full bg-slate-900/60 border border-slate-700/80 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-teal-500 transition-all font-mono text-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 flex items-center justify-center gap-2 bg-teal-400 hover:bg-teal-300 text-slate-950 font-bold py-2.5 rounded-xl text-xs cursor-pointer shadow-lg active:scale-[0.98] transition-all disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4 text-slate-950" />
              Register Doctor / ডাক্তার যোগ করুন
            </button>
          </form>

          {/* 2. List of Registered Doctors */}
          <div className="lg:col-span-7 space-y-3">
            <h4 className="text-xs font-bold text-slate-400 font-mono tracking-wider uppercase">
              ACTIVE CLINICAL REGISTRY ({doctors.length}) / বর্তমান ডাক্তারদের তালিকা
            </h4>

            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {doctors.length === 0 ? (
                <div className="text-slate-500 text-xs italic p-8 text-center bg-slate-950/20 rounded-xl border border-dashed border-slate-800">
                  No doctor profiles registered yet. Use the left form to enrol doctor coordinates.
                </div>
              ) : (
                doctors.map((docItem) => (
                  <div 
                    key={docItem.doctorId} 
                    className="group flex items-center justify-between bg-slate-950/35 hover:bg-slate-900/30 border border-slate-800/80 p-3 rounded-xl transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <img 
                        src={docItem.photo} 
                        alt="doctor avatar" 
                        className="w-10 h-10 rounded-lg object-cover bg-slate-800"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <div className="font-semibold text-sm text-slate-200">
                          {docItem.doctorName}
                        </div>
                        <div className="text-xs text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                          <span className="text-teal-400 font-medium">{docItem.speciality}</span>
                          <span className="text-slate-600">•</span>
                          <span className="bg-slate-800 text-slate-350 font-mono text-[10px] px-1.5 py-0.5 rounded">
                            {docItem.roomNumber}
                          </span>
                          <span className="text-slate-600">•</span>
                          <span className="font-mono text-[10px]">
                            {docItem.chamberStartTime}-{docItem.chamberEndTime}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {deleteConfirmId === docItem.doctorId ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleDeleteDoctor(docItem.doctorId, docItem.doctorName)}
                            className="bg-red-500 text-white font-bold text-[10px] uppercase tracking-wider px-2 py-1 rounded hover:bg-red-600 transition-colors cursor-pointer"
                          >
                            Delete
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(null)}
                            className="bg-slate-850 text-slate-400 hover:text-slate-200 text-[10px] px-2 py-1 rounded cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(docItem.doctorId)}
                          title="Delete doctor"
                          className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg cursor-pointer transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Security Caution Disclaimer */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex gap-3 text-amber-400 max-w-full">
        <ShieldAlert className="w-5 h-5 flex-shrink-0" />
        <div className="text-xs leading-relaxed font-sans">
          <span className="font-semibold block">Regulatory Clinical Compliance Lock</span>
          Modifying global constants adjusts operational limits immediately. Ensure all active TV queues are in steady operational phase before changing configuration parameters.
        </div>
      </div>
    </div>
  );
}
