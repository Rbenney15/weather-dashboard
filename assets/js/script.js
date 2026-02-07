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
};

function setStatus(msg) {
  el.status.textContent = msg || "";
}

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

function unitLabel() {
  return state.units === "metric" ? "°C" : "°F";
}

function speedLabel() {
  return state.units === "metric" ? "m/s" : "mph";
}

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
  state.cities = state.cities.slice(0, 10); // keep top 10
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

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) {
    // Try to read message from API
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

function renderCurrent(data) {
  el.currentContainer.innerHTML = "";
  el.currentMeta.innerHTML = "";

  const cityName = `${data.name}, ${data.sys?.country || ""}`.trim();
  el.searchedCity.textContent = cityName;

  // date + icon
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
 * Build a true “daily” 5-day forecast from 3-hour list:
 * - pick the forecast closest to 12:00 local time each day
 */
function pickFiveDays(list) {
  // Group by day (YYYY-MM-DD in the city's local time offset)
  const byDay = new Map();

  list.forEach((item) => {
    const d = new Date(item.dt * 1000);
    const key = d.toISOString().slice(0, 10);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key).push(item);
  });

  // For each day, choose the entry closest to 12:00
  const days = Array.from(byDay.keys()).slice(0, 6); // includes today; we'll drop today below
  const chosen = [];

  days.forEach((dayKey) => {
    const entries = byDay.get(dayKey) || [];
    let best = entries[0];
    let bestDiff = Infinity;

    entries.forEach((e) => {
      const hour = new Date(e.dt * 1000).getHours();
      const diff = Math.abs(hour - 12);
      if (diff < bestDiff) {
        best = e;
        bestDiff = diff;
      }
    });

    if (best) chosen.push(best);
  });

  // Drop "today" if present so we show upcoming 5 days
  // If you want to include today, remove this slice.
  return chosen.slice(1, 6);
}

function renderForecast(data) {
  el.forecastTitle.textContent = "5-Day Forecast";
  el.forecastContainer.innerHTML = "";

  const picked = pickFiveDays(data.list || []);
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

async function searchCity(city) {
  setStatus("Loading weather…");
  try {
    const [current, forecast] = await Promise.all([
      getCurrentWeather(city),
      getForecast(city),
    ]);

    renderCurrent(current);
    renderForecast(forecast);
    addToHistory(city);
    setStatus("");
  } catch (err) {
    setStatus(`Error: ${err.message}`);
  }
}

/**
 * Geo search: translate coords -> city via OpenWeather reverse geocoding
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
    () => {
      setStatus("Location permission denied.");
    },
    { enableHighAccuracy: false, timeout: 8000 }
  );
}

/**
 * Units toggle
 */
function setUnits(units) {
  if (units !== "imperial" && units !== "metric") return;
  state.units = units;

  // update UI chips
  document.querySelectorAll(".chip").forEach((chip) => {
    chip.classList.toggle("chip-active", chip.dataset.units === units);
  });

  // If a city is displayed, refresh it
  const currentCityText = el.searchedCity.textContent?.trim();
  if (currentCityText && currentCityText !== "Search a city to begin") {
    // remove country suffix if present (simple approach)
    const cityName = currentCityText.split(",")[0];
    searchCity(cityName);
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
  state.cities = [];
  saveHistory();
  renderHistory();
  setStatus("Search history cleared.");
  setTimeout(() => setStatus(""), 1200);
});

el.useLocationBtn.addEventListener("click", useMyLocation);

document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => setUnits(chip.dataset.units));
});

// Init
loadHistory();
