"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { CSS3DObject, CSS3DRenderer } from "three/examples/jsm/renderers/CSS3DRenderer.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { advanceToward, clampArenaTarget, createPerimeterLights, createSeatLayout, entranceLayout, getCameraView, getNpcMotion, getSeatedCharacterRotation } from "../lib/arena-layout.mjs";
import { featuredPost, instagramEmbedUrl } from "../lib/featured-post.mjs";

const LIME = 0xb9ff38;
const NAVY = 0x19305f;
const modelPaths = ["a", "c", "f", "j", "n", "r"].map((id) => `/models/kenney/character-${id}.glb`);

function textTexture(lines: string[], accent = "#b9ff38") {
  const canvas = document.createElement("canvas");
  canvas.width = 1024; canvas.height = 640;
  const ctx = canvas.getContext("2d")!;
  const bg = ctx.createLinearGradient(0, 0, 1024, 640);
  bg.addColorStop(0, "#111d3c"); bg.addColorStop(1, "#070b15");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, 1024, 640);
  ctx.strokeStyle = "rgba(185,255,56,.25)"; ctx.lineWidth = 4; ctx.strokeRect(22, 22, 980, 596);
  ctx.fillStyle = "#ffffff"; ctx.font = "800 54px Arial"; ctx.fillText(lines[0], 70, 90);
  ctx.fillStyle = accent; ctx.font = "900 92px Arial"; ctx.fillText(lines[1], 70, 210);
  ctx.fillStyle = "#ffffff"; ctx.font = "700 52px Arial"; ctx.fillText(lines[2], 70, 310);
  ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.font = "500 32px Arial"; ctx.fillText(lines[3], 70, 530);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function rankingPosterTexture(rank: string, username: string, bid: string, accent: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 600; canvas.height = 1000;
  const ctx = canvas.getContext("2d")!;
  const bg = ctx.createLinearGradient(0, 0, 600, 1000);
  bg.addColorStop(0, "#182d62"); bg.addColorStop(1, "#080c19");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, 600, 1000);
  ctx.strokeStyle = accent; ctx.lineWidth = 12; ctx.strokeRect(18, 18, 564, 964);
  ctx.textAlign = "center";
  ctx.fillStyle = accent; ctx.font = "900 210px Arial"; ctx.fillText(rank, 300, 260);
  ctx.fillStyle = "#ffffff"; ctx.font = "900 58px Arial"; ctx.fillText(username, 300, 390, 540);
  ctx.fillStyle = "rgba(255,255,255,.58)"; ctx.font = "800 34px Arial"; ctx.fillText("LANCE ATUAL", 300, 660);
  ctx.fillStyle = "#ffffff"; ctx.font = "900 82px Arial"; ctx.fillText(bid, 300, 760);
  ctx.fillStyle = accent; ctx.fillRect(190, 850, 220, 14);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function makeLabel(text: string) {
  const canvas = document.createElement("canvas"); canvas.width = 420; canvas.height = 96;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "rgba(5,9,18,.86)"; ctx.roundRect(4,4,412,88,24); ctx.fill();
  ctx.strokeStyle = "rgba(185,255,56,.65)"; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = "white"; ctx.font = "700 34px Arial"; ctx.textAlign = "center"; ctx.fillText(text, 210, 61);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthTest: false }));
  sprite.scale.set(2.7, .62, 1); return sprite;
}

function makeInstagramScreen(countdown: string) {
  const panel = document.createElement("div");
  panel.className = "instagram-screen";
  if (!featuredPost.embedAvailable) {
    const fallback = document.createElement("a");
    fallback.className = "instagram-fallback";
    fallback.href = featuredPost.url;
    fallback.target = "_blank";
    fallback.rel = "noreferrer";
    const badge = document.createElement("span"); badge.textContent = "INSTAGRAM REEL";
    const handle = document.createElement("strong"); handle.textContent = featuredPost.username;
    const note = document.createElement("small"); note.textContent = "Conteúdo restrito • abrir no Instagram ↗";
    fallback.append(badge, handle, note); panel.appendChild(fallback);
    return new CSS3DObject(panel);
  }
  const header = document.createElement("div"); header.className = "screen-header"; header.innerHTML = `<b>DESTAQUE ATUAL</b><span>• ${featuredPost.username}</span>`;
  const left = document.createElement("div"); left.className = "screen-side screen-left"; left.innerHTML = `<small>LANCE ATUAL</small><strong>R$ 1.780</strong><p>IDEIAS GANHAM<br/>MAIS VISTA</p>`;
  const right = document.createElement("div"); right.className = "screen-side screen-right"; right.innerHTML = `<strong>${countdown}</strong><p>MARCAS QUE CHEGAM<br/>MAIS LONGE</p>`;
  const iframe = document.createElement("iframe");
  iframe.src = instagramEmbedUrl(featuredPost.shortcode);
  iframe.title = `Reel em primeiro lugar de ${featuredPost.username}`;
  iframe.loading = "eager";
  iframe.allow = "encrypted-media; fullscreen; picture-in-picture";
  iframe.setAttribute("scrolling", "no");
  panel.append(header, left, iframe, right);
  return new CSS3DObject(panel);
}

export default function Arena3D({ countdown, playerNickname, onboarding, onQuickMessage, onNicknameRequest, onPlayerLocated }: { countdown: string; playerNickname: string; onboarding: boolean; onQuickMessage: (text: string) => void; onNicknameRequest: () => void; onPlayerLocated: () => void }) {
  const host = useRef<HTMLDivElement>(null);
  const screenMaterials = useRef<THREE.MeshStandardMaterial[]>([]);
  const playerRef = useRef<THREE.Object3D | null>(null);

  useEffect(() => {
    if (!host.current) return;
    const container = host.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x03050b);
    scene.fog = new THREE.FogExp2(0x03050b, .018);
    const aspect = container.clientWidth / container.clientHeight;
    const initialView = getCameraView(aspect);
    const camera = new THREE.PerspectiveCamera(initialView.fov, aspect, .1, 220);
    camera.position.set(initialView.x, initialView.y, initialView.z);
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 700 ? 1.1 : 1.35));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.65;
    container.appendChild(renderer.domElement);
    const cssRenderer = new CSS3DRenderer();
    cssRenderer.setSize(container.clientWidth, container.clientHeight);
    cssRenderer.domElement.className = "css3d-layer";
    container.appendChild(cssRenderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 2, 0); controls.enablePan = false; controls.enableDamping = true;
    controls.minDistance = 27; controls.maxDistance = 62; controls.minPolarAngle = .48; controls.maxPolarAngle = 1.25;

    scene.add(new THREE.HemisphereLight(0x8ca2ff, 0x070912, 4.2));
    const key = new THREE.DirectionalLight(0xffe2b9, 6.4); key.position.set(4, 18, 10); key.castShadow = true; scene.add(key);
    const limeLight = new THREE.PointLight(LIME, 45, 30); limeLight.position.set(0, 4, 0); scene.add(limeLight);
    const warmKey = new THREE.SpotLight(0xffd9a3, 180, 52, .5, .68, 1.4); warmKey.position.set(-9, 18, 15); warmKey.target.position.set(0, 1.5, 2); scene.add(warmKey, warmKey.target);
    const coolKey = new THREE.SpotLight(0x8095ff, 135, 58, .52, .7, 1.4); coolKey.position.set(12, 16, -12); coolKey.target.position.set(0, 2, 0); scene.add(coolKey, coolKey.target);

    const platform = new THREE.Mesh(new THREE.CylinderGeometry(18, 18.8, 1.4, 96), new THREE.MeshStandardMaterial({ color: 0x080d18, metalness: .45, roughness: .55 }));
    platform.position.y = -.75; platform.receiveShadow = true; scene.add(platform);
    const underside = new THREE.Mesh(new THREE.CylinderGeometry(18.75, 14.2, 4.2, 96), new THREE.MeshStandardMaterial({ color: 0x050913, metalness: .5, roughness: .7 }));
    underside.position.y = -3.2; underside.castShadow = true; scene.add(underside);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(18.1, .12, 10, 128), new THREE.MeshBasicMaterial({ color: LIME })); rim.rotation.x = Math.PI / 2; rim.position.y = .03; scene.add(rim);

    const floor = new THREE.GridHelper(130, 80, 0x17213a, 0x0b1324); floor.position.y = -1.48; scene.add(floor);

    const reflectionCanvas = document.createElement("canvas"); reflectionCanvas.width = 512; reflectionCanvas.height = 512;
    const reflectionCtx = reflectionCanvas.getContext("2d")!;
    const reflectionGradient = reflectionCtx.createRadialGradient(256, 210, 12, 256, 256, 250);
    reflectionGradient.addColorStop(0, "rgba(84,115,255,.58)"); reflectionGradient.addColorStop(.22, "rgba(62,88,210,.3)"); reflectionGradient.addColorStop(.54, "rgba(185,255,56,.12)"); reflectionGradient.addColorStop(1, "rgba(0,0,0,0)");
    reflectionCtx.fillStyle = reflectionGradient; reflectionCtx.fillRect(0, 0, 512, 512);
    const reflection = new THREE.Mesh(new THREE.PlaneGeometry(15, 17), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(reflectionCanvas), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    reflection.rotation.x = -Math.PI / 2; reflection.position.set(0, .075, 1.4); scene.add(reflection);

    const terraceMat = new THREE.MeshStandardMaterial({ color: 0x142852, metalness: .32, roughness: .52 });
    [9.6, 12.05, 14.5, 16.95].forEach((radius, row) => {
      const terrace = new THREE.Mesh(new THREE.RingGeometry(radius - 1.12, radius + 1.12, 96), terraceMat);
      terrace.rotation.x = -Math.PI / 2; terrace.position.y = row * .58 - .38; terrace.receiveShadow = true; scene.add(terrace);
      const edge = new THREE.Mesh(new THREE.TorusGeometry(radius + 1.08, .055, 6, 96), new THREE.MeshBasicMaterial({ color: row % 2 ? 0x52679d : 0x283b68 }));
      edge.rotation.x = Math.PI / 2; edge.position.y = row * .58 - .1; scene.add(edge);
    });

    const wallMat = new THREE.MeshStandardMaterial({ color: 0x152a55, metalness: .48, roughness: .42 });
    const wallGlow = new THREE.MeshStandardMaterial({ color: 0xffdfa0, emissive: 0xffa62f, emissiveIntensity: 3.1 });
    createPerimeterLights().forEach(({ angle, x, z }, index) => {
      const panel = new THREE.Group(); panel.position.set(x, .62, z); panel.rotation.y = angle;
      const wall = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.5, .5), wallMat); wall.castShadow = true;
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(.28, .28, .08), wallGlow); lamp.position.set(0, .08, -.3);
      panel.add(wall, lamp); scene.add(panel);
      if (index % 4 === 0) { const light = new THREE.PointLight(0xffc86b, 7, 4.5); light.position.set(x, 1.25, z); scene.add(light); }
    });

    for (const x of [-2.05, 2.05]) {
      for (let z = 7; z <= 20; z += 1.55) {
        const stepLight = new THREE.Mesh(new THREE.BoxGeometry(.16, .06, .72), wallGlow); stepLight.position.set(x, .11, z); scene.add(stepLight);
      }
    }

    const starsGeo = new THREE.BufferGeometry();
    const stars = new Float32Array(210 * 3);
    for (let i = 0; i < 210; i++) { const radius = 28 + Math.random() * 70; const angle = Math.random() * Math.PI * 2; stars[i * 3] = Math.sin(angle) * radius; stars[i * 3 + 1] = -8 + Math.random() * 34; stars[i * 3 + 2] = Math.cos(angle) * radius; }
    starsGeo.setAttribute("position", new THREE.BufferAttribute(stars, 3));
    scene.add(new THREE.Points(starsGeo, new THREE.PointsMaterial({ color: 0x91a5ff, size: .14, transparent: true, opacity: .62 })));
    const moleculeMat = new THREE.MeshBasicMaterial({ color: 0x596fcb, transparent: true, opacity: .25, wireframe: true });
    [[-26,12,-18],[28,8,-28],[-32,3,8],[24,17,12],[3,20,-35]].forEach(([x,y,z], index) => {
      const molecule = new THREE.Mesh(new THREE.IcosahedronGeometry(1.2 + index * .13, 1), moleculeMat); molecule.position.set(x,y,z); molecule.rotation.set(index, index * .7, 0); scene.add(molecule);
    });

    const entrance = new THREE.Group(); entrance.position.z = entranceLayout.z;
    const entranceMat = new THREE.MeshStandardMaterial({ color: 0x0d1831, metalness: .55, roughness: .38 });
    const glowMat = new THREE.MeshStandardMaterial({ color: 0xffd276, emissive: 0xffaa33, emissiveIntensity: 2.7 });
    const walkway = new THREE.Mesh(new THREE.BoxGeometry(5.4, .42, 6.3), entranceMat); walkway.position.set(0, -.02, 1.7); walkway.castShadow = true; entrance.add(walkway);
    [entranceLayout.leftX, entranceLayout.rightX].forEach((x) => {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(.78, 3.8, 1.15), entranceMat); pillar.position.set(x, 1.7, 0); pillar.castShadow = true; entrance.add(pillar);
      const strip = new THREE.Mesh(new THREE.BoxGeometry(.12, 3.25, 1.2), glowMat); strip.position.set(x > 0 ? x - .46 : x + .46, 1.7, 0); entrance.add(strip);
      const lamp = new THREE.PointLight(0xffc66d, 18, 8); lamp.position.set(x, 2.3, .5); entrance.add(lamp);
    });
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(5.7, .72, 1.2), entranceMat); lintel.position.set(0, 3.5, 0); lintel.castShadow = true; entrance.add(lintel);
    const sign = makeLabel("ENTRADA • AO VIVO"); sign.position.set(0, 3.52, .66); sign.scale.set(3.5, .72, 1); entrance.add(sign);
    scene.add(entrance);

    const seatMat = new THREE.MeshStandardMaterial({ color: NAVY, roughness: .62, metalness: .18 });
    const seatGeo = new THREE.BoxGeometry(1.05, .68, .9); const backGeo = new THREE.BoxGeometry(1.05, 1.25, .28);
    const seatPlacements: Array<{ position: THREE.Vector3; rotationY: number }> = [];
    const seatMeshes: THREE.Mesh[] = [];
    for (const placement of createSeatLayout()) {
        const { x, y, z, rotationY } = placement;
        const group = new THREE.Group(); group.position.set(x, y, z); group.rotation.y = rotationY;
        const seat = new THREE.Mesh(seatGeo, seatMat); seat.position.z = .15; seat.castShadow = true;
        const back = new THREE.Mesh(backGeo, seatMat); back.position.set(0, .75, .5); back.rotation.x = -.08; back.castShadow = true;
        const seatTarget = { x, y: y + .15, z, rotationY };
        seat.userData.seatTarget = seatTarget; back.userData.seatTarget = seatTarget;
        seatMeshes.push(seat, back);
        group.add(seat, back); scene.add(group); seatPlacements.push({ position: new THREE.Vector3(x, y + .12, z), rotationY });
    }

    const floorPicker = new THREE.Mesh(
      new THREE.CircleGeometry(16.6, 96),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
    );
    floorPicker.rotation.x = -Math.PI / 2; floorPicker.position.y = .06; floorPicker.userData.walkable = true; scene.add(floorPicker);

    const screenGroup = new THREE.Group(); screenGroup.position.y = 4.3;
    const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x020306, metalness: .7, roughness: .28 });
    const frame = new THREE.Mesh(new THREE.BoxGeometry(10.35, 7.05, .95), frameMaterial); frame.castShadow = true; screenGroup.add(frame);
    for (const x of [-5.22, 5.22]) {
      const sideCover = new THREE.Mesh(new THREE.BoxGeometry(.55, 7.15, 1.12), frameMaterial);
      sideCover.position.x = x; sideCover.castShadow = true; screenGroup.add(sideCover);
    }
    const texture = textTexture(["1º LUGAR • REEL", "R$ 1.780", featuredPost.username, `Instagram • ${featuredPost.shortcode}`]);
    const mat = new THREE.MeshStandardMaterial({ map: texture, emissive: 0x27334d, emissiveIntensity: .55, side: THREE.FrontSide });
    const backMat = mat.clone();
    screenMaterials.current = [mat, backMat];
    const front = new THREE.Mesh(new THREE.PlaneGeometry(9.2, 6.1), mat); front.position.z = .34; screenGroup.add(front);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(9.2, 6.1), backMat); back.position.z = -.34; back.rotation.y = Math.PI; screenGroup.add(back);
    const frontEmbed = makeInstagramScreen(countdown); frontEmbed.position.z = .37; frontEmbed.scale.setScalar(.01); screenGroup.add(frontEmbed);
    const backEmbed = makeInstagramScreen(countdown); backEmbed.position.z = -.37; backEmbed.rotation.y = Math.PI; backEmbed.scale.setScalar(.01); screenGroup.add(backEmbed);
    scene.add(screenGroup);

    const trussMat = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: .9, roughness: .24 });
    const addTruss = (x: number, y: number, length: number, horizontal = false) => {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(.11, .11, length, 8), trussMat);
      bar.position.set(x, y, -.5); if (horizontal) bar.rotation.z = Math.PI / 2; bar.castShadow = true; scene.add(bar);
    };
    addTruss(-5.35, 4.25, 9.2); addTruss(5.35, 4.25, 9.2); addTruss(0, 8.75, 10.7, true);
    [-3.6, -1.2, 1.2, 3.6].forEach((x) => {
      const lamp = new THREE.SpotLight(0xffdb9b, 36, 18, .34, .72, 1.3); lamp.position.set(x, 8.35, 1.1); lamp.target.position.set(x * .35, 1.8, 0); scene.add(lamp, lamp.target);
      const casing = new THREE.Mesh(new THREE.BoxGeometry(.42, .28, .5), trussMat); casing.position.set(x, 8.45, .2); scene.add(casing);
    });

    const rankingPosters = [
      { side: -1, rank: "#2", username: "@cafecentral", bid: "R$ 1.650", accent: "#b892ff" },
      { side: 1, rank: "#3", username: "@academiaflow", bid: "R$ 1.520", accent: "#ff7ce5" },
    ];
    rankingPosters.forEach(({ side, rank, username, bid, accent }) => {
      const poster = new THREE.Group();
      poster.position.set(side * 7.2, 3.1, .15); poster.rotation.y = side * -.14;
      const frame = new THREE.Mesh(new THREE.BoxGeometry(3.45, 5.25, .34), new THREE.MeshStandardMaterial({ color: 0x070a12, metalness: .75, roughness: .3 }));
      const face = new THREE.Mesh(new THREE.PlaneGeometry(3.15, 4.95), new THREE.MeshBasicMaterial({ map: rankingPosterTexture(rank, username, bid, accent) }));
      face.position.z = .18; poster.add(frame, face); scene.add(poster);
    });

    const animatedPeople: Array<{ object: THREE.Object3D; baseY: number; phase: number; kind: "walking" | "seated" }> = [];
    const mixers: THREE.AnimationMixer[] = [];
    const playerState = { target: new THREE.Vector3(0, .1, 15.2), sitting: false, targetRotation: Math.PI };
    let playerHalo: THREE.Mesh | null = null;
    let playerActionMenu: CSS3DObject | null = null;
    const loader = new GLTFLoader();
    Promise.all(modelPaths.map((path) => loader.loadAsync(path))).then((models) => {
      const occupied = seatPlacements.filter((_, i) => i % 2 === 0 || i % 5 === 0).slice(0, 72);
      occupied.forEach(({ position, rotationY }, index) => {
        const source = models[index % models.length];
        const person = clone(source.scene);
        person.scale.setScalar(.62); person.position.copy(position); person.rotation.y = getSeatedCharacterRotation(rotationY);
        person.traverse((o) => { if ((o as THREE.Mesh).isMesh) { (o as THREE.Mesh).castShadow = index % 5 === 0; } });
        const mixer = new THREE.AnimationMixer(person);
        const sitClip = THREE.AnimationClip.findByName(source.animations, "sit");
        if (sitClip) {
          const sitAction = mixer.clipAction(sitClip);
          sitAction.setLoop(THREE.LoopOnce, 1);
          sitAction.clampWhenFinished = true;
          sitAction.play();
          mixer.update(sitClip.duration + .01);
        }
        scene.add(person); animatedPeople.push({ object: person, baseY: person.position.y, phase: index * .47, kind: "seated" });
        if ([4, 19, 41].includes(index)) { const label = makeLabel(["@cafecentral", "@academiaflow", "@lojavertice"][[4,19,41].indexOf(index)]); label.position.copy(position).add(new THREE.Vector3(0, 2.2, 0)); scene.add(label); }
      });

      for (let index = 0; index < 5; index += 1) {
        const source = models[(index + 2) % models.length];
        const person = clone(source.scene);
        person.scale.setScalar(.62);
        person.traverse((o) => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).castShadow = true; });
        const mixer = new THREE.AnimationMixer(person);
        const walkClip = THREE.AnimationClip.findByName(source.animations, "walk");
        if (walkClip) mixer.clipAction(walkClip).play();
        mixers.push(mixer);
        scene.add(person);
        animatedPeople.push({ object: person, baseY: .1, phase: index * 1.3, kind: "walking" });
      }

      const playerSource = models[5];
      const player = clone(playerSource.scene);
      player.scale.setScalar(.66); player.position.set(0, .1, 15.2); player.rotation.y = Math.PI;
      player.traverse((o) => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).castShadow = true; });
      const playerLabel = makeLabel(onboarding ? "Digite e escolha um apelido" : playerNickname); playerLabel.scale.set(onboarding ? 5.6 : 3.4, .8, 1);
      player.add(playerLabel); playerLabel.position.y = 2.75;
      scene.add(player); playerRef.current = player;
      const playerMixer = new THREE.AnimationMixer(player);
      const idleClip = THREE.AnimationClip.findByName(playerSource.animations, "idle");
      const playerClips = new Map(playerSource.animations.map((clip) => [clip.name.toLowerCase(), clip]));
      let currentPlayerAction: THREE.AnimationAction | null = null;
      const playPlayerAction = (name: string) => {
        const sourceName = name === "dance" ? "emote-yes" : name === "wave" ? "interact-right" : name;
        const clip = playerClips.get(sourceName) ?? playerClips.get("idle");
        if (!clip) return;
        currentPlayerAction?.fadeOut(.12);
        const action = playerMixer.clipAction(clip); action.reset(); action.enabled = true;
        if (name !== "idle") { action.setLoop(THREE.LoopRepeat, name === "wave" ? 2 : 3); action.clampWhenFinished = true; }
        action.fadeIn(.12).play(); currentPlayerAction = action;
      };
      if (idleClip) playPlayerAction("idle");
      playerMixer.addEventListener("finished", () => playPlayerAction("idle"));
      mixers.push(playerMixer);
      playerHalo = new THREE.Mesh(new THREE.RingGeometry(.58, .78, 32), new THREE.MeshBasicMaterial({ color: LIME, transparent: true, opacity: .85, side: THREE.DoubleSide }));
      playerHalo.rotation.x = -Math.PI / 2; playerHalo.position.set(player.position.x, .08, player.position.z); scene.add(playerHalo);
      playerHalo.visible = onboarding;

      const menuElement = document.createElement("div"); menuElement.className = "avatar-actions";
      const danceButton = document.createElement("button"); danceButton.type = "button"; danceButton.textContent = "Dançar";
      const waveButton = document.createElement("button"); waveButton.type = "button"; waveButton.textContent = "Dar oi";
      danceButton.addEventListener("click", (event) => { event.stopPropagation(); playPlayerAction("dance"); });
      waveButton.addEventListener("click", (event) => { event.stopPropagation(); playPlayerAction("wave"); onQuickMessage("Oi!"); });
      menuElement.append(danceButton, waveButton);
      playerActionMenu = new CSS3DObject(menuElement); playerActionMenu.scale.setScalar(.01); playerActionMenu.visible = false; scene.add(playerActionMenu);
    }).catch(() => undefined);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerStart = { x: 0, y: 0 };
    const onPointerDown = (event: PointerEvent) => { pointerStart = { x: event.clientX, y: event.clientY }; };
    const onPointerUp = (event: PointerEvent) => {
      if (!playerRef.current || Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 7) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const clickedPlayer = playerRef.current && raycaster.intersectObject(playerRef.current, true).length > 0;
      if (clickedPlayer && onboarding) { onNicknameRequest(); return; }
      if (clickedPlayer && playerActionMenu) { playerActionMenu.visible = !playerActionMenu.visible; return; }
      if (playerActionMenu) playerActionMenu.visible = false;
      const hit = raycaster.intersectObjects([...seatMeshes, floorPicker], false)[0];
      if (!hit) return;
      const seatTarget = hit.object.userData.seatTarget as { x: number; y: number; z: number; rotationY: number } | undefined;
      if (seatTarget) {
        playerState.target.set(seatTarget.x, seatTarget.y, seatTarget.z);
        playerState.targetRotation = getSeatedCharacterRotation(seatTarget.rotationY);
        playerState.sitting = true;
      } else {
        const target = clampArenaTarget({ x: hit.point.x, z: hit.point.z }, 16.3);
        playerState.target.set(target.x, .1, target.z); playerState.sitting = false;
      }
      onPlayerLocated();
    };
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointerup", onPointerUp);

    let frameId = 0;
    const clock = new THREE.Clock();
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), .05); const t = clock.elapsedTime;
      mixers.forEach((mixer) => mixer.update(delta));
      if (rim.material instanceof THREE.MeshBasicMaterial) {
        rim.material.opacity = .75 + Math.sin(t * 2) * .2;
        rim.material.transparent = true;
      }
      for (const person of animatedPeople) {
        const motion = getNpcMotion(person.kind, t, person.phase);
        if (person.kind === "walking") {
          const angle = motion.progress * Math.PI * 2;
          const radius = 8.15;
          person.object.position.set(Math.sin(angle) * radius, person.baseY + motion.bob, Math.cos(angle) * radius);
          person.object.rotation.set(0, angle + Math.PI / 2, motion.sway);
        }
      }
      const player = playerRef.current;
      if (player) {
        const current = { x: player.position.x, z: player.position.z };
        const next = advanceToward(current, { x: playerState.target.x, z: playerState.target.z }, delta * 4.1);
        const dx = next.x - player.position.x, dz = next.z - player.position.z;
        player.position.x = next.x; player.position.z = next.z;
        if (!next.arrived) {
          player.position.y = .1 + Math.abs(Math.sin(t * 7)) * .08;
          player.rotation.y = Math.atan2(dx, dz);
        } else {
          player.position.y = THREE.MathUtils.lerp(player.position.y, playerState.target.y, .18);
          if (playerState.sitting) player.rotation.y = THREE.MathUtils.lerp(player.rotation.y, playerState.targetRotation, .16);
        }
        if (playerHalo) {
          playerHalo.position.set(player.position.x, .08, player.position.z);
          if (onboarding && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            const pulse = 1 + Math.sin(t * 3.2) * .18;
            playerHalo.scale.setScalar(pulse);
            const material = playerHalo.material as THREE.MeshBasicMaterial;
            material.opacity = .62 + Math.sin(t * 3.2) * .25;
          }
        }
        if (playerActionMenu) {
          playerActionMenu.position.set(player.position.x + 1.45, player.position.y + 2.05, player.position.z);
          playerActionMenu.quaternion.copy(camera.quaternion);
        }
      }
      controls.update(); renderer.render(scene, camera); cssRenderer.render(scene, camera);
    };
    animate();
    const resize = () => { const nextAspect = container.clientWidth / container.clientHeight; camera.aspect = nextAspect; const view = getCameraView(nextAspect); camera.fov = view.fov; if (nextAspect < .8) camera.position.set(view.x, view.y, view.z); camera.updateProjectionMatrix(); renderer.setSize(container.clientWidth, container.clientHeight); cssRenderer.setSize(container.clientWidth, container.clientHeight); };
    window.addEventListener("resize", resize);
    return () => { window.removeEventListener("resize", resize); renderer.domElement.removeEventListener("pointerdown", onPointerDown); renderer.domElement.removeEventListener("pointerup", onPointerUp); cancelAnimationFrame(frameId); controls.dispose(); renderer.dispose(); playerRef.current = null; container.removeChild(renderer.domElement); container.removeChild(cssRenderer.domElement); };
  // countdown is updated on the existing screen materials below; rebuilding the 3D scene every second would be expensive.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onNicknameRequest, onPlayerLocated, onQuickMessage, onboarding, playerNickname]);

  useEffect(() => {
    if (!screenMaterials.current.length) return;
    for (const material of screenMaterials.current) {
      material.map?.dispose();
      // Three.js materials are mutable runtime resources owned by this effect.
      // eslint-disable-next-line react-hooks/immutability
      material.map = textTexture(["1º LUGAR • REEL", "R$ 1.780", featuredPost.username, `Termina em ${countdown}`]);
      material.needsUpdate = true;
    }
  }, [countdown]);

  return <div ref={host} className="arena" aria-label="Arena 3D interativa do No Topo" />;
}
