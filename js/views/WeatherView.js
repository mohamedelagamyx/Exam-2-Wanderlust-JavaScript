const WEATHER_CODES = {
  0: ["Clear sky", "bi-sun-fill"], 1: ["Mainly clear", "bi-brightness-high"], 2: ["Partly cloudy", "bi-cloud-sun"],
  3: ["Overcast", "bi-clouds-fill"], 45: ["Fog", "bi-cloud-fog2"], 48: ["Rime fog", "bi-cloud-fog2"],
  51: ["Light drizzle", "bi-cloud-drizzle"], 61: ["Slight rain", "bi-cloud-rain"], 63: ["Rain", "bi-cloud-rain-heavy"],
  65: ["Heavy rain", "bi-cloud-rain-heavy"], 71: ["Slight snow", "bi-snow"], 75: ["Heavy snow", "bi-snow2"],
  80: ["Rain showers", "bi-cloud-rain"], 95: ["Thunderstorm", "bi-cloud-lightning-rain"],
};
function weatherInfo(code) {
  return WEATHER_CODES[code] || ["Unknown", "bi-cloud"];
}

const COMPASS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
function degToCompass(deg) {
  if (deg === undefined || deg === null) return "";
  return COMPASS[Math.round(deg / 22.5) % 16];
}

function uvCategory(uv) {
  if (uv === undefined || uv === null) return { label: "N/A", cls: "" };
  if (uv < 3) return { label: "Low", cls: "low" };
  if (uv < 6) return { label: "Moderate", cls: "moderate" };
  if (uv < 8) return { label: "High", cls: "high" };
  if (uv < 11) return { label: "Very High", cls: "very-high" };
  return { label: "Extreme", cls: "extreme" };
}

export class WeatherView {
  constructor({ api, ui, state, storage, router }) {
    this.api = api;
    this.ui = ui;
    this.state = state;
    this.storage = storage;
    this.router = router;
  }

  async mount(container) {
    container.innerHTML = `
      <div class="wl-view-header wl-header-blue">
        <div class="wl-view-header-row">
          <h2><i class="bi bi-cloud-sun-fill"></i> Weather Forecast</h2>
          ${this.state.hasCity() ? this.ui.headerBadge(this.state.countryCode, this.state.countryName, null, this.state.cityName) : ""}
        </div>
        <p>Check 7-day weather forecasts for cities around the world</p>
      </div>
      <div id="wv-body"></div>
    `;

    const body = document.getElementById("wv-body");

    if (!this.state.hasCity()) {
      body.innerHTML = this.ui.emptyState(
        "bi-cloud-slash",
        "No City Selected",
        "Select a country and city from the dashboard to see the weather forecast",
        `<button class="btn wl-btn-primary" id="wv-goto-dash"><i class="bi bi-house"></i> Go to Dashboard</button>`
      );
      document.getElementById("wv-goto-dash").addEventListener("click", () => this.router.navigate("dashboard"));
      return;
    }

    body.innerHTML = `<div class="wl-inline-loading"><i class="bi bi-arrow-repeat spin"></i> Loading forecast...</div>`;

    try {
      const data = await this.api.getWeather(this.state.lat, this.state.lon);
      this._render(data);
    } catch {
      body.innerHTML = this.ui.emptyState("bi-exclamation-triangle", "Failed to load", "Please try again.");
    }
  }

  _render(data) {
    const [desc, icon] = weatherInfo(data.current.weather_code);
    const body = document.getElementById("wv-body");
    const now = new Date();

    let hourlyHtml = "";
    if (data.hourly?.time?.length) {
      let startIdx = data.hourly.time.indexOf(data.current.time);
      if (startIdx === -1) startIdx = 0;
      hourlyHtml = data.hourly.time
        .slice(startIdx, startIdx + 8)
        .map((t, i) => {
          const idx = startIdx + i;
          const [, hIcon] = weatherInfo(data.hourly.weather_code[idx]);
          const label = i === 0 ? "Now" : new Date(t).toLocaleTimeString("en-US", { hour: "numeric" });
          return `
          <div class="wl-hourly-item ${i === 0 ? "now" : ""}">
            <span>${label}</span>
            <i class="bi ${hIcon}"></i>
            <strong>${Math.round(data.hourly.temperature_2m[idx])}°</strong>
          </div>`;
        })
        .join("");
    }

    const uv = uvCategory(data.daily.uv_index_max?.[0]);
    const compass = degToCompass(data.current.wind_direction_10m);
    const precipSum = data.daily.precipitation_sum?.[0] ?? 0;

    const sunrise = new Date(data.daily.sunrise[0]);
    const sunset = new Date(data.daily.sunset[0]);
    let sunPct = ((now - sunrise) / (sunset - sunrise)) * 100;
    sunPct = Math.max(0, Math.min(100, sunPct));

    body.innerHTML = `
      <div class="wl-weather-hero">
        <div class="wl-wh-top">
          <span class="wl-wh-location"><i class="bi bi-geo-alt-fill"></i> ${this.state.cityName}</span>
          <span class="wl-wh-date">${now.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}</span>
        </div>
        <div class="wl-wh-main">
          <div class="wl-wh-left">
            <i class="bi ${icon}"></i>
            <div class="wl-temp-big">${Math.round(data.current.temperature_2m)}°C</div>
          </div>
          <div class="wl-wh-right">
            <p class="wl-wh-desc">${desc}</p>
            <p class="wl-wh-feels">Feels like ${Math.round(data.current.apparent_temperature)}°C</p>
            <p class="wl-wh-hilo">
              <span class="hi"><i class="bi bi-arrow-up"></i> ${Math.round(data.daily.temperature_2m_max[0])}°</span>
              <span class="lo"><i class="bi bi-arrow-down"></i> ${Math.round(data.daily.temperature_2m_min[0])}°</span>
            </p>
          </div>
        </div>
      </div>

      <div class="wl-weather-details-grid">
        <div class="wl-weather-detail-card">
          <div class="wl-detail-icon humidity"><i class="bi bi-droplet-fill"></i></div>
          <div class="wl-detail-copy">
            <span class="label">Humidity</span>
            <span class="value">${data.current.relative_humidity_2m}%</span>
            <div class="wl-mini-bar"><div class="wl-mini-bar-fill" style="width:${data.current.relative_humidity_2m}%"></div></div>
          </div>
        </div>
        <div class="wl-weather-detail-card">
          <div class="wl-detail-icon wind"><i class="bi bi-wind"></i></div>
          <div class="wl-detail-copy">
            <span class="label">Wind</span>
            <span class="value">${Math.round(data.current.wind_speed_10m)} km/h</span>
            <span class="wl-detail-sub">${compass}</span>
          </div>
        </div>
        <div class="wl-weather-detail-card">
          <div class="wl-detail-icon uv"><i class="bi bi-sun-fill"></i></div>
          <div class="wl-detail-copy">
            <span class="label">UV Index</span>
            <span class="value">${data.daily.uv_index_max?.[0] ?? "N/A"}</span>
            <span class="wl-uv-badge ${uv.cls}">${uv.label}</span>
          </div>
        </div>
        <div class="wl-weather-detail-card">
          <div class="wl-detail-icon precip"><i class="bi bi-cloud-rain-fill"></i></div>
          <div class="wl-detail-copy">
            <span class="label">Precipitation</span>
            <span class="value">${data.daily.precipitation_probability_max?.[0] ?? 0}%</span>
            <span class="wl-detail-sub">${precipSum}mm expected</span>
          </div>
        </div>
        <div class="wl-weather-detail-card wl-sunrise-sunset-card">
          <div class="wl-ss-item">
            <i class="bi bi-sunrise-fill"></i>
            <span class="label">Sunrise</span>
            <span class="value">${sunrise.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
          <div class="wl-ss-arc"><div class="wl-ss-arc-dot" style="left:${sunPct}%"></div></div>
          <div class="wl-ss-item">
            <i class="bi bi-sunset-fill"></i>
            <span class="label">Sunset</span>
            <span class="value">${sunset.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
        </div>
      </div>

      ${
        hourlyHtml
          ? `<h3 class="wl-section-title"><i class="bi bi-clock-fill"></i> Hourly Forecast</h3>
      <div class="wl-hourly-scroll">${hourlyHtml}</div>`
          : ""
      }

      <h3 class="wl-section-title"><i class="bi bi-calendar-week"></i> 7-Day Forecast</h3>
      <div class="wl-forecast-row">
        ${data.daily.time
          .map((t, i) => {
            const [d, ic] = weatherInfo(data.daily.weather_code[i]);
            const day = new Date(t);
            return `
            <div class="wl-forecast-day ${i === 0 ? "today" : ""}">
              <span>${i === 0 ? "Today" : day.toLocaleDateString("en-US", { weekday: "short" })}</span>
              <small class="wl-fc-date">${day.toLocaleDateString("en-US", { day: "numeric", month: "short" })}</small>
              <i class="bi ${ic}"></i>
              <strong>${Math.round(data.daily.temperature_2m_max[i])}°</strong>
              <small>${Math.round(data.daily.temperature_2m_min[i])}°</small>
              <span class="wl-precip"><i class="bi bi-droplet-fill"></i> ${data.daily.precipitation_probability_max[i] || 0}%</span>
            </div>`;
          })
          .join("")}
      </div>
    `;
  }
}
