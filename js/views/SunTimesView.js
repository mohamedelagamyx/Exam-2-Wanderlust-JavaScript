export class SunTimesView {
  constructor({ api, ui, state, router }) {
    this.api = api;
    this.ui = ui;
    this.state = state;
    this.router = router;
  }

  async mount(container) {
    container.innerHTML = `
      <div class="wl-view-header wl-header-sunset">
        <div class="wl-view-header-row">
          <h2><i class="bi bi-brightness-alt-high-fill"></i> Sunrise & Sunset Times</h2>
          ${this.state.hasCity() ? this.ui.headerBadge(this.state.countryCode, this.state.countryName, null, this.state.cityName) : ""}
        </div>
        <p>Plan your activities around golden hour - perfect for photographers and early risers</p>
      </div>
      <div id="st-body"></div>
    `;

    const body = document.getElementById("st-body");

    if (!this.state.hasCity()) {
      body.innerHTML = this.ui.emptyState(
        "bi-sunset",
        "No City Selected",
        "Select a country and city from the dashboard to see sunrise and sunset times",
        `<button class="btn wl-btn-primary" id="st-goto-dash"><i class="bi bi-house"></i> Go to Dashboard</button>`
      );
      document.getElementById("st-goto-dash").addEventListener("click", () => this.router.navigate("dashboard"));
      return;
    }

    body.innerHTML = `<div class="wl-inline-loading"><i class="bi bi-arrow-repeat spin"></i> Loading...</div>`;

    try {
      const today = new Date().toISOString().split("T")[0];
      const r = await this.api.getSunTimes(this.state.lat, this.state.lon, today);
      this._render(r);
    } catch {
      body.innerHTML = this.ui.emptyState("bi-exclamation-triangle", "Failed to load", "Please try again.");
    }
  }

  _render(r) {
    const fmt = (iso) => new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    const daylightSeconds = r.day_length;
    const darkSeconds = 86400 - daylightSeconds;
    const pct = ((daylightSeconds / 86400) * 100).toFixed(1);
    const fmtDuration = (secs) => `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`;
    const today = new Date();

    document.getElementById("st-body").innerHTML = `
      <div class="wl-sun-location-bar">
        <div>
          <h3><i class="bi bi-geo-alt-fill"></i> ${this.state.cityName}</h3>
          <p>Sun times for your selected location</p>
        </div>
        <div class="wl-sun-location-date">
          <div class="date">${today.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>
          <div class="day">${today.toLocaleDateString("en-US", { weekday: "long" })}</div>
        </div>
      </div>

      <div class="wl-sun-grid">
        <div class="wl-sun-card dawn">
          <i class="bi bi-moon-stars-fill"></i>
          <span class="sun-label">Dawn</span>
          <span class="sun-value">${fmt(r.civil_twilight_begin)}</span>
          <span class="sun-desc">Civil Twilight</span>
        </div>
        <div class="wl-sun-card sunrise">
          <i class="bi bi-sunrise-fill"></i>
          <span class="sun-label">Sunrise</span>
          <span class="sun-value">${fmt(r.sunrise)}</span>
          <span class="sun-desc">Golden Hour Start</span>
        </div>
        <div class="wl-sun-card noon">
          <i class="bi bi-brightness-high-fill"></i>
          <span class="sun-label">Solar Noon</span>
          <span class="sun-value">${fmt(r.solar_noon)}</span>
          <span class="sun-desc">Sun at Highest</span>
        </div>
        <div class="wl-sun-card sunset">
          <i class="bi bi-sunset-fill"></i>
          <span class="sun-label">Sunset</span>
          <span class="sun-value">${fmt(r.sunset)}</span>
          <span class="sun-desc">Golden Hour End</span>
        </div>
        <div class="wl-sun-card dusk">
          <i class="bi bi-moon-stars-fill"></i>
          <span class="sun-label">Dusk</span>
          <span class="sun-value">${fmt(r.civil_twilight_end)}</span>
          <span class="sun-desc">Civil Twilight</span>
        </div>
        <div class="wl-sun-card">
          <i class="bi bi-hourglass-split"></i>
          <span class="sun-label">Day Length</span>
          <span class="sun-value">${fmtDuration(daylightSeconds)}</span>
          <span class="sun-desc">Total Daylight</span>
        </div>
      </div>

      <div class="wl-daylength-card">
        <h3 class="wl-section-title"><i class="bi bi-pie-chart-fill"></i> Daylight Distribution</h3>
        <div class="wl-day-progress-bar">
          <div class="wl-day-progress-fill" style="width: ${pct}%"></div>
        </div>
        <div class="wl-day-stats">
          <div><div class="value">${fmtDuration(daylightSeconds)}</div><div class="label">Daylight</div></div>
          <div><div class="value">${pct}%</div><div class="label">of 24 Hours</div></div>
          <div><div class="value">${fmtDuration(darkSeconds)}</div><div class="label">Darkness</div></div>
        </div>
      </div>
    `;
  }
}
