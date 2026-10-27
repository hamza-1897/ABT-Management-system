'use client';

import { useState, useEffect } from 'react';

export default function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const [currentDate, setCurrentDate] = useState<string>('');

  useEffect(() => {
    setCurrentDate(
      new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    );
  }, []);

  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6">
      
      {/* Mobile Sidebar Toggle Button */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
          aria-label="Toggle Sidebar"
        >
          ☰
        </button>
        <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md border border-slate-200 hidden sm:inline-block">
          Mandi Bahauddin Branch
        </span>
      </div>

      {/* Right Action Icons & Status */}
      <div className="flex items-center gap-4">
        {/* Connection Status */}
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="hidden sm:inline">Database Live</span>
        </div>

        <div className="h-4 w-px bg-slate-200"></div>

        {/* Quick Date Display */}
        <div className="text-xs text-slate-500 font-medium h-4 min-w-[80px]">
          {currentDate}
        </div>
      </div>

    </header>
  );
}