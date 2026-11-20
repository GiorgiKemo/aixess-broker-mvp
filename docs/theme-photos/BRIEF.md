# AiXESS theme photos: afternoon and night versions (for Antigravity)

The AiXESS site switches between three looks by time of day: **day**, **afternoon**, **night**.
Every page photo needs one version per look, showing the **same scene in different light**. The
site cross-fades between them, so the versions must line up exactly.

The 13 source photos are in `source/` (in the zip) or, inside the repository, at
`public/assets/figma/<name>-<largest width>.webp`. Generate the versions listed below with
Gemini image editing (Nano Banana) or the best image-editing model you have, **editing the
source photo** (image in, image out), never generating a new picture from text.

## Rules for every image (read before each one)

1. **Same photograph, new light only.** Keep the framing, camera position, lens, horizon,
   architecture, materials, windows, people, plants, furniture, water, skyline, logos and signs
   exactly as they are. Nothing added, removed, moved or redrawn. No new buildings, no cars, no
   people, no birds, no stars, no moon, no text, no watermark, no lens flare.
2. **Same size and shape.** Return the same aspect ratio as the source, uncropped, at the highest
   resolution the model allows (at least 2048 px on the long side). Never pad or letterbox.
3. **Photorealistic.** It must look like a real architectural photograph taken at that time of
   day: natural exposure, believable shadows and reflections, clean (no noise, no painterly look,
   no over-saturation, no HDR halos).
4. **Keep empty sky empty.** Where the source has a large clean sky (the site writes headlines on
   it), keep that area a smooth gradient: no clouds added there, no stars.

### Afternoon look (about 6 pm, golden hour)
Low warm sun from the side, long soft shadows, warm golden light raking across the stone and
glass, sky shading from soft peach and amber near the horizon to a calm light blue above. Glass
reflects the warm sky. A few interior lights may glow softly. Overall bright and inviting, not
orange-washed.

### Night look (blue hour, just after dusk)
Deep navy-blue sky (darkest at the top, a little lighter near the horizon). **Beautiful,
realistic building lights**: warm 2700-3000 K light glowing from most windows (vary it: some rooms
brighter, a few dark, so it looks lived-in), soft downlights in ceilings and soffits, gentle
uplights on columns and facades, step and path lights, glass showing the lit interiors and
reflecting the lights. Distant city skylines sparkle with thousands of warm and white lights;
landmark towers lit. Water reflects the lights. People stay, softly lit by the interiors. Calm,
premium, high-end real estate night photography.

## The images

File names matter: save each result as `<name>-<look>.png` (for example `home-hero-night.png`).

### Daytime photos: make `-afternoon` and `-night`

| name | what it shows | notes for the lights |
| --- | --- | --- |
| `home-hero` | White stone residence with a glass balcony on the right, Dubai skyline with Burj Khalifa far left, big clear sky | The left two-thirds of the sky carries the site's AIXESS headline: keep it smooth. Night: the whole Dubai skyline and Burj Khalifa lit, warm light behind the residence's glazing, balcony glass glowing. |
| `home-about` | Two white buildings joined by a glass skybridge with a person walking, skyline below | Night: the skybridge lit from inside (the walking person in silhouette against warm light), warm windows in both buildings, skyline lit. |
| `advantage-hero` | Terrace under a cantilevered stone roof, couple walking along an infinity pool, Dubai skyline | Night: warm downlights in the roof soffit, the pool softly lit aqua from below, skyline lit, interior glazing glowing at left. |
| `advantage-more` | Covered walkway between modern buildings, people walking, planting, lobby glazing at left | Night: warm lobby interior glow, ceiling downlights in the walkway, path and planter lights, upper-floor windows lit. |
| `broker-hero` | White modern building with a pergola roof at the right, wide clear sky at left | The sky at left carries the page headline: keep it smooth. Night: interiors lit warm behind every floor, pergola with soft downlights. |
| `broker-join` (portrait) | Woman on a sofa on a covered terrace looking out over a coastal town, sea and mountains | Night: the coastline and town sparkling with lights along the shore and up the hills, lights reflected in the sea, soft warm terrace lamps; the woman stays, rim-lit. |
| `broker-commercial` | Terrace living room with sofas and an olive tree, Burj Khalifa and Dubai skyline | Night: skyline and Burj Khalifa lit, warm lamps and downlights in the living space, glass reflecting them. |
| `broker-workspace` | Low-angle view of a white office building with long glass bands, trees in the corners | Night: every office floor lit warm-white from inside (ceiling light lines visible), trees softly uplit, navy sky. |

### Developer renders that are already dusk/night: make `-day` and `-afternoon`

These are official renders of TRESORA and DOWNTOWN ONE. Change only the light; keep the
architecture, facade lighting design, signage (the SAMANA sign) and landscaping exactly.

| name | what it shows | notes |
| --- | --- | --- |
| `home-tresora` | TRESORA tower at dusk with lit windows, palms, city in front | Day: bright clear daylight, interior lights off. Afternoon: golden-hour sun on the facade. |
| `home-downtown` | DOWNTOWN ONE tower with blue facade lighting and the SAMANA sign at night | Day: bright daylight, facade light strips off, sky blue. Afternoon: golden hour. |
| `downtown-hero` | The same tower, wider view at night | As `home-downtown`. Keep the sky at left clean (headline area). |
| `downtown-highlights` | The tower at dusk seen from the street with neighbouring buildings | Day and afternoon as above; street and cars unchanged. |
| `downtown-entertainment` | Rooftop entertainment terrace at dusk (outdoor cinema, golf simulator, fire pit, lounge) | Day: daylight, screens and fire subdued. Afternoon: golden hour, fire pit glowing softly. |

That is 26 images (13 photos x 2 looks). The REVERANCE hero is already done, and the Downtown map
stays as it is.

## Where to put the results

Either:
- in the repository, save them to `incoming/theme-photos/` and push to the branch
  `claude/vigilant-cori-fisyj4`, or
- send the 26 PNG files back in the Claude chat.

Claude then aligns each one to its source, makes the web sizes and wires them into the theme
switcher (`scripts/import-figma-photos.py --themes incoming/theme-photos`).

## TRESORA (added 19 November 2026)

Sources in the repository (official WADAN renders: change only the light, keep the architecture,
the WADAN lettering and the facade light lines exactly):

| source | what it shows | make |
| --- | --- | --- |
| `public/assets/dubai/tresora-fig-hero-2880.webp` | TRESORA tower at dusk across the water, palms | `tresora-fig-hero-day`, `tresora-fig-hero-afternoon` |
| `public/assets/dubai/tresora-fig-discover-2880.webp` | Woman on a curved balcony with light lines, dusk sky | `tresora-fig-discover-day`, `tresora-fig-discover-afternoon` |
| `public/assets/dubai/tresora-fig-spaces-1640.webp` | Pool deck with umbrellas and two people, daylight | `tresora-fig-spaces-afternoon`, `tresora-fig-spaces-night` |
| `public/assets/dubai/tresora-fig-lifestyle-1676.webp` | Infinity pool at golden hour, sun low | `tresora-fig-lifestyle-day`, `tresora-fig-lifestyle-night` |
| `public/assets/dubai/tresora-fig-payment-2880.webp` | TRESORA tower at night against a navy sky | `tresora-fig-payment-day`, `tresora-fig-payment-afternoon` |
