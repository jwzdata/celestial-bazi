// ============================
// 全局狀態
// ============================
let baziResult = null;
let calYear = new Date().getFullYear();
let calMonth = new Date().getMonth(); // 0-indexed

// ============================
// UI 渲染
// ============================

function renderPillars(pillars, dayGan) {
  const labels = ['年柱','月柱','日柱（命主）','時柱'];
  const grid = document.getElementById('pillarGrid');
  grid.innerHTML = '';
  pillars.forEach((p, i) => {
    let isDay = (i === 2);
    let ss = getShiShen(dayGan, p.gan);
    // 六十甲子序號 → 納音
    let gz60 = -1;
    for (let k = 0; k < 60; k++) {
      if (k % 10 === p.gan && k % 12 === p.zhi) { gz60 = k; break; }
    }
    let ny = NA_YIN[Math.floor(gz60 / 2)];
    
    let ganColor = WX_COLORS[WX_GAN[p.gan]];
    let zhiColor = WX_COLORS[WX_ZHI[p.zhi]];
    let cangGanHTML = CANG_GAN[p.zhi].map((g, ci) => {
      let w = ['本氣','中氣','餘氣'][ci];
      return `<span class="text-xs" style="color:${WX_COLORS[WX_GAN[g]]};opacity:${1-ci*0.25}">${TG[g]}<span class="text-accent/30" style="font-size:.55rem">${w}</span></span>`;
    }).join(' ');

    let card = document.createElement('div');
    card.className = `pillar-card ${isDay ? 'is-day' : ''} reveal delay-${i * 100}`;
    card.innerHTML = `
      <div class="text-xs text-accent/40 tracking-wider mb-1">${labels[i]}</div>
      <div class="shi-shen-tag">${ss}</div>
      <div class="pillar-gan" style="color:${ganColor};text-shadow: 0 2px 10px ${ganColor}40">${TG[p.gan]}</div>
      <div class="pillar-divider"></div>
      <div class="pillar-zhi" style="color:${zhiColor};text-shadow: 0 2px 10px ${zhiColor}40">${DZ[p.zhi]}</div>
      <div class="mt-2 space-y-0.5">${cangGanHTML}</div>
      <div class="mt-3 pt-2 border-t border-accent/10 text-xs text-accent/40 flex justify-between px-2">
        <span>${ny}</span>
        <span>${getChangSheng(dayGan, p.zhi)}</span>
      </div>
    `;
    grid.appendChild(card);
  });
}

function renderWuXing(wxCount) {
  const chart = document.getElementById('wxChart');
  const legend = document.getElementById('wxLegend');
  const center = document.getElementById('wxCenterNum');
  
  let total = Object.values(wxCount).reduce((s, v) => s + v, 0);
  center.textContent = Math.round(total);
  
  let r = 80, cx = 100, cy = 100, C = 2 * Math.PI * r;
  chart.innerHTML = '';
  
  // 缺失的五行顯示虛線環
  let startOffset = 0;
  WX_LIST.forEach(wx => {
    let pct = wxCount[wx] / total;
    let len = pct * C;
    let gap = 4; // 間隔
    let circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', cx);
    circle.setAttribute('cy', cy);
    circle.setAttribute('r', r);
    circle.setAttribute('fill', 'none');
    circle.setAttribute('stroke', WX_COLORS[wx]);
    circle.setAttribute('stroke-width', pct > 0 ? 18 : 2);
    circle.setAttribute('stroke-dasharray', `${Math.max(len - gap, 0)} ${C - Math.max(len - gap, 0)}`);
    circle.setAttribute('stroke-dashoffset', `${-startOffset}`);
    circle.setAttribute('stroke-linecap', 'round');
    if (pct === 0) {
      circle.setAttribute('stroke-dasharray', `2 ${C / 5 - 2}`);
      circle.setAttribute('opacity', '0.2');
    }
    chart.appendChild(circle);
    startOffset += len;
  });

  // 圖例
  legend.innerHTML = '';
  WX_LIST.forEach(wx => {
    let pct = ((wxCount[wx] / total) * 100).toFixed(0);
    let val = wxCount[wx].toFixed(1);
    let missing = wxCount[wx] === 0;
    let item = document.createElement('div');
    item.className = 'flex items-center gap-3 p-2 rounded-lg';
    item.style.background = missing ? 'rgba(196,107,94,0.05)' : 'transparent';
    item.innerHTML = `
      <span class="text-lg">${WX_ICONS[wx]}</span>
      <div class="flex-1">
        <div class="flex justify-between items-center mb-1">
          <span class="text-sm font-500" style="color:${WX_COLORS[wx]}">${wx}</span>
          <span class="text-xs text-accent/50">${pct}%</span>
        </div>
        <div class="h-1 bg-accent/10 rounded-full overflow-hidden">
          <div class="h-full rounded-full transition-all duration-1000" style="width:${pct}%;background:${WX_COLORS[wx]};opacity:${missing?0.2:0.8}"></div>
        </div>
        ${missing ? '<span class="text-xs text-fire/60">缺失</span>' : `<span class="text-xs text-accent/40">${val}</span>`}
      </div>
    `;
    legend.appendChild(item);
  });
}

function renderStrength(dayGan, monthZhi, strength) {
  document.getElementById('dayMasterLabel').textContent = TG[dayGan] + WX_GAN[dayGan];
  document.getElementById('monthLabel').textContent = DZ[monthZhi] + '月';
  
  let badge = document.getElementById('strengthBadge');
  if (strength.isStrong) {
    badge.textContent = '身強';
    badge.className = 'px-4 py-1.5 rounded-full text-sm font-600 bg-earth/15 text-earth border border-earth/30';
  } else {
    badge.textContent = '身弱';
    badge.className = 'px-4 py-1.5 rounded-full text-sm font-600 bg-water/15 text-water border border-water/30';
  }
  
  let bar = document.getElementById('strengthBar');
  bar.style.width = strength.score + '%';
  bar.style.background = strength.isStrong
    ? 'linear-gradient(90deg, rgba(196,162,101,0.4), rgba(196,162,101,0.8))'
    : 'linear-gradient(90deg, rgba(90,139,168,0.4), rgba(90,139,168,0.8))';

  let dayWX = WX_GAN[dayGan];
  let motherEl = strength.motherEl;
  let text = `${TG[dayGan]}${dayWX}日主生於${DZ[monthZhi]}月`;
  // 判斷得令
  if (WX_ZHI[monthZhi] === dayWX || WX_ZHI[monthZhi] === motherEl) {
    text += `，${DZ[monthZhi]}爲${dayWX === WX_ZHI[monthZhi] ? dayWX+'之餘氣' : '生'+dayWX+'之印星'}，日主得令`;
  } else {
    text += `，月支${DZ[monthZhi]}${WX_ZHI[monthZhi]}不助日主`;
  }
  if (strength.isStrong) {
    text += `。綜合五行力量分析，日主${dayWX}力量偏強，屬於身強之命格。身強則宜泄宜克，需要通過食傷泄秀或官殺制衡來平衡命局。`;
  } else {
    text += `。綜合五行力量分析，日主${dayWX}力量偏弱，屬於身弱之命格。身弱則宜扶宜生，需要通過印星生扶或比劫助身來增強命局。`;
  }
  document.getElementById('strengthText').textContent = text;
}

function renderTraits(dayGan, isStrong) {
  let wx = WX_GAN[dayGan];
  let pList = document.getElementById('personalityList');
  let cList = document.getElementById('careerList');
  let traits = TRAITS[wx][isStrong ? 'strong' : 'weak'];
  let career = CAREER[wx][isStrong ? 'strong' : 'weak'];
  pList.innerHTML = traits.map(t => `<li class="flex gap-2"><span class="text-accent/30 mt-0.5">•</span><span>${t}</span></li>`).join('');
  cList.innerHTML = career.map(t => `<li class="flex gap-2"><span class="text-accent/30 mt-0.5">•</span><span>${t}</span></li>`).join('');
}

function renderXiYong(xiYong) {
  const grid = document.getElementById('xiYongGrid');
  const items = [
    { label: '喜神', wx: xiYong.xi, cls: 'xi' },
    { label: '用神', wx: xiYong.yong, cls: 'yong' },
    { label: '忌神', wx: xiYong.ji, cls: 'ji' },
    { label: '閒神', wx: xiYong.xian, cls: 'xian' }
  ];
  grid.innerHTML = '';
  items.forEach(it => {
    let wxArr = Array.isArray(it.wx) ? it.wx : [it.wx];
    let card = document.createElement('div');
    card.className = `xi-yong-card ${it.cls}`;
    card.innerHTML = `
      <div class="text-xs text-accent/50 mb-2">${it.label}</div>
      <div class="space-y-1">
        ${wxArr.map(w => `<div class="flex items-center justify-center gap-2">
          <span class="text-lg">${WX_ICONS[w]}</span>
          <span class="font-serif text-lg font-600" style="color:${WX_COLORS[w]}">${w}</span>
        </div>`).join('')}
      </div>
    `;
    grid.appendChild(card);
  });

  // 詳細解讀
  let detail = document.getElementById('xiYongDetail').querySelector('ul');
  let dayWX = baziResult.dayGanWX;
  let isStrong = baziResult.isStrong;
  let lines = [];
  
  if (isStrong) {
    lines.push(`<li><strong style="color:${WX_COLORS[xiYong.yong]}">${xiYong.yong}爲用神</strong>：${xiYong.yong}能剋制過旺之${dayWX}，有效抑制日主過強帶來的剛愎自用之弊，使命局趨於平衡</li>`);
    lines.push(`<li><strong style="color:${WX_COLORS[xiYong.xi]}">${xiYong.xi}爲喜神</strong>：${xiYong.xi}爲${dayWX}所生，能泄化日主過剩之氣，轉化爲才華與創造力，增強命局的流通性</li>`);
    let jiStr = xiYong.ji.join('、');
    lines.push(`<li><strong style="color:var(--fire)">${jiStr}爲忌神</strong>：${jiStr}會進一步助旺日主，加劇命局失衡，應儘量迴避</li>`);
    lines.push(`<li><strong style="color:var(--accent)">${xiYong.xian}爲閒神</strong>：${xiYong.xian}雖耗日主之力，但作用有限，需視命局配合而定</li>`);
  } else {
    lines.push(`<li><strong style="color:${WX_COLORS[xiYong.yong]}">${xiYong.yong}爲用神</strong>：${xiYong.yong}與日主同屬${dayWX}，能直接增強日主力量，是最有效的扶助之力</li>`);
    lines.push(`<li><strong style="color:${WX_COLORS[xiYong.xi]}">${xiYong.xi}爲喜神</strong>：${xiYong.xi}能生助日主${dayWX}，如同母親滋養子女，爲命局注入溫暖與支持</li>`);
    let jiStr = xiYong.ji.join('、');
    lines.push(`<li><strong style="color:var(--fire)">${jiStr}爲忌神</strong>：${jiStr}會進一步消耗或剋制本已偏弱的日主，應儘量避免</li>`);
    lines.push(`<li><strong style="color:var(--accent)">${xiYong.xian}爲閒神</strong>：${xiYong.xian}耗日主之力但有時也可激發鬥志，需視大運配合</li>`);
  }
  detail.innerHTML = lines.join('');
}

function renderCalendar() {
  document.getElementById('calYearHeader').textContent = calYear;
  document.getElementById('calMonthLabel').textContent = calYear + '年' + (calMonth + 1) + '月';
  
  // 更新實時時間
  const updateTime = () => {
    const now = new Date();
    document.getElementById('calTimeNow').textContent = now.toTimeString().split(' ')[0];
    const days = ['日', '一', '二', '三', '四', '五', '六'];
    document.getElementById('calDateNow').textContent = `${now.getMonth()+1}月${now.getDate()}日 星期${days[now.getDay()]}`;
  };
  updateTime();
  if(!window.timeInt) window.timeInt = setInterval(updateTime, 1000);
  
  // 日曆網格
  const daysContainer = document.getElementById('calDays');
  daysContainer.innerHTML = '';
  
  let year = calYear, month = calMonth + 1; // JS month is 0-indexed
  
  // 我們使用農曆的月來顯示吉凶日曆會更準確，但爲了和公曆配合，我們仍然顯示公曆的這個月
  // 可以根據需要決定顯示公曆月還是農曆月
  let firstDay = new Date(year, month - 1, 1);
  let daysInMonth = new Date(year, month, 0).getDate();
  let startDOW = firstDay.getDay(); // 0=Sunday
  
  // 填充空白
  for (let i = 0; i < startDOW; i++) {
    let empty = document.createElement('div');
    empty.className = 'cal-day opacity-0';
    daysContainer.appendChild(empty);
  }
  
  let xiElements = [baziResult.xiYong.xi, baziResult.xiYong.yong];
  let jiElements = baziResult.xiYong.ji;
  
  // 展平數組，以防喜用神是數組
  xiElements = xiElements.flat();
  jiElements = jiElements.flat();
  
  let todayDate = new Date();
  
  for (let d = 1; d <= daysInMonth; d++) {
    // 使用 lunar-javascript 獲取日柱干支索引用於吉凶判斷
    const solar = Solar.fromYmdHms(year, month, d, 12, 0, 0);
    const lunar = solar.getLunar();
    const bazi = lunar.getEightChar();
    
    // 獲取日柱的乾和支索引
    const dGan = TG.indexOf(bazi.getDayGan());
    const dZhi = DZ.indexOf(bazi.getDayZhi());
    
    let dGanWX = WX_GAN[dGan], dZhiWX = WX_ZHI[dZhi];
    let score = 0;
    if (xiElements.includes(dGanWX)) score += 2;
    if (xiElements.includes(dZhiWX)) score += 1.5;
    if (jiElements.includes(dGanWX)) score -= 2;
    if (jiElements.includes(dZhiWX)) score -= 1.5;
    
    // 把 score 轉換成類似 bazi-daily 的百分制分數
    let percentScore = 60 + Math.round(score * 10);
    percentScore = Math.max(0, Math.min(100, percentScore));
    
    let fortune = 'ping';
    if (score >= 1.5) fortune = 'ji';
    else if (score <= -1.5) fortune = 'xiong';
    
    // 計算當天的十神
    let shishen = getShiShen(baziResult.dayGan, dGan);
    
    let isToday = (year === todayDate.getFullYear() && month === (todayDate.getMonth() + 1) && d === todayDate.getDate());
    let todayStyle = isToday ? 'ring-2 ring-accent ring-offset-2 ring-offset-bg bg-accent/5' : '';
    
    let dayCell = document.createElement('div');
    dayCell.className = `cal-day ${fortune} ${todayStyle} cursor-pointer hover:-translate-y-1`;
    let numColor = isToday ? 'color:var(--accent);font-weight:900;' : 'color:rgba(255,215,0,0.6)';
    
    dayCell.innerHTML = `
      <div class="day-num" style="${numColor}">${d}${isToday ? '<span class="ml-1 text-[10px] text-accent/70">今</span>' : ''}</div>
      <div class="text-[10px] text-accent/40 mt-1">${TG[dGan]}${DZ[dZhi]}</div>
      <div class="day-score">${percentScore}</div>
      <div class="day-shishen">${shishen}</div>
    `;
    
    // 綁定點擊事件，更新頂部摘要
    dayCell.onclick = () => {
      // 移除其他選中狀態
      document.querySelectorAll('.cal-day').forEach(el => el.classList.remove('ring-1', 'ring-accent'));
      dayCell.classList.add('ring-1', 'ring-accent');
      
      updateSummary(solar, lunar, bazi, dGan, dZhi, shishen, percentScore, fortune);
    };
    
    daysContainer.appendChild(dayCell);
    
    // 如果是今天，或者是每月1號，初始化摘要數據
    if (isToday || (d === 1 && !document.getElementById('calSummaryDate').textContent)) {
      updateSummary(solar, lunar, bazi, dGan, dZhi, shishen, percentScore, fortune);
      if(isToday) dayCell.classList.add('ring-1', 'ring-accent');
    }
  }
}

function updateSummary(solar, lunar, bazi, dGan, dZhi, shishen, percentScore, fortune) {
  document.getElementById('calSummaryDate').textContent = `${solar.getMonth()}月${solar.getDay()}日`;
  let lunarMonth = lunar.getMonthInChinese().replace('腊', '臘').replace('闰', '閏');
  let lunarDay = lunar.getDayInChinese().replace('廿', '廿'); // 廿 is same
  document.getElementById('calSummaryLunar').textContent = `農曆${lunarMonth}月${lunarDay}`;
  
  document.getElementById('calSummaryYear').textContent = bazi.getYear();
  document.getElementById('calSummaryMonth').textContent = bazi.getMonth();
  document.getElementById('calSummaryDay').textContent = bazi.getDay();
  document.getElementById('calSummaryWX').textContent = WX_GAN[dGan];
  
  document.getElementById('calSummaryScoreNum').textContent = percentScore;
  
  // 環形進度條
  let dash = Math.max(0.1, percentScore) + ', 100';
  let ring = document.getElementById('calSummaryScoreRing');
  ring.setAttribute('stroke-dasharray', dash);
  
  let color = fortune === 'ji' ? 'var(--wood)' : (fortune === 'xiong' ? 'var(--fire)' : 'rgba(255,215,0,0.6)');
  ring.setAttribute('stroke', color);
  
  let fortuneText = fortune === 'ji' ? '大吉' : (fortune === 'xiong' ? '大凶' : '小吉');
  document.getElementById('calSummaryFortune').innerHTML = `<span class="w-2 h-2 rounded-full" style="background:${color}"></span> <span style="color:${color}">${fortuneText}</span>`;
  
  document.getElementById('calSummaryShiShen').textContent = shishen;
  
  // 模擬生成宜忌和建議
  let seed = solar.getYear() * 10000 + solar.getMonth() * 100 + solar.getDay();
  
  let goods = [], bads = [];
  if (fortune === 'ji') {
    goods = pickItems(seed, ACT_JI, 3);
    bads = pickItems(seed + 1, ACT_XIONG, 1);
  } else if (fortune === 'xiong') {
    goods = pickItems(seed, ACT_PING, 1);
    bads = pickItems(seed + 1, ACT_XIONG, 3);
  } else {
    goods = pickItems(seed, ACT_PING, 2);
    bads = pickItems(seed + 1, ACT_XIONG, 2);
  }
  
  document.getElementById('calSummaryGood').innerHTML = goods.map(g => `<div class="text-wood"><i class="fas fa-check-square mr-1"></i>${g}</div>`).join('');
  document.getElementById('calSummaryBad').innerHTML = bads.map(b => `<div class="text-fire"><i class="fas fa-exclamation-triangle mr-1"></i>${b}</div>`).join('');
  
  let advice = "運勢平穩，按部就班即可。";
  if (fortune === 'ji') advice = "今日運勢極佳，適合推進重要事項，把握機會。";
  if (fortune === 'xiong') advice = "今日運勢低迷，宜靜不宜動，注意情緒管理與風險防範。";
  document.getElementById('calSummaryAdvice').textContent = advice;
}

function renderLucky() {
  let xy = baziResult.xiYong;
  let xiWX = xy.xi, yongWX = xy.yong;
  
  // 合併喜神和用神數據
  let dirs = [...new Set([LUCKY_DATA[xiWX].dir, LUCKY_DATA[yongWX].dir])];
  let colors = [...new Set([...LUCKY_DATA[xiWX].colors, ...LUCKY_DATA[yongWX].colors])];
  let nums = [...new Set([...LUCKY_DATA[xiWX].nums, ...LUCKY_DATA[yongWX].nums])];
  let plants = [...new Set([...LUCKY_DATA[xiWX].plants, ...LUCKY_DATA[yongWX].plants])];
  
  document.getElementById('luckyDir').textContent = dirs.join('、');
  document.getElementById('luckyColor').textContent = colors.join('、');
  document.getElementById('luckyNum').textContent = nums.join('、');
  document.getElementById('luckyPlant').textContent = plants.join('、');
  
  // 穿衣指南
  let dress = DRESS_COLORS[xiWX] || DRESS_COLORS[yongWX];
  if (!dress) dress = DRESS_COLORS['木'];
  
  function renderSwatches(container, items) {
    container.innerHTML = items.map(it => 
      `<div class="flex flex-col items-center gap-1">
        <div class="color-swatch" style="background:${it.c}"></div>
        <span class="text-xs text-accent/40">${it.n}</span>
      </div>`
    ).join('');
  }
  renderSwatches(document.getElementById('dressFirst'), dress.first);
  renderSwatches(document.getElementById('dressSecond'), dress.second);
  renderSwatches(document.getElementById('dressAvoid'), dress.avoid);
  
  document.getElementById('dressAcc').innerHTML = dress.acc.map(a => 
    `<span class="px-3 py-1 rounded-full bg-accent/5 border border-accent/10 text-xs">${a}</span>`
  ).join('');
}

// ============================
// 主分析流程
// ============================
function analyze() {
  let dateVal = document.getElementById('inputDate').value;
  let hourVal = document.getElementById('inputHour').value;
  let errEl = document.getElementById('errorMsg');
  let formEl = document.getElementById('inputForm');
  let btnEl = document.getElementById('btnAnalyze');
  
  const showError = (msg) => {
    errEl.textContent = msg;
    errEl.classList.remove('hidden');
    formEl.classList.remove('form-shake');
    void formEl.offsetWidth; // trigger reflow
    formEl.classList.add('form-shake');
  };
  
  if (!dateVal) { showError('請選擇出生日期'); return; }
  if (hourVal === '') { showError('請選擇出生時辰'); return; }
  errEl.classList.add('hidden');
  
  // 禁用按鈕防連點
  btnEl.disabled = true;
  btnEl.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>解析中...';
  
  
  // 【VIP 攔截邏輯】
  // 爲了方便驗證，暫時取消強制登錄和支付攔截，直接放行
  // if (!currentUser) {
  //   showModal('authModal');
  //   return;
  // }
  // if (!currentUser.isVip) {
  //   selectPay('wechat'); // 默認選中微信
  //   showModal('payModal');
  //   return;
  // }


  let parts = dateVal.split('-');
  let year = parseInt(parts[0]), month = parseInt(parts[1]), day = parseInt(parts[2]);
  let hourZhi = parseInt(hourVal);
  
  // 顯示加載
  document.getElementById('heroSection').classList.add('hidden');
  document.getElementById('loadingSection').classList.remove('hidden');
  
  let msgs = ['正在推演天干地支...', '分析五行生剋...', '測算喜用神...', '生成運勢指南...'];
  let msgIdx = 0;
  let loadText = document.getElementById('loadingText');
  loadText.textContent = msgs[0];
  let loadInterval = setInterval(() => {
    msgIdx = (msgIdx + 1) % msgs.length;
    loadText.textContent = msgs[msgIdx];
  }, 300);
  
  setTimeout(() => {
    clearInterval(loadInterval);
    // 排盤 (使用 lunar-javascript)
    // Lunar.js 使用公曆日期，小時我們傳入中間值，或者不傳小時用默認
    let pillars = window.getPillarsUsingLunar(year, month, day, hourZhi);
    let yp = pillars[0];
    let mp = pillars[1];
    let dp = pillars[2];
    let hp = pillars[3];
    
    // 五行統計
    let wxCount = countWuXing(pillars);
    
    // 身強身弱
    let strength = judgeStrength(dp.gan, mp.zhi, wxCount);
    
    // 喜用神
    let xiYong = getXiYong(dp.gan, strength.isStrong, strength.ctrlEl, strength.motherEl, strength.childWX, strength.wealthEl);
    
    // 存儲結果
    baziResult = {
      pillars, wxCount, strength, xiYong,
      dayGan: dp.gan,
      dayGanWX: WX_GAN[dp.gan],
      monthZhi: mp.zhi,
      isStrong: strength.isStrong
    };
    
    calYear = new Date().getFullYear();
    calMonth = new Date().getMonth();
    
    // 渲染所有模塊
    renderPillars(pillars, dp.gan);
    renderWuXing(wxCount);
    renderStrength(dp.gan, mp.zhi, strength);
    renderTraits(dp.gan, strength.isStrong);
    renderXiYong(xiYong);
    renderCalendar();
    renderLucky();
    
    // 切換顯示
    document.getElementById('loadingSection').classList.add('hidden');
    document.getElementById('resultSection').classList.remove('hidden');
    document.getElementById('btnReset').classList.remove('hidden');
    
    // 恢復按鈕狀態
    btnEl.disabled = false;
    btnEl.textContent = '開始解析';
    
    // 觸發滾動動畫
    setTimeout(initScrollReveal, 100);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, 1200);
}

// ============================
// 事件綁定
// ============================
document.getElementById('btnAnalyze').addEventListener('click', analyze);

document.getElementById('btnReset').addEventListener('click', () => {
  document.getElementById('resultSection').classList.add('hidden');
  document.getElementById('heroSection').classList.remove('hidden');
  document.getElementById('btnReset').classList.add('hidden');
  document.getElementById('btnAnalyze').disabled = false;
  document.getElementById('btnAnalyze').textContent = '開始解析';
  
  // 重置状态
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

document.getElementById('calPrev').addEventListener('click', () => {
  calMonth--;
  if (calMonth < 0) {
    calMonth = 11;
    calYear--;
  }
  renderCalendar();
});

document.getElementById('calNext').addEventListener('click', () => {
  calMonth++;
  if (calMonth > 11) {
    calMonth = 0;
    calYear++;
  }
  renderCalendar();
});

document.getElementById('calBackToday').addEventListener('click', () => {
  calYear = new Date().getFullYear();
  calMonth = new Date().getMonth();
  renderCalendar();
});

// 回車提交
document.getElementById('inputDate').addEventListener('keydown', e => { if (e.key === 'Enter') analyze(); });
document.getElementById('inputHour').addEventListener('keydown', e => { if (e.key === 'Enter') analyze(); });

// ============================
// 滾動揭示動畫
// ============================
function initScrollReveal() {
  let observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
  
  document.querySelectorAll('.reveal').forEach(el => {
    el.classList.remove('visible');
    observer.observe(el);
  });
}

// ============================
// 背景粒子
// ============================
function initParticles() {
  const container = document.getElementById('particles');
  const count = window.innerWidth < 768 ? 20 : 40;
  for (let i = 0; i < count; i++) {
    let p = document.createElement('div');
    p.className = 'particle';
    let size = 1 + Math.random() * 2;
    let left = Math.random() * 100;
    let delay = Math.random() * 20;
    let duration = 15 + Math.random() * 20;
    p.style.cssText = `
      width:${size}px;height:${size}px;
      left:${left}%;bottom:-10px;
      animation:particleRise ${duration}s linear ${delay}s infinite;
      opacity:${0.15 + Math.random() * 0.3};
    `;
    container.appendChild(p);
  }
}

// ============================
// 初始化
// ============================

// 內容營銷：命理小知識
const baziTips = [
  { tag: '十神', text: "「正財」代表正當收入與穩定積累，也常對應男命的妻星。適合用“長期主義”的方式打造財富。" },
  { tag: '五行', text: "「木」主仁，其性直，其情和。木旺之人多重情義，適合做教育、內容、品牌與長期經營。" },
  { tag: '天干', text: "「甲木」如參天大樹，重原則、講擔當。優勢在於扛事與格局，短板是容易剛直不圓融。" },
  { tag: '地支', text: "「子水」爲陽水，主機敏與應變。子旺之人思維快，適合策略、產品、運營與跨界整合。" },
  { tag: '空亡', text: "「空亡」不必然全兇。若忌神落空亡，反而像“消災”，關鍵看命局整體配合與運勢流轉。" },
  { tag: '桃花', text: "「桃花星」主管人緣與魅力。真正的桃花運不是“多”，而是“對”：有邊界、有篩選、有成長。" },
  { tag: '財庫', text: "辰戌丑未爲“四庫”。命局見財庫，往往更擅長存錢與做“資產型選擇”，重在守與積。" },
  { tag: '驛馬', text: "「驛馬星」代表走動與變動。驛馬旺者適合出差、跨城、跨境與流動性更強的行業賽道。" }
];

let currentTipIndex = -1;

function getDailyTipIndex() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  let seed = y * 10000 + m * 100 + d;
  if (baziResult && typeof baziResult.dayGan === 'number') {
    seed += baziResult.dayGan * 97;
  }
  seed = Math.abs(seed);
  return seed % baziTips.length;
}

function refreshTip(forceRandom = false) {
  const tipEl = document.getElementById('tipContent');
  if (!tipEl) return;

  currentTipIndex = forceRandom ? Math.floor(Math.random() * baziTips.length) : getDailyTipIndex();
  const tip = baziTips[currentTipIndex];
  tipEl.innerHTML = `<div class="fade-in"><span class="text-xs text-accent/60">【<span>${tip.tag}</span>】</span> <span>${tip.text}</span></div>`;
}

async function copyTip() {
  const tip = baziTips[currentTipIndex >= 0 ? currentTipIndex : getDailyTipIndex()];
  const tTag = typeof translateText === 'function' ? translateText(tip.tag) : tip.tag;
  const tText = typeof translateText === 'function' ? translateText(tip.text) : tip.text;
  const tTitle = typeof translateText === 'function' ? translateText('每日命理小貼士') : '每日命理小貼士';
  const tSource = typeof translateText === 'function' ? translateText('來自星曜命理') : '來自星曜命理';
  const shareText = `【${tTitle} | ${tTag}】${tText} (${tSource})`;
  try {
    await navigator.clipboard.writeText(shareText);
    alert(typeof translateText === 'function' ? translateText('已複製，可直接粘貼到朋友圈/社羣。') : '已複製，可直接粘貼到朋友圈/社羣。');
  } catch (e) {
    // Fallback: use temporary textarea
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try { await navigator.clipboard.writeText(shareText); } catch (_) {
        fallbackCopy(shareText);
      }
    } else {
      fallbackCopy(shareText);
    }
    alert(typeof translateText === 'function' ? translateText('已複製，可直接粘貼到朋友圈/社羣。') : '已複製，可直接粘貼到朋友圈/社羣。');
  }
}
function fallbackCopy(text) {
  const tmp = document.createElement('textarea');
  tmp.value = text;
  tmp.style.position = 'fixed';
  tmp.style.opacity = '0';
  document.body.appendChild(tmp);
  tmp.select();
  try { document.execCommand('copy'); } catch(_) {}
  tmp.remove();
}

document.addEventListener('DOMContentLoaded', () => {
  initParticles();
  refreshTip();
  
  // 設置默認日期
  let today = new Date();
  let dateStr = today.toISOString().split('T')[0];
  document.getElementById('inputDate').value = dateStr;
});


// ============================
// 高級功能邏輯
// ============================

function checkVipBeforeFeature() {
  // 爲了方便驗證，暫時取消強制登錄和支付攔截
  // if (!currentUser) {
  //   showModal('authModal');
  //   return false;
  // }
  // if (!currentUser.isVip) {
  //   selectPay('wechat');
  //   showModal('payModal');
  //   return false;
  // }
  if (!baziResult) {
    alert('請先在主頁輸入出生信息進行排盤分析！');
    return false;
  }
  return true;
}

function showFeature(feature) {
  if (!checkVipBeforeFeature()) return;
  
  // 每次打開彈窗前，重置內部狀態
  if (feature === 'hehun') {
    const btn = document.querySelector('#hehunModal .btn-primary');
    btn.innerHTML = '<i class="fas fa-heart mr-2"></i>開始合婚';
    btn.disabled = false;
    document.getElementById('hehunResult').classList.add('hidden');
  } else if (feature === 'qiming') {
    const btn = document.querySelector('#qimingModal .btn-primary');
    btn.innerHTML = '<i class="fas fa-magic mr-2"></i>智能起名';
    btn.disabled = false;
    document.getElementById('qimingResult').classList.add('hidden');
    // 可選：不自動清空姓氏，方便用戶重試
  } else if (feature === 'chouqian') {
    document.getElementById('qianTong').classList.remove('hidden');
    document.getElementById('qianResult').classList.add('hidden');
  } else if (feature === 'luckynum') {
    document.getElementById('numResult').classList.add('hidden');
    document.getElementById('btnGenNum').classList.remove('hidden');
    
    // 設置喜用神文本
    let xi = baziResult.xiYong.xi;
    let yong = baziResult.xiYong.yong;
    if (Array.isArray(xi)) xi = xi[0];
    if (Array.isArray(yong)) yong = yong[0];
    document.getElementById('numXiYong').textContent = `喜${xi}用${yong}`;
  } else if (feature === 'aiReport') {
    document.getElementById('aiReportIntro').classList.remove('hidden');
    document.getElementById('aiReportGenerating').classList.add('hidden');
    document.getElementById('aiReportResult').classList.add('hidden');
    document.getElementById('aiProgress').style.width = '0%';
  }
  
  if (feature === 'dayun') {
    renderDaYun();
  } else if (feature === 'wealth') {
    renderWealth();
  }
  
  showModal(feature + 'Modal');
}

function renderDaYun() {
  if (!baziResult) return;
  const container = document.getElementById('dayunContent');
  const parts = document.getElementById('inputDate').value.split('-');
  const year = parseInt(parts[0]), month = parseInt(parts[1]), day = parseInt(parts[2]);
  const hourZhi = parseInt(document.getElementById('inputHour').value);

  // 使用 lunar-javascript 获取大运
  const solar = Solar.fromYmdHms(year, month, day, [0,2,4,6,8,10,12,14,16,18,20,22][hourZhi], 0, 0);
  const lunar = solar.getLunar();
  const eightChar = lunar.getEightChar();
  const yun = eightChar.getYun(1); // 1=顺排，根据性别和年干阴阳自动判断

  const dayunList = yun.getDaYun();
  const today = new Date();
  let html = '';

  dayunList.forEach((dy, idx) => {
    const startYear = dy.getStartYear();
    const endYear = startYear + 9;
    const ganZhi = dy.getGanZhi();
    const dGan = TG.indexOf(ganZhi.charAt(0));
    const dZhi = DZ.indexOf(ganZhi.charAt(1));
    const dyWX = WX_GAN[dGan];

    // 判断与喜用神的关系
    const isXi = baziResult.xiYong.xi === dyWX || (Array.isArray(baziResult.xiYong.xi) && baziResult.xiYong.xi.includes(dyWX));
    const isYong = baziResult.xiYong.yong === dyWX;
    const isJi = baziResult.xiYong.ji.includes(dyWX);
    const isFuture = startYear > today.getFullYear();
    const isCurrent = startYear <= today.getFullYear() && endYear >= today.getFullYear();

    let borderColor = 'border-accent/10', bgColor = 'bg-accent/5', textColor = 'text-accent';
    let fortuneLabel = '平';
    if (isXi || isYong) { borderColor = 'border-wood/20'; bgColor = 'bg-wood/5'; textColor = 'text-wood'; fortuneLabel = '吉'; }
    if (isYong) { fortuneLabel = '大吉'; }
    if (isJi) { borderColor = 'border-fire/20'; bgColor = 'bg-fire/5'; textColor = 'text-fire'; fortuneLabel = '兇'; }

    let tag = '';
    if (isCurrent) tag = '<span class="ml-2 px-2 py-0.5 rounded-full bg-accent/20 text-accent text-[10px] font-bold">當前</span>';
    else if (isFuture) tag = '<span class="ml-2 px-2 py-0.5 rounded-full bg-black/30 text-accent/50 text-[10px]">未來</span>';

    let desc = '';
    if (isXi || isYong) desc = `${ganZhi}大運，${dyWX}氣旺盛，正好是您的喜用神，運勢順遂，事業財運均有突破。`;
    else if (isJi) desc = `${ganZhi}大運，${dyWX}氣偏旺，恰爲忌神，需注意防范風險，穩中求進。`;
    else desc = `${ganZhi}大運，五行氣場平和，運勢穩定，適合積累沉淀。`;

    // 生成流年概览（每步大运的10年）
    let yearsHtml = '';
    for (let y = startYear; y <= Math.min(endYear, startYear + 9); y++) {
      const ySolar = Solar.fromYmd(y, month, day);
      const yLunar = ySolar.getLunar();
      const yBazi = yLunar.getEightChar();
      const yDayGan = TG.indexOf(yBazi.getDayGan());
      const yDayWX = WX_GAN[yDayGan];
      let yScore = 0;
      const xiArr = [baziResult.xiYong.xi, baziResult.xiYong.yong].flat();
      const jiArr = baziResult.xiYong.ji.flat();
      if (xiArr.includes(yDayWX)) yScore += 2;
      if (jiArr.includes(yDayWX)) yScore -= 2;
      let yFortune = '平', yColor = 'text-accent', yBg = 'bg-black/20';
      if (yScore >= 2) { yFortune = '吉'; yColor = 'text-wood'; yBg = 'bg-wood/20'; }
      else if (yScore <= -2) { yFortune = '兇'; yColor = 'text-fire'; yBg = 'bg-fire/20'; }

      yearsHtml += `<div class="${yBg} p-1 rounded ${yColor}">${y}<br>${yFortune}</div>`;
    }

    html += `
      <div class="p-4 border ${borderColor} ${bgColor} rounded-lg">
        <h4 class="font-bold ${textColor} text-sm mb-2">
          <i class="fas fa-${isCurrent ? 'arrow-up' : (isFuture ? 'arrow-right' : 'history')} mr-2"></i>
          ${startYear} - ${endYear} (${ganZhi}大運)${tag}
        </h4>
        <p class="text-xs text-accent/70 leading-relaxed">${desc}</p>
        <div class="mt-3 grid grid-cols-5 gap-2 text-center text-[10px]">${yearsHtml}</div>
      </div>`;

    if (idx >= 3) return; // 最多显示4步大运
  });

  container.innerHTML = html || '<p class="text-center text-accent/50 text-sm">請先進行排盤分析</p>';
}

function renderWealth() {
  if (!baziResult) return;
  const container = document.getElementById('wealthContent');
  
  // 找出財星五行 (克日主的五行爲財星)
  const dayWX = baziResult.dayGanWX;
  let wealthWX = '';
  if (dayWX === '金') wealthWX = '木';
  if (dayWX === '木') wealthWX = '土';
  if (dayWX === '水') wealthWX = '火';
  if (dayWX === '火') wealthWX = '金';
  if (dayWX === '土') wealthWX = '水';

  const wealthCount = baziResult.wxCount[wealthWX] || 0;
  
  // 判斷財庫 (辰戌丑未)
  const kuList = ['辰', '戌', '丑', '未'];
  let myKu = [];
  baziResult.pillars.forEach(p => {
    let zhi = DZ[p.zhi];
    if (kuList.includes(zhi)) {
      myKu.push(zhi);
    }
  });

  // 計算財富指數 (滿分100)
  let score = 60; // 基礎分
  if (wealthCount > 0) score += 15;
  if (wealthCount > 1) score += 10;
  score += myKu.length * 5;
  
  // 身強能擔財，身弱財多反累
  if (baziResult.isStrong && wealthCount > 0) score += 10;
  if (!baziResult.isStrong && wealthCount > 2) score -= 10;
  
  score = Math.min(99, Math.max(40, score)); // 限制在40-99之間

  let levelText = score >= 85 ? '大富之命' : (score >= 70 ? '中富之命' : '小富安康');
  let levelColor = score >= 85 ? 'text-fire' : 'text-accent';

  let kuHtml = '';
  if (myKu.length > 0) {
    kuHtml = `您的命局自帶財庫：<span class="font-bold text-earth">${myKu.join('、')}</span>，擅長守財，晚年易有豐厚積累。`;
  } else {
    kuHtml = `您的命局暫無明現財庫，建議養成儲蓄習慣，或通過購置固定資產來守住財富。`;
  }

  // 生成投資建議
  let advice = '';
  if (wealthWX === '金') advice = '適合金融、五金、汽車、珠寶等行業。投資偏向穩健的理財產品。';
  if (wealthWX === '木') advice = '適合教育、文化、林業、醫療等行業。投資可考慮長期持有的資產。';
  if (wealthWX === '水') advice = '適合物流、貿易、互聯網、餐飲等流動性強的行業。求財需靈活應變。';
  if (wealthWX === '火') advice = '適合科技、互聯網、電力、美業等行業。投資眼光獨到，適合新興領域。';
  if (wealthWX === '土') advice = '適合房地產、農業、建築、礦產等實體行業。投資以固定資產爲佳。';

  let html = `
    <div class="text-center mb-6">
      <div class="inline-block relative">
        <svg width="120" height="120" viewBox="0 0 120 120" class="transform -rotate-90">
          <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,215,0,0.1)" stroke-width="8"></circle>
          <circle cx="60" cy="60" r="50" fill="none" stroke="var(--fire)" stroke-width="8" stroke-dasharray="${score * 3.14} 400"></circle>
        </svg>
        <div class="absolute inset-0 flex flex-col items-center justify-center">
          <span class="text-3xl font-bold ${levelColor}">${score}</span>
          <span class="text-[10px] text-accent/50">財富指數</span>
        </div>
      </div>
      <div class="mt-2 text-sm font-bold ${levelColor}">${levelText}</div>
    </div>

    <div class="bg-black/20 p-4 rounded-xl mb-4 border border-accent/10">
      <h4 class="text-accent text-sm font-bold mb-2"><i class="fas fa-search-dollar mr-2"></i>財星解析</h4>
      <p class="text-xs text-accent/80 leading-relaxed mb-2">您的財星五行爲：<span class="font-bold text-accent" style="color:${WX_COLORS[wealthWX]}">${wealthWX}</span>。命局中財星數量為 ${Math.round(wealthCount)}。</p>
      <p class="text-xs text-accent/80 leading-relaxed">${baziResult.isStrong ? '您屬於「身強」能擔財，只要努力打拼，多能獲得豐厚回報。' : '您屬於「身弱」，求財不宜貪大求快，適合團隊合作或借力打力。'}</p>
    </div>

    <div class="bg-black/20 p-4 rounded-xl mb-4 border border-accent/10">
      <h4 class="text-accent text-sm font-bold mb-2"><i class="fas fa-box-open mr-2"></i>財庫分析</h4>
      <p class="text-xs text-accent/80 leading-relaxed">${kuHtml}</p>
    </div>

    <div class="bg-black/20 p-4 rounded-xl border border-accent/10">
      <h4 class="text-accent text-sm font-bold mb-2"><i class="fas fa-chart-line mr-2"></i>求財方向</h4>
      <p class="text-xs text-accent/80 leading-relaxed">${advice}</p>
    </div>
  `;

  container.innerHTML = html;
}

function generateAiReport() {
  document.getElementById('aiReportIntro').classList.add('hidden');
  document.getElementById('aiReportGenerating').classList.remove('hidden');
  
  let progress = 0;
  let pBar = document.getElementById('aiProgress');
  let tText = document.getElementById('aiTypingText');
  
  let texts = [
    '正在讀取八字天干地支能量...',
    '分析大運流年走向...',
    '測算事業財富軌跡...',
    '推演婚姻感情歸宿...',
    '加載專屬改運方案...',
    '報告生成即將完成...'
  ];
  
  let intv = setInterval(() => {
    progress += Math.random() * 15;
    if (progress > 95) progress = 95;
    pBar.style.width = progress + '%';
    tText.textContent = texts[Math.floor(progress / 20)] || texts[5];
  }, 500);

  setTimeout(() => {
    clearInterval(intv);
    pBar.style.width = '100%';
    tText.textContent = '生成完畢！';
    
    setTimeout(() => {
      document.getElementById('aiReportGenerating').classList.add('hidden');
      document.getElementById('aiReportResult').classList.remove('hidden');
      renderAiReportContent();
    }, 500);
  }, 4000);
}

function renderAiReportContent() {
  const container = document.getElementById('aiReportContent');
  const dWX = baziResult.dayGanWX;
  const isS = baziResult.isStrong;
  
  // 模擬長篇報告
  let html = `
    <h4 class="text-lg font-serif text-accent font-bold mb-4 border-b border-accent/20 pb-2">一、 命局總評</h4>
    <p>您的日主為${dWX}，生於${DZ[baziResult.monthZhi]}月。整體命局屬於${isS ? '身強' : '身弱'}之格。此命格最大的特點在於其內在的韌性與潛力。${isS ? '您天生具備較強的抗壓能力與獨立精神，適合開創性的工作。' : '您善於借力打力，心思細膩，適合在團隊中發揮核心協調作用。'}</p>
    
    <h4 class="text-lg font-serif text-accent font-bold mt-6 mb-4 border-b border-accent/20 pb-2">二、 財運與事業剖析</h4>
    <p>從財庫與大運走勢來看，您的財富積累屬於“${baziResult.wxCount['金'] > 1 ? '爆發型' : '穩健型'}”。在未來的3-5年內，將會迎來一波較為明顯的事業上升期。建議在處理財務時，多聽取專業人士意見，避免盲目跟風。</p>
    <p class="mt-2"><strong>事業方向建議：</strong> 您的喜用神為 ${baziResult.xiYong.yong}，非常適合從事與之相關的行業。在職場中，您容易遇到貴人提攜，但需注意防範小人嫉妒。</p>

    <h4 class="text-lg font-serif text-accent font-bold mt-6 mb-4 border-b border-accent/20 pb-2">三、 婚姻與感情歸宿</h4>
    <p>您的感情觀較為${isS ? '主動且強勢' : '被動且細膩'}。命盤顯示，您的正緣出現在${Math.random() > 0.5 ? '東方或東南方' : '西方或西北方'}。婚姻生活中，需多注意溝通方式，避免因固執己見而產生不必要的摩擦。</p>
    
    <h4 class="text-lg font-serif text-accent font-bold mt-6 mb-4 border-b border-accent/20 pb-2">四、 專屬改運指導</h4>
    <ul class="list-disc pl-5 space-y-2">
      <li><strong>色彩開運：</strong> 多穿戴 ${LUCKY_DATA[baziResult.xiYong.yong].colors.join('、')} 色的服飾。</li>
      <li><strong>方位選擇：</strong> 床頭或辦公桌宜朝向 ${LUCKY_DATA[baziResult.xiYong.yong].dir}。</li>
      <li><strong>日常建議：</strong> 保持規律作息，適當佩戴 ${DRESS_COLORS[baziResult.xiYong.yong].acc[0]} 等飾品以增強自身氣場。</li>
    </ul>
    
    <div class="mt-6 p-4 bg-accent/10 rounded-lg text-xs text-accent/60">
      <i class="fas fa-lock mr-2"></i> 完整版萬字報告（包含未來20年逐年流年精批）已解鎖。
    </div>
  `;
  container.innerHTML = html;
}

function downloadAiReport() {
  alert('正在生成 PDF，請稍候... (此為演示功能)');
}

function calculateHehun() {
  const otherDate = document.getElementById('hehunDate').value;
  const otherHour = document.getElementById('hehunHour').value;
  
  if (!otherDate || otherHour === "") {
    alert('請選擇對方的出生日期和時辰');
    return;
  }
  
  const btn = document.querySelector('#hehunModal .btn-primary');
  btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>測算中...';
  btn.disabled = true;
  
  // 使用 lunar-javascript 測算對方八字五行
  let parts = otherDate.split('-');
  let year = parseInt(parts[0]), month = parseInt(parts[1]), day = parseInt(parts[2]);
  let hourZhi = parseInt(otherHour);
  
  let otherPillars = window.getPillarsUsingLunar(year, month, day, hourZhi);
  let otherWxCount = countWuXing(otherPillars);
  
  // 找出對方最旺的五行
  let maxWx = '木';
  let maxVal = 0;
  for (let wx in otherWxCount) {
    if (otherWxCount[wx] > maxVal) {
      maxVal = otherWxCount[wx];
      maxWx = wx;
    }
  }
  
  // 找出我方最旺的五行 (或者使用日主五行)
  let myMaxWx = '木';
  let myMaxVal = 0;
  for (let wx in baziResult.wxCount) {
    if (baziResult.wxCount[wx] > myMaxVal) {
      myMaxVal = baziResult.wxCount[wx];
      myMaxWx = wx;
    }
  }
  
  // 簡單的契合度算法：
  // 1. 如果對方的旺五行是我的喜用神，加分
  // 2. 如果我的旺五行是對方的喜用神，加分
  // 這裏簡化爲：五行相生 > 五行相同 > 五行相剋
  
  let score = 60;
  let desc = "";
  
  let myXi = baziResult.xiYong.xi;
  let myYong = baziResult.xiYong.yong;
  if (Array.isArray(myXi)) myXi = myXi[0];
  if (Array.isArray(myYong)) myYong = myYong[0];
  
  if (maxWx === myXi || maxWx === myYong) {
    score += 25;
    desc = `對方八字${maxWx}旺，正好是您的喜用神，能爲您帶來極大的幫助與好運。`;
  } else if (baziResult.xiYong.ji.includes(maxWx)) {
    score -= 15;
    desc = `對方八字${maxWx}旺，恰爲您的忌神，相處中可能會有一些摩擦，需要多包容。`;
  } else {
    score += 10;
    desc = `雙方五行相對平衡，屬於平穩互助的組合。`;
  }
  
  // 隨機波動一下，顯得更真實
  score += Math.floor(Math.random() * 10) - 5;
  score = Math.max(40, Math.min(99, score));
  
  let level = score >= 80 ? "上等婚" : (score >= 60 ? "中等婚" : "下等婚");
  
  setTimeout(() => {
    // 渲染結果
    const resDiv = document.getElementById('hehunResult');
    resDiv.innerHTML = `
      <div class="flex justify-center items-center gap-4 mb-4">
        <div class="text-center"><div class="w-10 h-10 rounded-full bg-black/20 border border-accent/30 text-accent flex items-center justify-center mx-auto mb-1">我</div><span class="text-xs text-accent/70">${myMaxWx}旺</span></div>
        <div class="text-2xl text-fire animate-pulse"><i class="fas fa-heart"></i></div>
        <div class="text-center"><div class="w-10 h-10 rounded-full bg-black/20 border border-accent/30 text-accent flex items-center justify-center mx-auto mb-1">Ta</div><span class="text-xs text-accent/70">${maxWx}旺</span></div>
      </div>
      <p class="text-center text-sm text-accent mb-2">契合度：<span class="font-bold text-xl text-fire">${score}%</span> (${level})</p>
      <p class="text-xs text-accent/60 text-justify leading-relaxed">${desc}</p>
    `;
    
    resDiv.classList.remove('hidden');
    btn.innerHTML = '<i class="fas fa-check mr-2"></i>測算完成';
  }, 1500);
}

// 簡單的名字庫，按五行分類
const NAME_DICT = {
  '金': {
    '男': ['銘', '鋒', '銳', '錚', '錦', '鑫', '鈞', '誠', '鐸', '新'],
    '女': ['鈴', '鈺', '銀', '鍾', '銘', '錦', '靜', '詩', '悅', '珊']
  },
  '木': {
    '男': ['林', '森', '樸', '權', '杉', '楊', '松', '柏', '棟', '栩'],
    '女': ['柯', '桐', '梓', '棋', '楠', '榕', '桔', '棉', '櫻', '梅']
  },
  '水': {
    '男': ['浩', '海', '濤', '潤', '涵', '清', '淵', '淼', '澤', '洋'],
    '女': ['沐', '沛', '淪', '瀅', '泓', '波', '潔', '洋', '湘', '漣']
  },
  '火': {
    '男': ['炎', '燦', '煒', '爍', '炫', '烽', '煥', '燁', '烽', '煌'],
    '女': ['靈', '秋', '熠', '燁', '然', '熔', '熙', '燃', '燕', '燦']
  },
  '土': {
    '男': ['城', '培', '基', '堂', '坤', '堅', '坦', '均', '堅', '聖'],
    '女': ['佳', '圭', '圜', '坊', '均', '堅', '聖', '坤', '培', '基']
  }
};

function generateNames() {
  const ln = document.getElementById('lastName').value.trim();
  if(!ln) return alert('請輸入姓氏');
  
  const gender = document.getElementById('gender').value;
  const btn = document.querySelector('#qimingModal .btn-primary');
  btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>匹配詩經楚辭...';
  btn.disabled = true;
  
  // 獲取喜用神
  let xi = baziResult.xiYong.xi;
  let yong = baziResult.xiYong.yong;
  
  // 處理可能返回數組的情況
  if (Array.isArray(xi)) xi = xi[0];
  if (Array.isArray(yong)) yong = yong[0];
  
  // 確保五行存在於字典中，如果沒有喜用神或者字典沒有，默認使用木水
  let primaryWx = NAME_DICT[xi] ? xi : '木';
  let secondaryWx = NAME_DICT[yong] ? yong : '水';

  // 渲染喜用神文本
  const xiYongText = document.getElementById('qimingXiYongText');
  xiYongText.innerHTML = `
    <span style="color:${WX_COLORS[primaryWx]}">${primaryWx}</span> 
    <span style="color:${WX_COLORS[secondaryWx]}">${secondaryWx}</span>
  `;
  
  // 生成名字組合
  const generateCard = (wx1, wx2) => {
    // 從字典中隨機挑選字
    const list1 = NAME_DICT[wx1][gender] || NAME_DICT['木']['男'];
    const list2 = NAME_DICT[wx2][gender] || NAME_DICT['水']['男'];
    
    const char1 = list1[Math.floor(Math.random() * list1.length)];
    const char2 = list2[Math.floor(Math.random() * list2.length)];
    
    // 主導的顏色（用於邊框）
    const borderColor = WX_COLORS[wx1];
    
    return `
      <div class="p-3 bg-black/20 rounded border text-center" style="border-color:${borderColor}40">
        <div class="text-lg font-serif text-accent mb-1 tracking-widest">${ln} ${char1} ${char2}</div>
        <div class="text-[10px] flex justify-center gap-2">
          <span style="color:${WX_COLORS[wx1]}">${wx1}</span>
          <span style="color:${WX_COLORS[wx2]}">${wx2}</span>
        </div>
      </div>
    `;
  };

  const cardsContainer = document.getElementById('qimingCards');
  cardsContainer.innerHTML = '';
  
  setTimeout(() => {
    // 生成 4 個推薦名字，組合方式：喜+用，用+喜，喜+喜，用+用
    let html = '';
    html += generateCard(primaryWx, secondaryWx);
    html += generateCard(secondaryWx, primaryWx);
    html += generateCard(primaryWx, primaryWx);
    html += generateCard(secondaryWx, secondaryWx);
    
    cardsContainer.innerHTML = html;
    
    document.getElementById('qimingResult').classList.remove('hidden');
    btn.innerHTML = '<i class="fas fa-check mr-2"></i>生成完畢';
    // 保持按鈕可用，允許用戶再次點擊生成不同名字
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-magic mr-2"></i>換一批';
  }, 1000);
}

function drawQian() {
  const tong = document.getElementById('qianTong');
  tong.classList.add('form-shake'); // 複用現有的震動動畫
  
  setTimeout(() => {
    tong.classList.remove('form-shake');
    tong.classList.add('hidden');
    
    // 生成籤文結果
    const qianData = [
      { t: '上上籤', p: '春風得意馬蹄疾，一日看盡長安花。', e: '今日運勢極旺，五行能量與您完美契合。所求之事多能順遂，適合大膽推進核心計劃。' },
      { t: '上吉籤', p: '乘風破浪會有時，直掛雲帆濟滄海。', e: '今日您的貴人運強勁，雖有小波折，但最終都能化險爲夷，逢凶化吉。' },
      { t: '中吉籤', p: '有心栽花花不開，無心插柳柳成蔭。', e: '今日不宜強求，順其自然反而會有意外之喜。適合做一些輕鬆的籌備工作。' },
      { t: '中平籤', p: '行到水窮處，坐看雲起時。', e: '今日運勢平穩，五行能量無大沖大合。適合靜心學習、覆盤，不宜做重大決策。' },
      { t: '下下籤', p: '路漫漫其修遠兮，吾將上下而求索。', e: '今日流日干支與您命局有所沖剋。建議保持低調，少說話多做事，避免與人發生口角。' }
    ];
    
    // 生成隨機索引，不再綁定特定日期，確保每次抽籤結果隨機
    const result = qianData[Math.floor(Math.random() * qianData.length)];
    
    document.getElementById('qianTitle').textContent = typeof translateText === 'function' ? translateText(result.t) : result.t;
    document.getElementById('qianTitle').className = `font-serif text-3xl font-bold mb-2 ${result.t.includes('下') ? 'text-fire' : 'text-accent'}`;
    document.getElementById('qianPoem').textContent = typeof translateText === 'function' ? translateText(result.p) : result.p;
    const explainPrefix = typeof translateText === 'function' ? translateText('解析：') : '解析：';
    const explainContent = typeof translateText === 'function' ? translateText(result.e) : result.e;
    document.getElementById('qianExplain').textContent = explainPrefix + explainContent;
    
    document.getElementById('qianResult').classList.remove('hidden');
  }, 800);
}

function generateLuckyNum() {
  const btn = document.getElementById('btnGenNum');
  btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>生成中...';
  btn.disabled = true;
  
  setTimeout(() => {
    // 獲取用戶的喜用神五行對應的數字
    let xi = baziResult.xiYong.xi;
    let yong = baziResult.xiYong.yong;
    if (Array.isArray(xi)) xi = xi[0];
    if (Array.isArray(yong)) yong = yong[0];
    
    const wxNums = {
      '水': [1, 6], '火': [2, 7], '木': [3, 8], '金': [4, 9], '土': [5, 0]
    };
    
    let pool = [...(wxNums[xi] || []), ...(wxNums[yong] || []), 0,1,2,3,4,5,6,7,8,9]; // 偏好喜用神數字，但也包含其他
    
    let nums = [];
    for(let i=0; i<6; i++) {
      nums.push(pool[Math.floor(Math.random() * pool.length)]);
    }
    
    // 渲染球
    const container = document.getElementById('numBalls');
    container.innerHTML = nums.map(n => 
      `<div class="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-earth text-bg flex items-center justify-center font-bold text-xl shadow-[0_0_15px_rgba(255,215,0,0.5)] transform hover:scale-110 transition-transform cursor-default">${n}</div>`
    ).join('');
    
    btn.classList.add('hidden');
    document.getElementById('numResult').classList.remove('hidden');
    
    btn.innerHTML = '<i class="fas fa-dice mr-2"></i>點擊生成';
    btn.disabled = false;
  }, 600);
}
function generatePoster() {
  if (!checkVipBeforeFeature()) return;
  
  showModal('posterModal');
  const resultDiv = document.getElementById('posterResult');
  resultDiv.innerHTML = '<div class="py-20 text-center text-accent/50"><i class="fas fa-spinner fa-spin text-3xl mb-2"></i><br>海報生成中...</div>';
  
  // 填充海報數據
  document.getElementById('posterDayMaster').textContent = TG[baziResult.dayGan] + WX_GAN[baziResult.dayGan];
  document.getElementById('posterStrength').textContent = baziResult.strength.isStrong ? '身強' : '身弱';
  document.getElementById('posterDesc').textContent = document.getElementById('strengthText').textContent.substring(0, 80) + '...';
  
  // 設置二維碼 (帶推廣鏈接，未登錄時使用默認鏈接)
  const inviteCode = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.invite_code : 'DEMO';
  const refLink = encodeURIComponent(`${window.location.origin}/?ref=${inviteCode}`);
  
  // 使用内联 QR 码生成
  const qrCanvas = document.createElement('canvas');
  const qrSize = 150;
  qrCanvas.width = qrSize;
  qrCanvas.height = qrSize;
  generateQRCode(qrCanvas, refLink);

  document.getElementById('posterQr').src = qrCanvas.toDataURL();
  document.getElementById('posterQr').style.display = 'block';

  // 生成图片
  setTimeout(() => {
    html2canvas(document.getElementById('posterCanvas'), {
          backgroundColor: '#1a1a2e',
          scale: 2,
          useCORS: true
        }).then(canvas => {
          const img = document.createElement('img');
          img.src = canvas.toDataURL('image/jpeg');
          img.className = 'w-full h-auto shadow-2xl rounded-xl';
          resultDiv.innerHTML = '';
          resultDiv.appendChild(img);
        }).catch(err => {
          console.error(err);
          resultDiv.innerHTML = '<div class="py-20 text-center text-fire"><i class="fas fa-exclamation-triangle text-3xl mb-2"></i><br>海報生成失敗，請稍後重試</div>';
        });
      }, 500); // 等待图片渲染
}

// ============================
// 内联 QR 码生成（无外部依赖）
// ============================
function generateQRCode(canvas, data) {
  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  const modules = 21; // QR version 1
  const cellSize = Math.floor(size / (modules + 2));
  const offset = Math.floor((size - cellSize * modules) / 2);

  // 简易 QR 编码（使用 data URL 方式生成 canvas QR）
  // 实际使用轻量实现
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  // 使用简易模式：生成一个基于数据的视觉 QR 图案
  const qrLib = window.qrcode;
  if (qrLib) {
    // 如果 qrcode 库可用，使用它
    const qr = qrLib(0, 'M');
    qr.addData(data);
    qr.make();
    const moduleCount = qr.getModuleCount();
    const cellSz = size / moduleCount;
    ctx.fillStyle = '#000000';
    for (let r = 0; r < moduleCount; r++) {
      for (let c = 0; c < moduleCount; c++) {
        if (qr.isDark(r, c)) {
          ctx.fillRect(c * cellSz, r * cellSz, cellSz, cellSz);
        }
      }
    }
  } else {
    // Fallback: 生成装饰性占位图案
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#f0d78c';
    ctx.font = `${Math.floor(size / 15)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('QR Code', size / 2, size / 2 - 10);
    ctx.fillStyle = 'rgba(255,215,0,0.5)';
    ctx.font = `${Math.floor(size / 25)}px sans-serif`;
    ctx.fillText(window.location.origin, size / 2, size / 2 + 15);
  }
}
