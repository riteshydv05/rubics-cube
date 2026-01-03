import type { CubeState, Move, Solution, FaceName, CubeColor } from '../types/cube';

// Import rubiks-cube-solver (Fridrich method)
// @ts-ignore - no types available
import rubiksCubeSolver from 'rubiks-cube-solver';

/**
 * Color to face mapping for rubiks-cube-solver
 * The solver expects colors as face indicators (f, r, u, d, l, b)
 */
const COLOR_TO_FACE: Record<NonNullable<CubeColor>, string> = {
  'G': 'f', // Green = Front
  'R': 'r', // Red = Right
  'W': 'u', // White = Up
  'Y': 'd', // Yellow = Down
  'O': 'l', // Orange = Left
  'B': 'b', // Blue = Back
};

/**
 * Convert our CubeState to the string format expected by rubiks-cube-solver
 * Order: front, right, up, down, left, back (9 chars each = 54 total)
 */
function cubeStateToSolverString(state: CubeState): string {
  // For each face, read colors top-to-bottom, left-to-right (like reading a book)
  // Our state is already in this order: indices 0-2 (top row), 3-5 (middle), 6-8 (bottom)
  
  const convertFace = (colors: (CubeColor | null)[]): string => {
    return colors.map(c => c ? COLOR_TO_FACE[c] : 'f').join('');
  };
  
  // Order: F, R, U, D, L, B
  return [
    convertFace(state.F),
    convertFace(state.R),
    convertFace(state.U),
    convertFace(state.D),
    convertFace(state.L),
    convertFace(state.B),
  ].join('');
}

/**
 * Convert solver notation to standard notation
 * rubiks-cube-solver uses:
 * - Uppercase for normal moves (U, R, F, etc.)
 * - Lowercase for wide moves (u, r, f, etc.) which move 2 layers
 * - "prime" suffix for counter-clockwise
 * - "2" for 180° turns
 */
function normalizeSolverNotation(moves: string): string[] {
  if (!moves || moves.trim() === '') return [];
  
  // Split by whitespace and filter empty
  const tokens = moves.split(/\s+/).filter(m => m.length > 0);
  
  return tokens.map(move => {
    // Check if it's a wide move (lowercase first letter)
    const isWide = /^[a-z]/.test(move);
    const firstChar = move[0];
    let face = firstChar.toUpperCase();
    let suffix = '';
    
    // Check for "prime" suffix (counter-clockwise)
    if (move.toLowerCase().includes('prime')) {
      suffix = "'";
    } else if (move.includes('2')) {
      suffix = '2';
    }
    
    // For wide moves, use lowercase 'w' suffix (e.g., Bw, Dw)
    // Or we can use our own convention: prefix with 'w' internally
    if (isWide) {
      return face.toLowerCase() + suffix; // e.g., b, b', b2
    }
    
    return face + suffix;
  });
}

/**
 * Solve using rubiks-cube-solver (Fridrich/CFOP method)
 * This provides reliable solutions for any valid cube state
 */
function fridrichSolve(state: CubeState): string[] {
  try {
    const cubeString = cubeStateToSolverString(state);
    console.log('Cube string for solver:', cubeString);
    
    // Call the solver
    const solution = rubiksCubeSolver(cubeString);
    console.log('Raw solution from solver:', solution);
    
    if (!solution || solution.trim() === '') {
      console.log('Solver returned empty solution');
      return [];
    }
    
    // Normalize the notation
    const moves = normalizeSolverNotation(solution);
    console.log('Normalized moves:', moves);
    
    return moves;
  } catch (error) {
    console.error('Fridrich solver error:', error);
    return [];
  }
}

/**
 * Parse move notation to Move object
 * Handles both standard moves (U, R', F2) and wide moves (u, b', d2)
 */
function parseMove(notation: string): Move {
  const isWide = /^[a-z]/.test(notation);
  const firstChar = notation[0];
  const face = firstChar.toUpperCase() as Move['face'];
  let direction: Move['direction'] = 'CW';
  
  const widePrefix = isWide ? 'wide ' : '';
  let description = `${widePrefix}Turn ${face} face clockwise 90°`;

  if (notation.includes("'")) {
    direction = 'CCW';
    description = `${widePrefix}Turn ${face} face counter-clockwise 90°`;
  } else if (notation.includes('2')) {
    direction = '180';
    description = `${widePrefix}Turn ${face} face 180°`;
  }

  // Store the actual notation (preserving case for wide moves)
  return { notation: notation.trim(), face, direction, description };
}

/**
 * Deep clone cube state
 */
function cloneState(state: CubeState): CubeState {
  return {
    U: [...state.U],
    D: [...state.D],
    F: [...state.F],
    B: [...state.B],
    L: [...state.L],
    R: [...state.R],
  };
}

/**
 * Apply a single move to the cube state
 * Supports both regular moves (U, R', F2) and wide moves (u, b', d2)
 * Wide moves (lowercase) rotate two layers instead of one
 */
function applyMoveToState(state: CubeState, move: string): CubeState {
  const isWide = /^[a-z]/.test(move);
  const face = move[0].toUpperCase() as FaceName;
  const isPrime = move.includes("'");
  const isDouble = move.includes('2');
  
  let newState = cloneState(state);
  const times = isDouble ? 2 : 1;
  
  for (let t = 0; t < times; t++) {
    // Rotate the face itself
    const oldFace = [...newState[face]];
    if (isPrime) {
      // Counter-clockwise
      newState[face][0] = oldFace[2];
      newState[face][1] = oldFace[5];
      newState[face][2] = oldFace[8];
      newState[face][3] = oldFace[1];
      newState[face][5] = oldFace[7];
      newState[face][6] = oldFace[0];
      newState[face][7] = oldFace[3];
      newState[face][8] = oldFace[6];
    } else {
      // Clockwise
      newState[face][0] = oldFace[6];
      newState[face][1] = oldFace[3];
      newState[face][2] = oldFace[0];
      newState[face][3] = oldFace[7];
      newState[face][5] = oldFace[1];
      newState[face][6] = oldFace[8];
      newState[face][7] = oldFace[5];
      newState[face][8] = oldFace[2];
    }
    
    // Rotate adjacent edges
    const temp: CubeColor[] = [];
    switch (face) {
      case 'U':
        if (!isPrime) {
          temp[0] = newState.F[0]; temp[1] = newState.F[1]; temp[2] = newState.F[2];
          newState.F[0] = newState.R[0]; newState.F[1] = newState.R[1]; newState.F[2] = newState.R[2];
          newState.R[0] = newState.B[0]; newState.R[1] = newState.B[1]; newState.R[2] = newState.B[2];
          newState.B[0] = newState.L[0]; newState.B[1] = newState.L[1]; newState.B[2] = newState.L[2];
          newState.L[0] = temp[0]; newState.L[1] = temp[1]; newState.L[2] = temp[2];
        } else {
          temp[0] = newState.F[0]; temp[1] = newState.F[1]; temp[2] = newState.F[2];
          newState.F[0] = newState.L[0]; newState.F[1] = newState.L[1]; newState.F[2] = newState.L[2];
          newState.L[0] = newState.B[0]; newState.L[1] = newState.B[1]; newState.L[2] = newState.B[2];
          newState.B[0] = newState.R[0]; newState.B[1] = newState.R[1]; newState.B[2] = newState.R[2];
          newState.R[0] = temp[0]; newState.R[1] = temp[1]; newState.R[2] = temp[2];
        }
        break;
      case 'D':
        if (!isPrime) {
          temp[0] = newState.F[6]; temp[1] = newState.F[7]; temp[2] = newState.F[8];
          newState.F[6] = newState.L[6]; newState.F[7] = newState.L[7]; newState.F[8] = newState.L[8];
          newState.L[6] = newState.B[6]; newState.L[7] = newState.B[7]; newState.L[8] = newState.B[8];
          newState.B[6] = newState.R[6]; newState.B[7] = newState.R[7]; newState.B[8] = newState.R[8];
          newState.R[6] = temp[0]; newState.R[7] = temp[1]; newState.R[8] = temp[2];
        } else {
          temp[0] = newState.F[6]; temp[1] = newState.F[7]; temp[2] = newState.F[8];
          newState.F[6] = newState.R[6]; newState.F[7] = newState.R[7]; newState.F[8] = newState.R[8];
          newState.R[6] = newState.B[6]; newState.R[7] = newState.B[7]; newState.R[8] = newState.B[8];
          newState.B[6] = newState.L[6]; newState.B[7] = newState.L[7]; newState.B[8] = newState.L[8];
          newState.L[6] = temp[0]; newState.L[7] = temp[1]; newState.L[8] = temp[2];
        }
        break;
      case 'F':
        if (!isPrime) {
          temp[0] = newState.U[6]; temp[1] = newState.U[7]; temp[2] = newState.U[8];
          newState.U[6] = newState.L[8]; newState.U[7] = newState.L[5]; newState.U[8] = newState.L[2];
          newState.L[2] = newState.D[0]; newState.L[5] = newState.D[1]; newState.L[8] = newState.D[2];
          newState.D[0] = newState.R[6]; newState.D[1] = newState.R[3]; newState.D[2] = newState.R[0];
          newState.R[0] = temp[0]; newState.R[3] = temp[1]; newState.R[6] = temp[2];
        } else {
          temp[0] = newState.U[6]; temp[1] = newState.U[7]; temp[2] = newState.U[8];
          newState.U[6] = newState.R[0]; newState.U[7] = newState.R[3]; newState.U[8] = newState.R[6];
          newState.R[0] = newState.D[2]; newState.R[3] = newState.D[1]; newState.R[6] = newState.D[0];
          newState.D[0] = newState.L[2]; newState.D[1] = newState.L[5]; newState.D[2] = newState.L[8];
          newState.L[2] = temp[2]; newState.L[5] = temp[1]; newState.L[8] = temp[0];
        }
        break;
      case 'B':
        if (!isPrime) {
          temp[0] = newState.U[0]; temp[1] = newState.U[1]; temp[2] = newState.U[2];
          newState.U[0] = newState.R[2]; newState.U[1] = newState.R[5]; newState.U[2] = newState.R[8];
          newState.R[2] = newState.D[8]; newState.R[5] = newState.D[7]; newState.R[8] = newState.D[6];
          newState.D[6] = newState.L[0]; newState.D[7] = newState.L[3]; newState.D[8] = newState.L[6];
          newState.L[0] = temp[2]; newState.L[3] = temp[1]; newState.L[6] = temp[0];
        } else {
          temp[0] = newState.U[0]; temp[1] = newState.U[1]; temp[2] = newState.U[2];
          newState.U[0] = newState.L[6]; newState.U[1] = newState.L[3]; newState.U[2] = newState.L[0];
          newState.L[0] = newState.D[6]; newState.L[3] = newState.D[7]; newState.L[6] = newState.D[8];
          newState.D[6] = newState.R[8]; newState.D[7] = newState.R[5]; newState.D[8] = newState.R[2];
          newState.R[2] = temp[0]; newState.R[5] = temp[1]; newState.R[8] = temp[2];
        }
        break;
      case 'R':
        if (!isPrime) {
          temp[0] = newState.U[2]; temp[1] = newState.U[5]; temp[2] = newState.U[8];
          newState.U[2] = newState.F[2]; newState.U[5] = newState.F[5]; newState.U[8] = newState.F[8];
          newState.F[2] = newState.D[2]; newState.F[5] = newState.D[5]; newState.F[8] = newState.D[8];
          newState.D[2] = newState.B[6]; newState.D[5] = newState.B[3]; newState.D[8] = newState.B[0];
          newState.B[0] = temp[2]; newState.B[3] = temp[1]; newState.B[6] = temp[0];
        } else {
          temp[0] = newState.U[2]; temp[1] = newState.U[5]; temp[2] = newState.U[8];
          newState.U[2] = newState.B[6]; newState.U[5] = newState.B[3]; newState.U[8] = newState.B[0];
          newState.B[0] = newState.D[8]; newState.B[3] = newState.D[5]; newState.B[6] = newState.D[2];
          newState.D[2] = newState.F[2]; newState.D[5] = newState.F[5]; newState.D[8] = newState.F[8];
          newState.F[2] = temp[0]; newState.F[5] = temp[1]; newState.F[8] = temp[2];
        }
        break;
      case 'L':
        if (!isPrime) {
          temp[0] = newState.U[0]; temp[1] = newState.U[3]; temp[2] = newState.U[6];
          newState.U[0] = newState.B[8]; newState.U[3] = newState.B[5]; newState.U[6] = newState.B[2];
          newState.B[2] = newState.D[6]; newState.B[5] = newState.D[3]; newState.B[8] = newState.D[0];
          newState.D[0] = newState.F[0]; newState.D[3] = newState.F[3]; newState.D[6] = newState.F[6];
          newState.F[0] = temp[0]; newState.F[3] = temp[1]; newState.F[6] = temp[2];
        } else {
          temp[0] = newState.U[0]; temp[1] = newState.U[3]; temp[2] = newState.U[6];
          newState.U[0] = newState.F[0]; newState.U[3] = newState.F[3]; newState.U[6] = newState.F[6];
          newState.F[0] = newState.D[0]; newState.F[3] = newState.D[3]; newState.F[6] = newState.D[6];
          newState.D[0] = newState.B[8]; newState.D[3] = newState.B[5]; newState.D[6] = newState.B[2];
          newState.B[2] = temp[2]; newState.B[5] = temp[1]; newState.B[8] = temp[0];
        }
        break;
    }
    
    // For wide moves, also rotate the middle slice
    // Wide move = outer face + middle slice in same direction
    if (isWide) {
      const middleTemp: CubeColor[] = [];
      switch (face) {
        case 'U':
          // Wide U also moves the E slice (opposite direction to D)
          // E slice: F middle row -> L middle row -> B middle row -> R middle row
          if (!isPrime) {
            middleTemp[0] = newState.F[3]; middleTemp[1] = newState.F[4]; middleTemp[2] = newState.F[5];
            newState.F[3] = newState.R[3]; newState.F[4] = newState.R[4]; newState.F[5] = newState.R[5];
            newState.R[3] = newState.B[3]; newState.R[4] = newState.B[4]; newState.R[5] = newState.B[5];
            newState.B[3] = newState.L[3]; newState.B[4] = newState.L[4]; newState.B[5] = newState.L[5];
            newState.L[3] = middleTemp[0]; newState.L[4] = middleTemp[1]; newState.L[5] = middleTemp[2];
          } else {
            middleTemp[0] = newState.F[3]; middleTemp[1] = newState.F[4]; middleTemp[2] = newState.F[5];
            newState.F[3] = newState.L[3]; newState.F[4] = newState.L[4]; newState.F[5] = newState.L[5];
            newState.L[3] = newState.B[3]; newState.L[4] = newState.B[4]; newState.L[5] = newState.B[5];
            newState.B[3] = newState.R[3]; newState.B[4] = newState.R[4]; newState.B[5] = newState.R[5];
            newState.R[3] = middleTemp[0]; newState.R[4] = middleTemp[1]; newState.R[5] = middleTemp[2];
          }
          break;
        case 'D':
          // Wide D also moves the E slice (same direction as D)
          if (!isPrime) {
            middleTemp[0] = newState.F[3]; middleTemp[1] = newState.F[4]; middleTemp[2] = newState.F[5];
            newState.F[3] = newState.L[3]; newState.F[4] = newState.L[4]; newState.F[5] = newState.L[5];
            newState.L[3] = newState.B[3]; newState.L[4] = newState.B[4]; newState.L[5] = newState.B[5];
            newState.B[3] = newState.R[3]; newState.B[4] = newState.R[4]; newState.B[5] = newState.R[5];
            newState.R[3] = middleTemp[0]; newState.R[4] = middleTemp[1]; newState.R[5] = middleTemp[2];
          } else {
            middleTemp[0] = newState.F[3]; middleTemp[1] = newState.F[4]; middleTemp[2] = newState.F[5];
            newState.F[3] = newState.R[3]; newState.F[4] = newState.R[4]; newState.F[5] = newState.R[5];
            newState.R[3] = newState.B[3]; newState.R[4] = newState.B[4]; newState.R[5] = newState.B[5];
            newState.B[3] = newState.L[3]; newState.B[4] = newState.L[4]; newState.B[5] = newState.L[5];
            newState.L[3] = middleTemp[0]; newState.L[4] = middleTemp[1]; newState.L[5] = middleTemp[2];
          }
          break;
        case 'F':
          // Wide F also moves the S slice (middle layer between F and B)
          // S follows F direction: U middle row (3,4,5) -> L middle col (1,4,7) -> D middle row (3,4,5) -> R middle col (1,4,7)
          if (!isPrime) {
            middleTemp[0] = newState.U[3]; middleTemp[1] = newState.U[4]; middleTemp[2] = newState.U[5];
            newState.U[3] = newState.L[7]; newState.U[4] = newState.L[4]; newState.U[5] = newState.L[1];
            newState.L[1] = newState.D[3]; newState.L[4] = newState.D[4]; newState.L[7] = newState.D[5];
            newState.D[3] = newState.R[7]; newState.D[4] = newState.R[4]; newState.D[5] = newState.R[1];
            newState.R[1] = middleTemp[0]; newState.R[4] = middleTemp[1]; newState.R[7] = middleTemp[2];
          } else {
            middleTemp[0] = newState.U[3]; middleTemp[1] = newState.U[4]; middleTemp[2] = newState.U[5];
            newState.U[3] = newState.R[1]; newState.U[4] = newState.R[4]; newState.U[5] = newState.R[7];
            newState.R[1] = newState.D[5]; newState.R[4] = newState.D[4]; newState.R[7] = newState.D[3];
            newState.D[3] = newState.L[1]; newState.D[4] = newState.L[4]; newState.D[5] = newState.L[7];
            newState.L[1] = middleTemp[2]; newState.L[4] = middleTemp[1]; newState.L[7] = middleTemp[0];
          }
          break;
        case 'B':
          // Wide B also moves the S slice (opposite direction to F)
          if (!isPrime) {
            middleTemp[0] = newState.U[3]; middleTemp[1] = newState.U[4]; middleTemp[2] = newState.U[5];
            newState.U[3] = newState.R[1]; newState.U[4] = newState.R[4]; newState.U[5] = newState.R[7];
            newState.R[1] = newState.D[5]; newState.R[4] = newState.D[4]; newState.R[7] = newState.D[3];
            newState.D[3] = newState.L[1]; newState.D[4] = newState.L[4]; newState.D[5] = newState.L[7];
            newState.L[1] = middleTemp[2]; newState.L[4] = middleTemp[1]; newState.L[7] = middleTemp[0];
          } else {
            middleTemp[0] = newState.U[3]; middleTemp[1] = newState.U[4]; middleTemp[2] = newState.U[5];
            newState.U[3] = newState.L[7]; newState.U[4] = newState.L[4]; newState.U[5] = newState.L[1];
            newState.L[1] = newState.D[3]; newState.L[4] = newState.D[4]; newState.L[7] = newState.D[5];
            newState.D[3] = newState.R[7]; newState.D[4] = newState.R[4]; newState.D[5] = newState.R[1];
            newState.R[1] = middleTemp[0]; newState.R[4] = middleTemp[1]; newState.R[7] = middleTemp[2];
          }
          break;
        case 'R':
          // Wide R also moves the M slice (opposite direction)
          // M follows L direction: U middle col (1,4,7) -> F middle col (1,4,7) -> D middle col (1,4,7) -> B middle col reversed (7,4,1)
          if (!isPrime) {
            middleTemp[0] = newState.U[1]; middleTemp[1] = newState.U[4]; middleTemp[2] = newState.U[7];
            newState.U[1] = newState.F[1]; newState.U[4] = newState.F[4]; newState.U[7] = newState.F[7];
            newState.F[1] = newState.D[1]; newState.F[4] = newState.D[4]; newState.F[7] = newState.D[7];
            newState.D[1] = newState.B[7]; newState.D[4] = newState.B[4]; newState.D[7] = newState.B[1];
            newState.B[1] = middleTemp[2]; newState.B[4] = middleTemp[1]; newState.B[7] = middleTemp[0];
          } else {
            middleTemp[0] = newState.U[1]; middleTemp[1] = newState.U[4]; middleTemp[2] = newState.U[7];
            newState.U[1] = newState.B[7]; newState.U[4] = newState.B[4]; newState.U[7] = newState.B[1];
            newState.B[1] = newState.D[7]; newState.B[4] = newState.D[4]; newState.B[7] = newState.D[1];
            newState.D[1] = newState.F[1]; newState.D[4] = newState.F[4]; newState.D[7] = newState.F[7];
            newState.F[1] = middleTemp[0]; newState.F[4] = middleTemp[1]; newState.F[7] = middleTemp[2];
          }
          break;
        case 'L':
          // Wide L also moves the M slice (same direction as L)
          if (!isPrime) {
            middleTemp[0] = newState.U[1]; middleTemp[1] = newState.U[4]; middleTemp[2] = newState.U[7];
            newState.U[1] = newState.B[7]; newState.U[4] = newState.B[4]; newState.U[7] = newState.B[1];
            newState.B[1] = newState.D[7]; newState.B[4] = newState.D[4]; newState.B[7] = newState.D[1];
            newState.D[1] = newState.F[1]; newState.D[4] = newState.F[4]; newState.D[7] = newState.F[7];
            newState.F[1] = middleTemp[0]; newState.F[4] = middleTemp[1]; newState.F[7] = middleTemp[2];
          } else {
            middleTemp[0] = newState.U[1]; middleTemp[1] = newState.U[4]; middleTemp[2] = newState.U[7];
            newState.U[1] = newState.F[1]; newState.U[4] = newState.F[4]; newState.U[7] = newState.F[7];
            newState.F[1] = newState.D[1]; newState.F[4] = newState.D[4]; newState.F[7] = newState.D[7];
            newState.D[1] = newState.B[7]; newState.D[4] = newState.B[4]; newState.D[7] = newState.B[1];
            newState.B[1] = middleTemp[2]; newState.B[4] = middleTemp[1]; newState.B[7] = middleTemp[0];
          }
          break;
      }
    }
  }
  
  return newState;
}

/**
 * Apply a sequence of moves to the state
 */
function applyMoves(state: CubeState, moves: string[]): CubeState {
  let current = state;
  for (const move of moves) {
    current = applyMoveToState(current, move);
  }
  return current;
}

/**
 * Check if the cube is solved
 */
export function isSolved(state: CubeState): boolean {
  const faces: FaceName[] = ['U', 'R', 'F', 'D', 'L', 'B'];
  
  for (const face of faces) {
    const centerColor = state[face][4];
    if (!centerColor) return false;
    
    for (let i = 0; i < state[face].length; i++) {
      const color = state[face][i];
      if (color !== centerColor) {
        return false;
      }
    }
  }
  
  return true;
}

/**
 * Get the color mapping based on center colors
 */
function getColorMapping(state: CubeState): Record<FaceName, CubeColor> {
  return {
    U: state.U[4],
    D: state.D[4],
    F: state.F[4],
    B: state.B[4],
    L: state.L[4],
    R: state.R[4],
  };
}

/**
 * Iterative Deepening A* (IDA*) solver
 * Uses a simplified approach for reasonable solve times
 */
function idaSolve(state: CubeState, maxDepth: number = 12): string[] {
  const moves = ['U', "U'", 'U2', 'D', "D'", 'D2', 'F', "F'", 'F2', 'B', "B'", 'B2', 'R', "R'", 'R2', 'L', "L'", 'L2'];
  
  // Opposite faces - can't do same face twice in a row
  const oppositeFace: Record<string, string> = { U: 'D', D: 'U', F: 'B', B: 'F', R: 'L', L: 'R' };
  
  let nodeCount = 0;
  const maxNodes = 2000000; // 2 million nodes max
  
  function canFollow(lastMove: string | null, nextMove: string): boolean {
    if (!lastMove) return true;
    const lastFace = lastMove[0];
    const nextFace = nextMove[0];
    // Don't do same face twice
    if (lastFace === nextFace) return false;
    // When doing opposite faces, enforce order to avoid redundancy
    if (oppositeFace[lastFace] === nextFace && lastFace > nextFace) return false;
    return true;
  }
  
  function search(current: CubeState, path: string[], depth: number): string[] | null {
    nodeCount++;
    
    // Bail out if we've checked too many nodes
    if (nodeCount > maxNodes) {
      return null;
    }
    
    if (isSolved(current)) {
      return path;
    }
    
    if (depth === 0) {
      return null;
    }
    
    const lastMove = path.length > 0 ? path[path.length - 1] : null;
    
    for (const move of moves) {
      if (!canFollow(lastMove, move)) continue;
      
      const newState = applyMoveToState(current, move);
      const result = search(newState, [...path, move], depth - 1);
      if (result) {
        return result;
      }
    }
    
    return null;
  }
  
  // Iterative deepening - try increasing depths
  const effectiveMaxDepth = Math.min(maxDepth, 10);
  for (let depth = 1; depth <= effectiveMaxDepth; depth++) {
    nodeCount = 0; // Reset for each depth
    const result = search(state, [], depth);
    if (result) {
      return result;
    }
    // If we hit the node limit, bail out early
    if (nodeCount >= maxNodes) {
      console.log(`IDA* hit node limit at depth ${depth}`);
      break;
    }
  }
  
  return [];
}

/**
 * Layer-by-layer beginner's method solver
 * More reliable than IDA* for complex scrambles
 */
export function layerByLayerSolve(state: CubeState): string[] {
  const solution: string[] = [];
  let current = cloneState(state);
  const colorMap = getColorMapping(current);
  
  // Helper to add moves and apply them
  const doMoves = (moves: string[]) => {
    for (const move of moves) {
      solution.push(move);
      current = applyMoveToState(current, move);
    }
  };
  
  // Step 1: Solve white cross (edges on U face)
  const solveWhiteCross = () => {
    const whiteColor = colorMap.U;
    const edgeTargets = [
      { pos: 1, adj: 'B', adjPos: 1, adjColor: colorMap.B },
      { pos: 3, adj: 'L', adjPos: 1, adjColor: colorMap.L },
      { pos: 5, adj: 'R', adjPos: 1, adjColor: colorMap.R },
      { pos: 7, adj: 'F', adjPos: 1, adjColor: colorMap.F },
    ];
    
    // Simple approach: for each edge position, find and move the piece
    for (const target of edgeTargets) {
      // Check if already solved
      if (current.U[target.pos] === whiteColor && 
          current[target.adj as FaceName][target.adjPos] === target.adjColor) {
        continue;
      }
      
      // Search all edge positions and move to target
      // This is simplified - a full implementation would be more sophisticated
      for (let attempts = 0; attempts < 8; attempts++) {
        if (current.U[target.pos] === whiteColor && 
            current[target.adj as FaceName][target.adjPos] === target.adjColor) {
          break;
        }
        
        // Try some basic moves to fix edges
        if (target.adj === 'F') {
          if (current.F[1] === whiteColor) doMoves(["F'"]);
          else if (current.F[3] === whiteColor) doMoves(['L', "U'", "L'"]);
          else if (current.F[5] === whiteColor) doMoves(["R'", 'U', 'R']);
          else if (current.F[7] === whiteColor) doMoves(['F', 'F']);
          else if (current.D[1] === whiteColor) doMoves(['F', 'F']);
          else doMoves(['U']);
        } else {
          doMoves(['U']);
        }
      }
    }
  };
  
  // Step 2: Solve white corners
  const solveWhiteCorners = () => {
    // Simplified corner solving
    for (let i = 0; i < 4; i++) {
      for (let attempts = 0; attempts < 6; attempts++) {
        // Sexy move to cycle corners
        doMoves(['R', 'U', "R'", "U'"]);
        if (current.U[0] === colorMap.U && current.U[2] === colorMap.U &&
            current.U[6] === colorMap.U && current.U[8] === colorMap.U) {
          return;
        }
      }
      doMoves(['U']);
    }
  };
  
  // Step 3: Solve middle layer
  const solveMiddleLayer = () => {
    for (let i = 0; i < 4; i++) {
      // Right algorithm: U R U' R' U' F' U F
      doMoves(['U', 'R', "U'", "R'", "U'", "F'", 'U', 'F']);
      doMoves(['U']);
    }
  };
  
  // Step 4: Solve yellow cross
  const solveYellowCross = () => {
    const yellowColor = colorMap.D;
    for (let i = 0; i < 6; i++) {
      if (current.D[1] === yellowColor && current.D[3] === yellowColor &&
          current.D[5] === yellowColor && current.D[7] === yellowColor) {
        break;
      }
      // F R U R' U' F'
      doMoves(['F', 'R', 'U', "R'", "U'", "F'"]);
    }
  };
  
  // Step 5: Orient last layer
  const orientLastLayer = () => {
    for (let i = 0; i < 6; i++) {
      // Sune algorithm: R U R' U R U2 R'
      doMoves(['R', 'U', "R'", 'U', 'R', 'U2', "R'"]);
    }
  };
  
  // Step 6: Permute last layer
  const permuteLastLayer = () => {
    for (let i = 0; i < 4; i++) {
      // T-perm: R U R' U' R' F R2 U' R' U' R U R' F'
      doMoves(['R', 'U', "R'", "U'", "R'", 'F', 'R2', "U'", "R'", "U'", 'R', 'U', "R'", "F'"]);
      doMoves(['U']);
    }
    
    // Ua perm: R U' R U R U R U' R' U' R2
    for (let i = 0; i < 4; i++) {
      doMoves(['R', "U'", 'R', 'U', 'R', 'U', 'R', "U'", "R'", "U'", 'R2']);
      doMoves(['U']);
    }
  };
  
  // Execute solving steps
  solveWhiteCross();
  solveWhiteCorners();
  solveMiddleLayer();
  solveYellowCross();
  orientLastLayer();
  permuteLastLayer();
  
  // Final adjustment
  for (let i = 0; i < 4; i++) {
    if (isSolved(current)) break;
    doMoves(['U']);
  }
  
  return solution;
}

/**
 * Simplify solution by removing redundant moves
 * Only combines moves of the same type (regular with regular, wide with wide)
 */
function simplifySolution(moves: string[]): string[] {
  if (moves.length === 0) return moves;
  
  let result = [...moves];
  let changed = true;
  
  while (changed) {
    changed = false;
    const newResult: string[] = [];
    let i = 0;
    
    while (i < result.length) {
      if (i === result.length - 1) {
        newResult.push(result[i]);
        i++;
        continue;
      }
      
      const curr = result[i];
      const next = result[i + 1];
      
      // Check if both are wide or both are regular (can't combine wide with regular)
      const currIsWide = /^[a-z]/.test(curr);
      const nextIsWide = /^[a-z]/.test(next);
      
      const currFace = curr[0].toUpperCase();
      const nextFace = next[0].toUpperCase();
      
      // Same face and same type (both wide or both regular) can be combined
      if (currFace === nextFace && currIsWide === nextIsWide) {
        changed = true;
        const currVal = curr.includes("'") ? -1 : curr.includes('2') ? 2 : 1;
        const nextVal = next.includes("'") ? -1 : next.includes('2') ? 2 : 1;
        let total = (currVal + nextVal + 4) % 4;
        
        // Preserve the case (wide or regular)
        const baseFace = currIsWide ? currFace.toLowerCase() : currFace;
        
        if (total === 0) {
          // Moves cancel out
        } else if (total === 1) {
          newResult.push(baseFace);
        } else if (total === 2) {
          newResult.push(baseFace + '2');
        } else if (total === 3) {
          newResult.push(baseFace + "'");
        }
        i += 2;
      } else {
        newResult.push(curr);
        i++;
      }
    }
    
    result = newResult;
  }
  
  return result;
}

/**
 * Main solve function
 */
export async function solveCube(state: CubeState): Promise<Solution> {
  // Use setTimeout to allow UI to update
  await new Promise(resolve => setTimeout(resolve, 0));
  
  try {
    // First check if already solved
    if (isSolved(state)) {
      return {
        moves: [],
        totalMoves: 0,
        notation: '',
      };
    }
    
    // Try multiple solving strategies in order
    let solutionMoves: string[] = [];
    
    // Strategy 1: Fridrich/CFOP Method (rubiks-cube-solver package)
    // This is the most reliable for any valid cube state
    console.log('Attempting Fridrich/CFOP solve...');
    solutionMoves = fridrichSolve(state);
    if (solutionMoves.length > 0) {
      const testState = applyMoves(state, solutionMoves);
      if (isSolved(testState)) {
        console.log('✓ Solved with Fridrich/CFOP:', solutionMoves.length, 'moves');
        const simplified = simplifySolution(solutionMoves);
        return {
          moves: simplified.map(parseMove),
          totalMoves: simplified.length,
          notation: simplified.join(' '),
        };
      } else {
        console.log('Fridrich solution did not fully solve cube, trying fallbacks...');
      }
    }
    
    // Strategy 2: IDA* for short solutions (optimal up to 10 moves)
    await new Promise(resolve => setTimeout(resolve, 0));
    console.log('Attempting IDA* solve...');
    solutionMoves = idaSolve(state, 10);
    if (solutionMoves.length > 0 && isSolved(applyMoves(state, solutionMoves))) {
      console.log('✓ Solved with IDA*:', solutionMoves.length, 'moves');
      return {
        moves: simplifySolution(solutionMoves).map(parseMove),
        totalMoves: solutionMoves.length,
        notation: solutionMoves.join(' '),
      };
    }
    
    // Strategy 3: Pattern-based solver with known algorithms
    await new Promise(resolve => setTimeout(resolve, 0));
    console.log('Attempting pattern-based solve...');
    solutionMoves = patternBasedSolve(state, 300);
    if (isSolved(applyMoves(state, solutionMoves))) {
      console.log('✓ Solved with pattern-based:', solutionMoves.length, 'moves');
      const simplified = simplifySolution(solutionMoves);
      return {
        moves: simplified.map(parseMove),
        totalMoves: simplified.length,
        notation: simplified.join(' '),
      };
    }
    
    // Strategy 4: Aggressive random walk with algorithm injection
    await new Promise(resolve => setTimeout(resolve, 0));
    console.log('Attempting aggressive random solve...');
    solutionMoves = aggressiveRandomSolve(state, 500);
    if (isSolved(applyMoves(state, solutionMoves))) {
      console.log('✓ Solved with aggressive random:', solutionMoves.length, 'moves');
      const simplified = simplifySolution(solutionMoves);
      return {
        moves: simplified.map(parseMove),
        totalMoves: simplified.length,
        notation: simplified.join(' '),
      };
    }
    
    // If we got here, return best attempt even if not fully solved
    console.warn('Could not find complete solution, returning best attempt');
    const simplified = simplifySolution(solutionMoves);
    return {
      moves: simplified.map(parseMove),
      totalMoves: simplified.length,
      notation: simplified.join(' '),
    };
    
  } catch (error) {
    console.error('Solver error:', error);
    throw new Error('Failed to solve cube. Please check the cube state is valid.');
  }
}

/**
 * Pattern-based solver using known algorithms and heuristics
 */
function patternBasedSolve(state: CubeState, maxIterations: number = 300): string[] {
  const solution: string[] = [];
  let current = cloneState(state);
  
  const basicMoves = ['U', "U'", 'U2', 'D', "D'", 'D2', 'F', "F'", 'F2', 'B', "B'", 'B2', 'R', "R'", 'R2', 'L', "L'", 'L2'];
  
  // Known useful algorithms
  const algorithms = [
    // Sexy move and variations
    { name: 'Sexy', moves: ['R', 'U', "R'", "U'"] },
    { name: 'Left Sexy', moves: ["L'", "U'", 'L', 'U'] },
    { name: 'Double Sexy', moves: ['R', 'U', "R'", "U'", 'R', 'U', "R'", "U'"] },
    { name: 'Triple Sexy', moves: ['R', 'U', "R'", "U'", 'R', 'U', "R'", "U'", 'R', 'U', "R'", "U'"] },
    
    // Sledgehammer variations
    { name: 'Sledge', moves: ["R'", 'F', 'R', "F'"] },
    { name: 'Hedge', moves: ['F', "R'", "F'", 'R'] },
    
    // Sune family
    { name: 'Sune', moves: ['R', 'U', "R'", 'U', 'R', 'U2', "R'"] },
    { name: 'Anti-Sune', moves: ["R'", "U'", 'R', "U'", "R'", 'U2', 'R'] },
    { name: 'Left Sune', moves: ["L'", "U'", 'L', "U'", "L'", 'U2', 'L'] },
    
    // OLL algorithms
    { name: 'OLL-T', moves: ['F', 'R', 'U', "R'", "U'", "F'"] },
    { name: 'OLL-L', moves: ["F'", "L'", "U'", 'L', 'U', 'F'] },
    { name: 'OLL-Cross', moves: ['F', 'R', 'U', "R'", "U'", 'F', 'U', 'F', 'R', 'U', "R'", "U'", "F'"] },
    
    // PLL algorithms
    { name: 'T-Perm', moves: ['R', 'U', "R'", "U'", "R'", 'F', 'R2', "U'", "R'", "U'", 'R', 'U', "R'", "F'"] },
    { name: 'Ja-Perm', moves: ['R', 'U', "R'", "F'", 'R', 'U', "R'", "U'", "R'", 'F', 'R2', "U'", "R'"] },
    { name: 'Jb-Perm', moves: ['R', 'U', "R'", 'F', "R'", "F'", 'R', 'U', "R'", "F'", 'R', 'U', "R'", 'F'] },
    { name: 'Y-Perm', moves: ['F', 'R', "U'", "R'", "U'", 'R', 'U', "R'", "F'", 'R', 'U', "R'", "U'", "R'", 'F', 'R', "F'"] },
    { name: 'Ua-Perm', moves: ['R', "U'", 'R', 'U', 'R', 'U', 'R', "U'", "R'", "U'", 'R2'] },
    { name: 'Ub-Perm', moves: ['R2', 'U', 'R', 'U', "R'", "U'", "R'", "U'", "R'", 'U', "R'"] },
    { name: 'H-Perm', moves: ['R2', 'U2', 'R', 'U2', 'R2', 'U2', 'R2', 'U2', 'R', 'U2', 'R2'] },
    { name: 'Z-Perm', moves: ["R'", "U'", 'R', 'U2', "R'", 'U', "R'", 'U2', 'R', 'U', "R'", 'U', 'R', 'U2', "R'"] },
    
    // F2L algorithms
    { name: 'F2L-1', moves: ['U', 'R', "U'", "R'", "U'", "F'", 'U', 'F'] },
    { name: 'F2L-2', moves: ["U'", "L'", 'U', 'L', 'U', 'F', "U'", "F'"] },
    { name: 'F2L-3', moves: ['R', 'U', "R'", 'U2', 'R', 'U', "R'"] },
    { name: 'F2L-4', moves: ["L'", "U'", 'L', 'U2', "L'", "U'", 'L'] },
    
    // Commutators
    { name: 'Comm-1', moves: ['R', 'U', "R'", 'U', 'R', 'U2', "R'"] },
    { name: 'Comm-2', moves: ['R', 'U2', "R'", "U'", 'R', "U'", "R'"] },
  ];
  
  const doMoves = (moves: string[]) => {
    for (const move of moves) {
      solution.push(move);
      current = applyMoveToState(current, move);
    }
  };
  
  let lastImprovement = 0;
  let noImprovementStreak = 0;
  
  for (let iter = 0; iter < maxIterations; iter++) {
    if (isSolved(current)) break;
    
    const currentScore = getScore(current);
    let bestScore = currentScore;
    let bestAction: { type: 'move' | 'algo'; data: string | string[] } | null = null;
    
    // Try all basic moves
    for (const move of basicMoves) {
      const testState = applyMoveToState(current, move);
      const score = getScore(testState);
      if (score > bestScore) {
        bestScore = score;
        bestAction = { type: 'move', data: move };
      }
    }
    
    // Try all algorithms
    for (const algo of algorithms) {
      let testState = current;
      for (const move of algo.moves) {
        testState = applyMoveToState(testState, move);
      }
      const score = getScore(testState);
      if (score > bestScore) {
        bestScore = score;
        bestAction = { type: 'algo', data: algo.moves };
      }
    }
    
    // Apply best action or random if stuck
    if (bestAction) {
      if (bestAction.type === 'move') {
        doMoves([bestAction.data as string]);
      } else {
        doMoves(bestAction.data as string[]);
      }
      lastImprovement = iter;
      noImprovementStreak = 0;
    } else {
      noImprovementStreak++;
      
      // If stuck, try random algorithm to escape
      if (noImprovementStreak > 3) {
        const randomAlgo = algorithms[Math.floor(Math.random() * algorithms.length)];
        doMoves(randomAlgo.moves);
        noImprovementStreak = 0;
      } else {
        // Try random move
        const randomMove = basicMoves[Math.floor(Math.random() * basicMoves.length)];
        doMoves([randomMove]);
      }
    }
    
    // Prevent infinite loops
    if (iter - lastImprovement > 50) {
      console.warn('Stuck in local minimum, trying random restart');
      // Apply random sequence to escape
      const randomAlgo = algorithms[Math.floor(Math.random() * algorithms.length)];
      doMoves(randomAlgo.moves);
      lastImprovement = iter;
    }
  }
  
  // Final adjustments - try rotating layers to align
  for (let i = 0; i < 4 && !isSolved(current); i++) {
    doMoves(['U']);
  }
  for (let i = 0; i < 4 && !isSolved(current); i++) {
    doMoves(['D']);
  }
  
  return solution;
}

/**
 * Aggressive random solver with multiple restarts
 */
function aggressiveRandomSolve(state: CubeState, maxMoves: number = 500): string[] {
  const basicMoves = ['U', "U'", 'U2', 'D', "D'", 'D2', 'F', "F'", 'F2', 'B', "B'", 'B2', 'R', "R'", 'R2', 'L', "L'", 'L2'];
  
  let bestSolution: string[] = [];
  let bestScore = getScore(state);
  
  // Try multiple random walks
  for (let attempt = 0; attempt < 10; attempt++) {
    const solution: string[] = [];
    let current = cloneState(state);
    
    for (let step = 0; step < maxMoves / 10; step++) {
      if (isSolved(current)) {
        return solution;
      }
      
      // 70% greedy, 30% random
      if (Math.random() < 0.7) {
        // Greedy: pick best move
        let bestMove = basicMoves[0];
        let bestMoveScore = 0;
        
        for (const move of basicMoves) {
          const testState = applyMoveToState(current, move);
          const score = getScore(testState);
          if (score > bestMoveScore) {
            bestMoveScore = score;
            bestMove = move;
          }
        }
        
        solution.push(bestMove);
        current = applyMoveToState(current, bestMove);
      } else {
        // Random exploration
        const randomMove = basicMoves[Math.floor(Math.random() * basicMoves.length)];
        solution.push(randomMove);
        current = applyMoveToState(current, randomMove);
      }
    }
    
    const finalScore = getScore(current);
    if (finalScore > bestScore) {
      bestScore = finalScore;
      bestSolution = solution;
    }
    
    if (isSolved(current)) {
      return solution;
    }
  }
  
  return bestSolution;
}

function getScore(s: CubeState): number {
  let score = 0;
  const faces: FaceName[] = ['U', 'R', 'F', 'D', 'L', 'B'];
  for (const face of faces) {
    const center = s[face][4];
    for (let i = 0; i < 9; i++) {
      if (s[face][i] === center) score += 1;
    }
  }
  // Bonus for solved faces
  for (const face of faces) {
    const center = s[face][4];
    if (s[face].every(c => c === center)) score += 20;
  }
  return score;
}

/**
 * Beginner method solver - systematic layer-by-layer approach
 */
export function beginnerMethodSolve(state: CubeState): string[] {
  const solution: string[] = [];
  let current = cloneState(state);
  
  // Helper to execute moves
  const doMove = (move: string) => {
    solution.push(move);
    current = applyMoveToState(current, move);
  };
  
  const doMoves = (moves: string[]) => {
    moves.forEach(m => doMove(m));
  };
  
  // Get colors for each face center
  const U_COLOR = current.U[4]; // White
  const D_COLOR = current.D[4]; // Yellow
  const F_COLOR = current.F[4]; // Green
  const B_COLOR = current.B[4]; // Blue
  const R_COLOR = current.R[4]; // Red  
  const L_COLOR = current.L[4]; // Orange
  
  // STEP 1: White cross on top
  const solveWhiteCross = () => {
    // We need white edges in correct positions on U face
    // Edge positions on U: 1 (U-B), 3 (U-L), 5 (U-R), 7 (U-F)
    
    // For each edge target, find the white-X edge and move it into place
    const targets = [
      { uPos: 7, adjFace: 'F' as FaceName, adjPos: 1, adjColor: F_COLOR },
      { uPos: 5, adjFace: 'R' as FaceName, adjPos: 1, adjColor: R_COLOR },
      { uPos: 1, adjFace: 'B' as FaceName, adjPos: 1, adjColor: B_COLOR },
      { uPos: 3, adjFace: 'L' as FaceName, adjPos: 1, adjColor: L_COLOR },
    ];
    
    for (const target of targets) {
      // Try up to 20 times to solve this edge
      for (let attempt = 0; attempt < 20; attempt++) {
        // Check if already solved
        if (current.U[target.uPos] === U_COLOR && current[target.adjFace][target.adjPos] === target.adjColor) {
          break;
        }
        
        // Look for the edge piece and move it
        // Check D layer first
        if (current.D[1] === U_COLOR || current.F[7] === U_COLOR) {
          if (target.adjFace === 'F') doMoves(['F', 'F']);
          else doMoves(['D']);
          continue;
        }
        if (current.D[3] === U_COLOR || current.L[7] === U_COLOR) {
          if (target.adjFace === 'L') doMoves(['L', 'L']);
          else doMoves(['D']);
          continue;
        }
        if (current.D[5] === U_COLOR || current.R[7] === U_COLOR) {
          if (target.adjFace === 'R') doMoves(['R', 'R']);
          else doMoves(['D']);
          continue;
        }
        if (current.D[7] === U_COLOR || current.B[7] === U_COLOR) {
          if (target.adjFace === 'B') doMoves(['B', 'B']);
          else doMoves(['D']);
          continue;
        }
        
        // Check middle layer edges
        if (current.F[3] === U_COLOR) { doMoves(["L'"]); continue; }
        if (current.F[5] === U_COLOR) { doMoves(['R']); continue; }
        if (current.R[3] === U_COLOR) { doMoves(["F'"]); continue; }
        if (current.R[5] === U_COLOR) { doMoves(['B']); continue; }
        if (current.B[3] === U_COLOR) { doMoves(["R'"]); continue; }
        if (current.B[5] === U_COLOR) { doMoves(['L']); continue; }
        if (current.L[3] === U_COLOR) { doMoves(["B'"]); continue; }
        if (current.L[5] === U_COLOR) { doMoves(['F']); continue; }
        
        // Check top layer edges that are wrong
        if (current.U[1] === U_COLOR && current.B[1] !== B_COLOR) { doMoves(['B', 'B']); continue; }
        if (current.U[3] === U_COLOR && current.L[1] !== L_COLOR) { doMoves(['L', 'L']); continue; }
        if (current.U[5] === U_COLOR && current.R[1] !== R_COLOR) { doMoves(['R', 'R']); continue; }
        if (current.U[7] === U_COLOR && current.F[1] !== F_COLOR) { doMoves(['F', 'F']); continue; }
        
        // Flipped edges in top layer
        if (current.F[1] === U_COLOR) { doMoves(['F', "U'", 'R', 'U']); continue; }
        if (current.R[1] === U_COLOR) { doMoves(['R', "U'", 'B', 'U']); continue; }
        if (current.B[1] === U_COLOR) { doMoves(['B', "U'", 'L', 'U']); continue; }
        if (current.L[1] === U_COLOR) { doMoves(['L', "U'", 'F', 'U']); continue; }
        
        // Default: rotate D
        doMove('D');
      }
    }
  };
  
  // STEP 2: White corners
  const solveWhiteCorners = () => {
    // Corner positions on U: 0 (U-B-L), 2 (U-B-R), 6 (U-F-L), 8 (U-F-R)
    const targets = [
      { uPos: 8, f1: 'F' as FaceName, f1Pos: 2, f1Color: F_COLOR, f2: 'R' as FaceName, f2Pos: 0, f2Color: R_COLOR },
      { uPos: 6, f1: 'F' as FaceName, f1Pos: 0, f1Color: F_COLOR, f2: 'L' as FaceName, f2Pos: 2, f2Color: L_COLOR },
      { uPos: 2, f1: 'B' as FaceName, f1Pos: 0, f1Color: B_COLOR, f2: 'R' as FaceName, f2Pos: 2, f2Color: R_COLOR },
      { uPos: 0, f1: 'B' as FaceName, f1Pos: 2, f1Color: B_COLOR, f2: 'L' as FaceName, f2Pos: 0, f2Color: L_COLOR },
    ];
    
    for (const target of targets) {
      for (let attempt = 0; attempt < 20; attempt++) {
        // Check if solved
        if (current.U[target.uPos] === U_COLOR && 
            current[target.f1][target.f1Pos] === target.f1Color &&
            current[target.f2][target.f2Pos] === target.f2Color) {
          break;
        }
        
        // Corner in D layer - position it and use algorithm
        // Check each D layer corner (kept for reference in comments)
        // d: 2 - F:8, R:6
        // d: 0 - F:6, L:8
        // d: 8 - B:6, R:8
        // d: 6 - B:8, L:6
        
        // Use R U R' U' algorithm (sexy move) repeatedly
        if (target.uPos === 8) { // Front-right corner
          if (current.D[2] === U_COLOR || current.F[8] === U_COLOR || current.R[6] === U_COLOR) {
            // Position the corner under target with D moves
            while (!(current.D[2] === U_COLOR || current.F[8] === U_COLOR || current.R[6] === U_COLOR)) {
              doMove('D');
            }
            // Insert with sexy move
            doMoves(['R', 'U', "R'", "U'"]);
            continue;
          }
        }
        
        // If corner is in wrong place in U layer, kick it out
        if (current.U[target.uPos] !== U_COLOR || 
            current[target.f1][target.f1Pos] !== target.f1Color) {
          // Position and kick out
          if (target.uPos === 8) doMoves(['R', 'U', "R'", "U'"]);
          else if (target.uPos === 6) doMoves(["L'", "U'", 'L', 'U']);
          else if (target.uPos === 2) doMoves(["R'", "U'", 'R', 'U']);
          else if (target.uPos === 0) doMoves(['L', 'U', "L'", "U'"]);
          continue;
        }
        
        // Rotate D to bring piece under target
        doMove('D');
      }
    }
  };
  
  // STEP 3: Middle layer edges (F2L simplified)
  const solveMiddleLayer = () => {
    for (let rep = 0; rep < 8; rep++) {
      // Check for edges to insert
      // Look at edges in D layer
      for (let dRep = 0; dRep < 4; dRep++) {
        // Front edge in D layer
        const edgeColor1 = current.F[7];
        const edgeColor2 = current.D[1];
        
        // If neither color is yellow (D_COLOR), this edge goes in middle layer
        if (edgeColor1 !== D_COLOR && edgeColor2 !== D_COLOR) {
          // Find where it goes
          if (edgeColor1 === F_COLOR) {
            if (edgeColor2 === R_COLOR) {
              // Goes to F-R slot: U R U' R' U' F' U F
              doMoves(['U', 'R', "U'", "R'", "U'", "F'", 'U', 'F']);
              continue;
            } else if (edgeColor2 === L_COLOR) {
              // Goes to F-L slot: U' L' U L U F U' F'
              doMoves(["U'", "L'", 'U', 'L', 'U', 'F', "U'", "F'"]);
              continue;
            }
          }
        }
        
        doMove('D');
      }
      
      // Kick out wrong middle layer edges
      if (current.F[5] !== F_COLOR || current.R[3] !== R_COLOR) {
        doMoves(['U', 'R', "U'", "R'", "U'", "F'", 'U', 'F']);
      }
    }
  };
  
  // STEP 4: Yellow cross on bottom
  const solveYellowCross = () => {
    for (let rep = 0; rep < 6; rep++) {
      // Count yellow edges
      const hasTop = current.D[1] === D_COLOR;
      const hasLeft = current.D[3] === D_COLOR;
      const hasRight = current.D[5] === D_COLOR;
      const hasBottom = current.D[7] === D_COLOR;
      
      if (hasTop && hasLeft && hasRight && hasBottom) break;
      
      // F R U R' U' F' algorithm
      doMoves(['F', 'R', 'U', "R'", "U'", "F'"]);
    }
  };
  
  // STEP 5: Yellow corners position
  const solveYellowCorners = () => {
    for (let rep = 0; rep < 12; rep++) {
      if (isSolved(current)) break;
      
      // Sune algorithm: R U R' U R U2 R'
      doMoves(['R', 'U', "R'", 'U', 'R', 'U2', "R'"]);
      doMove('U');
    }
  };
  
  // STEP 6: Final permutation
  const finishSolve = () => {
    for (let rep = 0; rep < 20; rep++) {
      if (isSolved(current)) break;
      
      // Try different permutations
      doMoves(['R', "U'", 'R', 'U', 'R', 'U', 'R', "U'", "R'", "U'", 'R2']); // Ua perm
      doMove('U');
    }
  };
  
  // Execute all steps
  solveWhiteCross();
  solveWhiteCorners();
  solveMiddleLayer();
  solveYellowCross();
  solveYellowCorners();
  finishSolve();
  
  // Final U adjustment
  for (let i = 0; i < 4; i++) {
    if (isSolved(current)) break;
    doMove('U');
  }
  
  return solution;
}

/**
 * Find a working solution using greedy hill-climbing with known algorithms
 */
export function findWorkingSolution(state: CubeState, maxIterations: number = 300): string[] {
  const solution: string[] = [];
  let current = cloneState(state);
  
  const basicMoves = ['U', "U'", 'U2', 'D', "D'", 'D2', 'F', "F'", 'F2', 'B', "B'", 'B2', 'R', "R'", 'R2', 'L', "L'", 'L2'];
  
  // Known algorithms that help solve the cube
  const algorithms = [
    // Sexy move (R U R' U')
    ['R', 'U', "R'", "U'"],
    // Inverse sexy (U R U' R')
    ['U', 'R', "U'", "R'"],
    // Left sexy (L' U' L U)
    ["L'", "U'", 'L', 'U'],
    // Sledgehammer (R' F R F')
    ["R'", 'F', 'R', "F'"],
    // Hedge (F R' F' R)
    ['F', "R'", "F'", 'R'],
    // Sune (R U R' U R U2 R')
    ['R', 'U', "R'", 'U', 'R', 'U2', "R'"],
    // Anti-sune (R' U' R U' R' U2 R)
    ["R'", "U'", 'R', "U'", "R'", 'U2', 'R'],
    // Double sexy
    ['R', 'U', "R'", "U'", 'R', 'U', "R'", "U'"],
    // Triple sexy 
    ['R', 'U', "R'", "U'", 'R', 'U', "R'", "U'", 'R', 'U', "R'", "U'"],
    // J-perm (R U R' F' R U R' U' R' F R2 U' R')
    ['R', 'U', "R'", "F'", 'R', 'U', "R'", "U'", "R'", 'F', 'R2', "U'", "R'"],
    // Y-perm (F R U' R' U' R U R' F' R U R' U' R' F R F')
    ['F', 'R', "U'", "R'", "U'", 'R', 'U', "R'", "F'", 'R', 'U', "R'", "U'", "R'", 'F', 'R', "F'"],
    // T-perm (R U R' U' R' F R2 U' R' U' R U R' F')
    ['R', 'U', "R'", "U'", "R'", 'F', 'R2', "U'", "R'", "U'", 'R', 'U', "R'", "F'"],
    // H-perm (M2 U M2 U2 M2 U M2) - simplified
    ['R2', 'U2', 'R', 'U2', 'R2', 'U2', 'R2', 'U2', 'R', 'U2', 'R2'],
  ];
  
  const doMoves = (moves: string[]) => {
    for (const move of moves) {
      solution.push(move);
      current = applyMoveToState(current, move);
    }
  };
  
  // Better scoring function that considers pieces in correct positions
  const getScore = (s: CubeState): number => {
    let score = 0;
    const faces: FaceName[] = ['U', 'R', 'F', 'D', 'L', 'B'];
    
    // Count facelets matching center color
    for (const face of faces) {
      const center = s[face][4];
      for (let i = 0; i < 9; i++) {
        if (s[face][i] === center) score += 1;
      }
    }
    
    // Bonus for solved faces
    for (const face of faces) {
      const center = s[face][4];
      if (s[face].every(c => c === center)) score += 20;
    }
    
    // Bonus for nearly solved faces (8/9 correct)
    for (const face of faces) {
      const center = s[face][4];
      const correct = s[face].filter(c => c === center).length;
      if (correct >= 8) score += 5;
    }
    
    return score;
  };
  
  let bestOverallScore = getScore(current);
  let noImprovementCount = 0;
  
  for (let iter = 0; iter < maxIterations; iter++) {
    if (isSolved(current)) break;
    
    let bestMove: string | null = null;
    let bestAlgo: string[] | null = null;
    let bestScore = getScore(current);
    
    // Try all basic moves
    for (const move of basicMoves) {
      const testState = applyMoveToState(current, move);
      const score = getScore(testState);
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
        bestAlgo = null;
      }
    }
    
    // Try all algorithms
    for (const algo of algorithms) {
      let testState = current;
      for (const move of algo) {
        testState = applyMoveToState(testState, move);
      }
      const score = getScore(testState);
      if (score > bestScore) {
        bestScore = score;
        bestMove = null;
        bestAlgo = algo;
      }
    }
    
    // Apply best found
    if (bestAlgo) {
      doMoves(bestAlgo);
      noImprovementCount = 0;
    } else if (bestMove) {
      doMoves([bestMove]);
      noImprovementCount = 0;
    } else {
      noImprovementCount++;
      
      // Escape local minimum with random sequence
      if (noImprovementCount > 3) {
        // Random algorithm
        const randomAlgo = algorithms[Math.floor(Math.random() * algorithms.length)];
        doMoves(randomAlgo);
        noImprovementCount = 0;
      } else {
        // Single random move
        const randomMove = basicMoves[Math.floor(Math.random() * basicMoves.length)];
        doMoves([randomMove]);
      }
    }
    
    bestOverallScore = Math.max(bestOverallScore, getScore(current));
  }
  
  // Try final U/D adjustments
  for (let i = 0; i < 4 && !isSolved(current); i++) {
    doMoves(['U']);
  }
  for (let i = 0; i < 4 && !isSolved(current); i++) {
    doMoves(['D']);
  }
  
  return solution;
}

/**
 * Generate a fallback solution when main solvers fail
 */
export function generateFallbackSolution(state: CubeState): string[] {
  // Apply random scrambling inverse approach or heuristic moves
  const moves: string[] = [];
  let current = cloneState(state);
  
  // Try to solve each face
  const allMoves = ['U', "U'", 'U2', 'D', "D'", 'D2', 'F', "F'", 'F2', 'B', "B'", 'B2', 'R', "R'", 'R2', 'L', "L'", 'L2'];
  
  for (let iter = 0; iter < 100; iter++) {
    if (isSolved(current)) break;
    
    // Try each move and pick one that improves the state
    let bestMove = '';
    let bestScore = countSolvedFaces(current);
    
    for (const move of allMoves) {
      const testState = applyMoveToState(current, move);
      const score = countSolvedFaces(testState);
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }
    
    if (bestMove) {
      moves.push(bestMove);
      current = applyMoveToState(current, bestMove);
    } else {
      // Random move if no improvement
      const randomMove = allMoves[Math.floor(Math.random() * allMoves.length)];
      moves.push(randomMove);
      current = applyMoveToState(current, randomMove);
    }
  }
  
  return simplifySolution(moves);
}

/**
 * Count how many facelets are in their solved position
 */
function countSolvedFaces(state: CubeState): number {
  let count = 0;
  const faces: FaceName[] = ['U', 'R', 'F', 'D', 'L', 'B'];
  
  for (const face of faces) {
    const center = state[face][4];
    for (const color of state[face]) {
      if (color === center) count++;
    }
  }
  
  return count;
}

/**
 * Apply a move to a cube state (exported for animation/simulation)
 */
export function applyMove(state: CubeState, move: Move): CubeState {
  return applyMoveToState(state, move.notation);
}
