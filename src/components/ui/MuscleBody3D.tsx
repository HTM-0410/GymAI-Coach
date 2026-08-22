'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RotateCw, Sparkles, ZoomIn, ZoomOut, Play, Pause, Compass } from 'lucide-react';

export type MuscleName =
  | 'CHEST'
  | 'SHOULDERS'
  | 'BACK'
  | 'TRICEPS'
  | 'BICEPS'
  | 'FOREARMS'
  | 'ABS'
  | 'OBLIQUES'
  | 'LEGS'
  | 'GLUTES'
  | 'CALVES';

export interface MuscleBody3DProps {
  type?: 'front' | 'back' | 'both';
  highlighted?: MuscleName[];
  secondaryMuscles?: MuscleName[];
  accentColor?: string;
  className?: string;
  showControls?: boolean;
  interactive?: boolean;
  onMuscleClick?: (muscle: MuscleName) => void;
}

export default function MuscleBody3D({
  highlighted = [],
  secondaryMuscles = [],
  accentColor = '#f97316',
  className = '',
  showControls = true,
  interactive = true,
  onMuscleClick,
}: MuscleBody3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [autoRotate, setAutoRotate] = useState(false);
  const [activeAngle, setActiveAngle] = useState<'front' | 'back' | 'free'>('front');
  const targetRotationYRef = useRef<number | null>(0);
  const autoRotateRef = useRef(false);

  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 280;
    const height = container.clientHeight || 340;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0, 7.2);

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    renderer.shadowMap.enabled = true;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 3. Lighting (Studio Metallic Setup)
    const ambientLight = new THREE.AmbientLight(0x1e293b, 1.8);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
    keyLight.position.set(3, 5, 5);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x64748b, 1.5);
    fillLight.position.set(-4, 2, 4);
    scene.add(fillLight);

    const backRimLight = new THREE.DirectionalLight(0x38bdf8, 2.0);
    backRimLight.position.set(0, 4, -5);
    scene.add(backRimLight);

    // Dynamic point light for active muscle glow
    const glowPointLight = new THREE.PointLight(0xff5500, 2.5, 5);
    glowPointLight.position.set(0, 0.8, 1.5);
    scene.add(glowPointLight);

    // 4. Materials
    const chromeMat = new THREE.MeshPhysicalMaterial({
      color: 0x94a3b8,
      metalness: 0.9,
      roughness: 0.25,
      clearcoat: 0.5,
      clearcoatRoughness: 0.15,
      reflectivity: 0.8,
    });

    const activeMat = new THREE.MeshPhysicalMaterial({
      color: 0xea580c,
      emissive: new THREE.Color(0xf97316),
      emissiveIntensity: 1.8,
      metalness: 0.4,
      roughness: 0.2,
      clearcoat: 0.8,
    });

    const secondaryMat = new THREE.MeshPhysicalMaterial({
      color: 0xd97706,
      emissive: new THREE.Color(0xf59e0b),
      emissiveIntensity: 1.2,
      metalness: 0.4,
      roughness: 0.2,
      clearcoat: 0.8,
    });

    const getMuscleMaterial = (name: MuscleName) => {
      if (highlighted.includes(name)) return activeMat;
      if (secondaryMuscles.includes(name)) return secondaryMat;
      return chromeMat;
    };

    // 5. Anatomical Body Construction Group
    const bodyGroup = new THREE.Group();
    bodyGroup.position.y = -0.1;

    // Helper builder functions
    const createMuscleMesh = (geo: THREE.BufferGeometry, name: MuscleName, pos: [number, number, number], rot?: [number, number, number], scale?: [number, number, number]) => {
      const mesh = new THREE.Mesh(geo, getMuscleMaterial(name));
      mesh.position.set(...pos);
      if (rot) mesh.rotation.set(...rot);
      if (scale) mesh.scale.set(...scale);
      mesh.userData = { muscleName: name };
      bodyGroup.add(mesh);
      return mesh;
    };

    // ── HEAD & NECK ──
    const headGeo = new THREE.SphereGeometry(0.38, 32, 32);
    headGeo.scale(0.85, 1.1, 0.9);
    const head = new THREE.Mesh(headGeo, chromeMat);
    head.position.set(0, 2.35, 0);
    bodyGroup.add(head);

    const neckGeo = new THREE.CylinderGeometry(0.24, 0.28, 0.45, 24);
    const neck = new THREE.Mesh(neckGeo, chromeMat);
    neck.position.set(0, 1.85, 0);
    bodyGroup.add(neck);

    // ── TORSO CORE ──
    const ribcageGeo = new THREE.CylinderGeometry(0.68, 0.52, 1.1, 24);
    ribcageGeo.scale(1.2, 1.0, 0.75);
    const ribcage = new THREE.Mesh(ribcageGeo, chromeMat);
    ribcage.position.set(0, 1.15, 0);
    bodyGroup.add(ribcage);

    const pelvisGeo = new THREE.CylinderGeometry(0.48, 0.52, 0.7, 24);
    pelvisGeo.scale(1.1, 1.0, 0.8);
    const pelvis = new THREE.Mesh(pelvisGeo, chromeMat);
    pelvis.position.set(0, 0.25, 0);
    bodyGroup.add(pelvis);

    // ── CHEST (Pectoralis Major) ──
    const pecGeo = new THREE.BoxGeometry(0.46, 0.38, 0.28);
    pecGeo.scale(1.0, 0.9, 0.8);
    createMuscleMesh(pecGeo, 'CHEST', [-0.28, 1.32, 0.32], [0.1, 0.15, -0.1]);
    createMuscleMesh(pecGeo, 'CHEST', [0.28, 1.32, 0.32], [0.1, -0.15, 0.1]);

    // ── ABS (6-pack Rectus Abdominis) ──
    const abCubeGeo = new THREE.BoxGeometry(0.2, 0.16, 0.16);
    const abYLevels = [0.95, 0.75, 0.55];
    abYLevels.forEach((y) => {
      createMuscleMesh(abCubeGeo, 'ABS', [-0.14, y, 0.35], [0, 0.05, 0]);
      createMuscleMesh(abCubeGeo, 'ABS', [0.14, y, 0.35], [0, -0.05, 0]);
    });

    // ── OBLIQUES ──
    const obliqueGeo = new THREE.CylinderGeometry(0.12, 0.16, 0.6, 16);
    createMuscleMesh(obliqueGeo, 'OBLIQUES', [-0.55, 0.75, 0.1], [0, 0, -0.25]);
    createMuscleMesh(obliqueGeo, 'OBLIQUES', [0.55, 0.75, 0.1], [0, 0, 0.25]);

    // ── SHOULDERS (Deltoids) ──
    const deltGeo = new THREE.SphereGeometry(0.32, 24, 24);
    deltGeo.scale(0.85, 1.15, 0.95);
    createMuscleMesh(deltGeo, 'SHOULDERS', [-0.92, 1.45, 0], [0, 0, 0.3]);
    createMuscleMesh(deltGeo, 'SHOULDERS', [0.92, 1.45, 0], [0, 0, -0.3]);

    // ── BICEPS (Front Arms) ──
    const bicepGeo = new THREE.CylinderGeometry(0.18, 0.16, 0.65, 16);
    createMuscleMesh(bicepGeo, 'BICEPS', [-1.02, 0.95, 0.08], [0.1, 0, 0.15]);
    createMuscleMesh(bicepGeo, 'BICEPS', [1.02, 0.95, 0.08], [0.1, 0, -0.15]);

    // ── TRICEPS (Back Arms) ──
    const tricepGeo = new THREE.CylinderGeometry(0.18, 0.16, 0.65, 16);
    createMuscleMesh(tricepGeo, 'TRICEPS', [-1.02, 0.95, -0.12], [-0.1, 0, 0.15]);
    createMuscleMesh(tricepGeo, 'TRICEPS', [1.02, 0.95, -0.12], [-0.1, 0, -0.15]);

    // ── FOREARMS ──
    const forearmGeo = new THREE.CylinderGeometry(0.15, 0.11, 0.75, 16);
    createMuscleMesh(forearmGeo, 'FOREARMS', [-1.15, 0.25, 0.05], [0, 0, 0.1]);
    createMuscleMesh(forearmGeo, 'FOREARMS', [1.15, 0.25, 0.05], [0, 0, -0.1]);

    // ── BACK & LATS (Latissimus & Traps) ──
    const trapGeo = new THREE.ConeGeometry(0.65, 0.65, 4);
    trapGeo.scale(1.2, 1.0, 0.5);
    createMuscleMesh(trapGeo, 'BACK', [0, 1.7, -0.22], [0, 0, Math.PI]);

    const latGeo = new THREE.BoxGeometry(0.48, 0.7, 0.22);
    createMuscleMesh(latGeo, 'BACK', [-0.36, 1.15, -0.26], [0, -0.2, 0.2]);
    createMuscleMesh(latGeo, 'BACK', [0.36, 1.15, -0.26], [0, 0.2, -0.2]);

    // ── GLUTES (Gluteus Maximus) ──
    const gluteGeo = new THREE.SphereGeometry(0.35, 24, 24);
    gluteGeo.scale(0.95, 1.05, 0.9);
    createMuscleMesh(gluteGeo, 'GLUTES', [-0.28, 0.15, -0.28]);
    createMuscleMesh(gluteGeo, 'GLUTES', [0.28, 0.15, -0.28]);

    // ── LEGS (Quads & Hamstrings) ──
    const thighGeo = new THREE.CylinderGeometry(0.32, 0.22, 1.25, 20);
    thighGeo.scale(1.0, 1.0, 0.9);
    createMuscleMesh(thighGeo, 'LEGS', [-0.36, -0.75, 0.05], [0.05, 0, -0.05]);
    createMuscleMesh(thighGeo, 'LEGS', [0.36, -0.75, 0.05], [0.05, 0, 0.05]);

    // ── CALVES ──
    const calfGeo = new THREE.CylinderGeometry(0.22, 0.14, 1.1, 18);
    createMuscleMesh(calfGeo, 'CALVES', [-0.38, -1.95, -0.05], [-0.05, 0, 0]);
    createMuscleMesh(calfGeo, 'CALVES', [0.38, -1.95, -0.05], [-0.05, 0, 0]);

    scene.add(bodyGroup);

    // 6. Interactive Drag / Touch Controls
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      isDragging = true;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      previousMousePosition = { x: clientX, y: clientY };
      targetRotationYRef.current = null;
      setActiveAngle('free');
    };

    const onPointerMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      const deltaX = clientX - previousMousePosition.x;
      const deltaY = clientY - previousMousePosition.y;

      bodyGroup.rotation.y += deltaX * 0.015;
      bodyGroup.rotation.x = Math.max(-0.4, Math.min(0.4, bodyGroup.rotation.x + deltaY * 0.008));

      previousMousePosition = { x: clientX, y: clientY };
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', onPointerDown);
    dom.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);

    dom.addEventListener('touchstart', onPointerDown, { passive: true });
    dom.addEventListener('touchmove', onPointerMove, { passive: true });
    window.addEventListener('touchend', onPointerUp);

    // 7. Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Smooth programmatic rotation interpolation
      if (targetRotationYRef.current !== null) {
        bodyGroup.rotation.y += (targetRotationYRef.current - bodyGroup.rotation.y) * 0.1;
        bodyGroup.rotation.x += (0 - bodyGroup.rotation.x) * 0.1;
        if (Math.abs(targetRotationYRef.current - bodyGroup.rotation.y) < 0.005) {
          bodyGroup.rotation.y = targetRotationYRef.current;
          targetRotationYRef.current = null;
        }
      } else if (autoRotateRef.current && !isDragging) {
        bodyGroup.rotation.y += 0.015;
      }

      // Subtle breath / pulse glow animation
      if (highlighted.length > 0) {
        const pulse = 1.6 + Math.sin(elapsedTime * 4) * 0.4;
        activeMat.emissiveIntensity = pulse;
        glowPointLight.intensity = pulse * 1.5;
      }

      renderer.render(scene, camera);
    };

    animate();

    // Resize handler
    const handleResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      dom.removeEventListener('mousedown', onPointerDown);
      dom.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      dom.removeEventListener('touchstart', onPointerDown);
      dom.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('touchend', onPointerUp);
      renderer.dispose();
      scene.clear();
    };
  }, [highlighted, secondaryMuscles, accentColor]);

  const rotateTo = (angle: 'front' | 'back') => {
    setActiveAngle(angle);
    setAutoRotate(false);
    targetRotationYRef.current = angle === 'front' ? 0 : Math.PI;
  };

  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      {/* Interactive Toolbar */}
      {showControls && (
        <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md p-1 rounded-xl border border-white/15 mb-3 shadow-neumorph-sm z-20">
          <button
            type="button"
            onClick={() => rotateTo('front')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
              activeAngle === 'front' ? 'bg-accent text-white shadow-xs' : 'text-white/60 hover:text-white'
            }`}
          >
            Mặt trước
          </button>
          <button
            type="button"
            onClick={() => rotateTo('back')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
              activeAngle === 'back' ? 'bg-accent text-white shadow-xs' : 'text-white/60 hover:text-white'
            }`}
          >
            Mặt sau
          </button>
          <button
            type="button"
            onClick={() => {
              setAutoRotate((prev) => !prev);
              setActiveAngle('free');
              targetRotationYRef.current = null;
            }}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all flex items-center gap-1 cursor-pointer ${
              autoRotate ? 'bg-emerald-600 text-white shadow-xs' : 'text-white/60 hover:text-white'
            }`}
            title="Tự động xoay 360 độ"
          >
            <RotateCw className={`h-3 w-3 ${autoRotate ? 'animate-spin' : ''}`} />
            <span>{autoRotate ? 'Đang xoay' : 'Xoay 360°'}</span>
          </button>
        </div>
      )}

      {/* 3D WebGL Canvas Viewport */}
      <div className="relative w-[240px] sm:w-[270px] h-[310px] sm:h-[350px] rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-b from-[#080d19] via-[#050811] to-[#020408] border border-white/15 cursor-grab active:cursor-grabbing">
        {/* Three.js Canvas Container */}
        <div ref={mountRef} className="w-full h-full" />

        {/* Ambient Grid overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:12px_12px] opacity-10 pointer-events-none" />

        {/* Dynamic Status / Interactive Hint Overlay */}
        <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between pointer-events-none">
          <span className="font-mono text-[8px] uppercase tracking-wider text-white/70 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/10 flex items-center gap-1">
            <Compass className="h-2.5 w-2.5 text-accent" />
            <span>Kéo chuột để xoay 360°</span>
          </span>
          {highlighted.length > 0 && (
            <span className="flex items-center gap-1 font-mono text-[8px] uppercase tracking-wider text-accent bg-accent/25 backdrop-blur-md px-2 py-0.5 rounded-md border border-accent/40 font-extrabold led-pulse">
              <Sparkles className="h-2.5 w-2.5" />
              <span>{highlighted.length} Nhóm cơ</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
