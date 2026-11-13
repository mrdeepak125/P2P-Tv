import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  X,
  FileText,
  Image,
  Film,
  CheckCircle,
  AlertCircle,
  Loader2,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { apiClient } from '../../api/apiClient';
import { useToast } from '../../context/ToastContext';

const MAX_FILE_SIZE = 250 * 1024 * 1024; // 250MB
const ALLOWED_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.mp4', '.webm', '.mov', '.pdf'];

export function FileUploadModal({
  roomId,
  existingFiles = [],
  isOpen,
  onClose,
  onUploadComplete,
}) {
  const { showToast } = useToast();
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [duplicateWarnings, setDuplicateWarnings] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFiles = (incomingFiles) => {
    const validList = [];
    const duplicates = [];

    for (const file of incomingFiles) {
      const ext = '.' + file.name.split('.').pop().toLowerCase();

      // Check format
      if (!ALLOWED_EXTS.includes(ext)) {
        showToast(`Skipped "${file.name}": Unsupported format`, 'error');
        continue;
      }

      // Check size
      if (file.size > MAX_FILE_SIZE) {
        showToast(`Skipped "${file.name}": Exceeds 250MB limit`, 'error');
        continue;
      }

      // Check duplicate against existing room files
      const isAlreadyInRoom = existingFiles.some(
        (ef) =>
          ef.originalName.toLowerCase() === file.name.toLowerCase() &&
          ef.size === file.size
      );

      // Check duplicate within currently selected list
      const isAlreadyInQueue = selectedFiles.some(
        (sf) =>
          sf.name.toLowerCase() === file.name.toLowerCase() &&
          sf.size === file.size
      );

      if (isAlreadyInRoom || isAlreadyInQueue) {
        duplicates.push(file.name);
        continue;
      }

      validList.push(file);
    }

    if (duplicates.length > 0) {
      setDuplicateWarnings((prev) => [...prev, ...duplicates]);
      showToast(
        `Skipped ${duplicates.length} duplicate file(s) already in this room!`,
        'info',
        4000
      );
    }

    setSelectedFiles((prev) => [...prev, ...validList]);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const removeFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    try {
      setIsUploading(true);
      setUploadProgress(0);

      const deviceName = localStorage.getItem('screenroom_device_name') || 'Mobile User';

      const uploaded = await apiClient.uploadFiles({
        roomId,
        files: selectedFiles,
        uploaderName: deviceName,
        onProgress: ({ percent }) => {
          setUploadProgress(percent);
        },
      });

      showToast(`Uploaded ${uploaded.length} file(s) to TV!`, 'success');
      setSelectedFiles([]);
      setDuplicateWarnings([]);
      setIsUploading(false);
      if (onUploadComplete) onUploadComplete(uploaded);
      onClose();
    } catch (err) {
      console.error('[UploadModal] Upload error:', err);
      showToast(err.message || 'File upload failed', 'error');
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl p-4 animate-fadeIn">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-brand-500/20 text-brand-400 rounded-2xl border border-brand-500/30">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-lg tracking-tight">Upload Files to TV</h3>
              <p className="text-xs text-slate-400">Share photos, videos & PDFs • Duplicate prevention enabled</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Duplicate Warnings Alert */}
          {duplicateWarnings.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/40 flex items-start space-x-3 text-xs text-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold">Duplicate Files Skipped:</span> {duplicateWarnings.join(', ')} (already present in room)
              </div>
              <button
                onClick={() => setDuplicateWarnings([])}
                className="text-amber-400 hover:text-white font-bold ml-1"
              >
                ✕
              </button>
            </div>
          )}

          {/* Drag & Drop Zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ${
              dragActive
                ? 'border-brand-400 bg-brand-500/15 scale-[1.01]'
                : 'border-slate-700 bg-slate-950/50 hover:border-brand-500/60 hover:bg-slate-950/80'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*,application/pdf"
              className="hidden"
              onChange={(e) => {
                if (e.target.files) handleFiles(Array.from(e.target.files));
              }}
            />
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-sky-400 p-0.5 shadow-lg shadow-brand-500/20 mb-3">
              <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center text-brand-400">
                <UploadCloud className="w-8 h-8" />
              </div>
            </div>
            <h4 className="font-bold text-white text-base">Drag & drop multiple files here</h4>
            <p className="text-xs text-slate-400 mt-1">or tap anywhere to select from device</p>
            <div className="flex items-center space-x-2 mt-4 text-[11px] font-mono text-slate-400">
              <span className="px-2.5 py-1 rounded-xl bg-slate-800/80 text-slate-300 border border-slate-700">Images (JPG, PNG, GIF)</span>
              <span className="px-2.5 py-1 rounded-xl bg-slate-800/80 text-slate-300 border border-slate-700">Videos (MP4, WEBM)</span>
              <span className="px-2.5 py-1 rounded-xl bg-slate-800/80 text-slate-300 border border-slate-700">PDFs</span>
            </div>
          </div>

          {/* Selected Files Queue */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-semibold">
                <span>Ready to Upload ({selectedFiles.length} files)</span>
                <span>
                  Total:{' '}
                  {(
                    selectedFiles.reduce((acc, f) => acc + f.size, 0) /
                    (1024 * 1024)
                  ).toFixed(2)}{' '}
                  MB
                </span>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                {selectedFiles.map((file, idx) => {
                  const isImage = file.type.startsWith('image/');
                  const isVideo = file.type.startsWith('video/');

                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/80 border border-slate-700/60"
                    >
                      <div className="flex items-center space-x-3 overflow-hidden">
                        <div className="p-2 rounded-xl bg-slate-900 text-brand-400 shrink-0">
                          {isImage ? (
                            <Image className="w-4 h-4" />
                          ) : isVideo ? (
                            <Film className="w-4 h-4" />
                          ) : (
                            <FileText className="w-4 h-4" />
                          )}
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-semibold text-slate-200 truncate">{file.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {(file.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFile(idx)}
                        disabled={isUploading}
                        className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Real Upload Progress Bar */}
          {isUploading && (
            <div className="space-y-2 p-4 bg-slate-950/90 rounded-2xl border border-brand-500/40">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="flex items-center space-x-2 text-brand-300">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Uploading files to TV...</span>
                </span>
                <span className="font-mono font-bold text-brand-400">{uploadProgress}%</span>
              </div>
              <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-brand-500 to-sky-400 transition-all duration-300 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <button
            onClick={() => {
              setSelectedFiles([]);
              setDuplicateWarnings([]);
            }}
            disabled={isUploading || selectedFiles.length === 0}
            className="text-xs text-slate-400 hover:text-slate-200 disabled:opacity-30 transition"
          >
            Clear All
          </button>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={isUploading || selectedFiles.length === 0}
              className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-extrabold shadow-lg shadow-brand-500/20 transition"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>Upload {selectedFiles.length > 0 ? `(${selectedFiles.length})` : ''}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
