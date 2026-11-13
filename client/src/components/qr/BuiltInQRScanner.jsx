import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, RefreshCw, X, AlertCircle, KeyRound } from 'lucide-react';

export function BuiltInQRScanner({ onScanSuccess, onClose, onManualEntry }) {
  const [cameraError, setCameraError] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const [isStarting, setIsStarting] = useState(true);
  const scannerRef = useRef(null);
  const containerId = 'screenroom-qr-reader';

  // Parse QR scan text into room code and token
  const parseScanText = (decodedText) => {
    try {
      if (decodedText.startsWith('http://') || decodedText.startsWith('https://')) {
        const url = new URL(decodedText);
        const codeFromParam = url.searchParams.get('code');
        const tokenFromParam = url.searchParams.get('token');

        if (codeFromParam) {
          return { code: codeFromParam.toUpperCase(), token: tokenFromParam };
        }

        // Check path like /join/XYZ8
        const pathSegments = url.pathname.split('/').filter(Boolean);
        const lastSegment = pathSegments[pathSegments.length - 1];
        if (lastSegment && lastSegment.length === 4) {
          return { code: lastSegment.toUpperCase(), token: tokenFromParam };
        }
      }

      // Plain 4-char code
      const clean = decodedText.trim().toUpperCase();
      if (clean.length === 4) {
        return { code: clean, token: null };
      }

      // Fallback: take first 4 alphanumeric characters
      const match = decodedText.match(/[A-Z0-9]{4}/i);
      if (match) {
        return { code: match[0].toUpperCase(), token: null };
      }

      return { code: clean, token: null };
    } catch {
      return { code: decodedText.trim().toUpperCase(), token: null };
    }
  };

  useEffect(() => {
    let html5QrCode = null;

    const startScanner = async () => {
      try {
        setIsStarting(true);
        setCameraError(null);

        // Get available cameras
        const devices = await Html5Qrcode.getCameras();
        if (!devices || devices.length === 0) {
          throw new Error('No camera found on this device.');
        }

        setCameras(devices);

        // Prefer rear camera on mobile
        let targetCameraId = devices[0].id;
        const rearCamera = devices.find((d) =>
          d.label.toLowerCase().includes('back') ||
          d.label.toLowerCase().includes('rear') ||
          d.label.toLowerCase().includes('environment')
        );
        if (rearCamera) {
          targetCameraId = rearCamera.id;
          const idx = devices.findIndex((d) => d.id === rearCamera.id);
          if (idx >= 0) setCurrentCameraIndex(idx);
        }

        html5QrCode = new Html5Qrcode(containerId, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        });
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          targetCameraId,
          {
            fps: 15,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            // Success callback
            const parsed = parseScanText(decodedText);
            html5QrCode.stop().then(() => {
              onScanSuccess(parsed);
            }).catch(() => {
              onScanSuccess(parsed);
            });
          },
          () => {
            // Scanning in progress...
          }
        );
        setIsStarting(false);
      } catch (err) {
        console.error('[QRScanner] Camera error:', err);
        setCameraError(err.message || 'Unable to access camera.');
        setIsStarting(false);
      }
    };

    startScanner();

    return () => {
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .catch(() => {})
          .then(() => {
            scannerRef.current?.clear();
          });
      }
    };
  }, [onScanSuccess]);

  // Flip camera between available devices
  const switchCamera = async () => {
    if (!cameras || cameras.length <= 1 || !scannerRef.current) return;
    try {
      setIsStarting(true);
      await scannerRef.current.stop();
      const nextIndex = (currentCameraIndex + 1) % cameras.length;
      setCurrentCameraIndex(nextIndex);
      await scannerRef.current.start(
        cameras[nextIndex].id,
        {
          fps: 15,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          const parsed = parseScanText(decodedText);
          scannerRef.current.stop().then(() => onScanSuccess(parsed)).catch(() => onScanSuccess(parsed));
        },
        () => {}
      );
      setIsStarting(false);
    } catch (e) {
      setCameraError(e.message || 'Failed to switch camera');
      setIsStarting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-brand-500/20 text-brand-400 rounded-xl">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Scan TV QR Code</h3>
              <p className="text-xs text-slate-400">Point your camera at the Smart TV screen</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Scanner Viewport */}
        <div className="relative aspect-square w-full bg-black flex items-center justify-center overflow-hidden">
          <div id={containerId} className="w-full h-full" />

          {/* Scanner Overlay Laser & Reticle */}
          {!cameraError && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative w-64 h-64 border-2 border-brand-400/80 rounded-2xl shadow-[0_0_20px_rgba(56,189,248,0.4)]">
                {/* Corner accents */}
                <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-brand-400 rounded-tl-lg" />
                <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-brand-400 rounded-tr-lg" />
                <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-brand-400 rounded-bl-lg" />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-brand-400 rounded-br-lg" />

                {/* Animated scan line */}
                <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-bounce shadow-[0_0_10px_#38bdf8]" />
              </div>
            </div>
          )}

          {/* Loading state */}
          {isStarting && (
            <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center space-y-3 z-10">
              <RefreshCw className="w-8 h-8 text-brand-400 animate-spin" />
              <p className="text-sm text-slate-300 font-medium">Starting Camera...</p>
            </div>
          )}

          {/* Camera Error State */}
          {cameraError && (
            <div className="absolute inset-0 bg-slate-950 p-6 flex flex-col items-center justify-center text-center space-y-4 z-10">
              <div className="p-3 bg-rose-500/20 text-rose-400 rounded-2xl">
                <AlertCircle className="w-10 h-10" />
              </div>
              <div>
                <h4 className="font-semibold text-white">Camera Access Blocked</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">{cameraError}</p>
                <p className="text-[11px] text-slate-500 mt-2">
                  Please enable camera permission in your browser or enter the 4-character room code manually.
                </p>
              </div>
              <div className="flex flex-col space-y-2 w-full max-w-xs pt-2">
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-medium text-white transition"
                >
                  Retry Camera
                </button>
                {onManualEntry && (
                  <button
                    onClick={() => {
                      onClose();
                      onManualEntry();
                    }}
                    className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-sm font-medium text-white transition flex items-center justify-center space-x-2"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>Enter Code Manually</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer controls */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between">
          {cameras.length > 1 && (
            <button
              onClick={switchCamera}
              className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Flip Camera</span>
            </button>
          )}

          {onManualEntry && (
            <button
              onClick={() => {
                onClose();
                onManualEntry();
              }}
              className="flex items-center space-x-1.5 text-xs font-medium text-brand-400 hover:text-brand-300 ml-auto transition"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Enter 4-character code instead</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

