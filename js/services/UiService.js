export class UiService {
  constructor() {
    this.overlay = document.getElementById("loading-overlay");
    this.overlayText = document.getElementById("loading-overlay-text");
    this.toastContainer = document.getElementById("toast-container");
  }

  showLoading(text = "Loading...") {
    this.overlayText.textContent = text;
    this.overlay.classList.remove("d-none");
  }

  hideLoading() {
    this.overlay.classList.add("d-none");
  }

  toast(message, type = "info") {
    const icons = { success: "bi-check-circle-fill", error: "bi-x-circle-fill", info: "bi-info-circle-fill" };
    const el = document.createElement("div");
    el.className = `wl-toast wl-toast-${type}`;
    el.innerHTML = `<i class="bi ${icons[type] || icons.info}"></i><span>${message}</span><button type="button" class="wl-toast-close"><i class="bi bi-x"></i></button>`;
    const dismiss = () => {
      el.classList.add("wl-toast-out");
      setTimeout(() => el.remove(), 250);
    };
    el.querySelector(".wl-toast-close").addEventListener("click", dismiss);
    this.toastContainer.appendChild(el);
    setTimeout(dismiss, 3200);
  }

  emptyState(icon, title, message, ctaHtml = "") {
    return `
      <div class="wl-empty">
        <i class="bi ${icon}"></i>
        <h3>${title}</h3>
        <p>${message}</p>
        ${ctaHtml}
      </div>`;
  }

  headerBadge(countryCode, countryName, rightLabel, extraLabel = "") {
    if (!countryCode || !countryName) return "";
    const flag = `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`;
    return `
      <div class="wl-header-badge">
        <img src="${flag}" alt="${countryName}" onerror="this.style.display='none'" />
        <span>${countryName}${extraLabel ? " • " + extraLabel : ""}</span>
        ${rightLabel ? `<span class="pill">${rightLabel}</span>` : ""}
      </div>`;
  }
}
