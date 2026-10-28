'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';

export default function PettyCashPage() {
  const [cashAccounts, setCashAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Modals States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentAccount, setCurrentAccount] = useState<any>(null);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');

  // Form States (Add)
  const [accountName, setAccountName] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');

  // Fetch Cash Accounts
  const fetchCashAccounts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('account_type', 'CASH')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching cash accounts:', error.message);
    } else {
      setCashAccounts(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCashAccounts();
  }, []);

  // Filter Logic
  const filteredAccounts = useMemo(() => {
    return cashAccounts.filter((acc) =>
      acc.account_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [cashAccounts, searchQuery]);

  // Totals Calculations
  const totalOpeningBalance = useMemo(() => {
    return filteredAccounts.reduce((sum, acc) => sum + Number(acc.opening_balance || 0), 0);
  }, [filteredAccounts]);

  const totalCurrentBalance = useMemo(() => {
    return filteredAccounts.reduce((sum, acc) => sum + Number(acc.current_balance || 0), 0);
  }, [filteredAccounts]);

  // Add Cash Account
  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountName.trim()) return alert('Cash Account Name zaroori hai!');
    if (openingBalance === '') return alert('Opening Balance likhna zaroori hai!');

    const balance = parseFloat(openingBalance) || 0;

    const { error } = await supabase.from('accounts').insert([
      {
        account_name: accountName,
        account_type: 'CASH',
        opening_balance: balance,
        current_balance: balance,
        is_active: true,
      },
    ]);

    if (error) {
      alert('Error: ' + error.message);
    } else {
      alert('Petty Cash drawer successfully add ho gaya!');
      setAccountName('');
      setOpeningBalance('');
      setIsAddModalOpen(false);
      fetchCashAccounts();
    }
  };

  // Open Edit Modal
  const openEditModal = (acc: any) => {
    setCurrentAccount(acc);
    setIsEditModalOpen(true);
  };

  // Update Cash Account
  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAccount.account_name.trim()) return alert('Account Name zaroori hai!');

    const { error } = await supabase
      .from('accounts')
      .update({
        account_name: currentAccount.account_name,
      })
      .eq('id', currentAccount.id);

    if (error) {
      alert('Error updating: ' + error.message);
    } else {
      alert('Account details update ho gayin!');
      setIsEditModalOpen(false);
      fetchCashAccounts();
    }
  };

  // Toggle Active Status
  const toggleStatus = async (id: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    const { error } = await supabase
      .from('accounts')
      .update({ is_active: newStatus })
      .eq('id', id);

    if (error) {
      alert('Error changing status: ' + error.message);
    } else {
      fetchCashAccounts();
    }
  };

  return (
    <div className="p-6 space-y-6 font-sans text-slate-800">
      
      {/* Header & Stats Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Petty Cash Management</h1>
          <p className="text-sm text-slate-500">Manage office cash drawers and track live in-hand cash balances.</p>
        </div>
        
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm px-4 py-2.5 rounded-lg shadow-sm transition flex items-center gap-2 cursor-pointer"
        >
          <span className="text-lg leading-none">+</span> Add Cash Drawer
        </button>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* Search Bar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
          <div className="relative flex-1 max-w-sm">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">🔍</span>
            <input
              type="text"
              placeholder="Search Cash Drawer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>
          <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full">
            Total Drawers: {filteredAccounts.length}
          </span>
        </div>

        {/* Table */}
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Data load ho raha hai...</div>
        ) : filteredAccounts.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">Koi petty cash drawer nahi mila.</div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-100/70 text-slate-600 text-xs font-medium border-b border-slate-200">
                    <th className="p-3 pl-4">Status</th>
                    <th className="p-3">Cash Drawer Name</th>
                    <th className="p-3 text-right">Opening Balance</th>
                    <th className="p-3 text-right">Current Balance</th>
                    <th className="p-3 pr-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAccounts.map((acc) => {
                    const isActive = acc.is_active !== false;
                    return (
                      <tr key={acc.id} className={`hover:bg-slate-50/80 transition ${!isActive ? 'bg-slate-100/50 text-slate-400' : ''}`}>
                        <td className="p-3 pl-4">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                            {isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className={`p-3 font-semibold ${isActive ? 'text-slate-800' : 'line-through text-slate-500'}`}>{acc.account_name}</td>
                        <td className="p-3 text-right font-mono text-slate-600">
                          Rs. {Number(acc.opening_balance || 0).toLocaleString()}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900">
                          Rs. {Number(acc.current_balance || 0).toLocaleString()}
                        </td>
                        <td className="p-3 pr-4 text-center space-x-2">
                          <button
                            onClick={() => openEditModal(acc)}
                            className="text-blue-600 hover:text-blue-800 text-xs font-medium bg-blue-50 px-2.5 py-1 rounded transition cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => toggleStatus(acc.id, isActive)}
                            className={`text-xs font-medium px-2.5 py-1 rounded transition cursor-pointer ${isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
                          >
                            {isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Dedicated Summary Footer Banner */}
            <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Summary Total ({filteredAccounts.length} Drawers)
              </span>
              <div className="flex items-center gap-8 text-sm">
                <div>
                  <span className="text-slate-500 mr-2 text-xs">Total Opening:</span>
                  <span className="font-mono font-bold text-slate-800">Rs. {totalOpeningBalance.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-500 mr-2 text-xs">Total Current Balance:</span>
                  <span className="font-mono font-bold text-emerald-600 text-base">Rs. {totalCurrentBalance.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ADD MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-base font-semibold text-slate-800">Add New Petty Cash Drawer</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold px-2 py-1 cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleAddAccount} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Cash Drawer Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Main Office Cash Drawer"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
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
                <button type="submit" className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm cursor-pointer">Save Cash Drawer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {isEditModalOpen && currentAccount && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-base font-semibold text-slate-800">Edit Cash Drawer Name</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold px-2 py-1 cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleUpdateAccount} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Cash Drawer Name *</label>
                <input
                  type="text"
                  value={currentAccount.account_name}
                  onChange={(e) => setCurrentAccount({ ...currentAccount, account_name: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
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