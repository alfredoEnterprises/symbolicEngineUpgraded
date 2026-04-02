class Symbol3D {
  constructor(type, position, appearTime = 8000) {

    this._lastUpdateTime = performance.now();

    this.type = type;
    this.position = position.clone();
    this.appearTime = appearTime;

    this.visible = false;
    this.opacity = 0;
    this.fadeSpeed = 0.02;

    this.scale = 1.0;
    this.targetScale = 1.0;

    this.clickPulse = 0;

    this.mesh = this._buildMesh();
    this.mesh.position.copy(this.position);
    this.mesh.scale.set(0.001, 0.001, 0.001);
    this.mesh.visible = false;
  }

  _buildMesh() {
    const group = new THREE.Group();

    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x000000,
      transparent: true,
      opacity: 0
    });

   
// EYE SYMBOL — PERPENDICULAR RAYS + STATIC LIDS
// ============================================================
if (this.type === "eye") {

  const scleraColor = new THREE.Color(0xffffff);
  const irisColor   = new THREE.Color(0x4a6cff);
  const pupilColor  = new THREE.Color(0x000000);

  // 75% size
  const w = 1.4 * 0.75;
  const h = 0.75 * 0.75;

  const group = new THREE.Group();

  // ============================================================
  // 1. SCLERA (ellipse)
  // ============================================================
  const scleraShape = new THREE.Shape();
  scleraShape.absellipse(0, 0, w, h, 0, Math.PI * 2, false, 0);

  const scleraGeo = new THREE.ShapeGeometry(scleraShape, 64);
  const scleraMat = mat.clone();
  scleraMat.color = scleraColor;
  const sclera = new THREE.Mesh(scleraGeo, scleraMat);
  sclera.position.z = 0;
  group.add(sclera);

  // ============================================================
  // 2. IRIS
  // ============================================================
  const irisGeo = new THREE.CircleGeometry(0.55 * 0.75, 64);
  const irisMat = mat.clone();
  irisMat.color = irisColor;
  irisMat.emissive = irisColor.clone().multiplyScalar(0.25);
  const iris = new THREE.Mesh(irisGeo, irisMat);
  iris.position.z = 0.01;
  group.add(iris);

  // ============================================================
  // 3. PUPIL
  // ============================================================
  const pupilGeo = new THREE.CircleGeometry(0.28 * 0.75, 32);
  const pupilMat = mat.clone();
  pupilMat.color = pupilColor;
  const pupil = new THREE.Mesh(pupilGeo, pupilMat);
  pupil.position.z = 0.02;
  group.add(pupil);

  // ============================================================
  // 4. STATIC LIDS (thin Bezier arcs)
  // ============================================================
  const lidMat = mat.clone();
  lidMat.color = new THREE.Color(0x6A6FA8);

  // Upper lid shape
  const upperShape = new THREE.Shape();
  upperShape.moveTo(-w, 0);
  upperShape.bezierCurveTo(
    -w * 0.4, h * 0.9,
     w * 0.4, h * 0.9,
     w, 0
  );
  upperShape.lineTo(w, -0.05);
  upperShape.bezierCurveTo(
     w * 0.4, h * 0.55,
    -w * 0.4, h * 0.55,
    -w, -0.05
  );
  upperShape.closePath();

  const upperLidGeo = new THREE.ShapeGeometry(upperShape, 64);
  const upperLid = new THREE.Mesh(upperLidGeo, lidMat);
  upperLid.position.z = 0.03;
  upperLid.position.y = 0.25; // slightly above sclera
  group.add(upperLid);

  // Lower lid (mirror of upper)
  const lowerLid = new THREE.Mesh(upperLidGeo.clone(), lidMat.clone());
  lowerLid.rotation.z = Math.PI; // flip upside down
  lowerLid.position.z = 0.03;
  lowerLid.position.y = -0.25; // slightly below sclera
  group.add(lowerLid);

  // ============================================================
  // 5. PERPENDICULAR RAYS (unchanged)
  // ============================================================
  const raysGroup = new THREE.Group();
  const rayMat = mat.clone();
  rayMat.color = new THREE.Color(0xffe08a); // warm yellow
  rayMat.emissive = new THREE.Color(0xffa500); // orange

  const rayCount = 48;
  for (let i = 0; i < rayCount; i++) {
    const theta = (i / rayCount) * Math.PI * 2;

    const ex = w * Math.cos(theta);
    const ey = h * Math.sin(theta);

    let nx = Math.cos(theta) / w;
    let ny = Math.sin(theta) / h;

    const len = Math.sqrt(nx * nx + ny * ny);
    nx /= len;
    ny /= len;

    const isLong = i % 2 === 0;

    const length = (isLong ? 0.75 : 0.45) * 0.8;


    const rayGeo = new THREE.PlaneGeometry(0.03, length);
    const ray = new THREE.Mesh(rayGeo, rayMat);

    const offset = 0.18;
    ray.position.set(ex + nx * offset, ey + ny * offset, 0.05);

    ray.rotation.z = Math.atan2(ny, nx) + Math.PI / 2;

    raysGroup.add(ray);
  }

  group.add(raysGroup);

  // ============================================================
  // Save references
  // ============================================================
  this._eyeParts = {
    sclera,
    iris,
    pupil,
    upperLid,
    lowerLid,
    raysGroup
  };

  return group;
}





    // ============================================================
    // CUP SYMBOL (unchanged)
    // ============================================================
    if (this.type === "cup") {
      const baseBlue = new THREE.Color(0x4a6cff);

      const outerGeo = new THREE.SphereGeometry(
        0.55, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2
      );
      const outerMat = mat.clone();
      outerMat.color = baseBlue.clone();
      const outer = new THREE.Mesh(outerGeo, outerMat);
      outer.rotation.x = Math.PI;
      outer.position.y = 0.25;
      group.add(outer);

      const innerGeo = new THREE.SphereGeometry(
        0.48, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2
      );
      const innerMat = mat.clone();
      innerMat.color = baseBlue.clone().multiplyScalar(0.8);
      innerMat.side = THREE.BackSide;
      const inner = new THREE.Mesh(innerGeo, innerMat);
      inner.rotation.x = Math.PI;
      inner.position.y = 0.25;
      group.add(inner);

      const rimGeo = new THREE.TorusGeometry(0.55, 0.04, 16, 48);
      const rimMat = mat.clone();
      rimMat.color = baseBlue.clone().multiplyScalar(1.2);
      rimMat.emissive = baseBlue.clone().multiplyScalar(0.3);
      const rim = new THREE.Mesh(rimGeo, rimMat);
      rim.rotation.x = Math.PI / 2;
      rim.position.y = 0.25;
      group.add(rim);

      const stemGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.6, 16);
      const stemMat = mat.clone();
      stemMat.color = baseBlue.clone().multiplyScalar(0.9);
      const stem = new THREE.Mesh(stemGeo, stemMat);
      stem.position.y = -0.3;
      group.add(stem);

      const baseGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.12, 16);
      const baseMat = mat.clone();
      baseMat.color = baseBlue.clone().multiplyScalar(0.7);
      const base = new THREE.Mesh(baseGeo, baseMat);
      base.position.y = -0.65;
      group.add(base);

      this._cupParts = { outer, inner, rim };
    }

    // ============================================================
    // MARS SYMBOL (unchanged)
    // ============================================================
   // ============================================================
// MARS SYMBOL — FIERY METALLIC, SEPARATED ARROW
// ============================================================
// ============================================================
// ============================================================
// MARS SYMBOL — CONTINUOUS ARROW SHAFT + FIERY METALLIC COLORS
// ============================================================
if (this.type === "mars") {

  const group = new THREE.Group();

  // Fiery metallic material
  // Fiery metallic material
const marsMat = mat.clone();
marsMat.color = new THREE.Color(0xB97A99);        // muted metallic pink
marsMat.metalness = 0.9;
marsMat.roughness = 0.25;
marsMat.emissive = new THREE.Color(0xFFD27F);     // soft warm gold
marsMat.emissiveIntensity = 0.35;


       // metallic pink base
  // soft warm gold


  // ============================================================
  // 1. CIRCLE (torus ring)
  // ============================================================
  const circleGeo = new THREE.TorusGeometry(0.6, 0.10, 32, 64);
  const circleMesh = new THREE.Mesh(circleGeo, marsMat);
  circleMesh.position.z = 0;
  group.add(circleMesh);

  // ============================================================
  // 2. ARROW SHAFT (continuous cylinder)
  // ============================================================
  const shaftGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.9, 32);
  const shaft = new THREE.Mesh(shaftGeo, marsMat);
  shaft.position.set(0.85, 0.85, 0);
  shaft.rotation.z = -Math.PI / 4;
  group.add(shaft);

  // ============================================================
  // 3. DECORATIVE CONNECTOR PLATE (does NOT interrupt shaft)
  // ============================================================
  const plateGeo = new THREE.BoxGeometry(0.28, 0.18, 0.12);
  const plate = new THREE.Mesh(plateGeo, marsMat);
  plate.position.set(0.72, 0.72, 0);
  plate.rotation.z = -Math.PI / 4;
  group.add(plate);

  // ============================================================
  // 4. ARROW HEAD (cone)
  // ============================================================
  const arrowGeo = new THREE.ConeGeometry(0.22, 0.55, 32);
  const arrow = new THREE.Mesh(arrowGeo, marsMat);
  arrow.position.set(1.15, 1.15, 0);
  arrow.rotation.z = -Math.PI / 4;
  group.add(arrow);

  // Save references
  this._marsParts = {
    circleMesh,
    shaft,
    plate,
    arrow
  };
  group.scale.set(0.8, 0.8, 0.8);   // 20% smaller

  return group;
}




    return group;
  }

  // ============================================================
  // UPDATE LOOP
  // ============================================================
  update(elapsedMs) {
    if (!this.visible && elapsedMs > this.appearTime) {
      this.visible = true;
      this.mesh.visible = true;
    }

    if (!this.visible) return;

    if (this.opacity < 1) {
      this.opacity += this.fadeSpeed;
      this.mesh.traverse(obj => {
        if (obj.material) obj.material.opacity = this.opacity;
      });
    }

    this.scale = THREE.MathUtils.lerp(this.scale, this.targetScale, 0.15);
    this.mesh.scale.set(this.scale, this.scale, this.scale);

    const now = performance.now();
    const dt = (now - this._lastUpdateTime) / 1000;
    this._lastUpdateTime = now;


   // ============================================================
// EYE ANIMATION — IRIS SHIMMER + RAY PULSE

if (this.type === "eye" && this._eyeParts) {
  const E = this._eyeParts;

  // ------------------------------------------------------------
  // IRIS SHIMMER
  // ------------------------------------------------------------
  const hovering = this.targetScale > 1.0;
  const pulse = 0.5 + Math.sin(performance.now() * 0.005) * 0.5;
  const intensity = hovering ? 0.45 * pulse : 0.15 * pulse;

  E.iris.material.emissiveIntensity = intensity;

  // ------------------------------------------------------------
  // RAYS PULSE (yellow → orange → red)
  // ------------------------------------------------------------
  const t = (Math.sin(performance.now() * 0.003) + 1) / 2;

  const color = new THREE.Color();
  color.setRGB(
    1.0,
    0.8 * (1 - t),
    0.0 + 0.4 * t
  );

  E.raysGroup.children.forEach(ray => {
    ray.material.emissive = color;
    ray.material.emissiveIntensity = 0.3 + t * 0.6;
  });
}


    // ============================================================
    // CUP SHIMMER
    // ============================================================
    if (this.type === "cup" && this._cupParts) {
      const hovering = this.targetScale > 1.0;
      const pulse = 0.5 + Math.sin(performance.now() * 0.004) * 0.5;
      const intensity = hovering ? 0.6 * pulse : 0.0;

      this._cupParts.rim.material.emissiveIntensity = intensity;
      this._cupParts.inner.material.emissiveIntensity = intensity * 0.4;
    }

    // ============================================================
// MARS ANIMATION — FIERY GLOW PULSE
// ============================================================
// MARS ANIMATION — METALLIC PINK → SOFT GOLD GLOW
// ============================================================
// ============================================================
// MARS ANIMATION — METALLIC PINK → SOFT GOLD (NO YELLOW)
// ============================================================
if (this.type === "mars" && this._marsParts) {
  const M = this._marsParts;

  // Slow ember-like pulse (0 → 1 → 0)
  const t = (Math.sin(performance.now() * 0.002) + 1) / 2;

  // Metallic pink → rose gold → soft gold
  // Never enters bright yellow range
  const emissiveColor = new THREE.Color().setRGB(
    0.95 + t * 0.05,      // red stays dominant (0.95 → 1.0)
    0.45 + t * 0.25,      // green stays soft (0.45 → 0.70)
    0.55 * (1 - t)        // blue fades gently (0.55 → 0.0)
  );

  // Glow intensity (soft, mystical)
  const intensity = 0.25 + t * 0.55;

  // Apply to all Mars components
  [M.circleMesh, M.shaft, M.plate, M.arrow].forEach(part => {
    part.material.emissive = emissiveColor;
    part.material.emissiveIntensity = intensity;
  });
}

 


  }

  setHovered(isHovered) {
    this.targetScale = isHovered ? 1.4 : 1.0;
  }

  click() {
    this.clickPulse = 1;
    return true;
  }
}
