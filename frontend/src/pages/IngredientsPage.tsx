import React, { useEffect, useState } from 'react';
import {
  Wheat,
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertCircle,
  Check,
  Calendar,
  Building,
  Tag
} from 'lucide-react';
import { api } from '../services/api';
import { Ingredient, Supplier } from '../types';

export const IngredientsPage: React.FC = () => {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: '',
    supplier: '',
    supplier_name_raw: '',
    purchase_date: new Date().toISOString().split('T')[0],
    purchase_cost: '60.00',
    package_size: '1000.00',
    unit: 'g',
    current_stock: '1000.00',
    minimum_stock_level: '100.00',
    reorder_level: '200.00',
    notes: '',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ings, sups] = await Promise.all([api.getIngredients(), api.getSuppliers()]);
      setIngredients(ings);
      setSuppliers(sups);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAddModal = () => {
    setEditingId(null);
    setForm({
      name: '',
      supplier: suppliers.length > 0 ? String(suppliers[0].id) : '',
      supplier_name_raw: '',
      purchase_date: new Date().toISOString().split('T')[0],
      purchase_cost: '100.00',
      package_size: '1000.00',
      unit: 'g',
      current_stock: '1000.00',
      minimum_stock_level: '100.00',
      reorder_level: '200.00',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (ing: Ingredient) => {
    setEditingId(ing.id);
    setForm({
      name: ing.name,
      supplier: ing.supplier ? String(ing.supplier) : '',
      supplier_name_raw: ing.supplier_name_raw || '',
      purchase_date: ing.purchase_date || new Date().toISOString().split('T')[0],
      purchase_cost: String(ing.purchase_cost),
      package_size: String(ing.package_size),
      unit: ing.unit,
      current_stock: String(ing.current_stock),
      minimum_stock_level: String(ing.minimum_stock_level),
      reorder_level: String(ing.reorder_level),
      notes: ing.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: form.name,
        supplier: form.supplier ? Number(form.supplier) : null,
        supplier_name_raw: form.supplier_name_raw,
        purchase_date: form.purchase_date,
        purchase_cost: parseFloat(form.purchase_cost),
        package_size: parseFloat(form.package_size),
        unit: form.unit,
        current_stock: parseFloat(form.current_stock),
        minimum_stock_level: parseFloat(form.minimum_stock_level),
        reorder_level: parseFloat(form.reorder_level),
        notes: form.notes,
      };

      if (editingId) {
        await api.updateIngredient(editingId, payload);
      } else {
        await api.createIngredient(payload);
      }
      setIsModalOpen(false);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Error saving ingredient');
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to remove '${name}'? This may affect existing product recipes.`)) return;
    try {
      await api.deleteIngredient(id);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Error deleting ingredient');
    }
  };

  const filtered = ingredients.filter((ing) =>
    ing.name.toLowerCase().includes(search.toLowerCase()) ||
    (ing.supplier_name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-bakery-ivory border border-bakery-beige shadow-warm-sm">
        <div>
          <h1 className="font-display font-bold text-2xl text-bakery-chocolate">
            Ingredient Master Catalog
          </h1>
          <p className="text-xs text-bakery-muted mt-0.5">
            Pack sizes, baseline purchasing costs, suppliers, and automatic cost-per-unit metrics
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-bakery-chocolate text-white text-xs font-semibold hover:bg-[#2c1108] shadow-warm-sm transition-transform active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Ingredient</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative w-full sm:w-80">
        <Search className="w-4 h-4 text-bakery-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Filter ingredients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-xl bg-bakery-ivory border border-bakery-beige text-xs text-bakery-espresso focus:outline-hidden focus:border-bakery-caramel"
        />
      </div>

      {/* Ingredients Grid / Table */}
      <div className="rounded-2xl bg-bakery-ivory border border-bakery-beige shadow-warm-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-bakery-cream border-b border-bakery-beige text-bakery-chocolate font-bold">
                <th className="py-3 px-4">Ingredient Name</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4 text-right">Pack Size</th>
                <th className="py-3 px-4 text-right">Purchase Cost (₱)</th>
                <th className="py-3 px-4 text-right">Cost / Unit (₱)</th>
                <th className="py-3 px-4 text-right">Current Stock</th>
                <th className="py-3 px-4 text-right">Reorder Threshold</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bakery-beige/60">
              {filtered.map((ing) => (
                <tr key={ing.id} className="hover:bg-bakery-cream/30 transition-colors">
                  <td className="py-3 px-4 font-bold text-bakery-chocolate">
                    {ing.name}
                  </td>
                  <td className="py-3 px-4 text-bakery-muted">
                    {ing.supplier_name || ing.supplier_name_raw || 'Unassigned'}
                  </td>
                  <td className="py-3 px-4 text-right font-medium">
                    {Number(ing.package_size).toLocaleString()} {ing.unit}
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-bakery-chocolate">
                    ₱{Number(ing.purchase_cost).toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-bakery-caramel">
                    ₱{Number(ing.cost_per_unit).toFixed(4)} <span className="text-[10px] text-bakery-muted">/{ing.unit}</span>
                  </td>
                  <td className="py-3 px-4 text-right font-display font-bold text-bakery-chocolate">
                    {Number(ing.current_stock).toLocaleString()} {ing.unit}
                  </td>
                  <td className="py-3 px-4 text-right text-bakery-muted">
                    {Number(ing.reorder_level).toLocaleString()} {ing.unit}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => openEditModal(ing)}
                        className="p-1.5 rounded-lg bg-bakery-cream hover:bg-bakery-beige text-bakery-chocolate"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(ing.id, ing.name)}
                        className="p-1.5 rounded-lg bg-bakery-cream hover:bg-status-redLight text-status-red"
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

      {/* Add / Edit Ingredient Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-bakery-ivory rounded-2xl border border-bakery-beige p-6 shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <h3 className="font-display font-bold text-lg text-bakery-chocolate mb-1">
              {editingId ? 'Edit Ingredient Record' : 'Add New Ingredient'}
            </h3>
            <p className="text-xs text-bakery-muted mb-4">
              Enter ingredient details and purchase pricing. Unit cost will be computed automatically.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-bakery-chocolate mb-1">
                  Ingredient Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dark Chocolate Chips"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige focus:outline-hidden focus:border-bakery-caramel"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-bakery-chocolate mb-1">
                    Supplier
                  </label>
                  <select
                    value={form.supplier}
                    onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige focus:outline-hidden focus:border-bakery-caramel"
                  >
                    <option value="">Select or unassigned</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-bakery-chocolate mb-1">
                    Measurement Unit
                  </label>
                  <select
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige focus:outline-hidden focus:border-bakery-caramel"
                  >
                    <option value="g">Grams (g)</option>
                    <option value="kg">Kilograms (kg)</option>
                    <option value="ml">Milliliters (ml)</option>
                    <option value="L">Liters (L)</option>
                    <option value="pcs">Pieces (pcs)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-bakery-chocolate mb-1">
                    Package Size ({form.unit}) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={form.package_size}
                    onChange={(e) => setForm({ ...form, package_size: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige focus:outline-hidden focus:border-bakery-caramel"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-bakery-chocolate mb-1">
                    Purchase Cost (₱) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={form.purchase_cost}
                    onChange={(e) => setForm({ ...form, purchase_cost: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige focus:outline-hidden focus:border-bakery-caramel"
                  />
                </div>
              </div>

              {/* Computed unit cost preview */}
              <div className="p-3 rounded-xl bg-bakery-cream border border-bakery-beige flex items-center justify-between">
                <span className="text-bakery-muted">Computed Cost / Base Unit:</span>
                <span className="font-bold text-bakery-caramel text-sm">
                  ₱{Number(form.package_size) > 0 ? (Number(form.purchase_cost) / Number(form.package_size)).toFixed(4) : '0.0000'} /{form.unit}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-bakery-chocolate mb-1">
                    Current Stock ({form.unit})
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={form.current_stock}
                    onChange={(e) => setForm({ ...form, current_stock: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige focus:outline-hidden focus:border-bakery-caramel"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-bakery-chocolate mb-1">
                    Reorder Threshold ({form.unit})
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={form.reorder_level}
                    onChange={(e) => setForm({ ...form, reorder_level: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige focus:outline-hidden focus:border-bakery-caramel"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-bakery-chocolate mb-1">
                  Notes / Storage Instructions
                </label>
                <input
                  type="text"
                  placeholder="e.g. Keep chilled in refrigerator"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige focus:outline-hidden focus:border-bakery-caramel"
                />
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
                  {editingId ? 'Save Changes' : 'Create Ingredient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

