<?php
// php/gestisciAnagrafica.php

// Funzione d'appoggio per verificare se l'insegnante è associato a una classe
function isDocenteAssociatoAClasse($link, $id_insegnante, $id_classe) {
  $stmt = $link->prepare("SELECT 1 FROM corsi_classi_insegnanti WHERE id_insegnante = ? AND id_classe = ? LIMIT 1");
  $stmt->bind_param("ii", $id_insegnante, $id_classe);
  $stmt->execute();
  $res = $stmt->get_result()->fetch_assoc();
  $stmt->close();
  return !empty($res);
}

// Funzione d'appoggio per verificare se l'insegnante è associato a un corso
function isDocenteAssociatoACorso($link, $id_insegnante, $id_corso) {
  $stmt = $link->prepare("SELECT 1 FROM corsi_classi_insegnanti WHERE id_insegnante = ? AND id_corso = ? LIMIT 1");
  $stmt->bind_param("ii", $id_insegnante, $id_corso);
  $stmt->execute();
  $res = $stmt->get_result()->fetch_assoc();
  $stmt->close();
  return !empty($res);
}

session_start();
header('Content-Type: application/json; charset=utf-8');

ini_set('display_errors', 0);
error_reporting(E_ALL);

require_once __DIR__ . '/db.php';

if (!isset($_SESSION['user_id'])) {
  echo json_encode(['success' => false, 'message' => 'Non autorizzato.']);
  exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? $_POST['action'] ?? '';

// Per i payload JSON nelle richieste POST
$input = [];
if ($method === 'POST') {
  $rawInput = file_get_contents('php://input');
  $input = json_decode($rawInput, true) ?? [];
  if (empty($action) && isset($input['action'])) {
    $action = $input['action'];
  }
}

try {
  if ($method === 'GET') {
    switch ($action) {

    case 'lezioni_e_presenze_classe':
      $user_role = $_SESSION['role'] ?? 'insegnante';
      $user_id = $_SESSION['user_id'];

      $idClasse = intval($_GET['id_classe'] ?? 0);
      if ($idClasse <= 0) {
        echo json_encode(['success' => false, 'message' => 'ID classe non valido.']);
        exit;
      }

      if ($user_role !== 'admin' && !isDocenteAssociatoAClasse($link, $user_id, $idClasse)) {
        echo json_encode(['success' => false, 'message' => 'Accesso negato: non sei associato a questa classe.']);
        exit;
      }

      $idClasse = intval($_GET['id_classe'] ?? 0);
      if ($idClasse <= 0) {
        echo json_encode(['success' => false, 'message' => 'ID classe non valido.']);
        exit;
      }

      // 1. Trova il corso a cui è iscritta la classe
      $stmtCorso = $link->prepare("SELECT id_corso FROM corsi_classi_insegnanti WHERE id_classe = ? LIMIT 1");
      $stmtCorso->bind_param("i", $idClasse);
      $stmtCorso->execute();
      $resCorso = $stmtCorso->get_result()->fetch_assoc();
      $stmtCorso->close();

      if (!$resCorso) {
        echo json_encode(['success' => false, 'message' => 'La classe non è iscritta a nessun corso.']);
        exit;
      }

      $idCorso = $resCorso['id_corso'];

      // 2. Recupera tutte le lezioni ordinate per data/ora
      $stmtLezioni = $link->prepare("
        SELECT id_lezione, data_ora, durata_ore 
        FROM lezioni 
        WHERE id_corso = ? 
        ORDER BY data_ora ASC
      ");
      $stmtLezioni->bind_param("i", $idCorso);
      $stmtLezioni->execute();
      $resLezioni = $stmtLezioni->get_result();
      $lezioni = [];
      while ($r = $resLezioni->fetch_assoc()) {
        $lezioni[] = $r;
      }
      $stmtLezioni->close();

      // 3. Recupera gli studenti della classe
      $stmtStud = $link->prepare("SELECT id_studente, nome, cognome FROM studenti WHERE id_classe = ? ORDER BY cognome ASC, nome ASC");
      $stmtStud->bind_param("i", $idClasse);
      $stmtStud->execute();
      $resStud = $stmtStud->get_result();
      $studenti = [];
      while ($r = $resStud->fetch_assoc()) {
        $studenti[] = $r;
      }
      $stmtStud->close();

      // 4. Recupera lo storico presenze (usando la tabella presenze)
      $presenze = [];
      if (!empty($lezioni)) {
        $idsLezioni = array_column($lezioni, 'id_lezione');
        $inClause = implode(',', array_fill(0, count($idsLezioni), '?'));

        $sqlPres = "SELECT id_studente, id_lezione, presente FROM presenze WHERE id_lezione IN ($inClause)";
        $stmtPres = $link->prepare($sqlPres);
        $types = str_repeat('i', count($idsLezioni));
        $stmtPres->bind_param($types, ...$idsLezioni);
        $stmtPres->execute();
        $resPres = $stmtPres->get_result();
        while ($r = $resPres->fetch_assoc()) {
          $presenze[$r['id_studente']][$r['id_lezione']] = (bool)$r['presente'];
        }
        $stmtPres->close();
      }

      echo json_encode([
        'success' => true,
        'id_corso' => $idCorso,
        'lezioni' => $lezioni,
        'studenti' => $studenti,
        'presenze' => $presenze
      ]);
      exit;

case 'lista':
      $tipo = $_GET['tipo'] ?? '';
      $user_role = $_SESSION['role'] ?? 'insegnante';
      $user_id = $_SESSION['user_id'];

      if ($tipo === 'aula') {
        $sql = "SELECT * FROM aule ORDER BY nome_aula ASC";
        $res = $link->query($sql);
        $data = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];
        echo json_encode(['success' => true, 'data' => $data]);
        exit;
      }

      if ($tipo === 'classe') {
        if ($user_role === 'admin') {
          $sql = "SELECT
            cl.id_classe,
            cl.nome_classe,
            i.id_insegnante,
            i.nome AS nome_insegnante,
            i.cognome AS cognome_insegnante
            FROM classi cl
            LEFT JOIN corsi_classi_insegnanti cci ON cl.id_classe = cci.id_classe
            LEFT JOIN insegnanti i ON cci.id_insegnante = i.id_insegnante
            ORDER BY cl.nome_classe ASC";
          $res = $link->query($sql);
        } else {
          $sql = "SELECT DISTINCT
            cl.id_classe,
            cl.nome_classe,
            i.id_insegnante,
            i.nome AS nome_insegnante,
            i.cognome AS cognome_insegnante
            FROM classi cl
            INNER JOIN corsi_classi_insegnanti cci ON cl.id_classe = cci.id_classe
            LEFT JOIN insegnanti i ON cci.id_insegnante = i.id_insegnante
            WHERE cci.id_insegnante = ?
            ORDER BY cl.nome_classe ASC";
          $stmt = $link->prepare($sql);
          $stmt->bind_param("i", $user_id);
          $stmt->execute();
          $res = $stmt->get_result();
          $stmt->close();
        }

        $data = [];
        while ($row = $res->fetch_assoc()) {
          $data[] = $row;
        }
        echo json_encode(['success' => true, 'data' => $data]);
        exit;
      }

      $tabella = ($tipo === 'insegnante') ? 'insegnanti' : 'relatori';
      $sql = "SELECT * FROM {$tabella} ORDER BY cognome ASC, nome ASC";
      $res = $link->query($sql);
      $data = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];
      echo json_encode(['success' => true, 'data' => $data]);
      exit;

case 'classi_corso':
  $user_role = $_SESSION['role'] ?? 'insegnante';
  $user_id = $_SESSION['user_id'];

  $idCorso = intval($_GET['id_corso'] ?? 0);
  if ($idCorso <= 0) {
    echo json_encode(['success' => false, 'message' => 'ID corso non valido.']);
    exit;
  }

  if ($user_role !== 'admin' && !isDocenteAssociatoACorso($link, $user_id, $idCorso)) {
    echo json_encode(['success' => false, 'message' => 'Accesso negato: non sei associato a questo corso.']);
    exit;
  }

  $sql = "SELECT
    cl.id_classe,
    cl.nome_classe,
    i.id_insegnante,
    i.scuola,
    i.nome AS nome_insegnante,
    i.cognome AS cognome_insegnante,
    i.email AS email_insegnante
    FROM corsi_classi_insegnanti cc
    INNER JOIN classi cl ON cc.id_classe = cl.id_classe
    LEFT JOIN insegnanti i ON cc.id_insegnante = i.id_insegnante
    WHERE cc.id_corso = ?
    ORDER BY cl.nome_classe ASC";

  $stmt = $link->prepare($sql);
  if (!$stmt) throw new Exception("Errore prepare classi_corso: " . $link->error);
  $stmt->bind_param("i", $idCorso);
  $stmt->execute();
  $res = $stmt->get_result();

  $data = [];
  while ($row = $res->fetch_assoc()) {
    $data[] = $row;
  }
  $stmt->close();
  echo json_encode(['success' => true, 'data' => $data]);
  exit;

case 'studenti_classe':
  $user_role = $_SESSION['role'] ?? 'insegnante';
  $user_id = $_SESSION['user_id'];

  $idClasse = intval($_GET['id_classe'] ?? 0);
  if ($idClasse <= 0) {
    echo json_encode(['success' => false, 'message' => 'ID classe non valido.']);
    exit;
  }

  if ($user_role !== 'admin' && !isDocenteAssociatoAClasse($link, $user_id, $idClasse)) {
    echo json_encode(['success' => false, 'message' => 'Accesso negato: non sei associato a questa classe.']);
    exit;
  }

  $stmt = $link->prepare("SELECT id_studente, nome, cognome FROM studenti WHERE id_classe = ? ORDER BY cognome ASC, nome ASC");
  $stmt->bind_param("i", $idClasse);
  $stmt->execute();
  $res = $stmt->get_result();

  $studenti = [];
  while ($row = $res->fetch_assoc()) {
    $studenti[] = $row;
  }
  $stmt->close();

  echo json_encode(['success' => true, 'data' => $studenti]);
  exit;

case 'get_link':
  $user_role = $_SESSION['role'] ?? 'insegnante';
  if ($user_role !== 'admin') {
    echo json_encode(['success' => false, 'message' => 'Accesso negato: operazione riservata agli amministratori.']);
    exit;
  }

  $idInsegnante = intval($_GET['id'] ?? 0);
  $stmt = $link->prepare("SELECT activation_token FROM insegnanti WHERE id_insegnante = ?");
  $stmt->bind_param("i", $idInsegnante);

  $stmt->execute();
  $res = $stmt->get_result()->fetch_assoc();
  $stmt->close();

  if ($res && !empty($res['activation_token'])) {
    $baseDir = rtrim(dirname(dirname($_SERVER['SCRIPT_NAME'])), '/\\');
    $linkAttivazione = "https://" . $_SERVER['HTTP_HOST'] . $baseDir . "/php/imposta_password.php?token=" . $res['activation_token'];
    echo json_encode(['success' => true, 'activation_link' => $linkAttivazione]);
  } else {
    echo json_encode(['success' => false, 'message' => 'Token non trovato per questo insegnante. Utilizza il pulsante "Rigenera".']);
  }
  exit;

default:
  echo json_encode(['success' => false, 'message' => "Azione GET '{$action}' non valida."]);
  exit;
    }
  }

  if ($method === 'POST') {
    $user_role = $_SESSION['role'] ?? 'insegnante';

    // Blocco preventivo per operazioni globali sulle classi riservate agli admin
    if (
      ($action === 'salva' && ($input['tipo'] ?? '') === 'classe') ||
      ($action === 'elimina' && ($input['tipo'] ?? '') === 'classe') ||
      ($action === 'elimina' && ($input['tipo'] ?? '') === 'insegnante') // opzionalmente anche l'eliminazione docenti
    ) {
      if ($user_role !== 'admin') {
        echo json_encode(['success' => false, 'message' => 'Accesso negato: operazione consentita solo agli amministratori.']);
        exit;
      }
    }

    switch ($action) {

    case 'rimuovi_classe_corso':
      $idCorso = intval($input['id_corso'] ?? 0);
      $idClasse = intval($input['id_classe'] ?? 0);

      if ($idCorso <= 0 || $idClasse <= 0) {
        echo json_encode(['success' => false, 'message' => 'Parametri non validi.']);
        exit;
      }

      $user_role = $_SESSION['role'] ?? 'insegnante';
      if ($user_role !== 'admin') {
        echo json_encode(['success' => false, 'message' => 'Accesso negato: operazione consentita solo agli amministratori.']);
        exit;
      }

      $stmt = $link->prepare("DELETE FROM corsi_classi_insegnanti WHERE id_corso = ? AND id_classe = ?");
      $stmt->bind_param("ii", $idCorso, $idClasse);
      if ($stmt->execute()) {
        $stmt->close();
        echo json_encode(['success' => true, 'message' => 'Classe rimossa con successo.']);
      } else {
        $stmt->close();
        echo json_encode(['success' => false, 'message' => 'Errore durante la rimozione.']);
      }
      exit;

    case 'rigenera_link':
      $user_role = $_SESSION['role'] ?? 'insegnante';
      if ($user_role !== 'admin') {
        echo json_encode(['success' => false, 'message' => 'Accesso negato: operazione riservata agli amministratori.']);
        exit;
      }

      $baseDir = rtrim(dirname(dirname($_SERVER['SCRIPT_NAME'])), '/\\');
      $idInsegnante = intval($input['id_insegnante'] ?? 0);
      if ($idInsegnante <= 0) {
        echo json_encode(['success' => false, 'message' => 'ID insegnante non valido.']);
        exit;
      }

      // Genera un nuovo token e una nuova scadenza (es. 2 giorni da adesso)
      $nuovoToken = bin2hex(random_bytes(16));
      $nuovaScadenza = date('Y-m-d H:i:s', strtotime('+2 days'));

      // Impostiamo password_hash a NULL per rendere inattiva la vecchia password
      $stmt = $link->prepare("UPDATE insegnanti SET activation_token = ?, activation_expires = ?, password_hash = NULL WHERE id_insegnante = ?");
      $stmt->bind_param("ssi", $nuovoToken, $nuovaScadenza, $idInsegnante);
/*
      $stmt = $link->prepare("UPDATE insegnanti SET activation_token = ?, activation_expires = ? WHERE id_insegnante = ?");
      $stmt->bind_param("ssi", $nuovoToken, $nuovaScadenza, $idInsegnante);
 */
      if ($stmt->execute()) {
        $stmt->close();
        $linkAttivazione = "https://" . $_SERVER['HTTP_HOST'] . $baseDir . "/php/imposta_password.php?token=" . $nuovoToken;
        echo json_encode([
          'success' => true,
          'message' => 'Token rigenerato con successo.',
          'activation_link' => $linkAttivazione
        ]);
      } else {
        $stmt->close();
        echo json_encode(['success' => false, 'message' => 'Errore durante la rigenerazione del token.']);
      }
      exit;

    case 'salva_presenze':
      $presenze = $input['presenze'] ?? [];
      if (empty($presenze) || !is_array($presenze)) {
        echo json_encode(['success' => false, 'message' => 'Nessun dato di presenza ricevuto.']);
        exit;
      }

      $user_role = $_SESSION['role'] ?? 'insegnante';
      $user_id = $_SESSION['user_id'];

      // Estraiamo tutti gli id_lezione unici presenti nel payload per validarli
      $idsLezioni = array_unique(array_filter(array_column($presenze, 'id_lezione'), function($id) {
        return intval($id) > 0;
      }));

      if ($user_role !== 'admin' && !empty($idsLezioni)) {
        // Verifica che tutte le lezioni appartengano a corsi/classi associati all'insegnante
        $inClause = implode(',', array_fill(0, count($idsLezioni), '?'));
        $sqlAuth = "
              SELECT COUNT(DISTINCT l.id_lezione) as total 
              FROM lezioni l
              JOIN corsi_classi_insegnanti cci ON l.id_corso = cci.id_corso
              WHERE l.id_lezione IN ($inClause) AND cci.id_insegnante = ?
          ";

        $stmtAuth = $link->prepare($sqlAuth);
        $types = str_repeat('i', count($idsLezioni)) . 'i';
        $params = array_merge($idsLezioni, [$user_id]);
        $stmtAuth->bind_param($types, ...$params);
        $stmtAuth->execute();
        $authRes = $stmtAuth->get_result()->fetch_assoc();
        $stmtAuth->close();

        // Se il numero di lezioni autorizzate non corrisponde al numero di lezioni uniche inviate, blocca
        if (($authRes['total'] ?? 0) !== count($idsLezioni)) {
          echo json_encode(['success' => false, 'message' => 'Accesso negato: tentate modifiche su presenze non autorizzate.']);
          exit;
        }
      }

      // Utilizziamo una transazione per aggiornare o inserire in modo sicuro
      $link->begin_transaction();
      try {
        $stmt = $link->prepare("
          INSERT INTO presenze (id_lezione, id_studente, presente)
          VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE presente = VALUES(presente)
        ");

        foreach ($presenze as $p) {
          $idLezione = intval($p['id_lezione'] ?? 0);
          $idStudente = intval($p['id_studente'] ?? 0);
          $presente = intval($p['presente'] ? 1 : 0);

          if ($idLezione > 0 && $idStudente > 0) {
            $stmt->bind_param("iii", $idLezione, $idStudente, $presente);
            $stmt->execute();
          }
        }
        $stmt->close();
        $link->commit();

        echo json_encode(['success' => true, 'message' => 'Presenze salvate con successo.']);
      } catch (Exception $ex) {
        $link->rollback();
        echo json_encode(['success' => false, 'message' => 'Errore durante il salvataggio: ' . $ex->getMessage()]);
      }
      exit;

    case 'salva':
      $user_role = $_SESSION['role'] ?? 'insegnante';
      // Se l'azione è la creazione o l'eliminazione di una classe a livello globale, richiedi i privilegi di admin

      if (($action === 'salva' && ($input['tipo'] ?? '') === 'classe') || ($action === 'elimina' && ($input['tipo'] ?? '') === 'classe')) {
        if ($user_role !== 'admin') {
          echo json_encode(['success' => false, 'message' => 'Accesso negato: operazione consentita solo agli amministratori.']);
          exit;
        }
      }

      $tipo = $input['tipo'] ?? '';
      if ($tipo === 'classe') {
        $nome = trim($input['nome_classe'] ?? '');
        if (empty($nome)) {
          echo json_encode(['success' => false, 'message' => 'Nome classe obbligatorio.']);
          exit;
        }
        $stmt = $link->prepare("INSERT INTO classi (nome_classe) VALUES (?) ON DUPLICATE KEY UPDATE nome_classe = VALUES(nome_classe)");
        $stmt->bind_param("s", $nome);
        $stmt->execute();
        $stmt->close();
        echo json_encode(['success' => true, 'message' => 'Classe salvata.']);
        exit;
      }

      $id = intval($input['id'] ?? 0);
      $nome = trim($input['nome'] ?? '');
      $cognome = trim($input['cognome'] ?? '');
      $dettaglio = trim($input['dettaglio'] ?? '');
      $email = trim($input['email'] ?? '');

      if ($tipo === 'insegnante') {
        if ($id > 0) {
          $stmt = $link->prepare("UPDATE insegnanti SET nome=?, cognome=?, scuola=?, email=? WHERE id_insegnante=?");
          $stmt->bind_param("ssssi", $nome, $cognome, $dettaglio, $email, $id);
        } else {
          $token = bin2hex(random_bytes(16));
          $scadenza = date('Y-m-d H:i:s', strtotime('+2 days'));
          $stmt = $link->prepare("INSERT INTO insegnanti (nome, cognome, scuola, email, activation_token, activation_expires) VALUES (?, ?, ?, ?, ?, ?)");
          $stmt->bind_param("ssssss", $nome, $cognome, $dettaglio, $email, $token, $scadenza);
        }
      } else {
        if ($id > 0) {
          $stmt = $link->prepare("UPDATE relatori SET nome=?, cognome=?, ente_affiliazione=?, email=? WHERE id_relatore=?");
          $stmt->bind_param("ssssi", $nome, $cognome, $dettaglio, $email, $id);
        } else {
          $stmt = $link->prepare("INSERT INTO relatori (nome, cognome, ente_affiliazione, email) VALUES (?, ?, ?, ?)");
          $stmt->bind_param("ssss", $nome, $cognome, $dettaglio, $email);
        }
      }

      $stmt->execute();
      $stmt->close();
      echo json_encode(['success' => true, 'message' => 'Anagrafica salvata con successo.']);
      exit;

    case 'salva_studente':
      $idClasse = intval($input['id_classe'] ?? 0);
      $nome = trim($input['nome'] ?? '');
      $cognome = trim($input['cognome'] ?? '');

      if ($idClasse <= 0 || empty($nome) || empty($cognome)) {
        echo json_encode(['success' => false, 'message' => 'Dati studente incompleti.']);
        exit;
      }

      $stmt = $link->prepare("INSERT INTO studenti (id_classe, nome, cognome) VALUES (?, ?, ?)");
      $stmt->bind_param("iss", $idClasse, $nome, $cognome);
      $stmt->execute();
      $stmt->close();

      echo json_encode(['success' => true, 'message' => 'Studente inserito con successo.']);
      exit;

    case 'elimina_studente':
      $idStudente = intval($input['id_studente'] ?? 0);
      $stmt = $link->prepare("DELETE FROM studenti WHERE id_studente = ?");
      $stmt->bind_param("i", $idStudente);
      $stmt->execute();
      $stmt->close();

      echo json_encode(['success' => true, 'message' => 'Studente rimosso.']);
      exit;

    case 'elimina':
      $id = intval($input['id'] ?? 0);
      $tipo = $input['tipo'] ?? '';

      $tabella = ($tipo === 'insegnante') ? 'insegnanti' : (($tipo === 'classe') ? 'classi' : 'relatori');
      $colonna = ($tipo === 'insegnante') ? 'id_insegnante' : (($tipo === 'classe') ? 'id_classe' : 'id_relatore');

      try {
        $stmt = $link->prepare("DELETE FROM {$tabella} WHERE {$colonna} = ?");
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $stmt->close();
        echo json_encode(['success' => true, 'message' => 'Elemento eliminato.']);
      } catch (mysqli_sql_exception $e) {
        // Codice 1451: Cannot delete or update a parent row
        if ($e->getCode() == 1451 && $tipo === 'insegnante') {
          echo json_encode([
              'success' => false,
              'message' => 'Impossibile eliminare il docente perché risulta associato a corsi e classi attivi. Utilizza la funzione di sostituzione o rimuovi prima le associazioni.'
          ]);
        } else {
          echo json_encode(['success' => false, 'message' => 'Errore durante l\'eliminazione: ' . $e->getMessage()]);
        }
      }
      exit;
    }
  }
   } catch (Exception $e) {
      echo json_encode(['success' => false, 'message' => $e->getMessage()]);
      exit;
    }

