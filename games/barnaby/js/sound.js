/**
 * sound.js — Procedural sound engine (Tone.js).
 * All game SFX are synthesized; no audio assets needed.
 */
class SoundManager {
    constructor() {
        this.enabled = true;
        this.initialized = false;
        this.synth = null;
        this.membrane = null;
    }

    async init() {
        if (this.initialized || !this.enabled) return;
        try {
            await Tone.start();
            this.synth = new Tone.PolySynth(Tone.Synth, {
                oscillator: { type: 'triangle' },
                envelope: { attack: 0.01, decay: 0.15, sustain: 0.05, release: 0.2 }
            }).toDestination();
            this.synth.volume.value = -8;

            this.membrane = new Tone.MembraneSynth({
                pitchDecay: 0.05,
                octaves: 4,
                envelope: { attack: 0.001, decay: 0.25, sustain: 0.01, release: 0.2 }
            }).toDestination();
            this.membrane.volume.value = -6;

            this.initialized = true;
        } catch (err) {
            console.warn("Audio init skipped:", err);
        }
    }

    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }

    playDrop() {
        if (!this.enabled || !this.initialized) return;
        try { this.synth.triggerAttackRelease("G5", "16n"); } catch (e) {}
    }

    playGlideOpen() {
        if (!this.enabled || !this.initialized) return;
        try {
            const now = Tone.now();
            this.synth.triggerAttackRelease("E5", "32n", now);
            this.synth.triggerAttackRelease("A5", "16n", now + 0.04);
        } catch (e) {}
    }

    playLaunch(powerRatio) {
        if (!this.enabled || !this.initialized) return;
        try {
            const now = Tone.now();
            this.membrane.triggerAttackRelease("C2", "8n", now);
            if (powerRatio > 0.85) {
                this.synth.triggerAttackRelease(["C5", "E5", "G5", "C6"], "8n", now + 0.05);
            } else if (powerRatio > 0.4) {
                this.synth.triggerAttackRelease(["C4", "G4", "C5"], "8n", now + 0.05);
            } else {
                this.synth.triggerAttackRelease(["F3", "E3"], "4n", now + 0.05);
            }
        } catch (e) {}
    }

    playBounce(isMushroom = false) {
        if (!this.enabled || !this.initialized) return;
        try {
            const now = Tone.now();
            this.membrane.triggerAttackRelease(isMushroom ? "G2" : "D2", "8n", now);
            if (isMushroom) {
                this.synth.triggerAttackRelease(["E5", "B5"], "16n", now + 0.03);
            }
        } catch (e) {}
    }

    playBooster(type) {
        if (!this.enabled || !this.initialized) return;
        try {
            const now = Tone.now();
            if (type === 'rocket') {
                this.synth.triggerAttackRelease("G4", "16n", now);
                this.synth.triggerAttackRelease("B4", "16n", now + 0.06);
                this.synth.triggerAttackRelease("D5", "16n", now + 0.12);
                this.synth.triggerAttackRelease("G5", "8n", now + 0.18);
            } else if (type === 'ring') {
                this.synth.triggerAttackRelease(["D5", "F#5", "A5"], "8n", now);
            } else {
                this.synth.triggerAttackRelease(["E5", "G#5"], "16n", now);
            }
        } catch (e) {}
    }

    playHazard() {
        if (!this.enabled || !this.initialized) return;
        try {
            this.synth.triggerAttackRelease(["C#3", "G3"], "8n", Tone.now());
        } catch (e) {}
    }

    playPurchase() {
        if (!this.enabled || !this.initialized) return;
        try {
            const now = Tone.now();
            this.synth.triggerAttackRelease("B5", "32n", now);
            this.synth.triggerAttackRelease("E6", "16n", now + 0.05);
        } catch (e) {}
    }

    playRecordPass() {
        if (!this.enabled || !this.initialized) return;
        try {
            const now = Tone.now();
            this.synth.triggerAttackRelease(["C5", "E5", "G5"], "16n", now);
            this.synth.triggerAttackRelease(["E5", "G5", "C6"], "8n", now + 0.08);
        } catch (e) {}
    }
}

const sound = new SoundManager();
