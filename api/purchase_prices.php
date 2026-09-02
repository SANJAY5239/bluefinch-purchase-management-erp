<?php

require_once __DIR__ . "/../config/config.php";

$filename = "purchase_prices.json";
$itemsFile = "items.json";
$suppliersFile = "suppliers.json";
$mappingsFile = "item_supplier_mappings.json";

$prices = readJsonFile($filename);
$items = readJsonFile($itemsFile);
$suppliers = readJsonFile($suppliersFile);
$mappings = readJsonFile($mappingsFile);

$method = $_SERVER["REQUEST_METHOD"];

/* Helper to attach lowest price flag and preferred supplier flag */
function enrichPrices($prices, $items, $suppliers, $mappings) {
    // 1. Calculate lowest active price per item
    $lowestPrices = [];
    foreach ($prices as $p) {
        if (strtolower($p["status"] ?? "") === "active") {
            $itemId = intval($p["item_id"]);
            $price = floatval($p["purchase_price"]);
            if (!isset($lowestPrices[$itemId]) || $price < $lowestPrices[$itemId]) {
                $lowestPrices[$itemId] = $price;
            }
        }
    }

    // 2. Identify preferred supplier per item from mappings
    $preferredSuppliers = [];
    foreach ($mappings as $m) {
        if (!empty($m["preferred"]) && ($m["preferred"] === true || $m["preferred"] === "true" || $m["preferred"] === 1)) {
            $preferredSuppliers[intval($m["item_id"])] = intval($m["supplier_id"]);
        }
    }

    // 3. Map items and suppliers dictionary for fast lookup
    $itemDict = [];
    foreach ($items as $it) {
        $itemDict[intval($it["id"])] = $it;
    }
    $supplierDict = [];
    foreach ($suppliers as $sup) {
        $supplierDict[intval($sup["id"])] = $sup;
    }

    foreach ($prices as &$p) {
        $itemId = intval($p["item_id"] ?? 0);
        $supplierId = intval($p["supplier_id"] ?? 0);

        if (isset($itemDict[$itemId])) {
            $p["item_code"] = $itemDict[$itemId]["code"] ?? ($p["item_code"] ?? "");
            $p["item_name"] = $itemDict[$itemId]["name"] ?? ($p["item_name"] ?? "");
            $p["item_unit"] = $itemDict[$itemId]["unit"] ?? "";
            $p["item_category"] = $itemDict[$itemId]["category"] ?? "";
        }

        if (isset($supplierDict[$supplierId])) {
            $p["supplier_code"] = $supplierDict[$supplierId]["code"] ?? ($supplierDict[$supplierId]["supplier_code"] ?? ($p["supplier_code"] ?? ""));
            $p["supplier_name"] = $supplierDict[$supplierId]["name"] ?? ($supplierDict[$supplierId]["supplier_name"] ?? ($p["supplier_name"] ?? ""));
        }

        $isActive = strtolower($p["status"] ?? "") === "active";
        $priceVal = floatval($p["purchase_price"] ?? 0);

        $p["is_lowest_price"] = $isActive && isset($lowestPrices[$itemId]) && abs($priceVal - $lowestPrices[$itemId]) < 0.001;
        $p["is_preferred_supplier"] = isset($preferredSuppliers[$itemId]) && $preferredSuppliers[$itemId] === $supplierId;
    }

    return $prices;
}

/* GET */
if ($method === "GET") {
    $search = strtolower(trim($_GET["search"] ?? ""));
    $itemId = trim($_GET["item_id"] ?? "");
    $supplierId = trim($_GET["supplier_id"] ?? "");
    $status = trim($_GET["status"] ?? "");

    $result = enrichPrices($prices, $items, $suppliers, $mappings);

    if ($itemId !== "") {
        $result = array_values(
            array_filter($result, function($p) use ($itemId) {
                return (string)($p["item_id"] ?? "") === (string)$itemId;
            })
        );
    }

    if ($supplierId !== "") {
        $result = array_values(
            array_filter($result, function($p) use ($supplierId) {
                return (string)($p["supplier_id"] ?? "") === (string)$supplierId;
            })
        );
    }

    if ($status !== "") {
        $result = array_values(
            array_filter($result, function($p) use ($status) {
                return strtolower($p["status"] ?? "") === strtolower($status);
            })
        );
    }

    if ($search !== "") {
        $result = array_values(
            array_filter($result, function($p) use ($search) {
                return strpos(strtolower(json_encode($p)), $search) !== false;
            })
        );
    }

    jsonResponse(true, $result);
}

/* POST */
if ($method === "POST") {
    $data = getJsonInput();

    validateRequired($data, ["item_id", "supplier_id", "purchase_price", "effective_from", "status"]);

    $itemId = intval($data["item_id"]);
    $supplierId = intval($data["supplier_id"]);
    $purchasePrice = floatval($data["purchase_price"]);
    $tax = floatval($data["tax"] ?? 5.0);
    $status = trim($data["status"] ?? "Active");
    $effectiveFrom = trim($data["effective_from"]);
    $effectiveTo = trim($data["effective_to"] ?? "");

    if ($purchasePrice < 0 || $tax < 0) {
        jsonResponse(false, [], "Purchase price and tax cannot be negative.", 422);
    }

    // Lookup item and supplier
    $itemObj = null;
    foreach ($items as $it) {
        if (intval($it["id"]) === $itemId) {
            $itemObj = $it;
            break;
        }
    }
    if (!$itemObj) {
        jsonResponse(false, [], "Selected item not found.", 422);
    }

    $supplierObj = null;
    foreach ($suppliers as $sup) {
        if (intval($sup["id"]) === $supplierId) {
            $supplierObj = $sup;
            break;
        }
    }
    if (!$supplierObj) {
        jsonResponse(false, [], "Selected supplier not found.", 422);
    }

    // Historical price preservation: If creating an Active price, archive previous Active price for same Item+Supplier
    if (strtolower($status) === "active") {
        foreach ($prices as &$existing) {
            if (intval($existing["item_id"]) === $itemId && intval($existing["supplier_id"]) === $supplierId && strtolower($existing["status"] ?? "") === "active") {
                $existing["status"] = "Historical";
                if (empty($existing["effective_to"]) || $existing["effective_to"] > $effectiveFrom) {
                    $existing["effective_to"] = date("Y-m-d", strtotime($effectiveFrom . " -1 day"));
                }
            }
        }
    }

    $ids = array_column($prices, "id");
    $data["id"] = count($ids) ? max($ids) + 1 : 1;
    $data["price_code"] = generateCode($prices, "price_code", "PRC");
    $data["item_id"] = $itemId;
    $data["item_code"] = $itemObj["code"] ?? "";
    $data["item_name"] = $itemObj["name"] ?? "";
    $data["supplier_id"] = $supplierId;
    $data["supplier_code"] = $supplierObj["code"] ?? ($supplierObj["supplier_code"] ?? "");
    $data["supplier_name"] = $supplierObj["name"] ?? ($supplierObj["supplier_name"] ?? "");
    $data["purchase_price"] = $purchasePrice;
    $data["tax"] = $tax;
    $data["effective_from"] = $effectiveFrom;
    $data["effective_to"] = $effectiveTo;
    $data["status"] = $status;
    $data["created_at"] = date("Y-m-d H:i:s");

    $prices[] = $data;
    writeJsonFile($filename, $prices);

    jsonResponse(true, $data, "Purchase price record created successfully.");
}

/* PUT */
if ($method === "PUT") {
    $data = getJsonInput();

    if (!isset($data["id"])) {
        jsonResponse(false, [], "Price ID is required.", 422);
    }

    $index = findIndex($prices, $data["id"]);
    if ($index < 0) {
        jsonResponse(false, [], "Price record not found.", 404);
    }

    validateRequired($data, ["item_id", "supplier_id", "purchase_price", "effective_from", "status"]);

    $itemId = intval($data["item_id"]);
    $supplierId = intval($data["supplier_id"]);
    $purchasePrice = floatval($data["purchase_price"]);
    $tax = floatval($data["tax"] ?? 5.0);
    $status = trim($data["status"] ?? "Active");

    if ($purchasePrice < 0 || $tax < 0) {
        jsonResponse(false, [], "Purchase price and tax cannot be negative.", 422);
    }

    $itemObj = null;
    foreach ($items as $it) {
        if (intval($it["id"]) === $itemId) {
            $itemObj = $it;
            break;
        }
    }
    $supplierObj = null;
    foreach ($suppliers as $sup) {
        if (intval($sup["id"]) === $supplierId) {
            $supplierObj = $sup;
            break;
        }
    }

    $data["price_code"] = $prices[$index]["price_code"] ?? generateCode($prices, "price_code", "PRC");
    $data["item_id"] = $itemId;
    $data["item_code"] = $itemObj["code"] ?? ($prices[$index]["item_code"] ?? "");
    $data["item_name"] = $itemObj["name"] ?? ($prices[$index]["item_name"] ?? "");
    $data["supplier_id"] = $supplierId;
    $data["supplier_code"] = $supplierObj["code"] ?? ($prices[$index]["supplier_code"] ?? "");
    $data["supplier_name"] = $supplierObj["name"] ?? ($prices[$index]["supplier_name"] ?? "");
    $data["purchase_price"] = $purchasePrice;
    $data["tax"] = $tax;
    $data["effective_from"] = trim($data["effective_from"]);
    $data["effective_to"] = trim($data["effective_to"] ?? "");
    $data["status"] = $status;
    $data["created_at"] = $prices[$index]["created_at"] ?? date("Y-m-d H:i:s");
    $data["updated_at"] = date("Y-m-d H:i:s");

    $prices[$index] = $data;
    writeJsonFile($filename, $prices);

    jsonResponse(true, $data, "Purchase price record updated successfully.");
}

/* DELETE */
if ($method === "DELETE") {
    $id = $_GET["id"] ?? "";

    $index = findIndex($prices, $id);
    if ($index < 0) {
        jsonResponse(false, [], "Price record not found.", 404);
    }

    array_splice($prices, $index, 1);
    writeJsonFile($filename, $prices);

    jsonResponse(true, [], "Purchase price record deleted successfully.");
}

jsonResponse(false, [], "Method not allowed.", 405);
?>
