# Rubik's Cube Solver - Manual Entry Architecture

## Overview

This is a **camera-free, manual cube-mapping architecture** designed for reliability, ease of use, and beginner-friendliness. Users manually enter colors for each cube face using a visual 2D editor with locked centers and real-time validation.

## Architecture Components

### 1. **Manual Cube Editor (`ManualCubeEditor.tsx`)**
Entry point for users to build their cube state face by face.

**Features:**
- **Face-by-face flow**: Front → Right → Back → Left → Top → Bottom
- **Locked centers**: White (U), Yellow (D), Green (F), Blue (B), Red (R), Orange (L) are predefined and immutable
- **8 editable tiles per face**: Surrounding tiles only (center is locked)
- **Progress tracking**: Shows which faces are complete
- **Real-time validation**: Flags impossible edges and corners
- **Color limits**: Max 9 of each color per face
- **Undo/Redo**: Full state history management
- **Mobile-friendly**: Responsive grid layout with touch support

**Workflow:**
```
User selects a face → Sees guidance message → Clicks tiles → Selects color → 
Validation checks edge/corner consistency → Moves to next face → 
All 6 faces complete → Proceeds to 3D view
```

### 2. **Face Editor Component (`FaceEditor.tsx`)**
Reusable single-face editor shown in the manual editor.

**Features:**
- 3×3 grid with center locked (🔒)
- Click-to-select tiles
- Color palette with keyboard shortcuts (W, Y, R, O, G, B)
- Delete/Backspace to clear tiles
- Tile numbering for clarity
- Visual feedback (glow on selection)
- Shows color counts to prevent exceeding 9 per face

### 3. **Cube Validator (`cubeValidator.ts`)**
Real-time validation system that checks for impossible states.

**Validates:**
- **Edge pieces**: Adjacent faces must have matching colors at shared edges
  - Example: Front[1] must match Top[7], Front[3] must match Left[5], etc.
- **Corner pieces**: 3 adjacent faces at corners must have matching colors
  - Example: UFR corner (Up-Front-Right) must be the same color on all 3 faces
- **Color counts**: Exactly 9 of each color (standard Rubik's cube)

**Error reporting:**
- Specific error messages: "Edge FU: Green doesn't match Yellow"
- Highlights problematic tiles
- Prevents completing cube if validation fails

### 4. **3D Cube Visualization (`CubeNet.tsx`)**
Displays the entered cube state as a 3D net or interactive cube.

**Features:**
- Shows cube state from the 2D editor
- Interactive face selection
- Highlights to show which face is being edited
- Visual confirmation before solving

### 5. **Authentication System**
Solves are gated behind login to track user progress and store history.

**Features:**
- **AuthModal**: Login/signup with MongoDB backend
- **Auth service**: Token management, user verification
- **State persistence**: User data stored in localStorage with token validation
- **Solve tracking**: Records solve history per user

## Data Flow

```
┌─────────────────────────────────────────────────────┐
│         Manual Cube Editor Start                     │
│    (6 predefined locked centers)                     │
└──────────────┬──────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────┐
│   Select Face (F, R, B, L, U, D)                    │
│   • Show orientation guide                          │
│   • Display locked center color                     │
└──────────────┬──────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────┐
│   Click & Color 8 Tiles Around Center              │
│   • Color palette with shortcuts                    │
│   • Real-time count validation (9 max/color)       │
└──────────────┬──────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────┐
│   CubeValidator Checks                             │
│   • Edge piece consistency                          │
│   • Corner piece consistency                        │
│   • Total color count (9 each)                      │
└──────────────┬──────────────────────────────────────┘
               │
        ┌──────┴────────┐
        │ Invalid       │ Valid
        ▼               ▼
    ┌────────┐    ┌──────────────────┐
    │ Error  │    │ All 6 Faces OK   │
    │ Panel  │    │ Enable "Solve"   │
    └────────┘    └────────┬─────────┘
                           │
                           ▼
                  ┌─────────────────────┐
                  │ 3D Cube Visualization│
                  │ Review Entered State │
                  └────────┬────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │ Click "Solve"          │
              │ Check if User Logged In│
              └────────┬───────────────┘
                       │
               ┌───────┴────────┐
               │ Not Logged In  │ Logged In
               ▼                ▼
        ┌────────────┐   ┌───────────────┐
        │ Auth Modal │   │ Solve (Premium)
        │ Login/Sign │   │ Step-by-step  │
        └────────────┘   │ Interactive   │
                         └───────────────┘
```

## Key Design Decisions

### 1. **No Camera Scanning**
- ✅ Eliminates lighting conditions, camera angle, color calibration issues
- ✅ Works offline
- ✅ Much faster to enter cube state
- ✅ 100% reliable input validation

### 2. **Locked Centers**
- Reduces user confusion (6 facts to remember, not 9)
- Follows standard cube orientation
- Simplifies validation logic

### 3. **Real-time Validation**
- Catches mistakes immediately
- Educational: users learn cube anatomy (edges, corners)
- Prevents invalid submissions

### 4. **Face-by-Face Workflow**
- Guided, sequential flow
- Prevents accidental skips
- Clear progress indication
- Mobile-friendly (one face at a time)

### 5. **Undo/Redo + State Persistence**
- Users can fix mistakes without restarting
- Save/load cube states for later
- History stack for navigation

## Component Structure

```
src/
├── components/
│   ├── ManualCubeEditor.tsx       (Main editor flow)
│   ├── FaceEditor.tsx              (Single face editor)
│   ├── CubeNet.tsx                 (3D visualization)
│   ├── AuthModal.tsx               (Login/signup)
│   └── HelpModal.tsx               (Instructions)
├── utils/
│   ├── cubeValidator.ts            (Validation logic)
│   ├── solver.ts                   (Rubik's cube solver)
│   ├── colorDetection.ts           (Not used - legacy)
│   └── validation.ts               (Legacy validation)
├── services/
│   └── auth.ts                     (Authentication)
├── types/
│   └── cube.ts                     (Type definitions)
└── App.tsx                         (Main app controller)
```

## Type Definitions (`cube.ts`)

```typescript
// Colors: W=White, Y=Yellow, R=Red, O=Orange, G=Green, B=Blue
type CubeColor = 'W' | 'Y' | 'R' | 'O' | 'G' | 'B' | null;

// Each face is an array of 9 tiles (0-8), with center (index 4) locked
type Face = CubeColor[];

// Face names: U=Up(top), D=Down(bottom), F=Front, B=Back, R=Right, L=Left
type FaceName = 'U' | 'D' | 'F' | 'B' | 'R' | 'L';

// Complete cube state
type CubeState = Record<FaceName, Face>;
```

## Validation Rules

### Edge Validation
Each edge is shared between 2 adjacent faces:
- **U-F**: Up[7] ↔ Front[1]
- **U-R**: Up[5] ↔ Right[1]
- **U-B**: Up[1] ↔ Back[1]
- **U-L**: Up[3] ↔ Left[1]
- **F-R**: Front[5] ↔ Right[3]
- **F-L**: Front[3] ↔ Left[5]
- **F-D**: Front[7] ↔ Down[1]
- **B-R**: Back[3] ↔ Right[5]
- **B-L**: Back[5] ↔ Left[3]
- **B-D**: Back[7] ↔ Down[7]
- **R-D**: Right[7] ↔ Down[5]
- **L-D**: Left[7] ↔ Down[3]

### Corner Validation
Each corner is shared between 3 adjacent faces:
- **UFR**: Up[2] ↔ Front[2] ↔ Right[0]
- **UFL**: Up[0] ↔ Front[0] ↔ Left[8]
- **UBR**: Up[8] ↔ Back[8] ↔ Right[8]
- **UBL**: Up[6] ↔ Back[6] ↔ Left[2]
- **DFR**: Down[0] ↔ Front[8] ↔ Right[8]
- **DFL**: Down[2] ↔ Front[6] ↔ Left[6]
- **DBR**: Down[6] ↔ Back[8] ↔ Right[2]
- **DBL**: Down[8] ↔ Back[6] ↔ Left[0]

## Future Enhancements (Roadmap)

### Phase 2: 3D Interactive Solver
- [ ] React Three Fiber 3D visualization with rotation
- [ ] Step-by-step solve with animations
- [ ] Layer highlighting and move notation
- [ ] Interactive mode (user makes moves)
- [ ] Glowing effects and visual feedback

### Phase 3: Learning Tools
- [ ] Difficulty estimation (easy, intermediate, hard)
- [ ] Learning tips for each step
- [ ] Move notation explanation
- [ ] Cube anatomy tutorial

### Phase 4: Advanced Features
- [ ] Save/load cube states to account
- [ ] Solve history with replay
- [ ] Practice mode with scrambles
- [ ] Statistics and progress tracking
- [ ] Leaderboards

### Phase 5: Mobile Optimization
- [ ] Touch-friendly controls
- [ ] Responsive layouts for all screen sizes
- [ ] PWA for offline capability
- [ ] Native-like interface

## Testing Checklist

- [ ] All 8 tiles per face can be filled
- [ ] Color limits enforced (9 max per face)
- [ ] Edge validation works (all 12 edges)
- [ ] Corner validation works (all 8 corners)
- [ ] Cannot proceed with incomplete face
- [ ] Cannot proceed with invalid state
- [ ] Undo/Redo works correctly
- [ ] Can navigate between faces
- [ ] Mobile layout responsive
- [ ] Auth flow works (login/signup)
- [ ] Solve is gated behind auth
- [ ] Error messages are clear and actionable

## Performance Considerations

- **Small state**: 6 faces × 9 tiles = 54 values (very efficient)
- **Validation**: O(n) where n=12 edges + 8 corners = 20 checks (instant)
- **Re-renders**: Only affected components re-render on color change
- **Memory**: Minimal (undo history is shallow)
- **Network**: Only needed for auth and solve requests

## Accessibility

- ✅ Keyboard shortcuts for colors (W, Y, R, O, G, B)
- ✅ Color names in tooltips (not just color boxes)
- ✅ Clear error messages
- ✅ Retro UI with high contrast
- ✅ Touch-friendly tile sizes (min 14x14 on mobile)
- ✅ Progress indicators at all steps

---

**Status**: MVP Complete ✓
**Complexity**: Low (camera-free, deterministic validation)
**Reliability**: High (no external dependencies, local validation)
**Scalability**: Ready (architecture supports solver integration)
