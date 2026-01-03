# 🚀 Quick Start Guide - RubikSight

## Getting Started (5 minutes)

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```

Open your browser to `http://localhost:5173/`

### 3. Build for Production
```bash
npm run build
npm run preview
```

## First Time Using the App

### Step 1: Allow Camera Access
- Click "Allow" when your browser asks for camera permission
- The app only uses your camera locally - no images are uploaded

### Step 2: Scan Your Cube
1. Hold your cube with **white on top** and **green facing you**
2. Position the cube so the 3×3 grid overlay matches the face
3. Wait for colored dots to appear on each sticker
4. Press **Space** or click **"Capture Face"**
5. Follow the on-screen instructions for the next 5 faces

**Tip**: Use good lighting and keep the cube steady!

### Step 3: Edit (if needed)
- Click on any face in the cube net to edit it
- Click on stickers to change colors
- Use keyboard shortcuts: W, Y, R, O, G, B
- Undo/Redo buttons are available

### Step 4: Solve
1. Click **"Validate & Solve"**
2. Wait for the solution (usually < 1 second)
3. Follow the move notation to solve your physical cube

Example: `R U R' U'` means:
- **R**: Turn right face clockwise
- **U**: Turn top face clockwise
- **R'**: Turn right face counter-clockwise
- **U'**: Turn top face counter-clockwise

## Common Issues

### Camera not working?
```
✓ Check browser permissions (Settings → Privacy → Camera)
✓ Use HTTPS in production
✓ Try a different browser
```

### Colors not detected correctly?
```
✓ Improve lighting (avoid shadows/glare)
✓ Toggle "Mirror camera"
✓ Manually edit colors in Edit mode
✓ Adjust cube angle and distance
```

### "Invalid cube state" error?
```
✓ Check color counts (each should be 9)
✓ Verify all centers are different colors
✓ Re-scan any suspicious faces
```

## Project Structure

```
src/
├── components/        # React components
│   ├── CameraFeed.tsx    # Camera capture + detection
│   ├── FaceEditor.tsx    # Manual color editor
│   ├── CubeNet.tsx       # Cube visualization
│   └── HelpModal.tsx     # Help/tutorial
├── types/            # TypeScript types
│   └── cube.ts
├── utils/            # Core logic
│   ├── colorDetection.ts  # HSV color detection
│   ├── validation.ts      # Cube validation
│   └── solver.ts          # Solving algorithm
└── App.tsx           # Main app
```

## Available Scripts

```bash
npm run dev        # Start dev server
npm run build      # Build for production
npm run preview    # Preview production build
npm run lint       # Run ESLint
```

## Technologies Used

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool (fast!)
- **Tailwind CSS** - Styling
- **Three.js** - 3D graphics (future)
- **rubiks-cube** - Solver library

## Browser Support

| Browser | Min Version |
|---------|-------------|
| Chrome  | 90+         |
| Firefox | 88+         |
| Safari  | 14+         |
| Edge    | 90+         |

## Need Help?

1. Click the **"❓ Help"** button in the app
2. Read the full [README.md](./README.md)
3. Check for TypeScript errors: `npm run build`

## Tips for Best Results

### Scanning
- 📷 Good lighting is crucial
- 🎯 Keep cube centered and parallel to camera
- ⏸️ Wait for all 9 dots before capturing
- 🔄 Follow the scanning order exactly

### Editing
- 🔒 Centers are locked (can't be changed)
- ⌨️ Use keyboard shortcuts for speed
- ↶ Undo/Redo helps fix mistakes
- ✓ Check color counts before solving

### Solving
- 📋 Copy the solution notation
- 🐢 Go slowly at first
- 🔁 Practice moves before applying
- ✅ Verify your cube matches the scanned state

## Next Steps

After you get it working:

1. Try scanning different cube states
2. Experiment with different lighting
3. Test on mobile devices
4. Customize colors in `tailwind.config.js`
5. Add your own features!

---

**Happy Cubing! 🎲✨**

App running at: http://localhost:5173/
