"use strict";

const API_KEY = "f6698c6bc3e491ae5c183fe57e2a6522";
const STORAGE_KEY = "weather-dashboard.cities";

const el = {
  form: document.getElementById("city-search-form"),
  input: document.getElementById("city"),
  status: document.getElementById("status"),

  searchedCity: document.getElementById("searched-city"),
  currentMeta: document.getElementById("current-meta"),
  currentContainer: document.getElementById("current-weather-container"),

  forecastTitle: document.getElementById("forecast"),
  forecastContainer: document.getElementById("fiveday-container"),

  history: document.getElementById("past-search-buttons"),
  clearHistoryBtn: document.getElementById("clearHistoryBtn"),

  useLocationBtn: document.getElementById("useLocationBtn"),
};

const state = {
  units: "imperial", // "metric"
  cities: [],
  lastCity: "", // keep track of what's displayed
};

function setStatus(msg) {
  el.status.textContent = msg || "";
}

function unitLabel() {
  return state.units === "metric" ? "°C" : "°F";
}

function speedLabel() {
  return state.units === "metric" ? "m/s" : "mph";
}

/**
 * Date formatting helpers
 * Note: These format using the user's locale/timezone. Forecast selection is city-timezone aware.
 */
function formatDateFromUnix(unixSeconds) {
  const d = new Date(unixSeconds * 1000);
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

function formatDayShort(unixSeconds) {
  const d = new Date(unixSeconds * 1000);
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(d);
}

function clearWeatherDisplay() {
  state.lastCity = "";
  el.searchedCity.textContent = "Search a city to begin";
  el.currentMeta.innerHTML = "";
  el.currentContainer.innerHTML = "";
  el.forecastContainer.innerHTML = "";
  el.forecastTitle.textContent = "5-Day Forecast";
}

/**
 * Storage
 */
function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    state.cities = Array.isArray(parsed) ? parsed : [];
  } catch {
    state.cities = [];
  }
  renderHistory();
}

function saveHistory() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.cities));
}

function addToHistory(city) {
  const normalized = city.trim();
  if (!normalized) return;

  // remove duplicates (case-insensitive)
  state.cities = state.cities.filter(
    (c) => c.toLowerCase() !== normalized.toLowerCase()
  );

  state.cities.unshift(normalized);
  state.cities = state.cities.slice(0, 10);
  saveHistory();
  renderHistory();
}

function renderHistory() {
  el.history.innerHTML = "";

  if (state.cities.length === 0) {
    const empty = document.createElement("div");
    empty.className = "status";
    empty.textContent = "No recent searches yet.";
    el.history.appendChild(empty);
    return;
  }

  state.cities.forEach((city) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "history-btn";
    btn.dataset.city = city;
    btn.textContent = city;
    el.history.appendChild(btn);
  });
}

/**
 * Fetch utilities
 */
async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data && data.message) msg = data.message;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

async function getCurrentWeather(city) {
  const url = new URL("https://api.openweathermap.org/data/2.5/weather");
  url.searchParams.set("q", city);
  url.searchParams.set("appid", API_KEY);
  url.searchParams.set("units", state.units);
  return fetchJSON(url.toString());
}

async function getForecast(city) {
  const url = new URL("https://api.openweathermap.org/data/2.5/forecast");
  url.searchParams.set("q", city);
  url.searchParams.set("appid", API_KEY);
  url.searchParams.set("units", state.units);
  return fetchJSON(url.toString());
}

/**
 * Render current
 */
function renderCurrent(data) {
  el.currentContainer.innerHTML = "";
  el.currentMeta.innerHTML = "";

  const cityName = `${data.name}, ${data.sys?.country || ""}`.trim();
  state.lastCity = data.name || cityName || "";

  el.searchedCity.textContent = cityName;

  const dateSpan = document.createElement("span");
  dateSpan.textContent = formatDateFromUnix(data.dt);

  const icon = document.createElement("img");
  icon.className = "weather-icon";
  icon.alt = data.weather?.[0]?.description
    ? `Weather icon: ${data.weather[0].description}`
    : "Weather icon";
  icon.src = `https://openweathermap.org/img/wn/${data.weather?.[0]?.icon}@2x.png`;

  el.currentMeta.appendChild(dateSpan);
  el.currentMeta.appendChild(icon);

  const metrics = [
    {
      label: "Temperature",
      value: `${Math.round(data.main.temp)} ${unitLabel()}`,
    },
    { label: "Humidity", value: `${data.main.humidity}%` },
    { label: "Wind", value: `${Math.round(data.wind.speed)} ${speedLabel()}` },
  ];

  metrics.forEach((m) => {
    const card = document.createElement("div");
    card.className = "metric";

    const l = document.createElement("div");
    l.className = "metric-label";
    l.textContent = m.label;

    const v = document.createElement("div");
    v.className = "metric-value";
    v.textContent = m.value;

    card.appendChild(l);
    card.appendChild(v);
    el.currentContainer.appendChild(card);
  });
}

/**
 * Forecast selection (timezone-aware) — returns next 5 days excluding today.
 */
function pickFiveDays(list, timezoneOffsetSeconds = 0) {
  const toCityLocalDateKey = (dtSeconds) => {
    const cityLocalMs = (dtSeconds + timezoneOffsetSeconds) * 1000;
    const d = new Date(cityLocalMs);
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const toCityLocalHour = (dtSeconds) => {
    const cityLocalMs = (dtSeconds + timezoneOffsetSeconds) * 1000;
    return new Date(cityLocalMs).getUTCHours();
  };

  const todayKey = toCityLocalDateKey(Math.floor(Date.now() / 1000));

  const byDay = new Map();
  list.forEach((item) => {
    const key = toCityLocalDateKey(item.dt);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key).push(item);
  });

  const upcomingKeys = Array.from(byDay.keys())
    .filter((k) => k > todayKey)
    .sort()
    .slice(0, 5);

  return upcomingKeys
    .map((key) => {
      const entries = byDay.get(key) || [];
      if (entries.length === 0) return null;

      let best = entries[0];
      let bestDiff = Infinity;

      entries.forEach((e) => {
        const hour = toCityLocalHour(e.dt);
        const diff = Math.abs(hour - 12);
        if (diff < bestDiff) {
          best = e;
          bestDiff = diff;
        }
      });

      return best;
    })
    .filter(Boolean);
}

/**
 * Render forecast
 */
function renderForecast(data) {
  el.forecastTitle.textContent = "5-Day Forecast";
  el.forecastContainer.innerHTML = "";

  const tz = data.city?.timezone ?? 0;
  const picked = pickFiveDays(data.list || [], tz);

  if (picked.length === 0) {
    el.forecastContainer.textContent = "No forecast data available.";
    return;
  }

  picked.forEach((d) => {
    const card = document.createElement("div");
    card.className = "forecast-card";

    const date = document.createElement("div");
    date.className = "forecast-date";
    date.textContent = formatDayShort(d.dt);

    const icon = document.createElement("img");
    icon.className = "weather-icon";
    icon.alt = d.weather?.[0]?.description
      ? `Weather icon: ${d.weather[0].description}`
      : "Weather icon";
    icon.src = `https://openweathermap.org/img/wn/${d.weather?.[0]?.icon}@2x.png`;

    const tempRow = document.createElement("div");
    tempRow.className = "forecast-row";
    tempRow.innerHTML = `<span>Temp</span><span>${Math.round(
      d.main.temp
    )} ${unitLabel()}</span>`;

    const humRow = document.createElement("div");
    humRow.className = "forecast-row";
    humRow.innerHTML = `<span>Humidity</span><span>${d.main.humidity}%</span>`;

    card.appendChild(date);
    card.appendChild(icon);
    card.appendChild(tempRow);
    card.appendChild(humRow);

    el.forecastContainer.appendChild(card);
  });
}

/**
 * Search flow
 */
async function searchCity(city) {
  const q = city.trim();
  if (!q) return;

  setStatus("Loading weather…");
  try {
    const [current, forecast] = await Promise.all([
      getCurrentWeather(q),
      getForecast(q),
    ]);

    renderCurrent(current);
    renderForecast(forecast);
    addToHistory(q);
    setStatus("");
  } catch (err) {
    setStatus(`Error: ${err.message}`);
  }
}

/**
 * Reverse geocode for "Use my location"
 */
async function reverseGeocode(lat, lon) {
  const url = new URL("https://api.openweathermap.org/geo/1.0/reverse");
  url.searchParams.set("lat", lat);
  url.searchParams.set("lon", lon);
  url.searchParams.set("limit", "1");
  url.searchParams.set("appid", API_KEY);

  const data = await fetchJSON(url.toString());
  const city = data?.[0]?.name;
  if (!city) throw new Error("Could not determine city from location.");
  return city;
}

async function useMyLocation() {
  if (!navigator.geolocation) {
    setStatus("Geolocation is not supported in this browser.");
    return;
  }

  setStatus("Requesting location…");
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      try {
        const { latitude, longitude } = pos.coords;
        setStatus("Finding your city…");
        const city = await reverseGeocode(latitude, longitude);
        await searchCity(city);
      } catch (err) {
        setStatus(`Error: ${err.message}`);
      }
    },
    () => setStatus("Location permission denied."),
    { enableHighAccuracy: false, timeout: 8000 }
  );
}

/**
 * Units toggle
 */
function setUnits(units) {
  if (units !== "imperial" && units !== "metric") return;
  state.units = units;

  document.querySelectorAll(".chip").forEach((chip) => {
    chip.classList.toggle("chip-active", chip.dataset.units === units);
  });

  // refresh currently displayed city if there is one
  if (state.lastCity) {
    searchCity(state.lastCity);
  }
}

/**
 * Event listeners
 */
el.form.addEventListener("submit", (e) => {
  e.preventDefault();
  const city = el.input.value.trim();
  if (!city) {
    setStatus("Please enter a city.");
    return;
  }
  el.input.value = "";
  searchCity(city);
});

el.history.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-city]");
  if (!btn) return;
  searchCity(btn.dataset.city);
});

el.clearHistoryBtn.addEventListener("click", () => {
  // Clear stored history
  state.cities = [];
  saveHistory();
  renderHistory();

  // Clear UI results as well
  clearWeatherDisplay();

  setStatus("Search history cleared.");
  setTimeout(() => setStatus(""), 1200);
});

el.useLocationBtn.addEventListener("click", useMyLocation);

document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => setUnits(chip.dataset.units));
});

// Init
loadHistory();
clearWeatherDisplay();
