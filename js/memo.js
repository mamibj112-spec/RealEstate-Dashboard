// 관심 매물 탭: 매물 메모 + 별점 + 임장 체크리스트
window.Memo = (() => {
  const $ = (id) => document.getElementById(id);
  const CHECKS = ['역세권', '학군', '채광', '조용함', '주차', '관리상태', '편의시설', '평지', '뷰', '신축급'];
  let editingId = null;
  let star = 3;

  const formHtml = () => `
    <input name="name" placeholder="단지명 / 매물 이름" required>
    <div class="row">
      <input name="area" placeholder="지역 (예: 분당 정자동)">
      <input name="size" placeholder="평형 (예: 34평)">
    </div>
    <div class="radio-row">
      ${['매매', '전세', '월세'].map((t, i) => `<label><input type="radio" name="type" value="${t}" ${i ? '' : 'checked'}>${t}</label>`).join('')}
    </div>
    <label>가격 (만원)<input name="price" type="number" inputmode="numeric" placeholder="예: 85000"><span class="hint" id="memoHint"></span></label>
    <label>별점<div class="star-input" id="starInput">${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-star="${n}">★</button>`).join('')}</div></label>
    <label>임장 체크리스트</label>
    <div class="checks">${CHECKS.map((c) => `<label><input type="checkbox" name="checks" value="${c}">${c}</label>`).join('')}</div>
    <textarea name="note" placeholder="메모 (임장 느낌, 호가, 중개소 연락처 등)"></textarea>
    <button class="btn primary full" type="submit" id="memoSubmit">저장</button>`;

  function setStar(n) {
    star = n;
    $('starInput').querySelectorAll('button').forEach((b) => b.classList.toggle('on', Number(b.dataset.star) <= n));
  }

  function resetForm() {
    editingId = null;
    $('memoForm').reset();
    setStar(3);
    $('memoFormTitle').textContent = '관심 매물 추가';
    $('memoSubmit').textContent = '저장';
    $('memoCancel').hidden = true;
    $('memoHint').textContent = '';
  }

  function startEdit(item) {
    const f = $('memoForm');
    editingId = item.id;
    f.name.value = item.name;
    f.area.value = item.area;
    f.size.value = item.size;
    f.price.value = item.price || '';
    f.note.value = item.note;
    f.querySelector(`[name=type][value="${item.type}"]`).checked = true;
    f.querySelectorAll('[name=checks]').forEach((c) => { c.checked = item.checks.includes(c.value); });
    setStar(item.star);
    f.price.dispatchEvent(new Event('input'));
    $('memoFormTitle').textContent = '관심 매물 수정';
    $('memoSubmit').textContent = '수정 완료';
    $('memoCancel').hidden = false;
    f.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function save(e) {
    e.preventDefault();
    const f = e.target;
    const item = {
      id: editingId || Date.now(),
      name: f.name.value.trim(),
      area: f.area.value.trim(),
      size: f.size.value.trim(),
      type: f.type.value,
      price: Number(f.price.value) || 0,
      star,
      checks: [...f.querySelectorAll('[name=checks]:checked')].map((c) => c.value),
      note: f.note.value.trim(),
      updated: Fmt.ymd(new Date())
    };
    const list = Store.get('memos', []);
    const idx = list.findIndex((x) => x.id === item.id);
    if (idx >= 0) list[idx] = item; else list.push(item);
    Store.set('memos', list);
    toast(idx >= 0 ? '수정했어요' : '관심 매물을 저장했어요');
    resetForm();
    render();
  }

  function render() {
    const q = $('memoSearch').value.trim();
    const sort = $('memoSort').value;
    let list = Store.get('memos', []);
    if (q) list = list.filter((x) => (x.name + ' ' + x.area).includes(q));
    list.sort((a, b) => sort === 'star' ? b.star - a.star : sort === 'price' ? a.price - b.price : b.id - a.id);
    if (!list.length) {
      $('memoList').innerHTML = `<div class="card empty">${q ? '검색 결과가 없어요' : '아직 저장한 매물이 없어요'}</div>`;
      return;
    }
    $('memoList').innerHTML = list.map((x) => `
      <div class="card">
        <div class="memo-top">
          <div>
            <h3>${Fmt.escape(x.name)}</h3>
            <div class="muted">${[x.area, x.size, x.type].filter(Boolean).map(Fmt.escape).join(' · ')}</div>
          </div>
          <span class="stars">${'★'.repeat(x.star)}${'☆'.repeat(5 - x.star)}</span>
        </div>
        ${x.price ? `<div class="memo-price">${Fmt.man(x.price)}</div>` : ''}
        ${x.checks.length ? `<div class="tags">${x.checks.map((c) => `<span class="tag">✓ ${c}</span>`).join('')}</div>` : ''}
        ${x.note ? `<p class="memo-text">${Fmt.escape(x.note)}</p>` : ''}
        <div class="row">
          <span class="muted">${x.updated}</span>
          <button class="btn ghost" data-edit="${x.id}">수정</button>
          <button class="btn danger" data-del="${x.id}">삭제</button>
        </div>
      </div>`).join('');
  }

  function init() {
    $('memoForm').innerHTML = formHtml();
    setStar(3);
    bindManHint($('memoForm').price, $('memoHint'));
    $('starInput').addEventListener('click', (e) => { if (e.target.dataset.star) setStar(Number(e.target.dataset.star)); });
    $('memoForm').addEventListener('submit', save);
    $('memoCancel').addEventListener('click', resetForm);
    $('memoSearch').addEventListener('input', render);
    $('memoSort').addEventListener('change', render);
    $('memoList').addEventListener('click', (e) => {
      const list = Store.get('memos', []);
      if (e.target.dataset.edit) {
        startEdit(list.find((x) => String(x.id) === e.target.dataset.edit));
      } else if (e.target.dataset.del && confirm('이 매물을 삭제할까요?')) {
        Store.set('memos', list.filter((x) => String(x.id) !== e.target.dataset.del));
        render();
      }
    });
    render();
  }

  return { init };
})();
