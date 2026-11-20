"use client";

import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Truck, Search, Eye, FileText, UserCheck, X } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface SaleItemRecord {
  id: string;
  sale_invoice_id: string;
  customer_id: string;
  product_id: string;
  quantity_bags: number;
  rate_per_bag: number;
  line_total: number;
  cash_paid: number;
  net_balance: number;
  payment_type: string;
  customers: {
    name: string;
    short_code?: string | null;
    code?: string | null;
    market?: string | null;
  } | null;
  products: { name: string } | null;
}

interface SaleInvoiceRecord {
  id: string;
  invoice_number: string;
  invoice_date: string;
  vehicle_number: string;
  total_bags: number;
  total_amount: number;
  total_cash_paid: number;
  total_net_balance: number;
  remarks?: string | null;
  items: SaleItemRecord[];
}

export default function SalesInvoicesPage() {
  const [invoices, setInvoices] = useState<SaleInvoiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [modalInvoice, setModalInvoice] = useState<SaleInvoiceRecord | null>(null);

  useEffect(() => {
    loadSalesData();
  }, []);

  const loadSalesData = async () => {
    setLoading(true);
    try {
      const [invRes, itemRes] = await Promise.all([
        supabase
          .from("sale_invoices")
          .select("*")
          .order("invoice_date", { ascending: false })
          .order("created_at", { ascending: false }),
        supabase
          .from("sale_invoice_items")
          .select(
            "id, sale_invoice_id, customer_id, product_id, quantity_bags, rate_per_bag, line_total, cash_paid, net_balance, payment_type, customers ( name, short_code, code, market ), products ( name )"
          )
          .order("created_at", { ascending: true }),
      ]);

      if (invRes.error) throw invRes.error;
      if (itemRes.error) throw itemRes.error;

      const itemsByInv = new Map<string, SaleItemRecord[]>();
      ((itemRes.data as any[]) || []).forEach((it) => {
        const list = itemsByInv.get(it.sale_invoice_id) || [];
        list.push(it);
        itemsByInv.set(it.sale_invoice_id, list);
      });

      const merged: SaleInvoiceRecord[] = ((invRes.data as any[]) || []).map((inv) => ({
        ...inv,
        items: itemsByInv.get(inv.id) || [],
      }));

      setInvoices(merged);
    } catch (err: any) {
      console.error("Failed to load sales invoices:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return invoices;

    return invoices.filter((inv) => {
      const matchHeader =
        inv.invoice_number.toLowerCase().includes(q) ||
        inv.invoice_date.toLowerCase().includes(q) ||
        inv.vehicle_number.toLowerCase().includes(q) ||
        (inv.remarks && inv.remarks.toLowerCase().includes(q));

      const matchItems = inv.items.some(
        (it) =>
          (it.customers?.name && it.customers.name.toLowerCase().includes(q)) ||
          (it.customers?.short_code && it.customers.short_code.toLowerCase().includes(q)) ||
          (it.products?.name && it.products.name.toLowerCase().includes(q))
      );

      return matchHeader || matchItems;
    });
  }, [invoices, searchQuery]);

  const duplicateNumberMatches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const exact = invoices.filter((inv) => inv.invoice_number.toLowerCase() === q);
    return exact.length > 1 ? exact : [];
  }, [invoices, searchQuery]);

  const modalTotals = useMemo(() => {
    if (!modalInvoice) return { bags: 0, amount: 0, cash: 0 };
    return modalInvoice.items.reduce(
      (acc, it) => ({
        bags: acc.bags + (Number(it.quantity_bags) || 0),
        amount: acc.amount + (Number(it.line_total) || 0),
        cash: acc.cash + (Number(it.cash_paid) || 0),
      }),
      { bags: 0, amount: 0, cash: 0 }
    );
  }, [modalInvoice]);

  // Print 1: Full Vehicle Invoice PDF
  const printFullInvoicePDF = (inv: SaleInvoiceRecord) => {
    const doc = new jsPDF();

    doc.setFontSize(15);
    doc.text("ABU BAKAR TRADERS", 14, 15);
    doc.setFontSize(11);
    doc.text("Vehicle Sale Invoice / Challan", 14, 21);

    doc.setFontSize(9.5);
    doc.text(`Invoice #: ${inv.invoice_number}`, 14, 29);
    doc.text(`Date: ${inv.invoice_date}`, 85, 29);
    doc.text(`Vehicle #: ${inv.vehicle_number}`, 145, 29);
    if (inv.remarks) {
      doc.text(`Remarks: ${inv.remarks}`, 14, 35);
    }

    const headers = ["#", "Customer", "Product", "Bags", "Rate", "Net Total", "Cash"];
    const body = inv.items.map((it, idx) => [
      idx + 1,
      it.customers?.name || "-",
      it.products?.name || "-",
      Number(it.quantity_bags).toLocaleString("en-PK"),
      Number(it.rate_per_bag).toLocaleString("en-PK", { minimumFractionDigits: 2 }),
      Number(it.line_total).toLocaleString("en-PK", { minimumFractionDigits: 2 }),
      Number(it.cash_paid).toLocaleString("en-PK", { minimumFractionDigits: 2 }),
    ]);

    const totalBags = inv.items.reduce((s, it) => s + (Number(it.quantity_bags) || 0), 0);
    const totalAmt = inv.items.reduce((s, it) => s + (Number(it.line_total) || 0), 0);
    const totalCash = inv.items.reduce((s, it) => s + (Number(it.cash_paid) || 0), 0);

    body.push([
      "",
      "TOTAL",
      "",
      totalBags.toLocaleString("en-PK"),
      "",
      totalAmt.toLocaleString("en-PK", { minimumFractionDigits: 2 }),
      totalCash.toLocaleString("en-PK", { minimumFractionDigits: 2 }),
    ]);

    autoTable(doc, {
      head: [headers],
      body,
      startY: inv.remarks ? 40 : 34,
      styles: { fontSize: 8.5 },
      headStyles: { fillColor: [30, 41, 59] },
      columnStyles: {
        3: { halign: "right" },
        4: { halign: "right" },
        5: { halign: "right" },
        6: { halign: "right", fontStyle: "bold" },
      },
    });

    doc.save(`Vehicle_Invoice_${inv.invoice_number}_${inv.vehicle_number}.pdf`);
  };

  // Print 2: Single Customer Share Slip PDF
  const printCustomerSharePDF = (inv: SaleInvoiceRecord, item: SaleItemRecord) => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: [148, 210] });

    doc.setFontSize(13);
    doc.text("ABU BAKAR TRADERS", 10, 14);
    doc.setFontSize(10);
    doc.text("Customer Share Slip", 10, 20);

    doc.setFontSize(9);
    doc.text(`Invoice #: ${inv.invoice_number}`, 10, 29);
    doc.text(`Date: ${inv.invoice_date}`, 75, 29);
    doc.text(`Vehicle #: ${inv.vehicle_number}`, 10, 35);
    doc.text(`Customer: ${item.customers?.name || "-"}`, 10, 42);
    if (item.customers?.market) {
      doc.text(`Market: ${item.customers.market}`, 10, 48);
    }

    autoTable(doc, {
      head: [["Product", "Bags", "Rate", "Net Total"]],
      body: [
        [
          item.products?.name || "-",
          Number(item.quantity_bags).toLocaleString("en-PK"),
          Number(item.rate_per_bag).toLocaleString("en-PK", { minimumFractionDigits: 2 }),
          Number(item.line_total).toLocaleString("en-PK", { minimumFractionDigits: 2 }),
        ],
      ],
      startY: item.customers?.market ? 53 : 48,
      styles: { fontSize: 8.5 },
      headStyles: { fillColor: [30, 41, 59] },
      columnStyles: {
        1: { halign: "right" },
        2: { halign: "right" },
        3: { halign: "right" },
      },
    });

    const afterTableY = ((doc as any).lastAutoTable?.finalY || 78) + 8;
    doc.setFontSize(9.5);
    doc.text(
      `Net Total: Rs. ${Number(item.line_total).toLocaleString("en-PK", { minimumFractionDigits: 2 })}`,
      10,
      afterTableY
    );
    doc.setFont("helvetica", "bold");
    doc.text(
      `Cash Paid: Rs. ${Number(item.cash_paid).toLocaleString("en-PK", { minimumFractionDigits: 2 })}`,
      10,
      afterTableY + 6
    );

    doc.save(`Customer_Slip_${inv.invoice_number}_${item.customers?.name || "Customer"}.pdf`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4 text-slate-800">
      {/* Header + Single Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Truck className="w-5 h-5 text-blue-600" /> Sales Invoices
        </h1>

        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search invoice, vehicle, date, customer, product..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Duplicate Invoice Number Choice Bar */}
      {duplicateNumberMatches.length > 1 && (
        <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-amber-900">
            Invoice #{searchQuery.trim()} ek se zyada baar aayi hai — select karein:
          </span>
          {duplicateNumberMatches.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setModalInvoice(m)}
              className="px-3 py-1 rounded-lg text-xs font-semibold bg-white text-amber-900 border border-amber-300 hover:bg-amber-100 cursor-pointer"
            >
              {m.invoice_date} • {m.vehicle_number} ({m.total_bags} bags)
            </button>
          ))}
        </div>
      )}

      {/* Invoices Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-100 text-slate-600 text-xs uppercase border-b border-slate-200">
              <tr>
                <th className="px-4 py-2.5">Invoice #</th>
                <th className="px-4 py-2.5">Date</th>
                <th className="px-4 py-2.5">Vehicle #</th>
                <th className="px-4 py-2.5 text-center">Customers</th>
                <th className="px-4 py-2.5 text-right">Bags</th>
                <th className="px-4 py-2.5 text-right">Cash</th>
                <th className="px-4 py-2.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    Loading invoices...
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    No sales invoices found.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-bold text-slate-900">{inv.invoice_number}</td>
                    <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">{inv.invoice_date}</td>
                    <td className="px-4 py-2.5 font-semibold text-slate-800">{inv.vehicle_number}</td>
                    <td className="px-4 py-2.5 text-center text-slate-700">{inv.items.length}</td>
                    <td className="px-4 py-2.5 text-right font-semibold">{inv.total_bags}</td>
                    <td className="px-4 py-2.5 text-right font-bold text-emerald-700">
                      Rs. {Number(inv.total_cash_paid).toLocaleString("en-PK")}
                    </td>
                    <td className="px-4 py-2.5 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setModalInvoice(inv)}
                        className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-md cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" /> View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Detail Popup Modal */}
      {modalInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-2xl border border-slate-200 shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Invoice #{modalInvoice.invoice_number} — {modalInvoice.vehicle_number}
                </h2>
                <p className="text-xs text-slate-500">
                  Date: <b>{modalInvoice.invoice_date}</b>
                  {modalInvoice.remarks ? ` • Remarks: ${modalInvoice.remarks}` : ""}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => printFullInvoicePDF(modalInvoice)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" /> Full Invoice PDF
                </button>
                <button
                  type="button"
                  onClick={() => setModalInvoice(null)}
                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 rounded-lg cursor-pointer"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-100 text-slate-600 text-xs uppercase border-b">
                  <tr>
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">Customer</th>
                    <th className="px-3 py-2">Product</th>
                    <th className="px-3 py-2 text-right">Bags</th>
                    <th className="px-3 py-2 text-right">Rate</th>
                    <th className="px-3 py-2 text-right">Net Total</th>
                    <th className="px-3 py-2 text-right">Cash Paid</th>
                    <th className="px-3 py-2 text-center">Print</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {modalInvoice.items.map((it, idx) => (
                    <tr key={it.id}>
                      <td className="px-3 py-2.5 text-slate-400">{idx + 1}</td>
                      <td className="px-3 py-2.5 font-semibold text-slate-800">
                        {it.customers?.name || "-"}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">{it.products?.name || "-"}</td>
                      <td className="px-3 py-2.5 text-right">{it.quantity_bags}</td>
                      <td className="px-3 py-2.5 text-right">
                        {Number(it.rate_per_bag).toLocaleString("en-PK")}
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold text-slate-900">
                        {Number(it.line_total).toLocaleString("en-PK")}
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold text-emerald-700">
                        {Number(it.cash_paid).toLocaleString("en-PK")}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => printCustomerSharePDF(modalInvoice, it)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-md cursor-pointer"
                        >
                          <UserCheck className="w-3.5 h-3.5" /> Share Slip PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                  <tr>
                    <td colSpan={3} className="px-3 py-2.5 text-right uppercase text-xs">
                      Total:
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {modalTotals.bags.toLocaleString("en-PK")}
                    </td>
                    <td></td>
                    <td className="px-3 py-2.5 text-right">
                      Rs. {modalTotals.amount.toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-2.5 text-right text-emerald-700">
                      Rs. {modalTotals.cash.toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}