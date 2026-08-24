<?php

session_start();

header("Content-Type: application/json; charset=utf-8");

$dataDir = __DIR__ . "/../data";

if (!is_dir($dataDir)) {
    mkdir($dataDir, 0777, true);
}


function getUsers()
{
    global $dataDir;

    $file = $dataDir . "/users.json";

    if (!file_exists($file)) {
        file_put_contents($file, "[]");
    }

    $users = json_decode(
        file_get_contents($file),
        true
    );

    return is_array($users) ? $users : [];
}


function saveUsers($users)
{
    global $dataDir;

    file_put_contents(
        $dataDir . "/users.json",
        json_encode(
            $users,
            JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE
        ),
        LOCK_EX
    );
}


function requestData()
{
    $raw = file_get_contents("php://input");

    $data = json_decode($raw, true);

    return is_array($data) ? $data : $_POST;
}


function response($success, $message, $data = [])
{
    echo json_encode([
        "success" => $success,
        "message" => $message,
        "data" => $data
    ]);

    exit;
}


$data = requestData();

$name = trim($data["name"] ?? "");
$email = strtolower(
    trim($data["email"] ?? "")
);

$password = $data["password"] ?? "";
$confirm = $data["confirm_password"] ?? "";


if ($name === "") {
    response(false, "Name is required.");
}


if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    response(false, "Enter a valid email.");
}


if (strlen($password) < 6) {
    response(
        false,
        "Password must contain at least 6 characters."
    );
}


if ($password !== $confirm) {
    response(false, "Passwords do not match.");
}


$users = getUsers();


foreach ($users as $user) {

    if (
        strtolower($user["email"]) === $email
    ) {

        response(
            false,
            "Email is already registered."
        );
    }
}


$id = "USR-" .
    str_pad(
        count($users) + 1,
        4,
        "0",
        STR_PAD_LEFT
    );


$users[] = [

    "id" => $id,

    "name" => $name,

    "email" => $email,

    "password" => password_hash(
        $password,
        PASSWORD_DEFAULT
    ),

    "created_at" => date("Y-m-d H:i:s")

];


saveUsers($users);


response(
    true,
    "Registration successful. You can login now."
);

?>