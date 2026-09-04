(() => {
  "use strict";

  const screen = document.getElementById("screen");
  const form = document.getElementById("command-form");
  const input = document.getElementById("command-input");

  const STATE_KEY = "ws17_dos_state_v016";
  const LOG_KEY = "ws17_dos_log_v016";

  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

  const defaults = {
    temperature: -27.8,
    wind: 11.4,
    pressure: 742,
    visibility: 3.2,
    snow: 64,
    condition: "STABLE",
    power: "ONLINE",
    heating: "ONLINE",
    radio: "DEGRADED",
    antenna: "ONLINE",
    sensor: "ONLINE",
    startedAt: Date.now(),
    lastWeatherUpdate: Date.now(),
    lastEventAt: Date.now()
  };

  const nodes = [
    ["WS-03", "COASTAL SECTOR",   "NO DATA"],
    ["WS-08", "MOUNTAIN RELAY",  "ONLINE"],
    ["WS-12", "NORTHERN SECTOR", "OFFLINE"],
    ["WS-17", "LOCAL NODE",      "ONLINE"],
    ["WS-21", "EASTERN RIDGE",   "UNKNOWN"]
  ];

  const radioMessages = [
    "CARRIER DETECTED ON 91.7 MHz. CONTENT UNREADABLE.",
    "AUTOMATED BEACON RECEIVED FROM WS-08.",
    "WS-12 DID NOT RESPOND TO NETWORK POLL.",
    "NO VOICE TRAFFIC DETECTED.",
    "WEATHER PACKAGE QUEUED FOR TRANSMISSION.",
    "STATIC LEVEL ABOVE NORMAL."
  ];

  const fileSystem = {
    "C:\\WS17": {
      type: "dir",
      entries: [
        { name: "SYSTEM", type: "dir" },
        { name: "NETWORK", type: "dir" },
        { name: "LOGS", type: "dir" },
        { name: "README.TXT", type: "file", size: 734 },
        { name: "STATION.TXT", type: "file", size: 468 }
      ]
    },

    "C:\\WS17\\SYSTEM": {
      type: "dir",
      entries: [
        { name: "MAINT.TXT", type: "file", size: 401 },
        { name: "BOOT.LOG", type: "file", size: 286 }
      ]
    },

    "C:\\WS17\\NETWORK": {
      type: "dir",
      entries: [
        { name: "NODES.TXT", type: "file", size: 512 },
        { name: "RADIO.TXT", type: "file", size: 394 }
      ]
    },

    "C:\\WS17\\LOGS": {
      type: "dir",
      entries: [
        { name: "EVENTS.LOG", type: "dynamic", size: 0 }
      ]
    }
  };

  const textFiles = {
    "C:\\WS17\\README.TXT": [
      "AOS/17 AUTOMATED WEATHER TERMINAL",
      "",
      "This terminal provides local weather observations,",
      "equipment state and limited access to network data.",
      "",
      "Use HELP to list available commands.",
      "",
      "The station is configured for unattended operation.",
      "Manual maintenance remains overdue."
    ],

    "C:\\WS17\\STATION.TXT": [
      "STATION IDENTIFICATION",
      "----------------------",
      "NODE:       WS-17",
      "TYPE:       AUTOMATED WEATHER OBSERVATION STATION",
      "SECTOR:     LOCAL NODE",
      "PERSONNEL:  0",
      "",
      "Remote administration link is unavailable.",
      "Local terminal access remains enabled."
    ],

    "C:\\WS17\\SYSTEM\\MAINT.TXT": [
      "MAINTENANCE RECORD",
      "------------------",
      "LAST SERVICE: 287 DAYS AGO",
      "CURRENT STATUS: OVERDUE",
      "",
      "Scheduled inspection was not completed.",
      "No technician acknowledgement was received.",
      "",
      "Automatic systems remain within operational limits."
    ],

    "C:\\WS17\\SYSTEM\\BOOT.LOG": [
      "AOS/17 BOOT RECORD",
      "------------------",
      "OBSERVATION PACKAGE........OK",
      "EQUIPMENT MONITOR..........OK",
      "LOCAL EVENT BUFFER.........OK",
      "RADIO INTERFACE............DEGRADED",
      "",
      "SYSTEM READY."
    ],

    "C:\\WS17\\NETWORK\\NODES.TXT": [
      "WEATHER NETWORK NODE TABLE",
      "--------------------------",
      "WS-03  COASTAL SECTOR     NO DATA",
      "WS-08  MOUNTAIN RELAY     ONLINE",
      "WS-12  NORTHERN SECTOR    OFFLINE",
      "WS-17  LOCAL NODE         ONLINE",
      "WS-21  EASTERN RIDGE      UNKNOWN",
      "",
      "LAST FULL NETWORK SYNCHRONIZATION: UNKNOWN"
    ],

    "C:\\WS17\\NETWORK\\RADIO.TXT": [
      "RADIO CONFIGURATION",
      "-------------------",
      "PRIMARY CHANNEL: 91.7 MHz",
      "BACKUP CHANNEL:  104.3 MHz",
      "ENCRYPTION:      NONE",
      "LINK STATE:      DEGRADED",
      "",
      "Automated network polling remains enabled."
    ]
  };

  function normalizePath(rawPath = "") {
    let path = rawPath.trim().replace(/\//g, "\\").toUpperCase();

    if (!path || path === "." || path === ".\\") {
      return "C:\\WS17";
    }

    if (path.startsWith("C:\\")) {
      return path.replace(/\\+$/, "");
    }

    if (path.startsWith("\\")) {
      return ("C:\\WS17" + path).replace(/\\+$/, "");
    }

    return ("C:\\WS17\\" + path).replace(/\\+$/, "");
  }

  function printDirectory(rawPath = "") {
    const path = normalizePath(rawPath);
    const dir = fileSystem[path];

    if (!dir || dir.type !== "dir") {
      line("File not found.");
      return;
    }

    line(" Volume in drive C is WS17");
    line(` Directory of ${path}`);
    line("");

    let fileCount = 0;
    let dirCount = 0;
    let totalBytes = 0;

    dir.entries.forEach(entry => {
      if (entry.type === "dir") {
        dirCount += 1;
        line(`${"<DIR>".padStart(10)}  ${entry.name}`);
      } else {
        fileCount += 1;
        const size = entry.type === "dynamic"
          ? Math.max(1, eventLog.length * 64)
          : entry.size;
        totalBytes += size;
        line(`${String(size).padStart(10)}  ${entry.name}`);
      }
    });

    line("");
    line(`${String(fileCount).padStart(8)} File(s) ${String(totalBytes).padStart(10)} bytes`);
    line(`${String(dirCount).padStart(8)} Dir(s)`);
  }

  function printFile(rawPath) {
    if (!rawPath || !rawPath.trim()) {
      line("Required parameter missing.");
      return;
    }

    const path = normalizePath(rawPath);

    if (path === "C:\\WS17\\LOGS\\EVENTS.LOG") {
      if (eventLog.length === 0) {
        line("EVENTS.LOG is empty.");
        return;
      }

      eventLog.forEach(entry => {
        line(`[${entry.time}] ${entry.message}`);
      });
      return;
    }

    const content = textFiles[path];

    if (!content) {
      if (fileSystem[path]?.type === "dir") {
        line("Access denied.");
      } else {
        line("File not found.");
      }
      return;
    }

    lines(content);
  }

  // Works on GitHub Pages, and fails safely if localStorage is blocked
  // when the HTML file is opened directly from disk.
  function storageGet(key, fallback) {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function storageSet(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage is optional. Terminal must continue working without it.
    }
  }

  let state = { ...defaults, ...storageGet(STATE_KEY, {}) };
  let eventLog = storageGet(LOG_KEY, []);
  if (!Array.isArray(eventLog)) eventLog = [];

  let booting = true;
  const commandHistory = [];
  let historyIndex = 0;

  function saveState() {
    storageSet(STATE_KEY, state);
  }

  function saveLog() {
    eventLog = eventLog.slice(-100);
    storageSet(LOG_KEY, eventLog);
  }

  function nowTime(date = new Date()) {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    });
  }

  function nowDate(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function uptimeString() {
    const seconds = Math.max(0, Math.floor((Date.now() - state.startedAt) / 1000));
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return (
      String(days).padStart(3, "0") + ":" +
      String(hours).padStart(2, "0") + ":" +
      String(minutes).padStart(2, "0") + ":" +
      String(secs).padStart(2, "0")
    );
  }

  function line(text = "", className = "") {
    const div = document.createElement("div");
    div.className = `line ${className}`.trim();
    div.textContent = text;
    screen.appendChild(div);
    screen.scrollTop = screen.scrollHeight;
    return div;
  }

  function lines(items, className = "") {
    items.forEach(item => line(item, className));
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function typedLine(text, className = "", delay = 12) {
    const div = line("", className);
    for (const char of text) {
      div.textContent += char;
      screen.scrollTop = screen.scrollHeight;
      if (delay) await sleep(delay);
    }
  }

  async function loadingLine(label, result, dots) {
    const div = line(label);
    for (let i = 0; i < dots; i++) {
      await sleep(24 + Math.random() * 28);
      div.textContent += ".";
    }
    await sleep(80 + Math.random() * 120);
    div.textContent += result;
    screen.scrollTop = screen.scrollHeight;
  }

  function addEvent(message) {
    eventLog.push({ time: nowTime(), message });
    saveLog();
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function weatherDirection() {
    const idx = Math.floor(((Date.now() / 240000) + state.wind / 2) % directions.length);
    return directions[idx];
  }

  function evolveWeather() {
    const now = Date.now();
    const elapsedMinutes = Math.max(0.2, (now - state.lastWeatherUpdate) / 60000);
    const scale = Math.min(elapsedMinutes, 4);

    state.temperature = clamp(
      state.temperature + (Math.random() - 0.53) * 0.24 * scale,
      -46, -8
    );
    state.wind = clamp(
      state.wind + (Math.random() - 0.48) * 0.7 * scale,
      0.4, 28
    );
    state.pressure = clamp(
      state.pressure + (Math.random() - 0.5) * 0.75 * scale,
      716, 758
    );

    const pressureStorm = clamp((738 - state.pressure) / 15, 0, 1);
    const windStorm = clamp((state.wind - 10) / 13, 0, 1);
    const storm = clamp(pressureStorm * 0.65 + windStorm * 0.55, 0, 1);

    const targetVisibility = 8.5 - storm * 7.8;
    state.visibility = clamp(
      state.visibility +
      (targetVisibility - state.visibility) * 0.15 +
      (Math.random() - 0.5) * 0.18,
      0.15, 12
    );

    if (state.temperature < -5 && storm > 0.4 && Math.random() < 0.06) {
      state.snow = clamp(state.snow + 1, 0, 220);
    }

    state.condition =
      storm > 0.78 ? "BLIZZARD" :
      storm > 0.52 ? "SNOW/WIND" :
      storm > 0.30 ? "UNSTABLE" :
      "STABLE";

    state.lastWeatherUpdate = now;
    saveState();
  }

  function maybeEvent() {
    if (Date.now() - state.lastEventAt < 45000 || Math.random() > 0.2) return;

    const events = [
      () => {
        state.radio = "DEGRADED";
        addEvent("RADIO LINK QUALITY BELOW NOMINAL THRESHOLD.");
      },
      () => addEvent("REMOTE NODE WS-12: HANDSHAKE FAILED."),
      () => addEvent("SUPPLY ROUTE STATUS: NO CURRENT TRAFFIC DATA."),
      () => addEvent("AUTOMATED WEATHER PACKAGE TRANSMITTED."),
      () => addEvent("MAINTENANCE REQUEST REMAINS UNACKNOWLEDGED."),
      () => addEvent(`WIND GUST RECORDED: ${(state.wind + 4.2).toFixed(1)} m/s.`)
    ];

    events[Math.floor(Math.random() * events.length)]();
    state.lastEventAt = Date.now();
    saveState();
  }

  function unlockInput() {
    booting = false;
    input.readOnly = false;
    form.classList.remove("boot-locked");
    input.focus();
  }

  async function bootSequence() {
    screen.innerHTML = "";

    try {
      await typedLine("AOS/17 AUTOMATED WEATHER TERMINAL", "bright", 8);
      await typedLine("Copyright (C) 2026 Lous12", "", 5);
      line("");

      await loadingLine("Checking memory", "OK", 25);
      await loadingLine("Loading observation package", "OK", 17);
      await loadingLine("Loading equipment monitor", "OK", 18);
      await loadingLine("Loading local event buffer", "OK", 16);
      await loadingLine("Mounting local filesystem", "OK", 18);
      await loadingLine("Initializing radio interface", "DEGRADED", 15);

      line("");
      await typedLine("Station node: WS-17", "", 7);
      await typedLine("Personnel detected: 0", "", 7);
      await typedLine("System ready.", "bright", 9);
      line("");
      await typedLine("Type HELP for available commands.", "dim", 5);
      line("");
    } finally {
      // Even if one boot animation step fails, the console is still usable.
      unlockInput();
    }
  }

  function printHelp() {
    lines([
      "Available commands:",
      "",
      "  HELP           Show this command list",
      "  STATUS         Show station equipment status",
      "  WEATHER        Show current weather observation",
      "  NODES          Show known weather network nodes",
      "  RADIO          Check radio interface",
      "  LOG            Show the last 10 station events",
      "  DIR [path]     List files and directories",
      "  TYPE <file>    Display a text file",
      "  CLS            Clear the terminal",
      "  ABOUT          Show terminal information",
      "",
      "Examples:",
      "  DIR",
      "  DIR NETWORK",
      "  TYPE README.TXT",
      "  TYPE SYSTEM\\MAINT.TXT",
      "",
      "Use Up/Down arrows for command history."
    ]);
  }

  function printStatus() {
    lines([
      "STATION STATUS",
      "----------------------------------------",
      "NODE              WS-17",
      `DATE              ${nowDate()}`,
      `LOCAL TIME        ${nowTime()}`,
      `UPTIME            ${uptimeString()}`,
      "PERSONNEL         0",
      "",
      `PRIMARY POWER     ${state.power}`,
      `HEATING           ${state.heating}`,
      `RADIO LINK        ${state.radio}`,
      `MAIN ANTENNA      ${state.antenna}`,
      `EXT. SENSOR 03    ${state.sensor}`,
      "",
      "LAST SERVICE      287 DAYS AGO",
      "MAINTENANCE       OVERDUE"
    ]);
  }

  function printWeather() {
    evolveWeather();
    lines([
      "CURRENT OBSERVATION",
      "----------------------------------------",
      `AIR TEMPERATURE   ${state.temperature.toFixed(1)} C`,
      `WIND              ${weatherDirection()} ${state.wind.toFixed(1)} m/s`,
      `PRESSURE          ${Math.round(state.pressure)} mmHg`,
      `VISIBILITY        ${state.visibility.toFixed(1)} km`,
      `SNOW DEPTH        ${Math.round(state.snow)} cm`,
      `CONDITION         ${state.condition}`
    ]);
  }

  function printNodes() {
    line("KNOWN NETWORK NODES");
    line("----------------------------------------");
    nodes.forEach(([id, area, status]) => {
      line(`${id.padEnd(7)} ${area.padEnd(20)} ${status}`);
    });
    line("");
    line("Network table last synchronized: UNKNOWN", "dim");
  }

  function printRadio() {
    const msg = radioMessages[Math.floor(Math.random() * radioMessages.length)];
    lines([
      "RADIO INTERFACE",
      "----------------------------------------",
      `LINK STATUS       ${state.radio}`,
      "PRIMARY CHANNEL   91.7 MHz",
      "BACKUP CHANNEL    104.3 MHz",
      "ENCRYPTION        NONE",
      "",
      msg
    ]);
    addEvent(`RADIO QUERY: ${msg}`);
  }

  function printLog() {
    if (eventLog.length === 0) {
      line("No events recorded.");
      return;
    }

    line("LAST 10 EVENTS");
    line("----------------------------------------");
    eventLog.slice(-10).forEach(entry => line(`[${entry.time}] ${entry.message}`));
  }

  function printAbout() {
    lines([
      "WEATHER STATION 17",
      "",
      "A fictional automated weather terminal.",
      "Local browser simulation. No backend connection.",
      "",
      "Project: Lous12",
      "Build:   0.1.6",
      "License: MIT"
    ]);
  }

  function execute(raw) {
    const trimmed = raw.trim();
    if (!trimmed) return;

    line(`C:\\WS17>${trimmed}`, "bright");

    const firstSpace = trimmed.indexOf(" ");
    const command = (
      firstSpace === -1 ? trimmed : trimmed.slice(0, firstSpace)
    ).toUpperCase();
    const argument = firstSpace === -1 ? "" : trimmed.slice(firstSpace + 1).trim();

    switch (command) {
      case "HELP":
        printHelp();
        break;

      case "STATUS":
        printStatus();
        break;

      case "WEATHER":
        printWeather();
        break;

      case "NODES":
        printNodes();
        break;

      case "RADIO":
        printRadio();
        break;

      case "LOG":
        printLog();
        break;

      case "DIR":
        printDirectory(argument);
        break;

      case "TYPE":
        printFile(argument);
        break;

      case "CLS":
      case "CLEAR":
        screen.innerHTML = "";
        break;

      case "ABOUT":
        printAbout();
        break;

      default:
        line(`Bad command or file name: ${trimmed}`);
        line("Type HELP for available commands.");
        break;
    }

    line("");
  }

  form.addEventListener("submit", event => {
    event.preventDefault();
    if (booting || input.readOnly) return;

    const value = input.value;
    if (value.trim()) {
      commandHistory.push(value);
      historyIndex = commandHistory.length;
      execute(value);
    }
    input.value = "";
    input.focus();
  });

  input.addEventListener("keydown", event => {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!commandHistory.length) return;
      historyIndex = Math.max(0, historyIndex - 1);
      input.value = commandHistory[historyIndex] || "";
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!commandHistory.length) return;
      historyIndex = Math.min(commandHistory.length, historyIndex + 1);
      input.value = historyIndex >= commandHistory.length
        ? ""
        : commandHistory[historyIndex];
    }
  });

  document.addEventListener("pointerdown", () => {
    if (!booting && !input.readOnly) input.focus();
  });

  if (eventLog.length === 0) {
    addEvent("AUTOMATED OBSERVATION SYSTEM INITIALIZED.");
    addEvent("NO ACTIVE PERSONNEL SESSION DETECTED.");
    addEvent("REMOTE NODE WS-12: STATUS UNKNOWN.");
  }

  setInterval(evolveWeather, 15000);
  setInterval(maybeEvent, 8000);

  bootSequence();
})();
