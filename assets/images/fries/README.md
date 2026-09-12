# Teammate artwork

- `carton-source.png`: copy of `fries-widget/fries-widget/images/fries.png` with the printed numbers removed and the edge-connected white background made transparent.
- `fry_01.png` through `fry_11.png`: all 11 original fry layers with the printed numbers removed.
- `fries-data.js`: original pixel hit map and hover centers.

`assets/js/task-carton.js` keeps every layer at its original 396×502 coordinates without repositioning, rotation, or stretching. One layer is shown per unfinished goal. Fill order is `10, 9, 11, 8, 7, 6, 5, 4, 3, 1, 2`: foreground first, rear last. Rendering order remains the original layer order. The complete box uses the original full base image; partially filled boxes use its clipped carton front and a red inner wall. A subtle edge glow softens the supplied cutout seams. No generated replacement artwork is used.

Up to 11 fries appear together; additional goals use more trays. Drawing remains random across all unfinished goals, without revealing goal names on the fries.
