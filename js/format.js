// 숫자·금액·날짜 포맷 유틸
window.Fmt = {
  // 원 단위 → "1억 2,345만원"
  won(n) {
    n = Math.round(n);
    if (!isFinite(n)) return '-';
    if (Math.abs(n) < 10000) return n.toLocaleString('ko-KR') + '원';
    return Fmt.man(n / 10000);
  },
  // 만원 단위 → "6억 5,000만원"
  man(m) {
    m = Math.round(m);
    if (!isFinite(m)) return '-';
    const sign = m < 0 ? '-' : '';
    m = Math.abs(m);
    const eok = Math.floor(m / 10000);
    const rest = m % 10000;
    if (eok && rest) return sign + eok + '억 ' + rest.toLocaleString('ko-KR') + '만원';
    if (eok) return sign + eok + '억원';
    return sign + rest.toLocaleString('ko-KR') + '만원';
  },
  num(n, digits = 0) {
    return Number(n).toLocaleString('ko-KR', { maximumFractionDigits: digits });
  },
  pct(n, digits = 1) {
    return (Math.round(n * 10 ** digits) / 10 ** digits).toFixed(digits) + '%';
  },
  // ㎡ → 평
  pyeong(m2) {
    return (m2 / 3.3058).toFixed(1);
  },
  ymd(d) {
    const p = (x) => String(x).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  },
  escape(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
};

// 입력창에 숫자를 쓰면 바로 아래에 "N억 M만원"으로 읽어 주는 힌트
window.bindManHint = function (input, hintEl) {
  const update = () => {
    const v = parseFloat(input.value);
    hintEl.textContent = v > 0 ? Fmt.man(v) : '';
  };
  input.addEventListener('input', update);
  update();
};

window.toast = function (msg) {
  let el = document.querySelector('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 1800);
};
