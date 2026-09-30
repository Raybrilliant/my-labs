/**
 * Hero WebGL scene. Lives in its own module so the dynamic importer in
 * HeroCanvas.svelte gets a tree-shaken `three` chunk (~300KB) instead of the
 * full 720KB namespace bundle — named imports let Rollup drop unused modules.
 *
 * Performance budget (looks the same, runs on weak GPUs):
 * - Icosahedron detail 18/12 (was 36/16) — silhouette error stays sub-pixel
 * - Vertex shader evaluates the cheap single-octave displacement for normal
 *   reconstruction (5 simplex calls per vertex, was 8)
 * - MeshStandardMaterial (no clearcoat) instead of MeshPhysicalMaterial
 * - Dynamic resolution scaling: sustained slow frames step the pixel ratio
 *   down; sustained fast frames step it back up (bounded by base DPR)
 * - 30fps cap on mobile / low-end hardware signals
 * - Render loop pauses when the tab is hidden as well as off-screen
 */
import {
  ACESFilmicToneMapping,
  Clock,
  Color,
  DirectionalLight,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PointLight,
  PMREMGenerator,
  Scene,
  SphereGeometry,
  TorusGeometry,
  WebGLRenderer,
  type BufferGeometry,
  type Material,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { gsap, prefersReducedMotion } from './gsap';

/**
 * GLSL prepended into the MeshStandardMaterial vertex shader.
 * Radial simplex displacement + smooth normals reconstructed from
 * tangent-space neighbour samples (silky organic surface, zero faceting).
 */
const GLSL_BLOB = /* glsl */ `
  uniform float uTime;
  uniform float uAmp;
  uniform float uFreq;
  uniform float uGlitch;

  // Simplex 3D Noise — Ian McEwan, Ashima Arts (MIT)
  vec3 mod289(vec3 x){return x - floor(x * (1.0/289.0)) * 289.0;}
  vec4 mod289(vec4 x){return x - floor(x * (1.0/289.0)) * 289.0;}
  vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
  vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
  float snoise(vec3 v){
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
           i.z + vec4(0.0, i1.z, i2.z, 1.0))
         + i.y + vec4(0.0, i1.y, i2.y, 1.0))
         + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  // Primary octave only — the cheap sample used for normal reconstruction.
  float dispBase(vec3 p) {
    return snoise(p * uFreq + uTime * 0.35);
  }

  float dispAmount(vec3 p) {
    float n = dispBase(p);
    n += 0.45 * snoise(p * uFreq * 2.4 - uTime * 0.55);
    return n * uAmp * (1.0 + uGlitch * 0.8);
  }

  vec3 displace(vec3 p) {
    return p + normalize(p) * dispAmount(p);
  }

  // Single-octave variant for the normal's neighbour taps: the detail
  // octave is half amplitude, so shading is visually identical at ~half
  // the vertex shader cost.
  vec3 displaceFast(vec3 p) {
    return p + normalize(p) * dispBase(p) * uAmp * (1.0 + uGlitch * 0.8);
  }

  vec3 orthogonalVec(vec3 v) {
    return normalize(abs(v.x) > abs(v.z) ? vec3(-v.y, v.x, 0.0) : vec3(0.0, -v.z, v.y));
  }

  vec3 displacedNormal(vec3 p, vec3 n) {
    float eps = 0.035;
    vec3 tangent = orthogonalVec(n);
    vec3 bitangent = normalize(cross(n, tangent));
    vec3 p0 = displaceFast(p);
    vec3 p1 = displaceFast(p + tangent * eps);
    vec3 p2 = displaceFast(p + bitangent * eps);
    return normalize(cross(p1 - p0, p2 - p0));
  }
`;

export interface HeroSceneOptions {
  wrapEl: HTMLElement;
  canvasEl: HTMLCanvasElement;
  /** Shared scroll-exit channel, tweened by Hero.svelte's pinned timeline. */
  scrollFx: { progress: number } | null;
}

export function initHeroScene({ wrapEl, canvasEl, scrollFx }: HeroSceneOptions): () => void {
  const reduced = prefersReducedMotion();
  const isMobile = window.matchMedia('(max-width: 767px)').matches;

  // Low-end signals → cap the loop at 30fps. Motion is slow and organic,
  // so a 30fps cap reads perfectly smooth while halving GPU/CPU work.
  const nav = navigator as Navigator & { deviceMemory?: number };
  const lowEnd =
    isMobile || (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4;
  const FRAME_BUDGET = lowEnd ? 1 / 30 : 0;

  const scene = new Scene();
  const camera = new PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0, 4.6);

  const renderer = new WebGLRenderer({
    canvas: canvasEl,
    antialias: !isMobile,
    alpha: true,
    powerPreference: 'high-performance',
  });
  const baseDpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 1.75);
  renderer.setPixelRatio(baseDpr);
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  // Studio reflections for every PBR material in the scene
  const pmrem = new PMREMGenerator(renderer);
  const envScene = new RoomEnvironment();
  const envRT = pmrem.fromScene(envScene, 0.04);
  scene.environment = envRT.texture;
  pmrem.dispose();

  // -- Lights: warm key, neutral rim, brand-red follow light ----
  const keyLight = new DirectionalLight('#fff1e0', 2.2);
  keyLight.position.set(4, 5, 3);
  const rimLight = new DirectionalLight('#ffffff', 1.1);
  rimLight.position.set(-4, 2, -4);
  const redLight = new PointLight('#ff2e1f', 35, 0, 2);
  redLight.position.set(-2.6, -0.8, 2.5);
  scene.add(keyLight, rimLight, redLight);

  // -- The blob: noise-displaced ceramic, full PBR ----------
  const uniforms = {
    uTime: { value: reduced ? 10 : 0 },
    uAmp: { value: reduced ? 0.28 : 0.3 },
    uFreq: { value: 1.05 },
    uGlitch: { value: 0 },
  };

  const geometry = new IcosahedronGeometry(1.45, isMobile ? 12 : 18);
  // Light concrete-ceramic body: high contrast against black display text.
  // Standard material keeps the PBR reflections; the clearcoat glaze of the
  // old physical material wasn't worth its per-fragment cost. Low roughness
  // + high envMapIntensity reproduces the wet-ceramic glaze instead.
  const material = new MeshStandardMaterial({
    color: new Color('#d5cfc2'),
    metalness: 0.18,
    roughness: 0.26,
    envMapIntensity: 1.55,
    emissive: new Color('#ff2e1f'),
    emissiveIntensity: 0,
  });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = GLSL_BLOB + shader.vertexShader;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <beginnormal_vertex>',
        /* glsl */ `
          vec3 dPos = displace(position);
          // Glitch: random horizontal slices jump sideways for a few frames
          float slice = step(0.72, fract(sin(floor(position.y * 9.0) * 91.17 + floor(uTime * 16.0)) * 43758.55));
          dPos.x += uGlitch * slice * 0.13;
          vec3 objectNormal = displacedNormal(position, normalize(position));
        `
      )
      .replace('#include <begin_vertex>', 'vec3 transformed = dPos;');
  };
  const mesh = new Mesh(geometry, material);

  const world = new Group();
  world.add(mesh);
  const worldBaseScale = isMobile ? 0.74 : 0.95;
  world.scale.setScalar(worldBaseScale);

  // -- Thin chrome orbit ring -----------------------------------
  const ringGeo = new TorusGeometry(2.35, 0.014, 16, isMobile ? 120 : 220);
  const ringMat = new MeshStandardMaterial({
    color: new Color('#8a8378'),
    metalness: 1,
    roughness: 0.3,
    envMapIntensity: 1.2,
  });
  const ring = new Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI * 0.42;
  world.add(ring);

  // -- Orbiting spheres: one signal-red, two chrome --------------
  const orbSpecs = [
    { radius: 2.2, size: 0.16, speed: 0.32, phase: 0.0, wobble: 0.35, red: true },
    { radius: 2.6, size: 0.11, speed: -0.24, phase: 2.1, wobble: 0.55, red: false },
    { radius: 2.95, size: 0.08, speed: 0.45, phase: 4.2, wobble: 0.8, red: false },
  ];
  const orbGeos: BufferGeometry[] = [];
  const orbMats: Material[] = [];
  const sats: { pivot: Mesh; radius: number; speed: number; phase: number; wobble: number }[] = [];
  for (const spec of orbSpecs) {
    const g = new SphereGeometry(spec.size, isMobile ? 24 : 48, isMobile ? 16 : 32);
    const m = spec.red
      ? new MeshStandardMaterial({
          color: new Color('#ff2e1f'),
          metalness: 0.35,
          roughness: 0.22,
          emissive: new Color('#ff2e1f'),
          emissiveIntensity: 0.28,
        })
      : new MeshStandardMaterial({
          color: new Color('#d8d2c7'),
          metalness: 1,
          roughness: 0.12,
        });
    const pivot = new Mesh(g, m);
    world.add(pivot);
    orbGeos.push(g);
    orbMats.push(m);
    sats.push({ pivot, ...spec });
  }

  scene.add(world);

  // Anchor the cluster right-of-center on desktop, above the fold text on mobile
  let worldBaseY = 0;
  const positionWorld = () => {
    const desktop = window.innerWidth >= 768;
    world.position.x = desktop ? 1.3 : 0;
    worldBaseY = desktop ? -0.05 : 0.55;
    world.position.y = worldBaseY;
  };
  positionWorld();

  // -- Mouse reactivity (lerped) ---------------------------------
  const mouse = { x: 0, y: 0, tx: 0, ty: 0, speed: 0 };
  let lastX = 0;
  let lastY = 0;
  const onMouseMove = (e: MouseEvent) => {
    mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.ty = (e.clientY / window.innerHeight) * 2 - 1;
    mouse.speed = Math.min(Math.hypot(e.clientX - lastX, e.clientY - lastY) / 40, 1);
    lastX = e.clientX;
    lastY = e.clientY;
  };
  if (!reduced) window.addEventListener('mousemove', onMouseMove, { passive: true });

  // -- Occasional glitch pulses -----------------------------------
  let nextGlitch = 1.8 + Math.random() * 2.5;
  const glitchPulse = () => {
    gsap.to(uniforms.uGlitch, {
      value: 1,
      duration: 0.09,
      repeat: 5,
      yoyo: true,
      onComplete: () => {
        uniforms.uGlitch.value = 0;
      },
    });
  };

  // -- Dynamic resolution scaling ---------------------------------
  // Weak GPUs get stepped down until they hold ~40fps; strong ones climb
  // back to full resolution. Steps are small and rate-limited so it reads
  // as a soft focus change, never a pop.
  let quality = 1;
  const QUALITY_MIN = 0.6;
  const QUALITY_STEP = 0.15;
  let emaFrame = 1 / 60;
  let evalFrames = 0;
  let goodEvals = 0;

  const applyQuality = () => {
    renderer.setPixelRatio(baseDpr * quality);
    renderer.setSize(wrapEl.clientWidth, wrapEl.clientHeight, false);
  };

  const evaluatePerf = (rawDt: number) => {
    emaFrame = emaFrame * 0.9 + rawDt * 0.1;
    if (++evalFrames < 40) return;
    evalFrames = 0;
    if (emaFrame > 0.026 && quality > QUALITY_MIN) {
      quality = Math.max(QUALITY_MIN, quality - QUALITY_STEP);
      goodEvals = 0;
      applyQuality();
    } else if (emaFrame < 0.015 && quality < 1) {
      // Only climb back after three consecutive healthy windows — prevents
      // oscillation right at the GPU's limit.
      if (++goodEvals >= 3) {
        quality = Math.min(1, quality + QUALITY_STEP);
        goodEvals = 0;
        applyQuality();
      }
    } else {
      goodEvals = 0;
    }
  };

  // -- Render loop (paused off-screen AND when the tab is hidden) -----------
  const clock = new Clock();
  let raf = 0;
  let running = false;
  let inView = true;
  let elapsed = reduced ? 10 : 0;

  const tick = () => {
    raf = requestAnimationFrame(tick);
    const rawDt = clock.getDelta();
    evaluatePerf(rawDt);

    // Optional fps cap — skip whole frames on low-end devices.
    if (FRAME_BUDGET && rawDt < FRAME_BUDGET) return;

    const dt = Math.min(rawDt, 0.05);
    elapsed += dt;

    nextGlitch -= dt;
    if (nextGlitch <= 0) {
      nextGlitch = 2.5 + Math.random() * 3.5;
      glitchPulse();
    }

    mouse.x += (mouse.tx - mouse.x) * 0.05;
    mouse.y += (mouse.ty - mouse.y) * 0.05;
    mouse.speed *= 0.92;

    world.rotation.y += (mouse.x * 0.5 - world.rotation.y) * 0.06;
    world.rotation.x += (mouse.y * 0.35 - world.rotation.x) * 0.06;

    uniforms.uTime.value = elapsed;
    const baseAmp = isMobile ? 0.26 : 0.3;
    uniforms.uAmp.value = baseAmp * (1 + Math.sin(elapsed * 0.5) * 0.12) + mouse.speed * 0.1;

    // Red flush during glitch pulses
    material.emissiveIntensity = uniforms.uGlitch.value * 0.5;

    mesh.rotation.z += dt * 0.05;
    ring.rotation.z += dt * 0.12;

    // Scroll exit (in-scene, canvas stays full-bleed): shrink to ~55%,
    // roll and drift downward so the exit feels cinematic, not clipped
    const p = scrollFx ? scrollFx.progress : 0;
    world.scale.setScalar(worldBaseScale * (1 - p * 0.45));
    world.rotation.z = p * 0.55;
    world.position.y = worldBaseY + Math.sin(elapsed * 0.6) * 0.06 - p * 0.85;

    // The red light trails the cursor
    redLight.position.x += (-2.6 + mouse.x * 1.6 - redLight.position.x) * 0.06;
    redLight.position.y += (-0.8 - mouse.y * 1.2 - redLight.position.y) * 0.06;

    for (const s of sats) {
      const a = elapsed * s.speed + s.phase;
      s.pivot.position.set(
        Math.cos(a) * s.radius,
        Math.sin(a * 1.4) * s.radius * s.wobble * 0.35,
        Math.sin(a) * s.radius
      );
    }

    renderer.render(scene, camera);
  };

  const start = () => {
    if (running || reduced || !inView || document.hidden) return;
    running = true;
    clock.getDelta();
    raf = requestAnimationFrame(tick);
  };
  const stop = () => {
    running = false;
    cancelAnimationFrame(raf);
  };

  const io = new IntersectionObserver(
    ([entry]) => {
      inView = entry.isIntersecting;
      if (inView) start();
      else stop();
    },
    { threshold: 0 }
  );
  io.observe(wrapEl);

  const onVisibility = () => {
    if (document.hidden) stop();
    else start();
  };
  document.addEventListener('visibilitychange', onVisibility);

  // -- Resize -------------------------------------------------------
  const setSize = () => {
    const w = wrapEl.clientWidth;
    const h = wrapEl.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    positionWorld();
    if (reduced) renderer.render(scene, camera);
  };
  const ro = new ResizeObserver(setSize);
  ro.observe(wrapEl);
  setSize();

  return () => {
    stop();
    io.disconnect();
    ro.disconnect();
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('mousemove', onMouseMove);
    gsap.killTweensOf(uniforms.uGlitch);
    geometry.dispose();
    material.dispose();
    ringGeo.dispose();
    ringMat.dispose();
    orbGeos.forEach((g) => g.dispose());
    orbMats.forEach((m) => m.dispose());
    scene.environment = null;
    envRT.dispose();
    renderer.dispose();
  };
}
