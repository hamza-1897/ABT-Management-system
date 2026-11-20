"use client";

import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import {
  Users,
  Search,
  BookOpen,
  Download,
  ArrowUpDown,
  RotateCcw,
  X,
  Columns3,
} from "lucide-react";
import Link from "next/link";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface LedgerRawRow {
  customer_id: string;
  transaction_date: string;
  debit: number;
  credit: number;
}

interface CustomerRawRow {
  id: string;
  name: string;
  short_code?: string | null;
  code?: string | null;
  market?: string | null;
  opening_balance: number;
}

interface CustomerBalanceRow {
  id: string;
  name: string;
  short_code?: string | null;
  code?: string | null;
  market?: string | null;
  total_sale: number;      // Negative (-) = customer ne dena hai
  total_received: number;  // Positive (+) = cash/receipt aayi
  closing_balance: number; // Negative (-) = customer ne dena hai
}

type SortField = "name" | "market" | "closing_balance";
type SortDir = "asc" | "desc";
type BalanceFilter = "ALL" | "RECEIVABLE" | "ADVANCE" | "ZERO";

export default function CustomerAccountsPage() {
  const [customers, setCustomers] = useState<CustomerRawRow[]>([]);
  const [ledgerRows, setLedgerRows] = useState<LedgerRawRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("ALL"); // "ALL" or "YYYY-MM"
  const [includeMarket, setIncludeMarket] = useState("ALL");
  const [excludedMarkets, setExcludedMarkets] = useState<string[]>([]);
  const [balanceFilter, setBalanceFilter] = useState<BalanceFilter>("ALL");

  // Sorting
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Column visibility toggles (Name & Closing Balance always visible)
  const [showCode, setShowCode] = useState(true);
  const [showMarket, setShowMarket] = useState(true);
  const [showBill, setShowBill] = useState(true);
  const [showCash, setShowCash] = useState(true);

  useEffect(() => {
    fetchCustomerBalances();
  }, []);

  const fetchCustomerBalances = async () => {
    setLoading(true);
    try {
      const [custRes, ledgerRes] = await Promise.all([
        supabase
          .from("customers")
          .select("id, name, short_code, code, market, opening_balance")
          .eq("is_active", true)
          .order("name", { ascending: true }),
        supabase
          .from("customer_ledger")
          .select("customer_id, transaction_date, debit, credit"),
      ]);

      if (custRes.error) throw custRes.error;
      if (ledgerRes.error) throw ledgerRes.error;

      setCustomers((custRes.data as CustomerRawRow[]) || []);
      setLedgerRows((ledgerRes.data as LedgerRawRow[]) || []);
    } catch (err: any) {
      console.error("Error loading customer accounts:", err.message);
    } finally {
      setLoading(false);
    }
  };

  // Available months (YYYY-MM) from ledger
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    ledgerRows.forEach((l) => {
      if (l.transaction_date && l.transaction_date.length >= 7) {
        months.add(l.transaction_date.slice(0, 7));
      }
    });
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [ledgerRows]);

  // Compute balances per customer (all time or month-specific)
  const computedRows = useMemo<CustomerBalanceRow[]>(() => {
    return customers.map((cust) => {
      const entries = ledgerRows.filter((l) => {
        if (l.customer_id !== cust.id) return false;
        if (selectedMonth !== "ALL") {
          return (l.transaction_date || "").startsWith(selectedMonth);
        }
        return true;
      });

      const ledgerDebit = entries.reduce((sum, item) => sum + (Number(item.debit) || 0), 0);
      const ledgerCredit = entries.reduce((sum, item) => sum + (Number(item.credit) || 0), 0);

      // Opening balance sirf ALL months mein shamil hoga; specific month mein us month ki movement dikhegi
      const opening = selectedMonth === "ALL" ? Number(cust.opening_balance) || 0 : 0;
      const totalSale = -(opening + ledgerDebit);
      const totalReceived = ledgerCredit;
      const closingBalance = Number((totalSale + totalReceived).toFixed(2));

      return {
        id: cust.id,
        name: cust.name,
        short_code: cust.short_code,
        code: cust.code,
        market: cust.market,
        total_sale: totalSale,
        total_received: totalReceived,
        closing_balance: closingBalance,
      };
    });
  }, [customers, ledgerRows, selectedMonth]);

  // Distinct markets list for dropdowns
  const availableMarkets = useMemo(() => {
    const set = new Set<string>();
    computedRows.forEach((r) => {
      const m = (r.market || "").trim();
      if (m) set.add(m);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [computedRows]);

  const addExcludedMarket = (marketVal: string) => {
    if (!marketVal || marketVal === "NONE") return;
    if (!excludedMarkets.includes(marketVal)) {
      setExcludedMarkets((prev) => [...prev, marketVal]);
    }
  };

  const removeExcludedMarket = (marketVal: string) => {
    setExcludedMarkets((prev) => prev.filter((m) => m !== marketVal));
  };

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedMonth("ALL");
    setIncludeMarket("ALL");
    setExcludedMarkets([]);
    setBalanceFilter("ALL");
    setSortField("name");
    setSortDir("asc");
    setShowCode(true);
    setShowMarket(true);
    setShowBill(true);
    setShowCash(true);
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const filteredAndSortedRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const filtered = computedRows.filter((r) => {
      const m = (r.market || "").trim();

      const matchSearch =
        !q ||
        r.name.toLowerCase().includes(q) ||
        (r.short_code && r.short_code.toLowerCase().includes(q)) ||
        (r.code && r.code.toLowerCase().includes(q)) ||
        m.toLowerCase().includes(q);

      const matchIncludeMarket =
        includeMarket === "ALL" ||
        (includeMarket === "__NONE__" ? !m : m === includeMarket);

      const matchExcludedMarket = !m || !excludedMarkets.includes(m);

      let matchBalance = true;
      if (balanceFilter === "RECEIVABLE") matchBalance = r.closing_balance < 0;
      else if (balanceFilter === "ADVANCE") matchBalance = r.closing_balance > 0;
      else if (balanceFilter === "ZERO") matchBalance = r.closing_balance === 0;

      return matchSearch && matchIncludeMarket && matchExcludedMarket && matchBalance;
    });

    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortField === "name") {
        cmp = a.name.localeCompare(b.name);
      } else if (sortField === "market") {
        cmp = (a.market || "").localeCompare(b.market || "");
      } else if (sortField === "closing_balance") {
        cmp = a.closing_balance - b.closing_balance;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [
    computedRows,
    searchQuery,
    includeMarket,
    excludedMarkets,
    balanceFilter,
    sortField,
    sortDir,
  ]);

  const summary = useMemo(() => {
    return filteredAndSortedRows.reduce(
      (acc, r) => ({
        sale: acc.sale + r.total_sale,
        received: acc.received + r.total_received,
        closing: acc.closing + r.closing_balance,
      }),
      { sale: 0, received: 0, closing: 0 }
    );
  }, [filteredAndSortedRows]);

  const downloadPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(15);
    doc.text("ABU BAKAR TRADERS", 14, 15);
    doc.setFontSize(11);
    doc.text("Customer Accounts & Balances Report", 14, 21);

    const filterParts: string[] = [];
    filterParts.push(`Month: ${selectedMonth === "ALL" ? "All Months" : selectedMonth}`);
    if (searchQuery.trim()) filterParts.push(`Search: "${searchQuery.trim()}"`);
    if (includeMarket !== "ALL") filterParts.push(`Market: ${includeMarket}`);
    if (excludedMarkets.length > 0) filterParts.push(`Excluded: ${excludedMarkets.join(", ")}`);
    if (balanceFilter !== "ALL") filterParts.push(`Balance: ${balanceFilter}`);

    doc.setFontSize(8.5);
    doc.text(filterParts.join(" | "), 14, 27);

    // Dynamic columns based on visible toggles
    const headers: string[] = ["#"];
    if (showCode) headers.push("Code");
    headers.push("Customer");
    if (showMarket) headers.push("Market");
    if (showBill) headers.push("Bill (-)");
    if (showCash) headers.push("Cash (+)");
    headers.push("Closing Balance");

    const columnStyles: Record<number, any> = {};
    let totalRow: string[] = [""];
    if (showCode) totalRow.push("");
    totalRow.push("TOTAL");
    if (showMarket) totalRow.push("");

    let colIdx = 1 + (showCode ? 1 : 0) + 1 + (showMarket ? 1 : 0);
    if (showBill) {
      columnStyles[colIdx] = { halign: "right" };
      totalRow.push(summary.sale.toLocaleString("en-PK", { minimumFractionDigits: 2 }));
      colIdx++;
    }
    if (showCash) {
      columnStyles[colIdx] = { halign: "right" };
      totalRow.push(summary.received.toLocaleString("en-PK", { minimumFractionDigits: 2 }));
      colIdx++;
    }
    columnStyles[colIdx] = { halign: "right", fontStyle: "bold" };
    totalRow.push(summary.closing.toLocaleString("en-PK", { minimumFractionDigits: 2 }));

    const body = filteredAndSortedRows.map((r, idx) => {
      const row: string[] = [String(idx + 1)];
      if (showCode) row.push(r.short_code || r.code || "-");
      row.push(r.name);
      if (showMarket) row.push(r.market || "-");
      if (showBill) row.push(r.total_sale.toLocaleString("en-PK", { minimumFractionDigits: 2 }));
      if (showCash) row.push(r.total_received.toLocaleString("en-PK", { minimumFractionDigits: 2 }));
      row.push(r.closing_balance.toLocaleString("en-PK", { minimumFractionDigits: 2 }));
      return row;
    });

    body.push(totalRow);

    autoTable(doc, {
      head: [headers],
      body,
      startY: 31,
      styles: { fontSize: 8.5 },
      headStyles: { fillColor: [30, 41, 59] },
      columnStyles,
    });

    const monthTag = selectedMonth === "ALL" ? "All" : selectedMonth;
    doc.save(`Customer_Accounts_${monthTag}_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const visibleCount =
    2 + // # + Customer
    (showCode ? 1 : 0) +
    (showMarket ? 1 : 0) +
    (showBill ? 1 : 0) +
    (showCash ? 1 : 0) +
    2; // Balance + Ledger

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4 text-slate-800">
      {/* Header + PDF Download */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" /> Customer Accounts
          </h1>
          <p className="text-xs text-slate-500">
            Negative (-) balance means customer has to pay. ({filteredAndSortedRows.length} customers shown)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
          <button
            type="button"
            onClick={downloadPDF}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer"
          >
            <Download className="w-4 h-4" /> Download PDF
          </button>
        </div>
      </div>

      {/* Filters, Month & Sorting Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Search by Name / Code / Market */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Name, code, market..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500"
            />
          </div>

          {/* Month Filter */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg bg-white outline-none focus:border-blue-500"
          >
            <option value="ALL">Month: All Months</option>
            {availableMonths.map((m) => (
              <option key={m} value={m}>
                Month: {m}
              </option>
            ))}
          </select>

          {/* Filter by Market */}
          <select
            value={includeMarket}
            onChange={(e) => setIncludeMarket(e.target.value)}
            className="px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg bg-white outline-none focus:border-blue-500"
          >
            <option value="ALL">All Markets</option>
            {availableMarkets.map((m) => (
              <option key={m} value={m}>
                Market: {m}
              </option>
            ))}
            <option value="__NONE__">No Market Assigned</option>
          </select>

          {/* Exclude Market ("Ye markets na aayen") */}
          <select
            value="NONE"
            onChange={(e) => addExcludedMarket(e.target.value)}
            className="px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg bg-white outline-none focus:border-rose-500"
          >
            <option value="NONE">Exclude Market (Skip...)</option>
            {availableMarkets.map((m) => (
              <option key={m} value={m} disabled={excludedMarkets.includes(m)}>
                Skip: {m}
              </option>
            ))}
          </select>

          {/* Filter by Balance */}
          <select
            value={balanceFilter}
            onChange={(e) => setBalanceFilter(e.target.value as BalanceFilter)}
            className="px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg bg-white outline-none focus:border-blue-500"
          >
            <option value="ALL">All Balances</option>
            <option value="RECEIVABLE">Denay Walay / Negative (&lt; 0)</option>
            <option value="ADVANCE">Advance / Positive (&gt; 0)</option>
            <option value="ZERO">Zero (= 0)</option>
          </select>

          {/* Sort By & Direction */}
          <div className="flex items-center gap-1.5">
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
              className="flex-1 px-2 py-1.5 text-sm border border-slate-300 rounded-lg bg-white outline-none focus:border-blue-500"
            >
              <option value="name">Sort: Name</option>
              <option value="market">Sort: Market</option>
              <option value="closing_balance">Sort: Balance</option>
            </select>
            <button
              type="button"
              onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
              className="px-2 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer"
              title="Toggle Ascending / Descending"
            >
              {sortDir === "asc" ? "ASC ↑" : "DESC ↓"}
            </button>
          </div>
        </div>

        {/* Column Toggle Strip + Excluded Markets Chips */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 font-semibold text-slate-600 mr-1">
              <Columns3 className="w-3.5 h-3.5" /> Columns:
            </span>
            <label className="inline-flex items-center gap-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showCode}
                onChange={(e) => setShowCode(e.target.checked)}
                className="rounded border-slate-300"
              />
              <span>Code</span>
            </label>
            <label className="inline-flex items-center gap-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showMarket}
                onChange={(e) => setShowMarket(e.target.checked)}
                className="rounded border-slate-300"
              />
              <span>Market</span>
            </label>
            <label className="inline-flex items-center gap-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showBill}
                onChange={(e) => setShowBill(e.target.checked)}
                className="rounded border-slate-300"
              />
              <span>Bill (-)</span>
            </label>
            <label className="inline-flex items-center gap-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showCash}
                onChange={(e) => setShowCash(e.target.checked)}
                className="rounded border-slate-300"
              />
              <span>Cash (+)</span>
            </label>
          </div>

          {excludedMarkets.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-rose-700">Excluded:</span>
              {excludedMarkets.map((m) => (
                <span
                  key={m}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200"
                >
                  {m}
                  <button
                    type="button"
                    onClick={() => removeExcludedMarket(m)}
                    className="hover:text-rose-900 cursor-pointer"
                    title="Remove exclusion"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Customers Balance Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-100 text-slate-600 text-xs uppercase border-b border-slate-200">
              <tr>
                <th className="px-4 py-2.5">#</th>
                {showCode && <th className="px-4 py-2.5">Code</th>}
                <th className="px-4 py-2.5">
                  <button
                    type="button"
                    onClick={() => toggleSort("name")}
                    className="inline-flex items-center gap-1 font-bold uppercase hover:text-slate-900 cursor-pointer"
                  >
                    Customer <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                {showMarket && (
                  <th className="px-4 py-2.5">
                    <button
                      type="button"
                      onClick={() => toggleSort("market")}
                      className="inline-flex items-center gap-1 font-bold uppercase hover:text-slate-900 cursor-pointer"
                    >
                      Market <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                )}
                {showBill && <th className="px-4 py-2.5 text-right">Bill (-)</th>}
                {showCash && <th className="px-4 py-2.5 text-right">Cash (+)</th>}
                <th className="px-4 py-2.5 text-right">
                  <button
                    type="button"
                    onClick={() => toggleSort("closing_balance")}
                    className="inline-flex items-center gap-1 font-bold uppercase hover:text-slate-900 cursor-pointer ml-auto"
                  >
                    Balance <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-4 py-2.5 text-center">Ledger</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={visibleCount} className="px-4 py-8 text-center text-slate-400">
                    Loading customer accounts...
                  </td>
                </tr>
              ) : filteredAndSortedRows.length === 0 ? (
                <tr>
                  <td colSpan={visibleCount} className="px-4 py-8 text-center text-slate-400">
                    No customers match the current filter.
                  </td>
                </tr>
              ) : (
                filteredAndSortedRows.map((r, idx) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-slate-400">{idx + 1}</td>
                    {showCode && (
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-600">
                        {r.short_code || r.code || "-"}
                      </td>
                    )}
                    <td className="px-4 py-2.5 font-bold text-slate-900">{r.name}</td>
                    {showMarket && <td className="px-4 py-2.5 text-slate-600">{r.market || "-"}</td>}
                    {showBill && (
                      <td className="px-4 py-2.5 text-right font-semibold text-rose-700">
                        {r.total_sale.toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                      </td>
                    )}
                    {showCash && (
                      <td className="px-4 py-2.5 text-right font-semibold text-emerald-700">
                        {r.total_received.toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                      </td>
                    )}
                    <td
                      className={`px-4 py-2.5 text-right font-bold ${
                        r.closing_balance < 0 ? "text-rose-700" : "text-emerald-700"
                      }`}
                    >
                      Rs. {r.closing_balance.toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <Link
                        href={`/customers/ledger?customerId=${r.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-md"
                      >
                        <BookOpen className="w-3.5 h-3.5" /> Ledger
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {!loading && filteredAndSortedRows.length > 0 && (
              <tfoot className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                <tr>
                  <td
                    colSpan={1 + (showCode ? 1 : 0) + 1 + (showMarket ? 1 : 0)}
                    className="px-4 py-2.5 text-right uppercase text-xs"
                  >
                    Total:
                  </td>
                  {showBill && (
                    <td className="px-4 py-2.5 text-right text-rose-700">
                      {summary.sale.toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                    </td>
                  )}
                  {showCash && (
                    <td className="px-4 py-2.5 text-right text-emerald-700">
                      {summary.received.toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                    </td>
                  )}
                  <td
                    className={`px-4 py-2.5 text-right ${
                      summary.closing < 0 ? "text-rose-700" : "text-emerald-700"
                    }`}
                  >
                    Rs. {summary.closing.toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}