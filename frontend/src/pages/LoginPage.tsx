import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, User, ArrowRight, ShieldCheck, Crown, Store, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('dyna');
  const [password, setPassword] = useState('craveables2026');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      setSubmitting(true);
      await login(username, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid username or password');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickLogin = (user: string) => {
    setUsername(user);
    setPassword('craveables2026');
  };

  return (
    <div className="min-h-screen bg-bakery-cream flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background logo */}
      <img
        src="/badge.png"
        alt="CRAVEABLES"
        className="absolute -right-20 -bottom-20 w-96 h-96 opacity-10 pointer-events-none select-none"
      />
      <img
        src="/badge.png"
        alt="CRAVEABLES"
        className="absolute -left-20 -top-20 w-80 h-80 opacity-10 pointer-events-none select-none"
      />

      <div className="w-full max-w-md bg-bakery-ivory rounded-3xl border border-bakery-beige shadow-warm-lg p-7 sm:p-8 relative z-10 space-y-6">
        {/* Top Link back to Public Landing Page */}
        <div className="flex items-center justify-between pb-2 border-b border-bakery-beige/60">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-bakery-caramel hover:text-bakery-chocolate transition-colors"
          >
            <Store className="w-4 h-4" />
            <span>← Back to Customer Storefront</span>
          </Link>
          <span className="text-[10px] font-bold tracking-widest text-bakery-muted uppercase">
            Admin Access Only
          </span>
        </div>

        {/* Brand Logo & Heading */}
        <div className="text-center space-y-2">
          <div className="inline-block relative">
            <img
              src="/logo.png"
              alt="CRAVEABLES Official Logo"
              className="w-20 h-20 mx-auto object-contain rounded-full bg-bakery-cream p-1.5 border-2 border-bakery-caramel/50 shadow-md"
            />
            <div className="absolute -bottom-1 -right-1 bg-bakery-caramel text-white p-1 rounded-full shadow-sm">
              <Crown className="w-3.5 h-3.5" />
            </div>
          </div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-bakery-chocolate tracking-tight">
            CRAVEABLES
          </h1>
          <p className="text-[11px] font-bold tracking-wider text-bakery-caramel uppercase">
            MADE TO CRAVE &bull; BAKED WITH LOVE
          </p>
          <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-bakery-cream border border-bakery-beige text-[11px] font-semibold text-bakery-chocolate">
            <ShieldCheck className="w-3.5 h-3.5 text-bakery-caramel" />
            <span>Owner & Business Portal</span>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-status-redLight border border-status-red/30 text-status-red text-xs font-semibold text-center">
            {error}
          </div>
        )}

        {/* 3 Dedicated Owner Admin Selectors */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-bakery-chocolate uppercase tracking-wider">
              Select Owner Account:
            </label>
            <span className="text-[10px] text-bakery-muted font-medium">Equal Admin Rights</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'dyna', name: 'Dyna', title: 'Co-Owner' },
              { id: 'jeremy', name: 'Jeremy', title: 'Co-Owner' },
              { id: 'anne', name: 'Anne', title: 'Co-Owner' },
            ].map((owner) => {
              const isSelected = username === owner.id;
              return (
                <button
                  key={owner.id}
                  type="button"
                  onClick={() => handleQuickLogin(owner.id)}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    isSelected
                      ? 'bg-bakery-chocolate text-white border-bakery-chocolate shadow-warm-sm scale-[1.02]'
                      : 'bg-bakery-cream border-bakery-beige text-bakery-chocolate hover:border-bakery-caramel'
                  }`}
                >
                  <Crown className={`w-3.5 h-3.5 mx-auto mb-1 ${isSelected ? 'text-bakery-cream' : 'text-bakery-caramel'}`} />
                  <p className="font-bold text-xs capitalize">{owner.name}</p>
                  <p className={`text-[9px] ${isSelected ? 'text-bakery-cream/80' : 'text-bakery-muted'}`}>
                    {owner.title}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-bakery-chocolate mb-1.5">
              Username
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-bakery-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="dyna, jeremy, or anne"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-bakery-beige text-xs font-medium text-bakery-espresso focus:outline-hidden focus:border-bakery-caramel"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block font-semibold text-bakery-chocolate">
                Password
              </label>
              <span className="text-[10px] text-bakery-muted">Default: craveables2026</span>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-bakery-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-bakery-beige text-xs font-medium text-bakery-espresso focus:outline-hidden focus:border-bakery-caramel"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-bakery-chocolate text-white text-xs font-bold hover:bg-[#2c1108] shadow-warm-sm transition-transform active:scale-95 disabled:opacity-50"
          >
            <span>{submitting ? 'Authenticating...' : `Sign In as ${username.toUpperCase()}`}</span>
            <ArrowRight className="w-4 h-4 text-bakery-cream" />
          </button>
        </form>

        {/* Security Note */}
        <div className="pt-2 text-center text-[10px] text-bakery-muted border-t border-bakery-beige/60">
          <p>
            🔒 Only owners Dyna, Jeremy, and Anne are authorized to sign in. All three accounts hold equal administrator rights.
          </p>
        </div>
      </div>
    </div>
  );
};
