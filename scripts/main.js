/**
 * PHILS CONSOLE DOCTOR
 * Version: 3.2.9 (Polished Output)
 */

const MODULE_ID = 'phils-console-doctor';
const PCD_CAPTURED_LOGS = [];
const PCD_ORIGINAL_CONSOLE = { warn: console.warn, error: console.error };

// --- CONSOLE PATCH (Defined & Executed Immediately) ---
function pcdPatchConsole() {
    // Prevent double patching if this script somehow runs twice
    if (window.pcdPatched) return;
    window.pcdPatched = true;

    function capture(type, args) {
        const msg = args.map(a => {
            if (a instanceof Error) return `${a.message}`;
            if (a instanceof Event) {
                // Handle Resource Loading Errors (e.g. img, script)
                if (a.target && (a.target.src || a.target.href)) {
                    return `Resource failed to load: ${a.target.src || a.target.href}`;
                }
                return `[Event] ${a.type}`;
            }
            if (typeof a === 'object') {
                try { return JSON.stringify(a, null, 2); }
                catch (e) { return '[Circular Object]'; }
            }
            return String(a);
        }).join(" ");

        if (!msg || msg === "{}" || msg.trim() === "") return;

        let stack = "";
        if (args[0] instanceof Error) stack = args[0].stack;
        else stack = new Error().stack;

        const entry = {
            id: Date.now(),
            timestamp: new Date().toLocaleTimeString(),
            type,
            message: msg,
            stack
        };

        PCD_CAPTURED_LOGS.unshift(entry);

        // Safety check: game.settings might not be ready yet during early startup
        let max = 50;
        try {
            if (typeof game !== 'undefined' && game.settings && game.settings.get) {
                max = game.settings.get(MODULE_ID, 'maxLogs') || 50;
            }
        } catch (e) { /* ignore settings error during startup */ }

        if (PCD_CAPTURED_LOGS.length > max) PCD_CAPTURED_LOGS.pop();

        // Update UI if it exists (won't exist during startup, but will later)
        if (typeof ui !== 'undefined' && ui.philsConsoleDoctor && ui.philsConsoleDoctor.rendered) {
            if (!ui.philsConsoleDoctor._updateTimeout) {
                ui.philsConsoleDoctor._updateTimeout = setTimeout(() => {
                    ui.philsConsoleDoctor.updateListContent();
                    ui.philsConsoleDoctor._updateTimeout = null;
                }, 100);
            }
        }
    }

    console.warn = function (...args) { PCD_ORIGINAL_CONSOLE.warn.apply(console, args); capture('warn', args); };
    console.error = function (...args) { PCD_ORIGINAL_CONSOLE.error.apply(console, args); capture('error', args); };

    // Global Error Handlers (Aggressive Mode)

    // 1. Standard Runtime Errors
    window.addEventListener('error', (event) => {
        capture('error', [`[Uncaught Exception] ${event.message}`, event.error]);
    });

    // 2. Resource Loading Errors (Capture Phase = true)
    // This catches 404s on images, scripts, etc. which don't bubble.
    window.addEventListener('error', (event) => {
        if (event instanceof Event && (event.target instanceof HTMLImageElement || event.target instanceof HTMLScriptElement || event.target instanceof HTMLLinkElement)) {
            capture('error', [event]);
        }
    }, true);

    // 3. Unhandled Promise Rejections
    window.addEventListener('unhandledrejection', (event) => {
        capture('error', [`[Unhandled Promise Rejection] ${event.reason}`]);
    });

    console.log("🏥 Phils Console Doctor active (Fast Start Mode).");
}

// EXECUTE IMMEDIATELY
pcdPatchConsole();

console.log("PCD: Module script loaded.");

// --- INIT ---
Hooks.once('init', () => {
    console.log("PCD: Init hook fired.");
    // Settings
    game.settings.register(MODULE_ID, 'aiUrl', {
        name: "PHILSCONSOLEDOCTOR.Settings.AIUrlName", hint: "PHILSCONSOLEDOCTOR.Settings.AIUrlHint",
        scope: 'client', config: true, type: String, default: 'https://gemini.google.com/app',
        choices: {
            'https://gemini.google.com/app': 'Google Gemini',
            'https://chatgpt.com/': 'ChatGPT',
            'https://claude.ai/': 'Claude',
            'https://copilot.microsoft.com/': 'Microsoft Copilot',
            'https://www.perplexity.ai/': 'Perplexity'
        }
    });
    game.settings.register(MODULE_ID, 'maxLogs', {
        name: "PHILSCONSOLEDOCTOR.Settings.MaxLogsName", hint: "PHILSCONSOLEDOCTOR.Settings.MaxLogsHint",
        scope: 'client', config: true, type: Number, default: 50
    });

    // Keybinding: STRG + ALT + K
    game.keybindings.register(MODULE_ID, "openConsoleDoctor", {
        name: "Open Console Doctor",
        editable: [{ key: "KeyK", modifiers: [KeyboardManager.MODIFIER_KEYS.CONTROL, KeyboardManager.MODIFIER_KEYS.ALT] }],
        onDown: () => { openDoctorWindow(); return true; }
    });
});

// --- SETTINGS BUTTON INJECTION (Bottom Placement) ---
Hooks.on('renderSettings', (app, html) => {
    console.log("PCD: renderSettings hook fired.");

    // Only for GM
    if (!game.user.isGM) return;

    const element = html instanceof HTMLElement ? html : html[0];

    // Check if button already exists
    if (element.querySelector('[data-action="open-pcd"]')) return;

    // Create a container section to match layout
    const container = document.createElement("div");
    container.className = "pcd-sidebar-container";
    container.style.marginTop = "10px";
    container.style.marginBottom = "10px";

    // Create the button
    const button = document.createElement("button");
    button.dataset.action = "open-pcd";
    button.type = "button";
    button.className = "pcd-sidebar-btn";
    button.innerHTML = `<i class="fas fa-stethoscope"></i> Console Doctor`;
    button.onclick = (ev) => { ev.preventDefault(); openDoctorWindow(); };

    container.appendChild(button);

    // Placement Logic: ALWAYS at the bottom
    element.appendChild(container);
    console.log("PCD: Button injected at BOTTOM of sidebar.");
});

function openDoctorWindow() {
    if (!ui.philsConsoleDoctor) ui.philsConsoleDoctor = new PhilsConsoleDoctorApp();
    ui.philsConsoleDoctor.render(true);
}

// --- APP CLASS ---
class PhilsConsoleDoctorApp extends Application {
    constructor() { super(); this.filters = { warn: true, error: true }; }

    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: "phils-console-doctor-app",
            title: "Console Doctor",
            width: 600,
            height: 600,
            template: null,
            classes: ["phils-console-doctor-window"],
            resizable: true
        });
    }

    render(force, options) {
        if (!force && !this.element) return;
        if (!this.element || force) { super.render(force, options); return; }
        this.updateListContent();
    }

    _renderInner(data) {
        const header = `
            <div class="pcd-header">
                <button class="pcd-filter-btn ${this.filters.warn ? 'active' : ''}" data-filter="warn">
                    <i class="fas fa-exclamation-triangle"></i> ${game.i18n.localize("PHILSCONSOLEDOCTOR.UI.Warn")}
                </button>
                <button class="pcd-filter-btn ${this.filters.error ? 'active' : ''}" data-filter="error">
                    <i class="fas fa-times-circle"></i> ${game.i18n.localize("PHILSCONSOLEDOCTOR.UI.Error")}
                </button>
                <button class="pcd-filter-btn" data-action="clear" style="flex: 0 0 50px;" title="${game.i18n.localize("PHILSCONSOLEDOCTOR.UI.ClearLog")}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>`;
        const list = `<div class="pcd-log-list" id="pcd-list-container"></div>`;
        return $(`<div class="pcd-main-layout">${header}${list}</div>`);
    }

    activateListeners(html) {
        html = $(html); super.activateListeners(html);
        this.listContainer = html.find('#pcd-list-container');
        this.updateListContent();

        html.find('.pcd-filter-btn[data-filter]').click(ev => {
            ev.preventDefault();
            const f = ev.currentTarget.dataset.filter;
            this.filters[f] = !this.filters[f];
            $(ev.currentTarget).toggleClass('active', this.filters[f]);
            this.updateListContent();
        });

        html.find('[data-action="clear"]').click(ev => {
            ev.preventDefault();
            PCD_CAPTURED_LOGS.length = 0;
            this.updateListContent();
        });
    }

    updateListContent() {
        if (!this.listContainer) return;
        this.listContainer.empty();

        const visibleLogs = PCD_CAPTURED_LOGS.filter(l => this.filters[l.type]);

        if (visibleLogs.length === 0) {
            this.listContainer.append(`<div style="padding:40px; text-align:center; color:#7a7971; font-style:italic;">${game.i18n.localize("PHILSCONSOLEDOCTOR.UI.NoEntries")}</div>`);
            return;
        }

        visibleLogs.forEach(log => {
            const row = $(`
                <div class="pcd-entry ${log.type}">
                    <div class="pcd-meta">
                        <span><i class="far fa-clock"></i> ${log.timestamp}</span>
                        <span style="opacity:0.8">${log.type.toUpperCase()}</span>
                    </div>
                    <div class="pcd-message">${log.message}</div>
                    <div class="pcd-action-area">
                        <button class="pcd-ask-btn">
                            <i class="fas fa-magic"></i> ${game.i18n.localize("PHILSCONSOLEDOCTOR.UI.AskAI")}
                        </button>
                    </div>
                </div>
            `);

            // AI Button Logic
            row.find('.pcd-ask-btn').click((e) => {
                e.stopPropagation();
                this.generatePrompt(log);
            });

            this.listContainer.append(row);
        });
    }

    async generatePrompt(logEntry) {
        const activeModules = game.modules.filter(m => m.active).map(m => `- ${m.title} (${m.id}) v${m.version}`).join("\n");

        // Use localized prompt
        const prompt = game.i18n.format("PHILSCONSOLEDOCTOR.Prompt.Analysis", {
            timestamp: logEntry.timestamp,
            type: logEntry.type,
            message: logEntry.message,
            stack: logEntry.stack,
            modules: activeModules
        });

        try {
            await navigator.clipboard.writeText(prompt);
            ui.notifications.info(game.i18n.localize("PHILSCONSOLEDOCTOR.UI.PromptCopied"));
            window.open(game.settings.get(MODULE_ID, 'aiUrl'), "_blank");
        } catch (e) { ui.notifications.error(game.i18n.localize("PHILSCONSOLEDOCTOR.UI.ClipboardFailed")); }
    }
}