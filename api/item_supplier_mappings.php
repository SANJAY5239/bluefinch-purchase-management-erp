<?php

require_once __DIR__ . "/../config/config.php";

$filename = "item_supplier_mappings.json";
$itemsFile = "items.json";
$suppliersFile = "suppliers.json";

$mappings = readJsonFile($filename);
$items = readJsonFile($itemsFile);
$suppliers = readJsonFile($suppliersFile);

$method = $_SERVER["REQUEST_METHOD"];

/* Helper to enrich mapping with latest item & supplier details */
function enrichMapping($mapping, $items, $suppliers) {
    foreach ($items as $item) {
        if ((string)($item["id"] ?? "") === (string)($mapping["item_id"] ?? "")) {
            $mapping["item_code"] = $item["code"] ?? "";
            $mapping["item_name"] = $item["name"] ?? "";
            $mapping["item_unit"] = $item["unit"] ?? "";
            $mapping["item_category"] = $item["category"] ?? "";
            break;
        }
    }
    foreach ($suppliers as $supplier) {
        if ((string)($supplier["id"] ?? "") === (string)($mapping["supplier_id"] ?? "")) {
            $mapping["supplier_code"] = $supplier["code"] ?? ($supplier["supplier_code"] ?? "");
            $mapping["supplier_name"] = $supplier["name"] ?? ($supplier["supplier_name"] ?? "");
            $mapping["supplier_phone"] = $supplier["phone"] ?? "";
            $mapping["supplier_email"] = $supplier["email"] ?? "";
            break;
        }
    }
    return $mapping;
}

/* GET */
if ($method === "GET") {
    $search = strtolower(trim($_GET["search"] ?? ""));
    $itemId = trim($_GET["item_id"] ?? "");
    $supplierId = trim($_GET["supplier_id"] ?? "");
    $preferred = trim($_GET["preferred"] ?? "");
    $status = trim($_GET["status"] ?? "");

    $result = array_map(function($m) use ($items, $suppliers) {
        return enrichMapping($m, $items, $suppliers);
    }, $mappings);

    if ($itemId !== "") {
        $result = array_values(
            array_filter($result, function($m) use ($itemId) {
                return (string)($m["item_id"] ?? "") === (string)$itemId;
            })
        );
    }

    if ($supplierId !== "") {
        $result = array_values(
            array_filter($result, function($m) use ($supplierId) {
                return (string)($m["supplier_id"] ?? "") === (string)$supplierId;
            })
        );
    }

    if ($preferred !== "") {
        $isPref = ($preferred === "1" || strtolower($preferred) === "true");
        $result = array_values(
            array_filter($result, function($m) use ($isPref) {
                return (bool)($m["preferred"] ?? false) === $isPref;
            })
        );
    }

    if ($status !== "") {
        $result = array_values(
            array_filter($result, function($m) use ($status) {
                return strtolower($m["status"] ?? "") === strtolower($status);
            })
        );
    }

    if ($search !== "") {
        $result = array_values(
            array_filter($result, function($m) use ($search) {
                return strpos(strtolower(json_encode($m)), $search) !== false;
            })
        );
    }

    jsonResponse(true, $result);
}

/* POST */
if ($method === "POST") {
    $data = getJsonInput();

    validateRequired($data, ["item_id", "supplier_id", "purchase_price", "status"]);

    $itemId = intval($data["item_id"]);
    $supplierId = intval($data["supplier_id"]);
    $purchasePrice = floatval($data["purchase_price"]);
    $isPreferred = !empty($data["preferred"]) && ($data["preferred"] === true || $data["preferred"] === "true" || $data["preferred"] === 1 || $data["preferred"] === "1");

    if ($purchasePrice < 0) {
        jsonResponse(false, [], "Purchase price cannot be negative.", 422);
    }

    // Verify Item and Supplier exist
    $itemExists = false;
    $itemObj = null;
    foreach ($items as $it) {
        if (intval($it["id"]) === $itemId) {
            $itemExists = true;
            $itemObj = $it;
            break;
        }
    }
    if (!$itemExists) {
        jsonResponse(false, [], "Selected item does not exist.", 422);
    }

    $supplierExists = false;
    $supplierObj = null;
    foreach ($suppliers as $sup) {
        if (intval($sup["id"]) === $supplierId) {
            $supplierExists = true;
            $supplierObj = $sup;
            break;
        }
    }
    if (!$supplierExists) {
        jsonResponse(false, [], "Selected supplier does not exist.", 422);
    }

    // Check duplicate item + supplier combination
    foreach ($mappings as $existing) {
        if (intval($existing["item_id"]) === $itemId && intval($existing["supplier_id"]) === $supplierId) {
            $supName = $supplierObj["name"] ?? ($supplierObj["supplier_name"] ?? "this supplier");
            $itName = $itemObj["name"] ?? "this item";
            jsonResponse(false, [], "Mapping already exists between '$itName' and '$supName'.", 422);
        }
    }

    // If marked as preferred, reset all other suppliers for this item to preferred = false
    if ($isPreferred) {
        foreach ($mappings as &$m) {
            if (intval($m["item_id"]) === $itemId) {
                $m["preferred"] = false;
            }
        }
    }

    $ids = array_column($mappings, "id");
    $data["id"] = count($ids) ? max($ids) + 1 : 1;
    $data["mapping_code"] = generateCode($mappings, "mapping_code", "MAP");
    $data["item_id"] = $itemId;
    $data["item_code"] = $itemObj["code"] ?? "";
    $data["item_name"] = $itemObj["name"] ?? "";
    $data["supplier_id"] = $supplierId;
    $data["supplier_code"] = $supplierObj["code"] ?? ($supplierObj["supplier_code"] ?? "");
    $data["supplier_name"] = $supplierObj["name"] ?? ($supplierObj["supplier_name"] ?? "");
    $data["supplier_item_code"] = trim($data["supplier_item_code"] ?? "");
    $data["purchase_price"] = $purchasePrice;
    $data["preferred"] = $isPreferred;
    $data["status"] = trim($data["status"] ?? "Active");
    $data["created_at"] = date("Y-m-d H:i:s");

    $mappings[] = $data;
    writeJsonFile($filename, $mappings);

    jsonResponse(true, $data, "Item-Supplier mapping created successfully.");
}

/* PUT */
if ($method === "PUT") {
    $data = getJsonInput();

    if (!isset($data["id"])) {
        jsonResponse(false, [], "Mapping ID is required.", 422);
    }

    $index = findIndex($mappings, $data["id"]);
    if ($index < 0) {
        jsonResponse(false, [], "Mapping not found.", 404);
    }

    validateRequired($data, ["item_id", "supplier_id", "purchase_price", "status"]);

    $itemId = intval($data["item_id"]);
    $supplierId = intval($data["supplier_id"]);
    $purchasePrice = floatval($data["purchase_price"]);
    $isPreferred = !empty($data["preferred"]) && ($data["preferred"] === true || $data["preferred"] === "true" || $data["preferred"] === 1 || $data["preferred"] === "1");
    $currentId = $data["id"];

    if ($purchasePrice < 0) {
        jsonResponse(false, [], "Purchase price cannot be negative.", 422);
    }

    // Check duplicate item + supplier on other mappings
    foreach ($mappings as $existing) {
        if ((string)$existing["id"] !== (string)$currentId && intval($existing["item_id"]) === $itemId && intval($existing["supplier_id"]) === $supplierId) {
            jsonResponse(false, [], "Another mapping already exists for this Item and Supplier combination.", 422);
        }
    }

    // If marked as preferred, reset all other suppliers for this item to preferred = false
    if ($isPreferred) {
        foreach ($mappings as &$m) {
            if ((string)$m["id"] !== (string)$currentId && intval($m["item_id"]) === $itemId) {
                $m["preferred"] = false;
            }
        }
    }

    // Get item & supplier details
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

    $data["mapping_code"] = $mappings[$index]["mapping_code"] ?? generateCode($mappings, "mapping_code", "MAP");
    $data["item_id"] = $itemId;
    $data["item_code"] = $itemObj["code"] ?? ($mappings[$index]["item_code"] ?? "");
    $data["item_name"] = $itemObj["name"] ?? ($mappings[$index]["item_name"] ?? "");
    $data["supplier_id"] = $supplierId;
    $data["supplier_code"] = $supplierObj["code"] ?? ($mappings[$index]["supplier_code"] ?? "");
    $data["supplier_name"] = $supplierObj["name"] ?? ($mappings[$index]["supplier_name"] ?? "");
    $data["supplier_item_code"] = trim($data["supplier_item_code"] ?? "");
    $data["purchase_price"] = $purchasePrice;
    $data["preferred"] = $isPreferred;
    $data["status"] = trim($data["status"] ?? "Active");
    $data["created_at"] = $mappings[$index]["created_at"] ?? date("Y-m-d H:i:s");
    $data["updated_at"] = date("Y-m-d H:i:s");

    $mappings[$index] = $data;
    writeJsonFile($filename, $mappings);

    jsonResponse(true, $data, "Item-Supplier mapping updated successfully.");
}

/* DELETE */
if ($method === "DELETE") {
    $id = $_GET["id"] ?? "";

    $index = findIndex($mappings, $id);
    if ($index < 0) {
        jsonResponse(false, [], "Mapping not found.", 404);
    }

    array_splice($mappings, $index, 1);
    writeJsonFile($filename, $mappings);

    jsonResponse(true, [], "Item-Supplier mapping deleted successfully.");
}

jsonResponse(false, [], "Method not allowed.", 405);
?>
