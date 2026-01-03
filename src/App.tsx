import { useState, useCallback, useEffect, lazy, Suspense, memo } from 'react';
import type { CubeState } from './types/cube';
import * as authService from './services/auth';
import ManualCubeEditor from './components/ManualCubeEditor';
import SolverView from './components/SolverView';
import StatsView from './components/StatsView';
import ErrorBoundary, { ThreeJSErrorBoundary } from './components/ErrorBoundary';

const CubeNet = lazy(() => import('./components/CubeNet'));
const CubeNetUnfolding = lazy(() => import('./components/CubeNetUnfolding'));
const HelpModal = lazy(() => import('./components/HelpModal'));
const AuthModal = lazy(() => import('./components/AuthModal'));

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
      <div className="min-h-screen bg-gradient-to-b from-gray-200 to-gray-300 overflow-x-hidden">
        <div className="w-full max-w-7xl mx-auto p-2 sm:p-4 box-border">
        {/* Header */}
        <div className="retro-window mb-4">
          <div className="retro-title-bar bg-blue-600">
            <div className="flex items-center gap-3">
              <span className="text-2xl sm:text-3xl">🎮</span>
              <div>
                <div className="font-bold text-sm sm:text-lg">RUBIK'S CUBE SOLVER</div>
                <div className="text-xs opacity-90 hidden sm:block">Manual Entry • 3D Visualization • AI Solver</div>
              </div>
            </div>
            <div className="retro-title-buttons">
              <button 
                className="retro-title-btn" 
                onClick={() => setShowHelp(true)}
                title="Help"
              >?</button>
              <button 
                className="retro-title-btn"
                onClick={() => user ? setUser(null) : setShowAuthModal(true)}
                title={user ? 'Logout' : 'Login'}
              >{user ? '🚪' : '👤'}</button>
            </div>
          </div>
          <div className="p-2 sm:p-4 bg-gray-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="text-black">
              {user ? (
                <div className="flex items-center gap-3">
                  <span className="text-sm sm:text-base">Welcome, <strong>{user.name}</strong>! ✓</span>
                  <button
                    onClick={() => setViewMode('stats')}
                    className="retro-btn text-xs px-2 py-1"
                    title="View Statistics"
                  >
                    📊 Stats
                  </button>
                </div>
              ) : (
                <span className="text-xs sm:text-sm text-gray-600">Sign in to unlock Solve feature</span>
              )}
            </div>
            <button
              onClick={() => setShowAuthModal(true)}
              className={`retro-btn text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 ${
                user ? 'opacity-50' : ''
              }`}
              disabled={!!user}
            >
              {user ? '✓ Signed In' : '🔐 Sign In'}
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="w-full">
          {viewMode === 'editor' && (
            <ManualCubeEditor 
              onComplete={handleCubeComplete}
              initialState={cubeState}
            />
          )}

          {viewMode === 'visualizer' && cubeState && (
            <div className="retro-window mb-4">
              <div className="retro-title-bar">
                <span>🧩 3D CUBE VISUALIZATION</span>
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
                    className="retro-btn flex-1"
                  >
                    ← Back to Editor
                  </button>
                  <button
                    onClick={handleSolveClick}
                    className={`retro-btn flex-1 font-bold ${
                      user ? 'bg-green-500 text-white' : 'bg-yellow-400'
                    }`}
                  >
                    {user ? '🎯 SOLVE' : '🔐 Solve (Login Required)'}
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
        </div>

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
      </div>
    </div>
    </ErrorBoundary>
  );
}

export default App;
