import { useState, useCallback, useEffect, lazy, Suspense, memo } from 'react';
import type { CubeState } from './types/cube';
import * as authService from './services/auth';
import ManualCubeEditor from './components/ManualCubeEditor';
import SolverView from './components/SolverView';
import StatsView from './components/StatsView';
import ErrorBoundary, { ThreeJSErrorBoundary } from './components/ErrorBoundary';

const CubeNetUnfolding = lazy(() => import('./components/CubeNetUnfolding'));
const HelpModal = lazy(() => import('./components/HelpModal'));
const AuthModal = lazy(() => import('./components/AuthModal'));
const AboutModal = lazy(() => import('./components/AboutModal'));

type ViewMode = 'editor' | 'visualizer' | 'solver' | 'stats';

// LocalStorage keys for state persistence
const STORAGE_KEYS = {
  CUBE_STATE: 'rubiksight_cube_state',
  VIEW_MODE: 'rubiksight_view_mode',
  USER: 'rubik_user',
  AUTH_TOKEN: 'rubik_auth_token'
};

// Helper to safely parse JSON from localStorage
const getStoredState = <T,>(key: string, defaultValue: T): T => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
};

const RetroLoader = memo(() => (
  <div className="retro-window p-4">
    <div className="retro-panel flex items-center justify-center h-32">
      <div className="text-center">
        <div className="text-2xl text-black mb-2">LOADING...</div>
        <div className="w-48 h-6 bg-white border-4 mx-auto" style={{
          borderColor: '#808080 #ffffff #ffffff #808080'
        }}>
          <div className="h-full bg-linear-to-r from-blue-800 via-blue-500 to-blue-800 animate-pulse" 
               style={{ width: '60%' }} />
        </div>
      </div>
    </div>
  </div>
));
RetroLoader.displayName = 'RetroLoader';

function App() {
  // Initialize state from localStorage for persistence
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const stored = getStoredState<ViewMode>(STORAGE_KEYS.VIEW_MODE, 'editor');
    // Don't restore solver view (requires fresh state)
    return stored === 'solver' ? 'editor' : stored;
  });
  const [cubeState, setCubeState] = useState<CubeState | null>(() => 
    getStoredState<CubeState | null>(STORAGE_KEYS.CUBE_STATE, null)
  );
  const [user, setUser] = useState<authService.User | null>(() =>
    getStoredState<authService.User | null>(STORAGE_KEYS.USER, null)
  );
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  // Persist cube state to localStorage whenever it changes
  useEffect(() => {
    if (cubeState) {
      localStorage.setItem(STORAGE_KEYS.CUBE_STATE, JSON.stringify(cubeState));
    }
  }, [cubeState]);

  // Persist view mode to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.VIEW_MODE, JSON.stringify(viewMode));
  }, [viewMode]);

  // Persist user to localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.USER);
      localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    }
  }, [user]);

  const handleCubeComplete = useCallback((cube: CubeState) => {
    setCubeState(cube);
    setViewMode('visualizer');
  }, []);

  const handleBackToEditor = useCallback(() => {
    // Keep cube state when going back - don't reset to null
    setViewMode('editor');
  }, []);

  const handleSolveClick = useCallback(() => {
    if (!user) {
      setShowAuthModal(true);
    } else {
      setViewMode('solver');
    }
  }, [user]);

  const handleAuthSuccess = useCallback((userData: authService.User) => {
    setUser(userData);
    setShowAuthModal(false);
  }, []);

  return (
    <ErrorBoundary>
      <div className="min-h-screen h-full w-full bg-gradient-to-b from-gray-200 to-gray-300 overflow-x-hidden">
        {/* Skip to main content link for accessibility */}
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        
        <div className="app-container w-full">
        {/* Header */}
        <div className="retro-window mb-4">
          <div className="retro-title-bar bg-blue-600">
            <div className="flex items-center gap-3">
              <span className="icon-lg">🎮</span>
              <div>
                <div className="font-bold text-sm sm:text-lg">RUBIK'S CUBE SOLVER</div>
                <div className="text-xs opacity-90 hidden sm:block instruction-text">Manual Entry • 3D Visualization • AI Solver</div>
              </div>
            </div>
            <div className="flex gap-1">
              <button 
                className="retro-title-btn focus-ring" 
                onClick={() => setShowAbout(true)}
                title="About"
                aria-label="About RubikSight"
              >ℹ</button>
              <button 
                className="retro-title-btn focus-ring" 
                onClick={() => setShowHelp(true)}
                title="Help"
                aria-label="Open help"
              >?</button>
              <button 
                className="retro-title-btn focus-ring"
                onClick={() => user ? setUser(null) : setShowAuthModal(true)}
                title={user ? 'Logout' : 'Login'}
                aria-label={user ? 'Logout' : 'Login'}
              >{user ? '🚪' : '👤'}</button>
            </div>
          </div>
          <div className="p-2 sm:p-4 bg-gray-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="text-black">
              {user ? (
                <div className="flex items-center gap-3">
                  <span className="text-sm sm:text-base icon-text">
                    <span>✓</span>
                    <span>Welcome, <strong>{user.name}</strong>!</span>
                  </span>
                  <button
                    onClick={() => setViewMode('stats')}
                    className="retro-btn text-xs px-2 py-1 focus-ring"
                    title="View Statistics"
                    aria-label="View your statistics"
                  >
                    📊 Stats
                  </button>
                </div>
              ) : (
                <span className="text-xs sm:text-sm text-gray-600 instruction-text">Sign in to unlock Solve feature</span>
              )}
            </div>
            <button
              onClick={() => setShowAuthModal(true)}
              className={`retro-btn text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 focus-ring ${
                user ? 'opacity-50' : ''
              }`}
              disabled={!!user}
              aria-label={user ? 'Already signed in' : 'Sign in to your account'}
            >
              {user ? '✓ Signed In' : '🔐 Sign In'}
            </button>
          </div>
        </div>

        {/* Main Content */}
        <main id="main-content" className="w-full">
          {viewMode === 'editor' && (
            <ManualCubeEditor 
              onComplete={handleCubeComplete}
              initialState={cubeState}
            />
          )}

          {viewMode === 'visualizer' && cubeState && (
            <div className="retro-window mb-4">
              <div className="retro-title-bar">
                <span className="icon-text">
                  <span className="icon-md">🧩</span>
                  <span>3D CUBE VISUALIZATION</span>
                </span>
              </div>
              <div className="p-4 bg-gray-300">
                {/* Animated Unfolding Cube Net View */}
                <Suspense fallback={<RetroLoader />}>
                  <CubeNetUnfolding 
                    state={cubeState} 
                    autoAnimate={true}
                  />
                </Suspense>
                
                <div className="mt-4 flex gap-2 flex-wrap">
                  <button
                    onClick={handleBackToEditor}
                    className="retro-btn flex-1 focus-ring"
                    aria-label="Go back to editor"
                  >
                    <span className="icon-text">
                      <span>←</span>
                      <span>Back to Editor</span>
                    </span>
                  </button>
                  <button
                    onClick={handleSolveClick}
                    className={`retro-btn flex-1 font-bold focus-ring ${
                      user ? 'retro-btn-success' : 'bg-yellow-400'
                    }`}
                    aria-label={user ? 'Start solving the cube' : 'Login required to solve'}
                  >
                    <span className="icon-text justify-center">
                      <span>{user ? '🎯' : '🔐'}</span>
                      <span>{user ? 'SOLVE' : 'Solve (Login Required)'}</span>
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {viewMode === 'solver' && cubeState && user && (
            <ThreeJSErrorBoundary>
              <SolverView 
                cubeState={cubeState} 
                onBack={() => setViewMode('visualizer')} 
              />
            </ThreeJSErrorBoundary>
          )}

          {viewMode === 'stats' && user && (
            <StatsView
              onBack={() => setViewMode('editor')}
              userName={user.name}
            />
          )}
        </main>

        {/* Auth Modal */}
        {showAuthModal && (
          <Suspense fallback={<RetroLoader />}>
            <AuthModal
              onClose={() => setShowAuthModal(false)}
              onLogin={handleAuthSuccess}
            />
          </Suspense>
        )}

        {/* Help Modal */}
        {showHelp && (
          <Suspense fallback={<RetroLoader />}>
            <HelpModal onClose={() => setShowHelp(false)} />
          </Suspense>
        )}

        {/* About Modal */}
        {showAbout && (
          <Suspense fallback={<RetroLoader />}>
            <AboutModal onClose={() => setShowAbout(false)} />
          </Suspense>
        )}
      </div>
    </div>
    </ErrorBoundary>
  );
}

export default App;