import React, { useEffect, useState } from 'react';
import {
  WalletCards,
  Plus,
  Search,
  Filter,
  DollarSign,
  TrendingDown,
  Trash2,
  Calendar,
  Tag,
  Zap,
  Box,
  Truck,
  Users,
  Paperclip,
  Pencil
} from 'lucide-react';
import { api } from '../services/api';
import { Expense } from '../types';

const CATEGORIES = [
  'Kuryente / Electricity',
  'Packaging',
  'Shipping Fee',
  'Transportation',
  'Ingredients',
  'Supplies',
  'Labor',
  'Other Expenses',
];

export const ExpensesPage: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Add Expense Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    category: 'Kuryente / Electricity',
    description: '',
    amount: '',
    payment_method: 'Cash',
    receipt_reference: '',
    notes: '',
  });

  // Edit Expense Modal
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editForm, setEditForm] = useState({
    date: '',
    category: 'Kuryente / Electricity',
    description: '',
    amount: '',
    payment_method: 'Cash',
    receipt_reference: '',
    notes: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const openEditModal = (e: Expense) => {
    setEditingExpense(e);
    setEditForm({
      date: e.date,
      category: e.category,
      description: e.description,
      amount: String(e.amount),
      payment_method: e.payment_method || 'Cash',
      receipt_reference: e.receipt_reference || '',
      notes: e.notes || '',
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense) return;
    try {
      setSavingEdit(true);
      await api.updateExpense(editingExpense.id, {
        ...editForm,
        amount: parseFloat(editForm.amount),
      });
      setEditingExpense(null);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Error updating expense');
    } finally {
      setSavingEdit(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [expData, summ] = await Promise.all([
        api.getExpenses(),
        api.getExpensesSummary(),
      ]);
      setExpenses(expData);
      setSummary(summ);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createExpense({
        ...form,
        amount: parseFloat(form.amount) || 0,
      });
      setIsModalOpen(false);
      setForm({
        date: new Date().toISOString().split('T')[0],
        category: 'Kuryente / Electricity',
        description: '',
        amount: '',
        payment_method: 'Cash',
        receipt_reference: '',
        notes: '',
      });
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Error recording expense');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this expense record?')) return;
    try {
      await api.deleteExpense(id);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Error deleting expense');
    }
  };

  const filtered = expenses.filter((e) => {
    const matchesSearch =
      e.description.toLowerCase().includes(search.toLowerCase()) ||
      (e.receipt_reference || '').toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'ALL' || e.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-bakery-ivory border border-bakery-beige shadow-warm-sm">
        <div>
          <h1 className="font-display font-bold text-2xl text-bakery-chocolate">
            Operating Expenses & Overhead Tracker
          </h1>
          <p className="text-xs text-bakery-muted mt-0.5">
            Electricity, packaging supplies, shipping fees, labor allowances, and kitchen utilities
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-bakery-chocolate text-white text-xs font-semibold hover:bg-[#2c1108] shadow-warm-sm transition-transform active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Record Expense</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-bakery-ivory border border-bakery-beige flex items-center justify-between">
          <div>
            <span className="text-[10px] text-bakery-muted uppercase font-semibold">Total Operating Expenses</span>
            <p className="text-xl font-display font-bold text-status-orange">
              ₱{Number(summary?.total_expenses || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <TrendingDown className="w-6 h-6 text-status-orange" />
        </div>

        <div className="p-4 rounded-xl bg-bakery-ivory border border-bakery-beige flex items-center justify-between">
          <div>
            <span className="text-[10px] text-bakery-muted uppercase font-semibold">Total Expense Transactions</span>
            <p className="text-xl font-display font-bold text-bakery-chocolate">
              {expenses.length} Records
            </p>
          </div>
          <WalletCards className="w-6 h-6 text-bakery-caramel" />
        </div>

        <div className="p-4 rounded-xl bg-bakery-ivory border border-bakery-beige flex items-center justify-between">
          <div>
            <span className="text-[10px] text-bakery-muted uppercase font-semibold">Active Categories</span>
            <p className="text-xl font-display font-bold text-bakery-chocolate">
              {summary?.by_category?.length || 0} Categories
            </p>
          </div>
          <Tag className="w-6 h-6 text-bakery-caramel" />
        </div>
      </div>

      {/* Search and Category Filter */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-bakery-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search description or receipt ref..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-bakery-ivory border border-bakery-beige text-xs text-bakery-espresso focus:outline-hidden focus:border-bakery-caramel"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 text-xs">
          <button
            onClick={() => setCategoryFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-colors ${
              categoryFilter === 'ALL'
                ? 'bg-bakery-chocolate text-white'
                : 'bg-bakery-ivory border border-bakery-beige text-bakery-espresso hover:bg-bakery-cream'
            }`}
          >
            All Categories
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategoryFilter(c)}
              className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-colors ${
                categoryFilter === c
                  ? 'bg-bakery-chocolate text-white'
                  : 'bg-bakery-ivory border border-bakery-beige text-bakery-espresso hover:bg-bakery-cream'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Expenses Table */}
      <div className="rounded-2xl bg-bakery-ivory border border-bakery-beige shadow-warm-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-bakery-cream border-b border-bakery-beige text-bakery-chocolate font-bold">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4">Reference / OR</th>
                <th className="py-3 px-4 text-right">Amount (₱)</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bakery-beige/60">
              {filtered.length > 0 ? (
                filtered.map((e) => (
                  <tr key={e.id} className="hover:bg-bakery-cream/30 transition-colors">
                    <td className="py-3 px-4 font-medium text-bakery-muted">{e.date}</td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-bakery-caramel/15 text-bakery-chocolate">
                        {e.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-bakery-espresso">{e.description}</td>
                    <td className="py-3 px-4 text-bakery-muted">{e.payment_method}</td>
                    <td className="py-3 px-4 text-bakery-muted">{e.receipt_reference || '—'}</td>
                    <td className="py-3 px-4 text-right font-display font-bold text-bakery-chocolate text-sm">
                      ₱{Number(e.amount).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openEditModal(e)}
                          title="Edit Expense"
                          className="p-1.5 rounded-lg bg-bakery-cream hover:bg-bakery-beige text-bakery-chocolate transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(e.id)}
                          title="Delete / Undo Expense"
                          className="p-1.5 rounded-lg bg-bakery-cream hover:bg-status-redLight text-status-red transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-bakery-muted">
                    No operating expenses recorded matching your query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-bakery-ivory rounded-2xl border border-bakery-beige p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <h3 className="font-display font-bold text-lg text-bakery-chocolate mb-1">
              Record Operating Expense
            </h3>
            <p className="text-xs text-bakery-muted mb-4">
              Track overheads in Philippine Peso (₱).
            </p>

            <form onSubmit={handleCreateExpense} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-bakery-chocolate mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-bakery-chocolate mb-1">
                    Amount (₱) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige font-bold text-bakery-chocolate focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-bakery-chocolate mb-1">
                  Expense Category *
                </label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige focus:outline-hidden"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-bakery-chocolate mb-1">
                  Description *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Meralco Baking Oven Bill, Lalamove courier to Makati"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-bakery-chocolate mb-1">
                    Payment Method
                  </label>
                  <select
                    value={form.payment_method}
                    onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige focus:outline-hidden"
                  >
                    <option value="Cash">Cash</option>
                    <option value="GCash">GCash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-bakery-chocolate mb-1">
                    Receipt / OR Reference
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. OR #84729"
                    value={form.receipt_reference}
                    onChange={(e) => setForm({ ...form, receipt_reference: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-bakery-beige">
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
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Edit Expense Modal */}
      {editingExpense && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-bakery-ivory rounded-2xl border border-bakery-beige p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-bakery-beige">
              <div>
                <h3 className="font-display font-bold text-base text-bakery-chocolate">
                  Edit Operating Expense
                </h3>
                <p className="text-[10px] text-bakery-muted">Update expense details or amount</p>
              </div>
              <button
                onClick={() => setEditingExpense(null)}
                className="p-1 rounded-lg text-bakery-muted hover:text-bakery-chocolate"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 py-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-bakery-chocolate mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={editForm.date}
                    onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-bakery-chocolate mb-1">Category *</label>
                  <select
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige focus:outline-hidden"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-bakery-chocolate mb-1">Description *</label>
                <input
                  type="text"
                  required
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-bakery-chocolate mb-1">Amount (₱) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editForm.amount}
                    onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige focus:outline-hidden font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-bakery-chocolate mb-1">Payment Method</label>
                  <select
                    value={editForm.payment_method}
                    onChange={(e) => setEditForm({ ...editForm, payment_method: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige focus:outline-hidden"
                  >
                    <option value="Cash">Cash</option>
                    <option value="GCash">GCash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-bakery-chocolate mb-1">Receipt Reference (Optional)</label>
                <input
                  type="text"
                  value={editForm.receipt_reference}
                  onChange={(e) => setEditForm({ ...editForm, receipt_reference: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-bakery-beige">
                <button
                  type="button"
                  onClick={() => setEditingExpense(null)}
                  className="px-3.5 py-2 rounded-xl border border-bakery-beige text-bakery-chocolate hover:bg-bakery-cream"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-4 py-2 rounded-xl bg-bakery-chocolate text-white font-semibold hover:bg-[#2c1108] disabled:opacity-50"
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

