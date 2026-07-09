export class LongWeekendsView {
  constructor({ api, ui, state, storage, router }) {
    this.api = api;
    this.ui = ui;
    this.state = state;
    this.storage = storage;
    this.router = router;
  }

  async mount(container) {
    container.innerHTML = `
      <div class="wl-view-header wl-header-orange">
        <div class="wl-view-header-row">
          <h2><i class="bi bi-umbrella-fill"></i> Long Weekend Finder</h2>
          ${this.state.hasCountry() ? this.ui.headerBadge(this.state.countryCode, this.state.countryName, this.state.year) : ""}
        </div>
        <p>Find holidays near weekends - perfect for planning mini-trips!</p>
      </div>
      <div id="lw-list" class="wl-lw-list"></div>
    `;

    const list = document.getElementById("lw-list");

    if (!this.state.hasCountry()) {
      list.innerHTML = this.ui.emptyState(
        "bi-umbrella",
        "No Country Selected",
        "Select a country from the dashboard to discover long weekend opportunities",
        `<button class="btn wl-btn-primary" id="lw-goto-dash"><i class="bi bi-house"></i> Go to Dashboard</button>`
      );
      document.getElementById("lw-goto-dash").addEventListener("click", () => this.router.navigate("dashboard"));
      return;
    }

    list.innerHTML = `<div class="wl-inline-loading"><i class="bi bi-arrow-repeat spin"></i> Finding long weekends...</div>`;

    try {
      const weekends = await this.api.getLongWeekends(this.state.countryCode, this.state.year);
      this._render(weekends);
    } catch {
      list.innerHTML = this.ui.emptyState("bi-exclamation-triangle", "Failed to load", "Please try again.");
    }
  }

  _render(weekends) {
    const list = document.getElementById("lw-list");
    if (weekends.length === 0) {
      list.innerHTML = this.ui.emptyState("bi-umbrella", "None found", `No long weekends for ${this.state.year}.`);
      return;
    }
    list.innerHTML = weekends
      .map((w, i) => {
        const saved = this.storage.isSaved("longweekend", (x) => x.startDate === w.startDate);
        const days = [];
        const cursor = new Date(w.startDate);
        const end = new Date(w.endDate);
        while (cursor <= end) {
          const dow = cursor.getDay();
          days.push({
            name: cursor.toLocaleDateString("en-US", { weekday: "short" }),
            num: cursor.getDate(),
            weekend: dow === 0 || dow === 6,
          });
          cursor.setDate(cursor.getDate() + 1);
        }
        return `
        <div class="wl-lw-card">
          <div class="d-flex justify-content-between align-items-start">
            <span class="wl-pill wl-pill-orange"><i class="bi bi-calendar3"></i> ${w.dayCount} Days</span>
            <button class="wl-save-btn ${saved ? "saved" : ""}" data-idx="${i}">
              <i class="bi ${saved ? "bi-heart-fill" : "bi-heart"}"></i>
            </button>
          </div>
          <h4>Long Weekend #${i + 1}</h4>
          <p><i class="bi bi-calendar3"></i> ${new Date(w.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} - ${new Date(w.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
          <div class="wl-note ${w.needBridgeDay ? "warn" : "ok"}">
            <i class="bi ${w.needBridgeDay ? "bi-info-circle-fill" : "bi-check-circle-fill"}"></i>
            ${w.needBridgeDay ? "Requires taking a bridge day off" : "No extra days off needed!"}
          </div>
          <div class="wl-lw-days-visual">
            ${days.map((d) => `<div class="wl-lw-day ${d.weekend ? "weekend" : ""}"><span class="name">${d.name}</span><span class="num">${d.num}</span></div>`).join("")}
          </div>
        </div>`;
      })
      .join("");

    list.querySelectorAll(".wl-save-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const w = weekends[Number(btn.dataset.idx)];
        const ok = this.storage.save("longweekend", w, (x) => x.startDate === w.startDate);
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
