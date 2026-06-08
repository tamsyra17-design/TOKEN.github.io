/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, doc, setDoc, query, onSnapshot, orderBy, where, getDocs, writeBatch } from 'firebase/firestore';
import { Token, Doctor } from '../types';
import { useTranslation } from './TranslationSystem';
import QRGenerator from './QRGenerator';
import { 
  Users, UserPlus, HeartPulse, Stethoscope, Clock, ShieldAlert,
  SlidersHorizontal, CheckCircle, Search, QrCode, Phone, Languages, Send
} from 'lucide-react';

interface ReceptionPanelProps {
  onNotify: (title: string, body: string) => void;
  hospitalPrefix: string;
}

export default function ReceptionPanel({ onNotify, hospitalPrefix = "MED" }: ReceptionPanelProps) {
  const { translate, language } = useTranslation();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form states
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [priorityFlag, setPriorityFlag] = useState<'normal' | 'emergency'>('normal');
  const [patientPreferredLang, setPatientPreferredLang] = useState('en');

  // Scanner Display State
  const [activeQRToken, setActiveQRToken] = useState<Token | null>(null);

  // Seed standard clinic doctors if none exist to enable immediate out-of-the-box system demo
  useEffect(() => {
    const seedDoctorsIfEmpty = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "doctors"));
        if (querySnapshot.empty) {
          const defaultDoctors: Doctor[] = [
            {
              doctorId: "doc_ahmed",
              doctorName: "Dr. Ahmed Al-Farsi",
              speciality: "Cardiologist (Consultant)",
              roomNumber: "Room 105",
              photo: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
              activeStatus: "active",
              onlineStatus: "online",
              chamberStartTime: "08:00 AM",
              chamberEndTime: "04:00 PM",
              averageConsultationTime: 10,
              totalPatientsToday: 0
            },
            {
              doctorId: "doc_saima",
              doctorName: "Dr. Saima Chowdhury",
              speciality: "Pediatrician (Chief)",
              roomNumber: "Room 202",
              photo: "https://images.unsplash.com/photo-1594824813573-246434de83fb?w=150&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
              activeStatus: "active",
              onlineStatus: "online",
              chamberStartTime: "09:00 AM",
              chamberEndTime: "05:00 PM",
              averageConsultationTime: 12,
              totalPatientsToday: 0
            },
            {
              doctorId: "doc_sarah",
              doctorName: "Dr. Sarah Green",
              speciality: "Internal Medicine Expert",
              roomNumber: "Room 101",
              photo: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
              activeStatus: "active",
              onlineStatus: "online",
              chamberStartTime: "10:00 AM",
              chamberEndTime: "06:00 PM",
              averageConsultationTime: 8,
              totalPatientsToday: 0
            }
          ];

          for (const docSpec of defaultDoctors) {
            await setDoc(doc(db, "doctors", docSpec.doctorId), docSpec);
          }
        }
      } catch (err) {
        console.warn("Using offline seeder mode:", err);
      }
    };
    seedDoctorsIfEmpty();
  }, []);

  // Fetch doctors and queue list in real-time
  useEffect(() => {
    const unsubDoctors = onSnapshot(collection(db, "doctors"), (snapshot) => {
      const list: Doctor[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as Doctor);
      });
      setDoctors(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "doctors");
    });

    const tokensQuery = query(collection(db, "tokens"), orderBy("createdAt", "desc"));
    const unsubTokens = onSnapshot(tokensQuery, (snapshot) => {
      const list: Token[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as Token);
      });
      setTokens(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "tokens");
    });

    return () => {
      unsubDoctors();
      unsubTokens();
    };
  }, []);

  // Sync and set default selectedDoctorId dynamically to avoid stale closure or out-of-sync states
  useEffect(() => {
    if (doctors.length > 0) {
      const isValid = doctors.some(d => d.doctorId === selectedDoctorId);
      if (!isValid) {
        setSelectedDoctorId(doctors[0].doctorId);
      }
    }
  }, [doctors, selectedDoctorId]);

  // Submit patient enrollment
  const handleSubmitToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim()) {
      onNotify("Missing Field", "Please enter the patient's full name to generate a token");
      return;
    }

    setLoading(true);
    try {
      let activeDocId = selectedDoctorId;
      if (!activeDocId && doctors.length > 0) {
        activeDocId = doctors[0].doctorId;
      }
      const selectedDoc = doctors.find(d => d.doctorId === activeDocId);
      if (!selectedDoc) throw new Error("Assigned Consultant of target clinic not found");

      // Calculate next daily token number sequence
      const dailySeqForDoctor = tokens.filter(t => t.doctorId === selectedDoc.doctorId).length + 1;
      const tokenId = `tkn_${Date.now()}`;
      
      const newToken: Token = {
        tokenId,
        tokenNumber: dailySeqForDoctor,
        patientName: patientName.trim(),
        patientPhone: patientPhone.trim() || undefined,
        doctorId: selectedDoc.doctorId,
        doctorName: selectedDoc.doctorName,
        status: "waiting",
        createdAt: new Date().toISOString(),
        priority: priorityFlag,
        language: patientPreferredLang,
        queuePosition: tokens.filter(t => t.doctorId === selectedDoc.doctorId && t.status === "waiting").length + 1
      };

      // Write token document
      await setDoc(doc(db, "tokens", tokenId), newToken);

      onNotify(
        `Token Generated: ${hospitalPrefix}-${dailySeqForDoctor}`,
        `${patientName} placed successfully in Dr. ${selectedDoc.doctorName.split(' ')[1]}'s Queue!`
      );

      // Fire WhatsApp notification payload server-side safely
      if (patientPhone.trim()) {
        try {
          await fetch('/api/whatsapp/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tokenNumber: `${hospitalPrefix}-${dailySeqForDoctor}`,
              patientName: patientName,
              patientPhone: patientPhone,
              doctorName: selectedDoc.doctorName,
              status: "waiting"
            })
          });
        } catch (smsErr) {
          console.warn("SMS integration request failed safely: ", smsErr);
        }
      }

      // Automatically pop up QR scanner for patient
      setActiveQRToken(newToken);

      // Clean form state fields
      setPatientName('');
      setPatientPhone('');
      setPriorityFlag('normal');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "tokens");
    } finally {
      setLoading(false);
    }
  };

  const handlePriorityToggle = async (tokenId: string, currentPriority: string) => {
    try {
      const nextPriority = currentPriority === 'emergency' ? 'normal' : 'emergency';
      await setDoc(doc(db, "tokens", tokenId), { priority: nextPriority }, { merge: true });
      onNotify("Priority Alert", `Successfully recalibrated triage status to: ${nextPriority.toUpperCase()}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `tokens/${tokenId}`);
    }
  };

  // Filter token outputs based on search
  const filteredTokens = tokens.filter(t => 
    t.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.tokenId.includes(searchQuery) ||
    (t.doctorName && t.doctorName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      {/* Registration Column */}
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-slate-900/40 backdrop-blur-md rounded-3xl p-6 border border-teal-500/10 shadow-xl">
          <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-5">
            <div className="p-2.5 bg-teal-500/10 rounded-xl text-teal-400 border border-teal-500/20">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 font-sans tracking-tight">
                {translate('registerNewToken')}
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Smart Hospital In-Take Panel
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmitToken} className="space-y-4">
            
            {/* Patient Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-300 font-semibold block uppercase">
                {translate('patientName')} *
              </label>
              <input
                type="text"
                required
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                className="w-full bg-slate-950/60 border border-slate-700/60 focus:border-teal-400 rounded-xl px-4 py-2.5 text-slate-100 font-sans text-sm focus:outline-none focus:ring-1 focus:ring-teal-400/30 transition-all placeholder-slate-600"
                placeholder="Full Name (John Doe)"
              />
            </div>

            {/* Patient Phone */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-300 font-semibold block uppercase flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-teal-400" />
                {translate('patientPhone')}
              </label>
              <input
                type="tel"
                value={patientPhone}
                onChange={(e) => setPatientPhone(e.target.value)}
                className="w-full bg-slate-950/60 border border-slate-700/60 focus:border-teal-400 rounded-xl px-4 py-2.5 text-slate-100 font-sans text-sm focus:outline-none focus:ring-1 focus:ring-teal-400/30 transition-all placeholder-slate-600"
                placeholder="+1 (555) 012-3456"
              />
            </div>

            {/* Select Doctor Specialist */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-300 font-semibold block uppercase flex items-center gap-2">
                <Stethoscope className="w-3.5 h-3.5 text-cyan-400" />
                {translate('selectDoctor')}
              </label>
              <select
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
                className="w-full bg-slate-950/60 border border-slate-700/60 focus:border-teal-400 rounded-xl px-4 py-2.5 text-slate-100 font-sans text-sm focus:outline-none focus:ring-1 focus:ring-teal-400/30 transition-all cursor-pointer"
              >
                {doctors.map((doc) => (
                  <option key={doc.doctorId} value={doc.doctorId} className="bg-slate-900 text-slate-200">
                    {doc.doctorName} ({doc.speciality})
                  </option>
                ))}
              </select>
            </div>

            {/* Select Triage Preference */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-300 font-semibold block uppercase flex items-center gap-2">
                <Languages className="w-3.5 h-3.5 text-emerald-400" />
                {translate('tokenLanguage')}
              </label>
              <select
                value={patientPreferredLang}
                onChange={(e) => setPatientPreferredLang(e.target.value)}
                className="w-full bg-slate-950/60 border border-slate-700/60 focus:border-teal-400 rounded-xl px-4 py-2.5 text-slate-100 font-sans text-sm focus:outline-none focus:ring-1 focus:ring-teal-400/30 transition-all cursor-pointer"
              >
                <option value="en">English (US)</option>
                <option value="ar">العربية (Arabic RTL)</option>
                <option value="bn">বাংলা (Bengali)</option>
              </select>
            </div>

            {/* Triage Priority Area */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-300 font-semibold block uppercase">
                {translate('triagePriority')}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPriorityFlag('normal')}
                  className={`py-2 px-3 text-xs font-bold font-sans rounded-xl border flex items-center justify-center cursor-pointer transition-all ${
                    priorityFlag === 'normal'
                      ? "bg-teal-500/10 border-teal-500 text-teal-400"
                      : "bg-slate-950/20 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  {translate('priorityNormal')}
                </button>
                <button
                  type="button"
                  onClick={() => setPriorityFlag('emergency')}
                  className={`py-2 px-3 text-xs font-bold font-sans rounded-xl border flex items-center justify-center cursor-pointer transition-all ${
                    priorityFlag === 'emergency'
                      ? "bg-rose-500/15 border-rose-500 text-rose-400 shadow-lg shadow-rose-500/10 animate-pulse"
                      : "bg-slate-950/20 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  {translate('priorityEmergency')}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 via-cyan-500 to-emerald-500 text-white font-bold text-sm py-3 px-5 rounded-xl cursor-pointer active:scale-98 transition-all shadow-lg hover:brightness-110"
            >
              {loading ? "Registering In-Take..." : translate('generateTokenBtn')}
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Live Active QR Card Drawer */}
        {activeQRToken && (
          <div className="relative group animate-fade-in">
            <button 
              onClick={() => setActiveQRToken(null)}
              className="absolute -top-1 -right-1 bg-slate-950 text-slate-400 hover:text-white rounded-full p-1 border border-slate-800 hover:scale-105 active:scale-95 transition-all text-xs font-mono"
            >
              ✕
            </button>
            <QRGenerator 
              tokenUrl={`${window.location.protocol}//${window.location.host}/?patientTrackingCode=${activeQRToken.tokenId}`}
              patientName={activeQRToken.patientName}
              tokenNumberString={`${hospitalPrefix}-${activeQRToken.tokenNumber}`}
            />
          </div>
        )}
      </div>

      {/* Registrations List Area */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Statistics Widgets Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900/30 border border-teal-500/10 p-4 rounded-2xl flex items-center gap-4">
            <div className="p-3 bg-teal-500/10 text-teal-400 rounded-xl border border-teal-500/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono text-slate-400 tracking-wider">Total Daily Registrations</span>
              <h4 className="text-xl font-bold text-slate-100">{tokens.length}</h4>
            </div>
          </div>

          <div className="bg-slate-900/30 border border-teal-500/10 p-4 rounded-2xl flex items-center gap-4">
            <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono text-slate-400 tracking-wider">Awaiting Consultation</span>
              <h4 className="text-xl font-bold text-slate-100">{tokens.filter(t => t.status === "waiting").length}</h4>
            </div>
          </div>

          <div className="bg-rose-500/5 border border-rose-500/20 p-4 rounded-2xl flex items-center gap-4">
            <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
              <ShieldAlert className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono text-rose-400 tracking-wider">Urgent Trauma Triage</span>
              <h4 className="text-xl font-bold text-slate-100 text-rose-400">
                {tokens.filter(t => t.priority === "emergency" && t.status !== "completed").length}
              </h4>
            </div>
          </div>
        </div>

        {/* Live Token Ledger */}
        <div className="bg-slate-900/40 backdrop-blur-md rounded-3xl p-6 border border-teal-500/10 shadow-xl space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
            <div>
              <h3 className="font-bold text-slate-100 font-sans tracking-tight">Today's Token Ledger</h3>
              <p className="text-xs text-slate-400">Real-time status synchronization mapping all clinic registers</p>
            </div>
            
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-950/60 border border-slate-800 focus:border-teal-500 rounded-xl px-4 py-2 text-xs text-slate-200 pl-10 focus:outline-none transition-all placeholder-slate-600 w-full md:w-60"
                placeholder="Search patient, doc, or token..."
              />
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            </div>
          </div>

          {/* Tokens Grid Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left font-sans text-xs text-slate-300">
              <thead>
                <tr className="border-b border-white/5 text-slate-400 text-[10px] uppercase tracking-wider font-mono">
                  <th className="py-3 px-2">Token #</th>
                  <th className="py-3 px-2">Patient Details</th>
                  <th className="py-3 px-2">Doctor Dept</th>
                  <th className="py-3 px-2">Urgency</th>
                  <th className="py-3 px-2">Clinical Status</th>
                  <th className="py-3 px-2 text-right">Triage Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTokens.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-slate-500 font-mono">
                      No matching records loaded on clinical register.
                    </td>
                  </tr>
                ) : (
                  filteredTokens.map((tok) => (
                    <tr key={tok.tokenId} className="border-b border-white/5 hover:bg-white/5 transition-all">
                      <td className="py-3 px-2 font-mono font-bold text-teal-400">
                        {hospitalPrefix}-{tok.tokenNumber}
                      </td>
                      <td className="py-3 px-2">
                        <span className="font-semibold text-slate-200 block">{tok.patientName}</span>
                        <span className="text-[10px] text-slate-500 font-mono uppercase">
                          Lang: {tok.language} {tok.patientPhone && `• ${tok.patientPhone}`}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <span className="text-slate-300 font-medium block">{tok.doctorName}</span>
                      </td>
                      <td className="py-3 px-2">
                        <button
                          onClick={() => handlePriorityToggle(tok.tokenId, tok.priority)}
                          className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[9px] cursor-pointer active:scale-95 transition-all ${
                            tok.priority === 'emergency'
                              ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {tok.priority === 'emergency' ? "Emergency" : "Standard"}
                        </button>
                      </td>
                      <td className="py-3 px-2">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-mono text-[10px] font-medium leading-tight ${
                          tok.status === 'waiting' ? "bg-cyan-500/10 text-cyan-400" :
                          tok.status === 'called' ? "bg-amber-500/10 text-amber-400 animate-pulse" :
                          tok.status === 'completed' ? "bg-emerald-500/10 text-emerald-400" :
                          "bg-slate-800 text-slate-500"
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${
                            tok.status === 'waiting' ? "bg-cyan-400" :
                            tok.status === 'called' ? "bg-amber-400" :
                            tok.status === 'completed' ? "bg-emerald-400" :
                            "bg-slate-500"
                          }`}></span>
                          {translate(`status${tok.status.charAt(0).toUpperCase() + tok.status.slice(1)}`)}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right space-x-2">
                        <button
                          onClick={() => setActiveQRToken(tok)}
                          className="p-1 px-2.5 rounded-md border border-slate-700 bg-slate-800/40 hover:bg-slate-800 text-slate-300 font-medium hover:text-white transition-all text-[10px] inline-flex items-center gap-1 cursor-pointer"
                        >
                          <QrCode className="w-3.5 h-3.5 text-cyan-400" />
                          View Receipt
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
