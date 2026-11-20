"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Coins, Search, Download } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface PettyCashBalanceRow {
  id: string;
  account_name: string;
  opening_balance: number;
  current_balance: number;
}

export default function PettyCashClosingBalancePage() {
  const [cashAccounts, setCashAccounts] = useState<PettyCashBalanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchPettyCashBalances();
  }, []);

const fetchPettyCashBalances = async () => {
  setLoading(true);
  const { data, error } = await supabase
    .from("accounts")
    .select("id, account_name, account_type, opening_balance, current_balance, is_active")
    .order("account_name", { ascending: true });

  if (error) {
    console.error("Error fetching petty cash balances:", error.message);
  } else if (data) {
    const onlyPettyCash = data.filter((acc: any) => {
      const t = String(acc.account_type || "").trim().toLowerCase();
      return t.includes("cash") || t.includes("petty") || t.includes("drawer");
    });
    setCashAccounts(onlyPettyCash);
  }
  setLoading(false);
};

  const filteredCash = cashAccounts.filter((c) =>
    c.account_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalClosingCash = filteredCash.reduce(
    (sum, c) => sum + (Number(c.current_balance) || 0),
    0
  );

  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("ABU BAKR TRADERS", 14, 15);
    doc.setFontSize(12);
    doc.text("Petty Cash Closing Balance Report", 14, 22);
    doc.setFontSize(10);
    doc.text(`Generated On: ${new Date().toLocaleDateString()}`, 14, 28);

    const tableColumn = ["#", "Petty Cash Account", "Closing Balance"];
    const tableRows: any[] = filteredCash.map((c, idx) => [
      idx + 1,
      c.account_name,
      Number(c.current_balance).toLocaleString("en-PK", { minimumFractionDigits: 2 }),
    ]);

    tableRows.push([
      "",
      "TOTAL PETTY CASH CLOSING BALANCE",
      totalClosingCash.toLocaleString("en-PK", { minimumFractionDigits: 2 }),
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 34,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 41, 59] },
    });

    doc.save(`Petty_Cash_Closing_Balance_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Coins className="w-6 h-6 text-amber-600" /> Petty Cash Closing Balance
          </h1>
          <p className="text-sm text-slate-500">
            Closing balances for petty cash / cash-in-hand accounts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-amber-50 border border-amber-200 px-4 py-2 rounded-xl text-right">
            <span className="text-[10px] font-bold text-amber-700 uppercase block">
              Total Closing Balance
            </span>
            <span className="text-lg font-bold text-amber-900">
              Rs. {totalClosingCash.toLocaleString("en-PK", { minimumFractionDigits: 2 })}
            </span>
          </div>

          <button
            onClick={downloadPDF}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition shadow-sm"
          >
            <Download className="w-4 h-4" /> PDF
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search petty cash account..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <span className="text-xs font-semibold text-slate-500">
          Accounts: {filteredCash.length}
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-100 text-slate-600 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 w-16">#</th>
                <th className="px-4 py-3">Petty Cash Account</th>
                <th className="px-4 py-3 text-right">Closing Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-4 py-10 text-center text-slate-400">
                    Loading petty cash closing balances...
                  </td>
                </tr>
              ) : filteredCash.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-10 text-center text-slate-400">
                    No petty cash accounts found.
                  </td>
                </tr>
              ) : (
                filteredCash.map((c, idx) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-500">{idx + 1}</td>
                    <td className="px-4 py-3 font-bold text-slate-800">{c.account_name}</td>
                    <td
                      className={`px-4 py-3 text-right font-bold ${
                        Number(c.current_balance) < 0 ? "text-rose-600" : "text-amber-700"
                      }`}
                    >
                      Rs. {Number(c.current_balance).toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredCash.length > 0 && (
              <tfoot className="bg-slate-100 font-bold text-slate-800 border-t-2 border-slate-300">
                <tr>
                  <td colSpan={2} className="px-4 py-3 text-right uppercase text-xs">
                    Closing Balance Total:
                  </td>
                  <td className="px-4 py-3 text-right text-base text-amber-700">
                    Rs. {totalClosingCash.toLocaleString("en-PK", { minimumFractionDigits: 2 })}
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