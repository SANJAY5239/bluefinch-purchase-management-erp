<?php

session_start();

header("Content-Type: application/json; charset=utf-8");

$dataDir = __DIR__ . "/../data";

if (!is_dir($dataDir)) {
    mkdir($dataDir, 0777, true);
}


function jsonFile($fileName, $default = [])
{
    global $dataDir;

    $file = $dataDir . "/" . $fileName;

    if (!file_exists($file)) {
        file_put_contents(
            $file,
            json_encode($default, JSON_PRETTY_PRINT)
        );
    }

    $data = json_decode(
        file_get_contents($file),
        true
    );

    return is_array($data) ? $data : $default;
}


function saveJson($fileName, $data)
{
    global $dataDir;

    return file_put_contents(
        $dataDir . "/" . $fileName,
        json_encode(
            $data,
            JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE
        ),
        LOCK_EX
    );
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


function response($success, $message = "", $data = [])
{
    echo json_encode([
        "success" => $success,
        "message" => $message,
        "data" => $data
    ]);

    exit;
}


$action = $_GET["action"] ?? "";


// CHECK LOGIN
if ($action === "me") {

    if (!empty($_SESSION["user"])) {

        response(
            true,
            "",
            $_SESSION["user"]
        );

    }

    response(false, "Not logged in.");
}


// LOGOUT
if ($action === "logout") {

    $_SESSION = [];

    session_destroy();

    response(true, "Logged out successfully.");
}


// LOGIN
if ($_SERVER["REQUEST_METHOD"] === "POST") {

    $data = requestData();

    $email = strtolower(
        trim($data["email"] ?? "")
    );

    $password = $data["password"] ?? "";

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        response(false, "Enter a valid email.");
    }

    if ($password === "") {
        response(false, "Enter your password.");
    }

    $users = jsonFile("users.json");

    foreach ($users as $user) {

        if (
            strtolower($user["email"]) === $email &&
            password_verify(
                $password,
                $user["password"]
            )
        ) {

            $_SESSION["user"] = [
                "id" => $user["id"],
                "name" => $user["name"],
                "email" => $user["email"]
            ];

            response(
                true,
                "Login successful.",
                $_SESSION["user"]
            );
        }
    }

    response(false, "Invalid email or password.");
}


response(false, "Invalid request.");

?>