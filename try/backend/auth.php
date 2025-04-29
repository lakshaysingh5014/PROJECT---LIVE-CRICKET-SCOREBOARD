<?php

require_once 'db_connect.php';


session_start();


$pdo = getDbConnection();


$action = isset($_POST['action']) ? $_POST['action'] : '';

switch ($action) {
    case 'login':
        handleLogin($pdo);
        break;
    case 'signup':
        handleSignup($pdo);
        break;
    case 'logout':
        handleLogout();
        break;
    case 'contact':
        handleContact($pdo);
        break;
    case 'check_auth':
        checkAuth();
        break;
    default:
        echo json_encode(['status' => false, 'message' => 'Invalid action']);
}


function handleLogin($pdo) {
    $email = $_POST['email'] ?? '';
    $password = $_POST['password'] ?? '';
    
    if (empty($email) || empty($password)) {
        echo json_encode(['status' => false, 'message' => 'Email and password are required']);
        return;
    }
    
    try {
        $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($user && password_verify($password, $user['password'])) {
            
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['user_name'] = $user['name'];
            $_SESSION['user_email'] = $user['email'];
            
            echo json_encode(['status' => true, 'message' => 'Login successful', 'user' => [
                'id' => $user['id'],
                'name' => $user['name'],
                'email' => $user['email']
            ]]);
        } else {
            echo json_encode(['status' => false, 'message' => 'Invalid email or password']);
        }
    } catch (PDOException $e) {
        echo json_encode(['status' => false, 'message' => 'Login failed: ' . $e->getMessage()]);
    }
}


function handleSignup($pdo) {
    $name = $_POST['name'] ?? '';
    $email = $_POST['email'] ?? '';
    $password = $_POST['password'] ?? '';
    
    if (empty($name) || empty($email) || empty($password)) {
        echo json_encode(['status' => false, 'message' => 'All fields are required']);
        return;
    }
    
    try {
        
        $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
        $stmt->execute([$email]);
        
        if ($stmt->rowCount() > 0) {
            echo json_encode(['status' => false, 'message' => 'Email already exists']);
            return;
        }
        
        
        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
        
        
        $stmt = $pdo->prepare("INSERT INTO users (name, email, password, created_at) VALUES (?, ?, ?, NOW())");
        $stmt->execute([$name, $email, $hashedPassword]);
        
        $userId = $pdo->lastInsertId();
        
      
        $_SESSION['user_id'] = $userId;
        $_SESSION['user_name'] = $name;
        $_SESSION['user_email'] = $email;
        
        echo json_encode(['status' => true, 'message' => 'Signup successful', 'user' => [
            'id' => $userId,
            'name' => $name,
            'email' => $email
        ]]);
    } catch (PDOException $e) {
        echo json_encode(['status' => false, 'message' => 'Signup failed: ' . $e->getMessage()]);
    }
}


function handleLogout() {
    
    $_SESSION = [];
    
    
    session_destroy();
    
    echo json_encode(['status' => true, 'message' => 'Logout successful']);
}


function handleContact($pdo) {
    $name = $_POST['name'] ?? '';
    $email = $_POST['email'] ?? '';
    $message = $_POST['message'] ?? '';
    
    if (empty($name) || empty($email) || empty($message)) {
        echo json_encode(['status' => false, 'message' => 'All fields are required']);
        return;
    }
    
    try {
        $stmt = $pdo->prepare("INSERT INTO contact_messages (name, email, message, created_at) VALUES (?, ?, ?, NOW())");
        $stmt->execute([$name, $email, $message]);
        
        echo json_encode(['status' => true, 'message' => 'Message sent successfully']);
    } catch (PDOException $e) {
        echo json_encode(['status' => false, 'message' => 'Failed to send message: ' . $e->getMessage()]);
    }
}

function checkAuth() {
    header('Content-Type: application/json');
    try {
        if (isset($_SESSION['user_id'])) {
            echo json_encode(['status' => true, 'authenticated' => true, 'user' => [
                'id' => $_SESSION['user_id'],
                'name' => $_SESSION['user_name'],
                'email' => $_SESSION['user_email']
            ]]);
        } else {
            echo json_encode(['status' => true, 'authenticated' => false]);
        }
    } catch (Exception $e) {
        echo json_encode(['status' => false, 'message' => 'Authentication check failed']);
    }
}
?>