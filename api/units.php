<?php

require_once __DIR__ . "/../config/config.php";

$filename = "units.json";
$itemsFile = "items.json";

$units = readJsonFile($filename);
$items = readJsonFile($itemsFile);

$method = $_SERVER["REQUEST_METHOD"];

/* Helper to compute item counts */
function attachUnitCounts($units, $items) {
    $counts = [];
    foreach ($items as $item) {
        $u = trim($item["unit"] ?? "");
        if ($u !== "") {
            $counts[strtolower($u)] = ($counts[strtolower($u)] ?? 0) + 1;
        }
    }
    foreach ($units as &$unit) {
        $name = strtolower(trim($unit["name"] ?? ""));
        $short = strtolower(trim($unit["short_name"] ?? ""));
        $c = ($counts[$short] ?? 0) + ($counts[$name] ?? 0);
        $unit["item_count"] = $c;
    }
    return $units;
}

/* GET */
if ($method === "GET") {
    $search = strtolower(trim($_GET["search"] ?? ""));
    $status = trim($_GET["status"] ?? "");

    $result = attachUnitCounts($units, $items);

    if ($search !== "") {
        $result = array_values(
            array_filter($result, function($unit) use ($search) {
                return strpos(strtolower(json_encode($unit)), $search) !== false;
            })
        );
    }

    if ($status !== "") {
        $result = array_values(
            array_filter($result, function($unit) use ($status) {
                return strtolower($unit["status"] ?? "") === strtolower($status);
            })
        );
    }

    jsonResponse(true, $result);
}

/* POST */
if ($method === "POST") {
    $data = getJsonInput();

    validateRequired($data, ["name", "short_name", "status"]);

    $name = trim($data["name"]);
    $shortName = strtoupper(trim($data["short_name"]));

    // Check duplicate name or short name
    foreach ($units as $existing) {
        if (strcasecmp(trim($existing["name"]), $name) === 0) {
            jsonResponse(false, [], "A unit with the name '$name' already exists.", 422);
        }
        if (strcasecmp(trim($existing["short_name"]), $shortName) === 0) {
            jsonResponse(false, [], "A unit with the short code '$shortName' already exists.", 422);
        }
    }

    $ids = array_column($units, "id");
    $data["id"] = count($ids) ? max($ids) + 1 : 1;
    $data["code"] = generateCode($units, "code", "UOM");
    $data["name"] = $name;
    $data["short_name"] = $shortName;
    $data["description"] = trim($data["description"] ?? "");
    $data["status"] = trim($data["status"] ?? "Active");
    $data["created_at"] = date("Y-m-d H:i:s");

    $units[] = $data;
    writeJsonFile($filename, $units);

    $data["item_count"] = 0;
    jsonResponse(true, $data, "Unit of Measurement created successfully.");
}

/* PUT */
if ($method === "PUT") {
    $data = getJsonInput();

    if (!isset($data["id"])) {
        jsonResponse(false, [], "Unit ID is required.", 422);
    }

    $index = findIndex($units, $data["id"]);
    if ($index < 0) {
        jsonResponse(false, [], "Unit not found.", 404);
    }

    validateRequired($data, ["name", "short_name", "status"]);

    $name = trim($data["name"]);
    $shortName = strtoupper(trim($data["short_name"]));
    $currentId = $data["id"];

    // Check duplicate on other units
    foreach ($units as $existing) {
        if ((string)$existing["id"] !== (string)$currentId) {
            if (strcasecmp(trim($existing["name"]), $name) === 0) {
                jsonResponse(false, [], "Another unit with the name '$name' already exists.", 422);
            }
            if (strcasecmp(trim($existing["short_name"]), $shortName) === 0) {
                jsonResponse(false, [], "Another unit with the short code '$shortName' already exists.", 422);
            }
        }
    }

    $oldShort = $units[$index]["short_name"];

    $data["code"] = $units[$index]["code"];
    $data["name"] = $name;
    $data["short_name"] = $shortName;
    $data["description"] = trim($data["description"] ?? "");
    $data["status"] = trim($data["status"] ?? "Active");
    $data["created_at"] = $units[$index]["created_at"] ?? date("Y-m-d H:i:s");
    $data["updated_at"] = date("Y-m-d H:i:s");

    // If short name changed, update items
    if ($oldShort !== $shortName) {
        $itemsChanged = false;
        foreach ($items as &$item) {
            if (strcasecmp(trim($item["unit"] ?? ""), $oldShort) === 0) {
                $item["unit"] = $shortName;
                $itemsChanged = true;
            }
        }
        if ($itemsChanged) {
            writeJsonFile($itemsFile, $items);
        }
    }

    $units[$index] = $data;
    writeJsonFile($filename, $units);

    jsonResponse(true, $data, "Unit of Measurement updated successfully.");
}

/* DELETE */
if ($method === "DELETE") {
    $id = $_GET["id"] ?? "";

    $index = findIndex($units, $id);
    if ($index < 0) {
        jsonResponse(false, [], "Unit not found.", 404);
    }

    $shortName = $units[$index]["short_name"];
    $unitName = $units[$index]["name"];

    // SAFETY CHECK: Count items assigned to this unit
    $assignedCount = 0;
    foreach ($items as $item) {
        $u = trim($item["unit"] ?? "");
        if (strcasecmp($u, $shortName) === 0 || strcasecmp($u, $unitName) === 0) {
            $assignedCount++;
        }
    }

    if ($assignedCount > 0) {
        jsonResponse(
            false,
            [],
            "Cannot delete unit '$unitName ($shortName)' because it is assigned to $assignedCount item(s). Please reassign or update those items first.",
            400
        );
    }

    array_splice($units, $index, 1);
    writeJsonFile($filename, $units);

    jsonResponse(true, [], "Unit of Measurement deleted successfully.");
}

jsonResponse(false, [], "Method not allowed.", 405);
?>
