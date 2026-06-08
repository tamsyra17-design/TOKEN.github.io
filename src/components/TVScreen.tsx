/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, onSnapshot, query, where, orderBy, getDoc, doc } from 'firebase/firestore';
import { Token, Doctor } from '../types';
import { speakTokenAnnouncement } from './VoiceAnnouncement';
import { useTranslation } from './TranslationSystem';
import { 
  Tv, Volume2, Clock, MapPin, ListPlus, Activity, HeartPulse, UserPlus
} from 'lucide-react';

interface TVScreenProps {
  hospitalName: string;
  hospitalPrefix: string;
}

export default function TVScreen({ hospitalName = "Emerald General Hospital", hospitalPrefix = "MED" }: TVScreenProps) {
  const { translate } = useTranslation();
  const [activeDoctors, setActiveDoctors] = useState<Doctor[]>([]);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [liveClock, setLiveClock] = useState(new Date());

  // Keep track of the last vocalized token IDs so we don't announce them multiple times
  const [spokenTokenIds, setSpokenTokenIds] = useState<Record<string, boolean>>({});

  // Tick the live digital clock
  useEffect(() => {
    const timer = setInterval(() => setLiveClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch real-time queues and active doctor profiles
  useEffect(() => {
    const unsubDocs = onSnapshot(collection(db, "doctors"), (snapshot) => {
      const list: Doctor[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as Doctor);
      });
      setActiveDoctors(list);
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
      unsubDocs();
      unsubTokens();
    };
  }, []);

  // Sync vocalization script trigger:
  // Whenever any token is 'called' and has an active 'calledAt' stamp,
  // we automatically announce it in its preferred localized language if we haven't spoken it yet!
  useEffect(() => {
    const calledToken = tokens.find(t => t.status === 'called');
    if (calledToken) {
      const isAlreadySpoken = spokenTokenIds[calledToken.tokenId];
      if (!isAlreadySpoken) {
        // Look up the matching doctor's room number
        const matchingDoc = activeDoctors.find(d => d.doctorId === calledToken.doctorId);
        const roomNo = matchingDoc ? matchingDoc.roomNumber : "Room 101";

        // Speak
        speakTokenAnnouncement(
          calledToken.tokenNumber,
          calledToken.doctorName ? calledToken.doctorName.replace("Dr. ", "") : "Specialist",
          roomNo,
          calledToken.language || "en"
        );

        // Record spoken ID
        setSpokenTokenIds(prev => ({ ...prev, [calledToken.tokenId]: true }));
      }
    }
  }, [tokens, activeDoctors, spokenTokenIds]);

  const activeCalledTokens = tokens.filter(t => t.status === 'called');
  const upcomingQueue = tokens.filter(t => t.status === 'waiting').slice(0, 5);

  return (
    <div className="bg-[#030712] min-h-screen text-slate-100 p-8 flex flex-col justify-between font-sans relative overflow-hidden">
      
      {/* Dynamic Background Grid Effects */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293715_1px,transparent_1px),linear-gradient(to_bottom,#1f293715_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none"></div>
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-teal-500/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Modern TV Board Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between border-b-2 border-teal-500/10 pb-6 mb-8 z-10">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-teal-500/10 border-2 border-teal-500/20 text-teal-400 rounded-2xl flex-shrink-0 shadow-lg shadow-teal-500/10">
            <Tv className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white font-sans">
              {hospitalName.toUpperCase()}
            </h1>
            <p className="text-xs text-teal-400 tracking-widest font-mono font-medium uppercase">
              {translate('hospitalLobbyScreen')}
            </p>
          </div>
        </div>

        {/* Dynamic Digital Clock Display */}
        <div className="flex items-center gap-6 mt-4 md:mt-0 font-mono">
          <div className="text-right">
            <span className="text-3xl font-black text-cyan-400 block tracking-wider">
              {liveClock.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <span className="text-[10px] text-slate-400 tracking-widest block uppercase font-semibold">
              Live Lobby broadcast Time
            </span>
          </div>
          <div className="h-10 w-px bg-slate-800"></div>
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
            <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
              System Online
            </span>
          </div>
        </div>
      </header>

      {/* Main TV Layout Core Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8 z-10 flex-grow">
        
        {/* Left column: Doctors Chambers Status */}
        <div className="lg:col-span-1 bg-slate-900/30 border border-white/5 rounded-3xl p-6 backdrop-blur-md shadow-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-3">
              <HeartPulse className="w-5 h-5 text-teal-400" />
              <h3 className="font-bold text-slate-250 font-sans text-sm uppercase tracking-wider">Clinical Chambers</h3>
            </div>

            <div className="space-y-4">
              {activeDoctors.map((doc) => {
                const isBusy = !!doc.currentToken;
                return (
                  <div key={doc.doctorId} className="flex items-center justify-between p-4 bg-slate-950/40 rounded-2xl border border-slate-800 hover:border-teal-500/20 transition-all">
                    <div className="flex items-center gap-3">
                      {doc.photo ? (
                        <img src={doc.photo} alt={doc.doctorName} className="w-10 h-10 rounded-xl object-cover" />
                      ) : (
                        <div className="h-10 w-10 bg-slate-800 rounded-xl flex items-center justify-center">🩺</div>
                      )}
                      <div>
                        <span className="font-bold text-slate-100 text-sm block">{doc.doctorName}</span>
                        <span className="text-[10px] text-slate-500 font-sans block">{doc.speciality} • {doc.roomNumber}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      {isBusy ? (
                        <div className="bg-amber-500/15 border border-amber-500/20 px-3 py-1 rounded-xl text-center">
                          <span className="text-xs font-black font-mono text-amber-400 block">{doc.currentToken}</span>
                          <span className="text-[8px] text-amber-400 uppercase font-mono block animate-pulse">Consulting</span>
                        </div>
                      ) : (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-xl text-center">
                          <span className="text-[9px] text-emerald-400 uppercase font-bold tracking-wider block">Standby</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 p-4 bg-cyan-950/10 border border-cyan-500/10 rounded-2xl text-xs text-slate-400 font-sans leading-relaxed flex items-center gap-3">
            <Volume2 className="w-6 h-6 text-cyan-400 flex-shrink-0 animate-bounce" />
            Vocal announcers automatically signal room directories upon doctor calls. Please check priority queue rules.
          </div>
        </div>

        {/* Center & right column: Active called token Board TV Display */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Main Called Board */}
          <div className="bg-gradient-to-br from-teal-500/10 via-cyan-500/5 to-emerald-950/10 border-2 border-teal-500/20 rounded-3xl p-8 backdrop-blur-md shadow-2xl flex flex-col justify-between align-middle min-h-[300px]">
            <div>
              <span className="text-xs font-black tracking-widest text-teal-400 block uppercase font-mono mb-4 flex items-center gap-2">
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-500"></span>
                </span>
                {translate('nowConsultingToken')}
              </span>

              {activeCalledTokens.length > 0 ? (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex items-baseline gap-2">
                    <h1 className="text-7xl font-black tracking-tight text-white font-mono scale-110 origin-left">
                      {hospitalPrefix}-{activeCalledTokens[0].tokenNumber}
                    </h1>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/5 rounded-lg text-slate-400 mb-1">👤</div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase block font-mono">Patient Name</span>
                        <span className="text-2xl font-black text-white">{activeCalledTokens[0].patientName}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <div className="p-2 bg-white/5 rounded-lg text-slate-400 mb-1">🩺</div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase block font-mono">Assigned Clinic Office</span>
                        <span className="text-lg font-bold text-teal-300">{activeCalledTokens[0].doctorName}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col justify-center items-center py-16 text-center">
                  <span className="text-slate-500 font-mono text-sm">Waiting for new token calls...</span>
                </div>
              )}
            </div>

            {activeCalledTokens.length > 0 && (
              <div className="mt-8 bg-slate-950/60 border border-slate-800 p-4 rounded-2xl flex items-center gap-4">
                <MapPin className="w-10 h-10 text-cyan-400 animate-pulse flex-shrink-0" />
                <div>
                  <span className="text-xs text-slate-400 font-mono block uppercase">Required Room Direction</span>
                  <span className="text-xl font-black text-cyan-300 font-sans tracking-tight">
                    {translate('proceedToRoom')} {
                      activeDoctors.find(d => d.doctorId === activeCalledTokens[0].doctorId)?.roomNumber || "Chamber 101"
                    }
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Upcoming Waitlist TV screen */}
          <div className="bg-slate-900/30 border border-white/5 rounded-3xl p-6 backdrop-blur-md shadow-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <ListPlus className="w-5 h-5 text-cyan-400" />
                  <h3 className="font-bold text-slate-200 font-sans text-xs uppercase tracking-wider">{translate('nextWaitingTitle')}</h3>
                </div>
                <span className="bg-slate-800 px-2.5 py-1 rounded-full text-[10px] font-mono text-slate-400">
                  Total: {upcomingQueue.length}
                </span>
              </div>

              <div className="space-y-2.5">
                {upcomingQueue.length === 0 ? (
                  <div className="py-12 text-center text-slate-600 font-mono text-xs">
                    No upcoming patient waiting.
                  </div>
                ) : (
                  upcomingQueue.map((tok) => (
                    <div key={tok.tokenId} className="flex items-center justify-between p-3.5 bg-slate-950/40 rounded-2xl border border-slate-900">
                      <div>
                        <span className="text-xs font-black text-teal-400 block font-mono">
                          {hospitalPrefix}-{tok.tokenNumber}
                        </span>
                        <span className="font-bold text-slate-300 text-sm block truncate max-w-[140px]">{tok.patientName}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 font-mono block">Chamber Specialist</span>
                        <span className="text-xs font-semibold text-slate-300">{tok.doctorName?.replace("Dr. ", "")}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-slate-500">
              <span>Smart Hospital Systems v4.0</span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                Instant sync
              </span>
            </div>
          </div>

        </div>

      </section>

      {/* Moving Lobby Ticker */}
      <footer className="bg-slate-900/40 border border-white/5 p-4 rounded-2xl backdrop-blur-md flex items-center gap-6 z-10 overflow-hidden">
        <span className="bg-teal-500 text-slate-950 text-[10px] font-black uppercase px-3 py-1.5 rounded-lg font-mono flex-shrink-0">
          Lobby Alert
        </span>
        <div className="animate-marquee whitespace-nowrap text-xs text-slate-400 font-sans tracking-wide">
          ✦ Welcome to the Smart Medical Clinic. Please scan the QR code printed on your in-take ticket slip to monitor your place in queue on your personal phone screen ✦ Out-patient triaging predicted by Google Gemini AI ✦ For emergencies, please alert the reception desk immediately ✦
        </div>
      </footer>
    </div>
  );
}
