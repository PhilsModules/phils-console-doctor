/**
 * PHILS CONSOLE DOCTOR
 * Version: 1.2.2
 */

const MODULE_ID = 'phils-console-doctor';
import { PCDProfiler } from './profiler.js';
import { PCDInspector } from './inspector.js';

const PCD_CAPTURED_LOGS = [];
const PCD_ORIGINAL_CONSOLE = { warn: console.warn, error: console.error };

// --- CONSOLE PATCH ---
// --- CONSOLE PATCH ---
function pcdPatchConsole() {
    if (window.pcdPatched) return;
    window.pcdPatched = true;

    function capture(type, args) {
        // Serialization
        const msg = args.map(a => {
            if (a instanceof Error) return a.message;
            if (a instanceof Event) {
                if (a.target && (a.target.src || a.target.href)) {
                    return `Resource failed to load: ${a.target.src || a.target.href}`;
                }
                return `[Event] ${a.type}`;
            }
            if (typeof a === 'object') {
                try { return JSON.stringify(a, null, 2); } catch { return '[Circular Object]'; }
            }
            return String(a);
        }).join(" ");

        if (!msg || msg === "{}" || !msg.trim()) return;

        const stack = (args[0] instanceof Error) ? args[0].stack : new Error().stack;

        // Deduping
        if (PCD_CAPTURED_LOGS.length > 0) {
            const lastEntry = PCD_CAPTURED_LOGS[0];
            if (lastEntry.message === msg && lastEntry.type === type) {
                lastEntry.count = (lastEntry.count || 1) + 1;
                lastEntry.timestamp = new Date().toLocaleTimeString();
                ui.philsConsoleDoctor?.rendered && ui.philsConsoleDoctor.updateListContent();
                return;
            }
        }

        // Module Detection
        let sourceModule = null;
        if (stack) {
            const match = stack.match(/modules\/([^\/]+)\//);
            if (match && match[1] && match[1] !== MODULE_ID) {
                const moduleId = match[1];
                const module = game.modules?.get(moduleId);
                sourceModule = { id: moduleId, title: module?.title || moduleId };
            }
        }

        PCD_CAPTURED_LOGS.unshift({
            id: Date.now(),
            timestamp: new Date().toLocaleTimeString(),
            type,
            message: msg,
            stack,
            count: 1,
            sourceModule
        });

        let max = 50;
        try {
            max = game.settings?.get(MODULE_ID, 'maxLogs') ?? 50;
        } catch (e) {
            // Setting not yet registered, use default
        }
        if (PCD_CAPTURED_LOGS.length > max) PCD_CAPTURED_LOGS.pop();

        if (ui.philsConsoleDoctor?.rendered) {
            clearTimeout(ui.philsConsoleDoctor._updateTimeout);
            ui.philsConsoleDoctor._updateTimeout = setTimeout(() => ui.philsConsoleDoctor.updateListContent(), 100);
        }
    }

    // Overrides
    console.warn = (...args) => { PCD_ORIGINAL_CONSOLE.warn.apply(console, args); capture('warn', args); };
    console.error = (...args) => { PCD_ORIGINAL_CONSOLE.error.apply(console, args); capture('error', args); };

    // Global Error Listeners
    window.addEventListener('error', (e) => {
        if (e instanceof Event && (e.target.src || e.target.href)) capture('error', [e]);
        else capture('error', [`[Uncaught Exception] ${e.message}`, e.error]);
    }, true);

    window.addEventListener('unhandledrejection', (e) => capture('error', [`[Unhandled Promise Rejection] ${e.reason}`]));

    // Network Interceptors
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
        try {
            const response = await originalFetch(...args);
            if (!response.ok) capture('error', [`[Network Error] Fetch failed: ${response.status} ${response.statusText} (${args[0]})`]);
            return response;
        } catch (err) {
            capture('error', [`[Network Error] Fetch exception: ${err.message} (${args[0]})`]);
            throw err;
        }
    };

    const originalXhrOpen = XMLHttpRequest.prototype.open;
    const originalXhrSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method, url) {
        this._pcdUrl = url;
        this._pcdMethod = method;
        return originalXhrOpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function () {
        this.addEventListener('error', () => capture('error', [`[Network Error] XHR failed: ${this._pcdMethod} ${this._pcdUrl}`]));
        return originalXhrSend.apply(this, arguments);
    };

    console.log("🏥 Phils Console Doctor active.");
}

pcdPatchConsole();
console.log("PCD: Module script loaded.");

Hooks.once('init', () => {
    console.log("PCD: Init hook fired.");
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

    game.keybindings.register(MODULE_ID, "openConsoleDoctor", {
        name: "Open Console Doctor",
        editable: [{ key: "KeyK", modifiers: [KeyboardManager.MODIFIER_KEYS.CONTROL, KeyboardManager.MODIFIER_KEYS.ALT] }],
        onDown: () => { openDoctorWindow(); return true; }
    });
});

Hooks.on('renderSettings', (app, html) => {
    const element = html[0] || html;
    if (element.querySelector('[data-action="open-pcd"]')) return;

    const btn = $(`<div class="pcd-sidebar-container" style="margin: 10px 0;">
        <button type="button" data-action="open-pcd" class="pcd-sidebar-btn">
            <i class="fas fa-stethoscope"></i> Console Doctor
        </button>
    </div>`);

    btn.find('button').click((ev) => { ev.preventDefault(); openDoctorWindow(); });
    $(element).append(btn);
});

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

// Use global module state if needed, but V2 suggests keeping state in the app or settings
// We will keep PCD_CAPTURED_LOGS global as it's the "backend" data

class PhilsConsoleDoctorApp extends HandlebarsApplicationMixin(ApplicationV2) {
    constructor() {
        super();
        this.filters = { warn: true, error: true };
        this.searchQuery = "";
        this.activeTab = 'console';

        this.metricsSort = 'totalTime';
        this.metricsSortDesc = true;

        this._updateListDebounced = foundry.utils.debounce(this.render.bind(this), 100);
    }

    static DEFAULT_OPTIONS = {
        tag: "form",
        id: "phils-console-doctor-app",
        window: {
            title: "Console Doctor", // Will be localized if key exists or passed directly
            icon: "fas fa-stethoscope",
            resizable: true,
            contentClasses: ["phils-console-doctor-window"] // Keep class for CSS compatibility
        },
        position: {
            width: 700,
            height: 600
        },
        actions: {
            viewTab: PhilsConsoleDoctorApp.prototype.onTabSwitch,
            toggleFilter: PhilsConsoleDoctorApp.prototype.onToggleFilter,
            clearConsole: PhilsConsoleDoctorApp.prototype.onClearConsole,
            askAI: PhilsConsoleDoctorApp.prototype.onAskAI,

            // Metrics
            toggleRecording: PhilsConsoleDoctorApp.prototype.onToggleRecording,
            refreshMetrics: PhilsConsoleDoctorApp.prototype.onRefreshMetrics,
            clearMetrics: PhilsConsoleDoctorApp.prototype.onClearMetrics,
            sortMetrics: PhilsConsoleDoctorApp.prototype.onSortMetrics,

            // Conflicts
            toggleDiagnosis: PhilsConsoleDoctorApp.prototype.onToggleDiagnosis
        }
    };

    static PARTS = {
        main: {
            template: "modules/phils-console-doctor/templates/app.hbs"
        }
    };

    /** @override */
    async _prepareContext(options) {
        const context = {
            activeTab: this.activeTab,
            searchQuery: this.searchQuery,
            isProfiling: (typeof PCDProfiler !== 'undefined' && PCDProfiler.IS_PROFILING),
            isDiagnosing: (typeof PCDProfiler !== 'undefined' && PCDProfiler.IS_DIAGNOSING),
        };

        // --- CONSOLE CONTEXT ---
        if (this.activeTab === 'console') {
            context.filters = this.filters;

            // Filter Logs
            context.logs = PCD_CAPTURED_LOGS.filter(l => {
                if (!this.filters[l.type]) return false;
                if (this.searchQuery) {
                    const query = this.searchQuery.toLowerCase();
                    return l.message.toLowerCase().includes(query) || (l.stack && l.stack.toLowerCase().includes(query));
                }
                return true;
            });
        }

        // --- METRICS CONTEXT ---
        if (this.activeTab === 'metrics') {
            if (typeof PCDProfiler === 'undefined') {
                context.profilerError = true;
            } else {
                let data = PCDProfiler.getResults();
                // console.log("PCD Metrics Data:", data);
                data = data.map(d => ({ ...d, avg: d.count > 0 ? (d.totalTime / d.count) : 0 }));

                // Sort
                data.sort((a, b) => {
                    let valA = a[this.metricsSort];
                    let valB = b[this.metricsSort];
                    if (typeof valA === 'string') { valA = valA.toLowerCase(); valB = valB.toLowerCase(); }

                    if (valA < valB) return this.metricsSortDesc ? 1 : -1;
                    if (valA > valB) return this.metricsSortDesc ? -1 : 1;
                    return 0;
                });

                // Style Classes
                data.forEach(d => {
                    if (d.totalTime > 500) d.rowClass = "high-impact";
                    else if (d.totalTime > 100) d.rowClass = "med-impact";
                    else d.rowClass = "";
                });

                context.metrics = data;
            }
        }

        // --- CONFLICTS CONTEXT ---
        if (this.activeTab === 'conflicts') {
            const boxes = this._prepareConflictBoxes();
            context.hasConflicts = boxes.length > 0;
            context.conflictsBoxes = boxes;
        }

        return context;
    }

    /* --- CONFLICTS HELPER --- */
    _prepareConflictBoxes() {
        const boxes = [];

        // 0. DATA
        const semanticConflicts = PCDInspector.scanLogs(PCD_CAPTURED_LOGS);
        const methodConflicts = PCDInspector.scanMethods(PCD_CAPTURED_LOGS);
        const hookReport = PCDInspector.scanHooks();
        let blockedActions = [];
        if (typeof PCDProfiler !== 'undefined') blockedActions = PCDProfiler.getBlocks();

        // 1. EXPLICIT
        if (semanticConflicts.length > 0) {
            boxes.push({
                title: game.i18n.localize("PHILSCONSOLEDOCTOR.UI.ExplicitIncompatibility") || "Explizite Inkompatibilitäten",
                desc: game.i18n.localize("PHILSCONSOLEDOCTOR.UI.ExplicitIncompatibilityDesc"),
                icon: "fas fa-bomb",
                color: "#ff3333",
                items: semanticConflicts.map(c => ({ ...c, isSemantic: true }))
            });
        }

        // 2. METHOD
        if (methodConflicts.length > 0) {
            boxes.push({
                title: game.i18n.localize("PHILSCONSOLEDOCTOR.UI.MethodContention") || "Methoden-Konflikte",
                desc: game.i18n.localize("PHILSCONSOLEDOCTOR.UI.MethodContentionDesc"),
                icon: "fas fa-gears",
                color: "#9b59b6",
                items: methodConflicts.map(c => ({
                    ...c,
                    isMethod: true,
                    modulesHTML: c.modules.map(m => `<span class="pcd-badge module">${m}</span>`).join(" ")
                }))
            });
        }

        // 3. HOOKS (Categories)
        const categories = [
            { id: 'UI & Interface', icon: 'fas fa-palette', color: '#f39c12', key: 'UI' },
            { id: 'Actors & Items', icon: 'fas fa-user-shield', color: '#3498db', key: 'Actor' },
            { id: 'Scene & Map', icon: 'fas fa-map', color: '#2ecc71', key: 'Scene' },
        ];

        categories.forEach(cat => {
            const items = hookReport.contested[cat.id];
            if (items && items.length > 0) {
                boxes.push({
                    title: game.i18n.localize(`PHILSCONSOLEDOCTOR.UI.ConflictCategory.${cat.key}`) || cat.id,
                    desc: game.i18n.localize(`PHILSCONSOLEDOCTOR.UI.ConflictCategory.${cat.key}Desc`),
                    icon: cat.icon,
                    color: cat.color,
                    items: items.map(c => ({
                        ...c,
                        isHook: true,
                        modulesHTML: c.modules.map(m => `<span class="pcd-badge module" style="font-size:0.8em; padding:1px 4px;">${m}</span>`).join(" ")
                    }))
                });
            }
        });

        // Other Hooks
        const otherConflicts = (hookReport.contested['Other'] || []).concat(hookReport.contested['System & Logic'] || []);
        if (otherConflicts.length > 0) {
            boxes.push({
                title: game.i18n.localize("PHILSCONSOLEDOCTOR.UI.ConflictCategory.Other") || "Other Conflicts",
                desc: game.i18n.localize("PHILSCONSOLEDOCTOR.UI.ConflictCategory.OtherDesc"),
                icon: "fas fa-random",
                color: "#95a5a6",
                items: otherConflicts.map(c => ({
                    ...c,
                    isHook: true,
                    modulesHTML: c.modules.map(m => `<span class="pcd-badge module" style="font-size:0.8em; padding:1px 4px;">${m}</span>`).join(" ")
                }))
            });
        }

        // 4. BLOCKED
        if (blockedActions.length > 0) {
            boxes.push({
                title: game.i18n.localize("PHILSCONSOLEDOCTOR.UI.SilentFailures") || "Blocked Actions",
                desc: game.i18n.localize("PHILSCONSOLEDOCTOR.UI.BlockedActionsDesc"),
                icon: "fas fa-ban",
                color: "#7f8c8d",
                items: blockedActions.map(b => ({
                    isBlock: true,
                    module: b.module,
                    hook: b.hook,
                    timestamp: b.timestamp
                }))
            });
        }

        return boxes;
    }

    /** @override */
    _onRender(context, options) {
        super._onRender(context, options);

        // Bind Search InputManually if needed, but 'input' event usually handled by native form?
        // ApplicationV2 doesn't auto-bind 'input' to re-render unless we ask it or use state.
        // We'll attach a listener manually for live search
        const searchInput = this.element.querySelector('input[name="searchQuery"]');
        if (searchInput) {
            searchInput.addEventListener('input', (event) => {
                this.searchQuery = event.target.value;
                // Debounce render
                this._updateListDebounced();
            });
            // Focus management logic could go here
        }
    }

    /* --- ACTION HANDLERS --- */

    onTabSwitch(event, target) {
        const tab = target.dataset.tab;
        this.activeTab = tab;
        this.render(true);
    }

    onToggleFilter(event, target) {
        const filter = target.dataset.filter;
        this.filters[filter] = !this.filters[filter];
        this.render(true);
    }

    onClearConsole(event, target) {
        PCD_CAPTURED_LOGS.length = 0;
        this.render(true);
    }

    async onAskAI(event, target) {
        const id = parseInt(target.dataset.id);
        const log = PCD_CAPTURED_LOGS.find(l => l.id === id);
        if (!log) return;
        await this.generatePrompt(log);
    }

    onToggleRecording(event, target) {
        if (typeof PCDProfiler === 'undefined') return;
        PCDProfiler.toggleProfiling(!PCDProfiler.IS_PROFILING);
        this.render();
    }

    onToggleDiagnosis(event, target) {
        if (typeof PCDProfiler === 'undefined') return;
        PCDProfiler.toggleDiagnosis(!PCDProfiler.IS_DIAGNOSING);
        this.render();
    }

    onRefreshMetrics(event, target) {
        this.render(true);
    }

    onClearMetrics(event, target) {
        if (typeof PCDProfiler !== 'undefined') PCDProfiler.clearData();
        this.render(true);
    }

    onSortMetrics(event, target) {
        const sort = target.dataset.sort;
        if (this.metricsSort === sort) this.metricsSortDesc = !this.metricsSortDesc;
        else {
            this.metricsSort = sort;
            this.metricsSortDesc = true;
        }
        this.render(true);
    }

    static onToggleDiagnosis(event, target) {
        if (typeof PCDProfiler === 'undefined') return;
        PCDProfiler.toggleRecording(!PCDProfiler.IS_RECORDING);
        this.render(true);
    }

    /* --- HELPERS --- */

    // API Hook: Called by window.pcdPatchConsole when new logs arrive
    updateListContent() {
        if (this.activeTab === 'console') {
            this._updateListDebounced();
        }
    }

    async generatePrompt(logEntry) {
        const activeModules = game.modules.filter(m => m.active).map(m => `- ${m.title} (${m.id}) v${m.version} `).join("\n");
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
            const url = game.settings.get(MODULE_ID, 'aiUrl') || 'https://gemini.google.com/app';
            window.open(url, "_blank");
        } catch (e) { ui.notifications.error(game.i18n.localize("PHILSCONSOLEDOCTOR.UI.ClipboardFailed")); }
    }
}

// Global accessor replacement
function openDoctorWindow() {
    if (!ui.philsConsoleDoctor) ui.philsConsoleDoctor = new PhilsConsoleDoctorApp();
    ui.philsConsoleDoctor.render(true);
}

