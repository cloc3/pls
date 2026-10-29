<!DOCTYPE html>
<html lang="it">
  <head>
    <meta http-equiv="content-type" content="text/html; charset=UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" type="text/css" href="css/layout.css">
    <script src="./js/dom.js"></script>
    <script src="./js/functions.js"></script>
    <script src="./js/main.js"></script>
    <title>pls - Liceo Marinelli</title>
  </head>

  <body>
    <!-- Sezione 1: Form di Login -->
    <div id="login-container">
      <h2>Accesso Piattaforma PLS 2026</h2>
      <form id="login-form" action="php/login.php" method="POST" onsubmit="return false;">
        <div class="form-group">
          <label for="username">Nickname / Email:</label>
          <input type="text" id="username" name="username" required autocomplete="username">
        </div>

        <div class="form-group">
          <label for="password">Password:</label>
          <div class="password-wrapper">
            <input type="password" id="password" name="password" required autocomplete="current-password">
            <button type="button" id="toggle-password" aria-label="Mostra/Nascondi Password">
              <svg id="eye-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            </button>
          </div>
        </div>

        <button type="submit">Accedi</button>
      </form>
    </div>

    <!-- Sezione 2: Pannello di Amministrazione a 2 Colonne -->
    <div id="admin-panel" class="app-container" style="display: none;">
      <header class="app-header">
        <h2>Pannello di Amministrazione PLS</h2>
        <button id="logout-btn" class="btn-logout">Esci</button>
      </header>

      <div class="app-body">
        <!-- Colonna Sinistra: Elenco Corsi Attivati -->
        <aside class="sidebar-corsi">
          <div class="sidebar-header">
            <h3>Corsi Attivi</h3>
          </div>
          <ul id="lista-corsi-sidebar" class="corsi-list">
            <li class="corsi-item empty">Caricamento corsi...</li>
          </ul>
        </aside>

        <!-- Colonna Destra: Area Operativa -->
        <section class="main-workspace">
          <!-- Barra dei Comandi in Alto -->
          <div class="actions-bar">
            <button id="btn-open-modal-corso" class="btn-primary">+ Nuovo Corso PLS</button>
            <button id="btn-gestione-anagrafica" class="btn-primary">👥 Gestisci Relatori/Insegnanti</button>
            <button id="btn-gestione-classi" class="btn-primary">🏫 Gestisci Classi</button>
          </div>

          <!-- Spazio di Lavoro Dinamico -->
          <main id="workspace-content" class="workspace-card">
            <div class="placeholder-msg">
              <p>Seleziona un corso dalla colonna di sinistra o creane uno nuovo per iniziare.</p>
            </div>
          </main>
        </section>
      </div>

      <!-- Modale Inserimento Corso -->
      <div id="modal-corso" class="modal" style="display: none;">
        <div class="modal-content">
          <span class="close-button btn-close-modal" id="btn-close-modal-corso">&times;</span>
          <h3>Crea Nuovo Corso PLS</h3>

          <form id="form-crea-corso">
            <div class="form-group">
              <label for="titolo-corso">Titolo del Corso:</label>
              <input type="text" id="titolo-corso" name="titolo" required placeholder="Es. Laboratorio di Crittografia">
            </div>

            <div class="form-group">
              <label for="anno-scolastico">Anno Scolastico:</label>
              <input type="text" id="anno-scolastico" name="anno_scolastico" value="2026/2027" required>
            </div>

            <div class="form-group">
              <label>Relatori Selezionati per questo Corso:</label>
              <div id="lista-relatori-selezionati" class="tags-container">
                <span class="empty-tag-msg">Nessun relatore ancora aggiunto</span>
              </div>
            </div>

            <hr style="margin: 15px 0; border: 0; border-top: 1px dashed #ccc;">

            <p style="font-size: 0.85rem; font-weight: bold; color: #0056b3; margin-bottom: 8px;">
            Cerca relatore o aggiungi nuovo relatore:
            </p>

            <div style="position: relative;" class="form-group">
              <input type="text" id="search-relatore" placeholder="Digita Nome o Cognome per cercare..." autocomplete="off" style="width: 100%; padding: 8px; border: 1px solid #ced4da; border-radius: 4px;">
              <div id="autocomplete-results" class="autocomplete-dropdown" style="display: none;"></div>
            </div>

            <div id="box-nuovo-relatore" style="background: #f8f9fa; padding: 10px; border-radius: 6px; border: 1px solid #e9ecef; margin-bottom: 10px;">
              <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                <input type="text" id="nuovo-relatore-cognome" placeholder="Cognome" style="width: 50%; padding: 6px; border: 1px solid #ced4da; border-radius: 4px;">
                <input type="text" id="nuovo-relatore-nome" placeholder="Nome" style="width: 50%; padding: 6px; border: 1px solid #ced4da; border-radius: 4px;">
              </div>
              <div style="display: flex; gap: 8px;">
                <input type="text" id="nuovo-relatore-ente" placeholder="Ente / Affiliazione (opzionale)" style="width: 70%; padding: 6px; border: 1px solid #ced4da; border-radius: 4px;">
                <button type="button" id="btn-add-nuovo-relatore" class="btn-secondary" style="width: 30%;">+ Aggiungi</button>
              </div>
            </div>

            <button type="submit" class="btn-primary" style="margin-top: 10px; width: 100%;">Salva Corso e Relatori</button>
          </form>
        </div>
      </div>

      <!-- Modale Gestione Anagrafica (Relatori / Insegnanti) -->
      <div id="modal-gestione-anagrafica" class="modal" style="display: none;">
        <div class="modal-content" style="max-width: 800px;">
          <span class="close-button btn-close-modal" id="btn-close-modal-anagrafica">&times;</span>
          <h3>Gestione Anagrafica</h3>

          <!-- Tab Selezione Tipo Anagrafica -->
          <div class="tabs-anagrafica" style="display: flex; gap: 10px; margin-bottom: 15px;">
            <button type="button" id="tab-relatori" class="btn-tab active" onclick="cambiaTabAnagrafica('relatore')">Relatori</button>
            <button type="button" id="tab-insegnanti" class="btn-tab" onclick="cambiaTabAnagrafica('insegnante')">Insegnanti</button>
          </div>

          <!-- Form Inserimento/Edizione -->
          <form id="form-anagrafica" style="background: #f8f9fa; padding: 12px; border-radius: 6px; margin-bottom: 15px;">
            <input type="hidden" id="anagrafica-id" value="">
            <input type="hidden" id="anagrafica-tipo" value="relatore">

            <div style="display: flex; gap: 10px; margin-bottom: 10px;">
              <input type="text" id="anagrafica-cognome" placeholder="Cognome *" required style="flex: 1; padding: 8px;">
              <input type="text" id="anagrafica-nome" placeholder="Nome *" required style="flex: 1; padding: 8px;">
            </div>

            <div style="display: flex; gap: 10px; margin-bottom: 10px;">
              <input type="text" id="anagrafica-dettaglio" placeholder="Ente / Scuola / Affiliazione" style="flex: 2; padding: 8px;">
              <input type="email" id="anagrafica-email" placeholder="Email (opzionale)" style="flex: 2; padding: 8px;">
            </div>

            <div style="display: flex; gap: 8px; justify-content: flex-end;">
              <button type="submit" id="btn-salva-anagrafica" class="btn-primary">Aggiungi</button>
            </div>
          </form>

          <!-- Ricerca e Lista Esistenti (Popolata da JS) -->
          <input type="text" id="search-anagrafica" placeholder="Cerca nell'anagrafica..." style="width: 100%; padding: 8px; margin-bottom: 10px;">

          <div id="container-lista-anagrafica" style="max-height: 280px; overflow-y: auto; border: 1px solid #ddd; border-radius: 4px;">
            <!-- Popolato dinamicamente da JS (Tabella Relatori o Tabella Insegnanti) -->
          </div>
        </div>
      </div>

      <!-- Modale Visualizzazione / Copia Link Attivazione -->
      <div id="modal-activation-link" class="modal" style="display: none;">
        <div class="modal-content">
          <span class="close-button btn-close-modal" id="btn-close-modal-link">&times;</span>

          <h3 id="modal-link-titolo">Link di Attivazione Docente</h3>
          <p id="modal-link-descrizione">
          Condividi questo link con il docente per consentirgli di completare la registrazione e impostare la password.
          </p>

          <!-- Info Scadenza -->
          <div class="info-scadenza-box" style="margin-bottom: 10px; font-size: 0.9em; color: #555;">
            <span>Stato link: </span><strong id="modal-link-stato">Valido</strong> | 
            <span>Scadenza: </span><strong id="modal-link-scadenza">--/--/---- --:--</strong>
          </div>

          <!-- Field di Input + Pulsante Copia -->
          <div style="display: flex; gap: 10px; margin: 15px 0;">
            <input type="text" id="input-link-attivazione" readonly style="flex: 1; padding: 8px;">
            <button type="button" id="btn-copia-link-modal" class="btn-primary">
              📋 Copia negli appunti
            </button>
          </div>

          <!-- Azioni Secondarie nella Modale -->
          <!--div style="display: flex; justify-content: space-between; margin-top: 20px;">
            <button type="button" id="btn-rinnova-link-modal" class="btn-warning">
              🔄 Rigenera Nuovo Link
            </button>
          </div-->
        </div>
      </div>

      <!-- Modale Gestione Relatori di uno specifico Corso -->
      <div id="modal-gestione-relatori" class="modal" style="display: none;">
        <div class="modal-content">
          <span class="close-button btn-close-modal" id="btn-close-modal-gestione-relatori">&times;</span>
          <h3>Gestione Relatori Corso</h3>

          <form id="form-gestione-relatori">
            <input type="hidden" id="gestione-relatori-id-corso" value="">

            <div class="form-group">
              <label>Relatori Assegnati a questo Corso:</label>
              <div id="lista-gestione-relatori-selezionati" class="tags-container">
                <span class="empty-tag-msg">Nessun relatore associato</span>
              </div>
            </div>

            <hr style="margin: 15px 0; border: 0; border-top: 1px dashed #ccc;">

            <p style="font-size: 0.85rem; font-weight: bold; color: #0056b3; margin-bottom: 8px;">
            Cerca o aggiungi un relatore:
            </p>

            <div style="position: relative;" class="form-group">
              <input type="text" id="search-gestione-relatore" placeholder="Digita Nome o Cognome per cercare..." autocomplete="off" style="width: 100%; padding: 8px; border: 1px solid #ced4da; border-radius: 4px;">
              <div id="autocomplete-results-gestione" class="autocomplete-dropdown" style="display: none;"></div>
            </div>

            <div style="background: #f8f9fa; padding: 10px; border-radius: 6px; border: 1px solid #e9ecef; margin-bottom: 10px;">
              <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                <input type="text" id="gestione-relatore-cognome" placeholder="Cognome" style="width: 50%; padding: 6px; border: 1px solid #ced4da; border-radius: 4px;">
                <input type="text" id="gestione-relatore-nome" placeholder="Nome" style="width: 50%; padding: 6px; border: 1px solid #ced4da; border-radius: 4px;">
              </div>
              <div style="display: flex; gap: 8px;">
                <input type="text" id="gestione-relatore-ente" placeholder="Ente / Affiliazione (opzionale)" style="width: 70%; padding: 6px; border: 1px solid #ced4da; border-radius: 4px;">
                <button type="button" id="btn-add-nuovo-relatore-gestione" class="btn-secondary" style="width: 30%;">+ Aggiungi</button>
              </div>
            </div>

            <button type="submit" id="btn-salva-relatori-corso" class="btn-primary" style="margin-top: 10px; width: 100%;">Aggiorna Relatori</button>
          </form>
        </div>
      </div>

      <!-- Modale Aggiungi Classe / Insegnante al Corso -->
      <div id="modal-aggiungi-classe" class="modal" style="display: none;">
        <div class="modal-content">
          <span class="close-button btn-close-modal" id="btn-close-modal-aggiungi-classe">&times;</span>
          <h3>Aggiungi Classe / Insegnante Referente</h3>

          <!-- Aggiunto novalidate per evitare blocchi della validazione nativa -->
          <form id="form-aggiungi-classe">
            <input type="hidden" id="aggiungi-classe-id-corso" value="">

            <div class="form-group">
              <label for="search-classe">Classe:</label>
              <div style="position: relative;">
                <!-- Rimosso l'attributo 'required' -->
                <input type="text" id="search-classe" placeholder="Es. 4A, 5B..." autocomplete="off" style="width: 100%; padding: 8px; border: 1px solid #ced4da; border-radius: 4px;" required>
                <input type="hidden" id="input-id-classe" name="id_classe" required>
                <div id="autocomplete-results-classe" class="autocomplete-dropdown" style="display: none;"></div>
              </div>
            </div>

            <div class="form-group">
              <label for="search-insegnante">Insegnante Referente:</label>
              <div style="position: relative;">
                <!-- Rimosso l'attributo 'required' -->
                <input type="text" id="search-insegnante" placeholder="Digita Nome o Cognome dell'insegnante..." autocomplete="off" style="width: 100%; padding: 8px; border: 1px solid #ced4da; border-radius: 4px;">
                <input type="hidden" id="select-insegnante-referente" name="id_insegnante">
                <div id="autocomplete-results-insegnante" class="autocomplete-dropdown" style="display: none;"></div>
              </div>
            </div>

            <!-- Rimosso la classe 'btn-close-modal' da questo pulsante -->
            <button type="submit" class="btn-primary" style="margin-top: 15px; width: 100%;">Associa Classe al Corso</button>
          </form>
        </div>
      </div>

      <!-- Modale Aggiungi/Modifica Lezione -->
      <div id="modal-lezione" class="modal" style="display: none;">
        <div class="modal-content">
          <!--span class="close-modal btn-close-modal">&times;</span-->
          <h2 id="modal-lezione-titolo">Aggiungi / Modifica Lezione</h2>

          <form id="form-lezione">
            <!-- Campi Nascosti -->
            <input type="hidden" id="lezione-id-lezione" name="id_lezione" value="">
            <input type="hidden" id="lezione-id-corso" name="id_corso" value="">

            <!-- Numero Lezione e Durata -->
            <div class="form-row">
              <div class="form-group col-6">
                <label for="lezione-durata">Durata (Ore) *</label>
                <input type="number" id="lezione-durata" name="durata_ore" step="1" min="2" value="2" required>
              </div>
            </div>

            <!-- Data e Ora -->
            <div class="form-group">
              <label for="lezione-data-ora">Data e Ora *</label>
              <input type="datetime-local" id="lezione-data-ora" name="data_ora" required>
            </div>

            <!-- Selezione Tipo Sede -->
            <div class="form-group">
              <label>Sede della Lezione</label>
              <div class="radio-group">
                <label>
                  <input type="radio" name="is_sede_esterna" value="0" checked> 
                  Aula dell'Istituto
                </label>
                <label>
                  <input type="radio" name="is_sede_esterna" value="1"> 
                  Sede Esterna
                </label>
              </div>
            </div>

            <!-- Opzioni per Aula Interna (Autocompletamento + Creazione Rapida) -->
            <div id="box-aula-interna" class="form-group">
              <label for="search-aula">Aula dell'Istituto</label>
              <div style="position: relative;" class="form-group">
                <input type="text" id="search-aula" placeholder="Cerca aula..." autocomplete="off" style="width: 100%; padding: 8px; border: 1px solid #ced4da; border-radius: 4px;">
                <input type="hidden" id="lezione-id-aula" name="id_aula">
                <div id="autocomplete-results-aula" class="autocomplete-dropdown" style="display: none;"></div>
              </div>

              <!-- Box Creazione Nuova Aula inline -->
              <div id="box-nuova-aula" style="background: #f8f9fa; padding: 10px; border-radius: 6px; border: 1px solid #e9ecef; margin-top: 8px;">
                <p style="font-size: 0.85rem; font-weight: bold; color: #0056b3; margin-bottom: 8px;">Oppure crea nuova aula:</p>
                <div style="display: flex; gap: 8px;">
                  <input type="text" id="nuova-aula-nome" placeholder="Nome Aula (es. Aula Magna)" style="flex: 2; padding: 6px; border: 1px solid #ced4da; border-radius: 4px;">
                  <input type="number" id="nuova-aula-capienza" placeholder="Capienza" min="1" style="flex: 1; padding: 6px; border: 1px solid #ced4da; border-radius: 4px;">
                  <button type="button" id="btn-add-nuova-aula" class="btn-secondary" style="white-space: nowrap;">+ Aggiungi</button>
                </div>
              </div>
            </div>

            <!-- Opzioni per Sede Esterna -->
            <div id="box-sede-esterna" class="form-group" style="display: none;">
              <label for="lezione-descrizione-sede">Descrizione Sede Esterna</label>
              <input type="text" id="lezione-descrizione-sede" name="descrizione_sede_esterna" placeholder="Es. Laboratorio Unidud, Museo, ecc.">
            </div>

            <!-- Stato Prenotazione Aula e Ospiti -->
            <div class="form-row">
              <div class="form-group col-6">
                <label for="lezione-stato-prenotazione">Stato Prenotazione Aula</label>
                <select id="lezione-stato-prenotazione" name="stato_prenotazione_aula">
                  <option value="in_attesa">In Attesa</option>
                  <option value="in_attesa">In Attesa</option>
                  <option value="confermata">Confermata</option>
                  <option value="rifiutata">Rifiutata</option>
                </select>
              </div>
              <div class="form-group col-6">
                <label for="lezione-ospiti">Ospiti Esterni</label>
                <input type="number" id="lezione-ospiti" name="numero_ospiti_esterni" min="0" value="0">
              </div>
            </div>

            <div class="modal-actions">
              <button type="button" class="btn-secondary btn-close-modal">Annulla</button>
              <button type="submit" class="btn-primary">Salva Lezione</button>
            </div>
          </form>
        </div>
      </div>

      <!-- MODALE GESTIONE CLASSI -->
      <div id="modal-gestione-classi" class="modal" style="display:none;">
        <div class="modal-content" style="max-width: 800px; width: 90%;">
          <span class="close-button btn-close-modal" id="btn-close-modal-gestione-classi">&times;</span>
          <h3>🏫 Gestione Classi</h3>

          <form id="form-nuova-classe">
            <div style="display: flex; gap: 10px; margin-bottom: 20px; background: #f8f9fa; padding: 12px; border-radius: 6px;">
              <input type="text" id="nome-classe" placeholder="Nome classe (max 8 caratteri)" class="input-form-nuova-classe" required>
              <button type="submit" id="btn-salva-nuova-classe" class="btn-primary">➕ Aggiungi Classe</button>
            </div>
          </form>

          <div id="griglia-classi" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 15px; max-height: 450px; overflow-y: auto; padding: 5px;">
            <!-- Card caricate dinamicamente via JS -->
          </div>
        </div>
      </div>

      <!-- MODALE GESTIONE STUDENTI (ELENCO ANAGRAFICO CLASSE) -->
      <div id="modal-elenco-studenti" class="modal" style="display:none;">
        <div class="modal-content" style="max-width: 850px; width: 90%;">
          <span class="close-button btn-close-modal" id="btn-close-modal-studenti">&times;</span>
          <h3 id="titolo-modal-studenti">
            📋 Elenco Studenti Classe: <span id="elenco-studenti-classe-nome" style="color: #0056b3;"></span>
          </h3>

          <!-- Modulo Inline Rapido Aggiunta Studente -->
          <div style="background: #eef5ff; border: 1px solid #b6d4fe; padding: 10px; border-radius: 6px; margin-bottom: 15px;">
            <span style="font-weight: bold; font-size: 0.85em; color: #084298; display: block; margin-bottom: 6px;">
              ➕ Aggiungi nuovo studente alla classe:
            </span>
            <form id="form-aggiungi-studente-inline" style="display: flex; gap: 8px;">
              <input type="text" id="nuovo-studente-cognome" placeholder="Cognome *" required style="flex: 1; padding: 6px; border: 1px solid #ced4da; border-radius: 4px;">
              <input type="text" id="nuovo-studente-nome" placeholder="Nome *" required style="flex: 1; padding: 6px; border: 1px solid #ced4da; border-radius: 4px;">
              <button type="submit" class="btn-primary btn-sm" style="white-space: nowrap;">+ Aggiungi</button>
            </form>
          </div>

          <!-- Lista Studenti -->
          <div id="container-lista-studenti-anagrafica" style="max-height: 350px; overflow-y: auto; border: 1px solid #ddd; border-radius: 4px; padding: 5px;">
            <!-- Tabella generata da JS -->
          </div>
        </div>
      </div>

      <!-- MODALE GESTIONE APPELLO / PRESENZE LEZIONI -->
      <div id="modal-gestione-appello" class="modal" style="display: none;">
        <div class="modal-content" style="max-width: 850px; width: 92%; border-radius: 12px; padding: 24px;">
          <span class="close-button btn-close-modal" style="top: 15px; right: 20px; font-size: 24px; color: #888;">&times;</span>
          <h3 id="nome-classe-appello" style="margin-top: 0; margin-bottom: 16px; color: #1e293b; font-size: 1.35rem; font-weight: 700;">Gestione Appello</h3>

          <div id="div-insegnante-appello" class="mb-3"></div>

          <!-- Tabella Presenze Stile Grid/Scroll -->
          <div class="table-presenze-scroll-wrapper" style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <table class="table-presenze-lezioni">
              <thead>
                <tr id="appello-header-row">
                  <th class="col-studente-fixed">Studente</th>
                  <!-- Colonne lezioni generate dinamicamente con i mini-pulsanti ✓ e ✗ nell'header -->
                </tr>
              </thead>
              <tbody id="container-lista-studenti-appello">
                <!-- Righe studenti caricate via JS -->
              </tbody>
            </table>
          </div>

          <!-- Barra Azioni in Fondo al Modale Appello -->
          <div style="display: flex; justify-content: flex-end; align-items: center; margin-top: 20px;">
            <button type="button" onclick="ricaricaAppelloCorrente()" class="btn-appello-action btn-outline-slate" title="Ricarica i dati originali dal server">
              🔄 Ricarica / Annulla Modifiche
            </button>

            <!--span style="font-size: 0.8rem; color: #64748b; font-style: italic;">
              * Puoi salvare singolarmente ogni colonna di lezione tramite l'apposito pulsante nell'intestazione.
            </span-->
          </div>
        </div>
      </div>

    </div>
  </body>
</html>
