const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '') + '/api';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('craveables_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Token ${token}`;
  }
  return headers;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    let errorMsg = `Error ${response.status}: ${response.statusText}`;
    try {
      const errorJson = await response.json();
      if (errorJson.detail) errorMsg = errorJson.detail;
      else if (typeof errorJson === 'object') errorMsg = JSON.stringify(errorJson);
    } catch {
      // fallback
    }
    throw new Error(errorMsg);
  }

  // Handle empty 204 response
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const api = {
  // Auth
  login: (credentials: { username: string; password: string }) =>
    request<{ token: string; user: any }>('/auth/login/', { method: 'POST', body: JSON.stringify(credentials) }),
  getCurrentUser: () => request<any>('/auth/user/'),
  getUsers: () => request<any[]>('/auth/users/'),
  createUser: (userData: any) => request<any>('/auth/users/', { method: 'POST', body: JSON.stringify(userData) }),
  changePassword: (data: { old_password?: string; new_password: string }) =>
    request<any>('/auth/change-password/', { method: 'POST', body: JSON.stringify(data) }),

  // Dashboard & Reports
  getDashboardStats: () => request<any>('/reports/dashboard-stats/'),
  getProfitLoss: (params?: { start_date?: string; end_date?: string }) => {
    const q = new URLSearchParams(params as any).toString();
    return request<any>(`/reports/profit-loss/${q ? `?${q}` : ''}`);
  },
  downloadExcelReportUrl: () => `${API_BASE}/reports/export/excel/`,
  downloadPdfReportUrl: () => `${API_BASE}/reports/export/pdf/`,

  // Inventory & Ingredients
  getIngredients: () => request<any[]>('/inventory/ingredients/'),
  getIngredient: (id: number) => request<any>(`/inventory/ingredients/${id}/`),
  createIngredient: (data: any) => request<any>('/inventory/ingredients/', { method: 'POST', body: JSON.stringify(data) }),
  updateIngredient: (id: number, data: any) => request<any>(`/inventory/ingredients/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteIngredient: (id: number) => request<void>(`/inventory/ingredients/${id}/`, { method: 'DELETE' }),
  adjustStock: (id: number, newStock: number, reason: string) =>
    request<any>(`/inventory/ingredients/${id}/adjust-stock/`, {
      method: 'POST',
      body: JSON.stringify({ new_stock: newStock, reason }),
    }),
  getLowStockAlerts: () => request<any[]>('/inventory/ingredients/low-stock/'),
  getRestockingList: () => request<any[]>('/inventory/ingredients/restocking-list/'),
  getStockTransactions: (ingredientId?: number) =>
    request<any[]>(`/inventory/transactions/${ingredientId ? `?ingredient=${ingredientId}` : ''}`),

  // Products & Categories
  getCategories: () => request<any[]>('/products/categories/'),
  createCategory: (data: any) => request<any>('/products/categories/', { method: 'POST', body: JSON.stringify(data) }),
  getProducts: () => request<any[]>('/products/products/'),
  createProduct: (data: any) => request<any>('/products/products/', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id: number, data: any) => request<any>(`/products/products/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProduct: (id: number) => request<void>(`/products/products/${id}/`, { method: 'DELETE' }),
  duplicateProduct: (id: number) => request<any>(`/products/products/${id}/duplicate/`, { method: 'POST' }),
  getVariants: (productId?: number) =>
    request<any[]>(`/products/variants/${productId ? `?product=${productId}` : ''}`),
  createVariant: (data: any) => request<any>('/products/variants/', { method: 'POST', body: JSON.stringify(data) }),
  updateVariant: (id: number, data: any) => request<any>(`/products/variants/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),

  // Costing & Recipes
  getRecipes: () => request<any[]>('/costing/recipes/'),
  getRecipe: (id: number) => request<any>(`/costing/recipes/${id}/`),
  createRecipe: (data: any) => request<any>('/costing/recipes/', { method: 'POST', body: JSON.stringify(data) }),
  updateRecipe: (id: number, data: any) => request<any>(`/costing/recipes/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteRecipe: (id: number) => request<void>(`/costing/recipes/${id}/`, { method: 'DELETE' }),
  duplicateRecipe: (id: number, targetVariantId: number) =>
    request<any>(`/costing/recipes/${id}/duplicate/`, { method: 'POST', body: JSON.stringify({ target_variant_id: targetVariantId }) }),
  getCostMatrix: () => request<any[]>('/costing/recipes/cost-matrix/'),
  getPackagingItems: () => request<any[]>('/costing/packaging-items/'),
  createPackagingItem: (data: any) => request<any>('/costing/packaging-items/', { method: 'POST', body: JSON.stringify(data) }),

  // Production
  getProductionOrders: () => request<any[]>('/production/orders/'),
  checkProductionRequirements: (recipeId: number, batchesCount: number) =>
    request<any>('/production/orders/check-requirements/', {
      method: 'POST',
      body: JSON.stringify({ recipe: recipeId, batches_count: batchesCount }),
    }),
  createProductionOrder: (data: any) => request<any>('/production/orders/', { method: 'POST', body: JSON.stringify(data) }),
  completeProductionOrder: (id: number, actualYield?: number) =>
    request<any>(`/production/orders/${id}/complete/`, {
      method: 'POST',
      body: JSON.stringify({ actual_yield: actualYield }),
    }),
  undoProductionOrder: (id: number) =>
    request<any>(`/production/orders/${id}/undo/`, { method: 'POST' }),
  deleteProductionOrder: (id: number) =>
    request<void>(`/production/orders/${id}/`, { method: 'DELETE' }),
  updateProductionOrder: (id: number, data: any) =>
    request<any>(`/production/orders/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Sales & Orders
  getSales: (params?: { start_date?: string; end_date?: string; payment_method?: string; search?: string }) => {
    const q = new URLSearchParams(params as any).toString();
    return request<any[]>(`/sales/orders/${q ? `?${q}` : ''}`);
  },
  createSale: (data: any) => request<any>('/sales/orders/', { method: 'POST', body: JSON.stringify(data) }),
  updateSaleOrder: (id: number, data: any) => request<any>(`/sales/orders/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteSaleOrder: (id: number) => request<void>(`/sales/orders/${id}/`, { method: 'DELETE' }),
  cancelSaleOrder: (id: number) => request<any>(`/sales/orders/${id}/cancel/`, { method: 'POST' }),
  getSalesSummary: () => request<any>('/sales/orders/summary/'),

  // Customer Inquiries & Pre-Orders
  getInquiries: () => request<any[]>('/sales/inquiries/'),
  createInquiry: (data: any) => request<any>('/sales/inquiries/', { method: 'POST', body: JSON.stringify(data) }),
  updateInquiry: (id: number, data: any) =>
    request<any>(`/sales/inquiries/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
  updateInquiryStatus: (id: number, status: string) =>
    request<any>(`/sales/inquiries/${id}/update-status/`, { method: 'POST', body: JSON.stringify({ status }) }),
  convertInquiryToSale: (id: number, data?: any) =>
    request<any>(`/sales/inquiries/${id}/convert-to-sale/`, { method: 'POST', body: JSON.stringify(data || {}) }),
  deleteInquiry: (id: number) => request<void>(`/sales/inquiries/${id}/`, { method: 'DELETE' }),

  // Customer Reviews & Feedback
  getReviews: (params?: { all?: boolean }) => {
    const q = params?.all ? '?all=true' : '';
    return request<any[]>(`/sales/reviews/${q}`);
  },
  createReview: (data: any) => request<any>('/sales/reviews/', { method: 'POST', body: JSON.stringify(data) }),
  approveReview: (id: number) => request<any>(`/sales/reviews/${id}/approve/`, { method: 'POST' }),
  rejectReview: (id: number) => request<any>(`/sales/reviews/${id}/reject/`, { method: 'POST' }),
  deleteReview: (id: number) => request<void>(`/sales/reviews/${id}/`, { method: 'DELETE' }),

  // Expenses
  getExpenses: (params?: { start_date?: string; end_date?: string; category?: string; search?: string }) => {
    const q = new URLSearchParams(params as any).toString();
    return request<any[]>(`/expenses/records/${q ? `?${q}` : ''}`);
  },
  createExpense: (data: any) => request<any>('/expenses/records/', { method: 'POST', body: JSON.stringify(data) }),
  updateExpense: (id: number, data: any) => request<any>(`/expenses/records/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteExpense: (id: number) => request<void>(`/expenses/records/${id}/`, { method: 'DELETE' }),
  getExpensesSummary: () => request<any>('/expenses/records/summary/'),

  // Suppliers & Purchasing
  getSuppliers: () => request<any[]>('/suppliers/suppliers/'),
  createSupplier: (data: any) => request<any>('/suppliers/suppliers/', { method: 'POST', body: JSON.stringify(data) }),
  updateSupplier: (id: number, data: any) => request<any>(`/suppliers/suppliers/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSupplier: (id: number) => request<void>(`/suppliers/suppliers/${id}/`, { method: 'DELETE' }),
  getPurchaseOrders: () => request<any[]>('/suppliers/purchase-orders/'),
  createPurchaseOrder: (data: any) => request<any>('/suppliers/purchase-orders/', { method: 'POST', body: JSON.stringify(data) }),

  // Settings
  getSettings: () => request<any>('/settings/general/'),
  updateSettings: (data: any) => request<any>('/settings/general/', { method: 'POST', body: JSON.stringify(data) }),
};

