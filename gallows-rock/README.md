# Gallows Rock

A first-person puzzle escape game set on an island prison during a storm, one night in October 1971.
Your cellmate Tom has planned an escape for thirty years — and left you his notes.

Everything in the game is generated in the browser at load time: textures, models, lighting,
sound effects, voices and the adaptive music score. There are no image or audio files.

## Running the game

The game is a static web page, so any local web server works.

- **macOS:** double-click `play.command`. It starts a small local server and opens the game in your browser.
  Close the Terminal window to stop it.
- **Any OS:** run a web server in this folder and open the address it prints, for example:

  ```bash
  python3 -m http.server 8000
  ```

  then open <http://localhost:8000>.

An internet connection is needed on first load: the 3D engine (three.js 0.160) comes from
cdn.jsdelivr.net and the fonts from Google Fonts. Use a recent Chrome, Edge, Firefox or Safari
with WebGL 2. Headphones are recommended.

## Controls

| Key | Action |
| --- | --- |
| Mouse | Look around |
| W A S D / arrows | Move |
| Shift | Run |
| C (toggle) / Ctrl (hold) | Crouch |
| E or left click | Interact, pick up, read |
| F | Flashlight on/off (once you have one) |
| Tab / I | Inventory, documents and map |
| M | Map (once you've found it) |
| H | Hint — Tom's advice for your current objective |
| Esc | Pause menu (settings, hints, restart from checkpoint) |

In close-up puzzles (locks, panels, the organ, the boat's motor) a round cursor appears:
click the parts, and right-click or press S to step back.

Progress is saved automatically at checkpoints; choose **Continue** on the title screen to resume.

## The escape (spoiler-free outline)

1. Get out of cell C-14.
2. Get through the C-Block gate.
3. Restore power to the yard shutter.
4. Cross the searchlit yard to the chapel.
5. Find the way Tom left you — and follow it to the sea.

A full playthrough takes roughly 25–45 minutes. Press **H** whenever you're stuck; repeated
presses give more direct hints.

## Settings

The pause menu has volume sliders, mouse sensitivity, field of view, invert Y, head bob,
subtitles, item sparkles and graphics quality (Low / Medium / High). If the first seconds of play
run slowly, the game lowers the quality once by itself.

## Project layout

```
index.html        page, UI markup, loader
css/style.css     HUD, menus, documents
js/core.js        namespace, events, state, saving, tweens
js/textures.js    procedural textures and materials
js/audio.js       synthesized sound effects, ambience, spatial audio
js/music.js       generative, mood-driven score (Tom's theme is a leitmotif)
js/engine.js      renderer, post-processing, light pool, weather, particles
js/builder.js     level toolkit: batching, walls, colliders, areas
js/props.js       reusable props and item models
js/player.js      input, first-person controller, collisions
js/interact.js    interaction, inventory, close-up puzzles, inspect view
js/ui.js          HUD, subtitles, menus, reader, map
js/story.js       items, documents, objectives, hints
js/level_*.js     the prison: cell block, hall & generator, yard, chapel & tunnel, sea cave
js/cinematics.js  title island, intro, wake-up, ending at dawn
js/main.js        boot, game loop, modes, checkpoints
```

Add `?debug` to the URL to expose `G.debug` helpers in the browser console.
