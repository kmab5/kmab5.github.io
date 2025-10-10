// Core interactions: theme toggle, smooth scroll, scroll reveal, cursor follower, footer year

(function () {
  const root = document.documentElement;
  const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
  const storedTheme = localStorage.getItem('theme');

  function applyTheme(theme) {
    if (theme === 'light') {
      root.classList.add('theme-light');
      document.querySelector('meta[name="theme-color"]').setAttribute('content', '#ffffff');
    } else {
      root.classList.remove('theme-light');
      document.querySelector('meta[name="theme-color"]').setAttribute('content', '#0a0a0a');
    }
  }

  // Initialize theme
  const initialTheme = storedTheme || (prefersLight ? 'light' : 'dark');
  applyTheme(initialTheme);

  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const isLight = root.classList.toggle('theme-light');
      const theme = isLight ? 'light' : 'dark';
      localStorage.setItem('theme', theme);
      document.querySelector('meta[name="theme-color"]').setAttribute('content', isLight ? '#ffffff' : '#0a0a0a');
    });
  }

  // Smooth scroll (enhances native behavior for focus & offset)
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const href = anchor.getAttribute('href');
      if (!href || href === '#') return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Move focus for a11y after scrolling
      setTimeout(() => {
        target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
      }, 400);
    });
  });

  // Reveal on scroll
  const revealEls = document.querySelectorAll('.reveal');
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        const delay = entry.target.getAttribute('data-delay');
        if (delay) {
          entry.target.style.transitionDelay = `${parseFloat(delay)}s`;
        }
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    }
  }, { threshold: 0.12 });
  revealEls.forEach(el => io.observe(el));

  // Cursor follower
  const follower = document.querySelector('.cursor-follower');
  if (follower) {
    let x = 0, y = 0, tx = 0, ty = 0;
    const speed = 0.18;
    const raf = () => {
      x += (tx - x) * speed;
      y += (ty - y) * speed;
      follower.style.transform = `translate(${x}px, ${y}px)`;
      requestAnimationFrame(raf);
    };
    window.addEventListener('pointermove', (e) => {
      tx = e.clientX;
      ty = e.clientY;
    }, { passive: true });
    raf();
  }

  // Remove tilt; keep subtle zoom handled by CSS on hover

  // Parallax gradient background based on scroll
  const updateBgShift = () => {
    const scrolled = window.scrollY || window.pageYOffset || 0;
    // gentle shift
    const shift = Math.round(scrolled * 0.06);
    document.documentElement.style.setProperty('--bg-shift', `${shift}px`);
  };
  updateBgShift();
  window.addEventListener('scroll', updateBgShift, { passive: true });

  // Footer year
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
})();

// Three.js minimal setup for hero model
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

(() => {
  const container = document.getElementById('three-container');
  if (!container) return;

  const root = document.documentElement;
  const preloader = container.querySelector('.three-preloader');

  const scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3; // brighten model rendering
  container.appendChild(renderer.domElement);

  const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
  camera.position.set(0.8, 0.6, 2.2);
  camera.lookAt(0, 0, 0);

  // Lights
  // All-encompassing lighting: ambient + hemisphere + multi-directional fills
  const ambient = new THREE.AmbientLight(0xffffff, 1.0);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x888888, 0.9);
  const key = new THREE.DirectionalLight(0xffffff, 1.1); key.position.set(3, 5, 4);
  const fillA = new THREE.DirectionalLight(0xffffff, 0.7); fillA.position.set(-4, 3, -3);
  const fillB = new THREE.DirectionalLight(0xffffff, 0.6); fillB.position.set(0, -3, 2);
  const rim = new THREE.DirectionalLight(0xffffff, 0.6); rim.position.set(-2, 4, 5);
  scene.add(ambient, hemi, key, fillA, fillB, rim);

  // Controls (limited)
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.rotateSpeed = 0.4;
  controls.minPolarAngle = Math.PI / 3;
  controls.maxPolarAngle = Math.PI / 2;

  // Match canvas background with theme
  const updateBg = () => {
    const isLight = root.classList.contains('theme-light');
    renderer.setClearColor(isLight ? 0xffffff : 0x0a0a0a, 0); // alpha 0 to blend
  };
  updateBg();

  // Load model (user to replace modelUrl)
  const modelUrl = './model.glb';
  let model = null;
  let targetCenter = new THREE.Vector3(0, 0, 0);
  let targetRadius = 0.6;

  const frameToTarget = () => {
    // Fit model to view without stretching by computing distance for current aspect
    const rect = container.getBoundingClientRect();
    const aspect = Math.max(0.0001, rect.width / Math.max(1, rect.height));
    const vfov = THREE.MathUtils.degToRad(camera.fov);
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * aspect);
    const distV = targetRadius / Math.tan(vfov / 2);
    const distH = targetRadius / Math.tan(hfov / 2);
    const distance = Math.max(distV, distH) * 1.3; // padding factor
    // Preserve current orbit angles while re-centering on target
    const az = typeof controls.getAzimuthalAngle === 'function' ? controls.getAzimuthalAngle() : -Math.PI / 6;
    const pol = typeof controls.getPolarAngle === 'function' ? controls.getPolarAngle() : Math.PI / 3;
    const spherical = new THREE.Spherical(distance, pol, az);
    const offset = new THREE.Vector3().setFromSpherical(spherical);
    controls.target.copy(targetCenter);
    camera.position.copy(targetCenter).add(offset);
    camera.near = Math.max(0.01, distance - targetRadius * 3);
    camera.far = distance + targetRadius * 6;
    camera.updateProjectionMatrix();
    controls.update();
  };
  const loader = new GLTFLoader();
  loader.load(
    modelUrl,
    (gltf) => {
      model = gltf.scene;
      // Normalize and center model precisely
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      const scale = 1.0 / maxDim; // normalize to unit size
      model.scale.setScalar(scale);
      model.position.x = -center.x * scale;
      model.position.y = -center.y * scale;
      model.position.z = -center.z * scale;
      // Compute bounding sphere post-scale
      const sphere = new THREE.Sphere();
      new THREE.Box3().setFromObject(model).getBoundingSphere(sphere);
      targetCenter.copy(sphere.center);
      targetRadius = sphere.radius;
      scene.add(model);
      if (preloader) preloader.classList.add('is-hidden');
      frameToTarget();
    },
    (xhr) => {
      if (!preloader) return;
      const total = xhr.total || 1;
      const progress = Math.min(100, Math.round((xhr.loaded / total) * 100));
      preloader.textContent = `Loading 3D… ${progress}%`;
    },
    (err) => {
      if (preloader) preloader.textContent = 'Failed to load 3D';
      console.error('GLTF load error', err);
    }
  );

  // Idle animation and slight pointer parallax
  let t = 0;
  let pointerX = 0, pointerY = 0;
  window.addEventListener('pointermove', (e) => {
    const rect = container.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    pointerX = x; pointerY = y;
  }, { passive: true });

  const animate = () => {
    requestAnimationFrame(animate);
    t += 0.01;
    if (model) {
      model.rotation.y += 0.002; // slow idle rotation
      model.position.y = Math.sin(t) * 0.03; // gentle float
      // subtle parallax rotate
      model.rotation.x += (pointerY * 0.02 - model.rotation.x) * 0.05;
      model.rotation.z += (pointerX * 0.02 - model.rotation.z) * 0.05;
    }
    controls.update();
    renderer.render(scene, camera);
  };
  animate();

  const onResize = () => {
    // Force measurement from bounding client rect to capture flex/grid changes
    const rect = container.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(w, h, true); // update canvas style size as well
    camera.aspect = w / h;
    frameToTarget();
  };
  const ro = new ResizeObserver(onResize);
  ro.observe(container);
  window.addEventListener('resize', onResize);

  // React to theme changes
  const mo = new MutationObserver(updateBg);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
})();

// Collapsible header navigation
(() => {
  const toggle = document.getElementById('nav-toggle');
  const menu = document.getElementById('nav-menu');
  if (!toggle || !menu) return;
  const close = () => {
    menu.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
  };
  const open = () => {
    menu.classList.add('is-open');
    toggle.setAttribute('aria-expanded', 'true');
  };
  toggle.addEventListener('click', () => {
    const isOpen = menu.classList.contains('is-open');
    isOpen ? close() : open();
  });
  menu.querySelectorAll('a').forEach(a => a.addEventListener('click', close));
  window.addEventListener('resize', () => {
    if (window.matchMedia('(min-width: 48rem)').matches) close();
  });
})();


