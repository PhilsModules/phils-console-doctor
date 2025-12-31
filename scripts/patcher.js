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
    static _onBlockRecord = null;
    static _onEventRecord = null;


    static _getTimestamp() {
        return new Date().toLocaleTimeString(undefined, {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            fractionalSecondDigits: 3
        });
    }

    static init() {
        console.log("PCD: Initializing Core Patcher...");
        this._patchHooks();
        this._patchConsole();
        this._patchCanvas(); // For V13/V12
        Hooks.once('ready', () => {
            this._patchLoop();       // For Layer Idle Monitoring
            this._patchRenderLoop(); // For True Idle (Frame Render) & FPS
            this._patchPing();       // For Network Latency
            this._patchRenderLoop(); // For True Idle (Frame Render) & FPS
            this._patchPing();       // For Network Latency
            this._patchRolls();      // For Dice Interception
            this._patchAudio();      // For Sound Interception
            this._patchMacros();     // For Macro Interception
            this._patchSockets();    // For Socket Interception
            this._patchNotifications(); // For UI Notifications
        });
    }

    /**
     * Sets the callback for when a generic event is captured.
     * @param {Function} callback (eventData) => void
     */
    static setEventHandler(callback) {
        this._onEventRecord = callback;
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
                // 1. Identify Source Module via Deep Stack Trace
                let sourceModule = "Foundry Core";
                let moduleId = "unknown";
                let traceContext = "";

                try {
                    const stack = new Error().stack;
                    const lines = stack.split('\n');
                    // Skip first 2 lines (Error and this wrapper)
                    for (let i = 2; i < lines.length; i++) {
                        const line = lines[i];
                        if (line.includes("phils-console-doctor")) continue;
                        
                        // Look for modules or systems
                        const match = line.match(/(?:modules|systems)\/([^\/]+)\//);
                        if (match && match[1]) {
                            moduleId = match[1];
                            const mod = game.modules?.get(moduleId) || game.system;
                            sourceModule = mod?.title || moduleId;
                            // Keep the line unique signature for context
                            traceContext = line.trim(); 
                            break; 
                        }
                    }
                } catch (e) { }

                fn._pcdModule = sourceModule;
                fn._pcdModuleId = moduleId;
                fn._pcdOriginal = true;

                // 3. Create the Execution Wrapper (CRITICAL for Profiler)
                const wrappedFn = function (...args) {
                    // Fast exit if we are disabled
                    if (!PCDPatcher.IS_PROFILING && !PCDPatcher.IS_DIAGNOSING) {
                        return fn.apply(this, args);
                    }

                    // Inspect Arguments for "Why" (Context)
                    let contextData = "";
                    try {
                        // Chat Message Specifics
                        if (hook === "renderChatMessage" && args[0]) {
                            const msg = args[0]; // The message object
                            if (msg.flags) contextData = `Flags: ${Object.keys(msg.flags).join(', ')}`;
                            if (msg.user) contextData += ` | User: ${msg.user.name}`;
                            if (msg.flavor) contextData += ` | Flavor: ${msg.flavor}`;
                        }
                        // Generic Document Specifics (Actor, Item, etc.)
                        else if (args[0] && typeof args[0] === 'object' && args[0].name) {
                             contextData = `Target: ${args[0].name} (${args[0].constructor.name})`;
                        }
                    } catch(e) {}

                    const start = PCDPatcher.IS_PROFILING ? performance.now() : 0;
                    try {
                        const result = fn.apply(this, args);

                        // Diagnosis: Check for blocked hooks (return false)
                        if (PCDPatcher.IS_DIAGNOSING && result === false && typeof hook === 'string' && hook.startsWith('pre')) {
                            if (PCDPatcher._onBlockRecord) PCDPatcher._onBlockRecord(sourceModule, hook);
                        }
                        
                        // Listener: Record all hooks if profiling/listening
                        if (PCDPatcher.IS_PROFILING && PCDPatcher._onEventRecord) {
                            // Filter out spammy hooks if needed, or just log all
                            // Avoiding 'render' frame loops which are handled elsewhere
                            if (!hook.includes("Ticker")) {
                                 const details = contextData ? `${hook} [${contextData}]` : hook;
                                 PCDPatcher._onEventRecord({
                                    type: "Hook",
                                    data: details,
                                    source: { title: sourceModule, id: moduleId },
                                    timestamp: PCDPatcher._getTimestamp()
                                });
                            }
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
                        
                        // Listener: Record Canvas refresh
                        if (PCDPatcher._onEventRecord) {
                             PCDPatcher._onEventRecord({
                                    type: "Canvas",
                                    data: `Refreshed ${name}`,
                                    source: { title: "Core", id: "core" },
                                    timestamp: PCDPatcher._getTimestamp()
                                });
                        }
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

    static _patchRolls() {
        const originalEvaluate = Roll.prototype.evaluate;
        
        // We need to support both sync and async evaluate, though in V12+ it's mostly async.
        // However, Roll.prototype.evaluate might return a Promise or a Roll instance depending on usage/version.
        // Actually, in V10+, evaluate({async: true}) returns Promise.
        
        Roll.prototype.evaluate = function(...args) {
            // Capture source module before async operations lose the stack
            let sourceModule = "Unknown";
            let moduleId = "unknown";
            try {
                const stack = new Error().stack;
                // Parse stack for module
                 const lines = stack.split('\n');
                for (const line of lines) {
                    if (line.includes("phils-console-doctor") || line.includes("foundry.js")) continue;
                    const match = line.match(/(?:modules|systems)\/([^\/]+)\//);
                    if (match && match[1]) {
                        moduleId = match[1];
                        const mod = game.modules?.get(moduleId) || game.system;
                        sourceModule = mod?.title || moduleId;
                        break;
                    }
                }
            } catch (e) {}

            const handleResult = (roll) => {
                try {
                     if (PCDPatcher._onEventRecord) {
                         const safeData = {
                             type: "Roll",
                             data: `${roll.formula} = ${roll.total}`,
                             details: roll, // Keep full object for deeper inspection if needed
                             timestamp: PCDPatcher._getTimestamp(),
                             source: { id: moduleId, title: sourceModule },
                             flavor: roll.options?.flavor || ""
                         };
                         PCDPatcher._onEventRecord(safeData);
                     }
                } catch(err) {
                    console.error("PCD: Error capturing roll", err);
                }
            };

            const result = originalEvaluate.apply(this, args);

            if (result instanceof Promise) {
                return result.then(r => {
                    handleResult(r);
                    return r;
                });
            } else {
                handleResult(result);
                return result;
            }
        };
    }

    static _patchAudio() {
        if (typeof AudioHelper === 'undefined') return;
        
        const originalPlay = AudioHelper.play;
        AudioHelper.play = function(src, ...args) {
            // Capture before execution
            if (PCDPatcher.IS_PROFILING && PCDPatcher._onEventRecord) {
                 // Try to find source module from stack
                let source = "Core";
                try {
                     const stack = new Error().stack;
                     // simple match
                     const match = stack.match(/modules\/([^\/]+)\//);
                     if (match) source = match[1];
                } catch(e){}

                PCDPatcher._onEventRecord({
                    type: "Sound",
                    data: `Playing: ${src.split('/').pop()}`, // Short filename
                    details: src,
                    timestamp: PCDPatcher._getTimestamp(),
                    source: { title: source, id: source }
                });
            }
            return originalPlay.call(AudioHelper, src, ...args);
        };
    }

    static _patchMacros() {
         // Macro.prototype.execute (V10+)
         if (typeof Macro === 'undefined') return;
         
         const originalExecute = Macro.prototype.execute;
         Macro.prototype.execute = function(...args) {
             if (PCDPatcher.IS_PROFILING && PCDPatcher._onEventRecord) {
                  PCDPatcher._onEventRecord({
                    type: "Macro",
                    data: `Executed: ${this.name}`,
                    timestamp: PCDPatcher._getTimestamp(),
                    source: { title: "User/Macro", id: "macro" }
                });
             }
             return originalExecute.apply(this, args);
         };
    }

    static _patchSockets() {
        if (!game.socket) return;
        
        const originalEmit = game.socket.emit;
        game.socket.emit = function(...args) {
            if (PCDPatcher.IS_PROFILING && PCDPatcher._onEventRecord) {
                 // Args: event, data, options...
                 const eventName = args[0];
                 // Often "module.<id>"
                 let sourceId = "core";
                 if (typeof eventName === 'string' && eventName.startsWith('module.')) {
                     sourceId = eventName.split('.')[1];
                 }

                 PCDPatcher._onEventRecord({
                    type: "Socket",
                    data: `Emit: ${eventName}`,
                    details: args[1], // The payload
                    timestamp: PCDPatcher._getTimestamp(),
                    source: { title: sourceId, id: sourceId }
                });
            }
            return originalEmit.apply(this, args);
        };
    }

    static _patchNotifications() {
        if (!ui.notifications) return;

        const originalNotify = ui.notifications.notify;
        ui.notifications.notify = function(message, type="info", options={}) {
             if (PCDPatcher.IS_PROFILING && PCDPatcher._onEventRecord) {
                 PCDPatcher._onEventRecord({
                    type: "UI",
                    data: `Notification (${type}): ${message}`,
                    timestamp: PCDPatcher._getTimestamp(),
                    source: { title: "Core UI", id: "ui" }
                });
             }
             return originalNotify.call(this, message, type, options);
        };
    }
}
