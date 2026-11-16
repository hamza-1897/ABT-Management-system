"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  FileText,
  Search,
  Eye,
  X,
  Truck,
  Building2,
  Calendar,
  Download,
  CheckCircle2,
  AlertTriangle,
  Plus,
} from "lucide-react";
import Link from "next/link";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface PurchaseItem {
  id: string;
  vehicle_number: string;
  unit_price: number;
  quantity: number;
  net_amount: number;
  products: { name: string } | null;
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

export default function PurchaseInvoicesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<Purchase | null>(null);

  useEffect(() => {
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
          products ( name )
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

  // Search filter (Invoice No, Company Name, ya Vehicle No se search karein)
  const filteredPurchases = purchases.filter(
    (p) =>
      p.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.suppliers?.name && p.suppliers.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      p.purchase_items.some((item) =>
        item.vehicle_number.toLowerCase().includes(searchTerm.toLowerCase())
      )
  );

  // Single Invoice ka PDF Download karne ka function
  const downloadInvoicePDF = (invoice: Purchase) => {
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text("ABU BAKR TRADERS", 14, 15);
    doc.setFontSize(11);
    doc.text(`Purchase Invoice Detail: #${invoice.invoice_number}`, 14, 22);
    doc.setFontSize(10);
    doc.text(`Company / Supplier: ${invoice.suppliers?.name || "-"}`, 14, 28);
    doc.text(`Purchase Date: ${invoice.purchase_date} | Status: ${invoice.status || "ACTIVE"}`, 14, 34);

    const tableColumn = ["#", "Vehicle No", "Product", "Rate / Ton", "Tons", "Bags", "Net Amount"];
    const tableRows: any[] = [];

    let totalTons = 0;
    let totalBags = 0;

    invoice.purchase_items.forEach((item, idx) => {
      const tons = Number(item.quantity) || 0;
      const bags = tons * 20;
      totalTons += tons;
      totalBags += bags;

      tableRows.push([
        idx + 1,
        item.vehicle_number,
        item.products?.name || "-",
        Number(item.unit_price).toLocaleString(),
        tons.toFixed(2),
        bags.toLocaleString(),
        Number(item.net_amount).toLocaleString(),
      ]);
    });

    tableRows.push([
      "",
      "",
      "TOTAL",
      "",
      `${totalTons.toFixed(2)} T`,
      `${totalBags.toLocaleString()} Bags`,
      `Rs. ${Number(invoice.total_amount).toLocaleString()}`,
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 40,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 41, 59] },
    });

    doc.save(`Purchase_Invoice_${invoice.invoice_number}.pdf`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" /> Purchase Invoices Register
          </h1>
          <p className="text-sm text-slate-500">
            View all company purchase invoices and inspect vehicle-wise tonnage and bag details.
          </p>
        </div>
        <Link
          href="/purchases/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition shadow-sm w-fit"
        >
          <Plus className="w-4 h-4" /> New Purchase Entry
        </Link>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Invoice No, Company, or Vehicle No..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg">
          Total Invoices: {filteredPurchases.length}
        </div>
      </div>

      {/* Invoices List Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-100 text-slate-600 uppercase text-xs">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Invoice No</th>
                <th className="px-4 py-3">Supplier / Company</th>
                <th className="px-4 py-3 text-center">Vehicles</th>
                <th className="px-4 py-3 text-right">Total Tons / Bags</th>
                <th className="px-4 py-3 text-right">Total Amount</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                    Loading purchase invoices...
                  </td>
                </tr>
              ) : filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                    No purchase invoices found.
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((purchase) => {
                  const totalTons = purchase.purchase_items.reduce((sum, i) => sum + Number(i.quantity), 0);
                  const totalBags = totalTons * 20;
                  const isReversed = purchase.status === "REVERSED";

                  return (
                    <tr
                      key={purchase.id}
                      onClick={() => setSelectedInvoice(purchase)}
                      className={`cursor-pointer transition ${
                        isReversed ? "bg-rose-50/40 opacity-75" : "hover:bg-blue-50/50"
                      }`}
                    >
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {purchase.purchase_date}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-800 whitespace-nowrap">
                        #{purchase.invoice_number}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-700">
                        {purchase.suppliers?.name || "Unknown"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-full text-xs font-bold">
                          <Truck className="w-3 h-3" /> {purchase.purchase_items.length}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <span className="font-bold text-slate-800">{totalTons.toFixed(2)} T</span>
                        <span className="text-xs text-slate-500 block">({totalBags} Bags)</span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-800 whitespace-nowrap">
                        Rs. {Number(purchase.total_amount).toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {isReversed ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-100 text-rose-700 rounded-full text-xs font-bold">
                            <AlertTriangle className="w-3 h-3" /> REVERSED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">
                            <CheckCircle2 className="w-3 h-3" /> ACTIVE
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedInvoice(purchase);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-800 text-white text-xs font-medium rounded-lg hover:bg-slate-900 transition"
                        >
                          <Eye className="w-3.5 h-3.5" /> View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Detail Modal (Pop-up) */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-400" />
                  Invoice Details: #{selectedInvoice.invoice_number}
                </h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  Complete vehicle-wise breakdown for {selectedInvoice.suppliers?.name}
                </p>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Meta Info */}
            <div className="p-6 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-blue-600" /> Company / Supplier
                </span>
                <p className="font-bold text-slate-800 mt-1">{selectedInvoice.suppliers?.name}</p>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" /> Purchase Date
                </span>
                <p className="font-bold text-slate-800 mt-1">{selectedInvoice.purchase_date}</p>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500">Invoice Status</span>
                <div className="mt-1">
                  {selectedInvoice.status === "REVERSED" ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-rose-100 text-rose-700 rounded-full text-xs font-bold">
                      REVERSED
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">
                      ACTIVE
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Vehicles Breakdown Table */}
            <div className="p-6 max-h-[55vh] overflow-y-auto">
              <table className="w-full text-sm text-left border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-100 text-slate-700 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Vehicle Number</th>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3 text-right">Rate / Ton</th>
                    <th className="px-4 py-3 text-right">Quantity (Tons)</th>
                    <th className="px-4 py-3 text-right">Stock (Bags)</th>
                    <th className="px-4 py-3 text-right">Net Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {selectedInvoice.purchase_items.map((item, index) => {
                    const tons = Number(item.quantity) || 0;
                    const bags = tons * 20;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-500">{index + 1}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-xs font-bold uppercase">
                            <Truck className="w-3 h-3" /> {item.vehicle_number}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {item.products?.name || "-"}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600">
                          {Number(item.unit_price).toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-800">
                          {tons.toFixed(2)} T
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-indigo-600">
                          {bags.toLocaleString()} Bags
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900">
                          {Number(item.net_amount).toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-100 font-bold text-slate-800 border-t-2 border-slate-300">
                  <tr>
                    <td colSpan={4} className="px-4 py-3 text-right uppercase text-xs">
                      Grand Total:
                    </td>
                    <td className="px-4 py-3 text-right text-slate-900">
                      {selectedInvoice.purchase_items
                        .reduce((s, i) => s + Number(i.quantity), 0)
                        .toFixed(2)}{" "}
                      T
                    </td>
                    <td className="px-4 py-3 text-right text-indigo-700">
                      {(
                        selectedInvoice.purchase_items.reduce((s, i) => s + Number(i.quantity), 0) * 20
                      ).toLocaleString()}{" "}
                      Bags
                    </td>
                    <td className="px-4 py-3 text-right text-base text-blue-700">
                      Rs.{" "}
                      {Number(selectedInvoice.total_amount).toLocaleString("en-PK", {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                onClick={() => downloadInvoicePDF(selectedInvoice)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition shadow-sm"
              >
                <Download className="w-4 h-4" /> Download Invoice PDF
              </button>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="px-4 py-2 bg-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-300 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}