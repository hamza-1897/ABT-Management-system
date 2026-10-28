'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { exportTableToPDF } from '@/utils/printHelper';

export default function CashDrawersPage() {
  const [cashDrawers, setCashDrawers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Modals & Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);

  const [accountName, setAccountName] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');

  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  const fetchCashDrawers = async () => {
    setLoading(true);
    // Sirf w Account fetch honge jinka account_type 'Cash' ho
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('account_type', 'Cash')
      .order('created_at', { ascending: false });

    if (error) console.error(error.message);
    setCashDrawers(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchCashDrawers();
  }, []);

  const filteredCashDrawers = useMemo(() => {
    return cashDrawers.filter((c) =>
      c.account_name && c.account_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [cashDrawers, searchQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountName.trim()) return alert('Cash Drawer Name zaroori hai!');

    const balance = parseFloat(openingBalance) || 0;

    if (isEditMode) {
      const { error } = await supabase.from('accounts').update({
        account_name: accountName,
      }).eq('id', currentId);

      if (error) alert(error.message);
      else { alert('Cash drawer updated successfully!'); setIsModalOpen(false); fetchCashDrawers(); }
    } else {
      const { error } = await supabase.from('accounts').insert([{
        account_name: accountName,
        account_type: 'Cash',
        bank_name: '-',
        account_number: '-',
        branch_name: '-',
        opening_balance: balance,
        current_balance: balance,
        is_active: true,
      }]);

      if (error) alert(error.message);
      else { alert('Cash drawer added successfully!'); setIsModalOpen(false); fetchCashDrawers(); }
    }
  };

  const openAddModal = () => {
    setIsEditMode(false);
    setAccountName(''); setOpeningBalance('');
    setIsModalOpen(true);
  };

  const openEditModal = (c: any) => {
    setIsEditMode(true);
    setCurrentId(c.id);
    setAccountName(c.account_name || '');
    setIsModalOpen(true);
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase.from('accounts').update({ is_active: !currentStatus }).eq('id', id);
    if (error) alert(error.message);
    else fetchCashDrawers();
  };

  const handlePrint = () => {
    exportTableToPDF({
      title: 'Cash Drawers Directory',
      subtitle: 'Corporate Cash Accounts Master Setup',
      filterName: 'All Cash Drawers',
      data: filteredCashDrawers,
      columns: ['#', 'Status', 'Cash Drawer Name'],
      renderRow: (c, idx) => {
        const isActive = c.is_active !== false;
        return `
          <tr>
            <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">${idx + 1}</td>
            <td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold;">${isActive ? 'Active' : 'Inactive'}</td>
            <td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold;">${c.account_name}</td>
          </tr>
        `;
      },
    });
  };

  return (
    <div className="p-6 space-y-6 font-sans text-slate-800">
      <div className="flex justify-between items-center border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cash Drawers Management</h1>
          <p className="text-sm text-slate-500">Manage corporate cash drawers and registers setup.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handlePrint} className="bg-slate-800 hover:bg-slate-900 text-white text-sm px-4 py-2 rounded-lg cursor-pointer">📄 Export PDF</button>
          <button onClick={openAddModal} className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg cursor-pointer">+ Add Cash Drawer</button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <div className="max-w-sm w-full">
            <input type="text" placeholder="Search cash drawer..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg" />
          </div>
          <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-semibold">Total Cash Drawers: {filteredCashDrawers.length}</span>
        </div>

        {loading ? <div className="p-8 text-center text-slate-400">Load ho raha hai...</div> : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-100 text-xs text-slate-600 border-b">
                <th className="p-3 pl-4">Status</th>
                <th className="p-3">Cash Drawer Name</th>
                <th className="p-3 pr-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCashDrawers.map((c) => {
                const isActive = c.is_active !== false;
                return (
                  <tr key={c.id} className={`hover:bg-slate-50 ${!isActive ? 'bg-slate-50 opacity-60' : ''}`}>
                    <td className="p-3 pl-4">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                        {isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-3 font-semibold">{c.account_name}</td>
                    <td className="p-3 pr-4 text-center space-x-2">
                      <button onClick={() => openEditModal(c)} className="text-blue-600 bg-blue-50 px-2.5 py-1 rounded text-xs font-medium cursor-pointer">Edit</button>
                      <button onClick={() => toggleStatus(c.id, isActive)} className={`text-xs font-medium px-2 py-1 rounded cursor-pointer ${isActive ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'}`}>
                        {isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
              <h2 className="font-semibold">{isEditMode ? 'Edit Cash Drawer' : 'Add New Cash Drawer'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="cursor-pointer font-bold">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Cash Drawer Name *</label>
                <input type="text" value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="e.g. Main Cash Drawer" className="w-full px-3 py-2 text-sm border rounded-lg" required />
              </div>

              {!isEditMode && (
                <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                  <label className="block text-xs font-semibold text-amber-900 mb-1">Opening Balance (Rs.)</label>
                  <input type="number" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} placeholder="0" className="w-full px-3 py-2 text-sm bg-white border border-amber-300 rounded-lg font-mono" />
                  <span className="text-[10px] text-amber-700 mt-1 block">Note: Opening balance sirf pehli dafa set hoga.</span>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-slate-600 cursor-pointer">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg cursor-pointer">Save Cash Drawer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}