export class DashboardView {
  constructor({ api, ui, state, storage, router }) {
    this.api = api;
    this.ui = ui;
    this.state = state;
    this.storage = storage;
    this.router = router;
    this.countries = [];
    this.cities = [];
    this.pendingCountryCode = null;
    this.pendingCountryName = null;
    this.pendingCityName = null;
    this._clockInterval = null;
  }

  async mount(container) {
    if (this._clockInterval) clearInterval(this._clockInterval);
    container.innerHTML = this._skeleton();
    this._bindStaticEvents();
    this._renderStats();

    if (this.countries.length === 0) {
      try {
        this.countries = await this.api.getAvailableCountries();
      } catch {
        this.ui.toast("Could not load the country list", "error");
        this.countries = [];
      }
    }

    if (this.state.hasCountry()) {
      this.pendingCountryCode = this.state.countryCode;
      this.pendingCountryName = this.state.countryName;
      this.pendingCityName = this.state.cityName;
      this._setCountryTrigger(this.pendingCountryCode, this.pendingCountryName);
      await this._loadCitiesInto(this.pendingCountryName, this.pendingCityName);
      this._loadCountryInfo();
    }

    this._renderCountryList("");
    this._updateDestSummary();
    this._renderStats();
  }

  _skeleton() {
    const years = [this.state.year, this.state.year + 1, this.state.year + 2];
    return `
      <div class="wl-stats-grid">
        <div class="wl-stat-card wl-stat-primary">
          <div class="wl-stat-icon"><i class="bi bi-globe-americas"></i></div>
          <div class="wl-stat-copy">
            <span id="stat-countries">90+</span>
            <small>Countries Available</small>
          </div>
        </div>
        <div class="wl-stat-card wl-stat-success">
          <div class="wl-stat-icon"><i class="bi bi-calendar-check-fill"></i></div>
          <div class="wl-stat-copy">
            <span>17</span>
            <small>Holidays This Year</small>
          </div>
        </div>
        <div class="wl-stat-card wl-stat-warning">
          <div class="wl-stat-icon"><i class="bi bi-star-fill"></i></div>
          <div class="wl-stat-copy">
            <span>500+</span>
            <small>Events Worldwide</small>
          </div>
        </div>
        <div class="wl-stat-card wl-stat-danger">
          <div class="wl-stat-icon"><i class="bi bi-heart-fill"></i></div>
          <div class="wl-stat-copy">
            <span id="stat-plans">0</span>
            <small>Saved Plans</small>
          </div>
        </div>
      </div>

      <div class="wl-card wl-dashboard-search">
        <div class="wl-section-heading">
          <h2><i class="bi bi-globe"></i> Select Your Destination</h2>
          <p>Choose a country to explore holidays, events, weather, and more</p>
        </div>
        <div class="wl-dashboard-search-panel">
          <div class="row g-3 align-items-end">
            <div class="col-lg-4 col-md-6">
              <label class="form-label"><i class="bi bi-globe"></i> Country</label>
              <div class="wl-combo" id="db-country-combo">
                <button type="button" class="wl-combo-trigger" id="db-country-trigger">
                  <span class="wl-combo-placeholder" id="db-country-value">Select Country</span>
                  <i class="bi bi-chevron-down"></i>
                </button>
                <div class="wl-combo-panel d-none" id="db-country-panel">
                  <div class="wl-combo-search">
                    <i class="bi bi-search"></i>
                    <input type="text" id="db-country-search" placeholder="Search countries..." autocomplete="off" />
                  </div>
                  <div class="wl-combo-list" id="db-country-list"></div>
                </div>
              </div>
            </div>
            <div class="col-lg-4 col-md-6">
              <label class="form-label"><i class="bi bi-building"></i> City <small class="text-muted">(Optional)</small></label>
              <div class="wl-combo" id="db-city-combo">
                <button type="button" class="wl-combo-trigger" id="db-city-trigger" disabled>
                  <i class="bi bi-building"></i>
                  <span class="wl-combo-placeholder" id="db-city-value">Select City</span>
                  <i class="bi bi-chevron-down"></i>
                </button>
                <div class="wl-combo-panel d-none" id="db-city-panel">
                  <div class="wl-combo-search">
                    <i class="bi bi-search"></i>
                    <input type="text" id="db-city-search" placeholder="Search cities..." autocomplete="off" />
                  </div>
                  <div class="wl-combo-list" id="db-city-list"></div>
                </div>
              </div>
            </div>
            <div class="col-lg-2 col-md-6">
              <label class="form-label"><i class="bi bi-calendar3"></i> Year</label>
              <div class="wl-input-icon">
                <i class="bi bi-calendar3"></i>
                <select id="db-year" class="form-select">
                  ${years.map((y) => `<option value="${y}">${y}</option>`).join("")}
                </select>
              </div>
            </div>
            <div class="col-lg-2 col-md-6 d-grid">
              <button id="db-explore" class="btn wl-btn-primary"><i class="bi bi-search"></i> Explore</button>
            </div>
          </div>
          <div id="db-dest-summary" class="wl-dest-summary d-none mt-3"></div>
        </div>
      </div>

      <div class="wl-card mt-4">
        <div class="wl-section-heading">
          <h2><i class="bi bi-flag-fill"></i> Country Information</h2>
        </div>
        <div id="db-country-info">
          <div class="wl-dc-placeholder">
            <i class="bi bi-globe"></i>
            <p>Select a country to view detailed information</p>
          </div>
        </div>
      </div>
    `;
  }

  _bindStaticEvents() {
    document.getElementById("db-explore").addEventListener("click", () => this._applySelection());

    document.getElementById("db-country-trigger").addEventListener("click", (e) => {
      e.stopPropagation();
      this._toggleCombo("country");
    });
    document.getElementById("db-city-trigger").addEventListener("click", (e) => {
      e.stopPropagation();
      if (e.currentTarget.disabled) return;
      this._toggleCombo("city");
    });

    document.getElementById("db-country-search").addEventListener("input", (e) => {
      this._renderCountryList(e.target.value.trim().toLowerCase());
    });
    document.getElementById("db-country-search").addEventListener("click", (e) => e.stopPropagation());

    document.getElementById("db-city-search").addEventListener("input", (e) => {
      this._renderCityList(e.target.value.trim().toLowerCase());
    });
    document.getElementById("db-city-search").addEventListener("click", (e) => e.stopPropagation());

    document.getElementById("db-country-list").addEventListener("click", (e) => {
      const item = e.target.closest("[data-code]");
      if (!item) return;
      this._selectCountry(item.dataset.code, item.dataset.name);
    });
    document.getElementById("db-city-list").addEventListener("click", (e) => {
      const item = e.target.closest("[data-city]");
      if (!item) return;
      this._selectCity(item.dataset.city);
    });

    document.addEventListener("click", () => this._closeCombos());
  }

  _toggleCombo(which) {
    const openId = which === "country" ? "db-country-combo" : "db-city-combo";
    const combo = document.getElementById(openId);
    const isOpen = combo.classList.contains("open");
    this._closeCombos();
    if (!isOpen) {
      combo.classList.add("open");
      combo.querySelector(".wl-combo-panel").classList.remove("d-none");
      combo.querySelector("i.bi-chevron-down, i.bi-chevron-up").className = "bi bi-chevron-up";
    }
  }

  _closeCombos() {
    ["db-country-combo", "db-city-combo"].forEach((id) => {
      const combo = document.getElementById(id);
      if (!combo) return;
      combo.classList.remove("open");
      combo.querySelector(".wl-combo-panel").classList.add("d-none");
      const chevron = combo.querySelector("i.bi-chevron-down, i.bi-chevron-up");
      if (chevron) chevron.className = "bi bi-chevron-down";
    });
  }

  _renderCountryList(filterText) {
    const list = document.getElementById("db-country-list");
    const filtered = this.countries.filter((c) => c.name.toLowerCase().includes(filterText));
    if (!filtered.length) {
      list.innerHTML = `<div class="wl-combo-empty">No countries found</div>`;
      return;
    }
    list.innerHTML = filtered
      .map(
        (c) => `
        <div class="wl-combo-item" data-code="${c.countryCode}" data-name="${c.name}">
          <img class="wl-combo-flag" src="https://flagcdn.com/w20/${c.countryCode.toLowerCase()}.png" alt="" onerror="this.style.visibility='hidden'" />
          <span class="wl-combo-name">${c.name}</span>
          <span class="wl-combo-code">${c.countryCode}</span>
        </div>`
      )
      .join("");
  }

  _setCountryTrigger(code, name) {
    document.getElementById("db-country-value").innerHTML = `
      <img class="wl-combo-trigger-flag" src="https://flagcdn.com/w20/${code.toLowerCase()}.png" alt="" onerror="this.style.visibility='hidden'" />
      <span class="wl-combo-trigger-text">${name}</span>
    `;
    document.getElementById("db-country-value").classList.remove("wl-combo-placeholder");
    document.getElementById("db-country-value").classList.add("d-flex", "align-items-center", "gap-2");
  }

  _setCityTrigger(cityName) {
    const el = document.getElementById("db-city-value");
    el.textContent = cityName;
    el.classList.remove("wl-combo-placeholder");
  }

  _resetCountryTrigger() {
    const el = document.getElementById("db-country-value");
    el.className = "wl-combo-placeholder";
    el.textContent = "Select Country";
  }

  _resetCityTrigger() {
    const el = document.getElementById("db-city-value");
    el.className = "wl-combo-placeholder";
    el.textContent = "Select City";
  }

  async _selectCountry(code, name) {
    this.pendingCountryCode = code;
    this.pendingCountryName = name;
    this.pendingCityName = null;
    this._setCountryTrigger(code, name);
    this._resetCityTrigger();
    this._closeCombos();
    this._updateDestSummary();
    await this._loadCitiesInto(name, null);
  }

  _selectCity(cityName) {
    this.pendingCityName = cityName;
    this._setCityTrigger(cityName);
    this._closeCombos();
    this._updateDestSummary();
  }

  _renderCityList(filterText) {
    const list = document.getElementById("db-city-list");
    const filtered = this.cities.filter((c) => c.toLowerCase().includes(filterText));
    if (!filtered.length) {
      list.innerHTML = `<div class="wl-combo-empty">No cities found</div>`;
      return;
    }
    list.innerHTML = filtered.map((c) => `<div class="wl-combo-item" data-city="${c}"><span class="wl-combo-name">${c}</span></div>`).join("");
  }

  async _loadCitiesInto(countryName, preselectCity) {
    const trigger = document.getElementById("db-city-trigger");
    const searchInput = document.getElementById("db-city-search");
    const list = document.getElementById("db-city-list");
    if (!countryName) {
      trigger.disabled = true;
      this._resetCityTrigger();
      list.innerHTML = "";
      this.cities = [];
      return;
    }

    trigger.disabled = true;
    searchInput.value = "";
    list.innerHTML = `<div class="wl-combo-empty">Loading cities...</div>`;
    try {
      this.cities = await this.api.getCitiesForCountry(countryName);
      if (!this.cities.length) {
        list.innerHTML = `<div class="wl-combo-empty">No cities found</div>`;
        trigger.disabled = true;
        return;
      }
      this._renderCityList("");
      trigger.disabled = false;
      if (preselectCity && this.cities.includes(preselectCity)) {
        this.pendingCityName = preselectCity;
        this._setCityTrigger(preselectCity);
      }
    } catch {
      list.innerHTML = `<div class="wl-combo-empty">Couldn't load cities</div>`;
      trigger.disabled = true;
    }
  }

  _updateDestSummary() {
    const box = document.getElementById("db-dest-summary");
    if (!this.pendingCountryCode) {
      box.classList.add("d-none");
      box.innerHTML = "";
      return;
    }
    box.classList.remove("d-none");
    box.innerHTML = `
      <img class="wl-dest-summary-flag" src="https://flagcdn.com/w80/${this.pendingCountryCode.toLowerCase()}.png" alt="" onerror="this.style.visibility='hidden'" />
      <div class="wl-dest-summary-text">
        <strong>${this.pendingCountryName}</strong>
        ${this.pendingCityName ? `<span>• ${this.pendingCityName}</span>` : ""}
      </div>
      <button type="button" class="wl-dest-clear" id="db-dest-clear"><i class="bi bi-x"></i></button>
    `;
    document.getElementById("db-dest-clear").addEventListener("click", () => this._clearDestination());
  }

  _clearDestination() {
    this.pendingCountryCode = null;
    this.pendingCountryName = null;
    this.pendingCityName = null;
    this.cities = [];
    this._resetCountryTrigger();
    this._resetCityTrigger();
    document.getElementById("db-city-trigger").disabled = true;
    document.getElementById("db-city-list").innerHTML = "";
    this._updateDestSummary();
    this.state.clear();
    document.getElementById("db-country-info").innerHTML = `
      <div class="wl-dc-placeholder">
        <i class="bi bi-globe"></i>
        <p>Select a country to view detailed information</p>
      </div>
    `;
    this.ui.toast("Selection cleared", "info");
  }

  async _applySelection() {
    const yearSelect = document.getElementById("db-year");
    const exploreBtn = document.getElementById("db-explore");

    if (!this.pendingCountryCode) {
      this.ui.toast("Please choose a country first", "error");
      return;
    }
    this.state.setYear(yearSelect.value);

    let lat = null, lon = null;
    const cityName = this.pendingCityName;

    exploreBtn.disabled = true;
    exploreBtn.innerHTML = `<i class="bi bi-arrow-repeat spin"></i> Exploring...`;

    if (cityName) {
      try {
        const results = await this.api.searchCity(cityName);
        const match = results.find((r) => r.country?.toLowerCase() === this.pendingCountryName.toLowerCase()) || results[0];
        if (match) {
          lat = match.latitude;
          lon = match.longitude;
        }
      } catch {}
    }

    exploreBtn.disabled = false;
    exploreBtn.innerHTML = `<i class="bi bi-search"></i> Explore`;

    this.state.setDestination({ countryCode: this.pendingCountryCode, countryName: this.pendingCountryName, cityName, lat, lon });
    this.ui.toast(`Exploring ${this.pendingCountryName}${cityName ? ", " + cityName : ""}`, "success");
    await this._loadCountryInfo();
  }

  _renderStats() {
    const plansEl = document.getElementById("stat-plans");
    if (plansEl) plansEl.textContent = this.storage.counts().all;
  }

  async _loadCountryInfo() {
    if (this._clockInterval) clearInterval(this._clockInterval);
    const box = document.getElementById("db-country-info");
    box.innerHTML = `<div class="wl-inline-loading"><i class="bi bi-arrow-repeat spin"></i> Loading country info...</div>`;
    try {
      const info = await this.api.getCountryInfo(this.state.countryCode);
      box.innerHTML = this._countryInfoHtml(info);
      this._bindCountryInfoEvents(info);
      this._startLocalClock(info);
    } catch {
      box.innerHTML = this.ui.emptyState("bi-exclamation-triangle", "Couldn't load this country", "Please try again.");
    }
  }

  _countryInfoHtml(info) {
    const currencies = info.currencies
      ? Object.entries(info.currencies).map(([code, c]) => `${c.name} (${code})`).join(", ")
      : "N/A";
    const languages = info.languages ? Object.values(info.languages).join(", ") : "N/A";
    const callingCode = info.idd?.root ? `${info.idd.root}${info.idd.suffixes?.[0] || ""}` : "N/A";
    const area = info.area ? `${info.area.toLocaleString()} km\u00B2` : "N/A";
    const weekStart = info.startOfWeek ? info.startOfWeek[0].toUpperCase() + info.startOfWeek.slice(1) : "N/A";
    const neighborsHtml = info.borders?.length
      ? info.borders.map((code) => `<button type="button" class="wl-extra-tag border-tag" data-border="${code}">${code}</button>`).join("")
      : `<span class="wl-extra-tag">None — island nation</span>`;
    const mapsUrl = info.maps?.googleMaps || `https://www.google.com/maps/place/${encodeURIComponent(info.name.common)}`;
    const flagUrl = info.cca2 ? `https://flagcdn.com/w160/${info.cca2.toLowerCase()}.png` : info.flags?.svg;

    return `
      <div class="wl-dc-header">
        <img src="${flagUrl}" alt="${info.name.common}" class="wl-dc-flag" />
        <div class="wl-dc-title">
          <h3>${info.name.common}</h3>
          <p class="official-name">${info.name.official}</p>
          <span class="region"><i class="bi bi-geo-alt-fill"></i> ${info.region}${info.subregion ? " • " + info.subregion : ""}</span>
        </div>
      </div>

      <div class="wl-local-time-row">
        <div class="wl-local-time">
          <i class="bi bi-clock-fill"></i>
          <span class="wl-local-time-value" id="db-local-time">--:--:--</span>
          <span class="wl-local-time-zone">${info.timezones?.[0] || "UTC"}</span>
        </div>
      </div>

      <div class="wl-dc-grid">
        <div class="wl-dc-detail"><i class="bi bi-building"></i><span class="label">Capital</span><span class="value">${info.capital?.[0] || "N/A"}</span></div>
        <div class="wl-dc-detail"><i class="bi bi-people-fill"></i><span class="label">Population</span><span class="value">${info.population?.toLocaleString() || "N/A"}</span></div>
        <div class="wl-dc-detail"><i class="bi bi-arrows-angle-expand"></i><span class="label">Area</span><span class="value">${area}</span></div>
        <div class="wl-dc-detail"><i class="bi bi-globe"></i><span class="label">Continent</span><span class="value">${info.continents?.[0] || "N/A"}</span></div>
        <div class="wl-dc-detail"><i class="bi bi-telephone-fill"></i><span class="label">Calling Code</span><span class="value">${callingCode}</span></div>
        <div class="wl-dc-detail"><i class="bi bi-car-front-fill"></i><span class="label">Driving Side</span><span class="value">${info.car?.side === "left" ? "Left" : "Right"}</span></div>
        <div class="wl-dc-detail"><i class="bi bi-calendar-week"></i><span class="label">Week Starts</span><span class="value">${weekStart}</span></div>
      </div>

      <div class="wl-dc-extras">
        <div class="wl-dc-extra">
          <h4><i class="bi bi-cash-coin"></i> Currency</h4>
          <div class="wl-extra-tags"><span class="wl-extra-tag">${currencies}</span></div>
        </div>
        <div class="wl-dc-extra">
          <h4><i class="bi bi-translate"></i> Languages</h4>
          <div class="wl-extra-tags"><span class="wl-extra-tag">${languages}</span></div>
        </div>
        <div class="wl-dc-extra">
          <h4><i class="bi bi-signpost-split-fill"></i> Neighbors</h4>
          <div class="wl-extra-tags">${neighborsHtml}</div>
        </div>
      </div>

      <div class="wl-dc-actions">
        <a href="${mapsUrl}" target="_blank" rel="noopener" class="wl-map-link">
          <i class="bi bi-map-fill"></i> View on Google Maps
        </a>
      </div>
    `;
  }

  _bindCountryInfoEvents() {
    document.querySelectorAll("#db-country-info [data-border]").forEach((btn) => {
      btn.addEventListener("click", () => this._exploreNeighbor(btn.dataset.border));
    });
  }

  async _exploreNeighbor(cca3) {
    try {
      const neighborInfo = await this.api.getCountryInfo(cca3);
      const cca2 = neighborInfo.cca2;
      const supported = this.countries.find((c) => c.countryCode === cca2);
      if (!supported) {
        this.ui.toast(`Holiday data isn't available for ${neighborInfo.name.common} yet`, "info");
        return;
      }
      this.pendingCountryCode = cca2;
      this.pendingCountryName = neighborInfo.name.common;
      this.pendingCityName = null;
      this._setCountryTrigger(cca2, neighborInfo.name.common);
      this._resetCityTrigger();
      this._updateDestSummary();
      this.state.setDestination({ countryCode: cca2, countryName: neighborInfo.name.common, cityName: null, lat: null, lon: null });
      this.ui.toast(`Exploring ${neighborInfo.name.common}`, "success");
      await this._loadCitiesInto(neighborInfo.name.common, null);
      await this._loadCountryInfo();
    } catch {
      this.ui.toast("Couldn't load that neighboring country", "error");
    }
  }

  _startLocalClock(info) {
    const el = document.getElementById("db-local-time");
    if (!el) return;
    const offsetMinutes = this._parseUtcOffset(info.timezones?.[0]);
    if (offsetMinutes === null) {
      el.textContent = "N/A";
      return;
    }
    const tick = () => {
      const now = new Date();
      const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
      const local = new Date(utcMs + offsetMinutes * 60000);
      el.textContent = local.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    };
    tick();
    this._clockInterval = setInterval(tick, 1000);
  }

  _parseUtcOffset(tz) {
    if (!tz) return null;
    if (tz === "UTC") return 0;
    const m = tz.match(/UTC([+-])(\d{2}):(\d{2})/);
    if (!m) return null;
    const sign = m[1] === "-" ? -1 : 1;
    return sign * (Number(m[2]) * 60 + Number(m[3]));
  }
}
