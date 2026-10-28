export const exportTableToPDF = ({
  title,
  subtitle,
  filterName,
  data,
  columns,
  renderRow,
}: {
  title: string;
  subtitle: string;
  filterName: string;
  data: any[];
  columns: string[];
  renderRow: (item: any, index: number) => string;
}) => {
  if (data.length === 0) {
    return alert('Print karne ke liye koi record mojood nahi hai.');
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) return alert('Pop-up blocker ko disable karein!');

  const tableRows = data.map((item, idx) => renderRow(item, idx)).join('');
  const tableHeaders = columns.map((col) => `<th>${col}</th>`).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title} - ABT Traders</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; color: #1e293b; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0284c7; padding-bottom: 10px; margin-bottom: 20px; }
          .title { font-size: 20px; font-weight: bold; color: #0f172a; }
          .meta { font-size: 12px; color: #64748b; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px; }
          th { background-color: #f1f5f9; padding: 10px 8px; border: 1px solid #cbd5e1; text-align: left; }
          .footer { margin-top: 20px; font-size: 11px; text-align: right; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 10px; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">ABU BAKR TRADERS</div>
            <div class="meta">${subtitle}</div>
          </div>
          <div style="text-align: right;">
            <div class="meta"><b>Filter:</b> ${filterName}</div>
            <div class="meta"><b>Total Items:</b> ${data.length}</div>
            <div class="meta"><b>Date:</b> ${new Date().toLocaleDateString()}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>${tableHeaders}</tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>

        <div class="footer">
          Generated via Distributor SMIS — Page 1
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
};