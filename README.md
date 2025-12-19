<div align="center">

# Phil's Console Doctor 🏥

![Foundry v13 Compatible](https://img.shields.io/badge/Foundry-v13-brightgreen)
![Foundry v12 Compatible](https://img.shields.io/badge/Foundry-v12-green)
![License](https://img.shields.io/badge/License-GPLv3-blue)
[![Version](https://img.shields.io/badge/Version-1.4.0-orange)](https://github.com/PhilsModules/phils-console-doctor/releases)
[![Patreon](https://img.shields.io/badge/SUPPORT-Patreon-ff424d?logo=patreon)](https://www.patreon.com/PhilsModules)

<br>

**Dein persönlicher Diagnose-Assistent – Analysiere Fehler mit einem Klick.**
<br>
*Your personal diagnostic assistant – Analyze errors with a single click.*

<br>

<a href="#-deutsche-anleitung"><img src="https://img.shields.io/badge/%20-Deutsche_Anleitung-black?style=for-the-badge&logo=germany&logoColor=red" alt="Deutsche Anleitung"></a> <a href="#-english-instructions"><img src="https://img.shields.io/badge/%20-English_Instructions-black?style=for-the-badge&logo=united-kingdom&logoColor=white" alt="English Instructions"></a>
</div>

> [!WARNING]
> ### 🧪 Testing / Testen
> **English:** It is difficult to fully test this module without errors in the world. If you encounter issues or if errors/conflicts are not displayed despite existing, please provide feedback!
>
> **Deutsch:** Es ist schwer, dieses Modul ohne Fehler in der Welt vollständig zu testen. Falls Probleme auftreten oder Fehler/Konflikte trotz Existenz nicht angezeigt werden, bin ich auf dein Feedback angewiesen!

<br>

# <img src="https://flagcdn.com/48x36/de.png" width="28" height="21" alt="DE"> Deutsche Anleitung

**Schluss mit Raten, warum das Spiel ruckelt.**

Phil's Console Doctor überwacht deine Konsole in Echtzeit auf Fehler und Warnungen und lässt dich diese mit einem Klick per KI analysieren. Er fängt Bugs ab, erkennt Konflikte und hilft dir, deine Welt zu reparieren.

## 🚀 Funktionen

* ⚡ **Echtzeit-Monitoring:** Fängt `console.warn` und `console.error` Logs sofort ab.
* 🛡️ **Startup-Schutz:** Startet sofort beim Laden des Skripts, um Fehler zu fangen, die *vor* dem vollständigen Start von Foundry passieren.
* 🤖 **Multi-KI Support:** Wähle deinen Assistenten (Gemini, ChatGPT, Claude, Copilot, Perplexity).
* 🏷️ **Module Blame:** Erkennt automatisch, welches Modul einen Fehler verursacht hat und markiert es (z.B. `[Midi QOL]`).
* 🧹 **Smart Grouping:** Fasst identische Fehler zusammen (z.B. `x5` Badge), damit dein Log sauber bleibt.
* 📝 **Smarte Prompts:** Erstellt automatisch einen detaillierten Prompt mit Fehlermeldung, Stack Trace und deiner Modul-Liste.

## 🛡️ Smart Conflict Detector
* **Explizite Inkompatibilitäten:** Erkennt, wenn Module sich selbst als inkompatibel melden.
* **Stille Fehler:** Findet Aktionen, die heimlich von einem Modul blockiert wurden.
* **Hook Inspector:** Visualisiert, welche Module um die gleiche Logik kämpfen (z.B. Bewegung, Licht).

## ⚡ Performance Monitor
* **Lag-Killer:** Identifiziert sofort, welches Modul dein Spiel verlangsamt.
* **System Monitor (NEU):** Zeigt jetzt FPS, Netzwerk-Latenz (Ping) und Render-Zeiten an, um "Idle"-Prozesse zu überwachen.
* **Detaillierte Analyse:** Zeigt exakt an, wie viele Millisekunden jedes Modul für Hooks, Rendering oder Canvas-Updates benötigt.
* **Hintergrund-Check:** Überwacht auch unsichtbare Prozesse, die im Hintergrund laufen.

## 📦 Installation

1.  Öffne Foundry VTT.
2.  Gehe zum Reiter **Add-on Modules**.
3.  Klicke auf **Install Module**.
4.  Füge die folgende **Manifest URL** unten ein:
    ```text
    https://github.com/PhilsModules/phils-console-doctor/releases/latest/download/module.json
    ```
5.  Klicke auf **Install**.

## 📖 Bedienung

1.  **Doktor rufen:** Klicke auf den **Console Doctor** Button (unten in den Spieleinstellungen) oder drücke `Strg + Alt + K`.
2.  **Fehler sehen:** Das Fenster zeigt dir live alle Warnungen (gelb) und Fehler (rot).
3.  **Analysieren:** Klicke auf **KI Fragen** bei einem Eintrag.
4.  **Lösen:** Das Modul kopiert einen perfekten Prompt. Füge ihn einfach in das sich öffnende KI-Fenster ein, um sofort eine Lösung zu erhalten.

---

# <img src="https://flagcdn.com/48x36/gb.png" width="28" height="21" alt="EN"> English Instructions

**Stop guessing why your game is lagging or breaking.**

Phil's Console Doctor is your personal diagnostic assistant for Foundry VTT. It captures console errors and warnings in real-time and lets you analyze them with AI with a single click.

## 🚀 Key Features

* **Real-Time Monitoring:** Captures `console.warn` and `console.error` logs instantly.
* **Startup Protection:** Activates immediately when the script loads to catch bugs that happen *before* Foundry is fully initialized.
* **Multi-AI Support:** Choose your preferred AI assistant (Gemini, ChatGPT, Claude, Copilot, Perplexity).
* **Module Blame:** Automatically identifies and badges the module responsible for an error (e.g., `[Midi QOL]`).
* **Smart Grouping:** Deduplicates identical errors to keep your log clean.
* **Smart Prompts:** Automatically generates a detailed prompt with the error message, stack trace, and your active module list.

## 🛡️ Smart Conflict Detector
* **Explicit Incompatibility:** Detects when modules declare themselves incompatible.
* **Silent Failures:** Identifies actions that were silently blocked by a module without throwing an error.
* **Hook Inspector:** Visualizes which modules are fighting over the same game logic (e.g., Movement, Lighting).

## ⚡ Performance Monitor
* **Lag Killer:** Instantly identifies which module is slowing down your game.
* **Detailed Analysis:** Shows exactly how many milliseconds each module takes for hooks, rendering, or canvas updates.
* **Background Check:** Monitors invisible processes running in the background.

## 📦 Installation

1.  Open Foundry VTT.
2.  Go to the **Add-on Modules** tab.
3.  Click **Install Module**.
4.  Paste the following **Manifest URL** into the field:
    ```text
    https://github.com/PhilsModules/phils-console-doctor/releases/latest/download/module.json
    ```
5.  Click **Install**.

## 📖 How to Use

1.  **Call the Doctor:** Click the **Console Doctor** button (bottom of Game Settings) or press `Ctrl + Alt + K`.
2.  **View Errors:** The window shows warnings (yellow) and errors (red) in real-time.
3.  **Analyze:** Click **Ask AI** on any entry.
4.  **Solve:** The module copies a perfect prompt. Simply paste it into the AI window to get an immediate solution.

<div align="center">
    <h2>❤️ Support the Development</h2>
    <p>If you enjoy this module and want to support open-source development for Foundry VTT, check out my Patreon!</p>
    <p>Gefällt dir das Modul? Unterstütze die Weiterentwicklung auf Patreon!</p>
    <a href="https://www.patreon.com/PhilsModules">
        <img src="https://c5.patreon.com/external/logo/become_a_patron_button.png" alt="Become a Patron" width="200" />
    </a>
    <br><br>
    <p><i>Made with ❤️ for the Foundry VTT Community</i></p>

</div>
