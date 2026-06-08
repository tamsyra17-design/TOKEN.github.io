/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Volume2, VolumeX, Radio } from 'lucide-react';

// Generates an elegant, high-end clinical chime (a beautiful medical buzzer) in real-time using the Web Audio API
export const playHospitalBuzzerChime = async () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    
    const ctx = new AudioContextClass();
    
    // Node 1: Gain
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, ctx.currentTime);
    masterGain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.05);
    masterGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
    masterGain.connect(ctx.destination);

    // Tone 1: E5
    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
    osc1.frequency.exponentialRampToValueAtTime(880.00, ctx.currentTime + 0.15); // Slide to A5
    osc1.connect(masterGain);

    // Tone 2: C5 Harmonics
    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(523.25, ctx.currentTime + 0.1); // C5 Delayed
    osc2.connect(masterGain);

    osc1.start(ctx.currentTime);
    osc2.start(ctx.currentTime + 0.1);

    osc1.stop(ctx.currentTime + 1.3);
    osc2.stop(ctx.currentTime + 1.3);
  } catch (err) {
    console.warn("Auditory AudioContext buzzer bypassed due to window permissions state:", err);
  }
};

// Map patient-specific preferred or system languages into actual speech utterances with translations
export const speakTokenAnnouncement = (
  tokenNumber: number | string,
  doctorName: string,
  roomNumber: string,
  lang: string = 'en'
) => {
  if (!('speechSynthesis' in window)) {
    console.error("This browser does not support client-side Web Speech Synthesis.");
    return;
  }

  // Pre-chime automatically on triggering announcement
  playHospitalBuzzerChime();

  setTimeout(() => {
    let utteranceText = '';
    let voiceLangCode = 'en-US';

    if (lang === 'ar') {
      utteranceText = `رقم التوكن ${tokenNumber} يرجى التوجه إلى الدكتور ${doctorName} في الغرفة ${roomNumber}`;
      voiceLangCode = 'ar-SA';
    } else if (lang === 'bn') {
      utteranceText = `টোকেন নম্বর ${tokenNumber}, অনুগ্রহ করে ডাক্তার ${doctorName} এর কক্ষে যান, রুম নম্বর ${roomNumber}`;
      voiceLangCode = 'bn-BD';
    } else {
      // Default: English
      utteranceText = `Token number ${tokenNumber}, please proceed to Doctor ${doctorName} in Room ${roomNumber}`;
      voiceLangCode = 'en-US';
    }

    const utterance = new SpeechSynthesisUtterance(utteranceText);
    utterance.lang = voiceLangCode;
    utterance.rate = 0.85; // Natural speed cadence
    utterance.pitch = 1.0;

    // Fetch matching voice profile in background
    const voices = window.speechSynthesis.getVoices();
    const targetVoice = voices.find(v => v.lang.startsWith(voiceLangCode.substring(0, 2)));
    if (targetVoice) {
      utterance.voice = targetVoice;
    }

    window.speechSynthesis.speak(utterance);
  }, 450); // Small timeout so audio chime completes elegantly
};

interface VoiceBroadcastingProps {
  currentCalledToken?: {
    tokenNumber: string | number;
    doctorName: string;
    roomNumber: string;
    language: string;
  };
}

export default function VoiceAnnouncement({ currentCalledToken }: VoiceBroadcastingProps) {
  const [muted, setMuted] = useState(false);

  const handleManualTestSpeech = () => {
    if (currentCalledToken) {
      speakTokenAnnouncement(
        currentCalledToken.tokenNumber,
        currentCalledToken.doctorName,
        currentCalledToken.roomNumber,
        currentCalledToken.language
      );
    } else {
      speakTokenAnnouncement("15", "Ahmed", "102", "en");
    }
  };

  return (
    <div className="bg-slate-900/40 border border-teal-500/10 rounded-2xl p-4 flex items-center justify-between backdrop-blur-md shadow-lg">
      <div className="flex items-center gap-3">
        <div className="relative">
          <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
          <span className="absolute -top-1 -right-1 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-slate-200">
            Smart Speech Broadcasting
          </h4>
          <p className="text-xs text-slate-400">
            {currentCalledToken
              ? `Ready to vocalize Token ${currentCalledToken.tokenNumber}`
              : "System idle, listening for receptionist updates"
            }
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleManualTestSpeech}
          className="bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 text-xs px-3 py-1.5 rounded-lg border border-teal-500/20 active:scale-95 transition-all font-mono"
        >
          Check Audio Voice
        </button>
        <button
          onClick={() => {
            setMuted(!muted);
            if (!muted) {
              window.speechSynthesis?.cancel();
            }
          }}
          className={`p-2 rounded-lg border active:scale-95 transition-all ${
            muted
              ? "bg-rose-500/15 border-rose-500/30 text-rose-400"
              : "bg-slate-800 border-slate-700 text-slate-300 hover:text-slate-100"
          }`}
          title={muted ? "Unmute vocal broadcasting" : "Mute vocal broadcasting"}
        >
          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
