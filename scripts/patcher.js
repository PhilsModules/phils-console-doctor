/**
 * PCD Patcher
 * Centralizes all "monkey patching" of Foundry VTT internals.
 * - Hooks (for Conflict Detection & Profiling)
 * - Console (for Error Logging)
 * - Canvas/System (for Performance Metrics)
 */
export class PCDPatcher {
    static IS_PROFILING = false;
    static IS_DIAGNOSING = false;

    // Registers callbacks for data consumption
    static _onConsoleLog = null;
    static _onProfileRecord = null;
    static _onBlockRecord = null;

    static init() {
        console.log("PCD: Initializing Core Patcher...");
        this._patchHooks();
        this._patchConsole();
        this._patchCanvas(); // For V13/V12
        Hooks.once('ready', () => {
            this._patchLoop();       // For Layer Idle Monitoring
            this._patchRenderLoop(); // For True Idle (Frame Render) & FPS
            this._patchPing();       // For Network Latency
        });
    }

    /**
     * Sets the callback for when a console log is captured.
     * @param {Function} callback (type, args, stack, sourceModule) => void
     */
    static setLogHandler(callback) {
        this._onConsoleLog = callback;
    }

    /**
     * Sets the callback for performance metrics.
     * @param {Function} callback (module, feature, duration) => void
     */
    static setProfilerHandler(callback) {
        this._onProfileRecord = callback;
    }

    /**
     * Sets the callback for blocked actions (Conflict Detector).
     * @param {Function} callback (module, hook) => void
     */
    static setBlockHandler(callback) {
        this._onBlockRecord = callback;
    }

    static _patchHooks() {
        const originalHooksOn = Hooks.on;
        const originalHooksOnce = Hooks.once;

        // Common wrapper generator
        const wrapRegister = (originalMethod, isOnce) => {
            return function (hook, fn) {
                // 1. Identify Source Module via Stack Trace
                let sourceModule = "Foundry Core";
                let moduleId = "unknown";
                try {
                    const stack = new Error().stack;
                    const lines = stack.split('\n');
                    for (const line of lines) {
                        if (line.includes("phils-console-doctor")) continue;
                        // Match "modules/<id>/"
                        const match = line.match(/(?:modules|systems)\/([^\/]+)\//);
                        if (match && match[1]) {
                            moduleId = match[1];
                            // Try to get nice title if module is loaded
                            const mod = game.modules?.get(moduleId) || game.system;
                            sourceModule = mod?.title || moduleId;
                            break;
                        }
                    }
                } catch (e) { }

                // 2. Tag the function (CRITICAL for Inspector)
                fn._pcdModule = sourceModule;
                fn._pcdModuleId = moduleId;
                fn._pcdOriginal = true; // Mark as original user function

                // 3. Create the Execution Wrapper (CRITICAL for Profiler)
                const wrappedFn = function (...args) {
                    // Fast exit if we are disabled
                    if (!PCDPatcher.IS_PROFILING && !PCDPatcher.IS_DIAGNOSING) {
                        return fn.apply(this, args);
                    }

                    const start = PCDPatcher.IS_PROFILING ? performance.now() : 0;
                    try {
                        const result = fn.apply(this, args);

                        // Diagnosis: Check for blocked hooks (return false)
                        if (PCDPatcher.IS_DIAGNOSING && result === false && typeof hook === 'string' && hook.startsWith('pre')) {
                            if (PCDPatcher._onBlockRecord) PCDPatcher._onBlockRecord(sourceModule, hook);
                        }
                        return result;
                    } catch (err) {
                        // We do NOT swallow errors here, they will bubble up to window.onerror -> Console Doctor
                        throw err;
                    } finally {
                        // Profiling
                        if (PCDPatcher.IS_PROFILING) {
                            const duration = performance.now() - start;
                            if (PCDPatcher._onProfileRecord) PCDPatcher._onProfileRecord(sourceModule, hook, duration);
                        }
                    }
                };

                // Forward tags to wrapper for easy inspection
                wrappedFn._pcdModule = sourceModule;
                wrappedFn._pcdModuleId = moduleId;
                wrappedFn._pcdWrapped = true;
                wrappedFn.fn = fn; // Link to original

                // 4. Call Original
                return originalMethod.call(Hooks, hook, wrappedFn);
            };
        };

        Hooks.on = wrapRegister(originalHooksOn, false);
        Hooks.once = wrapRegister(originalHooksOnce, true);
    }

    static _patchConsole() {
        if (window.pcdPatchedConsole) return;
        window.pcdPatchedConsole = true;

        const originalWarn = console.warn;
        const originalError = console.error;

        const handleLog = (type, args) => {
            if (!this._onConsoleLog) return;

            // Generate clean message
            const msg = args.map(a => {
                if (a instanceof Error) return a.message;
                if (typeof a === 'object') {
                    try { return JSON.stringify(a, null, 2); } catch { return '[Object]'; }
                }
                return String(a);
            }).join(" ");

            if (!msg.trim()) return;

            // Get stack
            const stack = (args[0] instanceof Error) ? args[0].stack : new Error().stack;

            // Get Module
            let sourceModule = null;
            if (stack) {
                const match = stack.match(/modules\/([^\/]+)\//);
                if (match && match[1] && match[1] !== "phils-console-doctor") {
                    const moduleId = match[1];
                    const module = game.modules?.get(moduleId);
                    sourceModule = { id: moduleId, title: module?.title || moduleId };
                }
            }

            this._onConsoleLog(type, msg, stack, sourceModule);
        };

        console.warn = (...args) => { originalWarn.apply(console, args); handleLog('warn', args); };
        console.error = (...args) => { originalError.apply(console, args); handleLog('error', args); };

        // Global Errors
        window.addEventListener('error', (e) => {
            handleLog('error', [e.error || e.message]);
        });

        window.addEventListener('unhandledrejection', (e) => {
            handleLog('error', [`[Unhandled Promise] ${e.reason}`]);
        });
    }

    static _patchCanvas() {
        // Only patch if we can safely find the prototype
        // V12/V13 compatibility
        const Placeable = (typeof PlaceableObject !== 'undefined') ? PlaceableObject : (foundry.canvas?.placeables?.PlaceableObject);

        if (Placeable && Placeable.prototype.refresh) {
            const originalRefresh = Placeable.prototype.refresh;
            Placeable.prototype.refresh = function (...args) {
                if (!PCDPatcher.IS_PROFILING) return originalRefresh.apply(this, args);

                const start = performance.now();
                try {
                    return originalRefresh.apply(this, args);
                } finally {
                    if (PCDPatcher._onProfileRecord) {
                        // "Token", "Light", etc.
                        const name = this.constructor.name || "Placeable";
                        PCDPatcher._onProfileRecord("Canvas (Render)", `Refreshed ${name}`, performance.now() - start);
                    }
                }
            };
        }
    }

    static _patchLoop() {
        // Monitor specific Canvas Layers (Lighting, Sight, Tokens, etc.)
        // These run frequently during "Idle" if animations or lights are active.
        const layers = ['LightingLayer', 'SightLayer', 'TokenLayer', 'TemplateLayer', 'SoundsLayer'];
        for (const name of layers) {
            try {
                // Safely access global class
                const layerClass = globalThis[name];
                if (layerClass && layerClass.prototype.refresh) {
                    // Debug: Confirm it found the layer
                    // console.log(`PCD: Monitoring ${name}`);

                    const original = layerClass.prototype.refresh;
                    layerClass.prototype.refresh = function (...args) {
                        if (!PCDPatcher.IS_PROFILING) return original.apply(this, args);
                        const start = performance.now();
                        try { return original.apply(this, args); }
                        finally {
                            if (PCDPatcher._onProfileRecord)
                                PCDPatcher._onProfileRecord(`Canvas (${name})`, "Layer Refresh", performance.now() - start);
                        }
                    };
                }
            } catch (e) { /* Ignore if layer doesn't exist in this version */ }
        }
    }

    static _patchPing() {
        // Simple Interval Poller
        setInterval(() => {
            if (!PCDPatcher.IS_PROFILING) return;
            // Record Ping
            const ping = game.ping ?? (game.voice?.ping) ?? 0;
            // Allow 0ms (Localhost)
            if (PCDPatcher._onProfileRecord && typeof ping === 'number') {
                PCDPatcher._onProfileRecord("System (Latency)", "Ping", ping);
            }
        }, 2000); // Check every 2s
    }

    static _patchRenderLoop() {
        console.log("PCD: Attaching to Main Loop (Ticker)...");

        // reliable way to hook into the frame loop in Foundry V10+
        if (canvas?.app?.ticker) {
            let lastTime = performance.now();

            canvas.app.ticker.add(() => {
                if (!PCDPatcher.IS_PROFILING) return;

                const now = performance.now();
                const delta = now - lastTime;
                lastTime = now;

                if (delta > 0) {
                    const fps = 1000 / delta;
                    if (PCDPatcher._onProfileRecord) {
                        // Report FPS
                        PCDPatcher._onProfileRecord("System (FPS)", "Frame Rate", fps);

                        // Report "Idle" time (Frame Time)
                        // Since we are IN the ticker, the "delta" is effectively the frame time + idle time (total loop time).
                        // Use delta as the metric for "Renderer" load.
                        PCDPatcher._onProfileRecord("System (Renderer)", "Frame Time", delta);
                    }
                }
            });
            console.log("PCD: Ticker attached successfully.");
        } else {
            console.warn("PCD: Could not find canvas.app.ticker! Idle monitoring disabled.");
        }
    }
}
