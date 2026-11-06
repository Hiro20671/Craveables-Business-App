import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  FileText,
  Calendar,
  Filter,
  DollarSign,
  TrendingUp,
  TrendingDown,
  PieChart,
  CheckCircle2
} from 'lucide-react';
import { api } from '../services/api';

export const ReportsPage: React.FC = () => {
  const [plData, setPlData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchReport = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
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

  const handleDownloadExcel = () => {
    window.open(api.downloadExcelReportUrl(), '_blank');
  };

  const handleDownloadPdf = () => {
    window.open(api.downloadPdfReportUrl(), '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-bakery-ivory border border-bakery-beige shadow-warm-sm">
        <div>
          <h1 className="font-display font-bold text-2xl text-bakery-chocolate">
            Financial Reports & Analytics
          </h1>
          <p className="text-xs text-bakery-muted mt-0.5">
            Profit & Loss statements, COGS analysis, overhead breakdowns, and exportable business records
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleDownloadExcel}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-status-green text-white text-xs font-semibold hover:bg-status-green/90 shadow-xs transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel (.xlsx)</span>
          </button>
          <button
            onClick={handleDownloadPdf}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-bakery-chocolate text-white text-xs font-semibold hover:bg-[#2c1108] shadow-xs transition-colors"
          >
            <FileText className="w-4 h-4 text-bakery-cream" />
            <span>Export PDF (.pdf)</span>
          </button>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="p-4 rounded-xl bg-bakery-ivory border border-bakery-beige flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-bakery-caramel" />
          <span className="font-bold text-bakery-chocolate">Date Range Filter:</span>
        </div>

        <div className="flex items-center gap-2">
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
            onClick={fetchReport}
            className="px-3 py-1.5 rounded-lg bg-bakery-caramel text-white font-semibold hover:bg-bakery-caramel/90"
          >
            Apply Filter
          </button>
          {(startDate || endDate) && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setTimeout(fetchReport, 0);
              }}
              className="text-xs text-bakery-muted hover:underline"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Profit & Loss Statement Card */}
      <div className="p-6 rounded-2xl bg-bakery-ivory border border-bakery-beige shadow-warm-sm space-y-6">
        <div className="border-b border-bakery-beige pb-3 flex items-center justify-between">
          <div>
            <h2 className="font-display font-bold text-xl text-bakery-chocolate">
              CRAVEABLES Statement of Profit & Loss
            </h2>
            <p className="text-xs text-bakery-muted">
              Authoritative financial summary calculated directly from registered sales, production COGS, and operating expenses
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-bakery-cream text-bakery-chocolate border border-bakery-beige">
            All Values in PHP (₱)
          </span>
        </div>

        {/* P&L Table Breakdown */}
        <div className="space-y-4 text-xs font-medium">
          {/* Revenue Section */}
          <div className="space-y-2">
            <h3 className="font-bold text-bakery-chocolate uppercase tracking-wider text-[11px] pb-1 border-b border-bakery-beige/60">
              1. Sales Revenue
            </h3>
            <div className="flex justify-between py-1 text-bakery-espresso">
              <span className="pl-3">Gross Sales:</span>
              <span className="font-semibold">₱{Number(plData?.gross_sales || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-1 text-status-orange">
              <span className="pl-3">Less: Sales Discounts & Promos:</span>
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
              <span className="pl-3">Direct Ingredients & Baking Costs:</span>
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
              3. Operating & Administrative Expenses
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
    </div>
  );
};

