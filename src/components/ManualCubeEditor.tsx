import { useState, useCallback, useMemo, useEffect, lazy, Suspense } from 'react';
import type { CubeState, Face, FaceName, CubeColor } from '../types/cube';
import FaceEditor from './FaceEditor';
import Cube3DViewer from './Cube3D';
import ErrorResolutionPanel from './ErrorResolutionPanel';
import { errorDetectionSystem, type CubeError, type ValidationResult } from '../utils/errorDetectionSystem';
import { isSolved } from '../utils/solver';

const CubeNetUnfolding = lazy(() => import('./CubeNetUnfolding'));

interface ManualCubeEditorProps {
  onComplete: (cubeState: CubeState) => void;
  initialState?: CubeState | null;
}

const FACES: FaceName[] = ['F', 'R', 'B', 'L', 'U', 'D'];
const FACE_CENTERS: Record<FaceName, CubeColor> = {
  F: 'G', // Front - Green
  R: 'R', // Right - Red
  B: 'B', // Back - Blue
  L: 'O', // Left - Orange
  U: 'W', // Top - White
  D: 'Y'  // Bottom - Yellow
};

const FACE_DESCRIPTIONS: Record<FaceName, string> = {
  F: 'Front (Green)',
  R: 'Right (Red)',
  B: 'Back (Blue)',
  L: 'Left (Orange)',
  U: 'Top (White)',
  D: 'Bottom (Yellow)'
};

// LocalStorage key for cube state persistence
const STORAGE_KEY = 'rubiksight_editor_cube_state';

// Create a blank face with locked center
const createBlankFace = (centerColor: CubeColor): Face => {
  const face: Face = Array(9).fill(null);
  face[4] = centerColor; // Center is locked
  return face;
};

// Create initial blank cube
const createBlankCube = (): CubeState => {
  const state: CubeState = {} as CubeState;
  FACES.forEach(face => {
    state[face] = createBlankFace(FACE_CENTERS[face]);
  });
  return state;
};

// Load cube state from localStorage
const loadSavedCubeState = (): CubeState | null => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Validate the structure
      if (parsed && typeof parsed === 'object') {
        const hasAllFaces = FACES.every(face => Array.isArray(parsed[face]) && parsed[face].length === 9);
        if (hasAllFaces) {
          return parsed as CubeState;
        }
      }
    }
  } catch {
    // Ignore parse errors
  }
  return null;
};

export default function ManualCubeEditor({ onComplete, initialState }: ManualCubeEditorProps) {
  const [currentFaceIndex, setCurrentFaceIndex] = useState(0);
  const [cubeState, setCubeState] = useState<CubeState>(() => {
    // Priority: initialState prop > localStorage > blank cube
    if (initialState) return initialState;
    const saved = loadSavedCubeState();
    if (saved) return saved;
    return createBlankCube();
  });
  
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);

  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [highlightedPositions, setHighlightedPositions] = useState<Array<{ face: FaceName; position: number }>>([]);
  const [history, setHistory] = useState<CubeState[]>([cubeState]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Auto-save cube state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cubeState));
    setLastSaveTime(new Date());
  }, [cubeState]);

  const currentFaceName = FACES[currentFaceIndex];
  const currentFace = cubeState[currentFaceName];
  const currentCenter = FACE_CENTERS[currentFaceName];

  // Check completion - all faces must have all 9 cells filled
  const isComplete = useMemo(() => {
    return FACES.every(faceName => {
      const face = cubeState[faceName];
      return face.every(cell => cell !== null);
    });
  }, [cubeState]);

  // Check if cube is already solved
  const isAlreadySolved = useMemo(() => {
    return isComplete && isSolved(cubeState);
  }, [isComplete, cubeState]);

  // Validate cube when it changes (real-time validation)
  useEffect(() => {
    if (isComplete) {
      const result = errorDetectionSystem.validateCube(cubeState);
      setValidationResult(result);
    } else {
      setValidationResult(null);
    }
  }, [cubeState, isComplete]);

  // Handlers for error resolution panel
  const handleJumpToFace = useCallback((face: FaceName) => {
    const faceIndex = FACES.indexOf(face);
    if (faceIndex !== -1) {
      setCurrentFaceIndex(faceIndex);
    }
  }, []);

  const handleHighlightPositions = useCallback((positions: Array<{ face: FaceName; position: number }>) => {
    setHighlightedPositions(positions);
  }, []);

  const handleClearHighlight = useCallback(() => {
    setHighlightedPositions([]);
  }, []);

  // Auto-fix a single error
  const handleAutoFix = useCallback((error: CubeError) => {
    const result = errorDetectionSystem.autoFixError(error, cubeState);
    
    if (result.success && result.newState) {
      setCubeState(result.newState);
      
      // Update history
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(result.newState);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      
      // Clear highlights after fix
      setHighlightedPositions([]);
      
      // Show feedback
      alert(`✅ Fixed: ${result.description}`);
    } else {
      alert(`❌ Could not auto-fix: ${result.description}\n\nPlease fix manually using the highlighted positions.`);
      // Highlight the error positions for manual fix
      if (error.affectedPositions) {
        handleHighlightPositions(error.affectedPositions);
      }
      if (error.jumpToFace) {
        handleJumpToFace(error.jumpToFace);
      }
    }
  }, [cubeState, history, historyIndex, handleHighlightPositions, handleJumpToFace]);

  // Auto-fix all errors one by one
  const handleAutoFixAll = useCallback(() => {
    if (!validationResult || validationResult.errors.length === 0) return;
    
    let currentState = cubeState;
    let fixedCount = 0;
    const messages: string[] = [];
    
    // Try to fix up to 10 errors in sequence
    for (let i = 0; i < Math.min(10, validationResult.errors.length * 2); i++) {
      const result = errorDetectionSystem.validateCube(currentState);
      if (result.isValid) break;
      
      const error = result.errors[0];
      if (!error) break;
      
      const fixResult = errorDetectionSystem.autoFixError(error, currentState);
      if (fixResult.success && fixResult.newState) {
        currentState = fixResult.newState;
        fixedCount++;
        messages.push(`• ${fixResult.description}`);
      } else {
        // Can't fix this one, skip to next
        break;
      }
    }
    
    if (fixedCount > 0) {
      setCubeState(currentState);
      
      // Update history
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(currentState);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      
      setHighlightedPositions([]);
      
      const finalResult = errorDetectionSystem.validateCube(currentState);
      if (finalResult.isValid) {
        alert(`✅ All errors fixed!\n\n${messages.join('\n')}\n\nYour cube is now valid!`);
      } else {
        alert(`✅ Fixed ${fixedCount} error(s):\n\n${messages.join('\n')}\n\n⚠️ ${finalResult.errors.length} error(s) remaining - please fix manually.`);
      }
    } else {
      alert('❌ Could not auto-fix any errors. Please fix manually by checking your physical cube.');
    }
  }, [cubeState, validationResult, history, historyIndex]);

  const handleFaceUpdate = useCallback((newFace: Face) => {
    const newState = { ...cubeState, [currentFaceName]: newFace };
    setCubeState(newState);
    
    // Update history
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newState);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [cubeState, currentFaceName, history, historyIndex]);

  const handleNext = useCallback(() => {
    if (currentFaceIndex < FACES.length - 1) {
      setCurrentFaceIndex(prev => prev + 1);
    }
  }, [currentFaceIndex]);

  const handlePrev = useCallback(() => {
    if (currentFaceIndex > 0) {
      setCurrentFaceIndex(prev => prev - 1);
    }
  }, [currentFaceIndex]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setCubeState(history[newIndex]);
    }
  }, [historyIndex, history]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setCubeState(history[newIndex]);
    }
  }, [historyIndex, history]);

  const handleClear = useCallback(() => {
    if (confirm('Are you sure you want to clear all faces?')) {
      const newState: CubeState = {} as CubeState;
      FACES.forEach(face => {
        newState[face] = createBlankFace(FACE_CENTERS[face]);
      });
      setCubeState(newState);
      setHistory([newState]);
      setHistoryIndex(0);
      setCurrentFaceIndex(0);
      setValidationResult(null);
      setHighlightedPositions([]);
    }
  }, []);

  const handleComplete = useCallback(() => {
    if (isComplete && validationResult?.isValid) {
      onComplete(cubeState);
    }
  }, [isComplete, validationResult, cubeState, onComplete]);

  const getFilledFaceCount = () => {
    return FACES.filter(faceName => {
      const face = cubeState[faceName];
      return face.every(cell => cell !== null);
    }).length;
  };

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // Get global color counts across all faces
  const globalColorCounts = useMemo(() => {
    const counts: Record<string, number> = { W: 0, Y: 0, R: 0, O: 0, G: 0, B: 0 };
    Object.values(cubeState).forEach(face => {
      face.forEach(color => {
        if (color) counts[color]++;
      });
    });
    return counts as Record<NonNullable<CubeColor>, number>;
  }, [cubeState]);

  return (
    <div className="w-full">
      {/* Header */}
      <div className="retro-window mb-4">
        <div className="retro-title-bar">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎮</span>
            <span>RUBIK'S CUBE EDITOR</span>
          </div>
          <div className="retro-title-buttons">
            <button className="retro-title-btn">_</button>
            <button className="retro-title-btn">□</button>
          </div>
        </div>
        <div className="p-3 sm:p-4 bg-gray-300">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
            <span className="text-black text-sm sm:text-base">
              Progress: {getFilledFaceCount()}/6 faces
            </span>
            <div className="flex gap-2 flex-wrap">
              <span className="retro-panel px-2 py-1 text-xs sm:text-sm">
                {isComplete ? '✅ Complete' : '⏳ Incomplete'}
              </span>
              {isComplete && validationResult?.isValid && (
                <span className="retro-panel px-2 py-1 text-xs sm:text-sm bg-green-200">
                  ✓ Valid
                </span>
              )}
              {isComplete && validationResult && !validationResult.isValid && (
                <span className="retro-panel px-2 py-1 text-xs sm:text-sm bg-red-200">
                  ⚠️ {validationResult.errors.length} Error{validationResult.errors.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="bg-gray-400 border-2 border-solid" style={{ borderColor: '#fff #808080 #808080 #fff' }}>
            <div 
              className="bg-green-500 h-6 flex items-center justify-center text-xs font-bold text-black transition-all"
              style={{ width: `${(getFilledFaceCount() / 6) * 100}%` }}
            >
              {getFilledFaceCount() > 0 && `${Math.round((getFilledFaceCount() / 6) * 100)}%`}
            </div>
          </div>
          
          {/* Orientation Guide */}
          <div className="mt-3 retro-panel p-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-black">🧭 Orientation Guide:</span>
              <span className="text-xs text-gray-700">Hold cube with white center facing UP</span>
            </div>
            <div className="flex flex-wrap gap-1 text-xs">
              <span className="px-1.5 py-0.5 rounded bg-white border border-gray-400">⬆ White=UP</span>
              <span className="px-1.5 py-0.5 rounded bg-yellow-300 border border-gray-400">⬇ Yellow=DOWN</span>
              <span className="px-1.5 py-0.5 rounded bg-green-400 border border-gray-400">👁 Green=FRONT</span>
              <span className="px-1.5 py-0.5 rounded bg-blue-400 border border-gray-400 text-white">🔙 Blue=BACK</span>
              <span className="px-1.5 py-0.5 rounded bg-red-400 border border-gray-400 text-white">➡ Red=RIGHT</span>
              <span className="px-1.5 py-0.5 rounded bg-orange-400 border border-gray-400">⬅ Orange=LEFT</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Column - Face Editor */}
        <div className="space-y-4">
          {/* Face Editor */}
          <FaceEditor
            face={currentFace}
            faceName={currentFaceName}
            onUpdate={handleFaceUpdate}
            isActive={true}
            centerColor={currentCenter}
            highlightedPositions={highlightedPositions
              .filter(p => p.face === currentFaceName)
              .map(p => p.position)
            }
            cubeState={cubeState}
          />

          {/* Navigation Bar */}
          <div className="retro-window">
            <div className="retro-title-bar">
              <span>📍 Face Selection</span>
            </div>
            <div className="p-3 sm:p-4 bg-gray-300">
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-3">
                {FACES.map((face, idx) => (
                  <button
                    key={face}
                    onClick={() => setCurrentFaceIndex(idx)}
                    className={`retro-btn py-2 text-xs sm:text-sm ${
                      idx === currentFaceIndex ? 'ring-2 ring-yellow-400 bg-yellow-100' : ''
                    }`}
                  >
                    <div className="font-bold">{face}</div>
                    <div className="text-xs hidden sm:block">{FACE_DESCRIPTIONS[face].split(' ')[0]}</div>
                    {cubeState[face].every(c => c !== null) && <div className="text-green-600">✓</div>}
                  </button>
                ))}
              </div>

              {/* Quick navigation */}
              <div className="flex gap-2 mb-3">
                <button
                  onClick={handlePrev}
                  disabled={currentFaceIndex === 0}
                  className="retro-btn flex-1"
                >
                  ← Prev
                </button>
                <button
                  onClick={handleNext}
                  disabled={currentFaceIndex === FACES.length - 1}
                  className="retro-btn flex-1"
                >
                  Next →
                </button>
              </div>

              {/* Instructions */}
              <div className="retro-panel p-2 sm:p-3 text-black text-xs sm:text-sm">
                <p className="font-bold mb-1">📋 Instructions:</p>
                <p>Hold your cube with <strong>{FACE_DESCRIPTIONS[currentFaceName]}</strong> facing you.</p>
                <p className="mt-1">Click each tile to assign a color from the palette.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Color Stats & Controls */}
        <div className="space-y-4">
          {/* Color Statistics */}
          <div className="retro-window">
            <div className="retro-title-bar">
              <span>📊 Color Count (Total)</span>
            </div>
            <div className="p-3 sm:p-4 bg-gray-300">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(['W', 'Y', 'R', 'O', 'G', 'B'] as const).map(color => {
                  const count = globalColorCounts[color];
                  const isValid = count === 9;
                  const isTooMany = count > 9;
                  return (
                    <div 
                      key={color}
                      className={`retro-panel p-2 flex items-center gap-2 ${
                        isTooMany ? 'bg-red-100' : isValid ? 'bg-green-100' : ''
                      }`}
                    >
                      <div 
                        className="w-6 h-6 border-2"
                        style={{ 
                          backgroundColor: color === 'W' ? '#fff' : color === 'Y' ? '#FFD500' : 
                            color === 'R' ? '#C41E3A' : color === 'O' ? '#FF5800' :
                            color === 'G' ? '#009B48' : '#0051BA',
                          borderColor: '#333'
                        }}
                      />
                      <span className={`font-bold ${isTooMany ? 'text-red-600' : isValid ? 'text-green-600' : 'text-black'}`}>
                        {count}/9
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Control Bar */}
          <div className="retro-window">
            <div className="retro-title-bar">
              <span>⚡ Actions</span>
              {lastSaveTime && (
                <span className="text-xs opacity-75 ml-2">
                  💾 Saved
                </span>
              )}
            </div>
            <div className="p-3 sm:p-4 bg-gray-300">
              <div className="flex gap-2 mb-3 flex-wrap">
                <button
                  onClick={handleUndo}
                  disabled={!canUndo}
                  className="retro-btn flex-1 min-w-20"
                >
                  ↶ Undo
                </button>
                <button
                  onClick={handleRedo}
                  disabled={!canRedo}
                  className="retro-btn flex-1 min-w-20"
                >
                  ↷ Redo
                </button>
                <button
                  onClick={handleClear}
                  className="retro-btn flex-1 min-w-20"
                >
                  🗑️ Clear
                </button>
              </div>

              <button
                onClick={handleComplete}
                disabled={!isComplete || !validationResult?.isValid}
                className={`w-full py-3 sm:py-4 font-bold text-white text-sm sm:text-lg transition-all border-2 ${
                  isComplete && validationResult?.isValid
                    ? 'bg-green-500 hover:bg-green-600 cursor-pointer'
                    : 'bg-gray-400 cursor-not-allowed opacity-50'
                }`}
                style={{
                  borderColor: '#fff #808080 #808080 #fff',
                }}
              >
                🎯 PROCEED TO 3D VIEW
              </button>
            </div>
          </div>

          {/* Already Solved Warning */}
          {isAlreadySolved && (
            <div className="retro-window">
              <div className="retro-title-bar bg-yellow-400">
                <span>⚠️ ALREADY SOLVED</span>
              </div>
              <div className="p-3 sm:p-4 bg-yellow-50">
                <p className="text-black font-bold mb-2">🎉 This cube is already solved!</p>
                <p className="text-black text-sm mb-2">
                  Each face has all the same color. To test the solver, you need to <strong>scramble</strong> the cube first.
                </p>
                <p className="text-black text-sm">
                  💡 <strong>Tip:</strong> Mix colors across faces to create a puzzle the solver can solve.
                </p>
              </div>
            </div>
          )}

          {/* Error Resolution Panel */}
          {isComplete && validationResult && (
            <ErrorResolutionPanel
              validationResult={validationResult}
              onJumpToFace={handleJumpToFace}
              onHighlightPositions={handleHighlightPositions}
              onClearHighlight={handleClearHighlight}
              onAutoFix={handleAutoFix}
              onAutoFixAll={handleAutoFixAll}
              currentFace={currentFaceName}
              cubeState={cubeState}
            />
          )}

          {/* Orientation Guide */}
          <div className="retro-window">
            <div className="retro-title-bar">
              <span>🧭 Cube Orientation Guide</span>
            </div>
            <div className="p-3 sm:p-4 bg-gray-300">
              <div className="retro-panel p-3 bg-white">
                <div className="text-center mb-2">
                  <div className="text-lg font-bold text-black">Current: {FACE_DESCRIPTIONS[currentFaceName]}</div>
                </div>
                
                {/* Visual diagram */}
                <div className="flex justify-center items-center gap-1 mb-3">
                  {/* Show adjacent faces */}
                  {currentFaceName === 'F' && (
                    <div className="text-xs text-black text-center">
                      <div className="text-gray-500 mb-1">Cube faces around GREEN:</div>
                      <div className="grid grid-cols-3 gap-1 max-w-xs mx-auto">
                        <div></div>
                        <div className="retro-panel p-2 bg-white">⬆️ Top<br/><strong>White</strong></div>
                        <div></div>
                        <div className="retro-panel p-2 bg-orange-100">⬅️ Left<br/><strong>Orange</strong></div>
                        <div className="retro-panel p-2 bg-green-100 ring-2 ring-yellow-400">✋ FRONT<br/><strong>Green</strong></div>
                        <div className="retro-panel p-2 bg-red-100">➡️ Right<br/><strong>Red</strong></div>
                      </div>
                    </div>
                  )}
                  {currentFaceName === 'R' && (
                    <div className="text-xs text-black text-center">
                      <div className="text-gray-500 mb-1">Rotate cube RIGHT (clockwise):</div>
                      <div className="flex flex-col gap-2">
                        <div className="retro-panel p-2 bg-red-100 ring-2 ring-yellow-400">✋ Now face <strong>RED (Right)</strong></div>
                        <div className="text-xs text-gray-600">Green is now on your left</div>
                      </div>
                    </div>
                  )}
                  {currentFaceName === 'B' && (
                    <div className="text-xs text-black text-center">
                      <div className="text-gray-500 mb-1">Rotate cube 180° from GREEN:</div>
                      <div className="flex flex-col gap-2">
                        <div className="retro-panel p-2 bg-blue-100 ring-2 ring-yellow-400">✋ Now face <strong>BLUE (Back)</strong></div>
                        <div className="text-xs text-gray-600">Orange on left, Red on right</div>
                      </div>
                    </div>
                  )}
                  {currentFaceName === 'L' && (
                    <div className="text-xs text-black text-center">
                      <div className="text-gray-500 mb-1">Rotate cube LEFT from BLUE:</div>
                      <div className="flex flex-col gap-2">
                        <div className="retro-panel p-2 bg-orange-100 ring-2 ring-yellow-400">✋ Now face <strong>ORANGE (Left)</strong></div>
                        <div className="text-xs text-gray-600">Blue on left, Green on right</div>
                      </div>
                    </div>
                  )}
                  {currentFaceName === 'U' && (
                    <div className="text-xs text-black text-center">
                      <div className="text-gray-500 mb-1">Rotate cube UP from front:</div>
                      <div className="flex flex-col gap-2">
                        <div className="retro-panel p-2 bg-white ring-2 ring-yellow-400">✋ Now face <strong>WHITE (Top)</strong></div>
                        <div className="text-xs text-gray-600">Green facing down</div>
                      </div>
                    </div>
                  )}
                  {currentFaceName === 'D' && (
                    <div className="text-xs text-black text-center">
                      <div className="text-gray-500 mb-1">Final face - bottom:</div>
                      <div className="flex flex-col gap-2">
                        <div className="retro-panel p-2 bg-yellow-100 ring-2 ring-yellow-400">✋ Now face <strong>YELLOW (Bottom)</strong></div>
                        <div className="text-xs text-gray-600">Green facing up</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Next instruction */}
                {currentFaceIndex < FACES.length - 1 && (
                  <div className="retro-panel p-2 bg-blue-50 text-center text-xs text-black">
                    <strong>📍 Next:</strong> {FACE_DESCRIPTIONS[FACES[currentFaceIndex + 1]]}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="retro-panel p-3 sm:p-4 bg-yellow-100 border-2">
            <p className="text-black text-xs sm:text-sm font-bold mb-2">💡 TIPS:</p>
            <ul className="text-black text-xs sm:text-sm space-y-1 list-disc list-inside">
              <li>Centers are locked (predefined colors)</li>
              <li>Each color appears exactly 9 times total</li>
              <li>Keyboard: W, Y, R, O, G, B to select colors</li>
              <li>Use the orientation guide above</li>
              <li>Watch the 3D preview below update live!</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 3D Cube Viewer - Live preview */}
      <div className="mt-4">
        <Cube3DViewer 
          cubeState={cubeState}
          highlightLayer={currentFaceName as 'U' | 'D' | 'F' | 'B' | 'L' | 'R'}
        />
      </div>

      {/* Unfolding Cube Net - Static preview */}
      <div className="mt-4">
        <Suspense fallback={<div className="text-center p-4">Loading cube net...</div>}>
          <CubeNetUnfolding 
            state={cubeState} 
            autoAnimate={false}
          />
        </Suspense>
      </div>
    </div>
  );
}
