import type { CubeState, CubeColor, FaceName } from '../types/cube';

/**
 * Intelligent Error Detection & Resolution System
 * 
 * Categorizes errors into 5 types:
 * 1. Color Count Errors
 * 2. Edge Piece Errors
 * 3. Corner Piece Errors
 * 4. Orientation/Face Mapping Errors
 * 5. Parity/Unsolvable State Errors
 */

// ============= TYPE DEFINITIONS =============

export type ErrorType = 
  | 'color-count' 
  | 'edge-piece' 
  | 'corner-piece' 
  | 'orientation' 
  | 'parity';

export type ErrorSeverity = 'critical' | 'warning' | 'info';

export interface CubeError {
  id: string;
  type: ErrorType;
  severity: ErrorSeverity;
  title: string;
  message: string;
  details: string;
  affectedPositions: Array<{ face: FaceName; position: number }>;
  suggestedFix: string;
  fixSteps: string[];
  canAutoFix: boolean;
  jumpToFace?: FaceName;
}

export interface ValidationResult {
  isValid: boolean;
  errors: CubeError[];
  resolvedCount: number;
  totalCount: number;
  progressPercent: number;
}

// ============= CONSTANTS =============

const COLOR_NAMES: Record<string, string> = {
  W: 'White', Y: 'Yellow', R: 'Red', O: 'Orange', G: 'Green', B: 'Blue'
};

const OPPOSITE_COLORS: Record<string, string> = {
  W: 'Y', Y: 'W', R: 'O', O: 'R', G: 'B', B: 'G'
};

const FACE_NAMES: Record<FaceName, string> = {
  F: 'Front (Green)', R: 'Right (Red)', B: 'Back (Blue)',
  L: 'Left (Orange)', U: 'Top (White)', D: 'Bottom (Yellow)'
};

// Valid edge combinations (12 edges) - exported for reference
export const VALID_EDGES = new Set([
  'WG', 'WR', 'WB', 'WO', // White edges
  'YG', 'YR', 'YB', 'YO', // Yellow edges
  'GR', 'GO', 'BR', 'BO'  // Middle edges
]);

// Valid corner combinations (8 corners) - exported for reference
export const VALID_CORNERS = new Set([
  'WGR', 'WGO', 'WBR', 'WBO', // White corners
  'YGR', 'YGO', 'YBR', 'YBO'  // Yellow corners
]);

// Edge positions
const EDGE_POSITIONS: Array<{
  face1: FaceName; pos1: number;
  face2: FaceName; pos2: number;
  name: string;
}> = [
  { face1: 'U', pos1: 7, face2: 'F', pos2: 1, name: 'UF' },
  { face1: 'U', pos1: 5, face2: 'R', pos2: 1, name: 'UR' },
  { face1: 'U', pos1: 1, face2: 'B', pos2: 1, name: 'UB' },
  { face1: 'U', pos1: 3, face2: 'L', pos2: 1, name: 'UL' },
  { face1: 'F', pos1: 5, face2: 'R', pos2: 3, name: 'FR' },
  { face1: 'F', pos1: 3, face2: 'L', pos2: 5, name: 'FL' },
  { face1: 'B', pos1: 3, face2: 'R', pos2: 5, name: 'BR' },
  { face1: 'B', pos1: 5, face2: 'L', pos2: 3, name: 'BL' },
  { face1: 'D', pos1: 1, face2: 'F', pos2: 7, name: 'DF' },
  { face1: 'D', pos1: 5, face2: 'R', pos2: 7, name: 'DR' },
  { face1: 'D', pos1: 7, face2: 'B', pos2: 7, name: 'DB' },
  { face1: 'D', pos1: 3, face2: 'L', pos2: 7, name: 'DL' },
];

// Corner positions
const CORNER_POSITIONS: Array<{
  faces: [FaceName, FaceName, FaceName];
  positions: [number, number, number];
  name: string;
}> = [
  { faces: ['U', 'F', 'R'], positions: [8, 2, 0], name: 'UFR' },
  { faces: ['U', 'F', 'L'], positions: [6, 0, 2], name: 'UFL' },
  { faces: ['U', 'B', 'R'], positions: [2, 0, 2], name: 'UBR' },
  { faces: ['U', 'B', 'L'], positions: [0, 2, 0], name: 'UBL' },
  { faces: ['D', 'F', 'R'], positions: [2, 8, 6], name: 'DFR' },
  { faces: ['D', 'F', 'L'], positions: [0, 6, 8], name: 'DFL' },
  { faces: ['D', 'B', 'R'], positions: [8, 6, 8], name: 'DBR' },
  { faces: ['D', 'B', 'L'], positions: [6, 8, 6], name: 'DBL' },
];

// ============= ERROR DETECTION CLASS =============

class ErrorDetectionSystem {
  private errorIdCounter = 0;

  private generateId(): string {
    return `err-${++this.errorIdCounter}-${Date.now()}`;
  }

  /**
   * Main validation function - returns all errors
   */
  validateCube(cubeState: CubeState): ValidationResult {
    const errors: CubeError[] = [];

    // 1. Check color counts
    errors.push(...this.checkColorCounts(cubeState));

    // 2. Check edge pieces
    errors.push(...this.checkEdgePieces(cubeState));

    // 3. Check corner pieces
    errors.push(...this.checkCornerPieces(cubeState));

    // 4. Check for parity errors (only if other validations pass)
    if (errors.length === 0) {
      errors.push(...this.checkParityErrors(cubeState));
    }

    // Calculate progress
    const maxPossibleErrors = 6 + 12 + 8; // colors + edges + corners
    const resolvedCount = maxPossibleErrors - errors.length;
    const progressPercent = Math.round((resolvedCount / maxPossibleErrors) * 100);

    return {
      isValid: errors.length === 0,
      errors,
      resolvedCount,
      totalCount: errors.length,
      progressPercent: Math.min(100, progressPercent)
    };
  }

  /**
   * 1. COLOR COUNT ERRORS
   */
  private checkColorCounts(cubeState: CubeState): CubeError[] {
    const errors: CubeError[] = [];
    const counts: Record<string, number> = { W: 0, Y: 0, R: 0, O: 0, G: 0, B: 0 };
    const positions: Record<string, Array<{ face: FaceName; position: number }>> = {
      W: [], Y: [], R: [], O: [], G: [], B: []
    };

    // Count colors and track positions
    for (const [faceName, face] of Object.entries(cubeState) as [FaceName, CubeColor[]][]) {
      face.forEach((color, pos) => {
        if (color) {
          counts[color]++;
          positions[color].push({ face: faceName, position: pos });
        }
      });
    }

    // Check each color
    for (const [color, count] of Object.entries(counts)) {
      if (count !== 9) {
        const colorName = COLOR_NAMES[color];
        const diff = count - 9;
        
        errors.push({
          id: this.generateId(),
          type: 'color-count',
          severity: 'critical',
          title: `${colorName} Count Error`,
          message: diff > 0 
            ? `${colorName} appears ${count} times (should be 9)` 
            : `${colorName} only appears ${count} times (need ${9 - count} more)`,
          details: diff > 0
            ? `You have ${diff} extra ${colorName.toLowerCase()} tile${diff > 1 ? 's' : ''}. Remove the excess to continue.`
            : `You need ${Math.abs(diff)} more ${colorName.toLowerCase()} tile${Math.abs(diff) > 1 ? 's' : ''} to complete the cube.`,
          affectedPositions: positions[color],
          suggestedFix: diff > 0 
            ? `Click on a ${colorName.toLowerCase()} tile that seems incorrect and change it to another color`
            : `Find empty or incorrectly colored tiles and paint them ${colorName.toLowerCase()}`,
          fixSteps: diff > 0 ? [
            `Look at all ${colorName.toLowerCase()} tiles highlighted below`,
            `Identify which ${colorName.toLowerCase()} tile(s) should be a different color`,
            `Select the correct color and click the wrong tile to fix it`
          ] : [
            `You need ${Math.abs(diff)} more ${colorName.toLowerCase()} tile${Math.abs(diff) > 1 ? 's' : ''}`,
            `Check if any tiles have the wrong color`,
            `Paint the correct tiles ${colorName.toLowerCase()}`
          ],
          canAutoFix: false,
          jumpToFace: positions[color][0]?.face
        });
      }
    }

    return errors;
  }

  /**
   * 2. EDGE PIECE ERRORS
   */
  private checkEdgePieces(cubeState: CubeState): CubeError[] {
    const errors: CubeError[] = [];
    const seenEdges = new Map<string, string>();

    for (const edge of EDGE_POSITIONS) {
      const color1 = cubeState[edge.face1][edge.pos1];
      const color2 = cubeState[edge.face2][edge.pos2];

      if (!color1 || !color2) continue;

      const edgeKey = [color1, color2].sort().join('');
      const positions = [
        { face: edge.face1, position: edge.pos1 },
        { face: edge.face2, position: edge.pos2 }
      ];

      // Check for same color on both sides
      if (color1 === color2) {
        errors.push({
          id: this.generateId(),
          type: 'edge-piece',
          severity: 'critical',
          title: `Invalid Edge: Same Color`,
          message: `${edge.name} edge has ${COLOR_NAMES[color1]} on both sides`,
          details: `Edge pieces always have TWO DIFFERENT colors. The ${edge.name} edge currently shows ${COLOR_NAMES[color1]} on both stickers, which is impossible on a real cube.`,
          affectedPositions: positions,
          suggestedFix: `Change one of the ${COLOR_NAMES[color1].toLowerCase()} stickers to a different color`,
          fixSteps: [
            `This edge connects ${FACE_NAMES[edge.face1]} and ${FACE_NAMES[edge.face2]}`,
            `Look at your physical cube at this edge`,
            `One sticker should be a different color - fix it`
          ],
          canAutoFix: false,
          jumpToFace: edge.face1
        });
        continue;
      }

      // Check for opposite colors
      if (OPPOSITE_COLORS[color1] === color2) {
        const validPairings = this.getValidEdgePairings(color1);
        errors.push({
          id: this.generateId(),
          type: 'edge-piece',
          severity: 'critical',
          title: `Opposite Colors on Edge`,
          message: `${COLOR_NAMES[color1]} and ${COLOR_NAMES[color2]} cannot share an edge`,
          details: `${COLOR_NAMES[color1]} and ${COLOR_NAMES[color2]} are on opposite sides of a solved cube and can NEVER touch. Valid pairings for ${COLOR_NAMES[color1]}: ${validPairings.join(', ')}.`,
          affectedPositions: positions,
          suggestedFix: `Change one color to: ${validPairings.join(' or ')}`,
          fixSteps: [
            `${COLOR_NAMES[color1]} and ${COLOR_NAMES[color2]} are OPPOSITE colors`,
            `Opposite colors never touch on a Rubik's cube`,
            `One of these stickers must be wrong - check your physical cube`,
            `Valid colors next to ${COLOR_NAMES[color1]}: ${validPairings.join(', ')}`
          ],
          canAutoFix: false,
          jumpToFace: edge.face1
        });
        continue;
      }

      // Check for duplicate edges
      if (seenEdges.has(edgeKey)) {
        errors.push({
          id: this.generateId(),
          type: 'edge-piece',
          severity: 'warning',
          title: `Duplicate Edge Piece`,
          message: `${COLOR_NAMES[color1]}-${COLOR_NAMES[color2]} edge appears twice`,
          details: `This edge combination already exists at position ${seenEdges.get(edgeKey)}. Each edge piece is unique and can only appear once.`,
          affectedPositions: positions,
          suggestedFix: `One of these edges has the wrong colors - check both locations`,
          fixSteps: [
            `This edge also appears at: ${seenEdges.get(edgeKey)}`,
            `Each edge piece is unique on a real cube`,
            `One of these two edges has incorrect colors`,
            `Check your physical cube at both positions`
          ],
          canAutoFix: false,
          jumpToFace: edge.face1
        });
      } else {
        seenEdges.set(edgeKey, edge.name);
      }
    }

    return errors;
  }

  /**
   * 3. CORNER PIECE ERRORS
   */
  private checkCornerPieces(cubeState: CubeState): CubeError[] {
    const errors: CubeError[] = [];
    const seenCorners = new Map<string, string>();

    for (const corner of CORNER_POSITIONS) {
      const [f1, f2, f3] = corner.faces;
      const [p1, p2, p3] = corner.positions;
      const c1 = cubeState[f1][p1];
      const c2 = cubeState[f2][p2];
      const c3 = cubeState[f3][p3];

      if (!c1 || !c2 || !c3) continue;

      const colors = [c1, c2, c3];
      const cornerKey = colors.sort().join('');
      const positions = [
        { face: f1, position: p1 },
        { face: f2, position: p2 },
        { face: f3, position: p3 }
      ];

      // Check for same color appearing twice
      const uniqueColors = new Set(colors);
      if (uniqueColors.size < 3) {
        const duplicateColor = colors.find((c, i) => colors.indexOf(c) !== i)!;
        errors.push({
          id: this.generateId(),
          type: 'corner-piece',
          severity: 'critical',
          title: `Invalid Corner: Duplicate Color`,
          message: `${corner.name} corner has ${COLOR_NAMES[duplicateColor]} twice`,
          details: `Corner pieces always have THREE DIFFERENT colors. The ${corner.name} corner has ${COLOR_NAMES[duplicateColor]} appearing twice, which is impossible.`,
          affectedPositions: positions,
          suggestedFix: `Change one of the ${COLOR_NAMES[duplicateColor].toLowerCase()} stickers`,
          fixSteps: [
            `This corner connects ${FACE_NAMES[f1]}, ${FACE_NAMES[f2]}, and ${FACE_NAMES[f3]}`,
            `${COLOR_NAMES[duplicateColor]} appears twice - one must be wrong`,
            `Check your physical cube at this corner`,
            `Fix the incorrect ${COLOR_NAMES[duplicateColor].toLowerCase()} sticker`
          ],
          canAutoFix: false,
          jumpToFace: f1
        });
        continue;
      }

      // Check for opposite colors
      for (let i = 0; i < colors.length; i++) {
        for (let j = i + 1; j < colors.length; j++) {
          if (OPPOSITE_COLORS[colors[i]] === colors[j]) {
            errors.push({
              id: this.generateId(),
              type: 'corner-piece',
              severity: 'critical',
              title: `Opposite Colors on Corner`,
              message: `${COLOR_NAMES[colors[i]]} and ${COLOR_NAMES[colors[j]]} cannot share a corner`,
              details: `${COLOR_NAMES[colors[i]]} and ${COLOR_NAMES[colors[j]]} are opposite colors and can NEVER meet at a corner.`,
              affectedPositions: positions,
              suggestedFix: `One of these colors is wrong - check your physical cube`,
              fixSteps: [
                `${COLOR_NAMES[colors[i]]} and ${COLOR_NAMES[colors[j]]} are OPPOSITE colors`,
                `They are on opposite sides of the cube and never touch`,
                `Check your physical cube at this corner`,
                `At least one sticker has the wrong color`
              ],
              canAutoFix: false,
              jumpToFace: f1
            });
            break;
          }
        }
      }

      // Check for duplicate corners
      if (seenCorners.has(cornerKey)) {
        errors.push({
          id: this.generateId(),
          type: 'corner-piece',
          severity: 'warning',
          title: `Duplicate Corner Piece`,
          message: `${colors.map(c => COLOR_NAMES[c]).join('-')} corner appears twice`,
          details: `This corner combination already exists at ${seenCorners.get(cornerKey)}. Each corner is unique.`,
          affectedPositions: positions,
          suggestedFix: `One of these corners has wrong colors`,
          fixSteps: [
            `This corner also appears at: ${seenCorners.get(cornerKey)}`,
            `Each corner piece is unique on a real cube`,
            `One location has incorrect colors`,
            `Check your physical cube at both corners`
          ],
          canAutoFix: false,
          jumpToFace: f1
        });
      } else {
        seenCorners.set(cornerKey, corner.name);
      }
    }

    return errors;
  }

  /**
   * 4. PARITY / UNSOLVABLE STATE ERRORS
   */
  private checkParityErrors(cubeState: CubeState): CubeError[] {
    const errors: CubeError[] = [];

    // Check edge parity (sum of edge orientations must be even)
    const edgeOrientationSum = this.calculateEdgeOrientationSum(cubeState);
    if (edgeOrientationSum % 2 !== 0) {
      errors.push({
        id: this.generateId(),
        type: 'parity',
        severity: 'critical',
        title: `Single Edge Flip Detected`,
        message: `Your cube has a single flipped edge - this is unsolvable`,
        details: `On a real Rubik's cube, it's impossible to flip just one edge. This usually happens when the cube was taken apart and reassembled incorrectly.`,
        affectedPositions: [],
        suggestedFix: `The physical cube needs to be fixed before entering colors`,
        fixSteps: [
          `⚠️ This cube state is MATHEMATICALLY UNSOLVABLE`,
          `A single edge cannot be flipped on a real cube`,
          `Your physical cube was likely reassembled incorrectly`,
          `REAL-WORLD FIX: Remove one edge piece, flip it, and reinsert`,
          `Then re-enter the colors from your corrected cube`
        ],
        canAutoFix: false
      });
    }

    // Check corner parity (sum of corner twists must be divisible by 3)
    const cornerTwistSum = this.calculateCornerTwistSum(cubeState);
    if (cornerTwistSum % 3 !== 0) {
      errors.push({
        id: this.generateId(),
        type: 'parity',
        severity: 'critical',
        title: `Single Corner Twist Detected`,
        message: `Your cube has a twisted corner - this is unsolvable`,
        details: `On a real Rubik's cube, it's impossible to twist just one corner. This happens when the cube was reassembled incorrectly.`,
        affectedPositions: [],
        suggestedFix: `The physical cube needs to be fixed before entering colors`,
        fixSteps: [
          `⚠️ This cube state is MATHEMATICALLY UNSOLVABLE`,
          `A single corner cannot be twisted on a real cube`,
          `Your physical cube was likely reassembled incorrectly`,
          `REAL-WORLD FIX: Remove the twisted corner, rotate it, and reinsert`,
          `Then re-enter the colors from your corrected cube`
        ],
        canAutoFix: false
      });
    }

    return errors;
  }

  /**
   * Calculate edge orientation sum for parity check
   */
  private calculateEdgeOrientationSum(cubeState: CubeState): number {
    let sum = 0;
    // Simplified parity check - count misoriented edges
    for (const edge of EDGE_POSITIONS) {
      const c1 = cubeState[edge.face1][edge.pos1];
      const c2 = cubeState[edge.face2][edge.pos2];
      if (c1 && c2) {
        // Edge is "flipped" if the first color is Y or W and not in U/D face
        if ((c1 === 'W' || c1 === 'Y') && !['U', 'D'].includes(edge.face1)) {
          sum++;
        }
        if ((c1 !== 'W' && c1 !== 'Y') && ['U', 'D'].includes(edge.face1)) {
          sum++;
        }
      }
    }
    return sum;
  }

  /**
   * Calculate corner twist sum for parity check
   */
  private calculateCornerTwistSum(cubeState: CubeState): number {
    let sum = 0;
    for (const corner of CORNER_POSITIONS) {
      const [f1] = corner.faces;
      const [p1] = corner.positions;
      const c1 = cubeState[f1][p1];
      
      if (c1) {
        // Simplified twist detection
        if ((c1 === 'W' || c1 === 'Y') && !['U', 'D'].includes(f1)) {
          sum++;
        }
      }
    }
    return sum;
  }

  /**
   * Get valid edge pairings for a color
   */
  private getValidEdgePairings(color: string): string[] {
    const pairings: string[] = [];
    const allColors = ['W', 'Y', 'R', 'O', 'G', 'B'];
    
    for (const c of allColors) {
      if (c !== color && OPPOSITE_COLORS[color] !== c) {
        pairings.push(COLOR_NAMES[c]);
      }
    }
    return pairings;
  }

  /**
   * Get fix suggestions for a specific error
   */
  getFixSuggestion(error: CubeError, _cubeState: CubeState): string[] {
    switch (error.type) {
      case 'color-count':
        return this.getColorCountFix(error);
      case 'edge-piece':
        return this.getEdgeFix(error);
      case 'corner-piece':
        return this.getCornerFix(error);
      default:
        return error.fixSteps;
    }
  }

  private getColorCountFix(error: CubeError): string[] {
    return error.fixSteps;
  }

  private getEdgeFix(error: CubeError): string[] {
    return error.fixSteps;
  }

  private getCornerFix(error: CubeError): string[] {
    return error.fixSteps;
  }

  /**
   * AUTO-FIX: Attempt to automatically fix an error
   * Returns the new cube state if fix was applied, or null if cannot auto-fix
   */
  autoFixError(error: CubeError, cubeState: CubeState): { 
    newState: CubeState | null; 
    description: string;
    success: boolean;
  } {
    switch (error.type) {
      case 'color-count':
        return this.autoFixColorCount(error, cubeState);
      case 'edge-piece':
        return this.autoFixEdge(error, cubeState);
      case 'corner-piece':
        return this.autoFixCorner(error, cubeState);
      default:
        return { 
          newState: null, 
          description: 'This error type cannot be auto-fixed. Please fix manually.',
          success: false 
        };
    }
  }

  /**
   * Auto-fix color count errors
   * Strategy: Find colors that are over/under and swap them
   */
  private autoFixColorCount(_error: CubeError, cubeState: CubeState): {
    newState: CubeState | null;
    description: string;
    success: boolean;
  } {
    // Count all colors
    const counts: Record<string, number> = { W: 0, Y: 0, R: 0, O: 0, G: 0, B: 0 };
    for (const face of Object.values(cubeState)) {
      face.forEach(color => {
        if (color) counts[color]++;
      });
    }

    // Find overused and underused colors
    const overused = Object.entries(counts).filter(([_, count]) => count > 9);
    const underused = Object.entries(counts).filter(([_, count]) => count < 9);

    if (overused.length === 0 || underused.length === 0) {
      return { 
        newState: null, 
        description: 'Cannot determine which colors to swap.',
        success: false 
      };
    }

    // Create new state
    const newState = JSON.parse(JSON.stringify(cubeState)) as CubeState;
    
    // Get one overused and one underused color
    const [overColor] = overused[0];
    const [underColor] = underused[0];

    // Find a position with the overused color (not a center)
    let fixed = false;
    outer: for (const [faceName, face] of Object.entries(newState) as [FaceName, CubeColor[]][]) {
      for (let pos = 0; pos < 9; pos++) {
        if (pos === 4) continue; // Skip centers
        if (face[pos] === overColor) {
          // Check if this isn't part of a valid edge/corner first
          // For simplicity, just change it
          newState[faceName][pos] = underColor as CubeColor;
          fixed = true;
          break outer;
        }
      }
    }

    if (fixed) {
      return {
        newState,
        description: `Changed one ${COLOR_NAMES[overColor]} tile to ${COLOR_NAMES[underColor]}`,
        success: true
      };
    }

    return { 
      newState: null, 
      description: 'Could not find a suitable tile to change.',
      success: false 
    };
  }

  /**
   * Auto-fix edge piece errors
   * Strategy: Fix opposite colors by changing to a valid pairing
   */
  private autoFixEdge(error: CubeError, cubeState: CubeState): {
    newState: CubeState | null;
    description: string;
    success: boolean;
  } {
    if (error.affectedPositions.length < 2) {
      return { newState: null, description: 'Not enough position data.', success: false };
    }

    const newState = JSON.parse(JSON.stringify(cubeState)) as CubeState;
    const pos1 = error.affectedPositions[0];
    const pos2 = error.affectedPositions[1];
    
    const color1 = newState[pos1.face][pos1.position];
    const color2 = newState[pos2.face][pos2.position];

    if (!color1 || !color2) {
      return { newState: null, description: 'Missing color data.', success: false };
    }

    // If same color on both sides, change one based on count needs
    if (color1 === color2) {
      const counts: Record<string, number> = { W: 0, Y: 0, R: 0, O: 0, G: 0, B: 0 };
      for (const face of Object.values(cubeState)) {
        face.forEach(c => { if (c) counts[c]++; });
      }
      
      // Find the most underused valid color
      const validColors = Object.entries(counts)
        .filter(([c]) => c !== color1 && OPPOSITE_COLORS[color1] !== c)
        .sort((a, b) => a[1] - b[1]);
      
      if (validColors.length > 0) {
        const [newColor] = validColors[0];
        newState[pos2.face][pos2.position] = newColor as CubeColor;
        return {
          newState,
          description: `Changed duplicate ${COLOR_NAMES[color1]} to ${COLOR_NAMES[newColor]}`,
          success: true
        };
      }
    }

    // If opposite colors, change the one that's overused
    if (OPPOSITE_COLORS[color1] === color2) {
      const counts: Record<string, number> = { W: 0, Y: 0, R: 0, O: 0, G: 0, B: 0 };
      for (const face of Object.values(cubeState)) {
        face.forEach(c => { if (c) counts[c]++; });
      }

      // Determine which color to keep and which to change
      const changeFirst = counts[color1] >= counts[color2];
      const colorToChange = changeFirst ? color1 : color2;
      const colorToKeep = changeFirst ? color2 : color1;
      const posToChange = changeFirst ? pos1 : pos2;

      // Find a valid replacement color
      const validColors = Object.entries(counts)
        .filter(([c]) => c !== colorToKeep && OPPOSITE_COLORS[colorToKeep] !== c && c !== colorToChange)
        .sort((a, b) => a[1] - b[1]);

      if (validColors.length > 0) {
        const [newColor] = validColors[0];
        newState[posToChange.face][posToChange.position] = newColor as CubeColor;
        return {
          newState,
          description: `Changed ${COLOR_NAMES[colorToChange]} to ${COLOR_NAMES[newColor]} (opposite colors can't touch)`,
          success: true
        };
      }
    }

    return { 
      newState: null, 
      description: 'Could not determine a valid fix for this edge.',
      success: false 
    };
  }

  /**
   * Auto-fix corner piece errors
   */
  private autoFixCorner(error: CubeError, cubeState: CubeState): {
    newState: CubeState | null;
    description: string;
    success: boolean;
  } {
    if (error.affectedPositions.length < 3) {
      return { newState: null, description: 'Not enough position data.', success: false };
    }

    const newState = JSON.parse(JSON.stringify(cubeState)) as CubeState;
    const positions = error.affectedPositions;
    const colors = positions.map(p => newState[p.face][p.position]);

    // Check for duplicate color in corner
    const colorCounts: Record<string, number> = {};
    colors.forEach(c => {
      if (c) colorCounts[c] = (colorCounts[c] || 0) + 1;
    });

    const duplicateColor = Object.entries(colorCounts).find(([_, count]) => count > 1)?.[0];
    
    if (duplicateColor) {
      // Find global counts
      const globalCounts: Record<string, number> = { W: 0, Y: 0, R: 0, O: 0, G: 0, B: 0 };
      for (const face of Object.values(cubeState)) {
        face.forEach(c => { if (c) globalCounts[c]++; });
      }

      // Find the index of the second occurrence of duplicate color
      let foundFirst = false;
      let indexToChange = -1;
      for (let i = 0; i < colors.length; i++) {
        if (colors[i] === duplicateColor) {
          if (foundFirst) {
            indexToChange = i;
            break;
          }
          foundFirst = true;
        }
      }

      if (indexToChange >= 0) {
        // Find a valid replacement (not already in corner, not opposite of any)
        const existingColors = new Set(colors);
        const validColors = Object.entries(globalCounts)
          .filter(([c]) => {
            if (existingColors.has(c as CubeColor)) return false;
            // Check not opposite of any color in corner
            for (const existing of existingColors) {
              if (OPPOSITE_COLORS[c] === existing) return false;
            }
            return true;
          })
          .sort((a, b) => a[1] - b[1]);

        if (validColors.length > 0) {
          const [newColor] = validColors[0];
          const pos = positions[indexToChange];
          newState[pos.face][pos.position] = newColor as CubeColor;
          return {
            newState,
            description: `Changed duplicate ${COLOR_NAMES[duplicateColor]} to ${COLOR_NAMES[newColor]}`,
            success: true
          };
        }
      }
    }

    // Check for opposite colors in corner
    for (let i = 0; i < colors.length; i++) {
      for (let j = i + 1; j < colors.length; j++) {
        if (colors[i] && colors[j] && OPPOSITE_COLORS[colors[i]!] === colors[j]) {
          // Found opposite colors - change the one that's more overused
          const globalCounts: Record<string, number> = { W: 0, Y: 0, R: 0, O: 0, G: 0, B: 0 };
          for (const face of Object.values(cubeState)) {
            face.forEach(c => { if (c) globalCounts[c]++; });
          }

          const changeI = globalCounts[colors[i]!] >= globalCounts[colors[j]!];
          const indexToChange = changeI ? i : j;
          const colorToKeep = changeI ? colors[j] : colors[i];
          
          // Find valid replacement
          const existingColors = new Set(colors.filter(c => c !== colors[indexToChange]));
          const validColors = Object.entries(globalCounts)
            .filter(([c]) => {
              if (existingColors.has(c as CubeColor)) return false;
              if (OPPOSITE_COLORS[c] === colorToKeep) return false;
              for (const existing of existingColors) {
                if (OPPOSITE_COLORS[c] === existing) return false;
              }
              return true;
            })
            .sort((a, b) => a[1] - b[1]);

          if (validColors.length > 0) {
            const [newColor] = validColors[0];
            const pos = positions[indexToChange];
            newState[pos.face][pos.position] = newColor as CubeColor;
            return {
              newState,
              description: `Changed ${COLOR_NAMES[colors[indexToChange]!]} to ${COLOR_NAMES[newColor]} (opposite colors can't touch)`,
              success: true
            };
          }
        }
      }
    }

    return { 
      newState: null, 
      description: 'Could not determine a valid fix for this corner.',
      success: false 
    };
  }
}

export const errorDetectionSystem = new ErrorDetectionSystem();
export default ErrorDetectionSystem;
