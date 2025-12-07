/**
 * PCD Inspector
 * Analyzes registered Hooks to find conflicts and categorize listeners.
 */
export class PCDInspector {

    static CATEGORIES = {
        'Movement & Scene': /^(Token|Wall|Light|Ambient|Scene|Canvas|updateToken|preUpdateToken)/i,
        'Combat & Dice': /^(Combat|Roll|ChatMessage|Turn|Round|Measure)/i,
        'Actors & Items': /^(Actor|Item|ActiveEffect|createActor|updateActor)/i,
        'UI & Interface': /^(render|Application|Sheet|Sidebar|Hotbar)/i
    };

    /**
     * Scans all registered hooks and returns a categorized report.
     * @returns {Object} { conflicts: [], categories: {} }
     */
    static scanHooks() {
        const report = {
            categories: {
                'Movement & Scene': [],
                'Combat & Dice': [],
                'Actors & Items': [],
                'UI & Interface': [],
                'Other': []
            },
            conflicts: [], // Critical conflicts (pre* hooks)
            uiConflicts: [], // Multiple UI listeners
            envConflicts: [], // Multiple Environment listeners
            movementConflicts: [] // Multiple Movement listeners
        };

        const hookEvents = Hooks.events;
        const entries = hookEvents instanceof Map ? hookEvents.entries() : Object.entries(hookEvents);

        for (const [hook, listeners] of entries) {
            if (!Array.isArray(listeners) || listeners.length === 0) continue;

            const entry = {
                hook: hook,
                count: listeners.length,
                modules: this._identifyListeners(listeners)
            };

            const isContested = listeners.length > 1;

            // 1. Critical Conflicts (pre hooks)
            if (isContested && hook.startsWith('pre')) {
                report.conflicts.push(entry);
                // Also categorize into specific contention types
                if (hook.match(/UpdateToken|CreateMeasuredTemplate/i)) {
                    report.movementConflicts.push(entry);
                }
            }

            // 2. UI Contention (render hooks)
            if (isContested && hook.startsWith('render')) {
                report.uiConflicts.push(entry);
            }

            // 3. Environment Contention
            if (isContested && hook.match(/^(lighting|sight|weather|canvasInit|canvasReady)/i)) {
                report.envConflicts.push(entry);
            }

            // 4. General Categorization for the Tree View
            let matched = false;
            for (const [catName, regex] of Object.entries(this.CATEGORIES)) {
                if (regex.test(hook)) {
                    report.categories[catName].push(entry);
                    matched = true;
                    break;
                }
            }
            if (!matched) report.categories['Other'].push(entry);
        }

        // Sort by severity
        const sorter = (a, b) => b.count - a.count;
        report.conflicts.sort(sorter);
        report.uiConflicts.sort(sorter);
        report.envConflicts.sort(sorter);
        report.movementConflicts.sort(sorter);

        return report;
    }

    static _identifyListeners(listeners) {
        return listeners.map(fn => {
            // Try to find module from function scope or properties
            // This is hard in JS, but we can try to rely on our PCDProfiler wrapper if available
            if (fn._pcdWrapped && fn.module) return fn.module;

            // Fallback: Check function definition string for module paths
            const fnStr = fn.toString();
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
        const keywords = ['conflict', 'incompatible', 'remove', 'disable', 'beißt sich', 'cannot be activated together'];
        const conflicts = [];

        logs.forEach(log => {
            if (log.type !== 'error' && log.type !== 'warn') return;
            const msg = log.message.toLowerCase();

            // specific check for the user's reported issue (Dorako/PF2e) or general keywords
            const hasKeyword = keywords.some(k => msg.includes(k));

            if (hasKeyword) {
                conflicts.push({
                    message: log.message, // Keep original casing
                    module: log.sourceModule ? log.sourceModule.title : "Unknown",
                    timestamp: log.timestamp
                });
            }
        });
        return conflicts;
    }
}
