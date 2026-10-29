<?php
session_start();
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/db.php';

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Non autorizzato.']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$id_corso = intval($input['id_corso'] ?? 0);
$note = trim($input['note'] ?? '');

if ($id_corso <= 0) {
    echo json_encode(['success' => false, 'message' => 'ID corso non valido.']);
    exit;
}

$stmt = $link->prepare("UPDATE corsi SET note = ? WHERE id_corso = ?");
$stmt->bind_param("si", $note, $id_corso);

if ($stmt->execute()) {
    echo json_encode(['success' => true, 'message' => 'Note salvate con successo.']);
} else {
    echo json_encode(['success' => false, 'message' => 'Errore durante il salvataggio: ' . $stmt->error]);
}

$stmt->close();
