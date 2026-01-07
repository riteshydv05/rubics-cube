import { memo, useState, useEffect, useCallback, useRef } from 'react';
import type { CubeState, FaceName, CubeColor } from '../types/cube';
import { COLOR_HEX } from '../types/cube';

interface CubeNetUnfoldingProps {
  state: Partial<CubeState>;
  onScanClick?: () => void;
  autoAnimate?: boolean;
  animatingMove?: string | null; // Move notation like "R", "U'", "F2"
}

// Default solved state for each face
const DEFAULT_FACE: Record<FaceName, CubeColor[]> = {
  U: ['W', 'W', 'W', 'W', 'W', 'W', 'W', 'W', 'W'],
  L: ['O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O'],
  F: ['G', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'G'],
  R: ['R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R'],
  B: ['B', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B'],
  D: ['Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y'],
};

// Cell and face dimensions
const CELL_SIZE = 36;
const CELL_GAP = 2;
const FACE_SIZE = CELL_SIZE * 3 + CELL_GAP * 2;

// Define which cells are affected by each move type
const MOVE_AFFECTED_CELLS: Record<string, { face: FaceName; cells: number[] }[]> = {
  'U': [
    { face: 'U', cells: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
    { face: 'F', cells: [0, 1, 2] },
    { face: 'R', cells: [0, 1, 2] },
    { face: 'B', cells: [0, 1, 2] },
    { face: 'L', cells: [0, 1, 2] },
  ],
  'D': [
    { face: 'D', cells: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
    { face: 'F', cells: [6, 7, 8] },
    { face: 'R', cells: [6, 7, 8] },
    { face: 'B', cells: [6, 7, 8] },
    { face: 'L', cells: [6, 7, 8] },
  ],
  'F': [
    { face: 'F', cells: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
    { face: 'U', cells: [6, 7, 8] },
    { face: 'R', cells: [0, 3, 6] },
    { face: 'D', cells: [0, 1, 2] },
    { face: 'L', cells: [2, 5, 8] },
  ],
  'B': [
    { face: 'B', cells: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
    { face: 'U', cells: [0, 1, 2] },
    { face: 'L', cells: [0, 3, 6] },
    { face: 'D', cells: [6, 7, 8] },
    { face: 'R', cells: [2, 5, 8] },
  ],
  'R': [
    { face: 'R', cells: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
    { face: 'F', cells: [2, 5, 8] },
    { face: 'U', cells: [2, 5, 8] },
    { face: 'B', cells: [0, 3, 6] },
    { face: 'D', cells: [2, 5, 8] },
  ],
  'L': [
    { face: 'L', cells: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
    { face: 'F', cells: [0, 3, 6] },
    { face: 'U', cells: [0, 3, 6] },
    { face: 'B', cells: [2, 5, 8] },
    { face: 'D', cells: [0, 3, 6] },
  ],
};

// Parse move notation
function parseMove(notation: string | null | undefined): { face: string; isPrime: boolean; isDouble: boolean } | null {
  if (!notation) return null;
  const face = notation[0].toUpperCase();
  const isPrime = notation.includes("'");
  const isDouble = notation.includes("2");
  return { face, isPrime, isDouble };
}

// Check if a cell is affected by a move
function isCellAffected(moveFace: string, faceName: FaceName, cellIndex: number): boolean {
  const affected = MOVE_AFFECTED_CELLS[moveFace];
  if (!affected) return false;
  
  for (const item of affected) {
    if (item.face === faceName && item.cells.includes(cellIndex)) {
      return true;
    }
  }
  return false;
}

function CubeNetUnfolding({ state, onScanClick, autoAnimate = true, animatingMove }: CubeNetUnfoldingProps) {
  const [isUnfolded, setIsUnfolded] = useState(!autoAnimate);
  const [animationPhase, setAnimationPhase] = useState(autoAnimate ? 0 : 6);
  const [isAnimatingMove, setIsAnimatingMove] = useState(false);
  const [moveAnimationProgress, setMoveAnimationProgress] = useState(0);
  const [currentMoveFace, setCurrentMoveFace] = useState<string | null>(null);
  const [isPrime, setIsPrime] = useState(false);
  const prevStateRef = useRef<Partial<CubeState>>(state);
  const animationFrameRef = useRef<number | null>(null);
  const lastMoveRef = useRef<string | null>(null);

  // Unfolding animation sequence
  useEffect(() => {
    if (!autoAnimate) {
      setIsUnfolded(true);
      setAnimationPhase(6);
      return;
    }

    const delays = [200, 400, 400, 400, 400, 400];
    const timer = setTimeout(() => {
      if (animationPhase < 6) {
        setAnimationPhase(prev => prev + 1);
      }
      if (animationPhase === 5) {
        setIsUnfolded(true);
      }
    }, delays[animationPhase] || 400);

    return () => clearTimeout(timer);
  }, [animationPhase, autoAnimate]);

  // Handle move animation
  useEffect(() => {
    // Only trigger animation if it's a new move
    if (animatingMove && animatingMove !== lastMoveRef.current) {
      lastMoveRef.current = animatingMove;
      const parsed = parseMove(animatingMove);
      
      if (parsed) {
        // Cancel any existing animation
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        
        setCurrentMoveFace(parsed.face);
        setIsPrime(parsed.isPrime);
        setIsAnimatingMove(true);
        setMoveAnimationProgress(0);
        
        const duration = 350; // ms
        const startTime = Date.now();
        
        const animate = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);
          // Ease in-out cubic for smoother animation
          const eased = progress < 0.5 
            ? 4 * progress * progress * progress 
            : 1 - Math.pow(-2 * progress + 2, 3) / 2;
          
          setMoveAnimationProgress(eased);
          
          if (progress < 1) {
            animationFrameRef.current = requestAnimationFrame(animate);
          } else {
            setIsAnimatingMove(false);
            setMoveAnimationProgress(0);
            setCurrentMoveFace(null);
            prevStateRef.current = state;
          }
        };
        
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    } else if (!animatingMove) {
      lastMoveRef.current = null;
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [animatingMove, state]);

  // Update prev state ref when state changes and not animating
  useEffect(() => {
    if (!isAnimatingMove && !animatingMove) {
      prevStateRef.current = state;
    }
  }, [state, isAnimatingMove, animatingMove]);

  const handleReplay = useCallback(() => {
    setIsUnfolded(false);
    setAnimationPhase(0);
  }, []);

  // Get face colors from state or use defaults
  const getFaceColors = (faceName: FaceName): CubeColor[] => {
    return state[faceName] || DEFAULT_FACE[faceName];
  };

  // Get move indicator text
  const getMoveIndicator = () => {
    if (!animatingMove) return null;
    const parsed = parseMove(animatingMove);
    if (!parsed) return null;
    
    const { face, isPrime: prime, isDouble } = parsed;
    const direction = prime ? "'" : (isDouble ? "2" : "");
    return `${face}${direction}`;
  };

  return (
    <div className="cube-net-unfolding-container">
      {/* Move Indicator */}
      {animatingMove && (
        <div className="cube-net-move-indicator" key={animatingMove}>
          <span className="move-text">{getMoveIndicator()}</span>
        </div>
      )}

      {/* Scan Button */}
      {onScanClick && (
        <button
          onClick={onScanClick}
          className="cube-net-scan-button"
        >
          <span className="cube-net-scan-icon">📷</span>
          <span>Scan</span>
        </button>
      )}

      {/* Replay Animation Button */}
      {autoAnimate && isUnfolded && !animatingMove && (
        <button
          onClick={handleReplay}
          className="cube-net-replay-button"
          title="Replay unfolding animation"
        >
          🔄
        </button>
      )}

      {/* Cube Net Grid Layout */}
      <div className="cube-net-grid" style={{ perspective: '1000px' }}>
        {/* Row 1: Empty - Up - Empty - Empty */}
        <div className="cube-net-row">
          <div className="cube-net-face-spacer" />
          <div 
            className={`cube-net-face ${animationPhase >= 2 ? 'unfolded' : 'folded-up'}`}
            style={{
              transformOrigin: 'center bottom',
              transform: animationPhase >= 2 ? 'rotateX(0deg)' : 'rotateX(-90deg)',
              opacity: animationPhase >= 2 ? 1 : 0,
            }}
          >
            <FaceComponent 
              colors={getFaceColors('U')} 
              faceName="U"
              animatingMove={currentMoveFace}
              animationProgress={moveAnimationProgress}
              isPrime={isPrime}
            />
          </div>
          <div className="cube-net-face-spacer" />
          <div className="cube-net-face-spacer" />
        </div>

        {/* Row 2: Left - Front - Right - Back */}
        <div className="cube-net-row">
          <div 
            className={`cube-net-face ${animationPhase >= 3 ? 'unfolded' : 'folded-left'}`}
            style={{
              transformOrigin: 'right center',
              transform: animationPhase >= 3 ? 'rotateY(0deg)' : 'rotateY(90deg)',
              opacity: animationPhase >= 3 ? 1 : 0,
            }}
          >
            <FaceComponent 
              colors={getFaceColors('L')} 
              faceName="L"
              animatingMove={currentMoveFace}
              animationProgress={moveAnimationProgress}
              isPrime={isPrime}
            />
          </div>
          <div 
            className="cube-net-face"
            style={{
              opacity: animationPhase >= 1 ? 1 : 0,
            }}
          >
            <FaceComponent 
              colors={getFaceColors('F')} 
              faceName="F"
              animatingMove={currentMoveFace}
              animationProgress={moveAnimationProgress}
              isPrime={isPrime}
            />
          </div>
          <div 
            className={`cube-net-face ${animationPhase >= 3 ? 'unfolded' : 'folded-right'}`}
            style={{
              transformOrigin: 'left center',
              transform: animationPhase >= 3 ? 'rotateY(0deg)' : 'rotateY(-90deg)',
              opacity: animationPhase >= 3 ? 1 : 0,
              transitionDelay: '0.1s',
            }}
          >
            <FaceComponent 
              colors={getFaceColors('R')} 
              faceName="R"
              animatingMove={currentMoveFace}
              animationProgress={moveAnimationProgress}
              isPrime={isPrime}
            />
          </div>
          <div 
            className={`cube-net-face ${animationPhase >= 4 ? 'unfolded' : 'folded-right'}`}
            style={{
              transformOrigin: 'left center',
              transform: animationPhase >= 4 ? 'rotateY(0deg)' : 'rotateY(-90deg)',
              opacity: animationPhase >= 4 ? 1 : 0,
            }}
          >
            <FaceComponent 
              colors={getFaceColors('B')} 
              faceName="B"
              animatingMove={currentMoveFace}
              animationProgress={moveAnimationProgress}
              isPrime={isPrime}
            />
          </div>
        </div>

        {/* Row 3: Empty - Down - Empty - Empty */}
        <div className="cube-net-row">
          <div className="cube-net-face-spacer" />
          <div 
            className={`cube-net-face ${animationPhase >= 5 ? 'unfolded' : 'folded-down'}`}
            style={{
              transformOrigin: 'center top',
              transform: animationPhase >= 5 ? 'rotateX(0deg)' : 'rotateX(90deg)',
              opacity: animationPhase >= 5 ? 1 : 0,
            }}
          >
            <FaceComponent 
              colors={getFaceColors('D')} 
              faceName="D"
              animatingMove={currentMoveFace}
              animationProgress={moveAnimationProgress}
              isPrime={isPrime}
            />
          </div>
          <div className="cube-net-face-spacer" />
          <div className="cube-net-face-spacer" />
        </div>
      </div>

      <style>{`
        .cube-net-unfolding-container {
          position: relative;
          width: 100%;
          max-width: 100%;
          margin: 0 auto;
          padding: clamp(12px, 3vw, 24px);
          background: linear-gradient(145deg, #f8f9fa 0%, #e9ecef 100%);
          border-radius: 16px;
          box-shadow: 
            0 10px 40px rgba(0, 0, 0, 0.08),
            inset 0 1px 0 rgba(255, 255, 255, 0.8);
        }

        .cube-net-move-indicator {
          position: absolute;
          top: 16px;
          left: 50%;
          transform: translateX(-50%);
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 8px 24px;
          border-radius: 20px;
          font-family: 'SF Mono', Monaco, monospace;
          font-size: 20px;
          font-weight: bold;
          z-index: 20;
          animation: pulse-glow 0.35s ease-in-out;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        }

        @keyframes pulse-glow {
          0% { transform: translateX(-50%) scale(0.8); opacity: 0; }
          50% { transform: translateX(-50%) scale(1.1); }
          100% { transform: translateX(-50%) scale(1); opacity: 1; }
        }

        .cube-net-scan-button {
          position: absolute;
          top: 16px;
          right: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          background: #1a1a2e;
          color: white;
          border: none;
          border-radius: 30px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
          z-index: 10;
        }

        .cube-net-scan-button:hover {
          background: #2a2a4e;
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
        }

        .cube-net-scan-button:active {
          transform: translateY(0);
        }

        .cube-net-scan-icon {
          font-size: 20px;
        }

        .cube-net-replay-button {
          position: absolute;
          top: 16px;
          left: 16px;
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.08);
          border: none;
          border-radius: 50%;
          font-size: 20px;
          cursor: pointer;
          transition: all 0.3s ease;
          z-index: 10;
        }

        .cube-net-replay-button:hover {
          background: rgba(0, 0, 0, 0.15);
          transform: rotate(180deg);
        }

        .cube-net-grid {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-top: 50px;
          align-items: center;
        }

        .cube-net-row {
          display: flex;
          gap: 4px;
        }

        .cube-net-face {
          width: ${FACE_SIZE}px;
          height: ${FACE_SIZE}px;
          transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease;
          transform-style: preserve-3d;
        }

        .cube-net-face-spacer {
          width: ${FACE_SIZE}px;
          height: ${FACE_SIZE}px;
        }

        .cube-net-cell {
          transition: all 0.15s ease;
        }

        .cube-net-cell:hover {
          filter: brightness(1.1);
        }

        .cube-net-cell.animating {
          animation: cell-flash 0.35s ease-out;
        }

        @keyframes cell-flash {
          0% { transform: scale(1); filter: brightness(1); }
          30% { transform: scale(1.15); filter: brightness(1.3); }
          100% { transform: scale(1); filter: brightness(1); }
        }

        .cube-net-cell.rotating {
          transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>
    </div>
  );
}

// Individual Face Component
interface FaceComponentProps {
  colors: CubeColor[];
  faceName: FaceName;
  animatingMove: string | null;
  animationProgress: number;
  isPrime: boolean;
}

const FaceComponent = memo(({ colors, faceName, animatingMove, animationProgress, isPrime }: FaceComponentProps) => {
  // Calculate rotation for the entire face if it's the main rotating face
  const isMainFace = animatingMove === faceName;
  const direction = isPrime ? -1 : 1;
  const rotationDegree = isMainFace ? animationProgress * 90 * direction : 0;
  
  return (
    <div 
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(3, ${CELL_SIZE}px)`,
        gridTemplateRows: `repeat(3, ${CELL_SIZE}px)`,
        gap: `${CELL_GAP}px`,
        transform: isMainFace ? `rotate(${rotationDegree}deg)` : 'none',
        transition: 'none',
      }}
    >
      {colors.map((color, index) => {
        const fillColor = color ? COLOR_HEX[color] : '#CCCCCC';
        const isAffected = animatingMove ? isCellAffected(animatingMove, faceName, index) : false;
        const isAnimating = isAffected && animationProgress > 0 && animationProgress < 1;

        return (
          <div
            key={index}
            className={`cube-net-cell ${isAnimating ? 'animating' : ''}`}
            style={{
              width: CELL_SIZE,
              height: CELL_SIZE,
              backgroundColor: fillColor,
              border: '2px solid #1a1a1a',
              borderRadius: '3px',
              position: 'relative',
              boxShadow: isAnimating 
                ? `inset 0 0 0 1px rgba(255,255,255,0.2), 0 0 10px rgba(255,255,255,0.5)` 
                : 'inset 0 0 0 1px rgba(255,255,255,0.2)',
              transform: isAnimating ? `scale(${1 + 0.1 * Math.sin(animationProgress * Math.PI)})` : 'scale(1)',
            }}
          >
            {/* Highlight effect */}
            <div 
              style={{
                position: 'absolute',
                top: 2,
                left: 2,
                right: 2,
                height: 4,
                background: 'rgba(255,255,255,0.3)',
                borderRadius: '2px',
              }}
            />
          </div>
        );
      })}
    </div>
  );
});
FaceComponent.displayName = 'FaceComponent';

export default memo(CubeNetUnfolding);
