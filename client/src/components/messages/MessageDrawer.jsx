import React, { useState } from 'react';
import { Send, MessageSquare, X, Clock, Sparkles } from 'lucide-react';
import { apiClient } from '../../api/apiClient';
import { useToast } from '../../context/ToastContext';

const QUICK_PROMPTS = [
  'Please check this document.',
  'Open the second image.',
  'Look at the latest uploaded PDF.',
  'Check out this video clip!',
];

export function MessageDrawer({ roomId, messages = [], isOpen, onClose }) {
  const { showToast } = useToast();
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);

  if (!isOpen) return null;

  const handleSend = async (messageText) => {
    const textToSend = (messageText || text).trim();
    if (!textToSend) return;

    try {
      setIsSending(true);
      const senderName = localStorage.getItem('screenroom_device_name') || 'Mobile User';

      await apiClient.sendMessage({
        roomId,
        text: textToSend,
        senderName,
        senderType: 'mobile',
      });

      setText('');
      setIsSending(false);
      showToast('Message sent to TV!', 'success');
    } catch (err) {
      console.error('[MessageDrawer] Send error:', err);
      showToast(err.message || 'Failed to send message', 'error');
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-brand-500/20 text-brand-400 rounded-xl">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Send Message to TV</h3>
              <p className="text-xs text-slate-400">Pops up as a live banner on the TV screen</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message History */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1 max-h-60">
          {messages.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-xs">
              No messages sent yet. Send a note or instruction to the TV!
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={msg.messageId || idx}
                className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/50 space-y-1"
              >
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-semibold text-brand-300">{msg.senderName}</span>
                  <span className="font-mono text-slate-500">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs text-slate-200">{msg.text}</p>
              </div>
            ))
          )}
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-4 py-2 border-t border-slate-800/60 bg-slate-950/30">
          <div className="text-[11px] text-slate-400 mb-1.5 flex items-center space-x-1">
            <Sparkles className="w-3 h-3 text-brand-400" />
            <span>Quick Suggestions:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_PROMPTS.map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSend(prompt)}
                disabled={isSending}
                className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] border border-slate-700 transition"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Text Input Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center space-x-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
            placeholder="Type a message or instruction..."
            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-brand-500 transition"
          />
          <button
            onClick={() => handleSend()}
            disabled={isSending || !text.trim()}
            className="p-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-40 disabled:pointer-events-none text-white shadow-lg shadow-brand-500/20 transition"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

