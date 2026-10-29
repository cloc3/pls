<?php
// php/crea_corso.php

session_start();
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/db.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Non autorizzato.']);
    exit;
}

// Controllo rigoroso del ruolo amministrativo
$user_role = $_SESSION['role'] ?? 'insegnante';
if ($user_role !== 'admin') {
    echo json_encode(['success' => false, 'message' => 'Accesso negato: privilegi insufficienti.']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Metodo non valido.']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$titolo = trim($input['titolo'] ?? '');
$anno = trim($input['anno_scolastico'] ?? '2026/2027');
$relatori_ids = $input['relatori_ids'] ?? [];
$nuovi_relatori = $input['nuovi_relatori'] ?? [];

if (empty($titolo)) {
    echo json_encode(['success' => false, 'message' => 'Il titolo del corso è obbligatorio.']);
    exit;
}

$link->begin_transaction();

try {
    // 1. Inserisci il Corso
    $stmt = $link->prepare("INSERT INTO corsi (titolo, anno_scolastico) VALUES (?, ?)");
    $stmt->bind_param("ss", $titolo, $anno);
    $stmt->execute();
    $id_corso = $stmt->insert_id;
    $stmt->close();

    // 2. Inserisci eventuali NUOVI relatori nel DB e recupera i loro ID
    if (!empty($nuovi_relatori) && is_array($nuovi_relatori)) {
        $stmtNuovo = $link->prepare("INSERT INTO relatori (nome, cognome, ente_affiliazione) VALUES (?, ?, ?)");
        foreach ($nuovi_relatori as $nr) {
            $nome = trim($nr['nome'] ?? '');
            $cognome = trim($nr['cognome'] ?? '');
            $ente = trim($nr['ente'] ?? '');

            if (!empty($nome) && !empty($cognome)) {
                $stmtNuovo->bind_param("sss", $nome, $cognome, $ente);
                $stmtNuovo->execute();
                $relatori_ids[] = $stmtNuovo->insert_id;
            }
        }
        $stmtNuovo->close();
    }

    // 3. Associa tutti i relatori (esistenti + appena creati) nella tabella pivot
    if (!empty($relatori_ids) && is_array($relatori_ids)) {
        $stmtRel = $link->prepare("INSERT INTO corsi_relatori (id_corso, id_relatore) VALUES (?, ?)");
        foreach (array_unique($relatori_ids) as $id_rel) {
            $id_rel_int = intval($id_rel);
            if ($id_rel_int > 0) {
                $stmtRel->bind_param("ii", $id_corso, $id_rel_int);
                $stmtRel->execute();
            }
        }
        $stmtRel->close();
    }

    $link->commit();
    echo json_encode([
        'success' => true,
        'message' => 'Corso e tutti i relatori salvati con successo!',
        'id_corso' => $id_corso
    ]);
} catch (Exception $e) {
    $link->rollback();
    echo json_encode(['success' => false, 'message' => 'Errore nel salvataggio: ' . $e->getMessage()]);
}
