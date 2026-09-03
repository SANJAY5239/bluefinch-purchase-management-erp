# ProcureX - Procurement Management ERP

ProcureX is a modern Procurement Management Web Application built with a **Vanilla JavaScript Frontend** (hosted on Vercel) and a **PHP 8 PDO Backend API** (hosted on Railway) connected to a **Railway PostgreSQL Database**.

---

## 🚀 Quick Deployment Guide

### STEP 1: PostgreSQL Setup on Railway
1. Sign up/Log in at [railway.app](https://railway.app) using your GitHub account.
2. Click **New Project** → **Add a Service** → **Database** → **PostgreSQL**.
3. Select the created PostgreSQL service, navigate to the **Connect** tab, and copy:
   - `PGHOST`
   - `PGPORT` (default `5432`)
   - `PGDATABASE`
   - `PGUSER`
   - `PGPASSWORD`
   - Or `DATABASE_URL`
4. Click on the **Query** tab inside Railway PostgreSQL, copy the entire contents of [`schema.sql`](file:///d:/bluefinch%20dashboard/schema.sql), paste it, and execute it to create all tables and insert sample seed data.

---

### STEP 2: PHP Backend Deployment on Railway
1. Push your repository to GitHub.
2. On Railway, click **New Project** → **Deploy from GitHub repo** → select your repository.
3. In the Railway Service settings, go to the **Variables** tab and add the environment variables copied from Step 1:
   ```env
   PGHOST=your_pg_host.railway.app
   PGPORT=5432
   PGDATABASE=railway
   PGUSER=postgres
   PGPASSWORD=your_pg_password
   ```
4. Railway will automatically build and deploy your PHP application using Apache/PHP.
5. Copy your live Railway public domain URL (e.g., `https://procurex-backend.up.railway.app/api.php`).

---

### STEP 3: Frontend Vercel Deployment
1. Open all frontend files inside `frontend/` (`login.html`, `register.html`, `home.html`, `purchase-orders.html`, `purchase-order-pdf.html`, `suppliers.html`, `items.html`, `sidebar.js`).
2. Update the API constant at the top of the frontend files with your live Railway URL:
   ```javascript
   const API = 'https://procurex-backend.up.railway.app/api.php';
   ```
3. Go to [vercel.com](https://vercel.com) → **Add New Project** → Import your GitHub repository.
4. Vercel will detect `vercel.json` and deploy your static frontend automatically.
5. Open your live Vercel application URL.

---

## 🔑 Default Login Credentials

- **Email**: `admin@example.com`
- **Password**: `admin123`
- **Role**: `Admin`

---

## 💻 Local Testing (XAMPP / Apache)

For local development without installing PostgreSQL locally:
1. Copy your Railway PostgreSQL credentials into `config.php` or set environment variables in your local environment.
2. Start **Apache** only in XAMPP (MySQL is not required).
3. Open `http://localhost/bluefinch%20dashboard/frontend/login.html` in your web browser.

---

## 🛠️ API Action Endpoints (`?action=`)

| Endpoint Action | Method | Description |
|---|---|---|
| `login` | `POST` | Authenticate user & return base64 session token |
| `register` | `POST` | Create new user account |
| `verify` | `POST` | Verify validity of token |
| `get_dashboard` | `GET` | Get real-time metric counts & totals |
| `get_orders` | `GET` | Get all active purchase orders with supplier/item details |
| `create_order` | `POST` | Create PO with auto PO number (`PO-YYYY-XXX`) |
| `update_order_status` | `POST` | Update PO status (`Pending`, `Approved`, `Rejected`) |
| `delete_order` | `POST` | Soft-delete purchase order by ID (Token Required) |
| `get_suppliers` | `GET` | List all active suppliers |
| `create_supplier` | `POST` | Register a new supplier |
| `delete_supplier` | `POST` | Soft-delete supplier by ID (Token Required) |
| `get_items` | `GET` | List inventory item catalog |
| `create_item` | `POST` | Register item with auto item code (`ITM-XXX`) |
| `delete_item` | `POST` | Soft-delete catalog item by ID (Token Required) |
