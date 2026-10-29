/**
 * @file functions.js
 * @description Gestisce la logica di business, le chiamate AJAX/Fetch, l'autenticazione,
 * la gestione di corsi, relatori, insegnanti, classi, lezioni e appelli della piattaforma PLS.
 */

// --- FUNZIONI DI GESTIONE UTENTE E LOGIN ---

/**
 * Gestisce la visibilità della password nel form di login (toggle mostra/nascondi).
 * @param {Event} e - Evento del DOM scatenato dal click sul pulsante.
 */
function gestisciTogglePassword(e) {
  e.preventDefault();
  const input = centroDiControllo.passwordInput;
  const icon = centroDiControllo.eyeIcon;
  if (!input) return;

  const isPassword = input.getAttribute("type") === "password";
  input.setAttribute("type", isPassword ? "text" : "password");

  if (icon) {
    icon.innerHTML = isPassword
      ? `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
         <line x1="1" y1="1" x2="23" y2="23"></line>`
      : `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
         <circle cx="12" cy="12" r="3"></circle>`;
  }
}

/**
 * Gestisce l'invio del form di login ed effettua la verifica delle credenziali via API.
 * @param {Event} e - Evento di submit del form.
 */

async function gestisciLogin(e) {
  e.preventDefault();

  const usernameInput = document.getElementById("username").value.trim();
  const passwordVal = centroDiControllo.passwordInput ? centroDiControllo.passwordInput.value.trim() : "";

  try {
    const response = await fetch("php/login.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: usernameInput, password: passwordVal }),
    });

    const data = await response.json();

    if (data.success) {
      // Salviamo il ruolo e ricarichiamo la pagina per rigenerare l'interfaccia pulita dal server
      localStorage.setItem("pls_user_role", data.role);
      window.location.reload();
    } else {
      alert(data.message || "Errore durante l'accesso.");
    }
  } catch (error) {
    console.error("Errore di rete:", error);
    alert("Si è verificato un errore di connessione con il server.");
  }
}

/**
 * Esegue il logout dell'utente distruggendo la sessione attiva sul server.
 */
async function gestisciLogout() {
  try {
    await fetch("php/logout.php");
  } catch (err) {
    console.error("Errore durante il logout:", err);
  }

  localStorage.removeItem("ultimoCorsoSelezionato");
  localStorage.removeItem("pls_user_role");

  // Ricarica la pagina per ripulire completamente la memoria e mostrare il form di login
  window.location.reload();
}

/**
 * Verifica lo stato della sessione attiva al caricamento iniziale della pagina.
 */
async function verificaSessioneIniziale() {
  try {
    const res = await fetch("php/check_session.php");
    const data = await res.json();

    if (data.logged_in) {
      centroDiControllo.loginContainer.style.display = "none";
      centroDiControllo.adminPanel.style.display = "block";

      const headerTitle = centroDiControllo.adminPanel.querySelector("header h2");
      if (headerTitle) {
        headerTitle.textContent = `Pannello PLS - Benvenuto, ${data.username} (${data.role})`;
        centroDiControllo.userRole = data.role;
        localStorage.setItem("pls_user_role", data.role);
      }

      adattaInterfacciaPerRuolo(`${data.role}`);
      caricaCorsiSidebar();
    } else {
      centroDiControllo.loginContainer.style.display = "block";
      centroDiControllo.adminPanel.style.display = "none";
    }
  } catch (err) {
    console.error("Errore verifica sessione:", err);
  }
}

// --- FUNZIONI MODALE E CORSI ---

/**
 * Carica l'elenco dei relatori all'interno di un elemento select HTML.
 */
async function caricaRelatoriSelect() {
  const select = document.getElementById("select-relatori");
  if (!select) return;

  try {
    const res = await fetch("php/get_relatori.php");
    const data = await res.json();

    if (data.success) {
      select.innerHTML = "";

      if (data.relatori.length === 0) {
        const optEmpty = document.createElement("option");
        optEmpty.disabled = true;
        optEmpty.textContent = "-- Nessun relatore presente --";
        select.appendChild(optEmpty);
      } else {
        data.relatori.forEach((r) => {
          const option = document.createElement("option");
          option.value = r.id_relatore;
          const ente = r.ente_affiliazione ? ` (${r.ente_affiliazione})` : "";
          option.textContent = `${r.cognome} ${r.nome}${ente}`;
          select.appendChild(option);
        });
      }
    } else {
      console.error("Errore caricamento relatori:", data.message);
    }
  } catch (err) {
    console.error("Errore di rete durante il recupero dei relatori:", err);
  }
}

let tuttiRelatoriDB = [];
let relatoriSelezionati = [];
let draggedIndex = null;

/**
 * Recupera l'elenco completo dei relatori dal database.
 */
async function caricaRelatoriDB() {
  try {
    const res = await fetch("php/get_relatori.php");
    const data = await res.json();
    if (data.success) {
      tuttiRelatoriDB = data.relatori;
    }
  } catch (err) {
    console.error("Errore recupero relatori:", err);
  }
}

/**
 * Renderizza i tag visivi dei relatori selezionati con supporto al Drag & Drop.
 */
function renderRelatoriTags() {
  const container = document.getElementById("lista-relatori-selezionati");
  if (!container) return;

  container.innerHTML = "";

  if (relatoriSelezionati.length === 0) {
    container.innerHTML = '<span class="empty-tag-msg">Nessun relatore ancora aggiunto</span>';
    return;
  }

  relatoriSelezionati.forEach((rel, index) => {
    const tag = document.createElement("div");
    tag.className = "tag-relatore";
    tag.setAttribute("draggable", "true");
    tag.setAttribute("data-index", index);

    const enteStr = rel.ente ? ` (${rel.ente})` : "";
    const badgeNuovo = rel.isNuovo ? " [Nuovo]" : "";
    const primoBadge = index === 0 ? '<strong style="color: #0d47a1; margin-right: 4px;">[1° Relatore]</strong> ' : '';

    tag.innerHTML = `
      <span style="cursor: move;">&#x2630; ${primoBadge}${rel.cognome} ${rel.nome}${enteStr}${badgeNuovo}</span>
      <button type="button" class="btn-remove-tag" data-index="${index}">&times;</button>
    `;

    tag.querySelector(".btn-remove-tag").addEventListener("click", (e) => {
      e.stopPropagation();
      const idx = parseInt(e.target.getAttribute("data-index"));
      relatoriSelezionati.splice(idx, 1);
      renderRelatoriTags();
    });

    tag.addEventListener("dragstart", (e) => {
      draggedIndex = index;
      e.dataTransfer.effectAllowed = "move";
      tag.classList.add("dragging");
    });

    tag.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    });

    tag.addEventListener("drop", (e) => {
      e.preventDefault();
      const targetIndex = parseInt(tag.getAttribute("data-index"));
      if (draggedIndex !== null && draggedIndex !== targetIndex) {
        const itemRimosso = relatoriSelezionati.splice(draggedIndex, 1)[0];
        relatoriSelezionati.splice(targetIndex, 0, itemRimosso);
        renderRelatoriTags();
      }
    });

    tag.addEventListener("dragend", () => {
      draggedIndex = null;
      tag.classList.remove("dragging");
    });

    container.appendChild(tag);
  });
}

/**
 * Inizializza l'autocompletamento per la ricerca e l'aggiunta rapida dei relatori.
 */
function inizializzaAutocompleteRelatori() {
  const searchInput = document.getElementById("search-relatore");
  const dropdown = document.getElementById("autocomplete-results");
  const btnAddNuovo = document.getElementById("btn-add-nuovo-relatore");

  if (!searchInput || !dropdown) return;

  searchInput.addEventListener("input", () => {
    const query = searchInput.value.toLowerCase().trim();
    dropdown.innerHTML = "";

    if (query.length === 0) {
      dropdown.style.display = "none";
      return;
    }

    const filtrati = tuttiRelatoriDB.filter(r =>
      `${r.cognome} ${r.nome}`.toLowerCase().includes(query) ||
      (r.ente_affiliazione && r.ente_affiliazione.toLowerCase().includes(query))
    );

    if (filtrati.length === 0) {
      dropdown.style.display = "none";
      return;
    }

    filtrati.forEach(r => {
      if (relatoriSelezionati.some(sel => sel.id === r.id_relatore)) return;

      const item = document.createElement("div");
      item.className = "autocomplete-item";
      const ente = r.ente_affiliazione ? ` (${r.ente_affiliazione})` : "";
      item.textContent = `${r.cognome} ${r.nome}${ente}`;

      item.addEventListener("click", () => {
        relatoriSelezionati.push({
          id: r.id_relatore,
          nome: r.nome,
          cognome: r.cognome,
          ente: r.ente_affiliazione,
          isNuovo: false
        });
        renderRelatoriTags();
        searchInput.value = "";
        dropdown.style.display = "none";
      });

      dropdown.appendChild(item);
    });

    dropdown.style.display = dropdown.children.length > 0 ? "block" : "none";
  });

  if (btnAddNuovo) {
    btnAddNuovo.addEventListener("click", () => {
      const cognomeInput = document.getElementById("nuovo-relatore-cognome");
      const nomeInput = document.getElementById("nuovo-relatore-nome");
      const enteInput = document.getElementById("nuovo-relatore-ente");

      const cognome = cognomeInput.value.trim();
      const nome = nomeInput.value.trim();
      const ente = enteInput.value.trim();

      if (!cognome || !nome) {
        alert("Inserisci sia il nome che il cognome per il nuovo relatore.");
        return;
      }

      relatoriSelezionati.push({
        id: null,
        nome: nome,
        cognome: cognome,
        ente: ente,
        isNuovo: true
      });

      renderRelatoriTags();

      cognomeInput.value = "";
      nomeInput.value = "";
      enteInput.value = "";
    });
  }

  document.addEventListener("click", (e) => {
    if (e.target !== searchInput && e.target !== dropdown) {
      dropdown.style.display = "none";
    }
  });
}

/**
 * Apre la modale per la creazione di un nuovo corso PLS.
 */
async function apriModaleCorso() {
  if (centroDiControllo.modalCorso) {
    if (centroDiControllo.formCreaCorso) {
      centroDiControllo.formCreaCorso.reset();
    }
    relatoriSelezionati = [];
    renderRelatoriTags();

    await caricaRelatoriDB();
    inizializzaAutocompleteRelatori();

    centroDiControllo.modalCorso.style.display = "flex";
  }
}

/**
 * Invia i dati per la creazione di un nuovo corso al server.
 * @param {Event} e - Evento di submit del form.
 */
async function gestisciCreaCorso(e) {
  e.preventDefault();

  const titolo = document.getElementById("titolo-corso").value.trim();
  const anno = document.getElementById("anno-scolastico").value.trim();

  const relatori_ids = relatoriSelezionati.filter(r => !r.isNuovo).map(r => r.id);
  const nuovi_relatori = relatoriSelezionati.filter(r => r.isNuovo);

  const payload = {
    titolo: titolo,
    anno_scolastico: anno,
    relatori_ids: relatori_ids,
    nuovi_relatori: nuovi_relatori
  };

  try {
    const response = await fetch("php/crea_corso.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (data.success) {
      alert(data.message);
      if (centroDiControllo.formCreaCorso) centroDiControllo.formCreaCorso.reset();
      relatoriSelezionati = [];
      chiudiModaleGenerica("modal-corso");
      caricaCorsiSidebar();
    } else {
      alert(data.message);
    }
  } catch (err) {
    console.error("Errore invio corso:", err);
    alert("Errore durante l'invio dei dati.");
  }
}

/**
 * Carica l'elenco dei corsi attivi nella barra laterale (sidebar).
 */
async function caricaCorsiSidebar() {
  const listaContainer = document.getElementById("lista-corsi-sidebar");
  const workspace = centroDiControllo.workspaceContent;
  if (!listaContainer) return;

  try {
    const res = await fetch("php/get_corsi.php");
    const data = await res.json();

    if (data.success) {
      listaContainer.innerHTML = "";

      if (data.corsi.length === 0) {
        listaContainer.innerHTML = '<li class="corsi-item empty">Nessun corso assegnato</li>';
        localStorage.removeItem("ultimoCorsoSelezionato");

        // Se il server ha inviato un messaggio personalizzato per il workspace (es. utente insegnante senza corsi)
        if (data.messaggio_workspace && workspace) {
          workspace.innerHTML = `
            <div class="empty-state" style="text-align: center; color: #475569; margin-top: 40px; padding: 20px;">
              <p style="font-size: 1.1rem; line-height: 1.5;">${data.messaggio_workspace}</p>
            </div>
          `;
        } else {
          svuotaWorkspace();
        }
        return;
      }

      const idSalvato = localStorage.getItem("ultimoCorsoSelezionato");
      let elementoDaSelezionare = null;
      let corsoDaSelezionare = null;

      /*
      data.corsi.forEach((corso) => {
        const li = document.createElement("li");
        li.className = "corsi-item";
        li.dataset.idCorso = corso.id_corso;
        li.textContent = `${corso.titolo} (${corso.anno_scolastico})`;

        li.addEventListener("click", () => selezionaCorso(corso, li));
        listaContainer.appendChild(li);

        if (idSalvato && corso.id_corso == idSalvato) {
          corsoDaSelezionare = corso;
          elementoDaSelezionare = li;
        }
      });
      */
      data.corsi.forEach((corso) => {
        const li = document.createElement("li");
        li.className = "corsi-item";
        li.dataset.idCorso = corso.id_corso;
        li.textContent = `${corso.titolo} (${corso.anno_scolastico})`;

        li.addEventListener("click", () => selezionaCorso(corso, li));

        // Gestione del menu contestuale con il tasto destro per l'eliminazione del corso
        li.addEventListener("contextmenu", (e) => {
          e.preventDefault();
          const userRole = window.userRole || localStorage.getItem("pls_user_role");
          if (userRole !== 'admin') {
            return; // L'eliminazione è consentita solo agli amministratori
          }

          // Rimuove eventuali menu contestuali aperti in precedenza
          const menuEsistente = document.getElementById("custom-context-menu");
          if (menuEsistente) menuEsistente.remove();

          const menu = document.createElement("div");
          menu.id = "custom-context-menu";
          menu.style.cssText = `
            position: fixed;
            top: ${e.pageY}px;
            left: ${e.pageX}px;
            background: #ffffff;
            border: 1px solid #babdbf;
            border-radius: 4px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            padding: 4px 0;
            font-size: 0.9rem;
          `;

          const itemElimina = document.createElement("div");
          itemElimina.style.cssText = "padding: 8px 16px; cursor: pointer; color: #da4453; font-weight: 600;";
          itemElimina.textContent = "🗑️ Elimina Corso Intero";

          itemElimina.addEventListener("click", async () => {
            menu.remove();
            if (confirm(`Sei sicuro di voler eliminare interamente il corso "${corso.titolo}" e tutte le relative dipendenze (lezioni, registri, associazioni)?`)) {
              try {
                const res = await fetch("php/elimina_corso.php", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ id_corso: corso.id_corso })
                });
                const dataRes = await res.json();
                if (dataRes.success) {
                  if (typeof mostraToast === "function") mostraToast("Corso eliminato con successo!");
                  caricaCorsiSidebar();
                } else {
                  alert(dataRes.message || "Errore durante l'eliminazione del corso.");
                }
              } catch (err) {
                console.error("Errore di rete:", err);
                alert("Errore di connessione con il server.");
              }
            }
          });

          menu.appendChild(itemElimina);
          document.body.appendChild(menu);

          const chiudiMenu = () => {
            menu.remove();
            document.removeEventListener("click", chiudiMenu);
          };
          document.addEventListener("click", chiudiMenu);
        });

        listaContainer.appendChild(li);

        if (idSalvato && corso.id_corso == idSalvato) {
          corsoDaSelezionare = corso;
          elementoDaSelezionare = li;
        }
      });

      if (corsoDaSelezionare && elementoDaSelezionare) {
        selezionaCorso(corsoDaSelezionare, elementoDaSelezionare);
      } else {
        svuotaWorkspace();
      }

    } else {
      listaContainer.innerHTML = `<li class="corsi-item empty">${data.message}</li>`;
      svuotaWorkspace();
    }
  } catch (err) {
    console.error("Errore recupero corsi:", err);
    listaContainer.innerHTML = '<li class="corsi-item empty">Errore di connessione</li>';
  }
}

/**
 * Ripristina lo spazio di lavoro (workspace) nello stato iniziale vuoto.
 */
function svuotaWorkspace() {
  const workspace = centroDiControllo.workspaceContent;
  if (workspace) {
    workspace.innerHTML = `
      <div class="empty-state" style="text-align: center; color: #7f8c8d; margin-top: 40px;">
        <p>Seleziona un corso dalla barra laterale per visualizzarne i dettagli.</p>
      </div>
    `;
  }
}

let relatoriCorsoAttuale = [];

/**
 * Apre la modale per la gestione dei relatori associati a uno specifico corso.
 * @param {Object|number} corso - Oggetto corso o ID del corso.
 */
async function apriModaleGestioneRelatori(corso) {
  const modal = centroDiControllo.modalGestioneRelatori || document.getElementById("modal-gestione-relatori");
  const inputIdCorso = centroDiControllo.inputGestioneRelatori;
  if (!modal || !inputIdCorso) return;

  const idCorso = typeof corso === 'object' ? corso.id_corso : corso;
  inputIdCorso.value = idCorso;

  const relatoriList = (typeof corso === 'object' && corso.relatori) ? corso.relatori : [];
  relatoriCorsoAttuale = relatoriList.map(r => ({
    id: r.id_relatore,
    nome: r.nome,
    cognome: r.cognome,
    ente: r.ente_affiliazione,
    isNuovo: false
  }));

  renderGestioneRelatoriTags();
  await caricaRelatoriDB();
  inizializzaAutocompleteGestioneRelatori();

  modal.style.display = "flex";
}

/**
 * Renderizza i tag dei relatori nella modale di gestione del corso.
 */
function renderGestioneRelatoriTags() {
  const container = document.getElementById("lista-gestione-relatori-selezionati");
  if (!container) return;

  container.innerHTML = "";

  if (relatoriCorsoAttuale.length === 0) {
    container.innerHTML = '<span class="empty-tag-msg">Nessun relatore associato</span>';
    return;
  }

  relatoriCorsoAttuale.forEach((rel, index) => {
    const tag = document.createElement("div");
    tag.className = "tag-relatore";
    tag.setAttribute("draggable", "true");
    tag.setAttribute("data-index", index);

    const enteStr = rel.ente ? ` (${rel.ente})` : "";
    const badgeNuovo = rel.isNuovo ? " [Nuovo]" : "";
    const primoBadge = index === 0 ? '<strong style="color: #0d47a1; margin-right: 4px;">[1° Relatore]</strong> ' : '';

    tag.innerHTML = `
      <span style="cursor: move;">&#x2630; ${primoBadge}${rel.cognome} ${rel.nome}${enteStr}${badgeNuovo}</span>
      <button type="button" class="btn-remove-tag" data-index="${index}">&times;</button>
    `;

    tag.querySelector(".btn-remove-tag").addEventListener("click", (e) => {
      e.stopPropagation();
      const idx = parseInt(e.target.getAttribute("data-index"));
      relatoriCorsoAttuale.splice(idx, 1);
      renderGestioneRelatoriTags();
    });

    tag.addEventListener("dragstart", () => {
      draggedIndex = index;
      tag.classList.add("dragging");
    });

    tag.addEventListener("dragover", (e) => e.preventDefault());

    tag.addEventListener("drop", (e) => {
      e.preventDefault();
      if (draggedIndex !== null && draggedIndex !== index) {
        const rimosso = relatoriCorsoAttuale.splice(draggedIndex, 1)[0];
        relatoriCorsoAttuale.splice(index, 0, rimosso);
        renderGestioneRelatoriTags();
      }
    });

    tag.addEventListener("dragend", () => {
      draggedIndex = null;
      tag.classList.remove("dragging");
    });

    container.appendChild(tag);
  });
}

/**
 * Inizializza l'autocompletamento per la gestione dei relatori del corso.
 */
function inizializzaAutocompleteGestioneRelatori() {
  const searchInput = document.getElementById("search-gestione-relatore");
  const dropdown = document.getElementById("autocomplete-results-gestione");
  const btnAddNuovo = document.getElementById("btn-add-nuovo-relatore-gestione");

  if (!searchInput || !dropdown) return;

  searchInput.addEventListener("input", () => {
    const query = searchInput.value.toLowerCase().trim();
    dropdown.innerHTML = "";

    if (!query) {
      dropdown.style.display = "none";
      return;
    }

    const filtrati = tuttiRelatoriDB.filter(r =>
      `${r.cognome} ${r.nome}`.toLowerCase().includes(query) ||
      (r.ente_affiliazione && r.ente_affiliazione.toLowerCase().includes(query))
    );

    filtrati.forEach(r => {
      if (relatoriCorsoAttuale.some(sel => sel.id === r.id_relatore)) return;

      const item = document.createElement("div");
      item.className = "autocomplete-item";
      const ente = r.ente_affiliazione ? ` (${r.ente_affiliazione})` : "";
      item.textContent = `${r.cognome} ${r.nome}${ente}`;

      item.addEventListener("click", () => {
        relatoriCorsoAttuale.push({
          id: r.id_relatore,
          nome: r.nome,
          cognome: r.cognome,
          ente: r.ente_affiliazione,
          isNuovo: false
        });
        renderGestioneRelatoriTags();
        searchInput.value = "";
        dropdown.style.display = "none";
      });

      dropdown.appendChild(item);
    });

    dropdown.style.display = dropdown.children.length > 0 ? "block" : "none";
  });

  if (btnAddNuovo) {
    btnAddNuovo.onclick = () => {
      const cognomeInput = document.getElementById("gestione-relatore-cognome");
      const nomeInput = document.getElementById("gestione-relatore-nome");
      const enteInput = document.getElementById("gestione-relatore-ente");

      const cognome = cognomeInput.value.trim();
      const nome = nomeInput.value.trim();
      const ente = enteInput.value.trim();

      if (!cognome || !nome) {
        alert("Inserisci sia il nome che il cognome per il relatore.");
        return;
      }

      relatoriCorsoAttuale.push({
        id: null,
        nome: nome,
        cognome: cognome,
        ente: ente,
        isNuovo: true
      });

      renderGestioneRelatoriTags();
      cognomeInput.value = "";
      nomeInput.value = "";
      enteInput.value = "";
    };
  }
}

/**
 * Salva i relatori aggiornati associati al corso.
 */
async function salvataggioRelatoriCorso() {
  const idCorso = document.getElementById("gestione-relatori-id-corso").value;
  if (!idCorso) return;

  const relatori_ids = relatoriCorsoAttuale.filter(r => !r.isNuovo).map(r => r.id);
  const nuovi_relatori = relatoriCorsoAttuale.filter(r => r.isNuovo);

  try {
    const res = await fetch("php/aggiorna_relatori_corso.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id_corso: idCorso,
        relatori_ids: relatori_ids,
        nuovi_relatori: nuovi_relatori
      })
    });

    const data = await res.json();
    if (data.success) {
      chiudiModaleGenerica("modal-gestione-relatori");
      const corsoLi = document.querySelector(`.corsi-item[data-id-corso="${idCorso}"]`);
      selezionaCorso({ id_corso: idCorso }, corsoLi);
    } else {
      alert(data.message);
    }
  } catch (err) {
    console.error("Errore salvataggio relatori:", err);
    alert("Si è verificato un errore di rete.");
  }
}

// ==========================================
// --- FUNZIONI DI GESTIONE ANAGRAFICA ---
// ==========================================

let correnteTipoAnagrafica = 'relatore';
let listaAnagraficaCache = [];

/**
 * Apre la modale di gestione dell'anagrafica (relatori/insegnanti).
 */
function apriGestioneAnagrafica() {
  if (centroDiControllo.modalGestioneAnagrafica) {
    centroDiControllo.modalGestioneAnagrafica.style.display = "flex";
    cambiaTabAnagrafica('relatore');
  }
}

/**
 * Cambia il tab attivo nella gestione anagrafica (relatore o insegnante).
 * @param {string} tipo - Tipo anagrafica ('relatore' o 'insegnante').
 */
function cambiaTabAnagrafica(tipo) {
  correnteTipoAnagrafica = tipo;
  if (centroDiControllo.anagraficaTipo) {
    centroDiControllo.anagraficaTipo.value = tipo;
  }

  const searchInput = centroDiControllo?.searchAnagrafica || document.getElementById("search-anagrafica");
  if (searchInput) searchInput.value = "";

  const tabRelatori = document.getElementById("tab-relatori");
  const tabInsegnanti = document.getElementById("tab-insegnanti");
  if (tabRelatori) tabRelatori.classList.toggle("active", tipo === 'relatore');
  if (tabInsegnanti) tabInsegnanti.classList.toggle("active", tipo === 'insegnante');

  resetFormAnagrafica();
  caricaAnagrafica();
}

/**
 * Resetta il form di inserimento/modifica anagrafica.
 */
function resetFormAnagrafica() {
  if (centroDiControllo.formAnagrafica) {
    centroDiControllo.formAnagrafica.reset();
  }
  if (centroDiControllo.anagraficaId) centroDiControllo.anagraficaId.value = "";
  if (centroDiControllo.anagraficaDettaglio) {
    centroDiControllo.anagraficaDettaglio.value = (correnteTipoAnagrafica === 'insegnante') ? 'Liceo Marinelli' : '';
  }
  if (centroDiControllo.btnSalvaAnagrafica) centroDiControllo.btnSalvaAnagrafica.textContent = "Aggiungi";
  if (centroDiControllo.btnResetAnagrafica) centroDiControllo.btnResetAnagrafica.style.display = "none";
}

/**
 * Aggiorna l'indirizzo email predefinito per un insegnante in base a nome e cognome.
 */
function aggiornaEmailDefaultInsegnante() {
  if (correnteTipoAnagrafica !== 'insegnante' || !centroDiControllo.anagraficaEmail) return;

  const nome = centroDiControllo.anagraficaNome ? centroDiControllo.anagraficaNome.value.trim().toLowerCase().replace(/\s+/g, '') : '';
  const cognome = centroDiControllo.anagraficaCognome ? centroDiControllo.anagraficaCognome.value.trim().toLowerCase().replace(/\s+/g, '') : '';

  if (nome && cognome) {
    centroDiControllo.anagraficaEmail.value = `${nome}.${cognome}@liceomarinelli.edu.it`;
  } else {
    centroDiControllo.anagraficaEmail.value = '';
  }
}

/**
 * Carica l'elenco dell'anagrafica corrente (relatori o insegnanti) dal server.
 */
async function caricaAnagrafica() {
  try {
    const res = await fetch(`php/gestisciAnagrafica.php?action=lista&tipo=${correnteTipoAnagrafica}`);
    const resData = await res.json();

    if (resData.success) {
      listaAnagraficaCache = resData.data;
      renderListaAnagrafica(listaAnagraficaCache);
    }
  } catch (err) {
    console.error("Errore nel caricamento anagrafica:", err);
  }
}

/**
 * Prepara i campi del form per la modifica di un record anagrafico esistente.
 * @param {number} id - ID del record da modificare.
 */
function preparaEditAnagrafica(id) {
  const item = listaAnagraficaCache.find(x => 
    (correnteTipoAnagrafica === 'relatore' ? x.id_relatore : x.id_insegnante) == id
  );

  if (!item) return;

  if (centroDiControllo.anagraficaId) {
    centroDiControllo.anagraficaId.value = correnteTipoAnagrafica === 'relatore' ? item.id_relatore : item.id_insegnante;
  }
  if (centroDiControllo.anagraficaNome) centroDiControllo.anagraficaNome.value = item.nome || '';
  if (centroDiControllo.anagraficaCognome) centroDiControllo.anagraficaCognome.value = item.cognome || '';
  if (centroDiControllo.anagraficaDettaglio) {
    centroDiControllo.anagraficaDettaglio.value = item.ente_affiliazione || item.scuola || '';
  }
  if (centroDiControllo.anagraficaEmail) centroDiControllo.anagraficaEmail.value = item.email || '';

  if (centroDiControllo.btnSalvaAnagrafica) centroDiControllo.btnSalvaAnagrafica.textContent = "Aggiorna";
  if (centroDiControllo.btnResetAnagrafica) centroDiControllo.btnResetAnagrafica.style.display = "inline-block";
}

/**
 * Renderizza la tabella HTML con l'elenco dell'anagrafica.
 * @param {Array} lista - Array di oggetti anagrafici.
 */
function renderListaAnagrafica(lista) {
  const container = document.getElementById("container-lista-anagrafica");
  if (!container) return;

  if (lista.length === 0) {
    container.innerHTML = '<div style="padding: 10px; text-align: center; color: #777;">Nessun record trovato.</div>';
    return;
  }

  let html = '<table style="width:100%; border-collapse: collapse; text-align: left;">';

  if (correnteTipoAnagrafica === 'relatore') {
    html += '<tr style="background:#eee;"><th>Cognome e Nome</th><th>Ente / Affiliazione</th><th style="text-align: right;">Azioni</th></tr>';
    lista.forEach(item => {
      const ente = item.ente_affiliazione || '-';
      html += `
        <tr style="border-bottom: 1px solid #ddd;">
          <td style="padding: 8px;"><strong>${item.cognome}</strong> ${item.nome}</td>
          <td style="padding: 8px;">${ente}</td>
          <td style="padding: 8px; text-align: right;">
            <button type="button" class="btn-secondary" onclick="preparaEditAnagrafica(${item.id_relatore})" title="edit">✏️</button>
            <button type="button" class="btn-danger" onclick="eliminaAnagrafica(${item.id_relatore})" title="elimina">🗑️</button>
          </td>
        </tr>
      `;
    });
  } else {
    html += `
      <tr style="background:#eee;">
        <th>Cognome e Nome</th>
        <th>Stato Account</th>
        <th>Link Attivazione</th>
        <th style="text-align: right;">Azioni</th>
      </tr>
    `;

    lista.forEach(item => {
      const isAttivo = item.account_attivo || item.password_modificata;
      const isScaduto = item.token_scaduto;

      let badgeStato = isAttivo 
        ? '<span class="badge style-success" style="color: green;">Attivo</span>' 
        : (isScaduto 
          ? '<span class="badge style-danger" style="color: red;">Token Scaduto</span>' 
          : '<span class="badge style-warning" style="color: orange;">In attesa di attivazione</span>');

      let colonnaLink = '-';
      if (!isAttivo) {
        colonnaLink = `
          <div style="display: flex; gap: 4px;">
            <button type="button" class="btn-secondary btn-sm btn-copia-link-row" data-docente-id="${item.id_insegnante}" title="Copia Link">
              📋 Copia
            </button>
            <button type="button" class="btn-secondary btn-sm btn-rinnova-link-row" data-docente-id="${item.id_insegnante}" title="Rigenera Link">
              🔄 Rigenera
            </button>
          </div>
        `;
      }

      html += `
        <tr style="border-bottom: 1px solid #ddd;">
          <td style="padding: 8px;"><strong>${item.cognome}</strong> ${item.nome}<br><small style="color: #666;">${item.email}</small></td>
          <td style="padding: 8px;">${badgeStato}</td>
          <td style="padding: 8px;">${colonnaLink}</td>
          <td style="padding: 8px; text-align: right;">
            <button type="button" class="btn-secondary" onclick="preparaEditAnagrafica(${item.id_insegnante})" title="edit">✏️</button>
            <button type="button" class="btn-danger" onclick="eliminaAnagrafica(${item.id_insegnante})" title="elimina">🗑</button>
          </td>
        </tr>
      `;
    });
  }

  html += '</table>';
  container.innerHTML = html;
}

/**
 * Recupera e copia negli appunti il link di attivazione di un docente.
 * @param {number} idInsegnante - ID del docente.
 * @param {Event} [event] - Evento DOM opzionale.
 */
async function recuperaEMostraLinkAttivazione(idInsegnante, event = null) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  try {
    const response = await fetch(`php/gestisciAnagrafica.php?action=get_link&id=${idInsegnante}`);
    const data = await response.json();

    if (data.success && data.activation_link) {
      await navigator.clipboard.writeText(data.activation_link);
      mostraToast("📋 Link copiato negli appunti!");
      mostraModalLinkAttivazione(data.activation_link, idInsegnante);
    } else {
      alert(data.message || "Impossibile recuperare il link di attivazione.");
    }
  } catch (error) {
    console.error("Errore recupero link:", error);
    alert("Errore durante il recupero del link.");
  }
}

/**
 * Rigenera il token di attivazione per un account docente.
 * @param {number} idInsegnante - ID del docente.
 */
async function confermaERigeneraLinkAttivazione(idInsegnante) {
  if (!confirm("Sei sicuro di voler generare un nuovo token? Il vecchio link inviato non sarà più valido.")) return;

  try {
    const res = await fetch("php/gestisciAnagrafica.php?action=rigenera_link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_insegnante: idInsegnante })
    });
    const data = await res.json();
    if (data.success) {
      alert("Nuovo link generato con successo!");
      caricaAnagrafica();
      if (data.activation_link) {
        mostraModalLinkAttivazione(data.activation_link);
      }
    } else {
      alert(data.message);
    }
  } catch (err) {
    console.error("Errore rigenerazione link:", err);
  }
}

/**
 * Mostra la modale contenente il link di attivazione generato.
 * @param {string} link - URL del link di attivazione.
 * @param {number} [idInsegnante] - ID opzionale del docente.
 */
function mostraModalLinkAttivazione(link, idInsegnante = null) {
  if (centroDiControllo.activationLinkInput) {
    centroDiControllo.activationLinkInput.value = link;
  }
  if (centroDiControllo.modalActivationLink) {
    centroDiControllo.modalActivationLink.style.display = "flex";
  }
}

/**
 * Copia il link di attivazione presente nell'input della modale.
 */
function copiaLinkAttivazione() {
  const input = centroDiControllo.activationLinkInput;
  if (!input) return;

  input.select();
  input.setSelectionRange(0, 99999);

  navigator.clipboard.writeText(input.value)
    .then(() => alert("Link copiato negli appunti!"))
    .catch(() => {
      document.execCommand("copy");
      alert("Link copiato negli appunti!");
    });
}

/**
 * Salva o aggiorna un record anagrafico (relatore o insegnante).
 * @param {Event} e - Evento di submit del form.
 */
async function salvaAnagrafica(e) {
  e.preventDefault();

  const payload = {
    id: centroDiControllo.anagraficaId ? centroDiControllo.anagraficaId.value : '',
    tipo: correnteTipoAnagrafica,
    nome: centroDiControllo.anagraficaNome ? centroDiControllo.anagraficaNome.value : '',
    cognome: centroDiControllo.anagraficaCognome ? centroDiControllo.anagraficaCognome.value : '',
    dettaglio: centroDiControllo.anagraficaDettaglio ? centroDiControllo.anagraficaDettaglio.value : '',
    email: centroDiControllo.anagraficaEmail ? centroDiControllo.anagraficaEmail.value : ''
  };

  try {
    const res = await fetch("php/gestisciAnagrafica.php?action=salva", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (data.success) {
      chiudiModaleGenerica("modal-gestione-anagrafica");
      resetFormAnagrafica();
      caricaAnagrafica();

      if (data.activation_link) {
        mostraModalLinkAttivazione(data.activation_link, data.id_insegnante);
      }
    } else {
      alert(data.message);
    }
  } catch (err) {
    console.error("Errore salvataggio anagrafica:", err);
    alert("Si è verificato un errore di connessione con il server.");
  }
}

/**
 * Elimina un record anagrafico dal database.
 * @param {number} id - ID del record da eliminare.
 */
async function eliminaAnagrafica(id) {
  if (!confirm("Sei sicuro di voler eliminare questo record?")) return;

  try {
    const res = await fetch("php/gestisciAnagrafica.php?action=elimina", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: id, tipo: correnteTipoAnagrafica })
    });
    const data = await res.json();

    if (data.success) {
      caricaAnagrafica();
    } else {
      alert(data.message);
    }
  } catch (err) {
    console.error("Errore eliminazione:", err);
  }
}

/**
 * Mostra un messaggio Toast notificativo sullo schermo.
 * @param {string} messaggio - Testo della notifica.
 * @param {string} [tipo='success'] - Tipo di notifica ('success', 'error', 'warning', 'info').
 * @param {number} [durata=3000] - Durata in millisecondi.
 */
function mostraToast(messaggio, tipo = 'success', durata = 3000) {
  const toastEsistente = document.getElementById("toast-notifica-globale");
  if (toastEsistente) toastEsistente.remove();

  const toast = document.createElement("div");
  toast.id = "toast-notifica-globale";
  toast.className = `${tipo}`;
  toast.textContent = messaggio;

  document.body.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add("toast-show"));

  setTimeout(() => {
    toast.classList.remove("toast-show");
    setTimeout(() => toast.remove(), 300);
  }, durata);
}

let tuttiInsegnantiDB = [];
let tutteClassiDB = [];
let classiGiaAssociateCorso = [];

/**
 * Apre la modale per associare una classe e un insegnante a un corso.
 * @param {number} idCorso - ID del corso.
 */
async function apriModaleAggiungiClasse(idCorso) {
  const modal = centroDiControllo?.modalAggiungiClasse || document.getElementById("modal-aggiungi-classe");
  if (!modal) return;

  if (centroDiControllo?.inputIdCorsoClasse) centroDiControllo.inputIdCorsoClasse.value = idCorso;
  if (centroDiControllo?.formAggiungiClasse) centroDiControllo.formAggiungiClasse.reset();

  document.getElementById("select-insegnante-referente").value = "";
  document.getElementById("search-insegnante").value = "";
  document.getElementById("input-id-classe").value = "";
  document.getElementById("search-classe").value = "";

  await Promise.all([
    caricaInsegnantiDB(),
    caricaClassiDB(),
    caricaClassiGiàAssociateCorso(idCorso)
  ]);

  inizializzaAutocompleteInsegnante();
  inizializzaAutocompleteClasse();

  modal.style.display = "flex";
}

/**
 * Recupera l'elenco di tutte le classi dell'istituto.
 */
async function caricaClassiDB() {
  try {
    const res = await fetch("php/gestisciAnagrafica.php?action=lista&tipo=classe");
    const data = await res.json();
    tutteClassiDB = data.success ? data.data : [];
  } catch (err) {
    console.error("Errore recupero classi:", err);
    tutteClassiDB = [];
  }
}

/**
 * Recupera l'elenco degli insegnanti dal database.
 */
async function caricaInsegnantiDB() {
  try {
    const res = await fetch("php/gestisciAnagrafica.php?action=lista&tipo=insegnante");
    const data = await res.json();
    if (data.success) {
      tuttiInsegnantiDB = data.data;
    } else {
      tuttiInsegnantiDB = [];
    }
  } catch (err) {
    console.error("Errore recupero insegnanti:", err);
    tuttiInsegnantiDB = [];
  }
}

/**
 * Recupera le classi già associate al corso specificato.
 * @param {number} idCorso - ID del corso.
 */
async function caricaClassiGiàAssociateCorso(idCorso) {
  try {
    const res = await fetch(`php/get_corso_dettaglio.php?id_corso=${idCorso}`);
    const data = await res.json();
    if (data.success && data.corso && data.corso.classi) {
      classiGiaAssociateCorso = data.corso.classi.map(c => c.id_classe);
    } else {
      classiGiaAssociateCorso = [];
    }
  } catch (err) {
    console.error("Errore recupero classi associate al corso:", err);
    classiGiaAssociateCorso = [];
  }
}

/**
 * Inizializza l'autocompletamento per la ricerca delle classi con supporto da tastiera (frecce direzionali e Invio).
 */
function inizializzaAutocompleteClasse() {
  const searchInput = centroDiControllo.inputSearchClasse;
  const dropdown = document.getElementById("autocomplete-results-classe");
  const hiddenInput = document.getElementById("input-id-classe");

  if (!searchInput || !dropdown || !hiddenInput) return;

  let indiceAttivo = -1;

  function aggiornaSelezioneVisiva(items) {
    items.forEach((item, index) => {
      if (index === indiceAttivo) {
        item.style.backgroundColor = "#e0f3fc";
        item.style.color = "#1d99f3";
        item.scrollIntoView({ block: "nearest" });
      } else {
        item.style.backgroundColor = "";
        item.style.color = "";
      }
    });
  }

  searchInput.addEventListener("input", () => {
    const query = searchInput.value.toLowerCase().trim();
    dropdown.innerHTML = "";
    hiddenInput.value = "";
    indiceAttivo = -1;

    if (query.length === 0) {
      dropdown.style.display = "none";
      return;
    }

    const filtrati = tutteClassiDB.filter(c => {
      const nomeClasse = c.nome_classe ? String(c.nome_classe).toLowerCase() : "";
      return nomeClasse.includes(query);
    });

    if (filtrati.length === 0) {
      const itemEmpty = document.createElement("div");
      itemEmpty.className = "autocomplete-item empty";
      itemEmpty.textContent = "Nessuna classe trovata";
      dropdown.appendChild(itemEmpty);
      dropdown.style.display = "block";
      return;
    }

    filtrati.forEach(c => {
      const giaAssociata = classiGiaAssociateCorso.includes(c.id_classe);
      const item = document.createElement("div");
      item.className = `autocomplete-item ${giaAssociata ? 'disabled' : ''}`;

      const statoStr = giaAssociata ? ' — [Già abbinata a questo corso]' : '';
      item.textContent = `${c.nome_classe}${statoStr}`;

      if (giaAssociata) {
        item.style.color = "#a0a0a0";
        item.style.backgroundColor = "#f5f5f5";
        item.style.cursor = "not-allowed";
      } else {
        item.addEventListener("click", () => {
          searchInput.value = c.nome_classe;
          hiddenInput.value = c.id_classe;
          dropdown.style.display = "none";
        });
      }

      dropdown.appendChild(item);
    });

    dropdown.style.display = "block";
  });

  // Aggiunta del supporto alla navigazione da tastiera (Frecce e Invio)
  searchInput.addEventListener("keydown", (e) => {
    const items = dropdown.querySelectorAll(".autocomplete-item:not(.disabled):not(.empty)");
    if (dropdown.style.display === "block" && items.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        indiceAttivo = (indiceAttivo + 1) % items.length;
        aggiornaSelezioneVisiva(items);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        indiceAttivo = (indiceAttivo - 1 + items.length) % items.length;
        aggiornaSelezioneVisiva(items);
      } else if (e.key === "Enter" && indiceAttivo >= 0 && items[indiceAttivo]) {
        e.preventDefault();
        items[indiceAttivo].click();
      }
    }
  });

  document.addEventListener("click", (e) => {
    if (e.target !== searchInput && e.target !== dropdown) {
      dropdown.style.display = "none";
    }
  });
}

/**
 * Inizializza l'autocompletamento per la ricerca degli insegnanti.
 */
function inizializzaAutocompleteInsegnante() {
  const searchInput = centroDiControllo.inputSearchInsegnante;
  const hiddenInput = centroDiControllo.selectInsegnanteReferente;
  const dropdown = document.getElementById("autocomplete-results-insegnante");

  if (!searchInput || !dropdown || !hiddenInput) return;

  searchInput.addEventListener("input", () => {
    const query = searchInput.value.toLowerCase().trim();
    dropdown.innerHTML = "";
    hiddenInput.value = "";

    if (query.length === 0) {
      dropdown.style.display = "none";
      return;
    }

    const filtrati = tuttiInsegnantiDB.filter(ins =>
      `${ins.cognome} ${ins.nome}`.toLowerCase().includes(query) ||
      (ins.email && ins.email.toLowerCase().includes(query))
    );

    if (filtrati.length === 0) {
      const itemEmpty = document.createElement("div");
      itemEmpty.className = "autocomplete-item empty";
      itemEmpty.textContent = "Nessun insegnante trovato";
      dropdown.appendChild(itemEmpty);
      dropdown.style.display = "block";
      return;
    }

    filtrati.forEach(ins => {
      const item = document.createElement("div");
      item.className = "autocomplete-item";
      const emailStr = ins.email ? ` (${ins.email})` : "";
      item.textContent = `${ins.cognome} ${ins.nome}${emailStr}`;

      item.addEventListener("click", () => {
        searchInput.value = `${ins.cognome} ${ins.nome}`;
        hiddenInput.value = ins.id_insegnante;
        dropdown.style.display = "none";
      });

      dropdown.appendChild(item);
    });

    dropdown.style.display = "block";
  });

  document.addEventListener("click", (e) => {
    if (e.target !== searchInput && e.target !== dropdown) {
      dropdown.style.display = "none";
    }
  });
}

/**
 * Salva l'associazione tra una classe e un corso gestendo anche la digitazione diretta da tastiera.
 * @param {Event} e - Evento di submit del form.
 */
async function salvaClasseCorso(e) {
  e.preventDefault();

  const idCorso = centroDiControllo.inputIdCorsoClasse?.value;
  let idClasse = centroDiControllo.inputIdClasse?.value;
  const searchInputVal = centroDiControllo.inputSearchClasse?.value.trim().toUpperCase();
  const idInsegnante = centroDiControllo.selectInsegnanteReferente?.value;

  if ((!idClasse || idClasse === "") && searchInputVal) {
    const classeTrovata = tutteClassiDB.find(c => c.nome_classe && c.nome_classe.toUpperCase() === searchInputVal);
    if (classeTrovata) {
      idClasse = classeTrovata.id_classe;
    }
  }

  if (!idCorso || !idClasse) {
    alert("Seleziona una classe valida.");
    return;
  }

  const payload = {
    id_corso: idCorso,
    id_classe: idClasse,
    id_insegnante: idInsegnante
  };

  try {
    const res = await fetch("php/aggiungi_classe_corso.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (data.success) {
      mostraToast("Classe associata con successo!");

      chiudiModaleGenerica("modal-aggiungi-classe");

      const corsoLi = document.querySelector(`.corsi-item[data-id-corso="${idCorso}"]`);
      if (typeof selezionaCorso === "function") {
        selezionaCorso({ id_corso: idCorso }, corsoLi);
      }
    } else {
      alert(data.message || "Errore durante l'associazione della classe.");
    }
  } catch (err) {
    console.error("Errore invio classe/corso:", err);
    alert("Errore di rete durante il salvataggio.");
  }
}

/**
 * Gestisce la visualizzazione condizionale tra aula interna e sede esterna.
 * @param {boolean} isEsterna - True se si tratta di sede esterna, false altrimenti.
 */
function gestisciToggleSedeLezione(isEsterna) {
  if (isEsterna) {
    if (centroDiControllo.boxAulaInterna) centroDiControllo.boxAulaInterna.style.display = "none";
    if (centroDiControllo.boxSedeEsterna) centroDiControllo.boxSedeEsterna.style.display = "block";
    if (centroDiControllo.inputSearchAula) centroDiControllo.inputSearchAula.value = "";
    if (centroDiControllo.selectLezioneAula) centroDiControllo.selectLezioneAula.value = "";
  } else {
    if (centroDiControllo.boxAulaInterna) centroDiControllo.boxAulaInterna.style.display = "block";
    if (centroDiControllo.boxSedeEsterna) centroDiControllo.boxSedeEsterna.style.display = "none";
    if (centroDiControllo.inputLezioneDescrizioneSede) centroDiControllo.inputLezioneDescrizioneSede.value = "";
  }
}

let tutteAuleDB = [];
let aulaSelezionata = null;

/**
 * Apre la modale per la programmazione o la modifica di una lezione.
 * @param {number} idCorso - ID del corso.
 * @param {Object} [lezioneData=null] - Dati della lezione in caso di modifica.
 */
async function apriModaleLezione(idCorso, lezioneData = null) {
  const modal = centroDiControllo?.modalLezione;
  const form = centroDiControllo?.formLezione;
  if (!modal || !form) return;

  form.reset();
  aulaSelezionata = null;

  await caricaAuleDB();
  inizializzaAutocompleteAula();

  if (centroDiControllo.inputLezioneIdCorso) {
    centroDiControllo.inputLezioneIdCorso.value = idCorso;
  }

  if (lezioneData) {
    if (centroDiControllo.inputLezioneIdLezione) {
      centroDiControllo.inputLezioneIdLezione.value = lezioneData.id_lezione || "";
    }

    if (centroDiControllo.inputLezioneDurata) {
      centroDiControllo.inputLezioneDurata.value = lezioneData.durata_ore || "";
    }

    if (centroDiControllo.inputLezioneDataOra && lezioneData.data_ora) {
      const d = new Date(lezioneData.data_ora);
      if (!isNaN(d.getTime())) {
        const isoString = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
        centroDiControllo.inputLezioneDataOra.value = isoString;
      }
    }

    const isEsterna = Boolean(lezioneData.is_sede_esterna);
    const radioEsterna = form.querySelector(`input[name="is_sede_esterna"][value="${isEsterna ? "1" : "0"}"]`);
    if (radioEsterna) radioEsterna.checked = true;

    gestisciToggleSedeLezione(isEsterna);

    if (isEsterna) {
      if (centroDiControllo.inputLezioneDescrizioneSede) {
        centroDiControllo.inputLezioneDescrizioneSede.value = lezioneData.descrizione_sede_esterna || "";
      }
    } else {
      if (centroDiControllo.hiddenLezioneIdAula) {
        centroDiControllo.hiddenLezioneIdAula.value = lezioneData.id_aula || "";
      }
      if (centroDiControllo.inputSearchAula) {
        centroDiControllo.inputSearchAula.value = lezioneData.nome_aula || "";
      }
    }

    if (centroDiControllo.selectLezioneStatoPrenotazione) {
      centroDiControllo.selectLezioneStatoPrenotazione.value = lezioneData.stato_prenotazione_aula || "in_attesa";
    }

    if (centroDiControllo.inputLezioneOspiti) {
      centroDiControllo.inputLezioneOspiti.value = lezioneData.numero_ospiti_esterni ?? 0;
    }

  } else {
    if (centroDiControllo.inputLezioneIdLezione) {
      centroDiControllo.inputLezioneIdLezione.value = "";
    }
    if (centroDiControllo.selectLezioneStatoPrenotazione) {
      centroDiControllo.selectLezioneStatoPrenotazione.value = "in_attesa";
    }
    gestisciToggleSedeLezione(false);
  }

  modal.style.display = "flex";
}

/**
 * Salva o aggiorna una lezione inviando i dati al server.
 * @param {Event} e - Evento di submit del form.
 */
async function salvaLezione(e) {
  e.preventDefault();

  const idLezione = centroDiControllo.inputLezioneIdLezione?.value;
  const idCorso = centroDiControllo.inputLezioneIdCorso?.value;
  const radioSede = centroDiControllo.formLezione?.querySelector('input[name="is_sede_esterna"]:checked');
  const isEsterna = radioSede ? radioSede.value === "1" : false;

  const payload = {
    id_lezione: idLezione ? parseInt(idLezione) : null,
    id_corso: parseInt(idCorso),
    durata_ore: parseFloat(centroDiControllo.inputLezioneDurata?.value),
    data_ora: centroDiControllo.inputLezioneDataOra?.value,
    is_sede_esterna: isEsterna,
    id_aula: !isEsterna ? (centroDiControllo.selectLezioneAula?.value || null) : null,
    descrizione_sede_esterna: isEsterna ? centroDiControllo.inputLezioneDescrizioneSede?.value.trim() : null,
    stato_prenotazione_aula: centroDiControllo.selectLezioneStatoPrenotazione?.value,
    numero_ospiti_esterni: parseInt(centroDiControllo.inputLezioneOspiti?.value) || 0
  };

  try {
    const res = await fetch("php/salva_lezione.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (data.success) {
      mostraToast("Lezione salvata con successo!");
      chiudiModaleGenerica(centroDiControllo.modalLezione);

      if (typeof ricaricaLezioniCorso === "function") {
        ricaricaLezioniCorso(idCorso);
      }
    } else {
      alert(data.message || "Errore durante il salvataggio della lezione.");
    }
  } catch (err) {
    console.error("Errore salvataggio lezione:", err);
    alert("Errore di rete durante il salvataggio.");
  }
}

/**
 * Elimina una lezione dal database.
 * @param {number} idLezione - ID della lezione.
 * @param {number} idCorso - ID del corso di riferimento.
 */
async function eliminaLezione(idLezione, idCorso) {
  if (!confirm("Sei sicuro di voler eliminare questa lezione? L'azione non può essere annullata.")) {
    return;
  }

  try {
    const res = await fetch("php/elimina_lezione.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_lezione: idLezione })
    });

    const data = await res.json();

    if (data.success) {
      mostraToast("Lezione eliminata con successo!");
      ricaricaLezioniCorso(idCorso);
    } else {
      alert(data.message || "Errore durante l'eliminazione della lezione.");
    }
  } catch (err) {
    console.error("Errore eliminazione lezione:", err);
    alert("Errore di connessione durante la cancellazione.");
  }
}

/**
 * Carica l'elenco delle aule dal database.
 */
async function caricaAuleDB() {
  try {
    const res = await fetch("php/gestisciAnagrafica.php?action=lista&tipo=aula");
    const data = await res.json();
    tutteAuleDB = data.success ? data.data : [];
  } catch (err) {
    console.error("Errore recupero aule:", err);
    tutteAuleDB = [];
  }
}

/**
 * Inizializza l'autocompletamento per la ricerca o la creazione rapida delle aule.
 */
function inizializzaAutocompleteAula() {
  const searchInput = centroDiControllo?.inputSearchAula;
  const hiddenInput = centroDiControllo?.hiddenLezioneIdAula;
  const dropdown = centroDiControllo?.dropdownAutocompleteAula;
  const btnAddNuova = centroDiControllo?.btnAddNuovaAula;

  if (!searchInput || !dropdown || !hiddenInput) return;

  searchInput.addEventListener("input", () => {
    const query = searchInput.value.toLowerCase().trim();
    dropdown.innerHTML = "";
    hiddenInput.value = "";
    aulaSelezionata = null;

    if (!query) {
      dropdown.style.display = "none";
      return;
    }

    const filtrati = tutteAuleDB.filter(a => 
      a && a.nome_aula && String(a.nome_aula).toLowerCase().includes(query)
    );

    if (filtrati.length === 0) {
      dropdown.style.display = "none";
      return;
    }

    filtrati.forEach(a => {
      const item = document.createElement("div");
      item.className = "autocomplete-item";
      const capStr = a.capienza ? ` (Capienza: ${a.capienza})` : "";
      item.textContent = `${a.nome_aula}${capStr}`;

      item.addEventListener("click", () => {
        searchInput.value = a.nome_aula;
        hiddenInput.value = a.id_aula;
        aulaSelezionata = { id: a.id_aula, nome: a.nome_aula, capienza: a.capienza, isNuova: false };
        dropdown.style.display = "none";
      });

      dropdown.appendChild(item);
    });

    dropdown.style.display = "block";
  });

  if (btnAddNuova) {
    btnAddNuova.onclick = () => {
      const nomeInput = centroDiControllo?.inputNuovaAulaNome;
      const capienzaInput = centroDiControllo?.inputNuovaAulaCapienza;

      const nome = nomeInput ? nomeInput.value.trim() : "";
      const capienza = capienzaInput && capienzaInput.value ? parseInt(capienzaInput.value) : null;

      if (!nome) {
        alert("Inserisci il nome della nuova aula.");
        return;
      }

      aulaSelezionata = { id: null, nome: nome, capienza: capienza, isNuova: true };
      searchInput.value = `${nome} [Nuova Aula]`;
      hiddenInput.value = "";

      if (nomeInput) nomeInput.value = "";
      if (capienzaInput) capienzaInput.value = "";
    };
  }

  document.addEventListener("click", (e) => {
    if (e.target !== searchInput && e.target !== dropdown) {
      dropdown.style.display = "none";
    }
  });
}

/**
 * Carica le classi associate a un determinato corso.
 * @param {number} idCorso - ID del corso.
 */
async function caricaClassiCorso(idCorso) {
  const tbody = centroDiControllo.tbodyClassiCorso;
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="5" class="table-empty-td"><em>Caricamento in corso...</em></td></tr>`;

  try {
    const res = await fetch(`php/gestisciAnagrafica.php?action=classi_corso&id_corso=${idCorso}`);
    const result = await res.json();

    if (!result.success || !result.data || result.data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="table-empty-td"><em>Nessuna classe ancora associata a questo corso.</em></td></tr>`;
      return;
    }

    tbody.innerHTML = "";

    result.data.forEach(item => {
      const riga = creaRigaClasseCorso(item, idCorso);
      tbody.appendChild(riga);
    });

  } catch (err) {
    console.error("Errore nel recupero delle classi del corso:", err);
    tbody.innerHTML = `<tr><td colspan="5" class="table-empty-td" style="color: red;">Errore nel caricamento dei dati.</td></tr>`;
  }
}

/**
 * Rimuove l'associazione di una classe da un corso.
 * @param {number} idCorso - ID del corso.
 * @param {number} idClasse - ID della classe.
 */
async function rimuoviClasseCorso(idCorso, idClasse) {
  if (!confirm("Sei sicuro di voler rimuovere questa classe dal corso?")) return;

  try {
    const res = await fetch("php/gestisciAnagrafica.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "rimuovi_classe_corso",
        id_corso: idCorso,
        id_classe: idClasse
      })
    });

    const data = await res.json();
    if (data.success) {
      caricaClassiCorso(idCorso);
    } else {
      alert("Errore: " + data.message);
    }
  } catch (err) {
    console.error("Errore eliminazione associazione:", err);
    alert("Errore durante la comunicazione con il server.");
  }
}

/**
 * Seleziona e visualizza i dettagli completi di un corso nel workspace.
 * @param {Object|number} corso - Oggetto corso o ID del corso.
 * @param {HTMLElement} [elementoLi] - Elemento lista della sidebar corrispondente.
 */
function selezionaCorso(corso, elementoLi) {
  const workspace = centroDiControllo.workspaceContent || document.getElementById("workspace-content");
  if (!workspace) return;

  const idCorso = typeof corso === 'object' ? corso.id_corso : corso;

  // Imposta subito l'ID per evitare race conditions o controlli falliti
  if (centroDiControllo) {
    centroDiControllo.currentCorsoId = idCorso;
  }

  localStorage.setItem("ultimoCorsoSelezionato", idCorso);

  document.querySelectorAll(".corsi-item").forEach(el => el.classList.remove("active"));
  if (elementoLi) {
    elementoLi.classList.add("active");
  } else {
    const liCorrente = document.querySelector(`.corsi-item[data-id-corso="${idCorso}"]`);
    if (liCorrente) liCorrente.classList.add("active");
  }

  workspace.innerHTML = '<div class="text-center py-4"><em>Caricamento dettagli corso...</em></div>';

  if (typeof corso !== 'object' || !corso.lezioni) {
    fetch(`php/get_corso_dettaglio.php?id_corso=${idCorso}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.corso) {
          montaVistaCorso(workspace, data.corso);
        } else {
          workspace.innerHTML = `<div class="alert alert-danger">Impossibile caricare i dettagli del corso.</div>`;
        }
      })
      .catch(err => {
        console.error("Errore caricamento corso:", err);
        workspace.innerHTML = `<div class="alert alert-danger">Errore di rete durante il caricamento del corso.</div>`;
      });
  } else {
    montaVistaCorso(workspace, corso);
  }
}

/**
 * Monta le sezioni della vista del corso all'interno del workspace.
 * @param {HTMLElement} workspace - Contenitore principale.
 * @param {Object} corso - Dati del corso.
 */
function montaVistaCorso(workspace, corso) {
  workspace.innerHTML = '';

  if (centroDiControllo) {
    centroDiControllo.currentCorsoId = corso.id_corso;
  }

  const container = document.createElement('div');
  container.className = 'container-fluid py-3';

  container.appendChild(creaSezioneHeader(corso));
  container.appendChild(creaSezioneClassi(corso.id_corso));
  container.appendChild(creaSezioneLezioni(corso));
  container.appendChild(creaSezioneNote());

  workspace.appendChild(container);

  const textarea = workspace.querySelector('#course-notes');
  if (textarea) {
    textarea.value = corso.note || '';
  }
}

/**
 * Ricarica la vista delle lezioni per il corso specificato.
 * @param {number} idCorso - ID del corso.
 */
function ricaricaLezioniCorso(idCorso) {
  const corsoLi = document.querySelector(`.corsi-item[data-id-corso="${idCorso}"]`);
  selezionaCorso(idCorso, corsoLi);
}

// --- GESTIONE GLOBALE CLASSI ---

/**
 * Apre la modale per la gestione globale delle classi.
 */
async function apriModaleGestioneClassi() {
  const modal = centroDiControllo.modalGestioneClassi || document.getElementById("modal-gestione-classi");
  if (!modal) return;

  const userRole = window.userRole || localStorage.getItem("pls_user_role");
  if (centroDiControllo.formNuovaClasse) {
    centroDiControllo.formNuovaClasse.style.display = (userRole === 'insegnante') ? 'none' : 'block';
  }

  modal.style.display = "flex";
  await caricaGrigliaClassi();
}

/**
 * Carica la griglia delle classi dal server.
 */
async function caricaGrigliaClassi() {
  const container = centroDiControllo.grigliaClassi || document.getElementById("griglia-classi");
  if (!container) return;

  container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #666;">Caricamento classi in corso...</div>';

  try {
    const res = await fetch("php/gestisciAnagrafica.php?action=lista&tipo=classe");
    const data = await res.json();

    if (data.success) {
      renderGrigliaClassi(data.data);
    } else {
      container.innerHTML = `<div style="grid-column: 1/-1; color: red;">${data.message || "Errore durante il caricamento delle classi."}</div>`;
    }
  } catch (err) {
    console.error("Errore caricamento classi:", err);
    container.innerHTML = '<div style="grid-column: 1/-1; color: red;">Errore di connessione con il server.</div>';
  }
}

/**
 * Renderizza le card delle classi nella griglia di gestione.
 * @param {Array} classi - Array di classi.
 */
function renderGrigliaClassi(classi) {
  const container = centroDiControllo.grigliaClassi;
  if (!container) return;

  container.innerHTML = "";

  if (!classi || classi.length === 0) {
    container.innerHTML = '<div class="griglia-classi-empty" style="grid-column: 1/-1; text-align: center;">Nessuna classe presente. Aggiungine una tramite il form sopra.</div>';
    return;
  }

  classi.forEach(c => {
    const card = document.createElement("div");
    card.className = "card-classe-item";

    const nomeClasse = c.nome_classe || c.nome || (c.anno ? `${c.anno}ª ${c.sezione || ''}` : "Classe senza nome");
    const idClasse = c.id_classe || c.id;

    card.innerHTML = `
      <div style="margin-bottom: 10px;">
        <div class="card-classe-titolo" style="font-weight: bold; font-size: 1.1em; color: #333;">${nomeClasse}</div>
      </div>
      <div class="card-classe-azioni">
        <div style="display: flex; gap: 6px;">
          <button type="button" class="btn-primary btn-sm btn-gestisci-studenti" data-id-classe="${idClasse}" style="flex: 1; padding: 6px 4px; font-size: 0.78rem;">
            👥 Studenti
          </button>
          <button type="button" class="btn-primary btn-sm btn-apri-appello" data-id-classe="${idClasse}" style="flex: 1; padding: 6px 4px; font-size: 0.78rem;">
            🎓 Appello
          </button>
        </div>
        <button type="button" class="btn-danger btn-sm btn-elimina-classe-globale" data-id-classe="${idClasse}">
          🗑️ Rimuovi
        </button>
      </div>
    `;

    const btnElimina = card.querySelector(".btn-elimina-classe-globale");
    if (btnElimina) {
      btnElimina.addEventListener("click", () => eliminaClasseGlobale(idClasse, nomeClasse));
    }

    const btnStudenti = card.querySelector(".btn-gestisci-studenti");
    if (btnStudenti) {
      btnStudenti.addEventListener("click", () => {
        if (typeof apriModaleGestioneStudenti === "function") {
          apriModaleGestioneStudenti(idClasse, nomeClasse);
        }
      });
    }

    const btnAppello = card.querySelector(".btn-apri-appello");
    if (btnAppello) {
      btnAppello.addEventListener("click", () => {
        if (typeof apriModaleAppello === "function") {
          apriModaleAppello(idClasse, nomeClasse);
        }
      });
    }

    container.appendChild(card);
  });
}

/**
 * Salva una nuova classe nel sistema.
 * @param {Event} e - Evento di submit del form.
 */
async function salvaNuovaClasse(e) {
  e.preventDefault();

  const nomeInput = centroDiControllo.inputNomeClasse?.value.trim();

  if (!nomeInput) {
    alert("Inserisci il nome della classe.");
    return;
  }

  const nomeUpper = nomeInput.toUpperCase();

  if (tutteClassiDB && tutteClassiDB.some(c => c.nome_classe && c.nome_classe.toUpperCase() === nomeUpper)) {
    alert(`La classe "${nomeUpper}" è già presente in elenco.`);
    return;
  }

  const payload = {
    action: "salva",
    tipo: "classe",
    nome_classe: nomeUpper
  };

  try {
    const res = await fetch("php/gestisciAnagrafica.php?action=salva", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (data.success) {
      if (typeof mostraToast === "function") mostraToast("Classe salvata con successo!");
      const form = centroDiControllo.formNuovaClasse;
      if (form) form.reset();
      await caricaGrigliaClassi();
      await caricaClassiDB();
    } else {
      alert(data.message || "Errore durante il salvataggio della classe.");
    }
  } catch (err) {
    console.error("Errore salvataggio classe:", err);
    alert("Errore di connessione con il server.");
  }
}

/**
 * Elimina una classe globalmente dal sistema.
 * @param {number} idClasse - ID della classe.
 * @param {string} etichettaClasse - Nome/Etichetta della classe.
 */
async function eliminaClasseGlobale(idClasse, etichettaClasse) {
  if (!confirm(`Sei sicuro di voler eliminare la classe ${etichettaClasse}?`)) return;

  try {
    const res = await fetch("php/gestisciAnagrafica.php?action=elimina", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: idClasse, tipo: "classe" })
    });
    const data = await res.json();

    if (data.success) {
      if (typeof mostraToast === "function") mostraToast("Classe eliminata con successo!");
      await caricaGrigliaClassi();
    } else {
      alert(data.message || "Impossibile eliminare la classe.");
    }
  } catch (err) {
    console.error("Errore eliminazione classe:", err);
    alert("Errore durante la comunicazione con il server.");
  }
}

let cacheStudentiClasseAttuale = [];
let idClasseCorrenteAppello = null;

/**
 * Apre la modale per la gestione degli studenti di una classe.
 * @param {number} idClasse - ID della classe.
 * @param {string} nomeClasse - Nome della classe.
 */
async function apriModaleGestioneStudenti(idClasse, nomeClasse) {
  idClasseCorrenteAppello = idClasse;

  const modal = centroDiControllo.modalElencoStudenti;
  if (centroDiControllo.elencoStudentiClasseNome) {
    centroDiControllo.elencoStudentiClasseNome.textContent = nomeClasse || `Classe ID #${idClasse}`;
  }

  await ricaricaListaStudentiGestione(idClasse);

  if (modal) modal.style.display = "flex";
}

/**
 * Renderizza la tabella degli studenti nella modale di gestione.
 * @param {Array} studenti - Array di studenti.
 */
function renderTabellaStudentiGestione(studenti) {
  const container = centroDiControllo.containerListaStudentiAnagrafica;
  if (!container) return;

  if (studenti.length === 0) {
    container.innerHTML = '<div style="padding:15px; text-align:center; color:#777;">Nessun studente presente in questa classe. Aggiungine uno usando il modulo sopra.</div>';
    return;
  }

  let html = `
    <table style="width:100%; border-collapse:collapse; text-align:left;">
      <thead>
        <tr style="background:#f1f3f5; border-bottom:2px solid #dee2e6;">
          <th style="padding:8px;">Cognome e Nome</th>
          <th style="padding:8px; text-align:right; width:100px;">Gestione</th>
        </tr>
      </thead>
      <tbody>
  `;

  studenti.forEach((st) => {
    html += `
      <tr style="border-bottom:1px solid #e9ecef;">
        <td style="padding:8px;">
          <strong>${st.cognome}</strong> ${st.nome}
        </td>
        <td style="padding:8px; text-align:right;">
          <button type="button" class="btn-danger btn-sm" onclick="rimuoviStudenteDaClasseGestione(${st.id_studente}, '${st.cognome} ${st.nome}')" title="Rimuovi studente dalla classe">🗑️</button>
        </td>
      </tr>
    `;
  });

  html += '</tbody></table>';
  container.innerHTML = html;
}

/**
 * Configura la sezione visiva dell'insegnante nel modale appello.
 * @param {number|null} idInsegnanteNoto - ID dell'insegnante referente.
 * @param {string} nomeInsegnanteNoto - Nome completo dell'insegnante.
 */
async function configuraSezioneInsegnanteAppello(idInsegnanteNoto, nomeInsegnanteNoto) {
  const btnSalvaAppello = centroDiControllo.formAppelloStudenti?.querySelector("button[type='submit']");
  const divInsegnanteAppello = centroDiControllo.divInsegnanteAppello;

  const oldLabel = document.getElementById("label-insegnante-noto");
  if (oldLabel) oldLabel.remove();

  if (idInsegnanteNoto && nomeInsegnanteNoto) {
    const labelDocente = document.createElement("div");
    labelDocente.id = "label-insegnante-noto";
    labelDocente.style.cssText = "font-weight: bold; margin-bottom: 12px; color: #2c3e50;";
    labelDocente.innerHTML = `👨‍🏫 Insegnante Referente: <span style="color: #0d47a1;">${nomeInsegnanteNoto}</span>`;
    labelDocente.dataset.idInsegnante = idInsegnanteNoto;

    if (divInsegnanteAppello) {
      divInsegnanteAppello.style.display = "block";
      divInsegnanteAppello.append(labelDocente);
    }

    if (btnSalvaAppello) {
      btnSalvaAppello.style.display = "inline-block";
    }
  } else {
    if (divInsegnanteAppello) {
      divInsegnanteAppello.style.display = "none";
    }
    if (btnSalvaAppello) {
      btnSalvaAppello.style.display = "none";
    }
  }
}

/**
 * Salva l'appello per gli studenti della classe.
 * @param {Event} e - Evento di submit del form.
 */
async function gestisciSalvataggioAppello(e) {
  e.preventDefault();

  const labelNoto = document.getElementById("label-insegnante-noto");
  let idInsegnante = labelNoto 
    ? labelNoto.dataset.idInsegnante 
    : (centroDiControllo.selectDocenteAppello?.value || null);

  if (!idInsegnante) {
    alert("Impossibile salvare l'appello senza un insegnante assegnato.");
    return;
  }

  const container = centroDiControllo.containerListaStudentiAppello;
  const presenze = [];

  if (container) {
    container.querySelectorAll(".chk-presente-studente").forEach(chk => {
      presenze.push({
        id_studente: chk.dataset.idStudente,
        presente: chk.checked
      });
    });
  }

  const payload = {
    id_classe: idClasseCorrenteAppello,
    id_insegnante: idInsegnante,
    presenze: presenze
  };

  try {
    const res = await fetch("php/salva_appello.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.success) {
      if (typeof mostraToast === "function") mostraToast("Lista Studenti aggiornata con successo!");
      if (centroDiControllo.modalElencoStudenti) {
        chiudiModaleGenerica(centroDiControllo.modalElencoStudenti);
      }
    } else {
      alert(data.message || "Errore durante il salvataggio dell'appello.");
    }
  } catch (err) {
    console.error("Errore salvataggio appello:", err);
    alert("Errore di connessione con il server.");
  }
}

/**
 * Carica l'elenco dei docenti nella select del modulo appello.
 */
async function caricaDocentiSelectAppello() {
  const select = centroDiControllo.selectDocenteAppello;
  if (!select) return;

  try {
    const res = await fetch("php/gestisciAnagrafica.php?action=lista&tipo=insegnante");
    const data = await res.json();

    if (data.success) {
      select.innerHTML = '<option value="">-- Seleziona Insegnante Referente --</option>';
      data.data.forEach(ins => {
        const opt = document.createElement("option");
        opt.value = ins.id_insegnante;
        opt.textContent = `${ins.cognome} ${ins.nome}`;
        select.appendChild(opt);
      });
    }
  } catch (err) {
    console.error("Errore caricamento insegnanti appello:", err);
  }
}

/**
 * Ricarica la lista degli studenti per la modale di gestione anagrafica classe.
 * @param {number} idClasse - ID della classe.
 */
async function ricaricaListaStudentiGestione(idClasse) {
  const container = centroDiControllo.containerListaStudentiAnagrafica;
  if (!container) return;

  container.innerHTML = '<div style="padding:10px; text-align:center; color:#666;">Caricamento studenti...</div>';

  try {
    const res = await fetch(`php/gestisciAnagrafica.php?action=studenti_classe&id_classe=${idClasse}`);
    const data = await res.json();

    if (data.success) {
      cacheStudentiClasseAttuale = data.data || [];
      renderTabellaStudentiGestione(cacheStudentiClasseAttuale);
    } else {
      container.innerHTML = `<div style="padding:10px; color:red;">${data.message || "Errore caricamento studenti"}</div>`;
    }
  } catch (err) {
    console.error("Errore recupero studenti:", err);
    container.innerHTML = '<div style="padding:10px; color:red;">Errore di connessione col server.</div>';
  }
}

/**
 * Renderizza la tabella degli studenti per la gestione presenze.
 * @param {Array} studenti - Array di studenti.
 */
function renderTabellaAppello(studenti) {
  const container = centroDiControllo.containerListaStudentiAppello;
  if (!container) return;

  if (studenti.length === 0) {
    container.innerHTML = '<div style="padding:15px; text-align:center; color:#777;">Nessun studente presente in questa classe. Aggiungine uno usando il modulo sopra.</div>';
    return;
  }

  let html = `
    <table style="width:100%; border-collapse:collapse; text-align:left;">
      <thead>
        <tr style="background:#f1f3f5; border-bottom:2px solid #dee2e6;">
          <th style="padding:8px; width:50px; text-align:center;">Presente</th>
          <th style="padding:8px;">Cognome e Nome</th>
          <th style="padding:8px; text-align:right; width:100px;">Gestione</th>
        </tr>
      </thead>
      <tbody>
  `;

  studenti.forEach((st) => {
    const checked = st.presente !== false ? 'checked' : '';

    html += `
      <tr style="border-bottom:1px solid #e9ecef;">
        <td style="padding:8px; text-align:center;">
          <input type="checkbox" class="chk-presente-studente" data-id-studente="${st.id_studente}" ${checked} style="width:18px; height:18px; cursor:pointer;">
        </td>
        <td style="padding:8px;">
          <strong>${st.cognome}</strong> ${st.nome}
        </td>
        <td style="padding:8px; text-align:right;">
          <button type="button" class="btn-danger btn-sm" onclick="rimuoviStudenteDaClasse(${st.id_studente}, '${st.cognome} ${st.nome}')" title="Rimuovi studente dalla classe">🗑️</button>
        </td>
      </tr>
    `;
  });

  html += '</tbody></table>';
  container.innerHTML = html;
}

/**
 * Aggiunge un nuovo studente alla classe tramite modulo inline.
 * @param {Event} e - Evento di submit del form.
 */
async function gestisciAggiungiStudenteInline(e) {
  e.preventDefault();

  const cognomeInput = centroDiControllo.nuovoStudenteCognome;
  const nomeInput = centroDiControllo.nuovoStudenteNome;

  if (!cognomeInput || !nomeInput) return;

  const cognome = cognomeInput.value.trim();
  const nome = nomeInput.value.trim();

  if (!cognome || !nome || !idClasseCorrenteAppello) return;

  try {
    const res = await fetch("php/gestisciAnagrafica.php?action=salva_studente", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id_classe: idClasseCorrenteAppello,
        cognome: cognome,
        nome: nome
      })
    });

    const data = await res.json();
    if (data.success) {
      if (typeof mostraToast === "function") mostraToast("Studente aggiunto alla classe!");
      cognomeInput.value = "";
      nomeInput.value = "";
      await ricaricaListaStudentiGestione(idClasseCorrenteAppello);
    } else {
      alert(data.message || "Errore durante l'aggiunta dello studente.");
    }
  } catch (err) {
    console.error("Errore aggiunta studente:", err);
  }
}

/**
 * Rimuove uno studente dalla classe dalla modale di gestione.
 * @param {number} idStudente - ID dello studente.
 * @param {string} nomeCompleto - Nome e cognome dello studente.
 */
async function rimuoviStudenteDaClasseGestione(idStudente, nomeCompleto) {
  if (!confirm(`Sei sicuro di voler rimuovere lo studente ${nomeCompleto} dalla classe?`)) return;

  try {
    const res = await fetch("php/gestisciAnagrafica.php?action=elimina_studente", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_studente: idStudente })
    });

    const data = await res.json();
    if (data.success) {
      if (typeof mostraToast === "function") mostraToast("Studente rimosso.");
      await ricaricaListaStudentiGestione(idClasseCorrenteAppello);
    } else {
      alert(data.message || "Errore durante la rimozione dello studente.");
    }
  } catch (err) {
    console.error("Errore rimozione studente:", err);
  }
}

/**
 * Imposta lo stato di presenza (seleziona/deseleziona) per tutti gli studenti.
 * @param {boolean} stato - Stato booleano dei checkbox.
 */
function impostaTuttiStudenti(stato) {
  const container = centroDiControllo.containerListaStudentiAppello;
  if (!container) return;

  const checkboxes = container.querySelectorAll(".chk-presente-studente");
  checkboxes.forEach(chk => chk.checked = stato);
}

/**
 * Apre la modale per la gestione dell'appello a griglia (lezioni x studenti).
 * @param {number} idClasse - ID della classe.
 * @param {string} nomeClasse - Nome della classe.
 */
async function apriModaleAppello(idClasse, nomeClasse) {
  const modal = centroDiControllo.modalGestioneAppello || document.getElementById("modal-gestione-appello");
  const titleEl = centroDiControllo.nomeClasseAppello || document.getElementById("nome-classe-appello");
  const headerRow = centroDiControllo.appelloHeaderRow || document.getElementById("appello-header-row");
  const tbody = centroDiControllo.containerListaStudentiAppello || document.getElementById("container-lista-studenti-appello");

  try {
    const response = await fetch(`php/gestisciAnagrafica.php?action=lezioni_e_presenze_classe&id_classe=${idClasse}`);
    const res = await response.json();

    if (!res.success || !res.lezioni || res.lezioni.length === 0) {
      alert(`La classe "${nomeClasse}" non risulta iscritta ad alcun corso attivo. Torna a Gestione Classi per associarla.`);
      if (typeof apriModaleGestioneClassi === "function") apriModaleGestioneClassi();
      return;
    }

    if (!modal) return;

    modal.dataset.idClasse = idClasse;
    if (titleEl) titleEl.textContent = `Appello Classe: ${nomeClasse}`;

    headerRow.innerHTML = '<th class="col-studente-fixed">Studente</th>';
    tbody.innerHTML = '';

    const lezioni = res.lezioni || [];
    const studenti = res.studenti || [];
    const presenze = res.presenze || {};

    lezioni.forEach((lez, index) => {
      const th = document.createElement("th");
      th.className = "col-lezione-header";

      // Assegniamo la data della lezione al dataset del th in modo da poterla leggere al salvataggio
      if (lez.data_ora) {
        th.dataset.dataLezione = lez.data_ora;
      }

      const dataFormattata = lez.data_ora ? formattaDataOra(lez.data_ora) : '';

      th.innerHTML = `
        <div class="header-lezione-title">Lezione ${index + 1}</div>
        <div class="header-lezione-date">${dataFormattata}</div>
        <div class="header-col-actions" style="margin-top: 6px; display: flex; justify-content: center; gap: 4px;">
          <button type="button" class="btn-col-select" onclick="selezionaColonnaLezione(${lez.id_lezione}, true)" title="Seleziona tutti">✓</button>
          <button type="button" class="btn-col-deselect" onclick="selezionaColonnaLezione(${lez.id_lezione}, false)" title="Deseleziona tutti">✗</button>
          <button type="button" class="btn-appello-action btn-save-green" style="padding: 4px 6px; font-size: 0.72rem;" onclick="salvaSingolaLezione(${lez.id_lezione})">
            💾
          </button>
        </div>
      `;
      headerRow.appendChild(th);
    });

    if (studenti.length === 0) {
      tbody.innerHTML = `<tr><td colspan="${lezioni.length + 1}" class="table-empty-td">Nessun studente presente nella classe.</td></tr>`;
    } else {
      studenti.forEach((st) => {
        const tr = document.createElement("tr");

        const tdNome = document.createElement("td");
        tdNome.className = "col-studente-fixed";
        tdNome.innerHTML = `<strong>${st.cognome}</strong> ${st.nome}`;
        tr.appendChild(tdNome);

        lezioni.forEach((lez) => {
          const tdCheck = document.createElement("td");
          tdCheck.className = "cell-presenza";

          const isPresente = presenze[st.id_studente] && presenze[st.id_studente][lez.id_lezione];

          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.className = "chk-appello-presenza";
          checkbox.dataset.idStudente = st.id_studente;
          checkbox.dataset.idLezione = lez.id_lezione;
          checkbox.checked = Boolean(isPresente);

          tdCheck.appendChild(checkbox);
          tr.appendChild(tdCheck);
        });

        tbody.appendChild(tr);
      });
    }

    modal.style.display = "flex";

  } catch (err) {
    console.error("Errore apriModaleAppello:", err);
    mostraToast("Errore durante il recupero dei dati dell'appello", "error");
  }
}

/**
 * Salva l'intera matrice delle presenze dell'appello.
 */
async function salvaPresenzeAppello() {
  const modal = centroDiControllo.modalGestioneAppello;
  const checkboxes = document.querySelectorAll("#container-lista-studenti-appello .chk-appello-presenza");

  let richiedeConferma = false;
  const oggi = new Date();
  oggi.setHours(0, 0, 0, 0);

  // Leggiamo direttamente dagli elementi th della testata della tabella
  const headerThEls = document.querySelectorAll("#appello-header-row th.col-lezione-header");
  headerThEls.forEach(th => {
    if (th.dataset && th.dataset.dataLezione) {
      const dataLezione = new Date(th.dataset.dataLezione);
      dataLezione.setHours(0, 0, 0, 0);
      if (oggi > dataLezione) {
        richiedeConferma = true;
      }
    }
  });

  if (richiedeConferma) {
    if (!confirm("Attenzione: stai salvando o modificando presenze relative a una o più lezioni risalenti a date passate. Desideri procedere comunque?")) {
      return;
    }
  }

  const presenze = [];
  checkboxes.forEach(chk => {
    presenze.push({
      id_studente: parseInt(chk.dataset.idStudente),
      id_lezione: parseInt(chk.dataset.idLezione),
      presente: chk.checked
    });
  });

  try {
    const res = await fetch("php/gestisciAnagrafica.php?action=salva_presenze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ presenze: presenze })
    });
    const data = await res.json();

    if (data.success) {
      mostraToast("Presenze salvate con successo!");
      chiudiModaleGenerica(modal);
    } else {
      alert(data.message || "Errore durante il salvataggio delle presenze.");
    }
  } catch (err) {
    console.error("Errore salvataggio presenze:", err);
    alert("Errore di connessione durante il salvataggio.");
  }
}

/**
 * Salva le presenze relative a una singola lezione (colonna).
 * @param {number} idLezione - ID della lezione.
 */
async function salvaSingolaLezione(idLezione) {
  // Individuazione del th specifico tramite il bottone di salvataggio della colonna
  const thLezione = document.querySelector(`.btn-save-green[onclick*="salvaSingolaLezione(${idLezione})"]`)?.closest("th");
  if (thLezione && thLezione.dataset && thLezione.dataset.dataLezione) {
    const dataLezione = new Date(thLezione.dataset.dataLezione);
    dataLezione.setHours(0, 0, 0, 0);
    const oggi = new Date();
    oggi.setHours(0, 0, 0, 0);

    if (oggi > dataLezione) {
      if (!confirm("Attenzione: stai registrando o modificando le presenze per una lezione di una data passata. Vuoi procedere?")) {
        return;
      }
    }
  }

  const checkboxes = document.querySelectorAll(
    `#container-lista-studenti-appello .chk-appello-presenza[data-id-lezione="${idLezione}"]`
  );

  const presenzeLezione = [];
  checkboxes.forEach(chk => {
    presenzeLezione.push({
      id_studente: parseInt(chk.dataset.idStudente),
      id_lezione: parseInt(idLezione),
      presente: chk.checked
    });
  });

  try {
    const res = await fetch("php/gestisciAnagrafica.php?action=salva_presenze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ presenze: presenzeLezione })
    });
    const data = await res.json();

    if (data.success) {
      mostraToast(`Presenze Lezione salvate con successo!`);
    } else {
      alert(data.message || "Errore durante il salvataggio della lezione.");
    }
  } catch (err) {
    console.error("Errore salvataggio singola lezione:", err);
    alert("Errore di connessione durante il salvataggio.");
  }
}

/**
 * Seleziona o deseleziona tutti i checkbox di una specifica colonna (lezione).
 * @param {number} idLezione - ID della lezione.
 * @param {boolean} stato - Stato booleano di selezione.
 */
function selezionaColonnaLezione(idLezione, stato) {
  const checkboxes = document.querySelectorAll(
    `#container-lista-studenti-appello .chk-appello-presenza[data-id-lezione="${idLezione}"]`
  );
  checkboxes.forEach(chk => {
    chk.checked = stato;
  });
}

/**
 * Ricarica lo stato attuale dell'appello dal server annullando le modifiche non salvate.
 */
function ricaricaAppelloCorrente() {
  if (!confirm("Vuoi ricaricare i dati dal server? Eventuali modifiche non salvate andranno perse.")) return;

  const modal = centroDiControllo.modalGestioneAppello;
  const idClasse = modal ? modal.dataset.idClasse : null;

  if (idClasse) {
    apriModaleAppello(idClasse, document.getElementById("nome-classe-appello").textContent.replace("Appello Classe: ", ""));
    mostraToast("Vista ricaricata dal server.", "info");
  }
}

function inizializzaRicercaAnagrafica() {
  const searchInput = centroDiControllo?.searchAnagrafica || document.getElementById("search-anagrafica");
  if (!searchInput) return;

  searchInput.oninput = (e) => {
    const query = e.target.value.toLowerCase().trim();
    if (!query) {
      renderListaAnagrafica(listaAnagraficaCache);
      return;
    }

    const filtrati = listaAnagraficaCache.filter(item => {
      // Unisce tutti i campi testuali rilevanti in un'unica stringa minuscola
      const testoCompleto = [
        item.nome,
        item.cognome,
        item.email,
        item.ente_affiliazione,
        item.scuola
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return testoCompleto.includes(query);
    });

    renderListaAnagrafica(filtrati);
  };
}

function adattaInterfacciaPerRuolo(role) {
  const btnNuovoCorso = centroDiControllo.btnOpenModaleCorso;
  const btnGestioneAnagrafica = centroDiControllo.btnGestioneAnagrafica;
  const btnGestioneClassi = centroDiControllo.btnGestioneClassi;

  if (role === 'insegnante') {
    // Rimuoviamo i pulsanti riservati agli admin per motivi di sicurezza/pulizia
    if (btnNuovoCorso) btnNuovoCorso.remove();
    if (btnGestioneAnagrafica) btnGestioneAnagrafica.remove();
  }
}

/**
 * Chiude una modale generica resettandone il form interno.
 * @param {HTMLElement|string} modalElementOrId - Elemento DOM o ID della modale.
 */
function chiudiModaleGenerica(modalElementOrId) {
  const modal = typeof modalElementOrId === "string" 
    ? document.getElementById(modalElementOrId) 
    : modalElementOrId;

  if (!modal) return;
  modal.style.display = "none";

  const form = modal.querySelector("form");
  if (form) form.reset();
}
