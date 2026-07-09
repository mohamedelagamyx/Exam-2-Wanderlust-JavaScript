const POPULAR = ["USD", "EUR", "GBP", "EGP", "AED", "SAR", "JPY", "CAD"];

export class CurrencyView {
  constructor({ api, ui }) {
    this.api = api;
    this.ui = ui;
    this.rates = null;
    this.base = "USD";
  }

  async mount(container) {
    container.innerHTML = `
      <div class="wl-view-header wl-header-gold">
        <h2><i class="bi bi-cash-coin"></i> Currency Converter</h2>
        <p>Convert between currencies with live exchange rates - essential for travel planning</p>
      </div>
      <div class="wl-card wl-currency-card">
        <label class="form-label justify-content-center">Amount</label>
        <input id="cv-amount" type="number" class="form-control wl-currency-amount" value="100" min="0" />

        <div class="wl-currency-swap-row">
          <div class="wl-currency-side">
            <label class="form-label">From</label>
            <select id="cv-from" class="form-select"></select>
          </div>
          <button id="cv-swap" class="wl-swap-btn" title="Swap"><i class="bi bi-arrow-left-right"></i></button>
          <div class="wl-currency-side">
            <label class="form-label">To</label>
            <select id="cv-to" class="form-select"></select>
          </div>
        </div>

        <button id="cv-convert" class="btn wl-btn-primary wl-convert-full"><i class="bi bi-calculator"></i> Convert</button>
        <div id="cv-result" class="wl-currency-result d-none"></div>
      </div>
      <div class="wl-card mt-4">
        <h5 class="mb-3 d-flex align-items-center gap-2"><i class="bi bi-star-fill text-warning"></i> Quick Convert</h5>
        <div id="cv-popular" class="wl-popular-grid"><div class="wl-inline-loading"><i class="bi bi-arrow-repeat spin"></i> Loading rates...</div></div>
      </div>
    `;

    document.getElementById("cv-convert").addEventListener("click", () => this._convert());
    document.getElementById("cv-swap").addEventListener("click", () => this._swap());

    try {
      this.rates = await this.api.getExchangeRates(this.base);
      this._fillSelects();
      this._renderPopular();
    } catch {
      this.ui.toast("Could not load exchange rates", "error");
    }
  }

  _fillSelects() {
    const codes = Object.keys(this.rates).sort();
    const opts = codes.map((c) => `<option value="${c}">${c}</option>`).join("");
    const from = document.getElementById("cv-from");
    const to = document.getElementById("cv-to");
    from.innerHTML = opts;
    to.innerHTML = opts;
    from.value = "USD";
    to.value = "EUR";
  }

  async _ratesFor(base) {
    if (base === this.base) return this.rates;
    return this.api.getExchangeRates(base);
  }

  async _convert() {
    const amount = parseFloat(document.getElementById("cv-amount").value);
    const from = document.getElementById("cv-from").value;
    const to = document.getElementById("cv-to").value;
    if (!amount || !from || !to) {
      this.ui.toast("Fill in amount and both currencies", "error");
      return;
    }
    this.ui.showLoading("Converting...");
    try {
      const rates = await this._ratesFor(from);
      const rate = rates[to];
      const result = amount * rate;
      const box = document.getElementById("cv-result");
      box.classList.remove("d-none");
      box.innerHTML = `
        <div class="wl-conversion"><span>${amount.toLocaleString()} ${from}</span><i class="bi bi-arrow-right"></i><span class="highlight">${result.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${to}</span></div>
        <small>1 ${from} = ${rate.toFixed(6)} ${to}</small>
      `;
    } catch {
      this.ui.toast("Conversion failed", "error");
    }
    this.ui.hideLoading();
  }

  _swap() {
    const from = document.getElementById("cv-from");
    const to = document.getElementById("cv-to");
    [from.value, to.value] = [to.value, from.value];
  }

  _renderPopular() {
    const grid = document.getElementById("cv-popular");
    grid.innerHTML = POPULAR.filter((c) => c !== this.base)
      .map((c) => `<div class="wl-popular-item"><span class="code">${c}</span><span class="rate">${this.rates[c] ? this.rates[c].toFixed(4) : "-"}</span></div>`)
      .join("");
  }
}
