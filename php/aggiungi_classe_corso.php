<?php
// php/aggiungi_classe_corso.php

session_start();
header('Content-Type: application/json; charset=utf-8');

ini_set('display_errors', 0);
error_reporting(E_ALL);

require_once __DIR__ . '/db.php';

// Verifica sessione utente
if (!isset($_SESSION['user_id'])) {
  echo json_encode(['success' => false, 'message' => 'Non autorizzato.']);
  exit;
}

// Controllo rigoroso del ruolo: solo l'admin può associare classi/corsi globalmente
$user_role = $_SESSION['role'] ?? 'insegnante';
if ($user_role !== 'admin') {
  echo json_encode(['success' => false, 'message' => 'Accesso negato: operazione consentita solo agli amministratori.']);
  exit;
}

try {
  if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Metodo di richiesta non valido.']);
    exit;
  }

  // Lettura del body JSON inviato dal JS
  $input = json_decode(file_get_contents('php://input'), true);

  if (!is_array($input)) {
    echo json_encode(['success' => false, 'message' => 'Dati JSON non validi.']);
    exit;
  }

  $idCorso = intval($input['id_corso'] ?? 0);
  $idClasse = intval($input['id_classe'] ?? 0);
  $idInsegnante = intval($input['id_insegnante'] ?? 0);

  if ($idCorso <= 0 || $idClasse <= 0 || $idInsegnante <= 0) {
    echo json_encode([
      'success' => false, 
      'message' => 'Parametri mancanti o non validi (Corso, Classe o Insegnante).'
    ]);
    exit;
  }

  $sql = "INSERT INTO corsi_classi_insegnanti (id_corso, id_classe, id_insegnante) 
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE id_insegnante = VALUES(id_insegnante)";

  $stmt = $link->prepare($sql);
  if (!$stmt) {
    throw new Exception("Errore durante la preparazione della query: " . $link->error);
  }

  $stmt->bind_param("iii", $idCorso, $idClasse, $idInsegnante);

  if ($stmt->execute()) {
    echo json_encode([
      'success' => true, 
      'message' => 'Classe e insegnante associati al corso con successo.'
    ]);
  } else {
    echo json_encode([
      'success' => false, 
      'message' => 'Errore durante l\'associazione: ' . $stmt->error
    ]);
  }

  $stmt->close();
  exit;

} catch (Throwable $e) {
  http_response_code(200);
  echo json_encode([
    'success' => false, 
    'message' => 'Errore server: ' . $e->getMessage()
  ]);
  exit;
}
