# 🎲 RubikSight

A real-time Rubik's Cube scanner and solver web application that uses your camera to detect cube colors, guide you through scanning all faces, validate the cube state, and compute an optimal solution.

## ✨ Features

- **📸 Real-time Camera Scanning**: Uses your device camera to detect sticker colors in real-time
- **🎯 Guided Scanning**: Step-by-step instructions for scanning all 6 faces with visual overlays
- **🎨 Color Detection**: Advanced HSV-based color classification with confidence indicators
- **✏️ Manual Editing**: Click-to-edit interface with undo/redo support for corrections
- **✅ Validation**: Comprehensive cube state validation (center uniqueness, piece counts, solvability)
- **🧩 Solver Integration**: Uses Kociemba two-phase algorithm for optimal solutions
- **📱 Responsive Design**: Works on desktop and mobile devices
- **🔒 Privacy-First**: All processing happens locally in your browser
- **♿ Accessible**: Keyboard shortcuts and screen-reader friendly

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ and npm
- A modern browser with camera access (Chrome, Firefox, Safari)
- A physical 3×3 Rubik's Cube

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Backend Setup (Authentication)

The app uses a Node.js + Express + MongoDB backend for user authentication and solve tracking.

#### Prerequisites

- MongoDB installed locally OR a MongoDB Atlas account (cloud)
- Node.js 16+

#### Setting up MongoDB (Choose one)

**Option 1: Local MongoDB (macOS)**
```bash
# Install MongoDB
brew tap mongodb/brew
brew install mongodb-community

# Start MongoDB service
brew services start mongodb-community
```

**Option 2: MongoDB Atlas (Cloud)**
1. Create free account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster
3. Get your connection string
4. Update `server/.env` with your connection string

#### Starting the Backend

```bash
# Navigate to server directory
cd server

# Install backend dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your MongoDB connection string and a strong JWT secret

# Start the backend server
npm run dev
```

The backend runs on `http://localhost:5000` by default.

#### Environment Variables (server/.env)

```env
MONGODB_URI=mongodb://localhost:27017/rubiksight
JWT_SECRET=your-strong-secret-key-here
PORT=5000
FRONTEND_URL=http://localhost:5173
```

## 📖 How to Use

### 1. Scanning Mode

1. **Allow camera access** when prompted
2. **Position your cube** according to the on-screen instructions
3. **Align the 3×3 grid** over the cube face
4. Wait for color detection (dots will appear on each sticker)
5. **Press Space or click "Capture Face"** when ready
6. **Repeat for all 6 faces** following the guided instructions

#### Scanning Order

1. **U (Up)**: White center on top, green facing you
2. **F (Front)**: Green center face
3. **R (Right)**: Right face
4. **B (Back)**: Back face (continue rotating)
5. **L (Left)**: Left face
6. **D (Down)**: Yellow center on bottom

#### Tips for Better Detection

- 📷 Use good lighting (avoid shadows and glare)
- 🔲 Keep the cube steady and parallel to the camera
- 🎨 If colors aren't detected well, try adjusting the angle
- 🪞 Toggle "Mirror camera" if needed
- ⚠️ Low confidence warnings show when detection is uncertain

### 2. Edit Mode

After scanning, you can manually correct any misdetected colors:

1. Click on a face in the cube net or select from buttons
2. Click on any sticker to select it (centers are locked)
3. Choose a color from the palette or press keyboard shortcuts
4. Use **Undo/Redo** buttons to revert changes

#### Keyboard Shortcuts (Edit Mode)

- `W` - White
- `Y` - Yellow
- `R` - Red
- `O` - Orange
- `G` - Green
- `B` - Blue
- `Delete`/`Backspace` - Clear sticker
- `Escape` - Cancel selection

### 3. Solve Mode

1. Click **"Validate & Solve"** when all faces are complete
2. The app validates your cube state
3. If valid, a solution is generated using the Kociemba algorithm
4. Follow the move notation to solve your physical cube

#### Move Notation

- `R` - Turn right face clockwise 90°
- `R'` - Turn right face counter-clockwise 90°
- `R2` - Turn right face 180°
- Similar notation for U, F, D, L, B faces

## 🏗️ Project Structure

```
rubik-cube/
├── src/
│   ├── components/
│   │   ├── CameraFeed.tsx       # Camera capture with color detection
│   │   ├── FaceEditor.tsx       # Manual color editor with undo/redo
│   │   └── CubeNet.tsx          # Cube net visualization
│   ├── types/
│   │   ├── cube.ts              # TypeScript type definitions
│   │   └── rubiks-cube.d.ts     # Solver library types
│   ├── utils/
│   │   ├── colorDetection.ts    # HSV color classification
│   │   ├── validation.ts        # Cube state validation
│   │   └── solver.ts            # Kociemba solver integration
│   ├── App.tsx                  # Main application component
│   ├── index.css                # Tailwind styles
│   └── main.tsx                 # Application entry point
├── public/
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── vite.config.ts
└── README.md
```

## 🎨 Color Detection Algorithm

The app uses HSV (Hue, Saturation, Value) color space for robust color detection:

1. **Capture**: Extract 30×30px patches from each grid cell
2. **Convert**: Transform RGB to HSV color space
3. **Average**: Calculate average HSV values
4. **Classify**: Match against threshold ranges for 6 colors
5. **Confidence**: Compute confidence score (0-1) based on distance to threshold centroids

### Default HSV Thresholds

| Color  | Hue Range   | Saturation | Value   |
|--------|-------------|------------|---------|
| White  | Any         | 0-20%      | 80-100% |
| Yellow | 20-40°      | 60-100%    | 70-100% |
| Red    | 345-15°     | 60-100%    | 40-100% |
| Orange | 10-25°      | 70-100%    | 60-100% |
| Green  | 80-160°     | 40-100%    | 30-100% |
| Blue   | 170-260°    | 50-100%    | 40-100% |

## 🧪 Validation Rules

Before solving, the app validates:

- ✅ All 54 stickers are set
- ✅ Each color appears exactly 9 times
- ✅ Center colors are unique (no duplicate centers)
- ✅ Valid edge piece configuration
- ✅ Valid corner piece configuration

## 🔧 Configuration

### Camera Settings

The app requests camera with these preferences:
```typescript
{
  facingMode: 'environment',  // Use rear camera on mobile
  width: { ideal: 1280 },
  height: { ideal: 720 }
}
```

### Detection Parameters

- **Patch size**: 30×30 pixels per sticker
- **Grid size**: 60% of viewport (responsive)
- **Target FPS**: 15+ (requestAnimationFrame)
- **Confidence threshold**: 0.7 (warns below)

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **3D Graphics**: Three.js + React Three Fiber (planned)
- **Solver**: rubiks-cube (Kociemba algorithm)
- **Image Processing**: Canvas API (OpenCV.js optional)

## 🔒 Privacy & Security

- **No server required**: All processing happens in your browser
- **No image upload**: Camera frames stay on your device
- **No tracking**: No analytics or external requests
- **Explicit permissions**: Clear camera permission prompts
- **Local storage only**: Optional save to browser localStorage

## ♿ Accessibility

- Keyboard navigation and shortcuts throughout
- ARIA labels on all interactive elements
- High contrast color indicators
- Screen reader friendly
- Focus management
- Clear visual feedback

## 📱 Browser Support

| Browser | Desktop | Mobile |
|---------|---------|--------|
| Chrome  | ✅ 90+  | ✅ 90+ |
| Firefox | ✅ 88+  | ✅ 88+ |
| Safari  | ✅ 14+  | ✅ 14+ |
| Edge    | ✅ 90+  | ✅ 90+ |

## 🐛 Troubleshooting

### Camera won't start
- Check browser permissions (Settings → Privacy → Camera)
- Try using HTTPS (required by some browsers)
- Restart browser/device

### Colors not detected correctly
- Improve lighting (avoid shadows, direct sunlight)
- Toggle mirror mode
- Use manual edit mode to correct
- Adjust cube angle/distance

### "Invalid cube state" error
- Check color counts (each should be 9)
- Verify centers are unique
- Use edit mode to fix incorrect stickers
- Re-scan problematic faces

### Solution seems wrong
- Validate your physical cube matches the scanned state
- Check for swapped stickers (common with similar colors)
- Ensure all faces were scanned in correct orientation

## 🚧 Future Enhancements

- [ ] 3D cube animation for solution playback
- [ ] AR overlay for physical cube guidance
- [ ] ML-based color detection (TensorFlow.js)
- [ ] Advanced calibration tools
- [ ] Multiple cube size support (2×2, 4×4)
- [ ] Solution optimization options
- [ ] Save/load cube states
- [ ] Share solutions
- [ ] Internationalization (i18n)
- [ ] Dark mode

## 📄 License

MIT License - feel free to use this project for learning or building your own cube solver!

## 🤝 Contributing

Contributions welcome! Please feel free to submit issues or pull requests.

## 🙏 Acknowledgments

- Kociemba algorithm for efficient solving
- Rubik's Cube community for algorithms and patterns
- React and Vite teams for excellent developer tools

---

**Happy Cubing! 🎲✨**
