import { useRef, useState, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import type { CubeState, FaceName, CubeColor } from '../types/cube';

interface Cube3DProps {
  cubeState: CubeState;
  highlightLayer?: 'U' | 'D' | 'F' | 'B' | 'L' | 'R' | 'M' | 'E' | 'S' | null;
  animatingMove?: string | null;
  onMoveComplete?: () => void;
  animationSpeed?: number; // 0.5, 1, or 2
}

// Color mapping - optimized for visual distinction during animation
// Red: Deep crimson (cooler, darker) vs Orange: Bright tangerine (warmer, lighter)
const COLOR_MAP: Record<NonNullable<CubeColor>, string> = {
  W: '#FFFFFF',  // Pure white
  Y: '#FFEB3B',  // Bright yellow
  R: '#9B0000',  // Deep crimson red - cooler, unmistakably red
  O: '#FF8C00',  // Bright tangerine orange - warmer, clearly orange
  G: '#00A550',  // Vibrant green
  B: '#0047AB'   // Cobalt blue
};

// Material properties per color - enhances distinction especially for red/orange
const COLOR_MATERIAL_PROPS: Record<NonNullable<CubeColor>, { roughness: number; metalness: number; emissiveIntensity: number }> = {
  W: { roughness: 0.2, metalness: 0.05, emissiveIntensity: 0.1 },
  Y: { roughness: 0.25, metalness: 0.05, emissiveIntensity: 0.15 },
  R: { roughness: 0.35, metalness: 0.1, emissiveIntensity: 0.05 },   // Matte red, less reflective
  O: { roughness: 0.2, metalness: 0.0, emissiveIntensity: 0.2 },     // Glossy orange, more emissive
  G: { roughness: 0.25, metalness: 0.05, emissiveIntensity: 0.1 },
  B: { roughness: 0.3, metalness: 0.08, emissiveIntensity: 0.08 }
};

// Face definitions with their normal directions and cell positions
const FACE_CONFIG: Record<FaceName, {
  normal: [number, number, number];
  up: [number, number, number];
  position: [number, number, number];
}> = {
  F: { normal: [0, 0, 1], up: [0, 1, 0], position: [0, 0, 1.51] },
  B: { normal: [0, 0, -1], up: [0, 1, 0], position: [0, 0, -1.51] },
  R: { normal: [1, 0, 0], up: [0, 1, 0], position: [1.51, 0, 0] },
  L: { normal: [-1, 0, 0], up: [0, 1, 0], position: [-1.51, 0, 0] },
  U: { normal: [0, 1, 0], up: [0, 0, -1], position: [0, 1.51, 0] },
  D: { normal: [0, -1, 0], up: [0, 0, 1], position: [0, -1.51, 0] }
};

// Animation configuration for each face rotation
const FACE_ROTATION_AXIS: Record<string, { axis: 'x' | 'y' | 'z'; direction: number }> = {
  'U': { axis: 'y', direction: -1 },
  'D': { axis: 'y', direction: 1 },
  'R': { axis: 'x', direction: -1 },
  'L': { axis: 'x', direction: 1 },
  'F': { axis: 'z', direction: -1 },
  'B': { axis: 'z', direction: 1 }
};

// Parse move notation to get face, direction, and angle
function parseMoveNotation(notation: string): { face: string; angle: number } | null {
  if (!notation) return null;
  const face = notation[0];
  const isCounterClockwise = notation.includes("'");
  const isDouble = notation.includes("2");
  
  let angle = Math.PI / 2; // 90 degrees
  if (isDouble) angle = Math.PI; // 180 degrees
  if (isCounterClockwise) angle = -angle;
  
  return { face, angle };
}

// Individual sticker component with enhanced material properties
function Sticker({ 
  color, 
  colorKey,
  position, 
  rotation,
  isGlowing = false 
}: { 
  color: string;
  colorKey?: NonNullable<CubeColor>;
  position: [number, number, number]; 
  rotation: [number, number, number];
  isGlowing?: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Get material properties for this color (with fallback defaults)
  const materialProps = colorKey ? COLOR_MATERIAL_PROPS[colorKey] : { roughness: 0.3, metalness: 0.1, emissiveIntensity: 0 };
  
  // Calculate emissive color - orange gets extra warmth, red gets slight coolness
  const emissiveColor = useMemo(() => {
    if (isGlowing) return color;
    if (colorKey === 'O') return '#FF6600'; // Warm orange glow
    if (colorKey === 'R') return '#400000'; // Very subtle dark red
    return '#000000';
  }, [color, colorKey, isGlowing]);
  
  return (
    <group position={position} rotation={rotation}>
      {/* Black border/outline for better definition */}
      <mesh position={[0, 0, -0.005]}>
        <planeGeometry args={[0.9, 0.9]} />
        <meshBasicMaterial color="#1a1a1a" />
      </mesh>
      
      {/* Main sticker face */}
      <mesh ref={meshRef}>
        <planeGeometry args={[0.82, 0.82]} />
        <meshStandardMaterial 
          color={color} 
          emissive={emissiveColor}
          emissiveIntensity={isGlowing ? 0.5 : materialProps.emissiveIntensity}
          roughness={materialProps.roughness}
          metalness={materialProps.metalness}
        />
      </mesh>
    </group>
  );
}

// Face component that renders 9 stickers
function CubeFace({ 
  faceName, 
  colors, 
  isHighlighted = false 
}: { 
  faceName: FaceName; 
  colors: CubeColor[]; 
  isHighlighted?: boolean;
}) {
  const config = FACE_CONFIG[faceName];
  
  // Safety check - don't render if config or colors are undefined
  if (!config || !colors || colors.length !== 9) {
    console.warn(`CubeFace: Invalid config or colors for face ${faceName}`);
    return null;
  }
  
  // Calculate rotation from normal
  const rotation = useMemo((): [number, number, number] => {
    const [nx, ny, nz] = config.normal;
    if (ny === 1) return [-Math.PI / 2, 0, 0];
    if (ny === -1) return [Math.PI / 2, 0, 0];
    if (nx === 1) return [0, Math.PI / 2, 0];
    if (nx === -1) return [0, -Math.PI / 2, 0];
    if (nz === -1) return [0, Math.PI, 0];
    return [0, 0, 0];
  }, [config.normal]);

  // Generate sticker positions for 3x3 grid
  // The unfolded net (2D reference - this is what's correct):
  //      U        (looking DOWN at white, green/F towards viewer)
  //   L  F  R  B  (all viewed with white/U on top)
  //      D        (looking UP at yellow, green/F towards viewer)
  //
  // Net index: 0=top-left, 1=top-center, 2=top-right, 
  //            3=mid-left, 4=center, 5=mid-right,
  //            6=bottom-left, 7=bottom-center, 8=bottom-right
  //
  // 3D Cube orientation:
  // - F face at +Z (Green center)
  // - R face at +X (Red center)  
  // - U face at +Y (White center)
  // - B face at -Z (Blue center)
  // - L face at -X (Orange center)
  // - D face at -Y (Yellow center)
  //
  // Edge connections (from FaceEditor ADJACENT_FACES):
  // - U bottom (6,7,8) ↔ F top (0,1,2)
  // - U right (2,5,8 mapped to R 2,1,0) ↔ R top (0,1,2 mapped to U 8,5,2)  
  // - F right (2,5,8) ↔ R left (0,3,6)
  
  const stickers = useMemo(() => {
    const result: Array<{
      color: string;
      colorKey: NonNullable<CubeColor> | undefined;
      localPos: [number, number];
      index: number;
    }> = [];

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const index = row * 3 + col;
        const color = colors[index];
        
        // Map 2D net indices to 3D local plane coordinates (x, y)
        // After face rotation, local coords become:
        // F (+Z): local x→world X, local y→world Y  
        // B (-Z, rotated 180° Y): local x→world -X, local y→world Y
        // R (+X, rotated 90° Y): local x→world -Z, local y→world Y
        // L (-X, rotated -90° Y): local x→world +Z, local y→world Y
        // U (+Y, rotated -90° X): local x→world X, local y→world -Z
        // D (-Y, rotated 90° X): local x→world X, local y→world +Z
        
        let x: number, y: number;
        
        switch (faceName) {
          case 'F':
            // Front face at +Z, looking at it from +Z
            // Net col 0 = left = world -X = local -X
            // Net row 0 = top = world +Y = local +Y
            x = (col - 1) * 0.95;
            y = (1 - row) * 0.95;
            break;
            
          case 'B':
            // Back face at -Z, rotated 180° around Y
            // local x → world -X, local y → world +Y
            // Rotation 180° Y: local (1,0,0) → (-1,0,0) = world -X
            // Net col 0 (left in net view of B) should connect to R
            // R.right → B[0,3,6], meaning R[2]↔B[0]
            // R[2] is at world (+X, +Y, -Z)
            // So B[0] should be at world (+X, +Y, -Z)
            // For B: need local x = negative to get world +X (since local x → world -X)
            // col=0 → x = (col - 1) * 0.95 = -0.95 ✓
            x = (col - 1) * 0.95;
            y = (1 - row) * 0.95;
            break;
            
          case 'U':
            // Up face at +Y, rotated -90° around X
            // Rotation -90° X: local x → world X, local y → world -Z
            //
            // Corner verification: U[8] should be at (+X, +Y, +Z) corner (FRU)
            // Need world x = +0.95, world z = +0.95
            // local y → world -Z, so local y = -0.95 → world z = +0.95
            // U[8] (col=2, row=2): x = (col-1)*0.95 = 0.95 ✓, y = (1-row)*0.95 = -0.95 ✓
            x = (col - 1) * 0.95;
            y = (1 - row) * 0.95;
            break;
            
          case 'D':
            // Down face at -Y, rotated +90° around X
            // Rotation +90° X: local x → world X, local y → world +Z
            // 
            // D net layout (viewed from -Y, i.e., from below):
            //   0 1 2  (top row - towards F/+Z)
            //   3 4 5
            //   6 7 8  (bottom row - towards B/-Z)
            //
            // F.bottom = D positions [2,1,0]: F[6]↔D[2], F[7]↔D[1], F[8]↔D[0]
            // Note the reversal: F's left connects to D's right!
            // 
            // F[6] (col=0,row=2) at world (-X, -Y, +Z) = (-0.95, -0.95, +1.51)
            // D[2] (col=2,row=0) should be at world (-X, -Y, +Z)
            // F[8] (col=2,row=2) at world (+X, -Y, +Z) = (+0.95, -0.95, +1.51)
            // D[0] (col=0,row=0) should be at world (+X, -Y, +Z)
            //
            // For D[0]: need local x=+0.95 (→world +X), local y=+0.95 (→world +Z)
            // col=0: x = (1-col)*0.95 = 0.95 ✓
            // row=0: y = (1-row)*0.95 = 0.95 ✓
            x = (1 - col) * 0.95;
            y = (1 - row) * 0.95;
            break;
            
          case 'R':
            // Right face at +X, rotated +90° around Y  
            // local x → world -Z, local y → world Y
            // Net col 0 = left (towards F) = world +Z = local -X
            // Net row 0 = top = world +Y = local +Y ✓
            // So: col 0 → local x negative, col 2 → local x positive
            x = (col - 1) * 0.95;  // col 0→-0.95, col 2→+0.95
            // But wait, we need col 0 at local -X which maps to world +Z (towards F)
            // local -X → world +Z is wrong! local x → world -Z
            // So local -X → world +Z? No, local +X → world -Z, so local -X → world +Z
            // col 0 should be at world +Z, so local -X. col 0 - 1 = -1, so x = -0.95 ✓
            // But actually we need to reverse: the plane is facing +X, viewed from +X
            // When you look at R from outside (from +X), left side is at +Z (towards F)
            // col 0 (left in net) = left when viewing R from +X = world +Z = local -X
            // x = (col - 1) gives col 0 → -0.95 which is local -X... but does local -X = world +Z?
            // Rotation +90° Y: (x,y,z) → (z, y, -x), so local (1,0,0) → world (0,0,-1)
            // local +X → world -Z, so local -X → world +Z ✓
            // So x = (col - 1) * 0.95 is CORRECT for R
            y = (1 - row) * 0.95;
            break;
            
          case 'L':
            // Left face at -X, rotated -90° around Y
            // local x → world +Z, local y → world Y
            // Net col 0 = left (towards B) = world -Z = local -X
            // Net col 2 = right (towards F) = world +Z = local +X
            // Rotation -90° Y: local (1,0,0) → (0,0,1) = world +Z
            // So local +X → world +Z, local -X → world -Z
            // col 0 (left, towards B) should be at world -Z = local -X ✓
            // col 2 (right, towards F) should be at world +Z = local +X ✓
            // x = (col - 1) gives col 0 → -0.95, col 2 → +0.95 ✓
            x = (col - 1) * 0.95;
            y = (1 - row) * 0.95;
            break;
            
          default:
            x = (col - 1) * 0.95;
            y = (1 - row) * 0.95;
        }
        
        result.push({
          color: color ? COLOR_MAP[color] : '#333333',
          colorKey: color || undefined,
          localPos: [x, y],
          index
        });
      }
    }
    return result;
  }, [colors, faceName]);

  return (
    <group position={config.position} rotation={rotation}>
      {stickers.map(({ color, colorKey, localPos, index }) => (
        <Sticker
          key={index}
          color={color}
          colorKey={colorKey}
          position={[localPos[0], localPos[1], 0.01]}
          rotation={[0, 0, 0]}
          isGlowing={isHighlighted}
        />
      ))}
    </group>
  );
}

// Validate cube state has all required faces
function isValidCubeState(state: CubeState | null | undefined): state is CubeState {
  if (!state) return false;
  const faces: FaceName[] = ['U', 'D', 'F', 'B', 'L', 'R'];
  return faces.every(face => 
    Array.isArray(state[face]) && state[face].length === 9
  );
}

// Main cube component
function RubiksCube({ cubeState, highlightLayer, animatingMove, onMoveComplete, animationSpeed = 1 }: Cube3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const rotatingLayerRef = useRef<THREE.Group>(null);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [currentAnimation, setCurrentAnimation] = useState<{ face: string; angle: number } | null>(null);
  const [isAutoRotating, setIsAutoRotating] = useState(true);
  // Hard stop flag - checked every frame to immediately halt animation
  const shouldStopRef = useRef(false);
  
  // Safety check - don't render if cubeState is invalid
  if (!isValidCubeState(cubeState)) {
    console.warn('RubiksCube: Invalid cube state');
    return null;
  }
  
  // Handle new animation move OR immediate stop
  useEffect(() => {
    if (animatingMove) {
      // Starting a new animation
      shouldStopRef.current = false;
      const parsed = parseMoveNotation(animatingMove);
      if (parsed) {
        setCurrentAnimation(parsed);
        setAnimationProgress(0);
        setIsAutoRotating(false); // Pause auto-rotation during animation
      }
    } else {
      // IMMEDIATE STOP - set flag first so useFrame sees it immediately
      shouldStopRef.current = true;
      
      // Reset all animation state synchronously
      setCurrentAnimation(null);
      setAnimationProgress(0);
      setIsAutoRotating(true);
      
      // Reset rotation immediately
      if (rotatingLayerRef.current) {
        rotatingLayerRef.current.rotation.set(0, 0, 0);
      }
    }
  }, [animatingMove]);

  // Animation frame
  useFrame((_, delta) => {
    // HARD STOP CHECK - immediately bail out if stop flag is set
    if (shouldStopRef.current) {
      // Ensure rotation is reset even in useFrame
      if (rotatingLayerRef.current) {
        rotatingLayerRef.current.rotation.set(0, 0, 0);
      }
      return;
    }
    
    // Auto-rotate when not animating
    if (groupRef.current && isAutoRotating && !currentAnimation) {
      groupRef.current.rotation.y += delta * 0.1;
    }
    
    // Animate face rotation - only if we have a valid animation AND not stopped
    if (currentAnimation && rotatingLayerRef.current && !shouldStopRef.current) {
      const duration = 0.4 / animationSpeed; // Base duration adjusted by speed
      const progressIncrement = delta / duration;
      const newProgress = Math.min(animationProgress + progressIncrement, 1);
      setAnimationProgress(newProgress);
      
      // Apply eased rotation
      const easedProgress = easeInOutCubic(newProgress);
      const rotationConfig = FACE_ROTATION_AXIS[currentAnimation.face];
      
      if (rotationConfig) {
        const targetAngle = currentAnimation.angle * rotationConfig.direction;
        const currentAngle = targetAngle * easedProgress;
        
        rotatingLayerRef.current.rotation.set(0, 0, 0);
        if (rotationConfig.axis === 'x') rotatingLayerRef.current.rotation.x = currentAngle;
        if (rotationConfig.axis === 'y') rotatingLayerRef.current.rotation.y = currentAngle;
        if (rotationConfig.axis === 'z') rotatingLayerRef.current.rotation.z = currentAngle;
      }
      
      // Animation complete
      if (newProgress >= 1) {
        setCurrentAnimation(null);
        setAnimationProgress(0);
        setIsAutoRotating(true);
        if (onMoveComplete) onMoveComplete();
      }
    }
  });

  // Easing function for smooth animation
  function easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  const highlightedFaces = useMemo(() => {
    if (!highlightLayer) return new Set<FaceName>();
    // Map layers to faces that should glow
    const layerMap: Record<string, FaceName[]> = {
      'U': ['U'],
      'D': ['D'],
      'F': ['F'],
      'B': ['B'],
      'L': ['L'],
      'R': ['R'],
    };
    return new Set(layerMap[highlightLayer] || []);
  }, [highlightLayer]);

  // Determine which face is being animated
  const animatingFace = currentAnimation?.face as FaceName | undefined;

  return (
    <group ref={groupRef}>
      {/* Black cube core */}
      <RoundedBox args={[3, 3, 3]} radius={0.1} smoothness={4}>
        <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
      </RoundedBox>
      
      {/* Rotating layer group for animation */}
      <group ref={rotatingLayerRef}>
        {animatingFace && (
          <CubeFace
            key={`animating-${animatingFace}`}
            faceName={animatingFace}
            colors={cubeState[animatingFace]}
            isHighlighted={true}
          />
        )}
      </group>
      
      {/* Render non-animating faces */}
      {(Object.keys(FACE_CONFIG) as FaceName[]).map(faceName => {
        if (faceName === animatingFace) return null; // Skip animating face
        return (
          <CubeFace
            key={faceName}
            faceName={faceName}
            colors={cubeState[faceName]}
            isHighlighted={highlightedFaces.has(faceName)}
          />
        );
      })}
    </group>
  );
}

// Main exported component with Canvas
export default function Cube3DViewer({ 
  cubeState, 
  highlightLayer,
  animatingMove,
  onMoveComplete,
  animationSpeed = 1
}: Cube3DProps) {
  const [isRotating, setIsRotating] = useState(true);
  const [hasWebGLError, setHasWebGLError] = useState(false);

  // Check if cube state is valid
  if (!isValidCubeState(cubeState)) {
    return (
      <div className="retro-window">
        <div className="retro-title-bar">
          <span>🧊 3D Cube Viewer</span>
        </div>
        <div className="bg-gray-300 p-8 text-center">
          <div className="text-4xl mb-2">⚠️</div>
          <p className="text-black font-bold">Invalid Cube State</p>
          <p className="text-gray-600 text-sm">Please set up your cube first.</p>
        </div>
      </div>
    );
  }

  // Show error state if WebGL failed
  if (hasWebGLError) {
    return (
      <div className="retro-window">
        <div className="retro-title-bar">
          <span>🧊 3D Cube Viewer</span>
        </div>
        <div className="bg-gray-300 p-8 text-center">
          <div className="text-4xl mb-2">🎮</div>
          <p className="text-black font-bold">3D View Unavailable</p>
          <p className="text-gray-600 text-sm">WebGL is not supported or an error occurred.</p>
          <button 
            onClick={() => setHasWebGLError(false)} 
            className="retro-btn mt-4"
          >
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="retro-window">
      <div className="retro-title-bar">
        <div className="flex items-center gap-2">
          <span className="text-xl">🧊</span>
          <span>3D Cube Viewer</span>
          {animatingMove && (
            <span className="ml-2 px-2 py-0.5 bg-yellow-400 text-black text-xs rounded animate-pulse">
              {animatingMove}
            </span>
          )}
        </div>
        <div className="retro-title-buttons">
          <button 
            className="retro-title-btn"
            onClick={() => setIsRotating(!isRotating)}
            title={isRotating ? 'Stop rotation' : 'Start rotation'}
          >
            {isRotating ? '⏸' : '▶'}
          </button>
        </div>
      </div>
      
      <div className="bg-gray-800 relative w-full" style={{ height: 'clamp(300px, 50vw, 450px)' }}>
        <Canvas
          camera={{ position: [4, 3, 6], fov: 45 }}
          gl={{ antialias: true, failIfMajorPerformanceCaveat: false }}
          onCreated={({ gl }) => {
            // Check WebGL support
            if (!gl.capabilities.isWebGL2 && !gl.getContext()) {
              setHasWebGLError(true);
            }
          }}
          fallback={
            <div className="w-full h-full flex items-center justify-center bg-gray-700 text-white">
              <div className="text-center">
                <div className="text-4xl mb-2">🎮</div>
                <p>3D View Loading...</p>
              </div>
            </div>
          }
        >
          {/* Lighting - optimized for color distinction, especially red vs orange */}
          {/* Higher ambient prevents dark shadows that blend red/orange */}
          <ambientLight intensity={0.75} />
          {/* Main light from front-right-top - neutral white */}
          <directionalLight position={[10, 10, 5]} intensity={0.9} color="#ffffff" />
          {/* Fill light from back-left - slightly cool to enhance red distinction */}
          <directionalLight position={[-10, -5, -5]} intensity={0.5} color="#f0f5ff" />
          {/* Top light - warm to enhance orange visibility */}
          <pointLight position={[0, 12, 0]} intensity={0.4} color="#fff8f0" />
          {/* Front fill light to reduce face shadows during rotation */}
          <pointLight position={[0, 0, 10]} intensity={0.3} color="#ffffff" />
          
          {/* The cube */}
          <RubiksCube 
            cubeState={cubeState} 
            highlightLayer={highlightLayer}
            animatingMove={animatingMove}
            onMoveComplete={onMoveComplete}
            animationSpeed={animationSpeed}
          />
          
          {/* Controls */}
          <OrbitControls 
            enablePan={false}
            enableZoom={true}
            minDistance={5}
            maxDistance={15}
            autoRotate={isRotating}
            autoRotateSpeed={1}
          />
        </Canvas>
        
        {/* Overlay controls */}
        <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center">
          <div className="retro-panel px-2 py-1 text-xs text-black">
            🖱️ Drag to rotate • Scroll to zoom
          </div>
          <button
            onClick={() => setIsRotating(!isRotating)}
            className="retro-btn text-xs px-2 py-1"
          >
            {isRotating ? '⏸ Stop' : '▶ Auto-rotate'}
          </button>
        </div>
        
        {/* Face orientation legend - colors match enhanced COLOR_MAP */}
        <div className="absolute top-2 right-2 retro-panel p-1.5 text-xs">
          <div className="text-black font-bold mb-1">Face Legend:</div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-black">
            <span><span className="inline-block w-3 h-3 border-2 border-black mr-1" style={{backgroundColor: '#00A550'}}></span>F</span>
            <span><span className="inline-block w-3 h-3 border-2 border-black mr-1" style={{backgroundColor: '#0047AB'}}></span>B</span>
            <span><span className="inline-block w-3 h-3 border-2 border-black mr-1" style={{backgroundColor: '#9B0000'}}></span>R</span>
            <span><span className="inline-block w-3 h-3 border-2 border-black mr-1" style={{backgroundColor: '#FF8C00'}}></span>L</span>
            <span><span className="inline-block w-3 h-3 border-2 border-black mr-1" style={{backgroundColor: '#FFFFFF'}}></span>U</span>
            <span><span className="inline-block w-3 h-3 border-2 border-black mr-1" style={{backgroundColor: '#FFEB3B'}}></span>D</span>
          </div>
        </div>
      </div>
    </div>
  );
}
