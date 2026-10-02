import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Gauge, Car, ChevronDown, History, Printer, Shield, Activity, RotateCcw } from 'lucide-react';
import { Vehicle } from '../../types';
import { formatOdometer } from '../../utils/formatters';

interface Automotive3DHeroProps {
  selectedVehicle: Vehicle;
  vehicles: Vehicle[];
  onSelectVehicle: (id: string) => void;
  onOpenAddVehicle: () => void;
  onOpenTimeline: () => void;
  onPrintReport: () => void;
  onNavigateTab: (tab: string) => void;
}

export const Automotive3DHero: React.FC<Automotive3DHeroProps> = ({
  selectedVehicle,
  vehicles,
  onSelectVehicle,
  onOpenAddVehicle,
  onOpenTimeline,
  onPrintReport,
  onNavigateTab,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [vehicleDropdownOpen, setVehicleDropdownOpen] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const mousePos = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const isDragging = useRef(false);
  const prevMouseX = useRef(0);
  const userRotationY = useRef(0);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Setup Three.js Scene
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0b0e14, 0.08);

    const width = container.clientWidth || 400;
    const height = container.clientHeight || 280;

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 1.2, 5.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Automotive Car Group
    const carGroup = new THREE.Group();
    scene.add(carGroup);

    // 1. CAR BODY (Aerodynamic sports GT chassis)
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x151a22,
      metalness: 0.88,
      roughness: 0.22,
    });

    const bodyGeometry = new THREE.BoxGeometry(2.4, 0.45, 1.15);
    // Bevel top edges
    const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    bodyMesh.position.y = 0.45;
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    carGroup.add(bodyMesh);

    // 2. CABIN & WINDSHIELD (Sleek cockpit)
    const cabinMaterial = new THREE.MeshStandardMaterial({
      color: 0x061118,
      metalness: 0.95,
      roughness: 0.1,
      transparent: true,
      opacity: 0.85,
    });
    const cabinGeometry = new THREE.BoxGeometry(1.25, 0.38, 0.95);
    const cabinMesh = new THREE.Mesh(cabinGeometry, cabinMaterial);
    cabinMesh.position.set(-0.1, 0.8, 0);
    cabinMesh.castShadow = true;
    carGroup.add(cabinMesh);

    // Hood Slope (Front aerodynamic wedge)
    const hoodGeometry = new THREE.CylinderGeometry(0.55, 0.6, 0.9, 4);
    const hoodMesh = new THREE.Mesh(hoodGeometry, bodyMaterial);
    hoodMesh.rotation.z = Math.PI / 2;
    hoodMesh.rotation.y = Math.PI / 4;
    hoodMesh.position.set(1.0, 0.52, 0);
    hoodMesh.scale.set(0.4, 0.8, 1.15);
    carGroup.add(hoodMesh);

    // 3. FRONT LED LIGHT BAR (Electric Teal)
    const headlightMaterial = new THREE.MeshBasicMaterial({ color: 0x00d4c7 });
    const headlightGeo = new THREE.BoxGeometry(0.08, 0.08, 0.9);
    const headlightMesh = new THREE.Mesh(headlightGeo, headlightMaterial);
    headlightMesh.position.set(1.21, 0.5, 0);
    carGroup.add(headlightMesh);

    // 4. REAR TAILLIGHT STRIP (Automotive Red)
    const taillightMaterial = new THREE.MeshBasicMaterial({ color: 0xff4d4f });
    const taillightGeo = new THREE.BoxGeometry(0.06, 0.08, 0.92);
    const taillightMesh = new THREE.Mesh(taillightGeo, taillightMaterial);
    taillightMesh.position.set(-1.21, 0.52, 0);
    carGroup.add(taillightMesh);

    // 5. WHEELS & ALLOY RIMS
    const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x111418, roughness: 0.85 });
    const rimMaterial = new THREE.MeshStandardMaterial({ color: 0xb8c2cc, metalness: 0.95, roughness: 0.15 });

    const wheelGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.18, 24);
    const rimGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.19, 16);

    const wheelPositions = [
      [0.75, 0.28, 0.6],
      [0.75, 0.28, -0.6],
      [-0.75, 0.28, 0.6],
      [-0.75, 0.28, -0.6],
    ];

    wheelPositions.forEach(([x, y, z]) => {
      const wheel = new THREE.Mesh(wheelGeo, wheelMaterial);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(x, y, z);
      wheel.castShadow = true;

      const rim = new THREE.Mesh(rimGeo, rimMaterial);
      wheel.add(rim);

      // Subtle cyan brake caliper accent
      const caliper = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.1), new THREE.MeshBasicMaterial({ color: 0x00d4c7 }));
      caliper.position.set(0.12, 0, 0);
      wheel.add(caliper);

      carGroup.add(wheel);
    });

    // 6. UNDERBODY SHADOW & REFLECTIVE DISC
    const shadowGeo = new THREE.PlaneGeometry(3.2, 1.8);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x00d4c7,
      transparent: true,
      opacity: 0.18,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = 0.02;
    carGroup.add(shadowMesh);

    // Perspective circular ground grid
    const gridHelper = new THREE.GridHelper(8, 16, 0x00d4c7, 0x1d232b);
    gridHelper.position.y = 0;
    scene.add(gridHelper);

    // 7. LIGHTING
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x0e141c, 2.5);
    scene.add(ambientLight);

    // Key Titanium White Light
    const keyLight = new THREE.DirectionalLight(0xf5f7fa, 3.2);
    keyLight.position.set(4, 6, 5);
    keyLight.castShadow = true;
    scene.add(keyLight);

    // Rim Electric Teal Light
    const rimLight = new THREE.DirectionalLight(0x00d4c7, 4.0);
    rimLight.position.set(-4, 2, -3);
    scene.add(rimLight);

    // Subtle front spotlight
    const frontSpot = new THREE.SpotLight(0x00d4c7, 2.5, 8, Math.PI / 6, 0.4);
    frontSpot.position.set(3, 2, 2);
    frontSpot.target = carGroup;
    scene.add(frontSpot);

    // Mouse Tracking for Parallax
    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const normX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const normY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mousePos.current.targetX = normX;
      mousePos.current.targetY = normY;

      if (isDragging.current) {
        const deltaX = e.clientX - prevMouseX.current;
        userRotationY.current += deltaX * 0.01;
        prevMouseX.current = e.clientX;
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      isDragging.current = true;
      prevMouseX.current = e.clientX;
      setIsInteracting(true);
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      setIsInteracting(false);
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    // Animation Loop
    let animationId: number;
    let clock = new THREE.Clock();
    let isVisible = true;

    // IntersectionObserver to pause when off-screen
    const observer = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
    });
    observer.observe(container);

    const animate = () => {
      animationId = requestAnimationFrame(animate);

      if (!isVisible) return;

      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Smooth mouse lerp
      mousePos.current.x += (mousePos.current.targetX - mousePos.current.x) * 0.05;
      mousePos.current.y += (mousePos.current.targetY - mousePos.current.y) * 0.05;

      if (!prefersReducedMotion) {
        // Continuous slow rotation around Y + user drag + mouse parallax
        const baseAutoRotation = isDragging.current ? 0 : Math.sin(elapsed * 0.4) * 0.35 + 0.45;
        carGroup.rotation.y = baseAutoRotation + userRotationY.current + mousePos.current.x * 0.35;
        carGroup.rotation.x = mousePos.current.y * 0.12;

        // Gentle vertical floating motion
        carGroup.position.y = Math.sin(elapsed * 1.5) * 0.06;

        // Camera subtle sway
        camera.position.x = mousePos.current.x * 0.3;
        camera.position.y = 1.2 + mousePos.current.y * 0.15;
        camera.lookAt(0, 0.4, 0);

        // Ground grid slight oscillation
        gridHelper.position.z = (elapsed * 0.2) % 0.5;
      } else {
        carGroup.rotation.y = 0.55;
        carGroup.position.y = 0;
      }

      renderer.render(scene, camera);
    };

    animate();

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      observer.disconnect();
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      bodyGeometry.dispose();
      bodyMaterial.dispose();
      cabinGeometry.dispose();
      cabinMaterial.dispose();
    };
  }, []);

  return (
    <div className="relative rounded-3xl overflow-hidden border border-[#252C35] bg-gradient-to-r from-[#0B0E14] via-[#151A20] to-[#0B0E14] shadow-2xl p-6 sm:p-8 card-3d">
      {/* Ambient Lighting Orbs */}
      <div className="absolute top-0 right-10 w-96 h-96 bg-[#00D4C7]/15 rounded-full blur-3xl pointer-events-none glow-orb-3d" />
      <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Automotive Telemetry Grid Background */}
      <div className="absolute inset-0 telemetry-grid opacity-30 pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Left: Active Vehicle Specs & Telemetry */}
        <div className="space-y-3.5 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00D4C7]/10 border border-[#00D4C7]/30 text-[#00D4C7] text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-[#00D4C7] animate-pulse" />
            <span className="tracking-wide">Active Vehicle Telemetry</span>
          </div>

          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight flex items-center gap-3">
              <span>{selectedVehicle.name}</span>
            </h1>

            <div className="flex items-center gap-2.5 mt-2.5 flex-wrap text-sm">
              <span className="text-[#00D4C7] font-bold font-mono bg-[#1D232B] px-3 py-1 rounded-xl border border-[#00D4C7]/40 tracking-wider shadow-sm">
                {selectedVehicle.vehicleNumber}
              </span>
              <span className="text-gray-300 font-medium">
                {selectedVehicle.brand} • {selectedVehicle.model}{selectedVehicle.variant ? ` • ${selectedVehicle.variant}` : ''}
              </span>
              <span className="text-gray-600">•</span>
              <span className="px-2.5 py-0.5 rounded-lg bg-[#1D232B] text-gray-300 text-xs font-semibold border border-gray-800">
                {selectedVehicle.fuelType}
              </span>
              <span className="text-gray-600">•</span>
              <span className="text-emerald-400 font-mono font-bold flex items-center gap-1.5 bg-emerald-950/40 px-2.5 py-0.5 rounded-lg border border-emerald-500/20 text-xs">
                <Gauge className="w-3.5 h-3.5" />
                <span>{formatOdometer(selectedVehicle.currentOdometer)}</span>
              </span>
            </div>
          </div>

          {/* Quick Vehicle Switcher Dropdown & Actions */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {/* Quick Switch Dropdown */}
            {vehicles.length > 1 && (
              <div className="relative">
                <button
                  onClick={() => setVehicleDropdownOpen(!vehicleDropdownOpen)}
                  className="px-3.5 py-2.5 rounded-xl bg-[#1D232B] border border-gray-700/80 hover:border-[#00D4C7]/50 text-white text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 shadow-md hover:bg-[#252C35]"
                >
                  <Car className="w-3.5 h-3.5 text-[#00D4C7]" />
                  <span>Switch Vehicle</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${vehicleDropdownOpen ? 'rotate-180 text-[#00D4C7]' : ''}`} />
                </button>

                {vehicleDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setVehicleDropdownOpen(false)} />
                    <div className="absolute left-0 top-full mt-2 w-64 bg-[#151A20] border border-[#00D4C7]/40 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2">
                      <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        My Vehicles ({vehicles.length})
                      </div>
                      {vehicles.map((v) => (
                        <button
                          key={v.id}
                          onClick={() => {
                            onSelectVehicle(v.id);
                            setVehicleDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-[#1D232B] transition-colors ${
                            selectedVehicle.id === v.id ? 'bg-[#00D4C7]/15 text-[#00D4C7] font-bold' : 'text-gray-300'
                          }`}
                        >
                          <span className="truncate pr-2">{v.name}</span>
                          {selectedVehicle.id === v.id && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#00D4C7] shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            <button
              onClick={onOpenTimeline}
              className="px-3.5 py-2.5 rounded-xl bg-[#1D232B] hover:bg-[#252C35] border border-gray-700/80 hover:border-[#00D4C7]/50 text-[#00D4C7] hover:text-white text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-md"
              title="View Complete Vehicle Lifetime Timeline"
            >
              <History className="w-3.5 h-3.5 text-[#00D4C7]" />
              <span className="hidden sm:inline">Timeline</span>
            </button>

            <button
              onClick={onPrintReport}
              className="px-3.5 py-2.5 rounded-xl bg-[#1D232B] hover:bg-[#252C35] border border-gray-700/80 hover:border-[#00D4C7]/50 text-gray-200 hover:text-white text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-md"
              title="Print Official Maintenance Certificate"
            >
              <Printer className="w-3.5 h-3.5 text-[#00D4C7]" />
              <span className="hidden sm:inline">Report / PDF</span>
            </button>

            <button
              onClick={() => onNavigateTab('vehicles')}
              className="px-4 py-2.5 rounded-xl bg-[#252C35] hover:bg-[#2F3742] text-gray-200 text-xs font-semibold border border-gray-700 transition-all cursor-pointer"
            >
              Manage Vehicle
            </button>
          </div>
        </div>

        {/* Right: Real 3D Three.js Automotive Canvas */}
        <div className="relative w-full lg:w-[480px] h-[260px] sm:h-[280px] flex items-center justify-center">
          <div
            ref={mountRef}
            className="w-full h-full cursor-grab active:cursor-grabbing select-none"
            title="Interactive 3D Automotive View - Drag to rotate, move mouse for parallax"
          />

          {/* Interactive Hint Badge */}
          <div className="absolute bottom-2 right-2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0B0E14]/80 border border-[#252C35] text-[10px] text-gray-400 pointer-events-none backdrop-blur-md">
            <Activity className="w-3 h-3 text-[#00D4C7]" />
            <span>3D Interactive • Drag to inspect</span>
          </div>
        </div>
      </div>
    </div>
  );
};
