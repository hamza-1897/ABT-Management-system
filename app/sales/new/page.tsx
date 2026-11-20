"use client";

import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Truck, Plus, Trash2, Save, AlertTriangle } from "lucide-react";

interface CustomerOption {
  id: string;
  name: string;
  short_code?: string | null;
  code?: string | null;
}

interface ProductOption {
  id: string;
  name: string;
  stock_quantity: number;
}

interface SaleLineDraft {
  uid: string;
  customer_id: string;
  product_id: string;
  quantity_bags: string;
  rate_per_bag: string;
  cash_paid: string;
}

let lineCounter = 1;
const createLineId = () => {
  lineCounter += 1;
  return `line-${lineCounter}`;
};

const newLine = (id = "line-1"): SaleLineDraft => ({
  uid: id,
  customer_id: "",
  product_id: "",
  quantity_bags: "",
  rate_per_bag: "",
  cash_paid: "0",
});

export default function NewSaleInvoicePage() {
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [duplicateNote, setDuplicateNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Header
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [remarks, setRemarks] = useState("");

  // Lines
  const [lines, setLines] = useState<SaleLineDraft[]>(() => [newLine("line-1")]);

  useEffect(() => {
    setInvoiceDate(new Date().toISOString().split("T")[0]);
    loadData();
  }, []);

  useEffect(() => {
    const inv = invoiceNumber.trim();
    if (!inv) {
      setDuplicateNote("");
      return;
    }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("sale_invoices")
        .select("invoice_date, vehicle_number")
        .eq("invoice_number", inv)
        .order("invoice_date", { ascending: false });

      if (data && data.length > 0) {
        setDuplicateNote(
          `Already used on: ${data.map((d: any) => `${d.invoice_date} (${d.vehicle_number})`).join(", ")}`
        );
      } else {
        setDuplicateNote("");
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [invoiceNumber]);

  const loadData = async () => {
    setLoading(true);
    const [cRes, pRes] = await Promise.all([
      supabase
        .from("customers")
        .select("id, name, short_code, code")
        .eq("is_active", true)
        .order("name", { ascending: true }),
      supabase
        .from("products")
        .select("id, name, stock_quantity")
        .eq("is_active", true)
        .order("name", { ascending: true }),
    ]);

    setCustomers((cRes.data as CustomerOption[]) || []);
    setProducts((pRes.data as ProductOption[]) || []);
    setLoading(false);
  };

  const updateLine = (uid: string, field: keyof SaleLineDraft, value: string) => {
    setLines((prev) => prev.map((l) => (l.uid === uid ? { ...l, [field]: value } : l)));
  };

  const addLine = () => setLines((prev) => [...prev, newLine(createLineId())]);

  const removeLine = (uid: string) => {
    if (lines.length > 1) setLines((prev) => prev.filter((l) => l.uid !== uid));
  };

  const rows = useMemo(() => {
    return lines.map((l) => {
      const qty = parseFloat(l.quantity_bags) || 0;
      const rate = parseFloat(l.rate_per_bag) || 0;
      const cash = parseFloat(l.cash_paid) || 0;
      const total = Number((qty * rate).toFixed(2));
      const net = Number((total - cash).toFixed(2));
      const type = total > 0 && cash >= total ? "CASH" : cash <= 0 ? "CREDIT" : "PARTIAL";

      const prod = products.find((p) => p.id === l.product_id);
      const stock = Number(prod?.stock_quantity ?? 0);
      const lowStock = Boolean(l.product_id) && qty > 0 && stock < qty;

      return { ...l, qty, rate, cash, total, net, type, prod, stock, lowStock };
    });
  }, [lines, products]);

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => ({
          bags: acc.bags + r.qty,
          total: acc.total + r.total,
          cash: acc.cash + r.cash,
          net: acc.net + r.net,
        }),
        { bags: 0, total: 0, cash: 0, net: 0 }
      ),
    [rows]
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!invoiceNumber.trim() || !invoiceDate || !vehicleNumber.trim()) {
      alert("Invoice Number, Date, aur Vehicle Number lazmi bharein.");
      return;
    }

    const valid = rows.filter((r) => r.customer_id && r.product_id && r.qty > 0 && r.rate >= 0);
    if (valid.length === 0) {
      alert("Kam az kam aik valid customer line add karein.");
      return;
    }

    if (rows.some((r) => r.lowStock)) {
      const ok = window.confirm(
        "Warning: Kuch products ka stock kam ya 0 hai. Kya phir bhi invoice save karni hai?"
      );
      if (!ok) return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.rpc("create_sale_vehicle_invoice", {
        p_invoice_number: invoiceNumber.trim(),
        p_invoice_date: invoiceDate,
        p_vehicle_number: vehicleNumber.trim().toUpperCase(),
        p_remarks: remarks.trim() || null,
        p_items: valid.map((r) => ({
          customer_id: r.customer_id,
          product_id: r.product_id,
          quantity_bags: r.qty,
          rate_per_bag: r.rate,
          cash_paid: r.cash,
        })),
      });

      if (error) throw error;

      alert("Invoice saved successfully!");
      setInvoiceNumber("");
      setVehicleNumber("");
      setRemarks("");
      setLines([newLine(createLineId())]);
      await loadData();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5 text-slate-800">
      {/* Simple Top Title */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Truck className="w-5 h-5 text-blue-600" /> New Vehicle Sale Invoice
        </h1>
        <span className="text-xs text-slate-500">Cash Auto → Default Petty Cash</span>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-slate-400">Loading...</div>
      ) : (
        <form onSubmit={handleSave} className="space-y-4">
          {/* Clean Single-Row Header */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Invoice # *</label>
              <input
                type="text"
                required
                placeholder="INV-101"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500"
              />
              {duplicateNote && (
                <p className="text-[11px] text-amber-700 mt-1">{duplicateNote}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Date *</label>
              <input
                type="date"
                required
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Vehicle # *</label>
              <input
                type="text"
                required
                placeholder="LEA-1234"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg uppercase outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Remarks</label>
              <input
                type="text"
                placeholder="Optional"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Clean Spreadsheet Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-100 text-slate-600 text-xs uppercase border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2.5 w-8">#</th>
                    <th className="px-3 py-2.5 min-w-[200px]">Customer (Name / Code)</th>
                    <th className="px-3 py-2.5 min-w-[190px]">Product</th>
                    <th className="px-3 py-2.5 w-24 text-right">Bags</th>
                    <th className="px-3 py-2.5 w-28 text-right">Rate</th>
                    <th className="px-3 py-2.5 w-32 text-right">Total</th>
                    <th className="px-3 py-2.5 w-32 text-right">Cash Paid</th>
                    <th className="px-3 py-2.5 w-32 text-right">Net Khata</th>
                    <th className="px-3 py-2.5 w-20 text-center">Mode</th>
                    <th className="px-3 py-2.5 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {rows.map((r, i) => (
                    <tr key={r.uid} className="align-top">
                      <td className="px-3 py-2.5 text-slate-400 font-medium">{i + 1}</td>

                      <td className="px-3 py-2">
                        <select
                          required
                          value={r.customer_id}
                          onChange={(e) => updateLine(r.uid, "customer_id", e.target.value)}
                          className="w-full px-2.5 py-1.5 text-sm bg-white border border-slate-300 rounded-md outline-none focus:border-blue-500"
                        >
                          <option value="">Select customer...</option>
                          {customers.map((c) => {
                            const code = c.short_code || c.code;
                            return (
                              <option key={c.id} value={c.id}>
                                {code ? `${code} - ${c.name}` : c.name}
                              </option>
                            );
                          })}
                        </select>
                      </td>

                      <td className="px-3 py-2">
                        <select
                          required
                          value={r.product_id}
                          onChange={(e) => updateLine(r.uid, "product_id", e.target.value)}
                          className="w-full px-2.5 py-1.5 text-sm bg-white border border-slate-300 rounded-md outline-none focus:border-blue-500"
                        >
                          <option value="">Select product...</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                        {r.prod && (
                          <div
                            className={`text-[11px] mt-1 flex items-center gap-1 ${
                              r.lowStock ? "text-amber-700 font-semibold" : "text-slate-400"
                            }`}
                          >
                            {r.lowStock && <AlertTriangle className="w-3 h-3 shrink-0" />}
                            <span>Stock: {r.stock} bags</span>
                          </div>
                        )}
                      </td>

                      <td className="px-3 py-2">
                        <input
                          type="number"
                          step="any"
                          min="0.01"
                          required
                          placeholder="0"
                          value={r.quantity_bags}
                          onChange={(e) => updateLine(r.uid, "quantity_bags", e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-md text-right outline-none focus:border-blue-500"
                        />
                      </td>

                      <td className="px-3 py-2">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          required
                          placeholder="0"
                          value={r.rate_per_bag}
                          onChange={(e) => updateLine(r.uid, "rate_per_bag", e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-md text-right outline-none focus:border-blue-500"
                        />
                      </td>

                      <td className="px-3 py-2.5 text-right font-semibold text-slate-800 whitespace-nowrap">
                        {r.total.toLocaleString("en-PK")}
                      </td>

                      <td className="px-3 py-2">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          placeholder="0"
                          value={r.cash_paid}
                          onChange={(e) => updateLine(r.uid, "cash_paid", e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-md text-right text-emerald-700 font-semibold outline-none focus:border-emerald-500"
                        />
                      </td>

                      <td className="px-3 py-2.5 text-right font-semibold text-slate-900 whitespace-nowrap">
                        {r.net.toLocaleString("en-PK")}
                      </td>

                      <td className="px-3 py-2.5 text-center">
                        <span className="text-[11px] font-semibold text-slate-500">
                          {r.type}
                        </span>
                      </td>

                      <td className="px-3 py-2 text-center">
                        {rows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeLine(r.uid)}
                            className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                            title="Remove"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom Bar: Add Line + Totals + Save */}
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <button
                type="button"
                onClick={addLine}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg w-fit cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add Customer Line
              </button>

              <div className="flex flex-wrap items-center gap-5 text-sm">
                <div>
                  <span className="text-slate-500 text-xs mr-1">Bags:</span>
                  <b>{totals.bags}</b>
                </div>
                <div>
                  <span className="text-slate-500 text-xs mr-1">Total:</span>
                  <b>Rs. {totals.total.toLocaleString("en-PK")}</b>
                </div>
                <div>
                  <span className="text-slate-500 text-xs mr-1">Cash:</span>
                  <b className="text-emerald-700">Rs. {totals.cash.toLocaleString("en-PK")}</b>
                </div>
                <div>
                  <span className="text-slate-500 text-xs mr-1">Net Khata:</span>
                  <b className="text-rose-700">Rs. {totals.net.toLocaleString("en-PK")}</b>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  {submitting ? "Saving..." : "Save Invoice"}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}