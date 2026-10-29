// main.js
let centroDiControllo;

class CentroDiControllo {
  constructor() {
    this.loginForm = document.getElementById("login-form");
    this.loginContainer = document.getElementById("login-container");
    this.adminPanel = document.getElementById("admin-panel");
    this.logoutBtn = document.getElementById("logout-btn");

    this.togglePasswordBtn = document.getElementById("toggle-password");
    this.passwordInput = document.getElementById("password");
    this.eyeIcon = document.getElementById("eye-icon");

    this.workspaceContent = document.getElementById("workspace-content");

    this.btnOpenModaleCorso = document.getElementById("btn-open-modal-corso");
    this.modalCorso = document.getElementById("modal-corso");
    this.formCreaCorso = document.getElementById("form-crea-corso");

    this.modalGestioneRelatori = document.getElementById("modal-gestione-relatori");
    this.inputGestioneRelatori = document.getElementById("gestione-relatori-id-corso");
    this.formGestioneRelatori = document.getElementById("form-gestione-relatori");
    this.btnSalvaRelatoriCorso = document.getElementById("btn-salva-relatori-corso");

    this.btnGestioneAnagrafica = document.getElementById("btn-gestione-anagrafica");
    this.modalGestioneAnagrafica = document.getElementById("modal-gestione-anagrafica");
    this.formAnagrafica = document.getElementById("form-anagrafica");
    this.searchAnagrafica = document.getElementById("search-anagrafica");

    this.anagraficaId = document.getElementById("anagrafica-id");
    this.anagraficaTipo = document.getElementById("anagrafica-tipo");
    this.anagraficaNome = document.getElementById("anagrafica-nome");
    this.anagraficaCognome = document.getElementById("anagrafica-cognome");
    this.anagraficaDettaglio = document.getElementById("anagrafica-dettaglio");
    this.anagraficaEmail = document.getElementById("anagrafica-email");
    this.btnSalvaAnagrafica = document.getElementById("btn-salva-anagrafica");

    this.modalActivationLink = document.getElementById("modal-activation-link");
    this.activationLinkInput = document.getElementById("input-link-attivazione");
    this.btnCopyActivationLink = document.getElementById("btn-copia-link-modal");
    this.containerListaAnagrafica = document.getElementById("container-lista-anagrafica");

    this.inputSearchAula = document.getElementById("search-aula");
    this.inputNuovaAulaNome = document.getElementById("nuova-aula-nome");
    this.inputNuovaAulaCapienza = document.getElementById("nuova-aula-capienza");
    this.btnAddNuovaAula = document.getElementById("btn-add-nuova-aula");
    this.dropdownAutocompleteAula = document.getElementById("autocomplete-results-aula");
    this.hiddenLezioneIdAula = document.getElementById("lezione-id-aula");

    this.tbodyClassiCorso = document.getElementById("tb-classi-corso");
    this.modalAggiungiClasse = document.getElementById("modal-aggiungi-classe");
    this.formAggiungiClasse = document.getElementById("form-aggiungi-classe");
    this.inputIdCorsoClasse = document.getElementById("aggiungi-classe-id-corso");
    this.inputSearchClasse = document.getElementById("search-classe");
    this.inputIdClasse = document.getElementById("input-id-classe");
    this.inputSearchInsegnante = document.getElementById("search-insegnante");
    this.selectInsegnanteReferente = document.getElementById("select-insegnante-referente");

    this.modalLezione = document.getElementById("modal-lezione");
    this.formLezione = document.getElementById("form-lezione");
    this.inputLezioneIdLezione = document.getElementById("lezione-id-lezione");
    this.inputLezioneIdCorso = document.getElementById("lezione-id-corso");
    this.inputLezioneDurata = document.getElementById("lezione-durata");
    this.inputLezioneDataOra = document.getElementById("lezione-data-ora");
    this.boxAulaInterna = document.getElementById("box-aula-interna");
    this.boxSedeEsterna = document.getElementById("box-sede-esterna");
    this.selectLezioneAula = document.getElementById("lezione-id-aula");
    this.inputLezioneDescrizioneSede = document.getElementById("lezione-descrizione-sede");
    this.selectLezioneStatoPrenotazione = document.getElementById("lezione-stato-prenotazione");
    this.inputLezioneOspiti = document.getElementById("lezione-ospiti");

    this.btnGestioneClassi = document.getElementById("btn-gestione-classi");
    this.modalGestioneClassi = document.getElementById("modal-gestione-classi");
    this.formNuovaClasse = document.getElementById("form-nuova-classe");
    this.inputNomeClasse = document.getElementById("nome-classe");
    this.grigliaClassi = document.getElementById("griglia-classi");

    // Modale Elenco Studenti
    this.modalElencoStudenti = document.getElementById("modal-elenco-studenti");
    this.containerListaStudentiAnagrafica = document.getElementById("container-lista-studenti-anagrafica");
    this.elencoStudentiClasseNome = document.getElementById("elenco-studenti-classe-nome");

    // Modale Appello
    this.modalGestioneAppello = document.getElementById("modal-gestione-appello");
    this.containerListaStudentiAppello = document.getElementById("container-lista-studenti-appello");
    this.formAggiungiStudenteInline = document.getElementById("form-aggiungi-studente-inline");
    this.nuovoStudenteCognome = document.getElementById("nuovo-studente-cognome");
    this.nuovoStudenteNome = document.getElementById("nuovo-studente-nome");
    this.nomeClasseAppello = document.getElementById("nome-classe-appello");
    this.divInsegnanteAppello = document.getElementById("div-insegnante-appello");
    this.appelloHeaderRow = document.getElementById("appello-header-row");
    this.btnSalvaAppello = document.getElementById("btn-salva-appello");
    this.userRole;

    this.currentCorsoId = null;
    this.workspaceContent = document.getElementById("workspace-content");

    this.initEventListeners();
  }

  initEventListeners() {
    if (this.togglePasswordBtn) this.togglePasswordBtn.addEventListener("click", gestisciTogglePassword);
    if (this.loginForm) this.loginForm.addEventListener("submit", gestisciLogin);
    if (this.logoutBtn) this.logoutBtn.addEventListener("click", gestisciLogout);

    if (this.btnOpenModaleCorso) this.btnOpenModaleCorso.addEventListener("click", apriModaleCorso);
    if (this.formCreaCorso) this.formCreaCorso.addEventListener("submit", gestisciCreaCorso);

    if (this.formAggiungiClasse) {
      this.formAggiungiClasse.addEventListener("submit", (e) => {
        e.preventDefault();
        salvaClasseCorso(e);
      });
    }

    if (this.formGestioneRelatori) {
      this.formGestioneRelatori.addEventListener("submit", (e) => {
        e.preventDefault();
        salvataggioRelatoriCorso();
      });
    }

    if (this.btnGestioneAnagrafica) this.btnGestioneAnagrafica.addEventListener("click", apriGestioneAnagrafica);
    if (this.formAnagrafica) this.formAnagrafica.addEventListener("submit", salvaAnagrafica);
    if (this.btnResetAnagrafica) this.btnResetAnagrafica.addEventListener("click", resetFormAnagrafica);

    if (this.anagraficaNome) {
      this.anagraficaNome.addEventListener("input", aggiornaEmailDefaultInsegnante);
    }
    if (this.anagraficaCognome) {
      this.anagraficaCognome.addEventListener("input", aggiornaEmailDefaultInsegnante);
    }

    document.addEventListener("click", (e) => {
      if (e.target.closest(".btn-close-modal")) {
        const modal = e.target.closest(".modal");
        if (modal) chiudiModaleGenerica(modal);
        return;
      }
      if (e.target.classList.contains("modal")) {
        chiudiModaleGenerica(e.target);
      }
    });

    if (this.btnGestioneClassi) {
      this.btnGestioneClassi.addEventListener("click", apriModaleGestioneClassi);
    }
    if (this.formNuovaClasse) {
      this.formNuovaClasse.addEventListener("submit", salvaNuovaClasse);
    }

    if (this.formAggiungiStudenteInline) {
      this.formAggiungiStudenteInline.addEventListener("submit", gestisciAggiungiStudenteInline);
    }

    if (this.btnSalvaAppello) {
      this.btnSalvaAppello.addEventListener("click", salvaPresenzeAppello);
    }

    if (this.formLezione) {
      this.formLezione.addEventListener("submit", (e) => {
        e.preventDefault();
        salvaLezione(e);
      });
    }
    if (this.searchAnagrafica) {
      this.searchAnagrafica.addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase().trim();
        if (!query) {
          renderListaAnagrafica(listaAnagraficaCache);
          return;
        }

        const filtrati = listaAnagraficaCache.filter(item => {
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
      });
    }

    if (this.workspaceContent) {
      this.workspaceContent.addEventListener("click", async (e) => {
        if (e.target && e.target.id === "save-notes-btn") {
          const textarea = this.workspaceContent.querySelector("#course-notes");
          if (!textarea || !this.currentCorsoId) {
            alert("Errore: nessun corso selezionato.");
            return;
          }

          try {
            const res = await fetch('php/salva_note.php', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id_corso: this.currentCorsoId, note: textarea.value })
            });
            const data = await res.json();

            if (data.success) {
              if (typeof mostraToast === "function") {
                mostraToast("Note salvate con successo!");
              } else {
                alert('Note salvate con successo!');
              }
            } else {
              alert(data.message || 'Errore durante il salvataggio.');
            }
          } catch (err) {
            console.error('Errore di rete:', err);
            alert('Errore di connessione con il server.');
          }
        }
      });
    }

    if (this.containerListaAnagrafica) {
      this.containerListaAnagrafica.addEventListener("click", (e) => {
        const btnCopia = e.target.closest(".btn-copia-link-row");
        const btnRinnova = e.target.closest(".btn-rinnova-link-row");
        const btnEdit = e.target.closest(".btn-edit-anagrafica");
        const btnElimina = e.target.closest(".btn-elimina-anagrafica");

        if (btnCopia) {
          const id = btnCopia.dataset.docenteId;
          recuperaEMostraLinkAttivazione(id, e);
        } else if (btnRinnova) {
          const id = btnRinnova.dataset.docenteId;
          confermaERigeneraLinkAttivazione(id);
        } else if (btnEdit) {
          const id = btnEdit.dataset.id;
          preparaEditAnagrafica(id);
        } else if (btnElimina) {
          const id = btnElimina.dataset.id;
          eliminaAnagrafica(id);
        }
      });
    }

    if (this.btnCopyActivationLink) {
      this.btnCopyActivationLink.addEventListener("click", copiaLinkAttivazione);
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  centroDiControllo = new CentroDiControllo();
  verificaSessioneIniziale();
});
