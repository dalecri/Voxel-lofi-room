/**
 * config.js — Shared constants, game state, DOM refs, and localStorage progression.
 * Loaded first; everything else reads from the globals defined here.
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const threeContainer = document.getElementById('three-container');

const PX_PER_METER = 18;
const GROUND_OFFSET = 85;

const PHASE = {
    AIMING: 'AIMING',
    DROPPING: 'DROPPING',
    FLYING: 'FLYING',
    ENDED: 'ENDED'
};

const state = {
    phase: PHASE.AIMING,
    time: 0,
    meterAngle: 0,
    meterSpeed: 3.3,
    launchPower: 0,
    launchGrade: 'Good',
    canY: 0,
    canVy: 0,
    seesawAngle: -0.22,
    gnomeName: 'Barnaby',
    shopOpen: false,
    passedRecordThisRun: false,
    recordFlagX: 0,
    gnome: {
        x: 230,
        y: -26,
        vx: 0,
        vy: 0,
        angle: 0,
        gliding: false,
        stamina: 100,
        maxStamina: 100,
        rocketTimer: 0,
        spinVel: 0,
        bounces: 0,
        onGroundTime: 0,
        hurtTimer: 0
    },
    cam: {
        x: 0,
        y: 0,
        zoom: 1,
        mouseYaw: 0,
        mousePitch: 0
    },
    stats: {
        distanceM: 0,
        peakAltM: 0,
        speedMS: 0,
        boostsCollected: 0,
        acornsEarnedThisRun: 0,
        totalAcorns: 0,
        bestDistanceM: 0
    },
    upgrades: {
        canLevel: 1,
        leafLevel: 1,
        bootsLevel: 1
    },
    inputHeld: false,
    inputJustPressed: false,
    generatedUntilX: 0,
    updrafts: [],
    boosters: [],
    hazards: [],
    mushrooms: [],
    particles: [],
    floatingTexts: [],
    bgClouds: []
};

function saveProgression() {
    try {
        localStorage.setItem('barnaby_best_dist', state.stats.bestDistanceM.toFixed(1));
        localStorage.setItem('barnaby_acorns', String(state.stats.totalAcorns));
        localStorage.setItem('barnaby_upgrades', JSON.stringify(state.upgrades));
        localStorage.setItem('barnaby_name', state.gnomeName);
    } catch (e) {}
}

function loadProgression() {
    try {
        const savedDist = localStorage.getItem('barnaby_best_dist');
        if (savedDist) state.stats.bestDistanceM = parseFloat(savedDist) || 0;

        const savedAcorns = localStorage.getItem('barnaby_acorns');
        if (savedAcorns) state.stats.totalAcorns = parseInt(savedAcorns, 10) || 0;

        const savedUpg = localStorage.getItem('barnaby_upgrades');
        if (savedUpg) {
            const parsed = JSON.parse(savedUpg);
            state.upgrades.canLevel = Math.min(5, Math.max(1, parsed.canLevel || 1));
            state.upgrades.leafLevel = Math.min(5, Math.max(1, parsed.leafLevel || 1));
            state.upgrades.bootsLevel = Math.min(5, Math.max(1, parsed.bootsLevel || 1));
        }

        const savedName = localStorage.getItem('barnaby_name');
        if (savedName && savedName.trim().length > 0) {
            state.gnomeName = savedName.trim().slice(0, 10);
        }
    } catch (e) {}

    document.getElementById('hud-best').textContent = `${state.stats.bestDistanceM.toFixed(1)}m`;
    document.getElementById('hud-acorns-total').textContent = `${state.stats.totalAcorns}`;
}

function getUpgradeCost(level) {
    return level * 5;
}

loadProgression();
