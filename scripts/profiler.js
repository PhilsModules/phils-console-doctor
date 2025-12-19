import { PCDPatcher } from './patcher.js';

/**
 * PHILS CONSOLE DOCTOR - PERFORMANCE PROFILER
 * Stores and manages performance metrics collected by the Patcher.
 */
export class PCDProfiler {
    static IS_PROFILING = false;
    static IS_DIAGNOSING = false;
    static RECORDED_DATA = new Map();
    static BLOCKED_LOGS = [];
    static INITIALIZED = false;

    static init() {
        if (this.INITIALIZED) return;
        this.INITIALIZED = true;

        // Initialize Core Patcher
        PCDPatcher.init();

        // Connect Handlers
        PCDPatcher.setProfilerHandler(this.record.bind(this));
        PCDPatcher.setBlockHandler(this.recordBlock.bind(this));

        console.log("PCD: Profiler connected to Patcher.");
    }

    static toggleProfiling(active) {
        this.IS_PROFILING = active;
        PCDPatcher.IS_PROFILING = active;
        console.log(`PCD: ${active ? '🔴 Profiling' : '⏹️ Profiling'} ${active ? 'started' : 'stopped'}.`);
    }

    static toggleDiagnosis(active) {
        this.IS_DIAGNOSING = active;
        PCDPatcher.IS_DIAGNOSING = active;
        console.log(`PCD: ${active ? '🛡️ Live Diagnosis' : '⏹️ Live Diagnosis'} ${active ? 'started' : 'stopped'}.`);
    }

    static clearData() {
        this.RECORDED_DATA.clear();
        this.BLOCKED_LOGS = [];
        console.log("PCD: Data cleared.");
    }

    /**
     * Called by Patcher when a hook/action is measured.
     */
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

    /**
     * Called by Patcher when an action is blocked.
     */
    static recordBlock(moduleName, hookName) {
        if (!this.BLOCKED_LOGS) this.BLOCKED_LOGS = [];
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

// Global Access
window.PCDProfiler = PCDProfiler;
