"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Package, Search, RefreshCw, Layers } from "lucide-react";

interface ProductStock {
  id: string;
  name: string;
  category?: string;
  code?: string;
  stock_quantity: number;
  opening_stock?: number;
}

export default function ProductStockPage() {
  const [products, setProducts] = useState<ProductStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchStock = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("id, name, category, code, stock_quantity, opening_stock")
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching stock:", error.message);
    } else if (data) {
      setProducts(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStock();
  }, [supabase]);

  // Search filter
  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.category && p.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (p.code && p.code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Total Stock Quantity Calculation
  const totalStockQty = filteredProducts.reduce((sum, p) => sum + (Number(p.stock_quantity) || 0), 0);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Package className="w-6 h-6 text-blue-600" /> Products Stock Overview
          </h1>
          <p className="text-sm text-slate-500">
            Real-time stock inventory levels updated automatically via purchases.
          </p>
        </div>
        <button
          onClick={fetchStock}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition shadow-sm w-fit"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh Stock
        </button>
      </div>

      {/* Search & Stats Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search product, code or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div className="flex items-center gap-2 text-sm font-medium text-slate-600 bg-slate-50 px-4 py-2 rounded-lg border border-slate-200 w-full sm:w-auto justify-between">
          <span>Total Unique Items:</span>
          <span className="font-bold text-slate-800">{filteredProducts.length}</span>
        </div>
      </div>

      {/* Stock Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-100 text-slate-600 uppercase text-xs">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Product Code</th>
                <th className="px-4 py-3">Product Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-right">Opening Stock</th>
                <th className="px-4 py-3 text-right">Current Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    Loading stock details...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No products found.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product, index) => (
                  <tr key={product.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-medium text-slate-500">{index + 1}</td>
                    <td className="px-4 py-3 text-slate-600 font-mono text-xs">
                      {product.code || "-"}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-slate-400" />
                      {product.name}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {product.category || "General"}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {Number(product.opening_stock || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-bold">
                      <span
                        className={`px-2.5 py-1 rounded-md text-sm ${
                          Number(product.stock_quantity) > 10
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : Number(product.stock_quantity) > 0
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-red-50 text-red-700 border border-red-200"
                        }`}
                      >
                        {Number(product.stock_quantity || 0).toLocaleString()}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {/* Footer Total Summary */}
            <tfoot className="bg-slate-100 font-bold text-slate-800 border-t-2 border-slate-300">
              <tr>
                <td colSpan={5} className="px-4 py-3 text-right uppercase text-xs tracking-wider">
                  Total Stock Quantity:
                </td>
                <td className="px-4 py-3 text-right text-base text-blue-700">
                  {totalStockQty.toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}