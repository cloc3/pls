/**
 * Formatta una stringa ISO o un oggetto Date in "GG/MM/AAAA HH:mm"
 */
function formattaDataOra(dataInput) {
  if (!dataInput) return "Non pianificata";

  const d = new Date(dataInput);
  if (isNaN(d.getTime())) return "Data non valida";

  return d.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

/**
 * Genera la riga HTML per una classe associata al corso
 */
function creaRigaClasseCorso(item, idCorso) {
  const tr = document.createElement("tr");
  tr.className = "row-border";

  const scuola = item.scuola || "N.D.";
  const classe = `${item.nome_classe}`;
  const docente = (item.cognome_insegnante && item.nome_insegnante)
    ? `${item.cognome_insegnante} ${item.nome_insegnante}`
    : "Non specificato";
  const email = item.email_insegnante || "N.D.";

  // Controlliamo se l'utente loggato è un insegnante
  const userRole = window.userRole || localStorage.getItem("pls_user_role");
  
  let azioneHtml = "";
  if (userRole !== 'insegnante') {
    azioneHtml = `
      <button class="btn-elimina-classe btn-lezione-delete" data-id-corso="${idCorso}" data-id-classe="${item.id_classe}">
        🗑️ Elimina
      </button>
    `;
  } else {
    azioneHtml = `<span style="color: #7f8c8d; font-size: 0.85em;">—</span>`;
  }

  tr.innerHTML = `
    <td>${scuola}</td>
    <td><strong>${classe}</strong></td>
    <td>${docente}</td>
    <td>${email}</td>
    <td style="text-align: right;">${azioneHtml}</td>
  `;

  const btnElimina = tr.querySelector(".btn-elimina-classe");
  if (btnElimina) {
    btnElimina.addEventListener("click", () => {
      rimuoviClasseCorso(idCorso, item.id_classe);
    });
  }

  return tr;
}

// --- 1. HEADER & RELATORI DINAMICI ---
function creaSezioneHeader(corso) {
  const card = creaCard();
  card.setAttribute("id", "card");

  const topHeader = document.createElement("div");
  topHeader.setAttribute("id", "topHeader");

  const boxTitles = document.createElement("div");

  const titolo = document.createElement("h2");
  titolo.style.cssText = "margin: 0 0 5px 0; color: #2c3e50;";
  titolo.textContent = corso.titolo;

  const anno = document.createElement("p");
  anno.style.cssText = "margin: 0 0 15px 0; color: #7f8c8d; font-weight: 600;";
  anno.textContent = `Anno Scolastico: ${corso.anno_scolastico}`;

  boxTitles.appendChild(titolo);
  boxTitles.appendChild(anno);
  topHeader.appendChild(boxTitles);

  const flexRelatori = document.createElement("div");
  flexRelatori.style.cssText = "display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; border-top: 1px solid #eee; padding-top: 15px; margin-top: 10px;";

  const relatori = corso.relatori || [];

  const boxPrimo = document.createElement("div");
  boxPrimo.style.cssText = "flex: 1;";

  const lblPrimo = document.createElement("strong");
  lblPrimo.style.color = "#0d47a1";
  lblPrimo.textContent = "🥇 Primo Relatore:";

  const valPrimo = document.createElement("span");
  valPrimo.style.cssText = "display: block; font-size: 1.05em; font-weight: bold; color: #333; margin-top: 2px;";
  valPrimo.textContent = relatori.length > 0 
    ? `${relatori[0].cognome} ${relatori[0].nome}${relatori[0].ente_affiliazione ? ' (' + relatori[0].ente_affiliazione + ')' : ''}`
    : "Nessun relatore inserito";

  boxPrimo.appendChild(lblPrimo);
  boxPrimo.appendChild(valPrimo);

  const boxAltri = document.createElement("div");
  boxAltri.style.cssText = "flex: 1;";

  const lblAltri = document.createElement("strong");
  lblAltri.style.color = "#555";
  lblAltri.textContent = "👥 Altri Relatori:";

  const valAltri = document.createElement("span");
  valAltri.style.cssText = "display: block; color: #666; margin-top: 2px;";
  valAltri.textContent = relatori.length > 1
    ? relatori.slice(1).map(r => `${r.cognome} ${r.nome}${r.ente_affiliazione ? ' (' + r.ente_affiliazione + ')' : ''}`).join(", ")
    : "Nessun altro relatore";

  boxAltri.appendChild(lblAltri);
  boxAltri.appendChild(valAltri);

  flexRelatori.appendChild(boxPrimo);
  flexRelatori.appendChild(boxAltri);

  // Nascondi il pulsante "Gestisci Relatori" se l'utente non è admin (es. verifichiamo la visibilità in base al ruolo o salvando lo stato)
  const userRole = window.userRole || localStorage.getItem("pls_user_role");
  if (userRole !== 'insegnante') {
    const btnGestisciRelatori = document.createElement("button");
    btnGestisciRelatori.type = "button";
    btnGestisciRelatori.className = "btn-secondary";
    btnGestisciRelatori.style.cssText = "padding: 6px 12px; cursor: pointer; font-size: 0.85em; white-space: nowrap; align-self: flex-start;";
    btnGestisciRelatori.textContent = "⚙️ Gestisci Relatori";
    btnGestisciRelatori.addEventListener("click", () => apriModaleGestioneRelatori(corso));
    flexRelatori.appendChild(btnGestisciRelatori);
  }

  card.appendChild(topHeader);
  card.appendChild(flexRelatori);

  return card;
}

// --- 2. CLASSI E INSEGNANTI ---
function creaSezioneClassi(idCorso) {
  const card = creaCard();

  const topBar = document.createElement("div");
  topBar.className = "workspace-table-container";

  const titolo = document.createElement("h3");
  titolo.className = "workspace-table-title";
  titolo.textContent = "🏫 Classi e Insegnanti Affiliati";

  topBar.appendChild(titolo);

  const userRole = window.userRole || localStorage.getItem("pls_user_role");
  // Mostra il pulsante "+ Aggiungi Classe/Insegnante" solo se NON è un insegnante
  if (userRole !== 'insegnante') {
    const btnAggiungi = document.createElement("button");
    btnAggiungi.type = "button";
    btnAggiungi.className = "btn-secondary";
    btnAggiungi.innerHTML = "+ Aggiungi <br>Classe/Insegnante";
    btnAggiungi.addEventListener("click", () => apriModaleAggiungiClasse(idCorso));
    topBar.appendChild(btnAggiungi);
  }

  const table = document.createElement("table");
  table.className = "table-custom";

  const thead = document.createElement("thead");
  const trHead = document.createElement("tr");

  ["Scuola / Istituto", "Classe", "Insegnante Referente", "Contatto / Email"].forEach(testo => {
    const th = document.createElement("th");
    th.textContent = testo;
    trHead.appendChild(th);
  });
  thead.appendChild(trHead);

  const tbody = document.createElement("tbody");
  tbody.id = "tb-classi-corso";
  centroDiControllo.tbodyClassiCorso = tbody;

  tbody.innerHTML = `<tr><td colspan="4" class="table-empty-td"><em>Caricamento classi in corso...</em></td></tr>`;

  table.appendChild(thead);
  table.appendChild(tbody);

  card.appendChild(topBar);
  card.appendChild(table);

  caricaClassiCorso(idCorso);

  return card;
}

// --- 3. PROGRAMMA LEZIONI & LOGISTICA ---
function creaSezioneLezioni(corso) {
  const card = creaCard();

  const topBar = document.createElement("div");
  topBar.className = "workspace-table-container";

  const titolo = document.createElement("h3");
  titolo.className = "workspace-table-title";
  titolo.textContent = "📅 Programma Lezioni & Logistica Aule";

  const btnNuova = document.createElement("button");
  btnNuova.type = "button";
  btnNuova.className = "btn-primary";
  btnNuova.textContent = "+ Programma Lezione";
  btnNuova.addEventListener("click", () => apriModaleLezione(corso.id_corso));

  topBar.appendChild(titolo);
  topBar.appendChild(btnNuova);

  const containerLezioni = document.createElement("div");
  containerLezioni.id = "lista-lezioni-container";
  containerLezioni.className = "lista-lezioni-grid";

  const lezioni = corso.lezioni || [];

  if (lezioni.length === 0) {
    const pEmpty = document.createElement("p");
    pEmpty.className = "table-empty-td";
    pEmpty.style.textAlign = "left";
    pEmpty.textContent = "Nessuna lezione ancora programmata per questo corso.";
    containerLezioni.appendChild(pEmpty);
  } else {
    const lezioniOrdinate = [...lezioni].sort((a, b) => {
      if (!a.data_ora) return 1;
      if (!b.data_ora) return -1;
      return new Date(a.data_ora) - new Date(b.data_ora);
    });

    lezioniOrdinate.forEach((lez, index) => {
      const cardLezione = document.createElement("div");
      cardLezione.className = "card-lezione";

      const mainGrid = document.createElement("div");
      mainGrid.className = "lezione-main-grid";

      const colInfo = document.createElement("div");
      colInfo.className = "col-lezione-info";

      const numProgressivo = index + 1;
      const titoloLezione = document.createElement("h4");
      titoloLezione.textContent = `Lezione #${numProgressivo}${lez.argomento ? ': ' + lez.argomento : ''}`;

      const boxDataOra = document.createElement("div");
      boxDataOra.className = "box-data-ora";

      const lblData = document.createElement("span");
      lblData.className = "lbl";
      lblData.textContent = "🕒 Data & Ora:";

      const valData = document.createElement("span");
      valData.className = "val";
      valData.textContent = lez.data_ora ? formattaDataOra(lez.data_ora) : "Non pianificata";

      boxDataOra.appendChild(lblData);
      boxDataOra.appendChild(valData);

      colInfo.appendChild(titoloLezione);
      colInfo.appendChild(boxDataOra);

      const colLogistica = document.createElement("div");
      colLogistica.className = "col-lezione-logistica";

      let sedeStr = lez.is_sede_esterna ? (lez.descrizione_sede_esterna || "Sede Esterna") : "Liceo Marinelli";
      let aulaStr = lez.nome_aula || "Non assegnata";
      let capienzaStr = (lez.capienza !== null && lez.capienza !== undefined) ? `${lez.capienza} posti` : "N.D.";

      const statoRaw = lez.stato_prenotazione_aula || "in_attesa";
      let statoLabel = "In attesa";
      let classeStato = "badge-stato in_attesa";

      if (statoRaw === "confermata") {
        statoLabel = "Confermata";
        classeStato = "badge-stato confermata";
      } else if (statoRaw === "in_attesa") {
        statoLabel = "In attesa di conferma";
        classeStato = "badge-stato in_attesa";
      }

      colLogistica.innerHTML = `
        <div>📍 <strong>Sede:</strong> ${sedeStr}</div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span>🚪 <strong>Aula:</strong> ${aulaStr} (${capienzaStr})</span>
          <span class="${classeStato}">${statoLabel}</span>
        </div>
        <div>🎟️ <strong>Ospiti Esterni:</strong> ${lez.numero_ospiti_esterni ?? 0}</div>
      `;

      const colAzioni = document.createElement("div");
      colAzioni.className = "col-lezione-azioni";

      const btnModifica = document.createElement("button");
      btnModifica.type = "button";
      btnModifica.className = "btn-lezione-edit";
      btnModifica.textContent = "✏️ Modifica";
      btnModifica.addEventListener("click", () => apriModaleLezione(corso.id_corso, lez));

      const btnElimina = document.createElement("button");
      btnElimina.type = "button";
      btnElimina.className = "btn-lezione-delete";
      btnElimina.textContent = "🗑️ Elimina";
      btnElimina.addEventListener("click", () => eliminaLezione(lez.id_lezione, corso.id_corso));

      colAzioni.appendChild(btnModifica);
      colAzioni.appendChild(btnElimina);

      mainGrid.appendChild(colInfo);
      mainGrid.appendChild(colLogistica);
      mainGrid.appendChild(colAzioni);

      cardLezione.appendChild(mainGrid);
      containerLezioni.appendChild(cardLezione);
    });
  }

  card.appendChild(topBar);
  card.appendChild(containerLezioni);

  return card;
}

// --- 4. NOTE DEL CORSO ---
function creaSezioneNote() {
  const card = creaCard();

  const titolo = document.createElement("h3");
  titolo.className = "workspace-table-title";
  titolo.style.marginBottom = "15px";
  titolo.textContent = "📝 Note del Corso";

  const containerTextarea = document.createElement("div");
  containerTextarea.style.marginBottom = "15px";

  const textarea = document.createElement("textarea");
  textarea.id = "course-notes";
  textarea.className = "corso-note-textarea";
  textarea.rows = 5;
  textarea.style.cssText = "width: 100%; box-sizing: border-box; padding: 10px; border: 1px solid #ccc; border-radius: 6px; resize: vertical;";
  textarea.placeholder = "Scrivi qui le tue note per questo corso...";

  containerTextarea.appendChild(textarea);

  const containerBottoni = document.createElement("div");
  containerBottoni.style.cssText = "display: flex; justify-content: flex-end;";

  const btnSalva = document.createElement("button");
  btnSalva.type = "button";
  btnSalva.id = "save-notes-btn";
  btnSalva.className = "btn-primary";
  btnSalva.textContent = "💾 Salva Note";

  containerBottoni.appendChild(btnSalva);

  card.appendChild(titolo);
  card.appendChild(containerTextarea);
  card.appendChild(containerBottoni);

  return card;
}

function creaCard() {
  const card = document.createElement("div");
  card.className = "card-sezione";
  card.style.cssText = "background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); margin-bottom: 20px;";
  return card;
}
