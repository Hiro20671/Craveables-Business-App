# CRAVEABLES Database Architecture & PostgreSQL Setup Guide

## 1. Relational Database Architecture

The CRAVEABLES Business Management System utilizes a normalized relational schema designed for business integrity, real-time inventory monitoring, and accounting separation.

```mermaid
erDiagram
    SUPPLIER ||--o{ INGREDIENT : supplies
    SUPPLIER ||--o{ PURCHASE_ORDER : receives
    PURCHASE_ORDER ||--|{ PURCHASE_ITEM : contains
    INGREDIENT ||--o{ PURCHASE_ITEM : "restocked in"
    INGREDIENT ||--o{ STOCK_TRANSACTION : tracks
    INGREDIENT ||--o{ RECIPE_INGREDIENT : "used in"

    CATEGORY ||--o{ PRODUCT : categorizes
    PRODUCT ||--|{ PRODUCT_VARIANT : has
    PRODUCT_VARIANT ||--o| RECIPE : costs
    RECIPE ||--|{ RECIPE_INGREDIENT : requires
    RECIPE ||--o{ RECIPE_PACKAGING : packages
    PACKAGING_ITEM ||--o{ RECIPE_PACKAGING : "specified in"

    RECIPE ||--o{ PRODUCTION_ORDER : produces
    PRODUCTION_ORDER ||--|{ PRODUCTION_INGREDIENT_USAGE : deducts
    INGREDIENT ||--o{ PRODUCTION_INGREDIENT_USAGE : consumed

    PRODUCT_VARIANT ||--o{ SALE_ITEM : sells
    SALE_ORDER ||--|{ SALE_ITEM : contains
    EXPENSE_CATEGORY ||--o{ EXPENSE : classifies
```

---

## 2. PostgreSQL Configuration

The application is fully configured for PostgreSQL using `psycopg2-binary` and Django's PostgreSQL engine.

### Environment Configuration (`backend/.env`)

To connect to an active PostgreSQL database, set:

```ini
DJANGO_SECRET_KEY=craveables-secret-key-production-ready-2026
DJANGO_DEBUG=False
ALLOWED_HOSTS=*

# Database Connection
DB_ENGINE=postgresql
DB_NAME=craveables_db
DB_USER=postgres
DB_PASSWORD=your_secure_password
DB_HOST=localhost
DB_PORT=5432
```

### PostgreSQL Database Creation

Run the following SQL commands in PostgreSQL (via `psql` or pgAdmin):

```sql
CREATE DATABASE craveables_db;
CREATE USER craveables_user WITH PASSWORD 'your_secure_password';
ALTER ROLE craveables_user SET client_encoding TO 'utf8';
ALTER ROLE craveables_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE craveables_user SET timezone TO 'Asia/Manila';
GRANT ALL PRIVILEGES ON DATABASE craveables_db TO craveables_user;
```

Then run migrations:

```bash
cd backend
python manage.py migrate
python manage.py import_excel_data
```

---

## 3. Docker Compose for PostgreSQL

For containerized PostgreSQL deployment, use `docker-compose.yml`:

```yaml
version: '3.8'

services:
  db:
    image: postgres:16-alpine
    container_name: craveables_postgres
    restart: always
    environment:
      POSTGRES_DB: craveables_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgrespassword
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

---

## 4. Automatic Development Fallback

If PostgreSQL is not running locally, the application automatically uses an optimized SQLite database (`backend/db.sqlite3`), allowing zero-configuration local runs, automated tests, and offline development without breaking dependencies.

