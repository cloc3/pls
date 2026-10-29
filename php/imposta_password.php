<?php
// imposta_password.php
session_start();

// Includiamo la connessione al database del tuo progetto
require_once __DIR__ . '/db.php';

$token = trim($_GET['token'] ?? $_POST['token'] ?? '');
$errore = '';
$successo = '';
$insegnante = null;

// 1. Verifica iniziale del token via GET
if (!empty($token) && $_SERVER['REQUEST_METHOD'] !== 'POST') {
  $stmt = $link->prepare("SELECT id_insegnante, nome, cognome, email, activation_expires FROM insegnanti WHERE activation_token = ?");
  $stmt->bind_param("s", $token);
  $stmt->execute();
  $res = $stmt->get_result();

  if ($row = $res->fetch_assoc()) {
    $ora_attuale = new DateTime();
    $scadenza = new DateTime($row['activation_expires']);

    if ($ora_attuale > $scadenza) {
      $errore = "Il link di attivazione è scaduto. Richiedi un nuovo invio all'amministratore.";
    } else {
      $insegnante = $row;
    }
  } else {
    $errore = "Link di attivazione non valido o già utilizzato.";
  }
  $stmt->close();
} else if (empty($token) && $_SERVER['REQUEST_METHOD'] !== 'POST') {
  $errore = "Nessun token di attivazione fornito.";
}

// 2. Gestione invio nuova password via POST
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $nuova_password = $_POST['password'] ?? '';
  $conferma_password = $_POST['conferma_password'] ?? '';

  if (empty($token)) {
    $errore = "Token mancante. Impossibile procedere.";
  } else if (strlen($nuova_password) < 8) {
    $errore = "La password deve contenere almeno 8 caratteri.";
  } else if ($nuova_password !== $conferma_password) {
    $errore = "Le password non coincidono.";
  } else {
    // Verifica token e scadenza prima dell'aggiornamento
    $stmt = $link->prepare("SELECT id_insegnante, activation_expires FROM insegnanti WHERE activation_token = ?");
    $stmt->bind_param("s", $token);
    $stmt->execute();
    $res = $stmt->get_result();

    if ($row = $res->fetch_assoc()) {
      $ora_attuale = new DateTime();
      $scadenza = new DateTime($row['activation_expires']);

      if ($ora_attuale > $scadenza) {
        $errore = "Il link di attivazione è scaduto. Richiedi un nuovo invio all'amministratore.";
      } else {
        $id_insegnante = $row['id_insegnante'];
        $hash = password_hash($nuova_password, PASSWORD_DEFAULT);

        // Aggiornamento password e azzeramento campi temporanei
        $update = $link->prepare("UPDATE insegnanti SET password_hash = ?, activation_token = NULL, activation_expires = NULL WHERE id_insegnante = ?");
        $update->bind_param("si", $hash, $id_insegnante);

        if ($update->execute()) {
          $successo = "Password impostata con successo! Ora puoi effettuare l'accesso.";
          $insegnante = null; // Nasconde il form
        } else {
          $errore = "Errore durante il salvataggio della password. Riprova.";
        }
        $update->close();
      }
    } else {
      $errore = "Token non valido o già utilizzato.";
    }
    $stmt->close();
  }
}
?>
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" type="text/css" href="css/layout.css">
  <title>Attivazione Account Docente - PLS Liceo Marinelli</title>
  <style>
    body {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      background-color: #f4f7f6;
      font-family: Arial, sans-serif;
    }
    #login-container {
      width: 100%;
      max-width: 420px;
      padding: 30px;
      background: #ffffff;
      border-radius: 8px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
      box-sizing: border-box;
    }
    #login-container h2 {
      margin-top: 0;
      margin-bottom: 20px;
      font-size: 22px;
      color: #333333;
      text-align: center;
    }
    .alert-error {
      color: #da4453;
      background-color: #fdf2f2;
      border: 1px solid #f9d6d9;
      padding: 12px;
      border-radius: 4px;
      margin-bottom: 20px;
      font-weight: 500;
      text-align: center;
      font-size: 14px;
    }
    .alert-success {
      color: #27ae60;
      background-color: #f0fdf4;
      border: 1px solid #d1fae5;
      padding: 12px;
      border-radius: 4px;
      margin-bottom: 20px;
      font-weight: 500;
      text-align: center;
      font-size: 14px;
    }
    .form-group {
      margin-bottom: 18px;
    }
    .form-group label {
      display: block;
      margin-bottom: 6px;
      font-weight: 600;
      color: #555555;
      font-size: 14px;
    }
    .password-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }
    .password-wrapper input {
      width: 100%;
      padding: 10px 40px 10px 12px;
      border: 1px solid #cccccc;
      border-radius: 4px;
      box-sizing: border-box;
      font-size: 14px;
      transition: border-color 0.2s;
    }
    .password-wrapper input:focus {
      border-color: #0056b3;
      outline: none;
    }
    .toggle-password {
      position: absolute;
      right: 12px;
      background: none;
      border: none;
      cursor: pointer;
      color: #777777;
      font-size: 16px;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;
    }
    .toggle-password:hover {
      color: #333333;
    }
    .btn-submit {
      width: 100%;
      padding: 12px;
      background-color: #27ae60;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 15px;
      font-weight: bold;
      transition: background-color 0.2s;
    }
    .btn-submit:hover {
      background-color: #219653;
    }
    .text-center {
      text-align: center;
    }
    .mt-3 {
      margin-top: 15px;
    }
    .link-action {
      color: #0056b3;
      text-decoration: none;
      font-weight: 500;
    }
    .link-action:hover {
      text-decoration: underline;
    }
    .welcome-text {
      color: #666666;
      font-size: 14px;
      line-height: 1.5;
      margin-bottom: 20px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div id="login-container">
    <h2>Attivazione Account Docente</h2>

    <?php if ($errore): ?>
      <div class="alert-error"><?= htmlspecialchars($errore) ?></div>
      <div class="text-center">
        <a href="../" class="link-action">Torna al Login</a>
      </div>
    <?php endif; ?>

    <?php if ($successo): ?>
      <div class="alert-success"><?= htmlspecialchars($successo) ?></div>
      <div class="text-center mt-3">
        <a href="../" class="btn-primary" style="display: inline-block; padding: 10px 20px; background-color: #0056b3; color: white; text-decoration: none; border-radius: 4px;">Vai al Login</a>
      </div>
    <?php endif; ?>

    <?php if ($insegnante): ?>
      <p class="welcome-text">Benvenuto/a <strong><?= htmlspecialchars($insegnante['nome'] . ' ' . $insegnante['cognome']) ?></strong>.<br>Imposta la tua nuova password per completare l'attivazione:</p>

      <form method="POST" action="imposta_password.php">
        <input type="hidden" name="token" value="<?= htmlspecialchars($token) ?>">

        <div class="form-group">
          <label for="password">Nuova Password (min. 8 caratteri):</label>
          <div class="password-wrapper">
            <input type="password" id="password" name="password" required minlength="8" placeholder="Inserisci password...">
            <button type="button" class="toggle-password" id="toggle-password-btn" title="Mostra/Nascondi password">
              👁️
            </button>
          </div>
        </div>

        <div class="form-group">
          <label for="conferma_password">Conferma Password:</label>
          <div class="password-wrapper">
            <input type="password" id="conferma_password" name="conferma_password" required minlength="8" placeholder="Ripeti password...">
            <button type="button" class="toggle-password" id="toggle-conferma-btn" title="Mostra/Nascondi password">
              👁️
            </button>
          </div>
        </div>

        <button type="submit" class="btn-submit">Salva Password e Attiva</button>
      </form>
    <?php endif; ?>
  </div>

<script>
document.addEventListener('DOMContentLoaded', function() {
  const pwdInput = document.getElementById('password');
  const pwdBtn = document.getElementById('toggle-password-btn');

  if (pwdBtn && pwdInput) {
    pwdBtn.addEventListener('click', function() {
      if (pwdInput.type === 'password') {
        pwdInput.type = 'text';
        pwdBtn.textContent = '👁️‍🗨️';
      } else {
        pwdInput.type = 'password';
        pwdBtn.textContent = '👁️';
      }
    });
  }

  const confInput = document.getElementById('conferma_password');
  const confBtn = document.getElementById('toggle-conferma-btn');

  if (confBtn && confInput) {
    confBtn.addEventListener('click', function() {
      if (confInput.type === 'password') {
        confInput.type = 'text';
        confBtn.textContent = '👁️‍🗨️';
      } else {
        confInput.type = 'password';
        confBtn.textContent = '👁️';
      }
    });
  }
});
</script>
</body>
</html>
