<?php
// php/salva_appello.php

session_start();
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/db.php';

if (!isset($_SESSION['user_id'])) {
  echo json_encode(['success' => false, 'message' => 'Non autorizzato.']);
  exit;
}

$action = $_GET['action'] ?? '';

if ($action === 'get_dati_appello') {
  $id_lezione = intval($_GET['id_lezione'] ?? 0);
  $id_classe = intval($_GET['id_classe'] ?? 0);

  if (!$id_lezione || !$id_classe) {
    echo json_encode(['success' => false, 'message' => 'Parametri mancanti']);
    exit;
  }

  $user_role = $_SESSION['role'] ?? 'insegnante';
  $user_id = $_SESSION['user_id'];

  // Controllo IDOR per i docenti
  if ($user_role !== 'admin') {
    $stmtCheck = $link->prepare("
            SELECT 1 FROM corsi_classi_insegnanti cci
            JOIN lezioni l ON l.id_corso = cci.id_corso
            WHERE l.id_lezione = ? AND cci.id_classe = ? AND cci.id_insegnante = ?
            LIMIT 1
        ");
        $stmtCheck->bind_param("iii", $id_lezione, $id_classe, $user_id);
        $stmtCheck->execute();
        $isAuthorized = $stmtCheck->get_result()->fetch_assoc();
        $stmtCheck->close();

        if (!$isAuthorized) {
            echo json_encode(['success' => false, 'message' => 'Accesso negato: non autorizzato a visualizzare questo appello.']);
            exit;
        }
    }

    try {
        // 1. Info Lezione e Corso
        $stmt = $link->prepare("
            SELECT l.id_lezione, l.durata_ore, DATE_FORMAT(l.data_ora, '%d/%m/%Y %H:%i') as data_ora_formattata, c.titolo as titolo_corso
            FROM lezioni l
            JOIN corsi c ON l.id_corso = c.id_corso
            WHERE l.id_lezione = ?
        ");
        $stmt->bind_param("i", $id_lezione);
        $stmt->execute();
        $lezione = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        // 2. Info Classe
        $stmt = $link->prepare("SELECT id_classe, nome_classe FROM classi WHERE id_classe = ?");
        $stmt->bind_param("i", $id_classe);
        $stmt->execute();
        $classe = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        // 3. Lista Insegnanti
        $resInsegnanti = $link->query("SELECT id_insegnante, nome, cognome FROM insegnanti ORDER BY cognome ASC, nome ASC");
        $insegnanti = $resInsegnanti ? $resInsegnanti->fetch_all(MYSQLI_ASSOC) : [];

        // 4. Record Presenza Docente
        $stmt = $link->prepare("
            SELECT id_insegnante AS id_insegnante_titolare, id_insegnante_sostituto, ore_non_curricolari, note_sostituzione,
                   COALESCE(id_insegnante_sostituto, id_insegnante) AS id_insegnante_effettivo
            FROM presenze_docenti_lezioni
            WHERE id_lezione = ? AND id_classe = ?
        ");
        $stmt->bind_param("ii", $id_lezione, $id_classe);
        $stmt->execute();
        $presenze_docente = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        // 5. Lista Studenti della Classe
        $stmt = $link->prepare("SELECT id_studente, nome, cognome FROM studenti WHERE id_classe = ? ORDER BY cognome ASC, nome ASC");
        $stmt->bind_param("i", $id_classe);
        $stmt->execute();
        $studenti = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();

        // 6. Presenze Studenti già memorizzate
        $stmt = $link->prepare("
            SELECT p.id_studente, p.presente 
            FROM presenze p
            JOIN studenti s ON p.id_studente = s.id_studente
            WHERE p.id_lezione = ? AND s.id_classe = ?
        ");
        $stmt->bind_param("ii", $id_lezione, $id_classe);
        $stmt->execute();
        $presenze_studenti = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();

        echo json_encode([
            'success' => true,
            'data' => [
                'lezione' => $lezione,
                'classe' => $classe,
                'insegnanti' => $insegnanti,
                'presenze_docente' => $presenze_docente,
                'studenti' => $studenti,
                'presenze_studenti' => $presenze_studenti
            ]
        ]);

    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
    exit;
}

if ($action === 'salva_appello') {
    $input = json_decode(file_get_contents('php://input'), true);

    $id_lezione = intval($input['id_lezione'] ?? 0);
    $id_classe = intval($input['id_classe'] ?? 0);
    $id_insegnante = intval($input['id_insegnante'] ?? 0);
    $ore_non_curricolari = floatval($input['ore_non_curricolari'] ?? 0);
    $note_sostituzione = trim($input['note_sostituzione'] ?? '');
    $studenti = $input['studenti'] ?? [];

    if (!$id_lezione || !$id_classe || !$id_insegnante) {
        echo json_encode(['success' => false, 'message' => 'Dati incompleti per il salvataggio']);
        exit;
    }

    $user_role = $_SESSION['role'] ?? 'insegnante';
    $user_id = $_SESSION['user_id'];

    // Controllo di ownership/autorizzazione alla scrittura per i docenti
    if ($user_role !== 'admin') {
        $stmtCheck = $link->prepare("
            SELECT 1 FROM corsi_classi_insegnanti cci
            JOIN lezioni l ON l.id_corso = cci.id_corso
            WHERE l.id_lezione = ? AND cci.id_classe = ? AND cci.id_insegnante = ?
            LIMIT 1
        ");
        $stmtCheck->bind_param("iii", $id_lezione, $id_classe, $user_id);
        $stmtCheck->execute();
        $isAuthorized = $stmtCheck->get_result()->fetch_assoc();
        $stmtCheck->close();

        if (!$isAuthorized) {
            echo json_encode(['success' => false, 'message' => 'Accesso negato: non sei autorizzato a modificare questo appello.']);
            exit;
        }
    }

    $link->begin_transaction();

  try {
        // 1. Recupero Insegnante Titolare
        $stmt = $link->prepare("
            SELECT cci.id_insegnante 
            FROM corsi_classi_insegnanti cci
            JOIN lezioni l ON l.id_corso = cci.id_corso
            WHERE l.id_lezione = ? AND cci.id_classe = ?
        ");
        $stmt->bind_param("ii", $id_lezione, $id_classe);
        $stmt->execute();
        $resTitolare = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        $id_titolare = $resTitolare['id_insegnante'] ?? $id_insegnante;
        $id_sostituto = ($id_insegnante !== $id_titolare) ? $id_insegnante : null;

        // 2. Salvataggio / Aggiornamento Tabella Presenze Docenti
        $stmt = $link->prepare("
            INSERT INTO presenze_docenti_lezioni 
                (id_lezione, id_classe, id_insegnante, id_insegnante_sostituto, note_sostituzione, ore_non_curricolari)
            VALUES 
                (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                id_insegnante = VALUES(id_insegnante),
                id_insegnante_sostituto = VALUES(id_insegnante_sostituto),
                note_sostituzione = VALUES(note_sostituzione),
                ore_non_curricolari = VALUES(ore_non_curricolari)
        ");
        $stmt->bind_param("iiiisd", $id_lezione, $id_classe, $id_titolare, $id_sostituto, $note_sostituzione, $ore_non_curricolari);
        $stmt->execute();
        $stmt->close();

        // 3. Salvataggio Presenze Studenti
        $stmtStudente = $link->prepare("
            INSERT INTO presenze (id_lezione, id_studente, presente)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE presente = VALUES(presente)
        ");

        foreach ($studenti as $st) {
            $id_st = intval($st['id_studente']);
            $pres = intval($st['presente']);
            $stmtStudente->bind_param("iii", $id_lezione, $id_st, $pres);
            $stmtStudente->execute();
        }
        $stmtStudente->close();

        $link->commit();
        echo json_encode(['success' => true]);

    } catch (Exception $e) {
        $link->rollback();
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
    exit;
}
