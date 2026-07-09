export class Router {
  constructor(onNavigate) {
    this.onNavigate = onNavigate;
    this.routes = ["dashboard", "holidays", "events", "weather", "long-weekends", "currency", "sun-times", "plans"];
    window.addEventListener("hashchange", () => this._handle());
  }

  init() {
    if (!location.hash) location.hash = "#/dashboard";
    this._handle();
  }

  navigate(routeName) {
    if (location.hash === `#/${routeName}`) {
      this._handle();
    } else {
      location.hash = `#/${routeName}`;
    }
  }

  _handle() {
    const name = location.hash.replace("#/", "") || "dashboard";
    const route = this.routes.includes(name) ? name : "dashboard";
    this.onNavigate(route);
  }
}
