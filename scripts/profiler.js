
/**
 * PHILS CONSOLE DOCTOR - PERFORMANCE PROFILER
 * Intercepts Hooks.on to measure execution time of module code.
 */

class PCDProfiler {
    static IS_RECORDING = false;
    static HOOK_REGISTRY = []; // { hook, id, fn, module }
    static RECORDED_DATA = new Map(); // Key: "ModuleID:HookName" -> { module, hook, count, totalTime, min, max }
    static ENABLED = false;

    /**
     * Initializes the Profiler by patching Hooks.on
     * Must be called AS EARLY AS POSSIBLE (before other modules load).
     */
    static init() {
        if (this.ENABLED) return;
        this.ENABLED = true;

        console.log("PCD: Initializing Performance Profiler...");

        // Save original Hooks.on
        const originalHooksOn = Hooks.on;

        // Monkey Patch Hooks.on
        Hooks.on = function (hook, fn) {
            // 1. Identify Source Module via Stack Trace
            let sourceModule = "Foundry Core";
            try {
                const stack = new Error().stack;
                const lines = stack.split('\n');

                for (const line of lines) {
                    if (line.includes("phils-console-doctor")) continue; // Ignore ourself

                    // Match modules or systems
                    const match = line.match(/(?:modules|systems)\/([^\/]+)\//);
                    if (match && match[1]) {
                        sourceModule = match[1];
                        break; // Found the culprit
                    }

                    // Fallback for core
                    if (line.includes("foundry.js") || line.includes("commons.js") || line.includes("pixi.js")) {
                        sourceModule = "Foundry Core";
                        // Don't break yet, keep looking for a module high up, but if we finish loop, use this
                    }
                }
            } catch (e) { /* ignore stack error */ }

            // 2. Wrap the function
            const wrappedFn = function (...args) {
                if (!PCDProfiler.IS_RECORDING) {
                    return fn.apply(this, args);
                }

                const start = performance.now();
                try {
                    const result = fn.apply(this, args);
                    // Universal Conflict Detection
                    if (result === false && typeof hook === 'string' && hook.startsWith('pre')) {
                        PCDProfiler.recordBlock(sourceModule, hook);
                    }
                    return result;
                } finally {
                    const duration = performance.now() - start;
                    PCDProfiler.record(sourceModule, hook, duration);
                }
            };

            // 3. Register internally for debug/inspection (optional)
            PCDProfiler.HOOK_REGISTRY.push({ hook, fn: wrappedFn, originalFn: fn, module: sourceModule });

            // 4. Call original Hooks.on with wrapped function
            return originalHooksOn.call(Hooks, hook, wrappedFn);
        };

        // 5. Patch Application.prototype._render (UI Rendering)
        const originalRender = Application.prototype._render;
        Application.prototype._render = async function (force, options) {
            if (!PCDProfiler.IS_RECORDING) {
                return originalRender.call(this, force, options);
            }
            const start = performance.now();
            try {
                return await originalRender.call(this, force, options);
            } finally {
                const duration = performance.now() - start;
                PCDProfiler.record(this.constructor.name, "Render", duration);
            }
        };

        // 6. Retroactive Hook Wrapping (Catch things registered BEFORE us)
        try {
            const hookEvents = Hooks.events;
            // Handle different Foundry versions (V10+ Map vs Object)
            const entries = hookEvents instanceof Map ? hookEvents.entries() : Object.entries(hookEvents);

            for (const [hook, listeners] of entries) {
                if (!Array.isArray(listeners)) continue;

                // We mutate the array in place
                for (let i = 0; i < listeners.length; i++) {
                    const originalFn = listeners[i];
                    // Skip if already wrapped (unlikely) or if it's our own
                    if (originalFn._pcdWrapped) continue;

                    const wrappedFn = function (...args) {
                        if (!PCDProfiler.IS_RECORDING) return originalFn.apply(this, args);
                        const start = performance.now();
                        try {
                            return originalFn.apply(this, args);
                        } finally {
                            PCDProfiler.record("Retroactive (Core/System)", hook, performance.now() - start);
                        }
                    };
                    wrappedFn._pcdWrapped = true;
                    // Try to preserve original properties
                    wrappedFn.fn = originalFn;

                    listeners[i] = wrappedFn;
                }
            }
            console.log("PCD: Retroactively wrapped existing hooks.");
        } catch (err) {
            console.warn("PCD: Failed to patch existing hooks:", err);
        }

        // 7. Patch PlaceableObject.prototype.refresh (Canvas/Token Movement)
        try {
            if (typeof PlaceableObject !== 'undefined') {
                const originalRefresh = PlaceableObject.prototype.refresh;
                PlaceableObject.prototype.refresh = function () {
                    if (!PCDProfiler.IS_RECORDING) return originalRefresh.apply(this, arguments);

                    const start = performance.now();
                    try {
                        return originalRefresh.apply(this, arguments);
                    } finally {
                        PCDProfiler.record(this.constructor.name || "Placeable", "Canvas Refresh", performance.now() - start);
                    }
                };
                console.log("PCD: Patched PlaceableObject.refresh for canvas metrics.");
            }
        } catch (err) { console.warn("PCD: Failed to patch PlaceableObject:", err); }
    };

    static toggleRecording(active) {
        this.IS_RECORDING = active;
        if (active) {
            console.log("PCD: 🔴 Recording started...");
        } else {
            console.log("PCD: ⏹️ Recording stopped.");
        }
    }

    static clearData() {
        this.RECORDED_DATA.clear();
        this.BLOCKED_LOGS = [];
        console.log("PCD: Data cleared.");
    }

    static record(moduleName, hookName, duration) {
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
