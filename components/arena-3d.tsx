"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";

const LIME = 0xb9ff38;
const NAVY = 0x101b35;
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

function makeLabel(text: string) {
  const canvas = document.createElement("canvas"); canvas.width = 420; canvas.height = 96;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "rgba(5,9,18,.86)"; ctx.roundRect(4,4,412,88,24); ctx.fill();
  ctx.strokeStyle = "rgba(185,255,56,.65)"; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = "white"; ctx.font = "700 34px Arial"; ctx.textAlign = "center"; ctx.fillText(text, 210, 61);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthTest: false }));
  sprite.scale.set(2.7, .62, 1); return sprite;
}

export default function Arena3D({ countdown }: { countdown: string }) {
  const host = useRef<HTMLDivElement>(null);
  const screenMaterial = useRef<THREE.MeshStandardMaterial | null>(null);

  useEffect(() => {
    if (!host.current) return;
    const container = host.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x03050b);
    scene.fog = new THREE.FogExp2(0x03050b, .018);
    const camera = new THREE.PerspectiveCamera(42, container.clientWidth / container.clientHeight, .1, 180);
    camera.position.set(24, 19, 28);
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 2, 0); controls.enablePan = false; controls.enableDamping = true;
    controls.minDistance = 21; controls.maxDistance = 48; controls.minPolarAngle = .55; controls.maxPolarAngle = 1.25;

    scene.add(new THREE.HemisphereLight(0x627dff, 0x05060a, 1.8));
    const key = new THREE.DirectionalLight(0xffffff, 3.2); key.position.set(4, 18, 10); key.castShadow = true; scene.add(key);
    const limeLight = new THREE.PointLight(LIME, 45, 30); limeLight.position.set(0, 4, 0); scene.add(limeLight);

    const platform = new THREE.Mesh(new THREE.CylinderGeometry(18, 18.8, 1.4, 96), new THREE.MeshStandardMaterial({ color: 0x080d18, metalness: .45, roughness: .55 }));
    platform.position.y = -.75; platform.receiveShadow = true; scene.add(platform);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(18.1, .12, 10, 128), new THREE.MeshBasicMaterial({ color: LIME })); rim.rotation.x = Math.PI / 2; rim.position.y = .03; scene.add(rim);

    const floor = new THREE.GridHelper(130, 80, 0x17213a, 0x0b1324); floor.position.y = -1.48; scene.add(floor);

    const seatMat = new THREE.MeshStandardMaterial({ color: NAVY, roughness: .62, metalness: .18 });
    const seatGeo = new THREE.BoxGeometry(1.05, .68, .9); const backGeo = new THREE.BoxGeometry(1.05, 1.25, .28);
    const seatPositions: THREE.Vector3[] = [];
    for (let row = 0; row < 4; row++) {
      const radius = 7.4 + row * 2.55; const count = 18 + row * 6;
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        if (Math.abs(Math.sin(angle)) < .12) continue;
        const x = Math.sin(angle) * radius, z = Math.cos(angle) * radius;
        const group = new THREE.Group(); group.position.set(x, row * .58, z); group.rotation.y = angle + Math.PI;
        const seat = new THREE.Mesh(seatGeo, seatMat); seat.position.z = .15; seat.castShadow = true;
        const back = new THREE.Mesh(backGeo, seatMat); back.position.set(0, .75, .5); back.rotation.x = -.08; back.castShadow = true;
        group.add(seat, back); scene.add(group); seatPositions.push(new THREE.Vector3(x, row * .58 + .62, z));
      }
    }

    const screenGroup = new THREE.Group(); screenGroup.position.y = 4.3;
    const frame = new THREE.Mesh(new THREE.BoxGeometry(9.8, 6.7, .65), new THREE.MeshStandardMaterial({ color: 0x05070c, metalness: .7, roughness: .3 })); frame.castShadow = true; screenGroup.add(frame);
    const texture = textTexture(["DESTAQUE ATUAL", "R$ 1.780", "@studioaurora", "O maior lance domina a tela"]);
    const mat = new THREE.MeshStandardMaterial({ map: texture, emissive: 0x27334d, emissiveIntensity: .55, side: THREE.FrontSide }); screenMaterial.current = mat;
    const front = new THREE.Mesh(new THREE.PlaneGeometry(9.2, 6.1), mat); front.position.z = .34; screenGroup.add(front);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(9.2, 6.1), mat.clone()); back.position.z = -.34; back.rotation.y = Math.PI; screenGroup.add(back);
    scene.add(screenGroup);

    const posterTexture = textTexture(["RANKING", "#2", "@cafecentral", "R$ 1.650"], "#b388ff");
    [-1,1].forEach((side) => { const p = new THREE.Mesh(new THREE.BoxGeometry(3.1, 4.8, .4), new THREE.MeshStandardMaterial({ map: posterTexture, emissive: 0x20284a, emissiveIntensity: .45 })); p.position.set(side * 7.2, 3.1, 0); p.rotation.y = side * -.17; scene.add(p); });

    const loader = new GLTFLoader();
    Promise.all(modelPaths.map((path) => loader.loadAsync(path))).then((models) => {
      const occupied = seatPositions.filter((_, i) => i % 2 === 0 || i % 5 === 0).slice(0, 72);
      occupied.forEach((pos, index) => {
        const person = clone(models[index % models.length].scene);
        person.scale.setScalar(.62); person.position.copy(pos); person.position.y -= .23;
        person.lookAt(0, person.position.y, 0); person.rotateY(Math.PI);
        person.traverse((o) => { if ((o as THREE.Mesh).isMesh) { (o as THREE.Mesh).castShadow = true; } });
        scene.add(person);
        if ([4, 19, 41].includes(index)) { const label = makeLabel(["@cafecentral", "@academiaflow", "@lojavertice"][[4,19,41].indexOf(index)]); label.position.copy(pos).add(new THREE.Vector3(0, 2.2, 0)); scene.add(label); }
      });
    }).catch(() => undefined);

    let frameId = 0;
    const clock = new THREE.Clock();
    const animate = () => { frameId = requestAnimationFrame(animate); const t = clock.getElapsedTime(); rim.material instanceof THREE.MeshBasicMaterial && (rim.material.opacity = .75 + Math.sin(t * 2) * .2, rim.material.transparent = true); controls.update(); renderer.render(scene, camera); };
    animate();
    const resize = () => { camera.aspect = container.clientWidth / container.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(container.clientWidth, container.clientHeight); };
    window.addEventListener("resize", resize);
    return () => { window.removeEventListener("resize", resize); cancelAnimationFrame(frameId); controls.dispose(); renderer.dispose(); container.removeChild(renderer.domElement); };
  }, []);

  useEffect(() => {
    if (!screenMaterial.current) return;
    screenMaterial.current.map?.dispose();
    screenMaterial.current.map = textTexture(["DESTAQUE ATUAL", "R$ 1.780", "@studioaurora", `Termina em ${countdown}`]);
    screenMaterial.current.needsUpdate = true;
  }, [countdown]);

  return <div ref={host} className="arena" aria-label="Arena 3D interativa do No Topo" />;
}
