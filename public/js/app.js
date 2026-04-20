// ============================
// 全局状态
// ============================
let baziResult = null;
let calYear = new Date().getFullYear();
let calMonth = new Date().getMonth(); // 0-indexed

// ============================
// UI 渲染
// ============================

function renderPillars(pillars, dayGan) {
  const labels = ['年柱','月柱','日柱（命主）','时柱'];
  const grid = document.getElementById('pillarGrid');
  grid.innerHTML = '';
  pillars.forEach((p, i) => {
    let isDay = (i === 2);
    let ss = getShiShen(dayGan, p.gan);
    let ny = NA_YIN[Math.floor(((p.gan % 10) * 12 + (p.zhi % 12)) / 2) % 30]; // 简化纳音
    // 更准确的纳音：用干支序号
    let gzIdx = 0;
    for (let g = 0; g < 10; g++) for (let z = 0; z < 12; z++) {
      if (g === p.gan && z === p.zhi) break;
      if (z === 11 && g !== p.gan) continue;
      if (g === p.gan) { gzIdx = g * 12 + z; break; }
      gzIdx++;
    }
    // 简单方法：干支序号
    gzIdx = p.gan * 6 + Math.floor(p.zhi / 2); // 不对...
    // 正确方法：六十甲子序号
    // 甲子=0, 乙丑=1, ... 
    // gan和zhi必须同奇偶才能组合
    let gz60 = -1;
    for (let k = 0; k < 60; k++) {
      if (k % 10 === p.gan && k % 12 === p.zhi) { gz60 = k; break; }
    }
    ny = NA_YIN[Math.floor(gz60 / 2)];
    
    let ganColor = WX_COLORS[WX_GAN[p.gan]];
    let zhiColor = WX_COLORS[WX_ZHI[p.zhi]];
    let cangGanHTML = CANG_GAN[p.zhi].map((g, ci) => {
      let w = ['本气','中气','余气'][ci];
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
  
  // 缺失的五行显示虚线环
  let startOffset = 0;
  WX_LIST.forEach(wx => {
    let pct = wxCount[wx] / total;
    let len = pct * C;
    let gap = 4; // 间隔
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

  // 图例
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
    badge.textContent = '身强';
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
  let text = `${TG[dayGan]}${dayWX}日主生于${DZ[monthZhi]}月`;
  // 判断得令
  if (WX_ZHI[monthZhi] === dayWX || WX_ZHI[monthZhi] === motherEl) {
    text += `，${DZ[monthZhi]}为${dayWX === WX_ZHI[monthZhi] ? dayWX+'之余气' : '生'+dayWX+'之印星'}，日主得令`;
  } else {
    text += `，月支${DZ[monthZhi]}${WX_ZHI[monthZhi]}不助日主`;
  }
  if (strength.isStrong) {
    text += `。综合五行力量分析，日主${dayWX}力量偏强，属于身强之命格。身强则宜泄宜克，需要通过食伤泄秀或官杀制衡来平衡命局。`;
  } else {
    text += `。综合五行力量分析，日主${dayWX}力量偏弱，属于身弱之命格。身弱则宜扶宜生，需要通过印星生扶或比劫助身来增强命局。`;
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
    { label: '闲神', wx: xiYong.xian, cls: 'xian' }
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

  // 详细解读
  let detail = document.getElementById('xiYongDetail').querySelector('ul');
  let dayWX = baziResult.dayGanWX;
  let isStrong = baziResult.isStrong;
  let lines = [];
  
  if (isStrong) {
    lines.push(`<li><strong style="color:${WX_COLORS[xiYong.yong]}">${xiYong.yong}为用神</strong>：${xiYong.yong}能克制过旺之${dayWX}，有效抑制日主过强带来的刚愎自用之弊，使命局趋于平衡</li>`);
    lines.push(`<li><strong style="color:${WX_COLORS[xiYong.xi]}">${xiYong.xi}为喜神</strong>：${xiYong.xi}为${dayWX}所生，能泄化日主过剩之气，转化为才华与创造力，增强命局的流通性</li>`);
    let jiStr = xiYong.ji.join('、');
    lines.push(`<li><strong style="color:var(--fire)">${jiStr}为忌神</strong>：${jiStr}会进一步助旺日主，加剧命局失衡，应尽量回避</li>`);
    lines.push(`<li><strong style="color:var(--accent)">${xiYong.xian}为闲神</strong>：${xiYong.xian}虽耗日主之力，但作用有限，需视命局配合而定</li>`);
  } else {
    lines.push(`<li><strong style="color:${WX_COLORS[xiYong.yong]}">${xiYong.yong}为用神</strong>：${xiYong.yong}与日主同属${dayWX}，能直接增强日主力量，是最有效的扶助之力</li>`);
    lines.push(`<li><strong style="color:${WX_COLORS[xiYong.xi]}">${xiYong.xi}为喜神</strong>：${xiYong.xi}能生助日主${dayWX}，如同母亲滋养子女，为命局注入温暖与支持</li>`);
    let jiStr = xiYong.ji.join('、');
    lines.push(`<li><strong style="color:var(--fire)">${jiStr}为忌神</strong>：${jiStr}会进一步消耗或克制本已偏弱的日主，应尽量避免</li>`);
    lines.push(`<li><strong style="color:var(--accent)">${xiYong.xian}为闲神</strong>：${xiYong.xian}耗日主之力但有时也可激发斗志，需视大运配合</li>`);
  }
  detail.innerHTML = lines.join('');
}

function renderCalendar() {
  document.getElementById('calYearHeader').textContent = calYear;
  document.getElementById('calMonthLabel').textContent = calYear + '年' + (calMonth + 1) + '月';
  
  // 更新实时时间
  const updateTime = () => {
    const now = new Date();
    document.getElementById('calTimeNow').textContent = now.toTimeString().split(' ')[0];
    const days = ['日', '一', '二', '三', '四', '五', '六'];
    document.getElementById('calDateNow').textContent = `${now.getMonth()+1}月${now.getDate()}日 星期${days[now.getDay()]}`;
  };
  updateTime();
  if(!window.timeInt) window.timeInt = setInterval(updateTime, 1000);
  
  // 日历网格
  const daysContainer = document.getElementById('calDays');
  daysContainer.innerHTML = '';
  
  let year = calYear, month = calMonth + 1; // JS month is 0-indexed
  
  // 我们使用农历的月来显示吉凶日历会更准确，但为了和公历配合，我们仍然显示公历的这个月
  // 可以根据需要决定显示公历月还是农历月
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
  
  // 展平数组，以防喜用神是数组
  xiElements = xiElements.flat();
  jiElements = jiElements.flat();
  
  let todayDate = new Date();
  
  for (let d = 1; d <= daysInMonth; d++) {
    // 使用 lunar-javascript 获取日柱干支索引用于吉凶判断
    const solar = Solar.fromYmdHms(year, month, d, 12, 0, 0);
    const lunar = solar.getLunar();
    const bazi = lunar.getEightChar();
    
    // 获取日柱的干和支索引
    const dGan = TG.indexOf(bazi.getDayGan());
    const dZhi = DZ.indexOf(bazi.getDayZhi());
    
    let dGanWX = WX_GAN[dGan], dZhiWX = WX_ZHI[dZhi];
    let score = 0;
    if (xiElements.includes(dGanWX)) score += 2;
    if (xiElements.includes(dZhiWX)) score += 1.5;
    if (jiElements.includes(dGanWX)) score -= 2;
    if (jiElements.includes(dZhiWX)) score -= 1.5;
    
    // 把 score 转换成类似 bazi-daily 的百分制分数
    let percentScore = 60 + Math.round(score * 10);
    percentScore = Math.max(0, Math.min(100, percentScore));
    
    let fortune = 'ping';
    if (score >= 1.5) fortune = 'ji';
    else if (score <= -1.5) fortune = 'xiong';
    
    // 计算当天的十神
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
    
    // 绑定点击事件，更新顶部摘要
    dayCell.onclick = () => {
      // 移除其他选中状态
      document.querySelectorAll('.cal-day').forEach(el => el.classList.remove('ring-1', 'ring-accent'));
      dayCell.classList.add('ring-1', 'ring-accent');
      
      updateSummary(solar, lunar, bazi, dGan, dZhi, shishen, percentScore, fortune);
    };
    
    daysContainer.appendChild(dayCell);
    
    // 如果是今天，或者是每月1号，初始化摘要数据
    if (isToday || (d === 1 && !document.getElementById('calSummaryDate').textContent)) {
      updateSummary(solar, lunar, bazi, dGan, dZhi, shishen, percentScore, fortune);
      if(isToday) dayCell.classList.add('ring-1', 'ring-accent');
    }
  }
}

function updateSummary(solar, lunar, bazi, dGan, dZhi, shishen, percentScore, fortune) {
  document.getElementById('calSummaryDate').textContent = `${solar.getMonth()}月${solar.getDay()}日`;
  document.getElementById('calSummaryLunar').textContent = `农历${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`;
  
  document.getElementById('calSummaryYear').textContent = bazi.getYear();
  document.getElementById('calSummaryMonth').textContent = bazi.getMonth();
  document.getElementById('calSummaryDay').textContent = bazi.getDay();
  document.getElementById('calSummaryWX').textContent = WX_GAN[dGan];
  
  document.getElementById('calSummaryScoreNum').textContent = percentScore;
  
  // 环形进度条
  let dash = Math.max(0.1, percentScore) + ', 100';
  let ring = document.getElementById('calSummaryScoreRing');
  ring.setAttribute('stroke-dasharray', dash);
  
  let color = fortune === 'ji' ? 'var(--wood)' : (fortune === 'xiong' ? 'var(--fire)' : 'rgba(255,215,0,0.6)');
  ring.setAttribute('stroke', color);
  
  let fortuneText = fortune === 'ji' ? '大吉' : (fortune === 'xiong' ? '大凶' : '小吉');
  document.getElementById('calSummaryFortune').innerHTML = `<span class="w-2 h-2 rounded-full" style="background:${color}"></span> <span style="color:${color}">${fortuneText}</span>`;
  
  document.getElementById('calSummaryShiShen').textContent = shishen;
  
  // 模拟生成宜忌和建议
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
  
  let advice = "运势平稳，按部就班即可。";
  if (fortune === 'ji') advice = "今日运势极佳，适合推进重要事项，把握机会。";
  if (fortune === 'xiong') advice = "今日运势低迷，宜静不宜动，注意情绪管理与风险防范。";
  document.getElementById('calSummaryAdvice').textContent = advice;
}

function renderLucky() {
  let xy = baziResult.xiYong;
  let xiWX = xy.xi, yongWX = xy.yong;
  
  // 合并喜神和用神数据
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
  
  if (!dateVal) { showError('请选择出生日期'); return; }
  if (hourVal === '') { showError('请选择出生时辰'); return; }
  errEl.classList.add('hidden');
  
  // 禁用按钮防连点
  btnEl.disabled = true;
  btnEl.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>解析中...';
  
  
  // 【VIP 拦截逻辑】
  // 为了方便验证，暂时取消强制登录和支付拦截，直接放行
  // if (!currentUser) {
  //   showModal('authModal');
  //   return;
  // }
  // if (!currentUser.isVip) {
  //   selectPay('wechat'); // 默认选中微信
  //   showModal('payModal');
  //   return;
  // }


  let parts = dateVal.split('-');
  let year = parseInt(parts[0]), month = parseInt(parts[1]), day = parseInt(parts[2]);
  let hourZhi = parseInt(hourVal);
  
  // 显示加载
  document.getElementById('heroSection').classList.add('hidden');
  document.getElementById('loadingSection').classList.remove('hidden');
  
  let msgs = ['正在推演天干地支...', '分析五行生克...', '测算喜用神...', '生成运势指南...'];
  let msgIdx = 0;
  let loadText = document.getElementById('loadingText');
  loadText.textContent = msgs[0];
  let loadInterval = setInterval(() => {
    msgIdx = (msgIdx + 1) % msgs.length;
    loadText.textContent = msgs[msgIdx];
  }, 300);
  
  setTimeout(() => {
    clearInterval(loadInterval);
    // 排盘 (使用 lunar-javascript)
    // Lunar.js 使用公历日期，小时我们传入中间值，或者不传小时用默认
    let pillars = window.getPillarsUsingLunar(year, month, day, hourZhi);
    let yp = pillars[0];
    let mp = pillars[1];
    let dp = pillars[2];
    let hp = pillars[3];
    
    // 五行统计
    let wxCount = countWuXing(pillars);
    
    // 身强身弱
    let strength = judgeStrength(dp.gan, mp.zhi, wxCount);
    
    // 喜用神
    let xiYong = getXiYong(dp.gan, strength.isStrong, strength.ctrlEl, strength.motherEl, strength.childWX, strength.wealthEl);
    
    // 存储结果
    baziResult = {
      pillars, wxCount, strength, xiYong,
      dayGan: dp.gan,
      dayGanWX: WX_GAN[dp.gan],
      monthZhi: mp.zhi,
      isStrong: strength.isStrong
    };
    
    calYear = new Date().getFullYear();
    calMonth = new Date().getMonth();
    
    // 渲染所有模块
    renderPillars(pillars, dp.gan);
    renderWuXing(wxCount);
    renderStrength(dp.gan, mp.zhi, strength);
    renderTraits(dp.gan, strength.isStrong);
    renderXiYong(xiYong);
    renderCalendar();
    renderLucky();
    
    // 切换显示
    document.getElementById('loadingSection').classList.add('hidden');
    document.getElementById('resultSection').classList.remove('hidden');
    document.getElementById('btnReset').classList.remove('hidden');
    
    // 恢复按钮状态
    btnEl.disabled = false;
    btnEl.textContent = '开始解析';
    
    // 触发滚动动画
    setTimeout(initScrollReveal, 100);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, 1200);
}

// ============================
// 事件绑定
// ============================
document.getElementById('btnAnalyze').addEventListener('click', analyze);

document.getElementById('btnReset').addEventListener('click', () => {
  document.getElementById('resultSection').classList.add('hidden');
  document.getElementById('heroSection').classList.remove('hidden');
  document.getElementById('btnReset').classList.add('hidden');
  document.getElementById('btnAnalyze').disabled = false;
  document.getElementById('btnAnalyze').textContent = '开始解析';
  
  // 重置分享解锁状态
  const overlay = document.getElementById('shareUnlockOverlay');
  const container = document.getElementById('careerListContainer');
  if (overlay) {
    overlay.style.display = 'flex';
    overlay.innerHTML = `<i class="fas fa-lock text-2xl text-accent/50 mb-2"></i>
          <p class="text-xs text-accent mb-4 font-bold">分享给好友，免费解锁事业财运详批</p>
          <button onclick="mockShareUnlock()" class="bg-gradient-to-r from-wood/80 to-wood text-bg px-4 py-2 rounded-full text-xs font-bold shadow-lg hover:scale-105 transition-transform">
            <i class="fab fa-weixin mr-1"></i> 立即分享解锁
          </button>`;
  }
  if (container) {
    container.classList.add('blur-sm', 'opacity-50', 'select-none', 'pointer-events-none');
  }

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

// 回车提交
document.getElementById('inputDate').addEventListener('keydown', e => { if (e.key === 'Enter') analyze(); });
document.getElementById('inputHour').addEventListener('keydown', e => { if (e.key === 'Enter') analyze(); });

// ============================
// 滚动揭示动画
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

// 内容营销：命理小知识
const baziTips = [
  { tag: '十神', text: "「正财」代表正当收入与稳定积累，也常对应男命的妻星。适合用“长期主义”的方式打造财富。" },
  { tag: '五行', text: "「木」主仁，其性直，其情和。木旺之人多重情义，适合做教育、内容、品牌与长期经营。" },
  { tag: '天干', text: "「甲木」如参天大树，重原则、讲担当。优势在于扛事与格局，短板是容易刚直不圆融。" },
  { tag: '地支', text: "「子水」为阳水，主机敏与应变。子旺之人思维快，适合策略、产品、运营与跨界整合。" },
  { tag: '空亡', text: "「空亡」不必然全凶。若忌神落空亡，反而像“消灾”，关键看命局整体配合与运势流转。" },
  { tag: '桃花', text: "「桃花星」主管人缘与魅力。真正的桃花运不是“多”，而是“对”：有边界、有筛选、有成长。" },
  { tag: '财库', text: "辰戌丑未为“四库”。命局见财库，往往更擅长存钱与做“资产型选择”，重在守与积。" },
  { tag: '驿马', text: "「驿马星」代表走动与变动。驿马旺者适合出差、跨城、跨境与流动性更强的行业赛道。" }
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
  tipEl.innerHTML = `<div class="fade-in"><span class="text-xs text-accent/60">【${tip.tag}】</span> ${tip.text}</div>`;
}

async function copyTip() {
  const tip = baziTips[currentTipIndex >= 0 ? currentTipIndex : getDailyTipIndex()];
  const shareText = `【每日命理小贴士｜${tip.tag}】${tip.text}（来自星曜命理）`;
  try {
    await navigator.clipboard.writeText(shareText);
    alert('已复制，可直接粘贴到朋友圈/社群。');
  } catch (e) {
    const tmp = document.createElement('textarea');
    tmp.value = shareText;
    document.body.appendChild(tmp);
    tmp.select();
    document.execCommand('copy');
    tmp.remove();
    alert('已复制，可直接粘贴到朋友圈/社群。');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initParticles();
  refreshTip();
  
  // 设置默认日期
  let today = new Date();
  let dateStr = today.toISOString().split('T')[0];
  document.getElementById('inputDate').value = dateStr;
});


// ============================
// 高级功能逻辑
// ============================

function checkVipBeforeFeature() {
  // 为了方便验证，暂时取消强制登录和支付拦截
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
    alert('请先在主页输入出生信息进行排盘分析！');
    return false;
  }
  return true;
}

function showFeature(feature) {
  if (!checkVipBeforeFeature()) return;
  
  // 每次打开弹窗前，重置内部状态
  if (feature === 'hehun') {
    const btn = document.querySelector('#hehunModal .btn-primary');
    btn.innerHTML = '<i class="fas fa-heart mr-2"></i>开始合婚';
    btn.disabled = false;
    document.getElementById('hehunResult').classList.add('hidden');
  } else if (feature === 'qiming') {
    const btn = document.querySelector('#qimingModal .btn-primary');
    btn.innerHTML = '<i class="fas fa-magic mr-2"></i>智能起名';
    btn.disabled = false;
    document.getElementById('qimingResult').classList.add('hidden');
    // 可选：不自动清空姓氏，方便用户重试
  } else if (feature === 'chouqian') {
    document.getElementById('qianTong').classList.remove('hidden');
    document.getElementById('qianResult').classList.add('hidden');
  } else if (feature === 'luckynum') {
    document.getElementById('numResult').classList.add('hidden');
    document.getElementById('btnGenNum').classList.remove('hidden');
    
    // 设置喜用神文本
    let xi = baziResult.xiYong.xi;
    let yong = baziResult.xiYong.yong;
    if (Array.isArray(xi)) xi = xi[0];
    if (Array.isArray(yong)) yong = yong[0];
    document.getElementById('numXiYong').textContent = `喜${xi}用${yong}`;
  }
  
  showModal(feature + 'Modal');
}

function calculateHehun() {
  const otherDate = document.getElementById('hehunDate').value;
  const otherHour = document.getElementById('hehunHour').value;
  
  if (!otherDate || otherHour === "") {
    alert('请选择对方的出生日期和时辰');
    return;
  }
  
  const btn = document.querySelector('#hehunModal .btn-primary');
  btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>测算中...';
  btn.disabled = true;
  
  // 使用 lunar-javascript 测算对方八字五行
  let parts = otherDate.split('-');
  let year = parseInt(parts[0]), month = parseInt(parts[1]), day = parseInt(parts[2]);
  let hourZhi = parseInt(otherHour);
  
  let otherPillars = window.getPillarsUsingLunar(year, month, day, hourZhi);
  let otherWxCount = countWuXing(otherPillars);
  
  // 找出对方最旺的五行
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
  
  // 简单的契合度算法：
  // 1. 如果对方的旺五行是我的喜用神，加分
  // 2. 如果我的旺五行是对方的喜用神，加分
  // 这里简化为：五行相生 > 五行相同 > 五行相克
  
  let score = 60;
  let desc = "";
  
  let myXi = baziResult.xiYong.xi;
  let myYong = baziResult.xiYong.yong;
  if (Array.isArray(myXi)) myXi = myXi[0];
  if (Array.isArray(myYong)) myYong = myYong[0];
  
  if (maxWx === myXi || maxWx === myYong) {
    score += 25;
    desc = `对方八字${maxWx}旺，正好是您的喜用神，能为您带来极大的帮助与好运。`;
  } else if (baziResult.xiYong.ji.includes(maxWx)) {
    score -= 15;
    desc = `对方八字${maxWx}旺，恰为您的忌神，相处中可能会有一些摩擦，需要多包容。`;
  } else {
    score += 10;
    desc = `双方五行相对平衡，属于平稳互助的组合。`;
  }
  
  // 随机波动一下，显得更真实
  score += Math.floor(Math.random() * 10) - 5;
  score = Math.max(40, Math.min(99, score));
  
  let level = score >= 80 ? "上等婚" : (score >= 60 ? "中等婚" : "下等婚");
  
  setTimeout(() => {
    // 渲染结果
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
    btn.innerHTML = '<i class="fas fa-check mr-2"></i>测算完成';
  }, 1500);
}

// 简单的名字库，按五行分类
const NAME_DICT = {
  '金': {
    '男': ['铭', '锋', '锐', '铮', '锦', '鑫', '钧', '诚', '铎', '新'],
    '女': ['铃', '钰', '银', '钟', '铭', '锦', '静', '诗', '悦', '珊']
  },
  '木': {
    '男': ['林', '森', '朴', '权', '杉', '杨', '松', '柏', '栋', '栩'],
    '女': ['柯', '桐', '梓', '棋', '楠', '榕', '桔', '棉', '樱', '梅']
  },
  '水': {
    '男': ['浩', '海', '涛', '润', '涵', '清', '渊', '淼', '泽', '洋'],
    '女': ['沐', '沛', '沦', '滢', '泓', '波', '洁', '洋', '湘', '涟']
  },
  '火': {
    '男': ['炎', '灿', '炜', '烁', '炫', '烽', '焕', '烨', '烽', '煌'],
    '女': ['灵', '秋', '熠', '烨', '然', '熔', '熙', '燃', '燕', '灿']
  },
  '土': {
    '男': ['城', '培', '基', '堂', '坤', '坚', '坦', '均', '坚', '圣'],
    '女': ['佳', '圭', '圜', '坊', '均', '坚', '圣', '坤', '培', '基']
  }
};

function generateNames() {
  const ln = document.getElementById('lastName').value.trim();
  if(!ln) return alert('请输入姓氏');
  
  const gender = document.getElementById('gender').value;
  const btn = document.querySelector('#qimingModal .btn-primary');
  btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>匹配诗经楚辞...';
  btn.disabled = true;
  
  // 获取喜用神
  let xi = baziResult.xiYong.xi;
  let yong = baziResult.xiYong.yong;
  
  // 处理可能返回数组的情况
  if (Array.isArray(xi)) xi = xi[0];
  if (Array.isArray(yong)) yong = yong[0];
  
  // 确保五行存在于字典中，如果没有喜用神或者字典没有，默认使用木水
  let primaryWx = NAME_DICT[xi] ? xi : '木';
  let secondaryWx = NAME_DICT[yong] ? yong : '水';

  // 渲染喜用神文本
  const xiYongText = document.getElementById('qimingXiYongText');
  xiYongText.innerHTML = `
    <span style="color:${WX_COLORS[primaryWx]}">${primaryWx}</span> 
    <span style="color:${WX_COLORS[secondaryWx]}">${secondaryWx}</span>
  `;
  
  // 生成名字组合
  const generateCard = (wx1, wx2) => {
    // 从字典中随机挑选字
    const list1 = NAME_DICT[wx1][gender] || NAME_DICT['木']['男'];
    const list2 = NAME_DICT[wx2][gender] || NAME_DICT['水']['男'];
    
    const char1 = list1[Math.floor(Math.random() * list1.length)];
    const char2 = list2[Math.floor(Math.random() * list2.length)];
    
    // 主导的颜色（用于边框）
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
    // 生成 4 个推荐名字，组合方式：喜+用，用+喜，喜+喜，用+用
    let html = '';
    html += generateCard(primaryWx, secondaryWx);
    html += generateCard(secondaryWx, primaryWx);
    html += generateCard(primaryWx, primaryWx);
    html += generateCard(secondaryWx, secondaryWx);
    
    cardsContainer.innerHTML = html;
    
    document.getElementById('qimingResult').classList.remove('hidden');
    btn.innerHTML = '<i class="fas fa-check mr-2"></i>生成完毕';
    // 保持按钮可用，允许用户再次点击生成不同名字
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-magic mr-2"></i>换一批';
  }, 1000);
}

function drawQian() {
  const tong = document.getElementById('qianTong');
  tong.classList.add('form-shake'); // 复用现有的震动动画
  
  setTimeout(() => {
    tong.classList.remove('form-shake');
    tong.classList.add('hidden');
    
    // 生成签文结果
    const qianData = [
      { t: '上上签', p: '春风得意马蹄疾，一日看尽长安花。', e: '今日运势极旺，五行能量与您完美契合。所求之事多能顺遂，适合大胆推进核心计划。' },
      { t: '上吉签', p: '乘风破浪会有时，直挂云帆济沧海。', e: '今日您的贵人运强劲，虽有小波折，但最终都能化险为夷，逢凶化吉。' },
      { t: '中吉签', p: '有心栽花花不开，无心插柳柳成荫。', e: '今日不宜强求，顺其自然反而会有意外之喜。适合做一些轻松的筹备工作。' },
      { t: '中平签', p: '行到水穷处，坐看云起时。', e: '今日运势平稳，五行能量无大冲大合。适合静心学习、复盘，不宜做重大决策。' },
      { t: '下下签', p: '路漫漫其修远兮，吾将上下而求索。', e: '今日流日干支与您命局有所冲克。建议保持低调，少说话多做事，避免与人发生口角。' }
    ];
    
    // 结合今天的日期和用户的日柱生成一个伪随机索引
    const today = new Date();
    const seed = today.getDate() + baziResult.dayGan * 10;
    const result = qianData[seed % qianData.length];
    
    document.getElementById('qianTitle').textContent = result.t;
    document.getElementById('qianTitle').className = `font-serif text-3xl font-bold mb-2 ${result.t.includes('下') ? 'text-fire' : 'text-accent'}`;
    document.getElementById('qianPoem').textContent = result.p;
    document.getElementById('qianExplain').textContent = '解析：' + result.e;
    
    document.getElementById('qianResult').classList.remove('hidden');
  }, 800);
}

function generateLuckyNum() {
  const btn = document.getElementById('btnGenNum');
  btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>生成中...';
  btn.disabled = true;
  
  setTimeout(() => {
    // 获取用户的喜用神五行对应的数字
    let xi = baziResult.xiYong.xi;
    let yong = baziResult.xiYong.yong;
    if (Array.isArray(xi)) xi = xi[0];
    if (Array.isArray(yong)) yong = yong[0];
    
    const wxNums = {
      '水': [1, 6], '火': [2, 7], '木': [3, 8], '金': [4, 9], '土': [5, 0]
    };
    
    let pool = [...(wxNums[xi] || []), ...(wxNums[yong] || []), 0,1,2,3,4,5,6,7,8,9]; // 偏好喜用神数字，但也包含其他
    
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
    
    btn.innerHTML = '<i class="fas fa-dice mr-2"></i>点击生成';
    btn.disabled = false;
  }, 600);
}
function generatePoster() {
  if (!checkVipBeforeFeature()) return;
  
  showModal('posterModal');
  const resultDiv = document.getElementById('posterResult');
  resultDiv.innerHTML = '<div class="py-20 text-center text-accent/50"><i class="fas fa-spinner fa-spin text-3xl mb-2"></i><br>海报生成中...</div>';
  
  // 填充海报数据
  document.getElementById('posterDayMaster').textContent = TG[baziResult.dayGan] + WX_GAN[baziResult.dayGan];
  document.getElementById('posterStrength').textContent = baziResult.strength.isStrong ? '身强' : '身弱';
  document.getElementById('posterDesc').textContent = document.getElementById('strengthText').textContent.substring(0, 80) + '...';
  
  // 设置二维码 (带推广链接，未登录时使用默认链接)
  const inviteCode = currentUser ? currentUser.invite_code : 'DEMO';
  const refLink = encodeURIComponent(`${window.location.origin}/?ref=${inviteCode}`);
  document.getElementById('posterQr').src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${refLink}`;
  
  // 生成图片
  setTimeout(() => {
    html2canvas(document.getElementById('posterCanvas'), {
      backgroundColor: '#1a1a2e',
      scale: 2
    }).then(canvas => {
      const img = document.createElement('img');
      img.src = canvas.toDataURL('image/jpeg');
      img.className = 'w-full h-auto';
      resultDiv.innerHTML = '';
      resultDiv.appendChild(img);
    });
  }, 1000); // 等待二维码图片加载
}
