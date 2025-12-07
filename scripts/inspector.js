/**
 * PCD Inspector
 * Analyzes registered Hooks to find conflicts and categorize listeners.
 */
export class PCDInspector {

    static CATEGORIES = {
        'Combat & Rolls': /^(Combat|Roll|ChatMessage|Turn|Round|Measure)/i,
        'Actors & Items': /^(Actor|Item|ActiveEffect|createActor|updateActor|preCreateActor|preUpdateActor)/i,
        'UI & Interface': /^(render|Application|Sheet|Sidebar|Hotbar)/i,
        'Scene & Map': /^(Token|Wall|Light|Ambient|Scene|Canvas|updateToken|preUpdateToken)/i,
        'System & Logic': /^(Game|Setting|User|i18n|load)/i
    };

    /**
     * Scans all registered hooks and returns a categorized report of CONTENSTED hooks.
     * @returns {Object} { contested: { 'Category': [hookData] }, total: number }
     */
    static scanHooks() {
        const report = {
            contested: {
                'Combat & Rolls': [],
                'Actors & Items': [],
                'UI & Interface': [],
                'Scene & Map': [],
                'System & Logic': [],
                'Other': []
            },
            total: 0
        };

        const ignoredHooks = ['init', 'ready', 'setup', 'i18nInit'];
        const hookEvents = Hooks.events;
        const entries = hookEvents instanceof Map ? hookEvents.entries() : Object.entries(hookEvents);

        for (const [hook, listeners] of entries) {
            if (!Array.isArray(listeners) || listeners.length < 2) continue; // Only care about conflicts (>1 module)
            if (ignoredHooks.includes(hook)) continue;

            const modules = this._identifyListeners(listeners);
            const moduleCount = modules.filter(m => m !== "Unknown/System").length;
            if (moduleCount < 2) continue; // Only report if 2+ actual modules are fighting

            const entry = {
                hook: hook,
                count: listeners.length,
                modules: modules
            };

            let matched = false;
            for (const [catName, regex] of Object.entries(this.CATEGORIES)) {
                if (regex.test(hook)) {
                    report.contested[catName].push(entry);
                    matched = true;
                    break;
                }
            }
            if (!matched) report.contested['Other'].push(entry);
            report.total++;
        }

        // Sort each category by count desc
        for (const cat in report.contested) {
            report.contested[cat].sort((a, b) => b.count - a.count);
        }

        return report;
    }

    static _identifyListeners(listeners) {
        return listeners.map(fn => {
            if (fn._pcdWrapped && fn.module) return fn.module;
            const fnStr = fn.toString();
            // Try to match standard module identifiers or comments
            const match = fnStr.match(/modules\/([^\/]+)\//);
            if (match) return match[1];
            return "Unknown/System";
        });
    }

    /**
     * Scans captured logs for explicit incompatibility warnings.
     * @param {Array} logs - The PCD_CAPTURED_LOGS array
     * @returns {Array} - List of semantic conflicts found
     */
    static scanLogs(logs) {
        const keywords = ['conflict', 'incompatible', 'beißt sich', 'cannot be activated together', 'v3 to v4 migration'];
        const conflicts = [];

        // Modules that we know handle their conflicts gracefully or should be ignored here
        const ignoreTerms = ['libwrapper', 'wrapping'];

        logs.forEach(log => {
            if (log.type !== 'error' && log.type !== 'warn') return;
            const msg = log.message.toLowerCase();

            // Skip if it looks like a libWrapper warning (handled by scanMethods)
            if (ignoreTerms.some(t => msg.includes(t))) return;

            const hasKeyword = keywords.some(k => msg.includes(k));
            const isDeprecated = msg.includes('deprecated');

            if (hasKeyword && !isDeprecated) {
                // Try to find a module name if "Unknown"
                let moduleName = log.sourceModule ? log.sourceModule.title : "Unknown";
                if (moduleName === "Unknown") {
                    // Try to extract from "module X" or "X module"
                    const modMatch = log.message.match(/module\s+([^\s]+)/i) || log.message.match(/([^\s]+)\s+module/i);
                    if (modMatch) moduleName = modMatch[1];
                }

                conflicts.push({
                    message: log.message,
                    module: moduleName,
                    timestamp: log.timestamp
                });
            }
        });
        return conflicts;
    }

    /**
     * Scans libWrapper listeners AND captured logs to find shared targets.
     * This is the "Method Contention" detector.
     * @param {Array} logs - The captured logs to scan for non-libWrapper warnings
     * @returns {Array} List of contended targets { target: string, modules: string[] }
     */
    static scanMethods(logs = []) {
        const conflicts = [];
        const seenTargets = new Set();

        // 1. ACTIVE SCAN: Check libWrapper registry
        if (typeof libWrapper !== 'undefined' && libWrapper.wrappers) {
            for (const [target, wrappers] of Object.entries(libWrapper.wrappers)) {
                if (!Array.isArray(wrappers) || wrappers.length < 2) continue;

                const modules = wrappers.map(w => this.getModuleFromFunction(w) || "Unknown");
                const uniqueModules = [...new Set(modules)];
                const actualModules = uniqueModules.filter(m => m !== "Unknown" && m !== "Unknown/System");

                if (actualModules.length > 1) {
                    conflicts.push({
                        target: target,
                        modules: actualModules,
                        count: actualModules.length
                    });
                    seenTargets.add(target);
                }
            }
        }

        // 2. PASSIVE SCAN: Check logs for libWrapper warnings
        logs.forEach(log => {
            const msg = log.message;
            if (!msg) return;

            // Pattern B (Rich): "libWrapper: module Aeris Scene Fade and module Monk's Scene Navigation modify the same..."
            const matchB = msg.match(/module (.+) and module (.+) modify the same/i);
            if (matchB) {
                // Extract target from the REST of the message if possible, or use a generic text
                const targetMatch = msg.match(/wrapping of '([^']+)'/);
                const target = targetMatch ? targetMatch[1] : game.i18n.format("PHILSCONSOLEDOCTOR.Inspector.SharedMethodConflict", { modA: matchB[1], modB: matchB[2] });
                const modA = matchB[1];
                const modB = matchB[2];

                if (!seenTargets.has(target)) {
                    conflicts.push({
                        target: target,
                        modules: [modA, modB],
                        count: 2,
                        note: game.i18n.localize("PHILSCONSOLEDOCTOR.Inspector.DetectedViaLogs")
                    });
                    seenTargets.add(target);
                }
                return; // Skip Pattern A if B matched
            }

            // Pattern A (Basic): "Detected non-libWrapper wrapping of 'Scene.prototype.view' by module aeris-scene-fade"
            const matchA = msg.match(/Detected non-libWrapper wrapping of '([^']+)' by module ([^\s\.]+)/);
            if (matchA) {
                const target = matchA[1];
                const mod = matchA[2];
                if (!seenTargets.has(target)) {
                    conflicts.push({
                        target: target,
                        modules: [mod, game.i18n.localize("PHILSCONSOLEDOCTOR.Inspector.UnknownSystem")],
                        count: 2,
                        note: game.i18n.localize("PHILSCONSOLEDOCTOR.Inspector.DetectedViaLogs")
                    });
                    seenTargets.add(target);
                }
            }
        });

        return conflicts;
    }

    static getModuleFromFunction(fn) {
        if (fn._libWrapper && fn._libWrapper.module) return fn._libWrapper.module;
        if (fn.moduleId) return fn.moduleId;

        // Parse source
        const str = fn.toString();
        const match = str.match(/modules\/([^\/]+)\//);
        if (match) return match[1];

        return null;
    }

    /**
     * Analyzes a conflict message to find mentioned modules and their shared hooks.
     * @param {string} message - The conflict log message
     * @returns {Object|null} - { culprits: [ModuleTitle, ModuleTitle], sharedHooks: [hookName, hookName] }
     */
    static analyzeConflict(message) {
        if (!message) return null;
        const activeModules = Array.from(game.modules.values()).filter(m => m.active);
        const culprits = [];
        activeModules.sort((a, b) => b.title.length - a.title.length);
        const lowerMsg = message.toLowerCase();

        for (const mod of activeModules) {
            if (lowerMsg.includes(mod.title.toLowerCase()) || lowerMsg.includes(mod.id.toLowerCase())) {
                culprits.push(mod);
            }
        }

        if (culprits.length < 2) return null;

        const modA = culprits[0];
        const modB = culprits[1];
        const sharedHooks = [];

        const hookEvents = Hooks.events;
        const entries = hookEvents instanceof Map ? hookEvents.entries() : Object.entries(hookEvents);

        for (const [hook, listeners] of entries) {
            if (!Array.isArray(listeners)) continue;
            const owners = this._identifyListeners(listeners);
            if (owners.includes(modA.id) && owners.includes(modB.id)) {
                sharedHooks.push(hook);
            }
        }

        return {
            culprits: [modA.title, modB.title],
            sharedHooks: sharedHooks
        };
    }
}
