/**
 * CRAVEABLES Wholesale & Reseller Tiered Pricing Engine
 * Official bakery wholesale discount rules:
 * 1. Banana Cake Big: <10 pcs = ₱10 off/pc | 10+ pcs = ₱15 off/pc
 * 2. Banana Cake Small: <10 pcs = 5% off | 10+ pcs = 10% off
 * 3. Brownies: Small Box (3 pcs) = ₱10 off/box | Big Box (6 pcs) = ₱20 off/box
 * 4. Cookies (Per Pc / Single): ₱5 off each
 * 5. Cookies (Box of 6 / Assorted Box): <10 boxes = ₱10 off/box | 10+ boxes = ₱15 off/box
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
  quantity: number
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
      discountLabel = '₱15.00 off/pc (10+ wholesale tier)';
      tierBadge = '10+ Tier: -₱15/pc';
    } else if (qty > 0) {
      unitDiscount = 10;
      discountLabel = '₱10.00 off/pc (Below 10 wholesale tier)';
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
      discountLabel = '5% off (Below 10 wholesale tier)';
      tierBadge = '<10 Tier: -5%';
    }
  }
  // 3. Brownies: ₱10 for Small Box (3 pcs) and ₱20 for Big Box (6 pcs)
  else if (name.includes('brownie')) {
    if (name.includes('big') || name.includes('6')) {
      unitDiscount = 20;
      discountLabel = '₱20.00 off/box (Brownies Big Wholesale)';
      tierBadge = 'Big Box: -₱20/box';
    } else {
      unitDiscount = 10;
      discountLabel = '₱10.00 off/box (Brownies Small Wholesale)';
      tierBadge = 'Small Box: -₱10/box';
    }
  }
  // 4 & 5. Cookies: Per Pc (-₱5 each) vs Box (<10: -₱10/box, 10+: -₱15/box)
  else if (name.includes('cookie') || name.includes('velvet') || name.includes('choco chip')) {
    const isPerPiece =
      name.includes('single') ||
      name.includes('per pc') ||
      name.includes('1 pc') ||
      name.includes('piece') ||
      unitPrice <= 50;

    if (isPerPiece) {
      if (qty > 0) {
        unitDiscount = 5;
        discountLabel = '₱5.00 off each (Cookies Per Pc Wholesale)';
        tierBadge = 'Per Pc: -₱5 each';
      }
    } else {
      if (qty >= 10) {
        unitDiscount = 15;
        discountLabel = '₱15.00 off/box (10+ Cookies Box tier)';
        tierBadge = '10+ Boxes: -₱15/box';
      } else if (qty > 0) {
        unitDiscount = 10;
        discountLabel = '₱10.00 off/box (Below 10 Cookies Box tier)';
        tierBadge = '<10 Boxes: -₱10/box';
      }
    }
  }

  const totalDiscount = Math.round(unitDiscount * qty * 100) / 100;
  const discountedUnitPrice = Math.max(0, Math.round((unitPrice - unitDiscount) * 100) / 100);
  const finalTotal = Math.max(0, Math.round((regularTotal - totalDiscount) * 100) / 100);

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

export function getWholesaleDescription(itemName: string, unitPrice?: number): string {
  const name = (itemName || '').toLowerCase();
  if (name.includes('banana') && (name.includes('big') || name.includes('400g'))) {
    return 'Wholesale: ₱10 off (<10 pcs) • ₱15 off (10+ pcs)';
  }
  if (name.includes('banana') && (name.includes('small') || name.includes('120g'))) {
    return 'Wholesale: 5% off (<10 pcs) • 10% off (10+ pcs)';
  }
  if (name.includes('brownie')) {
    if (name.includes('big') || name.includes('6')) {
      return 'Wholesale: ₱20 off per Big Box';
    }
    if (name.includes('small') || name.includes('3')) {
      return 'Wholesale: ₱10 off per Small Box';
    }
    return 'Wholesale: ₱10 off Small Box • ₱20 off Big Box';
  }
  if (name.includes('cookie') || name.includes('velvet') || name.includes('choco chip')) {
    const isPerPiece =
      name.includes('single') ||
      name.includes('per pc') ||
      name.includes('1 pc') ||
      name.includes('piece') ||
      (unitPrice !== undefined && unitPrice <= 50);
    if (isPerPiece) {
      return 'Wholesale: ₱5 off per cookie';
    }
    return 'Wholesale: ₱10 off/box (<10 boxes) • ₱15 off/box (10+ boxes)';
  }
  return 'Special wholesale discount available for resellers';
}
