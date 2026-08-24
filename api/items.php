<?php

session_start();

header("Content-Type: application/json; charset=utf-8");


if (empty($_SESSION["user"])) {

    echo json_encode([
        "success" => false,
        "message" => "Unauthorized"
    ]);

    exit;
}


$dataDir =
    __DIR__ . "/../data";


if (!is_dir($dataDir)) {
    mkdir(
        $dataDir,
        0777,
        true
    );
}


$file =
    $dataDir . "/items.json";


if (!file_exists($file)) {

    file_put_contents(
        $file,
        "[]"
    );
}


function getItems()
{
    global $file;

    $data =
        json_decode(
            file_get_contents($file),
            true
        );

    return is_array($data)
        ? $data
        : [];
}


function saveItems($data)
{
    global $file;

    file_put_contents(
        $file,
        json_encode(
            $data,
            JSON_PRETTY_PRINT |
            JSON_UNESCAPED_UNICODE
        ),
        LOCK_EX
    );
}


function response(
    $success,
    $message = "",
    $data = []
)
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
    $raw =
        file_get_contents(
            "php://input"
        );

    $data =
        json_decode(
            $raw,
            true
        );

    if (!is_array($data)) {
        $data = $_POST;
    }

    return $data;
}


$items =
    getItems();


$action =
    $_GET["action"] ?? "list";


/*
 * GET
 */

if (
    $_SERVER["REQUEST_METHOD"]
    === "GET"
) {

    response(
        true,
        "",
        $items
    );
}


$data =
    requestData();


/*
 * DELETE
 */

if (
    $action === "delete"
) {

    $id =
        $data["id"] ?? "";


    $newItems = [];

    foreach ($items as $item) {

        if (
            $item["id"] !== $id
        ) {

            $newItems[] =
                $item;
        }
    }


    saveItems(
        $newItems
    );


    response(
        true,
        "Item deleted successfully."
    );
}


/*
 * SAVE
 */

if (
    $action === "save"
) {

    $name =
        trim(
            $data["name"] ?? ""
        );


    if ($name === "") {

        response(
            false,
            "Item name is required."
        );
    }


    $price =
        (float)(
            $data["purchase_price"]
            ?? 0
        );


    if ($price < 0) {

        response(
            false,
            "Purchase price cannot be negative."
        );
    }


    /*
     * EDIT
     */

    if (!empty($data["id"])) {

        foreach ($items as &$item) {

            if (
                $item["id"] ===
                $data["id"]
            ) {

                $item =
                    array_merge(
                        $item,
                        $data
                    );


                saveItems(
                    $items
                );


                response(
                    true,
                    "Item updated successfully.",
                    $item
                );
            }
        }


        response(
            false,
            "Item not found."
        );
    }


    /*
     * CREATE
     */

    $number =
        count($items) + 1;


    $id =
        "ITM-" .
        str_pad(
            $number,
            4,
            "0",
            STR_PAD_LEFT
        );


    if (
        empty($data["code"])
    ) {

        $data["code"] =
            $id;
    }


    $data["id"] =
        $id;


    $data["created_at"] =
        date("Y-m-d H:i:s");


    $items[] =
        $data;


    saveItems(
        $items
    );


    response(
        true,
        "Item added successfully.",
        $data
    );
}


response(
    false,
    "Invalid action."
);

?>