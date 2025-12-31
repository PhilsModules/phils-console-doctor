export class PCDResolver {
    static ID = 'phils-console-doctor';
    static SETTING_KEY = 'resolverState';

    /**
     * State Structure:
     * {
     *   active: boolean,
     *   step: number,
     *   candidates: string[] (Module IDs),
     *   safelist: string[],
     *   originalState: object,
     *   currentCheck: string[],
     *   batchA: string[],
     *   batchB: string[],
     *   activeBatch: string|null, // 'A' or 'B'
     *   shuffleCount: number
     * }
     */

    static get state() {
        return game.settings.get(this.ID, this.SETTING_KEY);
    }

    static async init() {
        game.settings.register(this.ID, this.SETTING_KEY, {
            scope: 'world',
            config: false,
            type: Object,
            default: { active: false }
        });
    }

    static isActive() {
        return this.state?.active || false;
    }

    static async start(safelist = []) {
        // 1. Snapshot
        // Filter out safelist from candidates (we won't test them, we assume they are fine)
        const activeModules = game.modules.filter(m => m.active && m.id !== this.ID && !safelist.includes(m.id)).map(m => m.id);
        const originalConfig = game.settings.get("core", "moduleConfiguration");

        console.log("PCD Resolver | Starting Bisect. Candidates:", activeModules.length, "Safelist:", safelist.length);

        // 2. Initial State
        const newState = {
            active: true,
            step: 0,
            candidates: activeModules,
            safelist: safelist,
            originalState: originalConfig,
            currentCheck: [],
            // A/B Logic
            batchA: [],
            batchB: [],
            activeBatch: null,
            shuffleCount: 0
        };
        
        await this._saveState(newState);
        await this._nextStep();
    }

    static async resolve(issuePersists) {
        const state = this.state;
        if (!state.active) return;

        console.log(`PCD Resolver | Issue Persists? ${issuePersists} (Batch: ${state.activeBatch})`);

        if (issuePersists) {
            // CASE 1: FOUND IT (or at least a group containing it)
            // Whether A or B, we narrow down to this group.
            state.candidates = state.currentCheck;
            
            // Reset Batches
            state.batchA = [];
            state.batchB = [];
            state.activeBatch = null;
            state.shuffleCount = 0; // Reset shuffle counter on progress

            await this._saveState(state);
            await this._checkEndCondition();

        } else {
            // CASE 2: NOT HERE
            
            if (state.activeBatch === 'A') {
                // Not in A. MUST Check B to be sure.
                state.activeBatch = 'B';
                state.currentCheck = state.batchB;
                await this._saveState(state);
                
                console.log("PCD Resolver | Not in A. Checking Batch B...");
                await this._applyConfig(state.currentCheck);

            } else if (state.activeBatch === 'B') {
                // Not in A, Not in B.
                // This is a SPLIT CONFLICT (Requires A+B mix).
                console.warn(`PCD Resolver | Split Conflict Detected (Shuffle #${state.shuffleCount}). Retrying...`);
                
                // SHUFFLE and RETRY
                state.shuffleCount = (state.shuffleCount || 0) + 1;
                state.candidates = this._shuffle(state.candidates);
                state.activeBatch = null; // Reset to force new split
                
                await this._saveState(state);
                
                // Try again with new shuffle
                await this._nextStep();
            }
        }
    }

    static async _checkEndCondition() {
        const state = this.state;
        if (state.candidates.length === 0) {
             // Should not happen if logic is correct, unless empty start
             await this._finish(null);
        } else if (state.candidates.length === 1) {
            // Verification step for the final single candidate
            await this._finish(state.candidates[0]);
        } else {
            await this._nextStep();
        }
    }

    static async _nextStep() {
        const state = this.state;
        state.step++;
        
        // Split candidates in half
        const half = Math.ceil(state.candidates.length / 2);
        
        state.batchA = state.candidates.slice(0, half);
        state.batchB = state.candidates.slice(half);
        
        // Start checking A
        state.activeBatch = 'A';
        state.currentCheck = state.batchA;
        
        await this._saveState(state);

        console.log(`PCD Resolver | Step ${state.step}. Shuffle ${state.shuffleCount || 0}. Testing Batch A (${state.batchA.length}/${state.candidates.length}).`);
        this._applyConfig(state.currentCheck);
    }
    
    static async _applyConfig(toEnable) {
        const state = this.state;
        const newConfig = { ...state.originalState };
        // Enable: Test Batch + THIS Module + Safelist
        const modulesToEnable = new Set([...toEnable, this.ID, ...(state.safelist || [])]);
        
        for (const [id, val] of Object.entries(state.originalState)) {
             if (id === this.ID) continue; 
             if (modulesToEnable.has(id)) {
                 newConfig[id] = true;
             } else {
                 newConfig[id] = false; 
             }
        }

        console.log("PCD Resolver | Reloading...", newConfig);
        await game.settings.set("core", "moduleConfiguration", newConfig);
        location.reload();
    }

    static async _finish(culpritId) {
        const state = this.state;
        const culprit = culpritId ? game.modules.get(culpritId)?.title || culpritId : "None (Core Issue?)";
        
        console.log("PCD Resolver | FOUND CULPRIT:", culprit);
        
        state.finished = true;
        state.culprit = culprit;
        state.culpritId = culpritId;
        state.currentCheck = [];
        
        await this._saveState(state);
    }

    static async stop() {
        const state = this.state;
        if (!state.active) return;
        
        console.log("PCD Resolver | Aborted. Restoring...");

        if (state.originalState) {
            await game.settings.set("core", "moduleConfiguration", state.originalState);
            await this._saveState({ active: false });
            location.reload();
        } else {
            await this._saveState({ active: false });
        }
    }

    static async _saveState(newState) {
        await game.settings.set(this.ID, this.SETTING_KEY, newState);
    }

    static _shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
}
