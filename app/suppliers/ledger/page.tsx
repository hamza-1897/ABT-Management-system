"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Building2, Search, BookOpen, Download, Truck, Calendar } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Supplier {
  id: string;
  name: string;
}

interface LedgerEntry {
  id: string;
  transaction_date: string;
  invoice_number: string;
  vehicle_number: string;
  description: string;
  debit: number;
  credit: number;
  created_at?: string;
}

export default function SupplierLedgerPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [supplierName, setSupplierName] = useState("");
  
  // Month State (Default current year-month, e.g. "2026-11")
// Shuru mein empty rakhein
const [selectedMonth, setSelectedMonth] = useState("");  
  const [allLedgerEntries, setAllLedgerEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

 useEffect(() => {
  // Page load hone par current month set ho jayega (e.g. "2026-11")
  setSelectedMonth(new Date().toISOString().slice(0, 7));

  const fetchSuppliers = async () => {
    const { data, error } = await supabase.from("suppliers").select("id, name").order("name");
    if (data) setSuppliers(data);
    if (error) console.error("Error fetching suppliers:", error.message);
  };
  fetchSuppliers();
}, []);

  // Supplier select hone par saari lifetime entries fetch karo taake opening balance theek nikle
  const fetchLedger = async (supplierId: string) => {
    if (!supplierId) {
      setAllLedgerEntries([]);
      setSupplierName("");
      return;
    }

    const currentSup = suppliers.find((s) => s.id === supplierId);
    if (currentSup) setSupplierName(currentSup.name);

    setLoading(true);
    const { data, error } = await supabase
      .from("supplier_ledger")
      .select("id, transaction_date, invoice_number, vehicle_number, description, debit, credit, created_at")
      .eq("supplier_id", supplierId)
      .order("transaction_date", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching ledger:", error.message);
    } else if (data) {
      setAllLedgerEntries(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLedger(selectedSupplierId);
  }, [selectedSupplierId, suppliers]);

  // 1. Calculate Opening Balance and Filter Entries for Selected Month
  let openingBalance = 0;
  let filteredEntries: LedgerEntry[] = [];

  if (selectedMonth === "ALL") {
    filteredEntries = allLedgerEntries;
    openingBalance = 0;
  } else {
    const [selYear, selMonth] = selectedMonth.split("-");
    
    allLedgerEntries.forEach((entry) => {
      const [entryYear, entryMonth] = entry.transaction_date.split("-");
      
      // Agar transaction selected month se pehle ki hai, toh opening balance mein add hogi
      if (entryYear < selYear || (entryYear === selYear && entryMonth < selMonth)) {
        const debit = Number(entry.debit) || 0;
        const credit = Number(entry.credit) || 0;
        openingBalance = openingBalance + credit - debit;
      } 
      // Agar transaction selected month ki hai, toh table ke liye rakho
      else if (entryYear === selYear && entryMonth === selMonth) {
        filteredEntries.push(entry);
      }
    });
  }

  // Search filter
  const searchedEntries = filteredEntries.filter(
    (entry) =>
      (entry.vehicle_number && entry.vehicle_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (entry.invoice_number && entry.invoice_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (entry.description && entry.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // 2. Running Balance Calculation starting from Opening Balance
  let runningBalance = openingBalance;
  const entriesWithBalance = searchedEntries.map((entry) => {
    const debit = Number(entry.debit) || 0;
    const credit = Number(entry.credit) || 0;
    runningBalance = runningBalance + credit - debit;
    return {
      ...entry,
      balance: runningBalance,
    };
  });

  const totalDebit = searchedEntries.reduce((sum, e) => sum + (Number(e.debit) || 0), 0);
  const totalCredit = searchedEntries.reduce((sum, e) => sum + (Number(e.credit) || 0), 0);

  // Professional jsPDF Download Function
  const downloadPDF = () => {
    const doc = new jsPDF();

    // Header Info
    doc.setFontSize(16);
    doc.text("ABU BAKR TRADERS", 14, 15);
    doc.setFontSize(12);
    doc.text(`Supplier Ledger Report: ${supplierName}`, 14, 22);
    doc.setFontSize(10);
    doc.text(`Period: ${selectedMonth === "ALL" ? "All Time" : selectedMonth} | Generated On: ${new Date().toLocaleDateString()}`, 14, 28);

    const tableColumn = ["Date", "Invoice No", "Vehicle No", "Description", "Debit (Paid)", "Credit (Purchase)", "Balance"];
    const tableRows: any[] = [];

    // Opening Balance Row in PDF if not ALL
    if (selectedMonth !== "ALL") {
      tableRows.push([
        "Opening Balance",
        "-",
        "-",
        "Brought forward from previous months",
        "-",
        "-",
        openingBalance.toLocaleString(),
      ]);
    }

    entriesWithBalance.forEach((entry) => {
      const rowData = [
        entry.transaction_date,
        entry.invoice_number || "-",
        entry.vehicle_number || "-",
        entry.description,
        entry.debit > 0 ? Number(entry.debit).toLocaleString() : "-",
        entry.credit > 0 ? Number(entry.credit).toLocaleString() : "-",
        entry.balance.toLocaleString(),
      ];
      tableRows.push(rowData);
    });

    // Total Row
    tableRows.push([
      "CLOSING TOTAL",
      "",
      "",
      "",
      totalDebit.toLocaleString(),
      totalCredit.toLocaleString(),
      runningBalance.toLocaleString(),
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 34,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] },
      footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
    });

    doc.save(`${supplierName}_Ledger_${selectedMonth}.pdf`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-600" /> Supplier Vehicle-wise Ledger (Month-wise)
          </h1>
          <p className="text-sm text-slate-500">
            Track month-wise vehicle purchases with automated opening balance and PDF export.
          </p>
        </div>
        {selectedSupplierId && (
          <button
            onClick={downloadPDF}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition shadow-sm w-fit"
          >
            <Download className="w-4 h-4" /> Download PDF Report
          </button>
        )}
      </div>

      {/* Control Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
            Select Supplier / Company
          </label>
          <div className="relative">
            <Building2 className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <select
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">-- Choose Supplier --</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
            Select Month
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="month"
              value={selectedMonth === "ALL" ? "" : selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value || "ALL")}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
            Search Ledger
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search vehicle no, invoice..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={!selectedSupplierId}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-50"
            />
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-100 text-slate-600 uppercase text-xs">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Invoice No</th>
                <th className="px-4 py-3">Vehicle No</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3 text-right">Debit (Paid)</th>
                <th className="px-4 py-3 text-right">Credit (Purchase)</th>
                <th className="px-4 py-3 text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {!selectedSupplierId ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    Please select a supplier above to view their ledger history.
                  </td>
                </tr>
              ) : loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    Loading ledger entries...
                  </td>
                </tr>
              ) : (
                <>
                  {/* Opening Balance Row */}
                  {selectedMonth !== "ALL" && (
                    <tr className="bg-slate-50 font-semibold text-slate-700">
                      <td colSpan={6} className="px-4 py-3 text-right uppercase text-xs">
                        Opening Balance (Brought Forward):
                      </td>
                      <td className="px-4 py-3 text-right text-slate-900">
                        {openingBalance.toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  )}

                  {entriesWithBalance.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                        No transactions found for this month.
                      </td>
                    </tr>
                  ) : (
                    entriesWithBalance.map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                          {entry.transaction_date}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">
                          {entry.invoice_number || "-"}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {entry.vehicle_number ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-xs font-bold uppercase">
                              <Truck className="w-3 h-3" /> {entry.vehicle_number}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600 max-w-xs truncate" title={entry.description}>
                          {entry.description}
                        </td>
                        <td className="px-4 py-3 text-right text-emerald-600 font-medium">
                          {entry.debit > 0 ? Number(entry.debit).toLocaleString("en-PK", { minimumFractionDigits: 2 }) : "-"}
                        </td>
                        <td className="px-4 py-3 text-right text-amber-600 font-medium">
                          {entry.credit > 0 ? Number(entry.credit).toLocaleString("en-PK", { minimumFractionDigits: 2 }) : "-"}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-800">
                          {entry.balance.toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  )}
                </>
              )}
            </tbody>
            {selectedSupplierId && (
              <tfoot className="bg-slate-100 font-bold text-slate-800 border-t-2 border-slate-300">
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-right uppercase text-xs tracking-wider">
                    Closing Total:
                  </td>
                  <td className="px-4 py-3 text-right text-emerald-700">
                    {totalDebit.toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-right text-amber-700">
                    {totalCredit.toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-right text-base text-blue-700">
                    {runningBalance.toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}