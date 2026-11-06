import React, { useEffect, useState } from 'react';
import {
  Truck,
  Plus,
  Search,
  Building,
  Phone,
  Mail,
  MapPin,
  Package,
  Calendar,
  CheckCircle2,
  DollarSign,
  Boxes
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';
import { Supplier, Ingredient } from '../types';

export const SuppliersPage: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'SUPPLIERS' | 'PURCHASES'>('SUPPLIERS');

  // Add Supplier Modal
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
  });

  // New Purchase Restock Modal
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [purchasePaymentMethod, setPurchasePaymentMethod] = useState('Cash');
  const [purchaseNotes, setPurchaseNotes] = useState('');
  const [purchaseItems, setPurchaseItems] = useState<
    Array<{
      ingredient: number;
      package_size: number;
      unit: string;
      quantity_packages: number;
      package_cost: number;
    }>
  >([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sups, pos, ings] = await Promise.all([
        api.getSuppliers(),
        api.getPurchaseOrders(),
        api.getIngredients(),
      ]);
      setSuppliers(sups);
      setPurchaseOrders(pos);
      setIngredients(ings);

      if (sups.length > 0 && !selectedSupplierId) {
        setSelectedSupplierId(String(sups[0].id));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createSupplier(supplierForm);
      setIsSupplierModalOpen(false);
      setSupplierForm({
        name: '',
        contact_person: '',
        phone: '',
        email: '',
        address: '',
        notes: '',
      });
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Error saving supplier');
    }
  };

  const openPurchaseModal = () => {
    if (suppliers.length > 0) {
      setSelectedSupplierId(String(suppliers[0].id));
    }
    setPurchaseDate(new Date().toISOString().split('T')[0]);
    setPurchasePaymentMethod('Cash');
    setPurchaseNotes('');
    if (ingredients.length > 0) {
      setPurchaseItems([
        {
          ingredient: ingredients[0].id,
          package_size: Number(ingredients[0].package_size),
          unit: ingredients[0].unit,
          quantity_packages: 1,
          package_cost: Number(ingredients[0].purchase_cost),
        },
      ]);
    }
    setIsPurchaseModalOpen(true);
  };

  const handleAddPurchaseItem = () => {
    if (ingredients.length > 0) {
      setPurchaseItems([
        ...purchaseItems,
        {
          ingredient: ingredients[0].id,
          package_size: Number(ingredients[0].package_size),
          unit: ingredients[0].unit,
          quantity_packages: 1,
          package_cost: Number(ingredients[0].purchase_cost),
        },
      ]);
    }
  };

  const handlePurchaseItemChange = (index: number, field: string, val: any) => {
    const updated = [...purchaseItems];
    if (field === 'ingredient') {
      const ing = ingredients.find((i) => i.id === Number(val));
      updated[index] = {
        ...updated[index],
        ingredient: Number(val),
        package_size: ing ? Number(ing.package_size) : 1000,
        unit: ing ? ing.unit : 'g',
        package_cost: ing ? Number(ing.purchase_cost) : 100,
      };
    } else {
      updated[index] = { ...updated[index], [field]: val };
    }
    setPurchaseItems(updated);
  };

  const handleRemovePurchaseItem = (index: number) => {
    setPurchaseItems(purchaseItems.filter((_, i) => i !== index));
  };

  const handleSubmitPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId || purchaseItems.length === 0) {
      alert('Please select supplier and add at least one ingredient');
      return;
    }

    try {
      const payload = {
        supplier: Number(selectedSupplierId),
        purchase_date: purchaseDate,
        payment_method: purchasePaymentMethod,
        notes: purchaseNotes,
        items: purchaseItems.map((item) => ({
          ingredient: item.ingredient,
          package_size: item.package_size,
          unit: item.unit,
          quantity_packages: item.quantity_packages,
          package_cost: item.package_cost,
          total_cost: item.package_cost * item.quantity_packages,
        })),
      };

      await api.createPurchaseOrder(payload);

      confetti({
        particleCount: 90,
        spread: 60,
        origin: { y: 0.6 },
      });

      setIsPurchaseModalOpen(false);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Error recording purchase order');
    }
  };

  const computedPurchaseTotal = purchaseItems.reduce(
    (sum, item) => sum + item.package_cost * item.quantity_packages,
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-bakery-ivory border border-bakery-beige shadow-warm-sm">
        <div>
          <h1 className="font-display font-bold text-2xl text-bakery-chocolate">
            Suppliers & Ingredient Restocking
          </h1>
          <p className="text-xs text-bakery-muted mt-0.5">
            Manage vendor contacts, purchase orders, and automatic inventory stock replenishment
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsSupplierModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-bakery-cream border border-bakery-beige text-xs font-semibold text-bakery-chocolate hover:bg-bakery-beige transition-colors"
          >
            <Building className="w-4 h-4 text-bakery-caramel" />
            <span>Add Supplier</span>
          </button>
          <button
            onClick={openPurchaseModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-bakery-chocolate text-white text-xs font-semibold hover:bg-[#2c1108] shadow-warm-sm transition-transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Restock Purchase</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-bakery-beige/70 pb-1 text-xs">
        <button
          onClick={() => setActiveTab('SUPPLIERS')}
          className={`pb-2.5 px-3 font-semibold transition-all border-b-2 -mb-1 ${
            activeTab === 'SUPPLIERS'
              ? 'border-bakery-chocolate text-bakery-chocolate'
              : 'border-transparent text-bakery-muted hover:text-bakery-chocolate'
          }`}
        >
          Suppliers Directory ({suppliers.length})
        </button>
        <button
          onClick={() => setActiveTab('PURCHASES')}
          className={`pb-2.5 px-3 font-semibold transition-all border-b-2 -mb-1 ${
            activeTab === 'PURCHASES'
              ? 'border-bakery-chocolate text-bakery-chocolate'
              : 'border-transparent text-bakery-muted hover:text-bakery-chocolate'
          }`}
        >
          Purchase Orders & Restock History ({purchaseOrders.length})
        </button>
      </div>

      {/* Tab 1: Suppliers Directory */}
      {activeTab === 'SUPPLIERS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {suppliers.map((sup) => (
            <div
              key={sup.id}
              className="p-5 rounded-2xl bg-bakery-ivory border border-bakery-beige shadow-warm-sm flex flex-col justify-between hover:shadow-warm transition-shadow"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-bakery-cream border border-bakery-beige flex items-center justify-center text-bakery-chocolate font-bold">
                      <Building className="w-5 h-5 text-bakery-caramel" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-base text-bakery-chocolate">
                        {sup.name}
                      </h3>
                      <p className="text-[11px] text-bakery-muted">
                        {sup.contact_person || 'Vendor Partner'}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-bakery-cream text-bakery-caramel">
                    {sup.purchase_orders_count || 0} POs
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-bakery-espresso/80 pt-2 border-t border-bakery-beige/60">
                  {sup.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-bakery-muted" />
                      <span>{sup.phone}</span>
                    </div>
                  )}
                  {sup.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-bakery-muted" />
                      <span>{sup.email}</span>
                    </div>
                  )}
                  {sup.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-bakery-muted" />
                      <span className="truncate">{sup.address}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-bakery-beige/60 flex items-center justify-between text-xs">
                <span className="text-bakery-muted text-[10px]">
                  Added {new Date(sup.created_at).toLocaleDateString()}
                </span>
                <button
                  onClick={() => {
                    setSelectedSupplierId(String(sup.id));
                    openPurchaseModal();
                  }}
                  className="font-semibold text-bakery-caramel hover:underline"
                >
                  Create Restock PO &rarr;
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: Purchase Orders Table */}
      {activeTab === 'PURCHASES' && (
        <div className="rounded-2xl bg-bakery-ivory border border-bakery-beige shadow-warm-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-bakery-cream border-b border-bakery-beige text-bakery-chocolate font-bold">
                  <th className="py-3 px-4">PO Number</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4">Restocked Items</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4 text-right">Total Amount (₱)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bakery-beige/60">
                {purchaseOrders.length > 0 ? (
                  purchaseOrders.map((po) => (
                    <tr key={po.id} className="hover:bg-bakery-cream/30 transition-colors">
                      <td className="py-3 px-4 font-bold text-bakery-chocolate">
                        {po.po_number}
                      </td>
                      <td className="py-3 px-4 text-bakery-muted">{po.purchase_date}</td>
                      <td className="py-3 px-4 font-semibold text-bakery-espresso">
                        {po.supplier_name}
                      </td>
                      <td className="py-3 px-4 text-bakery-muted">
                        {po.items?.map((it: any) => `${it.ingredient_name} (x${it.quantity_packages} pkgs)`).join(', ') || 'Item'}
                      </td>
                      <td className="py-3 px-4 text-bakery-muted">{po.payment_method}</td>
                      <td className="py-3 px-4 text-right font-display font-bold text-bakery-chocolate">
                        ₱{Number(po.total_amount).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-status-greenLight text-status-green">
                          <CheckCircle2 className="w-3 h-3" /> Received & Stocked
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-xs text-bakery-muted">
                      No purchase orders recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Supplier Modal */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-bakery-ivory rounded-2xl border border-bakery-beige p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <h3 className="font-display font-bold text-lg text-bakery-chocolate mb-1">
              Add New Supplier
            </h3>
            <p className="text-xs text-bakery-muted mb-4">
              Enter supplier business and contact information.
            </p>

            <form onSubmit={handleCreateSupplier} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-bakery-chocolate mb-1">
                  Supplier / Store Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. All About Baking, SM Supermarket"
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-bakery-chocolate mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    placeholder="Sales Rep Name"
                    value={supplierForm.contact_person}
                    onChange={(e) => setSupplierForm({ ...supplierForm, contact_person: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-bakery-chocolate mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="0917-..."
                    value={supplierForm.phone}
                    onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-bakery-chocolate mb-1">
                  Address
                </label>
                <input
                  type="text"
                  placeholder="Store location or branch"
                  value={supplierForm.address}
                  onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-bakery-beige">
                <button
                  type="button"
                  onClick={() => setIsSupplierModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-bakery-beige text-bakery-muted hover:bg-bakery-cream"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-bakery-chocolate text-white font-semibold hover:bg-[#2c1108]"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Restock Purchase Order Modal */}
      {isPurchaseModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-bakery-ivory rounded-2xl border border-bakery-beige p-6 shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <h3 className="font-display font-bold text-lg text-bakery-chocolate mb-1">
              Record Ingredient Restock Purchase
            </h3>
            <p className="text-xs text-bakery-muted mb-4">
              Upon saving, ingredient available stock will automatically increase.
            </p>

            <form onSubmit={handleSubmitPurchase} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-bakery-chocolate mb-1">
                    Supplier *
                  </label>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige focus:outline-hidden"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-bakery-chocolate mb-1">
                    Purchase Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Items Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="font-bold text-bakery-chocolate">
                    Purchased Ingredients
                  </label>
                  <button
                    type="button"
                    onClick={handleAddPurchaseItem}
                    className="text-xs font-semibold text-bakery-caramel hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Ingredient
                  </button>
                </div>

                <div className="space-y-2">
                  {purchaseItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 rounded-xl bg-white border border-bakery-beige">
                      <select
                        value={item.ingredient}
                        onChange={(e) => handlePurchaseItemChange(idx, 'ingredient', e.target.value)}
                        className="flex-1 px-2.5 py-1.5 rounded-lg border border-bakery-beige text-xs"
                      >
                        {ingredients.map((ing) => (
                          <option key={ing.id} value={ing.id}>
                            {ing.name} ({ing.package_size} {ing.unit})
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="1"
                        placeholder="Pkgs"
                        value={item.quantity_packages}
                        onChange={(e) => handlePurchaseItemChange(idx, 'quantity_packages', parseFloat(e.target.value) || 1)}
                        className="w-16 px-2 py-1.5 rounded-lg border border-bakery-beige text-xs text-center font-bold"
                      />
                      <span className="text-bakery-muted text-[11px]">pkgs @</span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Cost"
                        value={item.package_cost}
                        onChange={(e) => handlePurchaseItemChange(idx, 'package_cost', parseFloat(e.target.value) || 0)}
                        className="w-20 px-2 py-1.5 rounded-lg border border-bakery-beige text-xs font-bold text-bakery-chocolate"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemovePurchaseItem(idx)}
                        className="p-1 text-status-red hover:bg-status-redLight rounded"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Purchase Total Preview */}
              <div className="p-3.5 rounded-xl bg-bakery-cream border border-bakery-beige flex items-center justify-between">
                <span className="text-bakery-muted font-medium">Total Purchase Amount:</span>
                <span className="font-display font-bold text-lg text-bakery-chocolate">
                  ₱{computedPurchaseTotal.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-bakery-beige">
                <button
                  type="button"
                  onClick={() => setIsPurchaseModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-bakery-beige text-bakery-muted hover:bg-bakery-cream"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-bakery-chocolate text-white font-semibold hover:bg-[#2c1108]"
                >
                  Confirm & Stock Ingredients
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

