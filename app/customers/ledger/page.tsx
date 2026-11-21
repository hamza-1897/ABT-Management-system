"use client";

import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { BookOpen, Search, Eye } from "lucide-react";
import Link from "next/link";

interface CustomerLedgerListRow {
  id: string;
  name: string;
  short_code?: string | null;
  code?: string | null;
  market?: string | null;
  closing_balance: number; // Negative (-) = customer ne dena hai
}

export default function LedgerCustomersListPage() {
  const [customers, setCustomers] = useState<CustomerLedgerListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadCustomersWithBalance();
  }, []);

  const loadCustomersWithBalance = async () => {
    setLoading(true);
    try {
      const [custRes, ledRes] = await Promise.all([
        supabase
          .from("customers")
          .select("id, name, short_code, code, market, opening_balance")
          .eq("is_active", true)
          .order("name", { ascending: true }),
        supabase
          .from("customer_ledger")
          .select("customer_id, debit, credit"),
      ]);

      if (custRes.error) throw custRes.error;
      if (ledRes.error) throw ledRes.error;

      const custData = custRes.data || [];
      const ledData = ledRes.data || [];

      const computed: CustomerLedgerListRow[] = custData.map((c: any) => {
        const entries = ledData.filter((l: any) => l.customer_id === c.id);
        const debit = entries.reduce((s, r) => s + (Number(r.debit) || 0), 0);
        const credit = entries.reduce((s, r) => s + (Number(r.credit) || 0), 0);
        const opening = Number(c.opening_balance) || 0;

        // Negative (-) = customer ne dena hai
        const totalSale = -(opening + debit);
        const closingBalance = Number((totalSale + credit).toFixed(2));

        return {
          id: c.id,
          name: c.name,
          short_code: c.short_code,
          code: c.code,
          market: c.market,
          closing_balance: closingBalance,
        };
      });

      setCustomers(computed);
    } catch (err: any) {
      console.error("Error loading customer ledger list:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.short_code && c.short_code.toLowerCase().includes(q)) ||
        (c.code && c.code.toLowerCase().includes(q)) ||
        (c.market && c.market.toLowerCase().includes(q)) ||
        String(c.closing_balance).includes(q)
    );
  }, [customers, searchQuery]);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4 text-slate-800">
      {/* Header + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" /> Customer Khata — Select Customer
          </h1>
          <p className="text-xs text-slate-500">
            Negative (-) balance means customer has to pay. Click View for full ledger.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search name, code, market, balance..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-100 text-slate-600 text-xs uppercase border-b border-slate-200">
              <tr>
                <th className="px-4 py-2.5 w-12">#</th>
                <th className="px-4 py-2.5">Code</th>
                <th className="px-4 py-2.5">Customer Name</th>
                <th className="px-4 py-2.5">Market</th>
                <th className="px-4 py-2.5 text-right">Closing Balance</th>
                <th className="px-4 py-2.5 text-center w-28">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    Loading customers...
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    No customer found.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c, idx) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-slate-400">{idx + 1}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-600">
                      {c.short_code || c.code || "-"}
                    </td>
                    <td className="px-4 py-2.5 font-bold text-slate-900">{c.name}</td>
                    <td className="px-4 py-2.5 text-slate-600">{c.market || "-"}</td>
                    <td
                      className={`px-4 py-2.5 text-right font-bold ${
                        c.closing_balance < 0 ? "text-rose-700" : "text-emerald-700"
                      }`}
                    >
                      Rs. {c.closing_balance.toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <Link
                        href={`/customers/ledger/${c.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                      >
                        <Eye className="w-3.5 h-3.5" /> View
                      </Link>
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