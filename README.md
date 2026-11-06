# CRAVEABLES Business Management System

A modern, full-stack, responsive commercial bakery management application developed for **CRAVEABLES**. Built with **Python + Django REST Framework**, **PostgreSQL**, **React.js + TypeScript**, and **Tailwind CSS**.

---

## Quick Start (Windows)

Simply double-click:
```cmd
run_servers.bat
```
Or start each service manually:

### 1. Backend Server (Django REST Framework)
```bash
cd backend
venv\Scripts\activate
python manage.py migrate
python manage.py import_excel_data
python manage.py runserver 127.0.0.1:8000
```

### 2. Frontend Application (React + Vite)
```bash
cd frontend
npm run dev
```

Open your browser at: **`http://127.0.0.1:5173/`**

### Default Accounts
- **Admin**: `admin` / `admin123` (Full system access)
- **Staff**: `staff` / `staff123` (Operations only)

---

## Technology Stack

- **Backend**: Python 3.12, Django 5.1, Django REST Framework, Django ORM, Token Auth, ReportLab, OpenPyXL
- **Database**: PostgreSQL (with fallback to SQLite for local portable development)
- **Frontend**: React 19, TypeScript, Tailwind CSS, React Router 7, Lucide Icons, Canvas Confetti
- **Branding**: Official CRAVEABLES logo, badge, and artisanal bakery color palette:
  - Warm Cream (`#FFF9DF`)
  - Chocolate Brown (`#3B170B`)
  - Cookie Caramel (`#A97845`)
  - Soft Ivory (`#FFFDF5`)
  - Espresso Black (`#17110D`)
  - Warm Beige (`#E9D8B8`)

---

## 11 Complete Business Modules

1. **Dashboard**: Real-time sales, gross profit, operating overheads, net income, monthly trends chart, inventory value, and low-stock alerts.
2. **Inventory**: Real-time stock levels, reorder thresholds, low stock & out-of-stock badges, manual audits with reasons, audit history.
3. **Ingredients**: Ingredient master with pack sizes, baseline purchase costs, units (`g`, `kg`, `ml`, `L`, `pcs`), automated cost-per-unit.
4. **Recipe & Costing**: Automated recipe costing from live inventory prices, batch yields, packaging, kuryente, labor overheads, profit margins, recipe duplication.
5. **Production Management**: Batch production planner, interactive ingredient requirement & sufficiency checker, atomic stock deduction on confirmation.
6. **Products**: Product catalog with variations, selling prices, packaging options, and finished goods stock.
7. **Sales Management**: POS sales register, receipt number generation, payment methods (Cash, GCash, QR Ph, Bank Transfer), profit tracking, printable receipt view.
8. **Expense Management**: Operating overhead tracking (Electricity, Packaging, Shipping, Labor, Supplies) with proper accounting treatment.
9. **Suppliers & Purchasing**: Vendor directory, restocking purchase orders with automated inventory stock addition.
10. **Reports & Analytics**: P&L Statement, live multi-sheet Excel export (`.xlsx`), and formal PDF financial report (`.pdf`).
11. **Settings**: Bakery profile, default thresholds, official currency (₱), user roles, and data backup.

---

## Documentation

- [API Reference](file:///C:/Craveables%20Business%20App/documentation/API_DOCUMENTATION.md)
- [PostgreSQL & Database Setup](file:///C:/Craveables%20Business%20App/documentation/DATABASE_AND_POSTGRESQL_SETUP.md)
- [Excel Data Migration Report](file:///C:/Craveables%20Business%20App/documentation/EXCEL_MIGRATION_REPORT.md)
- [Deployment, Backup & PWA Guide](file:///C:/Craveables%20Business%20App/documentation/DEPLOYMENT_AND_BACKUP_GUIDE.md)
- [Testing & Business Scenarios](file:///C:/Craveables%20Business%20App/documentation/TESTING_AND_VERIFICATION_REPORT.md)

