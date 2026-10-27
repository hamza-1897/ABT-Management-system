'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Modals States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<any>(null);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState('ALL');

  // Form States (Add)
  const [name, setName] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [initialStock, setInitialStock] = useState('');

  // Fetch Suppliers & Products
  const fetchData = async () => {
    setLoading(true);
    
    // Fetch Suppliers for dropdown
    const { data: supData } = await supabase.from('suppliers').select('id, name').eq('is_active', true);
    setSuppliers(supData || codeFallbackSuppliers(supData));

    // Fetch Products with Supplier details
    const { data: prodData, error } = await supabase
      .from('products')
      .select('*, suppliers(name)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching products:', error.message);
    } else {
      setProducts(prodData || []);
    }
    setLoading(false);
  };

  const codeFallbackSuppliers = (data: any) => data || [];

  useEffect(() => {
    fetchData();
  }, []);

  // Filter Logic
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.suppliers?.name && p.suppliers.name.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesSupplier =
        selectedSupplierFilter === 'ALL' || p.supplier_id === selectedSupplierFilter;

      return matchesSearch && matchesSupplier;
    });
  }, [products, searchQuery, selectedSupplierFilter]);

  // Add Product
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert('Product Name zaroori hai!');
    if (!supplierId) return alert('Supplier select karna zaroori hai!');

    const { error } = await supabase.from('products').insert([
      {
        name,
        supplier_id: supplierId,
        stock_quantity: parseFloat(initialStock) || 0,
        is_active: true,
      },
    ]);

    if (error) {
      alert('Error: ' + error.message);
    } else {
      alert('Product successfully add ho gaya!');
      setName('');
      setSupplierId('');
      setInitialStock('');
      setIsAddModalOpen(false);
      fetchData();
    }
  };

  // Open Edit Modal
  const openEditModal = (product: any) => {
    setCurrentProduct(product);
    setIsEditModalOpen(true);
  };

  // Update Product
  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProduct.name.trim()) return alert('Product Name zaroori hai!');

    const { error } = await supabase
      .from('products')
      .update({
        name: currentProduct.name,
        supplier_id: currentProduct.supplier_id,
      })
      .eq('id', currentProduct.id);

    if (error) {
      alert('Error updating: ' + error.message);
    } else {
      alert('Product details update ho gayin!');
      setIsEditModalOpen(false);
      fetchData();
    }
  };

  // Toggle Active / Inactive Status
  const toggleProductStatus = async (id: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    const { error } = await supabase
      .from('products')
      .update({ is_active: newStatus })
      .eq('id', id);

    if (error) {
      alert('Error changing status: ' + error.message);
    } else {
      fetchData();
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Products & Brands Directory</h1>
          <p className="text-sm text-slate-500">Manage cement brands/products linked with their respective suppliers.</p>
        </div>
        
        <button
          onClick={() => {
            if (suppliers.length === 0) {
              alert('Pehle kam az kam aik active supplier add karein!');
              return;
            }
            setIsAddModalOpen(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm px-4 py-2.5 rounded-lg shadow-sm transition flex items-center gap-2 cursor-pointer"
        >
          <span className="text-lg leading-none">+</span> Create New Product
        </button>
      </div>

      {/* Data Table Container */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* Search & Filters Bar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
          
          {/* Search Input */}
          <div className="relative flex-1 max-w-sm">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">🔍</span>
            <input
              type="text"
              placeholder="Search Product or Supplier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedSupplierFilter}
              onChange={(e) => setSelectedSupplierFilter(e.target.value)}
              className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition cursor-pointer"
            >
              <option value="ALL">All Suppliers</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap">
              Total: {filteredProducts.length}
            </span>
          </div>

        </div>

        {/* Data Table */}
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Data load ho raha hai...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">Koi product nahi mila.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-100/70 text-slate-600 text-xs font-medium border-b border-slate-200">
                  <th className="p-3 pl-4">Status</th>
                  <th className="p-3">Product Name</th>
                  <th className="p-3">Linked Supplier</th>
                  <th className="p-3 text-right">Current Stock (Bags)</th>
                  <th className="p-3 pr-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p) => {
                  const isActive = p.is_active !== false;
                  return (
                    <tr key={p.id} className={`hover:bg-slate-50/80 transition ${!isActive ? 'bg-slate-100/50 text-slate-400' : ''}`}>
                      <td className="p-3 pl-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className={`p-3 font-semibold ${isActive ? 'text-slate-800' : 'line-through text-slate-500'}`}>{p.name}</td>
                      <td className="p-3">
                        <span className="bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded border border-slate-200 font-medium">
                          {p.suppliers?.name || 'N/A'}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono font-semibold">
                        {Number(p.stock_quantity || 0).toLocaleString()} Bags
                      </td>
                      <td className="p-3 pr-4 text-center space-x-2">
                        <button
                          onClick={() => openEditModal(p)}
                          className="text-blue-600 hover:text-blue-800 text-xs font-medium bg-blue-50 px-2.5 py-1 rounded transition cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => toggleProductStatus(p.id, isActive)}
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
        )}
      </div>

      {/* 1. ADD MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-base font-semibold text-slate-800">Naya Product Add Karein</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold px-2 py-1 cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleAddProduct} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Supplier *</label>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  required
                >
                  <option value="">-- Choose Supplier --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Product / Brand Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Stallion / Pakcem"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Opening Stock Quantity (Bags)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={initialStock}
                  onChange={(e) => setInitialStock(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm cursor-pointer">Save Product</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. EDIT MODAL */}
      {isEditModalOpen && currentProduct && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-base font-semibold text-slate-800">Product Edit Karein</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold px-2 py-1 cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleUpdateProduct} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Supplier *</label>
                <select
                  value={currentProduct.supplier_id}
                  onChange={(e) => setCurrentProduct({ ...currentProduct, supplier_id: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  required
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Product / Brand Name *</label>
                <input
                  type="text"
                  value={currentProduct.name}
                  onChange={(e) => setCurrentProduct({ ...currentProduct, name: e.target.value })}
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