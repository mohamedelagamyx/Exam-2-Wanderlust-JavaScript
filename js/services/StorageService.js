export class StorageService {
  constructor(key = "wanderlust_plans") {
    this.key = key;
  }

  getAll() {
    try {
      return JSON.parse(localStorage.getItem(this.key)) || [];
    } catch {
      return [];
    }
  }

  _persist(plans) {
    localStorage.setItem(this.key, JSON.stringify(plans));
  }

  isSaved(type, matcher) {
    return this.getAll().some((p) => p.type === type && matcher(p.data));
  }

  save(type, data, matcher) {
    if (this.isSaved(type, matcher)) return false;
    const plans = this.getAll();
    plans.push({ id: Date.now(), type, data, savedAt: new Date().toISOString() });
    this._persist(plans);
    return true;
  }

  remove(id) {
    const plans = this.getAll().filter((p) => p.id !== id);
    this._persist(plans);
  }

  clearAll() {
    this._persist([]);
  }

  byType(type) {
    const all = this.getAll();
    return type === "all" ? all : all.filter((p) => p.type === type);
  }

  counts() {
    const all = this.getAll();
    return {
      all: all.length,
      holiday: all.filter((p) => p.type === "holiday").length,
      event: all.filter((p) => p.type === "event").length,
      longweekend: all.filter((p) => p.type === "longweekend").length,
    };
  }
}
