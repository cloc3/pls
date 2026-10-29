<?php
session_start();
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/db.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Non autorizzato.']);
    exit;
}

$user_id = $_SESSION['user_id'];
$user_role = $_SESSION['role'] ?? 'insegnante';
$username = $_SESSION['username'] ?? 'Utente';

try {
    $corsi = [];

    if ($user_role === 'admin') {
        // L'amministratore vede tutti i corsi
        $query = "SELECT id_corso, titolo, anno_scolastico FROM corsi ORDER BY id_corso DESC";
        $result = $link->query($query);
        while ($row = $result->fetch_assoc()) {
            $corsi[] = $row;
        }
    } else {
        // L'insegnante vede solo i corsi a cui è associato tramite corsi_classi_insegnanti
        $stmt = $link->prepare("
            SELECT DISTINCT c.id_corso, c.titolo, c.anno_scolastico 
            FROM corsi c
            JOIN corsi_classi_insegnanti cci ON c.id_corso = cci.id_corso
            WHERE cci.id_insegnante = ?
            ORDER BY c.id_corso DESC
        ");
        $stmt->bind_param("i", $user_id);
        $stmt->execute();
        $result = $stmt->get_result();
        while ($row = $result->fetch_assoc()) {
            $corsi[] = $row;
        }
        $stmt->close();
    }

    // Se l'insegnante non ha corsi, verifichiamo se ha almeno delle classi associate 
    // per costruire il messaggio di workspace specifico richiesto.
    $messaggio_workspace = null;
    if (empty($corsi) && $user_role !== 'admin') {
        $stmt_classi = $link->prepare("
            SELECT DISTINCT cl.nome_classe 
            FROM corsi_classi_insegnanti cci
            JOIN classi cl ON cci.id_classe = cl.id_classe
            WHERE cci.id_insegnante = ?
        ");
        $stmt_classi->bind_param("i", $user_id);
        $stmt_classi->execute();
        $res_classi = $stmt_classi->get_result();
        
        $classi_associate = [];
        while ($row_cl = $res_classi->fetch_assoc()) {
            $classi_associate[] = $row_cl['nome_classe'];
        }
        $stmt_classi->close();

        if (empty($classi_associate)) {
            $messaggio_workspace = "L'utente {$username} non è attualmente abbinato a nessuna classe e a nessun corso.";
        } else {
            $elenco = implode(', ', $classi_associate);
            $messaggio_workspace = "L'utente {$username} non è attualmente abbinato a nessun corso, ma può controllare l'elenco delle proprie classi, e specificamente: {$elenco}.";
        }
    }

    echo json_encode([
        'success' => true, 
        'corsi' => $corsi, 
        'messaggio_workspace' => $messaggio_workspace,
        'role' => $user_role
    ]);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Errore nel recupero dei corsi: ' . $e->getMessage()]);
}
