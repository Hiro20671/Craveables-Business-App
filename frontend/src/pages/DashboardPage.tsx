import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  AlertTriangle,
  ShoppingBag,
  ChefHat,
  ArrowRight,
  Boxes,
  Clock,
  Sparkles,
  RefreshCw,
  Receipt,
  Download,
  Phone,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Send,
  Calendar
} from 'lucide-react';
import { api } from '../services/api';
import { DashboardStats } from '../types';

export const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load dashboard stats', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleConfirmInquiry = async (inquiryId: number) => {
    try {
      await api.updateInquiryStatus(inquiryId, 'CONFIRMED');
      await fetchStats();
    } catch (err: any) {
      alert(err.message || 'Error confirming inquiry');
    }
  };

  const handleConvertToSale = async (inquiryId: number) => {
    if (!window.confirm('Convert this inquiry into an official recorded sale?')) return;
    try {
      await api.convertInquiryToSale(inquiryId);
      alert('Inquiry successfully converted to completed sale!');
      await fetchStats();
    } catch (err: any) {
      alert(err.message || 'Error converting inquiry to sale');
    }
  };

  const handleCancelInquiry = async (inquiryId: number) => {
    if (!window.confirm('Cancel / Undo this inquiry?')) return;
    try {
      await api.updateInquiryStatus(inquiryId, 'CANCELLED');
      await fetchStats();
    } catch (err: any) {
      alert(err.message || 'Error cancelling inquiry');
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <div className="w-12 h-12 border-4 border-bakery-chocolate border-t-bakery-caramel rounded-full animate-spin" />
        <p className="font-display text-bakery-chocolate text-base font-semibold">
          Loading CRAVEABLES Live Dashboard...
        </p>
      </div>
    );
  }

  const lowStockTotal = (stats?.inventory_summary?.low_stock || 0) + (stats?.inventory_summary?.out_of_stock || 0);

  // Maximum value for monthly chart scaling
  const maxMonthVal = Math.max(
    1000,
    ...(stats?.monthly_performance?.map((m) => Math.max(m.sales, m.gross_profit, m.expenses)) || [1000])
  );

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-bakery-chocolate via-[#481c0e] to-bakery-caramel text-white p-6 sm:p-8 shadow-warm-lg">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-xs text-xs font-semibold text-bakery-cream mb-3">
            <Sparkles className="w-3.5 h-3.5 text-bakery-cream" />
            <span>Automated Bakery Intelligence</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
            Welcome back to CRAVEABLES
          </h1>
          <p className="text-sm text-bakery-cream/85 leading-relaxed">
            Live business overview, inventory monitoring, production batches, and sales performance. All interconnected with your centralized database.
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-5">
            <NavLink
              to="/production"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-bakery-cream text-bakery-chocolate font-semibold text-xs shadow-md hover:bg-white transition-transform active:scale-95"
            >
              <ChefHat className="w-4 h-4 text-bakery-caramel" />
              <span>Start Production</span>
            </NavLink>
            <NavLink
              to="/sales"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs backdrop-blur-xs border border-white/20 transition-colors"
            >
              <Receipt className="w-4 h-4 text-bakery-cream" />
              <span>Record New Sale</span>
            </NavLink>
            <button
              onClick={fetchStats}
              title="Refresh Stats"
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white backdrop-blur-xs border border-white/20 transition-colors ml-auto sm:ml-0"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Decorative background logo */}
        <img
          src="/badge.png"
          alt="CRAVEABLES Badge"
          className="absolute -right-8 -bottom-10 w-64 h-64 opacity-15 pointer-events-none transform rotate-12 select-none"
        />
      </div>

      {/* Low Stock Warning Alert if any items are low */}
      {lowStockTotal > 0 && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-status-orangeLight border border-status-orange/30 text-status-orange shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-status-orange/15">
              <AlertTriangle className="w-5 h-5 text-status-orange" />
            </div>
            <div>
              <p className="font-semibold text-sm">
                Attention Required: {lowStockTotal} ingredient{lowStockTotal > 1 ? 's are' : ' is'} below reorder level!
              </p>
              <p className="text-xs opacity-90">
                {stats?.inventory_summary?.out_of_stock || 0} out of stock &bull; {stats?.inventory_summary?.low_stock || 0} low stock.
              </p>
            </div>
          </div>
          <NavLink
            to="/inventory"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-status-orange text-white text-xs font-semibold hover:bg-status-orange/90 transition-colors"
          >
            <span>View Restock List</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </NavLink>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Total Sales */}
        <div className="p-5 rounded-2xl bg-bakery-ivory border border-bakery-beige shadow-warm-sm hover:shadow-warm transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-bakery-muted uppercase tracking-wider">Total Sales</span>
            <div className="p-2 rounded-xl bg-bakery-cream text-bakery-chocolate">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-display font-bold text-bakery-chocolate">
            ₱{(stats?.total_sales || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-status-green font-medium mt-1">
            {stats?.units_sold || 0} units sold
          </p>
        </div>

        {/* Gross Profit */}
        <div className="p-5 rounded-2xl bg-bakery-ivory border border-bakery-beige shadow-warm-sm hover:shadow-warm transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-bakery-muted uppercase tracking-wider">Gross Profit</span>
            <div className="p-2 rounded-xl bg-bakery-cream text-bakery-caramel">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-display font-bold text-bakery-chocolate">
            ₱{(stats?.gross_profit || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-bakery-caramel font-medium mt-1">
            After direct ingredients & baking COGS
          </p>
        </div>

        {/* Operating Expenses */}
        <div className="p-5 rounded-2xl bg-bakery-ivory border border-bakery-beige shadow-warm-sm hover:shadow-warm transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-bakery-muted uppercase tracking-wider">Operating Expenses</span>
            <div className="p-2 rounded-xl bg-bakery-cream text-status-orange">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-display font-bold text-bakery-chocolate">
            ₱{(stats?.operating_expenses || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-bakery-muted font-medium mt-1">
            Electricity, packaging, shipping, labor
          </p>
        </div>

        {/* Net Profit */}
        <div className="p-5 rounded-2xl bg-bakery-ivory border border-bakery-beige shadow-warm-sm hover:shadow-warm transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-bakery-muted uppercase tracking-wider">Net Profit</span>
            <div className="p-2 rounded-xl bg-status-greenLight text-status-green">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <p className={`text-xl sm:text-2xl font-display font-bold ${(stats?.net_profit || 0) >= 0 ? 'text-status-green' : 'text-status-red'}`}>
            ₱{(stats?.net_profit || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs font-semibold text-bakery-espresso/70 mt-1">
            Margin: {stats?.profit_margin || 0}%
          </p>
        </div>
      </div>

      {/* Secondary KPI Bar: Total Inventory Value & Status */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-bakery-ivory border border-bakery-beige flex items-center justify-between">
          <div>
            <p className="text-xs text-bakery-muted uppercase font-semibold">Total Inventory Value</p>
            <p className="text-lg font-bold font-display text-bakery-chocolate">
              ₱{(stats?.inventory_value || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <Boxes className="w-6 h-6 text-bakery-caramel" />
        </div>

        <div className="p-4 rounded-xl bg-bakery-ivory border border-bakery-beige flex items-center justify-between">
          <div>
            <p className="text-xs text-bakery-muted uppercase font-semibold">Tracked Ingredients</p>
            <p className="text-lg font-bold font-display text-bakery-chocolate">
              {stats?.inventory_summary?.total_ingredients || 0} Items
            </p>
          </div>
          <Package className="w-6 h-6 text-bakery-caramel" />
        </div>

        <div className="p-4 rounded-xl bg-bakery-ivory border border-bakery-beige flex items-center justify-between">
          <div>
            <p className="text-xs text-bakery-muted uppercase font-semibold">Healthy Stock Level</p>
            <p className="text-lg font-bold font-display text-status-green">
              {stats?.inventory_summary?.normal || 0} Normal
            </p>
          </div>
          <div className="w-4 h-4 rounded-full bg-status-green" />
        </div>
      </div>

      {/* Main Charts & Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Performance Chart (2 cols) */}
        <div className="lg:col-span-2 p-5 sm:p-6 rounded-2xl bg-bakery-ivory border border-bakery-beige shadow-warm-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-display font-bold text-base sm:text-lg text-bakery-chocolate">
                Monthly Performance (2026)
              </h3>
              <p className="text-xs text-bakery-muted">
                Sales revenue vs. Gross profit and Operating expenses
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-medium">
              <span className="flex items-center gap-1.5 text-bakery-chocolate">
                <span className="w-2.5 h-2.5 rounded-full bg-bakery-chocolate" /> Sales
              </span>
              <span className="flex items-center gap-1.5 text-bakery-caramel">
                <span className="w-2.5 h-2.5 rounded-full bg-bakery-caramel" /> Gross Profit
              </span>
              <span className="flex items-center gap-1.5 text-status-orange">
                <span className="w-2.5 h-2.5 rounded-full bg-status-orange" /> Expenses
              </span>
            </div>
          </div>

          {/* Bar Chart Visualization */}
          {stats?.monthly_performance?.some((m) => m.sales > 0 || m.expenses > 0) ? (
            <div className="h-64 flex items-end justify-between gap-2 pt-6 pb-2 border-b border-bakery-beige">
              {stats?.monthly_performance?.slice(0, 8).map((m) => {
                const salesH = m.sales > 0 ? Math.max(4, Math.min(100, (m.sales / maxMonthVal) * 100)) : 0;
                const gpH = m.gross_profit > 0 ? Math.max(4, Math.min(100, (m.gross_profit / maxMonthVal) * 100)) : 0;
                const expH = m.expenses > 0 ? Math.max(4, Math.min(100, (m.expenses / maxMonthVal) * 100)) : 0;

                return (
                  <div key={m.month} className="flex-1 flex flex-col items-center h-full justify-end group">
                    <div className="w-full flex items-end justify-center gap-1 h-full pb-1">
                      {/* Sales Bar */}
                      {salesH > 0 && (
                        <div
                          style={{ height: `${salesH}%` }}
                          className="w-1/3 bg-bakery-chocolate rounded-t transition-all group-hover:bg-[#2c1108] relative"
                          title={`${m.month} Sales: ₱${m.sales.toLocaleString()}`}
                        />
                      )}
                      {/* Gross Profit Bar */}
                      {gpH > 0 && (
                        <div
                          style={{ height: `${gpH}%` }}
                          className="w-1/3 bg-bakery-caramel rounded-t transition-all group-hover:bg-[#8f6437] relative"
                          title={`${m.month} Gross Profit: ₱${m.gross_profit.toLocaleString()}`}
                        />
                      )}
                      {/* Expenses Bar */}
                      {expH > 0 && (
                        <div
                          style={{ height: `${expH}%` }}
                          className="w-1/3 bg-status-orange rounded-t transition-all group-hover:bg-status-orange/80 relative"
                          title={`${m.month} Expenses: ₱${m.expenses.toLocaleString()}`}
                        />
                      )}
                    </div>
                    <span className="text-[11px] font-semibold text-bakery-espresso/70 mt-2">
                      {m.month}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center border-b border-bakery-beige text-center p-6 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-bakery-cream border border-bakery-beige flex items-center justify-center text-bakery-chocolate">
                <TrendingUp className="w-6 h-6 text-bakery-caramel" />
              </div>
              <div>
                <p className="font-display font-bold text-sm text-bakery-chocolate">
                  Ready for Your First Sale!
                </p>
                <p className="text-xs text-bakery-muted max-w-sm mt-1">
                  CRAVEABLES is freshly initialized with your recipes and ingredient inventory. Once you record your sales and expenses, live monthly analytics will appear here.
                </p>
              </div>
              <NavLink
                to="/sales"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-bakery-chocolate text-white text-xs font-semibold hover:bg-[#2c1108] transition-colors"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Record First Sale</span>
              </NavLink>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-bakery-muted mt-3">
            <span>Values in Philippine Peso (₱)</span>
            <NavLink to="/reports" className="font-semibold text-bakery-caramel hover:underline">
              Full Financial Report &rarr;
            </NavLink>
          </div>
        </div>

        {/* Best Selling Products Card (1 col) */}
        <div className="p-5 sm:p-6 rounded-2xl bg-bakery-ivory border border-bakery-beige shadow-warm-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-base sm:text-lg text-bakery-chocolate">
              Best Selling Products
            </h3>
            <NavLink to="/products" className="text-xs font-semibold text-bakery-caramel hover:underline">
              View All
            </NavLink>
          </div>

          <div className="space-y-3.5 flex-1">
            {stats?.best_sellers && stats.best_sellers.length > 0 ? (
              stats.best_sellers.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-bakery-cream/60 border border-bakery-beige/60">
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="text-xs font-bold text-bakery-chocolate truncate">
                      {item.product_name}
                    </p>
                    <p className="text-[11px] text-bakery-muted">
                      {item.total_units} units sold
                    </p>
                  </div>
                  <span className="font-display font-bold text-xs text-bakery-caramel flex-shrink-0">
                    ₱{item.total_revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-bakery-muted text-center py-8">
                No product sales recorded yet.
              </p>
            )}
          </div>

          <div className="pt-4 border-t border-bakery-beige/80 mt-4">
            <NavLink
              to="/sales"
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-bakery-cream border border-bakery-beige text-xs font-semibold text-bakery-chocolate hover:bg-bakery-beige/30 transition-colors"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-bakery-caramel" />
              <span>Go to Sales Log</span>
            </NavLink>
          </div>
        </div>
      </div>

      {/* Live Customer Pre-Orders & Online Inquiries */}
      <div className="p-5 sm:p-6 rounded-2xl bg-bakery-ivory border border-bakery-beige shadow-warm-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-bakery-beige">
          <NavLink to="/orders" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-bakery-chocolate text-bakery-cream flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
              <ShoppingBag className="w-4 h-4 text-bakery-caramel" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold text-base sm:text-lg text-bakery-chocolate group-hover:text-bakery-caramel transition-colors">
                  Customer Pre-Orders &amp; Online Inquiries
                </h3>
                {stats?.pending_inquiries_count && stats.pending_inquiries_count > 0 ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-status-orange text-white animate-pulse">
                    {stats.pending_inquiries_count} New
                  </span>
                ) : null}
              </div>
              <p className="text-[11px] text-bakery-muted">
                Live customer orders submitted directly from your storefront
              </p>
            </div>
          </NavLink>

          <NavLink
            to="/orders"
            className="text-xs font-semibold text-bakery-caramel hover:underline flex items-center gap-1 self-start sm:self-auto"
          >
            <span>Manage All Inquiries</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </NavLink>
        </div>

        <div className="divide-y divide-bakery-beige/60">
          {stats?.recent_inquiries && stats.recent_inquiries.length > 0 ? (
            stats.recent_inquiries.map((inq) => {
              const isPending = inq.status === 'PENDING';
              const isConfirmed = inq.status === 'CONFIRMED';
              const isCompleted = inq.status === 'COMPLETED';

              return (
                <div key={inq.id} className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-bakery-chocolate text-sm">
                        {inq.customer_name}
                      </span>
                      <a
                        href={`tel:${inq.customer_phone}`}
                        className="inline-flex items-center gap-1 text-[11px] text-bakery-caramel font-semibold hover:underline"
                      >
                        <Phone className="w-3 h-3" />
                        <span>{inq.customer_phone}</span>
                      </a>
                      {inq.target_date && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-bakery-muted bg-bakery-cream px-2 py-0.5 rounded border border-bakery-beige">
                          <Calendar className="w-3 h-3" />
                          <span>Need for: {inq.target_date}</span>
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-bakery-espresso/80 line-clamp-2">
                      {inq.items_summary.replace(/\*([^*]+)\*/g, '$1')}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 self-end md:self-center flex-shrink-0">
                    <span className="font-display font-bold text-sm text-bakery-chocolate">
                      ₱{Number(inq.estimated_total).toFixed(2)}
                    </span>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                        isPending
                          ? 'bg-status-orangeLight text-status-orange border-status-orange/30'
                          : isConfirmed
                          ? 'bg-status-blueLight text-status-blue border-status-blue/30'
                          : isCompleted
                          ? 'bg-status-greenLight text-status-green border-status-green/30'
                          : 'bg-bakery-cream text-bakery-muted border-bakery-beige'
                      }`}
                    >
                      {inq.status}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {isPending && (
                        <button
                          onClick={() => handleConfirmInquiry(inq.id)}
                          title="Confirm order"
                          className="px-2.5 py-1 rounded-lg bg-bakery-cream border border-bakery-beige text-bakery-chocolate hover:bg-bakery-beige text-[11px] font-semibold"
                        >
                          Confirm
                        </button>
                      )}

                      {!isCompleted && inq.status !== 'CANCELLED' && (
                        <button
                          onClick={() => handleConvertToSale(inq.id)}
                          title="Convert to completed sale"
                          className="px-2.5 py-1 rounded-lg bg-bakery-chocolate text-white text-[11px] font-semibold hover:bg-[#2c1108] shadow-2xs flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3 h-3 text-status-green" />
                          <span>Record Sale</span>
                        </button>
                      )}

                      {inq.status !== 'CANCELLED' && (
                        <button
                          onClick={() => handleCancelInquiry(inq.id)}
                          title="Cancel inquiry"
                          className="p-1 rounded-lg hover:bg-status-redLight text-bakery-muted hover:text-status-red"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-8 text-center text-xs text-bakery-muted space-y-1">
              <p className="font-semibold text-bakery-chocolate">No Pending Inquiries</p>
              <p>When customers submit orders through your public storefront, they will appear here live!</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity: Sales, Expenses & Stock Logs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Sales Log */}
        <div className="p-5 rounded-2xl bg-bakery-ivory border border-bakery-beige shadow-warm-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-bakery-caramel" />
              <h3 className="font-display font-bold text-base text-bakery-chocolate">Recent Sales</h3>
            </div>
            <NavLink to="/sales" className="text-xs font-semibold text-bakery-caramel hover:underline">
              View History
            </NavLink>
          </div>

          <div className="divide-y divide-bakery-beige/60">
            {stats?.recent_sales && stats.recent_sales.length > 0 ? (
              stats.recent_sales.map((sale) => (
                <div key={sale.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-bakery-chocolate">{sale.receipt_number}</span>
                    <span className="text-[11px] text-bakery-muted ml-2">{sale.sale_date}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-bakery-cream border border-bakery-beige text-bakery-espresso">
                      {sale.payment_method}
                    </span>
                    <span className="font-bold text-bakery-chocolate">
                      ₱{Number(sale.total_sales).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-bakery-muted py-4 text-center">No sales recorded yet.</p>
            )}
          </div>
        </div>

        {/* Recent Stock Transactions */}
        <div className="p-5 rounded-2xl bg-bakery-ivory border border-bakery-beige shadow-warm-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Boxes className="w-4 h-4 text-bakery-caramel" />
              <h3 className="font-display font-bold text-base text-bakery-chocolate">Recent Stock Movements</h3>
            </div>
            <NavLink to="/inventory" className="text-xs font-semibold text-bakery-caramel hover:underline">
              Inventory Log
            </NavLink>
          </div>

          <div className="divide-y divide-bakery-beige/60">
            {stats?.recent_transactions && stats.recent_transactions.length > 0 ? (
              stats.recent_transactions.map((tx) => {
                const change = Number(tx.quantity_change);
                const isPositive = change > 0;
                return (
                  <div key={tx.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="min-w-0 pr-2">
                      <p className="font-semibold text-bakery-chocolate truncate">{tx.ingredient__name}</p>
                      <p className="text-[10px] text-bakery-muted truncate">{tx.reason}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`font-bold px-2 py-0.5 rounded ${isPositive ? 'bg-status-greenLight text-status-green' : 'bg-status-orangeLight text-status-orange'}`}>
                        {isPositive ? `+${change}` : change} {tx.ingredient__unit}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-bakery-muted py-4 text-center">No inventory movements recorded.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

