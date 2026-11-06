import React, { useEffect, useState } from 'react';
import {
  Settings as SettingsIcon,
  Save,
  Users,
  Shield,
  Download,
  Database,
  Building,
  Smartphone,
  CheckCircle2,
  Lock,
  Plus,
  Crown,
  KeyRound
} from 'lucide-react';
import { api } from '../services/api';
import { BusinessSettings, User } from '../types';
import { useAuth } from '../context/AuthContext';

export const SettingsPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [settings, setSettings] = useState<BusinessSettings>({
    business_name: 'CRAVEABLES',
    tagline: 'Freshly Baked Treats & Artisanal Delights',
    currency_symbol: '₱',
    currency_code: 'PHP',
    contact_phone: '0917-000-0000',
    contact_email: 'craveablesbakery@gmail.com',
    address: 'Lucena City, Quezon, Philippines',
    logo_path: '/logo.png',
    default_reorder_level: '200.00',
    default_minimum_stock: '100.00',
    default_target_margin: '30.00',
  });
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // New User Modal
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userForm, setUserForm] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    role: 'STAFF',
  });

  // Password Change
  const [passwordForm, setPasswordForm] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [settingsData, usersData] = await Promise.all([
        api.getSettings(),
        api.getUsers(),
      ]);
      if (settingsData && settingsData.business_name) {
        setSettings(settingsData);
      }
      setUsers(usersData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.updateSettings(settings);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createUser(userForm);
      setIsUserModalOpen(false);
      setUserForm({
        username: '',
        email: '',
        first_name: '',
        last_name: '',
        password: '',
        role: 'STAFF',
      });
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Error creating user');
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordError('New passwords do not match.');
      return;
    }
    if (passwordForm.new_password.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      return;
    }
    try {
      setUpdatingPassword(true);
      setPasswordError(null);
      await api.changePassword({
        old_password: passwordForm.old_password,
        new_password: passwordForm.new_password,
      });
      setPasswordSuccess(true);
      setPasswordForm({ old_password: '', new_password: '', confirm_password: '' });
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update password.');
    } finally {
      setUpdatingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-bakery-ivory border border-bakery-beige shadow-warm-sm">
        <div>
          <h1 className="font-display font-bold text-2xl text-bakery-chocolate">
            System & Business Settings
          </h1>
          <p className="text-xs text-bakery-muted mt-0.5">
            Branding, currency defaults, inventory alert thresholds, user accounts, and backups
          </p>
        </div>

        {savedSuccess && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-status-greenLight text-status-green text-xs font-bold">
            <CheckCircle2 className="w-4 h-4" />
            <span>Settings saved successfully!</span>
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Business Configuration (7 cols) */}
        <div className="lg:col-span-7 p-6 rounded-2xl bg-bakery-ivory border border-bakery-beige shadow-warm-sm space-y-5">
          <div className="border-b border-bakery-beige pb-3 flex items-center gap-2.5">
            <Building className="w-5 h-5 text-bakery-caramel" />
            <h2 className="font-display font-bold text-lg text-bakery-chocolate">
              CRAVEABLES Business Profile
            </h2>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-bakery-chocolate mb-1">
                  Business Name
                </label>
                <input
                  type="text"
                  required
                  value={settings.business_name}
                  onChange={(e) => setSettings({ ...settings, business_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige font-bold text-bakery-chocolate focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block font-semibold text-bakery-chocolate mb-1">
                  Tagline / Motto
                </label>
                <input
                  type="text"
                  value={settings.tagline}
                  onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-bakery-chocolate mb-1">
                  Official Currency Symbol
                </label>
                <input
                  type="text"
                  value={settings.currency_symbol}
                  onChange={(e) => setSettings({ ...settings, currency_symbol: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige font-bold focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block font-semibold text-bakery-chocolate mb-1">
                  Default Target Profit Margin (%)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={settings.default_target_margin}
                  onChange={(e) => setSettings({ ...settings, default_target_margin: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-bakery-chocolate mb-1">
                  Default Reorder Threshold (g/ml)
                </label>
                <input
                  type="number"
                  value={settings.default_reorder_level}
                  onChange={(e) => setSettings({ ...settings, default_reorder_level: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block font-semibold text-bakery-chocolate mb-1">
                  Default Minimum Stock Level
                </label>
                <input
                  type="number"
                  value={settings.default_minimum_stock}
                  onChange={(e) => setSettings({ ...settings, default_minimum_stock: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-bakery-chocolate mb-1">
                  Contact Email
                </label>
                <input
                  type="email"
                  value={settings.contact_email}
                  onChange={(e) => setSettings({ ...settings, contact_email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block font-semibold text-bakery-chocolate mb-1">
                  Contact Phone
                </label>
                <input
                  type="text"
                  value={settings.contact_phone}
                  onChange={(e) => setSettings({ ...settings, contact_phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-bakery-chocolate mb-1">
                Bakery Kitchen Address
              </label>
              <input
                type="text"
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige focus:outline-hidden"
              />
            </div>

            <div className="pt-3 border-t border-bakery-beige flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-bakery-chocolate text-white text-xs font-semibold hover:bg-[#2c1108] disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: User Management & Backup (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Owner Accounts Card */}
          <div className="p-6 rounded-2xl bg-bakery-ivory border border-bakery-beige shadow-warm-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-bakery-beige">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-bakery-caramel" />
                <h3 className="font-display font-bold text-base text-bakery-chocolate">
                  CRAVEABLES Owners & Admins
                </h3>
              </div>
              <span className="text-[10px] font-bold text-bakery-caramel bg-bakery-cream px-2 py-0.5 rounded-full border border-bakery-beige">
                Equal Admin Power
              </span>
            </div>

            <p className="text-[11px] text-bakery-muted">
              The 3 co-owners Dyna, Jeremy, and Anne each have equal administrator power to manage inventory, production, recipe costing, and financial records.
            </p>

            <div className="divide-y divide-bakery-beige/60 text-xs">
              {users.map((u) => {
                const isCurrentUser = currentUser?.username === u.username;
                return (
                  <div key={u.id} className="py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-bakery-chocolate text-white flex items-center justify-center font-bold text-xs uppercase shadow-2xs">
                        {u.username[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-bakery-chocolate capitalize">
                            {u.first_name || u.username}
                          </span>
                          {isCurrentUser && (
                            <span className="text-[9px] font-bold text-bakery-caramel bg-bakery-cream px-1.5 py-0.2 rounded border border-bakery-beige">
                              You
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-bakery-muted">{u.email || `${u.username}@craveables.ph`}</span>
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-bakery-cream text-bakery-chocolate border border-bakery-beige">
                      Owner & Admin
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Change Password Card */}
          <div className="p-6 rounded-2xl bg-bakery-ivory border border-bakery-beige shadow-warm-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-bakery-beige">
              <KeyRound className="w-4 h-4 text-bakery-caramel" />
              <div>
                <h3 className="font-display font-bold text-base text-bakery-chocolate">
                  Change Password
                </h3>
                <p className="text-[10px] text-bakery-muted">
                  Update password for logged-in account ({currentUser?.username || 'Owner'})
                </p>
              </div>
            </div>

            {passwordSuccess && (
              <div className="p-2.5 rounded-xl bg-status-greenLight border border-status-green/30 text-status-green text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Password successfully updated!</span>
              </div>
            )}

            {passwordError && (
              <div className="p-2.5 rounded-xl bg-status-redLight border border-status-red/30 text-status-red text-xs font-semibold">
                {passwordError}
              </div>
            )}

            <form onSubmit={handleUpdatePassword} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-bakery-chocolate mb-1">
                  Current Password (Optional)
                </label>
                <input
                  type="password"
                  placeholder="Enter current password"
                  value={passwordForm.old_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, old_password: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige focus:outline-hidden focus:border-bakery-caramel"
                />
              </div>

              <div>
                <label className="block font-semibold text-bakery-chocolate mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Minimum 6 characters"
                  value={passwordForm.new_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige focus:outline-hidden focus:border-bakery-caramel"
                />
              </div>

              <div>
                <label className="block font-semibold text-bakery-chocolate mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Re-enter new password"
                  value={passwordForm.confirm_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige focus:outline-hidden focus:border-bakery-caramel"
                />
              </div>

              <button
                type="submit"
                disabled={updatingPassword}
                className="w-full py-2.5 rounded-xl bg-bakery-chocolate text-white text-xs font-bold hover:bg-[#2c1108] transition-colors disabled:opacity-50"
              >
                {updatingPassword ? 'Updating Password...' : 'Update Password'}
              </button>
            </form>
          </div>

          {/* Backup & Progressive Web App Card */}
          <div className="p-6 rounded-2xl bg-bakery-cream border border-bakery-beige shadow-warm-sm space-y-4 text-xs">
            <div className="flex items-center gap-2 text-bakery-chocolate font-bold">
              <Database className="w-4 h-4 text-bakery-caramel" />
              <span>Data Export & Backup</span>
            </div>
            <p className="text-bakery-muted">
              Download complete database records including ingredients, recipes, sales, and operating expenses.
            </p>
            <button
              onClick={() => window.open(api.downloadExcelReportUrl(), '_blank')}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-bakery-chocolate text-white text-xs font-semibold hover:bg-[#2c1108] transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download Excel Backup (.xlsx)</span>
            </button>

            <div className="pt-3 border-t border-bakery-beige/80 flex items-center gap-3">
              <Smartphone className="w-5 h-5 text-bakery-caramel flex-shrink-0" />
              <div>
                <p className="font-bold text-bakery-chocolate text-[11px]">Installable PWA App</p>
                <p className="text-[10px] text-bakery-muted">
                  Use on Android, iOS Safari (&ldquo;Add to Home Screen&rdquo;), or Windows Chrome app.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-bakery-ivory rounded-2xl border border-bakery-beige p-6 shadow-2xl animate-in fade-in zoom-in-95 text-xs">
            <h3 className="font-display font-bold text-lg text-bakery-chocolate mb-1">
              Add User Account
            </h3>
            <p className="text-bakery-muted mb-4">
              Assign role-based access for bakery management.
            </p>

            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="block font-semibold text-bakery-chocolate mb-1">Username *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. baker_jane"
                  value={userForm.username}
                  onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-xl bg-white border border-bakery-beige focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-bakery-chocolate mb-1">Email</label>
                <input
                  type="email"
                  placeholder="user@craveables.ph"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-xl bg-white border border-bakery-beige focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-bakery-chocolate mb-1">Password *</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-xl bg-white border border-bakery-beige focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-bakery-chocolate mb-1">Role *</label>
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-xl bg-white border border-bakery-beige focus:outline-hidden"
                >
                  <option value="ADMIN">Administrator (Full Access)</option>
                  <option value="STAFF">Staff (Operations Only)</option>
                  <option value="VIEWER">Viewer (Read-Only)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-bakery-beige">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl border border-bakery-beige text-bakery-muted hover:bg-bakery-cream"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-bakery-chocolate text-white font-semibold hover:bg-[#2c1108]"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

