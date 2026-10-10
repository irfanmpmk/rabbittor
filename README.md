# Rabbittor

A maze chase game in the spirit of Pac-Man, with its own plot: you are a rabbit locked in a cage at the maze entrance. The cage opens, you eat every carrot in the maze, and the escape door in the centre unlocks. Big Mouth, a cruel enemy with a huge mouth, waits outside and comes in after you a few seconds later.

The story, the map layout (cage at the left entrance, Big Mouth outside, the locked door in the middle vault, hearts on top) and the characters were invented by **Noonu**.

## Play

Open `index.html` in any modern browser (desktop or phone). No install, no build step.

- **Move**: arrow keys or WASD. On a phone, swipe on the maze or use the arrow pad.
- **Invisible** (`Space`): Big Mouth can't see or catch you for a few seconds. Recharges in 2 minutes.
- **Fighter** (`F`): every 30 carrots gives one charge (max 3). Activate it, then touch Big Mouth to punch him to the farthest point of the maze, where he sits dizzy for a moment.
- **Pause**: `P` or `Esc`.

## Rules

| Mode | Lives | Map | Big Mouth arrives | Score multiplier |
|---|---|---|---|---|
| Easy | 5 | small | after 15 s | ×1 |
| Normal | 3 | medium | after 12 s | ×1.5 |
| Hard | 2 | large | after 10 s | ×2 |
| Extreme | 1 | huge | after 10 s | ×3 |

Harder modes also have more carrots, a faster and smarter Big Mouth, shorter skills and some dead ends. Every escaped level builds a new, bigger maze and Big Mouth gets faster.

**Scoring** (multiplied by the mode): carrot 10 · munch streak (15 carrots without stopping) +50 · golden carrot 150 · bouncing Big Mouth 300 · escaping 1000 + speed bonus + 250 per life left. Best scores are saved per mode in the browser.

## Files

```
index.html          page and screens
css/style.css       look and layout
js/config.js        all tuning numbers (lives, speeds, map sizes, timers)
js/maze.js          maze generator (cage, lair, centre vault with the door)
js/game.js          rules: movement, Big Mouth AI, skills, scoring
js/render.js        canvas drawing of the meadow, rabbit and Big Mouth
js/audio.js         sound effects and music, synthesized (no audio files)
js/ui.js            HUD and screens
js/main.js          input, loop, boot
tools/build-single.mjs   bundles everything into dist/rabbittor.html
```

## Publish it

- **GitHub Pages**: repository Settings → Pages → Deploy from branch → `main` / root. The game will be at `https://irfanmpmk.github.io/rabbittor/`.
- **One file**: `node tools/build-single.mjs` writes `dist/rabbittor.html`, which you can send to anyone or open offline.
- **Android APK**: every push to `main` runs `.github/workflows/android.yml`, which builds a signed APK (the game runs offline inside a full-screen WebView, fonts bundled) and attaches it to a new release under **Releases**. Locally: `python3 tools/prepare_android_assets.py` then `gradle -p android assembleRelease` with the Android SDK installed.
  - The APK is signed with `android/rabbittor.jks` (password `rabbittor`) so updates install over each other. That key is public in this repo, which is fine for sharing with family. Before publishing on Google Play, create a private key and add it as repository secrets `RT_KEYSTORE_B64`, `RT_STORE_PASS`, `RT_KEY_ALIAS`, `RT_KEY_PASS`; the workflow uses them automatically.
