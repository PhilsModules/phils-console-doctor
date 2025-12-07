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
function pcdPatchConsole() {
    if (window.pcdPatched) return;
    window.pcdPatched = true;

    function capture(type, args) {
        const msg = args.map(a => {
            if (a instanceof Error) return `${a.message}`;
            if (a instanceof Event) {
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

        // Smart Grouping
        if (PCD_CAPTURED_LOGS.length > 0) {
            const lastEntry = PCD_CAPTURED_LOGS[0];
            if (lastEntry.message === msg && lastEntry.type === type) {
                lastEntry.count = (lastEntry.count || 1) + 1;
                lastEntry.timestamp = new Date().toLocaleTimeString();
                if (typeof ui !== 'undefined' && ui.philsConsoleDoctor && ui.philsConsoleDoctor.rendered) {
                    ui.philsConsoleDoctor.updateListContent();
                }
                return;
            }
        }

        // Module Blame
        let sourceModule = null;
        if (stack) {
            const match = stack.match(/modules\/([^\/]+)\//);
            if (match && match[1] && match[1] !== MODULE_ID) {
                const moduleId = match[1];
                if (typeof game !== 'undefined' && game.modules) {
                    const module = game.modules.get(moduleId);
                    sourceModule = {
                        id: moduleId,
                        title: module ? module.title : moduleId
                    };
                } else {
                    sourceModule = { id: moduleId, title: moduleId };
                }
            }
        }

        const entry = {
            id: Date.now(),
            timestamp: new Date().toLocaleTimeString(),
            type,
            message: msg,
            stack,
            count: 1,
            sourceModule
        };

        PCD_CAPTURED_LOGS.unshift(entry);

        let max = 50;
        try {
            if (typeof game !== 'undefined' && game.settings && game.settings.get) {
                max = game.settings.get(MODULE_ID, 'maxLogs') || 50;
            }
        } catch (e) { }

        if (PCD_CAPTURED_LOGS.length > max) PCD_CAPTURED_LOGS.pop();

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

    window.addEventListener('error', (event) => {
        capture('error', [`[Uncaught Exception] ${event.message}`, event.error]);
    });

    window.addEventListener('error', (event) => {
        if (event instanceof Event && event.target && (event.target.src || event.target.href)) {
            capture('error', [event]);
        }
    }, true);

    window.addEventListener('unhandledrejection', (event) => {
        capture('error', [`[Unhandled Promise Rejection] ${event.reason}`]);
    });

    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
        try {
            const response = await originalFetch(...args);
            if (!response.ok) {
                capture('error', [`[Network Error] Fetch failed: ${response.status} ${response.statusText} (${args[0]})`]);
            }
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
        this.addEventListener('error', () => {
            capture('error', [`[Network Error] XHR failed: ${this._pcdMethod} ${this._pcdUrl}`]);
        });
        return originalXhrSend.apply(this, arguments);
    };

    console.log("🏥 Phils Console Doctor active (Fast Start Mode).");
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
    const element = html instanceof HTMLElement ? html : html[0];
    if (element.querySelector('[data-action="open-pcd"]')) return;

    const container = document.createElement("div");
    container.className = "pcd-sidebar-container";
    container.style.marginTop = "10px";
    container.style.marginBottom = "10px";

    const button = document.createElement("button");
    button.dataset.action = "open-pcd";
    button.type = "button";
    button.className = "pcd-sidebar-btn";
    button.innerHTML = `<i class="fas fa-stethoscope"></i> Console Doctor`;
    button.onclick = (ev) => { ev.preventDefault(); openDoctorWindow(); };

    container.appendChild(button);
    element.appendChild(container);
});

function openDoctorWindow() {
    if (!ui.philsConsoleDoctor) ui.philsConsoleDoctor = new PhilsConsoleDoctorApp();
    ui.philsConsoleDoctor.render(true);
}

class PhilsConsoleDoctorApp extends Application {
    constructor() {
        super();
        this.filters = { warn: true, error: true };
        this.searchQuery = "";
        this.activeTab = 'console';
        this.metricsSort = 'totalTime';
        this.metricsSortDesc = true;
    }

    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: "phils-console-doctor-app",
            title: "Console Doctor",
            width: 700,
            height: 600,
            template: null,
            classes: ["phils-console-doctor-window"],
            resizable: true
        });
    }

    render(force, options) {
        if (!force && !this.element) return;
        if (!this.element || force) { super.render(force, options); return; }
        this.updateContent();
    }

    _renderInner(data) {
        const nav = `
            <nav class="pcd-tabs">
                <a class="pcd-tab-btn ${this.activeTab === 'console' ? 'active' : ''}" data-tab="console">
                    <i class="fas fa-terminal"></i> ${game.i18n.localize("PHILSCONSOLEDOCTOR.UI.TabConsole") || "Console"}
                </a>
                <a class="pcd-tab-btn ${this.activeTab === 'metrics' ? 'active' : ''}" data-tab="metrics">
                    <i class="fas fa-tachometer-alt"></i> ${game.i18n.localize("PHILSCONSOLEDOCTOR.UI.TabPerformance") || "Performance"}
                </a>
                <a class="pcd-tab-btn ${this.activeTab === 'conflicts' ? 'active' : ''}" data-tab="conflicts">
                    <i class="fas fa-shield-halved"></i> ${game.i18n.localize("PHILSCONSOLEDOCTOR.UI.TabConflicts") || "Conflicts"}
                </a>
            </nav>
        `;

        const consoleHeader = `
            <div class="pcd-header">
                <div class="pcd-search-container" style="flex: 1; margin-right: 5px;">
                    <input type="text" id="pcd-search-input" placeholder="${game.i18n.localize("PHILSCONSOLEDOCTOR.UI.SearchPlaceholder")}" value="${this.searchQuery}" style="width: 100%; box-sizing: border-box;">
                </div>
                <button class="pcd-filter-btn ${this.filters.warn ? 'active' : ''}" data-filter="warn">
                    <i class="fas fa-exclamation-triangle"></i> ${game.i18n.localize("PHILSCONSOLEDOCTOR.UI.Warn")}
                </button>
                <button class="pcd-filter-btn ${this.filters.error ? 'active' : ''}" data-filter="error">
                    <i class="fas fa-times-circle"></i> ${game.i18n.localize("PHILSCONSOLEDOCTOR.UI.Error")}
                </button>
                <button class="pcd-filter-btn" data-action="clear-console" style="flex: 0 0 50px;" title="${game.i18n.localize("PHILSCONSOLEDOCTOR.UI.ClearLog")}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>`;
        const consoleBody = `<div class="pcd-log-list" id="pcd-list-container"></div>`;

        const metricsHeader = `
            <div class="pcd-header">
                <button class="pcd-control-btn" id="pcd-btn-record">
                    <i class="fas fa-circle" style="color: #ff5555;"></i> ${game.i18n.localize("PHILSCONSOLEDOCTOR.UI.StartRecording")}
                </button>
                <button class="pcd-control-btn" id="pcd-btn-stop" style="display:none; color: #ff5555;">
                    <i class="fas fa-stop"></i> ${game.i18n.localize("PHILSCONSOLEDOCTOR.UI.StopRecording")}
                </button>
                <button class="pcd-control-btn" id="pcd-btn-refresh">
                    <i class="fas fa-sync"></i> ${game.i18n.localize("PHILSCONSOLEDOCTOR.UI.Refresh")}
                </button>
                <button class="pcd-control-btn" id="pcd-btn-clear-metrics">
                    <i class="fas fa-trash"></i> ${game.i18n.localize("PHILSCONSOLEDOCTOR.UI.Clear")}
                </button>
            </div>
            <div class="pcd-table-header">
                <div class="pcd-col col-module" data-sort="module">${game.i18n.localize("PHILSCONSOLEDOCTOR.UI.Module")}</div>
                <div class="pcd-col col-hook" data-sort="hook">${game.i18n.localize("PHILSCONSOLEDOCTOR.UI.Hook")}</div>
                <div class="pcd-col col-time" data-sort="totalTime">${game.i18n.localize("PHILSCONSOLEDOCTOR.UI.TotalTime")} (ms)</div>
                <div class="pcd-col col-count" data-sort="count">${game.i18n.localize("PHILSCONSOLEDOCTOR.UI.Count")}</div>
                <div class="pcd-col col-avg" data-sort="avg">${game.i18n.localize("PHILSCONSOLEDOCTOR.UI.AvgTime")} (ms)</div>
            </div>
        `;
        const metricsBody = `<div class="pcd-metrics-list" id="pcd-metrics-container"></div>`;

        const conflictsHeader = `
            <div class="pcd-header" style="justify-content: space-between; align-items: center;">
                 <h3 style="margin:0; border:none; flex-grow:1;"><i class="fas fa-shield-halved"></i> ${game.i18n.localize("PHILSCONSOLEDOCTOR.UI.ConflictsTitle") || "Conflict Detector"}</h3>
                 
                 <button class="pcd-control-btn" id="pcd-btn-detective-record" style="flex: 0 0 auto; width: auto; font-size: 0.8rem; padding: 2px 8px; line-height: 1.5; border: 1px solid rgba(0,0,0,0.2); ${PCDProfiler.IS_RECORDING ? 'color: #ff5555; border-color: #ff5555;' : ''}">
                    <i class="fas ${PCDProfiler.IS_RECORDING ? 'fa-stop' : 'fa-circle'}" style="font-size: 0.7rem; vertical-align: middle; ${PCDProfiler.IS_RECORDING ? 'color: inherit;' : 'color: #ff5555;'}"></i> <span style="vertical-align: middle;">${PCDProfiler.IS_RECORDING ? (game.i18n.localize("PHILSCONSOLEDOCTOR.UI.StopDiagnosis") || "Stop Diagnosis") : (game.i18n.localize("PHILSCONSOLEDOCTOR.UI.StartDiagnosis") || "Live Diagnosis")}</span>
                 </button>
            </div>`;

        const conflictsBody = `
            <div id="pcd-conflicts-container" style="padding: 10px; overflow-y: auto; height: 100%;">
                
                <!-- Dynamic Content Container -->
                <div id="pcd-conflicts-list"></div>

                <div id="pcd-no-conflicts" style="display:none; text-align:center; padding: 40px; color:#7a7971; font-style:italic;">
                    <i class="fas fa-check-circle" style="font-size: 3em; color: #2ecc71; margin-bottom: 15px; display: block;"></i>
                    ${game.i18n.localize("PHILSCONSOLEDOCTOR.UI.NoConflicts") || "All systems operational. No conflicts detected."}
                </div>

            </div>`;

        let content = nav;
        if (this.activeTab === 'console') content += consoleHeader + consoleBody;
        else if (this.activeTab === 'metrics') content += metricsHeader + metricsBody;
        else content += conflictsHeader + conflictsBody;

        return $(`<div class="pcd-main-layout">${content}</div>`);
    }

    activateListeners(html) {
        html = $(html); super.activateListeners(html);
        this.listContainer = html.find('#pcd-list-container');
        this.metricsContainer = html.find('#pcd-metrics-container');

        html.find('.pcd-tab-btn').click(ev => {
            ev.preventDefault();
            this.activeTab = ev.currentTarget.dataset.tab;
            this.render(true);
        });

        if (this.activeTab === 'console') {
            this.updateListContent();
            html.find('.pcd-filter-btn[data-filter]').click(ev => {
                ev.preventDefault();
                const f = ev.currentTarget.dataset.filter;
                this.filters[f] = !this.filters[f];
                $(ev.currentTarget).toggleClass('active', this.filters[f]);
                this.updateListContent();
            });
            html.find('#pcd-search-input').on('input', ev => {
                this.searchQuery = ev.target.value.toLowerCase();
                this.updateListContent();
            });
            html.find('[data-action="clear-console"]').click(ev => {
                ev.preventDefault();
                PCD_CAPTURED_LOGS.length = 0;
                this.updateListContent();
            });
        } else if (this.activeTab === 'metrics') {
            this.updateMetricsContent();
            if (typeof PCDProfiler === 'undefined') return;

            const btnRecord = html.find('#pcd-btn-record');
            const btnStop = html.find('#pcd-btn-stop');
            const updateRecordBtns = () => {
                if (PCDProfiler.IS_RECORDING) {
                    btnRecord.hide();
                    btnStop.show();
                } else {
                    btnRecord.show();
                    btnStop.hide();
                }
            };
            updateRecordBtns();

            btnRecord.click(ev => { PCDProfiler.toggleRecording(true); updateRecordBtns(); });
            btnStop.click(ev => { PCDProfiler.toggleRecording(false); updateRecordBtns(); this.updateMetricsContent(); });
            html.find('#pcd-btn-refresh').click(ev => { this.updateMetricsContent(); });
            html.find('#pcd-btn-clear-metrics').click(ev => { PCDProfiler.clearData(); this.updateMetricsContent(); });
            html.find('.pcd-col[data-sort]').click(ev => {
                const sort = ev.currentTarget.dataset.sort;
                if (this.metricsSort === sort) this.metricsSortDesc = !this.metricsSortDesc;
                else { this.metricsSort = sort; this.metricsSortDesc = true; }
                this.updateMetricsContent();
            });
        } else {
            this.updateConflictsContent();

            const btnRec = html.find('#pcd-btn-detective-record');

            btnRec.click(ev => {
                const isRecording = !PCDProfiler.IS_RECORDING;
                PCDProfiler.toggleRecording(isRecording);

                // Update Button Visuals
                if (isRecording) {
                    btnRec.css({ 'color': '#ff5555', 'border-color': '#ff5555' }).html(`<i class="fas fa-stop" style="font-size: 0.7rem;"></i> ${game.i18n.localize("PHILSCONSOLEDOCTOR.UI.StopDiagnosis") || "Stop Diagnosis"}`);
                    this.updateConflictsContent(); // Refresh to show "Listening..."
                } else {
                    btnRec.css({ 'color': '', 'border-color': '' }).html(`<i class="fas fa-circle" style="font-size: 0.7rem; color: #ff5555;"></i> ${game.i18n.localize("PHILSCONSOLEDOCTOR.UI.StartDiagnosis") || "Live Diagnosis"}`);
                    this.updateConflictsContent(); // Refresh to potentially show new blocks
                }
            });
        }
    }

    updateContent() {
        if (this.activeTab === 'console') this.updateListContent();
        else if (this.activeTab === 'metrics') this.updateMetricsContent();
        else this.updateConflictsContent();
    }

    updateListContent() {
        if (!this.listContainer || !this.listContainer.length) return;
        this.listContainer.empty();

        const visibleLogs = PCD_CAPTURED_LOGS.filter(l => {
            if (!this.filters[l.type]) return false;
            if (this.searchQuery) {
                const query = this.searchQuery;
                return l.message.toLowerCase().includes(query) || (l.stack && l.stack.toLowerCase().includes(query));
            }
            return true;
        });

        if (visibleLogs.length === 0) {
            this.listContainer.append($(`<div style="padding:40px; text-align:center; color:#7a7971; font-style:italic;">${game.i18n.localize("PHILSCONSOLEDOCTOR.UI.NoEntries")}</div>`));
            return;
        }

        visibleLogs.forEach(log => {
            const row = $(`
                <div class="pcd-entry ${log.type}">
                    <div class="pcd-meta">
                        <span><i class="far fa-clock"></i> ${log.timestamp}</span>
                        <span style="opacity:0.8">${log.type.toUpperCase()}</span>
                        ${log.count > 1 ? `<span class="pcd-badge count" title="Occurred ${log.count} times">x${log.count}</span>` : ''}
                        ${log.sourceModule ? `<span class="pcd-badge module" title="Source: ${log.sourceModule.title}">${log.sourceModule.title}</span>` : ''}
                    </div>
                    <div class="pcd-message">${log.message}</div>
                    <div class="pcd-action-area">
                        <button class="pcd-ask-btn">
                            <i class="fas fa-magic"></i> ${game.i18n.localize("PHILSCONSOLEDOCTOR.UI.AskAI")}
                        </button>
                    </div>
                </div>
            `);

            row.find('.pcd-ask-btn').click((e) => {
                e.stopPropagation();
                this.generatePrompt(log);
            });
            this.listContainer.append(row);
        });
    }

    updateMetricsContent() {
        if (!this.metricsContainer || !this.metricsContainer.length) return;
        this.metricsContainer.empty();
        if (typeof PCDProfiler === 'undefined') {
            this.metricsContainer.append($(`<div style="padding:40px; text-align:center; color:#ff5555;">ERROR: Profiler not loaded.<br>Please contact developer.</div>`));
            return;
        }

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

        if (data.length === 0) {
            this.metricsContainer.append($(`<div style="padding:40px; text-align:center; color:#7a7971; font-style:italic;">${game.i18n.localize("PHILSCONSOLEDOCTOR.UI.NoMetrics")}</div>`));
            return;
        }

        data.forEach(d => {
            let rowClass = "";
            if (d.totalTime > 500) rowClass = "high-impact";
            else if (d.totalTime > 100) rowClass = "med-impact";

            const row = $(`
                <div class="pcd-metric-row ${rowClass}">
                    <div class="pcd-col col-module" title="${d.module}">${d.module}</div>
                    <div class="pcd-col col-hook" title="${d.hook}">${d.hook}</div>
                    <div class="pcd-col col-time">${d.totalTime.toFixed(2)}</div>
                    <div class="pcd-col col-count">${d.count}</div>
                    <div class="pcd-col col-avg">${d.avg.toFixed(3)}</div>
                </div>
            `);
            this.metricsContainer.append(row);
        });
    }

    updateConflictsContent() {
        const listContainer = this.element.find('#pcd-conflicts-list');
        const noConflictsMsg = this.element.find('#pcd-no-conflicts');

        if (!listContainer.length) return;
        listContainer.empty();
        let hasConflicts = false;

        // 0. GATHER DATA
        // Semantic Log Scan (Explicit Incompatibilities)
        const semanticConflicts = PCDInspector.scanLogs(PCD_CAPTURED_LOGS);

        // Method Contention (libWrapper + Logs)
        const methodConflicts = PCDInspector.scanMethods(PCD_CAPTURED_LOGS);

        // Hook Contention (Everything else)
        const hookReport = PCDInspector.scanHooks();

        // Check if recording is active
        const isRecording = typeof PCDProfiler !== 'undefined' && PCDProfiler.IS_RECORDING;

        // Blocked Actions (Profiler)
        let blockedActions = [];
        if (typeof PCDProfiler !== 'undefined') {
            blockedActions = PCDProfiler.getBlocks();
        }

        // Helper to render a warning box
        const renderSection = (title, items, icon, color, desc) => {
            if (!items || items.length === 0) return; // STRICTLY HIDE IF EMPTY
            hasConflicts = true;

            const box = $(`<div class="pcd-section-box" style="border-left: 4px solid ${color}; margin-top: 10px;">
                <h5 style="margin:0 0 5px 0; color:${color}; font-size:1.1em;"><i class="${icon}"></i> ${title} (${items.length})</h5>
                ${desc ? `<p style="font-size:0.9em; opacity:0.8; margin-bottom:8px; line-height:1.3;">${desc}</p>` : ''}
            </div>`);

            const list = $(`<div style="max-height: 250px; overflow-y: auto; padding-right:5px;"></div>`);

            items.forEach(c => {
                let content = "";
                // Render Logic based on item type
                if (c.message) {
                    // Semantic
                    content = `
                        <div class="pcd-conflict-item" style="border-left-color:${color}40;">
                            <div style="font-weight:bold; color:${color};">${c.module}</div>
                            <div style="font-size:0.95em;">${c.message}</div>
                            <div style="font-size:0.8em; opacity:0.6; text-align:right; margin-top:2px;">${c.timestamp}</div>
                        </div>`;
                } else if (c.target) {
                    // Method
                    const mods = c.modules.map(m => `<span class="pcd-badge module">${m}</span>`).join(" ");
                    content = `
                    <div class="pcd-conflict-item" style="border-left-color:${color}40;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span style="font-family:monospace; font-weight:bold; font-size:1em;">${c.target}</span>
                            <span class="pcd-badge count" style="background:${color}20; color:${color};">x${c.count}</span>
                        </div>
                        <div style="margin-top:4px; font-size:0.9em opacity:0.9;">${mods}</div>
                    </div>`;
                } else if (c.hook) {
                    // Hook
                    const mods = c.modules.map(m => `<span class="pcd-badge module" style="font-size:0.8em; padding:1px 4px;">${m}</span>`).join(" ");
                    content = `
                    <div class="pcd-conflict-item" style="border-left-color:${color}40;">
                        <div style="display:flex; justify-content:space-between;">
                            <span style="font-family:monospace; font-weight:bold;">${c.hook}</span>
                            <span class="pcd-badge count">x${c.count}</span>
                        </div>
                        <div style="margin-top:3px; font-size:0.85em; opacity:0.8; line-height:1.4;">${mods}</div>
                    </div>`;
                } else if (c.block) {
                    // Blocked Action
                    content = `
                        <div class="pcd-conflict-item" style="border-left-color:${color}40;">
                            <div><strong style="color:${color};">${c.module}</strong> blockierte <span style="font-family:monospace;">${c.hook}</span></div>
                            <div style="font-size:0.8em; opacity:0.6;">${c.timestamp}</div>
                        </div>`;
                }

                list.append(content);
            });
            box.append(list);
            listContainer.append(box);
        };

        // 1. RENDER EXPLICIT INCOMPATIBILITIES (Priority #1 - Red)
        renderSection(
            game.i18n.localize("PHILSCONSOLEDOCTOR.UI.ExplicitIncompatibility") || "Explizite Inkompatibilitäten",
            semanticConflicts,
            "fas fa-bomb",
            "#ff3333", // Red
            game.i18n.localize("PHILSCONSOLEDOCTOR.UI.ExplicitIncompatibilityDesc") || "Diese Module haben bekannte Konflikte gemeldet."
        );

        // 2. RENDER METHOD CONFLICTS (Priority #2 - Purple)
        renderSection(
            game.i18n.localize("PHILSCONSOLEDOCTOR.UI.MethodContention") || "Methoden-Konflikte (Logic & System)",
            methodConflicts,
            "fas fa-gears",
            "#9b59b6", // Purple
            game.i18n.localize("PHILSCONSOLEDOCTOR.UI.MethodContentionDesc") || "Kritisch: Mehrere Module überschreiben dieselbe Kernfunktion."
        );

        // 3. RENDER HOOK CONFLICTS (Priority #3 - Categories)
        renderSection(
            game.i18n.localize("PHILSCONSOLEDOCTOR.UI.ConflictCategory.UI") || "UI & Interface Contention",
            hookReport.contested['UI & Interface'],
            "fas fa-palette",
            "#f39c12",
            game.i18n.localize("PHILSCONSOLEDOCTOR.UI.ConflictCategory.UIDesc") || "Modules modifying the same UI elements."
        );

        renderSection(
            game.i18n.localize("PHILSCONSOLEDOCTOR.UI.ConflictCategory.Actor") || "Actor & Item Conflicts",
            hookReport.contested['Actors & Items'],
            "fas fa-user-shield",
            "#3498db",
            game.i18n.localize("PHILSCONSOLEDOCTOR.UI.ConflictCategory.ActorDesc") || "Conflicts during Actor/Item updates."
        );

        renderSection(
            game.i18n.localize("PHILSCONSOLEDOCTOR.UI.ConflictCategory.Scene") || "Scene & Map Conflicts",
            hookReport.contested['Scene & Map'],
            "fas fa-map",
            "#2ecc71",
            game.i18n.localize("PHILSCONSOLEDOCTOR.UI.ConflictCategory.SceneDesc") || "Conflicts during Scene/Token updates."
        );

        const otherConflicts = hookReport.contested['Other'].concat(hookReport.contested['System & Logic']);
        renderSection(
            game.i18n.localize("PHILSCONSOLEDOCTOR.UI.ConflictCategory.Other") || "Other Conflicts",
            otherConflicts,
            "fas fa-random",
            "#95a5a6",
            game.i18n.localize("PHILSCONSOLEDOCTOR.UI.ConflictCategory.OtherDesc") || "Various other hook conflicts."
        );

        // 4. RENDER BLOCKED ACTIONS (Priority #4 - Grey)
        // Transform block data to match general structure
        const formattedBlocks = blockedActions.map(b => ({
            block: true,
            module: b.module,
            hook: b.hook,
            timestamp: b.timestamp
        }));

        renderSection(
            game.i18n.localize("PHILSCONSOLEDOCTOR.UI.SilentFailures") || "STILLE FEHLER (Blockierte Aktionen)",
            formattedBlocks,
            "fas fa-ban",
            "#7f8c8d", // Grey
            game.i18n.localize("PHILSCONSOLEDOCTOR.UI.BlockedActionsDesc") || "Diese Module haben eine Aktion mit 'return false' verhindert."
        );

        // 5. EMPTY STATE
        // 5. EMPTY STATE / RECORDING STATE
        if (!hasConflicts) {
            if (isRecording) {
                noConflictsMsg.html(`
                    <i class="fas fa-heartbeat fa-pulse" style="font-size: 3em; color: #e74c3c; margin-bottom: 15px; display: block;"></i>
                    <div style="font-weight:bold; margin-bottom:5px;">${game.i18n.localize("PHILSCONSOLEDOCTOR.UI.Diagnosing") || "Diagnosing Silent Failures..."}</div>
                    <div style="font-size:0.8em; opacity:0.7;">${game.i18n.localize("PHILSCONSOLEDOCTOR.UI.PerformActions") || "Perform the action that is failing (e.g. roll a dice, open a sheet)."}</div>
                `).show();
            } else {
                noConflictsMsg.html(`
                    <i class="fas fa-check-circle" style="font-size: 3em; color: #2ecc71; margin-bottom: 15px; display: block;"></i>
                    ${game.i18n.localize("PHILSCONSOLEDOCTOR.UI.NoConflicts") || "All systems operational. No conflicts detected."}
                `).show();
            }
        } else {
            if (isRecording) {
                // Prepend a small recording indicator if conflicts exist
                listContainer.prepend($(`<div style="background:rgba(231, 76, 60, 0.1); color:#c0392b; padding:8px; text-align:center; border-radius:4px; margin-bottom:10px; font-size:0.9em;">
                    <i class="fas fa-circle fa-beat" style="font-size:0.8em; margin-right:5px;"></i> ${game.i18n.localize("PHILSCONSOLEDOCTOR.UI.DiagnosisRunning") || "Live Diagnosis Running..."}
                 </div>`));
            }
            noConflictsMsg.hide();
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
            window.open(game.settings.get(MODULE_ID, 'aiUrl'), "_blank");
        } catch (e) { ui.notifications.error(game.i18n.localize("PHILSCONSOLEDOCTOR.UI.ClipboardFailed")); }
    }
}
