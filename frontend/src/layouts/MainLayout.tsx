import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Boxes,
  Wheat,
  Calculator,
  ChefHat,
  ShoppingBag,
  ReceiptText,
  WalletCards,
  Truck,
  BarChart3,
  Settings,
  Menu,
  X,
  LogOut,
  Bell,
  Sparkles,
  Layers,
  Globe,
  Crown,
  Package
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

interface NavItem {
  name: string;
  to: string;
  icon: React.ElementType;
  badge?: string;
}

const navItems: NavItem[] = [
  { name: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { name: 'Customer Orders', to: '/orders', icon: ShoppingBag },
  { name: 'Whole Sales Order', to: '/wholesale-orders', icon: Layers },
  { name: 'Inventory', to: '/inventory', icon: Boxes },
  { name: 'Ingredients', to: '/ingredients', icon: Wheat },
  { name: 'Recipe & Costing', to: '/costing', icon: Calculator },
  { name: 'Production', to: '/production', icon: ChefHat },
  { name: 'Products', to: '/products', icon: Package },
  { name: 'Sales', to: '/sales', icon: ReceiptText },
  { name: 'Expenses', to: '/expenses', icon: WalletCards },
  { name: 'Suppliers', to: '/suppliers', icon: Truck },
  { name: 'Reports', to: '/reports', icon: BarChart3 },
  { name: 'Settings', to: '/settings', icon: Settings },
];

export const MainLayout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pendingOrdersCount, setPendingOrdersCount] = useState<number>(0);
  const { user, logout } = useAuth();
  const location = useLocation();

  useEffect(() => {
    const fetchPendingCount = () => {
      api.getInquiries()
        .then((inqs) => {
          const pending = inqs.filter((i) => i.status === 'PENDING').length;
          setPendingOrdersCount(pending);
        })
        .catch(() => {});
    };

    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 15000);
    return () => clearInterval(interval);
  }, [location.pathname]);

  const currentNav = navItems.find((item) =>
    location.pathname.startsWith(item.to)
  ) || navItems[0];

  return (
    <div className="flex min-h-screen bg-bakery-cream">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-bakery-chocolate text-bakery-ivory border-r border-[#4e2112] shadow-warm-lg z-30 fixed inset-y-0 left-0">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-[#4e2112]/70 bg-[#341409]">
          <img
            src="/logo.png"
            alt="CRAVEABLES Logo"
            className="w-11 h-11 object-contain rounded-full bg-bakery-cream p-1 shadow-md border border-bakery-caramel/40"
          />
          <div>
            <h1 className="font-display font-bold text-lg tracking-wider text-bakery-cream">
              CRAVEABLES
            </h1>
            <p className="text-[10px] font-semibold tracking-wide text-bakery-caramel uppercase">
              MADE TO CRAVE &bull; BAKED WITH LOVE
            </p>
          </div>
        </div>

        {/* Quick Link to Customer Storefront / Landing Page */}
        <div className="px-3 pt-3">
          <Link
            to="/"
            className="flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#2b1006] text-bakery-beige hover:text-white border border-[#4e2112] hover:border-bakery-caramel transition-colors"
          >
            <div className="flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-bakery-caramel" />
              <span>Customer Storefront</span>
            </div>
            <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-bakery-caramel/30 text-bakery-cream">
              Public
            </span>
          </Link>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.to);
            const badgeText = item.to === '/orders' && pendingOrdersCount > 0
              ? `${pendingOrdersCount} New`
              : item.badge;

            return (
              <NavLink
                key={item.name}
                to={item.to}
                className={({ isActive: active }) => `
                  flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150
                  ${active
                    ? 'bg-bakery-caramel text-white shadow-sm font-semibold'
                    : 'text-bakery-beige/85 hover:bg-[#4a1e10] hover:text-white'
                  }
                `}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-bakery-caramel'}`} />
                <span className="flex-1 truncate">{item.name}</span>
                {badgeText && (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-status-orange text-white shadow-2xs animate-pulse">
                    {badgeText}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User Card & Logout */}
        <div className="p-3.5 border-t border-[#4e2112]/70 bg-[#301308]">
          <div className="flex items-center justify-between p-2 rounded-xl bg-[#3c190d]">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-bakery-caramel flex items-center justify-center font-bold text-xs text-white uppercase shadow-xs">
                <Crown className="w-4 h-4 text-bakery-cream" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate capitalize">
                  {user?.first_name || user?.username || 'Owner'}
                </p>
                <div className="flex items-center gap-1">
                  <span className="inline-block px-1.5 py-0.2 text-[9px] font-bold uppercase rounded bg-bakery-caramel/30 text-bakery-cream">
                    Admin
                  </span>
                  <span className="text-[9px] text-bakery-beige/70">Co-Owner</span>
                </div>
              </div>
            </div>
            <button
              onClick={logout}
              title="Sign out"
              className="p-1.5 rounded-lg text-bakery-beige/70 hover:text-white hover:bg-black/20 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <div
        className={`
          fixed inset-y-0 left-0 w-72 bg-bakery-chocolate text-bakery-ivory z-50 transform transition-transform duration-300 ease-in-out lg:hidden flex flex-col shadow-2xl
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#4e2112] bg-[#341409]">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="CRAVEABLES" className="w-9 h-9 rounded-full bg-bakery-cream p-0.5" />
            <span className="font-display font-bold text-base text-bakery-cream tracking-wide">CRAVEABLES</span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-1.5 text-bakery-beige hover:text-white rounded-lg hover:bg-[#4a1e10]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-3 pt-3">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#2b1006] text-bakery-beige hover:text-white border border-[#4e2112]"
          >
            <div className="flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-bakery-caramel" />
              <span>Customer Storefront</span>
            </div>
            <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-bakery-caramel/30 text-bakery-cream">
              Public
            </span>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const badgeText = item.to === '/orders' && pendingOrdersCount > 0
              ? `${pendingOrdersCount} New`
              : item.badge;

            return (
              <NavLink
                key={item.name}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) => `
                  flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm
                  ${isActive
                    ? 'bg-bakery-caramel text-white font-semibold'
                    : 'text-bakery-beige/90 hover:bg-[#4a1e10]'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                <span className="flex-1 truncate">{item.name}</span>
                {badgeText && (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-status-orange text-white">
                    {badgeText}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#4e2112] bg-[#301308]">
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-bakery-caramel text-white hover:bg-bakery-caramel/90"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Top Navbar */}
        <header className="sticky top-0 z-20 flex items-center justify-between px-4 sm:px-6 py-3.5 bg-bakery-ivory/95 backdrop-blur-md border-b border-bakery-beige shadow-warm-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 -ml-1 text-bakery-espresso rounded-lg hover:bg-bakery-cream lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h2 className="font-display font-bold text-xl sm:text-2xl text-bakery-chocolate leading-tight">
                {currentNav.name}
              </h2>
              <p className="text-xs text-bakery-caramel font-semibold hidden sm:block">
                MADE TO CRAVE &bull; BAKED WITH LOVE
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-bakery-ivory border border-bakery-beige hover:border-bakery-caramel text-bakery-chocolate text-xs font-semibold shadow-2xs transition-colors"
              title="Open Customer Landing Page"
            >
              <Globe className="w-3.5 h-3.5 text-bakery-caramel" />
              <span className="hidden md:inline">View Storefront</span>
            </Link>

            <NavLink
              to="/production"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-bakery-cream border border-bakery-beige hover:border-bakery-caramel text-bakery-chocolate font-medium text-xs shadow-xs transition-colors"
            >
              <ChefHat className="w-3.5 h-3.5 text-bakery-caramel" />
              <span>New Batch</span>
            </NavLink>

            <NavLink
              to="/sales"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-bakery-chocolate hover:bg-[#2c1108] text-white font-medium text-xs shadow-warm-sm transition-colors"
            >
              <ReceiptText className="w-3.5 h-3.5 text-bakery-cream" />
              <span>Record Sale</span>
            </NavLink>
          </div>
        </header>

        {/* Page View Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-20 lg:pb-8">
          <Outlet />
        </main>

        {/* Mobile Bottom Navigation Bar */}
        <div className="fixed bottom-0 inset-x-0 bg-bakery-ivory border-t border-bakery-beige py-2 px-3 flex items-center justify-around z-30 lg:hidden shadow-lg">
          <NavLink
            to="/dashboard"
            className={({ isActive }) => `flex flex-col items-center gap-1 text-[10px] font-semibold ${isActive ? 'text-bakery-chocolate' : 'text-bakery-espresso/60'}`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span>Dashboard</span>
          </NavLink>
          <NavLink
            to="/orders"
            className={({ isActive }) => `flex flex-col items-center gap-1 text-[10px] font-semibold relative ${isActive ? 'text-bakery-chocolate' : 'text-bakery-espresso/60'}`}
          >
            <ShoppingBag className="w-5 h-5" />
            {pendingOrdersCount > 0 && (
              <span className="absolute -top-1 right-2 w-2 h-2 rounded-full bg-status-orange" />
            )}
            <span>Orders</span>
          </NavLink>
          <NavLink
            to="/production"
            className={({ isActive }) => `flex flex-col items-center gap-1 text-[10px] font-semibold ${isActive ? 'text-bakery-chocolate' : 'text-bakery-espresso/60'}`}
          >
            <ChefHat className="w-5 h-5" />
            <span>Bake</span>
          </NavLink>
          <NavLink
            to="/sales"
            className={({ isActive }) => `flex flex-col items-center gap-1 text-[10px] font-semibold ${isActive ? 'text-bakery-chocolate' : 'text-bakery-espresso/60'}`}
          >
            <ReceiptText className="w-5 h-5" />
            <span>Sales</span>
          </NavLink>
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex flex-col items-center gap-1 text-[10px] font-semibold text-bakery-espresso/60"
          >
            <Layers className="w-5 h-5" />
            <span>More</span>
          </button>
        </div>
      </div>
    </div>
  );
};
