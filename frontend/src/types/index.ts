export type Role = 'ADMIN' | 'STAFF' | 'VIEWER';

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: Role;
  phone_number?: string;
  is_superuser: boolean;
}

export interface Supplier {
  id: number;
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  purchase_orders_count?: number;
  created_at: string;
}

export type StockStatus = 'NORMAL' | 'LOW' | 'OUT_OF_STOCK';

export interface Ingredient {
  id: number;
  name: string;
  supplier: number | null;
  supplier_name: string;
  supplier_name_raw: string;
  purchase_date: string | null;
  purchase_cost: string | number;
  package_size: string | number;
  unit: string;
  cost_per_unit: string | number;
  current_stock: string | number;
  minimum_stock_level: string | number;
  reorder_level: string | number;
  stock_value: string | number;
  stock_status: StockStatus;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface StockTransaction {
  id: number;
  ingredient: number;
  ingredient_name: string;
  unit: string;
  transaction_type: string;
  quantity_change: string | number;
  previous_stock: string | number;
  new_stock: string | number;
  reason: string;
  reference_id: string;
  user_name: string;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  description: string;
  products_count: number;
}

export interface ProductVariant {
  id: number;
  product: number;
  product_name: string;
  category_name: string;
  name: string;
  sku: string;
  selling_price: string | number;
  batch_yield: number;
  current_finished_stock: string | number;
  is_active: boolean;
  cost_per_unit: number;
  profit_margin: number;
}

export interface Product {
  id: number;
  name: string;
  category: number | null;
  category_name: string;
  description: string;
  image_url: string;
  status: 'ACTIVE' | 'ARCHIVED';
  variants: ProductVariant[];
  created_at: string;
}

export interface PackagingItem {
  id: number;
  name: string;
  cost: string | number;
  quantity: string | number;
  cost_per_unit: string | number;
  default_needed_per_batch: string | number;
  cost_per_need: string | number;
}

export interface RecipeIngredient {
  id: number;
  ingredient: number;
  ingredient_name: string;
  ingredient_current_stock: string | number;
  ingredient_stock_status: StockStatus;
  quantity_used: string | number;
  unit: string;
  cost_per_unit: string | number;
  ingredient_cost: string | number;
  notes: string;
}

export interface Recipe {
  id: number;
  product_variant: number;
  variant_name: string;
  product_name: string;
  category_name: string;
  name: string;
  batch_yield: number;
  batch_size_desc: string;
  packaging_cost: string | number;
  shipping_cost: string | number;
  electricity_cost: string | number;
  labor_cost: string | number;
  selling_price: string | number;
  total_ingredient_cost: string | number;
  calculated_packaging_cost: string | number;
  total_overhead_cost: string | number;
  total_batch_cost: string | number;
  calculated_cost_per_unit: string | number;
  profit_per_unit: string | number;
  profit_margin: number;
  profit_margin_percentage: number;
  notes: string;
  recipe_ingredients: RecipeIngredient[];
}

export interface ProductionOrder {
  id: number;
  production_number: string;
  recipe: number;
  recipe_name: string;
  product_variant: number;
  product_name: string;
  variant_name: string;
  production_date: string;
  batches_count: string | number;
  planned_yield: number;
  actual_yield: number;
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  total_production_cost: string | number;
  cost_per_unit: string | number;
  notes: string;
  created_at: string;
  completed_at: string | null;
}

export interface SaleItem {
  id?: number;
  product_variant: number;
  product_name?: string;
  variant_name?: string;
  display_name?: string;
  quantity: number;
  selling_price: string | number;
  discount: string | number;
  total_price?: string | number;
  historical_unit_cost?: string | number;
  gross_profit?: string | number;
}

export interface SaleOrder {
  id: number;
  receipt_number: string;
  sale_date: string;
  customer_name: string;
  payment_method: string;
  subtotal: string | number;
  discount: string | number;
  total_sales: string | number;
  total_cogs: string | number;
  gross_profit: string | number;
  notes: string;
  items: SaleItem[];
  created_at: string;
}

export interface Expense {
  id: number;
  date: string;
  category: string;
  description: string;
  amount: string | number;
  payment_method: string;
  receipt_reference: string;
  notes: string;
  created_at: string;
}

export interface DashboardStats {
  total_sales: number;
  gross_profit: number;
  operating_expenses: number;
  net_profit: number;
  profit_margin: number;
  units_sold: number;
  inventory_value: number;
  inventory_summary: {
    total_ingredients: number;
    normal: number;
    low_stock: number;
    out_of_stock: number;
  };
  monthly_performance: Array<{
    month: string;
    month_num: number;
    sales: number;
    gross_profit: number;
    expenses: number;
    net_profit: number;
  }>;
  best_sellers: Array<{
    product_name: string;
    total_units: number;
    total_revenue: number;
  }>;
  recent_sales: Array<{
    id: number;
    receipt_number: string;
    sale_date: string;
    total_sales: string | number;
    payment_method: string;
  }>;
  recent_expenses: Array<{
    id: number;
    category: string;
    description: string;
    amount: string | number;
    date: string;
    payment_method: string;
  }>;
  recent_transactions: Array<{
    id: number;
    ingredient__name: string;
    transaction_type: string;
    quantity_change: string | number;
    ingredient__unit: string;
    created_at: string;
    reason: string;
  }>;
  recent_inquiries?: Array<{
    id: number;
    inquiry_number: string;
    customer_name: string;
    customer_phone: string;
    target_date: string | null;
    items_summary: string;
    estimated_total: number | string;
    status: 'PENDING' | 'CONFIRMED' | 'BAKING' | 'COMPLETED' | 'CANCELLED';
    created_at: string;
  }>;
  pending_inquiries_count?: number;
}

export interface CustomerInquiry {
  id: number;
  inquiry_number: string;
  customer_name: string;
  customer_phone: string;
  target_date: string | null;
  items_summary: string;
  items_json: Array<{ name: string; price: number; qty: number }>;
  estimated_total: string | number;
  notes: string;
  status: 'PENDING' | 'CONFIRMED' | 'BAKING' | 'COMPLETED' | 'CANCELLED';
  converted_sale?: number | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerReview {
  id: number;
  customer_name: string;
  customer_location?: string;
  product_name?: string;
  rating: number;
  comment: string;
  is_approved: boolean;
  created_at: string;
}

export interface BusinessSettings {
  id?: number;
  business_name: string;
  tagline: string;
  currency_symbol: string;
  currency_code: string;
  contact_phone: string;
  contact_email: string;
  address: string;
  logo_path: string;
  default_reorder_level: string | number;
  default_minimum_stock: string | number;
  default_target_margin: string | number;
}

