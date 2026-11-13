import React from 'react';
import { Layers, Image, Film, FileText, MessageSquare } from 'lucide-react';

export function TVCategoryTabs({
  currentCategory,
  onSelectCategory,
  counts = {},
  isFocused = false,
  focusedTabIndex = 0,
}) {
  const tabs = [
    { id: 'all', label: 'All Files', icon: Layers, count: counts.all || 0 },
    { id: 'image', label: 'Images', icon: Image, count: counts.image || 0 },
    { id: 'video', label: 'Videos', icon: Film, count: counts.video || 0 },
    { id: 'pdf', label: 'PDFs & Docs', icon: FileText, count: counts.pdf || 0 },
    { id: 'messages', label: 'Messages', icon: MessageSquare, count: counts.messages || 0 },
  ];

  return (
    <div className="flex items-center space-x-3 overflow-x-auto pb-2 scrollbar-none">
      {tabs.map((tab, idx) => {
        const Icon = tab.icon;
        const isActive = currentCategory === tab.id;
        const hasTabFocus = isFocused && focusedTabIndex === idx;

        return (
          <button
            key={tab.id}
            onClick={() => onSelectCategory(tab.id)}
            className={`flex items-center space-x-2.5 px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-200 select-none ${
              hasTabFocus
                ? 'tv-focus-glow bg-brand-600 text-white'
                : isActive
                ? 'bg-slate-800 text-white border-2 border-brand-500/80 shadow-lg shadow-brand-500/20'
                : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{tab.label}</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-mono ${
                isActive ? 'bg-brand-500/30 text-brand-200' : 'bg-slate-800 text-slate-500'
              }`}
            >
              {tab.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

