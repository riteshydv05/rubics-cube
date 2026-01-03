import { useState, useCallback, useMemo, memo } from 'react';
import type { CubeState, FaceName } from '../types/cube';
import type { CubeError, ValidationResult } from '../utils/errorDetectionSystem';

interface ErrorResolutionPanelProps {
  validationResult: ValidationResult;
  onJumpToFace: (face: FaceName) => void;
  onHighlightPositions: (positions: Array<{ face: FaceName; position: number }>) => void;
  onClearHighlight: () => void;
  onAutoFix: (error: CubeError) => void;
  onAutoFixAll: () => void;
  currentFace: FaceName;
  cubeState: CubeState;
}

const ERROR_ICONS: Record<string, string> = {
  'color-count': '🎨',
  'edge-piece': '📐',
  'corner-piece': '📦',
  'orientation': '🧭',
  'parity': '⚠️'
};

const ERROR_COLORS: Record<string, string> = {
  'color-count': '#e74c3c',
  'edge-piece': '#f39c12',
  'corner-piece': '#9b59b6',
  'orientation': '#3498db',
  'parity': '#c0392b'
};

const SEVERITY_STYLES: Record<string, { bg: string; border: string }> = {
  critical: { bg: 'bg-red-50', border: 'border-red-400' },
  warning: { bg: 'bg-yellow-50', border: 'border-yellow-400' },
  info: { bg: 'bg-blue-50', border: 'border-blue-400' }
};

function ErrorCard({ 
  error, 
  isExpanded, 
  onToggle, 
  onJumpToFace,
  onHighlight,
  onAutoFix
}: { 
  error: CubeError;
  isExpanded: boolean;
  onToggle: () => void;
  onJumpToFace: () => void;
  onHighlight: () => void;
  onAutoFix: () => void;
}) {
  const styles = SEVERITY_STYLES[error.severity];
  
  return (
    <div 
      className={`retro-panel ${styles.bg} border-2 ${styles.border} mb-2 overflow-hidden`}
      onMouseEnter={onHighlight}
    >
      {/* Error Header */}
      <button
        onClick={onToggle}
        className="w-full p-3 flex items-center gap-3 text-left hover:bg-opacity-80 transition-colors"
      >
        <span className="text-2xl">{ERROR_ICONS[error.type]}</span>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-black text-sm truncate">{error.title}</div>
          <div className="text-xs text-gray-600 truncate">{error.message}</div>
        </div>
        <span className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="p-3 pt-0 border-t border-gray-300">
          {/* Details */}
          <div className="retro-panel p-2 bg-white mb-3 text-xs text-gray-700">
            {error.details}
          </div>

          {/* Fix Steps */}
          <div className="mb-3">
            <div className="text-xs font-bold text-black mb-2">🔧 How to Fix:</div>
            <ol className="text-xs text-gray-700 space-y-1 list-decimal list-inside">
              {error.fixSteps.map((step, i) => (
                <li key={i} className="pl-1">{step}</li>
              ))}
            </ol>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 flex-wrap">
            {error.jumpToFace && (
              <button
                onClick={(e) => { e.stopPropagation(); onJumpToFace(); }}
                className="retro-btn text-xs px-3 py-2 bg-blue-100 hover:bg-blue-200 flex items-center gap-1"
              >
                🎯 Jump to {error.jumpToFace} Face
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onHighlight(); }}
              className="retro-btn text-xs px-3 py-2 bg-yellow-100 hover:bg-yellow-200 flex items-center gap-1"
            >
              ✨ Highlight Error
            </button>
            {error.type !== 'parity' && (
              <button
                onClick={(e) => { e.stopPropagation(); onAutoFix(); }}
                className="retro-btn text-xs px-3 py-2 bg-green-100 hover:bg-green-200 flex items-center gap-1 font-bold"
              >
                🔧 Auto-Fix
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ErrorResolutionPanel({
  validationResult,
  onJumpToFace,
  onHighlightPositions,
  onClearHighlight,
  onAutoFix,
  onAutoFixAll
}: ErrorResolutionPanelProps) {
  const [expandedErrors, setExpandedErrors] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<string | null>(null);

  const toggleError = useCallback((errorId: string) => {
    setExpandedErrors(prev => {
      const newSet = new Set(prev);
      if (newSet.has(errorId)) {
        newSet.delete(errorId);
      } else {
        newSet.add(errorId);
      }
      return newSet;
    });
  }, []);

  // Group errors by type
  const errorsByType = useMemo(() => {
    const grouped: Record<string, CubeError[]> = {};
    for (const error of validationResult.errors) {
      if (!grouped[error.type]) {
        grouped[error.type] = [];
      }
      grouped[error.type].push(error);
    }
    return grouped;
  }, [validationResult.errors]);

  const filteredErrors = useMemo(() => {
    if (!filterType) return validationResult.errors;
    return validationResult.errors.filter(e => e.type === filterType);
  }, [validationResult.errors, filterType]);

  // If no errors, show success
  if (validationResult.isValid) {
    return (
      <div className="retro-window">
        <div className="retro-title-bar bg-green-600">
          <span>✅ Cube Validation</span>
        </div>
        <div className="p-4 bg-gray-300">
          <div className="retro-panel p-4 bg-green-100 text-center">
            <div className="text-4xl mb-2">🎉</div>
            <div className="text-lg font-bold text-green-800 mb-1">
              Cube State Verified!
            </div>
            <div className="text-sm text-green-700">
              Your cube is valid and ready to solve.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="retro-window" onMouseLeave={onClearHighlight}>
      {/* Header */}
      <div className="retro-title-bar" style={{ backgroundColor: '#e74c3c' }}>
        <div className="flex items-center gap-2">
          <span>🔍 Error Detection</span>
          <span className="text-xs opacity-80">
            ({validationResult.errors.length} issue{validationResult.errors.length !== 1 ? 's' : ''})
          </span>
        </div>
      </div>

      <div className="p-3 bg-gray-300">
        {/* Progress Bar */}
        <div className="retro-panel p-2 mb-3 bg-white">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-black font-bold">Validation Progress</span>
            <span className="text-xs text-gray-600">
              {validationResult.resolvedCount} / {validationResult.resolvedCount + validationResult.totalCount} checks passed
            </span>
          </div>
          <div className="h-3 bg-gray-200 rounded overflow-hidden border border-gray-400">
            <div 
              className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-500"
              style={{ width: `${validationResult.progressPercent}%` }}
            />
          </div>
        </div>

        {/* Quick Reference */}
        <div className="retro-panel p-2 mb-3 bg-blue-50 text-xs text-black">
          <strong>📚 Remember:</strong> White↔Yellow, Red↔Orange, Green↔Blue are OPPOSITE colors and never touch!
        </div>

        {/* Error Type Filters */}
        <div className="flex gap-1 mb-3 flex-wrap">
          <button
            onClick={() => setFilterType(null)}
            className={`retro-btn text-xs px-2 py-1 ${!filterType ? 'ring-2 ring-blue-400' : ''}`}
          >
            All ({validationResult.errors.length})
          </button>
          {Object.entries(errorsByType).map(([type, errors]) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`retro-btn text-xs px-2 py-1 ${filterType === type ? 'ring-2 ring-blue-400' : ''}`}
              style={{ borderLeftColor: ERROR_COLORS[type], borderLeftWidth: '3px' }}
            >
              {ERROR_ICONS[type]} {errors.length}
            </button>
          ))}
        </div>

        {/* Error List */}
        <div className="max-h-96 overflow-y-auto">
          {filteredErrors.map(error => (
            <ErrorCard
              key={error.id}
              error={error}
              isExpanded={expandedErrors.has(error.id)}
              onToggle={() => toggleError(error.id)}
              onJumpToFace={() => error.jumpToFace && onJumpToFace(error.jumpToFace)}
              onHighlight={() => onHighlightPositions(error.affectedPositions)}
              onAutoFix={() => onAutoFix(error)}
            />
          ))}
        </div>

        {/* Global Actions */}
        <div className="mt-3 pt-3 border-t border-gray-400">
          <button
            onClick={onAutoFixAll}
            className="retro-btn text-sm w-full py-3 mb-2 bg-green-200 hover:bg-green-300 font-bold"
          >
            🔧 AUTO-FIX ALL ERRORS
          </button>
          <button
            onClick={() => {
              // Expand all errors
              setExpandedErrors(new Set(validationResult.errors.map(e => e.id)));
            }}
            className="retro-btn text-xs w-full py-2"
          >
            📋 Show All Details
          </button>
        </div>
      </div>
    </div>
  );
}

export default memo(ErrorResolutionPanel);
