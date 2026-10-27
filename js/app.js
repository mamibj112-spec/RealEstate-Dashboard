// 하단 탭 전환 + 각 모듈 초기화
(() => {
  function switchTab(name) {
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.id === 'tab-' + name));
    document.querySelectorAll('.bottom button').forEach((b) => b.classList.toggle('on', b.dataset.tab === name));
    Store.set('tab', name);
    window.scrollTo(0, 0);
  }

  document.querySelector('.bottom').addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (btn) switchTab(btn.dataset.tab);
  });

  Home.init();
  Calc.init();
  Trade.init();
  Memo.init();
  switchTab(Store.get('tab', 'home'));
})();
