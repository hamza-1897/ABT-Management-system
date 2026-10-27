'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Modals States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentSupplier, setCurrentSupplier] = useState<any>(null);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, ACTIVE, INACTIVE

  // Form States (Add)
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');

  // Fetch Suppliers
  const fetchSuppliers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching suppliers:', error.message);
    } else {
      setSuppliers(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  // Filter Logic
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      const matchesSearch =
        (s.name && s.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.location && s.location.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && s.is_active !== false) ||
        (statusFilter === 'INACTIVE' && s.is_active === false);

      return matchesSearch && matchesStatus;
    });
  }, [suppliers, searchQuery, statusFilter]);

  // Add Supplier
  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert('Supplier Name zaroori hai!');
    if (openingBalance === '') return alert('Opening Balance likhna zaroori hai!');

    const { error } = await supabase.from('suppliers').insert([
      {
        name,
        location,
        opening_balance: parseFloat(openingBalance) || 0,
        is_active: true,
      },
    ]);

    if (error) {
      alert('Error: ' + error.message);
    } else {
      alert('Supplier successfully add ho gaya!');
      setName('');
      setLocation('');
      setOpeningBalance('');
      setIsAddModalOpen(false);
      fetchSuppliers();
    }
  };

  // Open Edit Modal
  const openEditModal = (supplier: any) => {
    setCurrentSupplier(supplier);
    setIsEditModalOpen(true);
  };

  // Update Supplier
  const handleUpdateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSupplier.name.trim()) return alert('Supplier Name zaroori hai!');

    const { error } = await supabase
      .from('suppliers')
      .update({
        name: currentSupplier.name,
        location: currentSupplier.location,
      })
      .eq('id', currentSupplier.id);

    if (error) {
      alert('Error updating: ' + error.message);
    } else {
      alert('Supplier details update ho gayin!');
      setIsEditModalOpen(false);
      fetchSuppliers();
    }
  };

  // Toggle Active / Inactive Status
  const toggleSupplierStatus = async (id: string, currentStatus: boolean) => {
    const newStatus = currentStatus === false ? true : false;
    const confirmMsg = newStatus 
      ? 'Kya aap is supplier ko Active karna chahte hain?' 
      : 'Kya aap is supplier ko Inactive karna chahte hain?';
    
    if (!confirm(confirmMsg)) return;

    const { error } = await supabase
      .from('suppliers')
      .update({ is_active: newStatus })
      .eq('id', id);

    if (error) {
      alert('Error changing status: ' + error.message);
    } else {
      fetchSuppliers();
    }
  };

  return (
    <div className="space-y-6 font-sans text-slate-800">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Supplier / Manufacturer Directory</h1>
            <p className="text-sm text-slate-500">Manage cement manufacturers, plants, locations, and opening balances.</p>
          </div>
          
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm px-4 py-2.5 rounded-lg shadow-sm transition flex items-center gap-2 cursor-pointer"
          >
            <span className="text-lg leading-none">+</span> Create New Supplier
          </button>
        </div>

        {/* Supplier Data Table Container */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          
          {/* Search & Filters Bar */}
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
            
            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                🔍
              </span>
              <input
                type="text"
                placeholder="Search by Name, Location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition cursor-pointer"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active Only</option>
                <option value="INACTIVE">Inactive Only</option>
              </select>

              <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap">
                Total: {filteredSuppliers.length}
              </span>
            </div>

          </div>

          {/* Data Table */}
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Data load ho raha hai...</div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">Koi supplier nahi mila.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-100/70 text-slate-600 text-xs font-medium border-b border-slate-200">
                    <th className="p-3 pl-4">Status</th>
                    <th className="p-3">Supplier Name</th>
                    <th className="p-3">Location / Plant</th>
                    <th className="p-3 text-right">Opening Balance</th>
                    <th className="p-3 pr-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSuppliers.map((s) => {
                    const isActive = s.is_active !== false;
                    return (
                      <tr key={s.id} className={`hover:bg-slate-50/80 transition ${!isActive ? 'bg-slate-100/50 text-slate-400' : ''}`}>
                        <td className="p-3 pl-4">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                            {isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className={`p-3 font-semibold ${isActive ? 'text-slate-800' : 'line-through text-slate-500'}`}>{s.name}</td>
                        <td className="p-3">
                          <span className="bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded border border-slate-200">
                            {s.location || 'N/A'}
                          </span>
                        </td>
                        <td className="p-3 text-right font-semibold">
                          Rs. {Number(s.opening_balance || 0).toLocaleString()}
                        </td>
                        <td className="p-3 pr-4 text-center space-x-2">
                          <button
                            onClick={() => openEditModal(s)}
                            className="text-blue-600 hover:text-blue-800 text-xs font-medium bg-blue-50 px-2.5 py-1 rounded transition cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => toggleSupplierStatus(s.id, isActive)}
                            className={`text-xs font-medium px-2.5 py-1 rounded transition cursor-pointer ${isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
                          >
                            {isActive ? 'Make Inactive' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* 1. ADD MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-base font-semibold text-slate-800">Naya Supplier Add Karein</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold px-2 py-1 cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleAddSupplier} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Supplier Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Lucky Cement Factory / Distributor"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Location / Plant</label>
                <input
                  type="text"
                  placeholder="e.g. Pezu / Islamabad"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Opening Balance (Rs.) *</label>
                <input
                  type="number"
                  placeholder="0"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm cursor-pointer">Save Supplier</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. EDIT MODAL */}
      {isEditModalOpen && currentSupplier && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-base font-semibold text-slate-800">Supplier Edit Karein</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold px-2 py-1 cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleUpdateSupplier} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Supplier Name *</label>
                <input
                  type="text"
                  value={currentSupplier.name}
                  onChange={(e) => setCurrentSupplier({ ...currentSupplier, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Location / Plant</label>
                <input
                  type="text"
                  value={currentSupplier.location || ''}
                  onChange={(e) => setCurrentSupplier({ ...currentSupplier, location: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm cursor-pointer">Update Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}