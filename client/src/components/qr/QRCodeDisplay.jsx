import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, Share2, Smartphone } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export function QRCodeDisplay({ roomCode, pairingToken, size = 220, showDetails = true }) {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);

  const origin = window.location.origin;
  const joinUrl = `${origin}/join?code=${encodeURIComponent(roomCode)}${
    pairingToken ? `&token=${encodeURIComponent(pairingToken)}` : ''
  }`;

  const handleCopy = () => {
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    showToast('Room link copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ScreenRoom: ${roomCode}`,
          text: `Connect to TV and share files wirelessly using code ${roomCode}`,
          url: joinUrl,
        });
      } catch {
        handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="flex flex-col items-center">
      {/* QR Code Container */}
      <div className="p-4 rounded-3xl bg-white shadow-2xl border-4 border-brand-500/30 transition-transform duration-300 hover:scale-105">
        <QRCodeSVG
          value={joinUrl}
          size={size}
          level="H"
          includeMargin={false}
          imageSettings={{
            src: '/screenroom-logo.svg',
            x: undefined,
            y: undefined,
            height: Math.round(size * 0.2),
            width: Math.round(size * 0.2),
            excavate: true,
          }}
        />
      </div>

      {showDetails && (
        <div className="mt-5 flex flex-col items-center space-y-3 w-full">
          <div className="flex items-center space-x-2 bg-slate-900/80 px-4 py-2 rounded-2xl border border-slate-700/60">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Room Code:</span>
            <span className="text-2xl font-black font-mono tracking-widest text-brand-400">{roomCode}</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-medium rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition border border-slate-700"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Link'}</span>
            </button>

            <button
              onClick={handleShare}
              className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-medium rounded-xl bg-brand-600 hover:bg-brand-500 text-white transition shadow-lg shadow-brand-500/20"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

