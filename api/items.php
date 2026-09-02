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

$filename = "items.json";
$items = readJsonFile($filename);
$method = $_SERVER["REQUEST_METHOD"];

/* =========================================================
   GET
========================================================= */
if ($method === "GET") {
    $search = strtolower(trim($_GET["search"] ?? ""));
    $category = trim($_GET["category"] ?? "");
    $status = trim($_GET["status"] ?? "");
    $id = $_GET["id"] ?? "";

    if ($id !== "") {
        $index = findIndex($items, $id);
        if ($index < 0) {
            jsonResponse(false, [], "Item not found.", 404);
        }
        jsonResponse(true, $items[$index]);
    }

    $result = $items;

    if ($search !== "") {
        $result = array_values(
            array_filter($result, function($item) use ($search) {
                return strpos(strtolower(json_encode($item)), $search) !== false;
            })
        );
    }

    if ($category !== "") {
        $result = array_values(
            array_filter($result, function($item) use ($category) {
                return strtolower($item["category"] ?? "") === strtolower($category);
            })
        );
    }

    if ($status !== "") {
        $result = array_values(
            array_filter($result, function($item) use ($status) {
                return strtolower($item["status"] ?? "") === strtolower($status);
            })
        );
    }

    jsonResponse(true, $result);
}

/* =========================================================
   POST
========================================================= */
if ($method === "POST") {
    $data = getJsonInput();

    // Required check: Relax category check if not provided by quick modal
    $data["category"] = !empty($data["category"]) ? trim($data["category"]) : "General";
    $data["unit"] = !empty($data["unit"]) ? trim($data["unit"]) : "Pcs";
    $data["status"] = !empty($data["status"]) ? trim($data["status"]) : "Active";

    validateRequired(
        $data,
        [
            "name",
            "unit",
            "purchase_price",
            "status"
        ]
    );

    $name = trim($data["name"]);

    // Check duplicate item name
    foreach ($items as $existing) {
        if (strcasecmp(trim($existing["name"]), $name) === 0) {
            jsonResponse(false, [], "An item with the name '$name' already exists.", 422);
        }
    }

    $purchasePrice = floatval($data["purchase_price"] ?? 0);
    $tax = floatval($data["tax"] ?? 0);

    if ($purchasePrice < 0 || $tax < 0) {
        jsonResponse(false, [], "Price and tax cannot be negative.", 422);
    }

    $ids = array_column($items, "id");
    $data["id"] = count($ids) ? max($ids) + 1 : 1;

    // Check if custom code provided or auto-generate
    if (!empty($data["code"])) {
        $code = trim($data["code"]);
        foreach ($items as $existing) {
            if (strcasecmp(trim($existing["code"] ?? ""), $code) === 0) {
                jsonResponse(false, [], "Item code '$code' already exists.", 422);
            }
        }
        $data["code"] = $code;
    } else {
        $data["code"] = generateCode($items, "code", "ITM");
    }

    $data["name"] = $name;
    $data["description"] = trim($data["description"] ?? "");
    $data["category"] = $data["category"];
    $data["unit"] = $data["unit"];
    $data["purchase_price"] = $purchasePrice;
    $data["tax"] = $tax;
    $data["status"] = $data["status"];
    $data["created_at"] = date("Y-m-d H:i:s");

    $items[] = $data;

    writeJsonFile($filename, $items);

    jsonResponse(true, $data, "Item created successfully.");
}

/* =========================================================
   PUT
========================================================= */
if ($method === "PUT") {
    $data = getJsonInput();

    if (!isset($data["id"])) {
        jsonResponse(false, [], "Item ID is required.", 422);
    }

    $index = findIndex($items, $data["id"]);

    if ($index < 0) {
        jsonResponse(false, [], "Item not found.", 404);
    }

    $data["category"] = !empty($data["category"]) ? trim($data["category"]) : ($items[$index]["category"] ?? "General");
    $data["unit"] = !empty($data["unit"]) ? trim($data["unit"]) : ($items[$index]["unit"] ?? "Pcs");
    $data["status"] = !empty($data["status"]) ? trim($data["status"]) : ($items[$index]["status"] ?? "Active");

    validateRequired(
        $data,
        [
            "name",
            "unit",
            "purchase_price",
            "status"
        ]
    );

    $name = trim($data["name"]);
    $currentId = $data["id"];

    // Check duplicate name on other items
    foreach ($items as $existing) {
        if ((string)$existing["id"] !== (string)$currentId && strcasecmp(trim($existing["name"]), $name) === 0) {
            jsonResponse(false, [], "Another item with the name '$name' already exists.", 422);
        }
    }

    $purchasePrice = floatval($data["purchase_price"] ?? 0);
    $tax = floatval($data["tax"] ?? 0);

    if ($purchasePrice < 0 || $tax < 0) {
        jsonResponse(false, [], "Price and tax cannot be negative.", 422);
    }

    $data["code"] = $items[$index]["code"];
    $data["name"] = $name;
    $data["description"] = trim($data["description"] ?? "");
    $data["category"] = $data["category"];
    $data["unit"] = $data["unit"];
    $data["purchase_price"] = $purchasePrice;
    $data["tax"] = $tax;
    $data["status"] = $data["status"];
    $data["created_at"] = $items[$index]["created_at"] ?? date("Y-m-d H:i:s");
    $data["updated_at"] = date("Y-m-d H:i:s");

    $items[$index] = $data;

    writeJsonFile($filename, $items);

    jsonResponse(true, $data, "Item updated successfully.");
}

/* =========================================================
   DELETE
========================================================= */
if ($method === "DELETE") {
    $id = $_GET["id"] ?? "";

    $index = findIndex($items, $id);

    if ($index < 0) {
        jsonResponse(false, [], "Item not found.", 404);
    }

    array_splice($items, $index, 1);

    writeJsonFile($filename, $items);

    jsonResponse(true, [], "Item deleted successfully.");
}

jsonResponse(false, [], "Method not allowed.", 405);