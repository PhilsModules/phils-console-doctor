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
                    <i class="fas fa-circle"></i> ${game.i18n.localize("PHILSCONSOLEDOCTOR.UI.StartRecording")}
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
            <div class="pcd-header" style="justify-content: space-between;">
                 <h3 style="margin:0; border:none;"><i class="fas fa-shield-halved"></i> ${game.i18n.localize("PHILSCONSOLEDOCTOR.UI.ConflictsTitle") || "Conflict Detector"}</h3>
                 <span style="font-size:0.8em; opacity:0.7;">${game.i18n.localize("PHILSCONSOLEDOCTOR.UI.ConflictsDesc") || "Detects blocked actions & interfering modules"}</span>
            </div>`;

        const conflictsBody = `
            <div id="pcd-conflicts-container" style="padding: 10px; overflow-y: auto; height: 100%;">
                
                <!-- Section 0: Semantic Log Scans (Explicit Incompatibilities) - NEW -->
                <div id="pcd-semantic-conflicts"></div>

                <!-- Section 1: Blocked Actions (Silent Failures) -->
                <div class="pcd-section-box">
                    <h4 style="border-bottom:1px solid rgba(0,0,0,0.1); margin-bottom:5px;">
                        <i class="fas fa-ban" style="color:#ff5555;"></i> ${game.i18n.localize("PHILSCONSOLEDOCTOR.UI.SilentFailures") || "SILENT FAILURES (Blocked Actions)"}
                    </h4>
                    <p style="font-style:italic; font-size:0.9em; opacity:0.8; margin-bottom:10px;">
                        ${game.i18n.localize("PHILSCONSOLEDOCTOR.UI.BlockedActionsDesc") || "These modules explicitly returned 'false' to stop an action. If something isn't working, check here first."}
                    </p>
                    <div id="pcd-blocked-log" style="background:rgba(0,0,0,0.05); padding:5px; border-radius:4px; max-height:150px; overflow-y:auto; font-family:monospace;">
                        <div style="text-align:center; padding:10px; opacity:0.6;">${game.i18n.localize("PHILSCONSOLEDOCTOR.UI.NoBlockedActions") || "No silent failures detected yet."}</div>
                    </div>
                </div>

                <!-- Inspector Tree Container -->
                <div id="pcd-inspector-tree"></div>

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
        const blContainer = this.element.find('#pcd-blocked-log');
        const inspContainer = this.element.find('#pcd-inspector-tree');

        // 0. Semantic Log Scan (Explicit Incompatibilities) - NEW
        const semanticConflicts = PCDInspector.scanLogs(PCD_CAPTURED_LOGS);
        const semanticContainer = this.element.find('#pcd-semantic-conflicts');

        // Helper to render a warning box
        const renderWarningBox = (container, title, items, icon, color, desc, emptyMsg, advice) => {
            const box = $(`<div class="pcd-section-box" style="border-left: 3px solid ${color}; margin-top: 10px;">
                <h5 style="margin:0 0 5px 0; color:${color};"><i class="${icon}"></i> ${title} (${items ? items.length : 0})</h5>
                ${desc ? `<p style="font-size:0.8em; opacity:0.8; margin-bottom:5px;">${desc}</p>` : ''}
                ${(items && items.length > 0 && advice) ? `<p style="font-size:0.8em; background:rgba(0,0,0,0.05); padding:4px; border-radius:3px; margin-bottom:5px;">${advice}</p>` : ''}
            </div>`);

            if (!items || items.length === 0) {
                if (emptyMsg) {
                    box.append($(`<div style="text-align:center; padding:10px; opacity:0.6;">${emptyMsg}</div>`));
                    container.append(box);
                }
            } else {
                items.forEach(c => {
                    // check if item is a semantic conflict (msg + module) or hook conflict (hook + modules array)
                    const isSemantic = c.message !== undefined;
                    let content = "";

                    if (isSemantic) {
                        content = `
                            <div style="margin-bottom:4px; font-size:0.9em;">
                                <strong style="color:${color}">${c.module}</strong>: ${c.message}
                                <br><span style="opacity:0.6; font-size:0.8em;">${c.timestamp}</span>
                            </div>`;
                    } else {
                        const modulesList = c.modules.map(m => `<span class="pcd-badge module" style="font-size:0.8em;">${m}</span>`).join(" ");
                        content = `
                            <div style="margin-bottom:4px; font-size:0.9em;">
                                <span style="font-weight:bold; font-family:monospace;">${c.hook}</span> 
                                <br>${modulesList}
                            </div>`;
                    }

                    box.append($(content));
                });
                container.append(box);
            }
        };

        // Render Semantic Conflicts
        if (semanticContainer.length) {
            semanticContainer.empty();
            renderWarningBox(
                semanticContainer,
                game.i18n.localize("PHILSCONSOLEDOCTOR.UI.ExplicitIncompatibility") || "Explicit Incompatibility",
                semanticConflicts,
                "fas fa-bomb",
                "#ff0000",
                game.i18n.localize("PHILSCONSOLEDOCTOR.UI.ExplicitIncompatibilityDesc"),
                game.i18n.localize("PHILSCONSOLEDOCTOR.UI.NoExplicitConflicts")
            );
        }

        if (typeof PCDProfiler !== 'undefined') {
            const blocks = PCDProfiler.getBlocks();
            if (blocks.length > 0) {
                blContainer.empty();
                blocks.forEach(b => {
                    blContainer.append($(`
                        <div style="padding:4px; border-bottom:1px solid #ddd; font-size:0.9em; display:flex; justify-content:space-between;">
                            <span><strong style="color:#d93131;">${b.module}</strong> blocked <span style="font-family:monospace; background:#eee; padding:0 3px;">${b.hook}</span></span>
                            <span style="opacity:0.6; font-size:0.8em;">${b.timestamp}</span>
                        </div>
                    `));
                });
            } else {
                blContainer.html(`<div style="text-align:center; padding:10px; opacity:0.6;">${game.i18n.localize("PHILSCONSOLEDOCTOR.UI.NoBlockedActions")}</div>`);
            }
        }

        if (typeof PCDInspector !== 'undefined') {
            const report = PCDInspector.scanHooks();
            inspContainer.empty();

            // 1. Critical Conflicts (pre*)
            renderWarningBox(
                inspContainer,
                game.i18n.localize("PHILSCONSOLEDOCTOR.UI.ConflictsTitle") || "Critical Conflicts",
                report.conflicts,
                "fas fa-triangle-exclamation",
                "#d93131",
                game.i18n.localize("PHILSCONSOLEDOCTOR.UI.ConflictsDesc"),
                game.i18n.localize("PHILSCONSOLEDOCTOR.UI.NoCriticalConflicts") || "No critical conflicts detected."
            );

            // 2. UI Contention
            renderWarningBox(
                inspContainer,
                game.i18n.localize("PHILSCONSOLEDOCTOR.UI.TitleUI") || "UI Contention",
                report.uiConflicts,
                "fas fa-palette",
                "#ffaa00",
                game.i18n.localize("PHILSCONSOLEDOCTOR.UI.DescUI"),
                game.i18n.localize("PHILSCONSOLEDOCTOR.UI.NoUIConflicts"),
                game.i18n.localize("PHILSCONSOLEDOCTOR.UI.AdviceUI")
            );

            // 3. Environment Contention
            renderWarningBox(
                inspContainer,
                game.i18n.localize("PHILSCONSOLEDOCTOR.UI.TitleEnv") || "Scene & Environment",
                report.envConflicts,
                "fas fa-cloud-bolt",
                "#3a86ff",
                game.i18n.localize("PHILSCONSOLEDOCTOR.UI.DescEnv"),
                game.i18n.localize("PHILSCONSOLEDOCTOR.UI.NoEnvConflicts"),
                game.i18n.localize("PHILSCONSOLEDOCTOR.UI.AdviceEnv")
            );

            // 5. Inspector Tree (All Categories)
            for (const [catName, hooks] of Object.entries(report.categories)) {
                if (hooks.length === 0) continue;
                const group = $(`<details ${hooks.length < 5 ? 'open' : ''} style="margin-bottom:5px; background:rgba(0,0,0,0.03); border-radius:4px; padding:5px;">
                    <summary style="cursor:pointer; font-weight:bold; padding:2px;">${catName} (${hooks.length})</summary>
                    <div style="padding:5px 0 5px 10px;"></div>
                </details>`);
                const list = group.find('div');
                hooks.sort((a, b) => a.hook.localeCompare(b.hook)).forEach(h => {
                    const tooltip = h.modules.join(", ");
                    const isContested = h.count > 1;
                    list.append($(`
                        <div style="font-size:0.85em; margin-bottom:2px; display:flex; justify-content:space-between; ${isContested ? 'background:rgba(255, 170, 0, 0.1);' : ''}">
                            <span style="font-family:monospace;" title="${tooltip}">${h.hook}</span>
                            <span class="pcd-badge count" style="font-size:0.7em;">${h.count}</span>
                        </div>
                    `));
                });
                inspContainer.append(group);
            }
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