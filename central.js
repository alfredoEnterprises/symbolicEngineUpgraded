// central.js

let renderer, camera, scene;
let attunement;
let clock = new THREE.Clock();
let raycaster = new THREE.Raycaster();
let pointer = new THREE.Vector2();
let canvasBounds;

init();
animate();

function init() {
  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  document.body.appendChild(renderer.domElement);

  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050505);

  // Camera (top-down)
  // Camera (angled top-down)
const aspect = window.innerWidth / window.innerHeight;
const orthoSize = 10;

camera = new THREE.OrthographicCamera(
  -orthoSize * aspect,
  orthoSize * aspect,
  orthoSize,
  -orthoSize,
  0.1,
  100
);

// --- UPDATED CAMERA POSITION ---
camera.position.set(0, 14, 14);
camera.lookAt(0, 0, 0);


  // Lights
  const hemi = new THREE.HemisphereLight(0xffffff, 0x222222, 0.8);
  scene.add(hemi);

  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(5, 10, 5);
  scene.add(dir);

  // Attunement scene
  attunement = new AttunementScene(scene);

  // Events
  window.addEventListener('resize', onWindowResize);
  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  renderer.domElement.addEventListener('pointermove', onPointerMove);
  renderer.domElement.addEventListener('pointerup', onPointerUp);

  canvasBounds = renderer.domElement.getBoundingClientRect();
}

function onWindowResize() {
  const aspect = window.innerWidth / window.innerHeight;
  const orthoSize = 10;

  camera.left = -orthoSize * aspect;
  camera.right = orthoSize * aspect;
  camera.top = orthoSize;
  camera.bottom = -orthoSize;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  canvasBounds = renderer.domElement.getBoundingClientRect();
}

function updatePointer(event) {
  const x = ((event.clientX - canvasBounds.left) / canvasBounds.width) * 2 - 1;
  const y = -((event.clientY - canvasBounds.top) / canvasBounds.height) * 2 + 1;
  pointer.set(x, y);
}

function onPointerDown(event) {
  updatePointer(event);
  raycaster.setFromCamera(pointer, camera);
  attunement.onPointerDown(raycaster);
}

function onPointerMove(event) {
  updatePointer(event);
  raycaster.setFromCamera(pointer, camera);
  attunement.onPointerMove(raycaster);
}

function onPointerUp(event) {
  updatePointer(event);
  raycaster.setFromCamera(pointer, camera);
  attunement.onPointerUp(raycaster);
}

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  attunement.update(delta);
  renderer.render(scene, camera);
}
