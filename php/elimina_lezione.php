<?php
session_start();
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . '/db.php';

// Controllo Autenticazione corretto su user_id
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(["success" => false, "message" => "Accesso non autorizzato."]);
    exit;
}

$input = json_decode(file_get_contents("php://input"), true);

if (!isset($input['id_lezione']) || empty($input['id_lezione'])) {
    echo json_encode(["success" => false, "message" => "ID lezione non fornito."]);
    exit;
}

$id_lezione = (int)$input['id_lezione'];

try {
    $stmt = $link->prepare("DELETE FROM lezioni WHERE id_lezione = ?");
    $stmt->bind_param("i", $id_lezione);
    $stmt->execute();

    if ($stmt->affected_rows > 0) {
        echo json_encode(["success" => true, "message" => "Lezione eliminata correttamente."]);
    } else {
        echo json_encode(["success" => false, "message" => "Lezione non trovata o già eliminata."]);
    }

    $stmt->close();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Errore durante la cancellazione: " . $e->getMessage()]);
}
