// 실거래가 탭: 국토교통부 아파트 매매/전월세 실거래가 API
// 앱(APK)에서는 CapacitorHttp가 fetch를 네이티브로 처리해서 CORS 문제가 없다.
// 일반 브라우저에서는 data.go.kr이 CORS를 막아 조회가 실패할 수 있다.
window.Trade = (() => {
  const $ = (id) => document.getElementById(id);
  const ENDPOINT = {
    trade: 'https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade',
    rent: 'https://apis.data.go.kr/1613000/RTMSDataSvcAptRent/getRTMSDataSvcAptRent'
  };
  let kind = 'trade';

  const isApp = () => !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  const num = (s) => Number(String(s ?? '').replace(/[^\d.]/g, '')) || 0;

  function fillRegions() {
    const saved = Store.get('region', '11680');
    $('regionSel').innerHTML = REGIONS.map((g) =>
      `<optgroup label="${g.group}">${g.items.map(([name, code]) =>
        `<option value="${code}" ${code === saved ? 'selected' : ''}>${name}</option>`).join('')}</optgroup>`).join('');
  }

  function buildUrl(code, ym) {
    const key = Store.get('apiKey', '');
    // Encoding 키는 이미 %가 들어 있으므로 그대로, Decoding 키는 인코딩해서 보낸다
    const encodedKey = key.includes('%') ? key : encodeURIComponent(key);
    return `${ENDPOINT[kind]}?serviceKey=${encodedKey}&LAWD_CD=${code}&DEAL_YMD=${ym}&pageNo=1&numOfRows=1000`;
  }

  // XML 응답의 item을 객체 배열로 (신·구 필드명 모두 대응)
  function parseItems(text) {
    const doc = new DOMParser().parseFromString(text, 'text/xml');
    const resultCode = doc.querySelector('resultCode')?.textContent?.trim();
    const resultMsg = doc.querySelector('resultMsg, returnAuthMsg')?.textContent?.trim();
    if (resultCode && !['00', '000'].includes(resultCode)) throw new Error(resultMsg || `오류 코드 ${resultCode}`);
    if (!doc.querySelector('items') && /SERVICE_KEY|SERVICE KEY/i.test(text)) throw new Error('API 키가 올바르지 않거나 아직 승인되지 않았어요');
    return [...doc.querySelectorAll('item')].map((it) => {
      const g = (...names) => {
        for (const n of names) {
          const el = it.getElementsByTagName(n)[0];
          if (el) return el.textContent.trim();
        }
        return '';
      };
      return {
        name: g('aptNm', '아파트'),
        dong: g('umdNm', '법정동'),
        area: num(g('excluUseAr', '전용면적')),
        floor: g('floor', '층'),
        year: g('dealYear', '년'),
        month: g('dealMonth', '월'),
        day: g('dealDay', '일'),
        built: g('buildYear', '건축년도'),
        price: num(g('dealAmount', '거래금액')),
        deposit: num(g('deposit', '보증금액')),
        monthly: num(g('monthlyRent', '월세금액')),
        canceled: !!g('cdealType', '해제여부').trim()
      };
    });
  }

  function renderStats(items) {
    const valid = items.filter((x) => !x.canceled);
    if (!valid.length) return '';
    if (kind === 'trade') {
      const prices = valid.map((x) => x.price);
      const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
      const perPy = valid.reduce((a, x) => a + x.price / (x.area / 3.3058), 0) / valid.length;
      return `<div class="stats">
        <div class="stat"><span class="muted">거래 건수</span><b>${valid.length}건</b></div>
        <div class="stat"><span class="muted">평균가</span><b>${Fmt.man(avg)}</b></div>
        <div class="stat"><span class="muted">최고가</span><b>${Fmt.man(Math.max(...prices))}</b></div>
        <div class="stat"><span class="muted">평균 평당가 (전용)</span><b>${Fmt.man(perPy)}</b></div>
      </div>`;
    }
    const jeonse = valid.filter((x) => !x.monthly);
    const wolse = valid.length - jeonse.length;
    const avgJ = jeonse.length ? jeonse.reduce((a, x) => a + x.deposit, 0) / jeonse.length : 0;
    return `<div class="stats">
      <div class="stat"><span class="muted">전세</span><b>${jeonse.length}건</b></div>
      <div class="stat"><span class="muted">월세</span><b>${wolse}건</b></div>
      <div class="stat"><span class="muted">전세 평균 보증금</span><b>${avgJ ? Fmt.man(avgJ) : '-'}</b></div>
      <div class="stat"><span class="muted">전체</span><b>${valid.length}건</b></div>
    </div>`;
  }

  function renderList(items) {
    if (!items.length) return '<div class="card empty">해당 조건의 거래가 없어요</div>';
    const rows = items.map((x) => {
      const priceHtml = kind === 'trade'
        ? Fmt.man(x.price)
        : x.monthly ? `${Fmt.man(x.deposit)} / ${x.monthly}` : `전세 ${Fmt.man(x.deposit)}`;
      return `<div class="deal ${x.canceled ? 'cancel' : ''}">
        <div>
          <div class="name">${Fmt.escape(x.name)}</div>
          <div class="sub">${Fmt.escape(x.dong)} · 전용 ${x.area}㎡(${Fmt.pyeong(x.area)}평) · ${x.floor}층 · ${x.built}년식</div>
        </div>
        <div class="price">${priceHtml}<div class="sub">${x.month}.${x.day}${x.canceled ? ' 해제' : ''}</div></div>
      </div>`;
    }).join('');
    return `<div class="card">${rows}</div>`;
  }

  async function search(e) {
    e.preventDefault();
    const f = e.target;
    if (!Store.get('apiKey', '')) {
      $('tradeResult').innerHTML = '<div class="warn">먼저 아래 "API 키 설정"에서 공공데이터포털 인증키를 저장해 주세요.</div>';
      document.querySelector('#tab-trade details').open = true;
      return;
    }
    const code = f.code.value.trim() || f.region.value;
    if (!/^\d{5}$/.test(code)) {
      $('tradeResult').innerHTML = '<div class="warn">법정동코드는 5자리 숫자예요.</div>';
      return;
    }
    Store.set('region', f.region.value);
    const ym = f.ym.value.replace('-', '');
    const q = f.q.value.trim();
    $('tradeResult').innerHTML = '<div class="loading">불러오는 중…</div>';
    try {
      const res = await fetch(buildUrl(code, ym));
      const text = await res.text();
      if (!res.ok) throw new Error(`서버 응답 ${res.status}`);
      let items = parseItems(text);
      if (q) items = items.filter((x) => x.name.includes(q));
      items.sort((a, b) => num(b.day) - num(a.day));
      $('tradeResult').innerHTML = renderStats(items) + renderList(items);
    } catch (err) {
      const hint = isApp() ? '' : '<br>웹 브라우저에서는 보안 정책(CORS) 때문에 조회가 막힐 수 있어요. 앱에서 시도해 보세요.';
      $('tradeResult').innerHTML = `<div class="warn">조회 실패: ${Fmt.escape(err.message)}${hint}</div>`;
    }
  }

  function init() {
    fillRegions();
    const now = new Date();
    document.querySelector('#tradeForm [name=ym]').value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    $('apiKey').value = Store.get('apiKey', '');
    $('apiKeySave').addEventListener('click', () => {
      Store.set('apiKey', $('apiKey').value.trim());
      toast('API 키를 저장했어요');
    });
    $('tradeKind').addEventListener('click', (e) => {
      if (!e.target.dataset.kind) return;
      kind = e.target.dataset.kind;
      $('tradeKind').querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === e.target));
      $('tradeResult').innerHTML = '';
    });
    $('tradeForm').addEventListener('submit', search);
  }

  return { init };
})();
