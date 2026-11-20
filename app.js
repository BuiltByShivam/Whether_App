const state = {
  place: { name: "New Delhi", latitude: 28.6139, longitude: 77.209, country: "India" },
  timer: null,
  clock: null,
};

const WMO = {
  0: ["Clear sky", "☀", "clear"],
  1: ["Mainly clear", "🌤", "clear"],
  2: ["Partly cloudy", "⛅", "cloud"],
  3: ["Overcast", "☁", "cloud"],
  45: ["Fog", "🌫", "cloud"],
  48: ["Depositing rime fog", "🌫", "cloud"],
  51: ["Light drizzle", "🌦", "rain"],
  53: ["Drizzle", "🌦", "rain"],
  55: ["Dense drizzle", "🌧", "rain"],
  56: ["Freezing drizzle", "🌧", "rain"],
  57: ["Heavy freezing drizzle", "🌧", "rain"],
  61: ["Light rain", "🌦", "rain"],
  63: ["Rain", "🌧", "rain"],
  65: ["Heavy rain", "🌧", "rain"],
  66: ["Freezing rain", "🌧", "rain"],
  67: ["Heavy freezing rain", "🌧", "rain"],
  71: ["Light snow", "🌨", "snow"],
  73: ["Snow", "🌨", "snow"],
  75: ["Heavy snow", "❄", "snow"],
  77: ["Snow grains", "❄", "snow"],
  80: ["Light showers", "🌦", "rain"],
  81: ["Showers", "🌧", "rain"],
  82: ["Violent showers", "🌧", "storm"],
  85: ["Snow showers", "🌨", "snow"],
  86: ["Heavy snow showers", "❄", "snow"],
  95: ["Thunderstorm", "⛈", "storm"],
  96: ["Thunderstorm with hail", "⛈", "storm"],
  99: ["Severe thunderstorm", "⛈", "storm"],
};

const els = {
  form: document.querySelector("#searchForm"),
  city: document.querySelector("#cityInput"),
  location: document.querySelector("#locationButton"),
  place: document.querySelector("#placeName"),
  condition: document.querySelector("#conditionText"),
  updated: document.querySelector("#updatedText"),
  icon: document.querySelector("#weatherIcon"),
  temp: document.querySelector("#temperature"),
  feels: document.querySelector("#feelsLike"),
  highLow: document.querySelector("#highLow"),
  wind: document.querySelector("#windValue"),
  humidity: document.querySelector("#humidityValue"),
  pressure: document.querySelector("#pressureValue"),
  visibility: document.querySelector("#visibilityValue"),
  hourly: document.querySelector("#hourlyTrack"),
  forecast: document.querySelector("#forecastList"),
  timezone: document.querySelector("#timezoneText"),
  clock: document.querySelector("#liveClock"),
  humidityGauge: document.querySelector("#humidityGauge"),
  windGauge: document.querySelector("#windGauge"),
  humidityGaugeText: document.querySelector("#humidityGaugeText"),
  windGaugeText: document.querySelector("#windGaugeText"),
  sunrise: document.querySelector("#sunriseText"),
  sunset: document.querySelector("#sunsetText"),
  toast: document.querySelector("#toast"),
};

function weatherInfo(code) {
  return WMO[code] || ["Changing conditions", "◌", "cloud"];
}

function rounded(value, unit = "") {
  if (value === null || value === undefined || Number.isNaN(value)) return "--";
  return `${Math.round(value)}${unit}`;
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => els.toast.classList.remove("show"), 3200);
}

function formatTime(value, timezone = state.timezone) {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date(value));
}

function formatDay(value, timezone = state.timezone) {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: timezone,
  }).format(new Date(value));
}

function startClock(timezone) {
  window.clearInterval(state.clock);
  const tick = () => {
    els.clock.textContent = new Intl.DateTimeFormat("en", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      timeZone: timezone,
    }).format(new Date());
  };
  tick();
  state.clock = window.setInterval(tick, 1000);
}

async function geocodeCity(query) {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.search = new URLSearchParams({
    name: query,
    count: "1",
    language: "en",
    format: "json",
  });
  const response = await fetch(url);
  if (!response.ok) throw new Error("Could not search that city.");
  const data = await response.json();
  if (!data.results?.length) throw new Error("No matching city found.");
  const result = data.results[0];
  return {
    name: result.name,
    latitude: result.latitude,
    longitude: result.longitude,
    country: result.country,
    admin: result.admin1,
  };
}

async function reverseGeocode(latitude, longitude) {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/reverse");
  url.search = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    count: "1",
    language: "en",
    format: "json",
  });
  const response = await fetch(url);
  if (!response.ok) throw new Error("Could not name this location.");
  const data = await response.json();
  const result = data.results?.[0];
  return {
    name: result?.name || "Current location",
    latitude,
    longitude,
    country: result?.country || "",
    admin: result?.admin1 || "",
  };
}

async function loadWeather(place = state.place) {
  els.updated.textContent = "Refreshing live weather...";
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    current:
      "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m",
    hourly: "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,visibility,wind_speed_10m",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset",
    timezone: "auto",
    forecast_days: "7",
  });

  const response = await fetch(url);
  if (!response.ok) throw new Error("Weather service is not responding.");
  const data = await response.json();
  state.place = place;
  state.timezone = data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  renderWeather(data);
}

function renderWeather(data) {
  const current = data.current;
  const daily = data.daily;
  const [condition, icon, mood] = weatherInfo(current.weather_code);
  const placeParts = [state.place.name, state.place.admin, state.place.country].filter(Boolean);

  document.body.className = mood;
  els.place.textContent = placeParts.join(", ");
  els.condition.textContent = condition;
  els.icon.textContent = icon;
  els.temp.textContent = rounded(current.temperature_2m, "°");
  els.feels.textContent = `Feels like ${rounded(current.apparent_temperature, "°")}`;
  els.highLow.textContent = `H ${rounded(daily.temperature_2m_max[0], "°")} / L ${rounded(
    daily.temperature_2m_min[0],
    "°",
  )}`;
  els.wind.textContent = `${rounded(current.wind_speed_10m)} km/h`;
  els.humidity.textContent = `${rounded(current.relative_humidity_2m)}%`;
  els.pressure.textContent = `${rounded(current.surface_pressure)} hPa`;

  const hourIndex = closestHourIndex(data.hourly.time, current.time);
  const visibilityKm = data.hourly.visibility[hourIndex] / 1000;
  els.visibility.textContent = `${visibilityKm.toFixed(1)} km`;
  els.updated.textContent = `Updated ${formatTime(current.time, state.timezone)}`;
  els.timezone.textContent = data.timezone_abbreviation || state.timezone;
  els.sunrise.textContent = formatTime(daily.sunrise[0], state.timezone);
  els.sunset.textContent = formatTime(daily.sunset[0], state.timezone);

  els.humidityGauge.style.height = `${Math.min(current.relative_humidity_2m, 100)}%`;
  els.windGauge.style.height = `${Math.min(current.wind_speed_10m * 2, 100)}%`;
  els.humidityGaugeText.textContent = `${rounded(current.relative_humidity_2m)}%`;
  els.windGaugeText.textContent = `${rounded(current.wind_speed_10m)} km/h`;

  renderHourly(data.hourly, hourIndex);
  renderDaily(daily);
  startClock(state.timezone);
}

function closestHourIndex(times, currentTime) {
  const target = new Date(currentTime).getTime();
  let best = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  times.forEach((time, index) => {
    const distance = Math.abs(new Date(time).getTime() - target);
    if (distance < bestDistance) {
      best = index;
      bestDistance = distance;
    }
  });
  return best;
}

function renderHourly(hourly, startIndex) {
  const cards = hourly.time.slice(startIndex, startIndex + 12).map((time, offset) => {
    const index = startIndex + offset;
    const [condition, icon] = weatherInfo(hourly.weather_code[index]);
    return `
      <article class="hour-card" title="${condition}">
        <span>${offset === 0 ? "Now" : formatTime(time, state.timezone)}</span>
        <div class="icon" aria-hidden="true">${icon}</div>
        <strong>${rounded(hourly.temperature_2m[index], "°")}</strong>
        <span>${rounded(hourly.wind_speed_10m[index])} km/h</span>
      </article>
    `;
  });
  els.hourly.innerHTML = cards.join("");
}

function renderDaily(daily) {
  els.forecast.innerHTML = daily.time
    .map((day, index) => {
      const [condition, icon] = weatherInfo(daily.weather_code[index]);
      return `
        <article class="forecast-row" title="${condition}">
          <div>
            <strong>${index === 0 ? "Today" : formatDay(day, state.timezone)}</strong>
            <span>${condition}</span>
          </div>
          <div class="mini-icon" aria-hidden="true">${icon}</div>
          <strong>${rounded(daily.temperature_2m_max[index], "°")} / ${rounded(
            daily.temperature_2m_min[index],
            "°",
          )}</strong>
        </article>
      `;
    })
    .join("");
}

async function searchCity(event) {
  event.preventDefault();
  const query = els.city.value.trim();
  if (!query) return;
  try {
    const place = await geocodeCity(query);
    await loadWeather(place);
    showToast(`Showing live weather for ${place.name}.`);
  } catch (error) {
    showToast(error.message);
  }
}

function useCurrentLocation() {
  if (!navigator.geolocation) {
    showToast("Location is not available in this browser.");
    return;
  }
  showToast("Requesting your location...");
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      try {
        const { latitude, longitude } = position.coords;
        const place = await reverseGeocode(latitude, longitude);
        await loadWeather(place);
        showToast("Using your current location.");
      } catch (error) {
        showToast(error.message);
      }
    },
    () => showToast("Location permission was not granted."),
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
  );
}

function scheduleRefresh() {
  window.clearInterval(state.timer);
  state.timer = window.setInterval(() => {
    loadWeather(state.place).catch((error) => showToast(error.message));
  }, 300000);
}

els.form.addEventListener("submit", searchCity);
els.location.addEventListener("click", useCurrentLocation);

loadWeather()
  .then(() => {
    els.city.value = state.place.name;
    scheduleRefresh();
  })
  .catch((error) => showToast(error.message));
