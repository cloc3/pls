<?php
session_start();
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/db.php';

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Non autorizzato.']);
    exit;
}

$user_role = $_SESSION['role'] ?? 'insegnante';
if ($user_role !== 'admin') {
    echo json_encode(['success' => false, 'message' => 'Accesso negato: solo gli amministratori possono eliminare i corsi.']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$id_corso = intval($input['id_corso'] ?? 0);

if ($id_corso <= 0) {
    echo json_encode(['success' => false, 'message' => 'ID corso non valido.']);
    exit;
}

try {
    $stmt = $link->prepare("DELETE FROM corsi WHERE id_corso = ?");
    $stmt->bind_param("i", $id_corso);
    $stmt->execute();

    if ($stmt->affected_rows > 0) {
        echo json_encode(['success' => true, 'message' => 'Corso eliminato con successo.']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Corso non trovato o già eliminato.']);
    }
    $stmt->close();
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Errore durante l\'eliminazione: ' . $e->getMessage()]);
}
