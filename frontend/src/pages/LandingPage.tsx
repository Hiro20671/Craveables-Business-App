import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  ShoppingBag,
  ArrowRight,
  Star,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Phone,
  MapPin,
  ChevronRight,
  Plus,
  Minus,
  Send,
  Lock,
  Crown,
  ChefHat,
  Coffee,
  Check,
  Maximize2,
  Eye,
  X,
  Download,
  Smartphone,
  Share2,
  ThumbsUp,
  MessageSquare
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { FeaturedOrder } from '../types';
import { calculateWholesaleDiscount } from '../utils/pricing';

interface MenuItem {
  id: string;
  name: string;
  category: 'cookies' | 'brownies' | 'cakes';
  tag: string;
  posterImage: string;
  description: string;
  variants: { name: string; price: number; badge?: string }[];
  highlight: string;
  accentColor: string;
  wholesaleTag?: string;
}

const MENU_ITEMS: MenuItem[] = [
  {
    id: 'banana-cake',
    name: 'Banana Cake (Saging na Lakatan)',
    category: 'cakes',
    tag: 'Ripe Lakatan',
    posterImage: '/poster-banana-cake.jpg',
    description: 'Moist, soft and delicious homemade banana cake made with 100% naturally sweet ripe Philippine Lakatan bananas! Baked in an aluminum tin loaf with a red ribbon and wooden spoon, topped with sliced almonds and chocolate chips.',
    highlight: '100% Ripe Philippine Lakatan Bananas • Sliced Almonds & Choc Chips',
    accentColor: '#C88A3B',
    wholesaleTag: 'Wholesale Discount: Big ₱10-₱15 off • Small 5-10% off',
    variants: [
      { name: 'Banana Cake — Small', price: 60, badge: 'PHP 60.00' },
      { name: 'Banana Cake — Big', price: 135, badge: 'PHP 135.00' },
    ],
  },
  {
    id: 'brownies',
    name: 'Classic Fudgy Brownies',
    category: 'brownies',
    tag: 'Fudgy & Chewy',
    posterImage: '/poster-classic-brownies.jpg',
    description: 'Rich, chocolatey goodness baked into fudgy squares with a glossy crinkle top. Perfectly soft, delightfully chewy, and not overly sweet. A favorite merienda partner for hot coffee.',
    highlight: 'Deep Dark Cocoa • Dense & Fudgy • Coffee Merienda Favorite',
    accentColor: '#3B170B',
    wholesaleTag: 'Wholesale Discount: ₱10 off (<10) • ₱20 off (10+ boxes)',
    variants: [
      { name: 'Classic Brownies — Small Box (3 pcs)', price: 110, badge: 'PHP 110.00' },
      { name: 'Classic Brownies — Big Box (6 pcs)', price: 220, badge: 'PHP 220.00' },
    ],
  },
  {
    id: 'red-velvet',
    name: 'Red Velvet Cookies',
    category: 'cookies',
    tag: 'Chewy & Crisp',
    posterImage: '/poster-red-velvet.jpg',
    description: 'Freshly baked homemade red velvet cookies with crispy golden edges and a soft, chewy center packed with melting white chocolate chips.',
    highlight: 'Crispy Edges & Soft Center • Packed with White Chocolate Chips',
    accentColor: '#9B1D20',
    wholesaleTag: 'Wholesale Discount: ₱5 off each cookie / box',
    variants: [
      { name: 'Red Velvet Cookie — Single (1 pc)', price: 35, badge: 'PHP 35.00' },
      { name: 'Red Velvet Cookies — Box of 6', price: 210, badge: 'PHP 210.00' },
      { name: 'Red Velvet Cookies — Assorted', price: 190, badge: 'PHP 190.00' },
    ],
  },
  {
    id: 'choco-chip',
    name: 'Choco Chip Cookies',
    category: 'cookies',
    tag: 'Classic Comfort',
    posterImage: '/poster-choco-chip.jpg',
    description: 'Golden home-style butter cookies loaded with rich chocolate morsels. Crisp around the rim and chewy in the middle. Baked fresh daily.',
    highlight: 'Golden Creamery Butter • Loaded with Chocolate Morsels',
    accentColor: '#A97845',
    wholesaleTag: 'Wholesale Discount: ₱5 off each cookie / box',
    variants: [
      { name: 'Classic Choco Chip Cookie — Single (1 pc)', price: 30, badge: 'PHP 30.00' },
      { name: 'Choco Chip Cookies — Box of 6', price: 180, badge: 'PHP 180.00' },
      { name: 'Choco Chip Cookies — Assorted', price: 190, badge: 'PHP 190.00' },
    ],
  },
];

export const LandingPage: React.FC = () => {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'cookies' | 'brownies' | 'cakes'>('all');
  const [selectedPoster, setSelectedPoster] = useState<MenuItem | null>(null);
  const [orderCart, setOrderCart] = useState<{ [variantName: string]: { name: string; price: number; qty: number } }>({});
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  // Order Form State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [orderCopied, setOrderCopied] = useState(false);
  const [submittingInquiry, setSubmittingInquiry] = useState(false);
  const [inquirySubmitted, setInquirySubmitted] = useState(false);
  const [submittedInquiryNum, setSubmittedInquiryNum] = useState<string | null>(null);

  // PWA State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  // Customer Reviews State
  const [reviews, setReviews] = useState<any[]>([]);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewName, setReviewName] = useState('');
  const [reviewLocation, setReviewLocation] = useState('');
  const [reviewProduct, setReviewProduct] = useState('Banana Cake (Lakatan)');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  // Customer Ordering Enhancements (Section 2A)
  const [orderType, setOrderType] = useState<string>('REGULAR');
  const [deliveryMethod, setDeliveryMethod] = useState<'PICKUP' | 'DELIVERY'>('PICKUP');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [paymentPreference, setPaymentPreference] = useState<string>('PAY_ON_PICKUP');

  // Featured Orders Gallery State (Section 1A)
  const [featuredOrders, setFeaturedOrders] = useState<FeaturedOrder[]>([]);
  const [featuredCategory, setFeaturedCategory] = useState<string>('ALL');
  const [previewFeaturedOrder, setPreviewFeaturedOrder] = useState<FeaturedOrder | null>(null);

  // Fallback completed orders if admin hasn't published custom records yet
  const SAMPLE_FEATURED_ORDERS: FeaturedOrder[] = [
    {
      id: 901,
      title: '60-Piece Classic Brownie Birthday Celebration Tower',
      description: 'Custom fudgy brownie squares individually wrapped with red bows for a 30th birthday gathering in Lucena City.',
      image: '/poster-classic-brownies.jpg',
      category: 'Brownies',
      order_type: 'Birthday Celebration',
      order_date: '2026-11-02',
      pieces_count: 60,
      is_featured: true,
      is_published: true,
      display_order: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 902,
      title: 'Red Velvet & Choco Chip Corporate Merienda Boxes',
      description: 'Assorted pastry boxes packed fresh for a local school faculty day. Dense, chewy cookies made with pure creamery butter.',
      image: '/poster-red-velvet.jpg',
      category: 'Cookies',
      order_type: 'Corporate Order',
      order_date: '2026-10-28',
      pieces_count: 72,
      is_featured: true,
      is_published: true,
      display_order: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 903,
      title: 'Artisanal Lakatan Banana Loaves with Sliced Almonds',
      description: 'Freshly harvested Philippine Lakatan bananas baked in aluminum tins with red bows and wooden spoons for family weekend hampers.',
      image: '/poster-banana-cake.jpg',
      category: 'Cakes',
      order_type: 'Custom Gift Hamper',
      order_date: '2026-10-20',
      pieces_count: 24,
      is_featured: true,
      is_published: true,
      display_order: 3,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 904,
      title: 'Loaded Chocolate Chip Party Trays',
      description: 'Golden chocolate-loaded cookies baked to crisp-edged perfection for an intimate anniversary banquet in Quezon Province.',
      image: '/poster-choco-chip.jpg',
      category: 'Cookies',
      order_type: 'Special Event',
      order_date: '2026-10-15',
      pieces_count: 90,
      is_featured: true,
      is_published: true,
      display_order: 4,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  // PWA Setup
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Fetch Approved Reviews & Featured Orders
  useEffect(() => {
    api.getReviews()
      .then((data) => setReviews(data))
      .catch(() => {});

    api.getFeaturedOrders()
      .then((data) => {
        if (data && data.length > 0) {
          setFeaturedOrders(data);
        }
      })
      .catch(() => {});
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      setIsInstallModalOpen(true);
    }
  };

  const handleAddToCart = (variantName: string, price: number) => {
    setOrderCart((prev) => {
      const current = prev[variantName] || { name: variantName, price, qty: 0 };
      return {
        ...prev,
        [variantName]: { ...current, qty: current.qty + 1 },
      };
    });
  };

  const handleRemoveFromCart = (variantName: string) => {
    setOrderCart((prev) => {
      const current = prev[variantName];
      if (!current) return prev;
      if (current.qty <= 1) {
        const next = { ...prev };
        delete next[variantName];
        return next;
      }
      return {
        ...prev,
        [variantName]: { ...current, qty: current.qty - 1 },
      };
    });
  };

  const cartCalculations = Object.values(orderCart).map((item) => {
    const ws = calculateWholesaleDiscount(item.name, item.price, item.qty);
    return {
      ...item,
      regularTotal: item.price * item.qty,
      unitDiscount: ws.unitDiscount,
      totalDiscount: ws.totalDiscount,
      discountedTotal: ws.finalTotal,
      tierBadge: ws.tierBadge,
      discountLabel: ws.discountLabel,
    };
  });

  const totalCartItems = cartCalculations.reduce((sum, item) => sum + item.qty, 0);
  const rawCartAmount = cartCalculations.reduce((sum, item) => sum + item.regularTotal, 0);
  const totalCartDiscount = cartCalculations.reduce((sum, item) => sum + item.totalDiscount, 0);
  const totalCartAmount = Math.max(0, rawCartAmount - totalCartDiscount);

  const generateOrderSummary = () => {
    let summary = `*CRAVEABLES ORDER INQUIRY*\n`;
    summary += `Made to Crave • Baked with Love\n\n`;
    summary += `Customer: ${customerName || 'Customer'}\n`;
    summary += `Contact: ${customerPhone || 'N/A'}\n`;
    summary += `Date Needed: ${deliveryDate || 'ASAP'}\n\n`;
    summary += `*Items Ordered:*\n`;
    cartCalculations.forEach((item) => {
      const discountText = item.totalDiscount > 0 ? ` (Wholesale discount: -₱${item.totalDiscount.toFixed(2)}) = ₱${item.discountedTotal.toFixed(2)}` : ` = ₱${item.regularTotal.toFixed(2)}`;
      summary += `• ${item.qty}x ${item.name} (₱${item.price} each)${discountText}\n`;
    });
    if (totalCartDiscount > 0) {
      summary += `\n*Subtotal: ₱${rawCartAmount.toFixed(2)}*\n`;
      summary += `*Wholesale Savings: -₱${totalCartDiscount.toFixed(2)}*\n`;
    }
    summary += `\n*Total Estimated: ₱${totalCartAmount.toFixed(2)}*\n`;
    if (orderNotes) summary += `Notes: ${orderNotes}\n`;
    summary += `\nPayment: GCash / Bank Transfer / Cash upon pickup`;
    return summary;
  };

  const handleCopyOrder = () => {
    const text = generateOrderSummary();
    navigator.clipboard.writeText(text);
    setOrderCopied(true);
    setTimeout(() => setOrderCopied(false), 3000);
  };

  const handleOrderLikeThis = (featured: FeaturedOrder) => {
    setOrderType(
      featured.order_type.toUpperCase().includes('BULK')
        ? 'BULK'
        : featured.order_type.toUpperCase().includes('BIRTHDAY') || featured.order_type.toUpperCase().includes('EVENT')
        ? 'SPECIAL_EVENT'
        : 'CUSTOM'
    );
    setOrderNotes(`Special request inspired by Featured Order: "${featured.title}" (${featured.order_type}${featured.pieces_count ? `, approx. ${featured.pieces_count} pcs` : ''}).`);
    const elem = document.getElementById('how-to-order');
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSubmitInquiry = async () => {
    if (!customerName.trim()) {
      alert('Please enter your name.');
      return;
    }
    if (!customerPhone.trim()) {
      alert('Please enter your contact or mobile number so we can reach you.');
      return;
    }
    if (deliveryMethod === 'DELIVERY' && !deliveryAddress.trim()) {
      alert('Please enter your delivery address in Lucena City or nearby.');
      return;
    }
    if (totalCartItems === 0 && !orderNotes.trim()) {
      alert('Your tray is empty! Please pick at least one bake from our menu above or enter your customized order notes below.');
      return;
    }

    try {
      setSubmittingInquiry(true);
      const summaryText = generateOrderSummary();
      const itemsList = Object.values(orderCart);

      const resp = await api.createInquiry({
        customer_name: customerName,
        customer_phone: customerPhone,
        order_type: orderType,
        delivery_method: deliveryMethod,
        delivery_address: deliveryMethod === 'DELIVERY' ? deliveryAddress : '',
        payment_type: paymentPreference,
        target_date: deliveryDate || null,
        items_summary: summaryText,
        items_json: itemsList,
        estimated_total: totalCartAmount,
        notes: orderNotes,
      });

      setSubmittedInquiryNum(resp.inquiry_number);
      setInquirySubmitted(true);
      setIsOrderModalOpen(true);
    } catch (err: any) {
      alert(err.message || 'Error sending order inquiry. Please try again.');
    } finally {
      setSubmittingInquiry(false);
    }
  };

  // Submit Review Handler
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewName.trim() || !reviewComment.trim()) {
      alert('Please enter your name and comments.');
      return;
    }

    try {
      setSubmittingReview(true);
      await api.createReview({
        customer_name: reviewName.trim(),
        customer_location: reviewLocation.trim(),
        product_name: reviewProduct,
        rating: reviewRating,
        comment: reviewComment.trim(),
      });
      setReviewSubmitted(true);
    } catch (err: any) {
      alert(err.message || 'Failed to submit review. Please try again.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const filteredMenu = selectedCategory === 'all'
    ? MENU_ITEMS
    : MENU_ITEMS.filter((item) => item.category === selectedCategory);

  return (
    <div className="min-h-screen bg-bakery-cream text-bakery-espresso font-sans selection:bg-bakery-caramel selection:text-white">
      {/* Top Banner with PWA Install Pill */}
      <div className="bg-bakery-chocolate text-bakery-cream px-4 py-2 text-center text-xs font-medium tracking-wide flex flex-wrap items-center justify-center gap-2 border-b border-[#4e2112]">
        <Sparkles className="w-3.5 h-3.5 text-bakery-caramel shrink-0" />
        <span>
          Freshly baked in small batches with love by <strong>Dyna, Jeremy &amp; Anne</strong> in Lucena City.
        </span>
        <button
          onClick={handleInstallClick}
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-bakery-caramel text-white text-[11px] font-bold hover:bg-[#966736] transition-colors shadow-2xs ml-1"
        >
          <Smartphone className="w-3 h-3" />
          <span>{isInstalled ? 'App Installed' : '📲 Install App on Phone'}</span>
        </button>
      </div>

      {/* Navigation Header */}
      <header className="sticky top-0 z-40 bg-bakery-cream/95 backdrop-blur-md border-b border-bakery-beige/80 transition-all">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center gap-3 group">
            <img
              src="/logo.png"
              alt="CRAVEABLES Logo"
              className="w-12 h-12 object-contain rounded-full bg-white p-1 border-2 border-bakery-caramel/50 shadow-xs group-hover:scale-105 transition-transform"
            />
            <div>
              <span className="font-display font-bold text-xl sm:text-2xl tracking-tight text-bakery-chocolate block leading-none">
                CRAVEABLES
              </span>
              <span className="text-[10px] font-bold tracking-widest text-bakery-caramel uppercase">
                MADE TO CRAVE &bull; BAKED WITH LOVE
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-bakery-chocolate">
            <a href="#menu" className="hover:text-bakery-caramel transition-colors">Our Bakes &amp; Posters</a>
            <a href="#featured-orders" className="hover:text-bakery-caramel transition-colors">Featured Orders</a>
            <a href="#how-to-order" className="hover:text-bakery-caramel transition-colors">How to Order</a>
            <a href="#story" className="hover:text-bakery-caramel transition-colors">Meet Dyna, Jeremy &amp; Anne</a>
            <a href="#reviews" className="hover:text-bakery-caramel transition-colors">Customer Feedback</a>
            <a href="#contact" className="hover:text-bakery-caramel transition-colors">Contact</a>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Install App Button */}
            <button
              onClick={handleInstallClick}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-bakery-ivory border border-bakery-beige hover:border-bakery-caramel text-bakery-chocolate text-xs font-bold transition-colors shadow-2xs"
              title="Install CRAVEABLES on your phone home screen"
            >
              <Download className="w-3.5 h-3.5 text-bakery-caramel" />
              <span>Install App</span>
            </button>

            {/* Cart / Inquiry Tray Button */}
            {totalCartItems > 0 && (
              <button
                onClick={() => setIsOrderModalOpen(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-bakery-caramel text-white text-xs font-bold shadow-warm-sm hover:bg-[#966736] transition-transform active:scale-95 animate-bounce-subtle"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>₱{totalCartAmount.toFixed(0)}</span>
                <span className="w-5 h-5 rounded-full bg-bakery-chocolate text-[10px] flex items-center justify-center">
                  {totalCartItems}
                </span>
              </button>
            )}

            {/* Portal Login / Dashboard Button */}
            {user ? (
              <Link
                to="/dashboard"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-bakery-chocolate text-white text-xs font-bold hover:bg-[#2c1108] shadow-warm-sm transition-transform active:scale-95"
              >
                <Crown className="w-3.5 h-3.5 text-bakery-caramel" />
                <span className="hidden sm:inline">Owner Dashboard</span>
                <span className="sm:hidden">Portal</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-bakery-chocolate text-bakery-chocolate text-xs font-bold hover:bg-bakery-chocolate hover:text-white transition-colors shadow-2xs"
                title="Management Portal for Dyna, Jeremy & Anne"
              >
                <Lock className="w-3.5 h-3.5 text-bakery-caramel" />
                <span>Owner Portal</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section: Humble Small Home Bakery Voice */}
      <section className="relative overflow-hidden pt-8 pb-14 sm:py-16 lg:py-20">
        <div className="absolute top-1/4 -right-20 w-96 h-96 rounded-full bg-bakery-caramel/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-20 w-80 h-80 rounded-full bg-bakery-beige/40 blur-2xl pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Hero Left (7 cols) */}
            <div className="lg:col-span-7 space-y-5 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-bakery-ivory border border-bakery-beige shadow-2xs text-[11px] font-bold text-bakery-chocolate tracking-wide">
                <ChefHat className="w-3.5 h-3.5 text-bakery-caramel" />
                <span>SMALL HOME BAKERY &bull; LUCENA CITY</span>
              </div>

              <h1 className="font-display font-black text-3xl sm:text-5xl lg:text-6xl text-bakery-chocolate tracking-tight leading-[1.15]">
                Freshly Baked Treats from Our Home Kitchen to Yours.
              </h1>

              <div className="p-3 rounded-2xl bg-bakery-ivory/90 border border-bakery-beige inline-block shadow-warm-xs">
                <p className="text-sm font-bold text-bakery-caramel tracking-wider uppercase font-display">
                  &ldquo;MADE TO CRAVE &bull; BAKED WITH LOVE&rdquo;
                </p>
              </div>

              <p className="text-sm sm:text-base text-bakery-espresso/80 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                We are a small, humble home bakery in Lucena City started by three friends — <strong>Dyna, Jeremy, and Anne</strong>. We bake honest comfort treats in small batches: naturally sweet Banana Cake made with <strong>ripe Philippine Lakatan bananas</strong>, dense fudgy brownies, and chewy cookies. Pure butter, real ingredients, and lots of heart in every bake.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-2">
                <a
                  href="#menu"
                  className="px-6 py-3.5 rounded-2xl bg-bakery-chocolate text-white text-xs sm:text-sm font-bold hover:bg-[#2c1108] shadow-warm-md hover:shadow-warm-lg transition-all flex items-center gap-2 group"
                >
                  <ShoppingBag className="w-4 h-4 text-bakery-caramel" />
                  <span>See Bakes &amp; Prices</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </a>

                <button
                  onClick={handleInstallClick}
                  className="px-5 py-3.5 rounded-2xl bg-bakery-ivory border-2 border-bakery-caramel text-bakery-chocolate text-xs sm:text-sm font-bold hover:bg-bakery-cream shadow-2xs transition-colors flex items-center gap-2"
                >
                  <Smartphone className="w-4 h-4 text-bakery-caramel" />
                  <span>Install App on Phone</span>
                </button>

                <a
                  href="#how-to-order"
                  className="px-4 py-3.5 rounded-2xl bg-transparent text-bakery-chocolate text-xs sm:text-sm font-semibold hover:underline flex items-center gap-1.5"
                >
                  <Clock className="w-4 h-4 text-bakery-caramel" />
                  <span>How to Order</span>
                </a>
              </div>

              {/* 3 Real Humble Points */}
              <div className="pt-4 grid grid-cols-3 gap-2 border-t border-bakery-beige/80 max-w-lg mx-auto lg:mx-0 text-left">
                <div className="flex items-center gap-2">
                  <span className="text-base">🍌</span>
                  <div>
                    <p className="text-[11px] font-bold text-bakery-chocolate">Ripe Lakatan</p>
                    <p className="text-[9px] text-bakery-muted">Naturally sweet bananas</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-base">🧈</span>
                  <div>
                    <p className="text-[11px] font-bold text-bakery-chocolate">Real Butter</p>
                    <p className="text-[9px] text-bakery-muted">Pure creamery goodness</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-base">🏠</span>
                  <div>
                    <p className="text-[11px] font-bold text-bakery-chocolate">Small Batches</p>
                    <p className="text-[9px] text-bakery-muted">Baked fresh to order</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Hero Right Visual (5 cols) */}
            <div className="lg:col-span-5 relative flex justify-center">
              <div className="w-full max-w-md bg-bakery-ivory rounded-3xl border-2 border-bakery-beige p-6 sm:p-8 shadow-warm-lg space-y-6 relative">
                <div className="text-center space-y-2">
                  <div className="relative inline-block">
                    <img
                      src="/logo.png"
                      alt="CRAVEABLES Cookie Emblem"
                      className="w-24 h-24 mx-auto object-contain drop-shadow-md rounded-full bg-bakery-cream p-1.5 border border-bakery-caramel/40"
                    />
                    <div className="absolute -top-1 -right-1 bg-bakery-chocolate text-bakery-cream text-[9px] font-bold px-2 py-0.5 rounded-full border border-bakery-caramel">
                      Fresh Batch
                    </div>
                  </div>
                  <h3 className="font-display font-bold text-lg text-bakery-chocolate">
                    Home Kitchen Favorites
                  </h3>
                  <p className="text-xs text-bakery-muted">
                    Baking comfort, one small batch at a time.
                  </p>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="p-3 rounded-xl bg-bakery-cream border border-bakery-beige flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-base">🍌</span>
                      <div>
                        <p className="font-bold text-bakery-chocolate">Banana Cake (Lakatan)</p>
                        <p className="text-[10px] text-bakery-muted">Small ₱60 &bull; Big ₱135</p>
                      </div>
                    </div>
                    <span className="font-display font-bold text-bakery-chocolate">From ₱60</span>
                  </div>

                  <div className="p-3 rounded-xl bg-bakery-cream border border-bakery-beige flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-base">🍫</span>
                      <div>
                        <p className="font-bold text-bakery-chocolate">Classic Fudgy Brownies</p>
                        <p className="text-[10px] text-bakery-muted">Box of 3 ₱110 &bull; Box of 6 ₱220</p>
                      </div>
                    </div>
                    <span className="font-display font-bold text-bakery-chocolate">From ₱110</span>
                  </div>

                  <div className="p-3 rounded-xl bg-bakery-cream border border-bakery-beige flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-base">🍪</span>
                      <div>
                        <p className="font-bold text-bakery-chocolate">Red Velvet &amp; Choco Chip</p>
                        <p className="text-[10px] text-bakery-muted">Box of 6 or Assorted</p>
                      </div>
                    </div>
                    <span className="font-display font-bold text-bakery-chocolate">From ₱180</span>
                  </div>
                </div>

                <div className="pt-2 text-center">
                  <a
                    href="#menu"
                    className="text-xs font-bold text-bakery-caramel hover:underline inline-flex items-center gap-1"
                  >
                    <span>View all 4 bakes &amp; official posters below</span>
                    <ArrowRight className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ONE Single, Unified Bakes & Official Posters Section (No duplicate posters vs menu!) */}
      <section id="menu" className="py-16 sm:py-20 max-w-6xl mx-auto px-4 sm:px-6 space-y-10 border-t border-bakery-beige/80">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-bakery-ivory border border-bakery-beige text-[11px] font-bold text-bakery-caramel tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Our Signature Bakes &amp; Posters</span>
          </div>
          <h2 className="font-display font-bold text-2xl sm:text-4xl text-bakery-chocolate">
            Fresh Bakes &amp; Official Price List
          </h2>
          <p className="text-xs sm:text-sm text-bakery-muted leading-relaxed">
            Here are our 4 signature bakes! Click on any poster to zoom in full resolution. Pick your size or box below to add to your order tray.
          </p>

          {/* Category Filters */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            {[
              { id: 'all', label: 'All Bakes (4)' },
              { id: 'cakes', label: 'Lakatan Banana Cake (1)' },
              { id: 'brownies', label: 'Classic Brownies (1)' },
              { id: 'cookies', label: 'Gourmet Cookies (2)' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedCategory(tab.id as any)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedCategory === tab.id
                    ? 'bg-bakery-chocolate text-white shadow-warm-xs'
                    : 'bg-bakery-ivory text-bakery-chocolate border border-bakery-beige hover:border-bakery-caramel'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 4 Cards Responsive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {filteredMenu.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-3xl border-2 border-bakery-beige hover:border-bakery-caramel shadow-warm-sm hover:shadow-warm-md transition-all duration-300 overflow-hidden flex flex-col justify-between group"
            >
              <div>
                {/* Official Marketing Poster Banner with Zoom Trigger */}
                <div
                  onClick={() => setSelectedPoster(item)}
                  className="relative aspect-square overflow-hidden bg-bakery-cream cursor-pointer border-b border-bakery-beige"
                  title="Click to view full official poster"
                >
                  <img
                    src={item.posterImage}
                    alt={`${item.name} Official Poster`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent flex items-end p-3 justify-between">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/95 text-bakery-chocolate shadow-xs">
                      {item.tag}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPoster(item);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-black/70 hover:bg-black/90 text-white text-[11px] font-bold flex items-center gap-1 backdrop-blur-xs transition-colors shadow-xs"
                    >
                      <Maximize2 className="w-3 h-3 text-bakery-caramel" />
                      <span>Full Poster</span>
                    </button>
                  </div>
                </div>

                {/* Details */}
                <div className="p-5 pb-3 space-y-2.5">
                  <h3
                    onClick={() => setSelectedPoster(item)}
                    className="font-display font-bold text-base sm:text-lg text-bakery-chocolate group-hover:text-bakery-caramel transition-colors cursor-pointer"
                  >
                    {item.name}
                  </h3>
                  <p className="text-[11px] text-bakery-muted leading-relaxed line-clamp-3">
                    {item.description}
                  </p>
                  <div className="p-2 rounded-xl bg-bakery-cream/70 border border-bakery-beige/60 text-[10px] font-semibold text-bakery-chocolate flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-bakery-caramel shrink-0" />
                    <span className="truncate">{item.highlight}</span>
                  </div>

                  {item.wholesaleTag && (
                    <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[10px] font-bold text-amber-900 flex items-center gap-1.5">
                      <span className="shrink-0 text-xs">🏷️</span>
                      <span className="truncate">{item.wholesaleTag}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Pricing & Add to Tray Buttons */}
              <div className="p-5 pt-3 border-t border-bakery-beige/70 bg-bakery-cream/30 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-bakery-muted">
                  Select Size &amp; Price:
                </p>
                <div className="space-y-1.5">
                  {item.variants.map((v) => {
                    const inCart = orderCart[v.name]?.qty || 0;
                    return (
                      <div
                        key={v.name}
                        className="p-2 rounded-xl bg-white border border-bakery-beige flex items-center justify-between text-xs"
                      >
                        <div className="min-w-0 pr-1.5">
                          <p className="font-semibold text-bakery-chocolate text-[11px] truncate">{v.name}</p>
                          <span className="font-display font-bold text-bakery-caramel">₱{v.price.toFixed(2)}</span>
                        </div>

                        {inCart > 0 ? (
                          <div className="flex items-center gap-1 bg-bakery-cream px-1.5 py-0.5 rounded-lg border border-bakery-beige shrink-0">
                            <button
                              type="button"
                              onClick={() => handleRemoveFromCart(v.name)}
                              className="w-4 h-4 rounded bg-white text-bakery-chocolate flex items-center justify-center font-bold text-[10px]"
                            >
                              <Minus className="w-2.5 h-2.5" />
                            </button>
                            <span className="font-bold text-[11px] px-1 text-bakery-chocolate">{inCart}</span>
                            <button
                              type="button"
                              onClick={() => handleAddToCart(v.name, v.price)}
                              className="w-4 h-4 rounded bg-bakery-chocolate text-white flex items-center justify-center font-bold text-[10px]"
                            >
                              <Plus className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAddToCart(v.name, v.price)}
                            className="px-2.5 py-1 rounded-lg bg-bakery-chocolate text-white text-[10px] font-bold hover:bg-[#2c1108] transition-colors flex items-center gap-1 shrink-0"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Floating Cart Callout when items are selected */}
        {totalCartItems > 0 && (
          <div className="p-4 sm:p-5 rounded-2xl bg-bakery-chocolate text-bakery-ivory flex flex-col sm:flex-row items-center justify-between gap-4 shadow-warm-lg animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-bakery-caramel text-white flex items-center justify-center font-bold">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-sm text-white">
                  {totalCartItems} {totalCartItems === 1 ? 'item' : 'items'} in your order tray
                </p>
                <p className="text-xs text-bakery-cream/80">
                  Total Estimate: <strong className="text-white font-display text-base">₱{totalCartAmount.toFixed(2)}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setOrderCart({})}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-bakery-beige/70 hover:text-white"
              >
                Clear
              </button>
              <button
                onClick={() => setIsOrderModalOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-bakery-caramel text-white text-xs font-bold hover:bg-[#966736] transition-transform active:scale-95 shadow-sm flex items-center gap-1.5"
              >
                <span>Proceed to Order Slip</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Section: Our Featured Orders Gallery (Section 1A & 1C) */}
      <section id="featured-orders" className="py-16 sm:py-20 bg-[#FFFDF5] border-t border-bakery-beige/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-[11px] font-bold tracking-widest text-bakery-caramel uppercase bg-bakery-caramel/10 px-3 py-1 rounded-full border border-bakery-caramel/20">
              Actual Completed Bakes &bull; Lucena City
            </span>
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-bakery-chocolate">
              Our Featured Orders
            </h2>
            <p className="text-xs sm:text-sm text-bakery-muted leading-relaxed">
              Browse real custom orders baked fresh by <strong>Dyna, Jeremy &amp; Anne</strong> — from bulk corporate pastry boxes and birthday celebrations to intimate family hampers.
            </p>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {[
              { id: 'ALL', label: 'All Featured' },
              { id: 'Cookies', label: 'Cookies' },
              { id: 'Brownies', label: 'Brownies' },
              { id: 'Cakes', label: 'Banana Cakes' },
              { id: 'Bulk Package', label: 'Bulk & Corporate' },
              { id: 'Special Event', label: 'Birthdays & Events' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFeaturedCategory(tab.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                  featuredCategory === tab.id
                    ? 'bg-bakery-chocolate text-white shadow-warm-sm'
                    : 'bg-white border border-bakery-beige text-bakery-chocolate hover:bg-bakery-cream'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Gallery Grid */}
          {(() => {
            const rawList = featuredOrders.length > 0 ? featuredOrders : SAMPLE_FEATURED_ORDERS;
            const displayList =
              featuredCategory === 'ALL'
                ? rawList
                : rawList.filter(
                    (item) =>
                      item.category.toLowerCase().includes(featuredCategory.toLowerCase()) ||
                      item.order_type.toLowerCase().includes(featuredCategory.toLowerCase())
                  );

            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {displayList.map((order) => {
                  const imgSrc = order.image_url || order.image || '/poster-classic-brownies.jpg';
                  const isVideo =
                    order.media_type === 'video' ||
                    /\.(mp4|mov|webm|ogg|m4v|avi)(\?|$)/i.test(imgSrc);
                  return (
                    <div
                      key={order.id}
                      className="bg-white rounded-3xl border border-bakery-beige overflow-hidden shadow-warm-sm hover:shadow-warm-lg transition-all group flex flex-col justify-between"
                    >
                      <div className="relative aspect-square overflow-hidden bg-bakery-cream">
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
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 cursor-pointer"
                            onClick={() => setPreviewFeaturedOrder(order)}
                          />
                        )}
                        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 pointer-events-none">
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-bakery-chocolate/90 text-white backdrop-blur-xs">
                            {order.order_type}
                          </span>
                          {isVideo && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-600 text-white shadow-2xs">
                              🎥 Video
                            </span>
                          )}
                          {order.pieces_count && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-bakery-caramel text-white shadow-2xs">
                              {order.pieces_count} pcs
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => setPreviewFeaturedOrder(order)}
                          className="absolute bottom-3 right-3 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-xs transition-colors"
                          title={isVideo ? 'View Full Video' : 'View Full Photo'}
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-bakery-muted">
                            <span className="uppercase font-bold tracking-wider text-bakery-caramel">
                              {order.category}
                            </span>
                            {order.order_date && (
                              <span>{new Date(order.order_date).toLocaleDateString()}</span>
                            )}
                          </div>
                          <h4 className="font-display font-bold text-sm text-bakery-chocolate leading-tight">
                            {order.title}
                          </h4>
                          <p className="text-[11px] text-bakery-muted leading-relaxed line-clamp-3">
                            {order.description}
                          </p>
                        </div>

                        <button
                          onClick={() => handleOrderLikeThis(order)}
                          className="w-full py-2 px-3 rounded-xl bg-bakery-cream hover:bg-bakery-caramel hover:text-white border border-bakery-beige text-bakery-chocolate text-xs font-bold transition-all flex items-center justify-center gap-1.5 group/btn"
                        >
                          <ShoppingBag className="w-3.5 h-3.5 text-bakery-caramel group-hover/btn:text-white" />
                          <span>Order Similar to This</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </section>

      {/* How to Order: Simple 3 Steps + Direct Order Slip */}
      <section id="how-to-order" className="py-16 bg-bakery-ivory border-y border-bakery-beige">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left: 3 Simple Steps */}
            <div className="lg:col-span-6 space-y-6">
              <div>
                <span className="text-[11px] font-bold tracking-wider text-bakery-caramel uppercase">
                  Simple &amp; Hassle-Free
                </span>
                <h2 className="font-display font-bold text-2xl sm:text-4xl text-bakery-chocolate mt-1">
                  How to Order Your Bakes
                </h2>
                <p className="text-xs sm:text-sm text-bakery-muted mt-2 leading-relaxed">
                  We bake in small batches to guarantee freshness. Here is how easy it is to pre-order for your personal cravings, office merienda, or gift boxes:
                </p>
              </div>

              {/* 3 Steps */}
              <div className="space-y-4">
                <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white border border-bakery-beige">
                  <div className="w-8 h-8 rounded-full bg-bakery-chocolate text-white flex items-center justify-center font-bold text-xs shrink-0">
                    1
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-bakery-chocolate">Pick Your Bakes</h4>
                    <p className="text-[11px] text-bakery-muted mt-0.5">
                      Choose your favorite treats and sizes from our menu above (Banana Cake with Lakatan, Brownies, or Cookies).
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white border border-bakery-beige">
                  <div className="w-8 h-8 rounded-full bg-bakery-chocolate text-white flex items-center justify-center font-bold text-xs shrink-0">
                    2
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-bakery-chocolate">Send Your Order Slip</h4>
                    <p className="text-[11px] text-bakery-muted mt-0.5">
                      Fill out your name, contact number, and target date in the slip beside. It lands directly on Dyna, Jeremy &amp; Anne&apos;s bakery dashboard!
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white border border-bakery-beige">
                  <div className="w-8 h-8 rounded-full bg-bakery-chocolate text-white flex items-center justify-center font-bold text-xs shrink-0">
                    3
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-bakery-chocolate">Baked Fresh for Delivery or Pickup</h4>
                    <p className="text-[11px] text-bakery-muted mt-0.5">
                      We contact you to confirm payment (GCash or Bank Transfer) and dispatch freshly baked warm treats via local delivery (Maxim/courier) or kitchen pickup in Lucena City.
                    </p>
                  </div>
                </div>
              </div>

              {/* Kitchen Hours & Pickup */}
              <div className="pt-2 flex flex-wrap gap-4 text-xs text-bakery-muted">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-bakery-caramel" />
                  <span>Mon – Sun &bull; 8:00 AM – 7:00 PM</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-bakery-caramel" />
                  <span>Lucena City, Quezon (Local Delivery / Pickup)</span>
                </div>
              </div>
            </div>

            {/* Right: Direct Order Slip Builder */}
            <div className="lg:col-span-6 bg-bakery-cream rounded-3xl border border-bakery-beige p-6 sm:p-8 shadow-warm-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-bakery-beige">
                <div className="flex items-center gap-2">
                  <ChefHat className="w-5 h-5 text-bakery-caramel" />
                  <div>
                    <h3 className="font-display font-bold text-base text-bakery-chocolate">
                      Order Inquiry Slip
                    </h3>
                    <p className="text-[10px] text-bakery-muted">
                      {totalCartItems > 0
                        ? `${totalCartItems} items selected from menu`
                        : 'Choose items above or fill in details below'}
                    </p>
                  </div>
                </div>
                {totalCartItems > 0 && (
                  <span className="font-display font-bold text-base text-bakery-caramel">
                    ₱{totalCartAmount.toFixed(2)}
                  </span>
                )}
              </div>

              {/* Selected items preview */}
              {totalCartItems > 0 ? (
                <div className="p-3 rounded-2xl bg-white border border-bakery-beige space-y-1.5 text-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-bakery-muted">
                    Your Selected Items:
                  </span>
                  <div className="divide-y divide-bakery-beige/60">
                    {Object.values(orderCart).map((item) => (
                      <div key={item.name} className="py-1 flex justify-between">
                        <span>{item.qty}x {item.name}</span>
                        <span className="font-bold">₱{(item.qty * item.price).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-white/70 border border-dashed border-bakery-beige text-center py-4">
                  <p className="text-xs text-bakery-muted">
                    No items selected yet. Click <strong>&quot;+ Add&quot;</strong> on any bake above!
                  </p>
                </div>
              )}

              <div className="space-y-3 text-xs">
                {/* Order Type Selection */}
                <div>
                  <label className="block font-semibold text-bakery-chocolate mb-1">Order Type</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {[
                      { id: 'REGULAR', label: 'Regular Bakes' },
                      { id: 'BULK', label: 'Bulk Order' },
                      { id: 'CUSTOM', label: 'Custom Box' },
                      { id: 'SPECIAL_EVENT', label: 'Birthday / Event' },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setOrderType(t.id)}
                        className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-colors ${
                          orderType === t.id
                            ? 'bg-bakery-chocolate text-white border-bakery-chocolate shadow-xs'
                            : 'bg-white text-bakery-chocolate border-bakery-beige hover:bg-bakery-cream'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-bakery-chocolate mb-1">Your Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Maria Santos"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige focus:outline-hidden focus:border-bakery-caramel text-xs text-bakery-chocolate"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-bakery-chocolate mb-1">Contact / Mobile Phone *</label>
                    <input
                      type="text"
                      required
                      placeholder="0917-xxx-xxxx"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige focus:outline-hidden focus:border-bakery-caramel text-xs text-bakery-chocolate"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-bakery-chocolate mb-1">Target Date Needed</label>
                    <input
                      type="date"
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige focus:outline-hidden focus:border-bakery-caramel text-xs text-bakery-chocolate"
                    />
                  </div>
                </div>

                {/* Delivery Method Choice */}
                <div>
                  <label className="block font-semibold text-bakery-chocolate mb-1">Fulfillment Option</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDeliveryMethod('PICKUP')}
                      className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-colors ${
                        deliveryMethod === 'PICKUP'
                          ? 'bg-white border-bakery-caramel ring-1 ring-bakery-caramel text-bakery-chocolate font-bold'
                          : 'bg-white/60 border-bakery-beige text-bakery-muted'
                      }`}
                    >
                      <MapPin className="w-4 h-4 text-bakery-caramel shrink-0" />
                      <div>
                        <span className="block text-[11px]">Kitchen Pickup</span>
                        <span className="block text-[9px] text-bakery-muted">Lucena City (Free)</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeliveryMethod('DELIVERY')}
                      className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-colors ${
                        deliveryMethod === 'DELIVERY'
                          ? 'bg-white border-bakery-caramel ring-1 ring-bakery-caramel text-bakery-chocolate font-bold'
                          : 'bg-white/60 border-bakery-beige text-bakery-muted'
                      }`}
                    >
                      <Clock className="w-4 h-4 text-bakery-caramel shrink-0" />
                      <div>
                        <span className="block text-[11px]">Local Courier</span>
                        <span className="block text-[9px] text-bakery-muted">Lucena &amp; nearby towns</span>
                      </div>
                    </button>
                  </div>
                </div>

                {deliveryMethod === 'DELIVERY' && (
                  <div>
                    <label className="block font-semibold text-bakery-chocolate mb-1">Delivery Address *</label>
                    <input
                      type="text"
                      required
                      placeholder="Barangay, Street, Landmark, Lucena City..."
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige focus:outline-hidden focus:border-bakery-caramel text-xs text-bakery-chocolate"
                    />
                  </div>
                )}

                {/* Payment Preference */}
                <div>
                  <label className="block font-semibold text-bakery-chocolate mb-1">Preferred Payment Arrangement</label>
                  <select
                    value={paymentPreference}
                    onChange={(e) => setPaymentPreference(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige focus:outline-hidden focus:border-bakery-caramel text-xs text-bakery-chocolate"
                  >
                    <option value="PAY_ON_PICKUP">Cash on Kitchen Pickup / COD</option>
                    <option value="GCASH">GCash (Send Slip after confirmation)</option>
                    <option value="BANK_TRANSFER">Bank Transfer (BDO / BPI / Maya)</option>
                    <option value="PARTIAL">50% Initial Deposit, Balance upon delivery</option>
                    <option value="NEXT_WEEK">Special Payment Arrangement (Next Week)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-bakery-chocolate mb-1">Special Notes / Custom Requests</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Birthday gift note, less sweet, pickup 3pm, specific packaging ribbons..."
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige focus:outline-hidden focus:border-bakery-caramel text-xs text-bakery-chocolate resize-none"
                  />
                </div>

                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    disabled={submittingInquiry}
                    onClick={handleSubmitInquiry}
                    className="w-full py-3 rounded-xl bg-bakery-chocolate text-white font-bold hover:bg-[#2c1108] transition-colors flex items-center justify-center gap-2 shadow-warm-sm disabled:opacity-50 text-xs"
                  >
                    <Send className="w-4 h-4 text-bakery-caramel" />
                    <span>
                      {submittingInquiry
                        ? 'Sending to Bakers...'
                        : totalCartAmount > 0
                        ? `Submit Order to Bakers (₱${totalCartAmount.toFixed(0)})`
                        : 'Submit Order Inquiry'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyOrder}
                    className="w-full py-2 rounded-xl bg-white border border-bakery-beige text-bakery-chocolate font-semibold hover:bg-bakery-cream transition-colors flex items-center justify-center gap-1.5 text-[11px]"
                  >
                    {orderCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-status-green" />
                        <span>Order Slip Copied to Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-bakery-caramel" />
                        <span>Or Copy Order Slip to Send Manually</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The CRAVEABLES Story: Humble Friends Home Bakery */}
      <section id="story" className="py-16 max-w-6xl mx-auto px-4 sm:px-6 space-y-10">
        <div className="max-w-2xl mx-auto text-center space-y-3">
          <span className="text-[11px] font-bold tracking-wider text-bakery-caramel uppercase">
            Our Small Home Bakery Story
          </span>
          <h2 className="font-display font-bold text-2xl sm:text-4xl text-bakery-chocolate">
            Meet Dyna, Jeremy &amp; Anne
          </h2>
          <p className="text-xs sm:text-sm text-bakery-muted leading-relaxed">
            We are not a big commercial factory or a fancy corporate brand. We are just three passionate friends who love baking honest, heartwarming treats for our community. Every banana cake is made with carefully chosen ripe Lakatan bananas, every brownie is baked until fudgy, and every cookie is scooped with love.
          </p>
        </div>

        {/* 3 Co-Owners Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-3xl bg-bakery-ivory border border-bakery-beige shadow-warm-xs text-center space-y-3 hover:border-bakery-caramel transition-colors">
            <div className="w-14 h-14 rounded-full bg-bakery-chocolate text-white mx-auto flex items-center justify-center font-display font-bold text-lg border-2 border-bakery-caramel shadow-xs">
              D
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-bakery-chocolate">Dyna</h3>
              <p className="text-[11px] font-bold text-bakery-caramel uppercase tracking-wider">
                Co-Owner &amp; Baker
              </p>
            </div>
            <p className="text-xs text-bakery-espresso/80 leading-relaxed">
              Takes care of our recipes and oven timing. Makes sure our banana cakes have that rich, fragrant Lakatan sweetness, and our cookies stay soft and chewy in the center.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-bakery-ivory border border-bakery-beige shadow-warm-xs text-center space-y-3 hover:border-bakery-caramel transition-colors">
            <div className="w-14 h-14 rounded-full bg-bakery-chocolate text-white mx-auto flex items-center justify-center font-display font-bold text-lg border-2 border-bakery-caramel shadow-xs">
              J
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-bakery-chocolate">Jeremy</h3>
              <p className="text-[11px] font-bold text-bakery-caramel uppercase tracking-wider">
                Co-Owner &amp; Kitchen Operations
              </p>
            </div>
            <p className="text-xs text-bakery-espresso/80 leading-relaxed">
              Handles kitchen prep, sourcing good local butter and dark cocoa, and making sure our baking schedules and deliveries run smoothly on time.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-bakery-ivory border border-bakery-beige shadow-warm-xs text-center space-y-3 hover:border-bakery-caramel transition-colors">
            <div className="w-14 h-14 rounded-full bg-bakery-chocolate text-white mx-auto flex items-center justify-center font-display font-bold text-lg border-2 border-bakery-caramel shadow-xs">
              A
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-bakery-chocolate">Anne</h3>
              <p className="text-[11px] font-bold text-bakery-caramel uppercase tracking-wider">
                Co-Owner &amp; Customer Care
              </p>
            </div>
            <p className="text-xs text-bakery-espresso/80 leading-relaxed">
              Ties the red ribbons on our cake loaves, packs every cookie box with care, and coordinates with you directly so your bakes arrive fresh for merienda.
            </p>
          </div>
        </div>

        {/* Humble Banner */}
        <div className="p-6 rounded-3xl bg-bakery-chocolate text-white text-center max-w-2xl mx-auto shadow-warm-sm space-y-2">
          <p className="font-display italic text-sm sm:text-base text-bakery-cream">
            &ldquo;We treat every single order like we&apos;re baking for our own family and neighbors. Thank you for supporting our small local business!&rdquo;
          </p>
          <p className="text-[11px] font-bold text-bakery-caramel uppercase tracking-widest">
            — Dyna, Jeremy &amp; Anne &bull; CRAVEABLES
          </p>
        </div>
      </section>

      {/* Customer Feedback: Real & Admin-Approved with Submission Feature */}
      <section id="reviews" className="py-16 sm:py-20 bg-bakery-ivory border-t border-bakery-beige space-y-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold tracking-wider text-bakery-caramel uppercase">
                Customer Feedback
              </span>
              <h2 className="font-display font-bold text-2xl sm:text-4xl text-bakery-chocolate mt-1">
                Real Sweet Feedback
              </h2>
              <p className="text-xs sm:text-sm text-bakery-muted mt-1">
                Honest comments from friends, neighbors, and patrons who ordered our bakes.
              </p>
            </div>

            {/* Leave a Review Button */}
            <button
              onClick={() => {
                setIsReviewModalOpen(true);
                setReviewSubmitted(false);
              }}
              className="px-4 py-2.5 rounded-2xl bg-bakery-chocolate text-white text-xs font-bold hover:bg-[#2c1108] transition-colors flex items-center gap-2 shadow-2xs self-start sm:self-auto"
            >
              <MessageSquare className="w-4 h-4 text-bakery-caramel" />
              <span>Leave a Review / Rate Us</span>
            </button>
          </div>

          {/* Reviews Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {reviews.map((r, idx) => (
              <div
                key={r.id || idx}
                className="p-5 rounded-3xl bg-white border border-bakery-beige shadow-warm-xs flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-1 text-bakery-caramel">
                    {[...Array(r.rating || 5)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-bakery-caramel text-bakery-caramel" />
                    ))}
                  </div>
                  <p className="text-xs text-bakery-espresso/85 italic leading-relaxed">
                    &ldquo;{r.comment}&rdquo;
                  </p>
                </div>

                <div className="pt-2.5 border-t border-bakery-beige/60 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-bakery-chocolate text-[11px]">{r.customer_name}</p>
                    {r.customer_location && (
                      <p className="text-[10px] text-bakery-muted">{r.customer_location}</p>
                    )}
                  </div>
                  {r.product_name && (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-bakery-cream text-bakery-caramel border border-bakery-beige">
                      {r.product_name}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-bakery-chocolate text-bakery-ivory py-12 border-t border-[#4e2112]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-8 border-b border-[#4e2112]/70">
            <div className="md:col-span-5 space-y-3">
              <div className="flex items-center gap-3">
                <img
                  src="/logo.png"
                  alt="CRAVEABLES Logo"
                  className="w-10 h-10 rounded-full bg-bakery-cream p-1 border border-bakery-caramel/50"
                />
                <span className="font-display font-bold text-xl text-bakery-cream tracking-tight">
                  CRAVEABLES
                </span>
              </div>
              <p className="text-[11px] font-bold text-bakery-caramel uppercase tracking-widest">
                MADE TO CRAVE &bull; BAKED WITH LOVE
              </p>
              <p className="text-xs text-bakery-beige/80 max-w-sm leading-relaxed">
                A small home bakery in Lucena City crafting freshly baked Lakatan banana cakes, fudgy brownies, and chewy cookies. Baked fresh to order.
              </p>
            </div>

            <div className="md:col-span-3 space-y-2 text-xs">
              <h4 className="font-bold text-bakery-cream uppercase tracking-wider text-[11px]">
                Quick Navigation
              </h4>
              <ul className="space-y-1.5 text-bakery-beige/70">
                <li><a href="#menu" className="hover:text-white transition-colors">Our Bakes &amp; Posters</a></li>
                <li><a href="#how-to-order" className="hover:text-white transition-colors">How to Order</a></li>
                <li><a href="#story" className="hover:text-white transition-colors">Meet Dyna, Jeremy &amp; Anne</a></li>
                <li><a href="#reviews" className="hover:text-white transition-colors">Customer Feedback</a></li>
              </ul>
            </div>

            <div className="md:col-span-4 space-y-3 text-xs">
              <h4 className="font-bold text-bakery-cream uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 text-bakery-caramel" />
                <span>Owner Portal Access</span>
              </h4>
              <p className="text-xs text-bakery-beige/70">
                Authorized access for co-owners Dyna, Jeremy, and Anne to manage live pre-orders, review feedback, inventory, and baking batches.
              </p>
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-bakery-caramel text-white text-xs font-bold hover:bg-[#966736] transition-colors shadow-2xs"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Sign In as Owner</span>
                </Link>
                <button
                  onClick={handleInstallClick}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#4e2112] text-bakery-beige hover:text-white text-xs font-semibold"
                >
                  <Smartphone className="w-3.5 h-3.5 text-bakery-caramel" />
                  <span>Install App</span>
                </button>
              </div>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-[11px] text-bakery-beige/60 gap-3">
            <p>&copy; {new Date().getFullYear()} CRAVEABLES. Made to Crave &bull; Baked with Love</p>
            <p>Humble Small Home Bakery &bull; Lucena City, Quezon, Philippines</p>
          </div>
        </div>
      </footer>

      {/* PWA Install Modal Guide */}
      {isInstallModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-bakery-ivory w-full max-w-md rounded-3xl border border-bakery-beige shadow-warm-lg overflow-hidden animate-scale-in">
            <div className="p-5 bg-bakery-chocolate text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-bakery-caramel" />
                <h3 className="font-display font-bold text-base">Install CRAVEABLES on Your Phone</h3>
              </div>
              <button
                onClick={() => setIsInstallModalOpen(false)}
                className="text-bakery-beige/70 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-bakery-espresso">
              <div className="text-center space-y-2">
                <img
                  src="/logo.png"
                  alt="CRAVEABLES App Icon"
                  className="w-16 h-16 mx-auto rounded-2xl bg-white p-1 border border-bakery-beige shadow-sm"
                />
                <h4 className="font-display font-bold text-base text-bakery-chocolate">
                  Get the 1-Tap CRAVEABLES App
                </h4>
                <p className="text-xs text-bakery-muted">
                  Add our app directly to your home screen for quick ordering without opening your browser!
                </p>
              </div>

              {/* Instructions per device */}
              <div className="space-y-3 pt-2">
                <div className="p-3.5 rounded-2xl bg-white border border-bakery-beige space-y-1.5">
                  <p className="font-bold text-bakery-chocolate flex items-center gap-1.5">
                    <span>📱 iPhone / iPad (Safari):</span>
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-bakery-muted text-[11px] pl-1">
                    <li>Tap the <strong>Share button</strong> (box with arrow pointing up) at the bottom of Safari.</li>
                    <li>Scroll down and tap <strong>&quot;Add to Home Screen&quot;</strong>.</li>
                    <li>Tap <strong>&quot;Add&quot;</strong> at the top right. The CRAVEABLES icon will appear on your home screen!</li>
                  </ol>
                </div>

                <div className="p-3.5 rounded-2xl bg-white border border-bakery-beige space-y-1.5">
                  <p className="font-bold text-bakery-chocolate flex items-center gap-1.5">
                    <span>🤖 Android / Chrome / Edge:</span>
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-bakery-muted text-[11px] pl-1">
                    <li>Tap the <strong>3 vertical dots</strong> (⋮) in the top right corner of Chrome.</li>
                    <li>Tap <strong>&quot;Install app&quot;</strong> or <strong>&quot;Add to Home Screen&quot;</strong>.</li>
                    <li>Confirm install. Tapping the icon on your phone opens CRAVEABLES instantly!</li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="p-4 bg-bakery-cream border-t border-bakery-beige flex justify-end">
              <button
                onClick={() => setIsInstallModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-bakery-chocolate text-white text-xs font-bold hover:bg-[#2c1108]"
              >
                Got It!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave a Review Modal (Submitted for Admin Review) */}
      {isReviewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-bakery-ivory w-full max-w-md rounded-3xl border border-bakery-beige shadow-warm-lg overflow-hidden my-auto animate-scale-in">
            <div className="p-5 bg-bakery-chocolate text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-bakery-caramel" />
                <h3 className="font-display font-bold text-base">Rate &amp; Review Your Cravings</h3>
              </div>
              <button
                onClick={() => setIsReviewModalOpen(false)}
                className="text-bakery-beige/70 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            {reviewSubmitted ? (
              <div className="p-8 text-center space-y-3 text-xs">
                <div className="w-14 h-14 rounded-full bg-status-greenLight text-status-green mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="font-display font-bold text-lg text-bakery-chocolate">
                  Maraming Salamat, {reviewName}!
                </h4>
                <p className="text-bakery-muted leading-relaxed">
                  Thank you for supporting our small home bakery! Your honest feedback has been sent to Dyna, Jeremy, and Anne. It will appear on our storefront once reviewed.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => {
                      setIsReviewModalOpen(false);
                      setReviewSubmitted(false);
                      setReviewName('');
                      setReviewLocation('');
                      setReviewComment('');
                    }}
                    className="px-5 py-2.5 rounded-xl bg-bakery-chocolate text-white font-bold hover:bg-[#2c1108]"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitReview} className="p-6 space-y-3.5 text-xs">
                <div>
                  <label className="block font-semibold text-bakery-chocolate mb-1">Your Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Joy or Kuya Mark"
                    value={reviewName}
                    onChange={(e) => setReviewName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige focus:outline-hidden text-xs text-bakery-chocolate"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-bakery-chocolate mb-1">City / Area</label>
                    <input
                      type="text"
                      placeholder="e.g. Taguig, QC, Pasig"
                      value={reviewLocation}
                      onChange={(e) => setReviewLocation(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige focus:outline-hidden text-xs text-bakery-chocolate"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-bakery-chocolate mb-1">What Did You Try?</label>
                    <select
                      value={reviewProduct}
                      onChange={(e) => setReviewProduct(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige focus:outline-hidden text-xs text-bakery-chocolate font-medium"
                    >
                      <option value="Banana Cake (Lakatan)">Banana Cake (Lakatan)</option>
                      <option value="Classic Brownies">Classic Brownies</option>
                      <option value="Red Velvet Cookies">Red Velvet Cookies</option>
                      <option value="Choco Chip Cookies">Choco Chip Cookies</option>
                      <option value="Assorted Treats">Assorted Treats</option>
                    </select>
                  </div>
                </div>

                {/* Star Rating Picker */}
                <div>
                  <label className="block font-semibold text-bakery-chocolate mb-1">Your Rating</label>
                  <div className="flex items-center gap-2 py-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        className="p-1 hover:scale-110 transition-transform"
                      >
                        <Star
                          className={`w-6 h-6 ${
                            star <= reviewRating
                              ? 'fill-bakery-caramel text-bakery-caramel'
                              : 'text-bakery-beige fill-bakery-beige/30'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="font-bold text-bakery-caramel text-xs ml-1">
                      {reviewRating} out of 5 stars
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-bakery-chocolate mb-1">Your Honest Feedback *</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Kumusta yung lasa, lambot, tamis, at packaging? Honest feedback helps our small kitchen improve!"
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige focus:outline-hidden text-xs text-bakery-chocolate resize-none"
                  />
                </div>

                <p className="text-[10px] text-bakery-muted italic">
                  Note: As a small business, reviews are checked by Dyna, Jeremy &amp; Anne to filter spam before displaying on the site.
                </p>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsReviewModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-bakery-beige text-bakery-chocolate font-semibold hover:bg-bakery-beige/30"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="px-5 py-2.5 rounded-xl bg-bakery-chocolate text-white font-bold hover:bg-[#2c1108] transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-warm-xs"
                  >
                    <Send className="w-3.5 h-3.5 text-bakery-caramel" />
                    <span>{submittingReview ? 'Submitting...' : 'Submit Feedback'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Full-Screen Poster Zoom / Lightbox Modal */}
      {selectedPoster && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="relative bg-bakery-ivory w-full max-w-4xl rounded-3xl border-2 border-bakery-beige shadow-2xl overflow-hidden my-auto max-h-[94vh] flex flex-col md:flex-row animate-scale-in">
            {/* Poster High-Res Image Display */}
            <div className="md:w-1/2 bg-[#1b1512] flex items-center justify-center p-3 sm:p-4 relative">
              <img
                src={selectedPoster.posterImage}
                alt={`${selectedPoster.name} Official Poster`}
                className="max-h-[50vh] md:max-h-[82vh] w-auto max-w-full object-contain rounded-2xl shadow-xl"
              />
              <button
                type="button"
                onClick={() => setSelectedPoster(null)}
                className="absolute top-3 right-3 md:hidden w-8 h-8 rounded-full bg-black/70 text-white flex items-center justify-center font-bold"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Poster Details & Direct Order Controls */}
            <div className="md:w-1/2 p-6 flex flex-col justify-between space-y-4 overflow-y-auto">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-bakery-cream text-bakery-caramel border border-bakery-beige">
                    {selectedPoster.tag} &bull; Official Poster
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedPoster(null)}
                    className="hidden md:flex w-8 h-8 rounded-full bg-bakery-cream text-bakery-chocolate items-center justify-center hover:bg-bakery-beige font-bold transition-colors"
                    title="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <h3 className="font-display font-bold text-2xl text-bakery-chocolate">
                    {selectedPoster.name}
                  </h3>
                  <p className="text-xs text-bakery-muted mt-2 leading-relaxed">
                    {selectedPoster.description}
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-bakery-cream border border-bakery-beige text-xs text-bakery-chocolate flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-bakery-caramel shrink-0" />
                  <span className="font-medium">{selectedPoster.highlight}</span>
                </div>

                {/* Variants & Direct Add */}
                <div className="space-y-2 pt-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-bakery-chocolate flex items-center justify-between">
                    <span>Select Size or Box:</span>
                    <span className="text-bakery-caramel font-medium">Add to inquiry tray</span>
                  </p>
                  <div className="space-y-2">
                    {selectedPoster.variants.map((v) => {
                      const inCart = orderCart[v.name]?.qty || 0;
                      return (
                        <div
                          key={v.name}
                          className="p-3 rounded-2xl bg-white border border-bakery-beige flex items-center justify-between"
                        >
                          <div>
                            <p className="font-bold text-xs text-bakery-chocolate">{v.name}</p>
                            <p className="font-display font-bold text-base text-bakery-caramel">₱{v.price.toFixed(2)}</p>
                          </div>

                          {inCart > 0 ? (
                            <div className="flex items-center gap-2 bg-bakery-cream px-2 py-1 rounded-xl border border-bakery-beige">
                              <button
                                type="button"
                                onClick={() => handleRemoveFromCart(v.name)}
                                className="w-6 h-6 rounded-lg bg-white text-bakery-chocolate flex items-center justify-center hover:bg-bakery-beige font-bold shadow-2xs"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="font-bold text-xs px-1 text-bakery-chocolate">{inCart}</span>
                              <button
                                type="button"
                                onClick={() => handleAddToCart(v.name, v.price)}
                                className="w-6 h-6 rounded-lg bg-bakery-chocolate text-white flex items-center justify-center hover:bg-[#2c1108] font-bold shadow-2xs"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleAddToCart(v.name, v.price)}
                              className="px-3.5 py-1.5 rounded-xl bg-bakery-chocolate text-white text-xs font-bold hover:bg-[#2c1108] transition-colors flex items-center gap-1.5 shadow-2xs"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add</span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Modal Footer Controls */}
              <div className="pt-4 border-t border-bakery-beige flex items-center justify-between gap-3">
                <div className="text-xs">
                  <span className="text-bakery-muted block text-[10px]">Your Tray:</span>
                  <strong className="text-bakery-chocolate font-display text-sm">
                    {totalCartItems} items &bull; ₱{totalCartAmount.toFixed(2)}
                  </strong>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedPoster(null)}
                    className="px-3.5 py-2 rounded-xl border border-bakery-beige text-bakery-chocolate text-xs font-semibold hover:bg-bakery-cream"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPoster(null);
                      setIsOrderModalOpen(true);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-bakery-chocolate text-white text-xs font-bold hover:bg-[#2c1108] transition-transform active:scale-95 shadow-warm-xs flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5 text-bakery-caramel" />
                    <span>View Order Slip</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Order Inquiry Modal */}
      {isOrderModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-bakery-ivory w-full max-w-lg rounded-3xl border border-bakery-beige shadow-warm-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 bg-bakery-chocolate text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-bakery-caramel" />
                <h3 className="font-display font-bold text-base">Your CRAVEABLES Order Inquiry</h3>
              </div>
              <button
                onClick={() => {
                  setIsOrderModalOpen(false);
                  if (inquirySubmitted) {
                    setInquirySubmitted(false);
                    setOrderCart({});
                  }
                }}
                className="text-bakery-beige/70 hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {inquirySubmitted ? (
              <div className="p-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-status-greenLight text-status-green mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-xl text-bakery-chocolate">
                    Order Received!
                  </h3>
                  <p className="text-xs text-bakery-caramel font-semibold mt-1">
                    Reference #{submittedInquiryNum}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-bakery-cream border border-bakery-beige text-xs text-bakery-espresso/80 text-left space-y-2">
                  <p className="font-bold text-bakery-chocolate">Thank you, {customerName}!</p>
                  <p>Your order inquiry has been received directly on our live bakery management dashboard.</p>
                  <p className="text-bakery-muted text-[11px]">
                    Dyna, Jeremy, or Anne will reach out to you via <strong>{customerPhone}</strong> shortly to confirm your baking schedule and payment details.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2.5 justify-center pt-2">
                  <button
                    type="button"
                    onClick={handleCopyOrder}
                    className="px-4 py-2.5 rounded-xl bg-bakery-caramel text-white text-xs font-bold hover:bg-[#966736] transition-colors flex items-center justify-center gap-1.5"
                  >
                    {orderCopied ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                    <span>{orderCopied ? 'Slip Copied!' : 'Copy Order Slip to Clipboard'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsOrderModalOpen(false);
                      setInquirySubmitted(false);
                      setOrderCart({});
                    }}
                    className="px-4 py-2.5 rounded-xl bg-bakery-chocolate text-white text-xs font-bold hover:bg-[#2c1108] transition-colors"
                  >
                    Back to Storefront
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="p-6 overflow-y-auto space-y-4 text-xs">
                  <div className="space-y-2">
                    <h4 className="font-bold text-bakery-chocolate uppercase tracking-wider text-[10px]">
                      Selected Treats:
                    </h4>
                    {Object.keys(orderCart).length === 0 ? (
                      <p className="text-bakery-muted italic text-center py-4">
                        Your tray is currently empty. Pick delicious treats from the menu above!
                      </p>
                    ) : (
                      <div className="divide-y divide-bakery-beige/60 border border-bakery-beige rounded-2xl p-3 bg-white">
                        {cartCalculations.map((item) => (
                          <div key={item.name} className="py-2 flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <p className="font-semibold text-bakery-chocolate">{item.name}</p>
                                {item.tierBadge && (
                                  <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded border border-emerald-300">
                                    {item.tierBadge}
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-bakery-muted">
                                ₱{item.price} x {item.qty}
                                {item.totalDiscount > 0 && (
                                  <span className="text-emerald-600 ml-1 font-semibold">
                                    (Save ₱{item.totalDiscount.toFixed(2)})
                                  </span>
                                )}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-display font-bold text-bakery-caramel">
                                ₱{item.discountedTotal.toFixed(2)}
                              </span>
                              <button
                                onClick={() => handleRemoveFromCart(item.name)}
                                className="text-status-red hover:underline text-[10px]"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                        {totalCartDiscount > 0 && (
                          <div className="pt-2 border-t border-bakery-beige/60 space-y-1">
                            <div className="flex justify-between text-bakery-muted text-xs">
                              <span>Regular Subtotal:</span>
                              <span>₱{rawCartAmount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-emerald-600 font-bold text-xs">
                              <span>🎉 Wholesale Discount:</span>
                              <span>-₱{totalCartDiscount.toFixed(2)}</span>
                            </div>
                          </div>
                        )}
                        <div className="pt-2 flex justify-between font-bold text-bakery-chocolate text-sm">
                          <span>Estimated Total:</span>
                          <span className="font-display text-bakery-caramel">₱{totalCartAmount.toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="block font-semibold text-bakery-chocolate mb-1">Your Full Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="Enter your name"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige text-xs focus:outline-hidden"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-bakery-chocolate mb-1">Mobile / Contact *</label>
                        <input
                          type="text"
                          required
                          placeholder="0917-xxx-xxxx"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige text-xs focus:outline-hidden"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-bakery-chocolate mb-1">Target Date</label>
                        <input
                          type="date"
                          value={deliveryDate}
                          onChange={(e) => setDeliveryDate(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige text-xs focus:outline-hidden"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-bakery-chocolate mb-1">Special Notes</label>
                      <textarea
                        rows={2}
                        placeholder="Any special requests or instructions..."
                        value={orderNotes}
                        onChange={(e) => setOrderNotes(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige text-xs resize-none focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-bakery-cream border-t border-bakery-beige flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setIsOrderModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-bakery-beige text-bakery-chocolate text-xs font-semibold hover:bg-bakery-beige/50"
                  >
                    Cancel
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyOrder}
                      disabled={totalCartItems === 0}
                      className="px-3 py-2 rounded-xl bg-white border border-bakery-beige text-bakery-chocolate text-xs font-semibold hover:bg-bakery-cream transition-colors disabled:opacity-50"
                    >
                      {orderCopied ? 'Slip Copied!' : 'Copy Slip'}
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmitInquiry}
                      disabled={totalCartItems === 0 || submittingInquiry}
                      className="px-5 py-2 rounded-xl bg-bakery-chocolate text-white text-xs font-bold hover:bg-[#2c1108] transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-warm-xs"
                    >
                      <Send className="w-4 h-4 text-bakery-caramel" />
                      <span>{submittingInquiry ? 'Sending...' : 'Submit Order Inquiry'}</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Featured Order Full Photo & Detail Lightbox Modal */}
      {previewFeaturedOrder && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setPreviewFeaturedOrder(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl border border-bakery-beige flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative aspect-4/3 bg-bakery-chocolate overflow-hidden">
              {(() => {
                const previewSrc =
                  previewFeaturedOrder.image_url ||
                  previewFeaturedOrder.image ||
                  '/poster-classic-brownies.jpg';
                const isVideo =
                  previewFeaturedOrder.media_type === 'video' ||
                  /\.(mp4|mov|webm|ogg|m4v|avi)(\?|$)/i.test(previewSrc);
                return isVideo ? (
                  <video
                    src={previewSrc}
                    controls
                    autoPlay
                    loop
                    playsInline
                    className="w-full h-full object-contain bg-black"
                  />
                ) : (
                  <img
                    src={previewSrc}
                    alt={previewFeaturedOrder.title}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = '/poster-choco-chip.jpg';
                    }}
                    className="w-full h-full object-cover"
                  />
                );
              })()}
              <button
                onClick={() => setPreviewFeaturedOrder(null)}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center backdrop-blur-xs transition-colors shadow-lg"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="absolute bottom-3 left-3 flex flex-wrap gap-2 pointer-events-none">
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-bakery-chocolate text-white shadow-xs">
                  {previewFeaturedOrder.order_type}
                </span>
                {previewFeaturedOrder.pieces_count && (
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-bakery-caramel text-white shadow-xs">
                    {previewFeaturedOrder.pieces_count} pcs
                  </span>
                )}
              </div>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="flex items-center justify-between text-xs text-bakery-muted">
                <span className="uppercase font-bold tracking-wider text-bakery-caramel">
                  {previewFeaturedOrder.category}
                </span>
                {previewFeaturedOrder.order_date && (
                  <span>Completed on {new Date(previewFeaturedOrder.order_date).toLocaleDateString()}</span>
                )}
              </div>

              <div>
                <h3 className="font-display font-bold text-2xl text-bakery-chocolate">
                  {previewFeaturedOrder.title}
                </h3>
                <p className="mt-2 text-sm text-bakery-espresso/80 leading-relaxed whitespace-pre-line">
                  {previewFeaturedOrder.description}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-bakery-cream/70 border border-bakery-beige/80 text-xs text-bakery-chocolate flex items-center justify-between">
                <span>Want Dyna, Jeremy &amp; Anne to bake this for your occasion?</span>
                <button
                  type="button"
                  onClick={() => {
                    const target = previewFeaturedOrder;
                    setPreviewFeaturedOrder(null);
                    handleOrderLikeThis(target);
                  }}
                  className="px-4 py-2 rounded-xl bg-bakery-chocolate text-white font-bold hover:bg-[#2c1108] transition-colors flex items-center gap-1.5 shrink-0"
                >
                  <ShoppingBag className="w-4 h-4 text-bakery-caramel" />
                  <span>Order Similar to This</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
