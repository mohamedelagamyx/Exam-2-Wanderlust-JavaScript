import { ApiService } from "./services/ApiService.js";
import { StorageService } from "./services/StorageService.js";
import { UiService } from "./services/UiService.js";
import { AppState } from "./services/AppState.js";
import { Router } from "./services/Router.js";

import { DashboardView } from "./views/DashboardView.js";
import { HolidaysView } from "./views/HolidaysView.js";
import { LongWeekendsView } from "./views/LongWeekendsView.js";
import { EventsView } from "./views/EventsView.js";
import { WeatherView } from "./views/WeatherView.js";
import { SunTimesView } from "./views/SunTimesView.js";
import { CurrencyView } from "./views/CurrencyView.js";
import { PlansView } from "./views/PlansView.js";

class App {
  constructor() {
    this.api = new ApiService();
    this.storage = new StorageService();
    this.ui = new UiService();
    this.state = new AppState();
    this.router = new Router((route) => this._renderRoute(route));

    const deps = { api: this.api, ui: this.ui, state: this.state, storage: this.storage, router: this.router };

    this.views = {
      dashboard: new DashboardView(deps),
      holidays: new HolidaysView(deps),
      "long-weekends": new LongWeekendsView(deps),
      events: new EventsView(deps),
      weather: new WeatherView(deps),
      "sun-times": new SunTimesView(deps),
      currency: new CurrencyView(deps),
      plans: new PlansView(deps),
    };

    this.contentEl = document.getElementById("view-container");
    this._bindNav();
    this._startClock();
  }

  _bindNav() {
    document.querySelectorAll("[data-route]").forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        this.router.navigate(link.dataset.route);
        document.getElementById("sidebar").classList.remove("open");
      });
    });
    document.getElementById("mobile-menu-btn")?.addEventListener("click", () => {
      document.getElementById("sidebar").classList.toggle("open");
    });
  }

  _startClock() {
    const el = document.getElementById("current-datetime");
    const tick = () => {
      el.textContent = new Date().toLocaleDateString("en-US", {
        weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
      });
    };
    tick();
    setInterval(tick, 60000);
  }

  async _renderRoute(route) {
    document.querySelectorAll("[data-route]").forEach((link) => {
      link.classList.toggle("active", link.dataset.route === route);
    });
    const titles = {
      dashboard: ["Dashboard", "Welcome back! Ready to plan your next adventure?"],
      holidays: ["Holidays", "Public holidays around the world"],
      "long-weekends": ["Long Weekends", "Perfect mini-trip opportunities"],
      events: ["Events", "Concerts, sports & entertainment"],
      weather: ["Weather", "7-day forecasts for any destination"],
      "sun-times": ["Sun Times", "Sunrise & sunset worldwide"],
      currency: ["Currency", "Convert currencies with live exchange rates"],
      plans: ["My Plans", "Your saved holidays and events"],
    };
    document.getElementById("page-title").textContent = titles[route][0];
    document.getElementById("page-subtitle").textContent = titles[route][1];

    const view = this.views[route];
    this.contentEl.innerHTML = "";
    try {
      await view.mount(this.contentEl);
    } catch (err) {
      console.error(err);
      this.contentEl.innerHTML = this.ui.emptyState("bi-exclamation-triangle", "Something went wrong", "Please try again.");
    }
  }

  start() {
    this.router.init();
  }
}

document.addEventListener("DOMContentLoaded", () => new App().start());
