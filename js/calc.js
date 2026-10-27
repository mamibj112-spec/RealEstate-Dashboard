// 계산기 탭: 대출, 취득세, 중개보수, DSR·LTV, 전월세 전환
// 금액 입력은 모두 "만원" 단위
window.Calc = (() => {
  const body = () => document.getElementById('calcBody');

  // ---------- 공통 ----------
  const field = (name, label, value, man) => `
    <label>${label}${man ? ' (만원)' : ''}
      <input name="${name}" type="number" inputmode="decimal" value="${value}" ${man ? 'data-man' : ''}>
      ${man ? '<span class="hint"></span>' : ''}
    </label>`;
  const radios = (name, opts, checked) => `
    <div class="radio-row">${opts.map(([v, t]) =>
      `<label><input type="radio" name="${name}" value="${v}" ${v === checked ? 'checked' : ''}>${t}</label>`).join('')}
    </div>`;
  const kv = (k, v) => `<div class="kv"><span>${k}</span><b>${v}</b></div>`;

  // 월 상환액 (원리금균등)
  function annuity(principalWon, annualRate, months) {
    const r = annualRate / 100 / 12;
    if (r === 0) return principalWon / months;
    return principalWon * r / (1 - Math.pow(1 + r, -months));
  }

  // ---------- 대출 상환 ----------
  const loan = {
    html: `<div class="card"><form class="form">
      ${field('amount', '대출금', 30000, true)}
      <div class="row">${field('rate', '연 금리 (%)', 4.0)}${field('years', '기간 (년)', 30)}</div>
      ${radios('method', [['equal', '원리금균등'], ['principal', '원금균등'], ['bullet', '만기일시']], 'equal')}
      <div class="out"></div></form></div>`,
    calc(v) {
      const P = v.amount * 10000, n = Math.round(v.years * 12), r = v.rate / 100 / 12;
      if (!(P > 0 && n > 0 && v.rate >= 0)) return '';
      const rows = [];
      let bal = P, totalInt = 0;
      const fixed = annuity(P, v.rate, n);
      for (let i = 1; i <= n; i++) {
        const interest = bal * r;
        let principal;
        if (v.method === 'equal') principal = fixed - interest;
        else if (v.method === 'principal') principal = P / n;
        else principal = i === n ? bal : 0;
        bal -= principal;
        totalInt += interest;
        if (i <= 12) rows.push([i, principal + interest, principal, interest, Math.max(bal, 0)]);
      }
      const first = rows[0][1];
      const label = v.method === 'principal' ? '첫 달 상환액 (매달 줄어듦)' : '월 상환액';
      return `<div class="result">
        <div class="muted">${label}</div>
        <p class="big">${Fmt.num(Math.round(first))}<small>원</small></p>
        ${kv('총 이자', Fmt.won(totalInt))}
        ${kv('총 상환액', Fmt.won(P + totalInt))}
      </div>
      <details><summary class="muted" style="margin-top:10px;cursor:pointer">첫 12개월 상환 스케줄</summary>
        <div class="table-wrap"><table>
          <tr><th>회차</th><th>상환액</th><th>원금</th><th>이자</th></tr>
          ${rows.map((x) => `<tr><td>${x[0]}</td><td>${Fmt.num(x[1])}</td><td>${Fmt.num(x[2])}</td><td>${Fmt.num(x[3])}</td></tr>`).join('')}
        </table></div>
      </details>`;
    }
  };

  // ---------- 취득세 (주택 유상취득) ----------
  // 1주택·비조정 2주택: 6억↓ 1%, 6~9억 (가액(억)×2/3−3)%, 9억↑ 3%
  // 중과: 조정 2주택·비조정 3주택 8%, 조정 3주택+·비조정 4주택+ 12%
  const tax = {
    html: `<div class="card"><form class="form">
      ${field('price', '취득가액', 60000, true)}
      <label>취득 후 주택 수</label>
      ${radios('houses', [['1', '1주택'], ['2', '2주택'], ['3', '3주택'], ['4', '4주택+']], '1')}
      <label>조정대상지역 여부</label>
      ${radios('adjusted', [['n', '비조정'], ['y', '조정지역']], 'n')}
      <label>전용면적</label>
      ${radios('big', [['n', '85㎡ 이하'], ['y', '85㎡ 초과']], 'n')}
      <div class="out"></div></form></div>`,
    calc(v) {
      const won = v.price * 10000;
      if (!(won > 0)) return '';
      const h = Number(v.houses), adj = v.adjusted === 'y', big = v.big === 'y';
      let rate, heavy = 0;
      if ((adj && h >= 3) || (!adj && h >= 4)) heavy = 12;
      else if ((adj && h === 2) || (!adj && h === 3)) heavy = 8;

      if (heavy) rate = heavy;
      else if (v.price <= 60000) rate = 1;
      else if (v.price <= 90000) rate = Math.round(((v.price / 10000) * 2 / 3 - 3) * 100) / 100;
      else rate = 3;

      const eduRate = heavy ? 0.4 : rate * 0.1;
      const farmRate = !big ? 0 : heavy === 12 ? 1.0 : heavy === 8 ? 0.6 : 0.2;
      const acq = won * rate / 100, edu = won * eduRate / 100, farm = won * farmRate / 100;
      const total = acq + edu + farm;
      return `<div class="result">
        <div class="muted">총 납부 예상액 (합계 ${Fmt.pct(rate + eduRate + farmRate, 2)})</div>
        <p class="big">${Fmt.won(total)}</p>
        ${kv(`취득세 (${Fmt.pct(rate, 2)})`, Fmt.num(acq) + '원')}
        ${kv(`지방교육세 (${Fmt.pct(eduRate, 2)})`, Fmt.num(edu) + '원')}
        ${kv(`농어촌특별세 (${Fmt.pct(farmRate, 2)})`, Fmt.num(farm) + '원')}
      </div>
      ${heavy ? `<div class="warn">다주택 중과세율 ${heavy}%가 적용됐어요. 일시적 2주택, 공시가격 1억 이하 주택 등은 예외가 될 수 있어요.</div>` : ''}`;
    }
  };

  // ---------- 중개보수 (주택) ----------
  const FEE_TABLE = {
    sale: [[5000, 0.6, 25], [20000, 0.5, 80], [90000, 0.4], [120000, 0.5], [150000, 0.6], [Infinity, 0.7]],
    lease: [[5000, 0.5, 20], [10000, 0.4, 30], [60000, 0.3], [120000, 0.4], [150000, 0.5], [Infinity, 0.6]]
  };
  const fee = {
    html: `<div class="card"><form class="form">
      ${radios('kind', [['sale', '매매'], ['lease', '전세·월세']], 'sale')}
      ${field('price', '거래금액 / 보증금', 50000, true)}
      ${field('monthly', '월세 (월세일 때만)', 0, true)}
      <div class="out"></div></form></div>`,
    calc(v) {
      let base = v.price;
      // 월세 거래금액 = 보증금 + 월세×100 (5천만원 미만이면 ×70)
      if (v.kind === 'lease' && v.monthly > 0) {
        base = v.price + v.monthly * 100;
        if (base < 5000) base = v.price + v.monthly * 70;
      }
      if (!(base > 0)) return '';
      const [, rate, cap] = FEE_TABLE[v.kind].find(([limit]) => base < limit);
      let feeMan = base * rate / 100;
      if (cap) feeMan = Math.min(feeMan, cap);
      const feeWon = feeMan * 10000;
      return `<div class="result">
        <div class="muted">중개보수 상한 (요율 ${rate}%${cap ? `, 한도 ${cap}만원` : ''})</div>
        <p class="big">${Fmt.num(Math.round(feeWon))}<small>원</small></p>
        ${kv('부가세 10% 포함 시', Fmt.num(Math.round(feeWon * 1.1)) + '원')}
        ${v.kind === 'lease' && v.monthly > 0 ? kv('환산 거래금액', Fmt.man(base)) : ''}
      </div>
      <p class="muted" style="margin-top:8px">상한 요율 이내에서 중개사와 협의할 수 있어요. 일반과세자인 중개사무소는 부가세가 붙을 수 있어요.</p>`;
    }
  };

  // ---------- DSR · LTV ----------
  const dsr = {
    html: `<div class="card"><form class="form">
      ${field('income', '연소득', 6000, true)}
      ${field('price', '주택 가격', 60000, true)}
      ${field('loan', '주담대 금액', 30000, true)}
      <div class="row">${field('rate', '금리 (%)', 4.0)}${field('years', '기간 (년)', 30)}</div>
      ${field('other', '기타 대출 연간 원리금', 0, true)}
      <div class="out"></div></form></div>`,
    calc(v) {
      if (!(v.income > 0 && v.price > 0 && v.years > 0)) return '';
      const yearlyMortgage = annuity(v.loan * 10000, v.rate, v.years * 12) * 12;
      const yearly = yearlyMortgage + v.other * 10000;
      const dsrPct = yearly / (v.income * 10000) * 100;
      const ltvPct = v.loan / v.price * 100;
      // DSR 40% 기준 최대 대출액
      const maxYearly = v.income * 10000 * 0.4 - v.other * 10000;
      const perWon = annuity(1, v.rate, v.years * 12) * 12;
      const maxLoan = maxYearly > 0 ? maxYearly / perWon : 0;
      const g = (p, limit) => `<div class="gauge ${p > limit ? 'over' : ''}"><i style="width:${Math.min(p / (limit * 1.5) * 100, 100)}%"></i></div>`;
      return `<div class="result">
        <div class="kv"><span>DSR (은행권 기준 40%)</span><b>${Fmt.pct(dsrPct)}</b></div>
        ${g(dsrPct, 40)}
        <div class="kv"><span>LTV</span><b>${Fmt.pct(ltvPct)}</b></div>
        ${g(ltvPct, 70)}
        ${kv('주담대 연간 원리금', Fmt.won(yearlyMortgage))}
        ${kv('DSR 40% 기준 최대 대출', Fmt.won(maxLoan))}
      </div>
      ${dsrPct > 40 ? '<div class="warn">DSR 40%를 넘어요. 대출 금액이나 기간을 조정해 보세요.</div>' : ''}
      <p class="muted" style="margin-top:8px">스트레스 DSR(가산금리), 지역별 LTV 한도는 정책에 따라 달라져요.</p>`;
    }
  };

  // ---------- 전월세 전환 ----------
  const rent = {
    html: `<div class="card"><form class="form">
      ${field('jeonse', '전세 보증금', 30000, true)}
      ${field('deposit', '바꿀 월세 보증금', 5000, true)}
      ${field('rate', '전환율 (%)', 5.0)}
      <div class="out"></div></form></div>`,
    calc(v) {
      const diff = v.jeonse - v.deposit;
      if (!(diff > 0 && v.rate > 0)) return '';
      const monthly = diff * 10000 * v.rate / 100 / 12;
      return `<div class="result">
        <div class="muted">보증금 ${Fmt.man(v.deposit)}일 때 적정 월세</div>
        <p class="big">${Fmt.num(Math.round(monthly / 1000) * 1000)}<small>원</small></p>
        ${kv('전환되는 보증금', Fmt.man(diff))}
        ${kv('연간 월세 합계', Fmt.won(monthly * 12))}
      </div>
      <p class="muted" style="margin-top:8px">법정 전환율 상한은 한국은행 기준금리 + 2%예요.</p>`;
    }
  };

  const CALCS = { loan, tax, fee, dsr, rent };

  function read(form) {
    const v = {};
    new FormData(form).forEach((val, key) => {
      v[key] = val !== '' && !isNaN(val) ? Number(val) : val;
    });
    return v;
  }

  function show(key) {
    const c = CALCS[key];
    body().innerHTML = c.html;
    const form = body().querySelector('form');
    const out = form.querySelector('.out');
    form.querySelectorAll('input[data-man]').forEach((inp) => bindManHint(inp, inp.nextElementSibling));
    const run = () => { out.innerHTML = c.calc(read(form)); };
    form.addEventListener('input', run);
    form.addEventListener('submit', (e) => e.preventDefault());
    run();
    document.querySelectorAll('#calcSeg button').forEach((b) => b.classList.toggle('on', b.dataset.calc === key));
    Store.set('calcTab', key);
  }

  function init() {
    document.getElementById('calcSeg').addEventListener('click', (e) => {
      if (e.target.dataset.calc) show(e.target.dataset.calc);
    });
    show(Store.get('calcTab', 'loan'));
  }

  return { init };
})();
