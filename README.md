<div align="center">

# Phil's Console Doctor & Task Manager 🏥⚡

![Foundry v14 Compatible](https://img.shields.io/badge/Foundry-v14-brightgreen?style=flat-square) ![Foundry v13 Compatible](https://img.shields.io/badge/Foundry-v13-green?style=flat-square) ![Foundry v12 Compatible](https://img.shields.io/badge/Foundry-v12-green?style=flat-square) ![License](https://img.shields.io/badge/License-GPLv3-blue?style=flat-square)
[![Version](https://img.shields.io/badge/Version-2.0.0-blue?style=flat-square)](https://github.com/PhilsModules/phils-console-doctor/releases) [![Patreon](https://img.shields.io/badge/SUPPORT-Patreon-ff424d?style=flat-square&logo=patreon)](https://www.patreon.com/PhilsModules)

<br>

**The ultimate Windows 11 Task Manager & Diagnostic Assistant for Foundry VTT.**
<br>
_Der ultimative Windows 11 Task Manager & Diagnose-Assistent für Foundry VTT._

<br>

<a href="#-english-instructions"><img src="https://img.shields.io/badge/%20-English_Instructions-black?style=for-the-badge&logo=united-kingdom&logoColor=white" alt="English Instructions"></a> <a href="#-deutsche-anleitung"><img src="https://img.shields.io/badge/%20-Deutsche_Anleitung-black?style=for-the-badge&logo=germany&logoColor=red" alt="Deutsche Anleitung"></a> <a href="Updates.md"><img src="https://img.shields.io/badge/%20-Update_Logs-black?style=for-the-badge&logo=clock&logoColor=white" alt="Updates"></a>

</div>

<br>

> [!NOTE]
> **A Quick Note / Hinweis in eigener Sache**
>
> 🇬🇧 **Hi everyone!**  
> A quick note before you start: I create these modules completely in my free time and offer them to the community for free. Since neither my partner nor I are professional graphic designers, translators, or full time developers, maintaining these projects takes a huge amount of effort. To make these modules possible, we use assistance from artificial intelligence, especially for translations and visual elements. Hiring professional designers or translators is simply something we cannot afford out of pocket.
> 
> If these modules should ever be removed from the official Foundry package listing due to rules regarding artificial intelligence, do not worry. The project will continue! You can always find all updates, releases, and support directly here on GitHub.
> 
> Thank you so much for your understanding and support!
> 
> ---
> 
> 🇩🇪 **Hallo zusammen!**  
> Ein kleiner Hinweis in eigener Sache, bevor ihr startet: Ich erstelle diese Module komplett in meiner Freizeit und stelle sie der Community kostenlos zur Verfügung. Da weder meine Lebensgefährtin noch ich Grafikdesigner, gelernte Übersetzer oder hauptberufliche Entwickler sind, ist die Pflege extrem aufwendig. Um die Module in dieser Form überhaupt anbieten zu können, nutzen wir Hilfe von künstlicher Intelligenz, zum Beispiel für Übersetzungen und grafische Elemente. Professionelle Designer oder Übersetzer können wir uns privat schlicht nicht leisten.
> 
> Sollten die Module wegen der Nutzung von künstlicher Intelligenz oder veränderter Richtlinien irgendwann aus dem offiziellen Verzeichnis von Foundry gelöscht werden, müsst ihr euch keine Sorgen machen. Das Projekt stirbt nicht! Ihr findet alle Updates, neue Versionen und Unterstützung bei Problemen weiterhin direkt hier auf GitHub.
> 
> Vielen Dank für euer Verständnis und eure Unterstützung!

<br>

---

<br>

# <img src="https://flagcdn.com/48x36/gb.png" width="28" height="21" alt="EN"> English Instructions

**Stop guessing why your Foundry VTT is lagging or why a button does nothing.**

Phil's Console Doctor 2.0 brings the authentic **Windows 11 Task Manager** experience directly into your Foundry VTT session – featuring crystal-clear terminology, real-time CPU vs. GPU load metrics, and an automated troubleshooting wizard.

---

## 🌟 The 6 Core Views & Features

### 1. ⚡ Task Manager (Processes)
- **Real-Time Load Breakdown:** Displays every active module with its **CPU Load (%)**, **GPU Render Time (ms/s)**, and **Actions/s**.
- **Windows 11 Heatmap Design:** Clean numerical data with subtle heat tinting on active cells instead of clunky progress bar boxes.
- **"Why?" (Plain-Text Diagnosis):** Instantly explains the root cause of slowdowns (e.g., *"High frequency: 45x /s 'refreshToken'"*, *"Heavy ambient lighting calculations"*, *"Long hook execution time"*).
- **Process Groups:** Categorized into *Active Modules*, *Foundry Core Engine*, and *Background (Idle)*.
- **Actions:** Select any process to immediately `Deactivate Module` or `Reset Data`.

### 2. 📊 System Monitor (Performance)
- **Live Hardware Cards:** Large master KPI cards with real-time SVG sparkline history graphs:
  - **CPU:** Main-thread script execution time (30-second rolling history)
  - **GPU / Canvas:** Live frame rate (FPS) & Frame render time (ms)
  - **RAM (Memory):** JS Heap usage in MB & Entity counters (Tokens, Lights, Actors)
  - **Network:** Server WebSocket ping latency
- **Canvas Breakdown:** Detailed metrics for Token, Lighting, Sight, and Particle layers.

### 3. 🩺 Error Log & AI Doctor
- **Full-Height Workspace:** No cramped views; distraction-free error viewing with persistent scroll memory.
- **✨ Explain via AI:** Copies error messages, stack traces, and active module lists with one click and opens Google Gemini, ChatGPT, or Claude for instant solutions.
- **Filter Pills:** Easily toggle between Warnings and Errors.

### 4. 🛡️ Conflict Detective
- **Silent Failures:** Identifies modules intercepting actions with `return false` (e.g. when clicking a dice roll does nothing).
- **Method Contention:** Detects wrapper clashes and method overrides across multiple modules (`libWrapper` / prototype modifications).
- **🔍 Record Blocked Action:** Record live interactions to pinpoint why a roll or click fails.

### 5. 🔬 Culprit Finder (A/B Bisect Wizard)
- **Automated Bug Hunting:** Halves active modules step-by-step and asks *"Does the error still occur?"*.
- **Safelist:** Protects critical libraries and game systems from being deactivated during testing.
- Isolates broken or conflicting modules in 3–5 quick clicks without manual guessing.

### 6. 🧹 Module Factory Reset
- **Granular Cleanup:** 3 tiers of data resetting:
  - World Database settings (restores default configs)
  - Local browser cache (`localStorage`)
  - Leftover document flags in Actors, Items, and Scenes.

---

## ⚡ Zero-Overhead Idle Guarantee
- Zero hooks or performance wrappers execute during Foundry boot time.
- Diagnostic profiling activates **ONLY while the Task Manager window is open**.
- Closing the window completely restores native Foundry methods with 0ms extra overhead.

---

## ⌨️ Shortcut & How to Open
- **Keyboard Shortcut:** `Ctrl + Alt + K`
- **Sidebar Button:** Available inside the **Game Settings** tab.

---

## 📦 Installation

1. Open Foundry VTT.
2. Go to **Add-on Modules** -> **Install Module**.
3. Paste the following **Manifest URL**:
   ```text
   https://github.com/PhilsModules/phils-console-doctor/releases/latest/download/module.json
   ```
4. Click **Install**.

<br>

---

<br>

# <img src="https://flagcdn.com/48x36/de.png" width="28" height="21" alt="DE"> Deutsche Anleitung

**Schluss mit Rätselraten, warum Foundry VTT ruckelt oder ein Klick nicht reagiert.**

Phil's Console Doctor 2.0 bringt den vertrauten **Windows 11 Task Manager** direkt in deine Spielwelt – mit selbsterklärenden Begriffen, Live-Ressourcenaufschlüsselung (CPU vs. GPU) und automatischem Problemlöser.

---

## 🌟 Die 6 Hauptbereiche im Überblick

### 1. ⚡ Task Manager (Prozesse)
- **Wer verbraucht Leistung?** Zeigt jedes Modul mit seiner **CPU-Last (%)**, **Grafik-Render-Zeit (ms/s)** und **Aktionen/s**.
- **Windows 11 Heatmap-Design:** Keine überladenen Balken – die Werte leuchten bei Aktivität dezent blau/farbig auf.
- **"Warum?" (Diagnose im Klartext):** Erklärt sofort die Lag-Ursache (z. B. *"Hohe Frequenz: 45x /s 'refreshToken'"*, *"Starke Lichtberechnungen auf der Karte"*).
- **Prozess-Gruppen:** Unterteilt in *Aktive Module*, *Foundry Kernsystem & Engine* und *Hintergrund-Module (Leerlauf)*.
- **1-Klick Aktionen:** Modul anklicken und direkt über die Toolbar `Modul deaktivieren` oder `Bereinigen`.

### 2. 📊 System-Monitor (Leistung & Hardware)
- **Live Hardware-Karten:** Große Master-Karten mit dynamischen Sparkline-Verlaufsgraphen für:
  - **CPU:** Main-Thread Rechenzeit
  - **GPU / Canvas:** Bildwiederholrate (FPS) & Frame-Renderzeit
  - **Arbeitsspeicher (RAM):** Heap-Speicher in MB & Zähler für Tokens, Lichter, Aktoren
  - **Netzwerk:** WebSocket-Ping-Latenz zum Server
- **Canvas-Ebenen Belastung:** Zeigt genaue Auslastungen für Tokens, Lichtquellen, Sichtlinien und Spezialeffekte.

### 3. 🩺 Fehler-Protokoll (Logs & KI-Doktor)
- **Volle 100% Fensterhöhe:** Keine gestauchten Listen mehr – flüssiges Scrollen ohne Springen.
- **✨ Per KI erklären:** Kopiert Fehlermeldung, Stacktrace und Modulliste mit einem Klick und öffnet Google Gemini, ChatGPT oder Claude für die Sofortlösung.
- **Filter:** Schnellfilter für `Warnungen` und `Fehler`.

### 4. 🛡️ Konflikt-Finder (Stille Fehler & Streit)
- **Stille Fehler (Blocked Actions):** Erkennt, wenn ein Modul eine Aktion (z. B. Würfeln oder Bewegen) heimlich mit `return false` blockiert.
- **Methoden-Streit:** Zeigt an, wenn mehrere Module dieselbe Foundry-Kernfunktion überschreiben (`libWrapper`/Overrides).
- **🔍 Aufnahme für blockierte Aktion:** Starte die Aufnahme und führe die fehlerhafte Aktion aus, um den Verursacher zu entlarven.

### 5. 🔬 Problemlöser (Automatischer A/B-Test)
- **Kein manuelles Modul-Raten:** Der Assistent halbiert deine Modulliste in mehreren Test-Schritten und fragt *"Besteht der Fehler noch?"*.
- **Safelist:** Wichtige Systemmodule und Bibliotheken bleiben geschützt und werden niemals deaktiviert.
- Findet in 3–5 Klicks automatisch das schuldige Modul!

### 6. 🧹 Modul-Bereinigung (Factory Reset)
- **Saubere Welten:** Ermöglicht das restlose Zurücksetzen von Modul-Daten in 3 Stufen:
  - Welt-Einstellungen (Standardwerte)
  - Lokale Browser-Daten (`localStorage`)
  - Verwaiste Datenreste (Flags) in Akteuren, Items und Szenen.

---

## ⚡ 100% Zero-Overhead Lifecycle
- Beim Start von Foundry VTT wird **nichts** gepatcht und keine Schleife gestartet.
- Die Diagnose und Messung schaltet sich **nur ein, wenn das Task-Manager-Fenster geöffnet ist**.
- Beim Schließen des Fensters werden alle Originalmethoden von Foundry zu 100% wiederhergestellt.

---

## ⌨️ Tastenkürzel & Öffnen
- **Tastenkürzel:** `Strg + Alt + K`
- **In den Spieleinstellungen:** Button **Task Manager** im Einstellungsmenü.

---

## 📦 Installation

1. Öffne Foundry VTT.
2. Gehe zu **Add-on Modules** -> **Install Module**.
3. Füge folgende **Manifest URL** ein:
   ```text
   https://github.com/PhilsModules/phils-console-doctor/releases/latest/download/module.json
   ```
4. Klicke auf **Install**.
