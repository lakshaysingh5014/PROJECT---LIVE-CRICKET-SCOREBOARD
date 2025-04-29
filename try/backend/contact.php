<?php
header('Content-Type: application/json');


error_reporting(E_ALL);
ini_set('display_errors', 1);

$db_host = '127.0.0.1:3307';
$db_pass = '';
$db_name = 'cricket_dashboard';
$db_user = 'root'; // Add this line to define the database user

try {

    $conn = new mysqli($db_host, $db_user, $db_pass, $db_name);


    if ($conn->connect_error) {
        throw new Exception("Connection failed: " . $conn->connect_error);
    }


    $action = $_POST['action'] ?? '';

    if ($action === 'send_message') {

        $name = $conn->real_escape_string($_POST['name'] ?? '');
        $email = $conn->real_escape_string($_POST['email'] ?? '');
        $subject = $conn->real_escape_string($_POST['subject'] ?? '');
        $message = $conn->real_escape_string($_POST['message'] ?? '');


        error_log("Received form data: " . print_r($_POST, true));


        if (empty($name) || empty($email) || empty($subject) || empty($message)) {
            echo json_encode(['status' => false, 'message' => 'All fields are required']);
            exit;
        }


        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            echo json_encode(['status' => false, 'message' => 'Invalid email format']);
            exit;
        }


        $stmt = $conn->prepare("INSERT INTO contact_messages (name, email, subject, message, created_at, status) VALUES (?, ?, ?, ?, NOW(), 'new')");
        if (!$stmt) {
            throw new Exception("Prepare failed: " . $conn->error);
        }


        $stmt->bind_param("ssss", $name, $email, $subject, $message);


        if ($stmt->execute()) {
            echo json_encode(['status' => true, 'message' => 'Message sent successfully']);
        } else {
            throw new Exception("Execute failed: " . $stmt->error);
        }


        $stmt->close();
    } else {
        echo json_encode(['status' => false, 'message' => 'Invalid action']);
    }


    $conn->close();
} catch (Exception $e) {
    error_log("Contact form error: " . $e->getMessage());
    echo json_encode(['status' => false, 'message' => 'An error occurred: ' . $e->getMessage()]);
}
