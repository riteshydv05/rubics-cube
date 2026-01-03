import { memo, useState, useEffect, useCallback } from 'react';
import type { CubeState, FaceName, CubeColor } from '../types/cube';
import { COLOR_HEX } from '../types/cube';

interface CubeNetUnfoldingProps {
  state: Partial<CubeState>;
  onScanClick?: () => void;
  autoAnimate?: boolean;
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

function CubeNetUnfolding({ state, onScanClick, autoAnimate = true }: CubeNetUnfoldingProps) {
  const [isUnfolded, setIsUnfolded] = useState(!autoAnimate);
  const [animationPhase, setAnimationPhase] = useState(autoAnimate ? 0 : 6);

  // Animation sequence: 0 = start, 1 = F visible, 2 = U unfolds, 3 = L/R unfold, 4 = B unfolds, 5 = D unfolds
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

  const handleReplay = useCallback(() => {
    setIsUnfolded(false);
    setAnimationPhase(0);
  }, []);

  // Get face colors from state or use defaults
  const getFaceColors = (faceName: FaceName): CubeColor[] => {
    return state[faceName] || DEFAULT_FACE[faceName];
  };

  return (
    <div className="cube-net-unfolding-container">
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
      {autoAnimate && isUnfolded && (
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
            <FaceComponent colors={getFaceColors('U')} />
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
            <FaceComponent colors={getFaceColors('L')} />
          </div>
          <div 
            className="cube-net-face"
            style={{
              opacity: animationPhase >= 1 ? 1 : 0,
            }}
          >
            <FaceComponent colors={getFaceColors('F')} />
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
            <FaceComponent colors={getFaceColors('R')} />
          </div>
          <div 
            className={`cube-net-face ${animationPhase >= 4 ? 'unfolded' : 'folded-right'}`}
            style={{
              transformOrigin: 'left center',
              transform: animationPhase >= 4 ? 'rotateY(0deg)' : 'rotateY(-90deg)',
              opacity: animationPhase >= 4 ? 1 : 0,
            }}
          >
            <FaceComponent colors={getFaceColors('B')} />
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
            <FaceComponent colors={getFaceColors('D')} />
          </div>
          <div className="cube-net-face-spacer" />
          <div className="cube-net-face-spacer" />
        </div>
      </div>

      <style>{`
        .cube-net-unfolding-container {
          position: relative;
          width: 100%;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background: linear-gradient(145deg, #f8f9fa 0%, #e9ecef 100%);
          border-radius: 16px;
          box-shadow: 
            0 10px 40px rgba(0, 0, 0, 0.08),
            inset 0 1px 0 rgba(255, 255, 255, 0.8);
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
          transition: filter 0.15s ease;
        }

        .cube-net-cell:hover {
          filter: brightness(1.1);
        }
      `}</style>
    </div>
  );
}

// Individual Face Component
interface FaceComponentProps {
  colors: CubeColor[];
}

const FaceComponent = memo(({ colors }: FaceComponentProps) => {
  return (
    <div 
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(3, ${CELL_SIZE}px)`,
        gridTemplateRows: `repeat(3, ${CELL_SIZE}px)`,
        gap: `${CELL_GAP}px`,
      }}
    >
      {colors.map((color, index) => {
        const fillColor = color ? COLOR_HEX[color] : '#CCCCCC';

        return (
          <div
            key={index}
            className="cube-net-cell"
            style={{
              width: CELL_SIZE,
              height: CELL_SIZE,
              backgroundColor: fillColor,
              border: '2px solid #1a1a1a',
              borderRadius: '3px',
              position: 'relative',
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.2)',
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
