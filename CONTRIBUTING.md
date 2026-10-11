# Contributing

Issues and pull requests are welcome — especially reports from macOS and Linux, where the pipeline is written but not yet tested.

- **A bug:** say what you ran, your OS, Node/Python/ffmpeg versions, and paste the output. If it is a picture problem, attach the still (`node scripts/frames.mjs <slug> --cues`).
- **A new lesson scene:** follow "Adding a scene" in [src/explain/README.md](src/explain/README.md); include a small example script that uses it and a contact sheet of the render.
- **Checks:** `npm test` and `npm run typecheck` must pass. Never loosen a gate in `scripts/check.mjs` to make a video pass — fix the video, or explain in the PR why the gate is wrong.
- **Honesty:** example data must be real (a captured run, a measurement with its conditions) or labelled as an illustration.
