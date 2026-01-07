import { memo, useCallback, useEffect, useState } from 'react';

interface AboutModalProps {
  onClose: () => void;
}

type TabId = 'about' | 'features' | 'tech' | 'moves' | 'credits';

interface TabContent {
  id: TabId;
  label: string;
  icon: string;
}

const TABS: TabContent[] = [
  { id: 'about', label: 'About', icon: '🎲' },
  { id: 'features', label: 'Features', icon: '✨' },
  { id: 'tech', label: 'Tech Stack', icon: '⚙️' },
  { id: 'moves', label: 'Notation', icon: '🔤' },
  { id: 'credits', label: 'Credits', icon: '👏' },
];

function AboutModal({ onClose }: AboutModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('about');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  const stopPropagation = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <div 
      className="modal-overlay"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-title"
    >
      <div 
        className="modal-content retro-window"
        onClick={stopPropagation}
        style={{
          boxShadow: '8px 8px 0 rgba(0,0,0,0.5), 0 0 50px rgba(0,217,255,0.3)',
          maxWidth: '800px',
          width: '95vw',
        }}
      >
        {/* Title Bar */}
        <div className="retro-title-bar">
          <div className="flex items-center gap-2">
            <span className="icon-lg">ℹ️</span>
            <span id="about-title" className="font-bold">About RubikSight</span>
          </div>
          <button 
            className="retro-title-btn focus-ring" 
            onClick={onClose}
            aria-label="Close about"
            style={{ color: '#e94560' }}
          >
            ×
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-gray-400 p-2 flex flex-wrap gap-1 border-b-2 border-gray-500">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`retro-btn text-xs sm:text-sm px-2 sm:px-3 py-1 ${
                activeTab === tab.id ? 'retro-btn-primary-enhanced' : ''
              }`}
            >
              <span className="icon-text">
                <span>{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="modal-body bg-gray-300 p-3 sm:p-4" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
          
          {/* About Tab */}
          {activeTab === 'about' && (
            <div className="space-y-4">
              <div className="retro-panel p-4 text-center soft-shadow bg-gradient-to-r from-blue-100 to-purple-100">
                <div className="text-5xl mb-3">🎲</div>
                <h2 className="text-2xl font-bold text-black mb-2">RubikSight</h2>
                <p className="text-gray-700 text-sm">Version 1.0.0</p>
              </div>

              <div className="retro-panel p-4">
                <h3 className="font-bold text-black mb-2">🎯 What is RubikSight?</h3>
                <p className="text-gray-700 text-sm instruction-text mb-3">
                  RubikSight is a modern, web-based Rubik's Cube solver that helps you solve your physical cube 
                  step-by-step. Simply enter the colors of your cube, and our intelligent algorithm will 
                  generate a solution using the popular Fridrich/CFOP method.
                </p>
                <p className="text-gray-700 text-sm instruction-text">
                  Unlike other solvers, RubikSight features a retro Windows 95-inspired design, 
                  real-time 3D visualization, comprehensive validation, and tracking of your solve history.
                </p>
              </div>

              <div className="retro-panel p-4 bg-yellow-50">
                <h3 className="font-bold text-black mb-2">📖 How It Works</h3>
                <ol className="text-gray-700 text-sm space-y-2 list-decimal list-inside">
                  <li><strong>Enter</strong> - Paint your cube's colors face by face</li>
                  <li><strong>Validate</strong> - Our system checks for impossible configurations</li>
                  <li><strong>Solve</strong> - Get a step-by-step solution with 3D visualization</li>
                  <li><strong>Execute</strong> - Follow the moves on your physical cube</li>
                </ol>
              </div>

              <div className="retro-panel p-4 bg-green-50">
                <h3 className="font-bold text-black mb-2">🔒 Privacy First</h3>
                <p className="text-gray-700 text-sm instruction-text">
                  All cube processing happens locally in your browser. We only store your solve history 
                  if you create an account. Your data is yours.
                </p>
              </div>
            </div>
          )}

          {/* Features Tab */}
          {activeTab === 'features' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="retro-panel p-3 soft-shadow">
                  <div className="text-2xl mb-2">✏️</div>
                  <h3 className="font-bold text-black text-sm">Manual Entry</h3>
                  <p className="text-gray-600 text-xs">Click-to-paint interface with locked centers and keyboard shortcuts</p>
                </div>
                <div className="retro-panel p-3 soft-shadow">
                  <div className="text-2xl mb-2">✅</div>
                  <h3 className="font-bold text-black text-sm">Real-time Validation</h3>
                  <p className="text-gray-600 text-xs">Instant feedback on edge pieces, corners, and color counts</p>
                </div>
                <div className="retro-panel p-3 soft-shadow">
                  <div className="text-2xl mb-2">🧩</div>
                  <h3 className="font-bold text-black text-sm">Smart Solver</h3>
                  <p className="text-gray-600 text-xs">Fridrich/CFOP method for efficient, human-friendly solutions</p>
                </div>
                <div className="retro-panel p-3 soft-shadow">
                  <div className="text-2xl mb-2">🎮</div>
                  <h3 className="font-bold text-black text-sm">3D Visualization</h3>
                  <p className="text-gray-600 text-xs">Interactive Three.js cube with rotation and layer highlighting</p>
                </div>
                <div className="retro-panel p-3 soft-shadow">
                  <div className="text-2xl mb-2">📊</div>
                  <h3 className="font-bold text-black text-sm">Statistics</h3>
                  <p className="text-gray-600 text-xs">Track your progress with solve history and averages</p>
                </div>
                <div className="retro-panel p-3 soft-shadow">
                  <div className="text-2xl mb-2">📱</div>
                  <h3 className="font-bold text-black text-sm">Cross-Platform</h3>
                  <p className="text-gray-600 text-xs">PWA support for desktop, mobile, and offline use</p>
                </div>
                <div className="retro-panel p-3 soft-shadow">
                  <div className="text-2xl mb-2">↩️</div>
                  <h3 className="font-bold text-black text-sm">Undo/Redo</h3>
                  <p className="text-gray-600 text-xs">Full state history with unlimited undo/redo support</p>
                </div>
                <div className="retro-panel p-3 soft-shadow">
                  <div className="text-2xl mb-2">♿</div>
                  <h3 className="font-bold text-black text-sm">Accessible</h3>
                  <p className="text-gray-600 text-xs">Keyboard navigation, focus states, and screen reader support</p>
                </div>
              </div>
            </div>
          )}

          {/* Tech Stack Tab */}
          {activeTab === 'tech' && (
            <div className="space-y-4">
              <div className="retro-panel p-4 bg-blue-50">
                <h3 className="font-bold text-black mb-3">🖥️ Frontend</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div className="bg-white p-2 rounded text-center">
                    <div className="font-bold text-sm">React 19</div>
                    <div className="text-xs text-gray-500">UI Framework</div>
                  </div>
                  <div className="bg-white p-2 rounded text-center">
                    <div className="font-bold text-sm">TypeScript</div>
                    <div className="text-xs text-gray-500">Type Safety</div>
                  </div>
                  <div className="bg-white p-2 rounded text-center">
                    <div className="font-bold text-sm">Tailwind v4</div>
                    <div className="text-xs text-gray-500">Styling</div>
                  </div>
                  <div className="bg-white p-2 rounded text-center">
                    <div className="font-bold text-sm">Three.js</div>
                    <div className="text-xs text-gray-500">3D Graphics</div>
                  </div>
                  <div className="bg-white p-2 rounded text-center">
                    <div className="font-bold text-sm">React Three Fiber</div>
                    <div className="text-xs text-gray-500">React + Three.js</div>
                  </div>
                  <div className="bg-white p-2 rounded text-center">
                    <div className="font-bold text-sm">Vite v7</div>
                    <div className="text-xs text-gray-500">Build Tool</div>
                  </div>
                </div>
              </div>

              <div className="retro-panel p-4 bg-green-50">
                <h3 className="font-bold text-black mb-3">🔧 Backend</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div className="bg-white p-2 rounded text-center">
                    <div className="font-bold text-sm">Node.js</div>
                    <div className="text-xs text-gray-500">Runtime</div>
                  </div>
                  <div className="bg-white p-2 rounded text-center">
                    <div className="font-bold text-sm">Express.js</div>
                    <div className="text-xs text-gray-500">API Server</div>
                  </div>
                  <div className="bg-white p-2 rounded text-center">
                    <div className="font-bold text-sm">MongoDB</div>
                    <div className="text-xs text-gray-500">Database</div>
                  </div>
                  <div className="bg-white p-2 rounded text-center">
                    <div className="font-bold text-sm">JWT</div>
                    <div className="text-xs text-gray-500">Authentication</div>
                  </div>
                  <div className="bg-white p-2 rounded text-center">
                    <div className="font-bold text-sm">bcrypt</div>
                    <div className="text-xs text-gray-500">Password Hash</div>
                  </div>
                  <div className="bg-white p-2 rounded text-center">
                    <div className="font-bold text-sm">Mongoose</div>
                    <div className="text-xs text-gray-500">ODM</div>
                  </div>
                </div>
              </div>

              <div className="retro-panel p-4 bg-purple-50">
                <h3 className="font-bold text-black mb-3">🧩 Cube Solving</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white p-2 rounded text-center">
                    <div className="font-bold text-sm">rubiks-cube-solver</div>
                    <div className="text-xs text-gray-500">Fridrich/CFOP Algorithm</div>
                  </div>
                  <div className="bg-white p-2 rounded text-center">
                    <div className="font-bold text-sm">Custom Validator</div>
                    <div className="text-xs text-gray-500">Edge/Corner/Parity Check</div>
                  </div>
                </div>
              </div>

              <div className="retro-panel p-4 bg-orange-50">
                <h3 className="font-bold text-black mb-3">🛠️ Dev Tools</h3>
                <div className="flex flex-wrap gap-2">
                  <span className="bg-white px-2 py-1 rounded text-xs">ESLint</span>
                  <span className="bg-white px-2 py-1 rounded text-xs">Vitest</span>
                  <span className="bg-white px-2 py-1 rounded text-xs">PostCSS</span>
                  <span className="bg-white px-2 py-1 rounded text-xs">PWA Plugin</span>
                  <span className="bg-white px-2 py-1 rounded text-xs">Workbox</span>
                </div>
              </div>
            </div>
          )}

          {/* Moves Tab */}
          {activeTab === 'moves' && (
            <div className="space-y-4">
              <div className="retro-panel p-4 bg-yellow-50">
                <h3 className="font-bold text-black mb-2">📖 Standard Notation</h3>
                <p className="text-gray-700 text-sm instruction-text mb-3">
                  Rubik's Cube moves use a simple letter system. Each letter represents a face, 
                  and symbols indicate direction and amount of rotation.
                </p>
              </div>

              <div className="retro-panel p-4">
                <h3 className="font-bold text-black mb-3">🎯 The 6 Faces</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div className="bg-white p-3 rounded text-center border-2 border-white">
                    <div className="w-8 h-8 mx-auto mb-1 rounded" style={{ backgroundColor: '#FFFFFF', border: '2px solid #ccc' }}></div>
                    <div className="font-bold">U (Up)</div>
                    <div className="text-xs text-gray-500">Top face - White</div>
                  </div>
                  <div className="bg-yellow-100 p-3 rounded text-center">
                    <div className="w-8 h-8 mx-auto mb-1 rounded" style={{ backgroundColor: '#FFD500' }}></div>
                    <div className="font-bold">D (Down)</div>
                    <div className="text-xs text-gray-500">Bottom face - Yellow</div>
                  </div>
                  <div className="bg-green-100 p-3 rounded text-center">
                    <div className="w-8 h-8 mx-auto mb-1 rounded" style={{ backgroundColor: '#009B48' }}></div>
                    <div className="font-bold">F (Front)</div>
                    <div className="text-xs text-gray-500">Front face - Green</div>
                  </div>
                  <div className="bg-blue-100 p-3 rounded text-center">
                    <div className="w-8 h-8 mx-auto mb-1 rounded" style={{ backgroundColor: '#0051BA' }}></div>
                    <div className="font-bold">B (Back)</div>
                    <div className="text-xs text-gray-500">Back face - Blue</div>
                  </div>
                  <div className="bg-red-100 p-3 rounded text-center">
                    <div className="w-8 h-8 mx-auto mb-1 rounded" style={{ backgroundColor: '#C41E3A' }}></div>
                    <div className="font-bold">R (Right)</div>
                    <div className="text-xs text-gray-500">Right face - Red</div>
                  </div>
                  <div className="bg-orange-100 p-3 rounded text-center">
                    <div className="w-8 h-8 mx-auto mb-1 rounded" style={{ backgroundColor: '#FF5800' }}></div>
                    <div className="font-bold">L (Left)</div>
                    <div className="text-xs text-gray-500">Left face - Orange</div>
                  </div>
                </div>
              </div>

              <div className="retro-panel p-4">
                <h3 className="font-bold text-black mb-3">↻ Move Types</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 bg-gray-100 p-2 rounded">
                    <span className="font-mono font-bold text-lg w-12 text-center">R</span>
                    <span className="text-sm">Turn right face 90° clockwise</span>
                  </div>
                  <div className="flex items-center gap-3 bg-gray-100 p-2 rounded">
                    <span className="font-mono font-bold text-lg w-12 text-center">R'</span>
                    <span className="text-sm">Turn right face 90° counter-clockwise (prime)</span>
                  </div>
                  <div className="flex items-center gap-3 bg-gray-100 p-2 rounded">
                    <span className="font-mono font-bold text-lg w-12 text-center">R2</span>
                    <span className="text-sm">Turn right face 180° (half turn)</span>
                  </div>
                </div>
              </div>

              <div className="retro-panel p-4 bg-blue-50">
                <h3 className="font-bold text-black mb-2">💡 Pro Tip</h3>
                <p className="text-gray-700 text-sm instruction-text">
                  "Clockwise" is always determined by looking directly at that face. 
                  For the Back face, imagine you're behind the cube looking at it!
                </p>
              </div>
            </div>
          )}

          {/* Credits Tab */}
          {activeTab === 'credits' && (
            <div className="space-y-4">
              <div className="retro-panel p-4 text-center bg-gradient-to-r from-pink-100 to-purple-100">
                <div className="text-4xl mb-2">👏</div>
                <h3 className="font-bold text-black text-lg">Thank You!</h3>
                <p className="text-gray-700 text-sm">
                  RubikSight is built with love and these amazing technologies
                </p>
              </div>

              <div className="retro-panel p-4">
                <h3 className="font-bold text-black mb-3">📚 Libraries & Tools</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-center gap-2">
                    <span className="text-blue-500">▸</span>
                    <span><strong>React</strong> - Meta's UI library</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-blue-500">▸</span>
                    <span><strong>Three.js</strong> - 3D graphics library by mrdoob</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-blue-500">▸</span>
                    <span><strong>Tailwind CSS</strong> - Utility-first CSS framework</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-blue-500">▸</span>
                    <span><strong>rubiks-cube-solver</strong> - Fridrich algorithm implementation</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-blue-500">▸</span>
                    <span><strong>VT323 Font</strong> - Retro terminal font</span>
                  </li>
                </ul>
              </div>

              <div className="retro-panel p-4 bg-green-50">
                <h3 className="font-bold text-black mb-2">🧊 About the Rubik's Cube</h3>
                <p className="text-gray-700 text-sm instruction-text mb-2">
                  The Rubik's Cube was invented in 1974 by Ernő Rubik, a Hungarian professor. 
                  It has become the world's best-selling puzzle with over 500 million sold.
                </p>
                <p className="text-gray-700 text-sm instruction-text">
                  <strong>Fun Fact:</strong> There are 43 quintillion possible combinations, 
                  but any position can be solved in 20 moves or fewer ("God's Number").
                </p>
              </div>

              <div className="retro-panel p-4 bg-yellow-50">
                <h3 className="font-bold text-black mb-2">📜 Open Source</h3>
                <p className="text-gray-700 text-sm instruction-text">
                  RubikSight is open source. Feel free to explore the code, report issues, 
                  or contribute improvements!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-300 border-t-2 border-gray-400 p-3">
          <div className="flex justify-between items-center">
            <div className="text-xs text-gray-600">
              Made with ❤️ • 2026
            </div>
            <button 
              onClick={onClose} 
              className="retro-btn retro-btn-primary-enhanced focus-ring text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(AboutModal);
