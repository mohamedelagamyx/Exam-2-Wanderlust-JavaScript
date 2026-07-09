export class EventsView {
  constructor({ api, ui, state, storage, router }) {
    this.api = api;
    this.ui = ui;
    this.state = state;
    this.storage = storage;
    this.router = router;
  }

  async mount(container) {
    container.innerHTML = `
      <div class="wl-view-header wl-header-purple">
        <div class="wl-view-header-row">
          <h2><i class="bi bi-ticket-perforated-fill"></i> Events Explorer</h2>
          ${this.state.hasCity() ? this.ui.headerBadge(this.state.countryCode, this.state.countryName, null, this.state.cityName) : ""}
        </div>
        <p>Discover concerts, sports, theatre and more in cities worldwide</p>
      </div>
      <div id="ev-list" class="wl-grid-cards"></div>
    `;

    const list = document.getElementById("ev-list");

    if (!this.state.hasCity()) {
      list.innerHTML = this.ui.emptyState(
        "bi-ticket-perforated",
        "No City Selected",
        "Select a country and city from the dashboard to discover events",
        `<button class="btn wl-btn-primary" id="ev-goto-dash"><i class="bi bi-house"></i> Go to Dashboard</button>`
      );
      document.getElementById("ev-goto-dash").addEventListener("click", () => this.router.navigate("dashboard"));
      return;
    }

    list.innerHTML = `<div class="wl-inline-loading"><i class="bi bi-arrow-repeat spin"></i> Loading events...</div>`;

    try {
      const events = await this.api.getEvents(this.state.cityName, this.state.countryCode);
      this._render(events);
    } catch {
      list.innerHTML = this.ui.emptyState("bi-exclamation-triangle", "Failed to load", "Please try again.");
    }
  }

  _render(events) {
    const list = document.getElementById("ev-list");
    if (events.length === 0) {
      list.innerHTML = this.ui.emptyState("bi-ticket-perforated", "No events found", "Nothing scheduled right now.");
      return;
    }
    list.innerHTML = events
      .map((e) => {
        const saved = this.storage.isSaved("event", (x) => x.id === e.id);
        return `
        <div class="wl-event-card">
          <div class="wl-event-cat"><i class="bi ${e.icon}"></i> ${e.category}</div>
          <h4>${e.name}</h4>
          <p><i class="bi bi-calendar3"></i> ${new Date(e.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</p>
          <p><i class="bi bi-geo-alt"></i> ${e.venue}</p>
          <div class="d-flex justify-content-between align-items-center mt-3">
            <span class="wl-price">from $${e.price}</span>
            <button class="wl-save-btn ${saved ? "saved" : ""}" data-id="${e.id}">
              <i class="bi ${saved ? "bi-heart-fill" : "bi-heart"}"></i> Save
            </button>
          </div>
        </div>`;
      })
      .join("");

    list.querySelectorAll(".wl-save-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const event = events.find((e) => e.id === btn.dataset.id);
        const ok = this.storage.save("event", event, (x) => x.id === event.id);
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
