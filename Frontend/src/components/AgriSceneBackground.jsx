import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

const usePrefersReducedMotion = () => {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!media) return;

    const update = () => setReduced(Boolean(media.matches));
    update();

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", update);
      return () => media.removeEventListener("change", update);
    }

    media.addListener?.(update);
    return () => media.removeListener?.(update);
  }, []);

  return reduced;
};

const readCssVar = (name, fallback) => {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  } catch {
    return fallback;
  }
};

const useThemeColors = () => {
  const [colors, setColors] = useState(() => ({
    primary: "#0d9488",
    primaryLight: "#ccfbf1",
    secondary: "#f97316",
    secondaryLight: "#ffedd5",
    bg: "#f8fafc",
  }));

  useEffect(() => {
    setColors({
      primary: readCssVar("--color-primary", "#0d9488"),
      primaryLight: readCssVar("--color-primary-light", "#ccfbf1"),
      secondary: readCssVar("--color-secondary", "#f97316"),
      secondaryLight: readCssVar("--color-secondary-light", "#ffedd5"),
      bg: readCssVar("--color-bg-main", "#f8fafc"),
    });
  }, []);

  return colors;
};

const FloatingSeeds = ({ reducedMotion, colors }) => {
  const groupRef = useRef(null);

  const seeds = useMemo(() => {
    const rand = (a, b) => a + Math.random() * (b - a);
    return Array.from({ length: 18 }).map((_, i) => ({
      key: `seed-${i}`,
      position: new THREE.Vector3(rand(-4.5, 4.5), rand(-1.4, 2.6), rand(-5.5, 0.5)),
      baseY: rand(-1.4, 2.6),
      scale: rand(0.08, 0.22),
      wobble: rand(0.35, 0.9),
      drift: rand(0.06, 0.14),
      spin: rand(0.12, 0.28),
      hue: i % 3,
    }));
  }, []);

  useFrame((state, delta) => {
    if (reducedMotion) return;
    const g = groupRef.current;
    if (!g) return;

    g.rotation.y += delta * 0.03;

    const t = state.clock.elapsedTime;
    for (let i = 0; i < g.children.length; i++) {
      const child = g.children[i];
      const seed = seeds[i];
      if (!seed) continue;

      child.position.y = seed.baseY + Math.sin(t * seed.wobble + i) * 0.18;
      child.rotation.x += delta * seed.spin;
      child.rotation.y += delta * seed.spin * 0.8;
      child.position.x += Math.sin(t * seed.drift + i * 0.7) * 0.0009;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {seeds.map((s) => (
        <mesh key={s.key} position={s.position.toArray()} scale={s.scale}>
          <sphereGeometry args={[1, 24, 24]} />
          <meshStandardMaterial
            color={s.hue === 0 ? colors.primary : s.hue === 1 ? colors.secondary : colors.primaryLight}
            roughness={0.35}
            metalness={0.05}
            emissive={s.hue === 1 ? colors.secondaryLight : colors.primaryLight}
            emissiveIntensity={0.16}
          />
        </mesh>
      ))}

      <mesh rotation={[Math.PI / 2.6, -0.4, 0]} position={[1.4, 0.2, -2.7]} scale={1.15}>
        <torusKnotGeometry args={[0.7, 0.18, 120, 12]} />
        <meshStandardMaterial color={colors.primary} roughness={0.45} metalness={0.12} />
      </mesh>
    </group>
  );
};

const SoftParticles = ({ reducedMotion, colors }) => {
  const pointsRef = useRef(null);

  const { positions, count } = useMemo(() => {
    const count = 650;
    const arr = new Float32Array(count * 3);
    const rand = (a, b) => a + Math.random() * (b - a);
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 0] = rand(-7.5, 7.5);
      arr[i * 3 + 1] = rand(-2.0, 4.2);
      arr[i * 3 + 2] = rand(-10.0, 1.0);
    }
    return { positions: arr, count };
  }, []);

  useFrame((state, delta) => {
    if (reducedMotion) return;
    const points = pointsRef.current;
    if (!points) return;

    points.rotation.y += delta * 0.01;
    points.rotation.x = Math.sin(state.clock.elapsedTime * 0.05) * 0.04;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={positions} count={count} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        size={0.04}
        color={colors.secondary}
        transparent
        opacity={0.22}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
};

const GroundMist = ({ colors }) => {
  return (
    <group position={[0, -2.2, -3.2]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[9.5, 64]} />
        <meshStandardMaterial color={colors.primaryLight} roughness={1} metalness={0} transparent opacity={0.55} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.8, 0.01, 0.6]}>
        <circleGeometry args={[7.5, 64]} />
        <meshStandardMaterial color={colors.secondaryLight} roughness={1} metalness={0} transparent opacity={0.22} />
      </mesh>
    </group>
  );
};

const AgriScene = ({ reducedMotion, colors }) => {
  return (
    <>
      <fog attach="fog" args={[colors.bg, 9.5, 22]} />

      <ambientLight intensity={0.65} />
      <directionalLight position={[6, 7, 3]} intensity={1.0} color={colors.primaryLight} />
      <directionalLight position={[-6, -2, 6]} intensity={0.5} color={colors.secondaryLight} />

      <SoftParticles reducedMotion={reducedMotion} colors={colors} />
      <FloatingSeeds reducedMotion={reducedMotion} colors={colors} />
      <GroundMist colors={colors} />
    </>
  );
};

const AgriSceneBackground = () => {
  const reducedMotion = usePrefersReducedMotion();
  const colors = useThemeColors();

  return (
    <div className="agri-scene pointer-events-none fixed inset-0 z-0">
      <Canvas
        dpr={[1, 1.6]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        camera={{ position: [0, 0.2, 8], fov: 45, near: 0.1, far: 60 }}
        frameloop={reducedMotion ? "demand" : "always"}
      >
        <AgriScene reducedMotion={reducedMotion} colors={colors} />
      </Canvas>
    </div>
  );
};

export default AgriSceneBackground;
