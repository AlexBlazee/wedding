/* ============================================================
   WEDDING WEBSITE — MAIN JAVASCRIPT
   South Indian Hindu Wedding
   ============================================================ */

/* ============================================================
   CONFIG — Edit all your details here
   ============================================================ */
const CONFIG = {
  gasUrl:   'https://script.google.com/macros/s/AKfycbx9p-rjDUZGImRUs3ir6TZEZqafi-WYQkGHtvtcAkVYCU5LeOZimmMR823zndy59u9l/exec', // Apps Script → Deploy → Web App URL (see gas-code.js setup instructions)
  gasToken: 'WEDDING_2026',         // must match SECRET_TOKEN in gas-code.js
  venue: {
    name:      'Grandion Event Venue',
    address:   '1810 Parkwood Blvd, Frisco, TX 75034',
    mapsQuery: 'https://www.google.com/maps/search/?api=1&query=1810+Parkwood+Blvd,+Frisco,+TX+75034',
  },
  hotel: {
    name:    'Hilton Garden Inn Frisco',
    address: '7550 Gaylord Pkwy, Frisco, TX 75034',
  },
  wedding: {
    brideName: 'Megha',
    groomName: 'Pradeep',
    date:      'June 27, 2026',
    time:      '9:00 AM',
  },
};

/* ============================================================
   THREE.JS — MANDAPAM MANDALA 3D HERO SCENE
   Layered rotating mandalas + glowing center + gold dust + petals
   + mouse-driven camera parallax
   ============================================================ */
function initThreeJS() {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas || typeof THREE === 'undefined') return;

  const isMobile = window.innerWidth < 768;
  const PARTICLE_COUNT = isMobile ? 240 : 600;
  const DUST_COUNT     = isMobile ? 80  : 200;

  /* --- Renderer --- */
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: false,
    antialias: false,
    powerPreference: 'low-power',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x14060B, 1);

  /* --- Scene & Camera --- */
  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 0, 6);
  camera.lookAt(0, 0, 0);

  /* --- TEXTURE: petal (radial gradient blob) --- */
  function createPetalTexture(centerColor, outerColor) {
    const size = 64;
    const c    = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.scale(0.7, 1.4);
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.48);
    grad.addColorStop(0,   centerColor);
    grad.addColorStop(0.5, outerColor);
    grad.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.48, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();
    return new THREE.CanvasTexture(c);
  }

  /* --- TEXTURE: tiny round gold dust --- */
  function createDustTexture() {
    const size = 32;
    const c    = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
    g.addColorStop(0,   'rgba(255,237,170,1)');
    g.addColorStop(0.4, 'rgba(229,136,33,0.7)');
    g.addColorStop(1,   'rgba(229,136,33,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(c);
  }

  /* --- TEXTURE: hand-drawn mandala (canvas) --- */
  function createMandalaTexture(size) {
    const c   = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    ctx.translate(size/2, size/2);
    const R = size * 0.46;

    ctx.strokeStyle = 'rgba(232, 199, 110, 0.95)';

    // Concentric rings
    [R, R*0.85, R*0.65, R*0.45, R*0.28, R*0.14].forEach((r, i) => {
      ctx.lineWidth = i % 2 === 0 ? 2 : 1;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
    });

    // 16 outer petals
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 16; i++) {
      ctx.save();
      ctx.rotate((i / 16) * Math.PI * 2);
      ctx.beginPath();
      ctx.moveTo(0, -R);
      ctx.bezierCurveTo(R*0.10, -R*0.85, R*0.10, -R*0.70, 0, -R*0.62);
      ctx.bezierCurveTo(-R*0.10, -R*0.70, -R*0.10, -R*0.85, 0, -R);
      ctx.stroke();
      ctx.restore();
    }

    // 32 short spokes in middle ring
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 32; i++) {
      ctx.save();
      ctx.rotate((i / 32) * Math.PI * 2);
      ctx.beginPath();
      ctx.moveTo(0, -R*0.45);
      ctx.lineTo(0, -R*0.62);
      ctx.stroke();
      ctx.restore();
    }

    // 8 filled inner saffron petals
    ctx.fillStyle = 'rgba(229, 136, 33, 0.55)';
    for (let i = 0; i < 8; i++) {
      ctx.save();
      ctx.rotate((i / 8) * Math.PI * 2);
      ctx.beginPath();
      ctx.moveTo(0, -R*0.45);
      ctx.bezierCurveTo(R*0.10, -R*0.32, R*0.10, -R*0.18, 0, -R*0.10);
      ctx.bezierCurveTo(-R*0.10, -R*0.18, -R*0.10, -R*0.32, 0, -R*0.45);
      ctx.fill();
      ctx.restore();
    }

    // Center jewel (gold)
    ctx.fillStyle = 'rgba(255, 237, 170, 0.95)';
    ctx.beginPath();
    ctx.arc(0, 0, R*0.06, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(232, 199, 110, 1)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, R*0.10, 0, Math.PI * 2);
    ctx.stroke();

    return new THREE.CanvasTexture(c);
  }

  /* --- TEXTURE: glowing aureola --- */
  function createGlowTexture() {
    const size = 256;
    const c    = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
    g.addColorStop(0,    'rgba(255, 220, 130, 0.85)');
    g.addColorStop(0.25, 'rgba(229, 136, 33, 0.45)');
    g.addColorStop(0.6,  'rgba(126, 20, 48, 0.18)');
    g.addColorStop(1,    'rgba(20, 6, 11, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(c);
  }

  /* --- LAYER: aureola glow (deepest) --- */
  const glowMat = new THREE.SpriteMaterial({
    map: createGlowTexture(),
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const glow = new THREE.Sprite(glowMat);
  glow.position.set(0, 0.4, -5.5);
  glow.scale.set(11, 11, 1);
  scene.add(glow);

  /* --- LAYER: large back mandala (slow CCW) --- */
  const backMandalaTex = createMandalaTexture(512);
  const backMandala = new THREE.Mesh(
    new THREE.PlaneGeometry(11, 11),
    new THREE.MeshBasicMaterial({
      map: backMandalaTex,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  backMandala.position.z = -4;
  scene.add(backMandala);

  /* --- LAYER: smaller mid mandala (CW, opposite direction) --- */
  const midMandala = new THREE.Mesh(
    new THREE.PlaneGeometry(6.5, 6.5),
    new THREE.MeshBasicMaterial({
      map: backMandalaTex,
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  midMandala.position.z = -2.4;
  scene.add(midMandala);

  /* --- PARTICLE SYSTEMS --- */
  function buildParticles(count, texture, size, zRange, sx, sy) {
    const geo       = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const SPREAD_X  = sx;
    const SPREAD_Y  = sy;

    for (let i = 0; i < count; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * SPREAD_X;
      positions[i * 3 + 1] = (Math.random() - 0.5) * SPREAD_Y;
      positions[i * 3 + 2] = (Math.random() - 0.5) * zRange;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      size,
      map:             texture,
      transparent:     true,
      depthWrite:      false,
      blending:        THREE.AdditiveBlending,
      sizeAttenuation: true,
      opacity:         0.88,
    });

    const points = new THREE.Points(geo, mat);
    const velocities  = new Float32Array(count).map(() => -(0.006 + Math.random() * 0.014));
    const swayOffsets = new Float32Array(count).map(() => Math.random() * Math.PI * 2);
    return { points, geo, velocities, swayOffsets, SPREAD_X, SPREAD_Y };
  }

  const jasmineTexture  = createPetalTexture('rgba(255,249,196,0.95)', 'rgba(255,255,255,0.7)');
  const marigoldTexture = createPetalTexture('rgba(255,193,7,0.95)',   'rgba(255,152,0,0.6)');
  const blossomTexture  = createPetalTexture('rgba(255,160,120,0.92)', 'rgba(210,80,70,0.55)');
  const dustTexture     = createDustTexture();

  const jasmineCount  = Math.floor(PARTICLE_COUNT * 0.45);
  const marigoldCount = Math.floor(PARTICLE_COUNT * 0.35);
  const blossomCount  = isMobile ? 55 : 110;

  const jasmine  = buildParticles(jasmineCount,  jasmineTexture,  0.13, 4, 14, 8);
  const marigold = buildParticles(marigoldCount, marigoldTexture, 0.18, 3, 14, 8);
  const blossom  = buildParticles(blossomCount,  blossomTexture,  0.26, 4, 16, 9);
  const dust     = buildParticles(DUST_COUNT,    dustTexture,     0.06, 5, 12, 7);

  // Blossoms fall slowly and sway widely — like petals on a breeze
  for (let i = 0; i < blossom.velocities.length; i++) {
    blossom.velocities[i]  = -(0.002 + Math.random() * 0.005);
    blossom.swayOffsets[i] = Math.random() * Math.PI * 2;
  }

  // Slower drift for dust — feels like temple-lamp embers
  for (let i = 0; i < dust.velocities.length; i++) {
    dust.velocities[i] = -(0.001 + Math.random() * 0.004);
  }

  scene.add(jasmine.points);
  scene.add(marigold.points);
  scene.add(blossom.points);
  scene.add(dust.points);

  /* --- Mouse-driven camera parallax --- */
  const target = { x: 0, y: 0 };
  const cur    = { x: 0, y: 0 };
  if (!isMobile) {
    window.addEventListener('mousemove', e => {
      target.x = (e.clientX / window.innerWidth  - 0.5) * 0.6;
      target.y = (e.clientY / window.innerHeight - 0.5) * 0.4;
    }, { passive: true });
  }

  /* --- Hero visibility observer (pause when off-screen) --- */
  let heroVisible = true;
  const hero = document.getElementById('hero');
  if (hero) {
    const obs = new IntersectionObserver(
      ([e]) => { heroVisible = e.isIntersecting; },
      { threshold: 0 }
    );
    obs.observe(hero);
  }

  /* --- Pause on hidden tab --- */
  let animFrame;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(animFrame);
    else                 animate();
  });

  /* --- Resize (debounced) --- */
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }, 150);
  });

  /* --- Animation loop --- */
  let time = 0;
  function animateParticles(sys) {
    const pos = sys.geo.attributes.position.array;
    for (let i = 0; i < sys.velocities.length; i++) {
      const idx = i * 3;
      pos[idx + 1] += sys.velocities[i];
      pos[idx]     += Math.sin(time * 0.9 + sys.swayOffsets[i]) * 0.003;
      if (pos[idx + 1] < -sys.SPREAD_Y / 2) {
        pos[idx + 1] = sys.SPREAD_Y / 2;
        pos[idx]     = (Math.random() - 0.5) * sys.SPREAD_X;
      }
    }
    sys.geo.attributes.position.needsUpdate = true;
  }

  function animate() {
    animFrame = requestAnimationFrame(animate);
    if (!heroVisible) return;
    time += 0.016;

    // Camera parallax (lerp toward target)
    cur.x += (target.x - cur.x) * 0.05;
    cur.y += (target.y - cur.y) * 0.05;
    camera.position.x =  cur.x;
    camera.position.y = -cur.y;
    camera.lookAt(0, 0, 0);

    // Mandala rotations + breathing scale
    backMandala.rotation.z += 0.0014;
    midMandala.rotation.z  -= 0.0022;
    const breath = 1 + Math.sin(time * 0.4) * 0.025;
    midMandala.scale.set(breath, breath, 1);

    // Aureola pulse
    const pulse = 11 + Math.sin(time * 0.5) * 0.55;
    glow.scale.set(pulse, pulse, 1);
    glow.material.opacity = 0.78 + Math.sin(time * 0.5) * 0.10;

    animateParticles(jasmine);
    animateParticles(marigold);
    animateParticles(dust);
    // Blossoms sway wider and drift more lazily
    const pos = blossom.geo.attributes.position.array;
    for (let i = 0; i < blossom.velocities.length; i++) {
      const idx = i * 3;
      pos[idx + 1] += blossom.velocities[i];
      pos[idx]     += Math.sin(time * 0.6 + blossom.swayOffsets[i]) * 0.007
                    + Math.sin(time * 0.25 + blossom.swayOffsets[i] * 0.7) * 0.004;
      if (pos[idx + 1] < -blossom.SPREAD_Y / 2) {
        pos[idx + 1] = blossom.SPREAD_Y / 2;
        pos[idx]     = (Math.random() - 0.5) * blossom.SPREAD_X;
      }
    }
    blossom.geo.attributes.position.needsUpdate = true;
    renderer.render(scene, camera);
  }

  animate();
}

/* ============================================================
   GSAP ANIMATIONS
   ============================================================ */
function initGSAP() {
  if (typeof gsap === 'undefined') return;

  // Respect reduced-motion preference
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  gsap.registerPlugin(ScrollTrigger);

  /* --- Hero load sequence --- */
  const dividerPath = document.querySelector('.divider-path');
  let pathLength = 0;
  if (dividerPath) {
    pathLength = dividerPath.getTotalLength();
    gsap.set(dividerPath, { strokeDasharray: pathLength, strokeDashoffset: pathLength });
  }

  const heroTL = gsap.timeline({ delay: 0.4 });
  heroTL
    .fromTo('.hero__pretext',
      { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.9, ease: 'power2.out' })
    .fromTo('.hero__bride-name',
      { opacity: 0, y: 38 }, { opacity: 1, y: 0, duration: 1.0, ease: 'power3.out' }, '-=0.4')
    .fromTo('.hero__ampersand',
      { opacity: 0, scale: 0.65 }, { opacity: 1, scale: 1, duration: 0.7, ease: 'back.out(1.8)' }, '-=0.55')
    .fromTo('.hero__groom-name',
      { opacity: 0, y: 38 }, { opacity: 1, y: 0, duration: 1.0, ease: 'power3.out' }, '-=0.55')
    .fromTo('.hero__divider',
      { opacity: 0, scaleX: 0 }, { opacity: 1, scaleX: 1, duration: 0.9, ease: 'power2.inOut', transformOrigin: 'center' }, '-=0.35')
    .fromTo('.hero__scroll-indicator',
      { opacity: 0 }, { opacity: 1, duration: 0.5 }, '-=0.2');

  // Draw-on divider path
  if (dividerPath && pathLength > 0) {
    heroTL.to(dividerPath,
      { strokeDashoffset: 0, duration: 1.3, ease: 'power2.inOut' }, '<');
  }

  /* --- Nav scroll state --- */
  ScrollTrigger.create({
    start: 'top -70px',
    onEnter:     () => document.getElementById('top-nav').classList.add('nav--scrolled'),
    onLeaveBack: () => document.getElementById('top-nav').classList.remove('nav--scrolled'),
  });

  /* --- Couple section --- */
  gsap.from('#couple .section__header', {
    scrollTrigger: { trigger: '#couple', start: 'top 80%', once: true },
    opacity: 0, y: 28, duration: 0.8,
  });
  gsap.fromTo('.couple__card--bride',
    { opacity: 0, x: -55 }, { opacity: 1, x: 0, duration: 0.9, ease: 'power3.out',
      scrollTrigger: { trigger: '.couple__grid', start: 'top 78%', once: true } });
  gsap.fromTo('.couple__card--groom',
    { opacity: 0, x: 55 }, { opacity: 1, x: 0, duration: 0.9, ease: 'power3.out', delay: 0.18,
      scrollTrigger: { trigger: '.couple__grid', start: 'top 78%', once: true } });
  gsap.fromTo('.couple__frame',
    { scale: 0.84 }, { scale: 1, duration: 1.0, ease: 'back.out(1.3)', stagger: 0.2,
      scrollTrigger: { trigger: '.couple__grid', start: 'top 78%', once: true } });
  gsap.fromTo('.couple__divider',
    { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1, duration: 0.65, ease: 'back.out(2)', delay: 0.35,
      scrollTrigger: { trigger: '.couple__grid', start: 'top 75%', once: true } });

  /* --- Details section --- */
  gsap.from('#wedding-details .section__header', {
    scrollTrigger: { trigger: '#wedding-details', start: 'top 80%', once: true },
    opacity: 0, y: 28, duration: 0.8,
  });
  gsap.from('.details__card', {
    scrollTrigger: { trigger: '.details__grid', start: 'top 78%', once: true },
    opacity: 0, y: 45, duration: 0.75, ease: 'power2.out', stagger: 0.18,
  });

  /* --- Our Story --- */
  gsap.from('#our-story .section__header', {
    scrollTrigger: { trigger: '#our-story', start: 'top 80%', once: true },
    opacity: 0, y: 28, duration: 0.8,
  });
  gsap.from('.story__para, .story__yes, .story__invite, .story__closing, .story__divider', {
    scrollTrigger: { trigger: '.story__body', start: 'top 82%', once: true },
    opacity: 0, y: 22, duration: 0.7, ease: 'power1.out', stagger: 0.12,
  });

  /* --- RSVP --- */
  gsap.from('#rsvp .section__header', {
    scrollTrigger: { trigger: '#rsvp', start: 'top 80%', once: true },
    opacity: 0, y: 28, duration: 0.8,
  });
  gsap.from('.form--rsvp .form__field', {
    scrollTrigger: { trigger: '.form--rsvp', start: 'top 82%', once: true },
    opacity: 0, y: 18, duration: 0.5, ease: 'power1.out', stagger: 0.09,
  });

  /* --- Venue --- */
  gsap.from('#venue .section__header', {
    scrollTrigger: { trigger: '#venue', start: 'top 80%', once: true },
    opacity: 0, y: 28, duration: 0.8,
  });
  gsap.fromTo('.venue__info',
    { opacity: 0, x: -38 }, { opacity: 1, x: 0, duration: 0.9, ease: 'power2.out',
      scrollTrigger: { trigger: '.venue__content', start: 'top 78%', once: true } });
  gsap.fromTo('.venue__map-placeholder',
    { opacity: 0, x: 38 }, { opacity: 1, x: 0, duration: 0.9, ease: 'power2.out', delay: 0.2,
      scrollTrigger: { trigger: '.venue__content', start: 'top 78%', once: true } });

  /* --- Accommodation --- */
  gsap.from('#accommodation .section__header', {
    scrollTrigger: { trigger: '#accommodation', start: 'top 80%', once: true },
    opacity: 0, y: 28, duration: 0.8,
  });
  gsap.fromTo('.hotel__card',
    { opacity: 0, y: 55 }, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out',
      scrollTrigger: { trigger: '#accommodation', start: 'top 75%', once: true } });
}

/* ============================================================
   MAPS BUTTONS
   ============================================================ */
function initMapsButtons() {
  const q   = encodeURIComponent(CONFIG.venue.mapsQuery);
  const dst = encodeURIComponent(CONFIG.venue.address);

  const btnMaps = document.getElementById('btn-maps');
  const btnDir  = document.getElementById('btn-directions');
  if (btnMaps) btnMaps.href = `https://www.google.com/maps/search/?api=1&query=${q}`;
  if (btnDir)  btnDir.href  = `https://www.google.com/maps/dir/?api=1&destination=${dst}`;
}

/* ============================================================
   ATTENDANCE TOGGLE
   ============================================================ */
function initAttendanceToggle() {
  const toggle     = document.getElementById('attendance-toggle');
  const hidden     = document.getElementById('rsvp-attending');
  const field      = document.getElementById('guest-count-field');
  const namesField = document.getElementById('guest-names-field');
  if (!toggle) return;

  toggle.querySelectorAll('.attendance-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      toggle.querySelectorAll('.attendance-btn').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      hidden.value = btn.dataset.value;
      const isYes = btn.dataset.value === 'yes';
      if (field) field.style.display = isYes ? 'flex' : 'none';
      if (!isYes && namesField) namesField.style.display = 'none';
      document.getElementById('rsvp-attending-error').textContent = '';
    });
  });
}

/* ============================================================
   GUEST NAME STEPPER
   ============================================================ */
function initGuestStepper() {
  const MAX        = 10;
  let count        = 1; // total attendees including the primary guest
  const minus      = document.getElementById('guest-minus');
  const plus       = document.getElementById('guest-plus');
  const display    = document.getElementById('guest-count-display');
  const hidden     = document.getElementById('guest-count');
  const container  = document.getElementById('guest-names-container');
  const namesField = document.getElementById('guest-names-field');
  if (!minus) return { collectGuestNames: () => 'Not provided' };

  function update() {
    display.textContent = count;
    hidden.value        = count;
    minus.disabled = count <= 1;
    plus.disabled  = count >= MAX;
    if (namesField) namesField.style.display = count > 1 ? 'flex' : 'none';
  }

  function addField(index) {
    const div = document.createElement('div');
    div.className = 'guest-name-field'; // omit form__field to avoid GSAP opacity:0 interference
    div.dataset.index = index;
    div.style.cssText = 'display:flex; flex-direction:column; gap:6px; opacity:1;';
    div.innerHTML = `
      <label class="form__label" for="guest-name-${index}">
        Guest ${index} Name <span class="form__optional">(optional)</span>
      </label>
      <input class="form__input" id="guest-name-${index}" name="guest_name_${index}"
        type="text" placeholder="Guest name (optional)" autocomplete="off"/>`;
    container.appendChild(div);
  }

  function removeField(index) {
    const last = container.querySelector(`[data-index="${index}"]`);
    if (!last) return;
    if (typeof gsap !== 'undefined') {
      gsap.to(last, {
        opacity: 0, y: -8, height: 0, paddingTop: 0, paddingBottom: 0,
        duration: 0.22, ease: 'power1.in', onComplete: () => last.remove(),
      });
    } else {
      last.remove();
    }
  }

  plus.addEventListener('click', () => {
    if (count >= MAX) return;
    count++;
    update();            // show namesField first so parent is visible before field is inserted
    addField(count - 1);
  });

  minus.addEventListener('click', () => {
    if (count <= 1) return;
    const idx = count - 1;
    count--;
    removeField(idx);
    update();
  });

  update();

  function collectGuestNames() {
    const names = [];
    for (let i = 1; i <= count - 1; i++) {
      const el = document.getElementById(`guest-name-${i}`);
      if (el && el.value.trim()) names.push(el.value.trim());
    }
    return names.length ? names.join(', ') : 'Not provided';
  }

  function resetGuests() {
    container.innerHTML = '';
    count = 1;
    update();
  }

  return { collectGuestNames, resetGuests };
}

/* ============================================================
   ROOM STEPPER (Accommodation) — commented out
   ============================================================ */
/*
function initRoomStepper() {
  const MIN   = 1;
  const MAX   = 20;
  let rooms   = 1;
  const minus   = document.getElementById('room-minus');
  const plus    = document.getElementById('room-plus');
  const display = document.getElementById('room-count-display');
  const hidden  = document.getElementById('room-count');
  if (!minus) return;

  function update() {
    display.textContent = rooms;
    hidden.value        = rooms;
    minus.disabled = rooms <= MIN;
    plus.disabled  = rooms >= MAX;
  }

  plus.addEventListener('click',  () => { if (rooms < MAX) { rooms++; update(); } });
  minus.addEventListener('click', () => { if (rooms > MIN) { rooms--; update(); } });
  update();
}
*/

/* ============================================================
   FORM VALIDATION
   ============================================================ */
function validateRSVP() {
  let ok = true;

  const name      = document.getElementById('rsvp-name');
  const nameErr   = document.getElementById('rsvp-name-error');
  if (!name.value.trim()) {
    nameErr.textContent = 'Please enter your full name.';
    name.classList.add('input--error');
    ok = false;
  } else {
    nameErr.textContent = '';
    name.classList.remove('input--error');
  }

  const emailInput = document.getElementById('rsvp-email');
  const emailErr   = document.getElementById('rsvp-email-error');
  if (emailInput && emailInput.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value.trim())) {
    emailErr.textContent = 'Please enter a valid email address.';
    emailInput.classList.add('input--error');
    ok = false;
  } else if (emailErr) {
    emailErr.textContent = '';
    emailInput && emailInput.classList.remove('input--error');
  }

  const attending    = document.getElementById('rsvp-attending').value;
  const attendingErr = document.getElementById('rsvp-attending-error');
  if (!attending) {
    attendingErr.textContent = 'Please select whether you will attend.';
    const toggle = document.getElementById('attendance-toggle');
    if (toggle) {
      toggle.classList.add('shake');
      setTimeout(() => toggle.classList.remove('shake'), 500);
    }
    ok = false;
  } else {
    attendingErr.textContent = '';
  }

  return ok;
}

/*
function validateCoupon() {
  let ok = true;
  const name     = document.getElementById('coupon-name');
  const nameErr  = document.getElementById('coupon-name-error');
  const phone    = document.getElementById('coupon-phone');
  const phoneErr = document.getElementById('coupon-phone-error');

  if (!name.value.trim()) {
    nameErr.textContent = 'Please enter your name.';
    name.classList.add('input--error');
    ok = false;
  } else {
    nameErr.textContent = '';
    name.classList.remove('input--error');
  }

  if (!phone.value.trim()) {
    phoneErr.textContent = 'Please enter your phone number.';
    phone.classList.add('input--error');
    ok = false;
  } else {
    phoneErr.textContent = '';
    phone.classList.remove('input--error');
  }

  return ok;
}
*/

/* ============================================================
   TOAST HELPER
   ============================================================ */
function showToast(id, message, type) {
  const toast = document.getElementById(id);
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast toast--${type} toast--visible`;
  setTimeout(() => toast.classList.remove('toast--visible'), 5500);
}

/* ============================================================
   FORM LOADING STATE
   ============================================================ */
function setLoading(formId, loading) {
  const form   = document.getElementById(formId);
  if (!form) return;
  const btn    = form.querySelector('[type="submit"]');
  const txt    = btn.querySelector('.btn__text');
  const spin   = btn.querySelector('.btn__loading');
  btn.disabled = loading;
  txt.hidden   = loading;
  spin.hidden  = !loading;
}

/* ============================================================
   CELEBRATION OVERLAY + CONFETTI
   ============================================================ */
function showCelebration() {
  const overlay = document.getElementById('celebration-overlay');
  if (!overlay) return;

  overlay.classList.add('is-visible');

  if (typeof confetti !== 'undefined') {
    const colors = ['#D4AF37', '#C22544', '#FF8C00', '#FFF9C4', '#287F54', '#FFD700'];
    confetti({ particleCount: 90, angle: 60,  spread: 60, origin: { x: 0,   y: 0.65 }, colors });
    setTimeout(() => confetti({ particleCount: 90, angle: 120, spread: 60, origin: { x: 1,   y: 0.65 }, colors }), 180);
    setTimeout(() => confetti({ particleCount: 70, spread: 110, origin: { x: 0.5, y: 0.35 }, colors, startVelocity: 22 }), 420);
    setTimeout(() => {
      confetti({ particleCount: 50, angle: 75,  spread: 40, origin: { x: 0.2, y: 0.55 }, colors });
      confetti({ particleCount: 50, angle: 105, spread: 40, origin: { x: 0.8, y: 0.55 }, colors });
    }, 760);
  }

  function closeCelebration() {
    overlay.classList.remove('is-visible');
  }

  document.getElementById('celebration-close').onclick = closeCelebration;
  overlay.addEventListener('click', e => { if (e.target === overlay) closeCelebration(); }, { once: true });
}

/* ============================================================
   GOOGLE APPS SCRIPT — RSVP SUBMIT
   ============================================================ */
function handleRSVPSubmit(e, collectGuestNames, resetGuests) {
  e.preventDefault();
  if (!validateRSVP()) return;

  const isAttending = document.getElementById('rsvp-attending').value === 'yes';
  setLoading('rsvp-form', true);

  const emailVal = (document.getElementById('rsvp-email')?.value || '').trim();
  const payload = {
    token:      CONFIG.gasToken,
    type:       'rsvp',
    name:       document.getElementById('rsvp-name').value.trim(),
    email:      emailVal || '',
    phone:      document.getElementById('rsvp-phone').value.trim() || 'Not provided',
    attending:  isAttending ? 'Yes — Joyfully Accepts' : 'No — Regretfully Declines',
    guestCount: document.getElementById('guest-count').value,
    guestNames: collectGuestNames(),
  };

  function resetForm() {
    document.getElementById('rsvp-form').reset();
    document.getElementById('rsvp-attending').value = '';
    document.querySelectorAll('.attendance-btn').forEach(b => b.classList.remove('is-active'));
    document.getElementById('guest-count-field').style.display = 'none';
    resetGuests();
  }

  fetch(CONFIG.gasUrl, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) })
    .then(() => {
      setLoading('rsvp-form', false);
      resetForm();
      if (isAttending) {
        showCelebration();
      } else {
        showToast('rsvp-toast', 'We\'ll miss celebrating with you, but we truly appreciate you taking time to respond!', 'success');
      }
    })
    .catch(() => {
      setLoading('rsvp-form', false);
      showToast('rsvp-toast', 'Connection error — please check your internet and try again.', 'error');
    });
}

/* ============================================================
   GOOGLE APPS SCRIPT — ROOM REQUEST SUBMIT (commented out)
   ============================================================ */
/*
function handleCouponSubmit(e) {
  e.preventDefault();
  if (!validateCoupon()) return;

  setLoading('coupon-form', true);

  const payload = {
    token: CONFIG.gasToken,
    type:  'room',
    name:  document.getElementById('coupon-name').value.trim(),
    phone: document.getElementById('coupon-phone').value.trim(),
    rooms: document.getElementById('room-count').value,
    hotel: CONFIG.hotel.name,
  };

  fetch(CONFIG.gasUrl, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) })
    .then(() => {
      setLoading('coupon-form', false);
      showToast('coupon-toast', 'Request received! We\'ll send you the coupon code on your phone shortly. 🏨', 'success');
      document.getElementById('coupon-form').reset();
      document.getElementById('room-count-display').textContent = '1';
      document.getElementById('room-count').value = '1';
      document.getElementById('room-minus').disabled = true;
    })
    .catch(() => {
      setLoading('coupon-form', false);
      showToast('coupon-toast', 'Connection error — please check your internet and try again.', 'error');
    });
}
*/

/* ============================================================
   IMAGE COMPRESSION (Canvas-based, targets ≤ 1.5 MB JPEG)
   ============================================================ */
function compressImage(file) {
  return new Promise(resolve => {
    if (!file.type.startsWith('image/')) { resolve(file); return; }
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onerror = () => resolve(file); // fallback to original if image can't be decoded
      img.onload = () => {
        const MAX = 1800;
        let w = img.naturalWidth, h = img.naturalHeight;
        if (w > MAX || h > MAX) {
          const r = Math.min(MAX / w, MAX / h);
          w = Math.round(w * r);
          h = Math.round(h * r);
        }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        canvas.toBlob(blob => resolve(blob || file), 'image/jpeg', 0.82);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/* ============================================================
   PHOTO UPLOAD — Share Your Memories
   ============================================================ */
function initPhotoUpload() {
  const dropzone  = document.getElementById('upload-dropzone');
  const fileInput = document.getElementById('photo-input');
  const preview   = document.getElementById('upload-preview');
  const uploadBtn = document.getElementById('upload-btn');
  const nameInput = document.getElementById('uploader-name');
  if (!dropzone) return;

  let queue = []; // { file, id, blobUrl, status }

  /* ---- Drag & drop ---- */
  ['dragenter', 'dragover'].forEach(ev =>
    dropzone.addEventListener(ev, e => { e.preventDefault(); dropzone.classList.add('is-dragging'); })
  );
  ['dragleave', 'drop'].forEach(ev =>
    dropzone.addEventListener(ev, e => { e.preventDefault(); dropzone.classList.remove('is-dragging'); })
  );
  dropzone.addEventListener('drop', e => addFiles(e.dataTransfer.files));
  fileInput.addEventListener('change', () => { addFiles(fileInput.files); fileInput.value = ''; });

  /* ---- File handling ---- */
  function addFiles(fileList) {
    const imgs = [...fileList].filter(f => f.type.startsWith('image/')).slice(0, 20 - queue.length);
    imgs.forEach(file => {
      const id = `img-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      queue.push({ file, id, blobUrl: URL.createObjectURL(file), status: 'pending' });
      renderThumb(queue[queue.length - 1]);
    });
    syncUploadBtn();
  }

  function renderThumb(item) {
    const div = document.createElement('div');
    div.className = 'upload-item';
    div.id = item.id;
    div.innerHTML = `
      <img class="upload-item__thumb" src="${item.blobUrl}" alt="preview" loading="lazy"/>
      <div class="upload-item__overlay"><span class="upload-item__icon"></span></div>
      <button type="button" class="upload-item__remove" data-id="${item.id}" aria-label="Remove photo">✕</button>`;
    preview.appendChild(div);
    requestAnimationFrame(() => div.classList.add('is-visible'));
  }

  preview.addEventListener('click', e => {
    const btn = e.target.closest('.upload-item__remove');
    if (!btn) return;
    const id = btn.dataset.id;
    const item = queue.find(i => i.id === id);
    if (item) URL.revokeObjectURL(item.blobUrl);
    queue = queue.filter(i => i.id !== id);
    document.getElementById(id)?.remove();
    syncUploadBtn();
  });

  function syncUploadBtn() {
    const hasPending = queue.some(i => i.status === 'pending');
    uploadBtn.style.display = hasPending ? '' : 'none';
  }

  function setThumbStatus(id, status) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('is-uploading', 'is-done', 'is-error');
    const icon = el.querySelector('.upload-item__icon');
    if (status === 'uploading') { el.classList.add('is-uploading'); icon.textContent = ''; }
    if (status === 'done')      { el.classList.add('is-done');      icon.textContent = '✓'; }
    if (status === 'error')     { el.classList.add('is-error');     icon.textContent = '✗'; }
  }

  /* ---- Upload ---- */
  uploadBtn.addEventListener('click', async () => {
    const pending = queue.filter(i => i.status === 'pending');
    if (!pending.length) return;

    const btnText = uploadBtn.querySelector('.btn__text');
    const btnSpin = uploadBtn.querySelector('.btn__loading');
    uploadBtn.disabled = true;
    btnText.hidden = true; btnSpin.hidden = false;

    const uploaderName = nameInput?.value.trim() || 'Wedding Guest';

    for (const item of pending) {
      item.status = 'uploading';
      setThumbStatus(item.id, 'uploading');
      try {
        const compressed = await compressImage(item.file);
        const dataUrl    = await blobToBase64(compressed);
        const ext        = item.file.name.split('.').pop() || 'jpg';
        const safeName   = uploaderName.replace(/[^a-z0-9]/gi, '_');
        const filename   = `${safeName}_${Date.now()}.${ext}`;

        await fetch(CONFIG.gasUrl, {
          method: 'POST',
          mode:   'no-cors',
          body:   JSON.stringify({
            token:        CONFIG.gasToken,
            type:         'photo',
            filename,
            mimeType:     compressed.type || 'image/jpeg',
            base64:       dataUrl.split(',')[1],
            uploaderName,
          }),
        });
        item.status = 'done';
        setThumbStatus(item.id, 'done');
      } catch {
        item.status = 'error';
        setThumbStatus(item.id, 'error');
      }
    }

    btnText.hidden = false; btnSpin.hidden = true;
    uploadBtn.disabled = false;

    const allDone  = queue.filter(i => ['done','error'].includes(i.status)).length === queue.length;
    const anyError = queue.some(i => i.status === 'error');

    if (!anyError) {
      showToast('photo-toast', 'Your memories have been shared! Thank you for capturing these beautiful moments.', 'success');
      uploadBtn.style.display = 'none';
    } else {
      showToast('photo-toast', 'Some photos could not be uploaded. Please retry or check your connection.', 'error');
    }
  });
}

/* ============================================================
   3D CARD TILT — mouse-driven rotateX/rotateY for cards
   Skipped on touch / mobile / reduced-motion to keep things calm
   ============================================================ */
function init3DTilt() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.matchMedia('(hover: none)').matches)                    return;
  if (window.innerWidth < 900)                                       return;

  const targets = document.querySelectorAll(
    '.couple__frame, .details__card, .hotel__card, .memories__card, .map-frame'
  );
  const MAX = 7; // degrees

  targets.forEach(el => {
    let raf;
    el.addEventListener('mousemove', e => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top)  / rect.height;
        const rotX = (0.5 - y) * MAX;
        const rotY = (x - 0.5) * MAX;
        el.style.transform =
          `perspective(1200px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) translateZ(8px)`;
      });
    });
    el.addEventListener('mouseleave', () => {
      cancelAnimationFrame(raf);
      el.style.transform = '';
    });
  });
}

/* ============================================================
   BACKGROUND MUSIC — YT.Player API (desktop + mobile safe)
   ============================================================ */
(function initMusic() {
  let player      = null;
  let playerReady = false;
  let playing     = false;
  let wantPlay    = false;

  const _prev = window.onYouTubeIframeAPIReady;
  window.onYouTubeIframeAPIReady = function () {
    if (_prev) _prev();
    buildPlayer();
  };

  function buildPlayer() {
    const mount = document.getElementById('yt-player-mount');
    if (!mount || player) return;
    const el = document.createElement('div');
    mount.appendChild(el);
    player = new YT.Player(el, {
      videoId: 'ULmg0qwN9X8',
      width: '1', height: '1',
      playerVars: { autoplay: 0, controls: 0, loop: 1, playlist: 'ULmg0qwN9X8', playsinline: 1, rel: 0 },
      events: {
        onReady(ev) {
          playerReady = true;
          ev.target.playVideo(); // attempt autoplay; blocked on mobile until user gesture
        },
        onStateChange(ev) {
          playing = (ev.data === 1 || ev.data === 3);
          sync();
        },
      },
    });
  }

  function sync() {
    const btn   = document.getElementById('music-btn');
    const badge = document.getElementById('music-badge');
    if (btn) {
      btn.classList.toggle('is-playing', playing);
      btn.setAttribute('aria-label', playing ? 'Pause music' : 'Play music');
    }
    if (badge) {
      badge.style.display = playing ? 'flex' : 'none';
    }
  }

  function setupBtn() {
    const btn = document.getElementById('music-btn');
    if (!btn) return;
    btn.addEventListener('click', () => {
      if (!playerReady) {
        // Player still loading — mark intent; onReady will start it
        wantPlay = true;
        return;
      }
      if (playing) { player.pauseVideo(); }
      else         { player.playVideo();  }
    });
  }

  // Build player immediately if API already loaded, otherwise wait for callback
  if (window.YT && window.YT.Player) buildPlayer();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupBtn);
  } else {
    setupBtn();
  }
}());

/* ============================================================
   COUNTDOWN TIMER
   ============================================================ */
(function initCountdown() {
  const target = new Date('2026-06-27T09:00:00');

  function pad(n) { return String(n).padStart(2, '0'); }

  function tick() {
    const diff = target - Date.now();
    if (diff <= 0) {
      document.getElementById('footer-countdown').innerHTML =
        '<p class="countdown__num" style="font-size:1.4rem">Today is the day! 🌸</p>';
      return;
    }
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    document.getElementById('cd-days').textContent  = pad(d);
    document.getElementById('cd-hours').textContent = pad(h);
    document.getElementById('cd-mins').textContent  = pad(m);
    document.getElementById('cd-secs').textContent  = pad(s);
  }

  tick();
  setInterval(tick, 1000);
}());

/* ============================================================
   BOOT — DOMContentLoaded
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {

  // 1. Three.js particle system
  initThreeJS();

  // 2. GSAP animations
  initGSAP();

  // 4. Maps buttons
  initMapsButtons();

  // 5. Interactive form components
  initAttendanceToggle();
  const { collectGuestNames, resetGuests } = initGuestStepper();
  // initRoomStepper();  // commented out with room request feature

  // 6. Form submit handlers
  const rsvpForm = document.getElementById('rsvp-form');
  if (rsvpForm) {
    rsvpForm.addEventListener('submit', e => handleRSVPSubmit(e, collectGuestNames, resetGuests));
  }

  // const couponForm = document.getElementById('coupon-form');  // commented out with room request feature
  // if (couponForm) { couponForm.addEventListener('submit', handleCouponSubmit); }

  // 7. Photo upload (Share Your Memories)
  initPhotoUpload();

  // 8. 3D card tilt
  init3DTilt();
});
