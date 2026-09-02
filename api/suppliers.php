<?php

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}

$dataFile = __DIR__ . "/../data/suppliers.json";

// Ensure data directory exists
if (!is_dir(__DIR__ . "/../data")) {
    mkdir(__DIR__ . "/../data", 0777, true);
}

// Ensure data file exists
if (!file_exists($dataFile)) {
    file_put_contents($dataFile, json_encode([], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

function readSuppliers($file) {
    $content = file_get_contents($file);
    $data = json_decode($content, true);
    return is_array($data) ? $data : [];
}

function writeSuppliers($file, $data) {
    return file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
}

function response($success, $message, $data = [], $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode([
        "success" => $success,
        "message" => $message,
        "data" => $data
    ]);
    exit;
}

$method = $_SERVER["REQUEST_METHOD"];
$suppliers = readSuppliers($dataFile);

// Handle GET requests
if ($method === "GET") {
    $id = $_GET["id"] ?? null;
    if ($id) {
        foreach ($suppliers as $sup) {
            if ((string)$sup["id"] === (string)$id) {
                response(true, "Supplier fetched successfully", $sup);
            }
        }
        response(false, "Supplier not found", [], 404);
    }
    response(true, "Suppliers loaded successfully", $suppliers);
}

// Read raw JSON body
$rawInput = file_get_contents("php://input");
$input = json_decode($rawInput, true) ?? [];

$action = $input["action"] ?? "";

// Handle DELETE
if ($method === "DELETE" || $action === "delete") {
    $id = $input["id"] ?? $_GET["id"] ?? "";

    if (!$id) {
        response(false, "Supplier ID is required");
    }

    $filtered = [];
    $found = false;

    foreach ($suppliers as $sup) {
        if ((string)$sup["id"] === (string)$id) {
            $found = true;
            continue;
        }
        $filtered[] = $sup;
    }

    if (!$found) {
        response(false, "Supplier not found", [], 404);
    }

    if (!writeSuppliers($dataFile, $filtered)) {
        response(false, "Unable to delete supplier", [], 500);
    }

    response(true, "Supplier deleted successfully");
}

// Determine target data array for create/update
$supplierData = $input["supplier"] ?? $input;

// Handle UPDATE (PUT or action=update)
if ($method === "PUT" || $action === "update") {
    $id = $supplierData["id"] ?? "";

    if (!$id) {
        response(false, "Supplier ID is required");
    }

    $found = false;
    foreach ($suppliers as $index => $existing) {
        if ((string)$existing["id"] === (string)$id) {
            $found = true;

            $name = trim($supplierData["name"] ?? $existing["name"]);
            if ($name === "") {
                response(false, "Supplier name is required");
            }

            $email = trim($supplierData["email"] ?? $existing["email"] ?? "");
            if ($email !== "" && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                response(false, "Invalid email address");
            }

            $suppliers[$index] = [
                "id" => $existing["id"],
                "code" => $supplierData["code"] ?? $existing["code"] ?? $existing["supplier_code"] ?? "SUP0001",
                "name" => $name,
                "contact_person" => trim($supplierData["contact_person"] ?? $existing["contact_person"] ?? ""),
                "phone" => trim($supplierData["phone"] ?? $existing["phone"] ?? ""),
                "email" => $email,
                "address" => trim($supplierData["address"] ?? $existing["address"] ?? ""),
                "tax_number" => trim($supplierData["tax_number"] ?? $existing["tax_number"] ?? ""),
                "payment_terms" => trim($supplierData["payment_terms"] ?? $existing["payment_terms"] ?? "30 Days"),
                "group" => trim($supplierData["group"] ?? $supplierData["supplier_group"] ?? $existing["group"] ?? "General"),
                "status" => trim($supplierData["status"] ?? $existing["status"] ?? "Active"),
                "created_at" => $existing["created_at"] ?? date("Y-m-d H:i:s"),
                "updated_at" => date("Y-m-d H:i:s")
            ];
            break;
        }
    }

    if (!$found) {
        response(false, "Supplier not found", [], 404);
    }

    if (!writeSuppliers($dataFile, $suppliers)) {
        response(false, "Unable to update supplier", [], 500);
    }

    response(true, "Supplier updated successfully");
}

// Handle CREATE (POST or action=create)
if ($method === "POST" || $action === "create") {
    $name = trim($supplierData["name"] ?? "");

    if ($name === "") {
        response(false, "Supplier Name is required");
    }

    $email = trim($supplierData["email"] ?? "");
    if ($email !== "" && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        response(false, "Invalid email address");
    }

    // Generate numeric ID
    $maxId = 0;
    foreach ($suppliers as $sup) {
        $existingId = intval($sup["id"] ?? 0);
        if ($existingId > $maxId) {
            $maxId = $existingId;
        }
    }
    $newId = $maxId + 1;

    // Generate Code if missing
    $newCode = trim($supplierData["code"] ?? "");
    if ($newCode === "") {
        $maxCodeNumber = 0;
        foreach ($suppliers as $sup) {
            $code = $sup["code"] ?? $sup["supplier_code"] ?? "";
            if ($code !== "") {
                preg_match("/(\d+)$/", $code, $matches);
                if (!empty($matches[1])) {
                    $num = intval($matches[1]);
                    if ($num > $maxCodeNumber) {
                        $maxCodeNumber = $num;
                    }
                }
            }
        }
        $newCode = "SUP" . str_pad($maxCodeNumber + 1, 4, "0", STR_PAD_LEFT);
    }

    $newSupplier = [
        "id" => $newId,
        "code" => $newCode,
        "name" => $name,
        "contact_person" => trim($supplierData["contact_person"] ?? ""),
        "phone" => trim($supplierData["phone"] ?? ""),
        "email" => $email,
        "address" => trim($supplierData["address"] ?? ""),
        "tax_number" => trim($supplierData["tax_number"] ?? ""),
        "payment_terms" => trim($supplierData["payment_terms"] ?? "30 Days"),
        "group" => trim($supplierData["group"] ?? $supplierData["supplier_group"] ?? "General"),
        "status" => trim($supplierData["status"] ?? "Active"),
        "created_at" => date("Y-m-d H:i:s")
    ];

    $suppliers[] = $newSupplier;

    if (!writeSuppliers($dataFile, $suppliers)) {
        response(false, "Unable to save supplier", [], 500);
    }

    response(true, "Supplier created successfully", $newSupplier);
}

response(false, "Invalid request method or action", [], 400);
