// Import the THREE.js library
import * as THREE from "three";
// To allow for the camera to move around the scene
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
// To allow for importing the .glb file
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
// Our models are compressed, so the loader needs this decoder
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
// A soft studio "room" so glass and metal have something to reflect
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

// Create a Three.JS Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0b10);

// Create a new camera with positions and angles (field of view, aspect, near, far)
const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.01, 100);
camera.position.set(0, 0.6, 3);

// Instantiate a new renderer and set its size
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// Add the renderer's <canvas> to the page
document.getElementById("container3D").appendChild(renderer.domElement);

// Reflections for shiny materials
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

// ---------- Lights: add, remove or tweak these ----------

// Soft light from the sky (top colour) and the floor (bottom colour)
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x222233, 0.6);
scene.add(hemiLight);

// Key light: the main light, top-right, casts the shadow
const keyLight = new THREE.DirectionalLight(0xffffff, 2.2); // (color, intensity)
keyLight.position.set(3, 5, 4);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.near = 0.5;
keyLight.shadow.camera.far = 20;
keyLight.shadow.radius = 4;
scene.add(keyLight);

// Fill light: weaker, from the left, softens the dark side
const fillLight = new THREE.DirectionalLight(0xdcd6ff, 0.7);
fillLight.position.set(-4, 2, 2);
scene.add(fillLight);

// Rim light: from behind, draws a bright edge around the product
const rimLight = new THREE.DirectionalLight(0xb4aaff, 1.6);
rimLight.position.set(0, 3, -5);
scene.add(rimLight);

// Spotlight from above, like a shop display
const spotLight = new THREE.SpotLight(0xffffff, 6, 10, Math.PI / 9, 0.6);
spotLight.position.set(0, 4, 0.5);
spotLight.target.position.set(0, 0, 0);
scene.add(spotLight, spotLight.target);

// A dark floor that catches the shadow
const floor = new THREE.Mesh(
  new THREE.CircleGeometry(3, 64),
  new THREE.MeshStandardMaterial({ color: 0x15141c, roughness: 0.6, metalness: 0 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// ---------- Controls ----------

// This adds controls to the camera, so we can rotate / zoom it with the mouse
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;      // smooth, slightly floaty movement
controls.minDistance = 0.8;
controls.maxDistance = 8;
controls.maxPolarAngle = Math.PI / 2 - 0.05; // don't go under the floor
controls.autoRotate = true;         // slowly turns until you touch it
controls.autoRotateSpeed = 1.2;
controls.addEventListener("start", () => (controls.autoRotate = false));

// ---------- Loading the model ----------

const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
const status = document.getElementById("status");

// Keep track of the current model so we can remove it when switching
let object = null;

function loadModel(name) {
  status.textContent = "Loading…";
  loader.load(
    `models/${name}.glb`,
    (gltf) => {
      if (object) scene.remove(object);
      object = gltf.scene;

      // Every model comes in a different size: scale it to 1 unit tall, stand it on the floor
      const box = new THREE.Box3().setFromObject(object);
      const size = box.getSize(new THREE.Vector3());
      const scale = 1 / size.y;
      object.scale.setScalar(scale);
      box.setFromObject(object);
      const center = box.getCenter(new THREE.Vector3());
      object.position.x -= center.x;
      object.position.z -= center.z;
      object.position.y -= box.min.y;

      object.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      scene.add(object);

      // Point the camera at the middle of the product
      controls.target.set(0, 0.5, 0);
      controls.update();
      status.textContent = "";
    },
    (xhr) => {
      if (xhr.total) status.textContent = `Loading… ${Math.round((xhr.loaded / xhr.total) * 100)}%`;
    },
    (error) => {
      console.error(error);
      status.textContent = "Could not load the model. Are you running a local server?";
    }
  );
}

// Product buttons
document.querySelectorAll("#picker button").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelector("#picker .on")?.classList.remove("on");
    button.classList.add("on");
    loadModel(button.dataset.model);
  });
});

loadModel("lipstick-crystal-red");

// ---------- Animate ----------

// Render the scene again every frame
function animate() {
  requestAnimationFrame(animate);
  controls.update(); // needed for damping and auto-rotate
  renderer.render(scene, camera);
}

// Keep the picture sharp and unstretched when the window is resized
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Start the 3D rendering
animate();
