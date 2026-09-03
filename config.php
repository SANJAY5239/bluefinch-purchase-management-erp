<?php
// Environment Detection and PostgreSQL Database Configuration for ProcureX
// Supports local XAMPP/Apache with local/Railway PostgreSQL

$hostHeader = $_SERVER['HTTP_HOST'] ?? 'localhost';

if ($hostHeader === 'localhost' || 
    str_contains($hostHeader, '127.0.0.1') || 
    strpos($hostHeader, 'localhost:') === 0) {
    // LOCAL XAMPP — install PostgreSQL locally or use Railway PostgreSQL credentials
    define('DB_HOST', getenv('PGHOST') ?: 'localhost');
    define('DB_PORT', getenv('PGPORT') ?: '5432');
    define('DB_NAME', getenv('PGDATABASE') ?: 'procurex');
    define('DB_USER', getenv('PGUSER') ?: 'postgres');
    define('DB_PASS', getenv('PGPASSWORD') ?: 'postgres');
} else {
    // RAILWAY PRODUCTION
    define('DB_HOST', getenv('PGHOST'));
    define('DB_PORT', getenv('PGPORT') ?: '5432');
    define('DB_NAME', getenv('PGDATABASE'));
    define('DB_USER', getenv('PGUSER'));
    define('DB_PASS', getenv('PGPASSWORD'));
}

/**
 * Returns a configured PDO PostgreSQL database connection instance.
 * @return PDO
 */
function getDbConnection() {
    $dbUrl = getenv('DATABASE_URL');
    if ($dbUrl) {
        $dbopts = parse_url($dbUrl);
        $host = $dbopts['host'] ?? DB_HOST;
        $port = $dbopts['port'] ?? DB_PORT;
        $user = $dbopts['user'] ?? DB_USER;
        $pass = $dbopts['pass'] ?? DB_PASS;
        $dbname = ltrim($dbopts['path'] ?? ('/' . DB_NAME), '/');
    } else {
        $host = DB_HOST;
        $port = DB_PORT;
        $user = DB_USER;
        $pass = DB_PASS;
        $dbname = DB_NAME;
    }

    $dsn = "pgsql:host={$host};port={$port};dbname={$dbname}";
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ];
    return new PDO($dsn, $user, $pass, $options);
}
?>
