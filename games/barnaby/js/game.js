/**
 * game.js — Game logic: world generation, physics, HUD, shop, input, rendering, boot.
 * Depends on globals from config.js, sound.js, world.js.
 */

/* ---------------- World generation ---------------- */

function generateWorldChunk(fromX, toX) {
    for (let x = fromX; x < toX; x += 340) {
        if (Math.random() < 0.68) {
            const colX = x + 60 + Math.random() * 220;
            const colW = 85 + Math.random() * 55;
            const colH = 340 + Math.random() * 520;
            const baseAlt = -(20 + Math.random() * 380);
            const u = {
                x: colX,
                y: baseAlt,
                width: colW,
                height: colH,
                seedPhase: Math.random() * Math.PI * 2,
                mesh: null
            };
            if (threeWorld) threeWorld.createUpdraftMesh(u);
            state.updrafts.push(u);
        }

        if (Math.random() < 0.55) {
            const m = {
                x: x + 40 + Math.random() * 260,
                radius: 34 + Math.random() * 14,
                squish: 0,
                mesh: null
            };
            if (threeWorld) threeWorld.createMushroomMesh(m);
            state.mushrooms.push(m);
        }

        const boosterCount = 2 + Math.floor(Math.random() * 2);
        for (let b = 0; b < boosterCount; b++) {
            const bx = x + Math.random() * 320;
            const by = -(80 + Math.random() * 980);
            const roll = Math.random();
            let type = 'acorn';
            if (roll < 0.28) type = 'rocket';
            else if (roll < 0.62) type = 'ring';

            const booster = {
                x: bx,
                y: by,
                type: type,
                radius: type === 'ring' ? 30 : 22,
                collected: false,
                bobPhase: Math.random() * Math.PI * 2,
                mesh: null
            };
            if (threeWorld) threeWorld.createBoosterMesh(booster);
            state.boosters.push(booster);
        }

        if (x > 650) {
            const hazardCount = 1 + (Math.random() < 0.55 ? 1 : 0);
            for (let h = 0; h < hazardCount; h++) {
                const hx = x + Math.random() * 320;
                const hy = -(95 + Math.random() * 920);
                const isBee = Math.random() < 0.65;
                const hazard = {
                    x: hx,
                    y: hy,
                    baseY: hy,
                    type: isBee ? 'bee' : 'storm',
                    radius: isBee ? 22 : 34,
                    hit: false,
                    phase: Math.random() * Math.PI * 2,
                    mesh: null
                };
                if (threeWorld) threeWorld.createHazardMesh(hazard);
                state.hazards.push(hazard);
            }
        }
    }
    state.generatedUntilX = toX;
}

function pruneDistantEntities(camLeftX) {
    const cutoff = camLeftX - 600;
    state.updrafts = state.updrafts.filter(u => {
        if (u.x + u.width <= cutoff) {
            if (threeWorld) threeWorld.removeMesh(u);
            return false;
        }
        return true;
    });
    state.mushrooms = state.mushrooms.filter(m => {
        if (m.x + m.radius <= cutoff) {
            if (threeWorld) threeWorld.removeMesh(m);
            return false;
        }
        return true;
    });
    state.boosters = state.boosters.filter(b => {
        if (b.collected || b.x <= cutoff) {
            if (threeWorld) threeWorld.removeMesh(b);
            return false;
        }
        return true;
    });
    state.hazards = state.hazards.filter(h => {
        if (h.hit || h.x <= cutoff) {
            if (threeWorld) threeWorld.removeMesh(h);
            return false;
        }
        return true;
    });
}

/* ---------------- Particles & floating text ---------------- */

function spawnParticle(x, y, vx, vy, color, size = 5, life = 0.5) {
    state.particles.push({
        x, y, vx, vy, color, size, life, maxLife: life
    });
    if (threeWorld && threeWorld.voxelParticles.length < 90) {
        threeWorld.spawnVoxelParticle(x, y, vx, vy, color, size, life);
    }
}

function spawnBurst(x, y, color, count = 14, speed = 180) {
    for (let i = 0; i < count; i++) {
        const ang = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
        const spd = speed * (0.4 + Math.random() * 0.8);
        spawnParticle(
            x, y,
            Math.cos(ang) * spd,
            Math.sin(ang) * spd,
            color,
            4 + Math.random() * 5,
            0.45 + Math.random() * 0.35
        );
    }
}

function spawnFloatingText(x, y, text, color = '#15803d') {
    state.floatingTexts.push({
        x, y,
        vy: -75,
        text,
        color,
        life: 1.1,
        maxLife: 1.1
    });
}

/* ---------------- Run lifecycle ---------------- */

function resetGame() {
    state.phase = PHASE.AIMING;
    state.meterAngle = 0;
    state.launchPower = 0;
    state.canY = -260;
    state.canVy = 0;
    state.seesawAngle = -0.22;

    const maxStam = 100 + (state.upgrades.leafLevel - 1) * 25;

    state.gnome.x = 230;
    state.gnome.y = -24;
    state.gnome.vx = 0;
    state.gnome.vy = 0;
    state.gnome.angle = 0;
    state.gnome.gliding = false;
    state.gnome.maxStamina = maxStam;
    state.gnome.stamina = maxStam;
    state.gnome.rocketTimer = 0;
    state.gnome.spinVel = 0;
    state.gnome.bounces = 0;
    state.gnome.onGroundTime = 0;
    state.gnome.hurtTimer = 0;

    state.cam.x = 0;
    state.cam.y = 0;

    state.stats.distanceM = 0;
    state.stats.peakAltM = 0;
    state.stats.speedMS = 0;
    state.stats.boostsCollected = 0;
    state.stats.acornsEarnedThisRun = 0;

    state.passedRecordThisRun = false;
    state.recordFlagX = state.stats.bestDistanceM >= 5 ? (230 + state.stats.bestDistanceM * PX_PER_METER) : 0;

    if (threeWorld) {
        threeWorld.clearDynamicMeshes();
        threeWorld.updateRecordFlagPosition(state.stats.bestDistanceM);
    }
    state.updrafts = [];
    state.boosters = [];
    state.hazards = [];
    state.mushrooms = [];
    state.particles = [];
    state.floatingTexts = [];
    state.generatedUntilX = 450;

    generateWorldChunk(450, 3200);

    document.getElementById('results-modal').classList.add('hidden');
    updatePhaseBanner(
        "PRESS [P] OR SPACE AT GREEN PEAK TO DROP!",
        "bg-[#b82973]"
    );
    updateActionButtonLabel();
    updateShopUI();
    updateHUD();
}

function updatePhaseBanner(text, dotColorClass) {
    const banner = document.getElementById('phase-banner');
    const phaseText = document.getElementById('phase-text');
    const phaseDot = document.getElementById('phase-dot');
    banner.style.opacity = '1';
    phaseText.textContent = text;
    phaseDot.className = `w-2.5 h-2.5 ${dotColorClass} inline-block animate-pulse`;
}

function updateActionButtonLabel() {
    const statusName = document.getElementById('lcd-status-name');
    if (!statusName) return;
    statusName.textContent = state.gnomeName;
}

function triggerDropCan() {
    if (state.phase !== PHASE.AIMING) return;
    sound.init();
    sound.playDrop();

    const rawPower = (Math.sin(state.meterAngle) + 1) * 0.5;
    state.launchPower = Math.pow(rawPower, 1.35);

    state.phase = PHASE.DROPPING;
    state.canVy = 220;

    updatePhaseBanner("INCOMING SPLASHDOWN...", "bg-sky-600");
}

function executeSeesawLaunch() {
    state.phase = PHASE.FLYING;
    state.seesawAngle = 0.25;

    const p = state.launchPower;
    let grade = "Flop...";
    let calloutColor = "#64748b";

    if (p >= 0.92) {
        grade = "PERFECT LAUNCH!!";
        calloutColor = "#16a34a";
    } else if (p >= 0.75) {
        grade = "SUPER LAUNCH!";
        calloutColor = "#0284c7";
    } else if (p >= 0.45) {
        grade = "GOOD LAUNCH";
        calloutColor = "#ca8a04";
    }
    state.launchGrade = grade;

    const canBonus = 1 + (state.upgrades.canLevel - 1) * 0.12;
    const minVx = 175 * canBonus, maxVx = 760 * canBonus;
    const minVy = -230 * canBonus, maxVy = -790 * canBonus;

    state.gnome.vx = minVx + p * (maxVx - minVx);
    state.gnome.vy = minVy + p * (maxVy - minVy);
    state.gnome.y = -42;

    sound.playLaunch(p);
    spawnBurst(140, -15, '#38bdf8', 18, 220);
    spawnBurst(state.gnome.x, state.gnome.y, '#fbbf24', 22, 260);
    spawnFloatingText(state.gnome.x, state.gnome.y - 40, grade, calloutColor);

    updatePhaseBanner("HOLD [P] OR SPACE TO GLIDE!", "bg-emerald-700");
    updateActionButtonLabel();
}

function awardAcorns(amount) {
    state.stats.acornsEarnedThisRun += amount;
    state.stats.totalAcorns += amount;
    document.getElementById('hud-acorns-total').textContent = `${state.stats.totalAcorns}`;
    saveProgression();
    updateShopUI();
}

function finishRun() {
    state.phase = PHASE.ENDED;
    document.getElementById('phase-banner').style.opacity = '0';

    const distBonus = Math.max(1, Math.floor(state.stats.distanceM / 35));
    awardAcorns(distBonus);

    document.getElementById('res-distance').textContent = `${state.stats.distanceM.toFixed(1)} m`;
    document.getElementById('res-altitude').textContent = `${state.stats.peakAltM.toFixed(1)} m`;
    document.getElementById('res-boosts').textContent = `${state.stats.boostsCollected}`;
    document.getElementById('res-acorns').textContent = `+${state.stats.acornsEarnedThisRun} ♦`;
    document.getElementById('res-grade').textContent = state.launchGrade;
    document.getElementById('results-subtitle').textContent = `${state.gnomeName} landed in the clover patch.`;

    const isRecord = state.passedRecordThisRun || (state.stats.distanceM >= state.stats.bestDistanceM && state.stats.distanceM > 15);
    const badge = document.getElementById('new-record-badge');
    if (isRecord) badge.classList.remove('hidden');
    else badge.classList.add('hidden');

    document.getElementById('results-modal').classList.remove('hidden');
    updateActionButtonLabel();
}

/* ---------------- Physics ---------------- */

function updatePhysics(dt) {
    state.time += dt;

    for (const c of state.bgClouds) {
        c.x -= c.speed * dt;
        if (c.x < -300) c.x = canvas.width + 250;
    }

    if (state.phase === PHASE.AIMING) {
        state.meterAngle += state.meterSpeed * dt;
        state.canY = -255 + Math.sin(state.time * 4) * 6;
        if (state.inputJustPressed) {
            triggerDropCan();
        }
    } else if (state.phase === PHASE.DROPPING) {
        state.canVy += 1950 * dt;
        state.canY += state.canVy * dt;
        if (state.canY >= -28) {
            state.canY = -28;
            executeSeesawLaunch();
        }
    } else if (state.phase === PHASE.FLYING) {
        const g = state.gnome;

        if (g.x + 1800 > state.generatedUntilX) {
            generateWorldChunk(state.generatedUntilX, state.generatedUntilX + 2400);
            pruneDistantEntities(state.cam.x);
        }

        if (g.rocketTimer > 0) {
            g.rocketTimer -= dt;
            g.vx = Math.max(g.vx, 880);
            g.vy = Math.min(g.vy, -110);
            if (Math.random() < 0.85) {
                spawnParticle(
                    g.x - 24, g.y + (Math.random() - 0.5) * 14,
                    -180 - Math.random() * 120, (Math.random() - 0.5) * 80,
                    Math.random() < 0.5 ? '#f97316' : '#fef08a',
                    6 + Math.random() * 6, 0.35
                );
            }
        }

        if (g.hurtTimer > 0) g.hurtTimer -= dt;

        const wantsGlide = state.inputHeld && g.y < -18 && g.stamina > 1;
        if (wantsGlide && !g.gliding) {
            g.gliding = true;
            sound.playGlideOpen();
        } else if (!wantsGlide && g.gliding) {
            g.gliding = false;
        }

        const gravity = 890;
        const leafDrainRate = Math.max(10, 21 - (state.upgrades.leafLevel - 1) * 2.2);
        const glideConvertBonus = 0.35 + (state.upgrades.leafLevel - 1) * 0.05;

        if (g.gliding) {
            g.stamina = Math.max(0, g.stamina - leafDrainRate * dt);
            g.vy += gravity * 0.28 * dt;
            if (g.vy > 115) {
                const converted = (g.vy - 115) * glideConvertBonus;
                g.vx += converted * dt * 8;
                g.vy = 115;
            }
            g.vx *= Math.pow(0.992, dt * 60);
            const minGlideVx = 260 + (state.upgrades.leafLevel - 1) * 25;
            if (g.vx < minGlideVx && g.y < -60) {
                g.vx += 140 * dt;
            }

            if (Math.random() < 0.4) {
                spawnParticle(g.x - 18, g.y - 12, -60, 25, '#84cc16', 4, 0.4);
            }
        } else {
            g.vy += gravity * dt;
            g.vx *= Math.pow(0.996, dt * 60);
            if (g.y < -15) {
                g.stamina = Math.min(g.maxStamina, g.stamina + 7.5 * dt);
            }
        }

        for (const u of state.updrafts) {
            const inX = g.x >= u.x && g.x <= u.x + u.width;
            const inY = g.y <= u.y && g.y >= u.y - u.height;
            if (inX && inY) {
                const liftMultiplier = g.gliding ? 1.85 : 0.95;
                g.vy -= 740 * liftMultiplier * dt;
                g.vy = Math.max(g.vy, -580);
                g.vx += 65 * dt;
                g.stamina = Math.min(g.maxStamina, g.stamina + 14 * dt);

                if (Math.random() < 0.45) {
                    spawnParticle(
                        g.x + (Math.random() - 0.5) * 30,
                        g.y + 15,
                        (Math.random() - 0.5) * 30,
                        -180 - Math.random() * 90,
                        '#ffffff', 4, 0.5
                    );
                }
            }
        }

        g.x += g.vx * dt;
        g.y += g.vy * dt;

        if (g.gliding) {
            const targetAngle = -0.14 + Math.min(0.25, g.vy * 0.0008);
            g.angle += (targetAngle - g.angle) * 10 * dt;
        } else if (g.rocketTimer > 0) {
            g.angle += (0 - g.angle) * 12 * dt;
        } else {
            const targetAngle = Math.atan2(g.vy, Math.max(50, g.vx)) * 0.45;
            g.angle += (targetAngle - g.angle) * 8 * dt;
        }

        const bootsMult = 1 + (state.upgrades.bootsLevel - 1) * 0.12;
        for (const m of state.mushrooms) {
            if (m.squish > 0) m.squish = Math.max(0, m.squish - 3 * dt);
            const dx = g.x - m.x;
            if (Math.abs(dx) < m.radius + 16 && g.y >= -m.radius * 1.25 && g.vy > 0) {
                g.y = -m.radius * 1.25;
                g.vy = -Math.max(480 * bootsMult, Math.abs(g.vy) * 0.88 * bootsMult);
                g.vx = Math.max(g.vx * (1.08 + (state.upgrades.bootsLevel - 1) * 0.03), 440 * bootsMult);
                g.stamina = Math.min(g.maxStamina, g.stamina + 25);
                m.squish = 1;
                state.stats.boostsCollected++;
                awardAcorns(1);
                sound.playBounce(true);
                spawnBurst(m.x, -m.radius, '#f43f5e', 16, 210);
                spawnFloatingText(g.x, g.y - 30, "BOING!! +1♦", "#e11d48");
            }
        }

        for (const b of state.boosters) {
            if (b.collected) continue;
            const bobY = b.y + Math.sin(state.time * 4 + b.bobPhase) * 8;
            const dist = Math.hypot(g.x - b.x, g.y - bobY);
            if (dist < b.radius + 22) {
                b.collected = true;
                state.stats.boostsCollected++;
                sound.playBooster(b.type);

                if (b.type === 'rocket') {
                    g.rocketTimer = 1.35;
                    g.vx = Math.max(g.vx + 340, 880);
                    g.vy = Math.min(g.vy, -240);
                    g.stamina = g.maxStamina;
                    awardAcorns(2);
                    spawnBurst(b.x, bobY, '#f97316', 22, 260);
                    spawnFloatingText(b.x, bobY - 25, "FIZZY ROCKET! +2♦", "#ea580c");
                } else if (b.type === 'ring') {
                    g.vx = Math.max(g.vx + 240, 680);
                    g.vy = Math.min(g.vy - 180, -260);
                    g.stamina = Math.min(g.maxStamina, g.stamina + 45);
                    awardAcorns(2);
                    spawnBurst(b.x, bobY, '#eab308', 18, 220);
                    spawnFloatingText(b.x, bobY - 25, "SPEED RING! +2♦", "#ca8a04");
                } else {
                    g.stamina = g.maxStamina;
                    g.vx += 95;
                    g.vy = Math.min(g.vy, -140);
                    awardAcorns(3);
                    spawnBurst(b.x, bobY, '#facc15', 16, 200);
                    spawnFloatingText(b.x, bobY - 25, "GOLDEN ACORN! +3♦", "#ca8a04");
                }
            }
        }

        for (const h of state.hazards) {
            if (h.hit) continue;
            if (h.type === 'bee') {
                h.y = h.baseY + Math.sin(state.time * 3.5 + h.phase) * 35;
            }
            const dist = Math.hypot(g.x - h.x, g.y - h.y);
            if (dist < h.radius + 18 && g.rocketTimer <= 0) {
                h.hit = true;
                g.hurtTimer = 0.6;
                g.vx *= 0.58;
                g.vy = Math.max(g.vy, 160);
                g.stamina = Math.max(0, g.stamina - 30);
                sound.playHazard();
                spawnBurst(h.x, h.y, '#475569', 16, 180);
                spawnFloatingText(
                    h.x, h.y - 25,
                    h.type === 'bee' ? "OUCH! Grumpy Bee!" : "ZAP! Thistle Cloud!",
                    "#dc2626"
                );
            } else if (dist < h.radius + 22 && g.rocketTimer > 0) {
                h.hit = true;
                spawnBurst(h.x, h.y, '#fbbf24', 15, 240);
                spawnFloatingText(h.x, h.y - 25, "SMASHED!", "#f97316");
            }
        }

        if (g.y >= -18) {
            g.y = -18;
            if (g.vy > 135) {
                const bounceRetention = Math.min(0.75, 0.52 + (state.upgrades.bootsLevel - 1) * 0.05);
                g.vy = -g.vy * bounceRetention;
                g.vx *= Math.min(0.92, 0.78 + (state.upgrades.bootsLevel - 1) * 0.03);
                g.bounces++;
                sound.playBounce(false);
                spawnBurst(g.x, -5, '#65a30d', 12, 150);
                if (g.bounces <= 2 + Math.floor(state.upgrades.bootsLevel / 2)) {
                    spawnFloatingText(g.x, -45, "Springy Bounce!", "#4d7c0f");
                }
            } else {
                g.vy = 0;
                g.vx *= Math.pow(0.86, dt * 60);
                if (Math.abs(g.vx) > 25 && Math.random() < 0.5) {
                    spawnParticle(g.x - 10, -4, -40, -30 - Math.random() * 40, '#84cc16', 4, 0.3);
                }
                if (Math.abs(g.vx) < 12) {
                    g.vx = 0;
                    g.onGroundTime += dt;
                    if (g.onGroundTime > 0.35) {
                        finishRun();
                    }
                }
            }
        } else {
            g.onGroundTime = 0;
        }

        const currentDistM = Math.max(0, (g.x - 230) / PX_PER_METER);
        const currentAltM = Math.max(0, (-g.y - 18) / PX_PER_METER);
        const currentSpdMS = Math.hypot(g.vx, g.vy) / PX_PER_METER;

        state.stats.distanceM = currentDistM;
        if (currentAltM > state.stats.peakAltM) {
            state.stats.peakAltM = currentAltM;
        }
        state.stats.speedMS = currentSpdMS;

        if (!state.passedRecordThisRun && state.recordFlagX > 0 && g.x >= state.recordFlagX) {
            state.passedRecordThisRun = true;
            sound.playRecordPass();
            awardAcorns(5);
            spawnBurst(state.recordFlagX, -90, '#facc15', 28, 300);
            spawnBurst(state.recordFlagX, -130, '#ec4899', 24, 260);
            spawnFloatingText(g.x, g.y - 50, "★ NEW RECORD PASSED! +5♦ ★", "#b82973");
        }

        if (currentDistM > state.stats.bestDistanceM) {
            state.stats.bestDistanceM = currentDistM;
            saveProgression();
        }

        const targetCamX = Math.max(0, g.x - canvas.width * 0.28);
        const targetCamY = Math.min(0, g.y + canvas.height * 0.52);
        state.cam.x += (targetCamX - state.cam.x) * 8 * dt;
        state.cam.y += (targetCamY - state.cam.y) * 6 * dt;

        updateHUD();
    }

    for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        if (p.life <= 0) state.particles.splice(i, 1);
    }

    for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
        const ft = state.floatingTexts[i];
        ft.y += ft.vy * dt;
        ft.life -= dt;
        if (ft.life <= 0) state.floatingTexts.splice(i, 1);
    }

    state.inputJustPressed = false;
}

/* ---------------- HUD & shop UI ---------------- */

function updateHUD() {
    document.getElementById('hud-distance').textContent = `${state.stats.distanceM.toFixed(1)} m`;
    document.getElementById('hud-altitude').textContent = `${Math.max(0, (-state.gnome.y - 18) / PX_PER_METER).toFixed(1)} m`;
    document.getElementById('hud-speed').textContent = `${state.stats.speedMS.toFixed(0)} m/s`;
    document.getElementById('hud-best').textContent = `${state.stats.bestDistanceM.toFixed(1)}m`;
    document.getElementById('hud-acorns-total').textContent = `${state.stats.totalAcorns}`;

    const boostsTop = document.getElementById('hud-boosts-top');
    if (boostsTop) boostsTop.textContent = `${state.stats.boostsCollected}`;

    const stamPct = Math.round((state.gnome.stamina / state.gnome.maxStamina) * 100);
    document.getElementById('hud-stamina-text').textContent = `${stamPct}%`;

    const heartsEl = document.getElementById('lcd-hearts');
    if (heartsEl) {
        const fullHearts = Math.ceil((stamPct / 100) * 4);
        let heartStr = '';
        for (let i = 0; i < 4; i++) {
            heartStr += i < fullHearts ? '♥' : '♡';
        }
        heartsEl.textContent = heartStr;
    }

    const targetsEl = document.getElementById('lcd-targets');
    if (targetsEl) {
        const spdCount = Math.min(4, Math.max(1, Math.ceil(state.stats.speedMS / 14)));
        targetsEl.textContent = '◎'.repeat(spdCount);
    }

    const sprite = document.getElementById('lcd-gnome-sprite');
    const moodBadge = document.getElementById('lcd-mood-badge');
    const eyeL = document.getElementById('lcd-eye-l');
    const eyeR = document.getElementById('lcd-eye-r');

    if (sprite && moodBadge) {
        if (state.gnome.hurtTimer > 0) {
            sprite.style.transform = `translate(${Math.sin(state.time * 50) * 3}px, 1px) rotate(12deg)`;
            moodBadge.textContent = '!';
            if (eyeL && eyeR) { eyeL.setAttribute('height', '0.5'); eyeR.setAttribute('height', '0.5'); }
        } else if (state.gnome.rocketTimer > 0) {
            sprite.style.transform = 'translateY(-3px) rotate(-14deg) scale(1.08)';
            moodBadge.textContent = '⚡';
            if (eyeL && eyeR) { eyeL.setAttribute('height', '1'); eyeR.setAttribute('height', '1'); }
        } else if (state.passedRecordThisRun && state.phase === PHASE.FLYING) {
            sprite.style.transform = `translateY(${Math.sin(state.time * 12) * 2 - 2}px) rotate(-6deg)`;
            moodBadge.textContent = '★';
            if (eyeL && eyeR) { eyeL.setAttribute('height', '1'); eyeR.setAttribute('height', '1'); }
        } else if (state.gnome.gliding) {
            sprite.style.transform = 'translateY(-2px) rotate(-8deg)';
            moodBadge.textContent = '♥';
            if (eyeL && eyeR) { eyeL.setAttribute('height', '1'); eyeR.setAttribute('height', '1'); }
        } else {
            sprite.style.transform = 'none';
            moodBadge.textContent = state.shopOpen ? '♦' : '';
            if (eyeL && eyeR) { eyeL.setAttribute('height', '1'); eyeR.setAttribute('height', '1'); }
        }
    }
}

function updateShopUI() {
    const bal = document.getElementById('shop-acorn-balance');
    if (bal) bal.textContent = `${state.stats.totalAcorns}♦`;

    const items = [
        { key: 'canLevel', lvlId: 'upg-lvl-can', btnId: 'btn-buy-can' },
        { key: 'leafLevel', lvlId: 'upg-lvl-leaf', btnId: 'btn-buy-leaf' },
        { key: 'bootsLevel', lvlId: 'upg-lvl-boots', btnId: 'btn-buy-boots' }
    ];

    for (const item of items) {
        const lvl = state.upgrades[item.key];
        const lvlEl = document.getElementById(item.lvlId);
        const btnEl = document.getElementById(item.btnId);
        if (!lvlEl || !btnEl) continue;

        lvlEl.textContent = `Lv.${lvl}`;
        if (lvl >= 5) {
            btnEl.textContent = 'MAX';
            btnEl.disabled = true;
            btnEl.classList.add('opacity-50', 'cursor-not-allowed');
        } else {
            const cost = getUpgradeCost(lvl);
            btnEl.textContent = `${cost}♦`;
            const canAfford = state.stats.totalAcorns >= cost;
            btnEl.disabled = !canAfford;
            if (canAfford) {
                btnEl.classList.remove('opacity-50', 'cursor-not-allowed');
            } else {
                btnEl.classList.add('opacity-50', 'cursor-not-allowed');
            }
        }
    }
}

function toggleShop(forceState) {
    state.shopOpen = typeof forceState === 'boolean' ? forceState : !state.shopOpen;
    const telemetry = document.getElementById('lcd-telemetry-panel');
    const shop = document.getElementById('lcd-shop-panel');
    const pillLabel = document.getElementById('shop-pill-label');

    if (state.shopOpen) {
        telemetry.classList.add('hidden');
        shop.classList.remove('hidden');
        if (pillLabel) pillLabel.textContent = 'Stats';
        updateShopUI();
    } else {
        shop.classList.add('hidden');
        telemetry.classList.remove('hidden');
        if (pillLabel) pillLabel.textContent = 'Shop';
    }
    updateHUD();
}

function buyUpgrade(upgradeKey) {
    sound.init();
    const lvl = state.upgrades[upgradeKey];
    if (lvl >= 5) return;
    const cost = getUpgradeCost(lvl);
    if (state.stats.totalAcorns < cost) return;

    state.stats.totalAcorns -= cost;
    state.upgrades[upgradeKey]++;
    sound.playPurchase();

    if (upgradeKey === 'leafLevel') {
        state.gnome.maxStamina = 100 + (state.upgrades.leafLevel - 1) * 25;
        state.gnome.stamina = state.gnome.maxStamina;
    }

    saveProgression();
    updateShopUI();
    updateHUD();
}

/* ---------------- 2D overlay rendering ---------------- */

function renderScene(dt = 0.016) {
    if (threeWorld) {
        threeWorld.syncAndRender(state, dt);
    }

    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    if (!threeWorld) return;

    const startX = Math.floor(state.cam.x / 100) * 100 - 200;
    const endX = state.cam.x + w + 500;
    const meterStepPx = 25 * PX_PER_METER;
    const firstSignX = Math.max(230 + meterStepPx, Math.floor(startX / meterStepPx) * meterStepPx + 230);
    for (let sx = firstSignX; sx < endX; sx += meterStepPx) {
        const distM = Math.round((sx - 230) / PX_PER_METER);
        if (distM <= 0) continue;
        const basePt = threeWorld.projectToScreen(sx, 0, w, h);
        const topPt = threeWorld.projectToScreen(sx, -48, w, h);

        ctx.fillStyle = '#78350f';
        ctx.fillRect(basePt.x - 3, topPt.y, 6, basePt.y - topPt.y);

        ctx.fillStyle = '#fef3c7';
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 2.5;
        ctx.fillRect(topPt.x - 28, topPt.y - 22, 56, 22);
        ctx.strokeRect(topPt.x - 28, topPt.y - 22, 56, 22);

        ctx.fillStyle = '#78350f';
        ctx.font = 'bold 12px Fredoka, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${distM}m`, topPt.x, topPt.y - 7);
    }

    if (state.recordFlagX > 0 && Math.abs(state.recordFlagX - (state.cam.x + w * 0.5)) < w) {
        const flagTop = threeWorld.projectToScreen(state.recordFlagX, -155, w, h);
        ctx.fillStyle = state.passedRecordThisRun ? '#16a34a' : '#b82973';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.fillRect(flagTop.x - 44, flagTop.y - 22, 88, 20);
        ctx.strokeRect(flagTop.x - 44, flagTop.y - 22, 88, 20);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px Silkscreen, monospace';
        ctx.textAlign = 'center';
        const flagDist = Math.round((state.recordFlagX - 230) / PX_PER_METER);
        ctx.fillText(`BEST: ${flagDist}m`, flagTop.x, flagTop.y - 8);
    }

    if (state.cam.x < 550 && (state.phase === PHASE.AIMING || state.phase === PHASE.DROPPING)) {
        const gaugeScreen = threeWorld.projectToScreen(68, -225, w, h);
        renderLaunchPowerGauge(gaugeScreen.x, gaugeScreen.y);
    }

    for (const ft of state.floatingTexts) {
        const pt = threeWorld.projectToScreen(ft.x, ft.y, w, h);
        ctx.globalAlpha = Math.max(0, ft.life / ft.maxLife);
        ctx.font = 'bold 18px Fredoka, sans-serif';
        ctx.textAlign = 'center';
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#ffffff';
        ctx.strokeText(ft.text, pt.x, pt.y);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, pt.x, pt.y);
    }
    ctx.globalAlpha = 1;

    if (state.phase === PHASE.FLYING && state.gnome.vx > 620) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        for (let i = 0; i < 7; i++) {
            const ly = ((i * 97 + state.time * 400) % h);
            const lx = ((i * 233 - state.time * 950) % w + w) % w;
            ctx.fillRect(lx, ly, 72, 4);
        }
    }
}

function renderLaunchPowerGauge(gx, gy) {
    const gh = 160;
    const gw = 26;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(gx - 5, gy - 5, gw + 10, gh + 10);

    const zoneGrad = ctx.createLinearGradient(0, gy + gh, 0, gy);
    zoneGrad.addColorStop(0, '#ef4444');
    zoneGrad.addColorStop(0.55, '#facc15');
    zoneGrad.addColorStop(0.85, '#22c55e');
    zoneGrad.addColorStop(1, '#10b981');
    ctx.fillStyle = zoneGrad;
    ctx.fillRect(gx, gy, gw, gh);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(gx + 2, gy + 2, gw - 4, 26);

    const norm = (Math.sin(state.meterAngle) + 1) * 0.5;
    const needleY = gy + gh - norm * gh;

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3;
    ctx.fillRect(gx - 8, needleY - 5, gw + 16, 10);
    ctx.strokeRect(gx - 8, needleY - 5, gw + 16, 10);

    ctx.font = 'bold 13px Fredoka, sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'center';
    ctx.fillText('POWER', gx + gw / 2, gy - 12);
}

/* ---------------- Input ---------------- */

function resizeCanvas() {
    const container = document.getElementById('viewport-container');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    if (threeWorld) {
        threeWorld.resize(canvas.width, canvas.height);
    }
}

window.addEventListener('resize', () => {
    resizeCanvas();
    renderScene(0.016);
});

window.addEventListener('mousemove', (e) => {
    const nx = (e.clientX / window.innerWidth) * 2 - 1;
    const ny = (e.clientY / window.innerHeight) * 2 - 1;
    state.cam.mouseYaw = nx;
    state.cam.mousePitch = -ny;
});

function handleActionPress(e) {
    if (e && e.cancelable && e.type.startsWith('touch')) {
        e.preventDefault();
    }
    sound.init();

    if (state.phase === PHASE.ENDED) {
        resetGame();
        return;
    }
    state.inputHeld = true;
    state.inputJustPressed = true;
    document.getElementById('btn-main-action')?.classList.add('pressed');
}

function handleActionRelease() {
    state.inputHeld = false;
    document.getElementById('btn-main-action')?.classList.remove('pressed');
}

canvas.addEventListener('mousedown', handleActionPress);
window.addEventListener('mouseup', handleActionRelease);
canvas.addEventListener('touchstart', handleActionPress, { passive: false });
window.addEventListener('touchend', handleActionRelease);

const btnMain = document.getElementById('btn-main-action');
btnMain.addEventListener('mousedown', handleActionPress);
btnMain.addEventListener('touchstart', handleActionPress, { passive: false });

window.addEventListener('keydown', (e) => {
    if (document.activeElement && document.activeElement.id === 'input-gnome-name') {
        if (e.code === 'Enter') {
            saveGnomeNameFromModal();
        }
        return;
    }
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'KeyP' || e.code === 'KeyF') {
        e.preventDefault();
        if (!e.repeat) {
            handleActionPress();
        }
    } else if (e.code === 'KeyR') {
        resetGame();
    }
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'KeyP' || e.code === 'KeyF') {
        handleActionRelease();
    }
});

document.getElementById('btn-relaunch-modal').addEventListener('click', resetGame);
document.getElementById('btn-top-reset').addEventListener('click', resetGame);
document.getElementById('btn-shop-toggle').addEventListener('click', () => toggleShop());
document.getElementById('btn-open-shop-modal').addEventListener('click', () => {
    document.getElementById('results-modal').classList.add('hidden');
    toggleShop(true);
    resetGame();
});

document.getElementById('btn-buy-can').addEventListener('click', () => buyUpgrade('canLevel'));
document.getElementById('btn-buy-leaf').addEventListener('click', () => buyUpgrade('leafLevel'));
document.getElementById('btn-buy-boots').addEventListener('click', () => buyUpgrade('bootsLevel'));

const nameModal = document.getElementById('name-modal');
const nameInput = document.getElementById('input-gnome-name');

function openNameModal() {
    nameInput.value = state.gnomeName;
    nameModal.classList.remove('hidden');
    setTimeout(() => nameInput.focus(), 50);
}

function saveGnomeNameFromModal() {
    const val = nameInput.value.trim().slice(0, 10);
    if (val.length > 0) {
        state.gnomeName = val;
        saveProgression();
        updateActionButtonLabel();
    }
    nameModal.classList.add('hidden');
}

document.getElementById('btn-edit-name').addEventListener('click', openNameModal);
document.getElementById('lcd-gnome-sprite').addEventListener('click', openNameModal);
document.getElementById('btn-save-name').addEventListener('click', saveGnomeNameFromModal);
document.getElementById('btn-cancel-name').addEventListener('click', () => {
    nameModal.classList.add('hidden');
});

document.getElementById('btn-cam-tilt').addEventListener('click', () => {
    if (threeWorld) {
        threeWorld.cycleScenePalette();
    }
});

const helpModal = document.getElementById('help-modal');
document.getElementById('btn-help').addEventListener('click', () => {
    helpModal.classList.toggle('hidden');
});
document.getElementById('btn-close-help').addEventListener('click', () => {
    helpModal.classList.add('hidden');
});
document.getElementById('btn-close-help-bottom').addEventListener('click', () => {
    helpModal.classList.add('hidden');
});

document.getElementById('btn-sound').addEventListener('click', () => {
    sound.init();
    const isOn = sound.toggle();
    const icon = document.getElementById('icon-sound');
    icon.className = isOn ? 'ph-fill ph-gear-six text-xl text-[#2d3748]' : 'ph-fill ph-speaker-slash text-xl text-rose-500';
});

document.getElementById('btn-pixel-mode').addEventListener('click', () => {
    if (!threeWorld) return;
    const isPix = threeWorld.togglePixelMode();
    const track = document.getElementById('pixel-switch-track');
    if (isPix) track.classList.remove('off');
    else track.classList.add('off');
    document.getElementById('pixel-mode-label').textContent = isPix ? 'ON' : 'HD';
});

/* ---------------- Main loop & boot ---------------- */

let lastFrameTime = performance.now();

function gameLoop(now) {
    const dt = Math.min(0.05, (now - lastFrameTime) / 1000);
    lastFrameTime = now;

    updatePhysics(dt);
    renderScene(dt);

    requestAnimationFrame(gameLoop);
}

window.onload = function () {
    threeWorld = new ThreeWorld(threeContainer);
    resizeCanvas();
    resetGame();
    lastFrameTime = performance.now();
    requestAnimationFrame(gameLoop);
};
