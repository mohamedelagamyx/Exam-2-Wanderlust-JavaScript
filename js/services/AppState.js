export class AppState {
  constructor() {
    this.countryCode = null;
    this.countryName = null;
    this.cityName = null;
    this.lat = null;
    this.lon = null;
    this.year = new Date().getFullYear();
    this.listeners = [];
  }

  onChange(fn) {
    this.listeners.push(fn);
  }

  _emit() {
    this.listeners.forEach((fn) => fn(this));
  }

  setDestination({ countryCode, countryName, cityName = null, lat = null, lon = null }) {
    this.countryCode = countryCode;
    this.countryName = countryName;
    this.cityName = cityName;
    this.lat = lat;
    this.lon = lon;
    this._emit();
  }

  setYear(year) {
    this.year = Number(year);
    this._emit();
  }

  clear() {
    this.countryCode = this.countryName = this.cityName = this.lat = this.lon = null;
    this._emit();
  }

  hasCountry() {
    return !!this.countryCode;
  }

  hasCity() {
    return !!(this.lat && this.lon);
  }
}
