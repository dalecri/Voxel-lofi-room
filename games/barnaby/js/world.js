/**
 * world.js — THREE.JS 3D voxel isometric world manager.
 * Builds the static environment, launcher, Barnaby, and all dynamic entity meshes.
 */

class ThreeWorld {
    constructor(container) {
        this.container = container;
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x7dd3fc);
        this.pixelated = true;

        const w = container.clientWidth || 960;
        const h = container.clientHeight || 540;
        this.viewHeight = 560;
        const aspect = w / h;

        this.camera = new THREE.OrthographicCamera(
            (-this.viewHeight * aspect) / 2,
            (this.viewHeight * aspect) / 2,
            this.viewHeight / 2,
            -this.viewHeight / 2,
            -3000,
            5000
        );

        this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.BasicShadowMap;
        this.renderer.domElement.style.imageRendering = 'pixelated';
        container.appendChild(this.renderer.domElement);
        this.applyPixelScale(w, h);

        this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x3f6212, 0.8);
        this.hemiLight.position.set(0, 600, 0);
        this.scene.add(this.hemiLight);

        this.dirLight = new THREE.DirectionalLight(0xfffbeb, 0.95);
        this.dirLight.position.set(350, 750, 450);
        this.dirLight.castShadow = true;
        this.dirLight.shadow.mapSize.width = 1024;
        this.dirLight.shadow.mapSize.height = 1024;
        this.dirLight.shadow.camera.near = 50;
        this.dirLight.shadow.camera.far = 2400;
        const d = 680;
        this.dirLight.shadow.camera.left = -d;
        this.dirLight.shadow.camera.right = d;
        this.dirLight.shadow.camera.top = d;
        this.dirLight.shadow.camera.bottom = -d;
        this.scene.add(this.dirLight);
        this.scene.add(this.dirLight.target);

        this.unitBox = new THREE.BoxGeometry(1, 1, 1);

        this.mats = {
            grassLight: new THREE.MeshLambertMaterial({ color: 0x4ade80 }),
            grassDark: new THREE.MeshLambertMaterial({ color: 0x22c55e }),
            soil: new THREE.MeshLambertMaterial({ color: 0x78350f }),
            soilDark: new THREE.MeshLambertMaterial({ color: 0x451a03 }),
            wood: new THREE.MeshLambertMaterial({ color: 0x854d0e }),
            plank: new THREE.MeshLambertMaterial({ color: 0xfacc15 }),
            copper: new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.4, metalness: 0.3 }),
            terracotta: new THREE.MeshLambertMaterial({ color: 0xea580c }),
            gnomeTunic: new THREE.MeshLambertMaterial({ color: 0x0284c7 }),
            gnomeHat: new THREE.MeshLambertMaterial({ color: 0xef4444 }),
            gnomeBeard: new THREE.MeshLambertMaterial({ color: 0xffffff }),
            gnomeSkin: new THREE.MeshLambertMaterial({ color: 0xfda4af }),
            gnomeBoot: new THREE.MeshLambertMaterial({ color: 0x292524 }),
            leafGreen: new THREE.MeshLambertMaterial({ color: 0x65a30d }),
            leafBright: new THREE.MeshLambertMaterial({ color: 0x84cc16 }),
            mushroomStem: new THREE.MeshLambertMaterial({ color: 0xfef3c7 }),
            mushroomCap: new THREE.MeshLambertMaterial({ color: 0xef4444 }),
            white: new THREE.MeshLambertMaterial({ color: 0xffffff }),
            gold: new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3, metalness: 0.4 }),
            acornNut: new THREE.MeshLambertMaterial({ color: 0xb45309 }),
            beeYellow: new THREE.MeshLambertMaterial({ color: 0xfacc15 }),
            beeBlack: new THREE.MeshLambertMaterial({ color: 0x1e293b }),
            wingGlass: new THREE.MeshBasicMaterial({ color: 0xe0f2fe, transparent: true, opacity: 0.75 }),
            stormDark: new THREE.MeshLambertMaterial({ color: 0x475569 }),
            updraftGlow: new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.28 }),
            hedgeGreen: new THREE.MeshLambertMaterial({ color: 0x16a34a }),
            fenceWhite: new THREE.MeshLambertMaterial({ color: 0xf8fafc })
        };

        this.entityGroup = new THREE.Group();
        this.scene.add(this.entityGroup);

        this.voxelParticles = [];
        this.particleGroup = new THREE.Group();
        this.scene.add(this.particleGroup);

        this.buildStaticEnvironment();
        this.buildLauncher();
        this.buildBarnaby();
        this.buildRecordFlag();
    }

    addVoxel(parent, gx, gy, gz, sx, sy, sz, mat, vSize = 6, castShadow = true) {
        const m = new THREE.Mesh(this.unitBox, mat);
        m.scale.set(sx * vSize, sy * vSize, sz * vSize);
        m.position.set(gx * vSize, gy * vSize, gz * vSize);
        m.castShadow = castShadow;
        m.receiveShadow = true;
        parent.add(m);
        return m;
    }

    applyPixelScale(w, h) {
        const scale = this.pixelated ? 0.48 : Math.min(window.devicePixelRatio, 2);
        this.renderer.setPixelRatio(scale);
        this.renderer.setSize(w, h, false);
        this.renderer.domElement.style.width = w + 'px';
        this.renderer.domElement.style.height = h + 'px';
    }

    togglePixelMode() {
        this.pixelated = !this.pixelated;
        const w = this.container.clientWidth || 960;
        const h = this.container.clientHeight || 540;
        this.applyPixelScale(w, h);
        return this.pixelated;
    }

    buildStaticEnvironment() {
        this.groundGroup = new THREE.Group();
        this.scene.add(this.groundGroup);

        const subSoil = this.addVoxel(this.groundGroup, 0, -45, -30, 5600, 70, 560, this.mats.soil, 1, false);
        subSoil.receiveShadow = true;

        this.turfTiles = [];
        const tileW = 80;
        for (let i = 0; i < 46; i++) {
            const isEven = i % 2 === 0;
            const tile = this.addVoxel(
                this.groundGroup,
                i * tileW, -6, -30,
                tileW, 12, 520,
                isEven ? this.mats.grassLight : this.mats.grassDark,
                1, false
            );
            this.turfTiles.push(tile);
        }

        this.sceneryGroup = new THREE.Group();
        this.scene.add(this.sceneryGroup);
        this.fencePosts = [];

        for (let i = 0; i < 42; i++) {
            const postGroup = new THREE.Group();
            this.addVoxel(postGroup, 0, 6, 0, 2.5, 11, 1.5, this.mats.fenceWhite, 6);
            this.addVoxel(postGroup, 0, 12, 0, 1.5, 2, 1.5, this.mats.fenceWhite, 6);
            this.addVoxel(postGroup, 4.5, 8, -0.3, 9, 1.5, 0.8, this.mats.fenceWhite, 6);
            this.addVoxel(postGroup, 4.5, 3.5, -0.3, 9, 1.5, 0.8, this.mats.fenceWhite, 6);
            postGroup.position.set(i * 55, 0, -165);
            this.sceneryGroup.add(postGroup);
            this.fencePosts.push(postGroup);
        }

        this.hedgeMounds = [];
        for (let i = 0; i < 18; i++) {
            const tree = new THREE.Group();
            this.addVoxel(tree, 0, 4, 0, 3, 8, 3, this.mats.soil, 8);
            this.addVoxel(tree, 0, 10, 0, 9, 5, 9, this.mats.hedgeGreen, 8);
            this.addVoxel(tree, 0, 14, 0, 7, 4, 7, this.mats.grassDark, 8);
            this.addVoxel(tree, 0, 17, 0, 4, 3, 4, this.mats.grassLight, 8);
            const s = 0.85 + (i % 3) * 0.22;
            tree.scale.setScalar(s);
            tree.position.set(i * 190, 0, -255 - (i % 2) * 35);
            this.sceneryGroup.add(tree);
            this.hedgeMounds.push(tree);
        }

        this.cloudMeshes = [];
        for (let i = 0; i < 14; i++) {
            const cGroup = new THREE.Group();
            this.addVoxel(cGroup, 0, 0, 0, 7, 3, 4, this.mats.white, 8, false);
            this.addVoxel(cGroup, -3, -0.8, 0.5, 4, 2, 3, this.mats.white, 8, false);
            this.addVoxel(cGroup, 3.5, -0.6, -0.5, 4, 2.2, 3, this.mats.white, 8, false);
            this.addVoxel(cGroup, 0.5, 1.8, 0, 4, 1.8, 3, this.mats.white, 8, false);
            const s = 0.7 + Math.random() * 0.9;
            cGroup.scale.setScalar(s);
            cGroup.position.set(Math.random() * 3200, 140 + Math.random() * 680, -210 - Math.random() * 140);
            this.scene.add(cGroup);
            this.cloudMeshes.push({ mesh: cGroup, speed: 12 + Math.random() * 20, offsetX: cGroup.position.x });
        }
    }

    buildLauncher() {
        this.launcherGroup = new THREE.Group();
        this.addVoxel(this.launcherGroup, 95, 170, 0, 16, 340, 16, this.mats.wood, 1);
        this.addVoxel(this.launcherGroup, 122, 334, 0, 70, 16, 16, this.mats.wood, 1);

        this.addVoxel(this.launcherGroup, 185, 9, 0, 36, 18, 42, this.mats.terracotta, 1);
        this.addVoxel(this.launcherGroup, 185, 21, 0, 22, 10, 42, this.mats.terracotta, 1);

        this.seesawPlank = new THREE.Group();
        this.addVoxel(this.seesawPlank, 0, 0, 0, 150, 10, 44, this.mats.plank, 1);
        this.addVoxel(this.seesawPlank, -58, 7, 0, 26, 4, 46, this.mats.terracotta, 1);
        this.addVoxel(this.seesawPlank, 58, 7, 0, 26, 4, 46, this.mats.gnomeTunic, 1);
        this.seesawPlank.position.set(185, 26, 0);
        this.launcherGroup.add(this.seesawPlank);

        this.canGroup = new THREE.Group();
        this.addVoxel(this.canGroup, 0, 0, 0, 6, 7, 6, this.mats.copper, 6);
        this.addVoxel(this.canGroup, 0, 3.5, 0, 4, 1, 4, this.mats.soilDark, 6);
        this.addVoxel(this.canGroup, 4, 0, 0, 2, 2, 2, this.mats.copper, 6);
        this.addVoxel(this.canGroup, 5.5, 1.5, 0, 2, 2, 2, this.mats.copper, 6);
        this.addVoxel(this.canGroup, 7, 3, 0, 2.5, 2.5, 2.5, this.mats.plank, 6);
        this.addVoxel(this.canGroup, -4, 0, 0, 2, 5, 1.5, this.mats.copper, 6);
        this.canGroup.position.set(140, 255, 0);
        this.launcherGroup.add(this.canGroup);

        this.scene.add(this.launcherGroup);
    }

    buildBarnaby() {
        this.gnomeGroup = new THREE.Group();
        const v = 4.5;

        this.addVoxel(this.gnomeGroup, -1, -3, 1.2, 2.2, 1.8, 1.8, this.mats.gnomeBoot, v);
        this.addVoxel(this.gnomeGroup, 1, -3, -1.2, 2.2, 1.8, 1.8, this.mats.gnomeBoot, v);

        this.addVoxel(this.gnomeGroup, 0, -0.5, 0, 5, 4.5, 4.8, this.mats.gnomeTunic, v);
        this.addVoxel(this.gnomeGroup, 0, -1.6, 0, 5.2, 1, 5.0, this.mats.gnomeBoot, v);
        this.addVoxel(this.gnomeGroup, 2.6, -1.6, 0, 0.6, 1.4, 1.8, this.mats.gold, v);

        this.addVoxel(this.gnomeGroup, 1.8, 0.5, 0, 3.2, 2.6, 4.2, this.mats.gnomeBeard, v);
        this.addVoxel(this.gnomeGroup, 2.4, -1.2, 0, 2.4, 2.0, 3.0, this.mats.gnomeBeard, v);
        this.addVoxel(this.gnomeGroup, 2.8, -2.4, 0, 1.4, 1.2, 1.8, this.mats.gnomeBeard, v);

        this.addVoxel(this.gnomeGroup, 0.4, 2.2, 0, 3.8, 2.2, 3.8, this.mats.gnomeSkin, v);
        this.addVoxel(this.gnomeGroup, 2.8, 2.2, 0, 1.8, 1.4, 1.6, this.mats.gnomeSkin, v);
        this.addVoxel(this.gnomeGroup, 2.3, 2.8, 1.1, 0.6, 0.7, 0.6, this.mats.beeBlack, v);
        this.addVoxel(this.gnomeGroup, 2.3, 2.8, -1.1, 0.6, 0.7, 0.6, this.mats.beeBlack, v);

        this.addVoxel(this.gnomeGroup, 0, 3.8, 0, 5.2, 1.6, 5.2, this.mats.gnomeHat, v);
        this.addVoxel(this.gnomeGroup, -0.3, 5.3, 0, 4.0, 1.8, 4.0, this.mats.gnomeHat, v);
        this.addVoxel(this.gnomeGroup, -0.6, 6.9, 0, 2.8, 1.8, 2.8, this.mats.gnomeHat, v);
        this.addVoxel(this.gnomeGroup, -1.0, 8.3, 0, 1.6, 1.6, 1.6, this.mats.gnomeHat, v);

        this.rocketPack = new THREE.Group();
        this.addVoxel(this.rocketPack, -3.2, 1, 0, 2.8, 5.5, 2.8, this.mats.gnomeHat, v);
        this.addVoxel(this.rocketPack, -3.2, 4.2, 0, 1.8, 1.5, 1.8, this.mats.gold, v);
        this.rocketPack.visible = false;
        this.gnomeGroup.add(this.rocketPack);

        this.gliderGroup = new THREE.Group();
        this.addVoxel(this.gliderGroup, 0, 4.2, 0, 0.8, 8.5, 0.8, this.mats.wood, v);
        const leaf = new THREE.Group();
        this.addVoxel(leaf, 0, 0, 0, 9, 1.0, 9, this.mats.leafGreen, v);
        this.addVoxel(leaf, 2, 0.3, 0, 11, 0.8, 5, this.mats.leafBright, v);
        this.addVoxel(leaf, 0, 0.3, 0, 5, 0.8, 13, this.mats.leafBright, v);
        this.addVoxel(leaf, 5.5, 0.5, 0, 3, 0.8, 2.5, this.mats.leafGreen, v);
        this.addVoxel(leaf, 0, 0.5, 6.5, 2.5, 0.8, 3, this.mats.leafGreen, v);
        this.addVoxel(leaf, 0, 0.5, -6.5, 2.5, 0.8, 3, this.mats.leafGreen, v);
        leaf.position.set(0, 8.2 * v, 0);
        this.gliderGroup.add(leaf);
        this.gliderGroup.scale.setScalar(0.001);
        this.gnomeGroup.add(this.gliderGroup);

        this.scene.add(this.gnomeGroup);
    }

    buildRecordFlag() {
        this.recordFlagGroup = new THREE.Group();
        this.addVoxel(this.recordFlagGroup, 0, 5, 0, 26, 10, 26, this.mats.terracotta, 1);
        this.addVoxel(this.recordFlagGroup, 0, 12, 0, 18, 6, 18, this.mats.gold, 1);
        this.addVoxel(this.recordFlagGroup, 0, 72, 0, 6, 125, 6, this.mats.fenceWhite, 1);
        this.addVoxel(this.recordFlagGroup, 0, 138, 0, 14, 14, 14, this.mats.gold, 1);

        this.flagBannerParts = [];
        for (let i = 0; i < 4; i++) {
            const h = 30 - i * 5;
            const slice = this.addVoxel(
                this.recordFlagGroup,
                10 + i * 11,
                116 - i * 1.5,
                0,
                11,
                h,
                5,
                i % 2 === 0 ? this.mats.gnomeHat : this.mats.gold,
                1
            );
            this.flagBannerParts.push(slice);
        }

        this.recordFlagGroup.visible = false;
        this.scene.add(this.recordFlagGroup);
    }

    updateRecordFlagPosition(bestDistanceM) {
        if (!this.recordFlagGroup) return;
        if (bestDistanceM >= 5) {
            const flagX = 230 + bestDistanceM * PX_PER_METER;
            this.recordFlagGroup.position.set(flagX, 0, -28);
            this.recordFlagGroup.visible = true;
        } else {
            this.recordFlagGroup.visible = false;
        }
    }

    cycleScenePalette() {
        this.paletteIndex = ((this.paletteIndex || 0) + 1) % 3;
        const palettes = [
            { grassL: 0x4ade80, grassD: 0x22c55e, sky: 0x7dd3fc },
            { grassL: 0xfbbf24, grassD: 0xd97706, sky: 0xfda4af },
            { grassL: 0x86efac, grassD: 0x10b981, sky: 0xc4b5fd }
        ];
        const p = palettes[this.paletteIndex];
        this.mats.grassLight.color.setHex(p.grassL);
        this.mats.grassDark.color.setHex(p.grassD);
        this.baseSkyHex = p.sky;
    }

    createUpdraftMesh(u) {
        const group = new THREE.Group();
        const pillar = this.addVoxel(group, 0, u.height * 0.5, 0, u.width * 0.85, u.height, u.width * 0.85, this.mats.updraftGlow, 1, false);
        pillar.receiveShadow = false;

        const seeds = [];
        for (let i = 0; i < 7; i++) {
            const sm = new THREE.Group();
            this.addVoxel(sm, 0, 0, 0, 8, 8, 8, this.mats.white, 1, false);
            this.addVoxel(sm, 0, -6, 0, 2, 6, 2, this.mats.wood, 1, false);
            group.add(sm);
            seeds.push({ mesh: sm, phase: i / 7, angleOffset: i * 1.3 });
        }

        group.position.set(u.x + u.width * 0.5, -u.y, 0);
        this.entityGroup.add(group);
        u.mesh = group;
        u.seeds = seeds;
    }

    createMushroomMesh(m) {
        const group = new THREE.Group();
        const r = m.radius;
        this.addVoxel(group, 0, r * 0.42, 0, r * 0.65, r * 0.85, r * 0.65, this.mats.mushroomStem, 1);
        this.addVoxel(group, 0, r * 0.95, 0, r * 1.95, r * 0.45, r * 1.95, this.mats.mushroomCap, 1);
        this.addVoxel(group, 0, r * 1.32, 0, r * 1.45, r * 0.38, r * 1.45, this.mats.mushroomCap, 1);
        this.addVoxel(group, 0, r * 1.54, 0, r * 0.45, r * 0.16, r * 0.45, this.mats.white, 1);
        this.addVoxel(group, -r * 0.62, r * 1.18, r * 0.45, r * 0.35, r * 0.25, r * 0.35, this.mats.white, 1);
        this.addVoxel(group, r * 0.62, r * 1.18, -r * 0.45, r * 0.35, r * 0.25, r * 0.35, this.mats.white, 1);

        group.position.set(m.x, 0, 0);
        this.entityGroup.add(group);
        m.mesh = group;
    }

    createBoosterMesh(b) {
        const group = new THREE.Group();
        if (b.type === 'rocket') {
            const rGroup = new THREE.Group();
            this.addVoxel(rGroup, 0, 0, 0, 3, 5, 3, this.mats.gnomeHat, 5);
            this.addVoxel(rGroup, 0, 3, 0, 2, 2, 2, this.mats.gold, 5);
            this.addVoxel(rGroup, 0, -2.5, 0, 4.5, 1.5, 1.2, this.mats.white, 5);
            rGroup.rotation.z = -Math.PI * 0.35;
            group.add(rGroup);
        } else if (b.type === 'ring') {
            const r = b.radius;
            const t = 8;
            this.addVoxel(group, 0, r, 0, r * 2 + t, t, t, this.mats.gold, 1);
            this.addVoxel(group, 0, -r, 0, r * 2 + t, t, t, this.mats.gold, 1);
            this.addVoxel(group, -r, 0, 0, t, r * 2, t, this.mats.gold, 1);
            this.addVoxel(group, r, 0, 0, t, r * 2, t, this.mats.gold, 1);
        } else {
            this.addVoxel(group, 0, -3, 0, 20, 20, 20, this.mats.acornNut, 1);
            this.addVoxel(group, 0, 8, 0, 26, 9, 26, this.mats.wood, 1);
            this.addVoxel(group, 0, 15, 0, 5, 7, 5, this.mats.wood, 1);
        }
        group.position.set(b.x, -b.y, 0);
        this.entityGroup.add(group);
        b.mesh = group;
    }

    createHazardMesh(h) {
        const group = new THREE.Group();
        if (h.type === 'bee') {
            this.addVoxel(group, 0, 0, 0, 30, 20, 22, this.mats.beeYellow, 1);
            this.addVoxel(group, -5, 0, 0, 6, 21, 23, this.mats.beeBlack, 1);
            this.addVoxel(group, 6, 0, 0, 6, 21, 23, this.mats.beeBlack, 1);
            this.addVoxel(group, -17, 0, 0, 6, 5, 5, this.mats.beeBlack, 1);
            const wingL = this.addVoxel(group, 0, 12, 13, 12, 4, 16, this.mats.wingGlass, 1, false);
            const wingR = this.addVoxel(group, 0, 12, -13, 12, 4, 16, this.mats.wingGlass, 1, false);
            h.wings = [wingL, wingR];
        } else {
            this.addVoxel(group, 0, 4, 0, 46, 22, 32, this.mats.stormDark, 1);
            this.addVoxel(group, -14, -2, 4, 28, 16, 24, this.mats.stormDark, 1);
            this.addVoxel(group, 16, -2, -4, 28, 16, 24, this.mats.stormDark, 1);
            this.addVoxel(group, 2, -14, 0, 8, 12, 8, this.mats.gold, 1);
            this.addVoxel(group, -3, -23, 0, 8, 12, 8, this.mats.gold, 1);
        }
        group.position.set(h.x, -h.y, 0);
        this.entityGroup.add(group);
        h.mesh = group;
    }

    spawnVoxelParticle(x, y, vx, vy, colorHex, size, life) {
        const mat = new THREE.MeshLambertMaterial({ color: colorHex });
        const cube = new THREE.Mesh(this.unitBox, mat);
        const s = size * 1.7;
        cube.scale.set(s, s, s);
        cube.position.set(x, -y, (Math.random() - 0.5) * 45);
        this.particleGroup.add(cube);
        this.voxelParticles.push({
            mesh: cube,
            vx,
            vy: -vy,
            vz: (Math.random() - 0.5) * 90,
            rx: (Math.random() - 0.5) * 10,
            ry: (Math.random() - 0.5) * 10,
            life,
            maxLife: life
        });
    }

    removeMesh(entity) {
        if (entity && entity.mesh) {
            this.entityGroup.remove(entity.mesh);
            entity.mesh = null;
        }
    }

    clearDynamicMeshes() {
        while (this.entityGroup.children.length > 0) {
            this.entityGroup.remove(this.entityGroup.children[0]);
        }
        while (this.particleGroup.children.length > 0) {
            this.particleGroup.remove(this.particleGroup.children[0]);
        }
        this.voxelParticles = [];
    }

    syncAndRender(state, dt) {
        const g = state.gnome;
        const worldGnomeY = -g.y;

        this.gnomeGroup.position.set(g.x, worldGnomeY, 0);
        this.gnomeGroup.rotation.z = -g.angle;
        this.gnomeGroup.rotation.y = Math.sin(state.time * 4) * 0.14;

        const targetGliderScale = g.gliding ? 1.0 : 0.001;
        const currentScale = this.gliderGroup.scale.x;
        const nextScale = currentScale + (targetGliderScale - currentScale) * Math.min(1, dt * 14);
        this.gliderGroup.scale.setScalar(nextScale);
        this.rocketPack.visible = g.rocketTimer > 0;

        this.canGroup.position.y = -state.canY;
        this.seesawPlank.rotation.z = -state.seesawAngle;

        const tileW = 80;
        const baseTileX = Math.floor(state.cam.x / (tileW * 2)) * (tileW * 2) - 640;
        this.groundGroup.position.x = baseTileX;

        const baseFenceX = Math.floor(state.cam.x / 55) * 55 - 440;
        for (let i = 0; i < this.fencePosts.length; i++) {
            this.fencePosts[i].position.x = baseFenceX + i * 55;
        }
        const baseHedgeX = Math.floor(state.cam.x / 190) * 190 - 600;
        for (let i = 0; i < this.hedgeMounds.length; i++) {
            this.hedgeMounds[i].position.x = baseHedgeX + i * 190;
        }

        for (const c of this.cloudMeshes) {
            c.offsetX -= c.speed * dt;
            const relX = ((c.offsetX - state.cam.x * 0.35) % 2600 + 2600) % 2600 - 600;
            c.mesh.position.x = state.cam.x + relX;
        }

        for (const u of state.updrafts) {
            if (!u.mesh) continue;
            for (const s of u.seeds) {
                const prog = (state.time * 0.55 + s.phase) % 1;
                s.mesh.position.y = prog * u.height;
                s.mesh.position.x = Math.sin(state.time * 3 + s.angleOffset) * (u.width * 0.32);
                s.mesh.position.z = Math.cos(state.time * 2.5 + s.angleOffset) * 20;
                s.mesh.rotation.y += dt * 3;
            }
        }

        for (const m of state.mushrooms) {
            if (!m.mesh) continue;
            const sy = 1 - m.squish * 0.35;
            const sxz = 1 + m.squish * 0.25;
            m.mesh.scale.set(sxz, sy, sxz);
        }

        for (const b of state.boosters) {
            if (!b.mesh) continue;
            if (b.collected) {
                this.removeMesh(b);
                continue;
            }
            const bobY = -(b.y + Math.sin(state.time * 4 + b.bobPhase) * 8);
            b.mesh.position.y = bobY;
            b.mesh.rotation.y += dt * 2.4;
        }

        for (const h of state.hazards) {
            if (!h.mesh) continue;
            if (h.hit) {
                this.removeMesh(h);
                continue;
            }
            h.mesh.position.y = -h.y;
            if (h.wings) {
                const flap = Math.sin(state.time * 40) * 0.65;
                h.wings[0].rotation.x = flap;
                h.wings[1].rotation.x = -flap;
            } else {
                h.mesh.rotation.y = Math.sin(state.time * 2) * 0.25;
            }
        }

        if (this.recordFlagGroup && this.recordFlagGroup.visible) {
            for (let i = 0; i < this.flagBannerParts.length; i++) {
                this.flagBannerParts[i].position.z = Math.sin(state.time * 8 - i * 0.9) * (3.5 + i * 2);
            }
        }

        for (let i = this.voxelParticles.length - 1; i >= 0; i--) {
            const vp = this.voxelParticles[i];
            vp.mesh.position.x += vp.vx * dt;
            vp.mesh.position.y += vp.vy * dt;
            vp.mesh.position.z += vp.vz * dt;
            vp.mesh.rotation.x += vp.rx * dt;
            vp.mesh.rotation.y += vp.ry * dt;
            vp.life -= dt;
            const sc = Math.max(0.01, (vp.life / vp.maxLife) * 8);
            vp.mesh.scale.setScalar(sc);
            if (vp.life <= 0) {
                this.particleGroup.remove(vp.mesh);
                this.voxelParticles.splice(i, 1);
            }
        }

        const w = canvas.width || 960;
        const h = canvas.height || 540;
        const centerWorldX = state.cam.x + w * 0.44;
        const centerWorldY = (h * 0.5 - GROUND_OFFSET) - state.cam.y;

        const isoOffsetX = -310 + state.cam.mouseYaw * 95;
        const isoOffsetY = 360 + state.cam.mousePitch * 75;
        const isoOffsetZ = 680;

        this.camera.position.set(
            centerWorldX + isoOffsetX,
            centerWorldY + isoOffsetY,
            isoOffsetZ
        );
        this.camera.lookAt(centerWorldX, centerWorldY, 0);

        this.dirLight.position.set(g.x + 280, worldGnomeY + 620, 420);
        this.dirLight.target.position.set(g.x, worldGnomeY, 0);

        const altRatio = Math.min(1, Math.max(0, -state.cam.y / 1600));
        if (this.baseSkyHex) {
            this.scene.background.setHex(this.baseSkyHex);
        } else {
            this.scene.background.setHSL(0.56 + altRatio * 0.06, 0.85, 0.74 - altRatio * 0.42);
        }

        this.renderer.render(this.scene, this.camera);
    }

    projectToScreen(gameX, gameY, w, h) {
        const v = new THREE.Vector3(gameX, -gameY, 0);
        v.project(this.camera);
        return {
            x: (v.x * 0.5 + 0.5) * w,
            y: (-v.y * 0.5 + 0.5) * h
        };
    }

    resize(w, h) {
        if (!w || !h) return;
        const aspect = w / h;
        this.camera.left = (-this.viewHeight * aspect) / 2;
        this.camera.right = (this.viewHeight * aspect) / 2;
        this.camera.top = this.viewHeight / 2;
        this.camera.bottom = -this.viewHeight / 2;
        this.camera.updateProjectionMatrix();
        this.applyPixelScale(w, h);
    }
}

let threeWorld = null;
