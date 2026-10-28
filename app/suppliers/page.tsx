'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { exportTableToPDF } from '@/utils/printHelper';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Modals & Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');
  const [includeInDashboard, setIncludeInDashboard] = useState(true);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  const fetchSuppliers = async () => {
    setLoading(true);
    const { data } = await supabase.from('suppliers').select('*').order('created_at', { ascending: false });
    setSuppliers(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) =>
      (s.name && s.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.location && s.location.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [suppliers, searchQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert('Supplier Name zaroori hai!');

    if (isEditMode) {
      const { error } = await supabase.from('suppliers').update({ name, location, include_in_dashboard: includeInDashboard }).eq('id', currentId);
      if (error) alert(error.message);
      else { alert('Supplier updated successfully!'); setIsModalOpen(false); fetchSuppliers(); }
    } else {
      const { error } = await supabase.from('suppliers').insert([{ name, location, opening_balance: parseFloat(openingBalance) || 0, include_in_dashboard: includeInDashboard, is_active: true }]);
      if (error) alert(error.message);
      else { alert('Supplier added successfully!'); setIsModalOpen(false); fetchSuppliers(); }
    }
  };

  const openAddModal = () => {
    setIsEditMode(false);
    setName(''); setLocation(''); setOpeningBalance(''); setIncludeInDashboard(true);
    setIsModalOpen(true);
  };

  const openEditModal = (s: any) => {
    setIsEditMode(true);
    setCurrentId(s.id);
    setName(s.name); setLocation(s.location || ''); setOpeningBalance(s.opening_balance || 0); setIncludeInDashboard(s.include_in_dashboard !== false);
    setIsModalOpen(true);
  };

  const handlePrint = () => {
    exportTableToPDF({
      title: 'Supplier Directory',
      subtitle: 'Cement Mills & Suppliers Master Report',
      filterName: 'All Records',
      data: filteredSuppliers,
      columns: ['#', 'Supplier Name', 'Location', 'Opening Balance'],
      renderRow: (s, idx) => `
        <tr>
          <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">${idx + 1}</td>
          <td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold;">${s.name}</td>
          <td style="padding: 8px; border: 1px solid #cbd5e1;">${s.location || '-'}</td>
          <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right; font-family: monospace; font-weight: bold;">Rs. ${Number(s.opening_balance || 0).toLocaleString()}</td>
        </tr>
      `,
    });
  };

  return (
    <div className="p-6 space-y-6 font-sans text-slate-800">
      <div className="flex justify-between items-center border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Supplier Management</h1>
          <p className="text-sm text-slate-500">Master database of all registered cement mills and suppliers.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handlePrint} className="bg-slate-800 hover:bg-slate-900 text-white text-sm px-4 py-2 rounded-lg cursor-pointer">📄 Export PDF</button>
          <button onClick={openAddModal} className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg cursor-pointer">+ Add Supplier</button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <div className="max-w-sm w-full">
            <input type="text" placeholder="Search by name or location..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg" />
          </div>
          <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-semibold">Total: {filteredSuppliers.length}</span>
        </div>

        {loading ? <div className="p-8 text-center text-slate-400">Load ho raha hai...</div> : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-100 text-xs text-slate-600 border-b">
                <th className="p-3 pl-4">Supplier Name</th>
                <th className="p-3">Location</th>
                <th className="p-3">Dashboard Total?</th>
                <th className="p-3 pr-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSuppliers.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="p-3 pl-4 font-semibold">{s.name}</td>
                  <td className="p-3 text-slate-600">{s.location || '-'}</td>
                  <td className="p-3">
                    <span className={`text-[11px] px-2 py-0.5 rounded font-medium ${s.include_in_dashboard !== false ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                      {s.include_in_dashboard !== false ? 'Included' : 'Excluded'}
                    </span>
                  </td>
                  <td className="p-3 pr-4 text-center">
                    <button onClick={() => openEditModal(s)} className="text-blue-600 bg-blue-50 px-2.5 py-1 rounded text-xs font-medium cursor-pointer">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
              <h2 className="font-semibold">{isEditMode ? 'Edit Supplier' : 'Add Supplier'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="cursor-pointer font-bold">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Supplier Name *</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 text-sm border rounded-lg" required />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Location</label>
                <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className="w-full px-3 py-2 text-sm border rounded-lg" />
              </div>
              {!isEditMode && (
                <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                  <label className="block text-xs font-semibold text-amber-900 mb-1">Opening Balance (Rs.)</label>
                  <input type="number" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} className="w-full px-3 py-2 text-sm bg-white border border-amber-300 rounded-lg font-mono" />
                </div>
              )}
              <div className="flex items-center gap-2 pt-2">
                <input type="checkbox" id="incSupp" checked={includeInDashboard} onChange={(e) => setIncludeInDashboard(e.target.checked)} className="w-4 h-4" />
                <label htmlFor="incSupp" className="text-xs font-semibold cursor-pointer">Include in Dashboard Total?</label>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-slate-600 cursor-pointer">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg cursor-pointer">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
  
}