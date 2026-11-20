"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { useSearchParams } from "next/navigation";
import { BookOpen } from "lucide-react";

interface CustomerOption {
  id: string;
  name: string;
  short_code?: string | null;
  code?: string | null;
  opening_balance?: number | null;
}

interface LedgerEntry {
  id: string;
  transaction_date: string;
  invoice_number?: string | null;
  vehicle_number?: string | null;
  description?: string | null;
  debit: number;
  credit: number;
}

function CustomerLedgerContent() {
  const searchParams = useSearchParams();
  const initialCustomerId = searchParams.get("customerId") || "";

  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(initialCustomerId);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    if (initialCustomerId) {
      setSelectedCustomerId(initialCustomerId);
    }
  }, [initialCustomerId]);

  useEffect(() => {
    if (selectedCustomerId) {
      loadLedger(selectedCustomerId);
    } else {
      setEntries([]);
    }
  }, [selectedCustomerId]);

  const loadCustomers = async () => {
    const { data } = await supabase
      .from("customers")
      .select("id, name, short_code, code, opening_balance")
      .eq("is_active", true)
      .order("name", { ascending: true });

    const list = (data as CustomerOption[]) || [];
    setCustomers(list);
    if (!initialCustomerId && list.length > 0) {
      setSelectedCustomerId(list[0].id);
    }
  };

  const loadLedger = async (customerId: string) => {
    setLoading(true);
    const { data } = await supabase
      .from("customer_ledger")
      .select("id, transaction_date, invoice_number, vehicle_number, description, debit, credit")
      .eq("customer_id", customerId)
      .order("transaction_date", { ascending: true })
      .order("created_at", { ascending: true });

    setEntries((data as LedgerEntry[]) || []);
    setLoading(false);
  };

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === selectedCustomerId) || null,
    [customers, selectedCustomerId]
  );

  // Running balance: negative (-) = customer ne dena hai
  const ledgerWithBalance = useMemo(() => {
    let running = -(Number(selectedCustomer?.opening_balance) || 0);
    return entries.map((e) => {
      const billDelta = -(Number(e.debit) || 0);
      const cashDelta = Number(e.credit) || 0;
      running = Number((running + billDelta + cashDelta).toFixed(2));
      return {
        ...e,
        billDelta,
        cashDelta,
        runningBalance: running,
      };
    });
  }, [entries, selectedCustomer]);

  const finalBalance =
    ledgerWithBalance.length > 0
      ? ledgerWithBalance[ledgerWithBalance.length - 1].runningBalance
      : -(Number(selectedCustomer?.opening_balance) || 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5 text-slate-800">
      {/* Header + Customer Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" /> Customer Ledger
          </h1>
          <p className="text-xs text-slate-500">
            Negative (-) balance means customer has to pay.
          </p>
        </div>

        <select
          value={selectedCustomerId}
          onChange={(e) => setSelectedCustomerId(e.target.value)}
          className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg outline-none focus:border-blue-500 min-w-[240px]"
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
      </div>

      {/* Current Closing Balance Strip */}
      {selectedCustomer && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
          <span className="font-bold text-slate-800">{selectedCustomer.name}</span>
          <span
            className={`text-base font-bold ${
              finalBalance < 0 ? "text-rose-700" : "text-emerald-700"
            }`}
          >
            Closing Balance: Rs. {finalBalance.toLocaleString("en-PK", { minimumFractionDigits: 2 })}
          </span>
        </div>
      )}

      {/* Ledger Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-100 text-slate-600 text-xs uppercase border-b border-slate-200">
              <tr>
                <th className="px-4 py-2.5">Date</th>
                <th className="px-4 py-2.5">Invoice #</th>
                <th className="px-4 py-2.5">Vehicle #</th>
                <th className="px-4 py-2.5">Description</th>
                <th className="px-4 py-2.5 text-right">Bill (-)</th>
                <th className="px-4 py-2.5 text-right">Cash (+)</th>
                <th className="px-4 py-2.5 text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    Loading ledger...
                  </td>
                </tr>
              ) : ledgerWithBalance.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    No ledger entries for this customer.
                  </td>
                </tr>
              ) : (
                ledgerWithBalance.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">{row.transaction_date}</td>
                    <td className="px-4 py-2.5 font-medium">{row.invoice_number || "-"}</td>
                    <td className="px-4 py-2.5 text-slate-700">{row.vehicle_number || "-"}</td>
                    <td className="px-4 py-2.5 text-slate-600">{row.description || "-"}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-rose-700">
                      {row.billDelta < 0
                        ? row.billDelta.toLocaleString("en-PK", { minimumFractionDigits: 2 })
                        : "-"}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-emerald-700">
                      {row.cashDelta > 0
                        ? `+${row.cashDelta.toLocaleString("en-PK", { minimumFractionDigits: 2 })}`
                        : "-"}
                    </td>
                    <td
                      className={`px-4 py-2.5 text-right font-bold ${
                        row.runningBalance < 0 ? "text-rose-700" : "text-emerald-700"
                      }`}
                    >
                      Rs. {row.runningBalance.toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function CustomerLedgerPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-400">Loading ledger...</div>}>
      <CustomerLedgerContent />
    </Suspense>
  );
}