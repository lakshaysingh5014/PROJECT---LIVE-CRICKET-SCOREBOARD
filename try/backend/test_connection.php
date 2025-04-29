<?php
header('Content-Type: application/json');


function testMySQLConnection() {
    $host = '127.0.0.1:3306';
    $username = 'root';
    $password = '';
    $dbname = 'cricket_dashboard';
    
    try {
        
        $conn = new mysqli($host, $username, $password);
        if ($conn->connect_error) {
            return ['status' => false, 'message' => 'MySQL Connection Error: ' . $conn->connect_error];
        }
        
        
        $result = $conn->query("SHOW DATABASES LIKE '$dbname'");
        if ($result->num_rows == 0) {
            return ['status' => false, 'message' => "Database $dbname does not exist"];
        }
        
        
        $conn->select_db($dbname);
        if ($conn->error) {
            return ['status' => false, 'message' => 'Database Selection Error: ' . $conn->error];
        }
        
        
        $tables = ['users', 'contact_messages', 'user_favorites'];
        $tableDetails = [];
        
        foreach ($tables as $table) {
            $result = $conn->query("SHOW TABLES LIKE '$table'");
            if ($result->num_rows == 0) {
                $tableDetails[$table] = 'Table does not exist';
            } else {
                
                $columns = $conn->query("SHOW COLUMNS FROM $table");
                $tableDetails[$table] = [];
                while ($column = $columns->fetch_assoc()) {
                    $tableDetails[$table][] = $column;
                }
            }
        }
        
        return [
            'status' => true, 
            'message' => 'Connection successful!',
            'database' => $dbname,
            'tables' => $tableDetails
        ];
    } catch (Exception $e) {
        return ['status' => false, 'message' => 'Error: ' . $e->getMessage()];
    }
}


$result = testMySQLConnection();
echo json_encode($result, JSON_PRETTY_PRINT);
?> 