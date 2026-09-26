// Scene setup
const scene = new THREE.Scene();

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // cap for high-DPI screens
document.getElementById('bg-canvas').appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 20000); // 20000 = draw distance, far enough that nothing gets cut off
camera.position.z = 1000;

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Wireframe material
const material = new THREE.MeshBasicMaterial({
  color: 0x4dd0b1,
  wireframe: true,
  transparent: true,
  opacity: 0.3
});

// Create spheres, seeded to hero formation
const spheres = [];
const count = 300;
const geometry = new THREE.SphereGeometry(15, 16, 16); // one shape shared by every sphere

for (let i = 0; i < count; i++) {
  const mesh = new THREE.Mesh(geometry, material);

  mesh.position.set(
    FORMATIONS.hero[i].x,
    FORMATIONS.hero[i].y,
    FORMATIONS.hero[i].z
  );

  scene.add(mesh);
  spheres.push(mesh);
}

// Section order — must match DOM order
const SECTION_KEYS = ['hero', 'about', 'skills', 'projects', 'contact', 'dog'];

// Camera positions for each section
const CAMERA_POSITIONS = [
  { x: 0, y: 50,  z: 2200 },  // hero
  { x: 25, y: -850  , z: 3500 },  // about
  { x: 80, y: -1775, z: 5000 },  // skills
  { x: 0, y: -1500,    z: 5300 },  // projects
  { x: 0, y: 400,    z: 3000 },  // contact
  { x: 0, y: -500,    z: 3000 }   // dog
];


// Linear interpolation
function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Get scroll progress as section index + fraction
function getScrollState() {
  const scrollY = window.scrollY;
  const sectionHeight = document.getElementById('hero').offsetHeight;
  const totalSections = SECTION_KEYS.length;

  const raw = scrollY / sectionHeight;
  const index = Math.min(Math.floor(raw), totalSections - 2);
  const t = Math.min(Math.max(raw - index, 0), 1);

  return { index, t };
}

const driftOffsets = spheres.map(() => ({ x: 0, y: 0 }));

let time = 0;

function getFormationPos(sectionKey, formation, i) {
  const p = formation[i];
  if (sectionKey === 'skills') {
    return { x: p.x, y: p.z, z: -p.y };
  }
  return p;
}

function animate() {
  requestAnimationFrame(animate);
  time += 0.001;

  const { index, t } = getScrollState();

  const fromFormation = FORMATIONS[SECTION_KEYS[index]];
  const toFormation = FORMATIONS[SECTION_KEYS[index + 1]];
  const fromCam = CAMERA_POSITIONS[index];
  const toCam = CAMERA_POSITIONS[index + 1];

  // Interpolate camera
  camera.position.x = lerp(fromCam.x, toCam.x, t);
  camera.position.y = lerp(fromCam.y, toCam.y, t);
  camera.position.z = lerp(fromCam.z, toCam.z, t);

  const flipSections = ['hero'];

  spheres.forEach((sphere, i) => {
    const fromPos = getFormationPos(SECTION_KEYS[index],     fromFormation, i);
    const toPos   = getFormationPos(SECTION_KEYS[index + 1], toFormation,   i);

    const fromY = flipSections.includes(SECTION_KEYS[index])     ? -fromPos.y : fromPos.y;
    const toY   = flipSections.includes(SECTION_KEYS[index + 1]) ? -toPos.y   : toPos.y;

    const baseX = lerp(fromPos.x, toPos.x, t);
    const baseY = lerp(fromY, toY, t);
    const baseZ = lerp(fromPos.z, toPos.z, t);

    driftOffsets[i].x = Math.cos(time + i * 0.15) * 20;
    driftOffsets[i].y = Math.sin(time + i * 0.1) * 20;

    sphere.position.x = baseX + driftOffsets[i].x;
    sphere.position.y = baseY + driftOffsets[i].y;
    sphere.position.z = baseZ;

    sphere.rotation.x += 0.002;
    sphere.rotation.y += 0.003;
    // hidden spheres (half moon) shrink away smoothly while scrolling
    const visible = lerp(sphereVisibility(SECTION_KEYS[index], i), sphereVisibility(SECTION_KEYS[index + 1], i), t);
    sphere.scale.setScalar((1 + Math.sin(time * 50 + i * 0.5) * 0.5) * visible);
  });

  renderer.render(scene, camera);
}

// ---- Move formations on desktop (this file is desktop only; phones use mobile.js) ----
// x: + right / - left      y: + up / - down      z: + toward you / - away
// scale: 1 = normal size, 1.2 = 20% bigger, 0.8 = 20% smaller
// Note: "hero" is drawn upside down, so for hero y is flipped (+ moves it down).
const FORMATION_OFFSETS = {
  hero:     { x: 0, y: 0, z: 0, scale: 1 },
  about:    { x: 0, y: 0, z: 0, scale: .8 },
  skills:   { x: 0, y: 0, z: 0, scale: 1 },   // anchored to the "Skills" title below (was x: 50, y: -50)
  projects: { x: 0, y: 0, z: 0, scale: 1 },
  contact:  { x: 0, y: 0, z: 0, scale: 1 },
  dog:      { x: 0, y: 0, z: 0, scale: .8 }
};

// ---- Anchor formations to things on the page ----
// Two kinds of anchor:
//  • element: a torus centers itself on that element and sizes its ring from the
//    element's width. "ring" = where the middle of the torus ring sits, as a
//    multiple of the element's radius (1 = right on its edge).
//  • between: [top element, bottom element]: the shape centers itself in the gap
//    between them. "fill" = how much of the gap's height the shape fills (0.7 = 70%).
// shiftX / shiftY (optional) move the center, as a fraction of the element's
// width / height (or of the gap's height) (+ right / + down).
// halfMoon: true hides the far half of the shape, leaving a half moon.
// FORMATION_OFFSETS above still applies on top, as a small nudge.
// Sections not listed here keep their fixed position.
const FORMATION_ANCHORS = {
  about:    { element: '#about .about-photo', ring: 1.05 },
  skills:   { element: '#skills .skills-content > span', ring: 2.85, shiftX: 0.16, shiftY: 0.43, halfMoon: true },
  projects: { between: ['#projects .project-title', '#projects .project-sub'], fill: 0.7 },
  contact:  { between: ['#contact .contact-links', '#contact .nav-btn'], fill: 0.57 },
  dog:      { element: '#dog .dog-photo', ring: 1.12 }
};
const TORUS_RING_RADIUS = 400;   // middle of the ring in the torus shape (formationsv2.js)
// Where a shape actually lands on screen (top, bottom, center) while its section is showing
function projectedBox(key) {
  const cam = CAMERA_POSITIONS[SECTION_KEYS.indexOf(key)];
  const view = camera.clone();
  view.position.set(cam.x, cam.y, cam.z);
  view.aspect = window.innerWidth / window.innerHeight;
  view.updateProjectionMatrix();
  view.updateMatrixWorld();
  let top = Infinity, bottom = -Infinity, left = Infinity, right = -Infinity;
  const v = new THREE.Vector3();
  FORMATIONS[key].forEach((_, i) => {
    const p = getFormationPos(key, FORMATIONS[key], i);
    v.set(p.x, p.y, p.z).project(view);
    const sx = (v.x + 1) / 2 * window.innerWidth, sy = (1 - v.y) / 2 * window.innerHeight;
    top = Math.min(top, sy); bottom = Math.max(bottom, sy);
    left = Math.min(left, sx); right = Math.max(right, sx);
  });
  return { top, bottom, cx: (left + right) / 2 };
}

// Nudge a "between" fit until the shape, as the camera sees it, fills the target
// height and sits centered on (px, py)
function refineFit(key, px, py, radiusPx, unitsPerPx) {
  const fit = anchorFits[key];
  for (let pass = 0; pass < 3; pass++) {
    let box = projectedBox(key);
    fit.scale *= (2 * radiusPx) / (box.bottom - box.top);           // size
    box = projectedBox(key);
    fit.x += (px - box.cx) * unitsPerPx;                            // left / right
    fit.y -= (py - (box.top + box.bottom) / 2) * unitsPerPx;        // up / down
  }
}

// Height and center of a shape's own data, used by "between" anchors
function shapeBounds(key) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of FORMATIONS[key]) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
  }
  return { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, halfHeight: (maxY - minY) / 2 };
}
let anchorFits = {};

// Work out, for each anchored section, where its element sits on screen while
// that section is showing, and turn that into a 3D position and size
function fitAnchors() {
  anchorFits = {};
  const halfFov = THREE.MathUtils.degToRad(camera.fov / 2);
  for (const key in FORMATION_ANCHORS) {
    const a = FORMATION_ANCHORS[key];
    const section = document.getElementById(key);
    if (!section) continue;
    const sectionTop = section.getBoundingClientRect().top;
    const cam = CAMERA_POSITIONS[SECTION_KEYS.indexOf(key)];
    const depth = cam.z - FORMATION_OFFSETS[key].z;                     // camera to formation
    const unitsPerPx = 2 * depth * Math.tan(halfFov) / window.innerHeight;

    let px, py, radiusPx, shapeRadius, center = { cx: 0, cy: 0 };
    if (a.between) {
      const top = document.querySelector(a.between[0]);
      const bottom = document.querySelector(a.between[1]);
      if (!top || !bottom) continue;
      const t = top.getBoundingClientRect(), b = bottom.getBoundingClientRect();
      const gap = b.top - t.bottom;
      px = (t.left + t.width / 2 + b.left + b.width / 2) / 2 + (a.shiftX || 0) * gap;
      py = (t.bottom + b.top) / 2 - sectionTop + (a.shiftY || 0) * gap;  // middle of the gap
      radiusPx = a.fill * gap / 2;
      center = shapeBounds(key);             // fit the shape's own height into the gap
      shapeRadius = center.halfHeight;
    } else {
      const el = document.querySelector(a.element);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      px = r.left + r.width / 2 + (a.shiftX || 0) * r.width;           // element center, on screen
      py = r.top - sectionTop + r.height / 2 + (a.shiftY || 0) * r.height; // ...when its section is showing
      radiusPx = a.ring * r.width / 2;
      shapeRadius = TORUS_RING_RADIUS;
    }
    const fitScale = radiusPx * unitsPerPx / shapeRadius;
    anchorFits[key] = {
      x: cam.x + (px - window.innerWidth / 2) * unitsPerPx - center.cx * fitScale,
      y: cam.y - (py - window.innerHeight / 2) * unitsPerPx - center.cy * fitScale,
      scale: fitScale
    };
    // 3D shapes can look bigger / off-center through the camera (parts lean toward it),
    // so check how it actually lands on screen and correct it
    if (a.between) refineFit(key, px, py, radiusPx, unitsPerPx);
  }
}

// Half moon: 1 = sphere shows in this section, 0 = hidden (the far half).
// Skills is tilted 45°, so its far half is where the tilted depth is below zero.
function sphereVisibility(sectionKey, i) {
  const a = FORMATION_ANCHORS[sectionKey];
  if (!a || !a.halfMoon) return 1;
  const p = FORMATIONS[sectionKey][i];
  const depth = sectionKey === 'skills' ? -(p.y + p.z) * Math.SQRT1_2 : p.z;
  return depth >= 0 ? 1 : 0;
}

// Re-fit whenever the layout could have changed
fitAnchors();
window.addEventListener('load', fitAnchors);
window.addEventListener('resize', fitAnchors);
if (document.fonts) document.fonts.ready.then(fitAnchors);

//Vortex "drain" position
function getFormationPos(sectionKey, formation, i) {
  let p = formation[i];
  if (sectionKey === 'skills') {
    // Rotate 45° around X axis
    const cos45 = -Math.SQRT1_2; // 0.707...
    const sin45 = -Math.SQRT1_2;
    p = {
      x: p.x,
      y: p.y * cos45 - p.z * sin45,
      z: p.y * sin45 + p.z * cos45
    };
  }
  const o = FORMATION_OFFSETS[sectionKey];
  const fit = anchorFits[sectionKey] || { x: 0, y: 0, scale: 1 };
  const s = o.scale * fit.scale;
  return {
    x: p.x * s + fit.x + o.x,
    y: p.y * s + fit.y + o.y,
    z: p.z * s + o.z
  };
}

animate();

// Smooth scrolling, shared by nav links and "continue" buttons
function smoothScrollTo(targetId, duration) {
  const targetSection = document.getElementById(targetId);
  if (!targetSection) return;

  const targetY = targetSection.offsetTop;
  const startY = window.scrollY;
  const distance = targetY - startY;
  let startTime = null;

  function scrollStep(timestamp) {
    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Ease in-out
    const ease = progress < 0.5
      ? 2 * progress * progress
      : -1 + (4 - 2 * progress) * progress;

    window.scrollTo(0, startY + distance * ease);

    if (progress < 1) requestAnimationFrame(scrollStep);
  }

  requestAnimationFrame(scrollStep);
}

// Nav links
document.querySelectorAll('nav a').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    smoothScrollTo(link.getAttribute('href').slice(1), 500); // ms — adjust to taste
  });
});

// Continue buttons
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    smoothScrollTo(btn.getAttribute('href').slice(1), 300); // ms — adjust to taste
  });
});
