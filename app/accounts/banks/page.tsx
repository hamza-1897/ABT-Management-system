"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Landmark, Search, Download } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface BankBalanceRow {
  id: string;
  account_name: string;
  bank_name?: string | null;
  branch_name?: string | null;
  account_number?: string | null;
  opening_balance: number;
  current_balance: number;
}

export default function BanksClosingBalancePage() {
  const [banks, setBanks] = useState<BankBalanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchBankBalances();
  }, []);

 const fetchBankBalances = async () => {
  setLoading(true);
  const { data, error } = await supabase
    .from("accounts")
    .select("id, account_name, account_type, bank_name, branch_name, account_number, opening_balance, current_balance, is_active")
    .order("account_name", { ascending: true });

  if (error) {
    console.error("Error fetching bank balances:", error.message);
  } else if (data) {
    const onlyBanks = data.filter(
      (acc: any) => String(acc.account_type || "").trim().toLowerCase() === "bank"
    );
    setBanks(onlyBanks);
  }
  setLoading(false);
};

  const filteredBanks = banks.filter(
    (b) =>
      b.account_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.bank_name && b.bank_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (b.account_number && b.account_number.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalClosingBalance = filteredBanks.reduce(
    (sum, b) => sum + (Number(b.current_balance) || 0),
    0
  );

  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("ABU BAKR TRADERS", 14, 15);
    doc.setFontSize(12);
    doc.text("Banks Closing Balance Report", 14, 22);
    doc.setFontSize(10);
    doc.text(`Generated On: ${new Date().toLocaleDateString()}`, 14, 28);

    const tableColumn = ["#", "Account Title", "Bank Name", "Branch", "Account No", "Closing Balance"];
    const tableRows: any[] = filteredBanks.map((b, idx) => [
      idx + 1,
      b.account_name,
      b.bank_name || "-",
      b.branch_name || "-",
      b.account_number || "-",
      Number(b.current_balance).toLocaleString("en-PK", { minimumFractionDigits: 2 }),
    ]);

    tableRows.push([
      "",
      "TOTAL BANKS CLOSING BALANCE",
      "",
      "",
      "",
      totalClosingBalance.toLocaleString("en-PK", { minimumFractionDigits: 2 }),
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 34,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 41, 59] },
    });

    doc.save(`Banks_Closing_Balance_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Landmark className="w-6 h-6 text-blue-600" /> Banks Closing Balance
          </h1>
          <p className="text-sm text-slate-500">
            Closing balances for all company bank accounts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-blue-50 border border-blue-200 px-4 py-2 rounded-xl text-right">
            <span className="text-[10px] font-bold text-blue-700 uppercase block">
              Total Closing Balance
            </span>
            <span className="text-lg font-bold text-blue-900">
              Rs. {totalClosingBalance.toLocaleString("en-PK", { minimumFractionDigits: 2 })}
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
            placeholder="Search bank, account title, or account no..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <span className="text-xs font-semibold text-slate-500">
          Banks: {filteredBanks.length}
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-100 text-slate-600 uppercase text-xs">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Account Title</th>
                <th className="px-4 py-3">Bank Name</th>
                <th className="px-4 py-3">Branch</th>
                <th className="px-4 py-3">Account No</th>
                <th className="px-4 py-3 text-right">Closing Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                    Loading bank closing balances...
                  </td>
                </tr>
              ) : filteredBanks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                    No bank accounts found.
                  </td>
                </tr>
              ) : (
                filteredBanks.map((b, idx) => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-500">{idx + 1}</td>
                    <td className="px-4 py-3 font-bold text-slate-800">{b.account_name}</td>
                    <td className="px-4 py-3 text-slate-700">{b.bank_name || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{b.branch_name || "-"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">
                      {b.account_number || "-"}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-bold ${
                        Number(b.current_balance) < 0 ? "text-rose-600" : "text-blue-700"
                      }`}
                    >
                      Rs. {Number(b.current_balance).toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredBanks.length > 0 && (
              <tfoot className="bg-slate-100 font-bold text-slate-800 border-t-2 border-slate-300">
                <tr>
                  <td colSpan={5} className="px-4 py-3 text-right uppercase text-xs">
                    Closing Balance Total:
                  </td>
                  <td className="px-4 py-3 text-right text-base text-blue-700">
                    Rs. {totalClosingBalance.toLocaleString("en-PK", { minimumFractionDigits: 2 })}
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