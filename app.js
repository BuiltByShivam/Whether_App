const state = {
  place: { name: "New Delhi", latitude: 28.6139, longitude: 77.209, country: "India" },
  timer: null,
  clock: null,
  requestId: 0,
  weatherController: null,
  isLoading: false,
  sceneRequest: 0,
  activeScene: "a",
  sceneCity: "",
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
  date: document.querySelector("#localDate"),
  windDirection: document.querySelector("#windDirection"),
  windArrow: document.querySelector(".summary-item .summary-icon"),
  sceneA: document.querySelector("#scenePhotoA"),
  sceneB: document.querySelector("#scenePhotoB"),
  sceneCredit: document.querySelector("#sceneCredit"),
};

const CITY_VIEWS = {
  delhi: "India Gate Delhi cityscape",
  "new delhi": "India Gate Delhi cityscape",
  mumbai: "Marine Drive Mumbai skyline",
  paris: "Eiffel Tower Paris skyline",
  tokyo: "Tokyo skyline Shibuya cityscape",
  london: "Tower Bridge London skyline",
  "new york": "Manhattan skyline New York cityscape",
  dubai: "Burj Khalifa Dubai skyline",
  jaipur: "Hawa Mahal Jaipur",
  venice: "Grand Canal Venice",
  singapore: "Marina Bay Sands Singapore skyline",
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
  const clockFormatter = new Intl.DateTimeFormat("en", {
    hour: "numeric", minute: "2-digit", second: "2-digit", timeZone: timezone,
  });
  const dateFormatter = new Intl.DateTimeFormat("en", {
    weekday: "long", month: "long", day: "numeric", timeZone: timezone,
  });
  const tick = () => {
    const now = new Date();
    els.clock.textContent = clockFormatter.format(now);
    els.date.textContent = dateFormatter.format(now);
  };
  tick();
  state.clock = window.setInterval(tick, 1000);
}

function weatherFallbackImage(mood, isNight) {
  const width = Math.min(1600, Math.max(900, Math.round(window.innerWidth * (window.devicePixelRatio || 1))));
  const options = `auto=format&fit=crop&w=${width}&q=78`;
  if (mood === "rain" || mood === "storm") return `https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?${options}`;
  if (mood === "snow") return `https://images.unsplash.com/photo-1483664852095-d6cc6870702d?${options}`;
  if (isNight) return `https://images.unsplash.com/photo-1519608487953-e999c86e7455?${options}`;
  return `https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?${options}`;
}

async function findCityImage(place, mood, isNight) {
  const cityKey = `${place.name}|${place.admin || ""}`.toLowerCase();
  if (state.sceneCity === cityKey) return;
  const request = ++state.sceneRequest;
  const city = place.name.trim();
  const query = CITY_VIEWS[city.toLowerCase()] || `${city} ${place.admin || ""} city skyline landscape`;
  let imageUrl = weatherFallbackImage(mood, isNight);
  let creditUrl = "https://commons.wikimedia.org/";
  let creditText = `${city.toUpperCase()} · CITY ATMOSPHERE`;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 6500);
  try {
    const params = new URLSearchParams({
      action: "query", generator: "search", gsrsearch: `${query} filetype:bitmap`,
      gsrnamespace: "6", gsrlimit: "12", prop: "imageinfo",
      iiprop: "url|size|extmetadata", iiurlwidth: String(Math.min(1600, Math.max(900, Math.round(window.innerWidth * (window.devicePixelRatio || 1))))), format: "json", origin: "*",
    });
    const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, { signal: controller.signal });
    if (response.ok) {
      const data = await response.json();
      const pages = Object.values(data.query?.pages || {});
      const page = pages.find((item) => {
        const info = item.imageinfo?.[0];
        return info?.thumburl && info.width >= 900 && info.height >= 450 && info.width / info.height > 1.25;
      });
      if (page && request === state.sceneRequest) {
        const info = page.imageinfo[0];
        imageUrl = info.thumburl;
        creditUrl = info.descriptionurl;
        const artist = info.extmetadata?.Artist?.value?.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").trim();
        const license = info.extmetadata?.LicenseShortName?.value;
        creditText = [artist, license].filter(Boolean).join(" · ").slice(0, 100) || "PHOTO · WIKIMEDIA COMMONS";
      }
    }
  } catch {
    // A city image is an enhancement; the weather mood fallback remains available offline.
  } finally {
    window.clearTimeout(timeout);
  }
  if (request !== state.sceneRequest) return;
  const next = state.activeScene === "a" ? "b" : "a";
  const layer = next === "a" ? els.sceneA : els.sceneB;
  const preloader = new Image();
  let triedFallback = false;
  const imageTimeout = window.setTimeout(() => {
    if (request === state.sceneRequest && !triedFallback) {
      triedFallback = true;
      creditUrl = "https://unsplash.com/license";
      creditText = `ATMOSPHERE · ${city.toUpperCase()} · UNSPLASH`;
      preloader.src = weatherFallbackImage(mood, isNight);
    }
  }, 9000);
  preloader.onload = () => {
    window.clearTimeout(imageTimeout);
    if (request !== state.sceneRequest) return;
    layer.style.backgroundImage = `url("${imageUrl}")`;
    layer.classList.add("active");
    (next === "a" ? els.sceneB : els.sceneA).classList.remove("active");
    state.activeScene = next;
    state.sceneCity = cityKey;
    els.sceneCredit.href = creditUrl;
    els.sceneCredit.textContent = creditText;
    els.sceneCredit.title = `Image for ${city}`;
  };
  preloader.onerror = () => {
    if (request !== state.sceneRequest) return;
    const fallback = weatherFallbackImage(mood, isNight);
    if (!triedFallback && fallback !== imageUrl) {
      triedFallback = true;
      creditUrl = "https://unsplash.com/license";
      creditText = `ATMOSPHERE · ${city.toUpperCase()} · UNSPLASH`;
      preloader.src = fallback;
      return;
    }
    // Keep the previous loaded image when both remote sources are unavailable.
  };
  preloader.src = imageUrl;
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
  // Open-Meteo's Geocoding API is forward-only. Nominatim provides free OSM reverse lookup.
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.search = new URLSearchParams({
    lat: String(latitude), lon: String(longitude), format: "jsonv2", zoom: "10", "accept-language": "en",
  });
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("Could not find a place name for your location. Weather can still load.");
  const data = await response.json();
  const address = data.address || {};
  const name = address.city || address.town || address.village || address.suburb || address.county || address.state || "Current location";
  return {
    name,
    latitude,
    longitude,
    country: address.country || "",
    admin: address.state || address.region || address.county || "",
  };
}

async function loadWeather(place = state.place, requestId = state.requestId) {
  if (requestId !== state.requestId) return false;
  state.weatherController?.abort();
  const controller = new AbortController();
  state.weatherController = controller;
  if (!state.isLoading) els.updated.textContent = "Refreshing live weather…";
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

  let response;
  try {
    response = await fetch(url, { signal: controller.signal });
  } catch (error) {
    if (error.name === "AbortError") return false;
    throw new Error("Weather could not load. Check your internet connection and try again.");
  }
  if (!response.ok) throw new Error("Weather service is temporarily unavailable. Please try again.");
  const data = await response.json();
  if (requestId !== state.requestId) return false;
  state.place = place;
  state.timezone = data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  renderWeather(data);
  els.city.value = place.name;
  return true;
}

function beginSelection() {
  state.requestId += 1;
  state.isLoading = true;
  document.body.classList.add("loading");
  els.updated.textContent = "Finding your weather…";
  return state.requestId;
}

function finishSelection(requestId) {
  if (requestId !== state.requestId) return;
  state.isLoading = false;
  document.body.classList.remove("loading");
}

function renderWeather(data) {
  const current = data.current;
  const daily = data.daily;
  const [condition, icon, mood] = weatherInfo(current.weather_code);
  const placeParts = [state.place.name, state.place.admin, state.place.country].filter(Boolean);

  const isNight = Number(current.is_day) === 0;
  document.body.className = `${mood}${isNight ? " night" : ""}`;
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
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const direction = directions[Math.round(current.wind_direction_10m / 45) % 8];
  els.windDirection.textContent = `${direction} · ${rounded(current.wind_direction_10m)}°`;
  els.windArrow.style.transform = `rotate(${current.wind_direction_10m - 45}deg)`;
  els.wind.setAttribute("aria-label", `Wind ${rounded(current.wind_speed_10m)} kilometers per hour, from ${direction}`);
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
  document.querySelector(".gauge-line i").style.width = `${Math.min(current.relative_humidity_2m, 100)}%`;
  document.querySelector(".wind-line i").style.width = `${Math.min(current.wind_speed_10m * 2, 100)}%`;
  els.humidityGaugeText.textContent = `${rounded(current.relative_humidity_2m)}%`;
  els.windGaugeText.textContent = `${rounded(current.wind_speed_10m)} km/h`;

  renderHourly(data.hourly, hourIndex);
  renderDaily(daily);
  findCityImage(state.place, mood, isNight);
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
      <article class="hour-card${offset === 0 ? " is-now" : ""}" title="${condition}"${offset === 0 ? ' aria-current="time"' : ""}>
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
  const requestId = beginSelection();
  try {
    const place = await geocodeCity(query);
    if (requestId !== state.requestId) return;
    const loaded = await loadWeather(place, requestId);
    if (loaded) showToast(`Showing live weather for ${place.name}.`);
  } catch (error) {
    if (requestId === state.requestId) showToast(error.message);
  } finally {
    finishSelection(requestId);
  }
}

function useCurrentLocation() {
  if (!navigator.geolocation) {
    showToast("Location is not available in this browser.");
    return;
  }
  const requestId = beginSelection();
  els.location.disabled = true;
  showToast("Requesting your location…");
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      try {
        if (requestId !== state.requestId) return;
        const { latitude, longitude } = position.coords;
        let place;
        try {
          place = await reverseGeocode(latitude, longitude);
        } catch (error) {
          // Reverse lookup is optional: use the actual coordinates and label accurately.
          place = { name: "Current location", latitude, longitude, country: "", admin: "" };
          showToast("Place name lookup failed; loading weather for your coordinates.");
        }
        if (requestId !== state.requestId) return;
        const loaded = await loadWeather(place, requestId);
        if (!loaded) return;
        showToast("Using your current location.");
      } catch (error) {
        if (requestId === state.requestId) showToast(error.message);
      } finally {
        finishSelection(requestId);
        els.location.disabled = false;
      }
    },
    (error) => {
      if (requestId !== state.requestId) return;
      const message = error.code === 1
        ? "Location permission was denied. Allow location access in your browser settings and try again."
        : error.code === 2
          ? "Your location is unavailable. Check that location services are enabled and try again."
          : "Location request timed out. Please try again when your connection or GPS is available.";
      showToast(message);
      els.updated.textContent = "Location not updated";
      finishSelection(requestId);
      els.location.disabled = false;
    },
    { enableHighAccuracy: false, timeout: 15000, maximumAge: 120000 },
  );
}

function scheduleRefresh() {
  window.clearInterval(state.timer);
  state.timer = window.setInterval(() => {
    if (state.isLoading) return;
    loadWeather(state.place, state.requestId).catch((error) => showToast(error.message));
  }, 300000);
}

els.form.addEventListener("submit", searchCity);
els.location.addEventListener("click", useCurrentLocation);

loadWeather()
  .then(() => {
    els.city.value = state.place.name;
    scheduleRefresh();
  })
  .catch((error) => {
    els.updated.textContent = "Weather unavailable";
    showToast(error.message);
  });
