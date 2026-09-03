-- ProcureX Procurement Management System - PostgreSQL Schema
-- Compatible with Railway PostgreSQL & Local PostgreSQL Database

DROP TABLE IF EXISTS purchase_orders CASCADE;
DROP TABLE IF EXISTS items CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- --------------------------------------------------------
-- Table structure for users
-- --------------------------------------------------------
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'User',
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------
-- Table structure for suppliers
-- --------------------------------------------------------
CREATE TABLE suppliers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    contact_person VARCHAR(100),
    email VARCHAR(150),
    phone VARCHAR(20),
    city VARCHAR(100),
    gstin VARCHAR(20),
    status VARCHAR(20) DEFAULT 'Active',
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------
-- Table structure for items
-- --------------------------------------------------------
CREATE TABLE items (
    id SERIAL PRIMARY KEY,
    item_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(100),
    unit VARCHAR(30),
    unit_price NUMERIC(12,2) DEFAULT 0,
    stock_quantity INTEGER DEFAULT 0,
    description TEXT,
    status VARCHAR(20) DEFAULT 'Active',
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------
-- Table structure for purchase_orders
-- --------------------------------------------------------
CREATE TABLE purchase_orders (
    id SERIAL PRIMARY KEY,
    po_number VARCHAR(50) UNIQUE NOT NULL,
    supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
    item_id INTEGER REFERENCES items(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(12,2) NOT NULL,
    gst_percent NUMERIC(5,2) DEFAULT 18,
    total_amount NUMERIC(14,2),
    status VARCHAR(20) DEFAULT 'Pending',
    delivery_date DATE,
    payment_terms VARCHAR(100),
    notes TEXT,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------
-- Sample Data Insertion
-- --------------------------------------------------------

-- 1 Admin user: admin@example.com / admin123 (bcrypt hashed)
INSERT INTO users (id, name, email, password, role) VALUES
(1, 'Administrator', 'admin@example.com', '$2y$10$wN1bV8Mv0z7mU9r6Q6xYy.5xG3GkL1A8W4Q7nZ.1mQ4A8Z6K1mQ4A', 'Admin');

SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));

-- 3 Sample Suppliers
INSERT INTO suppliers (id, name, contact_person, email, phone, city, gstin, status) VALUES
(1, 'Acme Logistics & Supplies Ltd', 'Robert Fox', 'contact@acmelogistics.com', '+91 98765 43210', 'Mumbai', '27AAACA12341Z5', 'Active'),
(2, 'Apex Industrial Materials', 'Jane Cooper', 'sales@apexim.com', '+91 98123 45678', 'Bengaluru', '29BBBCA98761Z2', 'Active'),
(3, 'Bluefinch Global Tech Solutions', 'Michael Scott', 'procurement@bluefinchtech.com', '+91 97111 22334', 'Delhi', '07CCCCA56781Z9', 'Active');

SELECT setval('suppliers_id_seq', (SELECT MAX(id) FROM suppliers));

-- 5 Sample Items
INSERT INTO items (id, item_code, name, category, unit, unit_price, stock_quantity, description, status) VALUES
(1, 'ITM-001', 'High Efficiency Electric Motor 5HP', 'Machinery', 'PCS', 12500.00, 45, 'Industrial grade 3-phase electric motor', 'Active'),
(2, 'ITM-002', 'Stainless Steel Hydraulic Valves', 'Hardware', 'BOX', 4500.00, 120, 'Heavy-duty pressure regulating hydraulic valves', 'Active'),
(3, 'ITM-003', 'Industrial Safety Helmets (Yellow)', 'Safety Equipment', 'PCS', 650.00, 300, 'ANSI certified safety hard hats', 'Active'),
(4, 'ITM-004', 'Synthetic Gear Lubricant Oil 20L', 'Chemicals', 'CAN', 3200.00, 80, 'High viscosity synthetic lubricant', 'Active'),
(5, 'ITM-005', 'Precision Digital Multimeter Pro', 'Electronics', 'SET', 2800.00, 60, 'True RMS digital multimeter with auto-ranging', 'Active');

SELECT setval('items_id_seq', (SELECT MAX(id) FROM items));

-- 5 Sample Purchase Orders
INSERT INTO purchase_orders (id, po_number, supplier_id, item_id, quantity, unit_price, gst_percent, total_amount, status, delivery_date, payment_terms, notes, created_by) VALUES
(1, 'PO-2026-001', 1, 1, 10, 12500.00, 18.00, 147500.00, 'Approved', '2026-09-15', 'Net 30 Days', 'Urgent order for production facility A', 1),
(2, 'PO-2026-002', 2, 2, 5, 4500.00, 18.00, 26550.00, 'Pending', '2026-09-20', 'Net 15 Days', 'Regular stock replenishment', 1),
(3, 'PO-2026-003', 3, 3, 50, 650.00, 18.00, 38350.00, 'Approved', '2026-09-10', 'Immediate Payment', 'Safety compliance requirement', 1),
(4, 'PO-2026-004', 1, 4, 15, 3200.00, 18.00, 56640.00, 'Rejected', '2026-09-05', 'Net 45 Days', 'Price negotiation pending', 1),
(5, 'PO-2026-005', 2, 5, 8, 2800.00, 18.00, 26432.00, 'Pending', '2026-09-25', 'Net 30 Days', 'Maintenance team equipment', 1);

SELECT setval('purchase_orders_id_seq', (SELECT MAX(id) FROM purchase_orders));
