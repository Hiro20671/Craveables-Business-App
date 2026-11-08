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
  Calendar,
  CreditCard,
  AlertCircle,
  Check
} from 'lucide-react';
import { api } from '../services/api';
import { DashboardStats, ReceivablesSummary, UpcomingPayment, CustomerInquiry } from '../types';

export const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [receivablesSummary, setReceivablesSummary] = useState<ReceivablesSummary | null>(null);
  const [allInquiries, setAllInquiries] = useState<CustomerInquiry[]>([]);
  const [loading, setLoading] = useState(true);

  // Quick Payment Modal from Dashboard
  const [payingInquiry, setPayingInquiry] = useState<CustomerInquiry | null>(null);
  const [payAmount, setPayAmount] = useState<string>('');
  const [payMethod, setPayMethod] = useState<'GCash' | 'Cash' | 'Bank Transfer'>('GCash');
  const [payRef, setPayRef] = useState('');
  const [recordingPayment, setRecordingPayment] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [dashData, recSummary, inqs] = await Promise.all([
        api.getDashboardStats(),
        api.getReceivablesSummary().catch(() => null),
        api.getInquiries().catch(() => []),
      ]);
      setStats(dashData);
      setReceivablesSummary(recSummary);
      setAllInquiries(inqs);
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleConfirmInquiry = async (inquiryId: number) => {
    try {
      await api.updateInquiryStatus(inquiryId, 'CONFIRMED');
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Error confirming inquiry');
    }
  };

  const handleConvertToSale = async (inquiryId: number) => {
    if (!window.confirm('Convert this inquiry into an official recorded sale?')) return;
    try {
      await api.convertInquiryToSale(inquiryId);
      alert('Inquiry successfully converted to completed sale!');
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Error converting inquiry to sale');
    }
  };

  const handleCancelInquiry = async (inquiryId: number) => {
    if (!window.confirm('Cancel / Undo this inquiry?')) return;
    try {
      await api.updateInquiryStatus(inquiryId, 'CANCELLED');
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Error cancelling inquiry');
    }
  };

  const openQuickPay = (inq: CustomerInquiry) => {
    setPayingInquiry(inq);
    const balance = Number(inq.remaining_balance ?? (Number(inq.estimated_total || 0) - Number(inq.amount_paid || 0)));
    setPayAmount(balance > 0 ? balance.toFixed(2) : '');
    setPayMethod('GCash');
    setPayRef('');
  };

  const handleConfirmQuickPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingInquiry) return;
    const amt = parseFloat(payAmount);
    if (isNaN(amt) || amt <= 0) {
      alert('Please enter a valid payment amount greater than 0');
      return;
    }
    try {
      setRecordingPayment(true);
      await api.recordOrderPayment(payingInquiry.id, {
        amount: amt,
        payment_method: payMethod,
        reference_number: payRef.trim(),
        payment_date: new Date().toISOString().split('T')[0],
      });
      alert(`Payment of ₱${amt.toFixed(2)} recorded successfully!`);
      setPayingInquiry(null);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to record payment');
    } finally {
      setRecordingPayment(false);
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

  // Filter urgent receivables for dashboard reminders (Overdue or Due Soon)
  const urgentReceivables = allInquiries.filter((i) => {
    if (i.status === 'CANCELLED') return false;
    const balance = Number(i.remaining_balance ?? (Number(i.estimated_total || 0) - Number(i.amount_paid || 0)));
    if (balance <= 0) return false;
    return i.payment_status === 'OVERDUE' || i.payment_status === 'DUE_SOON' || (i.payment_due_date !== null && i.payment_due_date !== undefined);
  });

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-bakery-chocolate via-[#481c0e] to-bakery-caramel text-white p-6 sm:p-8 shadow-warm-lg">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-xs text-xs font-semibold text-bakery-cream mb-3">
            <Sparkles className="w-3.5 h-3.5 text-bakery-cream" />
            <span>Automated Bakery Intelligence &bull; Lucena City</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
            Welcome back to CRAVEABLES
          </h1>
          <p className="text-sm text-bakery-cream/85 leading-relaxed">
            Live business overview, customer pre-orders, baking production batches, and accounts receivable tracking for Dyna, Jeremy, and Anne.
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-5">
            <NavLink
              to="/orders"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-bakery-cream text-bakery-chocolate font-semibold text-xs shadow-md hover:bg-white transition-transform active:scale-95"
            >
              <ShoppingBag className="w-4 h-4 text-bakery-caramel" />
              <span>Customer Orders</span>
            </NavLink>
            <NavLink
              to="/production"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs backdrop-blur-xs border border-white/20 transition-colors"
            >
              <ChefHat className="w-4 h-4 text-bakery-cream" />
              <span>Start Production</span>
            </NavLink>
            <NavLink
              to="/sales"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs backdrop-blur-xs border border-white/20 transition-colors"
            >
              <Receipt className="w-4 h-4 text-bakery-cream" />
              <span>Record Sale</span>
            </NavLink>
            <button
              onClick={fetchData}
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

      {/* Primary Financial & Operational KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Total Sales */}
        <div className="p-4 sm:p-5 rounded-2xl bg-bakery-ivory border border-bakery-beige shadow-warm-sm hover:shadow-warm transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-bakery-muted uppercase tracking-wider">Total Sales</span>
            <div className="p-1.5 rounded-xl bg-bakery-cream text-bakery-chocolate">
              <TrendingUp className="w-4 h-4 text-bakery-caramel" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-display font-bold text-bakery-chocolate">
            ₱{(stats?.total_sales || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-status-green font-medium mt-1">
            {stats?.units_sold || 0} units sold
          </p>
        </div>

        {/* Gross Profit */}
        <div className="p-4 sm:p-5 rounded-2xl bg-bakery-ivory border border-bakery-beige shadow-warm-sm hover:shadow-warm transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-bakery-muted uppercase tracking-wider">Gross Profit</span>
            <div className="p-1.5 rounded-xl bg-bakery-cream text-bakery-caramel">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-display font-bold text-bakery-chocolate">
            ₱{(stats?.gross_profit || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-bakery-caramel font-medium mt-1">
            After direct ingredients &amp; COGS
          </p>
        </div>

        {/* Operating Expenses */}
        <div className="p-4 sm:p-5 rounded-2xl bg-bakery-ivory border border-bakery-beige shadow-warm-sm hover:shadow-warm transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-bakery-muted uppercase tracking-wider">Expenses</span>
            <div className="p-1.5 rounded-xl bg-bakery-cream text-status-orange">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-display font-bold text-bakery-chocolate">
            ₱{(stats?.operating_expenses || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-bakery-muted font-medium mt-1">
            Electricity, packaging, labor
          </p>
        </div>

        {/* Net Profit */}
        <div className="p-4 sm:p-5 rounded-2xl bg-bakery-ivory border border-bakery-beige shadow-warm-sm hover:shadow-warm transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-bakery-muted uppercase tracking-wider">Net Profit</span>
            <div className="p-1.5 rounded-xl bg-status-greenLight text-status-green">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <p className={`text-xl sm:text-2xl font-display font-bold ${(stats?.net_profit || 0) >= 0 ? 'text-status-green' : 'text-status-red'}`}>
            ₱{(stats?.net_profit || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] font-semibold text-bakery-espresso/70 mt-1">
            Margin: {stats?.profit_margin || 0}%
          </p>
        </div>

        {/* Accounts Receivable KPI (Section 6 & 8) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-bakery-chocolate text-white shadow-warm-sm col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-bakery-cream/70 uppercase tracking-wider">
              Receivables
            </span>
            <div className="p-1.5 rounded-xl bg-white/10 text-bakery-caramel">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-display font-bold text-bakery-cream">
            ₱{receivablesSummary?.total_receivables ? Number(receivablesSummary.total_receivables).toFixed(2) : '0.00'}
          </p>
          <NavLink
            to="/orders"
            className="text-[10px] font-bold text-bakery-caramel hover:underline mt-1 inline-flex items-center gap-0.5"
          >
            <span>{receivablesSummary?.unpaid_count || 0} open balances &rarr;</span>
          </NavLink>
        </div>
      </div>

      {/* Section 6C & 8: Payment Reminders & Upcoming Due Dates Alert Banner */}
      {urgentReceivables.length > 0 && (
        <div className="p-5 rounded-2xl bg-bakery-ivory border border-bakery-beige shadow-warm-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-bakery-beige">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-700">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-display font-bold text-sm text-bakery-chocolate">
                  Payment Reminders &amp; Upcoming Collections
                </h3>
                <p className="text-[11px] text-bakery-muted">
                  Customer balances due soon or requiring prompt follow-up
                </p>
              </div>
            </div>

            <NavLink to="/orders" className="text-xs font-bold text-bakery-caramel hover:underline flex items-center gap-1">
              <span>View All Receivables</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </NavLink>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {urgentReceivables.slice(0, 6).map((inq) => {
              const balance = Number(inq.remaining_balance ?? (Number(inq.estimated_total || 0) - Number(inq.amount_paid || 0)));
              const isOverdue = inq.payment_status === 'OVERDUE';
              return (
                <div
                  key={inq.id}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                    isOverdue
                      ? 'bg-red-500/10 border-red-500/30'
                      : 'bg-bakery-cream/70 border-bakery-beige'
                  }`}
                >
                  <div className="min-w-0 pr-1 space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-bakery-chocolate truncate">{inq.customer_name}</span>
                      {isOverdue && (
                        <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-red-600 text-white animate-pulse">
                          OVERDUE
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-bakery-muted">
                      Order: {inq.shared_order_number || inq.inquiry_number} &bull; Due: {inq.payment_due_date || 'On Pickup'}
                    </p>
                    <p className="font-display font-bold text-bakery-chocolate text-xs">
                      Due: <span className={isOverdue ? 'text-red-700' : 'text-amber-800'}>₱{balance.toFixed(2)}</span>
                    </p>
                  </div>

                  <button
                    onClick={() => openQuickPay(inq)}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-2xs flex items-center gap-1 shrink-0"
                  >
                    <CreditCard className="w-3 h-3" />
                    <span>Pay</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Financial Performance Monthly Chart */}
      <div className="p-5 sm:p-6 rounded-2xl bg-bakery-ivory border border-bakery-beige shadow-warm-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-bakery-beige">
          <div>
            <h3 className="font-display font-bold text-base sm:text-lg text-bakery-chocolate">
              Financial Performance (Current Year)
            </h3>
            <p className="text-xs text-bakery-muted">
              Monthly revenue, gross profit, operating expenses, and net profit trends
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-bakery-chocolate inline-block" />
              Sales
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-bakery-caramel inline-block" />
              Gross Profit
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-status-orange inline-block" />
              Expenses
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-status-green inline-block" />
              Net Profit
            </span>
          </div>
        </div>

        {/* CSS Bar Chart */}
        <div className="grid grid-cols-6 sm:grid-cols-12 gap-2 pt-4 items-end min-h-[160px]">
          {stats?.monthly_performance?.map((m) => {
            const salesH = Math.max(4, Math.round((m.sales / maxMonthVal) * 120));
            const grossH = Math.max(4, Math.round((m.gross_profit / maxMonthVal) * 120));
            const expH = Math.max(4, Math.round((m.expenses / maxMonthVal) * 120));
            const netH = Math.max(4, Math.round((Math.max(0, m.net_profit) / maxMonthVal) * 120));

            return (
              <div key={m.month} className="flex flex-col items-center gap-1 group">
                <div className="flex items-end gap-0.5 h-[120px] w-full justify-center">
                  <div
                    style={{ height: `${salesH}px` }}
                    className="w-1.5 sm:w-2 rounded-t bg-bakery-chocolate transition-all group-hover:opacity-80"
                    title={`Sales: ₱${m.sales.toFixed(2)}`}
                  />
                  <div
                    style={{ height: `${grossH}px` }}
                    className="w-1.5 sm:w-2 rounded-t bg-bakery-caramel transition-all group-hover:opacity-80"
                    title={`Gross Profit: ₱${m.gross_profit.toFixed(2)}`}
                  />
                  <div
                    style={{ height: `${expH}px` }}
                    className="w-1.5 sm:w-2 rounded-t bg-status-orange transition-all group-hover:opacity-80"
                    title={`Expenses: ₱${m.expenses.toFixed(2)}`}
                  />
                  <div
                    style={{ height: `${netH}px` }}
                    className="w-1.5 sm:w-2 rounded-t bg-status-green transition-all group-hover:opacity-80"
                    title={`Net Profit: ₱${m.net_profit.toFixed(2)}`}
                  />
                </div>
                <span className="text-[10px] font-semibold text-bakery-muted uppercase">
                  {m.month.slice(0, 3)}
                </span>
              </div>
            );
          })}
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
            <span>Manage All Orders</span>
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

      {/* QUICK PAYMENT MODAL ON DASHBOARD */}
      {payingInquiry && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-bakery-ivory w-full max-w-md rounded-3xl border border-bakery-beige shadow-warm-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-bakery-beige pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-bakery-caramel" />
                <div>
                  <h3 className="font-display font-bold text-base text-bakery-chocolate">Quick Payment Entry</h3>
                  <span className="text-xs text-bakery-muted">
                    Order #{payingInquiry.shared_order_number || payingInquiry.inquiry_number}
                  </span>
                </div>
              </div>
              <button onClick={() => setPayingInquiry(null)} className="text-bakery-muted hover:text-black font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmQuickPayment} className="space-y-3.5 text-xs">
              <div className="p-3 rounded-2xl bg-bakery-cream border border-bakery-beige flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-bakery-muted block">Customer</span>
                  <strong className="text-sm text-bakery-chocolate">{payingInquiry.customer_name}</strong>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-bakery-muted block">Remaining Balance</span>
                  <strong className="text-sm text-red-600 font-display">
                    ₱{Number(payingInquiry.remaining_balance ?? 0).toFixed(2)}
                  </strong>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-bakery-chocolate mb-1">Amount to Record (₱) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige text-sm font-bold text-bakery-chocolate focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-bakery-chocolate mb-1">Payment Method</label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige text-xs font-semibold text-bakery-chocolate focus:outline-hidden"
                  >
                    <option value="GCash">GCash</option>
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-bakery-chocolate mb-1">Reference Number</label>
                  <input
                    type="text"
                    placeholder="Ref # (e.g. GCash)"
                    value={payRef}
                    onChange={(e) => setPayRef(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige text-xs text-bakery-chocolate focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPayingInquiry(null)}
                  className="px-4 py-2 rounded-xl border border-bakery-beige text-bakery-chocolate font-semibold hover:bg-bakery-beige/30"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordingPayment}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{recordingPayment ? 'Recording...' : 'Record Payment'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
