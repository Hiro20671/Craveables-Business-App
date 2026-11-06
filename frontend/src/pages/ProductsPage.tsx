import React, { useEffect, useState } from 'react';
import {
  ShoppingBag,
  Plus,
  Copy,
  Edit2,
  Trash2,
  Tag,
  Package,
  Layers,
  Sparkles,
  Search
} from 'lucide-react';
import { api } from '../services/api';
import { Product, Category, ProductVariant } from '../types';

export const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<number | 'ALL'>('ALL');
  const [search, setSearch] = useState('');

  // Add Product Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    category: '',
    description: '',
    variants: [{ name: 'Regular', selling_price: '150.00', batch_yield: 2 }],
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [prods, cats] = await Promise.all([api.getProducts(), api.getCategories()]);
      setProducts(prods);
      setCategories(cats);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDuplicate = async (id: number) => {
    try {
      await api.duplicateProduct(id);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to duplicate product');
    }
  };

  const handleAddVariantRow = () => {
    setForm({
      ...form,
      variants: [...form.variants, { name: '', selling_price: '100.00', batch_yield: 2 }],
    });
  };

  const handleVariantChange = (index: number, field: string, val: any) => {
    const updated = [...form.variants];
    updated[index] = { ...updated[index], [field]: val };
    setForm({ ...form, variants: updated });
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const prod = await api.createProduct({
        name: form.name,
        category: form.category ? Number(form.category) : null,
        description: form.description,
        status: 'ACTIVE',
      });

      // Create variants
      for (const v of form.variants) {
        if (v.name) {
          await api.createVariant({
            product: prod.id,
            name: v.name,
            selling_price: parseFloat(v.selling_price) || 0,
            batch_yield: v.batch_yield,
            current_finished_stock: 0,
            is_active: true,
          });
        }
      }

      setIsModalOpen(false);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Error saving product');
    }
  };

  const filtered = products.filter((p) => {
    const matchesCat = selectedCategory === 'ALL' || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-bakery-ivory border border-bakery-beige shadow-warm-sm">
        <div>
          <h1 className="font-display font-bold text-2xl text-bakery-chocolate">
            Product Catalog & Menu
          </h1>
          <p className="text-xs text-bakery-muted mt-0.5">
            CRAVEABLES baked goods, packaging variations, selling prices, and finished goods inventory
          </p>
        </div>

        <button
          onClick={() => {
            setForm({
              name: '',
              category: categories.length > 0 ? String(categories[0].id) : '',
              description: '',
              variants: [{ name: 'Regular', selling_price: '150.00', batch_yield: 2 }],
            });
            setIsModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-bakery-chocolate text-white text-xs font-semibold hover:bg-[#2c1108] shadow-warm-sm transition-transform active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Product</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-bakery-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-bakery-ivory border border-bakery-beige text-xs text-bakery-espresso focus:outline-hidden focus:border-bakery-caramel"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedCategory === 'ALL'
                ? 'bg-bakery-chocolate text-white'
                : 'bg-bakery-ivory border border-bakery-beige text-bakery-espresso hover:bg-bakery-cream'
            }`}
          >
            All Categories ({products.length})
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === c.id
                  ? 'bg-bakery-chocolate text-white'
                  : 'bg-bakery-ivory border border-bakery-beige text-bakery-espresso hover:bg-bakery-cream'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((product) => (
          <div
            key={product.id}
            className="rounded-2xl bg-bakery-ivory border border-bakery-beige shadow-warm-sm overflow-hidden flex flex-col hover:shadow-warm transition-shadow"
          >
            {/* Card Header */}
            <div className="p-5 bg-gradient-to-br from-bakery-cream via-bakery-ivory to-bakery-cream border-b border-bakery-beige/70 flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-bakery-caramel/20 text-bakery-caramel">
                  {product.category_name || 'Bakery Item'}
                </span>
                <h3 className="font-display font-bold text-lg text-bakery-chocolate mt-1.5">
                  {product.name}
                </h3>
              </div>
              <img
                src="/badge.png"
                alt="Badge"
                className="w-10 h-10 object-contain rounded-full p-1 bg-white border border-bakery-beige shadow-xs"
              />
            </div>

            {/* Description */}
            <div className="p-5 flex-1 space-y-4">
              <p className="text-xs text-bakery-muted leading-relaxed">
                {product.description || 'Artisanal baked treat freshly handcrafted for CRAVEABLES customers.'}
              </p>

              {/* Variants Section */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-bakery-chocolate uppercase tracking-wider block">
                  Available Variants & Pricing
                </span>
                <div className="divide-y divide-bakery-beige/60 rounded-xl border border-bakery-beige bg-white overflow-hidden text-xs">
                  {product.variants.map((v) => (
                    <div key={v.id} className="p-2.5 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-bakery-chocolate">{v.name}</p>
                        <p className="text-[10px] text-bakery-muted">
                          Yield: {v.batch_yield} / batch &bull; In Stock: <span className="font-bold text-status-green">{v.current_finished_stock} units</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-display font-bold text-sm text-bakery-caramel block">
                          ₱{Number(v.selling_price).toFixed(2)}
                        </span>
                        {v.cost_per_unit > 0 && (
                          <span className="text-[10px] text-bakery-muted block">
                            Cost: ₱{v.cost_per_unit.toFixed(2)} ({v.profit_margin.toFixed(0)}% mg)
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Card Actions */}
            <div className="p-3 bg-bakery-cream/60 border-t border-bakery-beige flex items-center justify-between text-xs">
              <button
                onClick={() => handleDuplicate(product.id)}
                className="flex items-center gap-1 text-bakery-chocolate hover:text-bakery-caramel font-semibold"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Duplicate</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-bakery-ivory rounded-2xl border border-bakery-beige p-6 shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <h3 className="font-display font-bold text-lg text-bakery-chocolate mb-1">
              Add New Product to Menu
            </h3>
            <p className="text-xs text-bakery-muted mb-4">
              Create product and define its packaging variants and prices.
            </p>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-bakery-chocolate mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Red Velvet Cookies"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige focus:outline-hidden focus:border-bakery-caramel"
                />
              </div>

              <div>
                <label className="block font-semibold text-bakery-chocolate mb-1">
                  Category
                </label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige focus:outline-hidden focus:border-bakery-caramel"
                >
                  <option value="">Select category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-bakery-chocolate mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Appetizing description for packaging and menu..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige focus:outline-hidden focus:border-bakery-caramel"
                />
              </div>

              {/* Variants Builder */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="font-bold text-bakery-chocolate">
                    Product Variants & Sizes
                  </label>
                  <button
                    type="button"
                    onClick={handleAddVariantRow}
                    className="text-xs font-semibold text-bakery-caramel hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Variant
                  </button>
                </div>

                <div className="space-y-2">
                  {form.variants.map((v, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded-xl bg-white border border-bakery-beige">
                      <input
                        type="text"
                        placeholder="Variant name (e.g. Box of 6)"
                        value={v.name}
                        onChange={(e) => handleVariantChange(i, 'name', e.target.value)}
                        className="flex-1 px-2.5 py-1.5 rounded-lg border border-bakery-beige text-xs"
                      />
                      <input
                        type="number"
                        placeholder="Price ₱"
                        value={v.selling_price}
                        onChange={(e) => handleVariantChange(i, 'selling_price', e.target.value)}
                        className="w-24 px-2 py-1.5 rounded-lg border border-bakery-beige text-xs font-bold text-bakery-caramel"
                      />
                    </div>
                  ))}
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
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

