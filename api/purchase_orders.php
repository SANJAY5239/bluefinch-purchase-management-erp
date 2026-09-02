<?php

require_once __DIR__ . "/../config/config.php";

// Standard CORS headers
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}

$filename = "purchase_orders.json";
$orders = readJsonFile($filename);
$method = $_SERVER["REQUEST_METHOD"];

/* =========================================================
   GET
========================================================= */
if ($method === "GET") {
    if (isset($_GET["id"])) {
        $index = findIndex($orders, $_GET["id"]);

        if ($index < 0) {
            jsonResponse(false, [], "Purchase order not found.", 404);
        }

        jsonResponse(true, $orders[$index]);
    }

    $search = strtolower(trim($_GET["search"] ?? ""));

    if ($search !== "") {
        $orders = array_values(
            array_filter($orders, function($order) use ($search) {
                return strpos(strtolower(json_encode($order)), $search) !== false;
            })
        );
    }

    jsonResponse(true, $orders);
}

/* =========================================================
   POST
========================================================= */
if ($method === "POST") {
    $data = getJsonInput();

    // Fallbacks for header fields
    $data["po_date"] = !empty($data["po_date"]) ? trim($data["po_date"]) : date("Y-m-d");
    $data["expected_delivery_date"] = !empty($data["expected_delivery_date"]) ? trim($data["expected_delivery_date"]) : date("Y-m-d", strtotime("+7 days"));
    $data["payment_terms"] = !empty($data["payment_terms"]) ? trim($data["payment_terms"]) : "30 Days";
    $data["delivery_location"] = !empty($data["delivery_location"]) ? trim($data["delivery_location"]) : "Main Warehouse";
    $data["status"] = !empty($data["status"]) ? trim($data["status"]) : "Draft";

    validateRequired(
        $data,
        [
            "po_date",
            "supplier_id",
            "expected_delivery_date",
            "status"
        ]
    );

    if (!isset($data["items"]) || !is_array($data["items"]) || count($data["items"]) === 0) {
        jsonResponse(false, [], "At least one item is required.", 422);
    }

    foreach ($data["items"] as $item) {
        if (empty($item["item_id"]) || floatval($item["quantity"] ?? 0) <= 0) {
            jsonResponse(false, [], "Each item must have a valid item ID and quantity.", 422);
        }
    }

    $ids = array_column($orders, "id");
    $data["id"] = count($ids) ? max($ids) + 1 : 1;

    $data["po_number"] = !empty($data["po_number"]) ? trim($data["po_number"]) : generateCode($orders, "po_number", "PO");
    $data["created_by"] = $data["created_by"] ?? "Admin";
    $data["created_at"] = date("Y-m-d H:i:s");

    $orders[] = $data;

    writeJsonFile($filename, $orders);

    jsonResponse(true, $data, "Purchase order created successfully.");
}

/* =========================================================
   PUT
========================================================= */
if ($method === "PUT") {
    $data = getJsonInput();

    if (!isset($data["id"])) {
        jsonResponse(false, [], "Purchase order ID required.", 422);
    }

    $index = findIndex($orders, $data["id"]);

    if ($index < 0) {
        jsonResponse(false, [], "Purchase order not found.", 404);
    }

    $data["po_date"] = !empty($data["po_date"]) ? trim($data["po_date"]) : ($orders[$index]["po_date"] ?? date("Y-m-d"));
    $data["expected_delivery_date"] = !empty($data["expected_delivery_date"]) ? trim($data["expected_delivery_date"]) : ($orders[$index]["expected_delivery_date"] ?? date("Y-m-d"));
    $data["payment_terms"] = !empty($data["payment_terms"]) ? trim($data["payment_terms"]) : ($orders[$index]["payment_terms"] ?? "30 Days");
    $data["delivery_location"] = !empty($data["delivery_location"]) ? trim($data["delivery_location"]) : ($orders[$index]["delivery_location"] ?? "Main Warehouse");
    $data["status"] = !empty($data["status"]) ? trim($data["status"]) : ($orders[$index]["status"] ?? "Draft");

    validateRequired(
        $data,
        [
            "po_date",
            "supplier_id",
            "expected_delivery_date",
            "status"
        ]
    );

    if (!isset($data["items"]) || !is_array($data["items"]) || count($data["items"]) === 0) {
        jsonResponse(false, [], "At least one item is required.", 422);
    }

    foreach ($data["items"] as $item) {
        if (empty($item["item_id"]) || floatval($item["quantity"] ?? 0) <= 0) {
            jsonResponse(false, [], "Each item must have a valid item ID and quantity.", 422);
        }
    }

    $data["po_number"] = $orders[$index]["po_number"];
    $data["created_by"] = $orders[$index]["created_by"] ?? "Admin";
    $data["created_at"] = $orders[$index]["created_at"] ?? date("Y-m-d H:i:s");
    $data["updated_at"] = date("Y-m-d H:i:s");

    $orders[$index] = $data;

    writeJsonFile($filename, $orders);

    jsonResponse(true, $data, "Purchase order updated successfully.");
}

/* =========================================================
   DELETE
========================================================= */
if ($method === "DELETE") {
    $id = $_GET["id"] ?? "";

    $index = findIndex($orders, $id);

    if ($index < 0) {
        jsonResponse(false, [], "Purchase order not found.", 404);
    }

    array_splice($orders, $index, 1);

    writeJsonFile($filename, $orders);

    jsonResponse(true, [], "Purchase order deleted successfully.");
}

jsonResponse(false, [], "Method not allowed.", 405);