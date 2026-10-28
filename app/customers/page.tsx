'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { exportTableToPDF } from '@/utils/printHelper';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Modals & Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState('General');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');
  const [includeInDashboard, setIncludeInDashboard] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const fetchCustomers = async () => {
    setLoading(true);
    const { data } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
    setCustomers(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const categoryOptions = useMemo(() => {
    const cats = new Set(customers.map((c) => c.category || 'General'));
    return Array.from(cats);
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchSearch = (c.name && c.name.toLowerCase().includes(searchQuery.toLowerCase())) || (c.code && c.code.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchCat = selectedCategory === 'ALL' || (c.category || 'General') === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [customers, searchQuery, selectedCategory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert('Customer Name zaroori hai!');

    if (isEditMode) {
      const { error } = await supabase.from('customers').update({ name, code, category, phone, address, include_in_dashboard: includeInDashboard }).eq('id', currentId);
      if (error) alert(error.message);
      else { alert('Updated successfully!'); setIsModalOpen(false); fetchCustomers(); }
    } else {
      const { error } = await supabase.from('customers').insert([{ name, code, category, phone, address, opening_balance: parseFloat(openingBalance) || 0, include_in_dashboard: includeInDashboard, is_active: true }]);
      if (error) alert(error.message);
      else { alert('Added successfully!'); setIsModalOpen(false); fetchCustomers(); }
    }
  };

  const openAddModal = () => {
    setIsEditMode(false);
    setName(''); setCode(''); setCategory('General'); setPhone(''); setAddress(''); setOpeningBalance(''); setIncludeInDashboard(true);
    setIsModalOpen(true);
  };

  const openEditModal = (c: any) => {
    setIsEditMode(true);
    setCurrentId(c.id);
    setName(c.name); setCode(c.code || ''); setCategory(c.category || 'General'); setPhone(c.phone || ''); setAddress(c.address || ''); setOpeningBalance(c.opening_balance || 0); setIncludeInDashboard(c.include_in_dashboard !== false);
    setIsModalOpen(true);
  };

  const handlePrint = () => {
    exportTableToPDF({
      title: 'Customer Directory',
      subtitle: 'Customer Master Report',
      filterName: selectedCategory,
      data: filteredCustomers,
      columns: ['#', 'Code', 'Customer Name', 'Category', 'Phone', 'Address', 'Opening Balance'],
      renderRow: (c, idx) => `
        <tr>
          <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">${idx + 1}</td>
          <td style="padding: 8px; border: 1px solid #cbd5e1; font-family: monospace;">${c.code || '-'}</td>
          <td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold;">${c.name}</td>
          <td style="padding: 8px; border: 1px solid #cbd5e1;">${c.category || 'General'}</td>
          <td style="padding: 8px; border: 1px solid #cbd5e1; font-family: monospace;">${c.phone || '-'}</td>
          <td style="padding: 8px; border: 1px solid #cbd5e1;">${c.address || '-'}</td>
          <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right; font-family: monospace; font-weight: bold;">Rs. ${Number(c.opening_balance || 0).toLocaleString()}</td>
        </tr>
      `,
    });
  };

  return (
    <div className="p-6 space-y-6 font-sans text-slate-800">
      <div className="flex justify-between items-center border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customer Management</h1>
          <p className="text-sm text-slate-500">Master database of all registered customers.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handlePrint} className="bg-slate-800 hover:bg-slate-900 text-white text-sm px-4 py-2 rounded-lg cursor-pointer">📄 Export PDF</button>
          <button onClick={openAddModal} className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg cursor-pointer">+ Add Customer</button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <div className="flex gap-3 flex-1 max-w-lg">
            <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg" />
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg">
              <option value="ALL">All Categories</option>
              {categoryOptions.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-semibold">Total: {filteredCustomers.length}</span>
        </div>

        {loading ? <div className="p-8 text-center text-slate-400">Load ho raha hai...</div> : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-100 text-xs text-slate-600 border-b">
                <th className="p-3 pl-4">Code</th>
                <th className="p-3">Name</th>
                <th className="p-3">Category</th>
                <th className="p-3">Phone</th>
                <th className="p-3 pr-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="p-3 pl-4 font-mono text-xs">{c.code || '-'}</td>
                  <td className="p-3 font-semibold">{c.name}</td>
                  <td className="p-3 text-xs">{c.category || 'General'}</td>
                  <td className="p-3 font-mono text-xs">{c.phone || '-'}</td>
                  <td className="p-3 pr-4 text-center">
                    <button onClick={() => openEditModal(c)} className="text-blue-600 bg-blue-50 px-2.5 py-1 rounded text-xs font-medium cursor-pointer">Edit</button>
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
              <h2 className="font-semibold">{isEditMode ? 'Edit Customer' : 'Add Customer'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="cursor-pointer font-bold">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Customer Name *</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 text-sm border rounded-lg" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">Code</label>
                  <input type="text" value={code} onChange={(e) => setCode(e.target.value)} className="w-full px-3 py-2 text-sm border rounded-lg font-mono text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Category</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-3 py-2 text-sm border rounded-lg">
                    <option value="General">General</option>
                    <option value="Wholesale">Wholesale</option>
                    <option value="Project">Project</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Phone</label>
                <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-3 py-2 text-sm border rounded-lg font-mono text-xs" />
              </div>
              {!isEditMode && (
                <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                  <label className="block text-xs font-semibold text-amber-900 mb-1">Opening Balance (Rs.)</label>
                  <input type="number" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} className="w-full px-3 py-2 text-sm bg-white border border-amber-300 rounded-lg font-mono" />
                </div>
              )}
              <div className="flex items-center gap-2 pt-2">
                <input type="checkbox" id="inc" checked={includeInDashboard} onChange={(e) => setIncludeInDashboard(e.target.checked)} className="w-4 h-4" />
                <label htmlFor="inc" className="text-xs font-semibold cursor-pointer">Include in Dashboard Total?</label>
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