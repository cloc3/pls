<?php
// php/get_corso_dettaglio.php

session_start();
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/db.php';

if (!isset($_SESSION['user_id'])) {
  echo json_encode(['success' => false, 'message' => 'Non autorizzato.']);
  exit;
}

$id_corso = intval($_GET['id_corso'] ?? 0);
if ($id_corso <= 0) {
  echo json_encode(['success' => false, 'message' => 'ID corso non valido.']);
  exit;
}

$user_id = $_SESSION['user_id'];
$user_role = $_SESSION['role'] ?? 'insegnante';

// Controllo IDOR: se non è admin, verifica che l'insegnante sia associato al corso
if ($user_role !== 'admin') {
  $stmtCheck = $link->prepare("
        SELECT 1 FROM corsi_classi_insegnanti 
        WHERE id_corso = ? AND id_insegnante = ? 
        LIMIT 1
    ");
    $stmtCheck->bind_param("ii", $id_corso, $user_id);
    $stmtCheck->execute();
    $isAuthorized = $stmtCheck->get_result()->fetch_assoc();
    $stmtCheck->close();

    if (!$isAuthorized) {
        echo json_encode(['success' => false, 'message' => 'Accesso negato: non sei autorizzato a visualizzare i dettagli di questo corso.']);
        exit;
    }
}

try {
    // 1. Info Corso
    $stmt = $link->prepare("SELECT id_corso, titolo, anno_scolastico, note FROM corsi WHERE id_corso = ?");
    $stmt->bind_param("i", $id_corso);
    $stmt->execute();
    $corso = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$corso) {
        echo json_encode(['success' => false, 'message' => 'Corso non trovato.']);
        exit;
    }

    // 2. Relatori associati
    $stmtRel = $link->prepare("
        SELECT r.id_relatore, r.nome, r.cognome, r.ente_affiliazione, r.email
        FROM relatori r
        JOIN corsi_relatori cr ON r.id_relatore = cr.id_relatore
        WHERE cr.id_corso = ?
        ORDER BY r.cognome ASC, r.nome ASC
    ");
    $stmtRel->bind_param("i", $id_corso);
    $stmtRel->execute();
    $resRel = $stmtRel->get_result();
    $corso['relatori'] = [];
    while ($r = $resRel->fetch_assoc()) {
        $corso['relatori'][] = $r;
    }
    $stmtRel->close();

    // 3. Lezioni del corso con dati aule
    $stmtLez = $link->prepare("
        SELECT l.id_lezione, l.data_ora, l.durata_ore,
               l.is_sede_esterna, l.descrizione_sede_esterna, l.stato_prenotazione_aula, l.numero_ospiti_esterni,
               a.id_aula, a.nome_aula, a.capienza
        FROM lezioni l
        LEFT JOIN aule a ON l.id_aula = a.id_aula
        WHERE l.id_corso = ?
        ORDER BY l.data_ora ASC, l.id_lezione ASC
    ");
    $stmtLez->bind_param("i", $id_corso);
    $stmtLez->execute();
    $resLez = $stmtLez->get_result();
    $corso['lezioni'] = [];
    while ($l = $resLez->fetch_assoc()) {
        $corso['lezioni'][] = $l;
    }
    $stmtLez->close();

    // 4. Classi e Insegnanti associati al corso
    $stmtClassi = $link->prepare("
        SELECT cci.id_classe, cl.nome_classe,
               i.id_insegnante, i.nome AS nome_insegnante, i.cognome AS cognome_insegnante, i.email AS email_insegnante, i.scuola
        FROM corsi_classi_insegnanti cci
        JOIN classi cl ON cci.id_classe = cl.id_classe
        LEFT JOIN insegnanti i ON cci.id_insegnante = i.id_insegnante
        WHERE cci.id_corso = ?
        ORDER BY cl.nome_classe ASC
    ");
    $stmtClassi->bind_param("i", $id_corso);
    $stmtClassi->execute();
    $resClassi = $stmtClassi->get_result();
    $corso['classi'] = [];
    while ($c = $resClassi->fetch_assoc()) {
        $corso['classi'][] = $c;
    }
    $stmtClassi->close();

    echo json_encode(['success' => true, 'corso' => $corso]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Errore: ' . $e->getMessage()]);
}
