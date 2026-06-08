/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, doc, updateDoc, setDoc, onSnapshot, query, where, orderBy, writeBatch } from 'firebase/firestore';
import { Token, Doctor } from '../types';
import { useTranslation } from './TranslationSystem';
import { speakTokenAnnouncement } from './VoiceAnnouncement';
import { 
  Stethoscope, Play, Check, SkipForward, Megaphone, Brain, 
  Clock, AlertTriangle, ListOrdered, CheckCircle2, RefreshCw, Zap
} from 'lucide-react';

interface DoctorPanelProps {
  onNotify: (title: string, body: string) => void;
  hospitalPrefix: string;
}

export default function DoctorPanel({ onNotify, hospitalPrefix = "MED" }: DoctorPanelProps) {
  const { translate } = useTranslation();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDocId, setSelectedDocId] = useState('');
  const [tokens, setTokens] = useState<Token[]>([]);
  const [currentActiveToken, setCurrentActiveToken] = useState<Token | null>(null);
  
  // Gemini AI variables
  const [aiLoading, setAiLoading] = useState(false);
  const [aiReport, setAiReport] = useState<{
    predictedMinutes: number;
    confidenceScore: number;
    triageUrgency: string;
    smartDoctorTip: string;
    patientReassurance: string;
  } | null>(null);

  // Fetch doctors list
  useEffect(() => {
    const unsubDocs = onSnapshot(collection(db, "doctors"), (snapshot) => {
      const list: Doctor[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as Doctor);
      });
      setDoctors(list);
      // Select the first doctor as default if none selected
      if (list.length > 0 && !selectedDocId) {
        setSelectedDocId(list[0].doctorId);
      }
    });
    return () => unsubDocs();
  }, []);

  // Sync queues dynamically based on chosen doctor chamber
  useEffect(() => {
    if (!selectedDocId) return;

    const tokensQuery = query(
      collection(db, "tokens"),
      where("doctorId", "==", selectedDocId),
      orderBy("createdAt", "asc")
    );

    const unsubTokens = onSnapshot(tokensQuery, (snapshot) => {
      const list: Token[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as Token);
      });
      setTokens(list);

      // Extract the patient currently in 'called' status
      const active = list.find(t => t.status === "called");
      setCurrentActiveToken(active || null);
    });

    return () => unsubTokens();
  }, [selectedDocId]);

  // Request Gemini AI waiting time estimates and flow diagnosis
  const handleQueryAIConsultant = async () => {
    if (!selectedDocId) return;
    const currentDoc = doctors.find(d => d.doctorId === selectedDocId);
    if (!currentDoc) return;

    setAiLoading(true);
    setAiReport(null);

    const waitingTokens = tokens.filter(t => t.status === 'waiting');
    const urgentCount = waitingTokens.filter(t => t.priority === 'emergency').length;

    try {
      const res = await fetch('/api/gemini/predict-wait', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctorName: currentDoc.doctorName,
          speciality: currentDoc.speciality,
          currentQueueCount: waitingTokens.length,
          urgentCount: urgentCount,
          averageConsultationTime: currentDoc.averageConsultationTime || 10
        })
      });

      const data = await res.json();
      if (res.ok) {
        setAiReport(data);
        onNotify("Gemini Audit Ready", "Patient waiting optimization models updated dynamically.");
      } else {
        throw new Error(data.error || "Failed to parse AI outcomes");
      }
    } catch (err: any) {
      console.error(err);
      onNotify("AI Timeout", "Predictive heuristic models generated standby parameters successfully.");
    } finally {
      setAiLoading(false);
    }
  };

  // Automatically fetch AI optimization tips each time doctor changes or queue modifications have transpired
  useEffect(() => {
    if (selectedDocId && tokens.length >= 0) {
      const runQuietPrediction = setTimeout(() => {
        handleQueryAIConsultant();
      }, 500);
      return () => clearTimeout(runQuietPrediction);
    }
  }, [selectedDocId, tokens.length]);

  const activeDoc = doctors.find(d => d.doctorId === selectedDocId);

  // Call the next patient (checking emergencies priority first!)
  const handleCallNextPatient = async () => {
    if (!activeDoc) return;

    // Check if there's any patient already in consultation
    if (currentActiveToken) {
      onNotify("Chamber Occupied", "Please mark the current patient consultation COMPLETED or SKIPPED before calling a new token.");
      return;
    }

    const waitingTokens = tokens.filter(t => t.status === "waiting");
    if (waitingTokens.length === 0) {
      onNotify("Queue Empty", "No waiting patients currently in queue for this clinic.");
      return;
    }

    // Triage Rule: Sort emergency cases first, then queue numbers
    const nextToken = waitingTokens.find(t => t.priority === 'emergency') || waitingTokens[0];

    try {
      // 1. Update Token status in database
      await setDoc(doc(db, "tokens", nextToken.tokenId), {
        status: "called",
        calledAt: new Date().toISOString()
      }, { merge: true });

      // 2. Adjust active consultation details in Doctor object
      await setDoc(doc(db, "doctors", activeDoc.doctorId), {
        currentToken: `${hospitalPrefix}-${nextToken.tokenNumber}`,
        currentPatient: nextToken.patientName
      }, { merge: true });

      onNotify("Calling Patient", `Summoning Token ${hospitalPrefix}-${nextToken.tokenNumber}: ${nextToken.patientName}`);

      // 3. Trigger Vocal Audio broadcast
      speakTokenAnnouncement(
        nextToken.tokenNumber,
        activeDoc.doctorName.replace("Dr. ", ""),
        activeDoc.roomNumber,
        nextToken.language
      );

      // 4. Send client simulated SMS WhatsApp
      if (nextToken.patientPhone) {
        try {
          await fetch('/api/whatsapp/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tokenNumber: `${hospitalPrefix}-${nextToken.tokenNumber}`,
              patientName: nextToken.patientName,
              patientPhone: nextToken.patientPhone,
              doctorName: activeDoc.doctorName,
              status: "called"
            })
          });
        } catch (smsErr) {
          console.warn("SMS error safely recorded:", smsErr);
        }
      }

    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `tokens/${nextToken.tokenId}`);
    }
  };

  // Complete consultation
  const handleCompleteConsultation = async () => {
    if (!activeDoc || !currentActiveToken) return;

    try {
      // 1. Set Token to completed status
      await setDoc(doc(db, "tokens", currentActiveToken.tokenId), {
        status: "completed",
        completedAt: new Date().toISOString()
      }, { merge: true });

      // 2. Increment Doctor processed statistics count
      await setDoc(doc(db, "doctors", activeDoc.doctorId), {
        totalPatientsToday: (activeDoc.totalPatientsToday || 0) + 1,
        currentToken: "",
        currentPatient: ""
      }, { merge: true });

      onNotify("Consultation Completed", `Successfully concluded appointment for ${currentActiveToken.patientName}`);
      setCurrentActiveToken(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `tokens/${currentActiveToken.tokenId}`);
    }
  };

  // Skip / Absent client
  const handleSkipPatient = async () => {
    if (!activeDoc || !currentActiveToken) return;

    try {
      // 1. Mark token as skipped or absent
      await setDoc(doc(db, "tokens", currentActiveToken.tokenId), {
        status: "skipped",
        skipped: true,
        completedAt: new Date().toISOString()
      }, { merge: true });

      // 2. Clear out active chamber status
      await setDoc(doc(db, "doctors", activeDoc.doctorId), {
        currentToken: "",
        currentPatient: ""
      }, { merge: true });

      onNotify("Patient Skipped", `Marking Token ${hospitalPrefix}-${currentActiveToken.tokenNumber} as absent.`);
      setCurrentActiveToken(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `tokens/${currentActiveToken.tokenId}`);
    }
  };

  // Voice vocal recall
  const handleRecallAcoustic = () => {
    if (!activeDoc || !currentActiveToken) return;
    speakTokenAnnouncement(
      currentActiveToken.tokenNumber,
      activeDoc.doctorName.replace("Dr. ", ""),
      activeDoc.roomNumber,
      currentActiveToken.language || "en"
    );
    onNotify("Re-announcing Token", `Broadcasting vocalization tone for token ${currentActiveToken.tokenNumber} again.`);
  };

  return (
    <div className="space-y-6">
      
      {/* Consultant Select Profile */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900/40 border border-teal-500/10 p-6 rounded-3xl backdrop-blur-md shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded-xl flex-shrink-0">
            <Stethoscope className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100 font-sans tracking-tight">
              {translate('doctorDashboard')}
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              Chamber Management & AI Predictor Core
            </p>
          </div>
        </div>

        <div className="relative w-full md:w-auto">
          <select
            value={selectedDocId}
            onChange={(e) => setSelectedDocId(e.target.value)}
            className="w-full md:w-64 bg-slate-950/60 border border-slate-700 hover:border-slate-600 rounded-xl px-4 py-2 text-sm text-slate-100 focus:outline-none transition-all cursor-pointer font-sans"
          >
            {doctors.map(d => (
              <option key={d.doctorId} value={d.doctorId} className="bg-slate-900 text-slate-200">
                {d.doctorName} ({d.roomNumber})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Active Chamber Consultation & Actions */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900/40 backdrop-blur-md rounded-3xl p-6 border border-teal-500/10 shadow-xl space-y-6">
            
            <div className="border-b border-white/5 pb-4 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-100 font-sans tracking-tight">Active Consultation Room</h3>
                <p className="text-xs text-slate-400">Current triage and operational chamber controls</p>
              </div>
              {activeDoc && (
                <div className="bg-teal-500/10 px-3 py-1 text-[11px] font-mono border border-teal-500/20 text-teal-300 rounded-lg">
                  {activeDoc.roomNumber}
                </div>
              )}
            </div>

            {/* Currently Treating Card */}
            {currentActiveToken ? (
              <div className="bg-gradient-to-br from-teal-500/5 via-cyan-500/5 to-emerald-500/5 border border-teal-500/10 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 animate-fade-in">
                <div>
                  <span className="text-[10px] tracking-wider font-semibold font-mono text-cyan-400 block uppercase mb-1">
                    ACTIVE PATIENT CONSULTING
                  </span>
                  <h4 className="text-2xl font-black text-white font-sans tracking-tight mb-2">
                    {currentActiveToken.patientName}
                  </h4>
                  <div className="flex flex-wrap gap-4 text-xs font-mono text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-teal-400" />
                      Token ID: <strong className="text-slate-200">{hospitalPrefix}-{currentActiveToken.tokenNumber}</strong>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle className={`w-3.5 h-3.5 ${
                        currentActiveToken.priority === 'emergency' ? "text-rose-400" : "text-slate-500"
                      }`} />
                      Priority: <strong className={currentActiveToken.priority === 'emergency' ? "text-rose-400" : "text-slate-400"}>
                        {currentActiveToken.priority.toUpperCase()}
                      </strong>
                    </span>
                  </div>
                </div>

                {/* Operator Actions buttons */}
                <div className="flex items-center gap-3 self-end md:self-center">
                  <button
                    onClick={handleRecallAcoustic}
                    className="p-2.5 bg-slate-800 border border-slate-700 text-slate-300 rounded-xl hover:text-white hover:bg-slate-700 active:scale-95 transition-all outline-none"
                    title={translate('recallPatient')}
                  >
                    <Megaphone className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleSkipPatient}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 border border-rose-500/20 text-rose-400 rounded-xl hover:bg-rose-500/5 active:scale-95 transition-all text-sm font-semibold"
                  >
                    <SkipForward className="w-4 h-4" />
                    {translate('skipPatient')}
                  </button>
                  <button
                    onClick={handleCompleteConsultation}
                    className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl shadow-lg hover:brightness-110 active:scale-95 transition-all text-sm font-bold"
                  >
                    <Check className="w-4 h-4" />
                    {translate('completeConsult')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-950/40 border border-slate-800/60 p-8 rounded-2xl text-center flex flex-col items-center justify-center max-w-full">
                <div className="h-12 w-12 bg-slate-800/40 rounded-2xl flex items-center justify-center mb-3 text-slate-500">
                  <Stethoscope className="w-6 h-6" />
                </div>
                <h5 className="text-sm font-semibold text-slate-300 mb-1">Chamber Currently Empty</h5>
                <p className="text-xs text-slate-500 mb-4 max-w-sm">No active patients registered inside this doctor's consulting room at the moment.</p>
                <button
                  onClick={handleCallNextPatient}
                  className="flex items-center gap-2 bg-gradient-to-r from-teal-500 to-cyan-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold active:scale-95 transition-all shadow-md shadow-teal-500/10 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                  {translate('callPatient')}
                </button>
              </div>
            )}

            {/* Chamber Queue Table */}
            <div className="space-y-4 pt-4 border-t border-white/5">
              <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <ListOrdered className="w-4 h-4 text-teal-400" />
                {translate('activeQueue')} ({tokens.filter(t => t.status === "waiting").length})
              </h4>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead>
                    <tr className="border-b border-white/5 text-slate-500 text-[10px] uppercase font-mono tracking-wider">
                      <th className="py-2.5 px-1">Seq #</th>
                      <th className="py-2.5 px-1">Patient</th>
                      <th className="py-2.5 px-1">Triage Condition</th>
                      <th className="py-2.5 px-1">Wait Time (AI)</th>
                      <th className="py-2.5 px-1 text-right">Call Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tokens.filter(t => t.status === "waiting").length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-6 text-slate-600 font-mono">
                          Queue is currently empty.
                        </td>
                      </tr>
                    ) : (
                      tokens.filter(t => t.status === "waiting").map((tok, index) => (
                        <tr key={tok.tokenId} className="border-b border-white/5 hover:bg-slate-900/40 transition-all">
                          <td className="py-3 px-1 font-mono font-bold text-teal-400">
                            {hospitalPrefix}-{tok.tokenNumber}
                          </td>
                          <td className="py-3 px-1 font-semibold text-slate-200">
                            {tok.patientName}
                          </td>
                          <td className="py-3 px-1">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                              tok.priority === "emergency"
                                ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                : "bg-slate-800 text-slate-400"
                            }`}>
                              {tok.priority}
                            </span>
                          </td>
                          <td className="py-3 px-1 text-slate-400 font-mono">
                            ~{(index + 1) * (activeDoc?.averageConsultationTime || 10)} mins
                          </td>
                          <td className="py-3 px-1 text-right">
                            <button
                              onClick={handleCallNextPatient}
                              disabled={!!currentActiveToken}
                              className="px-2.5 py-1 text-[11px] font-bold bg-teal-500/10 border border-teal-500/20 text-teal-300 rounded-md hover:bg-teal-500/20 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                            >
                              Call In
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

        {/* Gemini AI Auditor Panel Column */}
        <div className="lg:col-span-1 space-y-6">
          <div className="relative overflow-hidden bg-gradient-to-b from-slate-900/60 to-purple-950/20 border border-purple-500/20 rounded-3xl p-6 shadow-xl space-y-5">
            {/* Ambient Background Glows */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-32 h-32 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="flex items-center gap-3 border-b border-purple-500/10 pb-4">
              <div className="p-2.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-xl">
                <Brain className="w-5 h-5 text-purple-400 animate-pulse" />
              </div>
              <div>
                <h3 className="font-bold text-slate-100 font-sans tracking-tight">
                  {translate('aiFlowAnalyst')}
                </h3>
                <p className="text-xs text-purple-300 font-mono">
                  Gemini Flow Optimization Agent
                </p>
              </div>
            </div>

            {aiLoading ? (
              <div className="py-12 text-center flex flex-col items-center justify-center space-y-3">
                <RefreshCw className="w-8 h-8 text-purple-400 animate-spin" />
                <span className="text-xs text-purple-300 font-mono">Consulting Gemini 3.5 Models...</span>
              </div>
            ) : aiReport ? (
              <div className="space-y-4 animate-fade-in">
                {/* predicted minutes metric */}
                <div className="flex items-center gap-4 bg-slate-950/40 p-4 border border-purple-500/10 rounded-2xl">
                  <div className="p-2.5 bg-purple-500/10 text-purple-400 rounded-xl flex-shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-mono block uppercase">Predicted Total Wait Time</span>
                    <h5 className="text-lg font-black text-white font-sans">
                      {aiReport.predictedMinutes} <span className="text-xs text-purple-400 font-medium">Minutes</span>
                    </h5>
                  </div>
                </div>

                {/* triage density indicator */}
                <div className="flex items-center gap-4 bg-slate-950/40 p-4 border border-purple-500/10 rounded-2xl">
                  <div className="p-2.5 bg-purple-500/10 text-purple-400 rounded-xl flex-shrink-0">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-mono block uppercase">OPD Triage Squeeze Urgency</span>
                    <h5 className={`text-md font-bold font-sans ${
                      aiReport.triageUrgency === "High" || aiReport.triageUrgency === "Critical" 
                        ? "text-rose-400" 
                        : "text-emerald-400"
                    }`}>
                      {aiReport.triageUrgency} Priority ({Math.round(aiReport.confidenceScore * 100)}% Match)
                    </h5>
                  </div>
                </div>

                {/* doctor tip box */}
                <div className="p-4 bg-purple-950/15 border border-purple-500/10 rounded-2xl space-y-2">
                  <span className="text-[9px] uppercase tracking-wider font-mono text-purple-400 block font-semibold">Chamber Audit Guidance</span>
                  <p className="text-xs text-slate-200 leading-relaxed font-sans">
                    "{aiReport.smartDoctorTip}"
                  </p>
                </div>

                {/* reassurance tip */}
                <div className="p-4 bg-slate-950/20 border border-white/5 rounded-2xl space-y-1">
                  <span className="text-[9px] uppercase tracking-wider font-mono text-slate-500 block font-semibold">Patient Comfort Script</span>
                  <p className="text-xs text-slate-400 leading-relaxed font-sans italic">
                    "{aiReport.patientReassurance}"
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <button
                  onClick={handleQueryAIConsultant}
                  className="bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs px-4 py-2 rounded-xl"
                >
                  Retrieve Queue Optimization
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
