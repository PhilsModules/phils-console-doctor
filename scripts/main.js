/**
 * PHILS CONSOLE DOCTOR
 * Version: 1.4.0 (System Monitor & Refactor)
 */

const MODULE_ID = 'phils-console-doctor';
import { PCDProfiler } from './profiler.js';
import { PCDInspector } from './inspector.js';
import { PCDPatcher } from './patcher.js';

const PCD_CAPTURED_LOGS = [];

// --- UTILS: FUZZY MATCHING (Levenshtein) ---
function getLevenshteinDistance(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) == a.charAt(j - 1)) matrix[i][j] = matrix[i - 1][j - 1];
            else matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
        }
    }
    return matrix[b.length][a.length];
}

function isSimilar(msg1, msg2) {
    if (Math.abs(msg1.length - msg2.length) > 50) return false; // Too different in length
    if (msg1 === msg2) return true;

    // Quick check for numbers (often the only difference)
    const s1 = msg1.replace(/\d/g, '#');
    const s2 = msg2.replace(/\d/g, '#');
    if (s1 === s2) return true;

    // Expensive Levenshtein for short strings, skip for long ones
    if (msg1.length < 100) {
        const dist = getLevenshteinDistance(msg1, msg2);
        return dist < (msg1.length * 0.2); // 20% difference allowed
    }
    return false;
}

// --- LOG HANDLER ---
function handleConsoleLog(type, message, stack, sourceModule) {
    // 1. DEDUPLICATION (Exact Match & Fuzzy Match)
    if (PCD_CAPTURED_LOGS.length > 0) {
        // Check last 5 logs for similarity to group bursts
        const recentLogs = PCD_CAPTURED_LOGS.slice(0, 5);
        for (const log of recentLogs) {
            if (log.type === type && isSimilar(log.message, message)) {
                log.count = (log.count || 1) + 1;
                log.timestamp = new Date().toLocaleTimeString();
                log.similar = true; // Mark as having variations
                updateUI();
                return;
            }
        }
    }

    // 2. NEW ENTRY
    PCD_CAPTURED_LOGS.unshift({
        id: Date.now(),
        timestamp: new Date().toLocaleTimeString(),
        type,
        message,
        stack,
        count: 1,
        sourceModule
    });

    // 3. PRUNE
    let max = 50;
    try {
        max = game.settings.get(MODULE_ID, 'maxLogs');
    } catch (e) { /* Settings not yet initialized */ }

    if (PCD_CAPTURED_LOGS.length > max) PCD_CAPTURED_LOGS.length = max;

    updateUI();
}

let _uiUpdateTimeout;
function updateUI() {
    if (ui.philsConsoleDoctor?.rendered) {
        clearTimeout(_uiUpdateTimeout);
        _uiUpdateTimeout = setTimeout(() => ui.philsConsoleDoctor.updateListContent(), 100);
    }
}

// --- INITIALIZATION ---
// Initialize Patcher immediately
PCDPatcher.setLogHandler(handleConsoleLog);
PCDProfiler.init(); // This also Inits Patcher

console.log("🏥 Phils Console Doctor active (Refactored Core).");

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
        editable: [{ key: "KeyK", modifiers: ["Control", "Alt"] }],
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

// --- APPLICATION V2 ---
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

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
            title: "Console Doctor",
            icon: "fas fa-stethoscope",
            resizable: true,
            contentClasses: ["phils-console-doctor-window"]
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
                data = data.map(d => ({ ...d, avg: d.count > 0 ? (d.totalTime / d.count) : 0 }));
                data.sort((a, b) => {
                    let valA = a[this.metricsSort];
                    let valB = b[this.metricsSort];
                    if (typeof valA === 'string') { valA = valA.toLowerCase(); valB = valB.toLowerCase(); }
                    if (valA < valB) return this.metricsSortDesc ? 1 : -1;
                    if (valA > valB) return this.metricsSortDesc ? -1 : 1;
                    return 0;
                });
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

    _prepareConflictBoxes() {
        // Reuse existing logic, now powered by better data
        const semanticConflicts = PCDInspector.scanLogs(PCD_CAPTURED_LOGS);
        const methodConflicts = PCDInspector.scanMethods(PCD_CAPTURED_LOGS);
        const hookReport = PCDInspector.scanHooks();
        const blockedActions = PCDProfiler.getBlocks();

        const boxes = [];

        // 1. EXPLICIT
        if (semanticConflicts.length > 0) {
            boxes.push({
                title: game.i18n.localize("PHILSCONSOLEDOCTOR.UI.ExplicitIncompatibility") || "Explicit Incompatibility",
                desc: game.i18n.localize("PHILSCONSOLEDOCTOR.UI.ExplicitIncompatibilityDesc"),
                icon: "fas fa-bomb",
                color: "#ff3333",
                items: semanticConflicts
            });
        }

        // 2. METHOD
        if (methodConflicts.length > 0) {
            boxes.push({
                title: game.i18n.localize("PHILSCONSOLEDOCTOR.UI.MethodContention") || "Method Conflicts",
                desc: game.i18n.localize("PHILSCONSOLEDOCTOR.UI.MethodContentionDesc"),
                icon: "fas fa-gears",
                color: "#9b59b6",
                items: methodConflicts.map(c => ({
                    ...c,
                    modulesHTML: c.modules.map(m => `<span class="pcd-badge module">${m}</span>`).join(" ")
                }))
            });
        }

        // 3. BLOCKED (Prioritize this new feature)
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

        // 4. HOOKS
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

        return boxes;
    }

    /** @override */
    _onRender(context, options) {
        super._onRender(context, options);
        const searchInput = this.element.querySelector('input[name="searchQuery"]');
        if (searchInput) {
            searchInput.addEventListener('input', (event) => {
                this.searchQuery = event.target.value;
                this._updateListDebounced();
            });
            searchInput.value = this.searchQuery; // Maintain focus ref
        }
    }

    /* --- ACTION HANDLERS --- */
    onTabSwitch(event, target) {
        this.activeTab = target.dataset.tab;
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
    onRefreshMetrics() { this.render(true); }
    onClearMetrics() {
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

function openDoctorWindow() {
    if (!ui.philsConsoleDoctor) ui.philsConsoleDoctor = new PhilsConsoleDoctorApp();
    ui.philsConsoleDoctor.render(true);
}
