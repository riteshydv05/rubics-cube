import { useState, useCallback, useEffect, useMemo, useRef, lazy, Suspense } from 'react';
import type { CubeState, Move, FaceName } from '../types/cube';
import Cube3DViewer from './Cube3D';
import { solveCube, applyMove, isSolved } from '../utils/solver';
import CubeValidator from '../utils/cubeValidator';
import { saveSolve, isAuthenticated } from '../services/auth';
import { ThreeJSErrorBoundary } from './ErrorBoundary';

const CubeNetUnfolding = lazy(() => import('./CubeNetUnfolding'));

// Custom hook for tooltip
const Tooltip = ({ children, text }: { children: React.ReactNode; text: string }) => (
  <div className="tooltip-wrapper group relative inline-flex">
    {children}
    <span className="tooltip-content">
      {text}
    </span>
  </div>
);

interface SolverViewProps {
  cubeState: CubeState;
  onBack: () => void;
}

type SolveMode = 'step-by-step' | 'interactive';
type SolverState = 'validating' | 'solving' | 'solved' | 'already-solved' | 'validation-error' | 'solver-error';

interface ValidationError {
  message: string;
  type: 'color' | 'edge' | 'corner' | 'duplicate' | 'parity';
  positions?: Array<{ face: FaceName; position: number }>;
}

export default function SolverView({ cubeState: initialCubeState, onBack }: SolverViewProps) {
  const [mode, setMode] = useState<SolveMode | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState<0.5 | 1 | 2>(1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [solution, setSolution] = useState<Move[]>([]);
  const [solverState, setSolverState] = useState<SolverState>('validating');
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [solveStartTime, setSolveStartTime] = useState<number | null>(null);
  const [solveSaved, setSolveSaved] = useState(false);
  const playIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const allTimeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const isPlayingRef = useRef(false);
  const isPausedRef = useRef(false);

  // Helper to create tracked timeouts that can all be cleared on stop
  const createTrackedTimeout = (callback: () => void, delay: number) => {
    const timeoutId = setTimeout(() => {
      allTimeoutsRef.current.delete(timeoutId);
      callback();
    }, delay);
    allTimeoutsRef.current.add(timeoutId);
    return timeoutId;
  };

  // Helper to clear all tracked timeouts
  const clearAllTimeouts = () => {
    allTimeoutsRef.current.forEach(id => clearTimeout(id));
    allTimeoutsRef.current.clear();
    if (playIntervalRef.current) {
      clearTimeout(playIntervalRef.current);
      playIntervalRef.current = null;
    }
  };

  // Parse validation errors from string format to structured format
  const parseValidationErrors = (errors: string[]): ValidationError[] => {
    return errors.map(error => {
      let type: ValidationError['type'] = 'color';
      if (error.includes('edge') || error.includes('Edge')) type = 'edge';
      else if (error.includes('corner') || error.includes('Corner')) type = 'corner';
      else if (error.includes('Duplicate') || error.includes('duplicate')) type = 'duplicate';
      else if (error.includes('parity') || error.includes('Parity') || error.includes('orientation')) type = 'parity';
      
      return { message: error, type };
    });
  };

  // Validate and solve cube
  useEffect(() => {
    const validateAndSolve = async () => {
      setSolverState('validating');
      setValidationErrors([]);
      
      // Step 1: Validate cube state (basic validation)
      const errors = CubeValidator.validateCube(initialCubeState);
      
      if (errors.length > 0) {
        setSolverState('validation-error');
        setValidationErrors(parseValidationErrors(errors));
        return;
      }

      // Step 2: Check solvability (parity validation)
      const parityErrors = CubeValidator.checkSolvability(initialCubeState);
      
      if (parityErrors.length > 0) {
        setSolverState('validation-error');
        setValidationErrors(parseValidationErrors(parityErrors));
        return;
      }
      
      // Step 3: Check if already solved
      if (isSolved(initialCubeState)) {
        setSolverState('already-solved');
        return;
      }
      
      // Step 4: Try to solve
      setSolverState('solving');
      
      try {
        // Create a timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Solver timeout')), 15000);
        });
        
        // Race between solver and timeout
        const result = await Promise.race([
          solveCube(initialCubeState),
          timeoutPromise
        ]);
        
        if (result.moves.length > 0) {
          setSolution(result.moves);
          setSolverState('solved');
        } else {
          // Solver returned 0 moves but cube isn't solved
          setSolverState('solver-error');
        }
      } catch (err) {
        console.error('Solver error:', err);
        setSolverState('solver-error');
      }
    };
    
    validateAndSolve();
  }, [initialCubeState]);

  // Calculate the current cube state based on how many moves have been applied
  const currentCubeState = useMemo(() => {
    let state = initialCubeState;
    for (let i = 0; i < currentStep; i++) {
      if (solution[i]) {
        state = applyMove(state, solution[i]);
      }
    }
    return state;
  }, [initialCubeState, solution, currentStep]);

  // Get currently highlighted layer from move notation
  const highlightedLayer = useMemo(() => {
    if (currentStep >= solution.length) return null;
    const move = solution[currentStep]?.notation;
    if (!move) return null;
    const layer = move[0] as 'U' | 'D' | 'F' | 'B' | 'L' | 'R';
    return layer;
  }, [currentStep, solution]);

  const handleNextStep = useCallback(() => {
    if (currentStep < solution.length) {
      setIsAnimating(true);
      setTimeout(() => {
        setCompletedSteps(prev => new Set([...prev, currentStep]));
        setCurrentStep(prev => prev + 1);
        setIsAnimating(false);
      }, 500);
    }
  }, [currentStep, solution.length]);

  const handlePrevStep = useCallback(() => {
    if (currentStep > 0) {
      const newStep = currentStep - 1;
      setCurrentStep(newStep);
      setCompletedSteps(prev => {
        const newSet = new Set(prev);
        newSet.delete(newStep);
        return newSet;
      });
    }
  }, [currentStep]);

  const handleReset = useCallback(() => {
    // Clear all timeouts first
    clearAllTimeouts();
    
    setCurrentStep(0);
    setCompletedSteps(new Set());
    setIsAnimating(false);
    setIsPlaying(false);
    setIsPaused(false);
    isPlayingRef.current = false;
    isPausedRef.current = false;
    setSolveStartTime(Date.now()); // Reset timer
  }, []);

  // Start timing when mode is selected
  useEffect(() => {
    if (mode && !solveStartTime) {
      setSolveStartTime(Date.now());
    }
  }, [mode, solveStartTime]);

  // Save solve when completed
  useEffect(() => {
    const saveSolveToHistory = async () => {
      if (currentStep >= solution.length && solution.length > 0 && !solveSaved && isAuthenticated()) {
        const solveTime = solveStartTime ? Date.now() - solveStartTime : null;
        
        try {
          await saveSolve({
            initialCubeState,
            solution: solution.map(m => ({
              notation: m.notation,
              face: m.face,
              direction: m.direction,
              description: m.description
            })),
            moveCount: solution.length,
            solveTime: solveTime || undefined,
            completed: true
          });
          setSolveSaved(true);
          console.log('Solve saved to history!');
        } catch (error) {
          console.error('Failed to save solve:', error);
        }
      }
    };

    saveSolveToHistory();
  }, [currentStep, solution, initialCubeState, solveStartTime, solveSaved]);

  // Cleanup all timeouts on unmount
  useEffect(() => {
    return () => {
      clearAllTimeouts();
    };
  }, []);

  const handlePlayAll = useCallback(() => {
    if (isPlaying && !isPaused) {
      // Pause playback
      setIsPaused(true);
      isPausedRef.current = true;
      if (playIntervalRef.current) {
        clearTimeout(playIntervalRef.current);
        playIntervalRef.current = null;
      }
      return;
    }

    if (isPaused) {
      // Resume playback
      setIsPaused(false);
      isPausedRef.current = false;
    } else {
      // Start fresh playback
      handleReset();
      setIsPlaying(true);
      isPlayingRef.current = true;
      isPausedRef.current = false;
    }

    // Auto-play all steps - use refs to check current state
    const playNext = (step: number) => {
      // Check refs for current state (not stale closure values)
      if (!isPlayingRef.current || isPausedRef.current) {
        return;
      }
      if (step >= solution.length) {
        setIsPlaying(false);
        setIsPaused(false);
        isPlayingRef.current = false;
        isPausedRef.current = false;
        return;
      }
      setCurrentStep(step);
      setIsAnimating(true);
      
      const animationDuration = 400 / animationSpeed;
      const pauseBetweenMoves = 200 / animationSpeed;
      
      playIntervalRef.current = createTrackedTimeout(() => {
        // Check again if we should continue
        if (!isPlayingRef.current || isPausedRef.current) {
          setIsAnimating(false);
          return;
        }
        setCompletedSteps(prev => new Set([...prev, step]));
        setIsAnimating(false);
        playIntervalRef.current = createTrackedTimeout(() => {
          // Use ref to check current pause state
          if (!isPausedRef.current && isPlayingRef.current) {
            playNext(step + 1);
          }
        }, pauseBetweenMoves);
      }, animationDuration);
    };
    
    const startStep = isPaused ? currentStep : 0;
    createTrackedTimeout(() => playNext(startStep), 100);
  }, [solution.length, handleReset, animationSpeed, isPlaying, isPaused, currentStep]);

  const handlePause = useCallback(() => {
    // Set refs immediately so the recursive playNext sees the change
    isPausedRef.current = true;
    isPlayingRef.current = false;
    setIsPaused(true);
    setIsPlaying(false);
    setIsAnimating(false);
    clearAllTimeouts();
  }, []);

  // Stop playback completely - different from pause (fully resets playback state)
  const handleStop = useCallback(() => {
    // Clear ALL timeouts immediately - this is critical for instant stop
    clearAllTimeouts();
    
    // Reset all refs immediately
    isPlayingRef.current = false;
    isPausedRef.current = false;
    
    // Reset all state - stops playback but keeps current step position
    setIsPlaying(false);
    setIsPaused(false);
    setIsAnimating(false);
  }, []);

  const handleSpeedChange = useCallback((speed: 0.5 | 1 | 2) => {
    setAnimationSpeed(speed);
  }, []);

  // Validating state
  if (solverState === 'validating') {
    return (
      <div className="w-full space-y-4">
        <div className="retro-window">
          <div className="retro-title-bar">
            <span className="icon-text">
              <span className="icon-md">🔍</span>
              <span>VALIDATING CUBE...</span>
            </span>
          </div>
          <div className="p-8 bg-gray-300 text-center">
            <div className="text-6xl mb-4">
              <span className="inline-block animate-pulse">🧪</span>
            </div>
            <div className="text-black text-xl font-bold">Checking Cube Configuration</div>
            <div className="text-gray-600 text-sm mt-2 instruction-text">Verifying colors, edges, and corners...</div>
            <div className="mt-4 w-48 mx-auto">
              <div className="skeleton h-4 rounded"></div>
            </div>
          </div>
        </div>
        <ThreeJSErrorBoundary>
          <Cube3DViewer cubeState={initialCubeState} />
        </ThreeJSErrorBoundary>
      </div>
    );
  }

  // Solving state
  if (solverState === 'solving') {
    return (
      <div className="w-full space-y-4">
        <div className="retro-window">
          <div className="retro-title-bar">
            <span className="icon-text">
              <span className="icon-md">🧩</span>
              <span>SOLVING CUBE...</span>
            </span>
          </div>
          <div className="p-8 bg-gray-300 text-center">
            <div className="text-6xl mb-4">
              <span className="inline-block animate-spin">⏳</span>
            </div>
            <div className="text-black text-xl font-bold">Calculating Solution</div>
            <div className="text-gray-600 text-sm mt-2 instruction-text">Finding optimal moves...</div>
            <div className="mt-4 w-48 mx-auto">
              <div className="skeleton h-4 rounded"></div>
            </div>
          </div>
        </div>
        <ThreeJSErrorBoundary>
          <Cube3DViewer cubeState={initialCubeState} />
        </ThreeJSErrorBoundary>
      </div>
    );
  }

  // Validation Error state - show specific errors with actionable suggestions
  if (solverState === 'validation-error') {
    const colorErrors = validationErrors.filter(e => e.type === 'color');
    const edgeErrors = validationErrors.filter(e => e.type === 'edge');
    const cornerErrors = validationErrors.filter(e => e.type === 'corner');
    const duplicateErrors = validationErrors.filter(e => e.type === 'duplicate');
    const tips = CubeValidator.getHelpTips(validationErrors.map(e => e.message));
    
    return (
      <div className="w-full space-y-4">
        <div className="retro-window">
          <div className="retro-title-bar bg-red-600">
            <span>❌ VALIDATION ERROR</span>
          </div>
          <div className="p-4 sm:p-6 bg-gray-300">
            <div className="text-center mb-4">
              <div className="text-5xl mb-2">🚫</div>
              <div className="text-black text-xl font-bold">Invalid Cube Configuration</div>
              <div className="text-gray-700 text-sm mt-1">
                The cube state you entered is not physically possible. Please fix the errors below.
              </div>
            </div>

            {/* Error Summary */}
            <div className="retro-panel p-3 mb-4 bg-red-50">
              <div className="text-red-800 font-bold mb-2">
                Found {validationErrors.length} error{validationErrors.length > 1 ? 's' : ''}:
              </div>
              <div className="flex flex-wrap gap-2 text-sm">
                {colorErrors.length > 0 && (
                  <span className="px-2 py-1 bg-red-200 text-red-800 rounded">
                    🎨 {colorErrors.length} Color issue{colorErrors.length > 1 ? 's' : ''}
                  </span>
                )}
                {edgeErrors.length > 0 && (
                  <span className="px-2 py-1 bg-orange-200 text-orange-800 rounded">
                    📐 {edgeErrors.length} Edge error{edgeErrors.length > 1 ? 's' : ''}
                  </span>
                )}
                {cornerErrors.length > 0 && (
                  <span className="px-2 py-1 bg-yellow-200 text-yellow-800 rounded">
                    📦 {cornerErrors.length} Corner error{cornerErrors.length > 1 ? 's' : ''}
                  </span>
                )}
                {duplicateErrors.length > 0 && (
                  <span className="px-2 py-1 bg-purple-200 text-purple-800 rounded">
                    🔁 {duplicateErrors.length} Duplicate{duplicateErrors.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>

            {/* Detailed Errors */}
            <div className="retro-panel p-3 mb-4 bg-white max-h-64 overflow-y-auto">
              <div className="space-y-2">
                {validationErrors.map((error, index) => (
                  <div 
                    key={index} 
                    className="p-2 rounded text-sm border-l-4"
                    style={{
                      borderColor: error.type === 'color' ? '#dc2626' : 
                                   error.type === 'edge' ? '#ea580c' :
                                   error.type === 'corner' ? '#ca8a04' : '#9333ea',
                      backgroundColor: error.type === 'color' ? '#fef2f2' : 
                                       error.type === 'edge' ? '#fff7ed' :
                                       error.type === 'corner' ? '#fefce8' : '#faf5ff'
                    }}
                  >
                    <div className="text-black font-medium">{error.message}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Help Tips */}
            {tips.length > 0 && (
              <div className="retro-panel p-3 mb-4 bg-blue-50">
                <div className="text-blue-800 font-bold mb-2">💡 Quick Tips:</div>
                <ul className="text-blue-700 text-sm space-y-1">
                  {tips.map((tip, index) => (
                    <li key={index}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* How to Fix */}
            <div className="retro-panel p-3 mb-4 bg-green-50">
              <div className="text-green-800 font-bold mb-2">✅ How to Fix:</div>
              <ol className="text-green-700 text-sm list-decimal list-inside space-y-1">
                <li>Go back to the editor</li>
                <li>Find and correct the highlighted errors</li>
                <li>Ensure each color appears exactly 9 times</li>
                <li>Check that opposite colors (W↔Y, R↔O, G↔B) never touch</li>
                <li>Verify each edge has 2 different colors</li>
                <li>Verify each corner has 3 different colors</li>
              </ol>
            </div>

            <button 
              onClick={onBack} 
              className="retro-btn w-full py-3 bg-blue-500 text-white font-bold hover:bg-blue-600"
            >
              🔧 Fix Errors in Editor
            </button>
          </div>
        </div>
        
        {/* 3D Cube for inspection */}
        <div className="retro-window">
          <div className="retro-title-bar">
            <span>🔍 Inspect Cube (rotate to check all faces)</span>
          </div>
          <ThreeJSErrorBoundary>
            <Cube3DViewer cubeState={initialCubeState} />
          </ThreeJSErrorBoundary>
        </div>
      </div>
    );
  }

  // Already solved state
  if (solverState === 'already-solved') {
    return (
      <div className="w-full space-y-4">
        <div className="retro-window">
          <div className="retro-title-bar bg-green-600">
            <span>✅ ALREADY SOLVED</span>
          </div>
          <div className="p-6 bg-gray-300 text-center">
            <div className="text-6xl mb-4">🎉</div>
            <div className="text-black text-2xl font-bold mb-2">Cube is Already Solved!</div>
            <div className="text-gray-700 text-base mb-4">
              The cube you entered is already in the solved state. No moves needed!
            </div>
            <div className="retro-panel p-4 bg-blue-50 text-left text-sm text-black mb-4">
              <div className="font-bold mb-2">💡 To test the solver:</div>
              <ol className="list-decimal list-inside space-y-1">
                <li>Go back to the editor</li>
                <li>Mix up the colors on different faces</li>
                <li>Make sure each color appears exactly 9 times</li>
                <li>Return here to see the solution steps</li>
              </ol>
            </div>
            <button onClick={onBack} className="retro-btn w-full py-3">
              ← Back to Editor
            </button>
          </div>
        </div>
        <ThreeJSErrorBoundary>
          <Cube3DViewer cubeState={initialCubeState} />
        </ThreeJSErrorBoundary>
      </div>
    );
  }

  // Solver error state - cube is valid but solver couldn't find solution
  if (solverState === 'solver-error') {
    return (
      <div className="w-full space-y-4">
        <div className="retro-window">
          <div className="retro-title-bar bg-orange-500">
            <span>⚠️ SOLVER LIMITATION</span>
          </div>
          <div className="p-6 bg-gray-300 text-center">
            <div className="text-6xl mb-4">🤔</div>
            <div className="text-black text-xl font-bold mb-2">Solver Couldn't Find Solution</div>
            <div className="text-gray-700 text-sm mb-4">
              The cube passed validation but the solver couldn't find a solution.
              This is a limitation of the current solver algorithm.
            </div>
            
            <div className="retro-panel p-4 bg-yellow-50 text-left text-sm text-black mb-4">
              <div className="font-bold mb-2">🔧 This is NOT a cube entry error!</div>
              <p className="text-gray-700 mb-2">
                Your cube configuration is valid. The solver has limitations with very complex scrambles.
              </p>
              <div className="font-bold mb-2">Try these alternatives:</div>
              <ol className="list-decimal list-inside space-y-1">
                <li>Try a simpler scramble (fewer moves from solved)</li>
                <li>Use an online solver like csTimer or cube explorer</li>
                <li>Follow a beginner method manually (cross → corners → F2L → OLL → PLL)</li>
              </ol>
            </div>
            
            <div className="retro-panel p-4 bg-blue-50 text-left text-sm text-black mb-4">
              <div className="font-bold mb-2">💡 Test with a simple scramble:</div>
              <p>Try entering just: R U R' U' (4 moves from solved)</p>
            </div>

            <button onClick={onBack} className="retro-btn w-full py-3">
              ← Back to Editor
            </button>
          </div>
        </div>
        <ThreeJSErrorBoundary>
          <Cube3DViewer cubeState={initialCubeState} />
        </ThreeJSErrorBoundary>
      </div>
    );
  }

  // Mode selection screen
  if (!mode) {
    return (
      <div className="w-full space-y-4">
        <div className="retro-window">
          <div className="retro-title-bar">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🧩</span>
              <span>SELECT SOLVE MODE</span>
            </div>
            <button onClick={onBack} className="retro-title-btn">←</button>
          </div>
          <div className="p-6 bg-gray-300">
            {/* Solution Summary */}
            <div className="retro-panel p-4 mb-6 bg-green-100 text-center">
              <div className="text-2xl mb-2">✅ Solution Found!</div>
              <div className="text-black text-lg font-bold">
                {solution.length} moves to solve
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 lg:gap-8 w-full">
              {/* Step-by-Step Mode */}
              <button
                onClick={() => setMode('step-by-step')}
                className="retro-panel p-4 sm:p-6 hover:bg-blue-50 transition-colors text-left group w-full"
              >
                <div className="text-3xl sm:text-4xl mb-3">📋</div>
                <h3 className="text-lg sm:text-xl font-bold text-black mb-2">Step-by-Step</h3>
                <p className="text-black text-xs sm:text-sm">
                  Follow each move one at a time. Perfect for learning and 
                  understanding the solution. Navigate forward/back at your own pace.
                </p>
                <div className="mt-4 text-blue-600 group-hover:underline text-sm">
                  → Select this mode
                </div>
              </button>

              {/* Interactive Mode */}
              <button
                onClick={() => setMode('interactive')}
                className="retro-panel p-4 sm:p-6 hover:bg-green-50 transition-colors text-left group w-full"
              >
                <div className="text-3xl sm:text-4xl mb-3">🎮</div>
                <h3 className="text-lg sm:text-xl font-bold text-black mb-2">Interactive</h3>
                <p className="text-black text-xs sm:text-sm">
                  See the full solution and watch it animate. Great for visualizing 
                  the entire solve process. Includes auto-play feature.
                </p>
                <div className="mt-4 text-green-600 group-hover:underline text-sm">
                  → Select this mode
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* 3D Preview */}
        <ThreeJSErrorBoundary>
          <Cube3DViewer cubeState={currentCubeState} />
        </ThreeJSErrorBoundary>

        <button onClick={onBack} className="retro-btn w-full py-3">
          ← Back to Editor
        </button>
      </div>
    );
  }

  // Step-by-Step Mode
  if (mode === 'step-by-step') {
    const currentMove = solution[currentStep];
    const isComplete = currentStep >= solution.length;

    return (
      <div className="w-full space-y-4">
        {/* Header */}
        <div className="retro-window">
          <div className="retro-title-bar">
            <div className="flex items-center gap-2">
              <span>📋 STEP-BY-STEP SOLVER</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setMode(null)} className="retro-title-btn">
                Mode
              </button>
              <button onClick={onBack} className="retro-title-btn">←</button>
            </div>
          </div>
          <div className="p-4 bg-gray-300">
            {/* Progress */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-black text-sm">
                Step {Math.min(currentStep + 1, solution.length)} of {solution.length}
              </span>
              <span className="retro-panel px-3 py-1 text-black">
                {isComplete ? '✅ SOLVED!' : `${Math.round((currentStep / solution.length) * 100)}%`}
              </span>
            </div>

            {/* Progress bar - smooth animation */}
            <div className="bg-gray-400 border-2 mb-4 rounded-sm overflow-hidden" style={{ borderColor: '#fff #808080 #808080 #fff' }}>
              <div 
                className="bg-gradient-to-r from-blue-400 to-blue-500 h-4 progress-bar-smooth"
                style={{ width: `${(currentStep / solution.length) * 100}%` }}
              />
            </div>

            {/* Current Move Display */}
            {!isComplete ? (
              <div className="retro-panel p-4 mb-4">
                <div className="text-center">
                  <div className="text-6xl font-bold text-black mb-2">
                    {currentMove?.notation}
                  </div>
                  <div className="text-black text-lg mb-4">
                    {currentMove?.description}
                  </div>
                </div>
                
                {/* Visual instruction */}
                <div className="retro-panel p-3 bg-yellow-50 text-sm text-black">
                  <div className="font-bold mb-2">🔧 How to do this move on your cube:</div>
                  <div>
                    {currentMove?.notation.includes("'") ? (
                      <span>Rotate the <strong>{currentMove?.face}</strong> face <strong>COUNTER-CLOCKWISE</strong> (to the left) 90°</span>
                    ) : currentMove?.notation.includes("2") ? (
                      <span>Rotate the <strong>{currentMove?.face}</strong> face <strong>180°</strong> (half turn, either direction)</span>
                    ) : (
                      <span>Rotate the <strong>{currentMove?.face}</strong> face <strong>CLOCKWISE</strong> (to the right) 90°</span>
                    )}
                  </div>
                  <div className="mt-2 text-xs text-gray-600">
                    The highlighted layer on the 3D cube shows which face to turn. Watch how the cube changes after clicking Next!
                  </div>
                </div>
              </div>
            ) : (
              <div className="retro-panel p-4 mb-4 text-center bg-green-100">
                <div className="text-4xl mb-2">🎉</div>
                <div className="text-xl font-bold text-black">
                  Cube Solved!
                </div>
                <div className="text-black text-sm mt-2">
                  Completed in {solution.length} moves
                </div>
              </div>
            )}

            {/* Navigation Controls */}
            <div className="flex gap-2 mb-3">
              <button
                onClick={handlePrevStep}
                disabled={currentStep === 0 || isAnimating || isPlaying}
                aria-label="Previous step"
                className="retro-btn flex-1 focus-ring"
              >
                <span className="icon-text">
                  <span>←</span>
                  <span>Previous</span>
                </span>
              </button>
              <Tooltip text="Reset to beginning">
                <button
                  onClick={handleReset}
                  disabled={isPlaying}
                  aria-label="Reset"
                  className="retro-btn focus-ring"
                >
                  ⏮
                </button>
              </Tooltip>
              <button
                onClick={handleNextStep}
                disabled={isComplete || isAnimating || isPlaying}
                aria-label="Next step"
                className="retro-btn flex-1 focus-ring"
              >
                <span className="icon-text">
                  <span>{isAnimating ? '...' : 'Next'}</span>
                  <span>→</span>
                </span>
              </button>
            </div>

            {/* Playback Controls - Enhanced */}
            <div className="retro-panel p-3 bg-gray-200">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handlePlayAll}
                  disabled={isComplete && !isPlaying}
                  aria-label={isPlaying && !isPaused ? 'Pause' : isPaused ? 'Resume' : 'Play all'}
                  className={`retro-btn px-4 focus-ring transition-smooth ${
                    isPlaying && !isPaused 
                      ? 'bg-yellow-200 hover:bg-yellow-300' 
                      : 'retro-btn-success'
                  }`}
                >
                  <span className="icon-text">
                    <span>{isPlaying && !isPaused ? '⏸' : '▶'}</span>
                    <span>{isPlaying && !isPaused ? 'Pause' : isPaused ? 'Resume' : 'Play All'}</span>
                  </span>
                </button>
                
                {(isPlaying || isPaused) && (
                  <button
                    onClick={handleStop}
                    aria-label="Stop playback"
                    className="retro-btn px-3 retro-btn-danger focus-ring"
                  >
                    <span className="icon-text">
                      <span>⏹</span>
                      <span>Stop</span>
                    </span>
                  </button>
                )}

                {/* Speed Control */}
                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-black text-xs font-bold">Speed:</span>
                  <div className="flex gap-1">
                    {([0.5, 1, 2] as const).map(speed => (
                      <button
                        key={speed}
                        onClick={() => handleSpeedChange(speed)}
                        aria-label={`Set speed to ${speed}x`}
                        aria-pressed={animationSpeed === speed}
                        className={`retro-btn px-2 py-1 text-xs focus-ring transition-smooth ${
                          animationSpeed === speed ? 'bg-blue-300 ring-2 ring-blue-500' : ''
                        }`}
                      >
                        {speed}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cube Views - 2D Net and 3D */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 w-full">
          {/* 2D Animated Net View */}
          <div className="retro-window w-full min-w-0">
            <div className="retro-title-bar">
              <span>📐 2D Net View</span>
            </div>
            <div className="p-3 sm:p-4 bg-gray-300">
              <Suspense fallback={<div className="text-center py-8">Loading...</div>}>
                <CubeNetUnfolding 
                  state={currentCubeState} 
                  autoAnimate={false}
                  animatingMove={isAnimating ? currentMove?.notation : null}
                />
              </Suspense>
            </div>
          </div>

          {/* 3D Cube with highlighted layer */}
          <ThreeJSErrorBoundary>
            <Cube3DViewer 
              cubeState={currentCubeState} 
              highlightLayer={highlightedLayer}
              animatingMove={isAnimating ? currentMove?.notation : null}
              animationSpeed={animationSpeed}
            />
          </ThreeJSErrorBoundary>
        </div>

        {/* Move List */}
        <div className="retro-window">
          <div className="retro-title-bar">
            <span>📝 All Moves</span>
          </div>
          <div className="p-4 bg-gray-300 max-h-48 overflow-y-auto">
            <div className="flex flex-wrap gap-2">
              {solution.map((move, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentStep(idx)}
                  className={`retro-btn px-3 py-2 text-sm ${
                    idx === currentStep ? 'ring-2 ring-yellow-400 bg-yellow-100' : ''
                  } ${completedSteps.has(idx) ? 'bg-green-100' : ''}`}
                >
                  {move.notation}
                  {completedSteps.has(idx) && ' ✓'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Interactive Mode
  if (mode === 'interactive') {
    const isComplete = currentStep >= solution.length;

    return (
      <div className="w-full space-y-4">
        {/* Header */}
        <div className="retro-window">
          <div className="retro-title-bar">
            <div className="flex items-center gap-2">
              <span>🎮 INTERACTIVE SOLVER</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setMode(null)} className="retro-title-btn">
                Mode
              </button>
              <button onClick={onBack} className="retro-title-btn">←</button>
            </div>
          </div>
          <div className="p-4 bg-gray-300">
            {/* Solution display */}
            <div className="retro-panel p-4 mb-4">
              <div className="text-black font-bold mb-2">Solution ({solution.length} moves):</div>
              <div className="flex flex-wrap gap-2">
                {solution.map((move, idx) => (
                  <span
                    key={idx}
                    className={`px-2 py-1 rounded text-sm ${
                      idx < currentStep 
                        ? 'bg-green-200 text-green-800' 
                        : idx === currentStep 
                          ? 'bg-yellow-300 text-black font-bold animate-pulse' 
                          : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {move.notation}
                  </span>
                ))}
              </div>
            </div>

            {/* Controls - Enhanced */}
            <div className="retro-panel p-3 bg-gray-200 mb-4">
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <button
                  onClick={handlePlayAll}
                  disabled={isComplete && !isPlaying}
                  aria-label={isPlaying && !isPaused ? 'Pause' : isPaused ? 'Resume' : 'Play all'}
                  className={`retro-btn px-4 focus-ring transition-smooth ${
                    isPlaying && !isPaused 
                      ? 'bg-yellow-200 hover:bg-yellow-300' 
                      : 'retro-btn-success'
                  }`}
                >
                  <span className="icon-text">
                    <span>{isPlaying && !isPaused ? '⏸' : '▶'}</span>
                    <span>{isPlaying && !isPaused ? 'Pause' : isPaused ? 'Resume' : 'Play All'}</span>
                  </span>
                </button>
                
                {(isPlaying || isPaused) && (
                  <button
                    onClick={handleStop}
                    aria-label="Stop playback"
                    className="retro-btn px-3 retro-btn-danger focus-ring"
                  >
                    <span className="icon-text">
                      <span>⏹</span>
                      <span>Stop</span>
                    </span>
                  </button>
                )}
                
                <button
                  onClick={handlePrevStep}
                  disabled={currentStep === 0 || isAnimating || isPlaying}
                  aria-label="Previous step"
                  className="retro-btn focus-ring"
                >
                  ◀ Prev
                </button>
                <button
                  onClick={handleNextStep}
                  disabled={isComplete || isAnimating || isPlaying}
                  aria-label="Next step"
                  className="retro-btn focus-ring"
                >
                  Next ▶
                </button>
                <Tooltip text="Reset to beginning">
                  <button
                    onClick={handleReset}
                    disabled={isPlaying}
                    aria-label="Reset"
                    className="retro-btn focus-ring"
                  >
                    ⏮
                  </button>
                </Tooltip>
              </div>
              
              {/* Speed Control */}
              <div className="flex items-center gap-2">
                <span className="text-black text-xs font-bold">Speed:</span>
                <div className="flex gap-1">
                  {([0.5, 1, 2] as const).map(speed => (
                    <button
                      key={speed}
                      onClick={() => handleSpeedChange(speed)}
                      aria-label={`Set speed to ${speed}x`}
                      aria-pressed={animationSpeed === speed}
                      className={`retro-btn px-2 py-1 text-xs focus-ring transition-smooth ${
                        animationSpeed === speed ? 'bg-blue-300 ring-2 ring-blue-500' : ''
                      }`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
                <span className="text-gray-600 text-xs ml-2">
                  {animationSpeed === 0.5 ? 'Slow' : animationSpeed === 1 ? 'Normal' : 'Fast'}
                </span>
              </div>
            </div>

            {isComplete && (
              <div className="retro-panel p-3 bg-green-100 text-center success-pulse validation-success-animation">
                <span className="icon-text justify-center">
                  <span className="icon-lg">🎉</span>
                  <span className="text-black font-bold">Cube Solved!</span>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Cube Views - 2D Net and 3D */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 w-full">
          {/* 2D Animated Net View */}
          <div className="retro-window w-full min-w-0">
            <div className="retro-title-bar">
              <span>📐 2D Net View</span>
            </div>
            <div className="p-3 sm:p-4 bg-gray-300">
              <Suspense fallback={<div className="text-center py-8">Loading...</div>}>
                <CubeNetUnfolding 
                  state={currentCubeState} 
                  autoAnimate={false}
                  animatingMove={isAnimating ? solution[currentStep]?.notation : null}
                />
              </Suspense>
            </div>
          </div>

          {/* 3D Cube */}
          <ThreeJSErrorBoundary>
            <Cube3DViewer 
              cubeState={currentCubeState} 
              highlightLayer={highlightedLayer}
              animatingMove={isAnimating ? solution[currentStep]?.notation : null}
              animationSpeed={animationSpeed}
            />
          </ThreeJSErrorBoundary>
        </div>

        {/* Move Notation Legend */}
        <div className="retro-window">
          <div className="retro-title-bar">
            <span>📖 Move Notation Guide</span>
          </div>
          <div className="p-4 bg-gray-300">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-black">
              <div className="retro-panel p-2">
                <strong>R</strong> = Right clockwise
              </div>
              <div className="retro-panel p-2">
                <strong>R'</strong> = Right counter-clockwise
              </div>
              <div className="retro-panel p-2">
                <strong>R2</strong> = Right 180°
              </div>
              <div className="retro-panel p-2">
                <strong>U</strong> = Up clockwise
              </div>
              <div className="retro-panel p-2">
                <strong>F</strong> = Front clockwise
              </div>
              <div className="retro-panel p-2">
                <strong>L/D/B</strong> = Left/Down/Back
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
