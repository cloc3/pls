<?php
session_start();
header('Content-Type: application/json; charset=utf-8');

// Includiamo la connessione al database fornita nello scheletro
require_once __DIR__ . '/db.php';

// Verifichiamo che la richiesta sia POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  echo json_encode(['success' => false, 'message' => 'Metodo non consentito.']);
  exit;
}

// Recupero dei dati inviati da JS (JSON o Form Data)
$input = json_decode(file_get_contents('php://input'), true);
$username = trim($input['username'] ?? $_POST['username'] ?? '');
$password = trim($input['password'] ?? $_POST['password'] ?? '');

if (empty($username) || empty($password)) {
  echo json_encode(['success' => false, 'message' => 'Compilare tutti i campi.']);
  exit;
}

// 1. Controllo nella tabella AMMINISTRATORI
$stmtAdmin = $link->prepare("SELECT id_amministratore, nickname, password_hash, email FROM amministratori WHERE nickname = ? OR email = ?");
$stmtAdmin->bind_param("ss", $username, $username);
$stmtAdmin->execute();
$resAdmin = $stmtAdmin->get_result();

if ($row = $resAdmin->fetch_assoc()) {
  if (password_verify($password, $row['password_hash'])) {
    $_SESSION['user_id'] = $row['id_amministratore'];
    $_SESSION['username'] = $row['nickname'];
    $_SESSION['role'] = 'admin';

    echo json_encode([
      'success' => true,
      'role' => 'admin',
      'username' => $row['nickname'],
      'message' => 'Login amministratore effettuato con successo.'
    ]);
    $stmtAdmin->close();
    exit;
  }
}
$stmtAdmin->close();

// 2. Controllo nella tabella INSEGNANTI (se non è un amministratore)
$stmtTeacher = $link->prepare("SELECT id_insegnante, nome, cognome, email, password_hash, activation_token, activation_expires FROM insegnanti WHERE email = ?");
$stmtTeacher->bind_param("s", $username);
$stmtTeacher->execute();
$resTeacher = $stmtTeacher->get_result();

if ($row = $resTeacher->fetch_assoc()) {
  // Controllo se l'account ha un token di attivazione pendente E la password non è stata ancora impostata
  if (!empty($row['activation_token']) && empty($row['password_hash'])) {
    $ora_attuale = new DateTime();
    $scadenza = !empty($row['activation_expires']) ? new DateTime($row['activation_expires']) : $ora_attuale;

    if ($ora_attuale > $scadenza) {
      echo json_encode([
        'success' => false, 
        'message' => 'Il link di attivazione è scaduto. Richiedi un nuovo invio all\'amministratore.'
      ]);
    } else {
      echo json_encode([
        'success' => false, 
        'message' => 'Account non attivato. Completa la registrazione tramite il link inviato via email.'
      ]);
    }
    $stmtTeacher->close();
    exit;
  }

  // Procediamo con il controllo della password
  if (!empty($row['password_hash']) && password_verify($password, $row['password_hash'])) {
    $_SESSION['user_id'] = $row['id_insegnante'];
    $_SESSION['username'] = $row['nome'] . ' ' . $row['cognome'];
    $_SESSION['role'] = 'insegnante';

    echo json_encode([
      'success' => true,
      'role' => 'insegnante',
      'username' => $_SESSION['username'],
      'message' => 'Login insegnante effettuato con successo.'
    ]);
    $stmtTeacher->close();
    exit;
  }
}
$stmtTeacher->close();

// Credenziali non valide
echo json_encode(['success' => false, 'message' => 'Credenziali errate. Riprova.']);
