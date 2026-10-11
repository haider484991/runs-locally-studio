# The visual system

> The look of the classic scenes (title, stat, compare, bars, list, callout, verdict, end). Lesson scenes live in src/explain (src/explain/README.md). Choose the visual that proves the point; `capture` shows a real image or screen recording with a source label and an optional focus rectangle.

A cinematic motion-graphics language. **Nothing is drawn by a hand. Nothing strokes on. There is no
paper.** Everything is a lit surface that moves with physical weight.

## The look in one sentence

Deep-space gradient, one electric accent, glass panels that slide in on springs, huge kinetic type
that lands word by word, numbers that tick to their value, and a slow camera push that keeps every
frame alive.

## Canvas

- **1920 × 1080, 30 fps.** Thumbnails 1280 × 720.
- **Safe area**: content lives inside x 160–1760, y 120–960. Captions own y > 940.
- **Grid**: 8 px base. Type sizes and gaps are multiples of 8.

## Colour

Every video declares ONE accent. Everything else is fixed.

| token | value | job |
|---|---|---|
| `bg0` | `#05070F` | outer field |
| `bg1` | `#0B1020` | centre of the radial gradient |
| `ink` | `#F5F7FF` | headline type |
| `muted` | `#8B93A7` | labels, kickers, sources |
| `glass` | `rgba(255,255,255,0.06)` | panel fill |
| `edge` | `rgba(255,255,255,0.14)` | panel border |
| `accent` | per video — `cyan #22D3EE` · `coral #FB7185` · `lime #A3E635` · `violet #A78BFA` | the subject |
| `second` | the accent's complement, chosen with it | the thing it is measured against |
| `gold` | `#FBBF24` | the verdict, and only the verdict |

Rule: **the accent is the subject of the video, the second colour is what it is compared to, and
gold appears once — on the answer.** A frame with three accents has no subject.

## Light

- **Backdrop**: radial gradient `bg1 → bg0`, plus two slow drifting orbs (accent and second, 900 px,
  blur 180 px, opacity 0.18) that move on a 30 s loop so no frame is ever static.
- **Grain**: SVG turbulence at 4 % opacity over everything. It is what makes flat colour look filmed.
- **Vignette**: 30 % at the corners.
- **Glow**: the hero number and the verdict get a `drop-shadow` in their own colour, 40 px, 0.55.

## Type

- **Display**: Space Grotesk 700. Headlines 88–120 px, hero numbers 200–260 px, `letter-spacing -0.02em`.
- **Body**: Inter 500. Labels 28–36 px, kickers 24 px uppercase `letter-spacing 0.12em` in `muted`.
- **Numbers**: `font-variant-numeric: tabular-nums` always, so a ticking counter never jitters.
- **Line length**: a headline never exceeds two lines. If it does, the script is wrong, not the layout.

## Motion — the spring is the brand

Every entrance is a spring. Every exit is a short ease. Nothing fades in by itself.

| preset | config | used for |
|---|---|---|
| `land` | `{ damping: 18, stiffness: 170, mass: 0.9 }` | words, panels, bars — the default |
| `pop` | `{ damping: 11, stiffness: 220 }` | the hero number, the verdict |
| `settle` | `{ damping: 200 }` | camera, backdrop orbs, anything that must not bounce |
| `heavy` | `{ damping: 16, stiffness: 90, mass: 1.6 }` | large panels arriving |

- **Entrance**: `translateY 48 → 0`, `scale 0.94 → 1`, `opacity 0 → 1`, on `land`.
- **Stagger**: words 3 frames apart, list items 5, bars 6.
- **Counter**: value ticks over 36 frames on `Easing.out(Easing.cubic)`, never a spring (a spring
  overshoots a number, and an overshot number is a wrong number on screen).
- **Camera**: every scene pushes in `scale 1.00 → 1.035` across its whole length on `settle`. It is
  the reason a 12-second hold still feels alive.
- **Exit**: the scene's content eases out over the transition; the backdrop persists.
- **Transition — THE SWEEP**: a diagonal accent band, 14 frames, wipes from left to right and reveals
  the next scene behind it. It is the one signature move; use it between every scene.

## Composition rules

1. **One idea per scene.** One hero element. Supporting text is smaller and arrives later.
2. **The number is the picture.** When a beat has a value, the value is the largest thing on screen.
3. **Left carries the claim, right carries the proof.** Headlines sit left; charts, counters and
   panels sit centre-right. A viewer reads left→right into the evidence.
4. **A comparison is two panels of identical geometry.** Difference is shown by fill, never by size
   of the panel.
5. **Bars are horizontal and labelled at the head.** Values at the end of the bar in the bar's colour.
6. **Never more than five items** in a list or a chart. Six is a table, and a table is a website.
7. **Sources are a kicker line, `muted`, 24 px, bottom-left**, present in every scene that shows a number.
8. **The verdict scene is gold on glass** and is the only scene allowed to be centred.

## Scene types (the data-driven vocabulary)

`title` · `stat` · `compare` · `bars` · `formula` · `list` · `callout` · `verdict` · `end`

Each is a component in `src/scenes/`, keyed by `beat.visual.type`. A video is a list of beats; no
per-video React is written. If a story needs a shape that is not here, add a scene TYPE, never a
one-off.

## Thumbnail

1280 × 720. The same gradient and grain. **Hero number top-right at 300 px in the accent with glow**,
subject kicker top-left, a two-line headline bottom-left at 84 px in `ink`, the verdict word in `gold`.
A single glass panel behind the headline. No faces, no arrows, no red circles.

## What this system refuses

- Hand-drawn anything. Sketch lines. Paper texture.
- More than one accent per video.
- A number that fades in instead of ticking.
- A static hold longer than 4 seconds without a camera push or a live orb.
- A title card before the first claim.

---

## MOOD — why two videos never look like the same template

*Added after the first demo read as "templated".* A fixed skin is a template no matter how good it
is. So every video now declares a **mood**: six dials that change together, and one **hero scene**
that exists in that video and nowhere else.

| dial | options | what changes |
|---|---|---|
| `palette` | `cyan` `coral` `lime` `violet` `ember` `ice` | the accent, its comparison colour, and the centre of the gradient |
| `backdrop` | `nebula` (drifting orbs) · `grid` (a rolling perspective floor) · `aurora` (moving light bands) · `dust` (a rising particle field) | what is alive behind everything |
| `type` | `grotesk` (Space Grotesk) · `serif` (Fraunces) · `mono` (JetBrains Mono, kickers get `//`) · `condensed` (Bebas Neue, uppercase) | the whole voice of the display type |
| `transition` | `sweep` (diagonal band) · `iris` (a lit circle opens) · `blinds` (six strips) · `slice` (the frame splits) | the one signature move |
| `shapes` | `glass` (rounded, translucent) · `sharp` (square, solid, accent rule) · `naked` (no boxes, hairlines) | how panels, chips and bars are skinned |
| `texture` | `grain` · `scanlines` · `none` | the film over the lens |

An undeclared dial is **seeded from the slug**, so even an unspecified video is a specific, stable
mood — never the default. Declare dials in `script.mood` when the subject wants a particular feel.

**Layout variants.** Every scene type has two or three layouts (a stat can be left-set, a centred
giant, or split; a comparison can be two panels, stacked rows, or an offset pair; bars can be rows
or columns; a formula can be a row of chips or a stacked fraction). The seed picks, so the same
beat type lands differently across videos and identically across renders of one video.

**The hero.** `visual: { type: "hero" }` renders `src/heroes/<slug>.tsx` — the one picture the
generic vocabulary cannot say. It is the scene a viewer remembers; write it for the turn or the
proof. It receives the mood colours, so it always belongs. A video without a hero is allowed; a
video with two is a sign the story has two ideas.

**What stays fixed** — because it is the brand, not the template: the number is the picture, one
accent per video, gold only on the verdict, springs on every entrance, a camera push on every scene,
a source on every number, no title card, no advice.
