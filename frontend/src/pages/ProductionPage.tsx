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
  Pencil,
  Sliders,
  PlusCircle,
  AlertCircle,
  Info,
  Check
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';
import { ProductionOrder, Recipe, Ingredient } from '../types';

interface CustomBatchIngredient {
  ingredient_id: number;
  ingredient_name: string;
  unit: string;
  base_qty: number;
  custom_qty: number;
  cost_per_unit: number;
  is_additional: boolean;
  notes?: string;
}

export const ProductionPage: React.FC = () => {
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [allIngredients, setAllIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);

  // New Production Wizard Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRecipeId, setSelectedRecipeId] = useState<number | null>(null);
  const [batchesCountInput, setBatchesCountInput] = useState<string>('1');
  const [productionDate, setProductionDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [productionNotes, setProductionNotes] = useState<string>('');
  const [checkingStock, setCheckingStock] = useState(false);
  const [stockCheckResult, setStockCheckResult] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Custom ingredients on-the-fly (Section 4 & Test 4)
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [customIngredients, setCustomIngredients] = useState<CustomBatchIngredient[]>([]);
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [selectedExtraId, setSelectedExtraId] = useState<number | ''>('');
  const [extraQuantity, setExtraQuantity] = useState<string>('');

  // Edit ingredients for existing batch
  const [editingIngredientsOrder, setEditingIngredientsOrder] = useState<ProductionOrder | null>(null);
  const [editingIngredientsList, setEditingIngredientsList] = useState<any[]>([]);
  const [editingAdjustmentReason, setEditingAdjustmentReason] = useState<string>('');
  const [editingSelectedExtraId, setEditingSelectedExtraId] = useState<number | ''>('');
  const [editingExtraQty, setEditingExtraQty] = useState<string>('');
  const [savingIngredientsEdit, setSavingIngredientsEdit] = useState<boolean>(false);

  // Compute clean numeric batch count (fallback to 1 if user is currently typing or empty)
  const parsedBatches = parseFloat(batchesCountInput);
  const effectiveBatches = !isNaN(parsedBatches) && parsedBatches > 0 ? parsedBatches : 1;

  const handleBatchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') {
      setBatchesCountInput('');
      return;
    }
    setBatchesCountInput(val);
  };

  const handleBatchInputBlur = () => {
    const val = parseFloat(batchesCountInput);
    if (isNaN(val) || val <= 0) {
      setBatchesCountInput('1');
    } else {
      setBatchesCountInput(String(val));
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ords, recs, ings] = await Promise.all([
        api.getProductionOrders(),
        api.getRecipes(),
        api.getIngredients().catch(() => []),
      ]);
      setOrders(ords);
      setRecipes(recs);
      setAllIngredients(ings);

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

  // When recipe or batches change, check requirements and sync custom ingredients
  useEffect(() => {
    if (!selectedRecipeId || !isModalOpen) return;

    let active = true;
    const runCheck = async () => {
      setCheckingStock(true);
      try {
        const res = await api.checkProductionRequirements(selectedRecipeId, effectiveBatches);
        if (active) {
          setStockCheckResult(res);
          // Sync base ingredients into custom list if not currently actively customized
          if (!isCustomizing && res?.requirements) {
            const initialList: CustomBatchIngredient[] = res.requirements.map((req: any) => ({
              ingredient_id: req.ingredient_id,
              ingredient_name: req.ingredient_name,
              unit: req.unit,
              base_qty: req.required_quantity,
              custom_qty: req.required_quantity,
              cost_per_unit: req.cost_per_unit || 0,
              is_additional: false,
            }));
            setCustomIngredients(initialList);
          }
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
  }, [selectedRecipeId, effectiveBatches, isModalOpen]);

  const handleOpenModal = () => {
    if (recipes.length > 0) {
      setSelectedRecipeId(recipes[0].id);
    }
    setBatchesCountInput('1');
    setProductionDate(new Date().toISOString().split('T')[0]);
    setProductionNotes('');
    setIsCustomizing(false);
    setAdjustmentReason('');
    setSelectedExtraId('');
    setExtraQuantity('');
    setIsModalOpen(true);
  };

  // Handle custom ingredient quantity edit
  const handleUpdateCustomQty = (index: number, newQtyStr: string) => {
    const val = parseFloat(newQtyStr);
    setCustomIngredients((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], custom_qty: isNaN(val) ? 0 : val };
      return next;
    });
  };

  // Add extra ingredient on-the-fly
  const handleAddExtraIngredient = () => {
    if (!selectedExtraId) {
      alert('Please select an ingredient from inventory to add');
      return;
    }
    const qty = parseFloat(extraQuantity);
    if (isNaN(qty) || qty <= 0) {
      alert('Please enter a valid quantity greater than 0');
      return;
    }

    const targetIng = allIngredients.find((i) => i.id === Number(selectedExtraId));
    if (!targetIng) return;

    // Check if already in list
    const existingIdx = customIngredients.findIndex((ci) => ci.ingredient_id === targetIng.id);
    if (existingIdx >= 0) {
      setCustomIngredients((prev) => {
        const next = [...prev];
        next[existingIdx] = {
          ...next[existingIdx],
          custom_qty: next[existingIdx].custom_qty + qty,
          is_additional: true,
        };
        return next;
      });
    } else {
      setCustomIngredients((prev) => [
        ...prev,
        {
          ingredient_id: targetIng.id,
          ingredient_name: targetIng.name,
          unit: targetIng.unit,
          base_qty: 0,
          custom_qty: qty,
          cost_per_unit: Number(targetIng.cost_per_unit || 0),
          is_additional: true,
          notes: 'Added on-the-fly for batch',
        },
      ]);
    }

    setSelectedExtraId('');
    setExtraQuantity('');
  };

  // Remove custom additional ingredient
  const handleRemoveCustomIngredient = (index: number) => {
    setCustomIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  // Recalculate estimated cost with customizations
  const calculatedCustomCost = customIngredients.reduce((sum, item) => {
    return sum + Number(item.custom_qty) * Number(item.cost_per_unit);
  }, 0);

  const overheadCost =
    (stockCheckResult?.estimated_total_cost || 0) - (stockCheckResult?.estimated_ingredient_cost || 0);
  const totalAdjustedBatchCost = isCustomizing
    ? calculatedCustomCost + overheadCost
    : stockCheckResult?.estimated_total_cost || 0;
  const adjustedCostPerUnit =
    stockCheckResult?.planned_yield && stockCheckResult.planned_yield > 0
      ? totalAdjustedBatchCost / stockCheckResult.planned_yield
      : 0;

  const handleConfirmProduction = async (immediateComplete: boolean) => {
    if (!selectedRecipeId) return;
    const finalBatches = parseFloat(batchesCountInput);
    if (isNaN(finalBatches) || finalBatches <= 0) {
      alert('Please enter a valid positive number for batches count.');
      return;
    }

    try {
      setSubmitting(true);
      const payload: any = {
        recipe: selectedRecipeId,
        batches_count: finalBatches,
        production_date: productionDate,
        status: immediateComplete ? 'COMPLETED' : 'PLANNED',
        actual_yield: stockCheckResult?.planned_yield || 0,
        notes: productionNotes,
      };

      if (isCustomizing && customIngredients.length > 0) {
        payload.is_customized = true;
        payload.adjustment_reason = adjustmentReason.trim() || 'Custom batch ingredients requested';
        payload.custom_ingredients = customIngredients.map((ci) => ({
          ingredient_id: ci.ingredient_id,
          quantity_used: ci.custom_qty,
          is_additional: ci.is_additional,
          notes: ci.notes || '',
        }));
      }

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

  const openEditIngredientsModal = async (ord: ProductionOrder) => {
    setEditingIngredientsOrder(ord);
    setEditingAdjustmentReason(ord.adjustment_reason || 'Manual ingredient adjustment');
    setEditingSelectedExtraId('');
    setEditingExtraQty('');

    if (ord.ingredient_usages && ord.ingredient_usages.length > 0) {
      setEditingIngredientsList(
        ord.ingredient_usages.map((u: any) => ({
          ingredient_id: u.ingredient,
          ingredient_name: u.ingredient_name,
          unit: u.unit,
          quantity: Number(u.actual_quantity_used || u.required_quantity),
          unit_cost: Number(u.unit_cost_snapshot || 0),
          is_additional: Boolean(u.is_additional),
          notes: u.notes || '',
        }))
      );
    } else {
      try {
        const res = await api.checkProductionRequirements(ord.recipe, Number(ord.batches_count));
        if (res?.requirements) {
          setEditingIngredientsList(
            res.requirements.map((req: any) => ({
              ingredient_id: req.ingredient_id,
              ingredient_name: req.ingredient_name,
              unit: req.unit,
              quantity: req.required_quantity,
              unit_cost: req.cost_per_unit || 0,
              is_additional: false,
              notes: '',
            }))
          );
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleUpdateEditingQty = (idx: number, newQtyStr: string) => {
    const val = parseFloat(newQtyStr);
    setEditingIngredientsList((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], quantity: isNaN(val) ? 0 : val };
      return next;
    });
  };

  const handleRemoveEditingIngredient = (idx: number) => {
    setEditingIngredientsList((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAddEditingExtra = () => {
    if (!editingSelectedExtraId) return;
    const qty = parseFloat(editingExtraQty);
    if (isNaN(qty) || qty <= 0) {
      alert('Please enter a valid quantity greater than 0');
      return;
    }
    const ing = allIngredients.find((i) => i.id === Number(editingSelectedExtraId));
    if (!ing) return;

    const existingIdx = editingIngredientsList.findIndex((i) => i.ingredient_id === ing.id);
    if (existingIdx >= 0) {
      setEditingIngredientsList((prev) => {
        const next = [...prev];
        next[existingIdx] = {
          ...next[existingIdx],
          quantity: next[existingIdx].quantity + qty,
          is_additional: true,
        };
        return next;
      });
    } else {
      setEditingIngredientsList((prev) => [
        ...prev,
        {
          ingredient_id: ing.id,
          ingredient_name: ing.name,
          unit: ing.unit,
          quantity: qty,
          unit_cost: Number(ing.cost_per_unit || 0),
          is_additional: true,
          notes: 'Added to batch',
        },
      ]);
    }
    setEditingSelectedExtraId('');
    setEditingExtraQty('');
  };

  const handleSaveIngredientsEdit = async () => {
    if (!editingIngredientsOrder) return;
    try {
      setSavingIngredientsEdit(true);
      await api.adjustProductionIngredients(editingIngredientsOrder.id, {
        custom_ingredients: editingIngredientsList.map((item) => ({
          ingredient_id: item.ingredient_id,
          quantity: item.quantity,
          is_additional: item.is_additional,
          notes: item.notes || '',
        })),
        adjustment_reason: editingAdjustmentReason.trim() || 'Manual batch ingredient adjustment',
        batches_count: Number(editingIngredientsOrder.batches_count),
        actual_yield: editingIngredientsOrder.actual_yield || editingIngredientsOrder.planned_yield,
      });
      setEditingIngredientsOrder(null);
      await fetchData();
      alert('Batch ingredients updated successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to update batch ingredients');
    } finally {
      setSavingIngredientsEdit(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-bakery-ivory border border-bakery-beige shadow-warm-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display font-bold text-2xl text-bakery-chocolate">
              Production Management &amp; Baking Batches
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-bakery-caramel/15 text-bakery-caramel border border-bakery-caramel/30">
              Recipe Preservation Active
            </span>
          </div>
          <p className="text-xs text-bakery-muted mt-0.5">
            Automatic inventory deduction upon batch confirmation &bull; Flexible ingredient overrides &bull; Stock sufficiency checker
          </p>
        </div>

        <button
          onClick={handleOpenModal}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-bakery-chocolate text-white text-xs font-semibold hover:bg-[#2c1108] shadow-warm-sm transition-transform active:scale-95 shrink-0"
        >
          <ChefHat className="w-4 h-4 text-bakery-cream" />
          <span>Start Production Batch</span>
        </button>
      </div>

      {/* Production Orders Table */}
      <div className="rounded-2xl bg-bakery-ivory border border-bakery-beige shadow-warm-sm overflow-hidden">
        <div className="p-4 border-b border-bakery-beige bg-bakery-cream/50 flex items-center justify-between">
          <h2 className="font-display font-bold text-base text-bakery-chocolate">
            Production Orders &amp; Batch History
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
                      <td className="py-3 px-4">
                        <span className="font-bold text-bakery-chocolate block">{ord.production_number}</span>
                        {ord.order_number_ref && (
                          <span className="font-mono text-[10px] text-bakery-caramel bg-bakery-cream px-1.5 py-0.2 rounded border border-bakery-beige inline-block mt-0.5">
                            {ord.order_number_ref}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-bakery-muted">
                        {ord.production_date}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-bakery-espresso block">
                          {ord.product_name} &bull; <span className="text-bakery-caramel">{ord.variant_name}</span>
                        </span>
                        {ord.is_customized && (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 mt-0.5"
                            title={ord.adjustment_reason || 'Customized ingredients for batch'}
                          >
                            <Sparkles className="w-3 h-3 text-amber-600" />
                            <span>Customized Batch</span>
                          </span>
                        )}
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
                            <>
                              <button
                                onClick={() => openEditIngredientsModal(ord)}
                                title="Edit batch ingredients (adjust quantities or add extra ingredients)"
                                className="px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-900 hover:bg-amber-500/20 text-[10px] font-bold flex items-center gap-1 transition-colors"
                              >
                                <Sliders className="w-3 h-3 text-amber-700" />
                                <span>Edit Ingredients</span>
                              </button>
                              <button
                                onClick={() => handleCompleteOrder(ord)}
                                className="px-2.5 py-1 rounded-lg bg-status-green text-white text-[10px] font-bold hover:bg-status-green/90 shadow-xs"
                              >
                                Confirm &amp; Deduct
                              </button>
                            </>
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold text-bakery-chocolate">
                      Batches Count *
                    </label>
                    <span className="text-[10px] text-bakery-muted font-normal">
                      Quick select or type
                    </span>
                  </div>

                  {/* Stepper + Input */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const cur = Math.max(1, (parseFloat(batchesCountInput) || 1) - 1);
                        setBatchesCountInput(String(cur));
                      }}
                      className="w-8 h-8 rounded-lg bg-bakery-cream hover:bg-bakery-beige border border-bakery-beige text-bakery-chocolate font-bold flex items-center justify-center shrink-0 active:scale-95"
                      title="Decrease batch count"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={batchesCountInput}
                      onChange={handleBatchInputChange}
                      onBlur={handleBatchInputBlur}
                      onFocus={(e) => e.target.select()}
                      placeholder="1"
                      className="w-full text-center px-2 py-1.5 rounded-lg bg-white border border-bakery-beige text-xs font-bold text-bakery-chocolate focus:outline-hidden focus:border-bakery-caramel focus:ring-1 focus:ring-bakery-caramel"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const cur = (parseFloat(batchesCountInput) || 0) + 1;
                        setBatchesCountInput(String(cur));
                      }}
                      className="w-8 h-8 rounded-lg bg-bakery-cream hover:bg-bakery-beige border border-bakery-beige text-bakery-chocolate font-bold flex items-center justify-center shrink-0 active:scale-95"
                      title="Increase batch count"
                    >
                      +
                    </button>
                  </div>

                  {/* Quick instant batch preset pills */}
                  <div className="grid grid-cols-6 gap-1 mt-2">
                    {[1, 2, 3, 4, 5, 10].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setBatchesCountInput(String(num))}
                        className={`py-1 rounded-md text-[11px] font-bold border transition-all ${
                          parseFloat(batchesCountInput) === num
                            ? 'bg-bakery-chocolate text-white border-bakery-chocolate shadow-xs'
                            : 'bg-white text-bakery-chocolate border-bakery-beige hover:bg-bakery-cream'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>

                  {/* Phone size number dropdown */}
                  <div className="mt-2 block sm:hidden">
                    <select
                      value={[1, 2, 3, 4, 5, 10].includes(Number(batchesCountInput)) ? batchesCountInput : 'custom'}
                      onChange={(e) => {
                        if (e.target.value !== 'custom') {
                          setBatchesCountInput(e.target.value);
                        }
                      }}
                      className="w-full px-2 py-1 rounded-lg bg-white border border-bakery-beige text-xs font-semibold text-bakery-chocolate"
                    >
                      <option value="1">1 Batch</option>
                      <option value="2">2 Batches</option>
                      <option value="3">3 Batches</option>
                      <option value="4">4 Batches</option>
                      <option value="5">5 Batches</option>
                      <option value="10">10 Batches</option>
                      <option value="custom">Custom count...</option>
                    </select>
                  </div>
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

              {/* Section 4 & 5: Flexible Production & Editable Ingredients Accordion */}
              <div className="rounded-2xl border border-bakery-beige bg-white/70 overflow-hidden shadow-2xs">
                <div
                  onClick={() => setIsCustomizing(!isCustomizing)}
                  className="p-3 bg-bakery-cream/80 border-b border-bakery-beige flex items-center justify-between cursor-pointer hover:bg-bakery-cream transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-bakery-caramel" />
                    <div>
                      <span className="font-bold text-xs text-bakery-chocolate block">
                        Customize Ingredients for this Batch (Optional)
                      </span>
                      <span className="text-[10px] text-bakery-muted">
                        Adjust quantities or add extra ingredients without changing the standard recipe.
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-bakery-caramel">
                    {isCustomizing ? 'Hide Customizer ▲' : 'Customize Ingredients ▼'}
                  </span>
                </div>

                {isCustomizing && (
                  <div className="p-4 space-y-4 bg-white animate-fade-in text-xs">
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-900 flex items-start gap-2">
                      <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <span>
                        <strong>Recipe Preservation Guarantee:</strong> Adjustments made here apply <em>only</em> to this production run. The original master recipe in Recipe Management will stay completely untouched.
                      </span>
                    </div>

                    {/* Table of Custom Ingredients */}
                    <div className="rounded-xl border border-bakery-beige overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-bakery-cream text-[10px] uppercase font-bold text-bakery-muted border-b border-bakery-beige">
                          <tr>
                            <th className="p-2">Ingredient</th>
                            <th className="p-2 text-right">Standard Qty</th>
                            <th className="p-2 text-right">Batch Custom Qty</th>
                            <th className="p-2 text-right">Est. Cost (₱)</th>
                            <th className="p-2 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-bakery-beige/60">
                          {customIngredients.map((item, idx) => (
                            <tr key={`${item.ingredient_id}-${idx}`} className="hover:bg-bakery-cream/30">
                              <td className="p-2 font-semibold text-bakery-chocolate">
                                {item.ingredient_name}
                                {item.is_additional && (
                                  <span className="ml-1.5 text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-bakery-caramel text-white">
                                    Extra
                                  </span>
                                )}
                              </td>
                              <td className="p-2 text-right text-bakery-muted">
                                {item.base_qty} {item.unit}
                              </td>
                              <td className="p-2 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={item.custom_qty}
                                    onChange={(e) => handleUpdateCustomQty(idx, e.target.value)}
                                    className="w-20 px-2 py-1 rounded-lg border border-bakery-beige text-right text-xs font-bold focus:outline-hidden focus:border-bakery-caramel"
                                  />
                                  <span className="text-[10px] text-bakery-muted">{item.unit}</span>
                                </div>
                              </td>
                              <td className="p-2 text-right font-bold text-bakery-chocolate">
                                ₱{(Number(item.custom_qty) * Number(item.cost_per_unit)).toFixed(2)}
                              </td>
                              <td className="p-2 text-center">
                                {item.is_additional ? (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveCustomIngredient(idx)}
                                    className="text-red-600 hover:text-red-800 p-1 font-bold"
                                    title="Remove extra ingredient"
                                  >
                                    ✕
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-bakery-muted">—</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Add Extra Ingredient Toolbar */}
                    <div className="p-3 rounded-xl bg-bakery-cream/60 border border-bakery-beige space-y-2">
                      <span className="text-[11px] font-bold text-bakery-chocolate block">
                        + Add Extra Raw Ingredient from Inventory
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={selectedExtraId}
                          onChange={(e) => setSelectedExtraId(e.target.value ? Number(e.target.value) : '')}
                          className="px-3 py-1.5 rounded-xl bg-white border border-bakery-beige text-xs flex-1 min-w-[180px] focus:outline-hidden"
                        >
                          <option value="">Select ingredient (e.g. Choc Chips, Sprinkles)...</option>
                          {allIngredients.map((ing) => (
                            <option key={ing.id} value={ing.id}>
                              {ing.name} ({ing.unit}) — ₱{Number(ing.cost_per_unit || 0).toFixed(2)}/{ing.unit}
                            </option>
                          ))}
                        </select>

                        <input
                          type="number"
                          step="0.01"
                          placeholder="Quantity"
                          value={extraQuantity}
                          onChange={(e) => setExtraQuantity(e.target.value)}
                          className="w-24 px-3 py-1.5 rounded-xl bg-white border border-bakery-beige text-xs focus:outline-hidden"
                        />

                        <button
                          type="button"
                          onClick={handleAddExtraIngredient}
                          className="px-3.5 py-1.5 rounded-xl bg-bakery-chocolate text-white text-xs font-bold hover:bg-[#2c1108] transition-colors flex items-center gap-1"
                        >
                          <PlusCircle className="w-3.5 h-3.5 text-bakery-caramel" />
                          <span>Add to Batch</span>
                        </button>
                      </div>
                    </div>

                    {/* Reason for adjustment */}
                    <div>
                      <label className="block font-semibold text-bakery-chocolate mb-1">
                        Adjustment Reason / Customer Request Notes
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Customer requested 50g extra chocolate chips for birthday order"
                        value={adjustmentReason}
                        onChange={(e) => setAdjustmentReason(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige text-xs text-bakery-chocolate focus:outline-hidden"
                      />
                    </div>
                  </div>
                )}
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
                    <span className="text-[10px] text-bakery-muted uppercase block">
                      {isCustomizing ? 'Custom Ingr. Cost' : 'Ingredient Cost'}
                    </span>
                    <span className="font-display font-bold text-sm text-bakery-chocolate">
                      ₱{(isCustomizing ? calculatedCustomCost : stockCheckResult.estimated_ingredient_cost)?.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-bakery-muted uppercase block">
                      {isCustomizing ? 'Adjusted Batch Cost' : 'Total Batch Cost'}
                    </span>
                    <span className="font-display font-bold text-sm text-bakery-chocolate">
                      ₱{totalAdjustedBatchCost.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-bakery-muted uppercase block">Cost / Unit</span>
                    <span className="font-display font-bold text-sm text-bakery-caramel">
                      ₱{(isCustomizing ? adjustedCostPerUnit : stockCheckResult.estimated_cost_per_unit)?.toFixed(2)}
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
                  disabled={submitting || (!isCustomizing && !stockCheckResult?.is_sufficient)}
                  className="px-4 py-2 rounded-xl bg-bakery-chocolate text-white font-semibold hover:bg-[#2c1108] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-bakery-cream" />
                  <span>Confirm &amp; Deduct Stock</span>
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

      {/* Edit Batch Ingredients Modal */}
      {editingIngredientsOrder && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-bakery-ivory rounded-2xl border border-bakery-beige p-6 shadow-2xl animate-in fade-in zoom-in-95 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-bakery-beige">
              <div>
                <h3 className="font-display font-bold text-lg text-bakery-chocolate flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-bakery-caramel" />
                  <span>Edit Batch Ingredients</span>
                </h3>
                <p className="text-xs text-bakery-muted mt-0.5">
                  Batch: <strong className="text-bakery-chocolate">{editingIngredientsOrder.production_number}</strong> &bull; {editingIngredientsOrder.product_name} ({editingIngredientsOrder.variant_name}) &bull; {editingIngredientsOrder.batches_count} batch(es)
                </p>
              </div>
              <button
                onClick={() => setEditingIngredientsOrder(null)}
                className="p-1 rounded-lg text-bakery-muted hover:text-bakery-chocolate text-base"
              >
                &times;
              </button>
            </div>

            <div className="space-y-4 py-4 text-xs">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>
                  <strong>Flexible Batch Customization:</strong> Adjust ingredient quantities or add extra supplies (e.g. extra chocolate chips, almonds, flavors). These changes update this batch's cost and stock deduction without altering the master recipe.
                </span>
              </div>

              {/* Ingredients Table */}
              <div className="rounded-xl border border-bakery-beige overflow-hidden bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="bg-bakery-cream text-[11px] font-bold text-bakery-chocolate border-b border-bakery-beige">
                    <tr>
                      <th className="py-2.5 px-3">Ingredient</th>
                      <th className="py-2.5 px-3 text-right">Batch Qty</th>
                      <th className="py-2.5 px-3">Unit</th>
                      <th className="py-2.5 px-3 text-right">Cost/Unit</th>
                      <th className="py-2.5 px-3 text-right">Total (₱)</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-bakery-beige/60">
                    {editingIngredientsList.map((item, idx) => {
                      const itemTotal = Number(item.quantity || 0) * Number(item.unit_cost || 0);
                      return (
                        <tr key={idx} className="hover:bg-bakery-cream/30">
                          <td className="py-2 px-3 font-semibold text-bakery-chocolate">
                            {item.ingredient_name}
                            {item.is_additional && (
                              <span className="ml-1.5 px-1.5 py-0.5 text-[9px] font-bold rounded bg-amber-100 text-amber-800 border border-amber-300">
                                Extra
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <input
                              type="number"
                              step="any"
                              min="0"
                              value={item.quantity}
                              onChange={(e) => handleUpdateEditingQty(idx, e.target.value)}
                              className="w-20 px-2 py-1 text-right rounded-lg border border-bakery-beige font-bold text-bakery-chocolate focus:border-bakery-caramel focus:outline-hidden"
                            />
                          </td>
                          <td className="py-2 px-3 text-bakery-muted font-medium">
                            {item.unit}
                          </td>
                          <td className="py-2 px-3 text-right text-bakery-muted">
                            ₱{Number(item.unit_cost || 0).toFixed(2)}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-bakery-chocolate">
                            ₱{itemTotal.toFixed(2)}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveEditingIngredient(idx)}
                              title="Remove from batch"
                              className="p-1 rounded-md text-status-red hover:bg-status-redLight transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Add Extra Ingredient Line */}
              <div className="p-3 rounded-xl bg-bakery-cream/50 border border-bakery-beige space-y-2">
                <span className="font-bold text-bakery-chocolate block">
                  + Add Extra Ingredient to Batch
                </span>
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <select
                    value={editingSelectedExtraId}
                    onChange={(e) => setEditingSelectedExtraId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full sm:flex-1 px-3 py-1.5 rounded-xl bg-white border border-bakery-beige text-xs focus:outline-hidden"
                  >
                    <option value="">-- Choose ingredient from pantry --</option>
                    {allIngredients.map((ing) => (
                      <option key={ing.id} value={ing.id}>
                        {ing.name} ({ing.unit}) — Stock: {ing.current_stock}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="any"
                    placeholder="Qty"
                    value={editingExtraQty}
                    onChange={(e) => setEditingExtraQty(e.target.value)}
                    className="w-full sm:w-24 px-3 py-1.5 rounded-xl bg-white border border-bakery-beige text-xs font-bold text-bakery-chocolate focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={handleAddEditingExtra}
                    className="w-full sm:w-auto px-4 py-1.5 rounded-xl bg-bakery-chocolate text-white font-semibold hover:bg-[#2c1108] shrink-0"
                  >
                    Add to Batch
                  </button>
                </div>
              </div>

              {/* Reason for adjustment */}
              <div>
                <label className="block font-semibold text-bakery-chocolate mb-1">
                  Reason for Batch Customization
                </label>
                <input
                  type="text"
                  value={editingAdjustmentReason}
                  onChange={(e) => setEditingAdjustmentReason(e.target.value)}
                  placeholder="e.g. Added 50g extra chocolate chips per customer request"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige focus:outline-hidden"
                />
              </div>

              {/* Cost Summary */}
              <div className="p-3 rounded-xl bg-bakery-cream border border-bakery-beige flex items-center justify-between">
                <div>
                  <span className="text-bakery-muted text-[11px] block">Calculated Batch Cost:</span>
                  <span className="font-display font-bold text-base text-bakery-chocolate">
                    ₱{editingIngredientsList.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.unit_cost || 0)), 0).toFixed(2)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-bakery-muted text-[11px] block">Total Ingredients:</span>
                  <span className="font-bold text-bakery-caramel">
                    {editingIngredientsList.length} items
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-bakery-beige">
                <button
                  type="button"
                  onClick={() => setEditingIngredientsOrder(null)}
                  className="px-4 py-2 rounded-xl border border-bakery-beige text-bakery-chocolate hover:bg-bakery-cream font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveIngredientsEdit}
                  disabled={savingIngredientsEdit}
                  className="px-5 py-2 rounded-xl bg-bakery-chocolate text-white font-semibold hover:bg-[#2c1108] disabled:opacity-50 shadow-warm-sm"
                >
                  {savingIngredientsEdit ? 'Saving Batch...' : 'Save Batch Ingredients'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
