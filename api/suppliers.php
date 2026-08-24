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


$dataDir = __DIR__ . "/../data";

if (!is_dir($dataDir)) {
    mkdir($dataDir, 0777, true);
}


$file =
    $dataDir . "/suppliers.json";


if (!file_exists($file)) {
    file_put_contents(
        $file,
        "[]"
    );
}


function getSuppliers()
{
    global $file;

    $data = json_decode(
        file_get_contents($file),
        true
    );

    return is_array($data)
        ? $data
        : [];
}


function saveSuppliers($data)
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
    $raw =
        file_get_contents("php://input");

    $data =
        json_decode($raw, true);

    if (!is_array($data)) {
        $data = $_POST;
    }

    return $data;
}


$suppliers =
    getSuppliers();


$action =
    $_GET["action"] ?? "list";


/*
 * LIST
 */

if ($_SERVER["REQUEST_METHOD"] === "GET") {

    response(
        true,
        "",
        $suppliers
    );
}


/*
 * REQUEST DATA
 */

$data =
    requestData();


/*
 * DELETE
 */

if ($action === "delete") {

    $id =
        $data["id"] ?? "";


    $newData = [];

    foreach ($suppliers as $supplier) {

        if ($supplier["id"] !== $id) {
            $newData[] = $supplier;
        }
    }


    saveSuppliers($newData);


    response(
        true,
        "Supplier deleted successfully."
    );
}


/*
 * SAVE
 */

if ($action === "save") {

    $name =
        trim($data["name"] ?? "");


    if ($name === "") {

        response(
            false,
            "Supplier name is required."
        );
    }


    /*
     * EDIT
     */

    if (!empty($data["id"])) {

        foreach ($suppliers as &$supplier) {

            if (
                $supplier["id"] ===
                $data["id"]
            ) {

                $supplier =
                    array_merge(
                        $supplier,
                        $data
                    );

                saveSuppliers(
                    $suppliers
                );

                response(
                    true,
                    "Supplier updated successfully.",
                    $supplier
                );
            }
        }


        response(
            false,
            "Supplier not found."
        );
    }


    /*
     * CREATE
     */

    $number =
        count($suppliers) + 1;


    $id =
        "SUP-" .
        str_pad(
            $number,
            4,
            "0",
            STR_PAD_LEFT
        );


    if (empty($data["code"])) {
        $data["code"] = $id;
    }


    $data["id"] =
        $id;


    $data["created_at"] =
        date("Y-m-d H:i:s");


    $suppliers[] =
        $data;


    saveSuppliers(
        $suppliers
    );


    response(
        true,
        "Supplier added successfully.",
        $data
    );
}


response(
    false,
    "Invalid action."
);

?>