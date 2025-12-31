/**
 * PHILS CONSOLE DOCTOR
 * Version: 1.4.0 (System Monitor & Refactor)
 */

const MODULE_ID = 'phils-console-doctor';
import { PCDProfiler } from './profiler.js';
import { PCDInspector } from './inspector.js';
import { PCDPatcher } from './patcher.js';
import { PCDResolver } from './resolver.js';

const PCD_CAPTURED_LOGS = [];
const PCD_CAPTURED_EVENTS = [];

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

let floodHistory = {};
let isFloodProtectionActive = true;
const ignoredFloods = new Set();

function handleEvent(eventData) {
    if (!isFloodProtectionActive) return; 

    // --- DEBUG RAW INPUT ---
    // console.log("PCD RAW:", eventData.type, eventData.data); 

    PCD_CAPTURED_EVENTS.unshift(eventData);
    if (PCD_CAPTURED_EVENTS.length > 50) PCD_CAPTURED_EVENTS.length = 50;

    // --- FLOOD DETECTION ---
    const now = Date.now();
    let key = eventData.type;
    
    if (key === 'Hook') {
        const match = eventData.data.match(/^([\w\.]+)/);
        if (match) key += ` (${match[1]})`;
    }

    if (ignoredFloods.has(key)) return; 

    // Get Settings (Safely)
    let threshold = 5;
    let windowMs = 5000;
    try {
        threshold = game.settings.get(MODULE_ID, 'floodThreshold');
        windowMs = game.settings.get(MODULE_ID, 'floodWindow') * 1000;
    } catch(e) {}

    if (!floodHistory[key]) floodHistory[key] = [];
    
    // Clean old
    floodHistory[key] = floodHistory[key].filter(t => (now - t) < windowMs);
    floodHistory[key].push(now);

    const count = floodHistory[key].length;
    
    if (count > threshold) {
        triggerFloodProtection(key, eventData, threshold, windowMs);
    } else {
        updateUI();
    }
}

// --- FALLBACK: CHAT REPETITION POLLER ---
// Detects "Slow Loops" where the SAME message content appears repeatedly.
let _chatPollInterval = null;
let _lastMsgId = null;
let _repetitionCount = 0;
let _lastContentHash = "";

function startChatPoller() {
    if (_chatPollInterval) clearInterval(_chatPollInterval);
    
    _chatPollInterval = setInterval(() => {
        // Only run if we are actively profiling/recording
        if (!PCDPatcher.IS_PROFILING) return;

        const lastMsg = game.messages.contents[game.messages.contents.length - 1];
        if (!lastMsg) return;

        // Skip if we already checked this message
        if (lastMsg.id === _lastMsgId) return;
        _lastMsgId = lastMsg.id;

        // Create a signature of the content (flavor + content)
        // We strip numbers to catch "Damage: 5" vs "Damage: 8" variations if desired, 
        // but for exact loops, strict match is better.
        const currentHash = (lastMsg.flavor || "") + (lastMsg.content || "");
        
        if (currentHash === _lastContentHash && currentHash.length > 5) {
            _repetitionCount++;
            // console.log(`PCD POLLER: Repetition #${_repetitionCount}`);
        } else {
            _repetitionCount = 0;
            _lastContentHash = currentHash;
        }

        // Trigger if 3 IDENTICAL messages appear in sequence (regardless of time)
        if (_repetitionCount >= 3) {
            const suspectModules = new Set();
            const flags = lastMsg.flags || {};
            Object.keys(flags).forEach(k => {
                if (k !== 'core' && k !== 'exportSource' && k !== 'meridiander') suspectModules.add(k);
            });

            // Also check 'speaker' alias if it matches a module title
            if (lastMsg.alias) {
                 const mod = game.modules.find(m => m.title === lastMsg.alias);
                 if (mod) suspectModules.add(mod.id);
            }

            console.warn(`PCD POLLER: Detected recursive chat spam (${_repetitionCount} repeats).`);
            
            triggerFloodProtection("Repetitive Chat Spam", {
                type: "ChatLoop",
                data: `Repeating Message: "${lastMsg.flavor || "..."}"`,
                source: { 
                    id: "poller", 
                    title: "Chat Log Poller" 
                },
                suspectIds: Array.from(suspectModules), // Pass structured IDs
                timestamp: new Date().toLocaleTimeString()
            });

            // Reset to prevent infinite dialog loop
            _repetitionCount = 0; 
        }
    }, 1000); // Check every second (sufficient for 1Hz loops)
}

Hooks.once('ready', () => {
    startChatPoller();
});

function triggerFloodProtection(key, sampleEvent, threshold = 5, windowMs = 5000) {
    isFloodProtectionActive = false; // Stop monitoring
    console.error(`PCD FLOOD PROTECTION: Detected loop on '${key}'. Pausing listener.`);
    
    // Analyze Suspects -> Normalize to Objects {id, title}
    let suspects = [];
    let suggestion = "";

    // 1. Explicit Suspect IDs (from Poller)
    if (sampleEvent.suspectIds && Array.isArray(sampleEvent.suspectIds)) {
        suspects = sampleEvent.suspectIds.map(id => {
            const mod = game.modules.get(id);
            return { id: id, title: mod?.title || id };
        });
        suggestion = game.i18n.localize("PHILSCONSOLEDOCTOR.Flood.Suggestion") || "One of these modules is likely causing the loop.";
    }
    // 2. Direct Source
    else if (sampleEvent.source && sampleEvent.source.id !== "unknown" && sampleEvent.source.id !== "phils-console-doctor" && sampleEvent.source.id !== "poller") {
        suspects.push({ id: sampleEvent.source.id, title: sampleEvent.source.title });
        suggestion = game.i18n.localize("PHILSCONSOLEDOCTOR.Flood.SuggestionDirect") || "This module triggered the event directly.";
    } 
    // 3. Hook Listeners
    else if (sampleEvent.type === 'Hook') {
        const match = sampleEvent.data.match(/^([\w\.]+)/);
        if (match) {
            const hookName = match[1];
            // PCDInspector.getListeners returns ID strings? Let's assume so or map them.
            // If they are formatted strings, we might fail to get ID. 
            // Let's rely on the previous assumption they were useful names.
            const listeners = PCDInspector.getListeners(hookName); 
            // Try to map back to objects if they are just strings
            suspects = listeners.map(l => {
                // heuristic: if listener string, assume it's an ID or Title. 
                // Inspector usually attempts to return ID if found.
                const mod = game.modules.get(l) || game.modules.find(m => m.title === l);
                return { id: mod?.id || l, title: mod?.title || l };
            });
            suggestion = game.i18n.localize("PHILSCONSOLEDOCTOR.Flood.Suggestion") || "One of these modules is likely causing the loop.";
        }
    }

    // Filter duplicates
    const uniqueMap = new Map();
    suspects.forEach(s => uniqueMap.set(s.id, s));
    suspects = Array.from(uniqueMap.values());

    // Open Dialog
    setTimeout(() => {
        const d = new Dialog({
            title: game.i18n.localize("PHILSCONSOLEDOCTOR.Flood.Title") || "⚠️ Loop Detected!",
            content: `
                <div style="padding:10px;">
                    <h3 style="color:#e74c3c; margin-top:0;"><i class="fas fa-biohazard"></i> ${game.i18n.localize("PHILSCONSOLEDOCTOR.Flood.Subtitle") || "Infinite Loop Intercepted"}</h3>
                    <p>${game.i18n.format("PHILSCONSOLEDOCTOR.Flood.Message", { name: key, count: (threshold / (windowMs/1000)).toFixed(1) })}</p>
                    
                    ${suspects.length > 0 ? `
                        <div style="margin:10px 0; padding:10px; background:rgba(0,0,0,0.1); border:1px solid #7a7971; border-radius:4px;">
                            <strong>${game.i18n.localize("PHILSCONSOLEDOCTOR.Flood.Suspects") || "Primary Suspects:"}</strong>
                            <ul style="margin:5px 0 0 0; padding-left:20px;">
                                ${suspects.map(s => `
                                    <li class="pcd-suspect-row" style="margin-bottom:4px; display:flex; align-items:center; justify-content:space-between;">
                                        <span><strong>${s.title}</strong> <span style="font-size:0.8em; opacity:0.7;">(${s.id})</span></span>
                                        ${(s.id && game.modules.has(s.id)) ? `
                                            <button type="button" class="pcd-tiny-btn reset-settings" data-id="${s.id}" style="width:auto; height:20px; font-size:10px; line-height:10px; padding:0 5px;">
                                                <i class="fas fa-undo"></i> Reset Settings
                                            </button>` : ''}
                                    </li>`).join('')}
                            </ul>
                        </div>
                        <p style="font-size:0.9em; font-style:italic;">${suggestion}</p>
                    ` : `<p style="font-style:italic; opacity:0.8;">${game.i18n.localize("PHILSCONSOLEDOCTOR.Flood.NoSuspects") || "No specific external source found."}</p>`}
                </div>
            `,
            buttons: {
                ignore: {
                    icon: '<i class="fas fa-eye-slash"></i>',
                    label: game.i18n.localize("PHILSCONSOLEDOCTOR.Flood.Ignore") || "Ignore & Continue",
                    callback: () => {
                        ignoredFloods.add(key);
                        isFloodProtectionActive = true; 
                        floodHistory = {}; // Reset history
                        ui.notifications.info(`PCD: Ignoring loops for '${key}'`);
                    }
                },
                stop: {
                    icon: '<i class="fas fa-stop"></i>',
                    label: game.i18n.localize("PHILSCONSOLEDOCTOR.UI.StopListening") || "Stop Listener",
                    callback: () => { 
                        if (typeof PCDProfiler !== 'undefined') PCDProfiler.toggleProfiling(false);
                        updateUI();
                    }
                }
            },
            default: "stop",
            render: (html) => {
                html.find('.reset-settings').click(async (ev) => {
                    const btn = $(ev.currentTarget);
                    const modId = btn.data('id');
                    const modTitle = game.modules.get(modId)?.title || modId;

                    const confirm = await Dialog.confirm({
                        title: `Reset ${modTitle}?`,
                        content: `<p>Are you sure you want to reset all settings for <strong>${modTitle}</strong> to their defaults/factory state? This cannot be undone.</p>`,
                        defaultYes: false
                    });

                    if (confirm) {
                        // Reset Settings Logic
                        let count = 0;
                        for (const [key, setting] of game.settings.settings.entries()) {
                            if (setting.namespace === modId) {
                                await game.settings.set(modId, setting.key, setting.default);
                                count++;
                            }
                        }
                        ui.notifications.info(`Reset ${count} settings for ${modTitle}.`);
                        // Optional: Reload to take effect? Settings apply usually immediately but safe to reload.
                    }
                });
            }
        }).render(true);
    }, 100);

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
PCDPatcher.setEventHandler(handleEvent);
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

    game.settings.register(MODULE_ID, 'floodThreshold', {
        name: "PHILSCONSOLEDOCTOR.Settings.FloodThresholdName", hint: "PHILSCONSOLEDOCTOR.Settings.FloodThresholdHint",
        scope: 'client', config: true, type: Number, default: 5, range: { min: 3, max: 20, step: 1 }
    });
    game.settings.register(MODULE_ID, 'floodWindow', {
        name: "PHILSCONSOLEDOCTOR.Settings.FloodWindowName", hint: "PHILSCONSOLEDOCTOR.Settings.FloodWindowHint",
        scope: 'client', config: true, type: Number, default: 5, range: { min: 1, max: 30, step: 1 }
    });

    game.keybindings.register(MODULE_ID, "openConsoleDoctor", {
        name: "Open Console Doctor",
        editable: [{ key: "KeyK", modifiers: ["Control", "Alt"] }],
        onDown: () => { openDoctorWindow(); return true; }
    });

    PCDResolver.init();
});

Hooks.once('ready', () => {
    if (PCDResolver.isActive()) {
        openDoctorWindow();
        ui.notifications.warn(game.i18n.localize("PHILSCONSOLEDOCTOR.UI.BisectActiveWarning") || "Module Conflict Resolution in progress...");
    }
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
            width: 900,
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
            toggleDiagnosis: PhilsConsoleDoctorApp.prototype.onToggleDiagnosis,
            
            toggleDiagnosis: PhilsConsoleDoctorApp.prototype.onToggleDiagnosis,
            
            // Listener
            clearEvents: PhilsConsoleDoctorApp.prototype.onClearEvents,

            // Resolver
            startBisect: PhilsConsoleDoctorApp.prototype.onStartBisect,
            stopBisect: PhilsConsoleDoctorApp.prototype.onStopBisect,
            bisectYes: PhilsConsoleDoctorApp.prototype.onBisectYes,
            bisectNo: PhilsConsoleDoctorApp.prototype.onBisectNo
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
            moduleSearch: this.moduleSearch || "",
            isProfiling: (typeof PCDProfiler !== 'undefined' && PCDProfiler.IS_PROFILING),
            isDiagnosing: (typeof PCDProfiler !== 'undefined' && PCDProfiler.IS_DIAGNOSING),
            
            // Resolver State
            resolverState: PCDResolver.state,
            isResolving: PCDResolver.isActive(),
            resolverPercent: 0
        };

        if (context.isResolving && context.resolverState && !context.resolverState.finished) {
             if (this.activeTab !== 'conflicts') {
                 this.activeTab = 'conflicts';
                 context.activeTab = 'conflicts';
             }
        }

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

        // --- MODULES CONTEXT ---
        if (this.activeTab === 'modules') {
            // Robust retrieval for Foundry Collection
            const allModules = game.modules.filter ? game.modules.filter(m => m.active) : Array.from(game.modules).filter(m => m.active);
            
            let modules = allModules;
            if (this.moduleSearch) {
                const search = this.moduleSearch.toLowerCase();
                modules = modules.filter(m => {
                    const title = m.title || "";
                    const id = m.id || "";
                    return title.toLowerCase().includes(search) || id.toLowerCase().includes(search);
                });
            }
            
            context.modules = modules.map(m => {
                // Author safe access
                let author = "";
                if (m.authors && m.authors.length > 0) {
                    const first = m.authors[0];
                    author = typeof first === 'string' ? first : (first.name || "");
                }
                
                return {
                    id: m.id,
                    title: m.title || m.id,
                    version: m.version || "?.?.?",
                    author: author
                };
            }).sort((a,b) => a.title.localeCompare(b.title));
            
            console.log(`PCD DEBUG: PrepareContext modules found: ${context.modules.length}`);
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

        // --- LISTENER CONTEXT ---
        if (this.activeTab === 'listener') {
            context.events = PCD_CAPTURED_EVENTS;
            // Re-use isProfiling for recording state (shared with metrics for now)
            context.isListening = (typeof PCDProfiler !== 'undefined' && PCDProfiler.IS_PROFILING);
        }

        return context;
    }

    /** @override */
    _onRender(context, options) {
        super._onRender(context, options);
        
        // Search Inputs
        const searchInput = this.element.querySelector('input[name="searchQuery"]');
        if (searchInput) {
            searchInput.addEventListener('input', (event) => {
                this._searchCursor = { start: event.target.selectionStart, end: event.target.selectionEnd };
                this.searchQuery = event.target.value;
                this._updateListDebounced();
            });
            searchInput.value = this.searchQuery; 
            if (this.activeTab === 'console' && this._searchCursor) {
                searchInput.focus();
                searchInput.setSelectionRange(this._searchCursor.start, this._searchCursor.end);
            }
        }

        const modSearchInput = this.element.querySelector('input[name="moduleSearch"]');
        if (modSearchInput) {
            modSearchInput.addEventListener('input', (event) => {
                this._modSearchCursor = { start: event.target.selectionStart, end: event.target.selectionEnd };
                this.moduleSearch = event.target.value;
                this._updateListDebounced();
            });
            modSearchInput.value = this.moduleSearch || ""; 
            if (this.activeTab === 'modules') {
                modSearchInput.focus();
                if (this._modSearchCursor) {
                    modSearchInput.setSelectionRange(this._modSearchCursor.start, this._modSearchCursor.end);
                }
            }
        }

        // Context Menu for Modules
        // Standard ContextMenu instantiation
        const moduleList = this.element.querySelector('.pcd-module-list');
        if (moduleList) {
            new ContextMenu($(moduleList), ".pcd-module-card", [
                {
                    name: game.i18n.localize("PHILSCONSOLEDOCTOR.Ctx.ResetSettings"),
                    icon: '<i class="fas fa-undo"></i>',
                    callback: (target) => this._resetModuleSettings(target)
                },
                {
                    name: game.i18n.localize("PHILSCONSOLEDOCTOR.Ctx.Deactivate"),
                    icon: '<i class="fas fa-power-off"></i>',
                    callback: (target) => this._deactivateModule(target)
                }
            ]);
        }
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
                items: semanticConflicts.map(c => ({ ...c, isSemantic: true }))
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
                    isMethod: true,
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
    onClearEvents(event, target) {
        PCD_CAPTURED_EVENTS.length = 0;
        this.render(true);
    }
    async onAskAI(event, target) {
        let promptVal = "";
        
        if (target.dataset.id && target.dataset.id.startsWith("event-")) {
            const index = parseInt(target.dataset.id.replace("event-", ""));
            const evt = PCD_CAPTURED_EVENTS[index];
            if (evt) promptVal = this.generateEventPrompt(evt);
        } else {
             const id = parseInt(target.dataset.id);
             const log = PCD_CAPTURED_LOGS.find(l => l.id === id);
             if (log) promptVal = this.generateLogPrompt(log);
        }

        if (!promptVal) return;
        
        try {
            await navigator.clipboard.writeText(promptVal);
            ui.notifications.info(game.i18n.localize("PHILSCONSOLEDOCTOR.UI.PromptCopied"));
            const url = game.settings.get(MODULE_ID, 'aiUrl') || 'https://gemini.google.com/app';
            window.open(url, "_blank");
        } catch (e) { ui.notifications.error(game.i18n.localize("PHILSCONSOLEDOCTOR.UI.ClipboardFailed")); }
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
        this._updateListDebounced();
    }

    async generateLogPrompt(logEntry) {
        const activeModules = game.modules.filter(m => m.active).map(m => `- ${m.title} (${m.id}) v${m.version} `).join("\n");
        const prompt = game.i18n.format("PHILSCONSOLEDOCTOR.Prompt.Analysis", {
            timestamp: logEntry.timestamp,
            type: logEntry.type,
            message: logEntry.message,
            stack: logEntry.stack,
            modules: activeModules
        });
        return prompt;
    }
    
    generateEventPrompt(evt) {
         return `Analyze this Foundry VTT Event:\n\nType: ${evt.type}\nData: ${evt.data}\nSource: ${evt.source.title}\nTimestamp: ${evt.timestamp}\n\nTask: Explain what this event did and if it looks correct.`;
    }
    async onStartBisect(event, target) {
        const activeModules = game.modules.filter(m => m.active && m.id !== "phils-console-doctor").sort((a,b) => a.title.localeCompare(b.title));
        
        const content = `
            <p>${game.i18n.localize("PHILSCONSOLEDOCTOR.UI.BisectSafelistDesc") || "Select modules to <strong>EXCLUDE</strong> from the investigation. Checked modules will remain <strong>ENABLED</strong> at all times (Safelist)."}</p>
            <div style="max-height:300px; overflow-y:auto; border:1px solid #787878; padding:5px; background:rgba(0,0,0,0.2);">
                ${activeModules.map(m => `
                    <div style="display:flex; align-items:center; margin-bottom:3px;">
                        <input type="checkbox" name="safelist" value="${m.id}" id="safe-${m.id}">
                        <label for="safe-${m.id}" style="margin-left:5px;">${m.title}</label>
                    </div>
                `).join('')}
            </div>
            <p style="font-size:0.8em; margin-top:5px;"><i class="fas fa-exclamation-triangle"></i> ${game.i18n.localize("PHILSCONSOLEDOCTOR.UI.BisectWarning") || "Warning: If the bug is inside a Safelisted module, we won't find it."}</p>
        `;

        new Dialog({
            title: "Conflict Resolver Setup",
            content: content,
            buttons: {
                start: {
                    icon: '<i class="fas fa-play"></i>',
                    label: "Start Resolution",
                    callback: (html) => {
                        const safelist = [];
                        html.find('input[name="safelist"]:checked').each((i, el) => safelist.push(el.value));
                        
                        // Start and reload
                        PCDResolver.start(safelist);
                    }
                },
                no: {
                    icon: '<i class="fas fa-times"></i>',
                    label: game.i18n.localize("PHILSCONSOLEDOCTOR.Reset.Cancel")
                }
            },
            default: "yes"
        }).render(true);
    }

    async onStopBisect(event, target) {
        PCDResolver.stop();
    }

    async onBisectYes(event, target) {
        // Yes, the bug persists = Culprit IS in the active set
        await PCDResolver.resolve(true); 
        this.render();
    }

    async onBisectNo(event, target) {
        // No, the bug is gone = Culprit IS in the disabled set
        await PCDResolver.resolve(false);
        this.render();
    }

    async _resetModuleSettings(target) {
        const card = target[0];
        const moduleId = card.dataset.id;
        const titleEl = card.querySelector('.pcd-module-title');
        const moduleTitle = titleEl ? titleEl.innerText : moduleId;
        const module = game.modules.get(moduleId);

        const title = game.i18n.format("PHILSCONSOLEDOCTOR.Reset.Title", {module: module.title});
        const hint = game.i18n.format("PHILSCONSOLEDOCTOR.Reset.Hint", {module: module.title});

        // HTML Content
        const content = `
            <form>
                <p>${hint}</p>
                <div class="form-group">
                    <label>
                        <input type="checkbox" name="resetWorld" checked>
                        ${game.i18n.localize("PHILSCONSOLEDOCTOR.Reset.WorldLabel")}
                    </label>
                    <p class="notes">Database (settings.db)</p>
                </div>
                <div class="form-group">
                    <label>
                        <input type="checkbox" name="resetClient" checked>
                        ${game.i18n.localize("PHILSCONSOLEDOCTOR.Reset.ClientLabel")}
                    </label>
                    <p class="notes">Browser (localStorage)</p>
                </div>
                <!-- Flags Reset (Optional) -->
                <div class="form-group">
                    <label>
                        <input type="checkbox" name="purgeFlags">
                        ${game.i18n.localize("PHILSCONSOLEDOCTOR.Reset.FlagsLabel")}
                    </label>
                    <p class="notes">Actors, Scenes, Items...</p>
                </div>
            </form>
        `;

        new Dialog({
            title: title,
            content: content,
            buttons: {
                yes: {
                    icon: '<i class="fas fa-check"></i>',
                    label: game.i18n.localize("PHILSCONSOLEDOCTOR.Reset.Confirm"),
                    callback: async (html) => {
                        const resetWorld = html.find('[name="resetWorld"]').is(':checked');
                        const resetClient = html.find('[name="resetClient"]').is(':checked');
                        const purgeFlags = html.find('[name="purgeFlags"]').is(':checked');
                        
                        let settingsCount = 0;
                        let clientCount = 0;
                        let flagsCount = 0;

                        if (resetWorld) {
                            // 1. Hard Reset World Settings (DB)
                            const worldSettings = game.settings.storage.get("world").filter(s => s.key.startsWith(`${moduleId}.`));
                            for (const s of worldSettings) {
                                await s.delete();
                                settingsCount++;
                            }
                        }

                        if (resetClient) {
                             // 2. Soft Reset Client Settings (Active Modules only)
                            for (const [fullKey, setting] of game.settings.settings.entries()) {
                                if (fullKey.startsWith(`${moduleId}.`) && setting.scope !== 'world') {
                                    await game.settings.set(setting.namespace, setting.key, setting.default);
                                    clientCount++;
                                }
                            }

                            // 3. Brute Force LocalStorage (Client Settings via raw storage)
                            const storagePrefix = `${game.world.id}.${moduleId}.`;
                            const keysToRemove = [];
                            for (let i = 0; i < localStorage.length; i++) {
                                const key = localStorage.key(i);
                                if (key && key.startsWith(storagePrefix)) {
                                    keysToRemove.push(key);
                                }
                            }
                            for (const key of keysToRemove) {
                                localStorage.removeItem(key);
                                clientCount++;
                            }

                            // 4. Clear Current User Flags (Common for "Client" settings stored in DB)
                            if (game.user.flags[moduleId]) {
                                await game.user.update({[`flags.-=${moduleId}`]: null});
                                clientCount++;
                            }
                        }

                        if (purgeFlags) {
                            // Helper to nuke flags
                            const nuke = async (collection) => {
                                const updates = [];
                                for (const doc of collection) {
                                    if (doc.flags && doc.flags[moduleId]) {
                                        updates.push({ _id: doc.id, [`flags.-=${moduleId}`]: null });
                                    }
                                }
                                if (updates.length > 0) {
                                    await collection.documentClass.updateDocuments(updates);
                                    flagsCount += updates.length;
                                }
                            };

                            ui.notifications.info("PCD: Purging Flags... please wait.");
                            if (game.users) await nuke(game.users); // Clean User configs
                            if (game.actors) await nuke(game.actors);
                            if (game.items) await nuke(game.items);
                            if (game.scenes) await nuke(game.scenes);
                        }

                        let resultText = `<ul>`;
                        if (settingsCount > 0) resultText += `<li>${game.i18n.localize("PHILSCONSOLEDOCTOR.Reset.ChatWorld")}: <b>${settingsCount}</b></li>`;
                        if (clientCount > 0) resultText += `<li>${game.i18n.localize("PHILSCONSOLEDOCTOR.Reset.ChatClient")}: <b>${clientCount}</b></li>`;
                        if (flagsCount > 0) resultText += `<li>${game.i18n.localize("PHILSCONSOLEDOCTOR.Reset.ChatFlags")}: <b>${flagsCount}</b></li>`;
                        
                        resultText += `</ul>`;

                        ChatMessage.create({
                            content: `<h3>${game.i18n.localize("PHILSCONSOLEDOCTOR.Reset.ChatHeader")} ${module.title}</h3>` + resultText,
                            whisper: [game.user.id]
                        });
                    }
                },
                cancel: {
                    icon: '<i class="fas fa-times"></i>',
                    label: "Cancel"
                }
            },
            default: "cancel"
        }).render(true);
    }

    async _deactivateModule(target) {
        const card = target[0];
        const moduleId = card.dataset.id;
        const titleEl = card.querySelector('.pcd-module-title');
        const moduleTitle = titleEl ? titleEl.innerText : moduleId;

        const confirm = await Dialog.confirm({
            title: `Deactivate ${moduleTitle}?`,
            content: `<p>Disable this module and reload?</p>`,
            defaultYes: false
        });
        if (confirm) {
            const settings = game.settings.get("core", "moduleConfiguration");
            settings[moduleId] = false;
            await game.settings.set("core", "moduleConfiguration", settings);
            location.reload();
        }
    }
}

function openDoctorWindow() {
    if (!ui.philsConsoleDoctor) ui.philsConsoleDoctor = new PhilsConsoleDoctorApp();
    ui.philsConsoleDoctor.render(true);
}
