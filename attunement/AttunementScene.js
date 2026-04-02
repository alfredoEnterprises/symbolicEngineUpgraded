// ===============================================================
// ATTUNEMENT SCENE (Three.js)
// - Upright triangle, slight backward tilt (T2)
// - Single light source at top vertex (L2 gradient)
// - Fog only at bottom (fog plane)
// - Rolling moon with sound
// - LightIntensity-based classification (p5 logic port)
// - Final classification only after 14s window
// - Debug overlay (top-left)
// ===============================================================

class AttunementScene {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;

    // -----------------------------------------------------------
    // 1. TRIANGLE GEOMETRY (UPRIGHT IN XZ PLANE)
    // -----------------------------------------------------------
    // Z = vertical on screen (top = negative Z, bottom = positive Z)
    // X = horizontal
    //
    //        A (top)
    //       / \
    //      /   \
    //     B-----C
    //
    this.triA = new THREE.Vector2(0, -4);   // top
    this.triB = new THREE.Vector2(-6, 5);   // bottom-left
    this.triC = new THREE.Vector2(6, 5);    // bottom-right

    // Group to tilt the whole chamber
    this.group = new THREE.Group();
    this.scene.add(this.group);

    // Medium backward tilt (T2 ≈ 18°)
    const TILT_ANGLE = 18;
    this.group.rotation.x = THREE.MathUtils.degToRad(-TILT_ANGLE);

    // -----------------------------------------------------------
    // 2. SPHERE / MOON STATE
    // -----------------------------------------------------------
    this.sphereRadius = 0.7;
    this.sphere = null;

    this.dragging = false;
    this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    // Movement tracking
    this.prevPos = new THREE.Vector3();
    this.speed = 0;
    this.jitter = 0;
    this.idleTime = 0;

    // -----------------------------------------------------------
    // 3. CLASSIFICATION ENGINE (p5 LOGIC PORT)
    // -----------------------------------------------------------
    this.score = { vulnerability: 0, shadow: 0, void: 0 };
    this.rolling = { vulnerability: 0, shadow: 0, void: 0 };
    this.smoothing = 0.08;

    this.agentConfidence = 0;
    this.agentConfidenceThreshold = 75;
    this.agentStableTime = 0;
    this.agentRequiredStableTime = 5.0; // seconds

    this.finalClassification = null;
    this.currentClassification = null;
    this.attunementEnded = false;
    this.freezeScores = false;

    this.attunementStartTime = performance.now();
    this.gracePeriod = 2000; // ms
    this.totalWindow = 14000; // ms (14s)

    // Visual response
    this.glowStrength = 0;
    this.tremorStrength = 0;

    // Audio
    this.rollSound = null;

    // -----------------------------------------------------------
    // 4. LIGHT + FOG + DEBUG
    // -----------------------------------------------------------
    this._setupLight();
    this._setupDebugOverlay();

    // -----------------------------------------------------------
    // 5. BUILD SCENE ELEMENTS
    // -----------------------------------------------------------
    //this._buildFloor();
    //this._buildFogPlane();
    this._buildWalls();
    this._buildSphere();
  }

  // =============================================================
  // LIGHT SETUP (L2 GRADIENT)
  // =============================================================
  _setupLight() {
    // Soft ambient
    const hemi = new THREE.HemisphereLight(0x555577, 0x000000, 0.35);
    this.scene.add(hemi);

    // Main directional light above vertex A
    this.mainLight = new THREE.DirectionalLight(0xffffff, 1.8);
    this.mainLight.position.set(0, 7, -1); // above and slightly in front of A
    this.mainLight.target.position.set(0, 0, 4);
    this.group.add(this.mainLight);
    this.group.add(this.mainLight.target);


    // Shadows
    this.mainLight.castShadow = true;
    this.mainLight.shadow.mapSize.set(1024, 1024);
    this.mainLight.shadow.camera.near = 1;
    this.mainLight.shadow.camera.far = 30;
    this.mainLight.shadow.camera.left = -12;
    this.mainLight.shadow.camera.right = 12;
    this.mainLight.shadow.camera.top = 12;
    this.mainLight.shadow.camera.bottom = -12;
  }

  // =============================================================
  // DEBUG OVERLAY
  // =============================================================
  _setupDebugOverlay() {
    this.debugDiv = document.createElement('div');
    this.debugDiv.style.position = 'fixed';
    this.debugDiv.style.top = '10px';
    this.debugDiv.style.left = '10px';
    this.debugDiv.style.padding = '8px 10px';
    this.debugDiv.style.background = 'rgba(0,0,0,0.6)';
    this.debugDiv.style.color = '#ffffff';
    this.debugDiv.style.fontFamily = 'monospace';
    this.debugDiv.style.fontSize = '11px';
    this.debugDiv.style.zIndex = '9999';
    this.debugDiv.style.pointerEvents = 'none';
    this.debugDiv.innerText = 'Attunement debug...';
    document.body.appendChild(this.debugDiv);
  }

  _updateDebugOverlay(brightness) {
    const elapsed = (performance.now() - this.attunementStartTime) / 1000;
  
    this.debugDiv.innerText =
      `t: ${elapsed.toFixed(2)}s\n` +
      `speed: ${this.speed.toFixed(3)}\n` +
      `jitter: ${this.jitter.toFixed(3)}\n` +
      `idle: ${this.idleTime.toFixed(2)}\n` +
      `bright: ${brightness.toFixed(3)}\n` +
      `roll V: ${this.rolling.vulnerability.toFixed(2)}\n` +
      `roll S: ${this.rolling.shadow.toFixed(2)}\n` +
      `roll D: ${this.rolling.void.toFixed(2)}\n` +
      `class: ${this.currentClassification || '-'}\n` +
      `final: ${this.finalClassification || '-'}\n` +
      `conf: ${this.agentConfidence.toFixed(1)}%`;
  }
  

  // =============================================================
  // TRIANGLE WALLS (EMISSIVE)
  // =============================================================
  _buildWalls() {
    const wallHeight = this.sphereRadius * 2.2;
    const wallThickness = 0.35;

    const mat = new THREE.MeshStandardMaterial({
      color: 0x222222,
      emissive: new THREE.Color(0x4422aa),
      emissiveIntensity: 0.25,
      metalness: 0.3,
      roughness: 0.6
    });

    const makeWall = (p1, p2) => {
      const v1 = new THREE.Vector3(p1.x, 0, p1.y);
      const v2 = new THREE.Vector3(p2.x, 0, p2.y);
      const mid = new THREE.Vector3().addVectors(v1, v2).multiplyScalar(0.5);
      const length = v1.distanceTo(v2);

      const geo = new THREE.BoxGeometry(length, wallHeight, wallThickness);
      const mesh = new THREE.Mesh(geo, mat);

      mesh.position.copy(mid);
      mesh.position.y = wallHeight / 2;

      const angle = Math.atan2(v2.z - v1.z, v2.x - v1.x);
      mesh.rotation.y = -angle;

      mesh.castShadow = true;
      mesh.receiveShadow = true;

      this.group.add(mesh);
    };

    makeWall(this.triA, this.triB);
    makeWall(this.triB, this.triC);
    makeWall(this.triC, this.triA);
  }

  // =============================================================
  // SPHERE / MOON
  // =============================================================
  _buildSphere() {
    const loader = new THREE.TextureLoader();
    const colorMap = loader.load('moon.jpg');
    const normalMap = loader.load('normal.jpg');
  
    const geo = new THREE.SphereGeometry(this.sphereRadius, 64, 64);
    const mat = new THREE.MeshStandardMaterial({
      map: colorMap,
      normalMap: normalMap,
      metalness: 0.0,
      roughness: 1.0,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 0.0 // start with no glow
    });
  
    this.sphere = new THREE.Mesh(geo, mat);
    this.sphere.castShadow = true;
  
    const c = this._triangleCentroid();
    this.sphere.position.set(c.x, this.sphereRadius, c.y);
  
    this.group.add(this.sphere);
    this.prevPos.copy(this.sphere.position);
  
    // Audio
    const listener = new THREE.AudioListener();
    this.camera.add(listener);
  
    this.rollSound = new THREE.PositionalAudio(listener);
    const audioLoader = new THREE.AudioLoader();
    audioLoader.load('roll.wav', (buffer) => {
      this.rollSound.setBuffer(buffer);
      this.rollSound.setRefDistance(4);
      this.rollSound.setLoop(true);
      this.rollSound.setVolume(0.4);
    });
    this.sphere.add(this.rollSound);
  }
  _updateVisualEffects() {
    if (!this.sphere || !this.sphere.material) return;
  
    // ------------------------------------------------------------
    // VULNERABILITY — breathing glow
    // ------------------------------------------------------------
    if (this.currentClassification === 'vulnerability') {
      const pulse = 0.5 + Math.sin(performance.now() * 0.002) * 0.5;
      const glow = this.glowStrength * pulse * 0.8;
      this.sphere.material.emissiveIntensity = glow;
      this.sphere.material.color.setHex(0xffffff);
    }
  
    // ------------------------------------------------------------
    // SHADOW — trembling (rotation only, does NOT affect position)
    // ------------------------------------------------------------
    else if (this.currentClassification === 'shadow') {
      const shakeX = (Math.random() - 0.5) * 0.1 * this.tremorStrength;
      const shakeZ = (Math.random() - 0.5) * 0.1 * this.tremorStrength;
  
      this.sphere.rotation.x += shakeX;
      this.sphere.rotation.z += shakeZ;
  
      this.sphere.material.emissiveIntensity = 0.0;
      this.sphere.material.color.setHex(0xffffff);
    }
  
    // ------------------------------------------------------------
    // VOID — dim, cool, withdrawn
    // ------------------------------------------------------------
    else if (this.currentClassification === 'void') {
      this.sphere.material.emissiveIntensity = 0.0;
      this.sphere.material.color.setHex(0x8899aa);
    }
  
    // ------------------------------------------------------------
    // NEUTRAL — reset
    // ------------------------------------------------------------
    else {
      this.sphere.material.emissiveIntensity = 0.0;
      this.sphere.material.color.setHex(0xffffff);
    }
  }
  
 
    

  _triangleCentroid() {
    return new THREE.Vector2(
      (this.triA.x + this.triB.x + this.triC.x) / 3,
      (this.triA.y + this.triB.y + this.triC.y) / 3
    );
  }

  // =============================================================
  // POINTER EVENTS
  // =============================================================
  onPointerDown(raycaster) {
    this.rolling.vulnerability = 0;
    this.rolling.shadow = 0;
    this.rolling.void = 0;

    const hit = raycaster.intersectObject(this.sphere, false);
    if (hit.length > 0) {
      this.dragging = true;
      this.freezeScores = false;
    }
  }

  onPointerMove(raycaster) {
    if (!this.dragging) return;

    const point = new THREE.Vector3();
    raycaster.ray.intersectPlane(this.dragPlane, point);

    const target = new THREE.Vector2(point.x, point.z);
    const constrained = this._constrainToTriangle(target);

    this.sphere.position.x = THREE.MathUtils.lerp(this.sphere.position.x, constrained.x, 0.25);
    this.sphere.position.z = THREE.MathUtils.lerp(this.sphere.position.z, constrained.y, 0.25);
  }

  onPointerUp() {
    if (!this.dragging) return;
    this.dragging = false;

    const pos = new THREE.Vector2(this.sphere.position.x, this.sphere.position.z);
    const constrained = this._constrainToTriangle(pos);

    this.sphere.position.x = constrained.x;
    this.sphere.position.z = constrained.y;
  }

  // =============================================================
  // TRIANGLE MATH
  // =============================================================
  _pointInTriangle(p, a, b, c) {
    const v0 = new THREE.Vector2().subVectors(c, a);
    const v1 = new THREE.Vector2().subVectors(b, a);
    const v2 = new THREE.Vector2().subVectors(p, a);

    const dot00 = v0.dot(v0);
    const dot01 = v0.dot(v1);
    const dot02 = v0.dot(v2);
    const dot11 = v1.dot(v1);
    const dot12 = v1.dot(v2);

    const inv = 1 / (dot00 * dot11 - dot01 * dot01);
    const u = (dot11 * dot02 - dot01 * dot12) * inv;
    const v = (dot00 * dot12 - dot01 * dot02) * inv;

    return u >= 0 && v >= 0 && (u + v < 1);
  }

  _sphereInsideTriangle(center) {
    const angles = [
      0, Math.PI / 4, Math.PI / 2, 3 * Math.PI / 4,
      Math.PI, 5 * Math.PI / 4, 3 * Math.PI / 2, 7 * Math.PI / 4
    ];

    for (const a of angles) {
      const px = center.x + Math.cos(a) * this.sphereRadius;
      const py = center.y + Math.sin(a) * this.sphereRadius;

      if (!this._pointInTriangle(new THREE.Vector2(px, py), this.triA, this.triB, this.triC)) {
        return false;
      }
    }
    return true;
  }

  _constrainToTriangle(p) {
    if (this._pointInTriangle(p, this.triA, this.triB, this.triC) &&
        this._sphereInsideTriangle(p)) {
      return p;
    }

    const center = this._triangleCentroid();
    const dir = new THREE.Vector2().subVectors(p, center).normalize();

    let low = 0;
    let high = 20;

    for (let i = 0; i < 20; i++) {
      const mid = (low + high) / 2;
      const test = new THREE.Vector2(
        center.x + dir.x * mid,
        center.y + dir.y * mid
      );
      if (this._sphereInsideTriangle(test)) low = mid;
      else high = mid;
    }

    return new THREE.Vector2(
      center.x + dir.x * low,
      center.y + dir.y * low
    );
  }

  // =============================================================
  // MOVEMENT + INACTIVITY
  // =============================================================
    // =============================================================
  // MOVEMENT + INACTIVITY
  // =============================================================
  _updateMovement(dt) {
    const dx = this.sphere.position.x - this.prevPos.x;
    const dz = this.sphere.position.z - this.prevPos.z;
  
    const distance = Math.sqrt(dx * dx + dz * dz);
  
    // speed in world units per second
    this.speed = distance / Math.max(dt, 0.0001);
    this.jitter = Math.abs(dx) + Math.abs(dz);
  
    // p5 is more forgiving; let’s be a bit looser
    if (this.speed < 0.015) {
      this.idleTime += dt;
    } else {
      this.idleTime = 0;
    }
  
    // ❌ DO NOT update prevPos here
    return distance;
  }
  

  _userInactive() {
    return !this.dragging && this.speed < 1.0 && this.idleTime > 1.0;
  }
  
  
  

  

  // =============================================================
  // SCORING (LIGHT-BASED)
  // =============================================================
    // =============================================================
  // SCORING (BRIGHTNESS + MOVEMENT, P5-LIKE)
  // =============================================================
  _updateScores(brightness) {
    if (this.freezeScores) return;
  
    this.score.vulnerability = 0;
    this.score.shadow = 0;
    this.score.void = 0;
  
    // VULNERABILITY — bright + calm
    if (
      brightness > 0.4 &&
      this.speed < 4.0 &&      // slow movement in your real units
      this.jitter < 2.0        // low jitter
    ) {
      this.score.vulnerability += 6;
    }
  
    // SHADOW — agitation + mid/bottom
    if (
      brightness < 0.4 &&
      (this.speed > 8.0 || this.jitter > 4.0) &&
      !this._userInactive()
    ) {
      this.score.shadow += 6;
    }
  
    // VOID — very dark + stillness
    if (
      brightness < 0.25 &&
      this._userInactive() &&
      this.idleTime > 3.0
    ) {
      this.score.void += 8;
    }
  }
  
  
  

  
  

  _updateRollingScores() {
    if (this.freezeScores) return;

    this.rolling.vulnerability = THREE.MathUtils.lerp(
      this.rolling.vulnerability,
      this.score.vulnerability,
      this.smoothing
    );
    this.rolling.shadow = THREE.MathUtils.lerp(
      this.rolling.shadow,
      this.score.shadow,
      this.smoothing
    );
    this.rolling.void = THREE.MathUtils.lerp(
      this.rolling.void,
      this.score.void,
      this.smoothing
    );
  }

  _agentClassify(lastBrightness = 0.0) {
    const v = this.rolling.vulnerability;
    const s = this.rolling.shadow;
    const d = this.rolling.void;

    // If we are clearly in bright territory, gently bias toward vulnerability
    if (lastBrightness > 0.2 && v >= s * 0.5 && v >= d) {
      return 'vulnerability';
    }

    if (v >= s && v >= d) return 'vulnerability';
    if (s >= v && s >= d) return 'shadow';
    return 'void';
  }


  _updateAgentConfidence(dt) {
    if (this.attunementEnded) return;

    const elapsedMs = performance.now() - this.attunementStartTime;

    // Grace period: no classification
    if (elapsedMs < this.gracePeriod) {
      this.agentConfidence = 0;
      this.agentStableTime = 0;
      this.finalClassification = null;
      return;
    }

    this.currentClassification = this._agentClassify();

    if (this.finalClassification === null) {
      this.agentStableTime = 0;
     
    } else if (this.currentClassification === this.finalClassification) {
      this.agentStableTime += dt;
    } else {
      this.agentStableTime = 0;
      this.finalClassification = this.currentClassification;
    }

    this.agentConfidence = THREE.MathUtils.clamp(
      (this.agentStableTime / this.agentRequiredStableTime) * 100,
      0,
      100
    );

    // Do not finalize before 14s
    if (elapsedMs < this.totalWindow) return;

    // At or after 14s, finalize once
    if (!this.attunementEnded) {
      this._finalizeClassification();
    }
  }

  _finalizeClassification() {
    // Void override: if clearly in void conditions at the end, void wins
    if (
      this._userInactive() &&
      this.idleTime > 3.0
    ) {
      this.finalClassification = 'void';
    } else {
      this.finalClassification =
        this.currentClassification ||
        this.finalClassification ||
        'vulnerability';
    }

    this.freezeScores = true;
    this.attunementEnded = true;

    console.log('FINAL CLASSIFICATION:', this.finalClassification.toUpperCase());
  }

  // =============================================================
  // UPDATE LOOP
  // =============================================================
  update(deltaSeconds) {
    if (!this.sphere) return;
  
    const dt = deltaSeconds; // seconds
  
    // ------------------------------------------------------------
    // MOVEMENT + ROLLING
    // ------------------------------------------------------------
    const distance = this._updateMovement(dt);
    const rollAngle = distance / this.sphereRadius;
  
    if (distance > 0.0001) {
      const dx = this.sphere.position.x - this.prevPos.x;
      const dz = this.sphere.position.z - this.prevPos.z;
      const axis = new THREE.Vector3(dz, 0, -dx).normalize();
      this.sphere.rotateOnWorldAxis(axis, rollAngle);
    }
  
    // Rolling sound
    if (this.rollSound && this.rollSound.buffer) {
      if (distance > 0.0005) {
        if (!this.rollSound.isPlaying) this.rollSound.play();
        this.rollSound.setVolume(Math.min(distance * 40, 0.6));
      } else {
        if (this.rollSound.isPlaying) this.rollSound.stop();
      }
    }
    this.prevPos.copy(this.sphere.position);
  
    // ------------------------------------------------------------
    // VIRTUAL BRIGHTNESS (p5-style)
    // ------------------------------------------------------------
    const topZ = this.triA.y;    // -4 (bright)
    const bottomZ = this.triB.y; // 5  (dark)
  
    let t = (this.sphere.position.z - topZ) / (bottomZ - topZ);
    t = THREE.MathUtils.clamp(t, 0, 1);
  
    // Strong curve: top VERY bright, bottom VERY dark
    const brightness = Math.pow(1.0 - t, 2.0);
  
    // ------------------------------------------------------------
    // SCORING + CLASSIFICATION
    // ------------------------------------------------------------
    this._updateScores(brightness);
    this._updateRollingScores();
  
    // Bias vulnerability when bright
    this.currentClassification = this._agentClassify(brightness);
  
    this._updateAgentConfidence(dt);
  
    // Debug overlay
    this._updateDebugOverlay(brightness);
  
    // ------------------------------------------------------------
// VISUAL RESPONSE (glow, tremor, dimming)
// ------------------------------------------------------------

this._updateEmotionalState();

this._updateVisualEffects();

  }
  _updateEmotionalState() {
    // Vulnerability: glow rises, tremor falls
    if (this.currentClassification === 'vulnerability') {
      this.glowStrength = THREE.MathUtils.lerp(this.glowStrength, 1.0, 0.15);
      this.tremorStrength = THREE.MathUtils.lerp(this.tremorStrength, 0.0, 0.25);
    }
  
    // Shadow: tremor rises, glow falls
    else if (this.currentClassification === 'shadow') {
      this.glowStrength = THREE.MathUtils.lerp(this.glowStrength, 0.0, 0.25);
      this.tremorStrength = THREE.MathUtils.lerp(this.tremorStrength, 1.0, 0.15);
    }
  
    // Void: both fade out
    else if (this.currentClassification === 'void') {
      this.glowStrength = THREE.MathUtils.lerp(this.glowStrength, 0.0, 0.25);
      this.tremorStrength = THREE.MathUtils.lerp(this.tremorStrength, 0.0, 0.25);
    }
  
    // Neutral
    else {
      this.glowStrength = THREE.MathUtils.lerp(this.glowStrength, 0.0, 0.25);
      this.tremorStrength = THREE.MathUtils.lerp(this.tremorStrength, 0.0, 0.25);
    }
  }
  
  
  

  _setLightColor(hex) {
    if (this.mainLight) {
      this.mainLight.color.setHex(hex);
    }
  }
}
