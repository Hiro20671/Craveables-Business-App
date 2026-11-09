import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  ShieldCheck,
  Image as ImageIcon,
  DollarSign,
  AlertTriangle,
  Upload,
  CreditCard,
  History,
  Building,
  Mail,
  ChevronRight,
  Maximize2,
  Award,
  Gift,
  Download
} from 'lucide-react';
import { api } from '../services/api';
import { calculateWholesaleDiscount, getWholesaleDescription } from '../utils/pricing';
import {
  CustomerInquiry,
  ProductVariant,
  CustomerReview,
  Customer,
  FeaturedOrder,
  CustomerPayment,
  OrderWorkflowStatus,
  PaymentStatusType,
  ReceivablesSummary
} from '../types';

export const OrdersPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [pageTab, setPageTab] = useState<'ORDERS' | 'WHOLESALE' | 'LOYALTY' | 'FEATURED_GALLERY' | 'CUSTOMERS' | 'RECEIVABLES' | 'REVIEWS'>(
    location.pathname.startsWith('/wholesale-orders')
      ? 'WHOLESALE'
      : location.pathname.startsWith('/loyalty-cards')
      ? 'LOYALTY'
      : 'ORDERS'
  );
  const [inquiries, setInquiries] = useState<CustomerInquiry[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [reviews, setReviews] = useState<CustomerReview[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [featuredOrders, setFeaturedOrders] = useState<FeaturedOrder[]>([]);
  const [receivablesSummary, setReceivablesSummary] = useState<ReceivablesSummary | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & Search for Orders (including Paid vs Unpaid vs Order Given 1-Week Due separation)
  const [statusFilter, setStatusFilter] = useState<'ALL' | OrderWorkflowStatus>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<'ALL' | 'UNPAID' | 'GIVEN_DUE' | 'PAID'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'TARGET_DATE' | 'NEWEST'>('TARGET_DATE');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Loyalty Cards Management states
  const [loyaltySearch, setLoyaltySearch] = useState('');
  const [loyaltyFilter, setLoyaltyFilter] = useState<'ALL' | 'READY' | 'ACTIVE' | 'ZERO'>('ALL');
  const [updatingLoyaltyId, setUpdatingLoyaltyId] = useState<number | null>(null);
  const [loyaltyPreviewCustomer, setLoyaltyPreviewCustomer] = useState<Customer | null>(null);
  const [editingLoyaltyCustomer, setEditingLoyaltyCustomer] = useState<Customer | null>(null);
  const [manualStampsInput, setManualStampsInput] = useState<string>('0');
  const [manualRewardsInput, setManualRewardsInput] = useState<string>('0');
  const [manualRewardNotes, setManualRewardNotes] = useState<string>('');

  // Customer Management states
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerHistory, setCustomerHistory] = useState<{ customer: Customer; orders: CustomerInquiry[]; payments: CustomerPayment[] } | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [custFormName, setCustFormName] = useState('');
  const [custFormPhone, setCustFormPhone] = useState('');
  const [custFormEmail, setCustFormEmail] = useState('');
  const [custFormAddress, setCustFormAddress] = useState('');
  const [custFormNotes, setCustFormNotes] = useState('');
  const [savingCustomer, setSavingCustomer] = useState(false);

  // Featured Orders Admin states
  const [featuredCategoryFilter, setFeaturedCategoryFilter] = useState<string>('ALL');
  const [isUploadFeaturedOpen, setIsUploadFeaturedOpen] = useState(false);
  const [featTitle, setFeatTitle] = useState('');
  const [featDesc, setFeatDesc] = useState('');
  const [featCategory, setFeatCategory] = useState('Cookies');
  const [featOrderType, setFeatOrderType] = useState('Bulk Package');
  const [featDate, setFeatDate] = useState('');
  const [featPieces, setFeatPieces] = useState<string>('');
  const [featIsFeatured, setFeatIsFeatured] = useState(true);
  const [featIsPublished, setFeatIsPublished] = useState(true);
  const [featFile, setFeatFile] = useState<File | null>(null);
  const [featPreviewUrl, setFeatPreviewUrl] = useState<string | null>(null);
  const [uploadingFeatured, setUploadingFeatured] = useState(false);

  // Receivables & Payments modal states
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentOrder, setPaymentOrder] = useState<CustomerInquiry | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'GCash' | 'Cash' | 'Bank Transfer'>('GCash');
  const [paymentRefNumber, setPaymentRefNumber] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentNotes, setPaymentNotes] = useState('');
  const [recordingPayment, setRecordingPayment] = useState(false);

  // Convert to Sale Modal
  const [convertingInquiry, setConvertingInquiry] = useState<CustomerInquiry | null>(null);
  const [convertPaymentMethod, setConvertPaymentMethod] = useState<'GCash' | 'Cash' | 'Bank Transfer'>('GCash');
  const [convertingLoading, setConvertingLoading] = useState(false);

  // Kitchen Slip / Print Modal & Receipt Image Preview Modal
  const [slipInquiry, setSlipInquiry] = useState<CustomerInquiry | null>(null);
  const [receiptPreviewInquiry, setReceiptPreviewInquiry] = useState<CustomerInquiry | null>(null);

  // Create Manual Pre-Order Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newOrderType, setNewOrderType] = useState('REGULAR');
  const [newDeliveryMethod, setNewDeliveryMethod] = useState('PICKUP');
  const [newDeliveryAddress, setNewDeliveryAddress] = useState('');
  const [newTargetDate, setNewTargetDate] = useState('');
  const [newPaymentDueDate, setNewPaymentDueDate] = useState('');
  const [newInitialDeposit, setNewInitialDeposit] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newStatus, setNewStatus] = useState<OrderWorkflowStatus>('PENDING');
  const [newOrderItems, setNewOrderItems] = useState<{ [variantName: string]: { name: string; price: number; qty: number } }>({});
  const [creatingOrder, setCreatingOrder] = useState(false);

  // Edit Order Modal
  const [editInquiry, setEditInquiry] = useState<CustomerInquiry | null>(null);
  const [editCustName, setEditCustName] = useState('');
  const [editCustPhone, setEditCustPhone] = useState('');
  const [editOrderType, setEditOrderType] = useState('REGULAR');
  const [editDeliveryMethod, setEditDeliveryMethod] = useState('PICKUP');
  const [editDeliveryAddress, setEditDeliveryAddress] = useState('');
  const [editTargetDate, setEditTargetDate] = useState('');
  const [editPaymentDueDate, setEditPaymentDueDate] = useState('');
  const [editItemsSummary, setEditItemsSummary] = useState('');
  const [editEstTotal, setEditEstTotal] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editStatus, setEditStatus] = useState<OrderWorkflowStatus>('PENDING');
  const [savingEdit, setSavingEdit] = useState(false);

  // Reviews Filtering
  const [reviewStatusFilter, setReviewStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED'>('ALL');
  const [reviewSearchQuery, setReviewSearchQuery] = useState('');

  // Standard menu catalog for quick add (Retail & Wholesale)
  const QUICK_MENU = [
    { name: 'Banana Cake — Big', price: 135 },
    { name: 'Banana Cake — Small', price: 60 },
    { name: 'Classic Brownies — Small Box (3 pcs)', price: 110 },
    { name: 'Classic Brownies — Big Box (6 pcs)', price: 220 },
    { name: 'Classic Choco Chip Cookie — Per Pc', price: 30 },
    { name: 'Red Velvet Cookie — Per Pc', price: 35 },
    { name: 'Choco Chip Cookies — Box of 6', price: 180 },
    { name: 'Red Velvet Cookies — Box of 6', price: 210 },
    { name: 'Choco Chip Cookies — Assorted Box', price: 190 },
    { name: 'Red Velvet Cookies — Assorted Box', price: 190 },
  ];

  useEffect(() => {
    if (location.pathname.startsWith('/wholesale-orders')) {
      setPageTab('WHOLESALE');
    } else if (location.pathname.startsWith('/loyalty-cards')) {
      setPageTab('LOYALTY');
    } else if (location.pathname.startsWith('/orders') && (pageTab === 'WHOLESALE' || pageTab === 'LOYALTY')) {
      setPageTab('ORDERS');
    }
  }, [location.pathname]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [inqs, vars, revs, custs, feats, recSummary] = await Promise.all([
        api.getInquiries(),
        api.getVariants().catch(() => []),
        api.getReviews({ all: true }).catch(() => []),
        api.getCustomers().catch(() => []),
        api.getFeaturedOrders({ all: true }).catch(() => []),
        api.getReceivablesSummary().catch(() => null),
      ]);
      setInquiries(inqs);
      setVariants(vars);
      setReviews(revs);
      setCustomers(custs);
      setFeaturedOrders(feats);
      setReceivablesSummary(recSummary);
    } catch (err) {
      console.error('Error fetching data in OrdersPage:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Update Status
  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      await api.updateInquiryStatus(id, status);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to update order status');
    }
  };

  // Mark Order Given to Customer with 1-Week Payment Due Date (Pay Later)
  const handleMarkGivenDue = async (inq: CustomerInquiry, resetUnpaid = false) => {
    const dueStr = new Date(Date.now() + 7 * 86400000).toLocaleDateString();
    const confirmMsg = resetUnpaid
      ? `Mark order ${inq.shared_order_number || inq.inquiry_number} (${inq.customer_name}) as UNPAID & Order Given with a 1-Week Due Date (${dueStr})?`
      : `Mark order ${inq.shared_order_number || inq.inquiry_number} (${inq.customer_name}) as GIVEN TO CUSTOMER with payment due in 1 week (${dueStr})?`;
    if (!window.confirm(confirmMsg)) return;
    try {
      await api.markOrderGivenWithDue(inq.id, { days: 7, reset_unpaid: resetUnpaid });
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to set 1-week due date');
    }
  };

  // Loyalty Card Stamp & Reward Actions
  const handleUpdateLoyalty = async (
    cust: Customer,
    actionType: 'add_stamp' | 'remove_stamp' | 'set_stamps' | 'redeem_reward',
    stamps?: number
  ) => {
    if (actionType === 'redeem_reward') {
      if (!window.confirm(`Redeem 5 stamps for ${cust.name} to claim 1 FREE Small Box of Brownies (3 pcs)?`)) {
        return;
      }
    }
    try {
      setUpdatingLoyaltyId(cust.id);
      await api.updateCustomerLoyalty(cust.id, { action_type: actionType, stamps });
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to update loyalty card');
    } finally {
      setUpdatingLoyaltyId(null);
    }
  };

  const openEditLoyaltyModal = (cust: Customer) => {
    setEditingLoyaltyCustomer(cust);
    setManualStampsInput(String(cust.loyalty_stamps || 0));
    setManualRewardsInput(String(cust.rewards_redeemed || 0));
    setManualRewardNotes(cust.reward_notes || '');
  };

  const handleSaveManualLoyalty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLoyaltyCustomer) return;
    try {
      setUpdatingLoyaltyId(editingLoyaltyCustomer.id);
      await api.updateCustomerLoyalty(editingLoyaltyCustomer.id, {
        action_type: 'set_stamps',
        stamps: Math.max(0, parseInt(manualStampsInput, 10) || 0),
        rewards_redeemed: Math.max(0, parseInt(manualRewardsInput, 10) || 0),
        reward_notes: manualRewardNotes.trim(),
      });
      setEditingLoyaltyCustomer(null);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to save loyalty card adjustments');
    } finally {
      setUpdatingLoyaltyId(null);
    }
  };

  // Convert to Official Sale
  const handleConfirmConvert = async () => {
    if (!convertingInquiry) return;
    try {
      setConvertingLoading(true);
      await api.convertInquiryToSale(convertingInquiry.id, {
        payment_method: convertPaymentMethod,
      });
      alert(`Order ${convertingInquiry.shared_order_number || convertingInquiry.inquiry_number} successfully converted to official sale!`);
      setConvertingInquiry(null);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to convert order to sale');
    } finally {
      setConvertingLoading(false);
    }
  };

  // Send Order to Production
  const handleSendToProduction = async (inq: CustomerInquiry) => {
    if (!window.confirm(`Schedule production run for order ${inq.shared_order_number || inq.inquiry_number} (${inq.customer_name})?`)) {
      return;
    }
    try {
      const res = await api.createProductionFromOrder(inq.id);
      alert(res.message || 'Production orders successfully scheduled for this order!');
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to schedule production order');
    }
  };

  // Open Payment Modal
  const openPaymentModal = (inq: CustomerInquiry) => {
    setPaymentOrder(inq);
    const balance = Number(inq.remaining_balance ?? (Number(inq.estimated_total || 0) - Number(inq.amount_paid || 0)));
    setPaymentAmount(balance > 0 ? balance.toFixed(2) : '');
    setPaymentMethod('GCash');
    setPaymentRefNumber('');
    setPaymentNotes('');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setIsPaymentModalOpen(true);
  };

  // Submit Payment Record
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentOrder) return;
    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      alert('Please enter a valid payment amount greater than 0.');
      return;
    }

    try {
      setRecordingPayment(true);
      await api.recordOrderPayment(paymentOrder.id, {
        amount: amt,
        payment_method: paymentMethod,
        reference_number: paymentRefNumber.trim(),
        payment_date: paymentDate,
        notes: paymentNotes.trim(),
      });
      alert(`Payment of ₱${amt.toFixed(2)} recorded successfully for ${paymentOrder.customer_name}!`);
      setIsPaymentModalOpen(false);
      setPaymentOrder(null);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to record payment');
    } finally {
      setRecordingPayment(false);
    }
  };

  // Delete Inquiry
  const handleDelete = async (inq: CustomerInquiry) => {
    const confirmMsg = `Are you sure you want to delete order inquiry "${inq.shared_order_number || inq.inquiry_number}" for ${inq.customer_name}?\n\nThis action cannot be undone.`;
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
    setEditOrderType(inq.order_type || 'REGULAR');
    setEditDeliveryMethod(inq.delivery_method || 'PICKUP');
    setEditDeliveryAddress(inq.delivery_address || '');
    setEditTargetDate(inq.target_date || '');
    setEditPaymentDueDate(inq.payment_due_date || '');
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
        order_type: editOrderType,
        delivery_method: editDeliveryMethod,
        delivery_address: editDeliveryAddress.trim(),
        target_date: editTargetDate || null,
        payment_due_date: editPaymentDueDate || null,
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

  // Create Manual Order (supports both Regular Pre-Orders and Reseller Whole Sales Orders)
  const handleCreateManualOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) {
      alert('Please enter a customer or reseller name.');
      return;
    }

    const itemsArray = Object.values(newOrderItems).filter((i) => i.qty > 0);
    if (itemsArray.length === 0) {
      alert('Please add at least one item to this order.');
      return;
    }

    const isWholesale = newOrderType === 'WHOLESALE';
    const processedItems = itemsArray.map((item) => {
      if (isWholesale) {
        const ws = calculateWholesaleDiscount(item.name, item.price, item.qty);
        return {
          name: item.name,
          qty: item.qty,
          regular_price: item.price,
          price: ws.discountedUnitPrice,
          discount: ws.totalDiscount,
          tier: ws.tierBadge,
          finalTotal: ws.finalTotal,
        };
      }
      return {
        name: item.name,
        qty: item.qty,
        regular_price: item.price,
        price: item.price,
        discount: 0,
        tier: '',
        finalTotal: item.price * item.qty,
      };
    });

    const totalEst = processedItems.reduce((acc, item) => acc + item.finalTotal, 0);
    const totalSaved = processedItems.reduce((acc, item) => acc + item.discount, 0);

    const summaryLines = processedItems.map((item) => {
      if (isWholesale && item.discount > 0) {
        return `• ${item.qty}x ${item.name} — ₱${item.price.toFixed(2)}/ea [Reg ₱${item.regular_price}, ${item.tier}, Saved ₱${item.discount.toFixed(2)}] = ₱${item.finalTotal.toFixed(2)}`;
      }
      return `• ${item.qty}x ${item.name} (₱${item.price.toFixed(2)}) = ₱${item.finalTotal.toFixed(2)}`;
    });

    const summaryText = isWholesale
      ? `CRAVEABLES WHOLE SALES ORDER (RESELLER)\n${summaryLines.join('\n')}\nTotal Wholesale Discount Saved: -₱${totalSaved.toFixed(2)}\nNet Reseller Total: ₱${totalEst.toFixed(2)}`
      : summaryLines.join('\n');

    try {
      setCreatingOrder(true);
      await api.createInquiry({
        customer_name: newCustName.trim(),
        customer_phone: newCustPhone.trim(),
        order_type: newOrderType,
        delivery_method: newDeliveryMethod,
        delivery_address: newDeliveryAddress.trim(),
        target_date: newTargetDate || null,
        payment_due_date: newPaymentDueDate || null,
        initial_deposit: parseFloat(newInitialDeposit) || 0,
        items_summary: summaryText,
        items_json: processedItems,
        estimated_total: totalEst,
        notes: newNotes,
        status: newStatus,
      });
      setIsCreateModalOpen(false);
      // Reset form
      setNewCustName('');
      setNewCustPhone('');
      setNewTargetDate('');
      setNewPaymentDueDate('');
      setNewInitialDeposit('');
      setNewNotes('');
      setNewDeliveryAddress('');
      setNewOrderItems({});
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to create order');
    } finally {
      setCreatingOrder(false);
    }
  };

  const handleQuickAddItem = (item: { name: string; price: number }, step = 1) => {
    setNewOrderItems((prev) => {
      const cur = prev[item.name] || { name: item.name, price: item.price, qty: 0 };
      return {
        ...prev,
        [item.name]: { ...cur, qty: cur.qty + step },
      };
    });
  };

  const handleQuickSetQty = (item: { name: string; price: number }, rawQty: number) => {
    const qty = Math.max(0, Math.floor(rawQty || 0));
    setNewOrderItems((prev) => {
      if (qty <= 0) {
        const next = { ...prev };
        delete next[item.name];
        return next;
      }
      return {
        ...prev,
        [item.name]: { name: item.name, price: item.price, qty },
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

  // Customer Management logic
  const handleOpenCustomerProfile = async (cust: Customer) => {
    setSelectedCustomer(cust);
    setIsCustomerModalOpen(true);
    setLoadingHistory(true);
    try {
      const history = await api.getCustomerHistory(cust.id);
      setCustomerHistory(history);
    } catch (err) {
      console.error('Error fetching customer history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custFormName.trim()) {
      alert('Please enter customer name');
      return;
    }
    try {
      setSavingCustomer(true);
      if (editingCustomer) {
        await api.updateCustomer(editingCustomer.id, {
          name: custFormName.trim(),
          phone: custFormPhone.trim(),
          email: custFormEmail.trim(),
          address: custFormAddress.trim(),
          notes: custFormNotes.trim(),
        });
      } else {
        await api.createCustomer({
          name: custFormName.trim(),
          phone: custFormPhone.trim(),
          email: custFormEmail.trim(),
          address: custFormAddress.trim(),
          notes: custFormNotes.trim(),
        });
      }
      setEditingCustomer(null);
      setCustFormName('');
      setCustFormPhone('');
      setCustFormEmail('');
      setCustFormAddress('');
      setCustFormNotes('');
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to save customer');
    } finally {
      setSavingCustomer(false);
    }
  };

  const handleDeleteCustomer = async (cust: Customer) => {
    if (!window.confirm(`Delete customer ${cust.name}? This will unlink existing orders.`)) return;
    try {
      await api.deleteCustomer(cust.id);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete customer');
    }
  };

  // Featured Order Admin logic
  const handleFeaturedFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFeatFile(file);
      setFeatPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleUploadFeatured = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!featFile) {
      alert('Please select a photo or video of the completed order');
      return;
    }
    if (!featTitle.trim()) {
      alert('Please enter a title for the featured order');
      return;
    }

    try {
      setUploadingFeatured(true);
      const fd = new FormData();
      fd.append('image', featFile);
      fd.append('title', featTitle.trim());
      fd.append('description', featDesc.trim());
      fd.append('category', featCategory);
      fd.append('order_type', featOrderType);
      if (featDate) fd.append('order_date', featDate);
      if (featPieces) fd.append('pieces_count', featPieces);
      fd.append('is_featured', String(featIsFeatured));
      fd.append('is_published', String(featIsPublished));

      await api.createFeaturedOrder(fd);
      alert('Featured order photo/video uploaded and published to gallery!');
      setIsUploadFeaturedOpen(false);
      // Reset
      setFeatTitle('');
      setFeatDesc('');
      setFeatPieces('');
      setFeatFile(null);
      setFeatPreviewUrl(null);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to upload featured order');
    } finally {
      setUploadingFeatured(false);
    }
  };

  const handleToggleFeatured = async (id: number) => {
    try {
      await api.toggleFeaturedOrder(id);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle featured status');
    }
  };

  const handleTogglePublished = async (id: number) => {
    try {
      await api.togglePublishedOrder(id);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle published status');
    }
  };

  const handleDeleteFeatured = async (id: number) => {
    if (!window.confirm('Delete this featured order photo?')) return;
    try {
      await api.deleteFeaturedOrder(id);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete featured order');
    }
  };

  // Reviews actions
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

  // Separate Regular Customer Orders vs Reseller Whole Sales Orders
  const regularOrders = inquiries.filter((i) => i.order_type !== 'WHOLESALE');
  const wholesaleOrders = inquiries.filter((i) => i.order_type === 'WHOLESALE');
  const activePool = pageTab === 'WHOLESALE' ? wholesaleOrders : regularOrders;

  const getOrderBalance = (i: CustomerInquiry) =>
    Number(i.remaining_balance ?? (Number(i.estimated_total || 0) - Number(i.amount_paid || 0)));

  const isOrderPaid = (i: CustomerInquiry) =>
    i.status !== 'CANCELLED' && (i.payment_status === 'PAID' || getOrderBalance(i) <= 0);

  const isOrderGivenDue = (i: CustomerInquiry) =>
    i.status !== 'CANCELLED' &&
    getOrderBalance(i) > 0 &&
    (i.status === 'COMPLETED' || i.payment_type === 'PAY_LATER_1_WEEK' || Boolean(i.payment_due_date));

  const unpaidPoolOrders = activePool.filter((i) => i.status !== 'CANCELLED' && getOrderBalance(i) > 0);
  const givenDuePoolOrders = activePool.filter(isOrderGivenDue);
  const paidPoolOrders = activePool.filter(isOrderPaid);

  const unpaidPoolBalance = unpaidPoolOrders.reduce((s, i) => s + getOrderBalance(i), 0);
  const givenDuePoolBalance = givenDuePoolOrders.reduce((s, i) => s + getOrderBalance(i), 0);
  const paidPoolAmount = paidPoolOrders.reduce((s, i) => s + Number(i.estimated_total || 0), 0);

  // Order counts & metrics for active pool
  const totalInquiries = activePool.length;
  const newCount = activePool.filter((i) => i.status === 'NEW').length;
  const pendingCount = activePool.filter((i) => i.status === 'PENDING').length;
  const confirmedCount = activePool.filter((i) => i.status === 'CONFIRMED').length;
  const inProdCount = activePool.filter((i) => i.status === 'SCHEDULED_PRODUCTION' || i.status === 'BAKING').length;
  const readyCount = activePool.filter((i) => i.status === 'READY').length;
  const completedCount = activePool.filter((i) => i.status === 'COMPLETED').length;
  const cancelledCount = activePool.filter((i) => i.status === 'CANCELLED').length;

  const totalActiveValue = activePool
    .filter((i) => i.status !== 'CANCELLED' && i.status !== 'COMPLETED')
    .reduce((sum, i) => sum + Number(i.estimated_total || 0), 0);

  // Orders Filter & Search
  const filteredInquiries = activePool
    .filter((inq) => {
      if (statusFilter !== 'ALL' && inq.status !== statusFilter) return false;
      if (paymentFilter === 'PAID' && !isOrderPaid(inq)) return false;
      if (paymentFilter === 'UNPAID' && (inq.status === 'CANCELLED' || getOrderBalance(inq) <= 0)) return false;
      if (paymentFilter === 'GIVEN_DUE' && !isOrderGivenDue(inq)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = inq.customer_name?.toLowerCase().includes(q);
        const matchPhone = inq.customer_phone?.toLowerCase().includes(q);
        const matchNum = (inq.shared_order_number || inq.inquiry_number)?.toLowerCase().includes(q);
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

  // Loyalty Cards Metrics & Filter
  const totalStampsAwarded = customers.reduce((s, c) => s + Number(c.loyalty_stamps || 0), 0);
  const readyForRewardCount = customers.filter((c) => Number(c.loyalty_stamps || 0) >= 5).length;
  const totalRewardsRedeemed = customers.reduce((s, c) => s + Number(c.rewards_redeemed || 0), 0);

  const filteredLoyaltyCustomers = customers
    .filter((c) => {
      const stamps = Number(c.loyalty_stamps || 0);
      if (loyaltyFilter === 'READY' && stamps < 5) return false;
      if (loyaltyFilter === 'ACTIVE' && (stamps < 1 || stamps >= 5)) return false;
      if (loyaltyFilter === 'ZERO' && stamps !== 0) return false;
      if (loyaltySearch.trim()) {
        const q = loyaltySearch.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          (c.phone || '').toLowerCase().includes(q) ||
          (c.loyalty_card_number || '').toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => Number(b.loyalty_stamps || 0) - Number(a.loyalty_stamps || 0));

  // Customers Filter
  const filteredCustomers = customers.filter((c) => {
    if (!customerSearch.trim()) return true;
    const q = customerSearch.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.phone || '').toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.address?.toLowerCase().includes(q)
    );
  });

  // Receivables list (orders with remaining balance)
  const receivableOrders = inquiries.filter((i) => {
    if (i.status === 'CANCELLED') return false;
    const balance = Number(i.remaining_balance ?? (Number(i.estimated_total || 0) - Number(i.amount_paid || 0)));
    return balance > 0;
  });

  // Reviews counts & filtering
  const pendingReviewsCount = reviews.filter((r) => !r.is_approved).length;
  const approvedReviewsCount = reviews.filter((r) => r.is_approved).length;

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

  // Helpers for badges
  const renderPaymentBadge = (inq: CustomerInquiry) => {
    const status = inq.payment_status || 'UNPAID';
    const balance = getOrderBalance(inq);

    if (status === 'PAID' || balance <= 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-status-green/10 text-status-green border border-status-green/20">
          <CheckCircle2 className="w-3 h-3" />
          <span>Fully Paid</span>
        </span>
      );
    }
    if (status === 'OVERDUE') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/15 text-red-700 border border-red-500/30 animate-pulse">
          <AlertTriangle className="w-3 h-3" />
          <span>OVERDUE (₱{balance.toFixed(2)})</span>
        </span>
      );
    }
    if (isOrderGivenDue(inq)) {
      const dueLabel = inq.payment_due_date
        ? `Due ${new Date(inq.payment_due_date).toLocaleDateString()}`
        : '1-Week Due';
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-800 border border-amber-500/40">
          <Clock className="w-3 h-3" />
          <span>Given • {dueLabel} (₱{balance.toFixed(2)})</span>
        </span>
      );
    }
    if (status === 'PARTIALLY_PAID') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 border border-amber-500/20">
          <Clock className="w-3 h-3" />
          <span>Partial (Bal: ₱{balance.toFixed(2)})</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-status-orange/10 text-status-orange border border-status-orange/20">
        <AlertCircle className="w-3 h-3" />
        <span>Unpaid (₱{balance.toFixed(2)})</span>
      </span>
    );
  };

  const renderStatusBadge = (status: OrderWorkflowStatus, inq?: CustomerInquiry) => {
    if (inq && status === 'COMPLETED' && getOrderBalance(inq) > 0) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border bg-amber-500/15 border-amber-500/40 text-amber-900">
          📦 Order Given (Pay Later)
        </span>
      );
    }
    const config: Record<string, { bg: string; text: string; label: string }> = {
      NEW: { bg: 'bg-blue-500/10 border-blue-500/30', text: 'text-blue-700', label: 'New Order' },
      PENDING: { bg: 'bg-amber-500/10 border-amber-500/30', text: 'text-amber-700', label: 'Pending' },
      CONFIRMED: { bg: 'bg-purple-500/10 border-purple-500/30', text: 'text-purple-700', label: 'Confirmed' },
      AWAITING_PAYMENT: { bg: 'bg-yellow-500/10 border-yellow-500/30', text: 'text-yellow-700', label: 'Awaiting Payment' },
      SCHEDULED_PRODUCTION: { bg: 'bg-indigo-500/10 border-indigo-500/30', text: 'text-indigo-700', label: 'In Production' },
      BAKING: { bg: 'bg-amber-600/10 border-amber-600/30', text: 'text-amber-800', label: 'Baking' },
      READY: { bg: 'bg-teal-500/10 border-teal-500/30', text: 'text-teal-700', label: 'Ready for Pickup' },
      COMPLETED: { bg: 'bg-status-green/10 border-status-green/30', text: 'text-status-green', label: 'Completed' },
      CANCELLED: { bg: 'bg-gray-500/10 border-gray-500/30', text: 'text-gray-600', label: 'Cancelled' },
    };
    const c = config[status] || { bg: 'bg-gray-100 border-gray-300', text: 'text-gray-700', label: status };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${c.bg} ${c.text}`}>
        {c.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Page Navigation Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-bakery-beige/60">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display font-bold text-2xl sm:text-3xl text-bakery-chocolate">
              {pageTab === 'WHOLESALE'
                ? 'Whole Sales Order — Reseller & Bulk Hub'
                : pageTab === 'LOYALTY'
                ? 'CRAVEABLES Customer Loyalty Cards'
                : 'Customer Orders & Storefront Hub'}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-bakery-muted mt-1">
            {pageTab === 'WHOLESALE'
              ? 'Dedicated reseller order list with automatic volume & product wholesale discounts connected to Sales & Production.'
              : pageTab === 'LOYALTY'
              ? 'Official CRAVEABLES Loyalty Card manager: automatic 1 stamp per order ₱100+ and manual stamp & free brownie reward management.'
              : 'Manage incoming pre-orders, kitchen production runs, customer loyalty cards, accounts receivable, and gallery photos.'}
          </p>
        </div>

        {/* Global Tab Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-bakery-cream p-1 rounded-2xl border border-bakery-beige shadow-2xs overflow-x-auto max-w-full">
            <button
              onClick={() => {
                setPageTab('ORDERS');
                if (location.pathname.startsWith('/wholesale-orders') || location.pathname.startsWith('/loyalty-cards')) navigate('/orders');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                pageTab === 'ORDERS'
                  ? 'bg-bakery-chocolate text-white shadow-warm-xs'
                  : 'text-bakery-chocolate hover:text-bakery-caramel'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Customer Orders</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-bakery-caramel text-white">
                {regularOrders.length}
              </span>
            </button>

            <button
              onClick={() => {
                setPageTab('WHOLESALE');
                if (!location.pathname.startsWith('/wholesale-orders')) navigate('/wholesale-orders');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                pageTab === 'WHOLESALE'
                  ? 'bg-bakery-chocolate text-white shadow-warm-xs'
                  : 'text-bakery-chocolate hover:text-bakery-caramel'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Whole Sales Order</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
                {wholesaleOrders.length}
              </span>
            </button>

            <button
              onClick={() => {
                setPageTab('LOYALTY');
                if (!location.pathname.startsWith('/loyalty-cards')) navigate('/loyalty-cards');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                pageTab === 'LOYALTY'
                  ? 'bg-bakery-chocolate text-white shadow-warm-xs'
                  : 'text-bakery-chocolate hover:text-bakery-caramel'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>Loyalty Cards</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-600 text-white">
                {customers.length}
              </span>
            </button>

            <button
              onClick={() => setPageTab('FEATURED_GALLERY')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                pageTab === 'FEATURED_GALLERY'
                  ? 'bg-bakery-chocolate text-white shadow-warm-xs'
                  : 'text-bakery-chocolate hover:text-bakery-caramel'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Featured Gallery</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-bakery-caramel text-white">
                {featuredOrders.length}
              </span>
            </button>

            <button
              onClick={() => setPageTab('CUSTOMERS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                pageTab === 'CUSTOMERS'
                  ? 'bg-bakery-chocolate text-white shadow-warm-xs'
                  : 'text-bakery-chocolate hover:text-bakery-caramel'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Customers</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-bakery-beige text-bakery-chocolate">
                {customers.length}
              </span>
            </button>

            <button
              onClick={() => setPageTab('RECEIVABLES')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                pageTab === 'RECEIVABLES'
                  ? 'bg-bakery-chocolate text-white shadow-warm-xs'
                  : 'text-bakery-chocolate hover:text-bakery-caramel'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Receivables</span>
              {receivableOrders.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-red-500 text-white">
                  {receivableOrders.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setPageTab('REVIEWS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                pageTab === 'REVIEWS'
                  ? 'bg-bakery-chocolate text-white shadow-warm-xs'
                  : 'text-bakery-chocolate hover:text-bakery-caramel'
              }`}
            >
              <Star className="w-3.5 h-3.5" />
              <span>Reviews</span>
              {pendingReviewsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-status-orange text-white animate-pulse">
                  {pendingReviewsCount}
                </span>
              )}
            </button>
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2.5 rounded-xl bg-bakery-ivory border border-bakery-beige hover:border-bakery-caramel text-bakery-chocolate text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1.5 shrink-0"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 text-bakery-caramel ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* TAB 1 & WHOLESALE: ORDERS / WHOLE SALES ORDER */}
      {(pageTab === 'ORDERS' || pageTab === 'WHOLESALE') && (
        <div className="space-y-6">
          {/* Official Reseller Wholesale Discount Tier Banner (Shown in Whole Sales Order) */}
          {pageTab === 'WHOLESALE' && (
            <div className="p-5 rounded-2xl bg-gradient-to-r from-[#3B170B] to-[#512212] text-white border border-bakery-caramel/40 shadow-warm-md">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
                <div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-bakery-caramel text-white mb-1.5">
                    <Sparkles className="w-3 h-3" /> Official Reseller &amp; Wholesale Discount Matrix
                  </span>
                  <h2 className="font-display font-bold text-lg sm:text-xl text-bakery-cream">
                    Whole Sales Order Pricing &amp; Automatic Reseller Discounts
                  </h2>
                  <p className="text-xs text-bakery-beige/80">
                    Discounts are automatically calculated based on product and quantity when you record a Whole Sales Order.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setNewOrderType('WHOLESALE');
                    setIsCreateModalOpen(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-bakery-caramel hover:bg-[#936535] text-white text-xs font-bold shadow-md flex items-center gap-2 shrink-0 transition-transform active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ New Whole Sales Order</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 text-xs">
                <div className="p-3 rounded-xl bg-white/10 border border-white/15 backdrop-blur-xs">
                  <p className="font-bold text-bakery-cream mb-1">🍌 Banana Cake Big (₱135)</p>
                  <p className="text-[11px] text-bakery-beige">• 10 below: <strong className="text-emerald-300">-₱10 / pc</strong> (₱125)</p>
                  <p className="text-[11px] text-bakery-beige">• 10 above: <strong className="text-emerald-300">-₱15 / pc</strong> (₱120)</p>
                </div>
                <div className="p-3 rounded-xl bg-white/10 border border-white/15 backdrop-blur-xs">
                  <p className="font-bold text-bakery-cream mb-1">🍌 Banana Cake Small (₱60)</p>
                  <p className="text-[11px] text-bakery-beige">• 10 below: <strong className="text-emerald-300">5% OFF</strong> (₱57)</p>
                  <p className="text-[11px] text-bakery-beige">• 10 above: <strong className="text-emerald-300">10% OFF</strong> (₱54)</p>
                </div>
                <div className="p-3 rounded-xl bg-white/10 border border-white/15 backdrop-blur-xs">
                  <p className="font-bold text-bakery-cream mb-1">🍫 Classic Brownies</p>
                  <p className="text-[11px] text-bakery-beige">• Small (₱110): <strong className="text-emerald-300">-₱10 / box</strong> (₱100)</p>
                  <p className="text-[11px] text-bakery-beige">• Big (₱220): <strong className="text-emerald-300">-₱20 / box</strong> (₱200)</p>
                </div>
                <div className="p-3 rounded-xl bg-white/10 border border-white/15 backdrop-blur-xs">
                  <p className="font-bold text-bakery-cream mb-1">🍪 Cookies (Per Pcs)</p>
                  <p className="text-[11px] text-bakery-beige">• Classic (₱30): <strong className="text-emerald-300">-₱5 each</strong> (₱25)</p>
                  <p className="text-[11px] text-bakery-beige">• Red Velvet (₱35): <strong className="text-emerald-300">-₱5 each</strong> (₱30)</p>
                </div>
                <div className="p-3 rounded-xl bg-white/10 border border-white/15 backdrop-blur-xs">
                  <p className="font-bold text-bakery-cream mb-1">🍪 Cookies Box (Box of 6)</p>
                  <p className="text-[11px] text-bakery-beige">• 10 below: <strong className="text-emerald-300">-₱10 / box</strong></p>
                  <p className="text-[11px] text-bakery-beige">• 10 above: <strong className="text-emerald-300">-₱15 / box</strong></p>
                </div>
              </div>
            </div>
          )}

          {/* Top Metrics Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
            <div className="p-4 rounded-2xl bg-bakery-ivory border border-bakery-beige shadow-warm-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-bakery-muted uppercase tracking-wider">Total Orders</span>
                <div className="p-1.5 rounded-lg bg-bakery-cream text-bakery-chocolate">
                  <ShoppingBag className="w-4 h-4 text-bakery-caramel" />
                </div>
              </div>
              <p className="text-2xl font-display font-bold text-bakery-chocolate">{totalInquiries}</p>
              <p className="text-[10px] text-bakery-muted mt-0.5">All time pre-orders</p>
            </div>

            <div className="p-4 rounded-2xl bg-bakery-ivory border border-bakery-beige shadow-warm-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-bakery-muted uppercase tracking-wider">New / Pending</span>
                <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-display font-bold text-amber-600">{newCount + pendingCount}</p>
              <p className="text-[10px] text-bakery-muted mt-0.5">Awaiting bake confirmation</p>
            </div>

            <div className="p-4 rounded-2xl bg-bakery-ivory border border-bakery-beige shadow-warm-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-bakery-muted uppercase tracking-wider">In Production</span>
                <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                  <ChefHat className="w-4 h-4 text-bakery-caramel" />
                </div>
              </div>
              <p className="text-2xl font-display font-bold text-indigo-600">{inProdCount}</p>
              <p className="text-[10px] text-bakery-muted mt-0.5">Baking or scheduled</p>
            </div>

            <div className="p-4 rounded-2xl bg-bakery-ivory border border-bakery-beige shadow-warm-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-bakery-muted uppercase tracking-wider">Ready / Done</span>
                <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-display font-bold text-emerald-600">{readyCount + completedCount}</p>
              <p className="text-[10px] text-bakery-muted mt-0.5">{readyCount} awaiting pickup</p>
            </div>

            <div className="p-4 rounded-2xl bg-bakery-chocolate text-white shadow-warm-sm col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-bakery-cream/70 uppercase tracking-wider">Active Pipeline</span>
                <div className="p-1.5 rounded-lg bg-white/10 text-bakery-caramel">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-display font-bold text-bakery-cream">₱{totalActiveValue.toFixed(2)}</p>
              <p className="text-[10px] text-bakery-cream/70 mt-0.5">Value in pipeline</p>
            </div>
          </div>

          {/* Paid vs Unpaid vs Order Given (1-Week Due) Separation */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {([
              { key: 'ALL', label: 'All Orders', count: activePool.length, sub: '', cls: 'border-bakery-beige' },
              { key: 'UNPAID', label: '⏳ Unpaid', count: unpaidPoolOrders.length, sub: `₱${unpaidPoolBalance.toFixed(2)} to collect`, cls: 'border-red-300' },
              { key: 'GIVEN_DUE', label: '📦 Given • Due', count: givenDuePoolOrders.length, sub: `₱${givenDuePoolBalance.toFixed(2)} pay later`, cls: 'border-amber-400' },
              { key: 'PAID', label: '✅ Paid', count: paidPoolOrders.length, sub: `₱${paidPoolAmount.toFixed(2)} collected`, cls: 'border-emerald-400' },
            ] as const).map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPaymentFilter(p.key)}
                className={`p-3 rounded-2xl text-left border-2 transition-all ${p.cls} ${
                  paymentFilter === p.key ? 'bg-bakery-chocolate text-white shadow-warm-sm' : 'bg-bakery-ivory text-bakery-chocolate hover:shadow-warm-xs'
                }`}
              >
                <span className="text-xs font-bold block">{p.label}</span>
                <span className="font-display font-bold text-xl">{p.count}</span>
                {p.sub && <span className="block text-[10px] opacity-80">{p.sub}</span>}
              </button>
            ))}
          </div>

          {/* Action Bar & Filters */}
          <div className="p-4 rounded-2xl bg-bakery-ivory border border-bakery-beige flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-warm-xs">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-bakery-muted" />
                <input
                  type="text"
                  placeholder="Search order #, customer, phone, items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-bakery-beige text-xs text-bakery-chocolate placeholder-bakery-muted focus:outline-hidden"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 rounded-xl bg-white border border-bakery-beige text-xs font-semibold text-bakery-chocolate focus:outline-hidden"
              >
                <option value="ALL">All Statuses ({totalInquiries})</option>
                <option value="NEW">New ({newCount})</option>
                <option value="PENDING">Pending ({pendingCount})</option>
                <option value="CONFIRMED">Confirmed ({confirmedCount})</option>
                <option value="SCHEDULED_PRODUCTION">In Production ({inProdCount})</option>
                <option value="READY">Ready for Pickup ({readyCount})</option>
                <option value="COMPLETED">Completed ({completedCount})</option>
                <option value="CANCELLED">Cancelled ({cancelledCount})</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 rounded-xl bg-white border border-bakery-beige text-xs font-semibold text-bakery-chocolate focus:outline-hidden"
              >
                <option value="TARGET_DATE">Sort: Target Date Needed</option>
                <option value="NEWEST">Sort: Newest Logged First</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center bg-bakery-cream p-1 rounded-xl border border-bakery-beige">
                <button
                  onClick={() => setViewMode('cards')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                    viewMode === 'cards' ? 'bg-bakery-chocolate text-white' : 'text-bakery-chocolate'
                  }`}
                >
                  Cards
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                    viewMode === 'table' ? 'bg-bakery-chocolate text-white' : 'text-bakery-chocolate'
                  }`}
                >
                  Table
                </button>
              </div>

              {pageTab === 'WHOLESALE' ? (
                <button
                  onClick={() => {
                    setNewOrderType('WHOLESALE');
                    setIsCreateModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-bakery-chocolate text-white text-xs font-bold hover:bg-[#2c1108] shadow-warm-sm transition-transform active:scale-95 flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4 text-bakery-caramel" />
                  <span>Record Whole Sales Order</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setNewOrderType('REGULAR');
                      setIsCreateModalOpen(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-bakery-chocolate text-white text-xs font-bold hover:bg-[#2c1108] shadow-warm-sm transition-transform active:scale-95 flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4 text-bakery-caramel" />
                    <span>Record Pre-Order</span>
                  </button>
                  <button
                    onClick={() => {
                      setNewOrderType('WHOLESALE');
                      setIsCreateModalOpen(true);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-bakery-caramel text-white text-xs font-bold hover:bg-[#936535] shadow-warm-sm transition-transform active:scale-95 flex items-center gap-1.5"
                    title="Record a Reseller Whole Sales Order with automatic volume discounts"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">+ Whole Sales Order</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {filteredInquiries.length === 0 && (
            <div className="p-10 rounded-3xl bg-bakery-ivory border border-bakery-beige text-center space-y-3 shadow-warm-xs">
              <div className="w-12 h-12 rounded-2xl bg-bakery-cream border border-bakery-beige flex items-center justify-center mx-auto text-bakery-caramel">
                {pageTab === 'WHOLESALE' ? <Layers className="w-6 h-6" /> : <ShoppingBag className="w-6 h-6" />}
              </div>
              <h3 className="font-display font-bold text-lg text-bakery-chocolate">
                {pageTab === 'WHOLESALE' ? 'No Whole Sales Orders Recorded Yet' : 'No Customer Orders Found'}
              </h3>
              <p className="text-xs text-bakery-muted max-w-md mx-auto">
                {pageTab === 'WHOLESALE'
                  ? 'Record your reseller and bulk partner orders here to automatically apply tiered wholesale discounts and sync with Production and Sales.'
                  : 'Record a customer pre-order or adjust your status/search filters above.'}
              </p>
              <button
                onClick={() => {
                  setNewOrderType(pageTab === 'WHOLESALE' ? 'WHOLESALE' : 'REGULAR');
                  setIsCreateModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-bakery-chocolate text-white text-xs font-bold hover:bg-[#2c1108] shadow-warm-sm"
              >
                <Plus className="w-4 h-4 text-bakery-caramel" />
                <span>{pageTab === 'WHOLESALE' ? 'Record First Whole Sales Order' : 'Record Customer Pre-Order'}</span>
              </button>
            </div>
          )}

          {/* Orders Cards View */}
          {viewMode === 'cards' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredInquiries.map((inq) => {
                const orderRef = inq.shared_order_number || inq.inquiry_number;
                const balance = Number(inq.remaining_balance ?? (Number(inq.estimated_total || 0) - Number(inq.amount_paid || 0)));
                return (
                  <div
                    key={inq.id}
                    className="bg-bakery-ivory rounded-2xl border border-bakery-beige p-5 shadow-warm-xs hover:shadow-warm-md transition-all flex flex-col justify-between space-y-4"
                  >
                    {/* Header */}
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-bold text-bakery-caramel bg-bakery-cream px-2 py-0.5 rounded-md border border-bakery-beige">
                              {orderRef}
                            </span>
                            {inq.order_type && inq.order_type !== 'REGULAR' && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-bakery-chocolate text-white">
                                {inq.order_type}
                              </span>
                            )}
                          </div>
                          <h3 className="font-display font-bold text-base text-bakery-chocolate mt-1">
                            {inq.customer_name}
                          </h3>
                          <a
                            href={`tel:${inq.customer_phone}`}
                            className="text-xs text-bakery-muted flex items-center gap-1 hover:text-bakery-caramel"
                          >
                            <Phone className="w-3 h-3" />
                            <span>{inq.customer_phone}</span>
                          </a>
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          {renderStatusBadge(inq.status, inq)}
                          {renderPaymentBadge(inq)}
                        </div>
                      </div>

                      {/* Details */}
                      <div className="mt-3 pt-3 border-t border-bakery-beige/60 space-y-2 text-xs">
                        <div className="flex items-center justify-between text-bakery-muted">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-bakery-caramel" />
                            Target Date:
                          </span>
                          <strong className="text-bakery-chocolate">
                            {inq.target_date ? new Date(inq.target_date).toLocaleDateString() : 'Immediate'}
                          </strong>
                        </div>

                        {inq.payment_due_date && balance > 0 && (
                          <div className="flex items-center justify-between text-amber-700 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20">
                            <span className="flex items-center gap-1 font-semibold">
                              <Clock className="w-3.5 h-3.5" />
                              Payment Due:
                            </span>
                            <strong>{new Date(inq.payment_due_date).toLocaleDateString()}</strong>
                          </div>
                        )}

                        <div className="p-2.5 rounded-xl bg-bakery-cream/70 border border-bakery-beige/80 text-[11px] space-y-1">
                          <p className="font-semibold text-bakery-chocolate uppercase tracking-wider text-[10px]">
                            Items Ordered:
                          </p>
                          <p className="text-bakery-espresso/80 whitespace-pre-line leading-relaxed">
                            {inq.items_summary || 'No item details specified'}
                          </p>
                        </div>

                        {inq.delivery_address && (
                          <div className="text-[11px] text-bakery-muted flex items-start gap-1">
                            <MapPin className="w-3 h-3 text-bakery-caramel shrink-0 mt-0.5" />
                            <span>{inq.delivery_address}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-1">
                          <span className="font-semibold text-bakery-muted">Estimated Total:</span>
                          <span className="font-display font-bold text-base text-bakery-chocolate">
                            ₱{Number(inq.estimated_total || 0).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions Toolbar */}
                    <div className="pt-3 border-t border-bakery-beige/70 space-y-2">
                      {/* Workflow Buttons */}
                      <div className="grid grid-cols-2 gap-1.5">
                        {inq.status !== 'COMPLETED' && inq.status !== 'CANCELLED' && (
                          <button
                            type="button"
                            onClick={() => handleSendToProduction(inq)}
                            className="px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold flex items-center justify-center gap-1 transition-colors shadow-2xs"
                            title="Schedule batches in Production"
                          >
                            <ChefHat className="w-3.5 h-3.5" />
                            <span>To Production</span>
                          </button>
                        )}

                        {balance > 0 && (
                          <button
                            type="button"
                            onClick={() => openPaymentModal(inq)}
                            className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center justify-center gap-1 transition-colors shadow-2xs"
                            title="Record Customer Payment"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Pay ₱{balance.toFixed(0)}</span>
                          </button>
                        )}

                        {balance > 0 && inq.status !== 'CANCELLED' && !isOrderGivenDue(inq) && (
                          <button
                            type="button"
                            onClick={() => handleMarkGivenDue(inq)}
                            className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold flex items-center justify-center gap-1 transition-colors shadow-2xs"
                            title="Order given to customer; payment due in 1 week"
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>Given • 1-Wk Due</span>
                          </button>
                        )}

                        {!inq.converted_sale && inq.status !== 'CANCELLED' && (
                          <button
                            type="button"
                            onClick={() => setConvertingInquiry(inq)}
                            className="px-2.5 py-1.5 rounded-xl bg-bakery-chocolate hover:bg-[#2c1108] text-white text-[11px] font-bold flex items-center justify-center gap-1 transition-colors shadow-2xs"
                          >
                            <ReceiptText className="w-3.5 h-3.5 text-bakery-caramel" />
                            <span>Convert Sale</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setReceiptPreviewInquiry(inq)}
                          className="px-2.5 py-1.5 rounded-xl bg-bakery-cream hover:bg-bakery-beige border border-bakery-beige text-bakery-chocolate text-[11px] font-bold flex items-center justify-center gap-1 transition-colors shadow-2xs"
                          title="Preview & Download Official Receipt Image (.png)"
                        >
                          <ImageIcon className="w-3.5 h-3.5 text-bakery-chocolate" />
                          <span>Receipt Image</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSlipInquiry(inq)}
                          className="px-2.5 py-1.5 rounded-xl bg-white border border-bakery-beige hover:bg-bakery-cream text-bakery-chocolate text-[11px] font-bold flex items-center justify-center gap-1 transition-colors"
                        >
                          <Printer className="w-3.5 h-3.5 text-bakery-caramel" />
                          <span>Kitchen Slip</span>
                        </button>
                      </div>

                      {/* Status Dropdown & Edit / Delete */}
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <select
                          value={inq.status}
                          onChange={(e) => handleUpdateStatus(inq.id, e.target.value)}
                          className="px-2 py-1 rounded-lg bg-white border border-bakery-beige text-[11px] font-semibold text-bakery-chocolate focus:outline-hidden flex-1"
                        >
                          <option value="NEW">New Order</option>
                          <option value="PENDING">Pending</option>
                          <option value="CONFIRMED">Confirmed</option>
                          <option value="SCHEDULED_PRODUCTION">In Production</option>
                          <option value="READY">Ready for Pickup</option>
                          <option value="COMPLETED">Completed</option>
                          <option value="CANCELLED">Cancelled</option>
                        </select>

                        <button
                          onClick={() => openEditModal(inq)}
                          className="p-1.5 rounded-lg border border-bakery-beige bg-white hover:bg-bakery-cream text-bakery-chocolate transition-colors"
                          title="Edit Order"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDelete(inq)}
                          className="p-1.5 rounded-lg border border-red-200 bg-white hover:bg-red-50 text-red-600 transition-colors"
                          title="Delete Order"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Orders Table View */
            <div className="bg-bakery-ivory rounded-2xl border border-bakery-beige overflow-hidden shadow-warm-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-bakery-chocolate">
                  <thead className="bg-bakery-cream/80 text-[11px] uppercase tracking-wider text-bakery-muted border-b border-bakery-beige">
                    <tr>
                      <th className="py-3 px-4">Order Ref</th>
                      <th className="py-3 px-4">Customer &amp; Phone</th>
                      <th className="py-3 px-4">Target Date</th>
                      <th className="py-3 px-4">Items Summary</th>
                      <th className="py-3 px-4 text-right">Total (₱)</th>
                      <th className="py-3 px-4">Payment Status</th>
                      <th className="py-3 px-4">Order Status</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-bakery-beige/60">
                    {filteredInquiries.map((inq) => {
                      const orderRef = inq.shared_order_number || inq.inquiry_number;
                      const balance = Number(inq.remaining_balance ?? (Number(inq.estimated_total || 0) - Number(inq.amount_paid || 0)));
                      return (
                        <tr key={inq.id} className="hover:bg-bakery-cream/30 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-bakery-caramel">{orderRef}</td>
                          <td className="py-3 px-4">
                            <span className="font-bold block">{inq.customer_name}</span>
                            <span className="text-[11px] text-bakery-muted">{inq.customer_phone}</span>
                          </td>
                          <td className="py-3 px-4 font-medium">
                            {inq.target_date ? new Date(inq.target_date).toLocaleDateString() : 'Immediate'}
                          </td>
                          <td className="py-3 px-4 max-w-xs truncate text-[11px]" title={inq.items_summary}>
                            {inq.items_summary || '—'}
                          </td>
                          <td className="py-3 px-4 text-right font-display font-bold">
                            ₱{Number(inq.estimated_total || 0).toFixed(2)}
                          </td>
                          <td className="py-3 px-4">{renderPaymentBadge(inq)}</td>
                          <td className="py-3 px-4">{renderStatusBadge(inq.status, inq)}</td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {balance > 0 && (
                                <button
                                  onClick={() => openPaymentModal(inq)}
                                  className="px-2 py-1 rounded bg-emerald-600 text-white font-bold text-[10px] hover:bg-emerald-700"
                                  title="Record Payment"
                                >
                                  Pay
                                </button>
                              )}
                              {balance > 0 && inq.status !== 'CANCELLED' && !isOrderGivenDue(inq) && (
                                <button
                                  onClick={() => handleMarkGivenDue(inq)}
                                  className="px-2 py-1 rounded bg-amber-500 text-white font-bold text-[10px] hover:bg-amber-600"
                                  title="Given • 1-Week Due"
                                >
                                  1-Wk Due
                                </button>
                              )}
                              {!inq.converted_sale && inq.status !== 'CANCELLED' && (
                                <button
                                  onClick={() => setConvertingInquiry(inq)}
                                  className="px-2 py-1 rounded bg-bakery-chocolate text-white font-bold text-[10px] hover:bg-[#2c1108]"
                                  title="Convert to Official Sale"
                                >
                                  Record Sale
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setReceiptPreviewInquiry(inq)}
                                className="p-1 rounded bg-bakery-cream border border-bakery-beige hover:bg-bakery-beige text-bakery-chocolate"
                                title="Preview & Download Official Receipt Image (.png)"
                              >
                                <ImageIcon className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleSendToProduction(inq)}
                                className="p-1 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100"
                                title="Send to Production"
                              >
                                <ChefHat className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setSlipInquiry(inq)}
                                className="p-1 rounded bg-white border border-bakery-beige hover:bg-bakery-cream"
                                title="Kitchen Slip"
                              >
                                <Printer className="w-3.5 h-3.5 text-bakery-caramel" />
                              </button>
                              <button
                                onClick={() => openEditModal(inq)}
                                className="p-1 rounded bg-white border border-bakery-beige hover:bg-bakery-cream"
                                title="Edit"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-bakery-chocolate" />
                              </button>
                              <button
                                onClick={() => handleDelete(inq)}
                                className="p-1 rounded bg-white border border-red-200 hover:bg-red-50 text-red-600"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: LOYALTY CARDS */}
      {pageTab === 'LOYALTY' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-bakery-ivory border border-bakery-beige">
              <span className="text-[11px] font-bold text-bakery-muted uppercase">Enrolled Customers</span>
              <p className="text-2xl font-display font-bold text-bakery-chocolate">{customers.length}</p>
            </div>
            <div className="p-4 rounded-2xl bg-bakery-ivory border border-bakery-beige">
              <span className="text-[11px] font-bold text-bakery-muted uppercase">Active Stamps</span>
              <p className="text-2xl font-display font-bold text-bakery-caramel">{totalStampsAwarded}</p>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300">
              <span className="text-[11px] font-bold text-emerald-800 uppercase">Ready for Free Brownies</span>
              <p className="text-2xl font-display font-bold text-emerald-700">{readyForRewardCount}</p>
            </div>
            <div className="p-4 rounded-2xl bg-bakery-chocolate text-white">
              <span className="text-[11px] font-bold text-bakery-cream/70 uppercase">Rewards Redeemed</span>
              <p className="text-2xl font-display font-bold">{totalRewardsRedeemed}</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-bakery-ivory border border-bakery-beige flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-bakery-muted" />
              <input
                type="text"
                placeholder="Search name, phone, card #..."
                value={loyaltySearch}
                onChange={(e) => setLoyaltySearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-bakery-beige text-xs focus:outline-hidden"
              />
            </div>
            <select
              value={loyaltyFilter}
              onChange={(e) => setLoyaltyFilter(e.target.value as any)}
              className="px-3 py-2 rounded-xl bg-white border border-bakery-beige text-xs font-semibold text-bakery-chocolate"
            >
              <option value="ALL">All Cards</option>
              <option value="READY">Ready for reward (5+)</option>
              <option value="ACTIVE">Collecting (1-4)</option>
              <option value="ZERO">No stamps yet</option>
            </select>
            <p className="text-[11px] text-bakery-muted">Buy a box worth ₱100+ = 1 stamp. 5 stamps = FREE small box of brownies (3 pcs).</p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {filteredLoyaltyCustomers.map((c) => {
              const stamps = Math.min(5, Number(c.loyalty_stamps || 0));
              const xs = [12.25, 27.34, 42.43, 57.47, 72.56];
              const busy = updatingLoyaltyId === c.id;
              return (
                <div key={c.id} className="bg-bakery-ivory rounded-2xl border border-bakery-beige p-4 space-y-3 shadow-warm-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-display font-bold text-bakery-chocolate">{c.name}</h3>
                      <span className="text-[10px] font-mono text-bakery-caramel">
                        {c.loyalty_card_number} {c.phone ? `• ${c.phone}` : ''}
                      </span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${Number(c.loyalty_stamps || 0) >= 5 ? 'bg-emerald-600 text-white' : 'bg-bakery-cream text-bakery-chocolate border border-bakery-beige'}`}>
                      {Number(c.loyalty_stamps || 0) >= 5 ? '🎁 Reward Ready' : `${Number(c.loyalty_stamps || 0)} / 5`}
                    </span>
                  </div>

                  <div className="relative w-full rounded-xl overflow-hidden border border-bakery-beige cursor-pointer" onClick={() => setLoyaltyPreviewCustomer(c)}>
                    <img src="/loyalty-card-bg.jpg" alt="CRAVEABLES Loyalty Card" className="w-full h-auto block" />
                    {xs.map((x, idx) => {
                      const filled = idx < stamps;
                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={busy}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdateLoyalty(c, 'set_stamps', filled && idx + 1 === stamps ? idx : idx + 1);
                          }}
                          className="absolute rounded-full overflow-hidden -translate-x-1/2 -translate-y-1/2"
                          style={{ left: `${x}%`, top: '63.1%', width: '11%', aspectRatio: '1 / 1' }}
                          title={`Set to ${idx + 1} stamp(s)`}
                        >
                          {filled && <img src="/logo.png" alt="stamp" className="w-full h-full object-cover rounded-full" />}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    <button disabled={busy} onClick={() => handleUpdateLoyalty(c, 'remove_stamp')} className="px-2.5 py-1.5 rounded-lg bg-white border border-bakery-beige font-bold">-1 Stamp</button>
                    <button disabled={busy} onClick={() => handleUpdateLoyalty(c, 'add_stamp')} className="px-2.5 py-1.5 rounded-lg bg-bakery-chocolate text-white font-bold">+1 Stamp</button>
                    <button disabled={busy} onClick={() => openEditLoyaltyModal(c)} className="px-2.5 py-1.5 rounded-lg bg-white border border-bakery-beige font-bold flex items-center gap-1"><Edit3 className="w-3 h-3" />Edit</button>
                    <button
                      disabled={busy || Number(c.loyalty_stamps || 0) < 5}
                      onClick={() => handleUpdateLoyalty(c, 'redeem_reward')}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white font-bold flex items-center gap-1 disabled:opacity-40"
                    >
                      <Gift className="w-3 h-3" />Claim Free Brownies
                    </button>
                    <a
                      href={api.getCustomerLoyaltyCardImageUrl(c.id)}
                      download={`CRAVEABLES-Loyalty-Card-${c.name}.png`}
                      className="px-2.5 py-1.5 rounded-lg bg-bakery-cream border border-bakery-beige font-bold flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" />Card (.png)
                    </a>
                  </div>
                  <p className="text-[10px] text-bakery-muted">
                    Qualifying orders: {c.qualifying_orders_count || 0} • Rewards claimed: {c.rewards_redeemed || 0}
                  </p>
                </div>
              );
            })}
            {filteredLoyaltyCustomers.length === 0 && (
              <p className="text-xs text-bakery-muted p-6">No loyalty cards match your filter.</p>
            )}
          </div>
        </div>
      )}

      {/* Loyalty Card Image Preview */}
      {loyaltyPreviewCustomer && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setLoyaltyPreviewCustomer(null)}>
          <div className="bg-bakery-ivory rounded-3xl max-w-2xl w-full p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
            <img src={api.getCustomerLoyaltyCardImageUrl(loyaltyPreviewCustomer.id, true) + '&t=' + Date.now()} alt="Loyalty card" className="w-full rounded-xl border border-bakery-beige" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setLoyaltyPreviewCustomer(null)} className="px-4 py-2 rounded-xl border border-bakery-beige text-xs font-semibold">Close</button>
              <a
                href={api.getCustomerLoyaltyCardImageUrl(loyaltyPreviewCustomer.id)}
                download={`CRAVEABLES-Loyalty-Card-${loyaltyPreviewCustomer.name}.png`}
                className="px-4 py-2 rounded-xl bg-bakery-chocolate text-white text-xs font-bold"
              >
                Download Loyalty Card (.png)
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Edit Loyalty Modal */}
      {editingLoyaltyCustomer && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form onSubmit={handleSaveManualLoyalty} className="bg-bakery-ivory rounded-3xl max-w-sm w-full p-5 space-y-3 text-xs">
            <h3 className="font-display font-bold text-base text-bakery-chocolate">Edit Loyalty Card — {editingLoyaltyCustomer.name}</h3>
            <div>
              <label className="block font-semibold mb-1">Current Stamps</label>
              <input type="number" min="0" value={manualStampsInput} onChange={(e) => setManualStampsInput(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige" />
            </div>
            <div>
              <label className="block font-semibold mb-1">Free Brownie Rewards Claimed</label>
              <input type="number" min="0" value={manualRewardsInput} onChange={(e) => setManualRewardsInput(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige" />
            </div>
            <div>
              <label className="block font-semibold mb-1">Notes</label>
              <textarea rows={3} value={manualRewardNotes} onChange={(e) => setManualRewardNotes(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige" />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditingLoyaltyCustomer(null)} className="px-4 py-2 rounded-xl border border-bakery-beige font-semibold">Cancel</button>
              <button type="submit" className="px-4 py-2 rounded-xl bg-bakery-chocolate text-white font-bold">Save</button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: FEATURED GALLERY (Section 1B) */}
      {pageTab === 'FEATURED_GALLERY' && (
        <div className="space-y-6">
          <div className="p-5 rounded-3xl bg-bakery-ivory border border-bakery-beige flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-warm-xs">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold tracking-widest text-bakery-caramel uppercase bg-bakery-caramel/10 px-2.5 py-0.5 rounded-full border border-bakery-caramel/20">
                  Lucena City Storefront Showcase
                </span>
                <span className="text-xs text-bakery-muted">({featuredOrders.length} Completed Orders Displayed)</span>
              </div>
              <h2 className="font-display font-bold text-xl text-bakery-chocolate mt-1">
                Featured Orders Photo &amp; Video Gallery Manager
              </h2>
              <p className="text-xs text-bakery-muted max-w-xl">
                Upload real photos or videos of large corporate cookie boxes, birthday dessert hampers, and custom event bakes to showcase on the public landing page.
              </p>
            </div>

            <button
              onClick={() => setIsUploadFeaturedOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-bakery-chocolate text-white text-xs font-bold hover:bg-[#2c1108] shadow-warm-sm transition-transform active:scale-95 flex items-center gap-2 shrink-0"
            >
              <Upload className="w-4 h-4 text-bakery-caramel" />
              <span>Upload Photo or Video</span>
            </button>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {['ALL', 'Cookies', 'Brownies', 'Cakes', 'Bulk Package', 'Special Event'].map((cat) => (
              <button
                key={cat}
                onClick={() => setFeaturedCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  featuredCategoryFilter === cat
                    ? 'bg-bakery-chocolate text-white shadow-warm-xs'
                    : 'bg-white border border-bakery-beige text-bakery-chocolate hover:bg-bakery-cream'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Gallery Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredOrders
              .filter((f) =>
                featuredCategoryFilter === 'ALL'
                  ? true
                  : f.category.toLowerCase().includes(featuredCategoryFilter.toLowerCase()) ||
                    f.order_type.toLowerCase().includes(featuredCategoryFilter.toLowerCase())
              )
              .map((order) => {
                const imgSrc = order.image_url || order.image || '/poster-choco-chip.jpg';
                const isVideo =
                  order.media_type === 'video' ||
                  /\.(mp4|mov|webm|ogg|m4v|avi)(\?|$)/i.test(imgSrc);
                return (
                  <div
                    key={order.id}
                    className="bg-bakery-ivory rounded-3xl border border-bakery-beige overflow-hidden shadow-warm-xs hover:shadow-warm-md transition-all flex flex-col justify-between"
                  >
                    <div className="relative aspect-square bg-bakery-cream overflow-hidden">
                      {isVideo ? (
                        <video
                          src={imgSrc}
                          controls
                          muted
                          loop
                          playsInline
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <img
                          src={imgSrc}
                          alt={order.title}
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = '/poster-choco-chip.jpg';
                          }}
                          className="w-full h-full object-cover"
                        />
                      )}
                      <div className="absolute top-2 left-2 flex flex-wrap gap-1 pointer-events-none">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-bakery-chocolate/90 text-white backdrop-blur-xs">
                          {order.order_type}
                        </span>
                        {isVideo && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-600 text-white">
                            🎥 Video
                          </span>
                        )}
                        {order.pieces_count && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-bakery-caramel text-white">
                            {order.pieces_count} pcs
                          </span>
                        )}
                      </div>

                      <div className="absolute bottom-2 right-2 flex items-center gap-1">
                        <button
                          onClick={() => handleToggleFeatured(order.id)}
                          className={`p-1.5 rounded-full backdrop-blur-xs shadow-xs transition-colors ${
                            order.is_featured
                              ? 'bg-amber-400 text-bakery-chocolate'
                              : 'bg-black/50 text-white hover:bg-black/70'
                          }`}
                          title={order.is_featured ? 'Featured on Home' : 'Set as Featured'}
                        >
                          <Star className="w-3.5 h-3.5 fill-current" />
                        </button>
                        <button
                          onClick={() => handleTogglePublished(order.id)}
                          className={`p-1.5 rounded-full backdrop-blur-xs shadow-xs transition-colors ${
                            order.is_published
                              ? 'bg-emerald-600 text-white'
                              : 'bg-red-500 text-white'
                          }`}
                          title={order.is_published ? 'Published' : 'Hidden'}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center justify-between text-[10px] text-bakery-muted mb-1">
                          <span className="uppercase font-bold tracking-wider text-bakery-caramel">
                            {order.category}
                          </span>
                          {order.order_date && <span>{new Date(order.order_date).toLocaleDateString()}</span>}
                        </div>
                        <h4 className="font-display font-bold text-sm text-bakery-chocolate leading-tight">
                          {order.title}
                        </h4>
                        <p className="text-[11px] text-bakery-muted mt-1 line-clamp-3 leading-relaxed">
                          {order.description}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-bakery-beige/60 flex items-center justify-between">
                        <span className="text-[10px] text-bakery-muted">
                          Status: <strong>{order.is_published ? 'Visible' : 'Hidden'}</strong>
                        </span>
                        <button
                          onClick={() => handleDeleteFeatured(order.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* TAB 3: CUSTOMERS (Section 2) */}
      {pageTab === 'CUSTOMERS' && (
        <div className="space-y-6">
          {/* Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-bakery-ivory border border-bakery-beige shadow-warm-xs">
              <span className="text-[11px] font-bold text-bakery-muted uppercase tracking-wider block mb-1">Total Customers</span>
              <p className="text-2xl font-display font-bold text-bakery-chocolate">{customers.length}</p>
              <p className="text-[10px] text-bakery-muted">In Lucena City and nearby</p>
            </div>

            <div className="p-4 rounded-2xl bg-bakery-ivory border border-bakery-beige shadow-warm-xs">
              <span className="text-[11px] font-bold text-bakery-muted uppercase tracking-wider block mb-1">Total Orders</span>
              <p className="text-2xl font-display font-bold text-bakery-caramel">
                {customers.reduce((sum, c) => sum + (c.total_orders || 0), 0)}
              </p>
              <p className="text-[10px] text-bakery-muted">Linked to profiles</p>
            </div>

            <div className="p-4 rounded-2xl bg-bakery-ivory border border-bakery-beige shadow-warm-xs">
              <span className="text-[11px] font-bold text-bakery-muted uppercase tracking-wider block mb-1">Total Customer Spend</span>
              <p className="text-2xl font-display font-bold text-emerald-700">
                ₱{customers.reduce((sum, c) => sum + Number(c.total_ordered_amount || 0), 0).toFixed(2)}
              </p>
              <p className="text-[10px] text-bakery-muted">Lifetime pre-orders</p>
            </div>

            <div className="p-4 rounded-2xl bg-bakery-ivory border border-bakery-beige shadow-warm-xs">
              <span className="text-[11px] font-bold text-bakery-muted uppercase tracking-wider block mb-1">Outstanding Balance</span>
              <p className="text-2xl font-display font-bold text-red-600">
                ₱{customers.reduce((sum, c) => sum + Number(c.total_outstanding_balance || 0), 0).toFixed(2)}
              </p>
              <p className="text-[10px] text-bakery-muted">Uncollected receivables</p>
            </div>
          </div>

          {/* Action Bar */}
          <div className="p-4 rounded-2xl bg-bakery-ivory border border-bakery-beige flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-warm-xs">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-bakery-muted" />
              <input
                type="text"
                placeholder="Search customers by name, phone, address..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-bakery-beige text-xs text-bakery-chocolate placeholder-bakery-muted focus:outline-hidden"
              />
            </div>

            <button
              onClick={() => {
                setEditingCustomer(null);
                setCustFormName('');
                setCustFormPhone('');
                setCustFormEmail('');
                setCustFormAddress('');
                setCustFormNotes('');
                setIsCustomerModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-bakery-chocolate text-white text-xs font-bold hover:bg-[#2c1108] shadow-warm-sm transition-transform active:scale-95 flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-4 h-4 text-bakery-caramel" />
              <span>Add Customer</span>
            </button>
          </div>

          {/* Customer Table */}
          <div className="bg-bakery-ivory rounded-2xl border border-bakery-beige overflow-hidden shadow-warm-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-bakery-chocolate">
                <thead className="bg-bakery-cream/80 text-[11px] uppercase tracking-wider text-bakery-muted border-b border-bakery-beige">
                  <tr>
                    <th className="py-3 px-4">Customer Name</th>
                    <th className="py-3 px-4">Phone Number</th>
                    <th className="py-3 px-4">Address / Delivery Area</th>
                    <th className="py-3 px-4 text-center">Orders</th>
                    <th className="py-3 px-4 text-right">Total Spent (₱)</th>
                    <th className="py-3 px-4 text-right">Balance Due (₱)</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-bakery-beige/60">
                  {filteredCustomers.map((cust) => {
                    const balance = Number(cust.total_outstanding_balance || 0);
                    return (
                      <tr key={cust.id} className="hover:bg-bakery-cream/30 transition-colors">
                        <td className="py-3 px-4 font-bold text-bakery-chocolate">{cust.name}</td>
                        <td className="py-3 px-4 font-mono text-[11px]">{cust.phone}</td>
                        <td className="py-3 px-4 text-[11px] text-bakery-muted truncate max-w-xs">{cust.address || '—'}</td>
                        <td className="py-3 px-4 text-center font-bold">{cust.total_orders}</td>
                        <td className="py-3 px-4 text-right font-display font-bold">
                          ₱{Number(cust.total_ordered_amount || 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-display font-bold">
                          {balance > 0 ? (
                            <span className="text-red-600">₱{balance.toFixed(2)}</span>
                          ) : (
                            <span className="text-emerald-700">₱0.00</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenCustomerProfile(cust)}
                              className="px-2.5 py-1 rounded-lg bg-bakery-cream border border-bakery-beige hover:bg-bakery-beige text-bakery-chocolate font-bold text-[11px] flex items-center gap-1"
                              title="View Order & Payment History"
                            >
                              <History className="w-3.5 h-3.5 text-bakery-caramel" />
                              <span>History</span>
                            </button>
                            <button
                              onClick={() => {
                                setEditingCustomer(cust);
                                setCustFormName(cust.name);
                                setCustFormPhone(cust.phone);
                                setCustFormEmail(cust.email || '');
                                setCustFormAddress(cust.address || '');
                                setCustFormNotes(cust.notes || '');
                                setIsCustomerModalOpen(true);
                              }}
                              className="p-1 rounded-lg bg-white border border-bakery-beige hover:bg-bakery-cream"
                              title="Edit"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-bakery-chocolate" />
                            </button>
                            <button
                              onClick={() => handleDeleteCustomer(cust)}
                              className="p-1 rounded-lg bg-white border border-red-200 hover:bg-red-50 text-red-600"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: RECEIVABLES (Section 6) */}
      {pageTab === 'RECEIVABLES' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-bakery-chocolate text-white shadow-warm-sm">
              <span className="text-[11px] font-bold text-bakery-cream/70 uppercase tracking-wider block mb-1">
                Total Uncollected Receivables
              </span>
              <p className="text-2xl font-display font-bold text-bakery-cream">
                ₱{receivablesSummary?.total_receivables ? Number(receivablesSummary.total_receivables).toFixed(2) : '0.00'}
              </p>
              <p className="text-[10px] text-bakery-cream/70">Across all open orders</p>
            </div>

            <div className="p-4 rounded-2xl bg-bakery-ivory border border-bakery-beige shadow-warm-xs">
              <span className="text-[11px] font-bold text-bakery-muted uppercase tracking-wider block mb-1">
                Orders with Balance
              </span>
              <p className="text-2xl font-display font-bold text-bakery-chocolate">{receivableOrders.length}</p>
              <p className="text-[10px] text-bakery-muted">Requiring payment collection</p>
            </div>

            <div className="p-4 rounded-2xl bg-bakery-ivory border border-bakery-beige shadow-warm-xs">
              <span className="text-[11px] font-bold text-bakery-muted uppercase tracking-wider block mb-1">
                Due Today / Soon
              </span>
              <p className="text-2xl font-display font-bold text-amber-600">
                {receivablesSummary?.due_today_count || 0}
              </p>
              <p className="text-[10px] text-bakery-muted">
                ₱{Number(receivablesSummary?.due_today_amount || 0).toFixed(2)} due today
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-bakery-ivory border border-bakery-beige shadow-warm-xs">
              <span className="text-[11px] font-bold text-bakery-muted uppercase tracking-wider block mb-1">
                Overdue Accounts
              </span>
              <p className="text-2xl font-display font-bold text-red-600">
                {receivableOrders.filter((i) => i.payment_status === 'OVERDUE').length}
              </p>
              <p className="text-[10px] text-red-600 font-semibold">Immediate follow-up required</p>
            </div>
          </div>

          {/* Receivables Table */}
          <div className="bg-bakery-ivory rounded-2xl border border-bakery-beige overflow-hidden shadow-warm-xs">
            <div className="p-4 bg-bakery-cream border-b border-bakery-beige flex items-center justify-between">
              <h3 className="font-display font-bold text-sm text-bakery-chocolate">
                Customer Balances &amp; Upcoming Payment Due Dates
              </h3>
              <span className="text-xs text-bakery-muted">{receivableOrders.length} accounts with remaining balance</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-bakery-chocolate">
                <thead className="bg-white text-[11px] uppercase tracking-wider text-bakery-muted border-b border-bakery-beige">
                  <tr>
                    <th className="py-3 px-4">Order #</th>
                    <th className="py-3 px-4">Customer Name</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4 text-right">Order Total</th>
                    <th className="py-3 px-4 text-right">Amount Paid</th>
                    <th className="py-3 px-4 text-right">Remaining Balance</th>
                    <th className="py-3 px-4">Payment Status</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-bakery-beige/60">
                  {receivableOrders.map((inq) => {
                    const balance = Number(inq.remaining_balance ?? (Number(inq.estimated_total || 0) - Number(inq.amount_paid || 0)));
                    return (
                      <tr key={inq.id} className="hover:bg-bakery-cream/30 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-bakery-caramel">
                          {inq.shared_order_number || inq.inquiry_number}
                        </td>
                        <td className="py-3 px-4 font-bold">{inq.customer_name}</td>
                        <td className="py-3 px-4 font-mono text-[11px]">{inq.customer_phone}</td>
                        <td className="py-3 px-4">
                          {inq.payment_due_date ? (
                            <span className="font-semibold text-amber-800">
                              {new Date(inq.payment_due_date).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="text-bakery-muted">On Pickup</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-display font-bold">
                          ₱{Number(inq.estimated_total || 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-display text-emerald-700 font-bold">
                          ₱{Number(inq.amount_paid || 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-display text-red-600 font-bold">
                          ₱{balance.toFixed(2)}
                        </td>
                        <td className="py-3 px-4">{renderPaymentBadge(inq)}</td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => openPaymentModal(inq)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-colors shadow-2xs flex items-center gap-1 mx-auto"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Record Payment</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: REVIEWS */}
      {pageTab === 'REVIEWS' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-bakery-ivory border border-bakery-beige shadow-warm-xs">
              <span className="text-[11px] font-bold text-bakery-muted uppercase tracking-wider block mb-1">Total Reviews</span>
              <p className="text-2xl font-display font-bold text-bakery-chocolate">{reviews.length}</p>
            </div>
            <div className="p-4 rounded-2xl bg-bakery-ivory border border-bakery-beige shadow-warm-xs">
              <span className="text-[11px] font-bold text-bakery-muted uppercase tracking-wider block mb-1">Pending Approval</span>
              <p className="text-2xl font-display font-bold text-amber-600">{pendingReviewsCount}</p>
            </div>
            <div className="p-4 rounded-2xl bg-bakery-ivory border border-bakery-beige shadow-warm-xs">
              <span className="text-[11px] font-bold text-bakery-muted uppercase tracking-wider block mb-1">Approved &amp; Live</span>
              <p className="text-2xl font-display font-bold text-emerald-600">{approvedReviewsCount}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredReviews.map((rev) => (
              <div key={rev.id} className="p-5 rounded-2xl bg-bakery-ivory border border-bakery-beige shadow-warm-xs space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-display font-bold text-base text-bakery-chocolate">{rev.customer_name}</h4>
                    <span className="text-[11px] text-bakery-muted">{rev.customer_location || 'Lucena City'}</span>
                  </div>
                  <div className="flex items-center gap-1 text-amber-500">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${i < rev.rating ? 'fill-current' : 'text-gray-300'}`}
                      />
                    ))}
                  </div>
                </div>

                <p className="text-xs text-bakery-espresso/90 italic bg-bakery-cream/50 p-3 rounded-xl border border-bakery-beige/60">
                  "{rev.comment}"
                </p>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-[11px] text-bakery-caramel font-semibold">{rev.product_name || 'Assorted Bakes'}</span>
                  <div className="flex items-center gap-2">
                    {!rev.is_approved ? (
                      <button
                        onClick={() => handleApproveReview(rev.id)}
                        className="px-3 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px] hover:bg-emerald-700"
                      >
                        Approve
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRejectReview(rev.id)}
                        className="px-3 py-1 rounded-lg bg-gray-200 text-gray-700 font-bold text-[11px] hover:bg-gray-300"
                      >
                        Hide
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteReview(rev.id)}
                      className="p-1 rounded-lg text-red-600 hover:bg-red-50"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: Record Customer Payment */}
      {isPaymentModalOpen && paymentOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-bakery-ivory w-full max-w-md rounded-3xl border border-bakery-beige shadow-warm-lg overflow-hidden animate-fade-in">
            <div className="p-5 bg-bakery-chocolate text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-bakery-caramel" />
                <div>
                  <h3 className="font-display font-bold text-base">Record Payment</h3>
                  <span className="text-xs text-bakery-cream/70">
                    Order #{paymentOrder.shared_order_number || paymentOrder.inquiry_number}
                  </span>
                </div>
              </div>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-bakery-cream/70 hover:text-white font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="p-6 space-y-4 text-xs">
              <div className="p-3 rounded-2xl bg-bakery-cream border border-bakery-beige flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-bakery-muted block">Customer</span>
                  <strong className="text-sm text-bakery-chocolate">{paymentOrder.customer_name}</strong>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-bakery-muted block">Remaining Balance</span>
                  <strong className="text-sm text-red-600 font-display">
                    ₱{Number(paymentOrder.remaining_balance ?? 0).toFixed(2)}
                  </strong>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-bakery-chocolate mb-1">Payment Amount (₱) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Enter amount paid"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige text-sm font-bold text-bakery-chocolate focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-bakery-chocolate mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige text-xs font-semibold text-bakery-chocolate focus:outline-hidden"
                  >
                    <option value="GCash">GCash</option>
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-bakery-chocolate mb-1">Payment Date</label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige text-xs text-bakery-chocolate focus:outline-hidden"
                  >
                  </input>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-bakery-chocolate mb-1">Reference / Transaction #</label>
                <input
                  type="text"
                  placeholder="e.g. GCash Ref # 1002394..."
                  value={paymentRefNumber}
                  onChange={(e) => setPaymentRefNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige text-xs text-bakery-chocolate focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-bakery-chocolate mb-1">Notes / Remarks</label>
                <textarea
                  rows={2}
                  placeholder="e.g. 50% downpayment for event order..."
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige text-xs text-bakery-chocolate focus:outline-hidden"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
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
                  <span>{recordingPayment ? 'Recording...' : 'Confirm Payment'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Upload Featured Bake Photo or Video (Section 1B) */}
      {isUploadFeaturedOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-bakery-ivory w-full max-w-lg rounded-3xl border border-bakery-beige shadow-warm-lg overflow-hidden animate-fade-in max-h-[90vh] flex flex-col">
            <div className="p-5 bg-bakery-chocolate text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-bakery-caramel" />
                <h3 className="font-display font-bold text-base">Upload Featured Bake Photo or Video</h3>
              </div>
              <button onClick={() => setIsUploadFeaturedOpen(false)} className="text-bakery-cream/70 hover:text-white font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleUploadFeatured} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div>
                <label className="block font-semibold text-bakery-chocolate mb-1.5">Bake Photo or Video (JPG, PNG, MP4, MOV) *</label>
                <div className="border-2 border-dashed border-bakery-beige rounded-2xl p-4 text-center bg-white hover:border-bakery-caramel transition-colors">
                  {featPreviewUrl ? (
                    <div className="relative aspect-video max-h-48 mx-auto rounded-xl overflow-hidden mb-2 bg-black">
                      {featFile?.type.startsWith('video/') || /\.(mp4|mov|webm|ogg|m4v)(\?|$)/i.test(featFile?.name || '') ? (
                        <video src={featPreviewUrl} controls muted loop playsInline className="w-full h-full object-contain" />
                      ) : (
                        <img src={featPreviewUrl} alt="Preview" className="w-full h-full object-cover" />
                      )}
                    </div>
                  ) : (
                    <div className="py-4 text-bakery-muted flex flex-col items-center gap-2">
                      <ImageIcon className="w-8 h-8 text-bakery-caramel" />
                      <span>Click to select a high-resolution photo or video of the completed bake</span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*,video/mp4,video/webm,video/quicktime,video/*"
                    required
                    onChange={handleFeaturedFileChange}
                    className="text-xs text-bakery-chocolate file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:bg-bakery-chocolate file:text-white file:text-xs file:font-bold hover:file:bg-[#2c1108]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-bakery-chocolate mb-1">Title / Order Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 50 pcs Assorted Cookie Box for BDO Lucena"
                  value={featTitle}
                  onChange={(e) => setFeatTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige text-xs text-bakery-chocolate focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-bakery-chocolate mb-1">Category</label>
                  <select
                    value={featCategory}
                    onChange={(e) => setFeatCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige text-xs font-semibold text-bakery-chocolate focus:outline-hidden"
                  >
                    <option value="Cookies">Cookies</option>
                    <option value="Brownies">Brownies</option>
                    <option value="Cakes">Banana Cakes</option>
                    <option value="Bulk Package">Bulk Package</option>
                    <option value="Special Event">Special Event</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-bakery-chocolate mb-1">Order Type</label>
                  <select
                    value={featOrderType}
                    onChange={(e) => setFeatOrderType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige text-xs font-semibold text-bakery-chocolate focus:outline-hidden"
                  >
                    <option value="Bulk Corporate">Bulk Corporate</option>
                    <option value="Birthday Hamper">Birthday Hamper</option>
                    <option value="Wedding Favors">Wedding Favors</option>
                    <option value="Family Box">Family Box</option>
                    <option value="Special Event">Special Event</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-bakery-chocolate mb-1">Pieces Count (optional)</label>
                  <input
                    type="number"
                    placeholder="e.g. 50"
                    value={featPieces}
                    onChange={(e) => setFeatPieces(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige text-xs text-bakery-chocolate focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-bakery-chocolate mb-1">Bake Date (optional)</label>
                  <input
                    type="date"
                    value={featDate}
                    onChange={(e) => setFeatDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige text-xs text-bakery-chocolate focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-bakery-chocolate mb-1">Description / Story</label>
                <textarea
                  rows={3}
                  placeholder="Describe the occasion, customized packaging, or flavors included..."
                  value={featDesc}
                  onChange={(e) => setFeatDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige text-xs text-bakery-chocolate focus:outline-hidden"
                />
              </div>

              <div className="flex items-center gap-6 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={featIsFeatured}
                    onChange={(e) => setFeatIsFeatured(e.target.checked)}
                    className="rounded text-bakery-chocolate"
                  />
                  <span className="font-bold text-bakery-chocolate">Featured on Landing Page</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={featIsPublished}
                    onChange={(e) => setFeatIsPublished(e.target.checked)}
                    className="rounded text-bakery-chocolate"
                  />
                  <span className="font-bold text-bakery-chocolate">Published (Public)</span>
                </label>
              </div>

              <div className="pt-3 border-t border-bakery-beige flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsUploadFeaturedOpen(false)}
                  className="px-4 py-2 rounded-xl border border-bakery-beige text-bakery-chocolate font-semibold hover:bg-bakery-beige/30"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingFeatured}
                  className="px-5 py-2 rounded-xl bg-bakery-chocolate hover:bg-[#2c1108] text-white font-bold transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Upload className="w-4 h-4 text-bakery-caramel" />
                  <span>{uploadingFeatured ? 'Uploading...' : 'Publish to Gallery'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Customer Profile & History (Section 2) */}
      {isCustomerModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-bakery-ivory w-full max-w-2xl rounded-3xl border border-bakery-beige shadow-warm-lg overflow-hidden animate-fade-in max-h-[90vh] flex flex-col">
            <div className="p-5 bg-bakery-chocolate text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-bakery-caramel" />
                <div>
                  <h3 className="font-display font-bold text-base">{selectedCustomer.name}</h3>
                  <span className="text-xs text-bakery-cream/70 font-mono">{selectedCustomer.phone}</span>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedCustomer(null);
                  setIsCustomerModalOpen(false);
                }}
                className="text-bakery-cream/70 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
              {/* Financial Snapshot */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-2xl bg-bakery-cream border border-bakery-beige text-center">
                  <span className="text-[10px] uppercase font-bold text-bakery-muted block">Total Orders</span>
                  <strong className="text-lg text-bakery-chocolate font-display">{selectedCustomer.total_orders}</strong>
                </div>
                <div className="p-3 rounded-2xl bg-bakery-cream border border-bakery-beige text-center">
                  <span className="text-[10px] uppercase font-bold text-bakery-muted block">Total Spent</span>
                  <strong className="text-lg text-emerald-700 font-display">
                    ₱{Number(selectedCustomer.total_ordered_amount || 0).toFixed(2)}
                  </strong>
                </div>
                <div className="p-3 rounded-2xl bg-bakery-cream border border-bakery-beige text-center">
                  <span className="text-[10px] uppercase font-bold text-bakery-muted block">Outstanding Balance</span>
                  <strong className="text-lg text-red-600 font-display">
                    ₱{Number(selectedCustomer.total_outstanding_balance || 0).toFixed(2)}
                  </strong>
                </div>
              </div>

              {/* Order History */}
              <div>
                <h4 className="font-display font-bold text-sm text-bakery-chocolate mb-2 flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4 text-bakery-caramel" />
                  <span>Order History</span>
                </h4>
                {loadingHistory ? (
                  <p className="text-bakery-muted text-center py-4">Loading order history...</p>
                ) : customerHistory?.orders?.length ? (
                  <div className="rounded-xl border border-bakery-beige overflow-hidden">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-bakery-cream text-bakery-muted font-bold border-b border-bakery-beige">
                        <tr>
                          <th className="p-2">Order #</th>
                          <th className="p-2">Target Date</th>
                          <th className="p-2 text-right">Total</th>
                          <th className="p-2 text-right">Balance</th>
                          <th className="p-2 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-bakery-beige/60 bg-white">
                        {customerHistory.orders.map((o) => (
                          <tr key={o.id}>
                            <td className="p-2 font-mono font-bold text-bakery-caramel">
                              {o.shared_order_number || o.inquiry_number}
                            </td>
                            <td className="p-2">{o.target_date || 'Immediate'}</td>
                            <td className="p-2 text-right font-bold">₱{Number(o.estimated_total).toFixed(2)}</td>
                            <td className="p-2 text-right font-bold text-red-600">
                              ₱{Number(o.remaining_balance).toFixed(2)}
                            </td>
                            <td className="p-2 text-center">{renderStatusBadge(o.status)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-bakery-muted py-2">No orders recorded yet for this customer.</p>
                )}
              </div>

              {/* Payment History */}
              <div>
                <h4 className="font-display font-bold text-sm text-bakery-chocolate mb-2 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-bakery-caramel" />
                  <span>Payment History</span>
                </h4>
                {customerHistory?.payments?.length ? (
                  <div className="rounded-xl border border-bakery-beige overflow-hidden">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-bakery-cream text-bakery-muted font-bold border-b border-bakery-beige">
                        <tr>
                          <th className="p-2">Date</th>
                          <th className="p-2">Order</th>
                          <th className="p-2">Method</th>
                          <th className="p-2">Reference</th>
                          <th className="p-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-bakery-beige/60 bg-white">
                        {customerHistory.payments.map((p) => (
                          <tr key={p.id}>
                            <td className="p-2">{p.payment_date}</td>
                            <td className="p-2 font-mono font-bold text-bakery-caramel">{p.order_number}</td>
                            <td className="p-2 font-semibold">{p.payment_method}</td>
                            <td className="p-2 font-mono text-bakery-muted">{p.reference_number || '—'}</td>
                            <td className="p-2 text-right font-bold text-emerald-700">₱{Number(p.amount).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-bakery-muted py-2">No payments recorded yet for this customer.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Add/Edit Customer */}
      {isCustomerModalOpen && !selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-bakery-ivory w-full max-w-md rounded-3xl border border-bakery-beige shadow-warm-lg overflow-hidden animate-fade-in">
            <div className="p-5 bg-bakery-chocolate text-white flex items-center justify-between">
              <h3 className="font-display font-bold text-base">
                {editingCustomer ? 'Edit Customer Details' : 'Add New Customer Profile'}
              </h3>
              <button onClick={() => setIsCustomerModalOpen(false)} className="text-bakery-cream/70 hover:text-white font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="p-6 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-bakery-chocolate mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maria Santos"
                  value={custFormName}
                  onChange={(e) => setCustFormName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige text-xs text-bakery-chocolate focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-bakery-chocolate mb-1">Phone Number (optional)</label>
                <input
                  type="text"
                  placeholder="0917-xxx-xxxx (optional)"
                  value={custFormPhone}
                  onChange={(e) => setCustFormPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige text-xs text-bakery-chocolate focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-bakery-chocolate mb-1">Email Address (optional)</label>
                <input
                  type="email"
                  placeholder="customer@gmail.com"
                  value={custFormEmail}
                  onChange={(e) => setCustFormEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige text-xs text-bakery-chocolate focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-bakery-chocolate mb-1">Delivery Address / Area</label>
                <input
                  type="text"
                  placeholder="Brgy. Gulang-Gulang, Lucena City"
                  value={custFormAddress}
                  onChange={(e) => setCustFormAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige text-xs text-bakery-chocolate focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-bakery-chocolate mb-1">Customer Preferences / Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Regular corporate customer, prefers less sweet..."
                  value={custFormNotes}
                  onChange={(e) => setCustFormNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige text-xs text-bakery-chocolate focus:outline-hidden"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-bakery-beige text-bakery-chocolate font-semibold hover:bg-bakery-beige/30"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCustomer}
                  className="px-5 py-2 rounded-xl bg-bakery-chocolate text-white font-bold hover:bg-[#2c1108] transition-colors disabled:opacity-50"
                >
                  {savingCustomer ? 'Saving...' : 'Save Customer Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Kitchen Baking Slip Print */}
      {slipInquiry && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl border border-bakery-beige shadow-warm-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <span className="font-display font-bold text-lg text-bakery-chocolate">CRAVEABLES</span>
                <span className="block text-[10px] text-bakery-muted uppercase">Kitchen Baking Slip</span>
              </div>
              <button onClick={() => setSlipInquiry(null)} className="text-gray-400 hover:text-black">
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Order Ref:</span>
                <strong className="font-mono">{slipInquiry.shared_order_number || slipInquiry.inquiry_number}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Customer:</span>
                <strong>{slipInquiry.customer_name} ({slipInquiry.customer_phone})</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Target Date:</span>
                <strong>{slipInquiry.target_date || 'Immediate'}</strong>
              </div>
              {slipInquiry.delivery_address && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Delivery:</span>
                  <span>{slipInquiry.delivery_address}</span>
                </div>
              )}

              <div className="p-3 bg-gray-50 rounded-xl border my-3">
                <p className="font-bold mb-1 text-[11px] uppercase tracking-wider text-gray-700">Order Items:</p>
                <pre className="text-xs font-sans whitespace-pre-wrap leading-relaxed">{slipInquiry.items_summary}</pre>
              </div>

              {slipInquiry.notes && (
                <div className="text-[11px] text-gray-600 bg-amber-50 p-2 rounded-lg border border-amber-200">
                  <strong>Notes:</strong> {slipInquiry.notes}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t">
              <button
                onClick={() => setSlipInquiry(null)}
                className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-semibold hover:bg-gray-100"
              >
                Close
              </button>
              <a
                href={api.getInquiryReceiptPdfUrl(slipInquiry.id, false)}
                download={`CRAVEABLES-Receipt-${slipInquiry.shared_order_number || slipInquiry.inquiry_number}.png`}
                className="px-4 py-2 rounded-xl bg-bakery-cream border border-bakery-beige text-bakery-chocolate text-xs font-bold hover:bg-bakery-beige flex items-center gap-1.5"
              >
                <ImageIcon className="w-4 h-4 text-bakery-caramel" />
                <span>Download Receipt Image (.png)</span>
              </a>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-bakery-chocolate text-white text-xs font-bold hover:bg-[#2c1108] flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4 text-bakery-caramel" />
                <span>Print Kitchen Slip</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Official Receipt Image Preview & Download */}
      {receiptPreviewInquiry && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-bakery-ivory w-full max-w-lg rounded-3xl border border-bakery-beige shadow-warm-lg overflow-hidden flex flex-col max-h-[92vh] animate-fade-in">
            <div className="p-4 bg-bakery-chocolate text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-bakery-caramel" />
                <div>
                  <h3 className="font-display font-bold text-sm">
                    Official Customer Receipt Image (.png)
                  </h3>
                  <p className="text-[11px] text-bakery-beige/80">
                    {receiptPreviewInquiry.shared_order_number || receiptPreviewInquiry.inquiry_number} &bull; {receiptPreviewInquiry.customer_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setReceiptPreviewInquiry(null)}
                className="text-bakery-cream/80 hover:text-white font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 bg-bakery-cream/40 flex flex-col items-center">
              <img
                src={api.getInquiryReceiptPdfUrl(receiptPreviewInquiry.id, true)}
                alt={`Receipt ${receiptPreviewInquiry.inquiry_number}`}
                className="w-full h-auto rounded-2xl shadow-md border border-bakery-beige bg-white"
              />
            </div>

            <div className="p-4 bg-white border-t border-bakery-beige flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setReceiptPreviewInquiry(null)}
                className="px-4 py-2 rounded-xl border border-bakery-beige text-xs font-semibold text-bakery-chocolate hover:bg-bakery-cream"
              >
                Close Preview
              </button>
              <a
                href={api.getInquiryReceiptPdfUrl(receiptPreviewInquiry.id, false)}
                download={`CRAVEABLES-Receipt-${receiptPreviewInquiry.shared_order_number || receiptPreviewInquiry.inquiry_number}.png`}
                className="px-5 py-2.5 rounded-xl bg-bakery-chocolate hover:bg-[#2c1108] text-white text-xs font-bold flex items-center gap-2 shadow-warm-xs transition-colors"
              >
                <ImageIcon className="w-4 h-4 text-bakery-caramel" />
                <span>Download Receipt Image (.png)</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Convert to Official Sale */}
      {convertingInquiry && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-bakery-ivory w-full max-w-md rounded-3xl border border-bakery-beige shadow-warm-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-bakery-beige pb-3">
              <div className="flex items-center gap-2">
                <ReceiptText className="w-5 h-5 text-bakery-caramel" />
                <h3 className="font-display font-bold text-base text-bakery-chocolate">
                  Convert to Official Sale
                </h3>
              </div>
              <button onClick={() => setConvertingInquiry(null)} className="text-bakery-muted hover:text-black">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-bakery-muted">
                This will record an official sales receipt in the Sales module and link it to order{' '}
                <strong>{convertingInquiry.shared_order_number || convertingInquiry.inquiry_number}</strong>.
              </p>

              <div className="p-3 rounded-2xl bg-bakery-cream border border-bakery-beige space-y-1">
                <div className="flex justify-between">
                  <span className="text-bakery-muted">Customer:</span>
                  <strong>{convertingInquiry.customer_name}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-bakery-muted">Total Amount:</span>
                  <strong className="font-display text-sm text-bakery-chocolate">
                    ₱{Number(convertingInquiry.estimated_total || 0).toFixed(2)}
                  </strong>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-bakery-chocolate mb-1">Payment Method</label>
                <select
                  value={convertPaymentMethod}
                  onChange={(e) => setConvertPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige text-xs font-semibold text-bakery-chocolate focus:outline-hidden"
                >
                  <option value="GCash">GCash</option>
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-bakery-beige">
              <button
                onClick={() => setConvertingInquiry(null)}
                className="px-4 py-2 rounded-xl border border-bakery-beige text-xs font-semibold hover:bg-bakery-beige/30"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmConvert}
                disabled={convertingLoading}
                className="px-5 py-2 rounded-xl bg-bakery-chocolate text-white text-xs font-bold hover:bg-[#2c1108] transition-colors disabled:opacity-50"
              >
                {convertingLoading ? 'Converting...' : 'Confirm Official Sale'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Create Manual Pre-Order / Whole Sales Order */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-bakery-ivory w-full max-w-2xl rounded-3xl border border-bakery-beige shadow-warm-lg max-h-[92vh] flex flex-col overflow-hidden">
            <div className="p-5 bg-bakery-chocolate text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                {newOrderType === 'WHOLESALE' ? (
                  <Layers className="w-5 h-5 text-bakery-caramel" />
                ) : (
                  <Plus className="w-5 h-5 text-bakery-caramel" />
                )}
                <div>
                  <h3 className="font-display font-bold text-base">
                    {newOrderType === 'WHOLESALE'
                      ? 'Record Whole Sales Order (Reseller Discount Calculator)'
                      : 'Record Customer Pre-Order'}
                  </h3>
                  {newOrderType === 'WHOLESALE' && (
                    <p className="text-[11px] text-bakery-beige/80">
                      Automatic reseller discounts applied for Banana Cake, Brownies, Cookies Per Pc &amp; Cookies Box
                    </p>
                  )}
                </div>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-bakery-cream/70 hover:text-white font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateManualOrder} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-bakery-chocolate mb-1">
                    {newOrderType === 'WHOLESALE' ? 'Reseller / Partner Name *' : 'Customer Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={newOrderType === 'WHOLESALE' ? 'Reseller or store name' : 'Full name'}
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige text-xs text-bakery-chocolate focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-bakery-chocolate mb-1">Phone Number (optional)</label>
                  <input
                    type="text"
                    placeholder="0917-xxx-xxxx (optional)"
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige text-xs text-bakery-chocolate focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-bakery-chocolate mb-1">Order Category / Type</label>
                  <select
                    value={newOrderType}
                    onChange={(e) => setNewOrderType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige text-xs font-semibold text-bakery-chocolate focus:outline-hidden"
                  >
                    <option value="WHOLESALE">Whole Sales Order (Reseller Discounted)</option>
                    <option value="REGULAR">Regular Customer Order (Retail)</option>
                    <option value="CUSTOM">Customized Bake</option>
                    <option value="BULK">Bulk Package</option>
                    <option value="SPECIAL_EVENT">Birthday / Event</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-bakery-chocolate mb-1">Fulfillment Method</label>
                  <select
                    value={newDeliveryMethod}
                    onChange={(e) => setNewDeliveryMethod(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige text-xs font-semibold text-bakery-chocolate focus:outline-hidden"
                  >
                    <option value="PICKUP">Storefront Pickup</option>
                    <option value="DELIVERY">Delivery in Lucena</option>
                  </select>
                </div>
              </div>

              {newDeliveryMethod === 'DELIVERY' && (
                <div>
                  <label className="block font-semibold text-bakery-chocolate mb-1">Delivery Address</label>
                  <input
                    type="text"
                    placeholder="Enter Lucena street, subdivision, or barangay..."
                    value={newDeliveryAddress}
                    onChange={(e) => setNewDeliveryAddress(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige text-xs text-bakery-chocolate focus:outline-hidden"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-bakery-chocolate mb-1">Target Date Needed</label>
                  <input
                    type="date"
                    value={newTargetDate}
                    onChange={(e) => setNewTargetDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige text-xs text-bakery-chocolate focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-bakery-chocolate mb-1">Payment Due Date</label>
                  <input
                    type="date"
                    value={newPaymentDueDate}
                    onChange={(e) => setNewPaymentDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige text-xs text-bakery-chocolate focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setNewPaymentDueDate(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
                      setNewStatus('COMPLETED');
                    }}
                    className="mt-1.5 w-full px-2 py-1 rounded-lg bg-amber-100 border border-amber-300 text-amber-900 text-[10px] font-bold hover:bg-amber-200"
                  >
                    +1 Week Due (Order Given / Pay Later)
                  </button>
                </div>
              </div>

              {/* Quick Menu Selection with Wholesale Calculator */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-bold text-bakery-chocolate">
                    Select Products &amp; Quantities *
                  </label>
                  {newOrderType === 'WHOLESALE' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                      ✨ Wholesale Reseller Discounts Active
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto p-2.5 bg-white rounded-2xl border border-bakery-beige">
                  {QUICK_MENU.map((item) => {
                    const qty = newOrderItems[item.name]?.qty || 0;
                    const ws = newOrderType === 'WHOLESALE' && qty > 0
                      ? calculateWholesaleDiscount(item.name, item.price, qty)
                      : null;
                    const ruleHint = newOrderType === 'WHOLESALE'
                      ? getWholesaleDescription(item.name, item.price)
                      : '';

                    return (
                      <div
                        key={item.name}
                        className={`p-2.5 rounded-xl border transition-all flex flex-col justify-between gap-2 ${
                          qty > 0
                            ? 'bg-bakery-cream border-bakery-caramel shadow-2xs'
                            : 'bg-bakery-cream/40 border-bakery-beige/80'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-bold text-[11px] text-bakery-chocolate leading-tight">{item.name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {ws && ws.unitDiscount > 0 ? (
                                <>
                                  <span className="text-[10px] line-through text-bakery-muted">₱{item.price}</span>
                                  <span className="font-display font-bold text-xs text-emerald-700">
                                    ₱{ws.discountedUnitPrice.toFixed(2)}/ea
                                  </span>
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-600 text-white">
                                    {ws.tierBadge}
                                  </span>
                                </>
                              ) : (
                                <span className="font-display font-bold text-xs text-bakery-caramel">₱{item.price}</span>
                              )}
                            </div>
                            {newOrderType === 'WHOLESALE' && (
                              <p className="text-[9px] text-bakery-muted mt-0.5">{ruleHint}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-1 pt-1 border-t border-bakery-beige/50">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleQuickRemoveItem(item.name)}
                              className="w-6 h-6 rounded-lg bg-white text-bakery-chocolate font-bold flex items-center justify-center border border-bakery-beige hover:bg-bakery-beige/40"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="0"
                              value={qty === 0 ? '' : qty}
                              placeholder="0"
                              onChange={(e) => handleQuickSetQty(item, parseInt(e.target.value, 10) || 0)}
                              className="w-12 h-6 text-center rounded-lg bg-white border border-bakery-beige font-bold text-xs text-bakery-chocolate focus:outline-hidden"
                            />
                            <button
                              type="button"
                              onClick={() => handleQuickAddItem(item, 1)}
                              className="w-6 h-6 rounded-lg bg-bakery-chocolate text-white font-bold flex items-center justify-center hover:bg-[#2c1108]"
                            >
                              +
                            </button>
                          </div>

                          {newOrderType === 'WHOLESALE' && (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleQuickAddItem(item, 5)}
                                className="px-1.5 py-0.5 rounded bg-bakery-beige/60 hover:bg-bakery-caramel hover:text-white text-[10px] font-bold text-bakery-chocolate transition-colors"
                              >
                                +5
                              </button>
                              <button
                                type="button"
                                onClick={() => handleQuickAddItem(item, 10)}
                                className="px-1.5 py-0.5 rounded bg-bakery-caramel/20 hover:bg-bakery-caramel hover:text-white text-[10px] font-bold text-bakery-chocolate transition-colors"
                              >
                                +10
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Live Order & Wholesale Discount Summary Box */}
              {Object.values(newOrderItems).some((i) => i.qty > 0) && (() => {
                const selected = Object.values(newOrderItems).filter((i) => i.qty > 0);
                const regTotal = selected.reduce((sum, i) => sum + i.price * i.qty, 0);
                const wsDiscount = newOrderType === 'WHOLESALE'
                  ? selected.reduce((sum, i) => sum + calculateWholesaleDiscount(i.name, i.price, i.qty).totalDiscount, 0)
                  : 0;
                const netPayable = Math.max(0, regTotal - wsDiscount);

                return (
                  <div className="p-3.5 rounded-2xl bg-bakery-cream border border-bakery-caramel/40 space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-bakery-muted">
                      <span>Regular Retail Subtotal:</span>
                      <span className="font-semibold">₱{regTotal.toFixed(2)}</span>
                    </div>
                    {newOrderType === 'WHOLESALE' && (
                      <div className="flex items-center justify-between text-xs text-emerald-700 font-bold">
                        <span>Wholesale Reseller Discount Saved:</span>
                        <span>-₱{wsDiscount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-1.5 border-t border-bakery-beige text-sm font-display font-bold text-bakery-chocolate">
                      <span>{newOrderType === 'WHOLESALE' ? 'Net Wholesale Total:' : 'Order Total:'}</span>
                      <span className="text-base">₱{netPayable.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Deposit / Advance Payment */}
              <div>
                <label className="block font-semibold text-bakery-chocolate mb-1">
                  Initial Downpayment / Deposit (₱)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 500"
                  value={newInitialDeposit}
                  onChange={(e) => setNewInitialDeposit(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige text-xs text-bakery-chocolate focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-bakery-chocolate mb-1">Notes / Custom Instructions</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Include greeting card, extra chocolate drizzle..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige text-xs text-bakery-chocolate focus:outline-hidden"
                />
              </div>

              <div className="pt-3 border-t border-bakery-beige flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-bakery-beige text-bakery-chocolate font-semibold hover:bg-bakery-beige/30"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingOrder}
                  className="px-5 py-2 rounded-xl bg-bakery-chocolate text-white font-bold hover:bg-[#2c1108] transition-colors disabled:opacity-50"
                >
                  {creatingOrder ? 'Creating...' : 'Confirm Pre-Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit Order */}
      {editInquiry && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-bakery-ivory w-full max-w-lg rounded-3xl border border-bakery-beige shadow-warm-lg max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-5 bg-bakery-chocolate text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-bakery-caramel" />
                <h3 className="font-display font-bold text-base">
                  Edit Order #{editInquiry.shared_order_number || editInquiry.inquiry_number}
                </h3>
              </div>
              <button onClick={() => setEditInquiry(null)} className="text-bakery-cream/70 hover:text-white font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-3">
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
                <div>
                  <label className="block font-semibold text-bakery-chocolate mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={editCustPhone}
                    onChange={(e) => setEditCustPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige text-xs text-bakery-chocolate focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-bakery-chocolate mb-1">Target Date</label>
                  <input
                    type="date"
                    value={editTargetDate}
                    onChange={(e) => setEditTargetDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige text-xs text-bakery-chocolate focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-bakery-chocolate mb-1">Payment Due Date</label>
                  <input
                    type="date"
                    value={editPaymentDueDate}
                    onChange={(e) => setEditPaymentDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige text-xs text-bakery-chocolate focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setEditPaymentDueDate(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0])}
                    className="mt-1.5 w-full px-2 py-1 rounded-lg bg-amber-100 border border-amber-300 text-amber-900 text-[10px] font-bold hover:bg-amber-200"
                  >
                    +1 Week Due Date
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-bakery-chocolate mb-1">Items Summary</label>
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
                    <option value="NEW">New Order</option>
                    <option value="PENDING">Pending</option>
                    <option value="CONFIRMED">Confirmed</option>
                    <option value="SCHEDULED_PRODUCTION">In Production</option>
                    <option value="READY">Ready for Pickup</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-bakery-chocolate mb-1">Delivery Address</label>
                <input
                  type="text"
                  value={editDeliveryAddress}
                  onChange={(e) => setEditDeliveryAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige text-xs text-bakery-chocolate focus:outline-hidden"
                />
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

              <div className="pt-3 border-t border-bakery-beige flex items-center justify-end gap-2.5">
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
