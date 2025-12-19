
/**
 * PHILS CONSOLE DOCTOR - PERFORMANCE PROFILER
 * Intercepts Hooks.on to measure execution time of module code.
 */

class PCDProfiler {
    static IS_PROFILING = false;  // Metrics
    static IS_DIAGNOSING = false; // Conflicts/Blocking
    static HOOK_REGISTRY = [];
    static RECORDED_DATA = new Map();
    static BLOCKED_LOGS = [];
    static ENABLED = false;

    /**
     * Initializes the Profiler by patching Hooks.on
     */
    static init() {
        if (this.ENABLED) return;
        this.ENABLED = true;

        console.log("PCD: Initializing Performance Profiler...");
        console.log("PCD: Debug - Checking Environment...", {
            hasApp: typeof Application !== 'undefined',
            hasPlaceable: typeof PlaceableObject !== 'undefined'
        });

        const originalHooksOn = Hooks.on;

        // Monkey Patch Hooks.on
        Hooks.on = function (hook, fn) {
            let sourceModule = "Foundry Core";
            // Stack Trace Logic (Simplified)
            try {
                const stack = new Error().stack;
                const lines = stack.split('\n');
                for (const line of lines) {
                    if (line.includes("phils-console-doctor")) continue;
                    const match = line.match(/(?:modules|systems)\/([^\/]+)\//);
                    if (match && match[1]) { sourceModule = match[1]; break; }
                }
            } catch (e) { }

            const wrappedFn = function (...args) {
                // If neither mode is active, run raw
                if (!PCDProfiler.IS_PROFILING && !PCDProfiler.IS_DIAGNOSING) {
                    return fn.apply(this, args);
                }

                const start = PCDProfiler.IS_PROFILING ? performance.now() : 0;

                try {
                    const result = fn.apply(this, args);

                    // Conflict Diagnosis
                    if (PCDProfiler.IS_DIAGNOSING) {
                        if (result === false && typeof hook === 'string' && hook.startsWith('pre')) {
                            PCDProfiler.recordBlock(sourceModule, hook);
                        }
                    }
                    return result;
                } finally {
                    // Performance Profiling
                    if (PCDProfiler.IS_PROFILING) {
                        const duration = performance.now() - start;
                        PCDProfiler.record(sourceModule, hook, duration);
                    }
                }
            };

            // Register debug info
            PCDProfiler.HOOK_REGISTRY.push({ hook, fn: wrappedFn, originalFn: fn, module: sourceModule });

            return originalHooksOn.call(Hooks, hook, wrappedFn);
        };

        // Retroactive Hook Wrapping (Catch things registered BEFORE us)
        // Retroactive Hook Wrapping - Defer to 'ready' to catch everything
        Hooks.once('ready', () => {
            try {
                const hookEvents = Hooks.events;
                const entries = hookEvents instanceof Map ? hookEvents.entries() : Object.entries(hookEvents);
                let count = 0;

                for (const [hook, listeners] of entries) {
                    if (!Array.isArray(listeners)) continue;

                    for (let i = 0; i < listeners.length; i++) {
                        const originalFn = listeners[i];
                        if (!originalFn || originalFn._pcdWrapped) continue;

                        const wrappedFn = function (...args) {
                            if (!PCDProfiler.IS_PROFILING && !PCDProfiler.IS_DIAGNOSING) return originalFn.apply(this, args);

                            const start = PCDProfiler.IS_PROFILING ? performance.now() : 0;
                            try {
                                const result = originalFn.apply(this, args);
                                if (PCDProfiler.IS_DIAGNOSING && result === false && typeof hook === 'string' && hook.startsWith('pre')) {
                                    PCDProfiler.recordBlock("Retroactive (Core/System)", hook);
                                }
                                return result;
                            } finally {
                                if (PCDProfiler.IS_PROFILING) {
                                    // Identify Source (Basic)
                                    PCDProfiler.record("Core/System/Other", hook, performance.now() - start);
                                }
                            }
                        };
                        wrappedFn._pcdWrapped = true;
                        wrappedFn.fn = originalFn;
                        listeners[i] = wrappedFn;
                        count++;
                    }
                }
                console.log(`PCD: Retroactively wrapped ${count} existing hooks on 'ready'.`);
            } catch (err) {
                console.warn("PCD: Failed to patch existing hooks:", err);
            }
        });



        // 5. Patch Application (Legacy)
        if (typeof Application !== 'undefined' && Application.prototype._render) {
            const originalRender = Application.prototype._render;
            Application.prototype._render = async function (force, options) {
                if (!PCDProfiler.IS_PROFILING) return originalRender.call(this, force, options);
                const start = performance.now();
                try { return await originalRender.call(this, force, options); }
                finally { PCDProfiler.record(this.constructor.name, "Render (Legacy)", performance.now() - start); }
            };
        }

        // 6. Patch ApplicationV2 (V13)
        const AppV2 = foundry.applications?.api?.ApplicationV2;
        if (AppV2 && AppV2.prototype.render) {
            const originalRenderV2 = AppV2.prototype.render;
            AppV2.prototype.render = async function (options) {
                if (!PCDProfiler.IS_PROFILING) return originalRenderV2.call(this, options);
                const start = performance.now();
                try { return await originalRenderV2.call(this, options); }
                finally { PCDProfiler.record(this.constructor.name, "Render (V2)", performance.now() - start); }
            };
        }

        // 7. Patch PlaceableObject (V13 Safe)
        const Placeable = foundry.canvas?.placeables?.PlaceableObject || (typeof PlaceableObject !== 'undefined' ? PlaceableObject : null);
        if (Placeable && Placeable.prototype.refresh) {
            const originalRefresh = Placeable.prototype.refresh;
            Placeable.prototype.refresh = function () {
                if (!PCDProfiler.IS_PROFILING) return originalRefresh.apply(this, arguments);
                const start = performance.now();
                try { return originalRefresh.apply(this, arguments); }
                finally { PCDProfiler.record(this.constructor.name || "Placeable", "Canvas Refresh", performance.now() - start); }
            };
            console.log("PCD: Patched PlaceableObject (V13-aware) for canvas metrics.");
        }
    }

    static toggleProfiling(active) {
        this.IS_PROFILING = active;
        console.log(`PCD: ${active ? '🔴 Profiling' : '⏹️ Profiling'} ${active ? 'started' : 'stopped'}.`);
    }

    static toggleDiagnosis(active) {
        this.IS_DIAGNOSING = active;
        console.log(`PCD: ${active ? '🛡️ Live Diagnosis' : '⏹️ Live Diagnosis'} ${active ? 'started' : 'stopped'}.`);
    }

    static clearData() {
        this.RECORDED_DATA.clear();
        this.BLOCKED_LOGS = [];
        console.log("PCD: Data cleared.");
    }

    static record(moduleName, hookName, duration) {
        // console.log(`PCD Record: ${moduleName} - ${hookName} (${duration.toFixed(2)}ms)`);
        const key = `${moduleName}||${hookName}`;
        if (!this.RECORDED_DATA.has(key)) {
            this.RECORDED_DATA.set(key, {
                module: moduleName,
                hook: hookName,
                count: 0,
                totalTime: 0,
                min: duration,
                max: duration
            });
        }

        const entry = this.RECORDED_DATA.get(key);
        entry.count++;
        entry.totalTime += duration;
        if (duration < entry.min) entry.min = duration;
        if (duration > entry.max) entry.max = duration;
    }

    static recordBlock(moduleName, hookName) {
        if (!this.BLOCKED_LOGS) this.BLOCKED_LOGS = [];

        // Prevent spam (max 20 entries)
        if (this.BLOCKED_LOGS.length >= 20) this.BLOCKED_LOGS.shift();

        this.BLOCKED_LOGS.push({
            timestamp: new Date().toLocaleTimeString(),
            module: moduleName,
            hook: hookName
        });
        console.warn(`PCD: ⚠️ Module '${moduleName}' blocked hook '${hookName}'!`);
    }

    static getBlocks() {
        return this.BLOCKED_LOGS || [];
    }

    static getResults() {
        return Array.from(this.RECORDED_DATA.values());
    }
}

// Expose globally for UI access (Legacy/Debbuging)
window.PCDProfiler = PCDProfiler;

// Auto-init immediately when this script loads
try {
    PCDProfiler.init();
} catch (err) {
    console.error("PCD: Profiler failed to initialize:", err);
}

export { PCDProfiler };
