(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const STORAGE_KEY = "ws17_state_v1";
  const LOG_KEY = "ws17_log_v1";
  const SERVICE_DATE = new Date("2025-11-21T08:30:00");
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

  const defaultState = {
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

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return { ...defaultState, ...saved, startedAt: saved?.startedAt || Date.now() };
    } catch {
      return { ...defaultState };
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  let state = loadState();

  function loadLog() {
    try {
      const log = JSON.parse(localStorage.getItem(LOG_KEY));
      return Array.isArray(log) ? log.slice(-80) : [];
    } catch {
      return [];
    }
  }

  let logEntries = loadLog();

  function stamp(date = new Date()) {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    });
  }

  function addLog(message) {
    logEntries.push({ time: stamp(), message });
    logEntries = logEntries.slice(-80);
    localStorage.setItem(LOG_KEY, JSON.stringify(logEntries));
    renderLog();
  }

  function renderLog() {
    const el = $("log");
    el.innerHTML = "";
    [...logEntries].reverse().forEach((entry) => {
      const row = document.createElement("div");
      row.className = "log-entry";

      const time = document.createElement("span");
      time.className = "log-time";
      time.textContent = `[${entry.time}]`;

      const msg = document.createElement("span");
      msg.className = "log-msg";
      msg.textContent = entry.message;

      row.append(time, msg);
      el.appendChild(row);
    });
  }

  function setStatus(id, value) {
    const el = $(id);
    el.textContent = value;
    el.className =
      value === "ONLINE" ? "ok" :
      value === "DEGRADED" || value === "UNSTABLE" ? "degraded" :
      value === "OFFLINE" || value === "NO RESPONSE" ? "danger" : "";
  }

  function updateClock() {
    const now = new Date();
    $("date").textContent = now.toLocaleDateString("en-CA");
    $("clock").textContent = stamp(now);

    const elapsed = Math.max(0, Date.now() - state.startedAt);
    const totalSeconds = Math.floor(elapsed / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    $("uptime").textContent =
      `UP ${String(days).padStart(3, "0")}:` +
      `${String(hours).padStart(2, "0")}:` +
      `${String(minutes).padStart(2, "0")}:` +
      `${String(seconds).padStart(2, "0")}`;

    const serviceDays = Math.max(0, Math.floor((now - SERVICE_DATE) / 86400000));
    $("service-days").textContent = `${serviceDays} DAYS AGO`;
  }

  function evolveWeather() {
    const now = Date.now();
    const elapsedMinutes = Math.max(1, (now - state.lastWeatherUpdate) / 60000);
    const scale = Math.min(elapsedMinutes, 5);

    state.temperature = clamp(state.temperature + (Math.random() - 0.54) * 0.28 * scale, -46, -8);
    state.wind = clamp(state.wind + (Math.random() - 0.48) * 0.8 * scale, 0.4, 27);
    state.pressure = clamp(state.pressure + (Math.random() - 0.5) * 0.8 * scale, 716, 758);

    const stormPressure = clamp((738 - state.pressure) / 15, 0, 1);
    const stormWind = clamp((state.wind - 10) / 12, 0, 1);
    const storm = clamp(stormPressure * 0.65 + stormWind * 0.55, 0, 1);

    const targetVisibility = 8.5 - storm * 7.8;
    state.visibility = clamp(
      state.visibility + (targetVisibility - state.visibility) * 0.16 + (Math.random() - 0.5) * 0.25,
      0.15,
      12
    );

    if (state.temperature < -5 && storm > 0.35 && Math.random() < 0.08) {
      state.snow = clamp(state.snow + 1, 0, 220);
    }

    state.condition =
      storm > 0.78 ? "BLIZZARD" :
      storm > 0.52 ? "SNOW / WIND" :
      storm > 0.30 ? "UNSTABLE" :
      "STABLE";

    state.lastWeatherUpdate = now;
    saveState();
    renderWeather();
    updateAlert(storm);
  }

  function renderWeather() {
    $("temperature").textContent = state.temperature.toFixed(1);
    $("wind").textContent = state.wind.toFixed(1);
    $("pressure").textContent = Math.round(state.pressure);
    $("visibility").textContent = state.visibility.toFixed(1);
    $("snow").textContent = Math.round(state.snow);
    $("condition").textContent = state.condition;

    const directionIndex = Math.floor((Date.now() / 180000 + state.wind) % directions.length);
    $("wind-dir").textContent = directions[directionIndex];

    setStatus("power", state.power);
    setStatus("heating", state.heating);
    setStatus("radio", state.radio);
    setStatus("antenna", state.antenna);
    setStatus("sensor", state.sensor);
  }

  function updateAlert(storm) {
    const panel = $("alert-panel");
    panel.classList.remove("severe");

    if (storm > 0.78) {
      $("alert-level").textContent = "WARNING";
      $("alert-level").className = "danger";
      $("alert-text").textContent =
        "BLIZZARD CONDITIONS. VISIBILITY SEVERELY REDUCED. EXTERNAL TRAVEL NOT ADVISED.";
      panel.classList.add("severe");
    } else if (state.temperature < -36) {
      $("alert-level").textContent = "WARNING";
      $("alert-level").className = "danger";
      $("alert-text").textContent =
        "EXTREME COLD. OUTDOOR EXPOSURE LIMITS EXCEEDED.";
    } else if (storm > 0.48) {
      $("alert-level").textContent = "ADVISORY";
      $("alert-level").className = "degraded";
      $("alert-text").textContent =
        "WEATHER FRONT APPROACHING. WIND SPEED INCREASING. RADIO QUALITY MAY DEGRADE.";
    } else {
      $("alert-level").textContent = "ADVISORY";
      $("alert-level").className = "";
      $("alert-text").textContent =
        "COLD WEATHER CONDITIONS. AUTOMATED SYSTEMS NOMINAL.";
    }
  }

  const events = [
    {
      weight: 4,
      run() {
        state.radio = "DEGRADED";
        addLog("RADIO LINK QUALITY BELOW NOMINAL THRESHOLD.");
      }
    },
    {
      weight: 2,
      run() {
        state.radio = "OFFLINE";
        addLog("RADIO LINK LOST. AUTOMATIC RECONNECT SEQUENCE STARTED.");
        window.setTimeout(() => {
          state.radio = "DEGRADED";
          addLog("RADIO CARRIER RECOVERED. DATA LINK REMAINS DEGRADED.");
          renderWeather();
          saveState();
        }, 18000);
      }
    },
    {
      weight: 2,
      run() {
        state.sensor = "NO RESPONSE";
        addLog("EXTERNAL SENSOR 03: NO RESPONSE.");
        window.setTimeout(() => {
          state.sensor = "ONLINE";
          addLog("EXTERNAL SENSOR 03: TELEMETRY RESTORED.");
          renderWeather();
          saveState();
        }, 24000);
      }
    },
    {
      weight: 3,
      run() {
        addLog("AUTOMATED WEATHER OBSERVATION PACKAGE TRANSMITTED.");
      }
    },
    {
      weight: 2,
      run() {
        addLog("REMOTE NODE WS-12: HANDSHAKE FAILED.");
      }
    },
    {
      weight: 2,
      run() {
        addLog("SUPPLY ROUTE STATUS: NO CURRENT TRAFFIC DATA.");
      }
    },
    {
      weight: 1,
      run() {
        addLog("MAINTENANCE REQUEST REMAINS UNACKNOWLEDGED.");
      }
    },
    {
      weight: 3,
      run() {
        addLog(`WIND GUST RECORDED: ${Math.max(state.wind + 4, 8).toFixed(1)} m/s.`);
      }
    }
  ];

  function weightedEvent() {
    const pool = [];
    for (const event of events) {
      for (let i = 0; i < event.weight; i++) pool.push(event);
    }
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function maybeCreateEvent() {
    const minDelay = 45000;
    if (Date.now() - state.lastEventAt < minDelay) return;

    if (Math.random() < 0.22) {
      weightedEvent().run();
      state.lastEventAt = Date.now();
      saveState();
      renderWeather();
    }
  }

  $("clear-log").addEventListener("click", () => {
    logEntries = [];
    localStorage.removeItem(LOG_KEY);
    addLog("LOCAL EVENT BUFFER CLEARED.");
  });

  if (logEntries.length === 0) {
    addLog("AUTOMATED OBSERVATION SYSTEM INITIALIZED.");
    addLog("NO ACTIVE PERSONNEL SESSION DETECTED.");
    addLog("REMOTE NODE WS-12: STATUS UNKNOWN.");
  } else {
    addLog("LOCAL TERMINAL SESSION OPENED.");
  }

  renderLog();
  renderWeather();
  updateClock();

  setInterval(updateClock, 1000);
  setInterval(evolveWeather, 12000);
  setInterval(maybeCreateEvent, 7000);
})();
