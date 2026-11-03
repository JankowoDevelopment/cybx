# ⚡ CYBX // FREE FOR ALL

> **High-octane 3D Cyberpunk Free-For-All arena shooter running directly in your browser with WebGL (Three.js) & WebSockets.**  
> Zero installation required. Instant acceleration, snappy arena physics, real-time multiplayer, and HDR bloom visuals.

🎮 **Play Live:** [https://cybx.pl](https://cybx.pl)

---

## 🚀 Overview

**CYBX** is a competitive browser-based 3D FPS arena shooter inspired by arena classics (*Quake*, *Unreal Tournament*) and modern round-based upgrade systems (*ROUNDS*). 

Featuring instant client-side predicted movement, snappy strafe acceleration, procedural cyberpunk lighting with real-time soft shadows, directional 3D spatial audio, and an in-game settings suite.

---

## ✨ Features

- **🌐 Real-Time Multiplayer PvP (Free-For-All / Rounds):**
  - Ultra-low latency WebSocket server synchronization (~30Hz snapshots).
  - Client-side prediction with zero input-delay dispatch and instant acceleration.
  - Live player list, dynamic scoreboard, and in-game lobby system.

- **⚡ Snappy 3D Arena Physics & Movement:**
  - Instant acceleration (no sluggish sliding or rubberbanding).
  - Tactical camera dash (`Space`) with directional boosting.
  - Axis-separated continuous collision detection against cyber walls and pillars.
  - Seamless wall-shooting and point-blank projectile spawning.

- **🎨 Cyberpunk Graphics & Post-Processing:**
  - Powered by **Three.js** with ACES Filmic Tone Mapping and PCF Soft Shadow Mapping.
  - Custom **UnrealBloomPass** HDR glow pipeline with a real-time in-game **Bloom Slider (`[P]`)**.
  - Wet-look cyber floors with balanced specular environment map reflections.
  - Dynamic floating atmosphere motes with 4-point diamond starburst lens flare effects.

- **🔫 Weapon Arsenal & Rounds Card Drafting:**
  - Holographic 3D weapon pedestals with real-time spinning models.
  - Multiple weapon classes: Assault Rifles, Shotguns, Pistols, Energy weapons.
  - Roguelike upgrade card draft between rounds to customize your build (damage, speed, bullet bounce, extra pellets).

- **🎧 3D Directional Spatial Audio:**
  - Zero external MP3 downloads — fully synthesized procedural Web Audio API sounds.
  - Real-time 3D stereo panning, distance attenuation, and wall occlusion muffling.

- **⚙️ In-Game Settings (`[P]` or `[ESC]`):**
  - Master & SFX volume sliders, quick mute (`[M]`).
  - Mouse sensitivity multiplier & adjustable Field of View (FOV: 60°–110°).
  - Graphics presets (Low / Medium / High), 3D shadows toggle, and custom Bloom intensity slider (0%–100%).

---

## 🕹️ Controls

| Key | Action |
|---|---|
| **W, A, S, D** | Movement (Instant Snappy Acceleration) |
| **Mouse** | Aim (First-Person Look) |
| **LMB (Left Click)** | Fire Weapon |
| **R** | Reload Weapon |
| **Space** | Cyber Dash (Boost) |
| **E** | Interact (Buy weapons / pedestals) |
| **P** or **ESC** | Open / Close Settings Menu |
| **M** | Quick Mute Audio |

---

## 🛠️ Tech Stack

- **Client:** TypeScript, Three.js, Vite, Web Audio API, HTML5 Canvas
- **Server:** Node.js, TypeScript, WebSockets (`ws`), Express
- **Deployment & Infra:** Docker, Fly.io, Custom Domain SSL (nazwa.pl + Let's Encrypt)
- **CI/CD:** GitHub Actions (`.github/workflows/fly.yml`)

---

## 💻 Local Development

### Prerequisites
- Node.js 20+
- npm

### 1. Install Dependencies
```bash
npm install
```

### 2. Development Mode
Run client and server concurrently with hot reload:
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 3. Production Build & Start
```bash
npm run build
npm start
```
The game will be available at [http://localhost:8080](http://localhost:8080).

---

## 🚢 Deployment

The game is containerized with a lightweight multi-stage Alpine Docker image and deployed on [Fly.io](https://fly.io):

```bash
fly deploy --depot=false --ha=false
```

Automated deployments trigger on every push to `main` via GitHub Actions.

---

## 📜 License

**All Rights Reserved &copy; 2026 Mariusz Gruszka**

This project is **Source-Available** for personal inspection, educational study, and reference. No redistribution, copying, commercial exploitation, or public re-hosting is permitted without explicit written permission from the author. See the [LICENSE](LICENSE) file for complete terms.
