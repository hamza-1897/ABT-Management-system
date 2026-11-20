"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { RotateCcw, Search, FileText, Building2, Calendar, AlertTriangle, CheckCircle2, Truck } from "lucide-react";

interface PurchaseItem {
  id: string;
  vehicle_number: string;
  unit_price: number;
  quantity: number;
  net_amount: number;
  products: { name: string; bags_per_ton?: number } | null;
}

interface Purchase {
  id: string;
  purchase_date: string;
  invoice_number: string;
  total_amount: number;
  status: string;
  suppliers: { name: string } | null;
  purchase_items: PurchaseItem[];
}

export default function PurchaseReversalPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [reversingId, setReversingId] = useState<string | null>(null);
  const [reversalDate, setReversalDate] = useState("");

  useEffect(() => {
    setReversalDate(new Date().toISOString().split("T")[0]);
    fetchPurchases();
  }, []);

  const fetchPurchases = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("purchases")
      .select(`
        id,
        purchase_date,
        invoice_number,
        total_amount,
        status,
        suppliers ( name ),
        purchase_items (
          id,
          vehicle_number,
          unit_price,
          quantity,
          net_amount,
          products ( name, bags_per_ton )
        )
      `)
      .order("purchase_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching purchases:", error.message);
    } else if (data) {
      setPurchases(data as any);
    }
    setLoading(false);
  };

  const handleReverse = async (purchase: Purchase) => {
    const reason = window.prompt(
      `Invoice #${purchase.invoice_number} (${purchase.suppliers?.name}) ko reverse karne ki wajah likhein:`,
      "Wrong entry / Returned"
    );

    if (reason === null) return;

    const confirmReverse = window.confirm(
      `Kya aap waqai Invoice #${purchase.invoice_number} ko reverse karna chahte hain?\n\nIs se:\n1. Stock mein se exact Bags minus ho jayenge.\n2. Supplier Ledger se yeh entry mukammal hat jayegi.`
    );

    if (!confirmReverse) return;

    setReversingId(purchase.id);
    try {
      const { error } = await supabase.rpc("reverse_purchase_invoice", {
        p_purchase_id: purchase.id,
        p_reversal_date: reversalDate,
        p_reason: reason || "Reversed by Admin",
      });

      if (error) throw error;

      alert(`Invoice #${purchase.invoice_number} successfully reverse ho gayi hai!`);
      fetchPurchases();
    } catch (err: any) {
      alert("Reversal failed: " + err.message);
    } finally {
      setReversingId(null);
    }
  };

  const filteredPurchases = purchases.filter(
    (p) =>
      p.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.suppliers?.name && p.suppliers.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      p.purchase_items.some((item) =>
        item.vehicle_number.toLowerCase().includes(searchTerm.toLowerCase())
      )
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <RotateCcw className="w-6 h-6 text-rose-600" /> Purchase Invoice Reversals
          </h1>
          <p className="text-sm text-slate-500">
            Reverse erroneous or returned purchase invoices to automatically adjust stock (bags) and supplier balances.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-300 shadow-sm">
          <Calendar className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-semibold text-slate-600">Reversal Date:</span>
          <input
            type="date"
            value={reversalDate}
            onChange={(e) => setReversalDate(e.target.value)}
            className="text-sm font-medium text-slate-800 outline-none"
          />
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Invoice No, Company, or Vehicle No..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 outline-none"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-100 text-slate-600 uppercase text-xs">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Invoice No</th>
                <th className="px-4 py-3">Supplier / Company</th>
                <th className="px-4 py-3">Vehicles & Stock Details</th>
                <th className="px-4 py-3 text-right">Total Amount</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    Loading purchase invoices...
                  </td>
                </tr>
              ) : filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    No purchase invoices found.
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((purchase) => {
                  const isReversed = purchase.status === "REVERSED";
                  return (
                    <tr
                      key={purchase.id}
                      className={`transition ${isReversed ? "bg-rose-50/40 opacity-75" : "hover:bg-slate-50"}`}
                    >
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {purchase.purchase_date}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-800 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-slate-400" />
                          {purchase.invoice_number}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-700">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-4 h-4 text-blue-500" />
                          {purchase.suppliers?.name || "Unknown"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          {purchase.purchase_items.map((item) => {
                            const rate = item.products?.bags_per_ton || 20;
                            const bags = Number(item.quantity) * rate;
                            return (
                              <div key={item.id} className="text-xs flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-bold uppercase">
                                  <Truck className="w-3 h-3" /> {item.vehicle_number}
                                </span>
                                <span className="text-slate-600">
                                  {item.products?.name}: <b>{item.quantity} Tons</b> ({bags.toLocaleString()} Bags)
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-800 whitespace-nowrap">
                        Rs. {Number(purchase.total_amount).toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {isReversed ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-100 text-rose-700 rounded-full text-xs font-bold">
                            <AlertTriangle className="w-3 h-3" /> REVERSED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">
                            <CheckCircle2 className="w-3 h-3" /> ACTIVE
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {isReversed ? (
                          <span className="text-xs text-slate-400 italic">Already Reversed</span>
                        ) : (
                          <button
                            onClick={() => handleReverse(purchase)}
                            disabled={reversingId === purchase.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 text-white text-xs font-medium rounded-lg hover:bg-rose-700 transition disabled:opacity-50 shadow-sm"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            {reversingId === purchase.id ? "Reversing..." : "Reverse Invoice"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}