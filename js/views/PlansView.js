const TYPE_LABEL = { holiday: "Holiday", event: "Event", longweekend: "Long Weekend" };

export class PlansView {
  constructor({ ui, storage, router }) {
    this.ui = ui;
    this.storage = storage;
    this.router = router;
    this.currentFilter = "all";
  }

  mount(container) {
    this.container = container;
    container.innerHTML = `
      <div class="wl-view-header wl-header-pink">
        <div class="wl-view-header-row">
          <h2><i class="bi bi-heart-fill"></i> My Saved Plans</h2>
          <button id="pv-clear" class="wl-clear-all-btn"><i class="bi bi-trash"></i> Clear All</button>
        </div>
        <p>Your saved holidays, events, and trip ideas all in one place</p>
      </div>

      <div class="wl-filter-bar" id="pv-filters"></div>
      <div id="pv-list" class="wl-plans-grid"></div>
    `;

    document.getElementById("pv-clear").addEventListener("click", () => this._clearAll());
    this._renderFilters();
    this._renderList();
  }

  _renderFilters() {
    const counts = this.storage.counts();
    const filters = [
      { key: "all", label: "All", icon: "bi-collection" },
      { key: "holiday", label: "Holidays", icon: "bi-calendar-check" },
      { key: "event", label: "Events", icon: "bi-ticket-perforated" },
      { key: "longweekend", label: "Long Weekends", icon: "bi-umbrella" },
    ];
    document.getElementById("pv-filters").innerHTML = filters
      .map(
        (f) => `
      <button class="wl-filter-chip ${this.currentFilter === f.key ? "active" : ""}" data-key="${f.key}">
        <i class="bi ${f.icon}"></i> ${f.label} <span>${counts[f.key]}</span>
      </button>`
      )
      .join("");

    document.querySelectorAll(".wl-filter-chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.currentFilter = btn.dataset.key;
        this._renderFilters();
        this._renderList();
      });
    });
  }

  _renderList() {
    const list = document.getElementById("pv-list");
    const plans = this.storage.byType(this.currentFilter);

    if (plans.length === 0) {
      list.innerHTML = this.ui.emptyState(
        "bi-heart",
        "Nothing saved yet",
        "Go explore holidays, events, or long weekends and tap the heart icon to save them here.",
        `<button class="btn wl-btn-primary" id="pv-goto-dash"><i class="bi bi-compass"></i> Start exploring</button>`
      );
      const btn = document.getElementById("pv-goto-dash");
      if (btn) btn.addEventListener("click", () => this.router.navigate("dashboard"));
      return;
    }

    list.innerHTML = plans.map((p) => this._cardHtml(p)).join("");

    list.querySelectorAll("[data-remove]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.storage.remove(Number(btn.dataset.remove));
        this.ui.toast("Plan removed", "info");
        this._renderFilters();
        this._renderList();
      });
    });
  }

  _cardHtml(plan) {
    let title = "", dateLine = "", infoLine = "";
    if (plan.type === "holiday") {
      title = plan.data.localName;
      dateLine = new Date(plan.data.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      infoLine = plan.data.name;
    } else if (plan.type === "event") {
      title = plan.data.name;
      dateLine = new Date(plan.data.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      infoLine = plan.data.venue;
    } else {
      title = `${plan.data.dayCount} Day Long Weekend`;
      dateLine = `${new Date(plan.data.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} - ${new Date(plan.data.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
      infoLine = plan.data.needBridgeDay ? "Bridge day needed" : "No extra days needed";
    }

    return `
      <div class="wl-plan-card">
        <span class="wl-plan-badge ${plan.type}">${TYPE_LABEL[plan.type]}</span>
        <h4>${title}</h4>
        <div class="wl-plan-meta"><i class="bi bi-calendar3"></i> ${dateLine}</div>
        <div class="wl-plan-info"><i class="bi bi-info-circle"></i> ${infoLine}</div>
        <button class="wl-remove-btn" data-remove="${plan.id}"><i class="bi bi-trash3"></i> Remove</button>
      </div>
    `;
  }

  _clearAll() {
    if (this.storage.getAll().length === 0) {
      this.ui.toast("There's nothing to clear", "info");
      return;
    }
    if (confirm("Remove all saved plans? This can't be undone.")) {
      this.storage.clearAll();
      this.ui.toast("All plans cleared", "success");
      this._renderFilters();
      this._renderList();
    }
  }
}
