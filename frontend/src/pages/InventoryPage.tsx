import React, { useEffect, useState } from 'react';
import {
  Boxes,
  Search,
  Filter,
  AlertTriangle,
  History,
  Edit3,
  PlusCircle,
  Truck,
  ArrowUpDown,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';
import { Ingredient, StockTransaction } from '../types';

export const InventoryPage: React.FC = () => {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'LOW' | 'OUT_OF_STOCK' | 'NORMAL'>('ALL');

  // Modals state
  const [adjustItem, setAdjustItem] = useState<Ingredient | null>(null);
  const [newStockVal, setNewStockVal] = useState<string>('');
  const [adjustReason, setAdjustReason] = useState<string>('Physical count reconciliation');
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);

  const [historyItem, setHistoryItem] = useState<Ingredient | null>(null);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [showRestockModal, setShowRestockModal] = useState(false);
  const [restockList, setRestockList] = useState<any[]>([]);

  const fetchIngredients = async () => {
    try {
      setLoading(true);
      const data = await api.getIngredients();
      setIngredients(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIngredients();
  }, []);

  const openAdjustModal = (ing: Ingredient) => {
    setAdjustItem(ing);
    setNewStockVal(String(ing.current_stock));
    setAdjustReason('Physical inventory audit');
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustItem) return;
    try {
      setAdjustSubmitting(true);
      await api.adjustStock(adjustItem.id, Number(newStockVal), adjustReason);
      setAdjustItem(null);
      await fetchIngredients();
    } catch (err: any) {
      alert(err.message || 'Failed to adjust stock');
    } finally {
      setAdjustSubmitting(false);
    }
  };

  const openHistoryModal = async (ing: Ingredient) => {
    setHistoryItem(ing);
    setHistoryLoading(true);
    try {
      const data = await api.getStockTransactions(ing.id);
      setTransactions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const openRestockListModal = async () => {
    setShowRestockModal(true);
    try {
      const list = await api.getRestockingList();
      setRestockList(list);
    } catch (err) {
      console.error(err);
    }
  };

  // Filtered ingredients
  const filtered = ingredients.filter((ing) => {
    const matchesSearch = ing.name.toLowerCase().includes(search.toLowerCase()) ||
      (ing.supplier_name || '').toLowerCase().includes(search.toLowerCase());
    if (statusFilter === 'ALL') return matchesSearch;
    return matchesSearch && ing.stock_status === statusFilter;
  });

  const lowStockCount = ingredients.filter((i) => i.stock_status === 'LOW').length;
  const outOfStockCount = ingredients.filter((i) => i.stock_status === 'OUT_OF_STOCK').length;

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-bakery-ivory border border-bakery-beige shadow-warm-sm">
        <div>
          <h1 className="font-display font-bold text-2xl text-bakery-chocolate">
            Ingredient Inventory & Stock
          </h1>
          <p className="text-xs text-bakery-muted mt-0.5">
            Automatic deduction upon production confirmation &bull; Real-time reorder monitoring
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={openRestockListModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-status-orange text-white text-xs font-semibold shadow-xs hover:bg-status-orange/90 transition-colors"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Restock List ({lowStockCount + outOfStockCount})</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-bakery-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search ingredient or supplier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-bakery-ivory border border-bakery-beige text-xs text-bakery-espresso placeholder-bakery-muted focus:outline-hidden focus:border-bakery-caramel focus:ring-1 focus:ring-bakery-caramel transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              statusFilter === 'ALL'
                ? 'bg-bakery-chocolate text-white'
                : 'bg-bakery-ivory border border-bakery-beige text-bakery-espresso hover:bg-bakery-cream'
            }`}
          >
            All Items ({ingredients.length})
          </button>
          <button
            onClick={() => setStatusFilter('LOW')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              statusFilter === 'LOW'
                ? 'bg-status-orange text-white'
                : 'bg-bakery-ivory border border-bakery-beige text-status-orange hover:bg-status-orangeLight'
            }`}
          >
            Low Stock ({lowStockCount})
          </button>
          <button
            onClick={() => setStatusFilter('OUT_OF_STOCK')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              statusFilter === 'OUT_OF_STOCK'
                ? 'bg-status-red text-white'
                : 'bg-bakery-ivory border border-bakery-beige text-status-red hover:bg-status-redLight'
            }`}
          >
            Out of Stock ({outOfStockCount})
          </button>
          <button
            onClick={() => setStatusFilter('NORMAL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              statusFilter === 'NORMAL'
                ? 'bg-status-green text-white'
                : 'bg-bakery-ivory border border-bakery-beige text-status-green hover:bg-status-greenLight'
            }`}
          >
            Normal
          </button>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="rounded-2xl bg-bakery-ivory border border-bakery-beige shadow-warm-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-bakery-cream border-b border-bakery-beige text-bakery-chocolate font-bold">
                <th className="py-3 px-4">Ingredient</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4 text-right">Available Stock</th>
                <th className="py-3 px-4 text-right">Reorder Level</th>
                <th className="py-3 px-4 text-right">Cost / Unit (₱)</th>
                <th className="py-3 px-4 text-right">Stock Value (₱)</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bakery-beige/60">
              {filtered.length > 0 ? (
                filtered.map((ing) => {
                  const stockNum = Number(ing.current_stock);
                  const reorderNum = Number(ing.reorder_level);
                  let statusBadge = (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-status-greenLight text-status-green">
                      <CheckCircle2 className="w-3 h-3" /> Normal
                    </span>
                  );
                  if (ing.stock_status === 'OUT_OF_STOCK') {
                    statusBadge = (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-status-redLight text-status-red">
                        <XCircle className="w-3 h-3" /> Out of Stock
                      </span>
                    );
                  } else if (ing.stock_status === 'LOW') {
                    statusBadge = (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-status-orangeLight text-status-orange">
                        <AlertTriangle className="w-3 h-3" /> Low Stock
                      </span>
                    );
                  }

                  return (
                    <tr key={ing.id} className="hover:bg-bakery-cream/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-bakery-chocolate">
                        {ing.name}
                      </td>
                      <td className="py-3 px-4 text-bakery-muted">
                        {ing.supplier_name || ing.supplier_name_raw || 'Unassigned'}
                      </td>
                      <td className="py-3 px-4 text-right font-display font-bold text-bakery-chocolate">
                        {stockNum.toLocaleString()} <span className="font-sans text-[11px] font-normal text-bakery-muted">{ing.unit}</span>
                      </td>
                      <td className="py-3 px-4 text-right text-bakery-muted">
                        {reorderNum.toLocaleString()} {ing.unit}
                      </td>
                      <td className="py-3 px-4 text-right font-medium">
                        ₱{Number(ing.cost_per_unit).toFixed(4)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-bakery-chocolate">
                        ₱{Number(ing.stock_value).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {statusBadge}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openAdjustModal(ing)}
                            title="Adjust Stock"
                            className="p-1.5 rounded-lg bg-bakery-cream hover:bg-bakery-beige/80 text-bakery-chocolate transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openHistoryModal(ing)}
                            title="View Transaction History"
                            className="p-1.5 rounded-lg bg-bakery-cream hover:bg-bakery-beige/80 text-bakery-caramel transition-colors"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-bakery-muted">
                    No ingredients found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Stock Adjustment Modal */}
      {adjustItem && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-bakery-ivory rounded-2xl border border-bakery-beige p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <h3 className="font-display font-bold text-lg text-bakery-chocolate mb-1">
              Manual Stock Adjustment
            </h3>
            <p className="text-xs text-bakery-muted mb-4">
              Ingredient: <strong className="text-bakery-chocolate">{adjustItem.name}</strong> ({adjustItem.unit})
            </p>

            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              <div className="p-3 rounded-xl bg-bakery-cream border border-bakery-beige text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-bakery-muted">Current Stock:</span>
                  <span className="font-bold">{adjustItem.current_stock} {adjustItem.unit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-bakery-muted">Reorder Threshold:</span>
                  <span>{adjustItem.reorder_level} {adjustItem.unit}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-bakery-chocolate mb-1">
                  New Available Stock ({adjustItem.unit})
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={newStockVal}
                  onChange={(e) => setNewStockVal(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige text-sm font-bold text-bakery-chocolate focus:outline-hidden focus:border-bakery-caramel"
                />
                {newStockVal !== '' && (
                  <p className="text-[11px] text-bakery-muted mt-1">
                    Adjustment difference:{' '}
                    <span className={Number(newStockVal) - Number(adjustItem.current_stock) >= 0 ? 'text-status-green font-bold' : 'text-status-red font-bold'}>
                      {Number(newStockVal) - Number(adjustItem.current_stock) > 0 ? '+' : ''}
                      {(Number(newStockVal) - Number(adjustItem.current_stock)).toFixed(2)} {adjustItem.unit}
                    </span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-bakery-chocolate mb-1">
                  Reason for Adjustment
                </label>
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige text-xs text-bakery-espresso focus:outline-hidden focus:border-bakery-caramel mb-2"
                >
                  <option value="Physical count reconciliation">Physical count reconciliation</option>
                  <option value="Damaged / Spoilage / Spill">Damaged / Spoilage / Spill</option>
                  <option value="Manual purchase entry">Manual purchase entry</option>
                  <option value="Returned stock from kitchen">Returned stock from kitchen</option>
                  <option value="Opening stock balance setup">Opening stock balance setup</option>
                </select>
                <input
                  type="text"
                  placeholder="Or enter custom reason..."
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-white border border-bakery-beige text-xs text-bakery-espresso focus:outline-hidden focus:border-bakery-caramel"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-bakery-beige">
                <button
                  type="button"
                  onClick={() => setAdjustItem(null)}
                  className="px-4 py-2 rounded-xl border border-bakery-beige text-xs font-semibold text-bakery-muted hover:bg-bakery-cream"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjustSubmitting}
                  className="px-4 py-2 rounded-xl bg-bakery-chocolate text-white text-xs font-semibold hover:bg-[#2c1108] disabled:opacity-50"
                >
                  {adjustSubmitting ? 'Updating...' : 'Confirm Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transaction History Modal */}
      {historyItem && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-bakery-ivory rounded-2xl border border-bakery-beige p-6 shadow-2xl animate-in fade-in zoom-in-95 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-bakery-beige">
              <div>
                <h3 className="font-display font-bold text-lg text-bakery-chocolate">
                  Stock Movement History
                </h3>
                <p className="text-xs text-bakery-muted">
                  Audit trail for: <strong className="text-bakery-chocolate">{historyItem.name}</strong> ({historyItem.unit})
                </p>
              </div>
              <button
                onClick={() => setHistoryItem(null)}
                className="p-1 rounded-lg text-bakery-muted hover:text-bakery-chocolate hover:bg-bakery-cream"
              >
                &times;
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3">
              {historyLoading ? (
                <div className="py-8 text-center text-xs text-bakery-muted">Loading movement history...</div>
              ) : transactions.length > 0 ? (
                <div className="space-y-2">
                  {transactions.map((tx) => {
                    const change = Number(tx.quantity_change);
                    const isPos = change > 0;
                    return (
                      <div key={tx.id} className="p-3 rounded-xl bg-bakery-cream/70 border border-bakery-beige/70 flex items-center justify-between text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-bakery-chocolate uppercase text-[10px] px-1.5 py-0.5 rounded bg-bakery-beige/60">
                              {tx.transaction_type}
                            </span>
                            <span className="text-[11px] text-bakery-muted">{new Date(tx.created_at).toLocaleString()}</span>
                          </div>
                          <p className="text-bakery-espresso font-medium mt-1">{tx.reason}</p>
                          <p className="text-[10px] text-bakery-muted">
                            {tx.previous_stock} &rarr; <strong className="text-bakery-chocolate">{tx.new_stock}</strong> {tx.unit}
                            {tx.user_name && ` by @${tx.user_name}`}
                          </p>
                        </div>
                        <span className={`font-display font-bold text-sm px-2.5 py-1 rounded-lg ${isPos ? 'bg-status-greenLight text-status-green' : 'bg-status-orangeLight text-status-orange'}`}>
                          {isPos ? `+${change}` : change} {tx.unit}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="py-8 text-center text-xs text-bakery-muted">No stock transactions recorded yet for this item.</p>
              )}
            </div>

            <div className="pt-3 border-t border-bakery-beige flex justify-end">
              <button
                onClick={() => setHistoryItem(null)}
                className="px-4 py-2 rounded-xl bg-bakery-cream text-xs font-semibold text-bakery-chocolate hover:bg-bakery-beige"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restocking List Modal */}
      {showRestockModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-3xl bg-bakery-ivory rounded-2xl border border-bakery-beige p-6 shadow-2xl animate-in fade-in zoom-in-95 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-bakery-beige">
              <div>
                <h3 className="font-display font-bold text-lg text-bakery-chocolate">
                  Ingredient Restocking Recommendation
                </h3>
                <p className="text-xs text-bakery-muted">
                  Ingredients currently at Low Stock or Out of Stock levels
                </p>
              </div>
              <button
                onClick={() => setShowRestockModal(false)}
                className="p-1 rounded-lg text-bakery-muted hover:text-bakery-chocolate hover:bg-bakery-cream"
              >
                &times;
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4">
              {restockList.length > 0 ? (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-bakery-cream text-bakery-chocolate font-bold">
                      <th className="py-2.5 px-3">Ingredient</th>
                      <th className="py-2.5 px-3">Supplier</th>
                      <th className="py-2.5 px-3 text-right">Available</th>
                      <th className="py-2.5 px-3 text-right">Reorder Level</th>
                      <th className="py-2.5 px-3 text-right">Suggested Qty</th>
                      <th className="py-2.5 px-3 text-right">Est. Cost (₱)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-bakery-beige/60">
                    {restockList.map((item) => (
                      <tr key={item.id}>
                        <td className="py-2.5 px-3 font-bold text-bakery-chocolate">{item.name}</td>
                        <td className="py-2.5 px-3 text-bakery-muted">{item.supplier}</td>
                        <td className="py-2.5 px-3 text-right font-semibold text-status-orange">
                          {Number(item.current_stock).toLocaleString()} {item.unit}
                        </td>
                        <td className="py-2.5 px-3 text-right text-bakery-muted">
                          {Number(item.reorder_level).toLocaleString()} {item.unit}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-bakery-chocolate">
                          {Number(item.suggested_reorder_qty).toLocaleString()} {item.unit}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-bakery-caramel">
                          ₱{Number(item.estimated_cost).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="py-12 text-center text-xs text-status-green font-medium">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-status-green" />
                  All ingredients are sufficiently stocked! No restocking currently needed.
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-bakery-beige flex items-center justify-between">
              <span className="text-xs text-bakery-muted font-medium">
                Total Restock Items: {restockList.length}
              </span>
              <button
                onClick={() => setShowRestockModal(false)}
                className="px-4 py-2 rounded-xl bg-bakery-chocolate text-white text-xs font-semibold hover:bg-[#2c1108]"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

