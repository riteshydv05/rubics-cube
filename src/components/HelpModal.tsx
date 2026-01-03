import { memo, useCallback, useEffect } from 'react';

interface HelpContent {
  title: string;
  sections: {
    heading: string;
    content: string;
    tips?: string[];
  }[];
}

// Content defined outside component
const HELP_CONTENT: HelpContent = {
  title: 'How to Use RubikSight',
  sections: [
    {
      heading: '📸 Step 1: Scanning',
      content: 'Allow camera access and position your Rubik\'s Cube according to the on-screen instructions.',
      tips: [
        'Use good lighting - avoid shadows and direct sunlight',
        'Keep the cube steady and parallel to the camera',
        'Wait for all 9 sticker dots to appear before capturing',
        'Press Space or click the capture button',
        'Toggle mirror mode if the view seems backwards',
      ],
    },
    {
      heading: '✏️ Step 2: Editing',
      content: 'After scanning, review and correct any misdetected colors.',
      tips: [
        'Centers are locked to maintain consistency',
        'Use keyboard shortcuts (W, Y, R, O, G, B) for quick editing',
        'Undo/Redo buttons help fix mistakes',
        'Check the color counts - each should be exactly 9',
      ],
    },
    {
      heading: '🧩 Step 3: Solving',
      content: 'Once all faces are complete and valid, click "Validate & Solve" to generate the optimal solution.',
      tips: [
        'Follow the move notation to solve your physical cube',
        'Standard notation: R (right), U (up), F (front), etc.',
        'Apostrophe means counter-clockwise (R\' = right CCW)',
        'Number 2 means 180° turn (R2 = right face twice)',
      ],
    },
    {
      heading: '⌨️ Keyboard Shortcuts',
      content: 'Use these shortcuts for faster operation:',
      tips: [
        'Space - Capture current face (during scanning)',
        'W, Y, R, O, G, B - Select color (during editing)',
        'Delete/Backspace - Clear selected sticker',
        'Escape - Cancel selection / Close help',
      ],
    },
  ],
};

interface HelpModalProps {
  onClose: () => void;
}

function HelpModal({ onClose }: HelpModalProps) {
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
      aria-labelledby="help-title"
    >
      <div 
        className="modal-content retro-window max-w-3xl"
        onClick={stopPropagation}
        style={{
          boxShadow: '8px 8px 0 rgba(0,0,0,0.5), 0 0 50px rgba(0,217,255,0.3)'
        }}
      >
        {/* Retro Title Bar */}
        <div className="retro-title-bar">
          <div className="flex items-center gap-2">
            <span className="text-lg sm:text-xl">❓</span>
            <span id="help-title" className="text-sm sm:text-base">{HELP_CONTENT.title}</span>
          </div>
          <div className="retro-title-buttons">
            <button className="retro-title-btn" onClick={onClose}>_</button>
            <button className="retro-title-btn" onClick={onClose}>□</button>
            <button 
              className="retro-title-btn" 
              onClick={onClose}
              style={{ color: '#e94560' }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Content Area with Scroll */}
        <div className="modal-body bg-gray-300 p-3 sm:p-4">
          {/* Welcome Banner */}
          <div className="retro-panel mb-4 sm:mb-6 p-3 sm:p-4 text-center">
            <div className="text-3xl sm:text-4xl mb-2">🧊</div>
            <h2 className="text-xl sm:text-2xl font-bold text-black mb-1">
              Welcome to RubikSight!
            </h2>
            <p className="text-gray-700 text-sm sm:text-base">
              Your AI-powered Rubik's Cube scanner and solver
            </p>
          </div>

          {/* Help Sections */}
          <div className="space-y-3 sm:space-y-4">
            {HELP_CONTENT.sections.map((section, idx) => (
              <div key={idx} className="retro-panel">
                <h3 className="text-base sm:text-xl font-bold text-black mb-2 pb-2 border-b-2 border-gray-400">
                  {section.heading}
                </h3>
                <p className="text-gray-800 mb-2 sm:mb-3 text-sm sm:text-base">{section.content}</p>
                {section.tips && (
                  <ul className="space-y-1">
                    {section.tips.map((tip, tipIdx) => (
                      <li key={tipIdx} className="flex items-start gap-2 text-gray-700 text-sm sm:text-base">
                        <span style={{ color: '#00bcd4' }}>▸</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>

          {/* Fun Facts */}
          <div className="retro-panel mt-4 sm:mt-6 bg-gradient-to-r from-blue-100 to-purple-100">
            <h3 className="text-base sm:text-lg font-bold text-black mb-2">
              💡 Did You Know?
            </h3>
            <p className="text-gray-700 text-sm sm:text-base">
              The Rubik's Cube can be solved in 20 moves or fewer from any position. 
              This is known as "God's Number" and was proven in 2010!
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-300 border-t-2 border-gray-400 p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-0">
            <div className="hidden sm:flex gap-2">
              <span className="retro-panel px-3 py-1 text-sm text-black">
                Press ESC to close
              </span>
            </div>
            <div className="flex gap-2">
              <button onClick={onClose} className="retro-btn retro-btn-primary">
                OK
              </button>
              <button onClick={onClose} className="retro-btn">
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(HelpModal);
