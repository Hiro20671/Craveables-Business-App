# CRAVEABLES Business Management System
## RESTful API Documentation

### Base URL
- Local Development: `http://127.0.0.1:8000/api`
- Frontend Proxy: `http://127.0.0.1:5173/api`

### Authentication
Authentication is token-based via Django REST Framework `TokenAuthentication` or `SessionAuthentication`.
Header format:
```http
Authorization: Token <your_token_key>
```

---

## 1. Authentication (`/api/auth/`)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/login/` | User login (accepts `username`, `password`), returns token & user profile |
| `GET` | `/api/auth/user/` | Get current authenticated user details |
| `GET` | `/api/auth/users/` | List all users with assigned roles |
| `POST` | `/api/auth/users/` | Create a new user (`ADMIN`, `STAFF`, `VIEWER`) |

---

## 2. Inventory & Ingredients (`/api/inventory/`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/inventory/ingredients/` | List all ingredients with stock values & statuses |
| `POST` | `/api/inventory/ingredients/` | Create new ingredient |
| `GET` | `/api/inventory/ingredients/{id}/` | Get single ingredient details |
| `PUT` | `/api/inventory/ingredients/{id}/` | Update ingredient details & pricing |
| `DELETE`| `/api/inventory/ingredients/{id}/` | Delete ingredient record |
| `POST` | `/api/inventory/ingredients/{id}/adjust-stock/` | Manual stock adjustment with audit reason |
| `GET` | `/api/inventory/ingredients/low-stock/` | Filter ingredients currently Low or Out of Stock |
| `GET` | `/api/inventory/ingredients/restocking-list/` | Automated restocking list with required quantities |
| `GET` | `/api/inventory/transactions/` | Complete inventory movement audit trail |

---

## 3. Products & Variants (`/api/products/`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/products/categories/` | List product categories |
| `POST` | `/api/products/categories/` | Create new product category |
| `GET` | `/api/products/products/` | List all products with their variants |
| `POST` | `/api/products/products/` | Create new product |
| `POST` | `/api/products/products/{id}/duplicate/` | Duplicate product and its packaging variants |
| `GET` | `/api/products/variants/` | List all product variants |
| `POST` | `/api/products/variants/` | Add variant to product |

---

## 4. Recipe & Costing (`/api/costing/`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/costing/recipes/` | List all recipes with live automated unit costs |
| `POST` | `/api/costing/recipes/` | Create recipe with ingredients & overheads |
| `GET` | `/api/costing/recipes/{id}/` | Get recipe detail breakdown |
| `PUT` | `/api/costing/recipes/{id}/` | Update recipe ingredients and overhead costs |
| `POST` | `/api/costing/recipes/{id}/duplicate/` | Duplicate recipe to another variant |
| `GET` | `/api/costing/recipes/cost-matrix/` | Side-by-side cost & profit comparison across items |
| `GET` | `/api/costing/packaging-items/` | List standard packaging items |

---

## 5. Production Management (`/api/production/`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/production/orders/` | List production runs & batch history |
| `POST` | `/api/production/orders/check-requirements/` | Check stock sufficiency before baking |
| `POST` | `/api/production/orders/` | Create production run (`PLANNED` or `COMPLETED`) |
| `POST` | `/api/production/orders/{id}/complete/` | Complete production and atomically deduct ingredients |

---

## 6. Sales Management (`/api/sales/`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/sales/orders/` | List sales with filter by date & payment method |
| `POST` | `/api/sales/orders/` | Record new sale with receipt generation |
| `GET` | `/api/sales/orders/summary/` | Aggregate sales metrics (revenue, gross profit, units) |

---

## 7. Expense Management (`/api/expenses/`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/expenses/records/` | List operating expenses |
| `POST` | `/api/expenses/records/` | Record new operating overhead |
| `DELETE`| `/api/expenses/records/{id}/` | Delete expense record |
| `GET` | `/api/expenses/records/summary/` | Category breakdown & monthly totals |

---

## 8. Suppliers & Purchasing (`/api/suppliers/`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/suppliers/suppliers/` | List vendors and contact details |
| `POST` | `/api/suppliers/suppliers/` | Add new supplier |
| `GET` | `/api/suppliers/purchase-orders/` | List purchase orders |
| `POST` | `/api/suppliers/purchase-orders/` | Record purchase order & automatically restock inventory |

---

## 9. Reports & Exports (`/api/reports/`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/reports/dashboard-stats/` | Real-time KPI summary, monthly trends, best sellers |
| `GET` | `/api/reports/profit-loss/` | Complete P&L Statement (Revenue, COGS, Gross Margin, Net Income) |
| `GET` | `/api/reports/export/excel/` | Live multi-sheet Excel workbook export (`.xlsx`) |
| `GET` | `/api/reports/export/pdf/` | Live formal PDF financial & inventory report (`.pdf`) |

---

## 10. Settings (`/api/settings/`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/settings/general/` | Retrieve current business configuration |
| `POST` | `/api/settings/general/` | Update business profile, thresholds, and currency |

