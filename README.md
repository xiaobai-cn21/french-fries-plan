# 薯条计划 · FryPlan

A mobile-first focus and task website built with plain HTML, CSS, JavaScript, and SVG.

## Run locally

Open `index.html` in a modern browser, or serve the project folder for a consistent local origin:

```sh
python -m http.server 8000
```

Visit `http://localhost:8000`. Keep using the same browser and origin to access saved progress.

AI time estimates, starter fries, and photo verification use the optional local API:

```powershell
Copy-Item api/.env.example api/.env
# Fill in api/.env
node --env-file=api/.env api/server.mjs
```

The frontend calls `http://127.0.0.1:3001` by default. If the API is not running, time estimates and starter fries fall back to local defaults; photo verification requires the API before a task can be marked complete.

## GitHub Pages and API deployment

GitHub Pages can host the frontend files in this repository, but it cannot run the Node.js API in `api/server.mjs`. Deploy the API folder to a Node host such as Render, Railway, Fly.io, or another server, set `DEEPSEEK_API_KEY`, `DEEPSEEK_MODEL`, and `DEEPSEEK_VISION_MODEL` there, then point the GitHub Pages frontend to that public API URL:

```js
localStorage.setItem('fryplan-api-base', 'https://your-api-domain.example')
```

The public API must serve the same three frontend routes: `/api/estimate-time`, `/api/start-fries`, and `/api/verify-photo`. The server already sends permissive CORS headers for GitHub Pages.

## Folder structure

```text
index.html             Homepage
pages/                 Other screens and artwork preview
assets/
  css/                 Page styles and artwork layout
  js/                  Page behavior, progress, SVG component
  images/              Visual reference / profile avatar source
docs/                  Original product requirements
```

## Pages and flow

- `index.html`: a large interactive task carton, streak, categories, and navigation. A new user starts with an empty carton; every saved unfinished task appears as an anonymous fry.
- `pages/goal.html`: type a task or choose an optional suggestion, then add it to the carton. Use the existing categories or bottom navigation to enter this page.
- `pages/focus.html`: timer, pause/resume, optional ambient sound, and finish controls.
- `pages/upload.html`: preview a JPG/PNG screenshot and confirm task completion.
- `pages/success.html`: completion feedback and 3 energy points per completed session.
- `pages/companion.html`: companion, growth, and action statistics.
- `pages/profile.html`: saved screenshots, statistics, nickname, and appearance settings.

Tasks are entered by the user and can be assisted by the local AI API. The API estimates goal time, generates three starter fries, and verifies uploaded screenshots before completion. Re-submitting the same session does not award additional energy.

### Optional guided steps

Enable **分步启动** when creating a goal to use an editable Chinese Word/thesis sequence:

1. 打开 Word — 1 minute.
2. 打开你的论文文档 — 1 minute.
3. 找到第三章 — 1 minute.
4. 写下三个粗略要点，说明你想表达什么 — 3 minutes.
5. 保存文档 — 1 minute.

Each step can be edited and set to 1 or 3 minutes. A screenshot is required after every step before the next timer starts. Users may finish a step early if they have already done it. Partial progress and every screenshot are saved; the task stays in the carton until the final step is confirmed. All steps together award 3 energy points once. Normal tasks retain their 15-minute timer. This uses a manually editable example, not AI-generated steps.

`assets/js/step-proof.js` writes sequential screenshot records in an IndexedDB transaction. The saved proof count determines the next step, including after reloads; repeat submissions cannot skip ahead or duplicate rewards.

Tap a fry to choose a starter action, reveal its name on the focus page, and start or resume its timer. Names, hover hints, and task-specific progress are hidden before the selection. The oven displays only the selected fry. Completed tasks leave the carton and remain in screenshot history.

## Local data and assets

Drafts and timer state use localStorage; screenshot records use IndexedDB. Data stays in the current browser and is not synchronized to an account. Clearing browser site data removes these records. JPG/PNG screenshots must be readable and no larger than 10 MB.

`assets/js/tasks.js` owns saved tasks, random draws, and per-task timer snapshots. Completion records are authoritative for which tasks remain available. An existing active goal from the previous version is imported once; unfinished draft text is not automatically made into a task. `assets/js/task-carton.js` renders anonymous, keyboard-accessible draw buttons without adding another task-creation control. The blind draw follows the revised product direction; the original requirements document describes recommendations rather than random selection.

`assets/images/image.png` is the supplied visual reference; the profile avatar uses `assets/images/profile-fries.png`. The homepage optionally loads Google Fonts, with system-font fallbacks.

## Artwork

Open `pages/art-studio.html` to preview one fry, the carton, and the oven. The controls demonstrate ready, heating, paused, and completed states without changing actual task data.

`assets/js/fry-art.js` defines the reusable `<fry-art>` component, with styles isolated inside a shadow root. Each fry has separate front, side, and top faces. The carton, logo, oven glass, light, heat lines, and sparks are separate SVG elements. The focus oven uses `assets/images/potatos-micro.png`; companion artwork remains SVG. The homepage task carton uses the teammate's original PNG artwork, composed as independent fry buttons.

- `variant`: `fry`, `carton`, or `oven` (choose when creating the component).
- `theme="cream"`: optional cream carton; red is the default.
- `setState(state, progress)`: `ready`, `heating`, `paused`, or `completed`, and cooking progress from 0 to 1.
- Progress controls color independently of state. Pausing dims the oven and settles movement without losing progress.
- Only a fully elapsed timer triggers the completed animation. Stopping early settles the oven without pretending the fries finished cooking.
- Decorative animations pause offscreen and respect reduced-motion preferences.

When using a local HTTP server, the existing browser data stays available after the folder reorganization because the origin is unchanged. Direct `file://` storage behavior varies by browser.

The product requirements document is included for reference. It describes future features beyond this local implementation.
