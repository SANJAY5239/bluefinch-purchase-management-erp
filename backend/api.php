<?php
/*
===================================================================
POSTGRESQL SETUP ON RAILWAY:
1. Go to railway.app -> Login with GitHub
2. New Project -> Add a Service -> Database -> PostgreSQL
3. Click PostgreSQL service -> Connect tab -> copy:
   PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD
4. Go to Query tab -> paste and run schema.sql to create tables
5. Deploy PHP backend:
   - New Project -> Deploy from GitHub repo
   - Add service -> select your repo
   - Set environment variables:
     PGHOST=xxx PGPORT=5432 PGDATABASE=xxx PGUSER=xxx PGPASSWORD=xxx
   - Railway auto-deploys with Apache + PHP
6. Copy Railway backend URL -> paste in all frontend HTML files as API const
7. Push frontend to GitHub -> Vercel auto-deploys
8. Test: open Vercel URL -> login with admin@example.com / admin123
===================================================================
*/

// Set CORS Headers for cross-origin Vercel requests
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

// Handle OPTIONS Preflight Requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Include PostgreSQL Database Configuration
require_once __DIR__ . '/../config.php';

// Helper function to send uniform JSON responses
function sendJsonResponse($success, $message, $data = null, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode([
        'success' => (bool)$success,
        'message' => (string)$message,
        'data'    => $data
    ]);
    exit();
}

// Token helper functions (Base64 JWT-style token format)
function generateToken($user) {
    $payload = [
        'id'    => $user['id'],
        'name'  => $user['name'],
        'email' => $user['email'],
        'role'  => $user['role'] ?? 'User',
        'iat'   => time(),
        'exp'   => time() + (86400 * 7) // 7 days expiration
    ];
    return base64_encode(json_encode($payload));
}

function getBearerToken() {
    $headers = null;
    if (isset($_SERVER['Authorization'])) {
        $headers = trim($_SERVER["Authorization"]);
    } else if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $headers = trim($_SERVER["HTTP_AUTHORIZATION"]);
    } else if (function_exists('apache_request_headers')) {
        $requestHeaders = apache_request_headers();
        $requestHeaders = array_combine(array_map('ucwords', array_keys($requestHeaders)), array_values($requestHeaders));
        if (isset($requestHeaders['Authorization'])) {
            $headers = trim($requestHeaders['Authorization']);
        }
    }

    if (!empty($headers)) {
        if (preg_match('/Bearer\s(\S+)/i', $headers, $matches)) {
            return $matches[1];
        }
    }
    return null;
}

function verifyToken() {
    $token = getBearerToken();
    if (!$token) {
        // Fallback: check JSON payload if token field is provided
        $input = json_decode(file_get_contents('php://input'), true);
        $token = $input['token'] ?? ($_REQUEST['token'] ?? null);
    }

    if (!$token) {
        return false;
    }

    $decoded = json_decode(base64_decode($token), true);
    if (!$decoded || !isset($decoded['id'])) {
        return false;
    }

    if (isset($decoded['exp']) && $decoded['exp'] < time()) {
        return false;
    }

    return $decoded;
}

// Require Token authentication for sensitive endpoints
function requireAuth() {
    $user = verifyToken();
    if (!$user) {
        sendJsonResponse(false, 'Unauthorized access. Valid token required.', null, 401);
    }
    return $user;
}

// Parse request payload
$action = $_GET['action'] ?? ($_POST['action'] ?? null);
$rawInput = file_get_contents('php://input');
$inputData = json_decode($rawInput, true) ?? [];

if (!$action && isset($inputData['action'])) {
    $action = $inputData['action'];
}

// Merge JSON input into $_POST for standard field access
if (is_array($inputData)) {
    $_POST = array_merge($_POST, $inputData);
}

try {
    $pdo = getDbConnection();
} catch (Exception $e) {
    sendJsonResponse(false, 'PostgreSQL Database Connection Error: ' . $e->getMessage(), null, 500);
}

// Router dispatch by action
switch ($action) {

    // -----------------------------------------------------------------
    // REGISTER USER
    // -----------------------------------------------------------------
    case 'register':
        $name     = trim($_POST['name'] ?? '');
        $email    = trim($_POST['email'] ?? '');
        $password = $_POST['password'] ?? '';
        $role     = trim($_POST['role'] ?? 'User');

        if (empty($name) || empty($email) || empty($password)) {
            sendJsonResponse(false, 'Name, email and password are required fields.', null, 400);
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            sendJsonResponse(false, 'Invalid email address format.', null, 400);
        }

        // Check if email exists
        $stmt = $pdo->prepare("SELECT id FROM users WHERE email = :email AND is_deleted = false");
        $stmt->execute([':email' => $email]);
        if ($stmt->fetch()) {
            sendJsonResponse(false, 'Email address is already registered.', null, 400);
        }

        $hashedPassword = password_hash($password, PASSWORD_BCRYPT);

        $stmt = $pdo->prepare("INSERT INTO users (name, email, password, role) VALUES (:name, :email, :password, :role) RETURNING id");
        $stmt->execute([
            ':name'     => $name,
            ':email'    => $email,
            ':password' => $hashedPassword,
            ':role'     => $role
        ]);
        $newUserId = $stmt->fetchColumn();

        if ($newUserId) {
            $user = [
                'id'    => $newUserId,
                'name'  => $name,
                'email' => $email,
                'role'  => $role
            ];
            sendJsonResponse(true, 'User registered successfully!', $user, 201);
        } else {
            sendJsonResponse(false, 'Failed to register user.', null, 500);
        }
        break;

    // -----------------------------------------------------------------
    // LOGIN USER
    // -----------------------------------------------------------------
    case 'login':
        $email    = trim($_POST['email'] ?? '');
        $password = $_POST['password'] ?? '';

        if (empty($email) || empty($password)) {
            sendJsonResponse(false, 'Email and password are required.', null, 400);
        }

        $stmt = $pdo->prepare("SELECT * FROM users WHERE email = :email AND is_deleted = false");
        $stmt->execute([':email' => $email]);
        $user = $stmt->fetch();

        $isPasswordValid = false;
        if ($user) {
            if (password_verify($password, $user['password'])) {
                $isPasswordValid = true;
            } else if ($email === 'admin@example.com' && $password === 'admin123') {
                // Fallback for default seed admin password
                $isPasswordValid = true;
            }
        }

        if (!$user || !$isPasswordValid) {
            sendJsonResponse(false, 'Invalid email address or password.', null, 401);
        }

        $userPayload = [
            'id'    => $user['id'],
            'name'  => $user['name'],
            'email' => $user['email'],
            'role'  => $user['role']
        ];
        $token = generateToken($userPayload);

        sendJsonResponse(true, 'Login successful!', [
            'token' => $token,
            'user'  => $userPayload
        ]);
        break;

    // -----------------------------------------------------------------
    // VERIFY TOKEN
    // -----------------------------------------------------------------
    case 'verify':
        $user = verifyToken();
        if ($user) {
            sendJsonResponse(true, 'Token is valid.', ['user' => $user]);
        } else {
            sendJsonResponse(false, 'Token is invalid or expired.', null, 401);
        }
        break;

    // -----------------------------------------------------------------
    // GET DASHBOARD COUNTS
    // -----------------------------------------------------------------
    case 'get_dashboard':
        $stmtTotal = $pdo->query("SELECT COUNT(*) AS count FROM purchase_orders WHERE is_deleted = false");
        $totalOrders = (int)$stmtTotal->fetch()['count'];

        $stmtApproved = $pdo->query("SELECT COUNT(*) AS count FROM purchase_orders WHERE status = 'Approved' AND is_deleted = false");
        $approvedOrders = (int)$stmtApproved->fetch()['count'];

        $stmtPending = $pdo->query("SELECT COUNT(*) AS count FROM purchase_orders WHERE status = 'Pending' AND is_deleted = false");
        $pendingOrders = (int)$stmtPending->fetch()['count'];

        $stmtRejected = $pdo->query("SELECT COUNT(*) AS count FROM purchase_orders WHERE status = 'Rejected' AND is_deleted = false");
        $rejectedOrders = (int)$stmtRejected->fetch()['count'];

        $stmtSuppliers = $pdo->query("SELECT COUNT(*) AS count FROM suppliers WHERE is_deleted = false");
        $totalSuppliers = (int)$stmtSuppliers->fetch()['count'];

        $stmtItems = $pdo->query("SELECT COUNT(*) AS count FROM items WHERE is_deleted = false");
        $totalItems = (int)$stmtItems->fetch()['count'];

        $stmtValue = $pdo->query("SELECT SUM(total_amount) AS total_val FROM purchase_orders WHERE is_deleted = false");
        $totalValue = (float)($stmtValue->fetch()['total_val'] ?? 0.00);

        sendJsonResponse(true, 'Dashboard stats retrieved.', [
            'total_orders'    => $totalOrders,
            'approved_orders' => $approvedOrders,
            'pending_orders'  => $pendingOrders,
            'rejected_orders' => $rejectedOrders,
            'suppliers_count' => $totalSuppliers,
            'items_count'     => $totalItems,
            'total'           => $totalOrders,
            'approved'        => $approvedOrders,
            'pending'         => $pendingOrders,
            'rejected'        => $rejectedOrders,
            'suppliers'       => $totalSuppliers,
            'draft'           => 0,
            'completed'       => $approvedOrders,
            'total_value'     => $totalValue
        ]);
        break;

    // -----------------------------------------------------------------
    // GET PURCHASE ORDERS
    // -----------------------------------------------------------------
    case 'get_orders':
        $sql = "SELECT po.*, 
                       s.name AS supplier_name, 
                       s.email AS supplier_email,
                       s.phone AS supplier_phone,
                       s.city AS supplier_city,
                       s.gstin AS supplier_gstin,
                       i.name AS item_name, 
                       i.item_code,
                       u.name AS created_by_name
                FROM purchase_orders po
                LEFT JOIN suppliers s ON po.supplier_id = s.id
                LEFT JOIN items i ON po.item_id = i.id
                LEFT JOIN users u ON po.created_by = u.id
                WHERE po.is_deleted = false
                ORDER BY po.id DESC";

        $stmt = $pdo->query($sql);
        $orders = $stmt->fetchAll();

        sendJsonResponse(true, 'Purchase orders retrieved.', $orders);
        break;

    // -----------------------------------------------------------------
    // CREATE PURCHASE ORDER (Auto PO Format PO-YYYY-XXX)
    // -----------------------------------------------------------------
    case 'create_order':
        $user = verifyToken();
        $createdBy = $user['id'] ?? 1;

        $supplierId   = (int)($_POST['supplier_id'] ?? 0);
        $itemId       = (int)($_POST['item_id'] ?? 0);
        $quantity     = (int)($_POST['quantity'] ?? 1);
        $unitPrice    = (float)($_POST['unit_price'] ?? 0);
        $gstPercent   = (float)($_POST['gst_percent'] ?? 18.00);
        $deliveryDate = $_POST['delivery_date'] ?? date('Y-m-d', strtotime('+7 days'));
        $paymentTerms = trim($_POST['payment_terms'] ?? 'Net 30 Days');
        $notes        = trim($_POST['notes'] ?? '');

        if ($supplierId <= 0 || $itemId <= 0 || $quantity <= 0) {
            sendJsonResponse(false, 'Valid supplier, item, and quantity are required.', null, 400);
        }

        // Fetch unit price from item if not provided
        if ($unitPrice <= 0) {
            $itemStmt = $pdo->prepare("SELECT unit_price FROM items WHERE id = :id");
            $itemStmt->execute([':id' => $itemId]);
            $item = $itemStmt->fetch();
            if ($item) {
                $unitPrice = (float)$item['unit_price'];
            }
        }

        // Calculate total amount with GST: (quantity * unit_price) + GST amount
        $subtotal = $quantity * $unitPrice;
        $gstAmount = $subtotal * ($gstPercent / 100);
        $totalAmount = $subtotal + $gstAmount;

        // Auto-generate PO number format PO-YYYY-XXX (e.g. PO-2026-001)
        if (isset($_POST['po_number']) && !empty($_POST['po_number'])) {
            $poNumber = trim($_POST['po_number']);
        } else {
            $countStmt = $pdo->query("SELECT COUNT(*) FROM purchase_orders");
            $nextSeq = ((int)$countStmt->fetchColumn()) + 1;
            $poNumber = 'PO-' . date('Y') . '-' . str_pad($nextSeq, 3, '0', STR_PAD_LEFT);
        }

        $pdo->beginTransaction();

        try {
            $stmt = $pdo->prepare("INSERT INTO purchase_orders 
                (po_number, supplier_id, item_id, quantity, unit_price, gst_percent, total_amount, status, delivery_date, payment_terms, notes, created_by)
                VALUES 
                (:po_number, :supplier_id, :item_id, :quantity, :unit_price, :gst_percent, :total_amount, 'Pending', :delivery_date, :payment_terms, :notes, :created_by)
                RETURNING id");

            $stmt->execute([
                ':po_number'    => $poNumber,
                ':supplier_id'  => $supplierId,
                ':item_id'      => $itemId,
                ':quantity'     => $quantity,
                ':unit_price'   => $unitPrice,
                ':gst_percent'  => $gstPercent,
                ':total_amount' => $totalAmount,
                ':delivery_date'=> $deliveryDate,
                ':payment_terms'=> $paymentTerms,
                ':notes'        => $notes,
                ':created_by'   => $createdBy
            ]);

            $orderId = $stmt->fetchColumn();
            $pdo->commit();

            sendJsonResponse(true, 'Purchase order created successfully!', [
                'id'          => $orderId,
                'po_number'   => $poNumber,
                'total_amount'=> $totalAmount
            ], 201);

        } catch (Exception $e) {
            $pdo->rollBack();
            sendJsonResponse(false, 'Failed to create purchase order: ' . $e->getMessage(), null, 500);
        }
        break;

    // -----------------------------------------------------------------
    // UPDATE ORDER STATUS (action: update_order_status or update_order)
    // -----------------------------------------------------------------
    case 'update_order_status':
    case 'update_order':
        $id     = (int)($_POST['id'] ?? ($_POST['po_id'] ?? 0));
        $status = trim($_POST['status'] ?? '');

        $validStatuses = ['Pending', 'Approved', 'Rejected', 'Completed', 'Draft'];

        if ($id <= 0 || !in_array($status, $validStatuses)) {
            sendJsonResponse(false, 'Valid order ID and status (Pending/Approved/Rejected) are required.', null, 400);
        }

        $stmt = $pdo->prepare("UPDATE purchase_orders SET status = :status WHERE id = :id AND is_deleted = false");
        $success = $stmt->execute([':status' => $status, ':id' => $id]);

        if ($success) {
            sendJsonResponse(true, "Purchase order #{$id} status updated to '{$status}'.");
        } else {
            sendJsonResponse(false, 'Failed to update purchase order status.', null, 500);
        }
        break;

    // -----------------------------------------------------------------
    // DELETE PURCHASE ORDER (Soft Delete, Token Verified)
    // -----------------------------------------------------------------
    case 'delete_order':
        requireAuth();

        $id = (int)($_POST['id'] ?? ($_POST['po_id'] ?? 0));
        if ($id <= 0) {
            sendJsonResponse(false, 'Valid Purchase Order ID required.', null, 400);
        }

        $stmt = $pdo->prepare("UPDATE purchase_orders SET is_deleted = true WHERE id = :id");
        $success = $stmt->execute([':id' => $id]);

        if ($success) {
            sendJsonResponse(true, 'Purchase order deleted successfully.');
        } else {
            sendJsonResponse(false, 'Failed to delete purchase order.', null, 500);
        }
        break;

    // -----------------------------------------------------------------
    // GET SUPPLIERS
    // -----------------------------------------------------------------
    case 'get_suppliers':
        $stmt = $pdo->query("SELECT * FROM suppliers WHERE is_deleted = false ORDER BY id DESC");
        $suppliers = $stmt->fetchAll();
        sendJsonResponse(true, 'Suppliers list retrieved.', $suppliers);
        break;

    // -----------------------------------------------------------------
    // CREATE SUPPLIER
    // -----------------------------------------------------------------
    case 'create_supplier':
        $name          = trim($_POST['name'] ?? '');
        $contactPerson = trim($_POST['contact_person'] ?? '');
        $email         = trim($_POST['email'] ?? '');
        $phone         = trim($_POST['phone'] ?? '');
        $city          = trim($_POST['city'] ?? '');
        $gstin         = trim($_POST['gstin'] ?? '');
        $status        = trim($_POST['status'] ?? 'Active');

        if (empty($name) || empty($email)) {
            sendJsonResponse(false, 'Supplier name and email are required.', null, 400);
        }

        $stmt = $pdo->prepare("INSERT INTO suppliers (name, contact_person, email, phone, city, gstin, status) 
                               VALUES (:name, :contact_person, :email, :phone, :city, :gstin, :status) RETURNING id");

        $stmt->execute([
            ':name'           => $name,
            ':contact_person' => $contactPerson,
            ':email'          => $email,
            ':phone'          => $phone,
            ':city'           => $city,
            ':gstin'          => $gstin,
            ':status'         => $status
        ]);
        $supplierId = $stmt->fetchColumn();

        if ($supplierId) {
            sendJsonResponse(true, 'Supplier created successfully!', [
                'id'   => $supplierId,
                'name' => $name
            ], 201);
        } else {
            sendJsonResponse(false, 'Failed to create supplier.', null, 500);
        }
        break;

    // -----------------------------------------------------------------
    // DELETE SUPPLIER (Soft Delete, Token Verified)
    // -----------------------------------------------------------------
    case 'delete_supplier':
        requireAuth();

        $id = (int)($_POST['id'] ?? 0);
        if ($id <= 0) {
            sendJsonResponse(false, 'Valid Supplier ID required.', null, 400);
        }

        $stmt = $pdo->prepare("UPDATE suppliers SET is_deleted = true WHERE id = :id");
        $success = $stmt->execute([':id' => $id]);

        if ($success) {
            sendJsonResponse(true, 'Supplier deleted successfully.');
        } else {
            sendJsonResponse(false, 'Failed to delete supplier.', null, 500);
        }
        break;

    // -----------------------------------------------------------------
    // GET ITEMS
    // -----------------------------------------------------------------
    case 'get_items':
        $stmt = $pdo->query("SELECT * FROM items WHERE is_deleted = false ORDER BY id DESC");
        $items = $stmt->fetchAll();
        sendJsonResponse(true, 'Items catalog retrieved.', $items);
        break;

    // -----------------------------------------------------------------
    // CREATE ITEM (Auto Item Code Format ITM-XXX)
    // -----------------------------------------------------------------
    case 'create_item':
        if (isset($_POST['item_code']) && !empty($_POST['item_code'])) {
            $itemCode = trim($_POST['item_code']);
        } else {
            $countStmt = $pdo->query("SELECT COUNT(*) FROM items");
            $nextSeq = ((int)$countStmt->fetchColumn()) + 1;
            $itemCode = 'ITM-' . str_pad($nextSeq, 3, '0', STR_PAD_LEFT);
        }

        $name          = trim($_POST['name'] ?? '');
        $category      = trim($_POST['category'] ?? 'General');
        $unit          = trim($_POST['unit'] ?? 'PCS');
        $unitPrice     = (float)($_POST['unit_price'] ?? 0.00);
        $stockQuantity = (int)($_POST['stock_quantity'] ?? 0);
        $description   = trim($_POST['description'] ?? '');
        $status        = trim($_POST['status'] ?? 'Active');

        if (empty($name) || $unitPrice <= 0) {
            sendJsonResponse(false, 'Item name and valid unit price are required.', null, 400);
        }

        $stmt = $pdo->prepare("INSERT INTO items (item_code, name, category, unit, unit_price, stock_quantity, description, status) 
                               VALUES (:item_code, :name, :category, :unit, :unit_price, :stock_quantity, :description, :status) RETURNING id");

        $stmt->execute([
            ':item_code'      => $itemCode,
            ':name'           => $name,
            ':category'       => $category,
            ':unit'           => $unit,
            ':unit_price'     => $unitPrice,
            ':stock_quantity' => $stockQuantity,
            ':description'    => $description,
            ':status'         => $status
        ]);
        $itemId = $stmt->fetchColumn();

        if ($itemId) {
            sendJsonResponse(true, 'Item created successfully!', [
                'id'        => $itemId,
                'item_code' => $itemCode,
                'name'      => $name
            ], 201);
        } else {
            sendJsonResponse(false, 'Failed to create item.', null, 500);
        }
        break;

    // -----------------------------------------------------------------
    // DELETE ITEM (Soft Delete, Token Verified)
    // -----------------------------------------------------------------
    case 'delete_item':
        requireAuth();

        $id = (int)($_POST['id'] ?? 0);
        if ($id <= 0) {
            sendJsonResponse(false, 'Valid Item ID required.', null, 400);
        }

        $stmt = $pdo->prepare("UPDATE items SET is_deleted = true WHERE id = :id");
        $success = $stmt->execute([':id' => $id]);

        if ($success) {
            sendJsonResponse(true, 'Item deleted successfully.');
        } else {
            sendJsonResponse(false, 'Failed to delete item.', null, 500);
        }
        break;

    // -----------------------------------------------------------------
    // DEFAULT ROUTE
    // -----------------------------------------------------------------
    default:
        sendJsonResponse(false, 'Action not specified or endpoint not found.', [
            'available_actions' => [
                'register', 'login', 'verify', 'get_orders', 'create_order', 
                'update_order_status', 'update_order', 'delete_order', 'get_suppliers', 
                'create_supplier', 'delete_supplier', 'get_items', 'create_item', 
                'delete_item', 'get_dashboard'
            ]
        ], 400);
        break;
}
?>
