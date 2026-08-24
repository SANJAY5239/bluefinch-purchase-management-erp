<?php

session_start();

header("Content-Type: application/json; charset=utf-8");

if (empty($_SESSION["user"])) {
    echo json_encode([
        "success" => false,
        "message" => "Unauthorized. Please login."
    ]);
    exit;
}

$dataDir = __DIR__ . "/../data";

if (!is_dir($dataDir)) {
    mkdir($dataDir, 0777, true);
}

$file = $dataDir . "/purchase_orders.json";

if (!file_exists($file)) {
    file_put_contents($file, "[]");
}


function getOrders()
{
    global $file;

    $data = json_decode(
        file_get_contents($file),
        true
    );

    return is_array($data) ? $data : [];
}


function saveOrders($orders)
{
    global $file;

    file_put_contents(
        $file,
        json_encode(
            $orders,
            JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE
        ),
        LOCK_EX
    );
}


function response($success, $message = "", $data = [])
{
    echo json_encode([
        "success" => $success,
        "message" => $message,
        "data" => $data
    ]);

    exit;
}


function requestData()
{
    $raw = file_get_contents("php://input");

    $data = json_decode($raw, true);

    if (!is_array($data)) {
        $data = $_POST;
    }

    return $data;
}


$orders = getOrders();

$action = $_GET["action"] ?? "list";


// GET ORDERS
if ($_SERVER["REQUEST_METHOD"] === "GET") {

    if ($action === "get") {

        $id = $_GET["id"] ?? "";

        foreach ($orders as $order) {

            if ($order["id"] === $id) {

                response(
                    true,
                    "",
                    $order
                );
            }
        }

        response(
            false,
            "Purchase order not found."
        );
    }


    response(
        true,
        "",
        $orders
    );
}


// POST
$data = requestData();


// DELETE
if ($action === "delete") {

    $id = $data["id"] ?? "";

    $newOrders = [];

    foreach ($orders as $order) {

        if ($order["id"] !== $id) {
            $newOrders[] = $order;
        }
    }

    saveOrders($newOrders);

    response(
        true,
        "Purchase order deleted."
    );
}


// SAVE
if ($action === "save") {

    $supplier =
        trim($data["supplier"] ?? "");

    $items =
        $data["items"] ?? [];

    $status =
        $data["status"] ?? "Draft";


    if ($supplier === "") {

        response(
            false,
            "Supplier is required."
        );
    }


    if (!is_array($items) || count($items) === 0) {

        response(
            false,
            "At least one item is required."
        );
    }


    foreach ($items as $item) {

        if (
            empty($item["item_code"]) ||
            (float)($item["quantity"] ?? 0) <= 0
        ) {

            response(
                false,
                "Every item must have valid quantity."
            );
        }
    }


    /*
     * EDIT
     */

    if (!empty($data["id"])) {

        $found = false;

        foreach ($orders as &$order) {

            if ($order["id"] === $data["id"]) {

                $order = array_merge(
                    $order,
                    $data
                );

                $order["updated_at"] =
                    date("Y-m-d H:i:s");

                $found = true;

                break;
            }
        }

        if (!$found) {

            response(
                false,
                "Purchase order not found."
            );
        }


        saveOrders($orders);

        response(
            true,
            "Purchase order updated.",
            $data
        );
    }


    /*
     * CREATE
     */

    $number =
        count($orders) + 1;

    $poNumber =
        "PO-" .
        date("Y") .
        "-" .
        str_pad(
            $number,
            4,
            "0",
            STR_PAD_LEFT
        );


    $newOrder = $data;

    $newOrder["id"] =
        "PO-" . uniqid();

    $newOrder["po_number"] =
        $poNumber;

    $newOrder["created_by"] =
        $_SESSION["user"]["name"];

    $newOrder["created_at"] =
        date("Y-m-d H:i:s");


    $orders[] = $newOrder;

    saveOrders($orders);


    response(
        true,
        "Purchase order saved successfully.",
        $newOrder
    );
}


response(
    false,
    "Invalid action."
);

?>