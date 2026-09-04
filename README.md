# Weather Station 17

DOS-style atmospheric browser terminal by **Lous12**.

## 0.1.6

This update adds the first small pseudo-filesystem.

### New commands

```text
DIR [path]
TYPE <file>
```

Examples:

```text
DIR
DIR SYSTEM
DIR NETWORK
DIR LOGS

TYPE README.TXT
TYPE STATION.TXT
TYPE SYSTEM\MAINT.TXT
TYPE NETWORK\NODES.TXT
TYPE LOGS\EVENTS.LOG
```

The filesystem is intentionally small. More files, directories and commands will be added gradually as the station lore develops.

### Other commands

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
