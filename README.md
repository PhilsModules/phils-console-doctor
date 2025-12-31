<div align="center">

# Phil's Console Doctor 🏥

![Foundry v13 Compatible](https://img.shields.io/badge/Foundry-v13-brightgreen)
![Foundry v12 Compatible](https://img.shields.io/badge/Foundry-v12-green)
![License](https://img.shields.io/badge/License-GPLv3-blue)
[![Version](https://img.shields.io/badge/Version-1.5.0-orange)](https://github.com/PhilsModules/phils-console-doctor/releases)
[![Patreon](https://img.shields.io/badge/SUPPORT-Patreon-ff424d?logo=patreon)](https://www.patreon.com/PhilsModules)

<br>

**Dein persönlicher Diagnose-Assistent – Analysiere Fehler mit einem Klick.**
<br>
_Your personal diagnostic assistant – Analyze errors with a single click._

<br>

<a href="#-deutsche-anleitung"><img src="https://img.shields.io/badge/%20-Deutsche_Anleitung-black?style=for-the-badge&logo=germany&logoColor=red" alt="Deutsche Anleitung"></a> <a href="#-english-instructions"><img src="https://img.shields.io/badge/%20-English_Instructions-black?style=for-the-badge&logo=united-kingdom&logoColor=white" alt="English Instructions"></a>

</div>

> [!WARNING]
>
> ### 🧪 Testing / Testen
>
> **English:** It is difficult to fully test this module without errors in the world. If you encounter issues or if errors/conflicts are not displayed despite existing, please provide feedback!
>
> **Deutsch:** Es ist schwer, dieses Modul ohne Fehler in der Welt vollständig zu testen. Falls Probleme auftreten oder Fehler/Konflikte trotz Existenz nicht angezeigt werden, bin ich auf dein Feedback angewiesen!

<br>

# <img src="https://flagcdn.com/48x36/de.png" width="28" height="21" alt="DE"> Deutsche Anleitung

**Schluss mit Raten, warum das Spiel ruckelt.**

Phil's Console Doctor überwacht deine Konsole in Echtzeit auf Fehler und Warnungen und lässt dich diese mit einem Klick per KI analysieren. Er fängt Bugs ab, erkennt Konflikte und hilft dir, deine Welt zu reparieren.

## 🚀 Funktionen

- ⚡ **Echtzeit-Monitoring:** Fängt `console.warn` und `console.error` Logs sofort ab.
- 🛡️ **Startup-Schutz:** Startet sofort beim Laden des Skripts, um Fehler zu fangen, die _vor_ dem vollständigen Start von Foundry passieren.
- 🤖 **Multi-KI Support:** Wähle deinen Assistenten (Gemini, ChatGPT, Claude, Copilot, Perplexity).
- 🏷️ **Module Blame:** Erkennt automatisch, welches Modul einen Fehler verursacht hat und markiert es (z.B. `[Midi QOL]`).
- 🧹 **Smart Grouping:** Fasst identische Fehler zusammen (z.B. `x5` Badge), damit dein Log sauber bleibt.
- 📝 **Smarte Prompts:** Erstellt automatisch einen detaillierten Prompt mit Fehlermeldung, Stack Trace und deiner Modul-Liste.

## 🛡️ Conflict Resolver 2.0 (Neu in v1.5)

- **Merciless A/B Testing:** Testet explizit beide Hälften, um nichts zu übersehen.
- **Split-Conflict Detection:** Findet Fehler, die nur durch die Kombination zweier Module entstehen (durch automatisches Mischen & Testen).
- **Safelist:** Markiere wichtige Module als "Sicher", damit sie niemals deaktiviert werden.
- **Hook Inspector:** Visualisiert, welche Module um die gleiche Logik kämpfen.

## ⚡ Performance Monitor & Factory Reset

- **System Monitor:** Zeigt FPS, Ping und Render-Zeiten (Idle Load).
- **Lag-Killer:** Identifiziert Performance-Fresser in Millisekunden.
- **Smart Reset:** Lösche Einstellungen auf 3 Ebenen: Welt (DB), User (Lokal) oder Dokumente (Flags).
- **Smart Poller:** Hintergrund-Scans laufen nur während der Aufnahme.

## 📦 Installation

1.  Öffne Foundry VTT.
2.  Gehe zum Reiter **Add-on Modules**.
3.  Klicke auf **Install Module**.
4.  Füge die folgende **Manifest URL** unten ein:

    ```text

    ```

````text
    https://github.com/PhilsModules/phils-console-doctor/releases/latest/download/module.json
    ```
5.  Klicke auf **Install**.

## 📖 Handbuch & Bedienung

### 1. Tab: >_ Konsole (Fehler & Diagnose)
Dein Dashboard. Hier landen alle Fehlermeldungen (Rot) und Warnungen (Gelb).
*   **Analyse:** Klicke auf den **Zauberstab / KI Button** neben einem Fehler. Der Doktor erstellt einen perfekten Text, den du an eine KI (ChatGPT/Claude) schicken kannst, um die Lösung zu finden.
*   **Filter:** Nutze die Suche oder die Buttons oben, um die Liste zu filtern.

### 2. Tab: Performance Monitor
Hier prüfst du, warum Foundry langsam ist.
*   **Wichtig:** Du musst erst die **Aufnahme starten** (Kreis-Icon oben rechts), damit Daten gesammelt werden.
*   **Lag-Killer:** Sortiere die Liste nach **Total (ms)**. Module ganz oben verbrauchen am meisten Leistung.
*   **System:** Ganz oben siehst du FPS (Bilder pro Sekunde) und Ping (Verzögerung).

### 3. Tab: Konflikte (Conflict Resolver)
Wenn zwei Module nicht miteinander können.
*   **Problemlösung:** Klicke auf den Button **Konflikt-Lösung starten**.
*   **Safelist:** Ein Fenster erscheint. Wähle hier Module aus, die **NIEMALS** abgeschaltet werden dürfen (z.B. dein Spielsystem `dnd5e`/`pf2e`, `libWrapper` oder Karten-Module).
*   **Der Prozess:** Foundry lädt neu und schaltet testweise Module aus. Du musst nur antworten: "Ist der Fehler noch da?" (Ja/Nein). Das wiederholt sich, bis der Schuldige gefunden ist.

### 4. Tab: Listener (Hooks & Loops)
Für Profis, die "stille" Fehler oder Endlosschleifen suchen.
*   **Aufnahme:** Auch hier musst du die Aufnahme starten.
*   **Schleifen-Schutz (Loop Protection):** Das Modul überwacht im Hintergrund alles. Wenn ein Modul "durchdreht" (z.B. 100 Chat-Nachrichten pro Sekunde sendet), stoppt der Doktor es automatisch und zeigt dir eine Warnung.
*   **Hooks:** Zeigt dir live, welche Events im Hintergrund feuern.

### 5. Tab: Module (Verwaltung & Reset)
Hier siehst du alle aktiven Module.
*   **Factory Reset:** Wenn ein Modul kaputt ist, mache einen **Rechtsklick** auf die Karte im Liste. Wähle **Factory Reset**, um alle Einstellungen dieses Moduls (Welt, Client oder Flags) komplett zu löschen und es auf "Neu" zurückzusetzen.

---

# <img src="https://flagcdn.com/48x36/gb.png" width="28" height="21" alt="EN"> English Instructions

**Stop guessing why your game is lagging or breaking.**

Phil's Console Doctor is your personal diagnostic assistant for Foundry VTT. It captures console errors and warnings in real-time and lets you analyze them with AI with a single click.

## 🚀 Key Features

- **Real-Time Monitoring:** Captures `console.warn` and `console.error` logs instantly.
- **Startup Protection:** Activates immediately when the script loads to catch bugs that happen _before_ Foundry is fully initialized.
- **Multi-AI Support:** Choose your preferred AI assistant (Gemini, ChatGPT, Claude, Copilot, Perplexity).
- **Module Blame:** Automatically identifies and badges the module responsible for an error (e.g., `[Midi QOL]`).
- **Smart Grouping:** Deduplicates identical errors to keep your log clean.
- **Smart Prompts:** Automatically generates a detailed prompt with the error message, stack trace, and your active module list.

## 🛡️ Conflict Resolver 2.0 (New in v1.5)

- **Merciless A/B Testing:** Explicitly tests both halves to confirm where the bug hides.
- **Split-Conflict Detection:** Detects bugs caused by the combination of _two_ specific modules (shuffles and retries until isolated).
- **Safelist:** Mark essential modules as "Safe" so they are never disabled during testing.
- **Hook Inspector:** Visualizes which modules are fighting over the same logic.

## ⚡ Performance Monitor & Factory Reset

- **System Monitor:** Tracks FPS, Latency (Ping), and Frame Times (Idle Load).
- **Lag Killer:** Instantly identifies performance bottlenecks in ms.
- **Smart Reset:** Clean settings on 3 levels: World (DB), User (Local), or Documents (Flags).
- **Smart Poller:** Background monitoring now sleeps when not recording.

## 📦 Installation

1.  Open Foundry VTT.
2.  Go to the **Add-on Modules** tab.
3.  Click **Install Module**.
4.  Paste the following **Manifest URL** into the field:
    ```text
    https://github.com/PhilsModules/phils-console-doctor/releases/latest/download/module.json
    ```
5.  Click **Install**.

## 📖 User Manual

### 1. Tab: >_ Console (Diagnosis)
Your main dashboard. All errors (Red) and warnings (Yellow) appear here.
*   **Analysis:** Click the **Wand / AI Button** next to an error. The Doctor generates a perfect prompt for you to send to ChatGPT/Claude.
*   **Filter:** Use the search bar or top buttons to filter the list.

### 2. Tab: Performance Monitor
Check why Foundry is lagging.
*   **Important:** You must **Start Recording** (Circle Icon top right) to gather data.
*   **Lag Killer:** Sort the list by **Total (ms)**. Modules at the top are using the most resources.
*   **System:** View your FPS and Ping (Latency) at the very top.

### 3. Tab: Conflicts (Conflict Resolver)
Use this when two modules aren't getting along.
*   **Resolution:** Click the button **Start Conflict Resolution**.
*   **Safelist:** A window appears. Select modules that must **NEVER** be disabled (e.g. your System `dnd5e`/`pf2e`, `libWrapper`, or Map modules).
*   **The Process:** Foundry will reload and test modules. You simply answer: "Is the issue still here?" (Yes/No). This repeats until the culprit is found.

### 4. Tab: Listener (Hooks & Loops)
For advanced users looking for "silent" bugs or infinite loops.
*   **Recording:** You must start recording here too.
*   **Loop Protection:** The Doctor monitors everything in the background. If a module goes crazy (e.g., sending 100 chat messages/sec), the Doctor automatically stops it and warns you.
*   **Hooks:** See exactly which events are firing in the background.

### 5. Tab: Modules (Management & Reset)
View all active modules.
*   **Factory Reset:** If a module is broken, **Right-Click** its card in the list. Select **Factory Reset** to completely wipe its settings (World, Client, or Flags) and restore it to a fresh state.

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
````

