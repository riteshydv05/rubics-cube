import type { CubeState, CubeColor, FaceName } from '../types/cube';

/**
 * Rubik's Cube Validator
 * 
 * Rules for a VALID cube:
 * 1. Each color appears exactly 9 times (54 stickers total)
 * 2. Each edge piece has 2 DIFFERENT colors (never the same color twice)
 * 3. Each corner piece has 3 DIFFERENT colors (never the same color twice)
 * 4. Opposite colors (W↔Y, R↔O, G↔B) can NEVER be on the same piece
 * 5. No duplicate pieces - each edge/corner combination exists exactly once
 */

// Opposite color pairs - these can NEVER appear on the same piece
const OPPOSITE_PAIRS: Record<string, string> = {
  'W': 'Y', 'Y': 'W',  // White ↔ Yellow
  'R': 'O', 'O': 'R',  // Red ↔ Orange  
  'G': 'B', 'B': 'G'   // Green ↔ Blue
};

// Color names for display
const COLOR_NAMES: Record<string, string> = {
  W: 'White', Y: 'Yellow', R: 'Red', O: 'Orange', G: 'Green', B: 'Blue'
};

// The 12 valid edge combinations (non-opposite color pairs):
const VALID_EDGE_COMBOS = new Set([
  // White edges (4)
  'WG', 'GW', 'WB', 'BW', 'WR', 'RW', 'WO', 'OW',
  // Yellow edges (4)
  'YG', 'GY', 'YB', 'BY', 'YR', 'RY', 'YO', 'OY',
  // Middle layer edges (4 - green/blue with red/orange)
  'GR', 'RG', 'GO', 'OG', 'BR', 'RB', 'BO', 'OB'
]);

// The 8 valid corner combinations (3 non-opposite colors each)
const VALID_CORNER_COMBOS = new Set([
  // Top layer (White) corners
  'WGR', 'WRG', 'GWR', 'GRW', 'RWG', 'RGW', // White-Green-Red (UFR)
  'WGO', 'WOG', 'GWO', 'GOW', 'OWG', 'OGW', // White-Green-Orange (UFL)
  'WBR', 'WRB', 'BWR', 'BRW', 'RWB', 'RBW', // White-Blue-Red (UBR)
  'WBO', 'WOB', 'BWO', 'BOW', 'OWB', 'OBW', // White-Blue-Orange (UBL)
  // Bottom layer (Yellow) corners
  'YGR', 'YRG', 'GYR', 'GRY', 'RYG', 'RGY', // Yellow-Green-Red (DFR)
  'YGO', 'YOG', 'GYO', 'GOY', 'OYG', 'OGY', // Yellow-Green-Orange (DFL)
  'YBR', 'YRB', 'BYR', 'BRY', 'RYB', 'RBY', // Yellow-Blue-Red (DBR)
  'YBO', 'YOB', 'BYO', 'BOY', 'OYB', 'OBY'  // Yellow-Blue-Orange (DBL)
]);

// Edge positions on the cube
const EDGE_POSITIONS: Array<{
  face1: FaceName; pos1: number;
  face2: FaceName; pos2: number;
  name: string;
  description: string;
}> = [
  // Top layer
  { face1: 'U', pos1: 7, face2: 'F', pos2: 1, name: 'UF', description: 'Top-Front edge' },
  { face1: 'U', pos1: 5, face2: 'R', pos2: 1, name: 'UR', description: 'Top-Right edge' },
  { face1: 'U', pos1: 1, face2: 'B', pos2: 1, name: 'UB', description: 'Top-Back edge' },
  { face1: 'U', pos1: 3, face2: 'L', pos2: 1, name: 'UL', description: 'Top-Left edge' },
  // Middle layer
  { face1: 'F', pos1: 5, face2: 'R', pos2: 3, name: 'FR', description: 'Front-Right edge' },
  { face1: 'F', pos1: 3, face2: 'L', pos2: 5, name: 'FL', description: 'Front-Left edge' },
  { face1: 'B', pos1: 3, face2: 'R', pos2: 5, name: 'BR', description: 'Back-Right edge' },
  { face1: 'B', pos1: 5, face2: 'L', pos2: 3, name: 'BL', description: 'Back-Left edge' },
  // Bottom layer
  { face1: 'D', pos1: 1, face2: 'F', pos2: 7, name: 'DF', description: 'Bottom-Front edge' },
  { face1: 'D', pos1: 5, face2: 'R', pos2: 7, name: 'DR', description: 'Bottom-Right edge' },
  { face1: 'D', pos1: 7, face2: 'B', pos2: 7, name: 'DB', description: 'Bottom-Back edge' },
  { face1: 'D', pos1: 3, face2: 'L', pos2: 7, name: 'DL', description: 'Bottom-Left edge' },
];

// Corner positions on the cube
const CORNER_POSITIONS: Array<{
  faces: [FaceName, FaceName, FaceName];
  positions: [number, number, number];
  name: string;
  description: string;
}> = [
  // Top layer corners
  // When looking at Back face, left/right is REVERSED from Front face perspective
  { faces: ['U', 'F', 'R'], positions: [8, 2, 0], name: 'UFR', description: 'Top-Front-Right corner' },
  { faces: ['U', 'F', 'L'], positions: [6, 0, 2], name: 'UFL', description: 'Top-Front-Left corner' },
  { faces: ['U', 'B', 'R'], positions: [2, 0, 2], name: 'UBR', description: 'Top-Back-Right corner' },  // B[0] not B[2]
  { faces: ['U', 'B', 'L'], positions: [0, 2, 0], name: 'UBL', description: 'Top-Back-Left corner' },   // B[2] not B[0]
  // Bottom layer corners
  { faces: ['D', 'F', 'R'], positions: [2, 8, 6], name: 'DFR', description: 'Bottom-Front-Right corner' },
  { faces: ['D', 'F', 'L'], positions: [0, 6, 8], name: 'DFL', description: 'Bottom-Front-Left corner' },
  { faces: ['D', 'B', 'R'], positions: [8, 6, 8], name: 'DBR', description: 'Bottom-Back-Right corner' }, // B[6] not B[8]
  { faces: ['D', 'B', 'L'], positions: [6, 8, 6], name: 'DBL', description: 'Bottom-Back-Left corner' },  // B[8] not B[6]
];

class CubeValidator {
  /**
   * Validate a complete cube state and return detailed errors
   */
  static validateCube(cubeState: CubeState): string[] {
    const errors: string[] = [];

    // 1. Check color counts (9 of each)
    const colorCounts = this.getColorCounts(cubeState);
    for (const [color, count] of Object.entries(colorCounts)) {
      if (count !== 9) {
        const name = COLOR_NAMES[color];
        if (count > 9) {
          errors.push(`🔴 Too many ${name}: ${count}/9 (remove ${count - 9})`);
        } else {
          errors.push(`🟡 Missing ${name}: ${count}/9 (add ${9 - count} more)`);
        }
      }
    }

    // 2. Validate each edge piece
    for (const edge of EDGE_POSITIONS) {
      const color1 = cubeState[edge.face1][edge.pos1];
      const color2 = cubeState[edge.face2][edge.pos2];

      if (color1 && color2) {
        // Check for same color twice (impossible on real cube)
        if (color1 === color2) {
          errors.push(
            `❌ ${edge.description}: Same color ${COLOR_NAMES[color1]} on both sides! ` +
            `Edge pieces always have 2 DIFFERENT colors.`
          );
          continue;
        }

        // Check for opposite colors (impossible on real cube)
        if (OPPOSITE_PAIRS[color1] === color2) {
          errors.push(
            `❌ ${edge.description}: ${COLOR_NAMES[color1]} & ${COLOR_NAMES[color2]} are OPPOSITE colors! ` +
            `They can never be on the same edge.`
          );
          continue;
        }

        // Check if it's a valid edge combination
        const combo = `${color1}${color2}`;
        if (!VALID_EDGE_COMBOS.has(combo)) {
          errors.push(`❌ Invalid ${edge.description}: ${COLOR_NAMES[color1]}-${COLOR_NAMES[color2]}`);
        }
      }
    }

    // 3. Validate each corner piece
    for (const corner of CORNER_POSITIONS) {
      const [f1, f2, f3] = corner.faces;
      const [p1, p2, p3] = corner.positions;
      const c1 = cubeState[f1][p1];
      const c2 = cubeState[f2][p2];
      const c3 = cubeState[f3][p3];

      if (c1 && c2 && c3) {
        const colors = [c1, c2, c3];
        
        // Check for same color appearing twice
        const uniqueColors = new Set(colors);
        if (uniqueColors.size < 3) {
          const duplicates = colors.filter((c, i) => colors.indexOf(c) !== i);
          errors.push(
            `❌ ${corner.description}: ${COLOR_NAMES[duplicates[0]]} appears twice! ` +
            `Corner pieces always have 3 DIFFERENT colors.`
          );
          continue;
        }

        // Check for opposite colors
        for (let i = 0; i < colors.length; i++) {
          for (let j = i + 1; j < colors.length; j++) {
            if (OPPOSITE_PAIRS[colors[i]] === colors[j]) {
              errors.push(
                `❌ ${corner.description}: ${COLOR_NAMES[colors[i]]} & ${COLOR_NAMES[colors[j]]} are OPPOSITE! ` +
                `Opposite colors never meet at a corner.`
              );
            }
          }
        }

        // Check if valid corner combination
        const combo = colors.join('');
        if (!VALID_CORNER_COMBOS.has(combo)) {
          errors.push(
            `❌ Invalid ${corner.description}: ${colors.map(c => COLOR_NAMES[c]).join('-')}`
          );
        }
      }
    }

    // 4. Check for duplicate edge pieces
    const edgePieceCounts = new Map<string, string[]>();
    for (const edge of EDGE_POSITIONS) {
      const color1 = cubeState[edge.face1][edge.pos1];
      const color2 = cubeState[edge.face2][edge.pos2];
      if (color1 && color2 && color1 !== color2) {
        const sorted = [color1, color2].sort().join('-');
        if (!edgePieceCounts.has(sorted)) {
          edgePieceCounts.set(sorted, []);
        }
        edgePieceCounts.get(sorted)!.push(edge.name);
      }
    }
    
    for (const [piece, locations] of edgePieceCounts) {
      if (locations.length > 1) {
        const [c1, c2] = piece.split('-');
        errors.push(
          `⚠️ Duplicate edge ${COLOR_NAMES[c1]}-${COLOR_NAMES[c2]} at: ${locations.join(', ')}. ` +
          `Each edge piece exists only once!`
        );
      }
    }

    // 5. Check for duplicate corner pieces
    const cornerPieceCounts = new Map<string, string[]>();
    for (const corner of CORNER_POSITIONS) {
      const [f1, f2, f3] = corner.faces;
      const [p1, p2, p3] = corner.positions;
      const c1 = cubeState[f1][p1];
      const c2 = cubeState[f2][p2];
      const c3 = cubeState[f3][p3];
      
      if (c1 && c2 && c3) {
        const sorted = [c1, c2, c3].sort().join('-');
        if (!cornerPieceCounts.has(sorted)) {
          cornerPieceCounts.set(sorted, []);
        }
        cornerPieceCounts.get(sorted)!.push(corner.name);
      }
    }
    
    for (const [piece, locations] of cornerPieceCounts) {
      if (locations.length > 1) {
        const colors = piece.split('-').map(c => COLOR_NAMES[c]).join('-');
        errors.push(
          `⚠️ Duplicate corner ${colors} at: ${locations.join(', ')}. ` +
          `Each corner piece exists only once!`
        );
      }
    }

    return errors;
  }

  /**
   * Get color counts across all faces
   */
  static getColorCounts(cubeState: CubeState): Record<NonNullable<CubeColor>, number> {
    const counts: Record<NonNullable<CubeColor>, number> = {
      W: 0, Y: 0, R: 0, O: 0, G: 0, B: 0
    };
    
    Object.values(cubeState).forEach(face => {
      face.forEach(color => {
        if (color) counts[color]++;
      });
    });
    
    return counts;
  }

  /**
   * Check if cube is complete (all cells filled)
   */
  static isComplete(cubeState: CubeState): boolean {
    return Object.values(cubeState).every(face => 
      face.every(cell => cell !== null)
    );
  }

  /**
   * Get helpful tips based on current errors
   */
  static getHelpTips(errors: string[]): string[] {
    const tips: string[] = [];
    
    if (errors.some(e => e.includes('OPPOSITE'))) {
      tips.push('💡 Remember: White↔Yellow, Red↔Orange, Green↔Blue are OPPOSITE and never touch!');
    }
    if (errors.some(e => e.includes('Same color') || e.includes('appears twice'))) {
      tips.push('💡 Each edge has 2 DIFFERENT colors. Each corner has 3 DIFFERENT colors.');
    }
    if (errors.some(e => e.includes('Duplicate'))) {
      tips.push('💡 Check if you entered a color wrong - each piece is unique on a real cube.');
    }
    if (errors.some(e => e.includes('parity') || e.includes('Parity'))) {
      tips.push('💡 Parity error means the cube was likely reassembled incorrectly or a sticker was moved.');
    }
    
    return tips;
  }

  /**
   * Check solvability using permutation and orientation parity
   * A cube is solvable if and only if:
   * 1. Edge permutation parity = Corner permutation parity (both even or both odd)
   * 2. Total edge orientation = 0 (mod 2)
   * 3. Total corner orientation = 0 (mod 3)
   */
  static checkSolvability(cubeState: CubeState): string[] {
    const errors: string[] = [];

    // Define the solved state edge and corner pieces for reference
    const SOLVED_EDGES = [
      ['W', 'G'], // UF
      ['W', 'R'], // UR
      ['W', 'B'], // UB
      ['W', 'O'], // UL
      ['G', 'R'], // FR
      ['G', 'O'], // FL
      ['B', 'R'], // BR
      ['B', 'O'], // BL
      ['Y', 'G'], // DF
      ['Y', 'R'], // DR
      ['Y', 'B'], // DB
      ['Y', 'O'], // DL
    ];

    const SOLVED_CORNERS = [
      ['W', 'G', 'R'], // UFR
      ['W', 'O', 'G'], // UFL
      ['W', 'R', 'B'], // UBR
      ['W', 'B', 'O'], // UBL
      ['Y', 'R', 'G'], // DFR
      ['Y', 'G', 'O'], // DFL
      ['Y', 'B', 'R'], // DBR
      ['Y', 'O', 'B'], // DBL
    ];

    // Get current edge pieces
    const currentEdges: [CubeColor, CubeColor][] = EDGE_POSITIONS.map(edge => {
      const c1 = cubeState[edge.face1][edge.pos1];
      const c2 = cubeState[edge.face2][edge.pos2];
      return [c1, c2];
    });

    // Get current corner pieces
    const currentCorners: [CubeColor, CubeColor, CubeColor][] = CORNER_POSITIONS.map(corner => {
      const [f1, f2, f3] = corner.faces;
      const [p1, p2, p3] = corner.positions;
      return [cubeState[f1][p1], cubeState[f2][p2], cubeState[f3][p3]];
    });

    // Check if all pieces are present (basic validation should catch this, but double-check)
    const hasAllPieces = currentEdges.every(e => e[0] && e[1]) && 
                         currentCorners.every(c => c[0] && c[1] && c[2]);
    if (!hasAllPieces) return errors; // Can't check parity with missing pieces

    // Calculate edge orientation parity
    // An edge is correctly oriented if its first color matches what would be on U/D face, or
    // for middle layer edges, if the Front/Back color is in the Front/Back position
    let edgeOrientationSum = 0;
    for (let i = 0; i < currentEdges.length; i++) {
      const [c1, c2] = currentEdges[i];
      if (!c1 || !c2) continue;
      
      // Find which solved edge this matches
      const sortedCurrent = [c1, c2].sort().join('');
      let orientationCorrect = false;
      
      for (let j = 0; j < SOLVED_EDGES.length; j++) {
        const sortedSolved = [...SOLVED_EDGES[j]].sort().join('');
        if (sortedCurrent === sortedSolved) {
          // Check if the orientation matches
          // For U/D layer edges, the U/D color should be on U/D face
          // For middle layer edges, F/B color should be on F/B face
          if (i < 4) {
            // U layer edges - first color should be W
            orientationCorrect = (c1 === 'W');
          } else if (i >= 8) {
            // D layer edges - first color should be Y  
            orientationCorrect = (c1 === 'Y');
          } else {
            // Middle layer edges - F/B color in F/B position
            orientationCorrect = (c1 === 'G' || c1 === 'B');
          }
          break;
        }
      }
      
      if (!orientationCorrect) edgeOrientationSum++;
    }

    // Edge orientation must be even (divisible by 2)
    if (edgeOrientationSum % 2 !== 0) {
      errors.push(
        `🔧 Edge orientation parity error: One or more edges are flipped in a way ` +
        `that's impossible through normal cube moves. This usually means a sticker ` +
        `was peeled off and replaced incorrectly.`
      );
    }

    // Calculate corner orientation parity
    // A corner's orientation is 0, 1, or 2 based on rotation of U/D color
    let cornerOrientationSum = 0;
    for (let i = 0; i < currentCorners.length; i++) {
      const [c1, c2, c3] = currentCorners[i];
      if (!c1 || !c2 || !c3) continue;
      
      // Find the U/D color (W or Y) and its position
      let udColorPos = -1;
      if (c1 === 'W' || c1 === 'Y') udColorPos = 0;
      else if (c2 === 'W' || c2 === 'Y') udColorPos = 1;
      else if (c3 === 'W' || c3 === 'Y') udColorPos = 2;
      
      // Position 0 means U/D color is on U/D face (correct orientation = 0)
      // Position 1 means clockwise twist = 1
      // Position 2 means counter-clockwise twist = 2
      cornerOrientationSum += udColorPos;
    }

    // Corner orientation sum must be divisible by 3
    if (cornerOrientationSum % 3 !== 0) {
      errors.push(
        `🔧 Corner orientation parity error: One or more corners are twisted in a way ` +
        `that's impossible through normal cube moves. This usually means the cube was ` +
        `disassembled and a corner piece was put back twisted.`
      );
    }

    // Calculate permutation parity
    // Count inversions to determine if even or odd permutation
    const getEdgeId = (colors: [CubeColor, CubeColor]): number => {
      const sorted = [colors[0], colors[1]].sort().join('');
      for (let i = 0; i < SOLVED_EDGES.length; i++) {
        if ([...SOLVED_EDGES[i]].sort().join('') === sorted) return i;
      }
      return -1;
    };

    const getCornerId = (colors: [CubeColor, CubeColor, CubeColor]): number => {
      const sorted = [colors[0], colors[1], colors[2]].sort().join('');
      for (let i = 0; i < SOLVED_CORNERS.length; i++) {
        if ([...SOLVED_CORNERS[i]].sort().join('') === sorted) return i;
      }
      return -1;
    };

    // Count edge inversions
    let edgeInversions = 0;
    const edgeIds = currentEdges.map(e => getEdgeId(e as [CubeColor, CubeColor]));
    for (let i = 0; i < edgeIds.length; i++) {
      for (let j = i + 1; j < edgeIds.length; j++) {
        if (edgeIds[i] > edgeIds[j] && edgeIds[i] !== -1 && edgeIds[j] !== -1) {
          edgeInversions++;
        }
      }
    }

    // Count corner inversions
    let cornerInversions = 0;
    const cornerIds = currentCorners.map(c => getCornerId(c as [CubeColor, CubeColor, CubeColor]));
    for (let i = 0; i < cornerIds.length; i++) {
      for (let j = i + 1; j < cornerIds.length; j++) {
        if (cornerIds[i] > cornerIds[j] && cornerIds[i] !== -1 && cornerIds[j] !== -1) {
          cornerInversions++;
        }
      }
    }

    // Edge and corner permutation parities must match (both even or both odd)
    const edgeParityEven = edgeInversions % 2 === 0;
    const cornerParityEven = cornerInversions % 2 === 0;
    
    if (edgeParityEven !== cornerParityEven) {
      errors.push(
        `🔧 Permutation parity error: The edges and corners have mismatched parities. ` +
        `This state cannot be reached through normal cube moves. The cube was likely ` +
        `disassembled and two pieces were swapped.`
      );
    }

    return errors;
  }
}

export default CubeValidator;
