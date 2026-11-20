"use client";

import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import {
  RotateCcw,
  Search,
  Building2,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

interface Supplier {
  id: string;
  name: string;
}

interface PaymentEntry {
  id: string;
  supplier_id: string;
  account_id?: string | null;
  transaction_date: string;
  invoice_number: string;
  description: string;
  debit: number;
  suppliers: { name: string } | null;
  accounts?: { account_name: string; account_type: string; bank_name?: string | null } | null;
}

export default function ReverseSupplierPaymentPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [reversingId, setReversingId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState("ALL");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [supRes, payRes] = await Promise.all([
        supabase.from("suppliers").select("id, name").order("name", { ascending: true }),
        supabase
          .from("supplier_ledger")
          .select(
            "id, supplier_id, account_id, transaction_date, invoice_number, description, debit, suppliers ( name ), accounts ( account_name, account_type, bank_name )"
          )
          .gt("debit", 0)
          .order("transaction_date", { ascending: false })
          .order("created_at", { ascending: false }),
      ]);

      if (supRes.error) throw supRes.error;
      if (payRes.error) throw payRes.error;

      setSuppliers(supRes.data || []);
      setPayments((payRes.data as any) || []);
    } catch (err: any) {
      console.error("Error loading payments for reversal:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const matchesSup = selectedSupplier === "ALL" || p.supplier_id === selectedSupplier;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        (p.invoice_number && p.invoice_number.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.suppliers?.name && p.suppliers.name.toLowerCase().includes(q)) ||
        (p.accounts?.account_name && p.accounts.account_name.toLowerCase().includes(q));

      return matchesSup && matchesSearch;
    });
  }, [payments, selectedSupplier, searchQuery]);

  const handleReverseEntry = async (entry: PaymentEntry) => {
    const accLabel = entry.accounts?.account_name
      ? `${entry.accounts.account_name}${entry.accounts.bank_name ? ` (${entry.accounts.bank_name})` : ""}`
      : "Linked Account";

    const ok = window.confirm(
      `Confirm Payment Reversal?\n\n` +
        `Company: ${entry.suppliers?.name || "-"}\n` +
        `Date: ${entry.transaction_date}\n` +
        `Slip / Ref No: ${entry.invoice_number || "-"}\n` +
        `Amount: Rs. ${Number(entry.debit).toLocaleString("en-PK", { minimumFractionDigits: 2 })}\n` +
        `Account: ${accLabel}\n\n` +
        `Yeh entry Supplier Ledger aur Payments dono jagah se khatam ho jayegi aur Account/Supplier balance wapas restore ho jayega.`
    );

    if (!ok) return;

    setReversingId(entry.id);
    try {
      const { error } = await supabase.rpc("reverse_supplier_payment", {
        p_ledger_id: entry.id,
      });

      if (error) throw error;

      alert("Payment entry successfully reversed! Ledger, Payments & Balances updated.");
      await fetchData();
    } catch (err: any) {
      alert("Reversal failed: " + err.message);
    } finally {
      setReversingId(null);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 font-sans text-slate-800">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <RotateCcw className="w-6 h-6 text-rose-600" /> Reverse Supplier Payment
          </h1>
          <p className="text-sm text-slate-500">
            Reverse a posted supplier payment. Removes entry from Supplier Ledger & Payments and restores Bank/Petty Cash & Supplier balances.
          </p>
        </div>

        <div className="bg-amber-50 border border-amber-200 px-3.5 py-2 rounded-xl text-xs text-amber-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Reversing permanently removes the payment entry from ledger.</span>
        </div>
      </div>

      {/* Search & Supplier Filter */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search slip/ref no, company, account, remarks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <select
            value={selectedSupplier}
            onChange={(e) => setSelectedSupplier(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-rose-500"
          >
            <option value="ALL">All Companies</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg font-semibold w-fit">
          Payment Entries: {filteredPayments.length}
        </span>
      </div>

      {/* Payments Table for Reversal */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-100 text-slate-600 uppercase text-xs border-b">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Company / Supplier</th>
                <th className="px-4 py-3">Slip / Ref No</th>
                <th className="px-4 py-3">Account & Description</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                    Loading payment entries...
                  </td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                    No payment entries found to reverse.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((entry, idx) => (
                  <tr key={entry.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-500">{idx + 1}</td>
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{entry.transaction_date}</td>
                    <td className="px-4 py-3 font-bold text-slate-800">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>{entry.suppliers?.name || "-"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">
                      {entry.invoice_number || "-"}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {entry.accounts?.account_name && (
                        <span className="font-semibold text-slate-800 mr-1.5">
                          [{entry.accounts.account_name}]
                        </span>
                      )}
                      {entry.description}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-700 whitespace-nowrap">
                      Rs. {Number(entry.debit).toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <button
                        type="button"
                        disabled={reversingId === entry.id}
                        onClick={() => handleReverseEntry(entry)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition disabled:opacity-50 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        {reversingId === entry.id ? "Reversing..." : "Reverse Entry"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Footer */}
      <div className="text-xs text-slate-500 flex items-center gap-1.5">
        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
        <span>
          Reversing automatically adds amount back to Bank/Petty Cash `current_balance` and deletes the debit row from `supplier_ledger`.
        </span>
      </div>
    </div>
  );
}