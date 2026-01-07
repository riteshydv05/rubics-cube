import { memo, useCallback, useEffect, useState } from 'react';

interface HelpSection {
  heading: string;
  content: string;
  tips?: string[];
  icon?: string;
}

interface HelpTab {
  id: string;
  label: string;
  icon: string;
  sections: HelpSection[];
}

// Comprehensive help content organized by tabs
const HELP_TABS: HelpTab[] = [
  {
    id: 'getting-started',
    label: 'Getting Started',
    icon: '🚀',
    sections: [
      {
        heading: '📝 Step 1: Enter Your Cube',
        content: 'Manually enter the colors of your Rubik\'s Cube face by face using our intuitive editor.',
        tips: [
          'Hold cube with WHITE center UP and GREEN center facing YOU',
          'Centers are locked - they define each face\'s identity',
          'Click tiles then select colors from the palette',
          'Use keyboard shortcuts: W, Y, R, O, G, B for quick entry',
          'Each color must appear exactly 9 times total',
        ],
      },
      {
        heading: '✅ Step 2: Validate',
        content: 'Our smart validation system checks your cube configuration for errors.',
        tips: [
          'Real-time validation catches mistakes as you enter',
          'Edge pieces (2 colors) and corners (3 colors) are verified',
          'Impossible configurations are flagged immediately',
          'Fix highlighted errors before proceeding',
        ],
      },
      {
        heading: '🧩 Step 3: Solve',
        content: 'Once valid, get a step-by-step solution to solve your physical cube.',
        tips: [
          'Login required to access the solver (free)',
          'Choose Step-by-Step or Interactive mode',
          'Follow moves in order on your physical cube',
          'Solutions use the Fridrich/CFOP method',
        ],
      },
    ],
  },
  {
    id: 'notation',
    label: 'Move Notation',
    icon: '🔤',
    sections: [
      {
        heading: '📖 Basic Move Notation',
        content: 'Standard Rubik\'s Cube notation uses letters for faces and symbols for direction.',
        tips: [
          'R = Right face clockwise (90°)',
          'R\' = Right face counter-clockwise (90°)',
          'R2 = Right face half-turn (180°)',
          'Same pattern for all 6 faces: U, D, F, B, L, R',
        ],
      },
      {
        heading: '🎯 The 6 Face Names',
        content: 'Each letter represents one of the six faces of the cube.',
        tips: [
          'U (Up) = Top face (White center)',
          'D (Down) = Bottom face (Yellow center)',
          'F (Front) = Face facing you (Green center)',
          'B (Back) = Face away from you (Blue center)',
          'R (Right) = Right face (Red center)',
          'L (Left) = Left face (Orange center)',
        ],
      },
      {
        heading: '↻ Direction Reference',
        content: 'Clockwise is determined by looking directly at that face.',
        tips: [
          'Imagine looking at the face head-on',
          'Clockwise = normal clock direction',
          'Prime (\') = counter-clockwise',
          '2 = turn twice (180°, same either direction)',
        ],
      },
    ],
  },
  {
    id: 'how-it-works',
    label: 'How It Works',
    icon: '⚙️',
    sections: [
      {
        heading: '🧠 The Algorithm',
        content: 'RubikSight uses the Fridrich/CFOP method - one of the most popular speedcubing methods.',
        tips: [
          'CFOP = Cross, F2L, OLL, PLL',
          'First solves the white cross on the bottom',
          'Then fills the first two layers (F2L)',
          'Orients last layer pieces (OLL)',
          'Permutes last layer to finish (PLL)',
        ],
      },
      {
        heading: '✨ Validation System',
        content: 'Our validator ensures your cube configuration is physically possible.',
        tips: [
          'Checks all 12 edge pieces are valid',
          'Verifies all 8 corner pieces exist',
          'Detects parity errors (impossible states)',
          'Counts colors to ensure 9 of each',
        ],
      },
      {
        heading: '🌐 Tech Stack',
        content: 'Built with modern web technologies for speed and reliability.',
        tips: [
          'React 19 + TypeScript for the UI',
          'Three.js for 3D cube visualization',
          'Tailwind CSS for styling',
          'Node.js + MongoDB for backend',
          'PWA for offline support',
        ],
      },
    ],
  },
  {
    id: 'features',
    label: 'Features',
    icon: '✨',
    sections: [
      {
        heading: '🎮 Interactive Modes',
        content: 'Two ways to follow the solution.',
        tips: [
          'Step-by-Step: Control each move manually',
          'Interactive: Auto-play with speed control',
          'Pause, rewind, and replay anytime',
          '3D visualization shows the cube state',
        ],
      },
      {
        heading: '📊 Statistics Tracking',
        content: 'Track your solving progress over time.',
        tips: [
          'Total solves completed',
          'Average moves per solve',
          'Personal best records',
          'Full solve history with dates',
        ],
      },
      {
        heading: '📱 Cross-Platform',
        content: 'Works everywhere with modern browsers.',
        tips: [
          'Desktop, tablet, and mobile support',
          'Install as PWA on your device',
          'Offline mode available',
          'Synced data across devices',
        ],
      },
    ],
  },
  {
    id: 'tips',
    label: 'Pro Tips',
    icon: '💡',
    sections: [
      {
        heading: '⚡ Speed Tips',
        content: 'Enter your cube faster with these tricks.',
        tips: [
          'Use keyboard shortcuts exclusively',
          'Complete one face fully before moving on',
          'Follow the standard face order: F→R→B→L→U→D',
          'Check color counts after each face',
        ],
      },
      {
        heading: '🔧 Troubleshooting',
        content: 'Common issues and how to fix them.',
        tips: [
          'Wrong colors? Check cube orientation',
          'Validation error? Look for swapped Red/Orange',
          'Can\'t solve? Verify edge/corner stickers',
          '3D not loading? Enable hardware acceleration',
        ],
      },
      {
        heading: '🎯 Best Practices',
        content: 'Get the most out of RubikSight.',
        tips: [
          'Double-check before hitting solve',
          'Practice reading notation on paper first',
          'Use the 3D preview to verify entry',
          'Save interesting scrambles to history',
        ],
      },
    ],
  },
];

interface HelpModalProps {
  onClose: () => void;
}

function HelpModal({ onClose }: HelpModalProps) {
  const [activeTab, setActiveTab] = useState('getting-started');

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

  const currentTab = HELP_TABS.find(tab => tab.id === activeTab) || HELP_TABS[0];

  return (
    <div 
      className="modal-overlay"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-title"
    >
      <div 
        className="modal-content retro-window"
        onClick={stopPropagation}
        style={{
          boxShadow: '8px 8px 0 rgba(0,0,0,0.5), 0 0 50px rgba(0,217,255,0.3)',
          maxWidth: '900px',
          width: '95vw',
        }}
      >
        {/* Retro Title Bar */}
        <div className="retro-title-bar">
          <div className="flex items-center gap-2">
            <span className="icon-lg">❓</span>
            <span id="help-title" className="font-bold">RubikSight Help Center</span>
          </div>
          <button 
            className="retro-title-btn focus-ring" 
            onClick={onClose}
            aria-label="Close help"
            style={{ color: '#e94560' }}
          >
            ×
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-gray-400 p-2 flex flex-wrap gap-1 border-b-2 border-gray-500">
          {HELP_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`retro-btn text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 ${
                activeTab === tab.id 
                  ? 'retro-btn-primary-enhanced' 
                  : ''
              }`}
            >
              <span className="icon-text">
                <span>{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </span>
            </button>
          ))}
        </div>

        {/* Content Area with Scroll */}
        <div className="modal-body bg-gray-300 p-3 sm:p-4" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {/* Tab Header */}
          <div className="retro-panel mb-4 p-3 sm:p-4 text-center soft-shadow bg-gradient-to-r from-blue-100 to-purple-100">
            <div className="text-3xl sm:text-4xl mb-2">{currentTab.icon}</div>
            <h2 className="text-xl sm:text-2xl font-bold text-black">
              {currentTab.label}
            </h2>
          </div>

          {/* Help Sections */}
          <div className="space-y-3 sm:space-y-4">
            {currentTab.sections.map((section, idx) => (
              <div key={idx} className="retro-panel soft-shadow transition-smooth hover:scale-102">
                <h3 className="text-base sm:text-lg font-bold text-black mb-2 pb-2 border-b-2 border-gray-400">
                  {section.heading}
                </h3>
                <p className="text-gray-800 mb-2 sm:mb-3 text-sm sm:text-base instruction-text">
                  {section.content}
                </p>
                {section.tips && (
                  <ul className="space-y-1.5">
                    {section.tips.map((tip, tipIdx) => (
                      <li key={tipIdx} className="flex items-start gap-2 text-gray-700 text-xs sm:text-sm">
                        <span className="text-cyan-600 flex-shrink-0 mt-0.5">▸</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>

          {/* Quick Reference for Notation Tab */}
          {activeTab === 'notation' && (
            <div className="retro-panel mt-4 p-3 sm:p-4 bg-yellow-50">
              <h3 className="text-base sm:text-lg font-bold text-black mb-3">📋 Quick Reference Card</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                <div className="retro-panel p-2 text-center bg-white">
                  <div className="font-bold text-lg">R</div>
                  <div className="text-xs text-gray-600">Right →</div>
                </div>
                <div className="retro-panel p-2 text-center bg-white">
                  <div className="font-bold text-lg">R'</div>
                  <div className="text-xs text-gray-600">Right ←</div>
                </div>
                <div className="retro-panel p-2 text-center bg-white">
                  <div className="font-bold text-lg">R2</div>
                  <div className="text-xs text-gray-600">Right 180°</div>
                </div>
                <div className="retro-panel p-2 text-center bg-white">
                  <div className="font-bold text-lg">U</div>
                  <div className="text-xs text-gray-600">Up →</div>
                </div>
                <div className="retro-panel p-2 text-center bg-white">
                  <div className="font-bold text-lg">F</div>
                  <div className="text-xs text-gray-600">Front →</div>
                </div>
                <div className="retro-panel p-2 text-center bg-white">
                  <div className="font-bold text-lg">L</div>
                  <div className="text-xs text-gray-600">Left →</div>
                </div>
              </div>
            </div>
          )}

          {/* Fun Fact */}
          <div className="retro-panel mt-4 p-3 sm:p-4 bg-gradient-to-r from-green-100 to-teal-100">
            <h3 className="text-sm sm:text-base font-bold text-black mb-1">
              💡 Did You Know?
            </h3>
            <p className="text-gray-700 text-xs sm:text-sm instruction-text">
              The Rubik's Cube has 43,252,003,274,489,856,000 possible combinations, 
              but can always be solved in 20 moves or fewer. This is called "God's Number"!
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-300 border-t-2 border-gray-400 p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
            <div className="text-xs text-gray-600 instruction-text text-center sm:text-left">
              <span className="hidden sm:inline">Press ESC to close • </span>
              v1.0.0 • Built with ❤️ using React + Three.js
            </div>
            <button 
              onClick={onClose} 
              className="retro-btn retro-btn-primary-enhanced focus-ring"
              autoFocus
            >
              <span className="icon-text">
                <span>✓</span>
                <span>Got it!</span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(HelpModal);
