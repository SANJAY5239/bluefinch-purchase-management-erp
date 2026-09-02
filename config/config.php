<?php

header("Content-Type: application/json; charset=utf-8");

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    exit;
}

define(
    "DATA_PATH",
    dirname(__DIR__) . DIRECTORY_SEPARATOR . "data" . DIRECTORY_SEPARATOR
);

function jsonResponse(
    bool $success,
    $data = [],
    string $message = "",
    int $status = 200
){

    http_response_code($status);

    echo json_encode([
        "success" => $success,
        "data" => $data,
        "message" => $message
    ], JSON_UNESCAPED_UNICODE);

    exit;
}

function getJsonInput(){

    $input = file_get_contents("php://input");

    if(!$input){
        return [];
    }

    $data = json_decode($input, true);

    return is_array($data) ? $data : [];

}

function readJsonFile($filename){

    $file = DATA_PATH . $filename;

    if(!file_exists($file)){
        return [];
    }

    $content = file_get_contents($file);

    $data = json_decode($content, true);

    return is_array($data) ? $data : [];

}

function writeJsonFile($filename, $data){

    $file = DATA_PATH . $filename;

    $result = file_put_contents(
        $file,
        json_encode(
            array_values($data),
            JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE
        )
    );

    if($result === false){

        jsonResponse(
            false,
            [],
            "Unable to save data.",
            500
        );

    }

}

function validateRequired($data, $fields){

    foreach($fields as $field){

        if(
            !isset($data[$field]) ||
            trim((string)$data[$field]) === ""
        ){

            jsonResponse(
                false,
                [],
                "Field '$field' is required.",
                422
            );

        }

    }

}

function findIndex($data, $id){

    foreach($data as $index => $row){

        if((string)$row["id"] === (string)$id){

            return $index;

        }

    }

    return -1;

}

function generateCode(
    $data,
    $field,
    $prefix
){

    $max = 0;

    foreach($data as $row){

        if(isset($row[$field])){

            preg_match(
                "/(\d+)$/",
                $row[$field],
                $matches
            );

            if(isset($matches[1])){

                $max = max(
                    $max,
                    intval($matches[1])
                );

            }

        }

    }

    return $prefix . str_pad(
        $max + 1,
        4,
        "0",
        STR_PAD_LEFT
    );

}
?>