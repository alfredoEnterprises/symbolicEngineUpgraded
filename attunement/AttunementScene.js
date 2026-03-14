// attunement/AttunementScene.js

class AttunementScene {
    constructor(scene) {
      this.scene = scene;
  
      // --- FLAG-BOTTOM TRIANGLE (matches p5) ---
      this.triA = new THREE.Vector2(0, -5);     // bottom point
      this.triB = new THREE.Vector2(-6, 4);     // top-left
      this.triC = new THREE.Vector2(6, 4);      // top-right

  
      this.dragging = false;
      this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      this.sphereRadius = 0.7;
  
      this._buildFloor();
      this._buildWalls();
      this._buildSphere();
    }
  
    // -----------------------------------------------------
    // FLOOR
    // -----------------------------------------------------
    _buildFloor() {
      const geo = new THREE.PlaneGeometry(20, 20);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x111111,
        roughness: 0.85,
        metalness: 0.05
      });
  
      const floor = new THREE.Mesh(geo, mat);
  
      // Tilt floor slightly for depth
      floor.rotation.x = -Math.PI / 2 + THREE.MathUtils.degToRad(8);
  
      floor.receiveShadow = true;
      this.scene.add(floor);
  
      // Triangle outline
      const triGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(this.triA.x, 0.05, this.triA.y),
        new THREE.Vector3(this.triB.x, 0.05, this.triB.y),
        new THREE.Vector3(this.triC.x, 0.05, this.triC.y),
        new THREE.Vector3(this.triA.x, 0.05, this.triA.y),
      ]);
  
      const triMat = new THREE.LineBasicMaterial({
        color: 0xffffff,
        opacity: 0.4,
        transparent: true
      });
  
      const triLine = new THREE.Line(triGeom, triMat);
      this.scene.add(triLine);
    }
  
    // -----------------------------------------------------
    // WALLS
    // -----------------------------------------------------
    _buildWalls() {
      const wallHeight = this.sphereRadius * 2.2;
      const wallThickness = 0.35;
  
      const mat = new THREE.MeshStandardMaterial({
        color: 0x333333,
        metalness: 0.15,
        roughness: 0.7
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
  
        this.scene.add(mesh);
      };
  
      makeWall(this.triA, this.triB);
      makeWall(this.triB, this.triC);
      makeWall(this.triC, this.triA);
    }
  
    // -----------------------------------------------------
    // SPHERE
    // -----------------------------------------------------
    _buildSphere() {
      const geo = new THREE.SphereGeometry(this.sphereRadius, 32, 32);
  
      const mat = new THREE.MeshPhysicalMaterial({
        color: 0xf0f0f0,
        metalness: 0.9,
        roughness: 0.2,
        clearcoat: 0.6,
        clearcoatRoughness: 0.1
      });
  
      this.sphere = new THREE.Mesh(geo, mat);
      this.sphere.castShadow = true;
  
      const c = this._triangleCentroid();
      this.sphere.position.set(c.x, this.sphereRadius, c.y);
  
      this.scene.add(this.sphere);
      this.prevPos = this.sphere.position.clone();
    }
  
    _triangleCentroid() {
      return new THREE.Vector2(
        (this.triA.x + this.triB.x + this.triC.x) / 3,
        (this.triA.y + this.triB.y + this.triC.y) / 3
      );
    }
  
    // -----------------------------------------------------
    // POINTER EVENTS
    // -----------------------------------------------------
    onPointerDown(raycaster) {
      const hit = raycaster.intersectObject(this.sphere, false);
      if (hit.length > 0) {
        this.dragging = true;
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
  
    // -----------------------------------------------------
    // TRIANGLE MATH
    // -----------------------------------------------------
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
        0, Math.PI/4, Math.PI/2, 3*Math.PI/4,
        Math.PI, 5*Math.PI/4, 3*Math.PI/2, 7*Math.PI/4
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
  
    // -----------------------------------------------------
    // UPDATE LOOP
    // -----------------------------------------------------
    update(delta) {
      this.prevPos.copy(this.sphere.position);
    }
  }
  