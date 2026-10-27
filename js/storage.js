// localStorage 래퍼 — 접근이 막혀 있어도 앱이 죽지 않도록 try/catch
window.Store = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem('re_' + key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem('re_' + key, JSON.stringify(value));
    } catch (e) { /* 저장 불가 환경 */ }
  }
};
