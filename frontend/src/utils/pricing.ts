/**
 * CRAVEABLES Wholesale & Tiered Pricing Engine
 * Official bakery discount rules:
 * - Banana Cake Big: <10 pcs: ₱10 off/cake | >=10 pcs: ₱15 off/cake
 * - Banana Cake Small: <10 pcs: 5% off | >=10 pcs: 10% off
 * - Classic Brownies: <10 boxes: ₱10 off/box | >=10 boxes: ₱20 off/box
 * - Cookies: ₱5 off each
 */

export interface WholesaleCalculationResult {
  unitPrice: number;
  quantity: number;
  regularTotal: number;
  unitDiscount: number;
  totalDiscount: number;
  discountedUnitPrice: number;
  finalTotal: number;
  discountLabel: string;
  tierBadge: string;
}

export function calculateWholesaleDiscount(
  itemName: string,
  unitPrice: number,
  quantity: number,
  forceWholesale: boolean = false
): WholesaleCalculationResult {
  const name = (itemName || '').toLowerCase();
  const qty = Math.max(0, quantity || 0);
  const regularTotal = unitPrice * qty;

  let unitDiscount = 0;
  let discountLabel = '';
  let tierBadge = '';

  // 1. Banana Cake Big
  if (name.includes('banana') && (name.includes('big') || name.includes('400g'))) {
    if (qty >= 10) {
      unitDiscount = 15;
      discountLabel = '₱15.00 off/cake (10+ wholesale tier)';
      tierBadge = '10+ Tier: -₱15/pc';
    } else if (qty > 0) {
      unitDiscount = 10;
      discountLabel = '₱10.00 off/cake (<10 wholesale tier)';
      tierBadge = '<10 Tier: -₱10/pc';
    }
  }
  // 2. Banana Cake Small
  else if (name.includes('banana') && (name.includes('small') || name.includes('120g'))) {
    if (qty >= 10) {
      unitDiscount = Math.round(unitPrice * 0.10 * 100) / 100; // 10%
      discountLabel = '10% off (10+ wholesale tier)';
      tierBadge = '10+ Tier: -10%';
    } else if (qty > 0) {
      unitDiscount = Math.round(unitPrice * 0.05 * 100) / 100; // 5%
      discountLabel = '5% off (<10 wholesale tier)';
      tierBadge = '<10 Tier: -5%';
    }
  }
  // 3. Classic Brownies (both Box of 6 and Box of 3)
  else if (name.includes('brownie')) {
    if (qty >= 10) {
      unitDiscount = 20;
      discountLabel = '₱20.00 off/box (10+ wholesale tier)';
      tierBadge = '10+ Tier: -₱20/box';
    } else if (qty > 0) {
      unitDiscount = 10;
      discountLabel = '₱10.00 off/box (<10 wholesale tier)';
      tierBadge = '<10 Tier: -₱10/box';
    }
  }
  // 4. Cookies (both Single and Box)
  else if (name.includes('cookie')) {
    if (qty > 0) {
      unitDiscount = 5;
      discountLabel = '₱5.00 off each (Wholesale special)';
      tierBadge = 'Wholesale: -₱5 each';
    }
  }

  // If not wholesale and qty is low and not forced, only apply if qty indicates wholesale volume (e.g. >= 5) or forced
  // However, the rule explicitly specifies tiered brackets "< 10" and ">= 10"
  const totalDiscount = unitDiscount * qty;
  const discountedUnitPrice = Math.max(0, unitPrice - unitDiscount);
  const finalTotal = Math.max(0, regularTotal - totalDiscount);

  return {
    unitPrice,
    quantity: qty,
    regularTotal,
    unitDiscount,
    totalDiscount,
    discountedUnitPrice,
    finalTotal,
    discountLabel,
    tierBadge,
  };
}

export function getWholesaleDescription(itemName: string): string {
  const name = (itemName || '').toLowerCase();
  if (name.includes('banana') && (name.includes('big') || name.includes('400g'))) {
    return 'Wholesale: ₱10 off (<10 pcs) • ₱15 off (10+ pcs)';
  }
  if (name.includes('banana') && (name.includes('small') || name.includes('120g'))) {
    return 'Wholesale: 5% off (<10 pcs) • 10% off (10+ pcs)';
  }
  if (name.includes('brownie')) {
    return 'Wholesale: ₱10 off (<10 boxes) • ₱20 off (10+ boxes)';
  }
  if (name.includes('cookie')) {
    return 'Wholesale: ₱5 off each';
  }
  return 'Special wholesale discount available on volume orders';
}

