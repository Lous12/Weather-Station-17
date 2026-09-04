# Weather Station 17

> An autonomous weather terminal that keeps working long after anyone stopped watching.

**Weather Station 17** is a small atmospheric web project by **Lous12**.  
It runs entirely in the browser and is designed to work on **GitHub Pages** with no backend.

The project is intentionally restrained: no jumpscares, no giant lore dump, no account system.  
The station tells its story through weather telemetry, equipment state, and sparse automated logs.

## Current version

`0.1.0`

Included:

- live station-local clock
- slowly changing procedural weather
- temperature, wind, pressure, visibility and snow depth
- equipment status
- occasional equipment faults
- persistent local event log using `localStorage`
- responsive layout for desktop and mobile
- a few quiet lore hooks such as `WS-12`
- no server-side code and no user tracking

## Run locally

Just open `index.html` in a browser.

For the most consistent behavior, you can also serve the folder locally with any static HTTP server.

## Deploy to GitHub Pages

1. Create a new public repository, for example `weather-station-17`.
2. Upload all files from this project to the repository root.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select the `main` branch and `/ (root)`.
6. Save.

GitHub will publish the site automatically.

## Future ideas

Possible later additions:

- multiple weather stations
- radio frequency screen
- audio wind/static generated in-browser
- weather history graphs
- configurable station/lore data files
- modpack integration
- Minecraft map references to WS-17 / WS-12
- optional real-world weather mode as a separate feature

The standalone website should remain usable even if the Minecraft project never happens.

## Philosophy

Weather Station 17 should feel lonely, cold, and functional.

The system is not trying to scare the user.  
It simply continues doing its job.

## License

MIT
