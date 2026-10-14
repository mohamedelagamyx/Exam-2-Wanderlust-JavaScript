export class ApiService {
  constructor() {
    this.NAGER = "https://date.nager.at/api/v3";
    this.REST_COUNTRIES_V5 = "https://api.restcountries.com/countries/v5";
    // No API credentials are embedded in this public frontend.
    this.COUNTRIES_DATA_URLS = [
      "https://cdn.jsdelivr.net/npm/world-countries@5/dist/countries.json",
      "https://cdn.jsdelivr.net/npm/world-countries@5/countries.json",
      "https://raw.githubusercontent.com/mledoze/countries/master/dist/countries.json",
    ];
    this.OPEN_METEO = "https://api.open-meteo.com/v1";
    this.GEOCODE = "https://geocoding-api.open-meteo.com/v1";
    this.SUNRISE = "https://api.sunrise-sunset.org/json";
    this.EXCHANGE = "https://open.er-api.com/v6/latest";
    this.COUNTRIES_NOW = "https://countriesnow.space/api/v0.1";
    this._countriesDataset = null;
    this._countriesDatasetPromise = null;
  }

  async _getJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Request failed (${res.status}): ${url}`);
    return res.json();
  }

  async _loadCountriesDataset() {
    if (this._countriesDataset) return this._countriesDataset;
    if (this._countriesDatasetPromise) return this._countriesDatasetPromise;

    this._countriesDatasetPromise = (async () => {
      let lastErr;
      for (const url of this.COUNTRIES_DATA_URLS) {
        try {
          const data = await this._getJSON(url);
          if (Array.isArray(data) && data.length) {
            this._countriesDataset = data;
            return data;
          }
        } catch (err) {
          lastErr = err;
        }
      }
      this._countriesDatasetPromise = null;
      throw lastErr || new Error("Could not load the country dataset from any mirror");
    })();

    return this._countriesDatasetPromise;
  }

  async getAvailableCountries() {
    const list = await this._getJSON(`${this.NAGER}/AvailableCountries`);
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }

  async getCountryInfo(countryCode) {
    let info = null;
    const code = countryCode.toUpperCase();
    const needsFallback =
      !info || !info.population || !info.continents?.length || !info.timezones?.length || !info.startOfWeek;

    if (needsFallback) {
      try {
        const dataset = await this._loadCountriesDataset();
        const match = dataset.find((c) => c.cca2 === code || c.cca3 === code);
        if (match) {
          info = info ? { ...match, ...info, cca2: info.cca2 || match.cca2, cca3: info.cca3 || match.cca3 } : match;
          for (const key of ["population", "continents", "timezones", "startOfWeek", "capital", "area"]) {
            if (!info[key] || (Array.isArray(info[key]) && info[key].length === 0)) info[key] = match[key];
          }
        }
      } catch (err) {
        console.warn("Keyless dataset fallback failed too:", err.message);
      }
    }

    if (!info) throw new Error(`Country not found: ${countryCode}`);
    return info;
  }

  async getHolidays(countryCode, year) {
    return this._getJSON(`${this.NAGER}/PublicHolidays/${year}/${countryCode}`);
  }

  async getLongWeekends(countryCode, year) {
    return this._getJSON(`${this.NAGER}/LongWeekend/${year}/${countryCode}`);
  }

  async searchCity(query) {
    const data = await this._getJSON(
      `${this.GEOCODE}/search?name=${encodeURIComponent(query)}&count=6&language=en&format=json`
    );
    return data.results || [];
  }

  async getCitiesForCountry(countryName) {
    const res = await fetch(`${this.COUNTRIES_NOW}/countries/cities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ country: countryName }),
    });
    if (!res.ok) throw new Error(`Cities request failed (${res.status})`);
    const body = await res.json();
    if (body.error) throw new Error(body.msg || "Could not load cities for this country");
    return (body.data || []).sort((a, b) => a.localeCompare(b));
  }

  async getWeather(lat, lon) {
    const url =
      `${this.OPEN_METEO}/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m` +
      `&hourly=temperature_2m,weather_code` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max,precipitation_sum,uv_index_max` +
      `&timezone=auto`;
    return this._getJSON(url);
  }

  async getSunTimes(lat, lon, dateISO) {
    const url = `${this.SUNRISE}?lat=${lat}&lng=${lon}&date=${dateISO}&formatted=0`;
    const data = await this._getJSON(url);
    return data.results;
  }

  async getExchangeRates(base) {
    const data = await this._getJSON(`${this.EXCHANGE}/${base}`);
    return data.rates;
  }

  async getEvents(cityName, countryCode) {
    const categories = [
      { type: "Music", icon: "bi-music-note-beamed", names: ["Live Jazz Night", "Indie Rock Festival", "Symphony Under the Stars", "Electro Beach Party"] },
      { type: "Sports", icon: "bi-trophy", names: ["Local Derby Match", "City Marathon", "Basketball Championship", "International Friendly"] },
      { type: "Arts", icon: "bi-easel", names: ["Contemporary Art Expo", "Street Theatre Festival", "Film Screening Night", "Photography Showcase"] },
    ];
    const seed = [...`${cityName}${countryCode}`].reduce((s, c) => s + c.charCodeAt(0), 0);
    const events = [];
    for (let i = 0; i < 6; i++) {
      const cat = categories[(seed + i) % categories.length];
      const name = cat.names[(seed + i * 3) % cat.names.length];
      const daysAhead = ((seed + i * 7) % 25) + 2;
      const date = new Date();
      date.setDate(date.getDate() + daysAhead);
      events.push({
        id: `evt-${seed}-${i}`,
        name: `${name} — ${cityName}`,
        category: cat.type,
        icon: cat.icon,
        date: date.toISOString().split("T")[0],
        venue: `${cityName} ${cat.type} Hall`,
        price: 20 + ((seed + i * 11) % 80),
      });
    }
    return events;
  }
}
