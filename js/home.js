// 홈 탭: 오늘 날짜, 출석 스트릭, 오늘의 용어, 청약 일정
window.Home = (() => {
  const $ = (id) => document.getElementById(id);
  const todayStr = () => Fmt.ymd(new Date());
  const dayNumber = () => Math.floor(new Date(todayStr()).getTime() / 86400000);
  let termOffset = 0;

  function renderDate() {
    const d = new Date();
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    $('today').textContent = `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
  }

  // 스트릭: 마지막 완료일이 어제면 +1, 오늘이면 유지, 그 외에는 끊김
  function currentStreak() {
    const s = Store.get('streak', { count: 0, last: null });
    if (!s.last) return 0;
    const diff = (new Date(todayStr()) - new Date(s.last)) / 86400000;
    return diff <= 1 ? s.count : 0;
  }

  function renderStreak() {
    $('streakNum').textContent = currentStreak();
    const done = Store.get('streak', {}).last === todayStr();
    $('termDone').disabled = done;
    $('termDone').textContent = done ? '완료됨 ✓' : '학습 완료 ✓';
  }

  function completeToday() {
    const s = Store.get('streak', { count: 0, last: null });
    if (s.last === todayStr()) return;
    const next = { count: currentStreak() + 1, last: todayStr() };
    Store.set('streak', next);
    renderStreak();
    toast(`🔥 ${next.count}일 연속 학습!`);
  }

  function renderTerm() {
    const n = TERMS.length;
    const idx = (((dayNumber() + termOffset) % n) + n) % n;
    const t = TERMS[idx];
    $('termWord').textContent = t.word;
    $('termDesc').textContent = t.desc;
    $('termEx').textContent = t.ex;
    $('termIndex').textContent = termOffset === 0 ? '오늘' : (termOffset > 0 ? `+${termOffset}` : termOffset);
  }

  function renderSubs() {
    const list = Store.get('subs', []).slice().sort((a, b) => a.date.localeCompare(b.date));
    const today = new Date(todayStr());
    if (!list.length) {
      $('subsList').innerHTML = '<li class="empty">등록된 청약 일정이 없어요</li>';
      return;
    }
    $('subsList').innerHTML = list.map((s) => {
      const diff = Math.round((new Date(s.date) - today) / 86400000);
      const label = diff === 0 ? 'D-DAY' : diff > 0 ? `D-${diff}` : `D+${-diff}`;
      const cls = diff < 0 ? 'past' : diff <= 3 ? 'soon' : '';
      return `<li>
        <span class="dday ${cls}">${label}</span>
        <div class="grow">
          <div class="title">${Fmt.escape(s.name)}</div>
          <div class="muted">${s.date} · ${Fmt.escape(s.kind)}</div>
        </div>
        <button class="x" data-del="${s.id}" aria-label="삭제">×</button>
      </li>`;
    }).join('');
  }

  function init() {
    renderDate();
    renderStreak();
    renderTerm();
    renderSubs();

    $('termDone').addEventListener('click', completeToday);
    $('termPrev').addEventListener('click', () => { termOffset--; renderTerm(); });
    $('termNext').addEventListener('click', () => { termOffset++; renderTerm(); });

    $('subsForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const f = e.target;
      const list = Store.get('subs', []);
      list.push({ id: Date.now(), name: f.name.value.trim(), date: f.date.value, kind: f.kind.value });
      Store.set('subs', list);
      f.reset();
      renderSubs();
      toast('청약 일정을 추가했어요');
    });

    $('subsList').addEventListener('click', (e) => {
      const id = e.target.dataset.del;
      if (!id || !confirm('이 일정을 삭제할까요?')) return;
      Store.set('subs', Store.get('subs', []).filter((s) => String(s.id) !== id));
      renderSubs();
    });
  }

  return { init };
})();
