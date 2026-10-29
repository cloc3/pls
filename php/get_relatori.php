<?php
session_start();
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/db.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Non autorizzato.']);
    exit;
}

// Corretto: ente_affiliazione anziché ente_appartenenza
$query = "SELECT id_relatore, nome, cognome, ente_affiliazione FROM relatori ORDER BY cognome, nome";
$result = $link->query($query);

$relatori = [];
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $relatori[] = $row;
    }
    echo json_encode(['success' => true, 'relatori' => $relatori]);
} else {
    echo json_encode(['success' => false, 'message' => 'Errore nel recupero dei relatori.']);
}
