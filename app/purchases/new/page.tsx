"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Trash2, Save, Truck, FileText, Calendar, Building2 } from "lucide-react";

interface Supplier {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  bags_per_ton: number;
}

interface BookingArea {
  id: string;
  name: string;
}

interface VehicleRow {
  id: string;
  vehicle_number: string;
  booking_area: string;
  product_id: string;
  unit_price: string;
  quantity: string;
}

export default function NewPurchasePage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [areas, setAreas] = useState<BookingArea[]>([]);
  const [loading, setLoading] = useState(false);

  const [purchaseDate, setPurchaseDate] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");

  const [rows, setRows] = useState<VehicleRow[]>([
    { id: "1", vehicle_number: "", booking_area: "", product_id: "", unit_price: "", quantity: "" },
  ]);

  useEffect(() => {
    setPurchaseDate(new Date().toISOString().split("T")[0]);

    const fetchInitialData = async () => {
      const [supRes, prodRes, areaRes] = await Promise.all([
        supabase.from("suppliers").select("id, name").order("name"),
        supabase.from("products").select("id, name, bags_per_ton").order("name"),
        supabase.from("booking_areas").select("id, name").order("name"),
      ]);
      if (supRes.data) setSuppliers(supRes.data);
      if (prodRes.data) setProducts(prodRes.data);
      if (areaRes.data) setAreas(areaRes.data);
    };
    fetchInitialData();
  }, []);

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      { id: crypto.randomUUID(), vehicle_number: "", booking_area: "", product_id: "", unit_price: "", quantity: "" },
    ]);
  };

  const removeRow = (id: string) => {
    if (rows.length === 1) return;
    setRows((prev) => prev.filter((row) => row.id !== id));
  };

  const updateRow = (id: string, field: keyof VehicleRow, value: string) => {
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const calculateRowNet = (row: VehicleRow) => {
    const price = parseFloat(row.unit_price) || 0;
    const tons = parseFloat(row.quantity) || 0;
    return price * tons;
  };

  const grandTotal = rows.reduce((sum, row) => sum + calculateRowNet(row), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!supplierId || !invoiceNumber.trim()) {
      alert("Please select a supplier and enter invoice number.");
      return;
    }

    const validItems = rows.map((r) => ({
      vehicle_number: r.vehicle_number.trim(),
      booking_area: r.booking_area,
      product_id: r.product_id,
      unit_price: parseFloat(r.unit_price),
      quantity: parseFloat(r.quantity),
    }));

    const hasInvalid = validItems.some(
      (item) =>
        !item.vehicle_number ||
        !item.booking_area ||
        !item.product_id ||
        isNaN(item.unit_price) ||
        item.quantity <= 0
    );

    if (hasInvalid) {
      alert("Please fill all vehicle details properly (Vehicle No, Booking Area, Product, Rate/Ton, and Tons > 0).");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.rpc("record_purchase_invoice", {
        p_purchase_date: purchaseDate,
        p_supplier_id: supplierId,
        p_invoice_number: invoiceNumber.trim(),
        p_items: validItems,
      });

      if (error) throw error;

      alert("Purchase saved successfully! Stock automatically updated in Bags based on product conversion.");

      setInvoiceNumber("");
      setRows([{ id: "1", vehicle_number: "", booking_area: "", product_id: "", unit_price: "", quantity: "" }]);
    } catch (err: any) {
      alert("Error saving purchase: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Company Purchase Entry (Tons to Bags)</h1>
          <p className="text-sm text-slate-500">
            Enter vehicle purchase in Tons. Stock automatically converts to Bags based on each product&apos;s bag weight (e.g. 20, 25, or 50 bags/ton).
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1">
              <Calendar className="w-4 h-4 text-blue-600" /> Purchase Date
            </label>
            <input
              type="date"
              required
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1">
              <Building2 className="w-4 h-4 text-blue-600" /> Supplier / Company
            </label>
            <select
              required
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">-- Select Company --</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1">
              <FileText className="w-4 h-4 text-blue-600" /> Company Invoice No.
            </label>
            <input
              type="text"
              required
              placeholder="e.g. INV-90821"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        {/* Vehicles & Products Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-semibold text-slate-700 flex items-center gap-2">
              <Truck className="w-4 h-4 text-blue-600" /> Vehicle-wise Purchase (Tons)
            </h2>
            <button
              type="button"
              onClick={addRow}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition"
            >
              <Plus className="w-4 h-4" /> Add Vehicle
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 text-slate-600 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Vehicle Number</th>
                  <th className="px-4 py-3">Booking Area</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3 text-right">Rate / Ton (Rs)</th>
                  <th className="px-4 py-3 text-right">Quantity (Tons)</th>
                  <th className="px-4 py-3 text-right">Net Amount</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {rows.map((row, index) => {
                  const netAmount = calculateRowNet(row);
                  const selectedProduct = products.find((p) => p.id === row.product_id);
                  const bagsPerTon = selectedProduct?.bags_per_ton || 20;
                  const totalBags = (parseFloat(row.quantity) || 0) * bagsPerTon;

                  return (
                    <tr key={row.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-500">{index + 1}</td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          required
                          placeholder="e.g. C 3483"
                          value={row.vehicle_number}
                          onChange={(e) => updateRow(row.id, "vehicle_number", e.target.value)}
                          className="w-28 px-2.5 py-1.5 border border-slate-300 rounded-md uppercase focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <select
                          required
                          value={row.booking_area}
                          onChange={(e) => updateRow(row.id, "booking_area", e.target.value)}
                          className="w-40 px-2.5 py-1.5 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                          <option value="">-- Select Area --</option>
                          {areas.map((a) => (
                            <option key={a.id} value={a.name}>
                              {a.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          required
                          value={row.product_id}
                          onChange={(e) => updateRow(row.id, "product_id", e.target.value)}
                          className="w-48 px-2.5 py-1.5 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                          <option value="">-- Select Product --</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.bags_per_ton || 20} Bags/T)
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          step="0.01"
                          required
                          placeholder="0.00"
                          value={row.unit_price}
                          onChange={(e) => updateRow(row.id, "unit_price", e.target.value)}
                          className="w-28 px-2.5 py-1.5 border border-slate-300 rounded-md text-right focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <input
                          type="number"
                          step="0.001"
                          required
                          placeholder="0"
                          value={row.quantity}
                          onChange={(e) => updateRow(row.id, "quantity", e.target.value)}
                          className="w-24 px-2.5 py-1.5 border border-slate-300 rounded-md text-right focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        {totalBags > 0 && (
                          <div className="text-[11px] text-blue-600 font-medium mt-1">
                            = {totalBags} Bags ({bagsPerTon}/T)
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800">
                        {netAmount.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => removeRow(row.id)}
                          disabled={rows.length === 1}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-md disabled:opacity-30"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-100 font-bold text-slate-800 border-t-2 border-slate-300">
                <tr>
                  <td colSpan={6} className="px-4 py-3 text-right uppercase text-xs tracking-wider">
                    Total Invoice Amount:
                  </td>
                  <td className="px-4 py-3 text-right text-base text-blue-700">
                    {grandTotal.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition disabled:opacity-50 shadow-sm"
          >
            <Save className="w-4 h-4" />
            {loading ? "Saving Purchase..." : "Save Purchase & Update Stock (Bags)"}
          </button>
        </div>
      </form>
    </div>
  );
}