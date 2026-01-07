// Cube color types
export type CubeColor = 'W' | 'Y' | 'R' | 'O' | 'G' | 'B' | null;

export const COLOR_NAMES: Record<NonNullable<CubeColor>, string> = {
  W: 'White',
  Y: 'Yellow',
  R: 'Red',
  O: 'Orange',
  G: 'Green',
  B: 'Blue',
};

export const COLOR_HEX: Record<NonNullable<CubeColor>, string> = {
  W: '#FFFFFF',
  Y: '#FFEB3B',  // Slightly warmer yellow for better contrast
  R: '#9B0000',  // Deep crimson red - cooler, darker
  O: '#FF8C00',  // Bright warm orange - more saturated, warmer
  G: '#00A550',  // Slightly brighter green
  B: '#0047AB',  // Cobalt blue
};

// Face types - standard URFDLB notation
export type FaceName = 'U' | 'R' | 'F' | 'D' | 'L' | 'B';

export type Face = CubeColor[];

export type CubeState = Record<FaceName, Face>;

export interface HSVColor {
  h: number; // 0-360
  s: number; // 0-100
  v: number; // 0-100
}

export interface ColorThresholds {
  hMin: number;
  hMax: number;
  sMin: number;
  sMax: number;
  vMin: number;
  vMax: number;
}

export interface ColorCalibration {
  W: ColorThresholds;
  Y: ColorThresholds;
  R: ColorThresholds;
  O: ColorThresholds;
  G: ColorThresholds;
  B: ColorThresholds;
}

export interface DetectionResult {
  color: CubeColor;
  confidence: number;
}

export interface CaptureState {
  currentFace: FaceName;
  capturedFaces: Partial<CubeState>;
  isValid: boolean;
  errors: string[];
}

export interface ScanInstruction {
  face: FaceName;
  instruction: string;
  rotation: string;
}

// Scanning order and instructions
export const SCAN_ORDER: ScanInstruction[] = [
  { face: 'U', instruction: 'Hold with white on top, green facing you', rotation: 'Start position' },
  { face: 'F', instruction: 'Show the front face (green center)', rotation: 'Tilt forward' },
  { face: 'R', instruction: 'Show the right face', rotation: 'Rotate 90° right' },
  { face: 'B', instruction: 'Show the back face', rotation: 'Rotate 90° right again' },
  { face: 'L', instruction: 'Show the left face', rotation: 'Rotate 90° right again' },
  { face: 'D', instruction: 'Show the bottom face (yellow center)', rotation: 'Flip cube over' },
];

export interface Move {
  notation: string;
  face: FaceName;
  direction: 'CW' | 'CCW' | '180';
  description: string;
}

export interface Solution {
  moves: Move[];
  totalMoves: number;
  notation: string;
}
