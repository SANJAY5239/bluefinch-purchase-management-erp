<?php

require_once __DIR__ . "/../config/config.php";

$orders = readJsonFile("purchase_orders.json");

$total = count($orders);

$draft = 0;
$pending = 0;
$completed = 0;
$cancelled = 0;
$totalValue = 0;

foreach($orders as $order){

    $status = strtolower(
        $order["status"] ?? ""
    );

    if($status === "draft"){
        $draft++;
    }

    elseif($status === "pending"){
        $pending++;
    }

    elseif($status === "completed"){
        $completed++;
    }

    elseif($status === "cancelled"){
        $cancelled++;
    }

    $totalValue += floatval(
        $order["grand_total"] ?? 0
    );

}

jsonResponse(
    true,
    [
        "total" => $total,
        "draft" => $draft,
        "pending" => $pending,
        "completed" => $completed,
        "cancelled" => $cancelled,
        "total_value" => $totalValue
    ]
);

?>