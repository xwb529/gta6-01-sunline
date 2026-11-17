# SUNLINE: The Solenne Job

An original, offline, top-down open-city action game. Built for make.fun gta6-01 using vanilla JavaScript and Canvas 2D. Every visual is drawn in code; there are no libraries, downloads, external fonts, or remote assets.

Open `game/index.html` directly in desktop Chrome, or run `node serve.ts` and open `http://localhost:8080`.

Explore Solenne on foot or by car. Meet radio operator Mara Vela, recover a courier's tape, carry the evidence through a police pursuit, steal an Aurelia GT, and broadcast the truth about the city's stolen shoreline. Four paid story jobs lead to an ending and continuing free roam.

## Controls

- **WASD / arrows:** walk; in a car, accelerate/brake and steer.
- **Shift:** sprint on foot.
- **E:** enter or steal a nearby car; exit at low speed.
- **Mouse / left click:** aim and fire on foot.
- **R:** reload. The pistol has a 12-round magazine and unlimited reserve.
- **F:** talk, collect, deliver, or use Calder's repair workshop ($100).
- **Space:** handbrake in a car.
- **M:** full city map.
- **Esc / P:** pause. The pause menu includes a sound toggle.
- **Enter:** start, continue dialogue, or respawn.

Cash and completed jobs save automatically to this browser's localStorage. Continue resumes at the radio shop. Active jobs restart at Mara's after a reload or respawn. Avoid witnessed crimes to keep heat low; break police line of sight and stay hidden to lose wanted stars. Streets offer higher driving speeds than sidewalks and courtyards.

## Files

`game/src/world.js` builds and paints the city and handles navigation/collision; `entities.js` runs vehicles, pedestrians, combat, and police; `missions.js` owns the story; `render.js` draws the live scene and HUD; `input.js` handles input; `main.js` runs the game, menus, audio, and persistence.

Run the deterministic gameplay regression suite with `node tests/simulation.cjs`. It checks missions end to end, driving and collision, police response, wanted decay, combat, persistence, and respawn with a stubbed DOM/Canvas; it does not replace browser visual testing.

Run syntax checks with `find game/src -name '*.js' -exec node --check {} \;`. Build the dossier with `mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts`. The root `vendor/` is the unmodified competition packager. Screenshots are managed separately by the entrant.

MIT licensed. All game names, story, code art, and sounds are original.
