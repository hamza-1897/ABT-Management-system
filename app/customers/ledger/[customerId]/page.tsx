"use client";

import React, { useState, useEffect, useMemo, use, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { BookOpen, ArrowLeft, Download, Calendar, RotateCcw } from "lucide-react";
import Link from "next/link";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface CustomerProfile {
  id: string;
  name: string;
  short_code?: string | null;
  code?: string | null;
  market?: string | null;
  phone?: string | null;
  address?: string | null;
  opening_balance?: number | null;
}

interface LedgerRow {
  id: string;
  transaction_date: string;
  invoice_number?: string | null;
  vehicle_number?: string | null;
  description?: string | null;
  debit: number;
  credit: number;
  created_at: string;
}

function extractBagsFromDescription(desc?: string | null): number {
  if (!desc) return 0;
  const match = desc.match(/-\s*([\d,.]+)\s*Bags/i);
  if (!match) return 0;
  const num = parseFloat(match[1].replace(/,/g, ""));
  return Number.isNaN(num) ? 0 : num;
}

function CustomerLedgerDetail({
  paramsPromise,
}: {
  paramsPromise: Promise<{ customerId: string }>;
}) {
  const { customerId } = use(paramsPromise);

  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [allEntries, setAllEntries] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    if (customerId) {
      loadCustomerAndLedger(customerId);
    }
  }, [customerId]);

  const loadCustomerAndLedger = async (id: string) => {
    setLoading(true);
    try {
      const [custRes, ledRes] = await Promise.all([
        supabase
          .from("customers")
          .select("id, name, short_code, code, market, phone, address, opening_balance")
          .eq("id", id)
          .single(),
        supabase
          .from("customer_ledger")
          .select(
            "id, transaction_date, invoice_number, vehicle_number, description, debit, credit, created_at"
          )
          .eq("customer_id", id)
          .order("transaction_date", { ascending: true })
          .order("created_at", { ascending: true }),
      ]);

      if (custRes.error) throw custRes.error;
      if (ledRes.error) throw ledRes.error;

      setCustomer(custRes.data as CustomerProfile);
      setAllEntries((ledRes.data as LedgerRow[]) || []);
    } catch (err: any) {
      console.error("Failed to load customer ledger:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const applyLast10Days = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 9);
    setFromDate(start.toISOString().split("T")[0]);
    setToDate(end.toISOString().split("T")[0]);
  };

  const clearDates = () => {
    setFromDate("");
    setToDate("");
  };

  const ledgerCalc = useMemo(() => {
    const baseOpening = -(Number(customer?.opening_balance) || 0);

    let broughtForward = baseOpening;
    const inRange: LedgerRow[] = [];

    for (const row of allEntries) {
      const d = row.transaction_date;
      if (fromDate && d < fromDate) {
        const billDelta = -(Number(row.debit) || 0);
        const cashDelta = Number(row.credit) || 0;
        broughtForward = Number((broughtForward + billDelta + cashDelta).toFixed(2));
      } else if (toDate && d > toDate) {
        continue;
      } else {
        inRange.push(row);
      }
    }

    let running = broughtForward;
    let totalBags = 0;
    let totalBill = 0;
    let totalCash = 0;

    const rowsWithRunning = inRange.map((r) => {
      const bags = extractBagsFromDescription(r.description);
      const billDelta = -(Number(r.debit) || 0);
      const cashDelta = Number(r.credit) || 0;
      running = Number((running + billDelta + cashDelta).toFixed(2));

      totalBags += bags;
      totalBill += billDelta;
      totalCash += cashDelta;

      return {
        ...r,
        bags,
        billDelta,
        cashDelta,
        runningBalance: running,
      };
    });

    return {
      broughtForward,
      rows: rowsWithRunning,
      totalBags,
      totalBill,
      totalCash,
      closingBalance: running,
    };
  }, [allEntries, customer, fromDate, toDate]);

  const downloadLedgerPDF = () => {
    if (!customer) return;
    const doc = new jsPDF();

    doc.setFontSize(15);
    doc.text("ABU BAKAR TRADERS", 14, 15);
    doc.setFontSize(11);
    doc.text("Customer Account Ledger Statement", 14, 21);

    doc.setFontSize(9.5);
    doc.text(
      `Customer: ${customer.name}${
        customer.short_code || customer.code ? ` (${customer.short_code || customer.code})` : ""
      }`,
      14,
      29
    );
    doc.text(`Market: ${customer.market || "-"}   |   Phone: ${customer.phone || "-"}`, 14, 34);

    const periodText =
      fromDate || toDate
        ? `Period: ${fromDate || "Beginning"}  to  ${toDate || "Latest"}`
        : "Period: Complete Ledger";
    doc.text(periodText, 14, 39);

    doc.setFont("helvetica", "bold");
    doc.text(
      `Opening / Brought Forward Balance: Rs. ${ledgerCalc.broughtForward.toLocaleString("en-PK", {
        minimumFractionDigits: 2,
      })}`,
      14,
      45
    );
    doc.setFont("helvetica", "normal");

    const headers = [
      "Date",
      "Inv #",
      "Vehicle #",
      "Description",
      "Bags",
      "Bill (-)",
      "Cash (+)",
      "Balance",
    ];
    const body = ledgerCalc.rows.map((r) => [
      r.transaction_date,
      r.invoice_number || "-",
      r.vehicle_number || "-",
      r.description || "-",
      r.bags > 0 ? r.bags.toLocaleString("en-PK") : "-",
      r.billDelta < 0 ? r.billDelta.toLocaleString("en-PK", { minimumFractionDigits: 2 }) : "-",
      r.cashDelta > 0 ? `+${r.cashDelta.toLocaleString("en-PK", { minimumFractionDigits: 2 })}` : "-",
      r.runningBalance.toLocaleString("en-PK", { minimumFractionDigits: 2 }),
    ]);

    body.push([
      "",
      "",
      "",
      "PERIOD TOTALS",
      ledgerCalc.totalBags > 0 ? ledgerCalc.totalBags.toLocaleString("en-PK") : "-",
      ledgerCalc.totalBill.toLocaleString("en-PK", { minimumFractionDigits: 2 }),
      `+${ledgerCalc.totalCash.toLocaleString("en-PK", { minimumFractionDigits: 2 })}`,
      ledgerCalc.closingBalance.toLocaleString("en-PK", { minimumFractionDigits: 2 }),
    ]);

    autoTable(doc, {
      head: [headers],
      body,
      startY: 49,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 41, 59] },
      columnStyles: {
        4: { halign: "right" },
        5: { halign: "right" },
        6: { halign: "right" },
        7: { halign: "right", fontStyle: "bold" },
      },
    });

    const safeName = customer.name.replace(/[^a-zA-Z0-9_-]/g, "_");
    doc.save(`Ledger_${safeName}_${fromDate || "start"}_to_${toDate || "end"}.pdf`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5 text-slate-800">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-3">
          <Link
            href="/customers/ledger"
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg"
            title="Back to Customers List"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              {loading ? "Loading Ledger..." : customer?.name || "Customer Ledger"}
            </h1>
            <p className="text-xs text-slate-500">
              Negative (-) balance means customer has to pay. Running balance carries prior history automatically.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={downloadLedgerPDF}
          disabled={!customer || loading}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-50 cursor-pointer"
        >
          <Download className="w-4 h-4" /> Download Ledger PDF
        </button>
      </div>

      {customer && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 border-b border-slate-100 pb-3">
            <div className="flex flex-wrap items-center gap-4">
              <span>
                <b>Code:</b> {customer.short_code || customer.code || "-"}
              </span>
              <span>
                <b>Market:</b> {customer.market || "-"}
              </span>
              <span>
                <b>Phone:</b> {customer.phone || "-"}
              </span>
              {customer.address && (
                <span>
                  <b>Address:</b> {customer.address}
                </span>
              )}
            </div>

            <div className="text-sm font-bold">
              Closing Balance:{" "}
              <span
                className={ledgerCalc.closingBalance < 0 ? "text-rose-700" : "text-emerald-700"}
              >
                Rs. {ledgerCalc.closingBalance.toLocaleString("en-PK", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600">
                <Calendar className="w-3.5 h-3.5 text-blue-600" /> Date Range:
              </span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg outline-none focus:border-blue-500"
                title="From Date"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg outline-none focus:border-blue-500"
                title="To Date"
              />
              <button
                type="button"
                onClick={applyLast10Days}
                className="px-3 py-1.5 text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg cursor-pointer"
              >
                Last 10 Days
              </button>
              {(fromDate || toDate) && (
                <button
                  type="button"
                  onClick={clearDates}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" /> All Dates
                </button>
              )}
            </div>

            <div className="text-xs font-semibold text-slate-700">
              Brought Forward (Opening):{" "}
              <span
                className={ledgerCalc.broughtForward < 0 ? "text-rose-700" : "text-emerald-700"}
              >
                Rs. {ledgerCalc.broughtForward.toLocaleString("en-PK", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-100 text-slate-600 text-xs uppercase border-b border-slate-200">
              <tr>
                <th className="px-4 py-2.5">Date</th>
                <th className="px-4 py-2.5">Invoice #</th>
                <th className="px-4 py-2.5">Vehicle #</th>
                <th className="px-4 py-2.5">Description</th>
                <th className="px-4 py-2.5 text-right">Bags</th>
                <th className="px-4 py-2.5 text-right">Bill (-)</th>
                <th className="px-4 py-2.5 text-right">Cash (+)</th>
                <th className="px-4 py-2.5 text-right">Running Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr className="bg-slate-50/80 font-semibold text-slate-700">
                <td className="px-4 py-2 text-xs">{fromDate ? `Before ${fromDate}` : "Opening"}</td>
                <td className="px-4 py-2">-</td>
                <td className="px-4 py-2">-</td>
                <td className="px-4 py-2 text-xs uppercase">Brought Forward Balance</td>
                <td className="px-4 py-2 text-right">-</td>
                <td className="px-4 py-2 text-right">-</td>
                <td className="px-4 py-2 text-right">-</td>
                <td
                  className={`px-4 py-2 text-right font-bold ${
                    ledgerCalc.broughtForward < 0 ? "text-rose-700" : "text-emerald-700"
                  }`}
                >
                  Rs. {ledgerCalc.broughtForward.toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                </td>
              </tr>

              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    Loading entries...
                  </td>
                </tr>
              ) : ledgerCalc.rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    No entries in this selected date range.
                  </td>
                </tr>
              ) : (
                ledgerCalc.rows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">
                      {r.transaction_date}
                    </td>
                    <td className="px-4 py-2.5 font-medium">{r.invoice_number || "-"}</td>
                    <td className="px-4 py-2.5 text-slate-700">{r.vehicle_number || "-"}</td>
                    <td className="px-4 py-2.5 text-slate-700">{r.description || "-"}</td>
                    <td className="px-4 py-2.5 text-right font-medium">
                      {r.bags > 0 ? r.bags.toLocaleString("en-PK") : "-"}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-rose-700">
                      {r.billDelta < 0
                        ? r.billDelta.toLocaleString("en-PK", { minimumFractionDigits: 2 })
                        : "-"}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-emerald-700">
                      {r.cashDelta > 0
                        ? `+${r.cashDelta.toLocaleString("en-PK", { minimumFractionDigits: 2 })}`
                        : "-"}
                    </td>
                    <td
                      className={`px-4 py-2.5 text-right font-bold ${
                        r.runningBalance < 0 ? "text-rose-700" : "text-emerald-700"
                      }`}
                    >
                      Rs. {r.runningBalance.toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            <tfoot className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
              <tr>
                <td colSpan={4} className="px-4 py-2.5 text-right uppercase text-xs">
                  Selected Dates Total:
                </td>
                <td className="px-4 py-2.5 text-right">
                  {ledgerCalc.totalBags > 0 ? ledgerCalc.totalBags.toLocaleString("en-PK") : "0"}
                </td>
                <td className="px-4 py-2.5 text-right text-rose-700">
                  {ledgerCalc.totalBill.toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-2.5 text-right text-emerald-700">
                  +{ledgerCalc.totalCash.toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                </td>
                <td
                  className={`px-4 py-2.5 text-right ${
                    ledgerCalc.closingBalance < 0 ? "text-rose-700" : "text-emerald-700"
                  }`}
                >
                  Rs. {ledgerCalc.closingBalance.toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function SingleCustomerLedgerPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-400">Loading customer ledger...</div>}>
      <CustomerLedgerDetail paramsPromise={params} />
    </Suspense>
  );
}