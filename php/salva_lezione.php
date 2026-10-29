<?php
session_start();
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/db.php';

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Non autorizzato.']);
    exit;
}

$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data || !isset($data['id_corso'])) {
    echo json_encode(['success' => false, 'message' => 'Dati mancanti o non validi.']);
    exit;
}

$link->begin_transaction();

try {
    $id_aula = !empty($data['id_aula']) ? (int)$data['id_aula'] : null;

    if (!$data['is_sede_esterna'] && !empty($data['nuova_aula']['isNuova']) && !empty($data['nuova_aula']['nome'])) {
        $nomeAula = trim($data['nuova_aula']['nome']);
        $capienza = !empty($data['nuova_aula']['capienza']) ? (int)$data['nuova_aula']['capienza'] : null;

        $stmtAula = $link->prepare("INSERT INTO aule (nome_aula, capienza) VALUES (?, ?) 
            ON DUPLICATE KEY UPDATE id_aula=LAST_INSERT_ID(id_aula)");
        $stmtAula->bind_param("si", $nomeAula, $capienza);

        if (!$stmtAula->execute()) {
            throw new Exception("Errore nell'inserimento dell'aula: " . $stmtAula->error);
        }

        $id_aula = $link->insert_id;
        $stmtAula->close();
    }

    $id_lezione = !empty($data['id_lezione']) ? (int)$data['id_lezione'] : null;
    $id_corso = (int)$data['id_corso'];
    $durata_ore = (int)($data['durata_ore'] ?? 2);
    $data_ora = !empty($data['data_ora']) ? $data['data_ora'] : null;
    $is_sede_esterna = $data['is_sede_esterna'] ? 1 : 0;
    $descrizione_sede = $is_sede_esterna ? ($data['descrizione_sede_esterna'] ?? null) : null;
    $stato_prenotazione = $data['stato_prenotazione_aula'] ?? 'in_attesa';
    $ospiti = (int)($data['numero_ospiti_esterni'] ?? 0);

    $final_id_aula = $is_sede_esterna ? null : $id_aula;

    if ($id_lezione) {
        $sql = "UPDATE lezioni 
            SET durata_ore = ?,
            data_ora = ?,
            is_sede_esterna = ?,
            descrizione_sede_esterna = ?,
            id_aula = ?,
            stato_prenotazione_aula = ?,
            numero_ospiti_esterni = ?
            WHERE id_lezione = ? AND id_corso = ?";

        $stmt = $link->prepare($sql);
        $stmt->bind_param(
            "isisisiii", 
            $durata_ore, 
            $data_ora, 
            $is_sede_esterna, 
            $descrizione_sede, 
            $final_id_aula, 
            $stato_prenotazione, 
            $ospiti, 
            $id_lezione, 
            $id_corso
        );
    } else {
        $sql = "INSERT INTO lezioni (
            id_corso, data_ora, durata_ore, 
            is_sede_esterna, descrizione_sede_esterna, id_aula, 
            stato_prenotazione_aula, numero_ospiti_esterni
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";

        $stmt = $link->prepare($sql);
        $stmt->bind_param(
            "isiisisi", 
            $id_corso, 
            $data_ora, 
            $durata_ore, 
            $is_sede_esterna, 
            $descrizione_sede, 
            $final_id_aula, 
            $stato_prenotazione, 
            $ospiti
        );
    }

    if (!$stmt->execute()) {
        throw new Exception("Errore nel salvataggio della lezione: " . $stmt->error);
    }

    $stmt->close();
    $link->commit();
    echo json_encode(['success' => true, 'message' => 'Lezione salvata con successo.']);

} catch (Exception $e) {
    $link->rollback();
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
