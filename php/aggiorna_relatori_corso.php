<?php
session_start();
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/db.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Non autorizzato.']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$id_corso = intval($input['id_corso'] ?? 0);
$relatori_ids = $input['relatori_ids'] ?? [];
$nuovi_relatori = $input['nuovi_relatori'] ?? [];

if ($id_corso <= 0) {
    echo json_encode(['success' => false, 'message' => 'ID corso non valido.']);
    exit;
}

$link->begin_transaction();

try {
    // 1. Inserisci eventuali NUOVI relatori creati al volo
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

    // 2. Rimuovi le associazioni precedenti per questo corso
    $stmtDel = $link->prepare("DELETE FROM corsi_relatori WHERE id_corso = ?");
    $stmtDel->bind_param("i", $id_corso);
    $stmtDel->execute();
    $stmtDel->close();

    // 3. Reinserisci la lista aggiornata di relatori
    if (!empty($relatori_ids) && is_array($relatori_ids)) {
        $stmtIns = $link->prepare("INSERT INTO corsi_relatori (id_corso, id_relatore) VALUES (?, ?)");
        foreach (array_unique($relatori_ids) as $id_rel) {
            $id_rel_int = intval($id_rel);
            if ($id_rel_int > 0) {
                $stmtIns->bind_param("ii", $id_corso, $id_rel_int);
                $stmtIns->execute();
            }
        }
        $stmtIns->close();
    }

    $link->commit();
    echo json_encode(['success' => true, 'message' => 'Relatori aggiornati con successo!']);
} catch (Exception $e) {
    $link->rollback();
    echo json_encode(['success' => false, 'message' => 'Errore durante l\'aggiornamento: ' . $e->getMessage()]);
}
