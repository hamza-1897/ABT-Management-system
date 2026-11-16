"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  Building2,
  Search,
  Download,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  BookOpen,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface SupplierSummary {
  id: string;
  name: string;
  phone?: string;
  city?: string;
  total_purchase: number; // Credit
  total_payment: number;  // Debit
  closing_balance: number;
}

export default function SupplierAccountsPage() {
  const [summaries, setSummaries] = useState<SupplierSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchSupplierBalances();
  }, []);

  const fetchSupplierBalances = async () => {
    setLoading(true);
    try {
      // 1. Saare suppliers fetch karein
      const { data: suppliersData, error: supError } = await supabase
        .from("suppliers")
        .select("id, name")
        .order("name", { ascending: true });

      if (supError) throw supError;

      // 2. Saari supplier_ledger entries fetch karein
      const { data: ledgerData, error: ledError } = await supabase
        .from("supplier_ledger")
        .select("supplier_id, debit, credit");

      if (ledError) throw ledError;

      // 3. Har supplier ke hisab se totals calculate karein
      const computedList: SupplierSummary[] = (suppliersData || []).map((sup) => {
        const supEntries = (ledgerData || []).filter((l) => l.supplier_id === sup.id);

        const totalPurchase = supEntries.reduce((sum, item) => sum + (Number(item.credit) || 0), 0);
        const totalPayment = supEntries.reduce((sum, item) => sum + (Number(item.debit) || 0), 0);
        const closingBalance = totalPurchase - totalPayment;

        return {
          id: sup.id,
          name: sup.name,
          total_purchase: totalPurchase,
          total_payment: totalPayment,
          closing_balance: closingBalance,
        };
      });

      setSummaries(computedList);
    } catch (err: any) {
      console.error("Error loading supplier balances:", err.message);
    } finally {
      setLoading(false);
    }
  };

  // Search filter
  const filteredSuppliers = summaries.filter((s) =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Grand Totals for Footer & Summary Cards
  const grandTotalPurchase = filteredSuppliers.reduce((sum, s) => sum + s.total_purchase, 0);
  const grandTotalPayment = filteredSuppliers.reduce((sum, s) => sum + s.total_payment, 0);
  const grandClosingBalance = filteredSuppliers.reduce((sum, s) => sum + s.closing_balance, 0);

  // PDF Export Function
  const downloadPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text("ABU BAKR TRADERS", 14, 15);
    doc.setFontSize(12);
    doc.text("Supplier Accounts & Payable Balances Summary", 14, 22);
    doc.setFontSize(10);
    doc.text(`Generated On: ${new Date().toLocaleDateString()}`, 14, 28);

    const tableColumn = [
      "#",
      "Company / Supplier Name",
      "Total Purchase (Credit)",
      "Total Payment (Debit)",
      "Closing Balance (Payable)",
    ];
    const tableRows: any[] = [];

    filteredSuppliers.forEach((sup, index) => {
      tableRows.push([
        index + 1,
        sup.name,
        sup.total_purchase.toLocaleString("en-PK", { minimumFractionDigits: 2 }),
        sup.total_payment.toLocaleString("en-PK", { minimumFractionDigits: 2 }),
        sup.closing_balance.toLocaleString("en-PK", { minimumFractionDigits: 2 }),
      ]);
    });

    // Grand Total Row
    tableRows.push([
      "",
      "GRAND TOTAL",
      grandTotalPurchase.toLocaleString("en-PK", { minimumFractionDigits: 2 }),
      grandTotalPayment.toLocaleString("en-PK", { minimumFractionDigits: 2 }),
      grandClosingBalance.toLocaleString("en-PK", { minimumFractionDigits: 2 }),
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 34,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 41, 59] },
      columnStyles: {
        2: { halign: "right" },
        3: { halign: "right" },
        4: { halign: "right", fontStyle: "bold" },
      },
    });

    doc.save(`Supplier_Balances_Summary_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Wallet className="w-6 h-6 text-blue-600" /> Supplier Accounts & Balances
          </h1>
          <p className="text-sm text-slate-500">
            Real-time overview of total purchases, payments made, and net payable balance for each company.
          </p>
        </div>
        <button
          onClick={downloadPDF}
          disabled={filteredSuppliers.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition shadow-sm w-fit disabled:opacity-50"
        >
          <Download className="w-4 h-4" /> Export Balances PDF
        </button>
      </div>

      {/* Top KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Total Purchases (Credit)</span>
            <span className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <ArrowDownLeft className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-800 mt-2">
            Rs. {grandTotalPurchase.toLocaleString("en-PK", { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Total Payments (Debit)</span>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <ArrowUpRight className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-bold text-emerald-600 mt-2">
            Rs. {grandTotalPayment.toLocaleString("en-PK", { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-blue-200  shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-700 uppercase">Net Closing Payable</span>
            <span className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <Wallet className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-bold text-blue-700 mt-2">
            Rs. {grandClosingBalance.toLocaleString("en-PK", { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search company / supplier name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <span className="text-xs font-semibold text-slate-500">
          Showing {filteredSuppliers.length} Suppliers
        </span>
      </div>

      {/* Balances Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-100 text-slate-600 uppercase text-xs">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Company / Supplier Name</th>
                <th className="px-4 py-3 text-right">Total Purchase (Credit)</th>
                <th className="px-4 py-3 text-right">Total Payment (Debit)</th>
                <th className="px-4 py-3 text-right">Closing Balance</th>
                <th className="px-4 py-3 text-center">Ledger</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    Calculating supplier balances...
                  </td>
                </tr>
              ) : filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    No supplier accounts found.
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((sup, index) => (
                  <tr key={sup.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 text-slate-500 font-medium">{index + 1}</td>
                    <td className="px-4 py-3 font-bold text-slate-800">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-blue-600" />
                        {sup.name}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-amber-600">
                      {sup.total_purchase.toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-emerald-600">
                      {sup.total_payment.toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-base">
                      <span
                        className={
                          sup.closing_balance > 0
                            ? "text-rose-600"
                            : sup.closing_balance < 0
                            ? "text-emerald-600"
                            : "text-slate-700"
                        }
                      >
                        {sup.closing_balance.toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Link
                        href="/suppliers/ledger"
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-md text-xs font-semibold transition"
                      >
                        <BookOpen className="w-3.5 h-3.5" /> Ledger <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {/* Monetary Totals Footer */}
            {filteredSuppliers.length > 0 && (
              <tfoot className="bg-slate-100 font-bold text-slate-800 border-t-2 border-slate-300">
                <tr>
                  <td colSpan={2} className="px-4 py-3 text-right uppercase text-xs tracking-wider">
                    Grand Total:
                  </td>
                  <td className="px-4 py-3 text-right text-amber-700">
                    {grandTotalPurchase.toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-right text-emerald-700">
                    {grandTotalPayment.toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-right text-base text-blue-700">
                    {grandClosingBalance.toLocaleString("en-PK", { minimumFractionDigits: 2 })}
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