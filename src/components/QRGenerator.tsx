/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { QrCode, ArrowRight } from 'lucide-react';

interface QRGeneratorProps {
  tokenUrl: string;
  patientName: string;
  tokenNumberString: string;
}

export default function QRGenerator({ tokenUrl, patientName, tokenNumberString }: QRGeneratorProps) {
  // Generate a standard, highly scannable QR Code image URL via secure API
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(tokenUrl)}`;

  return (
    <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl p-6 border border-teal-500/10 shadow-xl max-w-xs text-center flex flex-col items-center">
      <div className="flex items-center gap-2 mb-3">
        <QrCode className="w-5 h-5 text-cyan-400" />
        <span className="text-xs tracking-wider text-slate-300 font-mono font-medium uppercase">
          Digital Token Tracker
        </span>
      </div>

      <div className="relative p-3 bg-white rounded-xl mb-4 shadow-lg group">
        <img 
          src={qrCodeUrl} 
          alt={`Scan QR Code for Token ${tokenNumberString}`} 
          referrerPolicy="no-referrer"
          className="w-40 h-40 object-contain transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full p-1.5 shadow-md">
          <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </div>

      <h4 className="text-md font-semibold text-slate-100 mb-1 font-sans">
        Token {tokenNumberString}
      </h4>
      <p className="text-xs text-slate-400 mb-2 font-mono">
        Patient: {patientName}
      </p>
      
      <div className="bg-cyan-500/10 text-cyan-300 text-[10px] font-mono leading-relaxed px-3 py-1.5 rounded-lg border border-cyan-500/20 max-w-full truncate">
        Scan to track queue on your phone
      </div>
    </div>
  );
}
