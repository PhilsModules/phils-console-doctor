# Phil's Console Doctor 🏥

![Foundry v13 Compatible](https://img.shields.io/badge/Foundry-v13-brightgreen)
![Foundry v12 Compatible](https://img.shields.io/badge/Foundry-v12-green)
![License](https://img.shields.io/badge/License-GPLv3-blue)
![Version](https://img.shields.io/badge/Version-1.1.0-orange)
[![Patreon](https://img.shields.io/badge/Support-Patreon-ff424d?logo=patreon)](https://www.patreon.com/PhilsModules)

**Phil's Console Doctor** is your personal diagnostic assistant for Foundry VTT. It captures console errors and warnings in real-time and lets you analyze them with AI with a single click.

Stop guessing why your game is lagging or breaking. Ask the Doctor.

## 🚀 Key Features

*   **Real-Time Monitoring:** Captures `console.warn` and `console.error` logs instantly.
*   **Startup Protection (Fast Start):** Activates immediately when the script loads to catch bugs that happen *before* Foundry is fully initialized.
*   **Aggressive Diagnosis:**
    *   Catches **unhandled exceptions** and **promise rejections** that usually crash silently.
    *   Detects **Resource Loading Errors** (broken images, scripts, 404s).
*   **Multi-AI Support:** Choose your preferred AI assistant in the settings:
    *   **Google Gemini** (Default)
    *   ChatGPT
    *   Claude
    *   Microsoft Copilot
    *   Perplexity
*   **Smart Grouping:** Deduplicates identical errors to keep your log clean (e.g., `x5` badge).
*   **Module Blame:** Automatically identifies and badges the module responsible for an error (e.g., `[Midi QOL]`).
*   **Smart Prompts:** Automatically generates a detailed prompt with the error message, stack trace, and your active module list.
*   **Clean UI:** A beautiful, native "Parchment" interface that fits perfectly into Foundry VTT.
*   **Fully Localized:** Interface and AI prompts available in **English** and **German**.

## ⚡ Performance & Safety

*   **Client-Side Only:** The module runs 100% locally in your browser. It does not affect the server or other players.
*   **Passive Listener:** It only "listens" to the console. It does not actively query or block anything.
*   **Memory Safe:** Only the last 50 logs are kept. Old logs are automatically deleted to keep memory usage tiny.
*   **Zero Overhead:** The UI consumes no resources when closed.

## 📦 Installation

1.  Open Foundry VTT -> **Add-on Modules**.
2.  Click **Install Module**.
3.  Paste Manifest URL:
    ```
    https://github.com/PhilsModules/phils-console-doctor/releases/latest/download/module.json
    ```
4.  Click **Install**.

## 📖 How to Use

1.  **Open the Doctor:**
    *   Click the **Console Doctor** button at the bottom of the **Game Settings** sidebar.
    *   Or press `Ctrl + Alt + K`.
2.  **View Errors:** The window shows a live list of warnings (yellow) and errors (red).
3.  **Analyze:** Click the **Ask AI** button on any entry.
4.  **Paste & Solve:** The module copies a detailed prompt. Paste it into the AI window that opens to get an immediate fix or explanation.

---

# 🇩🇪 Deutsche Anleitung

**Phil's Console Doctor** ist dein persönlicher Diagnose-Assistent für Foundry VTT. Er fängt Konsolen-Fehler und Warnungen in Echtzeit ab und lässt dich diese mit einem Klick per KI analysieren.

Hör auf zu raten, warum dein Spiel laggt oder kaputt ist. Frag den Doktor.

## 🚀 Funktionen

*   **Echtzeit-Überwachung:** Fängt `console.warn` und `console.error` sofort ab.
*   **Startup-Schutz (Fast Start):** Startet sofort beim Laden des Skripts, um Fehler zu fangen, die *vor* dem vollständigen Start von Foundry passieren.
*   **Aggressive Diagnose:**
    *   Erkennt **unbehandelte Fehler** und **Abstürze**, die sonst lautlos passieren.
    *   Erkennt **Ladefehler** (kaputte Bilder, Skripte, 404s).
*   **Multi-KI Support:** Wähle deinen bevorzugten KI-Assistenten in den Einstellungen:
    *   **Google Gemini** (Standard)
    *   ChatGPT
    *   Claude
    *   Microsoft Copilot
    *   Perplexity
*   **Smart Grouping:** Fasst identische Fehler zusammen, um den Log sauber zu halten (z.B. `x5` Badge).
*   **Module Blame:** Erkennt automatisch, welches Modul einen Fehler verursacht hat und markiert es (z.B. `[Midi QOL]`).
*   **Smarte Prompts:** Erstellt automatisch einen detaillierten Prompt mit Fehlermeldung, Stack Trace und deiner Modul-Liste.
*   **Sauberes Design:** Ein schönes, natives "Pergament"-Interface, das perfekt zu Foundry passt.
*   **Vollständig Lokalisiert:** Interface und KI-Prompts komplett auf **Deutsch** und **Englisch**.

## ⚡ Performance & Sicherheit

*   **Nur Client-Seitig:** Das Modul läuft zu 100% lokal in deinem Browser. Es beeinträchtigt weder den Server noch andere Spieler.
*   **Passiver Zuhörer:** Es "hört" nur auf die Konsole. Es blockiert nichts und fragt nichts aktiv ab.
*   **Speicher-Sicher:** Es werden nur die letzten 50 Logs gespeichert. Alte Logs werden automatisch gelöscht, um den Speicherverbrauch winzig zu halten.
*   **Null Last:** Das Fenster verbraucht keine Ressourcen, wenn es geschlossen ist.

## 📖 Kurzanleitung

1.  **Doktor rufen:**
    *   Klicke auf den **Console Doctor** Button ganz unten in den **Spieleinstellungen**.
    *   Oder drücke `Strg + Alt + K`.
2.  **Fehler sehen:** Das Fenster zeigt dir live alle Warnungen (gelb) und Fehler (rot).
3.  **Analysieren:** Klicke auf **KI Fragen** bei einem Eintrag.
4.  **Lösen:** Das Modul kopiert einen perfekten Prompt. Füge ihn einfach in das sich öffnende KI-Fenster ein, um sofort eine Lösung zu erhalten.

---

## 👨‍💻 Author
* **Phil** (GitHub: [PhilsModules](https://github.com/PhilsModules))

## 📄 License
This module is licensed under the [GPL-3.0 License](LICENSE).

---
<div align="center">
    <h2>❤️ Support the Development</h2>
    <p>If you enjoy this module and want to support open-source development for Foundry VTT, check out my Patreon!</p>
    <p>Gefällt dir das Modul? Unterstütze die Weiterentwicklung auf Patreon!</p>
    <a href="https://www.patreon.com/PhilsModules">
        <img src="https://c5.patreon.com/external/logo/become_a_patron_button.png" alt="Become a Patron" />
    </a>
    <p>Made with ❤️ for the Foundry VTT Community</p>
</div>
