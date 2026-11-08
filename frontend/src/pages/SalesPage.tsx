import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  ReceiptText,
  Plus,
  Search,
  Filter,
  DollarSign,
  TrendingUp,
  CreditCard,
  QrCode,
  Wallet,
  ShoppingBag,
  Sparkles,
  Printer,
  Calendar,
  Pencil,
  Trash2,
  RotateCcw,
  CheckCircle2,
  Phone,
  XCircle,
  Clock,
  ArrowRight,
  FileText
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';
import { SaleOrder, ProductVariant } from '../types';
import { calculateWholesaleDiscount, getWholesaleDescription } from '../utils/pricing';

export const SalesPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'SALES' | 'INQUIRIES'>('SALES');
  const [sales, setSales] = useState<SaleOrder[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any | null>(null);

  // Edit Sale State
  const [editSale, setEditSale] = useState<SaleOrder | null>(null);
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editPaymentMethod, setEditPaymentMethod] = useState('GCash');
  const [editSaleDate, setEditSaleDate] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [savingSaleEdit, setSavingSaleEdit] = useState(false);
  const [cancellingSaleId, setCancellingSaleId] = useState<number | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('ALL');

  // Record Sale Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('GCash');
  const [orderDiscount, setOrderDiscount] = useState('0.00');
  const [saleNotes, setSaleNotes] = useState('');
  const [cartItems, setCartItems] = useState<
    Array<{ product_variant: number; quantity: number; selling_price: number; discount: number }>
  >([]);

  // Receipt Modal
  const [viewReceipt, setViewReceipt] = useState<SaleOrder | null>(null);

  useEffect(() => {
    if (searchParams.get('tab') === 'inquiries') {
      setActiveTab('INQUIRIES');
    }
  }, [searchParams]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [salesData, vars, summ, inqs] = await Promise.all([
        api.getSales(),
        api.getVariants(),
        api.getSalesSummary(),
        api.getInquiries(),
      ]);
      setSales(salesData);
      setVariants(vars);
      setSummary(summ);
      setInquiries(inqs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUndoSale = async (s: SaleOrder) => {
    const confirmMsg = `Are you sure you want to undo and cancel sale "${s.receipt_number}"?\n\n• Finished stock for sold items will be returned to inventory\n• Revenue and gross profit will adjust accordingly`;
    if (!window.confirm(confirmMsg)) return;

    try {
      setCancellingSaleId(s.id);
      await api.cancelSaleOrder(s.id);
      alert(`Sale ${s.receipt_number} has been undone and finished stock restored!`);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to undo sale');
    } finally {
      setCancellingSaleId(null);
    }
  };

  const openEditSaleModal = (s: SaleOrder) => {
    setEditSale(s);
    setEditCustomerName(s.customer_name);
    setEditPaymentMethod(s.payment_method);
    setEditSaleDate(s.sale_date);
    setEditNotes(s.notes || '');
  };

  const handleSaveSaleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSale) return;
    try {
      setSavingSaleEdit(true);
      await api.updateSaleOrder(editSale.id, {
        customer_name: editCustomerName,
        payment_method: editPaymentMethod,
        sale_date: editSaleDate,
        notes: editNotes,
      });
      setEditSale(null);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to update sale details');
    } finally {
      setSavingSaleEdit(false);
    }
  };

  const handleInquiryStatusChange = async (inquiryId: number, newStatus: string) => {
    try {
      await api.updateInquiryStatus(inquiryId, newStatus);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to update inquiry status');
    }
  };

  const handleConvertInquiry = async (inquiryId: number) => {
    if (!window.confirm('Convert this inquiry into a completed sale?')) return;
    try {
      await api.convertInquiryToSale(inquiryId);
      alert('Inquiry successfully converted to sale order!');
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to convert inquiry');
    }
  };

  const handleDeleteInquiry = async (inquiryId: number) => {
    if (!window.confirm('Delete this inquiry record?')) return;
    try {
      await api.deleteInquiry(inquiryId);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete inquiry');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openRecordSaleModal = () => {
    setCustomerName('');
    setSaleDate(new Date().toISOString().split('T')[0]);
    setPaymentMethod('GCash');
    setOrderDiscount('0.00');
    setSaleNotes('');
    if (variants.length > 0) {
      setCartItems([
        {
          product_variant: variants[0].id,
          quantity: 1,
          selling_price: Number(variants[0].selling_price),
          discount: 0,
        },
      ]);
    }
    setIsModalOpen(true);
  };

  const handleAddCartItem = () => {
    if (variants.length > 0) {
      setCartItems([
        ...cartItems,
        {
          product_variant: variants[0].id,
          quantity: 1,
          selling_price: Number(variants[0].selling_price),
          discount: 0,
        },
      ]);
    }
  };

  const handleCartItemChange = (index: number, field: string, val: any) => {
    const updated = [...cartItems];
    if (field === 'product_variant') {
      const v = variants.find((item) => item.id === Number(val));
      const sp = v ? Number(v.selling_price) : 0;
      updated[index] = {
        ...updated[index],
        product_variant: Number(val),
        selling_price: sp,
      };
      if (v) {
        const fullName = `${v.product_name || ''} ${v.name}`;
        const ws = calculateWholesaleDiscount(fullName, sp, updated[index].quantity);
        updated[index].discount = ws.totalDiscount;
      }
    } else {
      updated[index] = { ...updated[index], [field]: val };
      if (field === 'quantity') {
        const v = variants.find((item) => item.id === updated[index].product_variant);
        if (v) {
          const fullName = `${v.product_name || ''} ${v.name}`;
          const ws = calculateWholesaleDiscount(fullName, updated[index].selling_price, Number(val));
          updated[index].discount = ws.totalDiscount;
        }
      }
    }
    setCartItems(updated);
  };

  const handleRemoveCartItem = (index: number) => {
    setCartItems(cartItems.filter((_, i) => i !== index));
  };

  const handleSubmitSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cartItems.length === 0) {
      alert('Please add at least one product item');
      return;
    }

    try {
      const payload = {
        sale_date: saleDate,
        customer_name: customerName,
        payment_method: paymentMethod,
        discount: parseFloat(orderDiscount) || 0,
        notes: saleNotes,
        items: cartItems.map((item) => ({
          product_variant: item.product_variant,
          quantity: item.quantity,
          selling_price: item.selling_price,
          discount: item.discount,
        })),
      };

      const newSale = await api.createSale(payload);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#3B170B', '#A97845', '#FFF9DF', '#15803d'],
      });

      setIsModalOpen(false);
      setViewReceipt(newSale);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Error recording sale');
    }
  };

  // Live total preview in modal
  const computedSubtotal = cartItems.reduce(
    (sum, item) => sum + item.selling_price * item.quantity,
    0
  );
  const computedItemDiscount = cartItems.reduce((sum, item) => sum + item.discount, 0);
  const computedTotal = Math.max(
    0,
    computedSubtotal - computedItemDiscount - (parseFloat(orderDiscount) || 0)
  );

  const filteredSales = sales.filter((s) => {
    const matchesSearch =
      s.receipt_number.toLowerCase().includes(search.toLowerCase()) ||
      (s.customer_name || '').toLowerCase().includes(search.toLowerCase());
    const matchesPayment = paymentFilter === 'ALL' || s.payment_method === paymentFilter;
    return matchesSearch && matchesPayment;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-bakery-ivory border border-bakery-beige shadow-warm-sm">
        <div>
          <h1 className="font-display font-bold text-2xl text-bakery-chocolate">
            Sales Register & Order Log
          </h1>
          <p className="text-xs text-bakery-muted mt-0.5">
            Log transactions, compute gross margins, manage customer receipts, and deduct finished goods stock
          </p>
        </div>

        <button
          onClick={openRecordSaleModal}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-bakery-chocolate text-white text-xs font-semibold hover:bg-[#2c1108] shadow-warm-sm transition-transform active:scale-95"
        >
          <ReceiptText className="w-4 h-4 text-bakery-cream" />
          <span>Record New Sale</span>
        </button>
      </div>

      {/* KPI Overview Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-bakery-ivory border border-bakery-beige">
          <span className="text-[10px] text-bakery-muted uppercase font-semibold">Total Revenue</span>
          <p className="text-lg sm:text-xl font-display font-bold text-bakery-chocolate">
            ₱{Number(summary?.total_sales || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-bakery-ivory border border-bakery-beige">
          <span className="text-[10px] text-bakery-muted uppercase font-semibold">Gross Profit</span>
          <p className="text-lg sm:text-xl font-display font-bold text-bakery-caramel">
            ₱{Number(summary?.total_gross_profit || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-bakery-ivory border border-bakery-beige">
          <span className="text-[10px] text-bakery-muted uppercase font-semibold">Units Sold</span>
          <p className="text-lg sm:text-xl font-display font-bold text-bakery-chocolate">
            {summary?.total_units_sold || 0} pcs
          </p>
        </div>
        <div className="p-4 rounded-xl bg-bakery-ivory border border-bakery-beige">
          <span className="text-[10px] text-bakery-muted uppercase font-semibold">Average Ticket</span>
          <p className="text-lg sm:text-xl font-display font-bold text-status-green">
            ₱{Number(summary?.average_sale || 0).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Tab Switcher: Sales History vs Customer Inquiries */}
      <div className="flex items-center gap-2 border-b border-bakery-beige pb-2">
        <button
          onClick={() => setActiveTab('SALES')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
            activeTab === 'SALES'
              ? 'bg-bakery-chocolate text-white shadow-warm-xs'
              : 'bg-bakery-ivory text-bakery-chocolate border border-bakery-beige hover:bg-bakery-cream'
          }`}
        >
          <ReceiptText className="w-4 h-4 text-bakery-caramel" />
          <span>Completed Sales Log ({sales.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('INQUIRIES')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
            activeTab === 'INQUIRIES'
              ? 'bg-bakery-chocolate text-white shadow-warm-xs'
              : 'bg-bakery-ivory text-bakery-chocolate border border-bakery-beige hover:bg-bakery-cream'
          }`}
        >
          <ShoppingBag className="w-4 h-4 text-bakery-caramel" />
          <span>Customer Pre-Orders &amp; Inquiries</span>
          {inquiries.filter((i) => i.status === 'PENDING').length > 0 && (
            <span className="w-5 h-5 rounded-full bg-status-orange text-white text-[10px] flex items-center justify-center font-bold animate-pulse">
              {inquiries.filter((i) => i.status === 'PENDING').length}
            </span>
          )}
        </button>

        <Link
          to="/orders"
          className="ml-auto hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-bakery-cream hover:bg-bakery-beige/60 border border-bakery-beige text-bakery-chocolate text-xs font-bold transition-colors"
          title="Go to dedicated Customer Orders feature"
        >
          <ShoppingBag className="w-3.5 h-3.5 text-bakery-caramel" />
          <span>Dedicated Orders Module</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {activeTab === 'SALES' ? (
        <>
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-bakery-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search receipt # or customer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-bakery-ivory border border-bakery-beige text-xs text-bakery-espresso focus:outline-hidden focus:border-bakery-caramel"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 text-xs">
              {['ALL', 'GCash', 'Cash', 'QR Ph', 'Bank Transfer'].map((m) => (
                <button
                  key={m}
                  onClick={() => setPaymentFilter(m)}
                  className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-colors ${
                    paymentFilter === m
                      ? 'bg-bakery-chocolate text-white'
                      : 'bg-bakery-ivory border border-bakery-beige text-bakery-espresso hover:bg-bakery-cream'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Sales Orders Table */}
          <div className="rounded-2xl bg-bakery-ivory border border-bakery-beige shadow-warm-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-bakery-cream border-b border-bakery-beige text-bakery-chocolate font-bold">
                    <th className="py-3 px-4">Receipt #</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Items Summary</th>
                    <th className="py-3 px-4">Payment</th>
                    <th className="py-3 px-4 text-right">Subtotal (₱)</th>
                    <th className="py-3 px-4 text-right">Total Sales (₱)</th>
                    <th className="py-3 px-4 text-right">Gross Profit (₱)</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-bakery-beige/60">
                  {filteredSales.length > 0 ? (
                    filteredSales.map((s) => (
                      <tr key={s.id} className="hover:bg-bakery-cream/30 transition-colors">
                        <td className="py-3 px-4 font-bold text-bakery-chocolate">
                          {s.receipt_number}
                        </td>
                        <td className="py-3 px-4 text-bakery-muted">{s.sale_date}</td>
                        <td className="py-3 px-4 font-semibold text-bakery-espresso">
                          {s.customer_name || 'Walk-in'}
                        </td>
                        <td className="py-3 px-4 text-bakery-muted max-w-xs truncate">
                          {s.items?.map((it) => `${it.display_name} (x${it.quantity})`).join(', ') || 'Item'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-bakery-cream text-bakery-chocolate border border-bakery-beige">
                            {s.payment_method}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-medium">
                          ₱{Number(s.subtotal).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-display font-bold text-bakery-chocolate">
                          ₱{Number(s.total_sales).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-bakery-caramel">
                          ₱{Number(s.gross_profit).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <a
                              href={api.getSaleReceiptPdfUrl(s.id)}
                              target="_blank"
                              rel="noopener noreferrer"
                              download
                              title="Download Official PDF Receipt"
                              className="p-1.5 rounded-lg hover:bg-bakery-cream text-bakery-chocolate border border-bakery-beige flex items-center justify-center"
                            >
                              <FileText className="w-3.5 h-3.5 text-bakery-chocolate" />
                            </a>

                            <button
                              onClick={() => setViewReceipt(s)}
                              title="Print / View Receipt"
                              className="p-1.5 rounded-lg hover:bg-bakery-cream text-bakery-chocolate border border-bakery-beige"
                            >
                              <Printer className="w-3.5 h-3.5 text-bakery-caramel" />
                            </button>

                            <button
                              onClick={() => openEditSaleModal(s)}
                              title="Edit Customer, Date, or Payment Method"
                              className="p-1.5 rounded-lg hover:bg-bakery-cream text-bakery-chocolate border border-bakery-beige"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleUndoSale(s)}
                              disabled={cancellingSaleId === s.id}
                              title="Undo / Cancel sale & return finished stock"
                              className="p-1.5 rounded-lg hover:bg-status-redLight text-status-red border border-status-red/30"
                            >
                              <RotateCcw className={`w-3.5 h-3.5 ${cancellingSaleId === s.id ? 'animate-spin' : ''}`} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-xs text-bakery-muted">
                        No sales recorded yet. Click &ldquo;Record Sale&rdquo; to log your first order.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Customer Pre-Orders & Online Inquiries Tab */
        <div className="rounded-2xl bg-bakery-ivory border border-bakery-beige shadow-warm-sm overflow-hidden">
          <div className="p-4 bg-bakery-cream/50 border-b border-bakery-beige flex items-center justify-between">
            <div>
              <h3 className="font-display font-bold text-base text-bakery-chocolate">
                Online Pre-Orders & Customer Inquiries
              </h3>
              <p className="text-[11px] text-bakery-muted">
                Submitted in real-time from the CRAVEABLES public storefront
              </p>
            </div>
            <span className="text-xs font-semibold text-bakery-caramel">
              {inquiries.length} Inquiries Total
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-bakery-cream border-b border-bakery-beige text-bakery-chocolate font-bold">
                  <th className="py-3 px-4">Inquiry Ref</th>
                  <th className="py-3 px-4">Customer & Mobile</th>
                  <th className="py-3 px-4">Target Date</th>
                  <th className="py-3 px-4">Treats Requested</th>
                  <th className="py-3 px-4 text-right">Estimated Total (₱)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bakery-beige/60">
                {inquiries.length > 0 ? (
                  inquiries.map((inq) => {
                    const isPending = inq.status === 'PENDING';
                    const isConfirmed = inq.status === 'CONFIRMED';
                    const isCompleted = inq.status === 'COMPLETED';

                    return (
                      <tr key={inq.id} className="hover:bg-bakery-cream/30 transition-colors">
                        <td className="py-3 px-4 font-bold text-bakery-chocolate">
                          {inq.inquiry_number}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-semibold text-bakery-chocolate">{inq.customer_name}</p>
                          <a href={`tel:${inq.customer_phone}`} className="text-[11px] text-bakery-caramel hover:underline flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            <span>{inq.customer_phone}</span>
                          </a>
                        </td>
                        <td className="py-3 px-4 text-bakery-muted">
                          {inq.target_date || 'ASAP'}
                        </td>
                        <td className="py-3 px-4 text-bakery-espresso/90 max-w-sm truncate">
                          {inq.items_summary.replace(/\*([^*]+)\*/g, '$1')}
                        </td>
                        <td className="py-3 px-4 text-right font-display font-bold text-bakery-chocolate">
                          ₱{Number(inq.estimated_total).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-center">
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
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {isPending && (
                              <button
                                onClick={() => handleInquiryStatusChange(inq.id, 'CONFIRMED')}
                                title="Confirm order"
                                className="px-2.5 py-1 rounded-lg bg-bakery-cream border border-bakery-beige text-bakery-chocolate hover:bg-bakery-beige text-[11px] font-semibold"
                              >
                                Confirm
                              </button>
                            )}

                            {!isCompleted && inq.status !== 'CANCELLED' && (
                              <button
                                onClick={() => handleConvertInquiry(inq.id)}
                                title="Convert to completed sale"
                                className="px-2.5 py-1 rounded-lg bg-bakery-chocolate text-white text-[11px] font-semibold hover:bg-[#2c1108] shadow-2xs flex items-center gap-1"
                              >
                                <CheckCircle2 className="w-3 h-3 text-status-green" />
                                <span>Record Sale</span>
                              </button>
                            )}

                            <button
                              onClick={() => handleDeleteInquiry(inq.id)}
                              title="Delete inquiry"
                              className="p-1 rounded-lg hover:bg-status-redLight text-bakery-muted hover:text-status-red"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-xs text-bakery-muted">
                      No online customer inquiries yet. Inquiries placed from the customer storefront will appear here.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Record New Sale Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-bakery-ivory rounded-2xl border border-bakery-beige p-6 shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <h3 className="font-display font-bold text-lg text-bakery-chocolate mb-1">
              Record New Product Sale
            </h3>
            <p className="text-xs text-bakery-muted mb-4">
              Select products, quantities, payment method, and discounts.
            </p>

            <form onSubmit={handleSubmitSale} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-bakery-chocolate mb-1">
                    Sale Date
                  </label>
                  <input
                    type="date"
                    required
                    value={saleDate}
                    onChange={(e) => setSaleDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-bakery-chocolate mb-1">
                    Customer Name (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Walk-in or customer name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-bakery-chocolate mb-1">
                  Payment Method *
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {['GCash', 'Cash', 'QR Ph', 'Bank Transfer'].map((m) => (
                    <button
                      type="button"
                      key={m}
                      onClick={() => setPaymentMethod(m)}
                      className={`py-2 px-1 text-center rounded-xl font-semibold border transition-all text-xs ${
                        paymentMethod === m
                          ? 'bg-bakery-chocolate text-white border-bakery-chocolate shadow-xs'
                          : 'bg-white border-bakery-beige text-bakery-espresso hover:bg-bakery-cream'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Items in Cart */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="font-bold text-bakery-chocolate">
                    Ordered Products
                  </label>
                  <button
                    type="button"
                    onClick={handleAddCartItem}
                    className="text-xs font-semibold text-bakery-caramel hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Item
                  </button>
                </div>

                <div className="space-y-2">
                  {cartItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 rounded-xl bg-white border border-bakery-beige">
                      <select
                        value={item.product_variant}
                        onChange={(e) => handleCartItemChange(idx, 'product_variant', e.target.value)}
                        className="flex-1 px-2.5 py-1.5 rounded-lg border border-bakery-beige text-xs font-medium"
                      >
                        {variants.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.product_name} — {v.name} (₱{Number(v.selling_price).toFixed(2)})
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => handleCartItemChange(idx, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-16 px-2 py-1.5 rounded-lg border border-bakery-beige text-xs font-bold text-center"
                      />
                      <span className="w-20 text-right font-display font-bold text-bakery-chocolate text-sm">
                        ₱{(item.selling_price * item.quantity).toFixed(2)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCartItem(idx)}
                        className="p-1 text-status-red hover:bg-status-redLight rounded"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-bakery-chocolate mb-1">
                    Overall Discount (₱)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={orderDiscount}
                    onChange={(e) => setOrderDiscount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-bakery-chocolate mb-1">
                    Sale Notes
                  </label>
                  <input
                    type="text"
                    placeholder="Special packaging or gift note"
                    value={saleNotes}
                    onChange={(e) => setSaleNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Total Summary preview */}
              <div className="p-4 rounded-xl bg-bakery-cream border border-bakery-beige flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-bakery-muted uppercase block">Total Sale Amount</span>
                  <span className="font-display font-bold text-xl text-bakery-chocolate">
                    ₱{computedTotal.toFixed(2)}
                  </span>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-bakery-chocolate text-white">
                  Payment: {paymentMethod}
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-bakery-beige">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-bakery-beige text-bakery-muted hover:bg-bakery-cream"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-bakery-chocolate text-white font-semibold hover:bg-[#2c1108]"
                >
                  Complete Sale
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Receipt Dialog */}
      {viewReceipt && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-2xl border border-bakery-beige p-6 shadow-2xl animate-in fade-in zoom-in-95 text-xs text-bakery-espresso">
            {/* Bakery Brand Header */}
            <div className="text-center pb-4 border-b border-dashed border-bakery-beige">
              <img src="/logo.png" alt="CRAVEABLES" className="w-12 h-12 mx-auto rounded-full mb-1" />
              <h3 className="font-display font-bold text-lg text-bakery-chocolate tracking-wide">
                CRAVEABLES
              </h3>
              <p className="text-[10px] text-bakery-muted uppercase">Artisanal Bakery &bull; Official Receipt</p>
              <p className="text-[11px] font-bold text-bakery-chocolate mt-2">
                Receipt #: {viewReceipt.receipt_number}
              </p>
              <p className="text-[10px] text-bakery-muted">{viewReceipt.sale_date}</p>
            </div>

            {/* Receipt Items */}
            <div className="py-4 space-y-2 border-b border-dashed border-bakery-beige">
              {viewReceipt.items?.map((it, idx) => (
                <div key={idx} className="flex justify-between">
                  <div className="pr-2">
                    <p className="font-semibold text-bakery-chocolate">{it.display_name}</p>
                    <p className="text-[10px] text-bakery-muted">
                      {it.quantity} x ₱{Number(it.selling_price).toFixed(2)}
                    </p>
                  </div>
                  <span className="font-bold text-bakery-chocolate">
                    ₱{Number(it.total_price).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            {/* Receipt Totals */}
            <div className="py-3 space-y-1 text-xs">
              <div className="flex justify-between text-bakery-muted">
                <span>Subtotal:</span>
                <span>₱{Number(viewReceipt.subtotal).toFixed(2)}</span>
              </div>
              {Number(viewReceipt.discount) > 0 && (
                <div className="flex justify-between text-status-orange">
                  <span>Discount:</span>
                  <span>-₱{Number(viewReceipt.discount).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-display font-bold text-sm text-bakery-chocolate pt-1 border-t border-bakery-beige">
                <span>Total Amount:</span>
                <span>₱{Number(viewReceipt.total_sales).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[11px] text-bakery-muted pt-1">
                <span>Payment Method:</span>
                <span className="font-bold">{viewReceipt.payment_method}</span>
              </div>
            </div>

            <div className="text-center pt-3 border-t border-dashed border-bakery-beige text-[10px] text-bakery-muted">
              Thank you for craving with us! 🤎
            </div>

            <div className="pt-4 flex items-center gap-2">
              <a
                href={api.getSaleReceiptPdfUrl(viewReceipt.id)}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="flex-1 py-2 rounded-xl bg-bakery-cream border border-bakery-beige text-bakery-chocolate text-xs font-semibold hover:bg-bakery-beige flex items-center justify-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5 text-bakery-chocolate" />
                <span>Download PDF</span>
              </a>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-2 rounded-xl bg-bakery-cream border border-bakery-beige text-bakery-chocolate text-xs font-semibold hover:bg-bakery-beige flex items-center justify-center gap-1"
                title="Print Receipt"
              >
                <Printer className="w-3.5 h-3.5 text-bakery-chocolate" />
              </button>
              <button
                type="button"
                onClick={() => setViewReceipt(null)}
                className="flex-1 py-2 rounded-xl bg-bakery-chocolate text-white text-xs font-semibold hover:bg-[#2c1108]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Edit Sale Modal */}
      {editSale && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-bakery-ivory rounded-2xl border border-bakery-beige p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-bakery-beige">
              <div>
                <h3 className="font-display font-bold text-base text-bakery-chocolate">
                  Edit Sale Record
                </h3>
                <p className="text-[10px] text-bakery-muted">{editSale.receipt_number}</p>
              </div>
              <button
                onClick={() => setEditSale(null)}
                className="p-1 rounded-lg text-bakery-muted hover:text-bakery-chocolate"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveSaleEdit} className="space-y-4 py-4 text-xs">
              <div>
                <label className="block font-semibold text-bakery-chocolate mb-1">Customer Name</label>
                <input
                  type="text"
                  required
                  value={editCustomerName}
                  onChange={(e) => setEditCustomerName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-bakery-chocolate mb-1">Sale Date</label>
                  <input
                    type="date"
                    required
                    value={editSaleDate}
                    onChange={(e) => setEditSaleDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-bakery-chocolate mb-1">Payment Method</label>
                  <select
                    value={editPaymentMethod}
                    onChange={(e) => setEditPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige focus:outline-hidden"
                  >
                    <option value="Cash">Cash</option>
                    <option value="GCash">GCash</option>
                    <option value="QR Ph">QR Ph</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-bakery-chocolate mb-1">Sale Notes</label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Special instructions or customer remarks..."
                  className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige focus:outline-hidden resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-bakery-beige">
                <button
                  type="button"
                  onClick={() => setEditSale(null)}
                  className="px-3.5 py-2 rounded-xl border border-bakery-beige text-bakery-chocolate hover:bg-bakery-cream"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSaleEdit}
                  className="px-4 py-2 rounded-xl bg-bakery-chocolate text-white font-semibold hover:bg-[#2c1108] disabled:opacity-50"
                >
                  {savingSaleEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

