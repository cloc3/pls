CREATE DATABASE IF NOT EXISTS pls_marinelli_2026
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE pls_marinelli_2026;

-- 1. Amministratori di Sistema
CREATE TABLE IF NOT EXISTS amministratori (
    id_amministratore INT AUTO_INCREMENT PRIMARY KEY,
    nickname VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NULL,
    email VARCHAR(100) NULL UNIQUE
);

-- 2. Relatori
CREATE TABLE IF NOT EXISTS relatori (
    id_relatore INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(50) NOT NULL,
    cognome VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE,
    ente_affiliazione VARCHAR(100)
);

-- 3. Corsi PLS
CREATE TABLE IF NOT EXISTS corsi (
    id_corso INT AUTO_INCREMENT PRIMARY KEY,
    titolo VARCHAR(150) NOT NULL,
    anno_scolastico VARCHAR(9) DEFAULT '2026/2027',
    note TEXT NULL
);

-- 4. Giunzione Corsi - Relatori (Molti-a-Molti)
CREATE TABLE IF NOT EXISTS corsi_relatori (
    id_corso INT NOT NULL,
    id_relatore INT NOT NULL,
    PRIMARY KEY (id_corso, id_relatore),
    FOREIGN KEY (id_corso) REFERENCES corsi(id_corso) 
        ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (id_relatore) REFERENCES relatori(id_relatore) 
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- 5. Insegnanti Referenti
CREATE TABLE IF NOT EXISTS insegnanti (
    id_insegnante INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(50) NOT NULL,
    cognome VARCHAR(50) NOT NULL,
    scuola VARCHAR(100) NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NULL,
    activation_token VARCHAR(64) NULL,
    activation_expires DATETIME NULL,
    registro_finale_pdf LONGBLOB NULL,
    data_caricamento_registro DATETIME NULL
);

-- 6. Classi del Liceo (PROTETTA: conserva i dati inseriti)
CREATE TABLE IF NOT EXISTS classi (
    id_classe INT AUTO_INCREMENT PRIMARY KEY,
    nome_classe VARCHAR(8) NOT NULL,
    UNIQUE (nome_classe)
);

-- 7. Studenti (PROTETTA: conserva i dati inseriti)
CREATE TABLE IF NOT EXISTS studenti (
    id_studente INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(50) NOT NULL,
    cognome VARCHAR(50) NOT NULL,
    id_classe INT NOT NULL,
    FOREIGN KEY (id_classe) REFERENCES classi(id_classe) 
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- 8. Aule dell'Istituto
CREATE TABLE IF NOT EXISTS aule (
    id_aula INT AUTO_INCREMENT PRIMARY KEY,
    nome_aula VARCHAR(50) NOT NULL UNIQUE,
    capienza INT NULL CHECK (capienza IS NULL OR capienza > 0),
);

-- 9. Giunzione Corsi - Classi - Insegnante Referente
CREATE TABLE IF NOT EXISTS corsi_classi_insegnanti (
    id_corso INT NOT NULL,
    id_classe INT NOT NULL,
    id_insegnante INT NOT NULL,
    PRIMARY KEY (id_corso, id_classe),
    FOREIGN KEY (id_corso) REFERENCES corsi(id_corso) 
        ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (id_classe) REFERENCES classi(id_classe) 
        ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (id_insegnante) REFERENCES insegnanti(id_insegnante) 
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- 10. Lezioni (Aggiornata e unificata per corso)
CREATE TABLE lezioni (
    id_lezione INT AUTO_INCREMENT PRIMARY KEY,
    id_corso INT NOT NULL,
    data_ora DATETIME NULL,
    durata_ore TINYINT UNSIGNED NOT NULL DEFAULT 2,
    
    -- Luogo / Aula
    is_sede_esterna BOOLEAN NOT NULL DEFAULT FALSE,
    descrizione_sede_esterna VARCHAR(150) NULL,
    id_aula INT NULL,
    stato_prenotazione_aula ENUM('in_attesa', 'confermata', 'rifiutata') DEFAULT 'in_attesa',
    numero_ospiti_esterni INT NOT NULL DEFAULT 0 CHECK (numero_ospiti_esterni >= 0),
    
    FOREIGN KEY (id_corso) REFERENCES corsi(id_corso) 
        ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (id_aula) REFERENCES aule(id_aula) 
        ON DELETE SET NULL ON UPDATE CASCADE
);

-- 11. Registro Presenze Studenti per Lezione
CREATE TABLE presenze (
    id_lezione INT NOT NULL,
    id_studente INT NOT NULL,
    presente BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (id_lezione, id_studente),
    FOREIGN KEY (id_lezione) REFERENCES lezioni(id_lezione) 
        ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (id_studente) REFERENCES studenti(id_studente) 
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- 12. Registro Presenze / Sostituzioni Docenti per Lezione
CREATE TABLE presenze_docenti_lezioni (
    id_lezione INT NOT NULL,
    id_insegnante INT NOT NULL,
    id_classe INT NOT NULL,
    id_insegnante_sostituto INT NULL,
    note_sostituzione VARCHAR(255) NULL,
    attivita VARCHAR(255) DEFAULT 'compresenza',
    ore_curricolari DECIMAL(3,1) NULL CHECK (ore_curricolari IS NULL OR ore_curricolari >= 0),
    ore_non_curricolari DECIMAL(3,1) NULL CHECK (ore_non_curricolari IS NULL OR ore_non_curricolari >= 0),
    
    PRIMARY KEY (id_lezione, id_classe),
    FOREIGN KEY (id_lezione) REFERENCES lezioni(id_lezione) 
        ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (id_insegnante) REFERENCES insegnanti(id_insegnante) 
        ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (id_insegnante_sostituto) REFERENCES insegnanti(id_insegnante) 
        ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (id_classe) REFERENCES classi(id_classe) 
        ON DELETE CASCADE ON UPDATE CASCADE
);
