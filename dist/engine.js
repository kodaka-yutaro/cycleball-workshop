import * as THREE from 'three';
import { OrbitControls } from './OrbitControls.js';
import { SVGRenderer } from './SVGRenderer.js';
import { parts, byId } from './data.js';
const V = a => new THREE.Vector3(...a);
export class Workshop {
  constructor(host, callbacks) {
    this.host = host;
    this.cb = callbacks;
    this.mode = 'fps';
    this.keys = new Set();
    this.groups = {};
    this.base = {};
    this.anchors = {};
    this.normals = {};
    this.sizes = {};
    this.removed = [];
    this.locations = {};
    this.tool = 'hand';
    this.aim = null;
    this.work = null;
    this.carry = null;
    this.tick = 0;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#e9ecdf');
    this.camera = new THREE.PerspectiveCamera(55, 1, .025, 50);
    this.camera.rotation.order = 'YXZ';
    try {
      this.renderer = new THREE.WebGLRenderer({ antialias: true });
      this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.15;
    } catch {
      this.software = true;
      this.renderer = new SVGRenderer();
      this.renderer.setQuality('low');
    }
    this.renderer.domElement.setAttribute('aria-label', 'STAR BICYCLEを参考にした3D自転車');
    host.appendChild(this.renderer.domElement);
    this.orbit = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbit.enabled = false;
    this.orbit.enableDamping = true;
    this.orbit.minDistance = .4;
    this.orbit.maxDistance = 8;
    this.orbit.maxPolarAngle = Math.PI * .495;
    this.orbit.target.set(0, 1.1, 0);
    this.materials = {
      frame: this.mat('#353f3b', .65, .3), chrome: this.mat('#aebbb4', .85, .23),
      rubber: this.mat('#242b28', .05, .82), rim: this.mat('#64706b', .75, .3),
      silver: this.mat('#d1d7d1', .7, .3), accent: this.mat('#df693c', .3, .35),
      glove: this.mat('#56624f', .05, .85), cuff: this.mat('#b9b59e', .1, .8)
    };
    this.buildRoom();
    this.buildBike();
    this.ray = new THREE.Raycaster();
    this.toolGroup = new THREE.Group();
    this.scene.add(this.toolGroup);
    this.setTool('hand');
    this.home();
    this.bindInput();
    this.resize = new ResizeObserver(() => {
      const w = host.clientWidth, h = host.clientHeight;
      this.renderer.setSize(w, h);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    });
    this.resize.observe(host);
    this.last = performance.now();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }
  mat(color, metalness = .3, roughness = .5) { return new THREE.MeshStandardMaterial({ color, metalness, roughness }); }
  mesh(geo, material, position, parent) {
    const obj = new THREE.Mesh(geo, material.clone());
    if (position) obj.position.copy(V(position));
    obj.castShadow = true;
    obj.receiveShadow = true;
    parent.add(obj);
    return obj;
  }
  tube(a, b, radius, material, parent) {
    const dir = V(b).sub(V(a));
    const obj = this.mesh(new THREE.CylinderGeometry(radius, radius, dir.length(), this.software ? 5 : 12), material, V(a).add(V(b)).multiplyScalar(.5).toArray(), parent);
    obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    return obj;
  }
  path(points, radius, material, parent) {
    const curve = new THREE.CatmullRomCurve3(points.map(V));
    return this.mesh(new THREE.TubeGeometry(curve, this.software ? 20 : 48, radius, this.software ? 5 : 10, false), material, null, parent);
  }
  ring(radius, thickness, material, position, parent, arc = Math.PI * 2) {
    return this.mesh(new THREE.TorusGeometry(radius, thickness, this.software ? 5 : 10, this.software ? 40 : 80, arc), material, position, parent);
  }
  group(id) {
    const g = new THREE.Group();
    this.scene.add(g);
    this.groups[id] = g;
    return g;
  }
  buildRoom() {
    const s = this.scene;
    s.add(new THREE.HemisphereLight('#fffef4', '#a4b09a', this.software ? .8 : 2.9));
    const key = new THREE.DirectionalLight('#fff9e4', this.software ? .65 : 4);
    key.position.set(-1, 6, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, { left: -6, right: 6, top: 5, bottom: -5 });
    key.shadow.normalBias = .015;
    s.add(key);
    const light = new THREE.DirectionalLight('#dbe6ee', this.software ? .25 : 1.8);
    light.position.set(4, 3, -3);
    s.add(light);
    const floor = this.mesh(new THREE.PlaneGeometry(24, 24, 24, 24), this.mat('#d7dccb', 0, 1), [0, -.006, 0], s);
    floor.rotation.x = -Math.PI / 2;
    floor.castShadow = false; floor.renderOrder = -100;
    const grid = new THREE.GridHelper(20, 40, '#bdc8b2', '#c7d0bc');
    grid.position.y = -.003;
    grid.renderOrder = -90; s.add(grid);
    const room = new THREE.Group();
    s.add(room);
    const wall = this.mat('#e8eadd', 0, .95);
    if (!this.software) this.mesh(new THREE.BoxGeometry(14, 4, .08), wall, [0, 2, -5], room);
    if (!this.software) this.mesh(new THREE.BoxGeometry(.08, 4, 12), wall, [-6, 2, 0], room);
    const trim = this.mat('#bdc6b0', 0, .8);
    this.mesh(new THREE.BoxGeometry(14, .09, .1), trim, [0, .05, -4.94], room);
    // A low workbench is visible from the bicycle, without hiding its silhouette.
    const wood = this.mat('#a8a78d', 0, .85), legs = this.mat('#6b7960', .45, .5);
    this.mesh(new THREE.BoxGeometry(2.2, .1, .7), wood, [2.9, .92, -2.2], room);
    for (const x of [2, 3.8]) for (const z of [-2.45, -1.95]) this.mesh(new THREE.BoxGeometry(.07, .9, .07), legs, [x, .45, z], room);
    this.mesh(new THREE.BoxGeometry(1.65, .12, .48), this.mat('#d2d8c3', .15, .7), [2.9, 1.02, -2.2], room);
    const mat = this.mesh(new THREE.PlaneGeometry(3.7, 1.35), this.mat('#bdc7ae', 0, 1), [-.05, .002, 0], room);
    mat.rotation.x = -Math.PI / 2;
    mat.castShadow = false; mat.renderOrder = -80;
  }
  buildBike() {
    const { frame, chrome, rubber, rim, silver, accent } = this.materials;
    const f = this.group('frame');
    const rear = -.8, front = .8, hubY = .56;
    const bb = [-.16, .50, 0], seatTop = [-.34, 1.31, 0];
    const topRear = [-.68, 1.29, 0], headTop = [.37, 1.40, 0], headBottom = [.49, 1.14, 0];
    this.tube(topRear, headTop, .034, frame, f);
    this.tube(bb, seatTop, .037, frame, f);
    this.tube(bb, headBottom, .047, frame, f);
    this.tube(headBottom, headTop, .043, frame, f);
    // The short stays join the horizontal top tube behind the seat tube.
    for (const z of [-.085, .085]) {
      this.tube([rear, hubY, z], [-.56, 1.30, z * .3], .026, frame, f);
      this.tube([rear, hubY, z], [bb[0], bb[1], z], .026, frame, f);
      this.tube([.49, 1.16, z], [.8, .56, z], .027, frame, f);
      this.mesh(new THREE.BoxGeometry(.10, .06, .025), chrome, [rear + .015, hubY, z], f);
    }
    this.tube([.37, 1.40, 0], [.32, 1.50, 0], .027, chrome, f);
    this.tube([bb[0], bb[1], -.13], [bb[0], bb[1], .15], .055, chrome, f);
    const chainring = this.ring(.105, .016, frame, [-.16, .5, .139], f);
    for (let i = 0; i < 5; i++) {
      const a = i * Math.PI * .4;
      this.tube([-.16, .50, .139], [-.16 + Math.cos(a) * .096, .50 + Math.sin(a) * .096, .139], .013, chrome, f);
    }
    for (let i = 0; i < 30; i++) {
      const a = i * Math.PI * 2 / 30;
      this.mesh(new THREE.SphereGeometry(.007, 4, 3), chrome, [-.16 + Math.cos(a) * .118, .5 + Math.sin(a) * .118, .139], f);
    }
    this.tube([-.16, .5, .17], [.13, .53, .17], .022, frame, f);
    this.tube([-.16, .5, -.14], [-.45, .47, -.14], .022, frame, f);
    // Small original accents, no manufacturer decals or suggestion of endorsement.
    this.tube([.10, 1.377, .001], [.16, 1.382, .001], .035, accent, f);
    this.tube([.08, .76, .001], [.12, .80, .001], .048, accent, f);
    for (const [x, id] of [[front, 'frontWheel'], [rear, 'rearWheel']]) {
      const g = this.group(id);
      this.ring(.515, .018, rim, [x, hubY, 0], g);
      this.ring(.538, .023, rubber, [x, hubY, 0], g);
      this.ring(.516, .004, silver, [x, hubY, .021], g);
      this.ring(.516, .004, silver, [x, hubY, -.021], g);
      this.tube([x, hubY, -.105], [x, hubY, .105], .042, frame, g);
      for (const z of [-.06, .06]) {
        const flange = this.mesh(new THREE.CylinderGeometry(.06, .06, .012, 16), chrome, [x, hubY, z], g);
        flange.rotation.x = Math.PI / 2;
      }
      for (let i = 0; i < 36; i++) {
        const a = i * Math.PI * 2 / 36, b = a + (i % 2 ? -.23 : .23);
        this.tube([x + Math.cos(a) * .052, hubY + Math.sin(a) * .052, i % 2 ? .06 : -.06], [x + Math.cos(b) * .507, hubY + Math.sin(b) * .507, 0], .0022, chrome, g);
      }
      this.tube([x + .07, 1.03, 0], [x + .075, 1.068, 0], .005, chrome, g);
      if (id === 'rearWheel') this.ring(.053, .012, chrome, [x, hubY, .135], g);
    }
    for (const [x, id] of [[front, 'frontNuts'], [rear, 'rearNuts']]) {
      const g = this.group(id);
      for (const z of [-.14, .14]) {
        const n = this.mesh(new THREE.CylinderGeometry(.033, .033, .032, 6), chrome, [x, hubY, z], g);
        n.rotation.x = Math.PI / 2;
        this.ring(.026, .006, silver, [x, hubY, z - Math.sign(z) * .025], g);
      }
      this.anchors[id] = [x, hubY, .162];
    }
    const ch = this.group('chain');
    const points = [[-.16, .616, .142], [-.8, .621, .142], [-.862, .56, .142], [-.8, .499, .142], [-.16, .384, .142], [-.044, .50, .142], [-.16, .616, .142]];
    const chainCurve = new THREE.CatmullRomCurve3(points.map(V), false, 'centripetal');
    for (let i = 0; i < 74; i++) {
      const a = chainCurve.getPoint(i / 74), b = chainCurve.getPoint((i + .72) / 74);
      this.tube(a.toArray(), b.toArray(), .007, chrome, ch);
    }
    this.anchors.chain = [-.43, .61, .142];
    for (const [id, x, y, z] of [['rightPedal', .13, .53, .25], ['leftPedal', -.45, .47, -.25]]) {
      const g = this.group(id);
      this.tube([x, y, z > 0 ? .16 : -.14], [x, y, z], .013, chrome, g);
      this.mesh(new THREE.BoxGeometry(.12, .05, .16), rubber, [x, y, z], g);
      this.mesh(new THREE.BoxGeometry(.09, .018, .12), rim, [x, y + .027, z], g);
      for (let i = -2; i <= 2; i++) this.mesh(new THREE.BoxGeometry(.008, .009, .16), rubber, [x + i * .022, y + .041, z], g);
      this.anchors[id] = [x, y, z > 0 ? .19 : -.17];
      this.normals[id] = [0, 0, z > 0 ? 1 : -1];
    }
    // Cycle-ball bars: narrow spacing, rearward lower rise, then forward-pointing tips.
    const h = this.group('handlebar');
    this.path([[.32, 1.50, -.205], [.31, 1.475, -.12], [.32, 1.47, 0], [.31, 1.475, .12], [.32, 1.50, .205]], .021, frame, h);
    for (const z of [-.205, .205]) {
      this.path([[.32, 1.50, z], [.29, 1.65, z], [.22, 1.91, z], [.24, 2.01, z], [.43, 2.23, z]], .021, frame, h);
      this.path([[.35, 2.13, z], [.43, 2.23, z], [.46, 2.26, z]], .025, rubber, h);
      this.tube([.28, 1.55, z], [.27, 1.60, z], .022, chrome, h);
    }
    this.anchors.handlebar = [.32, 1.52, .205];
    const bc = this.group('barBolts');
    this.mesh(new THREE.BoxGeometry(.075, .06, .095), chrome, [.32, 1.47, 0], bc);
    const bh = this.mesh(new THREE.CylinderGeometry(.022, .022, .02, 6), frame, [.32, 1.472, .06], bc);
    bh.rotation.x = Math.PI / 2;
    this.anchors.barBolts = [.32, 1.472, .075];
    const saddle = this.group('saddle');
    this.tube([-.61, 1.296, 0], [-1.16, 1.296, 0], .024, frame, saddle);
    this.tube([-1.19, 1.30, -.04], [-.91, 1.30, -.04], .006, chrome, saddle);
    this.tube([-1.19, 1.30, .04], [-.91, 1.30, .04], .006, chrome, saddle);
    const pad = this.mesh(new THREE.SphereGeometry(1, this.software ? 12 : 30, 8), rubber, [-1.12, 1.335, 0], saddle);
    pad.scale.set(.245, .036, .086);
    this.anchors.saddle = [-1.0, 1.31, 0];
    const sc = this.group('seatBolt');
    const collar = this.ring(.03, .008, chrome, [-.68, 1.294, 0], sc);
    collar.rotation.y = Math.PI / 2;
    this.tube([-.68, 1.265, -.04], [-.68, 1.265, .04], .011, chrome, sc);
    this.anchors.seatBolt = [-.68, 1.265, .05];
    for (const p of parts) {
      const g = this.groups[p.id];
      const box = new THREE.Box3().setFromObject(g);
      const center = box.getCenter(new THREE.Vector3());
      this.sizes[p.id] = box.getSize(new THREE.Vector3());
      for (const child of g.children) child.position.sub(center);
      g.position.copy(center);
      this.base[p.id] = center;
      if (!this.anchors[p.id]) this.anchors[p.id] = center.toArray();
      g.traverse(o => { o.userData.part = p.id; });
    }
  }
  setTool(id) {
    this.tool = id;
    if (!this.toolGroup) return;
    while (this.toolGroup.children.length) {
      const child = this.toolGroup.children[0];
      child.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
      this.toolGroup.remove(child);
    }
    const g = this.toolGroup, { chrome, accent, glove, cuff } = this.materials;
    if (id === 'wrench' || id === 'pedal') {
      const r = id === 'pedal' ? .042 : .035;
      const jaw = this.ring(r, .011, chrome, [0, 0, 0], g, Math.PI * 1.48);
      jaw.rotation.z = Math.PI * .75;
      this.tube([0, -.03, 0], [0, -.28, 0], .013, chrome, g);
      this.mesh(new THREE.BoxGeometry(.035, .16, .021), accent, [0, -.25, 0], g);
    } else if (id === 'hex') {
      this.tube([0, 0, .025], [0, 0, .095], .009, chrome, g);
      this.tube([0, 0, .095], [0, -.25, .095], .009, chrome, g);
      this.mesh(new THREE.BoxGeometry(.06, .07, .03), accent, [0, -.19, .095], g);
    }
    const y = id === 'hand' ? -.02 : -.22, z = id === 'hex' ? .095 : 0;
    const palm = this.mesh(new THREE.SphereGeometry(1, 10, 7), glove, [.025, y, z + .035], g);
    palm.scale.set(.045, .065, .035);
    for (let i = 0; i < 4; i++) {
      this.tube([-.022, y + .04 - i * .024, z + .038], [-.037, y + .04 - i * .024, z - .015], .010, glove, g);
      this.tube([-.037, y + .04 - i * .024, z - .015], [-.012, y + .04 - i * .024, z - .024], .009, glove, g);
    }
    this.tube([.045, y + .04, z + .025], [.006, y + .054, z + .002], .013, glove, g);
    this.tube([.025, y - .05, z + .04], [.038, y - .15, z + .07], .035, cuff, g);
  }
  sync(state) {
    this.removed = state.removed;
    this.locations = state.locations || {};
    if (state.tool !== this.tool) this.setTool(state.tool);
  }
  offset(id) {
    return V(this.locations[id] || byId[id].offset);
  }
  point(id) {
    const point = V(this.anchors[id]);
    const moved = this.groups[id].position.clone().sub(this.base[id]);
    if (id.endsWith('Nuts') && this.camera.position.z < 0) point.z = -.162;
    return point.add(moved);
  }
  normal(id) {
    if (this.normals[id]) return V(this.normals[id]);
    if (id.endsWith('Nuts')) return new THREE.Vector3(0, 0, this.camera.position.z < 0 ? -1 : 1);
    return new THREE.Vector3(0, 0, 1);
  }
  home() {
    this.camera.position.set(2.0, 1.60, 3.1);
    this.lookAt(new THREE.Vector3(-.05, 1.05, 0));
    this.orbit.target.set(-.05, 1.05, 0);
  }
  lookAt(p) {
    this.camera.lookAt(p);
    this.pitch = this.camera.rotation.x;
    this.yaw = this.camera.rotation.y;
  }
  focus(id) {
    if (this.work || this.carry) return;
    const p = this.point(id);
    const side = id === 'leftPedal' ? -1 : 1;
    this.camera.position.copy(p).add(new THREE.Vector3(.08, .18, side * 1.0));
    this.camera.position.y = Math.max(.45, this.camera.position.y);
    this.orbit.target.copy(p);
    this.lookAt(p);
    this.updateAim();
  }
  setMode(mode) {
    if (this.work || this.carry) return false;
    this.unlock();
    this.mode = mode;
    this.orbit.enabled = mode === 'orbit';
    this.orbit.enableDamping = mode === 'orbit';
    if (mode === 'orbit') {
      this.orbit.target.set(-.05, 1.1, 0);
      this.camera.position.set(1.8, 1.8, 3.2);
      this.orbit.update();
    } else this.lookAt(this.orbit.target);
    this.cb.mode?.(mode);
    return true;
  }
  async lock() {
    if (this.mode !== 'fps') this.setMode('fps');
    try {
      if (!this.host.requestPointerLock) throw new Error('unavailable');
      await this.host.requestPointerLock();
    } catch { this.cb.message('この環境ではドラッグで視点を操作できます。WASDで移動できます。'); }
    this.host.focus();
  }
  unlock() { if (document.pointerLockElement === this.host) document.exitPointerLock(); }
  isLocked() { return document.pointerLockElement === this.host; }
  crouch() { this.crouched = !this.crouched; return this.crouched; }
  bindInput() {
    const el = this.renderer.domElement;
    let pointer = null;
    el.addEventListener('pointerdown', e => {
      if (this.mode !== 'fps') return;
      this.host.focus({ preventScroll: true });
      if (e.button === 0 && this.work) { this.cb.hold(true); return; }
      pointer = { x: e.clientX, y: e.clientY, moved: false };
      if (!this.isLocked()) el.setPointerCapture?.(e.pointerId);
    });
    const move = e => {
      if (this.mode !== 'fps' || this.work || document.querySelector('dialog[open]')) return;
      if (!this.isLocked() && !pointer) return;
      const dx = this.isLocked() ? e.movementX : e.clientX - pointer.x;
      const dy = this.isLocked() ? e.movementY : e.clientY - pointer.y;
      this.yaw -= dx * .003;
      this.pitch = THREE.MathUtils.clamp(this.pitch - dy * .003, -1.35, 1.35);
      this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
      if (pointer) { pointer.x = e.clientX; pointer.y = e.clientY; pointer.moved ||= Math.abs(dx) + Math.abs(dy) > 2; }
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', () => { pointer = null; this.cb.hold(false); });
    document.addEventListener('pointercancel', () => { pointer = null; this.cb.hold(false); });
    el.addEventListener('contextmenu', e => e.preventDefault());
    this.host.addEventListener('wheel', e => {
      if (this.mode !== 'fps' || this.work) return;
      e.preventDefault();
      const f = this.camera.getWorldDirection(new THREE.Vector3());
      const proposed = this.camera.position.clone().addScaledVector(f, e.deltaY < 0 ? .12 : -.12);
      this.moveTo(proposed);
    }, { passive: false });
    document.addEventListener('keydown', e => {
      if (/INPUT|SELECT|TEXTAREA/.test(e.target.tagName) || document.querySelector('dialog[open]')) return;
      if (['KeyW','KeyA','KeyS','KeyD','ShiftLeft','ShiftRight','Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) {
        e.preventDefault(); this.keys.add(e.code);
        if (e.code === 'Space' && this.work) this.cb.hold(true);
      }
      if (e.repeat) return;
      if (e.code === 'KeyE') this.cb.interact();
      if (e.code === 'KeyR') this.cb.reverse();
      if (e.code === 'KeyG') this.cb.grab();
      if (e.code === 'KeyC' && !this.work) this.cb.crouch();
      if (e.code === 'Escape') { this.cb.cancel(); this.keys.clear(); }
      if (/Digit[1-4]/.test(e.code)) this.cb.selectTool(Number(e.code.at(-1)) - 1);
    });
    document.addEventListener('keyup', e => {
      this.keys.delete(e.code);
      if (e.code === 'Space') this.cb.hold(false);
    });
    document.addEventListener('pointerlockchange', () => {
      document.body.classList.toggle('locked', this.isLocked());
      if (!this.isLocked()) { this.keys.clear(); this.cb.hold(false); }
      this.cb.lockChanged?.(this.isLocked());
    });
    window.addEventListener('blur', () => { this.keys.clear(); this.cb.hold(false); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) { this.keys.clear(); this.cb.hold(false); } });
    el.addEventListener('click', e => {
      if (this.mode !== 'orbit') return;
      const rect = el.getBoundingClientRect();
      this.ray.setFromCamera(new THREE.Vector2((e.clientX - rect.left) / rect.width * 2 - 1, -(e.clientY - rect.top) / rect.height * 2 + 1), this.camera);
      const hit = this.ray.intersectObjects(parts.map(p => this.groups[p.id]), true)[0];
      if (hit) this.cb.inspect?.(hit.object.userData.part);
    });
  }
  moveTo(pos) {
    pos.x = THREE.MathUtils.clamp(pos.x, -4.5, 4.8);
    pos.z = THREE.MathUtils.clamp(pos.z, -4.2, 4.5);
    pos.y = THREE.MathUtils.clamp(pos.y, .35, 2.5);
    // A small collision volume prevents walking through the assembled bicycle.
    if (pos.x > -1.5 && pos.x < 1.4 && Math.abs(pos.z) < .36) return;
    this.camera.position.copy(pos);
  }
  updateAim() {
    if (this.work || this.carry || this.mode !== 'fps') return;
    this.scene.updateMatrixWorld(true);
    this.camera.updateMatrixWorld(true);
    this.ray.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const hits = this.ray.intersectObjects(parts.map(p => this.groups[p.id]), true);
    let chosen = hits[0] ? { id: hits[0].object.userData.part, distance: hits[0].distance } : null;
    // Small fasteners have forgiving, visible-in-context target areas.
    for (const p of parts) {
      if (p.tool === 'hand') continue;
      const point = this.point(p.id);
      const radius = p.id.endsWith('Nuts') ? .055 : .043;
      const hit = this.ray.ray.intersectSphere(new THREE.Sphere(point, radius), new THREE.Vector3());
      if (!hit) continue;
      const distance = this.camera.position.distanceTo(hit);
      const visibleSide = p.id !== 'leftPedal' || this.camera.position.z < .05;
      if (visibleSide && (!chosen || distance < chosen.distance + .07)) chosen = { id: p.id, distance };
    }
    if (chosen && chosen.distance > 5) chosen = null;
    this.aim = chosen;
    this.cb.aim(chosen);
  }
  engage(id) {
    const point = this.point(id), normal = this.normal(id);
    this.work = { id, point, normal, progress: 0, active: false, angle: 0, direction: 'ccw', time: 0 };
    this.keys.clear();
    this.lookAt(point);
  }
  setWork(progress, active, direction) {
    if (!this.work) return;
    this.work.progress = progress;
    this.work.active = active;
    this.work.direction = direction;
  }
  disengage() {
    if (this.work) this.groups[this.work.id].quaternion.identity();
    this.work = null;
  }
  grab(id) { this.carry = id; this.work = null; }
  drop() {
    if (!this.carry) return null;
    const id = this.carry, g = this.groups[id];
    const forward = this.camera.getWorldDirection(new THREE.Vector3());
    forward.y = 0; forward.normalize();
    const pos = this.camera.position.clone().addScaledVector(forward, .80);
    pos.y = this.sizes[id].y / 2 + .03;
    g.position.copy(pos);
    g.quaternion.identity();
    this.carry = null;
    return { id, offset: pos.sub(this.base[id]).toArray() };
  }
  highlight(id) {
    if (this.lastHighlight === id) return;
    this.lastHighlight = id;
    for (const p of parts) this.groups[p.id].traverse(o => {
      if (o.isMesh) { o.material.emissive.set(p.id === id ? '#cc692f' : '#000000'); o.material.emissiveIntensity = p.id === id ? .2 : 0; }
    });
  }
  animate(now) {
    requestAnimationFrame(this.animate);
    const dt = Math.min((now - this.last) / 1000, .05);
    this.last = now;
    this.tick += dt;
    if (document.hidden) return;
    this.cb.tick(dt);
    if (this.mode === 'orbit') this.orbit.update();
    else if (!this.work && !document.querySelector('dialog[open]')) {
      const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
      const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
      const move = new THREE.Vector3();
      if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) move.add(forward);
      if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) move.sub(forward);
      if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) move.add(right);
      if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) move.sub(right);
      if (move.lengthSq()) {
        move.normalize().multiplyScalar(dt * (this.keys.has('ShiftLeft') ? 2 : 1));
        this.moveTo(this.camera.position.clone().add(move));
      }
      if (this.crouchMoving) {
        const goal = this.crouched ? .72 : 1.6;
        this.camera.position.y += (goal - this.camera.position.y) * Math.min(1, dt * 10);
        if (Math.abs(goal - this.camera.position.y) < .01) this.crouchMoving = false;
      }
    }
    for (const p of parts) {
      if (this.carry === p.id) {
        const dest = new THREE.Vector3(0, -.13, -.80).applyQuaternion(this.camera.quaternion).add(this.camera.position);
        this.groups[p.id].position.lerp(dest, Math.min(1, dt * 12));
      } else {
        const target = this.base[p.id].clone();
        if (this.removed.includes(p.id)) target.add(this.offset(p.id));
        this.groups[p.id].position.lerp(target, Math.min(1, dt * 8));
      }
    }
    const handRest = new THREE.Vector3(.28, -.23, -.59).applyQuaternion(this.camera.quaternion).add(this.camera.position);
    this.toolGroup.visible = this.mode === 'fps' && !this.carry;
    if (this.work) {
      const w = this.work;
      if (w.active) w.time += dt;
      const stroke = (w.time % .70) / .70;
      const swing = Math.sin(stroke * Math.PI) * .95;
      const sign = w.direction === 'ccw' ? 1 : -1;
      const offset = w.normal.clone().multiplyScalar(.025);
      if (this.tool === 'hand') offset.addScaledVector(w.normal, w.progress * .13);
      this.toolGroup.position.lerp(w.point.clone().add(offset), Math.min(1, dt * 12));
      const rotation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), w.normal);
      rotation.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), this.tool === 'hand' ? 0 : sign * swing));
      this.toolGroup.quaternion.slerp(rotation, Math.min(1, dt * 15));
      if (this.tool !== 'hand') this.groups[w.id].quaternion.setFromAxisAngle(w.normal, w.progress * Math.PI * 4 * sign);
    } else {
      this.toolGroup.position.lerp(handRest, Math.min(1, dt * 12));
      const rotation = this.camera.quaternion.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -.36));
      this.toolGroup.quaternion.slerp(rotation, Math.min(1, dt * 12));
    }
    // SVG is a genuine software 3D fallback, capped to avoid unnecessary CPU work.
    const interval = this.software ? 1 / 24 : 0;
    if (!this.drawAt || this.tick - this.drawAt >= interval) {
      this.updateAim();
      this.highlight(this.work?.id || this.carry || this.aim?.id);
      this.renderer.render(this.scene, this.camera);
      this.drawAt = this.tick;
    }
  }
}
