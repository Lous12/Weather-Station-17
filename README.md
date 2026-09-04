# Weather Station 17

DOS-style atmospheric browser terminal by **Lous12**.

## 0.1.5

Bugfix release.

- fixed command input becoming unusable after boot
- terminal now survives browsers that block `localStorage` for local files
- input uses the browser's native caret for more reliable typing
- boot sequence always unlocks the prompt, even if an animation step fails

Commands:

```text
HELP
STATUS
WEATHER
NODES
RADIO
LOG
CLS
ABOUT
```

## GitHub Pages

Upload the files to the repository root and enable:

```text
Settings → Pages → Deploy from a branch → main → /(root)
```

## License

MIT
