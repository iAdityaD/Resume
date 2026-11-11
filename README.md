# Resume Quest

A playable 2D pixel-art resume. Visitors walk a small village, enter six buildings
(About, Experience, Projects, Skills, Education, Contact) and collect skill gems.
A **RESUME** button gives recruiters a plain, printable version at any time.

No build step and no dependencies: plain HTML, CSS and canvas JavaScript.

## Edit your details

Everything comes from **`resume-data.js`**. Replace the `[bracketed]` placeholders;
the buildings, gems and plain resume update automatically.

## Run locally

Open `index.html` in a browser, or:

```
python3 -m http.server 8000
```

## Publish with GitHub Pages

Repo **Settings → Pages → Deploy from a branch → `main` / root**. The site will be
live at `https://iadityad.github.io/Resume/`.

## Controls

| | Desktop | Phone |
| --- | --- | --- |
| Move | WASD / arrow keys | On-screen joystick |
| Interact | E / Space | A button |
| Close | Esc | CLOSE button |

## Files

- `index.html` – page shell and UI overlays
- `style.css` – pixel UI, touch controls, print styles
- `game.js` – world generation, sprites, input, rendering
- `resume-data.js` – your resume content
