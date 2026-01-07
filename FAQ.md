# 🎲 RubikSight - Frequently Asked Questions (FAQ)

A comprehensive guide with 50 questions and answers about how RubikSight works, the technology behind it, and how to use it effectively.

---

## 📱 General Questions

### 1. What is RubikSight?
RubikSight is a web-based Rubik's Cube solver application that allows you to manually enter your cube's colors and receive step-by-step solutions to solve it.

### 2. Is RubikSight free to use?
Yes, RubikSight is completely free to use. You only need to create an account to access the solver feature.

### 3. Do I need to install anything?
No installation required! RubikSight runs entirely in your web browser. It's a Progressive Web App (PWA) that can also be installed on your device for offline access.

### 4. What devices does RubikSight support?
RubikSight works on any modern device with a web browser - desktops, laptops, tablets, and smartphones (iOS and Android).

### 5. Does RubikSight work offline?
Yes! Once loaded, the core functionality works offline thanks to PWA technology. However, you need internet access for login and saving solve history.

---

## 🎨 Cube Entry & Colors

### 6. How do I enter my cube's colors?
Click on each tile in the 3×3 grid, then select the corresponding color from the color palette. The center tiles are locked and predefined.

### 7. Why are the center tiles locked?
Center tiles never move on a Rubik's Cube and define each face's color. They're locked to maintain accuracy: White=Top, Yellow=Bottom, Green=Front, Blue=Back, Red=Right, Orange=Left.

### 8. What's the correct orientation to hold my cube?
Hold your cube with the **White center facing UP** and the **Green center facing YOU** (front). This is the standard orientation used by all cubing apps.

### 9. What do the color abbreviations mean?
- **W** = White
- **Y** = Yellow  
- **R** = Red
- **O** = Orange
- **G** = Green
- **B** = Blue

### 10. Can I use keyboard shortcuts?
Yes! Press W, Y, R, O, G, or B to quickly select colors. Press Delete or Backspace to clear a tile.

---

## ✅ Validation System

### 11. What does validation check for?
The validator checks:
- Correct color counts (exactly 9 of each color)
- Valid edge pieces (2-color combinations)
- Valid corner pieces (3-color combinations)
- Physical solvability (no impossible parity errors)

### 12. What is an "edge piece error"?
Edge pieces are the tiles between corners. An edge error means you've entered an impossible color combination that doesn't exist on a standard Rubik's Cube.

### 13. What is a "corner piece error"?
Corner pieces have 3 colors meeting at a corner. A corner error means the 3 colors you entered don't form a valid corner piece.

### 14. What is a "parity error"?
Parity errors occur when the cube configuration is mathematically impossible to achieve by turning faces. This usually means some colors were entered incorrectly.

### 15. Why does validation say "too many of one color"?
A standard 3×3 cube has exactly 9 stickers of each color. If you have more than 9 of any color, there's an entry error somewhere.

---

## 🧩 The Solver

### 16. What algorithm does RubikSight use?
RubikSight uses the **Fridrich/CFOP method** (Cross, F2L, OLL, PLL), one of the most popular speedcubing methods. It's implemented via the rubiks-cube-solver library.

### 17. How many moves will the solution have?
Solutions typically range from 20-60 moves depending on how scrambled your cube is. The Fridrich method prioritizes pattern recognition over absolute move count.

### 18. What does "God's Number" mean?
God's Number (20) is the maximum number of moves needed to solve any Rubik's Cube position. Our solver may use more moves as it uses human-friendly algorithms.

### 19. Can I pause the solution?
Yes! In step-by-step mode, you control the pace. Click Next/Previous to move through moves, or use Auto-Play with adjustable speed.

### 20. What are "wide moves"?
Wide moves (like lowercase 'u' or 'r') turn two layers instead of one. They're shown when the solver uses them for efficiency.

---

## 🔤 Move Notation

### 21. What does R mean?
**R** (Right) = Turn the right face 90° clockwise (as if looking at that face).

### 22. What does R' mean?
**R'** (R-prime) = Turn the right face 90° counter-clockwise.

### 23. What does R2 mean?
**R2** = Turn the right face 180° (half turn, same result clockwise or counter-clockwise).

### 24. What are the 6 basic face moves?
- **U** = Up (top face)
- **D** = Down (bottom face)
- **F** = Front (face facing you)
- **B** = Back (face away from you)
- **L** = Left face
- **R** = Right face

### 25. How do I know which direction is "clockwise"?
Imagine looking directly at that face. Clockwise is the normal clock direction. For the Back face, clockwise is opposite from your perspective since you're looking from behind.

---

## 🖥️ Tech Stack

### 26. What frontend framework does RubikSight use?
RubikSight is built with **React 19** using TypeScript for type safety and better developer experience.

### 27. What CSS framework is used?
**Tailwind CSS v4** provides utility-first styling, combined with custom CSS for the retro Windows 95-inspired design.

### 28. How is 3D rendering done?
The 3D cube visualization uses **Three.js** with **React Three Fiber** (@react-three/fiber) and **Drei** helper components.

### 29. What build tool is used?
**Vite** (v7) handles development and production builds. It's fast and provides excellent hot module replacement.

### 30. What makes it a PWA?
The **vite-plugin-pwa** enables Progressive Web App features: offline support, installability, and app-like experience on mobile devices.

---

## 🔐 Backend & Authentication

### 31. What backend technology is used?
The backend uses **Node.js** with **Express.js** for the REST API server.

### 32. What database stores user data?
**MongoDB** (either local or MongoDB Atlas cloud) stores user accounts and solve history.

### 33. How is authentication handled?
**JWT (JSON Web Tokens)** handle stateless authentication. Tokens are stored securely in localStorage.

### 34. Is my data secure?
Yes! Passwords are hashed using bcrypt, and all API communication uses secure tokens. No sensitive data is exposed.

### 35. Can I delete my account data?
Yes, you can delete individual solves from your history. Full account deletion can be requested.

---

## 🎮 User Interface

### 36. Why does it look like Windows 95?
The retro pixel-art design is a stylistic choice that's nostalgic, unique, and provides clear visual hierarchy with its beveled borders and classic button styles.

### 37. What font is used?
**VT323**, a monospace pixel-style font, maintains the retro aesthetic while remaining readable.

### 38. Is the UI accessible?
Yes! RubikSight includes keyboard navigation, focus indicators, ARIA labels, and respects reduced-motion preferences.

### 39. Can I use it on mobile?
Absolutely! The interface is fully responsive with touch-friendly tap targets, collapsible panels, and a sticky CTA button on mobile.

### 40. What do the status badges mean?
- 🟢 **Green/Success**: Valid, complete, or working
- 🟡 **Yellow/Warning**: Needs attention
- 🔴 **Red/Error**: Invalid or requires fixing
- 🔵 **Blue/Info**: Informational status

---

## 📊 Statistics & History

### 41. What statistics are tracked?
- Total number of solves
- Average moves per solve
- Best (minimum) moves
- Solve time (if tracked)
- Solution history with dates

### 42. Can I see my past solves?
Yes! The Stats View shows your complete solve history with pagination. Click any solve to see details.

### 43. Can I delete a solve from history?
Yes, each solve entry has a delete button. Deleted solves are permanently removed.

### 44. Are statistics synced across devices?
Yes! Since data is stored in MongoDB, your stats sync across any device when you're logged in.

### 45. What's the leaderboard?
Currently, statistics are personal. A global leaderboard is planned for future updates.

---

## 🛠️ Troubleshooting

### 46. The solver says my cube is invalid - what do I do?
Double-check your color entry against your physical cube. The most common errors are:
- Wrong orientation (White should be UP)
- Swapped similar colors (Red/Orange or Blue/Green)
- Missing or duplicate stickers

### 47. Why won't my cube solve?
If validation passes but solving fails, try:
1. Clear and re-enter all faces
2. Verify you're using the correct orientation
3. Check for any corner/edge pieces that might be twisted wrong on your physical cube

### 48. The 3D view isn't loading - what should I do?
The 3D view requires WebGL. Try:
- Using a modern browser (Chrome, Firefox, Safari, Edge)
- Enabling hardware acceleration in browser settings
- Updating your graphics drivers

### 49. How do I report a bug?
Contact us through the help section or submit an issue on the GitHub repository with:
- Steps to reproduce
- Browser and device info
- Screenshots if applicable

### 50. Is there a community or support channel?
Check the GitHub repository for discussions and issue tracking. Updates and announcements are posted there.

---

## 🚀 Quick Reference

| Feature | Description |
|---------|-------------|
| **Entry Mode** | Manual color painting with locked centers |
| **Validation** | Real-time edge/corner/color validation |
| **Algorithm** | Fridrich/CFOP method |
| **3D View** | Three.js interactive visualization |
| **Notation** | Standard WCA move notation |
| **Auth** | JWT-based with MongoDB storage |
| **PWA** | Offline-capable, installable |
| **Design** | Retro Windows 95 aesthetic |

---

## 📚 Move Notation Quick Reference

| Move | Description |
|------|-------------|
| R | Right face clockwise |
| R' | Right face counter-clockwise |
| R2 | Right face 180° |
| L | Left face clockwise |
| L' | Left face counter-clockwise |
| U | Up face clockwise |
| U' | Up face counter-clockwise |
| D | Down face clockwise |
| D' | Down face counter-clockwise |
| F | Front face clockwise |
| F' | Front face counter-clockwise |
| B | Back face clockwise |
| B' | Back face counter-clockwise |

---

*Last updated: January 2026*
*Version: 1.0.0*
