import React, { useEffect, useState } from 'react';
import {
  Calculator,
  Plus,
  Copy,
  Edit2,
  Trash2,
  Sparkles,
  TrendingUp,
  Percent,
  Layers,
  ChevronRight,
  Info,
  DollarSign
} from 'lucide-react';
import { api } from '../services/api';
import { Recipe, Ingredient, ProductVariant, PackagingItem } from '../types';

export const CostingPage: React.FC = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [packagings, setPackagings] = useState<PackagingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  // Edit / Create Recipe Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecipeId, setEditingRecipeId] = useState<number | null>(null);

  // Duplicate Modal
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [targetVariantId, setTargetVariantId] = useState<string>('');

  // Form State
  const [formVariantId, setFormVariantId] = useState<string>('');
  const [formName, setFormName] = useState<string>('');
  const [formBatchYield, setFormBatchYield] = useState<number>(6);
  const [formBatchSizeDesc, setFormBatchSizeDesc] = useState<string>('');
  const [formPackagingCost, setFormPackagingCost] = useState<string>('10.18');
  const [formElectricityCost, setFormElectricityCost] = useState<string>('70.00');
  const [formLaborCost, setFormLaborCost] = useState<string>('50.00');
  const [formShippingCost, setFormShippingCost] = useState<string>('0.00');
  const [formNotes, setFormNotes] = useState<string>('');

  // Recipe ingredients editor state: Array of { ingredient: id, quantity_used: number, unit: 'g' }
  const [formIngredients, setFormIngredients] = useState<
    Array<{ ingredient: number; quantity_used: number; unit: string }>
  >([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [recs, vars, ings, pkgs] = await Promise.all([
        api.getRecipes(),
        api.getVariants(),
        api.getIngredients(),
        api.getPackagingItems(),
      ]);
      setRecipes(recs);
      setVariants(vars);
      setIngredients(ings);
      setPackagings(pkgs);

      if (recs.length > 0) {
        setSelectedRecipe(recs[0]);
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

  const openCreateModal = () => {
    setEditingRecipeId(null);
    setFormVariantId(variants.length > 0 ? String(variants[0].id) : '');
    setFormName('');
    setFormBatchYield(6);
    setFormBatchSizeDesc('');
    setFormPackagingCost('10.00');
    setFormElectricityCost('70.00');
    setFormLaborCost('50.00');
    setFormShippingCost('0.00');
    setFormNotes('');
    setFormIngredients(
      ingredients.slice(0, 3).map((i) => ({ ingredient: i.id, quantity_used: 100, unit: i.unit }))
    );
    setIsModalOpen(true);
  };

  const openEditModal = (recipe: Recipe) => {
    setEditingRecipeId(recipe.id);
    setFormVariantId(String(recipe.product_variant));
    setFormName(recipe.name);
    setFormBatchYield(recipe.batch_yield);
    setFormBatchSizeDesc(recipe.batch_size_desc || '');
    setFormPackagingCost(String(recipe.packaging_cost));
    setFormElectricityCost(String(recipe.electricity_cost));
    setFormLaborCost(String(recipe.labor_cost));
    setFormShippingCost(String(recipe.shipping_cost));
    setFormNotes(recipe.notes || '');
    setFormIngredients(
      recipe.recipe_ingredients.map((ri) => ({
        ingredient: ri.ingredient,
        quantity_used: Number(ri.quantity_used),
        unit: ri.unit,
      }))
    );
    setIsModalOpen(true);
  };

  const handleAddIngredientRow = () => {
    if (ingredients.length > 0) {
      setFormIngredients([
        ...formIngredients,
        { ingredient: ingredients[0].id, quantity_used: 10, unit: ingredients[0].unit },
      ]);
    }
  };

  const handleRemoveIngredientRow = (index: number) => {
    setFormIngredients(formIngredients.filter((_, i) => i !== index));
  };

  const handleIngredientChange = (index: number, field: string, value: any) => {
    const updated = [...formIngredients];
    if (field === 'ingredient') {
      const found = ingredients.find((i) => i.id === Number(value));
      updated[index] = {
        ...updated[index],
        ingredient: Number(value),
        unit: found ? found.unit : 'g',
      };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setFormIngredients(updated);
  };

  const handleSaveRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        product_variant: Number(formVariantId),
        name: formName || `Recipe for Variant #${formVariantId}`,
        batch_yield: Number(formBatchYield),
        batch_size_desc: formBatchSizeDesc,
        packaging_cost: parseFloat(formPackagingCost) || 0,
        electricity_cost: parseFloat(formElectricityCost) || 0,
        labor_cost: parseFloat(formLaborCost) || 0,
        shipping_cost: parseFloat(formShippingCost) || 0,
        notes: formNotes,
        recipe_ingredients: formIngredients.map((fi) => ({
          ingredient: fi.ingredient,
          quantity_used: Number(fi.quantity_used),
          unit: fi.unit,
        })),
      };

      if (editingRecipeId) {
        await api.updateRecipe(editingRecipeId, payload);
      } else {
        await api.createRecipe(payload);
      }
      setIsModalOpen(false);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Error saving recipe');
    }
  };

  const handleDuplicate = async () => {
    if (!selectedRecipe || !targetVariantId) return;
    try {
      await api.duplicateRecipe(selectedRecipe.id, Number(targetVariantId));
      setDuplicateModalOpen(false);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to duplicate recipe');
    }
  };

  // Live calculator for recipe modal
  const computedModalIngCost = formIngredients.reduce((sum, item) => {
    const ing = ingredients.find((i) => i.id === item.ingredient);
    const unitCost = ing ? Number(ing.cost_per_unit) : 0;
    return sum + unitCost * Number(item.quantity_used || 0);
  }, 0);

  const computedModalOverhead =
    (parseFloat(formPackagingCost) || 0) +
    (parseFloat(formElectricityCost) || 0) +
    (parseFloat(formLaborCost) || 0) +
    (parseFloat(formShippingCost) || 0);

  const computedModalBatchCost = computedModalIngCost + computedModalOverhead;
  const computedModalUnitCost = computedModalBatchCost / Math.max(1, formBatchYield);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-bakery-ivory border border-bakery-beige shadow-warm-sm">
        <div>
          <h1 className="font-display font-bold text-2xl text-bakery-chocolate">
            Recipe & Product Costing
          </h1>
          <p className="text-xs text-bakery-muted mt-0.5">
            Automated ingredient costing linked directly with inventory purchase rates &bull; Yields & profit margins
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-bakery-chocolate text-white text-xs font-semibold hover:bg-[#2c1108] shadow-warm-sm transition-transform active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Recipe</span>
        </button>
      </div>

      {/* Main Layout: Left Recipe Selector, Right Detailed Costing breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Recipe Selector List (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-bakery-chocolate uppercase tracking-wider">
              Product Recipes ({recipes.length})
            </span>
          </div>

          <div className="space-y-2.5">
            {recipes.map((r) => {
              const isSelected = selectedRecipe?.id === r.id;
              const margin = Number(r.profit_margin_percentage);

              return (
                <div
                  key={r.id}
                  onClick={() => setSelectedRecipe(r)}
                  className={`
                    p-4 rounded-xl border transition-all cursor-pointer text-left
                    ${isSelected
                      ? 'bg-bakery-cream border-bakery-caramel shadow-warm-sm ring-1 ring-bakery-caramel/50'
                      : 'bg-bakery-ivory border-bakery-beige hover:border-bakery-caramel/60 hover:bg-bakery-cream/30'
                    }
                  `}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-display font-bold text-sm text-bakery-chocolate leading-tight">
                        {r.name}
                      </p>
                      <p className="text-[11px] text-bakery-muted mt-0.5">
                        Yield: {r.batch_yield} units {r.batch_size_desc ? `(${r.batch_size_desc})` : ''}
                      </p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${margin >= 30 ? 'bg-status-greenLight text-status-green' : 'bg-status-orangeLight text-status-orange'}`}>
                      {margin.toFixed(1)}% margin
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-bakery-beige/60 text-xs">
                    <div>
                      <span className="text-[10px] text-bakery-muted block">Cost / Unit</span>
                      <span className="font-bold text-bakery-chocolate">
                        ₱{Number(r.calculated_cost_per_unit).toFixed(2)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-bakery-muted block">Selling Price</span>
                      <span className="font-display font-bold text-bakery-caramel text-sm">
                        ₱{Number(r.selling_price).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Recipe Detail & Cost Sheet (8 cols) */}
        <div className="lg:col-span-8">
          {selectedRecipe ? (
            <div className="p-6 rounded-2xl bg-bakery-ivory border border-bakery-beige shadow-warm-sm space-y-6">
              {/* Recipe Top Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-bakery-beige">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-bakery-caramel/20 text-bakery-caramel">
                      {selectedRecipe.category_name || 'Bakery Item'}
                    </span>
                    <span className="text-xs text-bakery-muted">
                      Yield: <strong className="text-bakery-chocolate">{selectedRecipe.batch_yield} units</strong>
                    </span>
                  </div>
                  <h2 className="font-display font-bold text-xl sm:text-2xl text-bakery-chocolate mt-1">
                    {selectedRecipe.name}
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setTargetVariantId('');
                      setDuplicateModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-bakery-cream border border-bakery-beige text-xs font-semibold text-bakery-chocolate hover:bg-bakery-beige transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5 text-bakery-caramel" />
                    <span>Duplicate</span>
                  </button>
                  <button
                    onClick={() => openEditModal(selectedRecipe)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-bakery-chocolate text-white text-xs font-semibold hover:bg-[#2c1108] transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Recipe</span>
                  </button>
                </div>
              </div>

              {/* Ingredients Breakdown Table */}
              <div>
                <h3 className="font-display font-bold text-base text-bakery-chocolate mb-3">
                  Recipe Ingredients (Per Batch)
                </h3>
                <div className="rounded-xl border border-bakery-beige overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-bakery-cream text-bakery-chocolate font-bold border-b border-bakery-beige">
                        <th className="py-2.5 px-3">Ingredient</th>
                        <th className="py-2.5 px-3 text-right">Quantity Used</th>
                        <th className="py-2.5 px-3 text-right">Unit Cost (₱)</th>
                        <th className="py-2.5 px-3 text-right">Total Line Cost (₱)</th>
                        <th className="py-2.5 px-3 text-center">In Stock?</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-bakery-beige/60">
                      {selectedRecipe.recipe_ingredients.map((ri) => (
                        <tr key={ri.id} className="hover:bg-bakery-cream/30">
                          <td className="py-2.5 px-3 font-semibold text-bakery-chocolate">
                            {ri.ingredient_name}
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium">
                            {Number(ri.quantity_used).toLocaleString()} {ri.unit}
                          </td>
                          <td className="py-2.5 px-3 text-right text-bakery-muted font-medium">
                            ₱{Number(ri.cost_per_unit).toFixed(4)} /{ri.unit}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-bakery-chocolate">
                            ₱{Number(ri.ingredient_cost).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ri.ingredient_stock_status === 'NORMAL' ? 'bg-status-greenLight text-status-green' : 'bg-status-orangeLight text-status-orange'}`}>
                              {ri.ingredient_current_stock} {ri.unit}
                            </span>
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-bakery-cream/80 font-bold text-bakery-chocolate">
                        <td colSpan={3} className="py-2.5 px-3 text-right uppercase text-[11px] tracking-wide">
                          Total Ingredient Cost / Batch:
                        </td>
                        <td className="py-2.5 px-3 text-right font-display text-sm text-bakery-caramel">
                          ₱{Number(selectedRecipe.total_ingredient_cost).toFixed(2)}
                        </td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Overheads & Production Cost Calculation Card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Additional Overheads per Batch */}
                <div className="p-4 rounded-xl bg-bakery-cream border border-bakery-beige space-y-2 text-xs">
                  <h4 className="font-bold text-bakery-chocolate uppercase text-[11px] tracking-wider mb-2">
                    Additional Costs per Batch
                  </h4>
                  <div className="flex justify-between py-1 border-b border-bakery-beige/60">
                    <span className="text-bakery-muted">Packaging Cost:</span>
                    <span className="font-semibold text-bakery-chocolate">
                      ₱{Number(selectedRecipe.calculated_packaging_cost).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-bakery-beige/60">
                    <span className="text-bakery-muted">Kuryente / Electricity:</span>
                    <span className="font-semibold text-bakery-chocolate">
                      ₱{Number(selectedRecipe.electricity_cost).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-bakery-beige/60">
                    <span className="text-bakery-muted">Other / Labor Overhead:</span>
                    <span className="font-semibold text-bakery-chocolate">
                      ₱{Number(selectedRecipe.labor_cost).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-bakery-beige/60">
                    <span className="text-bakery-muted">Shipping Fee:</span>
                    <span className="font-semibold text-bakery-chocolate">
                      ₱{Number(selectedRecipe.shipping_cost).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1 font-bold text-bakery-chocolate">
                    <span>Total Overhead / Batch:</span>
                    <span>₱{Number(selectedRecipe.total_overhead_cost).toFixed(2)}</span>
                  </div>
                </div>

                {/* Final Unit Cost & Profitability Summary */}
                <div className="p-4 rounded-xl bg-bakery-chocolate text-white space-y-2 text-xs flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold uppercase text-[11px] tracking-wider text-bakery-cream mb-2">
                      Pricing & Profit Summary
                    </h4>
                    <div className="flex justify-between py-1 border-b border-white/10 text-bakery-cream/90">
                      <span>Total Batch Cost:</span>
                      <span className="font-semibold">₱{Number(selectedRecipe.total_batch_cost).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-white/10 text-bakery-cream/90">
                      <span>Batch Yield:</span>
                      <span className="font-semibold">{selectedRecipe.batch_yield} units</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-white/10 text-bakery-cream/90">
                      <span>Cost per Unit:</span>
                      <span className="font-bold text-white text-sm">
                        ₱{Number(selectedRecipe.calculated_cost_per_unit).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-white/10 text-bakery-cream/90">
                      <span>Actual Selling Price:</span>
                      <span className="font-display font-bold text-white text-base">
                        ₱{Number(selectedRecipe.selling_price).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white/10 flex items-center justify-between mt-2">
                    <div>
                      <span className="text-[10px] text-bakery-cream uppercase block">Profit / Unit</span>
                      <span className="font-display font-bold text-sm text-bakery-cream">
                        ₱{Number(selectedRecipe.profit_per_unit).toFixed(2)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-bakery-cream uppercase block">Profit Margin</span>
                      <span className="font-display font-bold text-base text-status-greenLight">
                        {selectedRecipe.profit_margin_percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 rounded-2xl bg-bakery-ivory border border-bakery-beige text-center text-xs text-bakery-muted">
              Select a recipe to view details or click &ldquo;Create New Recipe&rdquo;.
            </div>
          )}
        </div>
      </div>

      {/* Edit / Create Recipe Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-bakery-ivory rounded-2xl border border-bakery-beige p-6 shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <h3 className="font-display font-bold text-lg text-bakery-chocolate mb-1">
              {editingRecipeId ? 'Edit Recipe & Costing Formula' : 'Create New Product Recipe'}
            </h3>
            <p className="text-xs text-bakery-muted mb-4">
              Specify required ingredient quantities and overhead costs per batch.
            </p>

            <form onSubmit={handleSaveRecipe} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-bakery-chocolate mb-1">
                    Product Variant *
                  </label>
                  <select
                    disabled={!!editingRecipeId}
                    value={formVariantId}
                    onChange={(e) => setFormVariantId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige focus:outline-hidden focus:border-bakery-caramel disabled:bg-gray-100"
                  >
                    {variants.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.product_name} — {v.name} (₱{Number(v.selling_price).toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-bakery-chocolate mb-1">
                    Recipe Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Banana Cake — Small (120g)"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige focus:outline-hidden focus:border-bakery-caramel"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-bakery-chocolate mb-1">
                    Batch Yield (units produced per batch) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formBatchYield}
                    onChange={(e) => setFormBatchYield(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige focus:outline-hidden focus:border-bakery-caramel"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-bakery-chocolate mb-1">
                    Batch Size / Weight Description
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 120 grams, 400 gms, box of 6"
                    value={formBatchSizeDesc}
                    onChange={(e) => setFormBatchSizeDesc(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige focus:outline-hidden focus:border-bakery-caramel"
                  />
                </div>
              </div>

              {/* Ingredients List Builder */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="font-bold text-bakery-chocolate">
                    Recipe Ingredients
                  </label>
                  <button
                    type="button"
                    onClick={handleAddIngredientRow}
                    className="text-xs font-semibold text-bakery-caramel hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Ingredient
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {formIngredients.map((item, idx) => {
                    const ing = ingredients.find((i) => i.id === item.ingredient);
                    const lineCost = ing ? Number(ing.cost_per_unit) * item.quantity_used : 0;

                    return (
                      <div key={idx} className="flex items-center gap-2 p-2 rounded-xl bg-white border border-bakery-beige">
                        <select
                          value={item.ingredient}
                          onChange={(e) => handleIngredientChange(idx, 'ingredient', e.target.value)}
                          className="flex-1 px-2 py-1.5 rounded-lg border border-bakery-beige text-xs"
                        >
                          {ingredients.map((i) => (
                            <option key={i.id} value={i.id}>
                              {i.name} (₱{Number(i.cost_per_unit).toFixed(4)}/{i.unit})
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          step="any"
                          min="0.1"
                          placeholder="Qty"
                          value={item.quantity_used}
                          onChange={(e) => handleIngredientChange(idx, 'quantity_used', parseFloat(e.target.value) || 0)}
                          className="w-24 px-2 py-1.5 rounded-lg border border-bakery-beige text-xs font-semibold"
                        />
                        <span className="text-bakery-muted w-10 text-center">{item.unit}</span>
                        <span className="w-20 text-right font-bold text-bakery-chocolate">
                          ₱{lineCost.toFixed(2)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveIngredientRow(idx)}
                          className="p-1 text-status-red hover:bg-status-redLight rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Overheads Section */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-bakery-beige">
                <div>
                  <label className="block text-[11px] font-semibold text-bakery-chocolate mb-1">
                    Packaging (₱)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formPackagingCost}
                    onChange={(e) => setFormPackagingCost(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-bakery-beige"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-bakery-chocolate mb-1">
                    Kuryente (₱)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formElectricityCost}
                    onChange={(e) => setFormElectricityCost(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-bakery-beige"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-bakery-chocolate mb-1">
                    Labor / Other (₱)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formLaborCost}
                    onChange={(e) => setFormLaborCost(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-bakery-beige"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-bakery-chocolate mb-1">
                    Shipping (₱)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formShippingCost}
                    onChange={(e) => setFormShippingCost(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-bakery-beige"
                  />
                </div>
              </div>

              {/* Live Cost Preview */}
              <div className="p-3 rounded-xl bg-bakery-cream border border-bakery-beige flex items-center justify-between font-semibold">
                <div>
                  <span className="text-bakery-muted block text-[10px]">Total Batch Cost</span>
                  <span className="text-sm font-bold text-bakery-chocolate">₱{computedModalBatchCost.toFixed(2)}</span>
                </div>
                <div className="text-right">
                  <span className="text-bakery-muted block text-[10px]">Calculated Cost / Unit</span>
                  <span className="text-sm font-display font-bold text-bakery-caramel">₱{computedModalUnitCost.toFixed(2)}</span>
                </div>
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
                  {editingRecipeId ? 'Update Recipe' : 'Create Recipe'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Duplicate Recipe Modal */}
      {duplicateModalOpen && selectedRecipe && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-bakery-ivory rounded-2xl border border-bakery-beige p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <h3 className="font-display font-bold text-lg text-bakery-chocolate mb-1">
              Duplicate Recipe
            </h3>
            <p className="text-xs text-bakery-muted mb-4">
              Duplicate <strong className="text-bakery-chocolate">{selectedRecipe.name}</strong> to a different product variant.
            </p>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-bakery-chocolate mb-1">
                  Target Product Variant
                </label>
                <select
                  value={targetVariantId}
                  onChange={(e) => setTargetVariantId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige focus:outline-hidden focus:border-bakery-caramel"
                >
                  <option value="">Select Target Variant</option>
                  {variants
                    .filter((v) => v.id !== selectedRecipe.product_variant)
                    .map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.product_name} — {v.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-bakery-beige">
                <button
                  type="button"
                  onClick={() => setDuplicateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-bakery-beige text-bakery-muted hover:bg-bakery-cream"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!targetVariantId}
                  onClick={handleDuplicate}
                  className="px-4 py-2 rounded-xl bg-bakery-chocolate text-white font-semibold hover:bg-[#2c1108] disabled:opacity-50"
                >
                  Confirm Duplicate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

