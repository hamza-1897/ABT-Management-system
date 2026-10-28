'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { exportTableToPDF } from '@/utils/printHelper';

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState('Cement');
  const [supplierId, setSupplierId] = useState('');
  const [openingStock, setOpeningStock] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const fetchData = async () => {
    setLoading(true);
    const [prodRes, suppRes] = await Promise.all([
      supabase.from('products').select('*').order('created_at', { ascending: false }),
      supabase.from('suppliers').select('id, name').eq('is_active', true)
    ]);

    setProducts(prodRes.data || []);
    setSuppliers(suppRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const categoryOptions = useMemo(() => {
    const cats = new Set(products.map((p) => p.category || 'Cement'));
    return Array.from(cats);
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch = (p.name && p.name.toLowerCase().includes(searchQuery.toLowerCase())) || (p.code && p.code.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchCat = selectedCategory === 'ALL' || (p.category || 'Cement') === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [products, searchQuery, selectedCategory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert('Product Name zaroori hai!');

    const stock = parseFloat(openingStock) || 0;

    if (isEditMode) {
      const { error } = await supabase.from('products').update({ name, code, category, supplier_id: supplierId }).eq('id', currentId);
      if (error) alert(error.message);
      else { alert('Product updated successfully!'); setIsModalOpen(false); fetchData(); }
    } else {
      const { error } = await supabase.from('products').insert([{ name, code, category, supplier_id: supplierId, opening_stock: stock, is_active: true }]);
      if (error) alert(error.message);
      else { alert('Product added successfully!'); setIsModalOpen(false); fetchData(); }
    }
  };

  const openAddModal = () => {
    setIsEditMode(false);
    setName(''); setCode(''); setCategory('Cement'); setSupplierId(''); setOpeningStock('');
    setIsModalOpen(true);
  };

  const openEditModal = (p: any) => {
    setIsEditMode(true);
    setCurrentId(p.id);
    setName(p.name); setCode(p.code || ''); setCategory(p.category || 'Cement'); setSupplierId(p.supplier_id || '');
    setIsModalOpen(true);
  };

  const handlePrint = () => {
    exportTableToPDF({
      title: 'Product Master Catalog',
      subtitle: 'Cement & Material Directory',
      filterName: selectedCategory,
      data: filteredProducts,
      columns: ['#', 'Code', 'Product Name', 'Category', 'Supplier'],
      renderRow: (p, idx) => {
        const suppObj = suppliers.find(s => s.id === p.supplier_id || s.name === p.supplier_id);
        const suppName = suppObj ? suppObj.name : (p.supplier_id || '-');
        return `
          <tr>
            <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">${idx + 1}</td>
            <td style="padding: 8px; border: 1px solid #cbd5e1; font-family: monospace;">${p.code || '-'}</td>
            <td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold;">${p.name}</td>
            <td style="padding: 8px; border: 1px solid #cbd5e1;">${p.category || 'Cement'}</td>
            <td style="padding: 8px; border: 1px solid #cbd5e1;">${suppName}</td>
          </tr>
        `;
      },
    });
  };

  return (
    <div className="p-6 space-y-6 font-sans text-slate-800">
      <div className="flex justify-between items-center border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Product Setup</h1>
          <p className="text-sm text-slate-500">Master database of cement brands linked with suppliers.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handlePrint} className="bg-slate-800 hover:bg-slate-900 text-white text-sm px-4 py-2 rounded-lg cursor-pointer">📄 Export PDF</button>
          <button onClick={openAddModal} className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg cursor-pointer">+ Add Product</button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <div className="flex gap-3 flex-1 max-w-lg">
            <input type="text" placeholder="Search by name or code..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg" />
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg">
              <option value="ALL">All Categories</option>
              {categoryOptions.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-semibold">Total: {filteredProducts.length}</span>
        </div>

        {loading ? <div className="p-8 text-center text-slate-400">Load ho raha hai...</div> : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-100 text-xs text-slate-600 border-b">
                <th className="p-3 pl-4">Code</th>
                <th className="p-3">Product Name</th>
                <th className="p-3">Category</th>
                <th className="p-3">Supplier</th>
                <th className="p-3 pr-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((p) => {
                const suppObj = suppliers.find(s => s.id === p.supplier_id || s.name === p.supplier_id);
                const suppName = suppObj ? suppObj.name : (p.supplier_id || '-');
                return (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="p-3 pl-4 font-mono text-xs">{p.code || '-'}</td>
                    <td className="p-3 font-semibold">{p.name}</td>
                    <td className="p-3 text-xs">{p.category || 'Cement'}</td>
                    <td className="p-3 text-slate-600 text-xs">{suppName}</td>
                    <td className="p-3 pr-4 text-center">
                      <button onClick={() => openEditModal(p)} className="text-blue-600 bg-blue-50 px-2.5 py-1 rounded text-xs font-medium cursor-pointer">Edit</button>
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
              <h2 className="font-semibold">{isEditMode ? 'Edit Product' : 'Add New Product'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="cursor-pointer font-bold">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Product Name *</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Pak Cement - 50 KG" className="w-full px-3 py-2 text-sm border rounded-lg" required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">Product Code</label>
                  <input type="text" value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. CEMENT-50" className="w-full px-3 py-2 text-sm border rounded-lg font-mono text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Category</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-3 py-2 text-sm border rounded-lg">
                    <option value="Cement">Cement</option>
                    <option value="Tile Bond">Tile Bond</option>
                    <option value="Steel">Steel / Iron</option>
                    <option value="Other">Other Material</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Supplier (Mill / Vendor)</label>
                <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="w-full px-3 py-2 text-sm border rounded-lg">
                  <option value="">-- Select Supplier --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {!isEditMode && (
                <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                  <label className="block text-xs font-semibold text-amber-900 mb-1">Opening Stock Qty</label>
                  <input type="number" value={openingStock} onChange={(e) => setOpeningStock(e.target.value)} placeholder="0" className="w-full px-3 py-2 text-sm bg-white border border-amber-300 rounded-lg font-mono" />
                  <span className="text-[10px] text-amber-700 mt-1 block">Note: Opening stock sirf pehli dafa set hoga.</span>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-slate-600 cursor-pointer">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg cursor-pointer">Save Product</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}