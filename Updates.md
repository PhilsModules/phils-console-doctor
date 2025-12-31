## v1.5.0 - Conflict Resolver 2.0 & Smart Reset

- **Conflict Resolver 2.0 (The "Merciless" Logic):**
  - **A/B Verification:** No longer assumes "if it's not in A, it's in B". Now explicitly tests both halves to confirm where the bug hides.
  - **Split Conflict / Shuffle:** If a bug disappears in _both_ halves (meaning it requires a combination of modules from both groups), the Resolver now detects this "Split Conflict," shuffles the candidates, and retries until it isolates the specific group causing the issue.
  - **Safelist:** You can now actively "Safelist" essential modules (like libraries or systems) to ensure they are _never_ disabled during the troubleshooting process.
- **Factory Reset / Data Purge:**
  - **Granular Reset:** The cleanup tool now offers three distinct levels of cleaning:
    - **Global Settings:** Resets the module's configuration in the World Database.
    - **User Data:** (NEW) Explicitly clears your local browser storage and client flags for the module.
    - **Flags / Documents:** Scans the entire world (Actors, Scenes, Items) to remove residual data.
- **Performance:**
  - **Smart Poller:** The Chat Spam Detector now sleeps when you are not actively recording/profiling, effectively eliminating passive overhead.

## v1.4.0 - System Monitor, Core Refactor & Fuzzy Grouping

- **System Monitoring (NEW):**
  - **FPS Tracker:** Now records "System (FPS)" to show client-side frame rate.
  - **Latency Monitor:** Records "System (Latency)" (Ping) to server.
  - **Idle Load:** "System (Renderer)" Captures the frame time of the main loop, showing "baseline" load.
- **Core Logic Refactor (`Patcher`):**
  - **Centralized Patching:** Hook interception, Console wrapping, and Canvas monitoring are now handled by a single "Core Patcher" to prevent conflicts between the Profiler and Inspector.
  - **Accurate Module Detection:** Now captures the stack trace at the exact moment a Hook is registered, ensuring the "Inspector" knows exactly which module owns a hook (100% accuracy vs fuzzy guessing).
- **Console Improvements:**
  - **Fuzzy Grouping:** Identical errors with minor differences (e.g. "Texture A missing", "Texture B missing") are now grouped together with a **≈** symbol to clean up the log.
  - **Smart Deduping:** Prevents log flooding from rapid-fire errors.
- **Conflict Inspector:**
  - **Reliable Detection:** No longer guesses "Unknown/System" for complex module code. It reads the tags from the new Core Patcher.
- **Console Improvements:**
  - **Fuzzy Grouping:** Identical errors with minor differences (e.g. "Texture A missing", "Texture B missing") are now grouped together with a **≈** symbol to clean up the log.
  - **Smart Deduping:** Prevents log flooding from rapid-fire errors.
- **Conflict Inspector:**
  - **Reliable Detection:** No longer guesses "Unknown/System" for complex module code. It reads the tags from the new Core Patcher.
- **Profiler:**
  - **Canvas Metrics:** Now potentially tracks Canvas Refresh times (experimental).

## v1.3.0 - ApplicationV2 & Theme Compatibility (Final Polish)

- **Performance Monitoring v2:**
  - **Decoupled Logic:** Separation of "Performance Profiler" and "Conflict Detective" avoids interference.
  - **V13 Compatibility:** Updated to support `ApplicationV2` and `foundry.canvas.placeables`. Removed deprecated warnings.
  - **Retroactive Patching:** Improved background monitoring to correctly capture all Core and System hooks registered at startup.
  - **Scroll Fix:** Resolved issue where lists in `ApplicationV2` windows were not scrollable.
- **Theme Standardization:**
  - **Unified Look:** Now uses the standard Foundry "Parchment" theme by default.
  - **Dark Mode Support:** Fully compatible with global dark themes like `phils-pf2e-realdark`.
- **Tab System:** Upgraded to the new V2 Tab architecture for smoother navigation.

## Version 1.2.4

- **New Feature:** Added 'Live Diagnosis' button to Conflict Detective.
  - Allows manually starting/stopping recording to catch silent failures.
  - Visual indicator (Red Circle/Black Square) for recording state.
- **Localization:** Added German translation for all new UI elements and inspector warnings.
- **Improvement:** Enhanced conflict category warnings ("UI", "Actor", "Scene", "Method").

## Version 1.2.4

- **Refinement:** Explicit Incompatibility Scan now ignores "deprecated" warnings to avoid false positives.

- **Smart Conflict Analysis:** The Detective now scans logs for explicit incompatibility warnings (e.g., "Incompatible with module X").
- **Silent Failures:** "Blocked Actions" has been renamed to "Silent Failures" to better explain that suppressed actions are listed here.
- **Advice:** Added advice text for UI and Environment conflicts.
- **Bugfix:** Fixed critical syntax errors in `main.js` that prevented the display.

## v1.2.0 - Visual Overhaul & Parchment Theme

- **Feature:** Requires Foundry V12+ (verified for V13).
- **Design:** Complete visual overhaul to match the "Parchment" aesthetic of other modules.
- **Fix:** Resolved visibility issues in Dark Mode by enforcing a fixed parchment background and high-contrast text.
- **Fix:** Window background now uses the core Foundry parchment texture (`ui/parchment.jpg`) for a native look.
