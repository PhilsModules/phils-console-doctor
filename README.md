# Phil's Console Doctor 🏥

![Foundry v13 Compatible](https://img.shields.io/badge/Foundry-v13-brightgreen)
![Foundry v12 Compatible](https://img.shields.io/badge/Foundry-v12-green)
![License](https://img.shields.io/badge/License-GPLv3-blue)
![Version](https://img.shields.io/badge/Version-1.2.4-orange)

<a href="Updates.md"><img src="https://img.shields.io/badge/CHECK-Changelog-blue" style="height: 25px;"></a>
<a href="https://www.patreon.com/PhilsModules"><img src="https://img.shields.io/badge/SUPPORT-Patreon-ff424d?logo=patreon" style="height: 25px;"></a>

> [!WARNING]
> **Testing / Testen**
> It is very difficult to fully test this module if you don't have any errors in your world. If you encounter issues, or if errors/conflicts are not being displayed despite existing, please let me know! Detecting every possible weird module interaction is hard, so I appreciate your feedback if something is missing or broken.
>
> Es ist sehr schwer, dieses Modul vollständig zu testen, wenn man keine Fehler in seiner Welt hat. Falls ihr Probleme habt oder Fehler/Konflikte nicht angezeigt werden, obwohl sie da sein sollten, schreibt mich bitte an! Jedes seltsame Modul-Verhalten abzufangen ist schwierig, daher bin ich auf euer Feedback angewiesen, falls etwas fehlt oder kaputt ist.

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

## 🛡️ Smart Conflict Detector (New in v1.2)
*   **Explicit Incompatibility:** Detects when modules declare themselves incompatible in the console (e.g., "Module X uses a library incompatible with Module Y").
*   **Silent Failures:** Identifies actions that were silently blocked by a module (returning `false` in a `pre` hook) without throwing an error.
*   **Hook Inspector:** Visualizes which modules are fighting over the same game logic (e.g., Movement, Lighting, UI) and warns you about potential conflicts.

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

## 🛡️ Smart Conflict Detector (Neu in v1.2)
*   **Explizite Inkompatibilitäten:** Erkennt, wenn Module sich selbst als inkompatibel melden (z.B. "Modul X beißt sich mit Y").
*   **Stille Fehler:** Findet Aktionen, die heimlich von einem Modul blockiert wurden, ohne einen Fehler zu werfen.
*   **Hook Inspector:** Visualisiert, welche Module um die gleiche Logik kämpfen (z.B. Bewegung, Licht, UI) und warnt vor Konflikten.

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
