import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Search,
  Plus,
  Phone,
  Calendar,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Printer,
  Edit3,
  Trash2,
  RotateCcw,
  ChefHat,
  ReceiptText,
  Layers,
  ArrowRight,
  ExternalLink,
  FileText,
  X,
  Check,
  RefreshCw,
  Eye,
  User,
  MessageSquare,
  Star,
  ThumbsUp,
  MapPin,
  ShieldCheck
} from 'lucide-react';
import { api } from '../services/api';
import { CustomerInquiry, ProductVariant, CustomerReview } from '../types';

export const OrdersPage: React.FC = () => {
  const [pageTab, setPageTab] = useState<'ORDERS' | 'REVIEWS'>('ORDERS');
  const [inquiries, setInquiries] = useState<CustomerInquiry[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [reviews, setReviews] = useState<CustomerReview[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'CONFIRMED' | 'BAKING' | 'COMPLETED' | 'CANCELLED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'TARGET_DATE' | 'NEWEST'>('TARGET_DATE');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Reviews Filtering
  const [reviewStatusFilter, setReviewStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED'>('ALL');
  const [reviewSearchQuery, setReviewSearchQuery] = useState('');

  // Convert to Sale Modal
  const [convertingInquiry, setConvertingInquiry] = useState<CustomerInquiry | null>(null);
  const [convertPaymentMethod, setConvertPaymentMethod] = useState<'GCash' | 'Cash' | 'Bank Transfer'>('GCash');
  const [convertingLoading, setConvertingLoading] = useState(false);

  // Kitchen Slip / Print Modal
  const [slipInquiry, setSlipInquiry] = useState<CustomerInquiry | null>(null);

  // Create Manual Pre-Order Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newTargetDate, setNewTargetDate] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newStatus, setNewStatus] = useState<'PENDING' | 'CONFIRMED'>('PENDING');
  const [newOrderItems, setNewOrderItems] = useState<{ [variantName: string]: { name: string; price: number; qty: number } }>({});
  const [creatingOrder, setCreatingOrder] = useState(false);

  // Edit Order Modal
  const [editInquiry, setEditInquiry] = useState<CustomerInquiry | null>(null);
  const [editCustName, setEditCustName] = useState('');
  const [editCustPhone, setEditCustPhone] = useState('');
  const [editTargetDate, setEditTargetDate] = useState('');
  const [editItemsSummary, setEditItemsSummary] = useState('');
  const [editEstTotal, setEditEstTotal] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editStatus, setEditStatus] = useState<'PENDING' | 'CONFIRMED' | 'BAKING' | 'COMPLETED' | 'CANCELLED'>('PENDING');
  const [savingEdit, setSavingEdit] = useState(false);

  // Standard menu catalog for quick add
  const QUICK_MENU = [
    { name: 'Banana Cake — Small', price: 60 },
    { name: 'Banana Cake — Big', price: 135 },
    { name: 'Classic Brownies — Small Box (3 pcs)', price: 110 },
    { name: 'Classic Brownies — Big Box (6 pcs)', price: 220 },
    { name: 'Red Velvet Cookies — Box of 6', price: 210 },
    { name: 'Red Velvet Cookies — Assorted', price: 190 },
    { name: 'Choco Chip Cookies — Box of 6', price: 180 },
    { name: 'Choco Chip Cookies — Assorted', price: 190 },
  ];

  const fetchData = async () => {
    try {
      setLoading(true);
      const [inqs, vars, revs] = await Promise.all([
        api.getInquiries(),
        api.getVariants().catch(() => []),
        api.getReviews({ all: true }).catch(() => []),
      ]);
      setInquiries(inqs);
      setVariants(vars);
      setReviews(revs);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleApproveReview = async (id: number) => {
    try {
      await api.approveReview(id);
      const revs = await api.getReviews({ all: true });
      setReviews(revs);
    } catch (err: any) {
      alert(err.message || 'Failed to approve review');
    }
  };

  const handleRejectReview = async (id: number) => {
    try {
      await api.rejectReview(id);
      const revs = await api.getReviews({ all: true });
      setReviews(revs);
    } catch (err: any) {
      alert(err.message || 'Failed to hide review');
    }
  };

  const handleDeleteReview = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this customer review?')) return;
    try {
      await api.deleteReview(id);
      const revs = await api.getReviews({ all: true });
      setReviews(revs);
    } catch (err: any) {
      alert(err.message || 'Failed to delete review');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Status updates
  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      await api.updateInquiryStatus(id, status);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to update order status');
    }
  };

  // Convert to Sale
  const handleConfirmConvert = async () => {
    if (!convertingInquiry) return;
    try {
      setConvertingLoading(true);
      await api.convertInquiryToSale(convertingInquiry.id, {
        payment_method: convertPaymentMethod,
      });
      alert(`Order ${convertingInquiry.inquiry_number} successfully converted to official sale!`);
      setConvertingInquiry(null);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to convert order to sale');
    } finally {
      setConvertingLoading(false);
    }
  };

  // Delete Inquiry
  const handleDelete = async (inq: CustomerInquiry) => {
    const confirmMsg = `Are you sure you want to delete order inquiry "${inq.inquiry_number}" for ${inq.customer_name}?\n\nThis action cannot be undone.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await api.deleteInquiry(inq.id);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete order inquiry');
    }
  };

  // Open Edit Modal
  const openEditModal = (inq: CustomerInquiry) => {
    setEditInquiry(inq);
    setEditCustName(inq.customer_name);
    setEditCustPhone(inq.customer_phone);
    setEditTargetDate(inq.target_date || '');
    setEditItemsSummary(inq.items_summary || '');
    setEditEstTotal(String(inq.estimated_total));
    setEditNotes(inq.notes || '');
    setEditStatus(inq.status);
  };

  // Save Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editInquiry) return;

    try {
      setSavingEdit(true);
      await api.updateInquiry(editInquiry.id, {
        customer_name: editCustName.trim(),
        customer_phone: editCustPhone.trim(),
        target_date: editTargetDate || null,
        items_summary: editItemsSummary,
        estimated_total: parseFloat(editEstTotal) || 0,
        notes: editNotes,
        status: editStatus,
      });
      setEditInquiry(null);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to update order details');
    } finally {
      setSavingEdit(false);
    }
  };

  // Create Manual Order
  const handleCreateManualOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) {
      alert('Please enter a customer name.');
      return;
    }

    const itemsArray = Object.values(newOrderItems);
    if (itemsArray.length === 0) {
      alert('Please add at least one item to this order.');
      return;
    }

    const totalEst = itemsArray.reduce((acc, item) => acc + item.price * item.qty, 0);
    const summaryText = itemsArray
      .map((item) => `${item.qty}x ${item.name} (₱${item.price.toFixed(2)})`)
      .join('\n');

    try {
      setCreatingOrder(true);
      await api.createInquiry({
        customer_name: newCustName.trim(),
        customer_phone: newCustPhone.trim(),
        target_date: newTargetDate || null,
        items_summary: summaryText,
        items_json: itemsArray,
        estimated_total: totalEst,
        notes: newNotes,
        status: newStatus,
      });
      setIsCreateModalOpen(false);
      // Reset form
      setNewCustName('');
      setNewCustPhone('');
      setNewTargetDate('');
      setNewNotes('');
      setNewOrderItems({});
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to create pre-order');
    } finally {
      setCreatingOrder(false);
    }
  };

  const handleQuickAddItem = (item: { name: string; price: number }) => {
    setNewOrderItems((prev) => {
      const cur = prev[item.name] || { name: item.name, price: item.price, qty: 0 };
      return {
        ...prev,
        [item.name]: { ...cur, qty: cur.qty + 1 },
      };
    });
  };

  const handleQuickRemoveItem = (itemName: string) => {
    setNewOrderItems((prev) => {
      const cur = prev[itemName];
      if (!cur) return prev;
      if (cur.qty <= 1) {
        const next = { ...prev };
        delete next[itemName];
        return next;
      }
      return {
        ...prev,
        [itemName]: { ...cur, qty: cur.qty - 1 },
      };
    });
  };

  // Counts & Stats
  const totalInquiries = inquiries.length;
  const pendingCount = inquiries.filter((i) => i.status === 'PENDING').length;
  const confirmedCount = inquiries.filter((i) => i.status === 'CONFIRMED').length;
  const bakingCount = inquiries.filter((i) => i.status === 'BAKING').length;
  const completedCount = inquiries.filter((i) => i.status === 'COMPLETED').length;
  const cancelledCount = inquiries.filter((i) => i.status === 'CANCELLED').length;

  const totalActiveValue = inquiries
    .filter((i) => i.status === 'PENDING' || i.status === 'CONFIRMED' || i.status === 'BAKING')
    .reduce((sum, i) => sum + Number(i.estimated_total || 0), 0);

  // Filter & Search logic
  const filteredInquiries = inquiries
    .filter((inq) => {
      if (statusFilter !== 'ALL' && inq.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = inq.customer_name?.toLowerCase().includes(q);
        const matchPhone = inq.customer_phone?.toLowerCase().includes(q);
        const matchNum = inq.inquiry_number?.toLowerCase().includes(q);
        const matchNotes = inq.notes?.toLowerCase().includes(q);
        const matchItems = inq.items_summary?.toLowerCase().includes(q);
        return matchName || matchPhone || matchNum || matchNotes || matchItems;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'TARGET_DATE') {
        if (!a.target_date && !b.target_date) return 0;
        if (!a.target_date) return 1;
        if (!b.target_date) return -1;
        return a.target_date.localeCompare(b.target_date);
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  // Reviews counts & filtering
  const pendingReviewsCount = reviews.filter((r) => !r.is_approved).length;
  const approvedReviewsCount = reviews.filter((r) => r.is_approved).length;
  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : '5.0';

  const filteredReviews = reviews.filter((rev) => {
    if (reviewStatusFilter === 'PENDING' && rev.is_approved) return false;
    if (reviewStatusFilter === 'APPROVED' && !rev.is_approved) return false;
    if (reviewSearchQuery.trim()) {
      const q = reviewSearchQuery.toLowerCase();
      const matchName = rev.customer_name?.toLowerCase().includes(q);
      const matchLoc = rev.customer_location?.toLowerCase().includes(q);
      const matchProd = rev.product_name?.toLowerCase().includes(q);
      const matchComment = rev.comment?.toLowerCase().includes(q);
      return matchName || matchLoc || matchProd || matchComment;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Page Header & Module Tab Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-bakery-beige/60">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display font-bold text-2xl sm:text-3xl text-bakery-chocolate">
              Customer Orders &amp; Storefront Hub
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-bakery-muted mt-1">
            Manage incoming pre-orders, kitchen baking slips, and customer reviews &amp; ratings for Dyna, Jeremy, and Anne.
          </p>
        </div>

        {/* Tab Switcher & Header Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center bg-bakery-cream p-1 rounded-2xl border border-bakery-beige shadow-2xs">
            <button
              onClick={() => setPageTab('ORDERS')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${pageTab === 'ORDERS'
                  ? 'bg-bakery-chocolate text-white shadow-warm-xs'
                  : 'text-bakery-chocolate hover:text-bakery-caramel'
                }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Customer Orders</span>
              {pendingCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-status-orange text-white">
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setPageTab('REVIEWS')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${pageTab === 'REVIEWS'
                  ? 'bg-bakery-chocolate text-white shadow-warm-xs'
                  : 'text-bakery-chocolate hover:text-bakery-caramel'
                }`}
            >
              <Star className="w-3.5 h-3.5" />
              <span>Customer Reviews</span>
              {pendingReviewsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-status-orange text-white animate-pulse">
                  {pendingReviewsCount} Pending
                </span>
              )}
            </button>
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2.5 rounded-xl bg-bakery-ivory border border-bakery-beige hover:border-bakery-caramel text-bakery-chocolate text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1.5"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 text-bakery-caramel ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {pageTab === 'ORDERS' && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-bakery-chocolate text-white text-xs font-bold hover:bg-[#2c1108] shadow-warm-sm transition-transform active:scale-95 flex items-center gap-2"
            >
              <Plus className="w-4 h-4 text-bakery-caramel" />
              <span>Record Pre-Order</span>
            </button>
          )}
        </div>
      </div>

      {pageTab === 'ORDERS' ? (
        <>
          {/* Top Metrics Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
            {/* Total Inquiries */}
            <div className="p-4 rounded-2xl bg-bakery-ivory border border-bakery-beige shadow-warm-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-bakery-muted uppercase tracking-wider">Total Orders</span>
                <div className="p-1.5 rounded-lg bg-bakery-cream text-bakery-chocolate">
                  <ShoppingBag className="w-4 h-4 text-bakery-caramel" />
                </div>
              </div>
              <p className="text-2xl font-display font-bold text-bakery-chocolate">{totalInquiries}</p>
              <p className="text-[10px] text-bakery-muted mt-0.5">All time logged</p>
            </div>

            {/* Pending Action */}
            <div className="p-4 rounded-2xl bg-bakery-ivory border border-bakery-beige shadow-warm-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-status-orange uppercase tracking-wider">Action Needed</span>
                <div className="p-1.5 rounded-lg bg-status-orangeLight text-status-orange">
                  <AlertCircle className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-display font-bold text-status-orange">{pendingCount}</p>
              <p className="text-[10px] text-bakery-muted mt-0.5">Awaiting confirmation</p>
            </div>

            {/* Baking in Kitchen */}
            <div className="p-4 rounded-2xl bg-bakery-ivory border border-bakery-beige shadow-warm-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-bakery-caramel uppercase tracking-wider">In Kitchen</span>
                <div className="p-1.5 rounded-lg bg-bakery-cream text-bakery-caramel">
                  <ChefHat className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-display font-bold text-bakery-caramel">{bakingCount}</p>
              <p className="text-[10px] text-bakery-muted mt-0.5">Currently baking</p>
            </div>

            {/* Converted & Completed */}
            <div className="p-4 rounded-2xl bg-bakery-ivory border border-bakery-beige shadow-warm-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-status-green uppercase tracking-wider">Completed</span>
                <div className="p-1.5 rounded-lg bg-status-greenLight text-status-green">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-display font-bold text-status-green">{completedCount}</p>
              <p className="text-[10px] text-bakery-muted mt-0.5">Sold &amp; delivered</p>
            </div>

            {/* Inquired Order Value */}
            <div className="p-4 rounded-2xl bg-bakery-chocolate text-white shadow-warm-xs col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-bakery-cream uppercase tracking-wider">Active Pipeline</span>
                <div className="p-1.5 rounded-lg bg-bakery-caramel text-white">
                  <ReceiptText className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-display font-bold text-bakery-cream">₱{totalActiveValue.toFixed(2)}</p>
              <p className="text-[10px] text-bakery-beige/70 mt-0.5">Pending + Baking value</p>
            </div>
          </div>

          {/* Filter Tabs, Search Bar & View Mode */}
          <div className="p-4 sm:p-5 rounded-2xl bg-bakery-ivory border border-bakery-beige shadow-warm-xs space-y-4">
            {/* Status Filter Tabs */}
            <div className="flex flex-wrap items-center gap-2 border-b border-bakery-beige/70 pb-3">
              {[
                { id: 'ALL', label: 'All Orders', count: totalInquiries },
                { id: 'PENDING', label: 'Pending Review', count: pendingCount, highlight: 'bg-status-orange text-white' },
                { id: 'CONFIRMED', label: 'Confirmed', count: confirmedCount },
                { id: 'BAKING', label: 'Baking / Kitchen', count: bakingCount },
                { id: 'COMPLETED', label: 'Sold / Completed', count: completedCount },
                { id: 'CANCELLED', label: 'Cancelled', count: cancelledCount },
              ].map((tab) => {
                const active = statusFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setStatusFilter(tab.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${active
                        ? 'bg-bakery-chocolate text-white shadow-warm-xs'
                        : 'bg-bakery-cream text-bakery-chocolate border border-bakery-beige hover:border-bakery-caramel'
                      }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] ${active ? 'bg-bakery-caramel text-white' : 'bg-white text-bakery-chocolate border border-bakery-beige'
                        }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search, Sort and Layout View Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-bakery-muted" />
                <input
                  type="text"
                  placeholder="Search by customer, phone, inquiry #, or item..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-bakery-beige focus:outline-hidden focus:border-bakery-caramel text-xs text-bakery-espresso placeholder-bakery-muted"
                />
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto text-xs">
                {/* Sort Dropdown */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-2 rounded-xl bg-white border border-bakery-beige text-xs font-semibold text-bakery-chocolate focus:outline-hidden"
                >
                  <option value="TARGET_DATE">Sort by Date Needed (Soonest)</option>
                  <option value="NEWEST">Sort by Newest Received</option>
                </select>

                {/* View Mode Toggle */}
                <div className="flex items-center bg-bakery-cream rounded-xl border border-bakery-beige p-0.5">
                  <button
                    onClick={() => setViewMode('cards')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${viewMode === 'cards' ? 'bg-bakery-chocolate text-white shadow-xs' : 'text-bakery-chocolate hover:text-bakery-caramel'
                      }`}
                    title="Order Slips Card View"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Cards</span>
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${viewMode === 'table' ? 'bg-bakery-chocolate text-white shadow-xs' : 'text-bakery-chocolate hover:text-bakery-caramel'
                      }`}
                    title="Table View"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Table</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Orders List / Cards View */}
          {loading ? (
            <div className="p-12 text-center bg-bakery-ivory rounded-3xl border border-bakery-beige">
              <div className="w-8 h-8 border-3 border-bakery-chocolate border-t-bakery-caramel rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-bakery-muted">Loading live customer orders...</p>
            </div>
          ) : filteredInquiries.length === 0 ? (
            <div className="p-12 text-center bg-bakery-ivory rounded-3xl border border-bakery-beige space-y-3">
              <ShoppingBag className="w-10 h-10 text-bakery-muted mx-auto" />
              <h3 className="font-display font-bold text-lg text-bakery-chocolate">No Orders Found</h3>
              <p className="text-xs text-bakery-muted max-w-sm mx-auto">
                {searchQuery
                  ? `No inquiries match "${searchQuery}". Try clearing search keywords.`
                  : `No orders in status "${statusFilter}". New customer orders from your storefront will appear here instantly.`}
              </p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-bakery-chocolate text-white text-xs font-bold hover:bg-[#2c1108] inline-flex items-center gap-1.5 mt-2"
              >
                <Plus className="w-3.5 h-3.5 text-bakery-caramel" />
                <span>Create a Walk-In / Phone Pre-Order</span>
              </button>
            </div>
          ) : viewMode === 'cards' ? (
            /* Cards View: Order Slips */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredInquiries.map((inq) => {
                const isPending = inq.status === 'PENDING';
                const isConfirmed = inq.status === 'CONFIRMED';
                const isBaking = inq.status === 'BAKING';
                const isCompleted = inq.status === 'COMPLETED';
                const isCancelled = inq.status === 'CANCELLED';

                return (
                  <div
                    key={inq.id}
                    className={`rounded-3xl border-2 transition-all duration-200 bg-white shadow-warm-xs hover:shadow-warm-md flex flex-col justify-between overflow-hidden ${isPending
                        ? 'border-status-orange/40 hover:border-status-orange'
                        : isBaking
                          ? 'border-bakery-caramel/50 hover:border-bakery-caramel'
                          : 'border-bakery-beige hover:border-bakery-caramel/70'
                      }`}
                  >
                    {/* Card Header */}
                    <div className="p-5 pb-3 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-bakery-cream text-bakery-chocolate border border-bakery-beige">
                            {inq.inquiry_number}
                          </span>
                          <h3 className="font-display font-bold text-lg text-bakery-chocolate mt-1.5">
                            {inq.customer_name}
                          </h3>
                        </div>

                        {/* Status Badge */}
                        <span
                          className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${isPending
                              ? 'bg-status-orangeLight text-status-orange border-status-orange/30'
                              : isConfirmed
                                ? 'bg-status-blueLight text-status-blue border-status-blue/30'
                                : isBaking
                                  ? 'bg-bakery-cream text-bakery-caramel border-bakery-caramel/40'
                                  : isCompleted
                                    ? 'bg-status-greenLight text-status-green border-status-green/30'
                                    : 'bg-status-redLight text-status-red border-status-red/30'
                            }`}
                        >
                          {inq.status}
                        </span>
                      </div>

                      {/* Customer Contact & Target Date */}
                      <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                        <div className="p-2 rounded-xl bg-bakery-cream/60 border border-bakery-beige/60">
                          <span className="text-[10px] font-semibold text-bakery-muted uppercase block">Contact Phone</span>
                          <a
                            href={`tel:${inq.customer_phone}`}
                            className="font-bold text-bakery-chocolate hover:text-bakery-caramel flex items-center gap-1 mt-0.5"
                          >
                            <Phone className="w-3 h-3 text-bakery-caramel shrink-0" />
                            <span className="truncate">{inq.customer_phone || 'No phone provided'}</span>
                          </a>
                        </div>

                        <div className="p-2 rounded-xl bg-bakery-cream/60 border border-bakery-beige/60">
                          <span className="text-[10px] font-semibold text-bakery-muted uppercase block">Date Needed</span>
                          <div className="font-bold text-bakery-chocolate flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3 text-bakery-caramel shrink-0" />
                            <span className="truncate">{inq.target_date || 'Earliest Batch'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Items Ordered List */}
                      <div className="p-3 rounded-2xl bg-bakery-cream/40 border border-bakery-beige space-y-1.5">
                        <span className="text-[10px] font-bold text-bakery-muted uppercase tracking-wider block">
                          Ordered Treats:
                        </span>
                        <p className="text-xs text-bakery-espresso/90 whitespace-pre-line leading-relaxed font-medium">
                          {inq.items_summary ? inq.items_summary.replace(/\*([^*]+)\*/g, '$1') : 'Custom inquiry'}
                        </p>
                      </div>

                      {/* Notes / Special Requests */}
                      {inq.notes && (
                        <div className="p-2.5 rounded-xl bg-[#FFF5E6] border border-[#F3D5B5] text-xs text-bakery-espresso">
                          <div className="flex items-center gap-1 text-[10px] font-bold text-bakery-caramel uppercase mb-0.5">
                            <MessageSquare className="w-3 h-3" />
                            <span>Special Instructions:</span>
                          </div>
                          <p className="text-[11px] italic leading-tight text-bakery-espresso/85">
                            &ldquo;{inq.notes}&rdquo;
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Card Footer with Pricing & Actions */}
                    <div className="p-5 pt-3 border-t border-bakery-beige/60 bg-bakery-cream/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-bakery-muted">Estimated Total:</span>
                        <span className="font-display font-bold text-xl text-bakery-caramel">
                          ₱{Number(inq.estimated_total).toFixed(2)}
                        </span>
                      </div>

                      {/* Primary Workflow Actions */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        {/* Primary Button */}
                        {isPending ? (
                          <button
                            onClick={() => handleUpdateStatus(inq.id, 'CONFIRMED')}
                            className="py-2 px-3 rounded-xl bg-bakery-caramel text-white text-xs font-bold hover:bg-[#966736] transition-colors flex items-center justify-center gap-1 shadow-2xs"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Confirm Order</span>
                          </button>
                        ) : isConfirmed ? (
                          <button
                            onClick={() => handleUpdateStatus(inq.id, 'BAKING')}
                            className="py-2 px-3 rounded-xl bg-bakery-chocolate text-white text-xs font-bold hover:bg-[#2c1108] transition-colors flex items-center justify-center gap-1 shadow-2xs"
                          >
                            <ChefHat className="w-3.5 h-3.5 text-bakery-caramel" />
                            <span>Start Baking</span>
                          </button>
                        ) : isBaking ? (
                          <button
                            onClick={() => setConvertingInquiry(inq)}
                            className="py-2 px-3 rounded-xl bg-status-green text-white text-xs font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1 shadow-2xs"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Record as Sale</span>
                          </button>
                        ) : isCompleted ? (
                          <div className="py-2 px-3 rounded-xl bg-status-greenLight text-status-green text-xs font-bold flex items-center justify-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Completed Sale</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleUpdateStatus(inq.id, 'PENDING')}
                            className="py-2 px-3 rounded-xl bg-bakery-ivory border border-bakery-beige text-bakery-chocolate text-xs font-semibold hover:bg-bakery-cream"
                          >
                            Reopen Order
                          </button>
                        )}

                        {/* 1-Click Convert to Sale if not yet completed */}
                        {!isCompleted && !isCancelled && (
                          <button
                            onClick={() => setConvertingInquiry(inq)}
                            className="py-2 px-3 rounded-xl bg-bakery-chocolate text-white text-xs font-bold hover:bg-[#2c1108] transition-colors flex items-center justify-center gap-1 shadow-2xs"
                            title="Convert directly to Sale Order"
                          >
                            <ReceiptText className="w-3.5 h-3.5 text-bakery-caramel" />
                            <span>Record Sale</span>
                          </button>
                        )}
                      </div>

                      {/* Secondary Tools: Print Slip, Edit, Cancel */}
                      <div className="flex items-center justify-between pt-1 border-t border-bakery-beige/50 text-xs">
                        <button
                          onClick={() => setSlipInquiry(inq)}
                          className="text-bakery-chocolate hover:text-bakery-caramel flex items-center gap-1 font-semibold"
                          title="Generate Printable Kitchen Slip"
                        >
                          <Printer className="w-3.5 h-3.5 text-bakery-caramel" />
                          <span>Baking Slip</span>
                        </button>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditModal(inq)}
                            className="p-1 rounded-lg text-bakery-muted hover:text-bakery-chocolate hover:bg-bakery-cream transition-colors"
                            title="Edit Order Details"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {inq.status !== 'CANCELLED' ? (
                            <button
                              onClick={() => handleUpdateStatus(inq.id, 'CANCELLED')}
                              className="p-1 rounded-lg text-bakery-muted hover:text-status-red hover:bg-status-redLight/30 transition-colors"
                              title="Cancel Order"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          ) : null}

                          <button
                            onClick={() => handleDelete(inq)}
                            className="p-1 rounded-lg text-bakery-muted hover:text-status-red hover:bg-status-redLight/30 transition-colors"
                            title="Delete Inquiry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Table View */
            <div className="bg-bakery-ivory rounded-3xl border border-bakery-beige shadow-warm-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-bakery-chocolate">
                  <thead className="bg-[#3B170B] text-bakery-cream uppercase font-bold text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Order #</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Contact</th>
                      <th className="py-3 px-4">Date Needed</th>
                      <th className="py-3 px-4">Items Summary</th>
                      <th className="py-3 px-4 text-right">Total (₱)</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-bakery-beige/60">
                    {filteredInquiries.map((inq) => (
                      <tr key={inq.id} className="hover:bg-bakery-cream/50 transition-colors">
                        <td className="py-3 px-4 font-mono font-semibold text-[11px]">
                          {inq.inquiry_number}
                        </td>
                        <td className="py-3 px-4 font-bold">
                          {inq.customer_name}
                        </td>
                        <td className="py-3 px-4">
                          <a href={`tel:${inq.customer_phone}`} className="hover:underline text-bakery-caramel font-semibold">
                            {inq.customer_phone || '—'}
                          </a>
                        </td>
                        <td className="py-3 px-4 font-medium text-bakery-espresso/80">
                          {inq.target_date || 'ASAP'}
                        </td>
                        <td className="py-3 px-4 max-w-xs truncate text-[11px]" title={inq.items_summary}>
                          {inq.items_summary?.replace(/\n/g, ', ') || '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-display font-bold text-bakery-chocolate">
                          ₱{Number(inq.estimated_total).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${inq.status === 'PENDING'
                                ? 'bg-status-orangeLight text-status-orange'
                                : inq.status === 'CONFIRMED'
                                  ? 'bg-status-blueLight text-status-blue'
                                  : inq.status === 'BAKING'
                                    ? 'bg-bakery-cream text-bakery-caramel'
                                    : inq.status === 'COMPLETED'
                                      ? 'bg-status-greenLight text-status-green'
                                      : 'bg-status-redLight text-status-red'
                              }`}
                          >
                            {inq.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSlipInquiry(inq)}
                              className="p-1 rounded-lg text-bakery-chocolate hover:bg-bakery-cream"
                              title="Print Baking Ticket"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            {inq.status !== 'COMPLETED' && (
                              <button
                                onClick={() => setConvertingInquiry(inq)}
                                className="px-2 py-1 rounded-lg bg-bakery-chocolate text-white text-[10px] font-bold hover:bg-[#2c1108]"
                                title="Record Sale"
                              >
                                Sale
                              </button>
                            )}
                            <button
                              onClick={() => openEditModal(inq)}
                              className="p-1 rounded-lg text-bakery-muted hover:text-bakery-chocolate hover:bg-bakery-cream"
                              title="Edit"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(inq)}
                              className="p-1 rounded-lg text-bakery-muted hover:text-status-red hover:bg-status-redLight/30"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Customer Reviews & Storefront Ratings Management Tab */
        <div className="space-y-6">
          {/* Reviews Top Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Reviews */}
            <div className="p-4 rounded-2xl bg-bakery-ivory border border-bakery-beige shadow-warm-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-bakery-muted uppercase tracking-wider">Total Reviews</span>
                <div className="p-1.5 rounded-lg bg-bakery-cream text-bakery-chocolate">
                  <MessageSquare className="w-4 h-4 text-bakery-caramel" />
                </div>
              </div>
              <p className="text-2xl font-display font-bold text-bakery-chocolate">{reviews.length}</p>
              <p className="text-[10px] text-bakery-muted mt-0.5">Submitted by customers</p>
            </div>

            {/* Pending Approval */}
            <div className="p-4 rounded-2xl bg-bakery-ivory border border-status-orange/40 shadow-warm-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-status-orange uppercase tracking-wider">Needs Approval</span>
                <div className="p-1.5 rounded-lg bg-status-orangeLight text-status-orange">
                  <AlertCircle className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-display font-bold text-status-orange">{pendingReviewsCount}</p>
              <p className="text-[10px] text-bakery-muted mt-0.5">Hidden until approved</p>
            </div>

            {/* Live on Storefront */}
            <div className="p-4 rounded-2xl bg-bakery-ivory border border-status-green/40 shadow-warm-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-status-green uppercase tracking-wider">Live on Storefront</span>
                <div className="p-1.5 rounded-lg bg-status-greenLight text-status-green">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-display font-bold text-status-green">{approvedReviewsCount}</p>
              <p className="text-[10px] text-bakery-muted mt-0.5">Visible to all visitors</p>
            </div>

            {/* Average Rating */}
            <div className="p-4 rounded-2xl bg-bakery-chocolate text-white shadow-warm-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-bakery-cream uppercase tracking-wider">Avg Star Rating</span>
                <div className="p-1.5 rounded-lg bg-bakery-caramel text-white">
                  <Star className="w-4 h-4 fill-white" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-display font-bold text-bakery-cream">{avgRating}</p>
                <div className="flex text-amber-300 text-xs">
                  {'★'.repeat(Math.min(5, Math.max(1, Math.round(Number(avgRating)))))}
                </div>
              </div>
              <p className="text-[10px] text-bakery-beige/70 mt-0.5">All customer submissions</p>
            </div>
          </div>

          {/* Review Filter Bar */}
          <div className="p-4 sm:p-5 rounded-2xl bg-bakery-ivory border border-bakery-beige shadow-warm-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-bakery-beige/70 pb-3">
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { id: 'ALL', label: 'All Reviews', count: reviews.length },
                  { id: 'PENDING', label: 'Needs Approval', count: pendingReviewsCount, highlight: 'bg-status-orange text-white' },
                  { id: 'APPROVED', label: 'Approved & Live', count: approvedReviewsCount },
                ].map((tab) => {
                  const active = reviewStatusFilter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setReviewStatusFilter(tab.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${active
                          ? 'bg-bakery-chocolate text-white shadow-warm-xs'
                          : 'bg-bakery-cream text-bakery-chocolate border border-bakery-beige hover:border-bakery-caramel'
                        }`}
                    >
                      <span>{tab.label}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] ${active ? 'bg-bakery-caramel text-white' : 'bg-white text-bakery-chocolate border border-bakery-beige'
                          }`}
                      >
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="text-[11px] text-bakery-muted flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-bakery-caramel" />
                <span>Reviews are screened by Dyna, Jeremy &amp; Anne before appearing on the public page</span>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-bakery-muted" />
              <input
                type="text"
                placeholder="Search reviews by customer name, location, product, or words..."
                value={reviewSearchQuery}
                onChange={(e) => setReviewSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-bakery-beige focus:outline-hidden focus:border-bakery-caramel text-xs text-bakery-espresso placeholder-bakery-muted"
              />
            </div>
          </div>

          {/* Reviews List */}
          {filteredReviews.length === 0 ? (
            <div className="p-12 text-center bg-bakery-ivory rounded-3xl border border-bakery-beige space-y-3">
              <MessageSquare className="w-10 h-10 text-bakery-muted mx-auto" />
              <h3 className="font-display font-bold text-lg text-bakery-chocolate">No Reviews Found</h3>
              <p className="text-xs text-bakery-muted max-w-sm mx-auto">
                {reviewSearchQuery
                  ? `No reviews match "${reviewSearchQuery}".`
                  : `There are currently no reviews in the "${reviewStatusFilter}" filter.`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredReviews.map((rev) => {
                return (
                  <div
                    key={rev.id}
                    className={`rounded-3xl border-2 transition-all bg-white shadow-warm-xs hover:shadow-warm-md flex flex-col justify-between overflow-hidden ${!rev.is_approved
                        ? 'border-status-orange/40 bg-status-orangeLight/10'
                        : 'border-bakery-beige hover:border-bakery-caramel'
                      }`}
                  >
                    <div className="p-5 space-y-4">
                      {/* Top Row: Customer & Approval Status Badge */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-bakery-cream border border-bakery-beige flex items-center justify-center text-bakery-chocolate font-bold text-xs shrink-0">
                            {rev.customer_name?.charAt(0) || 'C'}
                          </div>
                          <div>
                            <h4 className="font-bold text-xs text-bakery-chocolate leading-tight">{rev.customer_name}</h4>
                            <div className="flex items-center gap-1 text-[11px] text-bakery-muted mt-0.5">
                              <MapPin className="w-3 h-3 text-bakery-caramel" />
                              <span>{rev.customer_location || 'Customer'}</span>
                            </div>
                          </div>
                        </div>

                        {rev.is_approved ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-status-greenLight text-status-green border border-status-green/30 flex items-center gap-1 shrink-0">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Live</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-status-orangeLight text-status-orange border border-status-orange/30 flex items-center gap-1 shrink-0 animate-pulse">
                            <AlertCircle className="w-3 h-3" />
                            <span>Pending</span>
                          </span>
                        )}
                      </div>

                      {/* Star Rating & Product */}
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-bakery-beige/50">
                        <div className="flex text-amber-500">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-4 h-4 ${star <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-bakery-beige'
                                }`}
                            />
                          ))}
                        </div>
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-bakery-cream text-bakery-caramel border border-bakery-beige truncate max-w-[150px]">
                          {rev.product_name}
                        </span>
                      </div>

                      {/* Comment */}
                      <p className="text-xs text-bakery-chocolate/85 italic leading-relaxed bg-bakery-ivory/60 p-3 rounded-xl border border-bakery-beige/60">
                        "{rev.comment}"
                      </p>

                      <p className="text-[10px] text-bakery-muted text-right">
                        Submitted: {new Date(rev.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    {/* Actions Footer */}
                    <div className="p-3 bg-bakery-cream/50 border-t border-bakery-beige flex items-center justify-between gap-2">
                      {rev.is_approved ? (
                        <button
                          onClick={() => handleRejectReview(rev.id)}
                          className="px-3 py-1.5 rounded-xl border border-bakery-beige text-[11px] font-bold text-bakery-chocolate hover:bg-bakery-beige/40 flex items-center gap-1.5 transition-colors"
                          title="Hide from Storefront"
                        >
                          <Eye className="w-3.5 h-3.5 text-bakery-muted" />
                          <span>Unpublish / Hide</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleApproveReview(rev.id)}
                          className="px-3.5 py-1.5 rounded-xl bg-status-green text-white text-[11px] font-bold hover:bg-[#1f663b] shadow-xs flex items-center gap-1.5 transition-colors"
                          title="Approve & Show on Storefront"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve &amp; Publish</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteReview(rev.id)}
                        className="p-1.5 rounded-xl text-bakery-muted hover:text-status-red hover:bg-status-redLight/30 transition-colors"
                        title="Delete Review"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Convert to Sale Modal */}
      {convertingInquiry && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-bakery-ivory w-full max-w-md rounded-3xl border border-bakery-beige shadow-warm-lg overflow-hidden animate-scale-in">
            <div className="p-5 bg-bakery-chocolate text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ReceiptText className="w-5 h-5 text-bakery-caramel" />
                <h3 className="font-display font-bold text-base">Record Sale from Pre-Order</h3>
              </div>
              <button
                onClick={() => setConvertingInquiry(null)}
                className="text-bakery-beige/70 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-bakery-cream border border-bakery-beige space-y-1.5">
                <p className="font-bold text-bakery-chocolate text-sm">
                  {convertingInquiry.customer_name}
                </p>
                <p className="text-bakery-muted text-[11px]">
                  Ref #{convertingInquiry.inquiry_number} &bull; {convertingInquiry.customer_phone}
                </p>
                <p className="font-medium text-bakery-espresso/90 whitespace-pre-line pt-1">
                  {convertingInquiry.items_summary.replace(/\*([^*]+)\*/g, '$1')}
                </p>
                <div className="pt-2 flex justify-between border-t border-bakery-beige font-bold text-sm text-bakery-chocolate">
                  <span>Sale Total:</span>
                  <span className="font-display text-bakery-caramel text-base">
                    ₱{Number(convertingInquiry.estimated_total).toFixed(2)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-bakery-chocolate mb-1.5">
                  Payment Method Received:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['GCash', 'Cash', 'Bank Transfer'] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setConvertPaymentMethod(method)}
                      className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-colors ${convertPaymentMethod === method
                          ? 'bg-bakery-chocolate text-white border-bakery-chocolate shadow-xs'
                          : 'bg-white border-bakery-beige text-bakery-chocolate hover:bg-bakery-cream'
                        }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-[11px] text-bakery-muted leading-relaxed">
                Recording this sale will create an official <strong>Sale Order</strong> in your system, update gross revenue and daily sales stats, and mark this order as <strong>COMPLETED</strong>.
              </p>
            </div>

            <div className="p-4 bg-bakery-cream border-t border-bakery-beige flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConvertingInquiry(null)}
                className="px-4 py-2 rounded-xl border border-bakery-beige text-bakery-chocolate font-semibold hover:bg-bakery-beige/40 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={convertingLoading}
                onClick={handleConfirmConvert}
                className="px-5 py-2 rounded-xl bg-bakery-chocolate text-white font-bold hover:bg-[#2c1108] transition-colors flex items-center gap-1.5 text-xs shadow-warm-xs disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4 text-bakery-caramel" />
                <span>{convertingLoading ? 'Recording Sale...' : 'Confirm & Record Sale'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Kitchen Baking Slip / Print Modal */}
      {slipInquiry && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-3xl border-2 border-bakery-chocolate shadow-2xl overflow-hidden my-auto">
            {/* Modal Controls */}
            <div className="p-4 bg-bakery-chocolate text-white flex items-center justify-between no-print">
              <div className="flex items-center gap-2">
                <ChefHat className="w-4 h-4 text-bakery-caramel" />
                <span className="font-display font-bold text-sm">Kitchen Baking Slip</span>
              </div>
              <button
                onClick={() => setSlipInquiry(null)}
                className="text-bakery-beige/80 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            {/* Printable Ticket Area */}
            <div className="p-6 sm:p-8 space-y-5 text-bakery-chocolate bg-[#FFFDF8]">
              {/* Slip Header */}
              <div className="text-center pb-4 border-b-2 border-dashed border-bakery-beige space-y-1">
                <div className="flex items-center justify-center gap-2">
                  <img src="/logo.png" alt="CRAVEABLES" className="w-9 h-9 rounded-full bg-bakery-cream p-0.5" />
                  <h2 className="font-display font-bold text-xl tracking-wider">CRAVEABLES</h2>
                </div>
                <p className="text-[10px] font-bold text-bakery-caramel uppercase tracking-widest">
                  MADE TO CRAVE &bull; BAKED WITH LOVE
                </p>
                <div className="inline-block px-3 py-1 rounded-full bg-bakery-chocolate text-bakery-cream text-[11px] font-bold mt-2">
                  KITCHEN BAKING &amp; PACKING TICKET
                </div>
              </div>

              {/* Order Meta Info */}
              <div className="grid grid-cols-2 gap-3 text-xs border-b border-bakery-beige pb-3">
                <div>
                  <span className="text-[10px] text-bakery-muted uppercase font-bold block">Order Reference:</span>
                  <p className="font-mono font-bold text-sm">{slipInquiry.inquiry_number}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-bakery-muted uppercase font-bold block">Target Due Date:</span>
                  <p className="font-bold text-sm text-status-orange">{slipInquiry.target_date || 'ASAP Today'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-bakery-muted uppercase font-bold block">Customer:</span>
                  <p className="font-bold text-sm">{slipInquiry.customer_name}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-bakery-muted uppercase font-bold block">Phone Contact:</span>
                  <p className="font-bold text-sm">{slipInquiry.customer_phone || 'N/A'}</p>
                </div>
              </div>

              {/* Baking Checklist */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-bakery-caramel block">
                  Items to Bake / Prepare:
                </span>
                <div className="p-3.5 rounded-2xl bg-bakery-cream/70 border border-bakery-beige space-y-2 text-xs">
                  {slipInquiry.items_summary.split('\n').filter(Boolean).map((line, idx) => (
                    <div key={idx} className="flex items-start gap-2.5">
                      <div className="w-4 h-4 rounded border-2 border-bakery-chocolate/70 shrink-0 mt-0.5" />
                      <span className="font-semibold text-bakery-chocolate leading-tight">
                        {line.replace(/\*([^*]+)\*/g, '$1')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom Notes */}
              {slipInquiry.notes && (
                <div className="p-3 rounded-2xl bg-[#FFF8E7] border border-[#F0D5A8] text-xs">
                  <span className="text-[10px] font-bold text-bakery-caramel uppercase block mb-1">
                    Special Baker Instructions / Notes:
                  </span>
                  <p className="italic font-medium">{slipInquiry.notes}</p>
                </div>
              )}

              {/* Total & Status */}
              <div className="pt-3 border-t-2 border-dashed border-bakery-beige flex items-center justify-between font-bold text-sm">
                <span>Total Amount Due:</span>
                <span className="font-display text-xl text-bakery-chocolate">
                  ₱{Number(slipInquiry.estimated_total).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Slip Footer Actions */}
            <div className="p-4 bg-bakery-cream border-t border-bakery-beige flex items-center justify-between no-print">
              <span className="text-[11px] text-bakery-muted font-medium">
                Tip: Print and attach to the baking tray or bakery box.
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSlipInquiry(null)}
                  className="px-3.5 py-2 rounded-xl border border-bakery-beige text-xs font-semibold text-bakery-chocolate hover:bg-white"
                >
                  Close
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-bakery-chocolate text-white text-xs font-bold hover:bg-[#2c1108] flex items-center gap-1.5 shadow-warm-xs"
                >
                  <Printer className="w-4 h-4 text-bakery-caramel" />
                  <span>Print Slip</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Record New Pre-Order / Walk-In Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-bakery-ivory w-full max-w-lg rounded-3xl border border-bakery-beige shadow-warm-lg overflow-hidden my-auto max-h-[90vh] flex flex-col">
            <div className="p-5 bg-bakery-chocolate text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-bakery-caramel" />
                <h3 className="font-display font-bold text-base">Record Walk-In / Phone Pre-Order</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-bakery-beige/70 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateManualOrder} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-bakery-chocolate mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maria Clara Santos"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige text-xs text-bakery-chocolate focus:outline-hidden focus:border-bakery-caramel"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-bakery-chocolate mb-1">Contact / Mobile Phone</label>
                  <input
                    type="text"
                    placeholder="0917-xxx-xxxx"
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige text-xs text-bakery-chocolate focus:outline-hidden focus:border-bakery-caramel"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-bakery-chocolate mb-1">Target Due / Pickup Date</label>
                  <input
                    type="date"
                    value={newTargetDate}
                    onChange={(e) => setNewTargetDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige text-xs text-bakery-chocolate focus:outline-hidden focus:border-bakery-caramel"
                  />
                </div>
              </div>

              {/* Quick Item Picker from Official CRAVEABLES Menu */}
              <div className="space-y-2 pt-1">
                <label className="block font-semibold text-bakery-chocolate">
                  Select Items for This Order:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-white rounded-2xl border border-bakery-beige">
                  {QUICK_MENU.map((item) => {
                    const qty = newOrderItems[item.name]?.qty || 0;
                    return (
                      <div
                        key={item.name}
                        className="p-2 rounded-xl bg-bakery-cream/50 border border-bakery-beige flex items-center justify-between text-[11px]"
                      >
                        <div className="min-w-0 pr-1">
                          <p className="font-semibold text-bakery-chocolate truncate">{item.name}</p>
                          <span className="text-bakery-caramel font-bold">₱{item.price.toFixed(2)}</span>
                        </div>

                        {qty > 0 ? (
                          <div className="flex items-center gap-1 bg-white px-1.5 py-0.5 rounded-lg border border-bakery-beige shrink-0">
                            <button
                              type="button"
                              onClick={() => handleQuickRemoveItem(item.name)}
                              className="w-4 h-4 rounded bg-bakery-cream text-bakery-chocolate flex items-center justify-center font-bold text-[10px]"
                            >
                              -
                            </button>
                            <span className="font-bold text-[11px] px-1 text-bakery-chocolate">{qty}</span>
                            <button
                              type="button"
                              onClick={() => handleQuickAddItem(item)}
                              className="w-4 h-4 rounded bg-bakery-chocolate text-white flex items-center justify-center font-bold text-[10px]"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleQuickAddItem(item)}
                            className="px-2 py-1 rounded-lg bg-bakery-chocolate text-white text-[10px] font-bold hover:bg-[#2c1108] shrink-0"
                          >
                            + Add
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Selected Order Summary */}
              {Object.keys(newOrderItems).length > 0 && (
                <div className="p-3 rounded-2xl bg-bakery-cream border border-bakery-beige space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-bakery-chocolate">
                    <span>Selected Order Items:</span>
                    <span className="text-bakery-caramel font-display text-sm">
                      Total: ₱
                      {Object.values(newOrderItems)
                        .reduce((acc, i) => acc + i.price * i.qty, 0)
                        .toFixed(2)}
                    </span>
                  </div>
                  <div className="divide-y divide-bakery-beige/60 text-[11px]">
                    {Object.values(newOrderItems).map((i) => (
                      <div key={i.name} className="py-1 flex justify-between">
                        <span>{i.qty}x {i.name}</span>
                        <span className="font-bold">₱{(i.qty * i.price).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block font-semibold text-bakery-chocolate mb-1">
                  Special Notes / Customer Requests
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Birthday gift ribbon, pick up at 3pm, less sweet..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige text-xs text-bakery-chocolate focus:outline-hidden focus:border-bakery-caramel resize-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-bakery-chocolate mb-1">Initial Status</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setNewStatus('PENDING')}
                    className={`flex-1 py-2 rounded-xl border text-xs font-bold ${newStatus === 'PENDING'
                        ? 'bg-status-orange text-white border-status-orange'
                        : 'bg-white border-bakery-beige text-bakery-chocolate'
                      }`}
                  >
                    Pending Review
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewStatus('CONFIRMED')}
                    className={`flex-1 py-2 rounded-xl border text-xs font-bold ${newStatus === 'CONFIRMED'
                        ? 'bg-status-blue text-white border-status-blue'
                        : 'bg-white border-bakery-beige text-bakery-chocolate'
                      }`}
                  >
                    Confirmed Immediately
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={creatingOrder}
                  className="w-full py-3 rounded-xl bg-bakery-chocolate text-white font-bold hover:bg-[#2c1108] transition-colors flex items-center justify-center gap-2 shadow-warm-xs text-xs disabled:opacity-50"
                >
                  <Plus className="w-4 h-4 text-bakery-caramel" />
                  <span>{creatingOrder ? 'Saving Pre-Order...' : 'Save & Log Customer Pre-Order'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Order Modal */}
      {editInquiry && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-bakery-ivory w-full max-w-lg rounded-3xl border border-bakery-beige shadow-warm-lg overflow-hidden my-auto max-h-[90vh] flex flex-col">
            <div className="p-5 bg-bakery-chocolate text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-bakery-caramel" />
                <h3 className="font-display font-bold text-base">Edit Order #{editInquiry.inquiry_number}</h3>
              </div>
              <button
                onClick={() => setEditInquiry(null)}
                className="text-bakery-beige/70 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-3.5 text-xs overflow-y-auto flex-1">
              <div>
                <label className="block font-semibold text-bakery-chocolate mb-1">Customer Name</label>
                <input
                  type="text"
                  required
                  value={editCustName}
                  onChange={(e) => setEditCustName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige text-xs text-bakery-chocolate focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-bakery-chocolate mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={editCustPhone}
                    onChange={(e) => setEditCustPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige text-xs text-bakery-chocolate focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-bakery-chocolate mb-1">Target Date Needed</label>
                  <input
                    type="date"
                    value={editTargetDate}
                    onChange={(e) => setEditTargetDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige text-xs text-bakery-chocolate focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-bakery-chocolate mb-1">Ordered Items Summary</label>
                <textarea
                  rows={3}
                  value={editItemsSummary}
                  onChange={(e) => setEditItemsSummary(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige text-xs text-bakery-chocolate focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-bakery-chocolate mb-1">Estimated Total (₱)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editEstTotal}
                    onChange={(e) => setEditEstTotal(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige text-xs text-bakery-chocolate focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-bakery-chocolate mb-1">Order Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige text-xs font-semibold text-bakery-chocolate focus:outline-hidden"
                  >
                    <option value="PENDING">PENDING</option>
                    <option value="CONFIRMED">CONFIRMED</option>
                    <option value="BAKING">BAKING</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-bakery-chocolate mb-1">Special Notes</label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige text-xs text-bakery-chocolate focus:outline-hidden"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditInquiry(null)}
                  className="px-4 py-2 rounded-xl border border-bakery-beige text-bakery-chocolate font-semibold hover:bg-bakery-beige/30"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 rounded-xl bg-bakery-chocolate text-white font-bold hover:bg-[#2c1108] transition-colors disabled:opacity-50"
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

