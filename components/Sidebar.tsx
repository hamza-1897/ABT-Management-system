'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar({ isOpen, setIsOpen }: { isOpen: boolean; setIsOpen: (val: boolean) => void }) {
  const pathname = usePathname();

  // Collapsible sections state
  const [openSection, setOpenSection] = useState<string | null>('management');

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)} 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside 
        className={`fixed top-0 left-0 bottom-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Logo & Name */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
              A
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide leading-none">ABT TRADERS</h2>
              <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">Distributor SMIS</span>
            </div>
          </div>

          <button 
            onClick={() => setIsOpen(false)} 
            className="lg:hidden text-slate-400 hover:text-white p-1 rounded-md"
          >
            ✕
          </button>
        </div>

        {/* Navigation Categories & Sub-menus */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1 text-sm font-medium">
          
          {/* Dashboard */}
          <Link
            href="/"
            onClick={() => setIsOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
              pathname === '/' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>
            <span>Dashboard</span>
          </Link>

          {/* MANAGEMENT & SETUP DRAWER (Saare create, edit, manage yahan honge) */}
          <div>
            <button
              onClick={() => toggleSection('management')}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-3">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                <span>Management & Setup</span>
              </span>
              <span className="text-xs text-slate-500">{openSection === 'management' ? '▲' : '▼'}</span>
            </button>
            
            {openSection === 'management' && (
              <div className="pl-7 mt-1 space-y-1 border-l-2 border-slate-800 ml-4">
                <Link
                  href="/customers"
                  onClick={() => setIsOpen(false)}
                  className={`block px-3 py-2 rounded-md text-xs transition-colors ${pathname.startsWith('/customers') ? 'bg-blue-600/30 text-blue-400 font-bold' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                >
                  Customer Management
                </Link>
                <Link
                  href="/suppliers"
                  onClick={() => setIsOpen(false)}
                  className={`block px-3 py-2 rounded-md text-xs transition-colors ${pathname.startsWith('/suppliers') ? 'bg-blue-600/30 text-blue-400 font-bold' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                >
                  Supplier Management
                </Link>
                <Link
                  href="/products"
                  onClick={() => setIsOpen(false)}
                  className={`block px-3 py-2 rounded-md text-xs transition-colors ${pathname.startsWith('/products') ? 'bg-blue-600/30 text-blue-400 font-bold' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                >
                  Product Setup
                </Link>
                <Link
                  href="/accounts/cash/manage"
                  onClick={() => setIsOpen(false)}
                  className={`block px-3 py-2 rounded-md text-xs transition-colors ${pathname === '/accounts/cash/manage' ? 'bg-blue-600/30 text-blue-400 font-bold' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                >
                  Manage Cash Drawers
                </Link>
                <Link
                  href="/accounts/banks/manage"
                  onClick={() => setIsOpen(false)}
                  className={`block px-3 py-2 rounded-md text-xs transition-colors ${pathname === '/accounts/banks/manage' ? 'bg-blue-600/30 text-blue-400 font-bold' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                >
                  Manage Bank Accounts
                </Link>
              </div>
            )}
          </div>

          {/* FINANCE & TRANSFERS SETUP */}
          <div>
            <button
              onClick={() => toggleSection('finance')}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-3">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>
                <span>Finance & Transfers</span>
              </span>
              <span className="text-xs text-slate-500">{openSection === 'finance' ? '▲' : '▼'}</span>
            </button>
            
            {openSection === 'finance' && (
              <div className="pl-7 mt-1 space-y-1 border-l-2 border-slate-800 ml-4">
                <Link
                  href="/transfers/bank-to-bank"
                  onClick={() => setIsOpen(false)}
                  className={`block px-3 py-2 rounded-md text-xs transition-colors ${pathname === '/transfers/bank-to-bank' ? 'bg-blue-600/30 text-blue-400 font-bold' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                >
                  Bank to Bank Transfer
                </Link>
                <Link
                  href="/transfers/bank-to-cash"
                  onClick={() => setIsOpen(false)}
                  className={`block px-3 py-2 rounded-md text-xs transition-colors ${pathname === '/transfers/bank-to-cash' ? 'bg-blue-600/30 text-blue-400 font-bold' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                >
                  Bank to Petty Cash
                </Link>
                <Link
                  href="/transfers/cash-to-bank"
                  onClick={() => setIsOpen(false)}
                  className={`block px-3 py-2 rounded-md text-xs transition-colors ${pathname === '/transfers/cash-to-bank' ? 'bg-blue-600/30 text-blue-400 font-bold' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                >
                  Cash to Bank Deposit
                </Link>
                <Link
                  href="/transfers/cash-to-cash"
                  onClick={() => setIsOpen(false)}
                  className={`block px-3 py-2 rounded-md text-xs transition-colors ${pathname === '/transfers/cash-to-cash' ? 'bg-blue-600/30 text-blue-400 font-bold' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                >
                  Petty Cash Transfer
                </Link>
              </div>
            )}
          </div>

          {/* REPORTS & VIEW BALANCES */}
          <div>
            <button
              onClick={() => toggleSection('reports')}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-3">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                <span>Reports & Balances</span>
              </span>
              <span className="text-xs text-slate-500">{openSection === 'reports' ? '▲' : '▼'}</span>
            </button>
            
            {openSection === 'reports' && (
              <div className="pl-7 mt-1 space-y-1 border-l-2 border-slate-800 ml-4">
                <Link
                  href="/accounts/cash"
                  onClick={() => setIsOpen(false)}
                  className={`block px-3 py-2 rounded-md text-xs transition-colors ${pathname === '/accounts/cash' ? 'bg-blue-600/30 text-blue-400 font-bold' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                >
                  Petty Cash Balances
                </Link>
                <Link
                  href="/accounts/banks"
                  onClick={() => setIsOpen(false)}
                  className={`block px-3 py-2 rounded-md text-xs transition-colors ${pathname === '/accounts/banks' ? 'bg-blue-600/30 text-blue-400 font-bold' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                >
                  Bank Balances
                </Link>
                <Link
                  href="/reports/accounts"
                  onClick={() => setIsOpen(false)}
                  className={`block px-3 py-2 rounded-md text-xs transition-colors ${pathname === '/reports/accounts' ? 'bg-blue-600/30 text-blue-400 font-bold' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                >
                  Closing Balances Report
                </Link>
              </div>
            )}
          </div>

        </nav>

        {/* User Info Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-semibold text-white">
              HA
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">Abu Bakar Traders</p>
              <p className="text-[10px] text-slate-400 truncate">System Administrator</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}