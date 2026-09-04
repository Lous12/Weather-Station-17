(() => {
  "use strict";

  const screen = document.getElementById("screen");
  const form = document.getElementById("command-form");
  const input = document.getElementById("command-input");

  const STATE_KEY = "ws17_dos_state_v014";
  const LOG_KEY = "ws17_dos_log_v014";

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
    { id: "WS-03", area: "COASTAL SECTOR", status: "NO DATA" },
    { id: "WS-08", area: "MOUNTAIN RELAY", status: "ONLINE" },
    { id: "WS-12", area: "NORTHERN SECTOR", status: "OFFLINE" },
    { id: "WS-17", area: "LOCAL NODE", status: "ONLINE" },
    { id: "WS-21", area: "EASTERN RIDGE", status: "UNKNOWN" }
  ];

  const radioMessages = [
    "CARRIER DETECTED ON 91.7 MHz. CONTENT UNREADABLE.",
    "AUTOMATED BEACON RECEIVED FROM WS-08.",
    "WS-12 DID NOT RESPOND TO NETWORK POLL.",
    "NO VOICE TRAFFIC DETECTED.",
    "WEATHER PACKAGE QUEUED FOR TRANSMISSION.",
    "STATIC LEVEL ABOVE NORMAL."
  ];

  function loadJSON(key, fallback) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key));
      return parsed ?? fallback;
    } catch {
      return fallback;
    }
  }

  let state = { ...defaults, ...loadJSON(STATE_KEY, {}) };
  let eventLog = loadJSON(LOG_KEY, []);

  if (!Array.isArray(eventLog)) eventLog = [];

  const commandHistory = [];
  let historyIndex = 0;
  let booting = true;

  function saveState() {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  }

  function saveLog() {
    eventLog = eventLog.slice(-100);
    localStorage.setItem(LOG_KEY, JSON.stringify(eventLog));
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
    return date.toLocaleDateString("en-CA");
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

  async function typedLine(text, className = "", delay = 18) {
    const div = line("", className);
    for (let i = 0; i < text.length; i++) {
      div.textContent += text[i];
      screen.scrollTop = screen.scrollHeight;
      if (delay > 0) await sleep(delay);
    }
  }

  async function loadingLine(label, result = "OK", dots = 20) {
    const div = line(label);
    for (let i = 0; i < dots; i++) {
      await sleep(35 + Math.random() * 40);
      div.textContent += ".";
      screen.scrollTop = screen.scrollHeight;
    }
    await sleep(120 + Math.random() * 220);
    div.textContent += result;
  }

  function addEvent(message) {
    eventLog.push({
      time: nowTime(),
      message
    });
    saveLog();
  }

  function weatherDirection() {
    const idx = Math.floor(
      ((Date.now() / 240000) + state.wind / 2) % directions.length
    );
    return directions[idx];
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function evolveWeather() {
    const now = Date.now();
    const elapsedMinutes = Math.max(0.2, (now - state.lastWeatherUpdate) / 60000);
    const scale = Math.min(elapsedMinutes, 4);

    state.temperature = clamp(
      state.temperature + (Math.random() - 0.53) * 0.24 * scale,
      -46,
      -8
    );

    state.wind = clamp(
      state.wind + (Math.random() - 0.48) * 0.7 * scale,
      0.4,
      28
    );

    state.pressure = clamp(
      state.pressure + (Math.random() - 0.5) * 0.75 * scale,
      716,
      758
    );

    const pressureStorm = clamp((738 - state.pressure) / 15, 0, 1);
    const windStorm = clamp((state.wind - 10) / 13, 0, 1);
    const storm = clamp(pressureStorm * 0.65 + windStorm * 0.55, 0, 1);

    const targetVisibility = 8.5 - storm * 7.8;
    state.visibility = clamp(
      state.visibility +
      (targetVisibility - state.visibility) * 0.15 +
      (Math.random() - 0.5) * 0.18,
      0.15,
      12
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

  const randomEvents = [
    () => {
      state.radio = "DEGRADED";
      addEvent("RADIO LINK QUALITY BELOW NOMINAL THRESHOLD.");
    },
    () => {
      state.sensor = "NO RESPONSE";
      addEvent("EXT. SENSOR 03: NO RESPONSE.");
      setTimeout(() => {
        state.sensor = "ONLINE";
        addEvent("EXT. SENSOR 03: TELEMETRY RESTORED.");
        saveState();
      }, 20000);
    },
    () => addEvent("REMOTE NODE WS-12: HANDSHAKE FAILED."),
    () => addEvent("SUPPLY ROUTE STATUS: NO CURRENT TRAFFIC DATA."),
    () => addEvent("AUTOMATED WEATHER PACKAGE TRANSMITTED."),
    () => addEvent("MAINTENANCE REQUEST REMAINS UNACKNOWLEDGED."),
    () => addEvent(`WIND GUST RECORDED: ${(state.wind + 4.2).toFixed(1)} m/s.`)
  ];

  function maybeEvent() {
    if (Date.now() - state.lastEventAt < 45000) return;
    if (Math.random() > 0.2) return;

    const event = randomEvents[Math.floor(Math.random() * randomEvents.length)];
    event();
    state.lastEventAt = Date.now();
    saveState();
  }

  async function bootSequence() {
    booting = true;
    form.classList.add("hidden");
    input.disabled = true;

    await typedLine("AOS/17 AUTOMATED WEATHER TERMINAL", "bright", 10);
    await typedLine("Copyright (C) 2026 Lous12", "", 7);
    line("");

    await loadingLine("Checking memory", "OK", 25);
    await loadingLine("Loading observation package", "OK", 17);
    await loadingLine("Loading equipment monitor", "OK", 18);
    await loadingLine("Loading local event buffer", "OK", 16);
    await loadingLine("Initializing radio interface", "DEGRADED", 15);

    line("");
    await typedLine("Station node: WS-17", "", 10);
    await typedLine("Personnel detected: 0", "", 10);
    await typedLine("System ready.", "bright", 14);
    line("");
    await typedLine("Type HELP for available commands.", "dim", 8);
    line("");

    booting = false;
    input.disabled = false;
    form.classList.remove("hidden");
    input.focus();
  }

  function printHelp() {
    lines([
      "Available commands:",
      "",
      "  HELP      Show this command list",
      "  STATUS    Show station equipment status",
      "  WEATHER   Show current weather observation",
      "  NODES     Show known weather network nodes",
      "  RADIO     Check radio interface",
      "  LOG       Show the last 10 station events",
      "  CLS       Clear the terminal",
      "  ABOUT     Show terminal information",
      "",
      "Commands are not case-sensitive."
    ]);
  }

  function printStatus() {
    lines([
      "STATION STATUS",
      "----------------------------------------",
      `NODE              WS-17`,
      `DATE              ${nowDate()}`,
      `LOCAL TIME        ${nowTime()}`,
      `UPTIME            ${uptimeString()}`,
      `PERSONNEL         0`,
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

    nodes.forEach(node => {
      const id = node.id.padEnd(7);
      const area = node.area.padEnd(20);
      line(`${id} ${area} ${node.status}`);
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

    eventLog.slice(-10).forEach(entry => {
      line(`[${entry.time}] ${entry.message}`);
    });
  }

  function printAbout() {
    lines([
      "WEATHER STATION 17",
      "",
      "A fictional automated weather terminal.",
      "Local browser simulation. No backend connection.",
      "",
      "Project: Lous12",
      "Build:   0.1.4",
      "License: MIT"
    ]);
  }

  function execute(raw) {
    const trimmed = raw.trim();
    if (!trimmed) return;

    const command = trimmed.toUpperCase();

    line(`C:\\WS17>${trimmed}`, "bright");

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
    if (booting) return;

    const value = input.value;

    if (value.trim()) {
      commandHistory.push(value);
      historyIndex = commandHistory.length;
      execute(value);
    }

    input.value = "";
  });

  input.addEventListener("keydown", event => {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (commandHistory.length === 0) return;
      historyIndex = Math.max(0, historyIndex - 1);
      input.value = commandHistory[historyIndex] ?? "";
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (commandHistory.length === 0) return;
      historyIndex = Math.min(commandHistory.length, historyIndex + 1);
      input.value =
        historyIndex >= commandHistory.length
          ? ""
          : commandHistory[historyIndex];
    }
  });

  document.addEventListener("click", () => {
    if (!booting) input.focus();
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
