"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabase";
import {
  Send,
  Plus,
  X,
  Search,
  Building2,
  Wallet,
  Calendar,
  Hash,
  FileText,
  CheckCircle2,
  Landmark,
  Coins,
  ChevronDown,
} from "lucide-react";

interface Supplier {
  id: string;
  name: string;
}

interface AccountOption {
  id: string;
  account_name: string;
  account_type: string;
  bank_name?: string | null;
  account_number?: string | null;
  current_balance: number;
}

interface PaymentRow {
  id: string;
  supplier_id: string;
  transaction_date: string;
  invoice_number: string;
  description: string;
  debit: number;
  suppliers: { name: string } | null;
}

export default function SupplierPaymentsPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Register Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState("ALL");
  const [selectedMonth, setSelectedMonth] = useState("ALL");

  // Modal & Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [paymentDate, setPaymentDate] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [paymentMode, setPaymentMode] = useState<"BANK" | "PETTY_CASH">("BANK");
  const [accountId, setAccountId] = useState("");
  const [accountSearch, setAccountSearch] = useState("");
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [remarks, setRemarks] = useState("");
  const [supplierBalance, setSupplierBalance] = useState<number | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPaymentDate(new Date().toISOString().split("T")[0]);
    fetchInitialData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsAccountDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (supplierId) {
      fetchSupplierBalance(supplierId);
    } else {
      setSupplierBalance(null);
    }
  }, [supplierId]);

  const fetchInitialData = async () => {
    setLoading(true);
    const [supRes, accRes, payRes] = await Promise.all([
      supabase.from("suppliers").select("id, name").order("name", { ascending: true }),
      supabase
        .from("accounts")
        .select("id, account_name, account_type, bank_name, account_number, current_balance")
        .eq("is_active", true)
        .order("account_name", { ascending: true }),
      supabase
        .from("supplier_ledger")
        .select("id, supplier_id, transaction_date, invoice_number, description, debit, suppliers ( name )")
        .gt("debit", 0)
        .order("transaction_date", { ascending: false })
        .order("created_at", { ascending: false }),
    ]);

    if (supRes.data) setSuppliers(supRes.data);
    if (accRes.data) setAccounts(accRes.data as AccountOption[]);
    if (payRes.data) setPayments(payRes.data as any);
    setLoading(false);
  };

  const fetchSupplierBalance = async (supId: string) => {
    const { data, error } = await supabase
      .from("supplier_ledger")
      .select("debit, credit")
      .eq("supplier_id", supId);

    if (!error && data) {
      const credit = data.reduce((s, r) => s + (Number(r.credit) || 0), 0);
      const debit = data.reduce((s, r) => s + (Number(r.debit) || 0), 0);
      setSupplierBalance(credit - debit);
    }
  };

  // Mode ke hisab se filtered & searchable accounts
  const modeFilteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      const t = String(acc.account_type || "").trim().toLowerCase();
      const matchesMode =
        paymentMode === "BANK"
          ? t === "bank" || t === "banks"
          : t.includes("cash") || t.includes("petty") || t.includes("drawer");

      if (!matchesMode) return false;

      const q = accountSearch.trim().toLowerCase();
      if (!q) return true;

      return (
        acc.account_name.toLowerCase().includes(q) ||
        (acc.bank_name && acc.bank_name.toLowerCase().includes(q)) ||
        (acc.account_number && acc.account_number.toLowerCase().includes(q))
      );
    });
  }, [accounts, paymentMode, accountSearch]);

  const selectedAccount = accounts.find((a) => a.id === accountId);

  const handleModeChange = (mode: "BANK" | "PETTY_CASH") => {
    setPaymentMode(mode);
    setAccountId("");
    setAccountSearch("");
    setIsAccountDropdownOpen(true);
  };

  const handleSelectAccount = (acc: AccountOption) => {
    setAccountId(acc.id);
    setAccountSearch(
      acc.bank_name ? `${acc.account_name} (${acc.bank_name})` : acc.account_name
    );
    setIsAccountDropdownOpen(false);
  };

  const monthOptions = useMemo(() => {
    const set = new Set<string>();
    payments.forEach((p) => {
      if (p.transaction_date && p.transaction_date.length >= 7) {
        set.add(p.transaction_date.slice(0, 7));
      }
    });
    return Array.from(set).sort().reverse();
  }, [payments]);

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const matchesSupplier =
        selectedSupplierFilter === "ALL" || p.supplier_id === selectedSupplierFilter;
      const matchesMonth =
        selectedMonth === "ALL" ||
        (p.transaction_date && p.transaction_date.startsWith(selectedMonth));

      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        (p.invoice_number && p.invoice_number.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.suppliers?.name && p.suppliers.name.toLowerCase().includes(q));

      return matchesSupplier && matchesMonth && matchesSearch;
    });
  }, [payments, selectedSupplierFilter, selectedMonth, searchQuery]);

  const totalFilteredAmount = useMemo(() => {
    return filteredPayments.reduce((sum, p) => sum + (Number(p.debit) || 0), 0);
  }, [filteredPayments]);

  const openNewSlipModal = () => {
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setSupplierId("");
    setPaymentMode("BANK");
    setAccountId("");
    setAccountSearch("");
    setIsAccountDropdownOpen(false);
    setAmount("");
    setReferenceNo("");
    setRemarks("");
    setSupplierBalance(null);
    setIsModalOpen(true);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(amount);

    if (!supplierId || !accountId || isNaN(numericAmount) || numericAmount <= 0) {
      alert(
        `Please select Company, a valid ${paymentMode === "BANK" ? "Bank" : "Petty Cash"} account, and enter amount > 0.`
      );
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.rpc("record_supplier_payment", {
        p_payment_date: paymentDate,
        p_supplier_id: supplierId,
        p_account_id: accountId,
        p_amount: numericAmount,
        p_reference_no: referenceNo.trim() || null,
        p_remarks: remarks.trim() || null,
      });

      if (error) throw error;

      alert("Payment slip saved successfully!");
      setIsModalOpen(false);
      await fetchInitialData();
    } catch (err: any) {
      alert("Error saving payment: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 font-sans text-slate-800">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Send className="w-6 h-6 text-emerald-600" /> Supplier Payments
          </h1>
          <p className="text-sm text-slate-500">
            Track company payments from Banks & Petty Cash, filter by company or month, and issue new payment slips.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl text-right">
            <span className="text-[10px] font-bold text-emerald-700 uppercase block">
              Filtered Total Paid
            </span>
            <span className="text-base font-bold text-emerald-900">
              Rs. {totalFilteredAmount.toLocaleString("en-PK", { minimumFractionDigits: 2 })}
            </span>
          </div>

          <button
            onClick={openNewSlipModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition cursor-pointer"
          >
            <Plus className="w-4 h-4" /> New Payment Slip
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search slip/ref no, company, remarks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={selectedSupplierFilter}
            onChange={(e) => setSelectedSupplierFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Companies</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Months</option>
            {monthOptions.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg font-semibold w-fit">
          Records: {filteredPayments.length}
        </span>
      </div>

      {/* Payments Table */}
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
                <th className="px-4 py-3 text-right">Amount Paid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                    Loading supplier payments...
                  </td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                    No payments match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((pay, idx) => (
                  <tr key={pay.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-500">{idx + 1}</td>
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{pay.transaction_date}</td>
                    <td className="px-4 py-3 font-bold text-slate-800">{pay.suppliers?.name || "-"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{pay.invoice_number || "-"}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{pay.description}</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-700 whitespace-nowrap">
                      Rs. {Number(pay.debit).toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredPayments.length > 0 && (
              <tfoot className="bg-slate-100 font-bold text-slate-800 border-t-2 border-slate-300">
                <tr>
                  <td colSpan={5} className="px-4 py-3 text-right uppercase text-xs">
                    Total Paid:
                  </td>
                  <td className="px-4 py-3 text-right text-base text-emerald-700">
                    Rs. {totalFilteredAmount.toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* NEW PAYMENT SLIP MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full overflow-visible border border-slate-200">
            <div className="px-6 py-4 bg-slate-900 text-white rounded-t-2xl flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold flex items-center gap-2">
                  <Send className="w-4 h-4 text-emerald-400" /> New Payment Slip
                </h2>
                <p className="text-xs text-slate-300">
                  Select Payment Mode (Bank / Petty Cash), search account, and save payment.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePaymentSubmit} className="p-6 space-y-4">
              {/* Row 1: Date & Company */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" /> Payment Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1">
                    <Building2 className="w-3.5 h-3.5 text-blue-600" /> Company / Supplier *
                  </label>
                  <select
                    required
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Select Company --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  {supplierBalance !== null && (
                    <p className="text-[11px] mt-1 text-slate-600">
                      Payable Balance:{" "}
                      <b className={supplierBalance > 0 ? "text-rose-600" : "text-emerald-600"}>
                        Rs. {supplierBalance.toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                      </b>
                    </p>
                  )}
                </div>
              </div>

              {/* Row 2: Payment Mode Toggle (Bank vs Petty Cash) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  1. Payment Mode *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleModeChange("BANK")}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border text-sm font-bold transition cursor-pointer ${
                      paymentMode === "BANK"
                        ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                        : "bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    <Landmark className="w-4 h-4" /> Bank Account
                  </button>

                  <button
                    type="button"
                    onClick={() => handleModeChange("PETTY_CASH")}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border text-sm font-bold transition cursor-pointer ${
                      paymentMode === "PETTY_CASH"
                        ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                        : "bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    <Coins className="w-4 h-4" /> Petty Cash
                  </button>
                </div>
              </div>

              {/* Row 3: Searchable Bank / Petty Cash Dropdown + Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div ref={dropdownRef} className="relative">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1">
                    <Wallet className="w-3.5 h-3.5 text-blue-600" />
                    2. Search & Select {paymentMode === "BANK" ? "Bank" : "Petty Cash"} *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={
                        paymentMode === "BANK"
                          ? "Type bank name or account..."
                          : "Type cash drawer name..."
                      }
                      value={accountSearch}
                      onFocus={() => setIsAccountDropdownOpen(true)}
                      onChange={(e) => {
                        setAccountSearch(e.target.value);
                        setAccountId("");
                        setIsAccountDropdownOpen(true);
                      }}
                      className="w-full pl-3 pr-8 py-2 text-sm border border-slate-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                  </div>

                  {/* Searchable Results List */}
                  {isAccountDropdownOpen && (
                    <div className="absolute z-30 mt-1 w-full bg-white border border-slate-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {modeFilteredAccounts.length === 0 ? (
                        <div className="px-3 py-2.5 text-xs text-slate-400 text-center">
                          No {paymentMode === "BANK" ? "bank" : "petty cash"} account found.
                        </div>
                      ) : (
                        modeFilteredAccounts.map((acc) => (
                          <button
                            key={acc.id}
                            type="button"
                            onClick={() => handleSelectAccount(acc)}
                            className={`w-full text-left px-3 py-2 text-xs hover:bg-blue-50 border-b border-slate-100 last:border-b-0 flex items-center justify-between cursor-pointer ${
                              accountId === acc.id ? "bg-blue-50 font-bold" : ""
                            }`}
                          >
                            <div>
                              <div className="font-semibold text-slate-800">{acc.account_name}</div>
                              {(acc.bank_name || acc.account_number) && (
                                <div className="text-[11px] text-slate-500">
                                  {acc.bank_name} {acc.account_number ? `• ${acc.account_number}` : ""}
                                </div>
                              )}
                            </div>
                            <span className="font-bold text-slate-700 whitespace-nowrap ml-2">
                              Rs. {Number(acc.current_balance).toLocaleString("en-PK")}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}

                  {selectedAccount && (
                    <p className="text-[11px] mt-1 text-slate-600">
                      Available:{" "}
                      <b className="text-blue-700">
                        Rs. {Number(selectedAccount.current_balance).toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                      </b>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Amount (Rs) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-bold text-right text-emerald-700 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Row 4: Slip/Ref No & Remarks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1">
                    <Hash className="w-3.5 h-3.5 text-slate-400" /> Slip / Cheque / Ref No
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. SLIP-104 / CHQ-55"
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1">
                    <FileText className="w-3.5 h-3.5 text-slate-400" /> Remarks
                  </label>
                  <input
                    type="text"
                    placeholder="Optional note"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-5 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {submitting ? "Saving..." : "Save Payment Slip"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}