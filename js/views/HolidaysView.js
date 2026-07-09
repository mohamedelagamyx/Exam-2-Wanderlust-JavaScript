export class HolidaysView {
  constructor({ api, ui, state, storage, router }) {
    this.api = api;
    this.ui = ui;
    this.state = state;
    this.storage = storage;
    this.router = router;
  }

  async mount(container) {
    this.container = container;
    container.innerHTML = `
      <div class="wl-view-header wl-header-green">
        <div class="wl-view-header-row">
          <h2><i class="bi bi-calendar-check"></i> Public Holidays Explorer</h2>
          ${this.state.hasCountry() ? this.ui.headerBadge(this.state.countryCode, this.state.countryName, this.state.year) : ""}
        </div>
        <p>Browse public holidays for any country and plan your trips around them</p>
      </div>
      <div id="hv-list" class="wl-grid-cards"></div>
    `;

    const list = document.getElementById("hv-list");

    if (!this.state.hasCountry()) {
      list.innerHTML = this.ui.emptyState(
        "bi-calendar-x",
        "No Country Selected",
        "Select a country from the dashboard to explore public holidays",
        `<button class="btn wl-btn-primary" id="hv-goto-dash"><i class="bi bi-house"></i> Go to Dashboard</button>`
      );
      document.getElementById("hv-goto-dash").addEventListener("click", () => this.router.navigate("dashboard"));
      return;
    }

    list.innerHTML = `<div class="wl-inline-loading"><i class="bi bi-arrow-repeat spin"></i> Loading holidays...</div>`;

    try {
      const holidays = await this.api.getHolidays(this.state.countryCode, this.state.year);
      this._render(holidays);
    } catch {
      list.innerHTML = this.ui.emptyState("bi-exclamation-triangle", "Failed to load", "Please try again in a moment.");
    }
  }

  _render(holidays) {
    const list = document.getElementById("hv-list");
    if (holidays.length === 0) {
      list.innerHTML = this.ui.emptyState("bi-calendar-x", "No holidays found", `Nothing on record for ${this.state.year}.`);
      return;
    }
    list.innerHTML = holidays
      .map((h) => {
        const d = new Date(h.date);
        const saved = this.storage.isSaved("holiday", (x) => x.date === h.date && x.name === h.name);
        return `
        <div class="wl-holiday-card">
          <div class="wl-date-box">
            <span>${d.getDate()}</span>
            <small>${d.toLocaleString("en-US", { month: "short" })}</small>
          </div>
          <div class="wl-holiday-body">
            <h4>${h.localName}</h4>
            <p>${h.name}</p>
            <div class="wl-holiday-footer">
              <span class="wl-day-badge"><i class="bi bi-calendar3"></i> ${d.toLocaleDateString("en-US", { weekday: "long" })}</span>
              <span class="wl-type-badge">${h.types?.[0] || "Public"}</span>
            </div>
          </div>
          <button class="wl-save-btn ${saved ? "saved" : ""}" data-date="${h.date}" data-name="${encodeURIComponent(h.name)}" data-local="${encodeURIComponent(h.localName)}">
            <i class="bi ${saved ? "bi-heart-fill" : "bi-heart"}"></i>
          </button>
        </div>`;
      })
      .join("");

    list.querySelectorAll(".wl-save-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const holiday = {
          date: btn.dataset.date,
          name: decodeURIComponent(btn.dataset.name),
          localName: decodeURIComponent(btn.dataset.local),
        };
        const ok = this.storage.save("holiday", holiday, (x) => x.date === holiday.date && x.name === holiday.name);
        if (ok) {
          btn.classList.add("saved");
          btn.querySelector("i").className = "bi bi-heart-fill";
          this.ui.toast("Saved to My Plans", "success");
        } else {
          this.ui.toast("Already saved", "info");
        }
      });
    });
  }
}
