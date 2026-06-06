/**
 * Aether Weather Dashboard - Logic and API integration
 */

// Weather API Key
const apiKey = "81bc7f51b8541c0db34560cd85a4da29";

// --- Global App State ---
const state = {
  units: localStorage.getItem('weather_units') || 'metric', // 'metric' (°C, km/h, mm) or 'imperial' (°F, mph, inch)
  currentLocation: null, // { lat, lon, name, country, admin }
  weatherData: null,
  favorites: JSON.parse(localStorage.getItem('weather_favorites')) || [
    { name: 'London', country: 'United Kingdom', lat: 51.5085, lon: -0.1257 },
    { name: 'New York', country: 'United States', lat: 40.7143, lon: -74.006 },
    { name: 'Tokyo', country: 'Japan', lat: 35.6895, lon: 139.6917 }
  ]
};

// WMO Weather Codes mapping to visual descriptions and general categories
const weatherCodes = {
  0: { desc: 'Clear sky', class: 'sunny', icon: 'clear' },
  1: { desc: 'Mainly clear', class: 'sunny', icon: 'clear' },
  2: { desc: 'Partly cloudy', class: 'cloudy', icon: 'partly-cloudy' },
  3: { desc: 'Overcast', class: 'cloudy', icon: 'cloudy' },
  45: { desc: 'Fog', class: 'cloudy', icon: 'fog' },
  48: { desc: 'Depositing rime fog', class: 'cloudy', icon: 'fog' },
  51: { desc: 'Light drizzle', class: 'rainy', icon: 'drizzle' },
  53: { desc: 'Moderate drizzle', class: 'rainy', icon: 'drizzle' },
  55: { desc: 'Dense drizzle', class: 'rainy', icon: 'drizzle' },
  56: { desc: 'Light freezing drizzle', class: 'snowy', icon: 'rain-snow' },
  57: { desc: 'Dense freezing drizzle', class: 'snowy', icon: 'rain-snow' },
  61: { desc: 'Slight rain', class: 'rainy', icon: 'rain' },
  63: { desc: 'Moderate rain', class: 'rainy', icon: 'rain' },
  65: { desc: 'Heavy rain', class: 'rainy', icon: 'heavy-rain' },
  66: { desc: 'Light freezing rain', class: 'snowy', icon: 'rain-snow' },
  67: { desc: 'Heavy freezing rain', class: 'snowy', icon: 'rain-snow' },
  71: { desc: 'Slight snow fall', class: 'snowy', icon: 'snow' },
  73: { desc: 'Moderate snow fall', class: 'snowy', icon: 'snow' },
  75: { desc: 'Heavy snow fall', class: 'snowy', icon: 'heavy-snow' },
  77: { desc: 'Snow grains', class: 'snowy', icon: 'snow' },
  80: { desc: 'Slight rain showers', class: 'rainy', icon: 'rain-showers' },
  81: { desc: 'Moderate rain showers', class: 'rainy', icon: 'rain-showers' },
  82: { desc: 'Violent rain showers', class: 'rainy', icon: 'heavy-rain' },
  85: { desc: 'Slight snow showers', class: 'snowy', icon: 'snow-showers' },
  86: { desc: 'Heavy snow showers', class: 'snowy', icon: 'heavy-snow' },
  95: { desc: 'Thunderstorm', class: 'stormy', icon: 'thunder' },
  96: { desc: 'Thunderstorm with slight hail', class: 'stormy', icon: 'thunder' },
  99: { desc: 'Thunderstorm with heavy hail', class: 'stormy', icon: 'thunder' }
};

// SVG Paths for Weather Icons
function getSVGIcon(type, isDay = 1) {
  const animations = `
    <style>
      @keyframes float {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-4px); }
      }
      @keyframes pulse-sun {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.05); opacity: 0.95; }
      }
      @keyframes rain-drip {
        0% { transform: translateY(-8px) scaleY(0.7); opacity: 0; }
        50% { opacity: 1; }
        100% { transform: translateY(12px) scaleY(1.2); opacity: 0; }
      }
      @keyframes snow-drift {
        0% { transform: translate(0, -6px) rotate(0deg); opacity: 0; }
        50% { opacity: 1; }
        100% { transform: translate(4px, 12px) rotate(360deg); opacity: 0; }
      }
      @keyframes flash {
        0%, 100% { opacity: 0.1; }
        45% { opacity: 0.1; }
        50% { opacity: 1; }
        55% { opacity: 0.1; }
      }
      .anim-float { animation: float 4s ease-in-out infinite; }
      .anim-sun { animation: pulse-sun 6s ease-in-out infinite; transform-origin: center; }
      .anim-rain-1 { animation: rain-drip 1.5s linear infinite; }
      .anim-rain-2 { animation: rain-drip 1.5s linear infinite; animation-delay: 0.5s; }
      .anim-rain-3 { animation: rain-drip 1.5s linear infinite; animation-delay: 1s; }
      .anim-snow-1 { animation: snow-drift 2.2s linear infinite; }
      .anim-snow-2 { animation: snow-drift 2.2s linear infinite; animation-delay: 0.7s; }
      .anim-snow-3 { animation: snow-drift 2.2s linear infinite; animation-delay: 1.4s; }
      .anim-flash { animation: flash 5s ease-in-out infinite; }
    </style>
  `;

  const views = {
    'clear': isDay 
      ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          ${animations}
          <circle cx="12" cy="12" r="5" fill="#f59e0b" stroke="#f59e0b" class="anim-sun" />
          <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="#d97706" stroke-linecap="round" />
        </svg>`
      : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          ${animations}
          <path d="M12 3a6.36 6.36 0 0 0-4 12 7.7 7.7 0 0 0 10-3c.27-.47.45-1 .47-1.5a5.55 5.55 0 0 1-6.5-7.5z" fill="#93c5fd" stroke="#60a5fa" class="anim-float" />
        </svg>`,
        
    'partly-cloudy': isDay
      ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          ${animations}
          <circle cx="15" cy="9" r="3" fill="#f59e0b" stroke="#d97706" class="anim-sun" />
          <path d="M17.5 19A3.5 3.5 0 0 0 21 15.5c0-2.79-2.54-4.5-5-4.5-.42 0-.83.07-1.22.2A6 6 0 0 0 3 11.5c0 3.59 2.91 6.5 6.5 6.5h8" fill="rgba(209, 213, 219, 0.8)" stroke="#9ca3af" class="anim-float" />
        </svg>`
      : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          ${animations}
          <path d="M16 8a4 4 0 0 0-3 6.5 4.8 4.8 0 0 0 6.5-1.5" fill="#93c5fd" stroke="#60a5fa" />
          <path d="M17.5 19A3.5 3.5 0 0 0 21 15.5c0-2.79-2.54-4.5-5-4.5-.42 0-.83.07-1.22.2A6 6 0 0 0 3 11.5c0 3.59 2.91 6.5 6.5 6.5h8" fill="rgba(107, 114, 128, 0.8)" stroke="#6b7280" class="anim-float" />
        </svg>`,

    'cloudy': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        ${animations}
        <path d="M17.5 19A3.5 3.5 0 0 0 21 15.5c0-2.79-2.54-4.5-5-4.5-.42 0-.83.07-1.22.2A6 6 0 0 0 3 11.5c0 3.59 2.91 6.5 6.5 6.5h8" fill="rgba(156, 163, 175, 0.6)" stroke="#9ca3af" class="anim-float" />
        <path d="M14 17a3 3 0 0 0 3-3c0-2.39-2.18-3.86-4.29-3.86-.36 0-.71.06-1.04.17A5.14 5.14 0 0 0 1.5 10.5C1.5 13.58 4 16.14 7.07 16.14h6.93" fill="rgba(209, 213, 219, 0.4)" stroke="#d1d5db" class="anim-float" style="animation-delay: -1.5s;" />
      </svg>`,

    'fog': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        ${animations}
        <path d="M4 8h16M2 12h20M5 16h14M8 20h8" stroke="#94a3b8" stroke-width="2.5" stroke-linecap="round" class="anim-float" />
      </svg>`,

    'drizzle': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        ${animations}
        <path d="M17.5 19A3.5 3.5 0 0 0 21 15.5c0-2.79-2.54-4.5-5-4.5-.42 0-.83.07-1.22.2A6 6 0 0 0 3 11.5c0 3.59 2.91 6.5 6.5 6.5h8" fill="rgba(156, 163, 175, 0.5)" stroke="#9ca3af" />
        <line x1="8" y1="20" x2="7.5" y2="22" stroke="#60a5fa" stroke-width="2" stroke-linecap="round" class="anim-rain-1" />
        <line x1="12" y1="20" x2="11.5" y2="22" stroke="#60a5fa" stroke-width="2" stroke-linecap="round" class="anim-rain-2" />
        <line x1="16" y1="20" x2="15.5" y2="22" stroke="#60a5fa" stroke-width="2" stroke-linecap="round" class="anim-rain-3" />
      </svg>`,

    'rain': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        ${animations}
        <path d="M17.5 19A3.5 3.5 0 0 0 21 15.5c0-2.79-2.54-4.5-5-4.5-.42 0-.83.07-1.22.2A6 6 0 0 0 3 11.5c0 3.59 2.91 6.5 6.5 6.5h8" fill="rgba(156, 163, 175, 0.6)" stroke="#9ca3af" />
        <line x1="7.5" y1="20" x2="6.5" y2="23" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round" class="anim-rain-1" />
        <line x1="11.5" y1="20" x2="10.5" y2="23" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round" class="anim-rain-2" />
        <line x1="15.5" y1="20" x2="14.5" y2="23" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round" class="anim-rain-3" />
      </svg>`,

    'heavy-rain': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        ${animations}
        <path d="M17.5 19A3.5 3.5 0 0 0 21 15.5c0-2.79-2.54-4.5-5-4.5-.42 0-.83.07-1.22.2A6 6 0 0 0 3 11.5c0 3.59 2.91 6.5 6.5 6.5h8" fill="rgba(107, 114, 128, 0.7)" stroke="#6b7280" />
        <line x1="7" y1="20" x2="5.5" y2="24" stroke="#2563eb" stroke-width="3" stroke-linecap="round" class="anim-rain-1" />
        <line x1="11" y1="20" x2="9.5" y2="24" stroke="#2563eb" stroke-width="3" stroke-linecap="round" class="anim-rain-2" />
        <line x1="15" y1="20" x2="13.5" y2="24" stroke="#2563eb" stroke-width="3" stroke-linecap="round" class="anim-rain-3" />
      </svg>`,

    'rain-showers': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        ${animations}
        <circle cx="15" cy="9" r="3" fill="#f59e0b" stroke="#d97706" />
        <path d="M17.5 19A3.5 3.5 0 0 0 21 15.5c0-2.79-2.54-4.5-5-4.5-.42 0-.83.07-1.22.2A6 6 0 0 0 3 11.5c0 3.59 2.91 6.5 6.5 6.5h8" fill="rgba(209, 213, 219, 0.7)" stroke="#9ca3af" />
        <line x1="8" y1="20" x2="7" y2="22" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" class="anim-rain-1" />
        <line x1="12" y1="20" x2="11" y2="22" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" class="anim-rain-2" />
      </svg>`,

    'snow': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        ${animations}
        <path d="M17.5 19A3.5 3.5 0 0 0 21 15.5c0-2.79-2.54-4.5-5-4.5-.42 0-.83.07-1.22.2A6 6 0 0 0 3 11.5c0 3.59 2.91 6.5 6.5 6.5h8" fill="rgba(156, 163, 175, 0.5)" stroke="#9ca3af" />
        <circle cx="8" cy="20" r="1.5" fill="#e2e8f0" class="anim-snow-1" />
        <circle cx="12" cy="21" r="1.5" fill="#e2e8f0" class="anim-snow-2" />
        <circle cx="16" cy="20" r="1.5" fill="#e2e8f0" class="anim-snow-3" />
      </svg>`,

    'heavy-snow': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        ${animations}
        <path d="M17.5 19A3.5 3.5 0 0 0 21 15.5c0-2.79-2.54-4.5-5-4.5-.42 0-.83.07-1.22.2A6 6 0 0 0 3 11.5c0 3.59 2.91 6.5 6.5 6.5h8" fill="rgba(209, 213, 219, 0.6)" stroke="#9ca3af" />
        <circle cx="7" cy="20" r="2.2" fill="#ffffff" class="anim-snow-1" />
        <circle cx="11" cy="21" r="2.2" fill="#ffffff" class="anim-snow-2" />
        <circle cx="15" cy="20" r="2.2" fill="#ffffff" class="anim-snow-3" />
        <circle cx="9.5" cy="23" r="1.8" fill="#ffffff" class="anim-snow-1" style="animation-delay: 0.3s;" />
        <circle cx="13.5" cy="23" r="1.8" fill="#ffffff" class="anim-snow-2" style="animation-delay: 0.3s;" />
      </svg>`,

    'snow-showers': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        ${animations}
        <circle cx="15" cy="9" r="3" fill="#f59e0b" stroke="#d97706" />
        <path d="M17.5 19A3.5 3.5 0 0 0 21 15.5c0-2.79-2.54-4.5-5-4.5-.42 0-.83.07-1.22.2A6 6 0 0 0 3 11.5c0 3.59 2.91 6.5 6.5 6.5h8" fill="rgba(209, 213, 219, 0.7)" stroke="#9ca3af" />
        <circle cx="8" cy="20" r="1.5" fill="#e2e8f0" class="anim-snow-1" />
        <circle cx="12" cy="21" r="1.5" fill="#e2e8f0" class="anim-snow-2" />
      </svg>`,

    'rain-snow': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        ${animations}
        <path d="M17.5 19A3.5 3.5 0 0 0 21 15.5c0-2.79-2.54-4.5-5-4.5-.42 0-.83.07-1.22.2A6 6 0 0 0 3 11.5c0 3.59 2.91 6.5 6.5 6.5h8" fill="rgba(156, 163, 175, 0.5)" stroke="#9ca3af" />
        <line x1="8" y1="20" x2="7" y2="22" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" class="anim-rain-1" />
        <circle cx="12" cy="21" r="1.5" fill="#e2e8f0" class="anim-snow-2" />
        <line x1="16" y1="20" x2="15" y2="22" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" class="anim-rain-3" />
      </svg>`,

    'thunder': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        ${animations}
        <path d="M17.5 19A3.5 3.5 0 0 0 21 15.5c0-2.79-2.54-4.5-5-4.5-.42 0-.83.07-1.22.2A6 6 0 0 0 3 11.5c0 3.59 2.91 6.5 6.5 6.5h8" fill="rgba(75, 85, 99, 0.8)" stroke="#4b5563" class="anim-float" />
        <path d="M13 18l-3 4v-4H8l4-5v3h2z" fill="#f59e0b" stroke="#d97706" stroke-width="1.5" class="anim-flash" />
      </svg>`
  };

  return views[type] || views['clear'];
}

// --- API Functions ---

/**
 * Fetch city autocomplete suggestions from Open-Meteo Geocoding API
 */
async function fetchCitySuggestions(query) {
  if (!query || query.length < 2) return [];
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Geocoding service error');
    const data = await res.json();
    return data.results || [];
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    return [];
  }
}

/**
 * Fetch weather data for a specific latitude and longitude
 */
async function fetchWeatherData(lat, lon) {
  const isMetric = state.units === 'metric';
  const tempUnit = isMetric ? 'celsius' : 'fahrenheit';
  const windUnit = isMetric ? 'kmh' : 'mph';
  const precUnit = isMetric ? 'mm' : 'inch';
  
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m&hourly=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max&timezone=auto&temperature_unit=${tempUnit}&wind_speed_unit=${windUnit}&precipitation_unit=${precUnit}`;
  
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Weather API service error');
    return await res.json();
  } catch (error) {
    console.error('Error fetching weather data:', error);
    throw error;
  }
}

/**
 * Reverse geocoding tool using BigDataCloud API (key-less free endpoint)
 */
async function reverseGeocode(lat, lon) {
  const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Reverse geocode error');
    const data = await res.json();
    return {
      name: data.city || data.locality || data.principalSubdivision || 'Unknown Location',
      country: data.countryName || '',
      admin1: data.principalSubdivision || ''
    };
  } catch (error) {
    console.error('Error in reverse geocoding:', error);
    return { name: 'Located City', country: '', admin1: '' };
  }
}

// --- Render / UI Update Functions ---

/**
 * Set visual background theme according to weather code and day/night state
 */
function setWeatherTheme(code, isDay) {
  const body = document.body;
  // Remove all current themes
  body.className = '';
  
  const weatherClass = weatherCodes[code]?.class || 'default';
  
  if (weatherClass === 'sunny' && !isDay) {
    body.classList.add('theme-night');
  } else {
    body.classList.add(`theme-${weatherClass}`);
  }
}

/**
 * Populate current weather details
 */
function renderCurrentWeather() {
  const current = state.weatherData.current;
  const location = state.currentLocation;
  const isMetric = state.units === 'metric';
  
  // Format Date
  const dateOptions = { weekday: 'long', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  const formattedDate = new Date().toLocaleDateString('en-US', dateOptions);
  
  // Elements
  document.getElementById('city-name').textContent = `${location.name}, ${location.country || ''}`;
  document.getElementById('current-date').textContent = formattedDate;
  document.getElementById('current-temp').textContent = Math.round(current.temperature_2m);
  document.querySelector('.temp-unit').textContent = isMetric ? '°C' : '°F';
  
  const codeInfo = weatherCodes[current.weather_code] || { desc: 'Unknown', icon: 'clear' };
  document.getElementById('weather-description').textContent = codeInfo.desc;
  
  // Icon
  const iconContainer = document.getElementById('hero-weather-icon');
  iconContainer.innerHTML = getSVGIcon(codeInfo.icon, current.is_day);
  
  // Favorite state
  const isPinned = state.favorites.some(fav => 
    Math.abs(fav.lat - location.lat) < 0.01 && Math.abs(fav.lon - location.lon) < 0.01
  );
  const favBtn = document.getElementById('favorite-btn');
  if (isPinned) {
    favBtn.classList.add('pinned');
  } else {
    favBtn.classList.remove('pinned');
  }

  // Quick Stats
  document.getElementById('feels-like').textContent = `${Math.round(current.apparent_temperature)}${isMetric ? '°C' : '°F'}`;
  document.getElementById('humidity').textContent = `${current.relative_humidity_2m}%`;
  document.getElementById('wind-speed').textContent = `${current.wind_speed_10m} ${isMetric ? 'km/h' : 'mph'}`;
  
  // UV Index (Daily max is typical for general uv reporting)
  const uvMax = state.weatherData.daily.uv_index_max[0];
  document.getElementById('uv-index').textContent = `${uvMax.toFixed(1)} (${getUVLabel(uvMax)})`;
  
  document.getElementById('pressure').textContent = `${Math.round(current.pressure_msl)} hPa`;
  
  // Sunrise/Sunset formatting
  const sunriseStr = new Date(state.weatherData.daily.sunrise[0]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const sunsetStr = new Date(state.weatherData.daily.sunset[0]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  document.getElementById('sun-times').textContent = `${sunriseStr} / ${sunsetStr}`;
  
  // Unhide details and hide skeleton
  document.querySelector('.hero-content').classList.remove('hidden');
  const heroSkeleton = document.querySelector('.skeleton-hero');
  if (heroSkeleton) heroSkeleton.classList.add('hidden');
}

function getUVLabel(uv) {
  if (uv <= 2) return 'Low';
  if (uv <= 5) return 'Mod';
  if (uv <= 7) return 'High';
  if (uv <= 10) return 'Very High';
  return 'Extreme';
}

/**
 * Render 3-hourly forecast scroll list (8 cards)
 */
function renderHourlyForecast() {
  const hourly = state.weatherData.hourly;
  const currentHourStr = new Date().toISOString().substring(0, 13) + ':00';
  let startIndex = hourly.time.findIndex(t => t.startsWith(currentHourStr));
  if (startIndex === -1) startIndex = 0;
  
  const hourlyList = document.getElementById('hourly-list');
  hourlyList.innerHTML = '';
  
  const isMetric = state.units === 'metric';
  
  // Take 8 forecast cards spaced 3 hours apart
  for (let step = 0; step < 8; step++) {
    const i = startIndex + step * 3;
    if (i >= hourly.time.length) break;
    
    const timeVal = new Date(hourly.time[i]);
    const formattedHour = timeVal.toLocaleTimeString([], { hour: 'numeric' });
    const temp = Math.round(hourly.temperature_2m[i]);
    const code = hourly.weather_code[i];
    const pop = hourly.precipitation_probability[i];
    const codeInfo = weatherCodes[code] || { icon: 'clear' };
    
    // Create card
    const card = document.createElement('div');
    card.className = 'hourly-item';
    
    // Rain indicator if probability is > 10%
    const rainHTML = pop > 10 
      ? `<span class="hourly-pop">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="width:10px;height:10px;"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" fill="#3b82f6" stroke="#3b82f6"/></svg>
          ${pop}%
         </span>` 
      : '&nbsp;';

    card.innerHTML = `
      <span class="hourly-time">${formattedHour}</span>
      <div class="hourly-icon">${getSVGIcon(codeInfo.icon, hourly.time[i].includes('T') && parseInt(hourly.time[i].split('T')[1]) > 6 && parseInt(hourly.time[i].split('T')[1]) < 19 ? 1 : 0)}</div>
      <span class="hourly-temp">${temp}°</span>
      ${rainHTML}
    `;
    hourlyList.appendChild(card);
  }
}

/**
 * Render 7 day forecast list with Apple-style temperature progress bar
 */
function renderDailyForecast() {
  const daily = state.weatherData.daily;
  const dailyList = document.getElementById('daily-list');
  dailyList.innerHTML = '';
  
  // Calculate global min/max for scaling temperature bar
  const globalMin = Math.min(...daily.temperature_2m_min);
  const globalMax = Math.max(...daily.temperature_2m_max);
  const globalRange = globalMax - globalMin || 1;
  
  for (let i = 0; i < daily.time.length; i++) {
    const dateVal = new Date(daily.time[i]);
    // Determine weekday or "Today"
    let dayName = dateVal.toLocaleDateString('en-US', { weekday: 'short' });
    if (i === 0) dayName = 'Today';
    
    const code = daily.weather_code[i];
    const pop = daily.precipitation_probability_max[i];
    const maxTemp = Math.round(daily.temperature_2m_max[i]);
    const minTemp = Math.round(daily.temperature_2m_min[i]);
    const codeInfo = weatherCodes[code] || { icon: 'clear' };
    
    // Calculate progress bar left and width percentages
    const barLeft = ((minTemp - globalMin) / globalRange) * 100;
    const barWidth = ((maxTemp - minTemp) / globalRange) * 100;
    
    const item = document.createElement('div');
    item.className = 'daily-item';
    item.innerHTML = `
      <span class="daily-day">${dayName}</span>
      <div class="daily-weather-cell">
        <div class="daily-icon">${getSVGIcon(codeInfo.icon, 1)}</div>
        ${pop > 15 ? `<span class="daily-pop">${pop}%</span>` : ''}
      </div>
      <div class="daily-temp-range">
        <span class="daily-temp-min">${minTemp}°</span>
        <div class="daily-temp-bar-bg">
          <div class="daily-temp-bar-fill" style="left: ${barLeft}%; width: ${barWidth}%;"></div>
        </div>
        <span class="daily-temp-max">${maxTemp}°</span>
      </div>
    `;
    
    dailyList.appendChild(item);
  }
}

/**
 * Render Interactive SVG Trend Chart for temperature and rain
 */
function renderTrendChart() {
  const hourly = state.weatherData.hourly;
  const currentHourStr = new Date().toISOString().substring(0, 13) + ':00';
  let startIndex = hourly.time.findIndex(t => t.startsWith(currentHourStr));
  if (startIndex === -1) startIndex = 0;
  
  // Gather 12 data points
  const numPoints = 12;
  const temps = [];
  const rainProb = [];
  const labels = [];
  const dates = [];
  
  for (let i = startIndex; i < startIndex + numPoints && i < hourly.time.length; i++) {
    temps.push(hourly.temperature_2m[i]);
    rainProb.push(hourly.precipitation_probability[i]);
    labels.push(new Date(hourly.time[i]).toLocaleTimeString([], { hour: 'numeric' }));
    dates.push(hourly.time[i]);
  }
  
  const svg = document.getElementById('trend-svg');
  svg.innerHTML = ''; // Clear SVG
  
  // Viewport definitions
  const width = 600;
  const height = 220;
  const padding = { top: 40, right: 40, bottom: 40, left: 40 };
  
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const stepX = chartWidth / (numPoints - 1);
  
  const minTemp = Math.min(...temps);
  const maxTemp = Math.max(...temps);
  const tempRange = maxTemp - minTemp || 1;
  
  // Render definitions & gradients
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  defs.innerHTML = `
    <linearGradient id="temp-gradient" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="var(--accent-primary)" stop-opacity="0.3"></stop>
      <stop offset="100%" stop-color="var(--accent-primary)" stop-opacity="0.0"></stop>
    </linearGradient>
    <linearGradient id="rain-gradient" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.25"></stop>
      <stop offset="100%" stop-color="#3b82f6" stop-opacity="0.02"></stop>
    </linearGradient>
  `;
  svg.appendChild(defs);
  
  // Calculate points
  const points = temps.map((temp, i) => {
    const x = padding.left + i * stepX;
    // Map Y coordinates: higher temp is lower Y value
    const y = padding.top + chartHeight - ((temp - minTemp) / tempRange) * chartHeight;
    return { x, y, temp, rain: rainProb[i], label: labels[i] };
  });
  
  // Render rain probability vertical bars in the background
  points.forEach((pt) => {
    const barHeight = (pt.rain / 100) * (chartHeight * 0.7); // scale to max 70% of chart height
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', pt.x - 12);
    rect.setAttribute('y', padding.top + chartHeight - barHeight);
    rect.setAttribute('width', 24);
    rect.setAttribute('height', barHeight);
    rect.setAttribute('fill', 'url(#rain-gradient)');
    rect.setAttribute('stroke', 'rgba(59, 130, 246, 0.25)');
    rect.setAttribute('stroke-width', '1');
    rect.setAttribute('rx', '4');
    svg.appendChild(rect);
  });
  
  // Grid Lines (Horizontal values: Min, Max, and Midpoint)
  const gridYCoords = [padding.top, padding.top + chartHeight / 2, padding.top + chartHeight];
  gridYCoords.forEach((yVal) => {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', padding.left);
    line.setAttribute('y1', yVal);
    line.setAttribute('x2', width - padding.right);
    line.setAttribute('y2', yVal);
    line.setAttribute('class', 'chart-grid-line');
    svg.appendChild(line);
  });
  
  // Generate Temperature line path
  let pathD = `M ${points[0].x} ${points[0].y}`;
  // Smooth curve using cubic bezier control points
  for (let i = 0; i < points.length - 1; i++) {
    const cpX1 = points[i].x + stepX / 2;
    const cpY1 = points[i].y;
    const cpX2 = points[i + 1].x - stepX / 2;
    const cpY2 = points[i + 1].y;
    pathD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${points[i+1].x} ${points[i+1].y}`;
  }
  
  // Glow Fill Area Path
  const areaD = `${pathD} L ${points[points.length-1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`;
  const areaPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  areaPath.setAttribute('d', areaD);
  areaPath.setAttribute('class', 'chart-area-fill');
  svg.appendChild(areaPath);
  
  // Line Path
  const linePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  linePath.setAttribute('d', pathD);
  linePath.setAttribute('class', 'chart-temp-path');
  svg.appendChild(linePath);
  
  // Render time labels (x axis) & dots & temp labels (y axis)
  points.forEach((pt, idx) => {
    // Time label
    const timeText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    timeText.setAttribute('x', pt.x);
    timeText.setAttribute('y', height - 12);
    timeText.setAttribute('class', 'chart-label-text');
    timeText.textContent = pt.label;
    svg.appendChild(timeText);
    
    // Temp text label above node
    const tempText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    tempText.setAttribute('x', pt.x);
    tempText.setAttribute('y', pt.y - 12);
    tempText.setAttribute('class', 'chart-temp-text');
    tempText.textContent = `${Math.round(pt.temp)}°`;
    svg.appendChild(tempText);
    
    // Dot Node
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', pt.x);
    circle.setAttribute('cy', pt.y);
    circle.setAttribute('r', '4.5');
    circle.setAttribute('class', 'chart-point');
    
    // Interactive tooltips
    const tooltip = document.getElementById('chart-tooltip');
    circle.addEventListener('mouseenter', (e) => {
      // Show tooltip
      tooltip.classList.remove('hidden');
      tooltip.innerHTML = `
        <strong>${pt.label}</strong>
        <span>Temp: ${Math.round(pt.temp)}°${state.units === 'metric' ? 'C' : 'F'}</span>
        <span>Rain Prob: ${pt.rain}%</span>
      `;
      // Position tooltip above current dot relative to SVG container
      const containerRect = svg.parentElement.getBoundingClientRect();
      const dotX = (pt.x / width) * containerRect.width;
      const dotY = (pt.y / height) * containerRect.height;
      
      tooltip.style.left = `${dotX - tooltip.offsetWidth / 2}px`;
      tooltip.style.top = `${dotY - tooltip.offsetHeight - 12}px`;
    });
    
    circle.addEventListener('mouseleave', () => {
      tooltip.classList.add('hidden');
    });
    
    svg.appendChild(circle);
  });
}

/**
 * Fetch and render pinned favorites sidebar list
 */
async function renderFavorites() {
  const container = document.getElementById('favorites-list');
  if (state.favorites.length === 0) {
    container.innerHTML = `<p class="empty-favorites-msg">No pinned locations yet.</p>`;
    return;
  }
  
  container.innerHTML = '';
  
  // Generate HTML placeholders for all pins
  state.favorites.forEach((fav, index) => {
    const item = document.createElement('div');
    item.className = 'fav-item';
    item.dataset.index = index;
    item.innerHTML = `
      <div class="fav-info">
        <span class="fav-name">${fav.name}</span>
        <span class="fav-country">${fav.country || ''}</span>
      </div>
      <div class="fav-temp-container">
        <span class="fav-temp" id="fav-temp-${index}">--</span>
        <div class="fav-icon" id="fav-icon-${index}"></div>
        <button class="remove-fav-btn" data-index="${index}" aria-label="Remove pin">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    `;
    
    // Clicking anywhere on the favorite card (except the delete button) sets current location
    item.addEventListener('click', (e) => {
      if (e.target.closest('.remove-fav-btn')) return;
      setLocation(fav);
    });
    
    container.appendChild(item);
  });
  
  // Background fetch current temp and weather icons for favorites
  state.favorites.forEach(async (fav, index) => {
    try {
      const isMetric = state.units === 'metric';
      const tempUnit = isMetric ? 'celsius' : 'fahrenheit';
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${fav.lat}&longitude=${fav.lon}&current=temperature_2m,is_day,weather_code&temperature_unit=${tempUnit}`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      
      const tempEl = document.getElementById(`fav-temp-${index}`);
      const iconEl = document.getElementById(`fav-icon-${index}`);
      
      if (tempEl) tempEl.textContent = `${Math.round(data.current.temperature_2m)}°`;
      if (iconEl) {
        const codeInfo = weatherCodes[data.current.weather_code] || { icon: 'clear' };
        iconEl.innerHTML = getSVGIcon(codeInfo.icon, data.current.is_day);
      }
    } catch (err) {
      console.warn(`Could not update weather info for favorite: ${fav.name}`, err);
    }
  });
}

// --- Action & Event handlers ---

/**
 * Set the current active dashboard location and trigger refresh
 */
async function setLocation(loc) {
  state.currentLocation = loc;
  
  // Show skeletons during fetch
  const heroSkeleton = document.querySelector('.skeleton-hero');
  if (heroSkeleton) heroSkeleton.classList.remove('hidden');
  document.querySelector('.hero-content').classList.add('hidden');
  
  try {
    state.weatherData = await fetchWeatherData(loc.lat, loc.lon);
    
    // Set dynamic theme class
    setWeatherTheme(state.weatherData.current.weather_code, state.weatherData.current.is_day);
    
    // Draw components
    renderCurrentWeather();
    renderHourlyForecast();
    renderDailyForecast();
    renderTrendChart();
    
  } catch (error) {
    alert(`Could not load weather details for ${loc.name}. Please check your connection.`);
  }
}

/**
 * Handle Favorite / Pinned locations toggle button
 */
function toggleFavoriteCurrent() {
  const current = state.currentLocation;
  if (!current) return;
  
  const existingIdx = state.favorites.findIndex(fav => 
    Math.abs(fav.lat - current.lat) < 0.01 && Math.abs(fav.lon - current.lon) < 0.01
  );
  
  if (existingIdx !== -1) {
    // Remove from pinned
    state.favorites.splice(existingIdx, 1);
  } else {
    // Add to pinned
    state.favorites.push({
      name: current.name,
      country: current.country,
      lat: current.lat,
      lon: current.lon
    });
  }
  
  localStorage.setItem('weather_favorites', JSON.stringify(state.favorites));
  renderFavorites();
  
  // Refresh button state
  const isPinned = existingIdx === -1; // was not pinned, now pinned
  const favBtn = document.getElementById('favorite-btn');
  if (isPinned) {
    favBtn.classList.add('pinned');
  } else {
    favBtn.classList.remove('pinned');
  }
}

/**
 * Remove favorite by direct index
 */
function removeFavoriteByIndex(index) {
  state.favorites.splice(index, 1);
  localStorage.setItem('weather_favorites', JSON.stringify(state.favorites));
  renderFavorites();
  
  // Update bookmark icon on current card in case we deleted the current active place
  if (state.currentLocation) {
    const isStillPinned = state.favorites.some(fav => 
      Math.abs(fav.lat - state.currentLocation.lat) < 0.01 && Math.abs(fav.lon - state.currentLocation.lon) < 0.01
    );
    const favBtn = document.getElementById('favorite-btn');
    if (isStillPinned) favBtn.classList.add('pinned');
    else favBtn.classList.remove('pinned');
  }
}

/**
 * Get weather information based on browser geolocation
 */
function handleGeolocation() {
  if (!navigator.geolocation) {
    alert("Geolocation is not supported by your browser.");
    return;
  }
  
  const locateBtn = document.getElementById('locate-btn');
  locateBtn.style.opacity = '0.5';
  
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      
      // Perform reverse geocoding to display a neat name
      const geoInfo = await reverseGeocode(lat, lon);
      setLocation({
        name: geoInfo.name,
        country: geoInfo.country,
        lat: lat,
        lon: lon
      });
      
      locateBtn.style.opacity = '1';
    },
    (error) => {
      console.warn("Geolocation warning:", error);
      alert("Unable to retrieve location. Using London default.");
      locateBtn.style.opacity = '1';
      // Load fallback default location (London)
      setLocation(state.favorites[0]);
    }
  );
}

// Debounce helper
function debounce(func, delay) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}

// --- Initialization & Listeners ---

document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('search-input');
  const suggestionsList = document.getElementById('suggestions-list');
  const favBtn = document.getElementById('favorite-btn');
  const locateBtn = document.getElementById('locate-btn');
  const unitCBtn = document.getElementById('unit-c');
  const unitFBtn = document.getElementById('unit-f');
  
  // Redraw sidebar favorites list
  renderFavorites();
  
  // Set default initial weather
  if (state.favorites.length > 0) {
    setLocation(state.favorites[0]);
  } else {
    setLocation({ name: 'London', country: 'United Kingdom', lat: 51.5085, lon: -0.1257 });
  }
  
  // Unit Toggles
  unitCBtn.addEventListener('click', () => {
    if (state.units === 'metric') return;
    state.units = 'metric';
    localStorage.setItem('weather_units', 'metric');
    unitCBtn.classList.add('active');
    unitFBtn.classList.remove('active');
    if (state.currentLocation) {
      setLocation(state.currentLocation);
    }
    renderFavorites(); // Redraw favorite values in Celsius
  });

  unitFBtn.addEventListener('click', () => {
    if (state.units === 'imperial') return;
    state.units = 'imperial';
    localStorage.setItem('weather_units', 'imperial');
    unitFBtn.classList.add('active');
    unitCBtn.classList.remove('active');
    if (state.currentLocation) {
      setLocation(state.currentLocation);
    }
    renderFavorites(); // Redraw favorite values in Fahrenheit
  });

  // Favorite Bookmark button
  favBtn.addEventListener('click', toggleFavoriteCurrent);
  
  // Favorites sidebar click delegation for removing
  document.getElementById('favorites-list').addEventListener('click', (e) => {
    const btn = e.target.closest('.remove-fav-btn');
    if (btn) {
      e.stopPropagation();
      const index = parseInt(btn.dataset.index);
      removeFavoriteByIndex(index);
    }
  });

  // Locate Me button click
  locateBtn.addEventListener('click', handleGeolocation);
  
  // City search geocoding autocompletion handler
  const handleSearchInput = async (e) => {
    const query = e.target.value.trim();
    if (query.length < 2) {
      suggestionsList.classList.add('hidden');
      return;
    }
    
    const results = await fetchCitySuggestions(query);
    if (results.length === 0) {
      suggestionsList.innerHTML = `<li style="cursor:default;color:var(--text-muted);">No results found</li>`;
      suggestionsList.classList.remove('hidden');
      return;
    }
    
    suggestionsList.innerHTML = '';
    results.forEach((city) => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span class="city-name">${city.name}</span>
        <span class="city-country">${city.admin1 ? city.admin1 + ', ' : ''}${city.country || ''}</span>
      `;
      li.addEventListener('click', () => {
        setLocation({
          name: city.name,
          country: city.country,
          lat: city.latitude,
          lon: city.longitude
        });
        suggestionsList.classList.add('hidden');
        searchInput.value = '';
      });
      suggestionsList.appendChild(li);
    });
    
    suggestionsList.classList.remove('hidden');
  };
  
  searchInput.addEventListener('input', debounce(handleSearchInput, 300));
  
  // Close suggestion box if clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-container')) {
      suggestionsList.classList.add('hidden');
    }
  });
  
  // Draw graph dynamically on resize to keep it perfectly responsive
  window.addEventListener('resize', debounce(() => {
    if (state.weatherData) {
      renderTrendChart();
    }
  }, 250));
});
