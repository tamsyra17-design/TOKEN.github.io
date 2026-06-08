/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, onSnapshot, query, where, getDoc, doc } from 'firebase/firestore';
import { Token, Doctor } from '../types';
import { useTranslation } from './TranslationSystem';
import { 
  Search, ShieldAlert, Heart, Clock, UserCheck, Stethoscope, AlertCircle, Phone, ArrowUpRight
} from 'lucide-react';

interface PatientCheckProps {
  hospitalPrefix: string;
}

export default function PatientCheck({ hospitalPrefix = "MED" }: PatientCheckProps) {
  const { translate, language } = useTranslation();
  const [searchCode, setSearchCode] = useState('');
  const [targetToken, setTargetToken] = useState<Token | null>(null);
  const [assignedDoc, setAssignedDoc] = useState<Doctor | null>(null);
  const [queueCountAhead, setQueueCountAhead] = useState(0);
  const [searchLoading, setSearchLoading] = useState(false);
  const [allTokens, setAllTokens] = useState<Token[]>([]);

  // Support deep-linking. Check for URL parameters (?patientTrackingCode=tkn_123) when mounting
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const trackingCode = urlParams.get('patientTrackingCode');
    if (trackingCode) {
      setSearchCode(trackingCode);
      fetchTokenDetails(trackingCode);
    }
  }, []);

  // Fetch token details
  const fetchTokenDetails = (code: string) => {
    setSearchLoading(true);
    
    // Set real-time snapshot subscription over this token ID
    const unsubToken = onSnapshot(doc(db, "tokens", code), async (tokenSnap) => {
      if (tokenSnap.exists()) {
        const tokenDetails = tokenSnap.data() as Token;
        setTargetToken(tokenDetails);

        // Sub-fetch matching doctor dynamic Chamber details (online status, current token, room number)
        const docSnap = await getDoc(doc(db, "doctors", tokenDetails.doctorId));
        if (docSnap.exists()) {
          setAssignedDoc(docSnap.data() as Doctor);
        }

        // Sub-fetch total patients ahead in queue
        // (those assigned to the same doctor who are in 'waiting' status and registered older than the target)
        onSnapshot(
          query(
            collection(db, "tokens"), 
            where("doctorId", "==", tokenDetails.doctorId), 
            where("status", "==", "waiting")
          ),
          (snaps) => {
            const list: Token[] = [];
            snaps.forEach(d => list.push(d.data() as Token));
            
            // Filter out only tokens created earlier than current target
            const ahead = list.filter(t => t.createdAt < tokenDetails.createdAt).length;
            setQueueCountAhead(ahead);
          }
        );
      } else {
        setTargetToken(null);
        setAssignedDoc(null);
      }
      setSearchLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `tokens/${code}`);
      setSearchLoading(false);
    });

    return () => unsubToken();
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchCode.trim()) return;
    fetchTokenDetails(searchCode.trim().toLowerCase());
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      
      {/* Patient Header */}
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-black text-white tracking-tight">Patient Queue Companion</h2>
        <p className="text-xs text-slate-400">Track your room consultation and predicted times dynamically</p>
      </div>

      {/* Code Search Entry */}
      <form onSubmit={handleManualSearch} className="bg-slate-900/40 backdrop-blur-md rounded-2xl p-5 border border-teal-500/10 shadow-lg space-y-3">
        <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block font-semibold">
          Enter Receipt Tracker ID or Phone Number
        </label>
        <div className="flex gap-2.5">
          <div className="relative flex-grow">
            <input
              type="text"
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              className="w-full bg-slate-950/65 border border-slate-700/60 focus:border-teal-400 rounded-xl px-4 py-2.5 pl-10 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-400/30 transition-all placeholder-slate-600"
              placeholder="e.g. tkn_1717..."
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
          </div>
          <button
            type="submit"
            className="bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs active:scale-95 transition-all outline-none"
          >
            Track
          </button>
        </div>
      </form>

      {/* Search results display card */}
      {searchLoading ? (
        <div className="text-center py-12 flex flex-col items-center justify-center space-y-3">
          <Clock className="w-8 h-8 text-teal-400 animate-spin" />
          <span className="text-xs text-slate-400 font-mono">Retrieving Live Queue Position...</span>
        </div>
      ) : targetToken ? (
        <div className="bg-slate-900/40 border border-teal-500/10 backdrop-blur-md rounded-3xl p-6 shadow-2xl relative overflow-hidden space-y-6 animate-fade-in">
          
          {/* ambient background light */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>

          {/* Token Card details */}
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div>
              <span className="text-[10px] text-slate-400 font-mono uppercase block">Your Patient Token</span>
              <h3 className="text-3xl font-black text-white font-mono tracking-tight">
                {hospitalPrefix}-{targetToken.tokenNumber}
              </h3>
            </div>
            
            <div className={`px-3 py-1 rounded-full text-[10px] font-mono uppercase font-bold leading-none ${
              targetToken.status === 'called' ? "bg-amber-500/15 text-amber-400 animate-pulse border border-amber-500/30" :
              targetToken.status === 'waiting' ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" :
              "bg-slate-800 text-slate-450"
            }`}>
              {translate(`status${targetToken.status.charAt(0).toUpperCase() + targetToken.status.slice(1)}`)}
            </div>
          </div>

          <div className="space-y-4">
            {/* Countdown alerts */}
            {targetToken.status === 'waiting' ? (
              <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-2xl flex items-center gap-4">
                <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20 flex-shrink-0 font-mono font-black text-lg">
                  {queueCountAhead}
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-200 block">Queue Position Ahead</span>
                  <p className="text-xs text-slate-400">
                    {queueCountAhead === 0 
                      ? "You are next in queue! Please stand by near room door." 
                      : `There are ${queueCountAhead} patient consultations pending before your turn.`
                    }
                  </p>
                </div>
              </div>
            ) : targetToken.status === 'called' ? (
              <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-center gap-4 animate-pulse">
                <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20 flex-shrink-0 text-xl">
                  🚨
                </div>
                <div>
                  <span className="text-xs font-bold text-amber-400 block uppercase font-mono">Your Turn Has Succeeded!</span>
                  <p className="text-xs text-slate-300">
                    Your token is active. Please proceed immediately to <strong>{assignedDoc?.roomNumber || "Clinical Chamber"}</strong>.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-2xl flex items-center gap-4">
                <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 flex-shrink-0 text-lg">
                  ✓
                </div>
                <div>
                  <span className="text-xs font-bold text-emerald-400 block">Consultation Completed</span>
                  <p className="text-xs text-slate-400">Your appointment has concluded. You are clear to collect medical logs from reception.</p>
                </div>
              </div>
            )}

            {/* Doctor and Chamber Specifications */}
            <div className="space-y-3 bg-slate-950/40 p-4 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-500 font-mono uppercase block font-semibold border-b border-white/5 pb-1">Assigned Consultant Details</span>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-teal-400" />
                  <span className="text-xs font-bold text-slate-200">{targetToken.doctorName}</span>
                </div>
                {assignedDoc && (
                  <span className="text-xs text-slate-400 font-mono">{assignedDoc.roomNumber}</span>
                )}
              </div>

              {assignedDoc && (
                <div className="flex items-center justify-between text-xs text-slate-500 border-t border-white/5 pt-2">
                  <span>Chamber Status:</span>
                  <span className="text-slate-300 font-mono font-semibold">
                    {assignedDoc.currentToken ? `Now Serving: ${assignedDoc.currentToken}` : "Waiting for Patients"}
                  </span>
                </div>
              )}
            </div>

            {/* Dynamic Predicted limits derived from Consultant heuristics */}
            {targetToken.status === 'waiting' && assignedDoc && (
              <div className="bg-teal-500/5 p-4 rounded-2xl border border-teal-500/10 space-y-1">
                <span className="text-[10px] text-teal-400 font-mono uppercase block font-semibold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Estimated Wait Time
                </span>
                <p className="text-lg font-black text-slate-100 font-sans">
                  ~{queueCountAhead * (assignedDoc.averageConsultationTime || 10)} <span className="text-xs font-mono font-medium text-slate-450">mins</span>
                </p>
                <p className="text-[10px] text-slate-500">
                  Calculators dynamically align to outpatient department triage tempos. Wait times can contract/expand.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : searchCode ? (
        <div className="bg-rose-500/5 border border-rose-500/10 p-6 rounded-2xl text-center flex flex-col items-center justify-center animate-fade-in text-slate-400">
          <AlertCircle className="w-8 h-8 text-rose-500 mb-2" />
          <h5 className="text-sm font-semibold text-slate-300">Invalid Tracking Code</h5>
          <p className="text-xs text-slate-500 max-w-xs mt-1">We couldn't pull active records for that ID. Double check the registration slip.</p>
        </div>
      ) : (
        <div className="bg-slate-900/20 border border-slate-800/80 p-8 rounded-3xl text-center text-slate-500 text-xs">
          Enter your unique identifier from reception to track your clinic position.
        </div>
      )}
    </div>
  );
}
