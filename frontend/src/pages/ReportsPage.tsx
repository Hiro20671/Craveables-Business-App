import React, { useEffect, useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  FileText,
  Calendar,
  Eye,
  Printer,
  X,
  ReceiptText,
  Wallet,
  Calculator
} from 'lucide-react';
import { api } from '../services/api';

export const ReportsPage: React.FC = () => {
  const [plData, setPlData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Report Preview Modal before Export
  const [previewExportFormat, setPreviewExportFormat] = useState<'EXCEL' | 'PDF' | null>(null);
  const [previewTab, setPreviewTab] = useState<'ALL' | 'PL' | 'SALES' | 'EXPENSES' | 'COSTING'>('ALL');

  const fetchReport = async (overrideStart?: string, overrideEnd?: string) => {
    try {
      setLoading(true);
      const params: any = {};
      const s = overrideStart !== undefined ? overrideStart : startDate;
      const e = overrideEnd !== undefined ? overrideEnd : endDate;
      if (s) params.start_date = s;
      if (e) params.end_date = e;
      const data = await api.getProfitLoss(params);
      setPlData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const getFilterParams = () => {
    const params: { start_date?: string; end_date?: string } = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    return params;
  };

  const handleConfirmDownloadExcel = () => {
    window.open(api.downloadExcelReportUrl(getFilterParams()), '_blank');
  };

  const handleConfirmDownloadPdf = () => {
    window.open(api.downloadPdfReportUrl(getFilterParams()), '_blank');
  };

  const salesRecords: any[] = plData?.sales_records || [];
  const expenseRecords: any[] = plData?.expense_records || [];
  const productCosting: any[] = plData?.product_costing || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-bakery-ivory border border-bakery-beige shadow-warm-sm">
        <div>
          <h1 className="font-display font-bold text-2xl text-bakery-chocolate">
            Financial Reports &amp; Analytics
          </h1>
          <p className="text-xs text-bakery-muted mt-0.5">
            Preview your full Profit &amp; Loss statements, sales logs, COGS analysis, and overhead breakdowns before exporting
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              setPreviewTab('ALL');
              setPreviewExportFormat('EXCEL');
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-status-green text-white text-xs font-semibold hover:bg-status-green/90 shadow-xs transition-colors"
            title="Preview full report before downloading Excel (.xlsx)"
          >
            <Eye className="w-4 h-4" />
            <FileSpreadsheet className="w-4 h-4" />
            <span>Preview &amp; Export Excel (.xlsx)</span>
          </button>
          <button
            onClick={() => {
              setPreviewTab('ALL');
              setPreviewExportFormat('PDF');
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-bakery-chocolate text-white text-xs font-semibold hover:bg-[#2c1108] shadow-xs transition-colors"
            title="Preview full report before downloading PDF (.pdf)"
          >
            <Eye className="w-4 h-4 text-bakery-caramel" />
            <FileText className="w-4 h-4 text-bakery-cream" />
            <span>Preview &amp; Export PDF (.pdf)</span>
          </button>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="p-4 rounded-xl bg-bakery-ivory border border-bakery-beige flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-bakery-caramel" />
          <span className="font-bold text-bakery-chocolate">Date Range Filter:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-bakery-beige text-xs bg-white text-bakery-espresso"
          />
          <span className="text-bakery-muted">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-bakery-beige text-xs bg-white text-bakery-espresso"
          />
          <button
            onClick={() => fetchReport()}
            className="px-3 py-1.5 rounded-lg bg-bakery-caramel text-white font-semibold hover:bg-bakery-caramel/90"
          >
            Apply Filter
          </button>
          <button
            onClick={() => {
              setStartDate('');
              setEndDate('');
              fetchReport('', '');
            }}
            className="px-2.5 py-1.5 rounded-lg border border-bakery-beige bg-white text-xs text-bakery-chocolate hover:bg-bakery-cream"
          >
            Reset (Show All)
          </button>
        </div>
      </div>

      {/* Profit & Loss Statement Card */}
      <div className="p-6 rounded-2xl bg-bakery-ivory border border-bakery-beige shadow-warm-sm space-y-6">
        <div className="border-b border-bakery-beige pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-display font-bold text-xl text-bakery-chocolate">
              CRAVEABLES Statement of Profit &amp; Loss
            </h2>
            <p className="text-xs text-bakery-muted">
              Authoritative financial summary calculated directly from registered sales, production COGS, and operating expenses
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-bakery-cream text-bakery-chocolate border border-bakery-beige self-start sm:self-auto">
            {startDate || endDate ? `Filtered: ${startDate || 'Start'} to ${endDate || 'Present'}` : 'All Time Records • PHP (₱)'}
          </span>
        </div>

        {/* P&L Table Breakdown */}
        <div className="space-y-4 text-xs font-medium">
          {/* Revenue Section */}
          <div className="space-y-2">
            <h3 className="font-bold text-bakery-chocolate uppercase tracking-wider text-[11px] pb-1 border-b border-bakery-beige/60">
              1. Sales Revenue ({salesRecords.length} Completed Sales)
            </h3>
            <div className="flex justify-between py-1 text-bakery-espresso">
              <span className="pl-3">Gross Sales:</span>
              <span className="font-semibold">₱{Number(plData?.gross_sales || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-1 text-status-orange">
              <span className="pl-3">Less: Sales Discounts &amp; Wholesale Promos:</span>
              <span>-₱{Number(plData?.discounts || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-1.5 bg-bakery-cream/70 px-3 rounded-lg font-bold text-bakery-chocolate">
              <span>Net Sales Revenue:</span>
              <span>₱{Number(plData?.net_sales || 0).toFixed(2)}</span>
            </div>
          </div>

          {/* Cost of Goods Sold Section */}
          <div className="space-y-2">
            <h3 className="font-bold text-bakery-chocolate uppercase tracking-wider text-[11px] pb-1 border-b border-bakery-beige/60">
              2. Cost of Goods Sold (COGS)
            </h3>
            <div className="flex justify-between py-1 text-bakery-espresso">
              <span className="pl-3">Direct Ingredients &amp; Baking Costs:</span>
              <span className="font-semibold">₱{Number(plData?.cost_of_goods_sold || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-2 bg-bakery-chocolate text-white px-3 rounded-lg font-bold">
              <span>Gross Profit (Net Sales - COGS):</span>
              <span className="font-display text-sm text-bakery-cream">
                ₱{Number(plData?.gross_profit || 0).toFixed(2)}{' '}
                <span className="text-xs font-normal text-bakery-beige">
                  ({plData?.gross_margin_percentage || 0}% margin)
                </span>
              </span>
            </div>
          </div>

          {/* Operating Expenses Section */}
          <div className="space-y-2">
            <h3 className="font-bold text-bakery-chocolate uppercase tracking-wider text-[11px] pb-1 border-b border-bakery-beige/60">
              3. Operating &amp; Administrative Expenses ({expenseRecords.length} Records)
            </h3>
            <div className="space-y-1 pl-3">
              {plData?.operating_expenses?.map((item: any) => (
                <div key={item.category} className="flex justify-between py-1 text-bakery-espresso">
                  <span>{item.category}:</span>
                  <span className="font-medium">₱{Number(item.amount).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between py-1.5 bg-status-orangeLight px-3 rounded-lg font-bold text-status-orange">
              <span>Total Operating Expenses:</span>
              <span>₱{Number(plData?.total_operating_expenses || 0).toFixed(2)}</span>
            </div>
          </div>

          {/* Net Business Income Final */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-bakery-chocolate to-[#522112] text-white flex items-center justify-between">
            <div>
              <span className="text-xs uppercase tracking-wider text-bakery-cream/90 font-bold block">
                Net Business Profit (Income)
              </span>
              <span className="text-[11px] text-bakery-beige/80">
                Gross Profit minus Total Operating Overheads
              </span>
            </div>
            <div className="text-right">
              <span className={`font-display font-bold text-2xl ${Number(plData?.net_income || 0) >= 0 ? 'text-status-greenLight' : 'text-status-redLight'}`}>
                ₱{Number(plData?.net_income || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="block text-xs text-bakery-beige font-semibold">
                Net Margin: {plData?.net_margin_percentage || 0}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Included Sales & Expenses Breakdown right on the page */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Included Sales Table */}
        <div className="rounded-2xl bg-bakery-ivory border border-bakery-beige shadow-warm-xs overflow-hidden flex flex-col">
          <div className="p-4 bg-bakery-cream border-b border-bakery-beige flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ReceiptText className="w-4 h-4 text-bakery-caramel" />
              <h3 className="font-display font-bold text-sm text-bakery-chocolate">
                Included Sales Transactions ({salesRecords.length})
              </h3>
            </div>
            <span className="text-xs font-bold text-bakery-chocolate">
              Total: ₱{Number(plData?.net_sales || 0).toFixed(2)}
            </span>
          </div>
          <div className="overflow-x-auto max-h-80">
            <table className="w-full text-left text-xs">
              <thead className="bg-white border-b border-bakery-beige text-[10px] uppercase text-bakery-muted">
                <tr>
                  <th className="py-2.5 px-3">Receipt #</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3 text-right">Sales (₱)</th>
                  <th className="py-2.5 px-3 text-right">Profit (₱)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bakery-beige/60">
                {salesRecords.length > 0 ? (
                  salesRecords.map((s) => (
                    <tr key={s.id} className="hover:bg-bakery-cream/40">
                      <td className="py-2 px-3 font-mono font-bold text-bakery-caramel">{s.receipt_number}</td>
                      <td className="py-2 px-3 text-bakery-muted">{s.sale_date}</td>
                      <td className="py-2 px-3 font-semibold text-bakery-chocolate">{s.customer_name}</td>
                      <td className="py-2 px-3 text-right font-bold">₱{Number(s.total_sales).toFixed(2)}</td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-700">₱{Number(s.gross_profit).toFixed(2)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-bakery-muted">
                      No sales in selected date range.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Included Expenses Table */}
        <div className="rounded-2xl bg-bakery-ivory border border-bakery-beige shadow-warm-xs overflow-hidden flex flex-col">
          <div className="p-4 bg-bakery-cream border-b border-bakery-beige flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-bakery-caramel" />
              <h3 className="font-display font-bold text-sm text-bakery-chocolate">
                Included Operating Expenses ({expenseRecords.length})
              </h3>
            </div>
            <span className="text-xs font-bold text-status-orange">
              Total: ₱{Number(plData?.total_operating_expenses || 0).toFixed(2)}
            </span>
          </div>
          <div className="overflow-x-auto max-h-80">
            <table className="w-full text-left text-xs">
              <thead className="bg-white border-b border-bakery-beige text-[10px] uppercase text-bakery-muted">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3 text-right">Amount (₱)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bakery-beige/60">
                {expenseRecords.length > 0 ? (
                  expenseRecords.map((exp) => (
                    <tr key={exp.id} className="hover:bg-bakery-cream/40">
                      <td className="py-2 px-3 text-bakery-muted">{exp.date}</td>
                      <td className="py-2 px-3 font-bold text-bakery-chocolate">{exp.category}</td>
                      <td className="py-2 px-3 text-bakery-espresso truncate max-w-[180px]">{exp.description}</td>
                      <td className="py-2 px-3 text-right font-bold text-status-orange">₱{Number(exp.amount).toFixed(2)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-bakery-muted">
                      No expenses in selected date range.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL: Preview Full Report Before Exporting */}
      {previewExportFormat && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
          <div className="bg-bakery-ivory w-full max-w-5xl rounded-3xl border-2 border-bakery-beige shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-fade-in">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-bakery-chocolate text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Eye className="w-5 h-5 text-bakery-caramel shrink-0" />
                <div>
                  <h3 className="font-display font-bold text-base sm:text-lg">
                    Report Preview Before Export ({previewExportFormat === 'EXCEL' ? 'Excel .xlsx Workbook' : 'Official PDF Document'})
                  </h3>
                  <p className="text-[11px] text-bakery-beige/80">
                    Review all included financial statements, sales logs, expenses, and costing sheets below before downloading
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  onClick={handleConfirmDownloadExcel}
                  className="px-3.5 py-2 rounded-xl bg-status-green hover:bg-status-green/90 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Excel (.xlsx)</span>
                </button>
                <button
                  onClick={handleConfirmDownloadPdf}
                  className="px-3.5 py-2 rounded-xl bg-bakery-caramel hover:bg-[#966736] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF (.pdf)</span>
                </button>
                <button
                  onClick={() => setPreviewExportFormat(null)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white"
                  title="Close Preview"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Sheet / Section Selector Tabs */}
            <div className="px-5 py-2.5 bg-bakery-cream border-b border-bakery-beige flex flex-wrap items-center gap-2 text-xs">
              <span className="text-[11px] font-bold text-bakery-muted uppercase mr-1">Report Sheets:</span>
              {[
                { id: 'ALL', label: 'All Report Sections' },
                { id: 'PL', label: '1. Profit & Loss Summary' },
                { id: 'SALES', label: `2. Sales Log (${salesRecords.length})` },
                { id: 'EXPENSES', label: `3. Expenses Log (${expenseRecords.length})` },
                { id: 'COSTING', label: `4. Product Costing (${productCosting.length})` },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setPreviewTab(t.id as any)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                    previewTab === t.id
                      ? 'bg-bakery-chocolate text-white'
                      : 'bg-white border border-bakery-beige text-bakery-chocolate hover:bg-bakery-beige/40'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Scrollable Document Preview Area */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6 bg-[#FAF6EC] text-xs">
              {/* Document Banner */}
              <div className="p-5 rounded-2xl bg-white border border-bakery-beige shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-display font-bold text-lg text-bakery-chocolate">
                    CRAVEABLES — Official Financial &amp; Operations Report
                  </h4>
                  <p className="text-[11px] text-bakery-muted">
                    Made to Crave &bull; Baked with Love &bull; Lucena City, Quezon
                  </p>
                </div>
                <div className="text-left sm:text-right text-[11px] text-bakery-muted">
                  <p>
                    <strong>Period:</strong>{' '}
                    {startDate || endDate ? `${startDate || 'Beginning'} to ${endDate || 'Today'}` : 'All Recorded Dates'}
                  </p>
                  <p>
                    <strong>Generated:</strong> {new Date().toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* 1. P&L Summary Preview */}
              {(previewTab === 'ALL' || previewTab === 'PL') && (
                <div className="p-5 rounded-2xl bg-white border border-bakery-beige shadow-2xs space-y-3">
                  <h5 className="font-display font-bold text-sm text-bakery-chocolate border-b border-bakery-beige pb-2">
                    Sheet 1: Statement of Profit &amp; Loss
                  </h5>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div className="p-3 rounded-xl bg-bakery-cream/60 border border-bakery-beige">
                      <span className="text-[10px] uppercase text-bakery-muted font-bold block">Net Sales</span>
                      <strong className="font-display text-base text-bakery-chocolate">
                        ₱{Number(plData?.net_sales || 0).toFixed(2)}
                      </strong>
                    </div>
                    <div className="p-3 rounded-xl bg-bakery-cream/60 border border-bakery-beige">
                      <span className="text-[10px] uppercase text-bakery-muted font-bold block">Total COGS</span>
                      <strong className="font-display text-base text-bakery-espresso">
                        ₱{Number(plData?.cost_of_goods_sold || 0).toFixed(2)}
                      </strong>
                    </div>
                    <div className="p-3 rounded-xl bg-bakery-cream/60 border border-bakery-beige">
                      <span className="text-[10px] uppercase text-bakery-muted font-bold block">Gross Profit</span>
                      <strong className="font-display text-base text-emerald-700">
                        ₱{Number(plData?.gross_profit || 0).toFixed(2)}
                      </strong>
                    </div>
                    <div className="p-3 rounded-xl bg-bakery-cream/60 border border-bakery-beige">
                      <span className="text-[10px] uppercase text-bakery-muted font-bold block">Operating Expenses</span>
                      <strong className="font-display text-base text-status-orange">
                        ₱{Number(plData?.total_operating_expenses || 0).toFixed(2)}
                      </strong>
                    </div>
                    <div className="p-3 rounded-xl bg-bakery-chocolate text-white">
                      <span className="text-[10px] uppercase text-bakery-beige font-bold block">Net Income</span>
                      <strong className="font-display text-base text-bakery-cream">
                        ₱{Number(plData?.net_income || 0).toFixed(2)}
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. Sales Log Preview */}
              {(previewTab === 'ALL' || previewTab === 'SALES') && (
                <div className="p-5 rounded-2xl bg-white border border-bakery-beige shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-bakery-beige pb-2">
                    <h5 className="font-display font-bold text-sm text-bakery-chocolate">
                      Sheet 2: Completed Sales Log ({salesRecords.length} Orders)
                    </h5>
                    <span className="font-bold text-bakery-chocolate">
                      Total Revenue: ₱{Number(plData?.net_sales || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-bakery-cream text-bakery-chocolate font-bold border-b border-bakery-beige">
                        <tr>
                          <th className="py-2 px-3">Receipt #</th>
                          <th className="py-2 px-3">Date</th>
                          <th className="py-2 px-3">Customer</th>
                          <th className="py-2 px-3">Items Ordered</th>
                          <th className="py-2 px-3">Payment</th>
                          <th className="py-2 px-3 text-right">Total Sales (₱)</th>
                          <th className="py-2 px-3 text-right">COGS (₱)</th>
                          <th className="py-2 px-3 text-right">Gross Profit (₱)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-bakery-beige/60">
                        {salesRecords.map((s) => (
                          <tr key={s.id}>
                            <td className="py-2 px-3 font-mono font-bold text-bakery-caramel">{s.receipt_number}</td>
                            <td className="py-2 px-3">{s.sale_date}</td>
                            <td className="py-2 px-3 font-semibold">{s.customer_name}</td>
                            <td className="py-2 px-3 max-w-xs truncate">{s.items_summary}</td>
                            <td className="py-2 px-3">{s.payment_method}</td>
                            <td className="py-2 px-3 text-right font-bold">₱{Number(s.total_sales).toFixed(2)}</td>
                            <td className="py-2 px-3 text-right text-bakery-muted">₱{Number(s.total_cogs).toFixed(2)}</td>
                            <td className="py-2 px-3 text-right font-bold text-emerald-700">₱{Number(s.gross_profit).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 3. Expenses Log Preview */}
              {(previewTab === 'ALL' || previewTab === 'EXPENSES') && (
                <div className="p-5 rounded-2xl bg-white border border-bakery-beige shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-bakery-beige pb-2">
                    <h5 className="font-display font-bold text-sm text-bakery-chocolate">
                      Sheet 3: Operating Expenses Log ({expenseRecords.length} Records)
                    </h5>
                    <span className="font-bold text-status-orange">
                      Total Expenses: ₱{Number(plData?.total_operating_expenses || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-bakery-cream text-bakery-chocolate font-bold border-b border-bakery-beige">
                        <tr>
                          <th className="py-2 px-3">Date</th>
                          <th className="py-2 px-3">Category</th>
                          <th className="py-2 px-3">Description</th>
                          <th className="py-2 px-3">Payment Method</th>
                          <th className="py-2 px-3 text-right">Amount (₱)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-bakery-beige/60">
                        {expenseRecords.map((exp) => (
                          <tr key={exp.id}>
                            <td className="py-2 px-3">{exp.date}</td>
                            <td className="py-2 px-3 font-bold text-bakery-chocolate">{exp.category}</td>
                            <td className="py-2 px-3">{exp.description}</td>
                            <td className="py-2 px-3">{exp.payment_method}</td>
                            <td className="py-2 px-3 text-right font-bold text-status-orange">₱{Number(exp.amount).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 4. Product Costing Preview */}
              {(previewTab === 'ALL' || previewTab === 'COSTING') && (
                <div className="p-5 rounded-2xl bg-white border border-bakery-beige shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-bakery-beige pb-2">
                    <h5 className="font-display font-bold text-sm text-bakery-chocolate flex items-center gap-1.5">
                      <Calculator className="w-4 h-4 text-bakery-caramel" />
                      <span>Sheet 4: Product Recipes &amp; Unit Costing ({productCosting.length} Variants)</span>
                    </h5>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-bakery-cream text-bakery-chocolate font-bold border-b border-bakery-beige">
                        <tr>
                          <th className="py-2 px-3">Product</th>
                          <th className="py-2 px-3">Variant</th>
                          <th className="py-2 px-3 text-center">Batch Yield</th>
                          <th className="py-2 px-3 text-right">Batch Cost (₱)</th>
                          <th className="py-2 px-3 text-right">Cost / Unit (₱)</th>
                          <th className="py-2 px-3 text-right">Selling Price (₱)</th>
                          <th className="py-2 px-3 text-right">Profit / Unit (₱)</th>
                          <th className="py-2 px-3 text-right">Margin %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-bakery-beige/60">
                        {productCosting.map((c, i) => (
                          <tr key={i}>
                            <td className="py-2 px-3 font-bold text-bakery-chocolate">{c.product}</td>
                            <td className="py-2 px-3">{c.variant}</td>
                            <td className="py-2 px-3 text-center">{c.batch_yield}</td>
                            <td className="py-2 px-3 text-right">₱{Number(c.total_batch_cost).toFixed(2)}</td>
                            <td className="py-2 px-3 text-right">₱{Number(c.cost_per_unit).toFixed(2)}</td>
                            <td className="py-2 px-3 text-right font-bold">₱{Number(c.selling_price).toFixed(2)}</td>
                            <td className="py-2 px-3 text-right font-bold text-emerald-700">₱{Number(c.profit_per_unit).toFixed(2)}</td>
                            <td className="py-2 px-3 text-right font-semibold">{Number(c.margin_pct).toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-white border-t border-bakery-beige flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={() => setPreviewExportFormat(null)}
                className="px-4 py-2 rounded-xl border border-bakery-beige text-xs font-semibold text-bakery-chocolate hover:bg-bakery-cream"
              >
                Close Preview
              </button>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-2 rounded-xl bg-bakery-cream border border-bakery-beige text-bakery-chocolate text-xs font-bold hover:bg-bakery-beige flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5 text-bakery-caramel" />
                  <span>Print Preview</span>
                </button>
                <button
                  onClick={handleConfirmDownloadExcel}
                  className="px-4 py-2 rounded-xl bg-status-green hover:bg-status-green/90 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Confirm &amp; Export Excel (.xlsx)</span>
                </button>
                <button
                  onClick={handleConfirmDownloadPdf}
                  className="px-4 py-2 rounded-xl bg-bakery-chocolate hover:bg-[#2c1108] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
                >
                  <FileText className="w-4 h-4 text-bakery-caramel" />
                  <span>Confirm &amp; Export PDF (.pdf)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
