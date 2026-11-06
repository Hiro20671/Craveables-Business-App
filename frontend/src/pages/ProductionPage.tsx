import React, { useEffect, useState } from 'react';
import {
  ChefHat,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Calendar,
  XCircle,
  Package,
  Layers,
  ArrowRight,
  TrendingDown,
  RotateCcw,
  Trash2,
  Pencil
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';
import { ProductionOrder, Recipe } from '../types';

export const ProductionPage: React.FC = () => {
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  // New Production Wizard Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRecipeId, setSelectedRecipeId] = useState<number | null>(null);
  const [batchesCount, setBatchesCount] = useState<number>(1);
  const [productionDate, setProductionDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [productionNotes, setProductionNotes] = useState<string>('');
  const [checkingStock, setCheckingStock] = useState(false);
  const [stockCheckResult, setStockCheckResult] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ords, recs] = await Promise.all([
        api.getProductionOrders(),
        api.getRecipes(),
      ]);
      setOrders(ords);
      setRecipes(recs);

      if (recs.length > 0 && !selectedRecipeId) {
        setSelectedRecipeId(recs[0].id);
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

  // When recipe or batches change in wizard, re-check requirements
  useEffect(() => {
    if (!selectedRecipeId || !isModalOpen) return;

    let active = true;
    const runCheck = async () => {
      setCheckingStock(true);
      try {
        const res = await api.checkProductionRequirements(selectedRecipeId, batchesCount);
        if (active) {
          setStockCheckResult(res);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setCheckingStock(false);
      }
    };

    runCheck();
    return () => {
      active = false;
    };
  }, [selectedRecipeId, batchesCount, isModalOpen]);

  const handleOpenModal = () => {
    if (recipes.length > 0) {
      setSelectedRecipeId(recipes[0].id);
    }
    setBatchesCount(1);
    setProductionDate(new Date().toISOString().split('T')[0]);
    setProductionNotes('');
    setIsModalOpen(true);
  };

  const handleConfirmProduction = async (immediateComplete: boolean) => {
    if (!selectedRecipeId) return;
    try {
      setSubmitting(true);
      const payload = {
        recipe: selectedRecipeId,
        batches_count: batchesCount,
        production_date: productionDate,
        status: immediateComplete ? 'COMPLETED' : 'PLANNED',
        actual_yield: stockCheckResult?.planned_yield || 0,
        notes: productionNotes,
      };

      await api.createProductionOrder(payload);

      if (immediateComplete) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#3B170B', '#A97845', '#FFF9DF', '#15803d'],
        });
      }

      setIsModalOpen(false);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to create production order');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteOrder = async (order: ProductionOrder) => {
    if (!confirm(`Confirm completion and automatic ingredient deduction for ${order.production_number}?`)) return;
    try {
      await api.completeProductionOrder(order.id, order.planned_yield);
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to complete production');
    }
  };

  const [undoingId, setUndoingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editOrder, setEditOrder] = useState<ProductionOrder | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editDate, setEditDate] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const handleUndoOrder = async (ord: ProductionOrder) => {
    const confirmMsg = `Are you sure you want to undo batch "${ord.production_number}"?\n\n• All deducted raw ingredients will be returned to inventory stock\n• Added finished units (${ord.actual_yield}) will be subtracted\n• Batch status will become Cancelled`;
    if (!window.confirm(confirmMsg)) return;

    try {
      setUndoingId(ord.id);
      await api.undoProductionOrder(ord.id);
      alert(`Batch ${ord.production_number} was undone and ingredient inventory has been restored!`);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to undo production batch');
    } finally {
      setUndoingId(null);
    }
  };

  const handleDeleteOrder = async (ord: ProductionOrder) => {
    const confirmMsg = `Delete production batch record "${ord.production_number}"?\n\nIf the batch was completed, its deducted ingredients will be safely returned to stock.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      setDeletingId(ord.id);
      await api.deleteProductionOrder(ord.id);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete batch');
    } finally {
      setDeletingId(null);
    }
  };

  const openEditModal = (ord: ProductionOrder) => {
    setEditOrder(ord);
    setEditNotes(ord.notes || '');
    setEditDate(ord.production_date);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editOrder) return;
    try {
      setSavingEdit(true);
      await api.updateProductionOrder(editOrder.id, {
        notes: editNotes,
        production_date: editDate,
      });
      setEditOrder(null);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to update batch details');
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-bakery-ivory border border-bakery-beige shadow-warm-sm">
        <div>
          <h1 className="font-display font-bold text-2xl text-bakery-chocolate">
            Production Management & Baking Batches
          </h1>
          <p className="text-xs text-bakery-muted mt-0.5">
            Automatic inventory deduction upon batch confirmation &bull; Stock availability checker
          </p>
        </div>

        <button
          onClick={handleOpenModal}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-bakery-chocolate text-white text-xs font-semibold hover:bg-[#2c1108] shadow-warm-sm transition-transform active:scale-95"
        >
          <ChefHat className="w-4 h-4 text-bakery-cream" />
          <span>Start Production Batch</span>
        </button>
      </div>

      {/* Production Orders Table */}
      <div className="rounded-2xl bg-bakery-ivory border border-bakery-beige shadow-warm-sm overflow-hidden">
        <div className="p-4 border-b border-bakery-beige bg-bakery-cream/50 flex items-center justify-between">
          <h2 className="font-display font-bold text-base text-bakery-chocolate">
            Production Orders & Batch History
          </h2>
          <span className="text-xs text-bakery-muted font-medium">
            Total Batches: {orders.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-bakery-cream border-b border-bakery-beige text-bakery-chocolate font-bold">
                <th className="py-3 px-4">Production #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Product Variant</th>
                <th className="py-3 px-4 text-right">Batches</th>
                <th className="py-3 px-4 text-right">Yield</th>
                <th className="py-3 px-4 text-right">Total Cost (₱)</th>
                <th className="py-3 px-4 text-right">Cost / Unit (₱)</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bakery-beige/60">
              {orders.length > 0 ? (
                orders.map((ord) => {
                  let badge = (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-bakery-cream text-bakery-chocolate border border-bakery-beige">
                      Planned
                    </span>
                  );
                  if (ord.status === 'COMPLETED') {
                    badge = (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-status-greenLight text-status-green">
                        <CheckCircle2 className="w-3 h-3" /> Deducted
                      </span>
                    );
                  } else if (ord.status === 'IN_PROGRESS') {
                    badge = (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-status-orangeLight text-status-orange">
                        <Clock className="w-3 h-3" /> Baking
                      </span>
                    );
                  }

                  return (
                    <tr key={ord.id} className="hover:bg-bakery-cream/30 transition-colors">
                      <td className="py-3 px-4 font-bold text-bakery-chocolate">
                        {ord.production_number}
                      </td>
                      <td className="py-3 px-4 text-bakery-muted">
                        {ord.production_date}
                      </td>
                      <td className="py-3 px-4 font-semibold text-bakery-espresso">
                        {ord.product_name} &bull; <span className="text-bakery-caramel">{ord.variant_name}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-medium">
                        {ord.batches_count} batch{Number(ord.batches_count) > 1 ? 'es' : ''}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-bakery-chocolate">
                        {ord.actual_yield || ord.planned_yield} units
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-bakery-chocolate">
                        ₱{Number(ord.total_production_cost).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-bakery-caramel">
                        ₱{Number(ord.cost_per_unit).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {badge}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {ord.status === 'COMPLETED' ? (
                            <button
                              onClick={() => handleUndoOrder(ord)}
                              disabled={undoingId === ord.id}
                              title="Undo batch & restore raw ingredients to inventory"
                              className="px-2.5 py-1 rounded-lg bg-bakery-cream border border-bakery-beige text-bakery-chocolate hover:bg-bakery-beige text-[10px] font-bold flex items-center gap-1 shadow-2xs transition-colors"
                            >
                              <RotateCcw className={`w-3 h-3 text-status-orange ${undoingId === ord.id ? 'animate-spin' : ''}`} />
                              <span>{undoingId === ord.id ? 'Undoing...' : 'Undo Batch'}</span>
                            </button>
                          ) : ord.status === 'PLANNED' ? (
                            <button
                              onClick={() => handleCompleteOrder(ord)}
                              className="px-2.5 py-1 rounded-lg bg-status-green text-white text-[10px] font-bold hover:bg-status-green/90 shadow-xs"
                            >
                              Confirm & Deduct
                            </button>
                          ) : (
                            <span className="text-[10px] text-status-red font-semibold px-2 py-0.5 rounded bg-status-redLight border border-status-red/20">
                              Undone
                            </span>
                          )}

                          <button
                            onClick={() => openEditModal(ord)}
                            title="Edit batch date or notes"
                            className="p-1.5 rounded-lg hover:bg-bakery-beige text-bakery-chocolate transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteOrder(ord)}
                            disabled={deletingId === ord.id}
                            title="Delete batch record"
                            className="p-1.5 rounded-lg hover:bg-status-redLight text-status-red transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-xs text-bakery-muted">
                    No production runs recorded yet. Click &ldquo;Start Production Batch&rdquo; to begin baking.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Production Wizard Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-bakery-ivory rounded-2xl border border-bakery-beige p-6 shadow-2xl animate-in fade-in zoom-in-95 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-bakery-beige">
              <div>
                <h3 className="font-display font-bold text-lg text-bakery-chocolate">
                  New Production Batch
                </h3>
                <p className="text-xs text-bakery-muted">
                  Check ingredient inventory sufficiency before confirming deduction.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-bakery-muted hover:text-bakery-chocolate"
              >
                &times;
              </button>
            </div>

            <div className="space-y-4 py-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-bakery-chocolate mb-1">
                    Select Recipe / Product Variant *
                  </label>
                  <select
                    value={selectedRecipeId || ''}
                    onChange={(e) => setSelectedRecipeId(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige text-xs focus:outline-hidden focus:border-bakery-caramel"
                  >
                    {recipes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.product_name} — {r.variant_name} (Yield: {r.batch_yield}/batch)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-bakery-chocolate mb-1">
                    Batches Count *
                  </label>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={batchesCount}
                    onChange={(e) => setBatchesCount(Math.max(0.5, parseFloat(e.target.value) || 1))}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige text-xs font-bold text-bakery-chocolate focus:outline-hidden focus:border-bakery-caramel"
                  />
                </div>
              </div>

              {/* Requirement Checker Box */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-bakery-chocolate">
                    Inventory Sufficiency Check
                  </h4>
                  {stockCheckResult && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        stockCheckResult.is_sufficient
                          ? 'bg-status-greenLight text-status-green'
                          : 'bg-status-redLight text-status-red'
                      }`}
                    >
                      {stockCheckResult.is_sufficient ? 'All Ingredients Available' : 'Insufficient Inventory!'}
                    </span>
                  )}
                </div>

                <div className="rounded-xl border border-bakery-beige overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-bakery-cream text-bakery-chocolate font-bold border-b border-bakery-beige">
                        <th className="py-2 px-3">Ingredient</th>
                        <th className="py-2 px-3 text-right">Required</th>
                        <th className="py-2 px-3 text-right">Available</th>
                        <th className="py-2 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-bakery-beige/60">
                      {stockCheckResult?.requirements?.map((req: any) => (
                        <tr key={req.ingredient_id} className="hover:bg-bakery-cream/30">
                          <td className="py-2 px-3 font-semibold text-bakery-chocolate">
                            {req.ingredient_name}
                          </td>
                          <td className="py-2 px-3 text-right font-medium">
                            {req.required_quantity} {req.unit}
                          </td>
                          <td className="py-2 px-3 text-right">
                            {req.current_stock} {req.unit}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {req.has_enough ? (
                              <span className="text-[10px] font-bold text-status-green">Available</span>
                            ) : (
                              <span className="text-[10px] font-bold text-status-red">
                                Short by {req.shortage} {req.unit}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Batch Production Economics Preview */}
              {stockCheckResult && (
                <div className="p-3 rounded-xl bg-bakery-cream border border-bakery-beige grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div>
                    <span className="text-[10px] text-bakery-muted uppercase block">Planned Yield</span>
                    <span className="font-display font-bold text-sm text-bakery-chocolate">
                      {stockCheckResult.planned_yield} units
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-bakery-muted uppercase block">Ingredient Cost</span>
                    <span className="font-display font-bold text-sm text-bakery-chocolate">
                      ₱{stockCheckResult.estimated_ingredient_cost?.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-bakery-muted uppercase block">Total Batch Cost</span>
                    <span className="font-display font-bold text-sm text-bakery-chocolate">
                      ₱{stockCheckResult.estimated_total_cost?.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-bakery-muted uppercase block">Cost / Unit</span>
                    <span className="font-display font-bold text-sm text-bakery-caramel">
                      ₱{stockCheckResult.estimated_cost_per_unit?.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-bakery-chocolate mb-1">
                    Production Date
                  </label>
                  <input
                    type="date"
                    value={productionDate}
                    onChange={(e) => setProductionDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige text-xs focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-bakery-chocolate mb-1">
                    Production Notes / Oven Settings
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 175°C for 22 mins"
                    value={productionNotes}
                    onChange={(e) => setProductionNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige text-xs focus:outline-hidden"
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
                  type="button"
                  onClick={() => handleConfirmProduction(false)}
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-bakery-cream border border-bakery-beige text-bakery-chocolate font-semibold hover:bg-bakery-beige"
                >
                  Save as Planned
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmProduction(true)}
                  disabled={submitting || !stockCheckResult?.is_sufficient}
                  className="px-4 py-2 rounded-xl bg-bakery-chocolate text-white font-semibold hover:bg-[#2c1108] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-bakery-cream" />
                  <span>Confirm & Deduct Stock</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Edit Batch Modal */}
      {editOrder && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-bakery-ivory rounded-2xl border border-bakery-beige p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-bakery-beige">
              <div>
                <h3 className="font-display font-bold text-base text-bakery-chocolate">
                  Edit Production Batch
                </h3>
                <p className="text-[10px] text-bakery-muted">{editOrder.production_number}</p>
              </div>
              <button
                onClick={() => setEditOrder(null)}
                className="p-1 rounded-lg text-bakery-muted hover:text-bakery-chocolate"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 py-4 text-xs">
              <div>
                <label className="block font-semibold text-bakery-chocolate mb-1">Production Date</label>
                <input
                  type="date"
                  required
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-bakery-chocolate mb-1">Batch Notes</label>
                <textarea
                  rows={3}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="e.g. Extra baking time, special event batch..."
                  className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige focus:outline-hidden resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-bakery-beige">
                <button
                  type="button"
                  onClick={() => setEditOrder(null)}
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

