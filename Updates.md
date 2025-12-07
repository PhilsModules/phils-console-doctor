# Update Log

## Version 1.2.4
*   **New Feature:** Added 'Live Diagnosis' button to Conflict Detective.
    *   Allows manually starting/stopping recording to catch silent failures.
    *   Visual indicator (Red Circle/Black Square) for recording state.
*   **Localization:** Added German translation for all new UI elements and inspector warnings.
*   **Improvement:** Enhanced conflict category warnings ("UI", "Actor", "Scene", "Method").


## Version 1.2.4
*   **Refinement:** Explicit Incompatibility Scan now ignores "deprecated" warnings to avoid false positives.

*   **Smart Conflict Analysis:** The Detective now scans logs for explicit incompatibility warnings (e.g., "Incompatible with module X").
*   **Silent Failures:** "Blocked Actions" has been renamed to "Silent Failures" to better explain that suppressed actions are listed here.
*   **Advice:** Added advice text for UI and Environment conflicts.
*   **Bugfix:** Fixed critical syntax errors in `main.js` that prevented the display.


## v1.2.0 - Visual Overhaul & Parchment Theme
- **Feature:** Requires Foundry V12+ (verified for V13).
- **Design:** Complete visual overhaul to match the "Parchment" aesthetic of other modules.
- **Fix:** Resolved visibility issues in Dark Mode by enforcing a fixed parchment background and high-contrast text.
- **Fix:** Window background now uses the core Foundry parchment texture (`ui/parchment.jpg`) for a native look.
