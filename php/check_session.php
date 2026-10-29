<?php
session_start();
header('Content-Type: application/json; charset=utf-8');

if (isset($_SESSION['user_id'])) {
    echo json_encode([
        'logged_in' => true,
        'username'  => $_SESSION['username'] ?? 'Utente',
        'role'      => $_SESSION['role'] ?? ''
    ]);
} else {
    echo json_encode(['logged_in' => false]);
}
