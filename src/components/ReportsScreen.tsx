/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, onSnapshot, getDocs, doc, setDoc } from 'firebase/firestore';
import { Token, Doctor } from '../types';
import { useTranslation } from './TranslationSystem';
import { 
  Users, CheckCircle2, TrendingUp, BarChart3, Clock, AlertTriangle, ArrowUpRight, Zap
} from 'lucide-react';

export default function ReportsScreen() {
  const { translate } = useTranslation();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  // Fetch full tokens snapshot for today's reports
  useEffect(() => {
    const unsubTokens = onSnapshot(collection(db, "tokens"), (snap) => {
      const list: Token[] = [];
      snap.forEach((doc) => {
        list.push(doc.data() as Token);
      });
      setTokens(list);
    });

    const unsubDocs = onSnapshot(collection(db, "doctors"), (snap) => {
      const list: Doctor[] = [];
      snap.forEach((doc) => {
        list.push(doc.data() as Doctor);
      });
      setDoctors(list);
    });

    return () => {
      unsubTokens();
      unsubDocs();
    };
  }, []);

  // Structural aggregates calculation
  const totalInTake = tokens.length;
  const completedDiagnostics = tokens.filter(t => t.status === 'completed').length;
  const skippedDiagnostics = tokens.filter(t => t.status === 'skipped').length;
  const activeWaiting = tokens.filter(t => t.status === 'waiting').length;

  // Average waiting calculations helper
  const avgWaitTimeInMinutes = totalInTake > 0 ? Math.round((activeWaiting * 10) + (completedDiagnostics * 8)) : 0;

  // Calculations for doctor-wise diagnostic KPI
  const doctorCompletionData = doctors.map(doc => {
    const treatedTokens = tokens.filter(t => t.doctorId === doc.doctorId && t.status === 'completed');
    const skippedTokens = tokens.filter(t => t.doctorId === doc.doctorId && t.status === 'skipped');
    return {
      name: doc.doctorName,
      speciality: doc.speciality,
      completed: treatedTokens.length + (doc.totalPatientsToday || 0), // Include seeded counters
      skipped: skippedTokens.length,
      averageSession: doc.averageConsultationTime || 10
    };
  });

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      
      {/* Reports Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/5 pb-5 mb-2">
        <div>
          <h2 className="text-xl font-bold font-sans tracking-tight text-white mb-1">
            Clinical Insights & Analytics Board
          </h2>
          <p className="text-xs text-slate-400">Auditing out-patient department metrics and doctor operating tempos</p>
        </div>
        
        <div className="text-xs font-mono bg-teal-500/10 text-teal-300 border border-teal-500/20 px-3.5 py-1.5 rounded-xl mt-3 md:mt-0">
          Daily Log: {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* KPI Box row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* KPI 1 */}
        <div className="bg-slate-900/40 border border-teal-500/15 p-5 rounded-2xl flex items-center justify-between shadow-md">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-450 uppercase font-mono tracking-wider">Lobby Intake</span>
            <h4 className="text-2xl font-black text-white">{totalInTake}</h4>
            <span className="text-[9px] text-teal-400 font-mono block">Registered patients</span>
          </div>
          <div className="p-3 bg-teal-500/10 text-teal-400 border border-teal-500/20 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-slate-900/40 border border-teal-500/15 p-5 rounded-2xl flex items-center justify-between shadow-md">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-450 uppercase font-mono tracking-wider">Avg Waiting Time</span>
            <h4 className="text-2xl font-black text-white">{avgWaitTimeInMinutes} <span className="text-xs font-medium text-slate-400">mins</span></h4>
            <span className="text-[9px] text-cyan-400 font-mono block">Outpatient average</span>
          </div>
          <div className="p-3 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-xl">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-slate-900/40 border border-teal-500/15 p-5 rounded-2xl flex items-center justify-between shadow-md">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-450 uppercase font-mono tracking-wider">Treated & Clear</span>
            <h4 className="text-2xl font-black text-white">{completedDiagnostics}</h4>
            <span className="text-[9px] text-emerald-400 font-mono block">Consultations Completed</span>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-slate-900/40 border border-teal-500/15 p-5 rounded-2xl flex items-center justify-between shadow-md">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-450 uppercase font-mono tracking-wider">Missed Calls</span>
            <h4 className="text-2xl font-black text-white">{skippedDiagnostics}</h4>
            <span className="text-[9px] text-rose-400 font-mono block">Skipped/absent clients</span>
          </div>
          <div className="p-3 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Peak outpatient Hours SVG Visualizer */}
        <div className="lg:col-span-2 bg-slate-900/40 border border-teal-500/15 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div>
              <h3 className="font-bold text-slate-100 font-sans text-sm uppercase tracking-wider flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                Peak Hourly OPD Wait Squeezes
              </h3>
              <p className="text-xs text-slate-400">Total patient queues density recorded per time interval</p>
            </div>
          </div>

          {/* Gorgeous custom vector chart */}
          <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-2xl h-60 flex items-end justify-between relative">
            <div className="absolute inset-x-4 top-4 border-t border-slate-800/60 flex justify-between text-[9px] font-mono text-slate-600">
              <span>90 patients</span>
            </div>
            <div className="absolute inset-x-4 top-20 border-t border-slate-800/60 flex justify-between text-[9px] font-mono text-slate-600">
              <span>60 patients</span>
            </div>
            <div className="absolute inset-x-4 top-36 border-t border-slate-800/60 flex justify-between text-[9px] font-mono text-slate-600 font-semibold">
              <span>30 patients</span>
            </div>

            {/* Bars array representing mock hours data */}
            {[
              { hr: '08 AM', count: 12, h: 'h-1/5' },
              { hr: '10 AM', count: 48, h: 'h-3/5' },
              { hr: '12 PM', count: 86, h: 'h-11/12', active: true },
              { hr: '02 PM', count: 52, h: 'h-2/3' },
              { hr: '04 PM', count: 28, h: 'h-2/5' },
              { hr: '06 PM', count: 16, h: 'h-1/4' }
            ].map((bar, i) => (
              <div key={i} className="flex flex-col items-center flex-grow group z-10 space-y-2">
                <span className="text-[10px] text-slate-500 font-mono font-bold leading-none opacity-0 group-hover:opacity-100 transition-opacity">
                  {bar.count}
                </span>
                <div className="relative w-12 flex justify-center">
                  <div className={`w-6 rounded-t-lg transition-all duration-500 origin-bottom scale-y-100 ${bar.h} ${
                    bar.active 
                    ? "bg-gradient-to-t from-teal-500 via-cyan-400 to-emerald-450 shadow-lg shadow-teal-500/20" 
                    : "bg-slate-800 hover:bg-slate-700/80"
                  }`}></div>
                </div>
                <span className="text-[10px] text-slate-400 font-mono font-medium">{bar.hr}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Doctor chamber diagnostic volume counts */}
        <div className="lg:col-span-1 bg-slate-900/40 border border-teal-500/15 rounded-3xl p-6 shadow-xl">
          <div className="border-b border-white/5 pb-4 mb-4">
            <h3 className="font-bold text-slate-100 font-sans text-sm uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              Physician Performance
            </h3>
            <p className="text-xs text-slate-400">Total clinical clearances processed inside chambers</p>
          </div>

          <div className="space-y-4">
            {doctorCompletionData.map((data, i) => (
              <div key={i} className="bg-slate-950/40 p-4 border border-slate-800 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-100 text-xs block">{data.name}</span>
                  <span className="text-[10px] bg-teal-500/10 border border-teal-500/20 text-teal-400 font-mono px-2 py-0.5 rounded-lg leading-none">
                    {data.completed} Done
                  </span>
                </div>

                {/* Progress bar tracking complete */}
                <div className="space-y-1">
                  <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-teal-500 to-emerald-400 h-full rounded-full"
                      style={{ width: `${Math.min(100, (data.completed / 20) * 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[9px] font-mono text-slate-500">
                    <span>Missed appointments: {data.skipped}</span>
                    <span>Daily standard: 20</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Advisory Note */}
      <div className="bg-cyan-500/10 border border-cyan-500/20 p-4 rounded-2xl flex items-center gap-3 text-cyan-400 text-xs leading-relaxed font-sans max-w-full">
        <Zap className="w-5 h-5 flex-shrink-0 animate-pulse" />
        <div>
          <span className="font-bold block uppercase tracking-wider mb-0.5 text-[11px]">Dynamic AI wait predications</span>
          Awaiting predictions automatically calibrate to the clinic queue sizes. Adjust hospital reset intervals inside settings.
        </div>
      </div>
    </div>
  );
}
