import { useState, useCallback, useEffect, memo } from 'react';
import type { CubeColor, Face, FaceName, CubeState } from '../types/cube';
import { COLOR_HEX, COLOR_NAMES } from '../types/cube';

interface FaceEditorProps {
  face: Face;
  faceName: FaceName;
  onUpdate: (newFace: Face) => void;
  isActive: boolean;
  centerColor: CubeColor;
  highlightedPositions?: number[]; // Positions to highlight for errors
  cubeState?: CubeState; // Full cube state to show adjacent colors
}

const COLORS: Array<NonNullable<CubeColor>> = ['W', 'Y', 'R', 'O', 'G', 'B'];

// Layout of 9 positions: [0, 1, 2, 3, CENTER(4), 5, 6, 7, 8]
// CENTER at index 4 is locked and predefined
const TILE_POSITIONS = [0, 1, 2, 3, 5, 6, 7, 8]; // All except center

// Tooltip component for consistent tooltips
const Tooltip = ({ children, text, position = 'top' }: { 
  children: React.ReactNode; 
  text: string;
  position?: 'top' | 'bottom';
}) => (
  <div className="tooltip-wrapper group relative inline-flex">
    {children}
    <span 
      className="tooltip-content"
      style={position === 'bottom' ? { bottom: 'auto', top: 'calc(100% + 8px)' } : {}}
    >
      {text}
    </span>
  </div>
);

// Define adjacent faces and their edge positions for each face
// For each face, we define: top (3 cells), right (3 cells), bottom (3 cells), left (3 cells)
const ADJACENT_FACES: Record<FaceName, {
  top: { face: FaceName; positions: number[] };
  right: { face: FaceName; positions: number[] };
  bottom: { face: FaceName; positions: number[] };
  left: { face: FaceName; positions: number[] };
}> = {
  F: {
    top: { face: 'U', positions: [6, 7, 8] },
    right: { face: 'R', positions: [0, 3, 6] },
    bottom: { face: 'D', positions: [2, 1, 0] },
    left: { face: 'L', positions: [8, 5, 2] },
  },
  R: {
    top: { face: 'U', positions: [8, 5, 2] },
    right: { face: 'B', positions: [0, 3, 6] },
    bottom: { face: 'D', positions: [8, 5, 2] },
    left: { face: 'F', positions: [8, 5, 2] },
  },
  B: {
    top: { face: 'U', positions: [2, 1, 0] },
    right: { face: 'L', positions: [0, 3, 6] },
    bottom: { face: 'D', positions: [6, 7, 8] },
    left: { face: 'R', positions: [8, 5, 2] },
  },
  L: {
    top: { face: 'U', positions: [0, 3, 6] },
    right: { face: 'F', positions: [0, 3, 6] },
    bottom: { face: 'D', positions: [0, 3, 6] },
    left: { face: 'B', positions: [8, 5, 2] },
  },
  U: {
    top: { face: 'B', positions: [2, 1, 0] },
    right: { face: 'R', positions: [2, 1, 0] },
    bottom: { face: 'F', positions: [2, 1, 0] },
    left: { face: 'L', positions: [2, 1, 0] },
  },
  D: {
    top: { face: 'F', positions: [6, 7, 8] },
    right: { face: 'R', positions: [6, 7, 8] },
    bottom: { face: 'B', positions: [6, 7, 8] },
    left: { face: 'L', positions: [6, 7, 8] },
  },
};

function FaceEditor({ face, faceName, onUpdate, isActive, centerColor, highlightedPositions = [], cubeState }: FaceEditorProps) {
  const [selectedColor, setSelectedColor] = useState<CubeColor | null>(null);
  const [colorCounts, setColorCounts] = useState<Record<NonNullable<CubeColor>, number>>({
    W: 0, Y: 0, R: 0, O: 0, G: 0, B: 0
  });

  // Count colors on this face (excluding center)
  useEffect(() => {
    const counts: Record<NonNullable<CubeColor>, number> = {
      W: 0, Y: 0, R: 0, O: 0, G: 0, B: 0
    };
    TILE_POSITIONS.forEach(i => {
      const color = face[i];
      if (color) counts[color]++;
    });
    setColorCounts(counts);
  }, [face]);

  // Paint a cell with the selected color
  const handleCellClick = useCallback((index: number) => {
    if (!isActive || index === 4) return; // Can't edit center
    
    // If no color selected, do nothing
    if (!selectedColor) return;
    
    const newFace = [...face];
    newFace[index] = selectedColor;
    
    onUpdate(newFace);
  }, [isActive, selectedColor, face, onUpdate]);

  // Select a color to paint with
  const handleColorSelect = useCallback((color: CubeColor) => {
    if (!isActive) return;
    setSelectedColor(color);
  }, [isActive]);

  // Keyboard shortcuts to select colors
  useEffect(() => {
    if (!isActive) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase() as any;
      
      if (COLORS.includes(key as NonNullable<CubeColor>)) {
        e.preventDefault();
        setSelectedColor(key as NonNullable<CubeColor>);
      } else if (key === 'DELETE' || key === 'BACKSPACE') {
        e.preventDefault();
        setSelectedColor(null);
      } else if (key === 'ESCAPE') {
        e.preventDefault();
        setSelectedColor(null);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isActive]);

  const getFaceDescription = (name: FaceName): string => {
    const descriptions: Record<FaceName, string> = {
      F: 'Front - Green',
      R: 'Right - Red',
      B: 'Back - Blue',
      L: 'Left - Orange',
      U: 'Top - White',
      D: 'Bottom - Yellow'
    };
    return descriptions[name];
  };

  // Get orientation instructions for how to hold the cube when filling this face
  const getOrientationHint = (name: FaceName): string => {
    const hints: Record<FaceName, string> = {
      F: '👁️ Look directly at Green face (White up)',
      R: '👉 Rotate cube so Red faces you (White up)',
      B: '🔄 Rotate cube 180° so Blue faces you (White up)',
      L: '👈 Rotate cube so Orange faces you (White up)',
      U: '⬆️ Look down at White face (Green toward you)',
      D: '⬇️ Flip cube, look at Yellow (Green toward you)'
    };
    return hints[name];
  };

  const getFilledCount = () => TILE_POSITIONS.filter(i => face[i]).length;
  const isComplete = getFilledCount() === 8;

  return (
    <div className={`retro-window transition-smooth ${isActive ? 'active-face-indicator' : ''}`}>
      {/* Retro Title Bar */}
      <div className="retro-title-bar">
        <div className="flex items-center gap-2">
          <span className="icon-md">✏️</span>
          <span className="font-bold">{getFaceDescription(faceName)}</span>
          <span className="opacity-75">({getFilledCount()}/8)</span>
        </div>
        <div className="flex items-center gap-2">
          {isComplete && (
            <span className="status-badge status-badge-success text-xs">
              ✓ Complete
            </span>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="p-3 sm:p-4 bg-gray-300">
        {/* Orientation Hint - with tooltip */}
        <Tooltip text="This shows how to hold your physical cube when entering colors for this face">
          <div className="mb-2 retro-panel px-3 py-2 bg-blue-100 cursor-help hover:bg-blue-50 transition-colors">
            <span className="text-xs sm:text-sm text-black font-medium icon-text">
              <span className="icon-md">🧭</span>
              {getOrientationHint(faceName)}
            </span>
          </div>
        </Tooltip>
        
        {/* Status */}
        <div className="mb-3 sm:mb-4 flex items-center justify-between gap-2">
          <div className={`status-indicator ${isActive ? 'status-active' : 'status-inactive'}`}>
            <span className="text-black text-xs sm:text-sm font-bold">
              {isActive ? 'ACTIVE' : 'INACTIVE'}
            </span>
          </div>
          {selectedColor && (
            <div className="status-badge status-badge-info text-xs">
              <span>🎨 Painting: {COLOR_NAMES[selectedColor]}</span>
            </div>
          )}
        </div>

        {/* 3x3 Grid with surrounding context */}
        <div className="retro-panel p-2 sm:p-4 mb-3 sm:mb-4">
          {/* Get adjacent colors */}
          {cubeState && (
            <>
              {/* Top adjacent row */}
              <div className="flex justify-center mb-1">
                <div className="flex gap-0.5">
                  {ADJACENT_FACES[faceName].top.positions.map((pos, i) => {
                    const adjFace = ADJACENT_FACES[faceName].top.face;
                    const adjColor = cubeState[adjFace]?.[pos];
                    return (
                      <div
                        key={`top-${i}`}
                        className="w-8 h-4 sm:w-12 sm:h-5 rounded-t-sm opacity-70"
                        style={{
                          backgroundColor: adjColor ? COLOR_HEX[adjColor] : '#ccc',
                          border: '1px solid rgba(0,0,0,0.2)',
                        }}
                        title={`${adjFace} face`}
                      />
                    );
                  })}
                </div>
              </div>
            </>
          )}
          
          <div className="flex justify-center">
            {/* Left adjacent column */}
            {cubeState && (
              <div className="flex flex-col gap-0.5 mr-1 justify-center">
                {ADJACENT_FACES[faceName].left.positions.map((pos, i) => {
                  const adjFace = ADJACENT_FACES[faceName].left.face;
                  const adjColor = cubeState[adjFace]?.[pos];
                  return (
                    <div
                      key={`left-${i}`}
                      className="w-4 h-8 sm:w-5 sm:h-12 rounded-l-sm opacity-70"
                      style={{
                        backgroundColor: adjColor ? COLOR_HEX[adjColor] : '#ccc',
                        border: '1px solid rgba(0,0,0,0.2)',
                      }}
                      title={`${adjFace} face`}
                    />
                  );
                })}
              </div>
            )}
            
            {/* Main 3x3 Grid */}
            <div className="grid grid-cols-3 gap-1 sm:gap-2" style={{ maxWidth: '280px' }}>
              {face.map((color, index) => {
                const isCenter = index === 4;
                const isHighlighted = highlightedPositions.includes(index);
                
                return (
                  <button
                    key={index}
                    onClick={() => handleCellClick(index)}
                    disabled={!isActive || isCenter}
                    aria-label={`Cell ${index + 1}, ${color ? COLOR_NAMES[color] : 'empty'}${isCenter ? ', center cell locked' : ''}`}
                    className={`
                      face-cell w-14 h-14 sm:w-20 sm:h-20 border-2 sm:border-4 relative focus-ring
                      ${isCenter ? 'cursor-not-allowed opacity-90' : isActive && selectedColor ? 'cursor-pointer' : 'cursor-default'}
                      ${isHighlighted ? 'ring-4 ring-red-500 ring-opacity-100 animate-pulse' : ''}
                      ${!isCenter && isActive && selectedColor ? 'hover:scale-105 hover:ring-2 hover:ring-yellow-400' : ''}
                    `}
                    style={{
                      backgroundColor: color ? COLOR_HEX[color] : '#f0f0f0',
                      borderColor: isHighlighted ? '#ef4444 #ef4444 #ef4444 #ef4444' : '#fff #808080 #808080 #fff',
                      boxShadow: isHighlighted 
                        ? '0 0 10px rgba(239, 68, 68, 0.8), inset 0 0 5px rgba(239, 68, 68, 0.3)' 
                        : 'inset -2px -2px 0 rgba(0,0,0,0.2), inset 2px 2px 0 rgba(255,255,255,0.4)',
                      transition: 'transform 0.15s ease-out, box-shadow 0.15s ease-out',
                    }}
                  >
                    {/* Error indicator */}
                    {isHighlighted && (
                      <span className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 text-sm sm:text-lg z-10">
                        ⚠️
                      </span>
                    )}
                    
                    {/* Cell number */}
                    <span 
                      className="absolute top-0.5 left-0.5 sm:top-1 sm:left-1 text-xs font-bold px-0.5 sm:px-1 rounded"
                      style={{ 
                        backgroundColor: isHighlighted ? 'rgba(239, 68, 68, 0.8)' : 'rgba(0,0,0,0.5)', 
                        color: '#fff',
                        fontSize: '8px'
                      }}
                    >
                      {index + 1}
                    </span>
                    
                    {/* Center lock - with tooltip */}
                    {isCenter && (
                      <Tooltip text="Center color is fixed and defines this face">
                        <span className="text-lg sm:text-2xl cursor-help" style={{ 
                          filter: 'drop-shadow(1px 1px 1px rgba(0,0,0,0.5))' 
                        }}>
                          🔒
                        </span>
                      </Tooltip>
                    )}
                  </button>
                );
              })}
            </div>
            
            {/* Right adjacent column */}
            {cubeState && (
              <div className="flex flex-col gap-0.5 ml-1 justify-center">
                {ADJACENT_FACES[faceName].right.positions.map((pos, i) => {
                  const adjFace = ADJACENT_FACES[faceName].right.face;
                  const adjColor = cubeState[adjFace]?.[pos];
                  return (
                    <div
                      key={`right-${i}`}
                      className="w-4 h-8 sm:w-5 sm:h-12 rounded-r-sm opacity-70"
                      style={{
                        backgroundColor: adjColor ? COLOR_HEX[adjColor] : '#ccc',
                        border: '1px solid rgba(0,0,0,0.2)',
                      }}
                      title={`${adjFace} face`}
                    />
                  );
                })}
              </div>
            )}
          </div>
          
          {/* Bottom adjacent row */}
          {cubeState && (
            <div className="flex justify-center mt-1">
              <div className="flex gap-0.5">
                {ADJACENT_FACES[faceName].bottom.positions.map((pos, i) => {
                  const adjFace = ADJACENT_FACES[faceName].bottom.face;
                  const adjColor = cubeState[adjFace]?.[pos];
                  return (
                    <div
                      key={`bottom-${i}`}
                      className="w-8 h-4 sm:w-12 sm:h-5 rounded-b-sm opacity-70"
                      style={{
                        backgroundColor: adjColor ? COLOR_HEX[adjColor] : '#ccc',
                        border: '1px solid rgba(0,0,0,0.2)',
                      }}
                      title={`${adjFace} face`}
                    />
                  );
                })}
              </div>
            </div>
          )}
          
          <p className="text-center text-black text-xs sm:text-sm mt-2 sm:mt-3">
            Center color: <strong style={{ color: COLOR_HEX[centerColor!] }}>■</strong> {COLOR_NAMES[centerColor!]}
          </p>
          
          {/* Legend for adjacent faces */}
          {cubeState && (
            <div className="text-center text-xs text-gray-600 mt-2">
              <span>Adjacent: </span>
              <span className="mx-1">↑{ADJACENT_FACES[faceName].top.face}</span>
              <span className="mx-1">→{ADJACENT_FACES[faceName].right.face}</span>
              <span className="mx-1">↓{ADJACENT_FACES[faceName].bottom.face}</span>
              <span className="mx-1">←{ADJACENT_FACES[faceName].left.face}</span>
            </div>
          )}
        </div>

        {/* Color Palette - Always Visible */}
        {isActive && (
          <div className="retro-panel p-3 sm:p-4">
            <p className="text-black text-sm sm:text-base mb-2 sm:mb-3 font-bold icon-text">
              <span className="icon-md">{selectedColor ? '🎨' : '👇'}</span>
              {selectedColor ? `Painting with ${COLOR_NAMES[selectedColor]} - Click tiles to paint` : 'Pick a color, then click tiles:'}
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3 mb-3">
              {COLORS.map((color) => {
                const isSelected = selectedColor === color;
                return (
                  <Tooltip key={color} text={`${COLOR_NAMES[color]} (${colorCounts[color] || 0}/9 on this face)`} position="bottom">
                    <button
                      onClick={() => handleColorSelect(color)}
                      aria-label={`Select ${COLOR_NAMES[color]} color`}
                      aria-pressed={isSelected}
                      className={`color-palette-btn w-12 h-12 sm:w-14 sm:h-14 border-2 sm:border-4 focus-ring ${
                        isSelected ? 'selected' : ''
                      }`}
                      style={{
                        backgroundColor: COLOR_HEX[color],
                        borderColor: isSelected ? '#FFD700' : '#fff #808080 #808080 #fff',
                      }}
                    >
                      <span className="text-sm font-bold" style={{ 
                        color: color === 'Y' || color === 'W' ? '#000' : '#fff',
                        textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
                      }}>
                        {colorCounts[color] || 0}
                      </span>
                    </button>
                  </Tooltip>
                );
              })}
            </div>
            <div className="retro-panel px-3 py-2 bg-gray-200 text-xs sm:text-sm text-gray-700">
              <span className="icon-text">
                <span>⌨️</span>
                <span>Keyboard: W, Y, R, O, G, B to select | DEL/Backspace to deselect</span>
              </span>
            </div>
          </div>
        )}

        {/* Help Text */}
        {!isActive && (
          <div className="text-black text-center text-xs sm:text-sm p-2">
            ➜ Fill the other faces to activate this one
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(FaceEditor);
