import React, { useState, useEffect } from 'react';
import { Bell, MessageSquare, UploadCloud } from 'lucide-react';

export function TVNotificationToast() {
  const [activeAlert, setActiveAlert] = useState(null);

  useEffect(() => {
    // Listen for custom notifications
    const handleNotification = (e) => {
      const { title, message, type = 'info' } = e.detail;
      setActiveAlert({ title, message, type, id: Date.now() });

      setTimeout(() => {
        setActiveAlert((prev) => (prev && prev.id === e.detail.id ? null : prev));
      }, 6000);
    };

    window.addEventListener('sr-tv-notification', handleNotification);
    return () => window.removeEventListener('sr-tv-notification', handleNotification);
  }, []);

  if (!activeAlert) return null;

  return (
    <div className="fixed top-8 right-8 z-50 animate-slideDown pointer-events-none">
      <div className="flex items-center space-x-4 bg-slate-900/95 border-2 border-brand-500/80 p-4 rounded-2xl shadow-2xl shadow-brand-500/30 backdrop-blur-xl max-w-md">
        <div className="p-3 bg-brand-500/20 text-brand-300 rounded-xl">
          {activeAlert.type === 'message' ? (
            <MessageSquare className="w-6 h-6 animate-bounce" />
          ) : (
            <UploadCloud className="w-6 h-6 animate-pulse" />
          )}
        </div>
        <div>
          <h4 className="font-bold text-white text-base">{activeAlert.title}</h4>
          <p className="text-sm text-slate-300 line-clamp-2 mt-0.5">{activeAlert.message}</p>
        </div>
      </div>
    </div>
  );
}

