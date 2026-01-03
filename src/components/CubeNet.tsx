import { memo, useMemo, useCallback } from 'react';
import type { CubeState, FaceName, CubeColor } from '../types/cube';
import { COLOR_HEX } from '../types/cube';

interface CubeNetProps {
  state: Partial<CubeState>;
  onFaceClick?: (face: FaceName) => void;
  highlightFace?: FaceName | null;
}

// Face layout configuration - defined outside component
const FACE_POSITIONS: Record<FaceName, { x: number; y: number }> = {
  U: { x: 135, y: 20 },
  L: { x: 15, y: 130 },
  F: { x: 135, y: 130 },
  R: { x: 255, y: 130 },
  B: { x: 15, y: 240 },
  D: { x: 135, y: 350 },
};

const FACE_ORDER: FaceName[] = ['U', 'L', 'F', 'R', 'B', 'D'];

function CubeNet({ state, onFaceClick, highlightFace }: CubeNetProps) {
  // Memoize complete faces count
  const completeFacesCount = useMemo(() => 
    Object.values(state).filter(f => f && f.length === 9 && f.every(c => c !== null)).length,
    [state]
  );

  return (
    <div className="retro-window">
      {/* Retro Title Bar */}
      <div className="retro-title-bar">
        <div className="flex items-center gap-2">
          <span className="text-xl">🧊</span>
          <span>Cube State Viewer</span>
        </div>
        <div className="retro-title-buttons">
          <button className="retro-title-btn">_</button>
          <button className="retro-title-btn">□</button>
          <button className="retro-title-btn" style={{ color: '#e94560' }}>×</button>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-2 sm:p-4 bg-gray-300">
        <svg
          viewBox="0 0 360 450"
          className="w-full max-w-xs sm:max-w-sm md:max-w-md mx-auto"
          style={{ 
            maxHeight: '350px',
            filter: 'drop-shadow(4px 4px 0 rgba(0,0,0,0.3))'
          }}
        >
          {/* Background Grid Pattern */}
          <defs>
            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <rect width="10" height="10" fill="#c0c0c0"/>
              <rect width="1" height="1" fill="#a0a0a0"/>
            </pattern>
          </defs>

          {FACE_ORDER.map(faceName => (
            <FaceGroup
              key={faceName}
              faceName={faceName}
              face={state[faceName]}
              position={FACE_POSITIONS[faceName]}
              isHighlighted={highlightFace === faceName}
              onClick={onFaceClick}
            />
          ))}
        </svg>

        {/* Status Bar */}
        <div className="mt-3 sm:mt-4 retro-panel">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-black">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 sm:w-4 sm:h-4 ${completeFacesCount === 6 ? 'led-on' : 'led-off'}`} />
              <span className="font-bold text-sm sm:text-base">Status: {completeFacesCount === 6 ? 'COMPLETE' : 'SCANNING'}</span>
            </div>
            <div className="flex gap-1">
              {[...Array(6)].map((_, i) => (
                <div 
                  key={i}
                  className={`w-5 h-5 sm:w-6 sm:h-6 border-2 flex items-center justify-center text-xs font-bold
                    ${i < completeFacesCount ? 'bg-green-500 text-white' : 'bg-gray-400 text-gray-600'}`}
                  style={{ borderColor: '#fff #666 #666 #fff' }}
                >
                  {FACE_ORDER[i]}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Memoized face group component
interface FaceGroupProps {
  faceName: FaceName;
  face: CubeColor[] | undefined;
  position: { x: number; y: number };
  isHighlighted: boolean;
  onClick?: (face: FaceName) => void;
}

const FaceGroup = memo(({ faceName, face, position, isHighlighted, onClick }: FaceGroupProps) => {
  const isComplete = face && face.length === 9 && face.every(c => c !== null);
  
  const handleClick = useCallback(() => {
    onClick?.(faceName);
  }, [onClick, faceName]);

  return (
    <g
      transform={`translate(${position.x}, ${position.y})`}
      onClick={handleClick}
      className={onClick ? 'cursor-pointer' : ''}
      style={{ filter: isHighlighted ? 'drop-shadow(0 0 8px #00d9ff)' : 'none' }}
    >
      {/* Retro 3D Border Effect */}
      <rect
        x="-4"
        y="-4"
        width="98"
        height="98"
        fill="#808080"
      />
      <rect
        x="-2"
        y="-2"
        width="94"
        height="94"
        fill="#dfdfdf"
      />
      <rect
        x="0"
        y="0"
        width="90"
        height="90"
        fill={isComplete ? '#c0c0c0' : '#e0e0e0'}
        stroke={isHighlighted ? '#00d9ff' : '#404040'}
        strokeWidth={isHighlighted ? '3' : '2'}
      />

      {/* 3x3 grid or empty label */}
      {face ? (
        <FaceGrid colors={face} />
      ) : (
        <>
          {/* Empty state with retro styling */}
          <rect x="5" y="5" width="80" height="80" fill="url(#grid)" opacity="0.3" />
          <text
            x="45"
            y="55"
            textAnchor="middle"
            fill="#666666"
            fontSize="32"
            fontFamily="VT323, monospace"
            fontWeight="bold"
          >
            {faceName}
          </text>
        </>
      )}

      {/* Face label with retro badge */}
      <rect
        x="30"
        y="-18"
        width="30"
        height="16"
        fill="#000080"
        stroke="#ffffff"
        strokeWidth="1"
      />
      <text
        x="45"
        y="-6"
        textAnchor="middle"
        fill="#ffffff"
        fontSize="12"
        fontFamily="VT323, monospace"
        fontWeight="bold"
      >
        {faceName}
      </text>
    </g>
  );
});
FaceGroup.displayName = 'FaceGroup';

// Memoized grid component with retro styling
const FaceGrid = memo(({ colors }: { colors: CubeColor[] }) => (
  <>
    {colors.map((color, index) => {
      const x = (index % 3) * 30;
      const y = Math.floor(index / 3) * 30;
      return (
        <g key={index}>
          {/* 3D border effect for each cell */}
          <rect
            x={x}
            y={y}
            width="30"
            height="30"
            fill={color ? COLOR_HEX[color] : '#ffffff'}
            stroke="#404040"
            strokeWidth="1"
          />
          {/* Highlight effect */}
          <rect
            x={x + 2}
            y={y + 2}
            width="26"
            height="2"
            fill="rgba(255,255,255,0.4)"
          />
          <rect
            x={x + 2}
            y={y + 2}
            width="2"
            height="26"
            fill="rgba(255,255,255,0.4)"
          />
          {/* Shadow effect */}
          <rect
            x={x + 2}
            y={y + 26}
            width="26"
            height="2"
            fill="rgba(0,0,0,0.2)"
          />
          <rect
            x={x + 26}
            y={y + 2}
            width="2"
            height="26"
            fill="rgba(0,0,0,0.2)"
          />
        </g>
      );
    })}
  </>
));
FaceGrid.displayName = 'FaceGrid';

export default memo(CubeNet);
