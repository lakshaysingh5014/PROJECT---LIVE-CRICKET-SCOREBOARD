<?php


function getDbConnection() {
    
    $host = '127.0.0.1:3306';  
    $dbname = 'cricket_dashboard';
    $username = 'root';
    $password = '';  
    
    try {
        
        $dsn = "mysql:host=$host;dbname=$dbname";
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ];
        
        $pdo = new PDO($dsn, $username, $password, $options);
        return $pdo;
    } catch (PDOException $e) {
        
        try {
            $password = 'root';
            $pdo = new PDO($dsn, $username, $password, $options);
            return $pdo;
        } catch (PDOException $e) {
           
            die(json_encode([
                'status' => false, 
                'message' => 'Database connection failed. Please check:',
                'details' => [
                    'host' => $host,
                    'database' => $dbname,
                    'username' => $username,
                    'error' => $e->getMessage()
                ]
            ]));
        }
    }
}
?>