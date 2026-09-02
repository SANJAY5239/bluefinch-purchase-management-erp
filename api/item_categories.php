<?php

require_once __DIR__ . "/../config/config.php";

$filename = "item_categories.json";
$itemsFile = "items.json";

$categories = readJsonFile($filename);
$items = readJsonFile($itemsFile);

$method = $_SERVER["REQUEST_METHOD"];

/* Helper to compute item counts */
function attachItemCounts($categories, $items) {
    $counts = [];
    foreach ($items as $item) {
        $cat = trim($item["category"] ?? "");
        if ($cat !== "") {
            $counts[$cat] = ($counts[$cat] ?? 0) + 1;
        }
    }
    foreach ($categories as &$category) {
        $name = trim($category["name"] ?? "");
        $category["item_count"] = $counts[$name] ?? 0;
    }
    return $categories;
}

/* GET */
if ($method === "GET") {
    $search = strtolower(trim($_GET["search"] ?? ""));
    $status = trim($_GET["status"] ?? "");

    $result = attachItemCounts($categories, $items);

    if ($search !== "") {
        $result = array_values(
            array_filter($result, function($cat) use ($search) {
                return strpos(strtolower(json_encode($cat)), $search) !== false;
            })
        );
    }

    if ($status !== "") {
        $result = array_values(
            array_filter($result, function($cat) use ($status) {
                return strtolower($cat["status"] ?? "") === strtolower($status);
            })
        );
    }

    jsonResponse(true, $result);
}

/* POST */
if ($method === "POST") {
    $data = getJsonInput();

    validateRequired($data, ["name", "status"]);

    $name = trim($data["name"]);

    // Check duplicate name
    foreach ($categories as $existing) {
        if (strcasecmp(trim($existing["name"]), $name) === 0) {
            jsonResponse(false, [], "A category with the name '$name' already exists.", 422);
        }
    }

    $ids = array_column($categories, "id");
    $data["id"] = count($ids) ? max($ids) + 1 : 1;
    $data["code"] = generateCode($categories, "code", "CAT");
    $data["name"] = $name;
    $data["description"] = trim($data["description"] ?? "");
    $data["status"] = trim($data["status"] ?? "Active");
    $data["created_at"] = date("Y-m-d H:i:s");

    $categories[] = $data;
    writeJsonFile($filename, $categories);

    $data["item_count"] = 0;
    jsonResponse(true, $data, "Category created successfully.");
}

/* PUT */
if ($method === "PUT") {
    $data = getJsonInput();

    if (!isset($data["id"])) {
        jsonResponse(false, [], "Category ID is required.", 422);
    }

    $index = findIndex($categories, $data["id"]);
    if ($index < 0) {
        jsonResponse(false, [], "Category not found.", 404);
    }

    validateRequired($data, ["name", "status"]);

    $name = trim($data["name"]);
    $currentId = $data["id"];

    // Check duplicate name on other categories
    foreach ($categories as $existing) {
        if ((string)$existing["id"] !== (string)$currentId && strcasecmp(trim($existing["name"]), $name) === 0) {
            jsonResponse(false, [], "Another category with the name '$name' already exists.", 422);
        }
    }

    $oldName = $categories[$index]["name"];

    $data["code"] = $categories[$index]["code"];
    $data["name"] = $name;
    $data["description"] = trim($data["description"] ?? "");
    $data["status"] = trim($data["status"] ?? "Active");
    $data["created_at"] = $categories[$index]["created_at"] ?? date("Y-m-d H:i:s");
    $data["updated_at"] = date("Y-m-d H:i:s");

    // If category name changed, update items using this category
    if ($oldName !== $name) {
        $itemsChanged = false;
        foreach ($items as &$item) {
            if (strcasecmp(trim($item["category"] ?? ""), $oldName) === 0) {
                $item["category"] = $name;
                $itemsChanged = true;
            }
        }
        if ($itemsChanged) {
            writeJsonFile($itemsFile, $items);
        }
    }

    $categories[$index] = $data;
    writeJsonFile($filename, $categories);

    jsonResponse(true, $data, "Category updated successfully.");
}

/* DELETE */
if ($method === "DELETE") {
    $id = $_GET["id"] ?? "";

    $index = findIndex($categories, $id);
    if ($index < 0) {
        jsonResponse(false, [], "Category not found.", 404);
    }

    $categoryName = $categories[$index]["name"];

    // SAFETY CHECK: Count items assigned to this category
    $assignedItemsCount = 0;
    foreach ($items as $item) {
        if (strcasecmp(trim($item["category"] ?? ""), $categoryName) === 0) {
            $assignedItemsCount++;
        }
    }

    if ($assignedItemsCount > 0) {
        jsonResponse(
            false,
            [],
            "Cannot delete category '$categoryName' because it is assigned to $assignedItemsCount item(s). Please reassign or delete those items first.",
            400
        );
    }

    array_splice($categories, $index, 1);
    writeJsonFile($filename, $categories);

    jsonResponse(true, [], "Category deleted successfully.");
}

jsonResponse(false, [], "Method not allowed.", 405);
?>
