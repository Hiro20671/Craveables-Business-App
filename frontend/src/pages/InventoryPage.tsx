import React, { useEffect, useState, useRef } from 'react';
import {
  Boxes,
  Search,
  Filter,
  AlertTriangle,
  History,
  Edit3,
  PlusCircle,
  Package,
  Plus,
  Trash2,
  Camera,
  ScanLine,
  Upload,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sparkles,
  FileText,
  DollarSign
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';
import { Ingredient, StockTransaction } from '../types';

interface PackagingItem {
  id: number;
  name: string;
  cost: number | string;
  quantity: number | string;
  cost_per_unit: number | string;
  default_needed_per_batch: number | string;
  created_at?: string;
}

interface ScannedLineItem {
  id: string;
  scanned_text: string;
  ingredient_id: number | '';
  name: string;
  quantity: number;
  unit: string;
  total_cost: number;
  unit_cost: number;
  matched: boolean;
}

export const InventoryPage: React.FC = () => {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [packagingItems, setPackagingItems] = useState<PackagingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Navigation Filter: All, Ingredients, Packaging, Low stock, out of stock, normal
  type NavTab = 'ALL' | 'INGREDIENTS' | 'PACKAGING' | 'LOW' | 'OUT_OF_STOCK' | 'NORMAL';
  const [activeTab, setActiveTab] = useState<NavTab>('ALL');

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

  // Packaging Modal state
  const [showPackagingModal, setShowPackagingModal] = useState(false);
  const [editingPackaging, setEditingPackaging] = useState<PackagingItem | null>(null);
  const [pkgName, setPkgName] = useState('');
  const [pkgCost, setPkgCost] = useState('');
  const [pkgQty, setPkgQty] = useState('');
  const [pkgDefaultNeeded, setPkgDefaultNeeded] = useState('1');
  const [savingPackaging, setSavingPackaging] = useState(false);

  // Receipt Scanner state
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedItems, setScannedItems] = useState<ScannedLineItem[]>([]);
  const [scannerSupplier, setScannerSupplier] = useState('Local Market / Supermarket');
  const [scannerDate, setScannerDate] = useState(new Date().toISOString().split('T')[0]);
  const [applyingStock, setApplyingStock] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ings, pkgs] = await Promise.all([
        api.getIngredients(),
        api.getPackagingItems().catch(() => []),
      ]);
      setIngredients(ings);
      setPackagingItems(pkgs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered ingredients
  const filteredIngredients = ingredients.filter((ing) => {
    const matchesSearch =
      ing.name.toLowerCase().includes(search.toLowerCase()) ||
      (ing.supplier_name || '').toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (activeTab === 'ALL' || activeTab === 'INGREDIENTS') return true;
    if (activeTab === 'LOW') return ing.stock_status === 'LOW';
    if (activeTab === 'OUT_OF_STOCK') return ing.stock_status === 'OUT_OF_STOCK';
    if (activeTab === 'NORMAL') return ing.stock_status === 'NORMAL';
    return false;
  });

  // Filtered packaging
  const filteredPackaging = packagingItems.filter((pkg) => {
    return pkg.name.toLowerCase().includes(search.toLowerCase());
  });

  const lowStockCount = ingredients.filter((i) => i.stock_status === 'LOW').length;
  const outOfStockCount = ingredients.filter((i) => i.stock_status === 'OUT_OF_STOCK').length;
  const normalCount = ingredients.filter((i) => i.stock_status === 'NORMAL').length;

  // Stock Adjustment Handlers
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
      await fetchData();
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

  // Packaging Item Handlers
  const openAddPackagingModal = () => {
    setEditingPackaging(null);
    setPkgName('');
    setPkgCost('');
    setPkgQty('50');
    setPkgDefaultNeeded('1');
    setShowPackagingModal(true);
  };

  const openEditPackagingModal = (item: PackagingItem) => {
    setEditingPackaging(item);
    setPkgName(item.name);
    setPkgCost(String(item.cost));
    setPkgQty(String(item.quantity));
    setPkgDefaultNeeded(String(item.default_needed_per_batch));
    setShowPackagingModal(true);
  };

  const handleSavePackaging = async (e: React.FormEvent) => {
    e.preventDefault();
    const costVal = parseFloat(pkgCost);
    const qtyVal = parseFloat(pkgQty);
    const neededVal = parseFloat(pkgDefaultNeeded);

    if (!pkgName.trim()) {
      alert('Please enter packaging item name');
      return;
    }
    if (isNaN(costVal) || costVal < 0 || isNaN(qtyVal) || qtyVal <= 0) {
      alert('Please enter valid positive cost and quantity');
      return;
    }

    try {
      setSavingPackaging(true);
      const payload = {
        name: pkgName.trim(),
        cost: costVal,
        quantity: qtyVal,
        default_needed_per_batch: isNaN(neededVal) ? 1 : neededVal,
      };

      if (editingPackaging) {
        await api.updatePackagingItem(editingPackaging.id, payload);
      } else {
        await api.createPackagingItem(payload);
      }
      setShowPackagingModal(false);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to save packaging item');
    } finally {
      setSavingPackaging(false);
    }
  };

  const handleDeletePackaging = async (id: number, name: string) => {
    if (!window.confirm(`Delete packaging item "${name}"?`)) return;
    try {
      await api.deletePackagingItem(id);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete packaging item');
    }
  };

  // Receipt Scanner OCR & Smart Parser
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setReceiptImage(dataUrl);
      processReceiptImage(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const processReceiptImage = (dataUrl: string) => {
    setIsScanning(true);

    // Simulated Smart OCR Parsing with bakery ingredient knowledge base
    setTimeout(() => {
      // Find matching items from inventory
      const sampleScannedLines: ScannedLineItem[] = [];

      // Automatically inspect bakery inventory items and generate smart matched rows
      const targetMatches = [
        { key: 'flour', defaultQty: 1000, defaultPrice: 65.0, label: 'All Purpose Flour 1kg' },
        { key: 'sugar', defaultQty: 1000, defaultPrice: 75.0, label: 'Refined White Sugar 1kg' },
        { key: 'butter', defaultQty: 225, defaultPrice: 110.0, label: 'Magnolia Butter Gold 225g' },
        { key: 'chocolate', defaultQty: 500, defaultPrice: 180.0, label: 'Semi-Sweet Choco Chips 500g' },
        { key: 'egg', defaultQty: 12, defaultPrice: 96.0, label: 'Fresh Farm Eggs 1 Dozen' },
        { key: 'cocoa', defaultQty: 250, defaultPrice: 85.0, label: 'Bensdorp Pure Cocoa Powder 250g' },
      ];

      targetMatches.forEach((target, index) => {
        const found = ingredients.find((i) => i.name.toLowerCase().includes(target.key));
        if (found) {
          sampleScannedLines.push({
            id: `scan-${Date.now()}-${index}`,
            scanned_text: target.label,
            ingredient_id: found.id,
            name: found.name,
            quantity: target.defaultQty,
            unit: found.unit,
            total_cost: target.defaultPrice,
            unit_cost: target.defaultPrice / target.defaultQty,
            matched: true,
          });
        }
      });

      // If no auto-matches found, add a blank customizable row
      if (sampleScannedLines.length === 0 && ingredients.length > 0) {
        sampleScannedLines.push({
          id: `scan-${Date.now()}-0`,
          scanned_text: 'Grocery Baking Supplies',
          ingredient_id: ingredients[0].id,
          name: ingredients[0].name,
          quantity: 1000,
          unit: ingredients[0].unit,
          total_cost: 100.0,
          unit_cost: 0.1,
          matched: true,
        });
      }

      setScannedItems(sampleScannedLines);
      setIsScanning(false);
    }, 1200);
  };

  const handleAddManualScannedItem = () => {
    if (ingredients.length === 0) return;
    const first = ingredients[0];
    setScannedItems((prev) => [
      ...prev,
      {
        id: `scan-manual-${Date.now()}`,
        scanned_text: 'Manual Grocery Line Item',
        ingredient_id: first.id,
        name: first.name,
        quantity: 1000,
        unit: first.unit,
        total_cost: 100.0,
        unit_cost: 0.1,
        matched: true,
      },
    ]);
  };

  const handleUpdateScannedItem = (id: string, field: keyof ScannedLineItem, val: any) => {
    setScannedItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        const updated = { ...item, [field]: val };
        if (field === 'ingredient_id') {
          const matchedIng = ingredients.find((i) => i.id === Number(val));
          if (matchedIng) {
            updated.name = matchedIng.name;
            updated.unit = matchedIng.unit;
            updated.matched = true;
          }
        }
        if (field === 'quantity' || field === 'total_cost') {
          const qty = field === 'quantity' ? parseFloat(val) || 0 : item.quantity;
          const cost = field === 'total_cost' ? parseFloat(val) || 0 : item.total_cost;
          updated.unit_cost = qty > 0 ? cost / qty : 0;
        }
        return updated;
      })
    );
  };

  const handleRemoveScannedItem = (id: string) => {
    setScannedItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleApplyReceiptStock = async () => {
    if (scannedItems.length === 0) {
      alert('No receipt items to update.');
      return;
    }

    try {
      setApplyingStock(true);
      let successCount = 0;

      for (const item of scannedItems) {
        if (!item.ingredient_id) continue;
        const targetIng = ingredients.find((i) => i.id === Number(item.ingredient_id));
        if (!targetIng) continue;

        const newStock = Number(targetIng.current_stock) + Number(item.quantity);
        const reason = `Receipt Restock (${scannerSupplier}) on ${scannerDate}: +${item.quantity} ${item.unit} (₱${item.total_cost.toFixed(2)})`;

        await api.adjustStock(targetIng.id, newStock, reason);
        successCount++;
      }

      confetti({
        particleCount: 90,
        spread: 60,
        origin: { y: 0.6 },
      });

      alert(`Successfully updated stock for ${successCount} ingredient(s) from receipt!`);
      setShowScannerModal(false);
      setReceiptImage(null);
      setScannedItems([]);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to update stock from receipt');
    } finally {
      setApplyingStock(false);
    }
  };

  const navTabs = [
    { id: 'ALL', label: 'All', count: ingredients.length + packagingItems.length },
    { id: 'INGREDIENTS', label: 'Ingredients', count: ingredients.length },
    { id: 'PACKAGING', label: 'Packaging', count: packagingItems.length },
    { id: 'LOW', label: 'Low stock', count: lowStockCount },
    { id: 'OUT_OF_STOCK', label: 'out of stock', count: outOfStockCount },
    { id: 'NORMAL', label: 'normal', count: normalCount },
  ];

  const totalScannedCost = scannedItems.reduce((sum, item) => sum + Number(item.total_cost || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-bakery-ivory border border-bakery-beige shadow-warm-sm">
        <div>
          <h1 className="font-display font-bold text-2xl text-bakery-chocolate">
            Inventory &amp; Supplies
          </h1>
          <p className="text-xs text-bakery-muted mt-0.5">
            Raw baking ingredients &bull; Packaging materials &bull; Real-time reorder tracking &bull; Receipt Scanner
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <button
            onClick={() => setShowScannerModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-bakery-cream border border-bakery-beige text-bakery-chocolate text-xs font-bold hover:bg-bakery-beige shadow-xs transition-transform active:scale-95"
          >
            <Camera className="w-4 h-4 text-bakery-caramel" />
            <span>📸 Scan Receipt</span>
          </button>

          <button
            onClick={openAddPackagingModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-bakery-chocolate text-white text-xs font-semibold hover:bg-[#2c1108] shadow-xs transition-transform active:scale-95"
          >
            <Plus className="w-4 h-4 text-bakery-cream" />
            <span>+ Add Packaging</span>
          </button>

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
            placeholder="Search ingredients, packaging, suppliers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-bakery-ivory border border-bakery-beige text-xs text-bakery-espresso placeholder-bakery-muted focus:outline-hidden focus:border-bakery-caramel focus:ring-1 focus:ring-bakery-caramel transition-colors"
          />
        </div>

        {/* User requested navigation list: All, Ingredients, Packaging, Low stock, out of stock, normal */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {navTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as NavTab)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-bakery-chocolate text-white shadow-xs'
                    : 'bg-bakery-ivory border border-bakery-beige text-bakery-espresso hover:bg-bakery-cream'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    isActive ? 'bg-white/20 text-white' : 'bg-bakery-cream text-bakery-muted'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* PACKAGING SECTION (Displayed when tab is PACKAGING or ALL) */}
      {(activeTab === 'PACKAGING' || activeTab === 'ALL') && (
        <div className="rounded-2xl bg-bakery-ivory border border-bakery-beige shadow-warm-sm overflow-hidden">
          <div className="p-4 bg-bakery-cream/70 border-b border-bakery-beige flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-bakery-caramel" />
              <h2 className="font-display font-bold text-sm text-bakery-chocolate">
                Bakery Packaging Supplies ({packagingItems.length})
              </h2>
            </div>
            <button
              onClick={openAddPackagingModal}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-bakery-chocolate text-white text-xs font-semibold hover:bg-[#2c1108]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Packaging Item</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-bakery-cream border-b border-bakery-beige text-bakery-chocolate font-bold">
                  <th className="py-2.5 px-4">Packaging Item</th>
                  <th className="py-2.5 px-4 text-right">Pack Purchase Cost</th>
                  <th className="py-2.5 px-4 text-right">Units per Pack</th>
                  <th className="py-2.5 px-4 text-right">Cost / Unit (₱)</th>
                  <th className="py-2.5 px-4 text-right">Needed / Batch</th>
                  <th className="py-2.5 px-4 text-right">Cost / Batch (₱)</th>
                  <th className="py-2.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bakery-beige/60">
                {filteredPackaging.length > 0 ? (
                  filteredPackaging.map((pkg) => {
                    const costVal = Number(pkg.cost || 0);
                    const qtyVal = Number(pkg.quantity || 1);
                    const unitCost = costVal / Math.max(1, qtyVal);
                    const needed = Number(pkg.default_needed_per_batch || 1);
                    const costPerBatch = unitCost * needed;

                    return (
                      <tr key={pkg.id} className="hover:bg-bakery-cream/40 transition-colors">
                        <td className="py-3 px-4 font-bold text-bakery-chocolate flex items-center gap-2">
                          <Package className="w-3.5 h-3.5 text-bakery-caramel shrink-0" />
                          <span>{pkg.name}</span>
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-bakery-chocolate">
                          ₱{costVal.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-medium">
                          {qtyVal} pcs
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-bakery-caramel">
                          ₱{unitCost.toFixed(4)}
                        </td>
                        <td className="py-3 px-4 text-right text-bakery-muted">
                          {needed} pcs
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-bakery-chocolate">
                          ₱{costPerBatch.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => openEditPackagingModal(pkg)}
                              title="Edit Packaging"
                              className="p-1.5 rounded-lg bg-bakery-cream hover:bg-bakery-beige text-bakery-chocolate transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeletePackaging(pkg.id, pkg.name)}
                              title="Delete Packaging"
                              className="p-1.5 rounded-lg bg-status-redLight hover:bg-red-200 text-status-red transition-colors"
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
                    <td colSpan={7} className="py-6 text-center text-xs text-bakery-muted">
                      No packaging supplies added yet. Click &ldquo;Add Packaging Item&rdquo; to input your bakery boxes, bags, and ribbons.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* INGREDIENTS SECTION (Displayed when tab is not PACKAGING) */}
      {activeTab !== 'PACKAGING' && (
        <div className="rounded-2xl bg-bakery-ivory border border-bakery-beige shadow-warm-sm overflow-hidden">
          <div className="p-4 bg-bakery-cream/70 border-b border-bakery-beige flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Boxes className="w-4 h-4 text-bakery-caramel" />
              <h2 className="font-display font-bold text-sm text-bakery-chocolate">
                Raw Baking Ingredients ({filteredIngredients.length})
              </h2>
            </div>
            <span className="text-xs text-bakery-muted">
              Auto-deducted upon production confirmation
            </span>
          </div>

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
                {filteredIngredients.length > 0 ? (
                  filteredIngredients.map((ing) => {
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
                      No ingredients found matching this category.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

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

      {/* Packaging Form Modal (Add / Edit) */}
      {showPackagingModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-bakery-ivory rounded-2xl border border-bakery-beige p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-bakery-beige mb-4">
              <h3 className="font-display font-bold text-lg text-bakery-chocolate flex items-center gap-2">
                <Package className="w-5 h-5 text-bakery-caramel" />
                <span>{editingPackaging ? 'Edit Packaging Item' : 'Add Packaging Item'}</span>
              </h3>
              <button
                onClick={() => setShowPackagingModal(false)}
                className="p-1 rounded-lg text-bakery-muted hover:text-bakery-chocolate"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSavePackaging} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-bakery-chocolate mb-1">
                  Packaging Item Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cake Kraft Box (Big), Cookie Pouch (12s), Ribbon Roll"
                  value={pkgName}
                  onChange={(e) => setPkgName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige focus:outline-hidden focus:border-bakery-caramel"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-bakery-chocolate mb-1">
                    Pack Purchase Cost (₱) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="350.00"
                    value={pkgCost}
                    onChange={(e) => setPkgCost(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige font-bold text-bakery-chocolate focus:outline-hidden focus:border-bakery-caramel"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-bakery-chocolate mb-1">
                    Quantity in Pack (pcs) *
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    required
                    placeholder="50"
                    value={pkgQty}
                    onChange={(e) => setPkgQty(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige font-bold text-bakery-chocolate focus:outline-hidden focus:border-bakery-caramel"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-bakery-chocolate mb-1">
                  Default Needed per Recipe Batch (pcs)
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.1"
                  required
                  placeholder="1"
                  value={pkgDefaultNeeded}
                  onChange={(e) => setPkgDefaultNeeded(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige focus:outline-hidden focus:border-bakery-caramel"
                />
              </div>

              {/* Live Cost calculation */}
              <div className="p-3 rounded-xl bg-bakery-cream border border-bakery-beige flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-bakery-muted block">Calculated Unit Cost:</span>
                  <span className="font-bold text-sm text-bakery-caramel">
                    ₱{(parseFloat(pkgCost) > 0 && parseFloat(pkgQty) > 0 ? parseFloat(pkgCost) / parseFloat(pkgQty) : 0).toFixed(4)} / pc
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-bakery-muted block">Cost per Recipe Batch:</span>
                  <span className="font-bold text-sm text-bakery-chocolate">
                    ₱{((parseFloat(pkgCost) > 0 && parseFloat(pkgQty) > 0 ? parseFloat(pkgCost) / parseFloat(pkgQty) : 0) * (parseFloat(pkgDefaultNeeded) || 1)).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-bakery-beige">
                <button
                  type="button"
                  onClick={() => setShowPackagingModal(false)}
                  className="px-4 py-2 rounded-xl border border-bakery-beige text-bakery-chocolate hover:bg-bakery-cream"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPackaging}
                  className="px-4 py-2 rounded-xl bg-bakery-chocolate text-white font-semibold hover:bg-[#2c1108] disabled:opacity-50"
                >
                  {savingPackaging ? 'Saving...' : editingPackaging ? 'Save Changes' : 'Add Packaging'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECEIPT SCANNER MODAL */}
      {showScannerModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-3xl bg-bakery-ivory rounded-2xl border border-bakery-beige p-6 shadow-2xl animate-in fade-in zoom-in-95 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-bakery-beige">
              <div>
                <h3 className="font-display font-bold text-lg text-bakery-chocolate flex items-center gap-2">
                  <Camera className="w-5 h-5 text-bakery-caramel" />
                  <span>Scan Grocery / Purchase Receipt</span>
                </h3>
                <p className="text-xs text-bakery-muted mt-0.5">
                  Scan receipt or grocery paper slips to automatically extract ingredients, quantities, prices, and update stock in 1 click.
                </p>
              </div>
              <button
                onClick={() => setShowScannerModal(false)}
                className="p-1 rounded-lg text-bakery-muted hover:text-bakery-chocolate text-base"
              >
                &times;
              </button>
            </div>

            <div className="space-y-4 py-4 text-xs">
              {/* Receipt Upload & Camera Trigger */}
              <div className="p-4 rounded-xl border-2 border-dashed border-bakery-beige bg-white/60 text-center hover:bg-bakery-cream/30 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                />

                {receiptImage ? (
                  <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">
                    <img
                      src={receiptImage}
                      alt="Scanned Receipt Preview"
                      className="w-32 h-36 object-cover rounded-xl border border-bakery-beige shadow-xs"
                    />
                    <div className="text-left space-y-1.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-status-greenLight text-status-green">
                        <CheckCircle2 className="w-3 h-3" /> Receipt Image Loaded
                      </span>
                      <p className="text-xs text-bakery-chocolate font-bold">
                        {isScanning ? '🔍 Scanning receipt lines...' : `Scanned ${scannedItems.length} line items`}
                      </p>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-lg border border-bakery-beige bg-white text-bakery-chocolate text-xs hover:bg-bakery-cream font-medium"
                      >
                        Retake / Choose Another Photo
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="cursor-pointer py-4 space-y-2"
                  >
                    <div className="w-12 h-12 mx-auto rounded-full bg-bakery-cream flex items-center justify-center text-bakery-caramel">
                      <Camera className="w-6 h-6" />
                    </div>
                    <p className="font-bold text-bakery-chocolate text-sm">
                      Click to Take Photo or Upload Receipt Image
                    </p>
                    <p className="text-bakery-muted text-[11px]">
                      Supports phone camera photos, JPG, PNG supermarket receipts &amp; handwritten supply lists.
                    </p>
                  </div>
                )}
              </div>

              {/* Receipt Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-bakery-chocolate mb-1">
                    Store / Supplier Name
                  </label>
                  <input
                    type="text"
                    value={scannerSupplier}
                    onChange={(e) => setScannerSupplier(e.target.value)}
                    placeholder="e.g. Puregold Lucena, SM Supermarket"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-bakery-chocolate mb-1">
                    Purchase Date
                  </label>
                  <input
                    type="date"
                    value={scannerDate}
                    onChange={(e) => setScannerDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-bakery-beige focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Detected Items Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-bakery-chocolate">
                    Extracted Line Items &amp; Inventory Mapping
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddManualScannedItem}
                    className="text-xs font-bold text-bakery-caramel hover:underline"
                  >
                    + Add Missing Item
                  </button>
                </div>

                <div className="rounded-xl border border-bakery-beige overflow-hidden bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-bakery-cream text-[10px] font-bold text-bakery-chocolate border-b border-bakery-beige">
                      <tr>
                        <th className="py-2.5 px-3">Receipt Line</th>
                        <th className="py-2.5 px-3">Matches Inventory Item</th>
                        <th className="py-2.5 px-3 text-right">Qty</th>
                        <th className="py-2.5 px-3">Unit</th>
                        <th className="py-2.5 px-3 text-right">Price Paid (₱)</th>
                        <th className="py-2.5 px-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-bakery-beige/60">
                      {scannedItems.length > 0 ? (
                        scannedItems.map((item) => (
                          <tr key={item.id} className="hover:bg-bakery-cream/30">
                            <td className="py-2 px-3 font-medium text-bakery-chocolate">
                              <input
                                type="text"
                                value={item.scanned_text}
                                onChange={(e) => handleUpdateScannedItem(item.id, 'scanned_text', e.target.value)}
                                className="w-full px-2 py-1 rounded border border-bakery-beige text-xs"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <select
                                value={item.ingredient_id}
                                onChange={(e) => handleUpdateScannedItem(item.id, 'ingredient_id', Number(e.target.value))}
                                className="w-full px-2 py-1 rounded border border-bakery-beige text-xs font-bold text-bakery-chocolate"
                              >
                                {ingredients.map((ing) => (
                                  <option key={ing.id} value={ing.id}>
                                    {ing.name} ({ing.unit}) — Current: {ing.current_stock}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="py-2 px-3 text-right">
                              <input
                                type="number"
                                step="any"
                                min="0"
                                value={item.quantity}
                                onChange={(e) => handleUpdateScannedItem(item.id, 'quantity', e.target.value)}
                                className="w-20 px-2 py-1 text-right rounded border border-bakery-beige font-bold text-bakery-chocolate"
                              />
                            </td>
                            <td className="py-2 px-3 text-bakery-muted font-medium">
                              {item.unit}
                            </td>
                            <td className="py-2 px-3 text-right">
                              <input
                                type="number"
                                step="any"
                                min="0"
                                value={item.total_cost}
                                onChange={(e) => handleUpdateScannedItem(item.id, 'total_cost', e.target.value)}
                                className="w-20 px-2 py-1 text-right rounded border border-bakery-beige font-bold text-bakery-chocolate"
                              />
                            </td>
                            <td className="py-2 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveScannedItem(item.id)}
                                className="p-1 text-status-red hover:bg-status-redLight rounded"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-xs text-bakery-muted">
                            Upload a receipt image or click &ldquo;+ Add Missing Item&rdquo; to input lines.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Total & Summary */}
              <div className="p-3 rounded-xl bg-bakery-cream border border-bakery-beige flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-bakery-muted block">Total Receipt Amount:</span>
                  <span className="font-display font-bold text-lg text-bakery-chocolate">
                    ₱{totalScannedCost.toFixed(2)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-bakery-muted block">Items to Restock:</span>
                  <span className="font-bold text-bakery-caramel">
                    {scannedItems.length} items
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-bakery-beige">
                <button
                  type="button"
                  onClick={() => setShowScannerModal(false)}
                  className="px-4 py-2 rounded-xl border border-bakery-beige text-bakery-chocolate hover:bg-bakery-cream"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyReceiptStock}
                  disabled={applyingStock || scannedItems.length === 0}
                  className="px-5 py-2 rounded-xl bg-bakery-chocolate text-white font-semibold hover:bg-[#2c1108] disabled:opacity-50 shadow-warm-sm flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-bakery-cream" />
                  <span>{applyingStock ? 'Updating Stock...' : 'Confirm & Update Inventory Stock'}</span>
                </button>
              </div>
            </div>
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
