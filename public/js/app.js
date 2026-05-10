// ============================
// 全局狀態
// ============================
let baziResult = null;
let calYear = new Date().getFullYear();
let calMonth = new Date().getMonth(); // 0-indexed

// ============================
// 頁面過渡動畫
// ============================
function transitionSection(hideEl, showEl, callback) {
  hideEl.classList.add('section-exit-active');
  setTimeout(() => {
    hideEl.classList.add('hidden');
    hideEl.classList.remove('section-exit-active');
    showEl.classList.remove('hidden');
    showEl.classList.add('section-enter');
    requestAnimationFrame(() => {
      showEl.classList.remove('section-enter');
      showEl.classList.add('section-enter-active');
      setTimeout(() => {
        showEl.classList.remove('section-enter-active');
        if (callback) callback();
      }, 500);
    });
  }, 300);
}

// ============================
// UI 渲染
// ============================

function renderPillars(pillars, dayGan) {
  const labels = ['年柱','月柱','日柱（命主）','時柱'];
  const grid = document.getElementById('pillarGrid');
  grid.innerHTML = '';
  pillars.forEach((p, i) => {
    let isDay = (i === 2);
    let ss = isDay ? '日主' : getShiShen(dayGan, p.gan);
    let gz60 = -1;
    for (let k = 0; k < 60; k++) {
      if (k % 10 === p.gan && k % 12 === p.zhi) { gz60 = k; break; }
    }
    let ny = NA_YIN[Math.floor(gz60 / 2)];

    let ganColor = WX_COLORS[WX_GAN[p.gan]];
    let zhiColor = WX_COLORS[WX_ZHI[p.zhi]];
    const hiddenShiShen = (typeof getShiShenForHiddenStems === 'function')
      ? getShiShenForHiddenStems(dayGan, p.zhi)
      : CANG_GAN[p.zhi].map(g => getShiShen(dayGan, g));
    let cangGanHTML = CANG_GAN[p.zhi].map((g, ci) => {
      let w = ['本氣','中氣','餘氣'][ci];
      let sh = hiddenShiShen[ci] || '';
      return `<span class="text-xs" style="color:${WX_COLORS[WX_GAN[g]]};opacity:${1-ci*0.25};display:inline-block;text-align:center;min-width:2.25rem;margin:0 .1rem">${TG[g]}<span class="text-accent/30" style="font-size:.55rem">${w}</span><span class="text-accent/50" style="font-size:.55rem;display:block;line-height:1">${sh}</span></span>`;
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

function formatLongitudeDisplay(longitude) {
  const value = Number(longitude);
  if (!Number.isFinite(value)) return '—';
  return `${Math.abs(value).toFixed(4)}°${value < 0 ? 'W' : 'E'}`;
}

function renderPrecisionMeta() {
  if (!baziResult?.precision) return;
  const meta = baziResult.precision;
  const grid = document.getElementById('precisionMetaGrid');
  if (!grid) return;
  const clockLabel = meta.useTrueSolarTime ? '真太陽時' : '北京標準時';
  const items = [
    ['原始時間', meta.inputTime, '北京標準時間'],
    ['時柱用時', meta.appliedHourTime || meta.trueSolarTime, clockLabel],
    ['真太陽時', meta.trueSolarTime, meta.useTrueSolarTime ? '已啟用校正' : '僅作參考'],
    ['日界規則', meta.dayChangeRuleText || '子初換日（23:00）', '影響 23:00-23:59 出生的日柱'],
    ['出生經度', formatLongitudeDisplay(meta.longitude), '出生地經度'],
    ['判定時辰', `${meta.hourName}`, meta.hourRange],
    ['總校正', meta.totalOffsetText, '經度 + 均時差'],
    ['起運性別', baziResult.gender === 1 ? '男命' : '女命', '用於大運順逆']
  ];
  grid.innerHTML = items.map(([label, value, hint]) => `
    <div class="precision-card glass-card p-4">
      <div class="text-[10px] text-accent/40 tracking-widest mb-1">${label}</div>
      <div class="font-serif text-lg text-accent font-bold">${value}</div>
      <div class="text-[10px] text-accent/35 mt-1">${hint}</div>
    </div>
  `).join('');
}

function renderProInfo() {
  if (!baziResult?.precision) return;
  const meta = baziResult.precision;
  const eightChar = meta.eightChar;
  const lunar = meta.lunar;
  const grid = document.getElementById('proInfoGrid');
  if (!grid || !eightChar || !lunar) return;

  const call = (obj, method, fallback = '') => (obj && typeof obj[method] === 'function') ? obj[method]() : fallback;
  const naYin = [call(eightChar, 'getYearNaYin'), call(eightChar, 'getMonthNaYin'), call(eightChar, 'getDayNaYin'), call(eightChar, 'getTimeNaYin')].join(' · ');
  const xunKong = [call(eightChar, 'getYearXunKong'), call(eightChar, 'getMonthXunKong'), call(eightChar, 'getDayXunKong'), call(eightChar, 'getTimeXunKong')].join(' · ');
  let pengZu;
  if (currentLang === 'en') {
    // English version - translate Peng Zu taboos
    const pengZuGan = translatePengZuGan(call(lunar, 'getPengZuGan', ''));
    const pengZuZhi = translatePengZuZhi(call(lunar, 'getPengZuZhi', ''));
    pengZu = `${pengZuGan}; ${pengZuZhi}`;
  } else {
    // Chinese version
    pengZu = `${call(lunar, 'getPengZuGan')}；${call(lunar, 'getPengZuZhi')}`;
  }

  // 命盤神煞：以原局四柱為對象，顯示每個非空桶及其落點。
  // 驛馬/桃花/華蓋/將星 桶為 provenance-aware 物件陣列 [{pillarIdx, ref}],
  // 其餘桶仍維持純索引陣列 [pillarIdx,...]，以舊接口相容。
  const pillarLabels = ['年支','月支','日支','時支'];
  const REF_LABEL = { year: '起於年支', day: '起於日支', both: '年/日支皆起' };
  let shenShaHTML = '<span class="text-accent/40">—</span>';
  if (typeof computeChartShenSha === 'function' && Array.isArray(baziResult.pillars)) {
    const ss = computeChartShenSha(baziResult.pillars);
    const keys = Object.keys(ss);
    if (keys.length) {
      shenShaHTML = keys.map(k => {
        const bucket = ss[k] || [];
        const tags = bucket.map(entry => {
          if (entry && typeof entry === 'object' && 'pillarIdx' in entry) {
            const refTag = entry.ref ? `（${REF_LABEL[entry.ref] || entry.ref}）` : '';
            return `${pillarLabels[entry.pillarIdx]}${refTag}`;
          }
          return pillarLabels[entry];
        }).join('、');
        return `<div class="flex gap-2 text-xs leading-relaxed"><span class="text-accent/60 shrink-0 min-w-[4.5rem]">${k}</span><span class="text-accent/85">${tags}</span></div>`;
      }).join('');
    }
  }

  const sections = [
    ['命宮 / 身宮', `${call(eightChar, 'getMingGong')} / ${call(eightChar, 'getShenGong')}`, '命宮看先天格局，身宮看後天著力點。'],
    ['胎元 / 胎元納音', `${call(eightChar, 'getTaiYuan')} / ${call(eightChar, 'getTaiYuanNaYin')}`, '補充四柱外的先天氣場。'],
    ['四柱納音', naYin, '年、月、日、時納音。'],
    ['四柱旬空', xunKong, '年、月、日、時旬空，日旬空尤其常用。'],
    ['命盤神煞', shenShaHTML, '依年干/日干與年支/日支起；落於何柱以標示。'],
    ['彭祖百忌', pengZu, '日干日支忌諱參考。'],
    ['時柱校正', `${meta.hourName}（${meta.appliedHourTime || meta.trueSolarTime}）`, `${meta.useTrueSolarTime ? '按真太陽時' : '按北京標準時'}判定；${meta.dayChangeRuleText || '子初換日（23:00）'}。`]
  ];

  grid.innerHTML = sections.map(([title, value, hint]) => `
    <div class="glass-card p-5">
      <div class="text-xs text-accent/50 mb-2 tracking-wider">${title}</div>
      <div class="font-serif text-base text-accent/90 leading-relaxed">${value}</div>
      <div class="text-[10px] text-accent/35 mt-2 leading-relaxed">${hint}</div>
    </div>
  `).join('');
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

  const TIER_STYLES = {
    '極強': { cls: 'bg-fire/15 text-fire border border-fire/30',      gradient: 'linear-gradient(90deg, rgba(255,152,0,0.45), rgba(255,152,0,0.9))' },
    '偏強': { cls: 'bg-earth/15 text-earth border border-earth/30',   gradient: 'linear-gradient(90deg, rgba(196,162,101,0.4), rgba(196,162,101,0.8))' },
    '中和': { cls: 'bg-accent/15 text-accent border border-accent/30',gradient: 'linear-gradient(90deg, rgba(240,215,140,0.4), rgba(240,215,140,0.8))' },
    '偏弱': { cls: 'bg-water/15 text-water border border-water/30',   gradient: 'linear-gradient(90deg, rgba(90,139,168,0.4), rgba(90,139,168,0.8))' },
    '極弱': { cls: 'bg-wood/15 text-wood border border-wood/30',      gradient: 'linear-gradient(90deg, rgba(129,199,132,0.4), rgba(129,199,132,0.8))' }
  };
  const tier = strength.tier || (strength.isStrong ? '偏強' : '偏弱');
  const style = TIER_STYLES[tier] || TIER_STYLES['中和'];

  let badge = document.getElementById('strengthBadge');
  badge.textContent = tier;
  badge.className = `px-4 py-1.5 rounded-full text-sm font-600 ${style.cls}`;

  let bar = document.getElementById('strengthBar');
  bar.style.width = strength.score + '%';
  bar.style.background = style.gradient;

  let dayWX = WX_GAN[dayGan];
  let motherEl = strength.motherEl;
  let text = '';

  if (currentLang === 'en') {
    // English version
    text = `${TG[dayGan]}${dayWX} Day Master born in ${DZ[monthZhi]} Month`;
    if (strength.deLing) {
      text += `, ${DZ[monthZhi]} generates ${dayWX} (Resource Star), Day Master is in-season`;
    } else {
      text += `, ${DZ[monthZhi]} Branch ${WX_ZHI[monthZhi]} does not support Day Master`;
    }
    if (strength.isStrong) {
      text += `. Based on Five Elements analysis, Day Master ${dayWX} strength is strong, belonging to a Strong Day Master destiny. A strong Day Master should be drained and restrained, requiring Output stars to drain excellence or Officer stars to balance the chart.`;
    } else {
      text += `. Based on Five Elements analysis, Day Master ${dayWX} strength is weak, belonging to a Weak Day Master destiny. A weak Day Master should be supported and generated, requiring Resource stars to support or Companion stars to strengthen the chart.`;
    }
  } else {
    // Chinese version
    text = `${TG[dayGan]}${dayWX}日主生於${DZ[monthZhi]}月`;
    if (strength.deLing) {
      text += `，${DZ[monthZhi]}為${WX_ZHI[monthZhi] === dayWX ? dayWX+'之本氣' : '生'+dayWX+'之印星'}，日主得令`;
    } else {
      text += `，月支${DZ[monthZhi]}${WX_ZHI[monthZhi]}不助日主`;
    }
    if (strength.isStrong) {
      text += `。綜合五行力量分析，日主${dayWX}力量偏強，屬於身強之命格。身強則宜泄宜克，需要通過食傷泄秀或官殺制衡來平衡命局。`;
    } else {
      text += `。綜合五行力量分析，日主${dayWX}力量偏弱，屬於身弱之命格。身弱則宜扶宜生，需要通過印星生扶或比劫助身來增強命局。`;
    }
  }
  document.getElementById('strengthText').textContent = text;

  // 得令 / 得地 / 得勢 明細（插入 strengthText 之後；若不存在容器則動態建立）
  const host = document.getElementById('strengthText').parentElement;
  let detail = document.getElementById('strengthDetail');
  if (!detail) {
    detail = document.createElement('div');
    detail.id = 'strengthDetail';
    detail.className = 'mt-4 grid gap-2 text-xs text-accent/70';
    host.appendChild(detail);
  }
  let pillarLabels, diLabel, shiLabel, lingLabel, inSeasonLabel, rootedLabel, supportedLabel;

  if (currentLang === 'en') {
    // English version
    pillarLabels = ['Year Pillar', 'Month Pillar', 'Day Pillar', 'Hour Pillar'];
    diLabel = strength.deDi && strength.deDi.length
      ? strength.deDi.map(i => pillarLabels[i]).join(', ') + ` (Roots: ${strength.rootedBranches.join(', ')})`
      : 'None';
    shiLabel = strength.deShi && strength.deShi.length
      ? strength.deShi.map(i => pillarLabels[i]).join(', ') + ` (Transparent Stems: ${strength.penetratedStems.join(', ')})`
      : 'None';
    lingLabel = strength.deLing
      ? `Yes (Month Branch belongs to ${WX_ZHI[monthZhi]}, supports ${dayWX} Day Master)`
      : `No (Month Branch belongs to ${WX_ZHI[monthZhi]}, does not support ${dayWX} Day Master)`;

    inSeasonLabel = 'In-season:';
    rootedLabel = 'Rooted:';
    supportedLabel = 'Supported:';
  } else {
    // Chinese version
    pillarLabels = ['年柱','月柱','日柱','時柱'];
    diLabel = strength.deDi && strength.deDi.length
      ? strength.deDi.map(i => pillarLabels[i]).join('、') + `（通根：${strength.rootedBranches.join('、')}）`
      : '無';
    shiLabel = strength.deShi && strength.deShi.length
      ? strength.deShi.map(i => pillarLabels[i]).join('、') + `（透干：${strength.penetratedStems.join('、')}）`
      : '無';
    lingLabel = strength.deLing
      ? `是（月令屬${WX_ZHI[monthZhi]}，助${dayWX}日主）`
      : `否（月令屬${WX_ZHI[monthZhi]}，不助${dayWX}日主）`;

    inSeasonLabel = '得令：';
    rootedLabel = '得地：';
    supportedLabel = '得勢：';
  }

  detail.innerHTML = `
    <div class="flex gap-2"><span class="text-accent/50 shrink-0">${inSeasonLabel}</span><span>${lingLabel}</span></div>
    <div class="flex gap-2"><span class="text-accent/50 shrink-0">${rootedLabel}</span><span>${diLabel}</span></div>
    <div class="flex gap-2"><span class="text-accent/50 shrink-0">${supportedLabel}</span><span>${shiLabel}</span></div>
  `;
}

function renderTraits(dayGan, isStrong) {
  let wx = WX_GAN[dayGan];
  let pList = document.getElementById('personalityList');
  let cList = document.getElementById('careerList');
  let traits = TRAITS[wx][isStrong ? 'strong' : 'weak'];
  let career = CAREER[wx][isStrong ? 'strong' : 'weak'];
  const tr = value => typeof translateText === 'function' ? translateText(value) : value;
  pList.innerHTML = traits.map(t => `<li class="flex gap-2"><span class="text-accent/30 mt-0.5">•</span><span>${tr(t)}</span></li>`).join('');
  cList.innerHTML = career.map(t => `<li class="flex gap-2"><span class="text-accent/30 mt-0.5">•</span><span>${tr(t)}</span></li>`).join('');
}

function getPrimaryLuckyElement(xiYong) {
  return [xiYong.yong, xiYong.xi, xiYong.ji, xiYong.xian]
    .flat()
    .find(wx => wx && LUCKY_DATA[wx]) || '木';
}

function renderXiYong(xiYong) {
  const grid = document.getElementById('xiYongGrid');

  // 三框架 用神（扶抑 / 調候 / 通關）。顯示於 xiYongGrid 之前。
  if (baziResult && typeof computeYongShenFrameworks === 'function') {
    const frameworks = computeYongShenFrameworks({
      dayGan: baziResult.dayGan,
      monthZhi: baziResult.monthZhi,
      strength: baziResult.strength,
      wxCount: baziResult.wxCount
    });
    baziResult.frameworks = frameworks;
    let holder = document.getElementById('yongShenFrameworks');
    if (!holder) {
      holder = document.createElement('div');
      holder.id = 'yongShenFrameworks';
      holder.className = 'grid grid-cols-1 md:grid-cols-3 gap-3 mb-4';
      grid.parentElement.insertBefore(holder, grid);
    }
    const fuWx = frameworks.扶抑 && frameworks.扶抑.wx;
    const tiWx = frameworks.調候 && frameworks.調候.wx;
    const tongWx = frameworks.通關 && frameworks.通關.wx;
    const primary = (xiYong.primaryFramework) || '扶抑';
    const agree = fuWx && tiWx && fuWx === tiWx;
    // EN 模式下 TIAO_NOTES / 扶抑 runtime 模板缺乏逐句翻譯，substring
    // fallback 會把「生於秋月清冷」等逐字譯為 Chinglish。此處直接於 EN 模式
    // 省略 note 文本，只保留五行符號，避免顯示亂譯。
    const showNotes = (typeof currentLang === 'undefined' || currentLang === 'zh');
    const cardHTML = (entry, isPrimary, extraTag) => {
      const color = entry.wx ? WX_COLORS[entry.wx] : 'rgba(255,215,0,0.3)';
      const wxLabel = entry.wx ? `<span class="font-serif text-xl font-700" style="color:${color}">${WX_ICONS[entry.wx]||''} ${entry.wx}</span>` : `<span class="text-accent/40">—</span>`;
      const highlight = isPrimary ? 'ring-1 ring-accent/40 bg-accent/5' : '';
      const tagHTML = extraTag ? `<span class="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent/70 align-middle">${extraTag}</span>` : '';
      const noteHTML = (showNotes && entry.note)
        ? `<div class="text-[11px] text-accent/55 leading-relaxed">${entry.note}</div>`
        : '';
      return `
        <div class="glass-card p-4 ${highlight}">
          <div class="text-xs text-accent/60 mb-1 tracking-wider">${entry.framework}${tagHTML}</div>
          <div class="mb-2">${wxLabel}</div>
          ${noteHTML}
        </div>
      `;
    };
    holder.innerHTML = [
      cardHTML(frameworks.扶抑, primary === '扶抑', agree ? '與調候一致' : (primary !== '扶抑' ? '次要' : '')),
      cardHTML(frameworks.調候, primary === '調候', agree ? '與扶抑一致' : (primary !== '調候' ? '次要' : '')),
      cardHTML(frameworks.通關, false, tongWx ? '' : '未啟用')
    ].join('');
  }

  const items = [
    { label: '喜神', wx: xiYong.xi, cls: 'xi' },
    { label: '用神', wx: xiYong.yong, cls: 'yong' },
    { label: '忌神', wx: xiYong.ji, cls: 'ji' },
    { label: '閒神', wx: xiYong.xian, cls: 'xian' }
  ];
  grid.innerHTML = '';
  items.forEach(it => {
    let wxArr = (Array.isArray(it.wx) ? it.wx : [it.wx]).filter(Boolean);
    let card = document.createElement('div');
    card.className = `xi-yong-card ${it.cls}`;
    const wxHTML = wxArr.length
      ? wxArr.map(w => `<div class="flex items-center justify-center gap-2">
          <span class="text-lg">${WX_ICONS[w]}</span>
          <span class="font-serif text-lg font-600" style="color:${WX_COLORS[w]}">${w}</span>
        </div>`).join('')
      : '<div class="text-accent/40 text-sm">—</div>';
    card.innerHTML = `
      <div class="text-xs text-accent/50 mb-2">${it.label}</div>
      <div class="space-y-1">
        ${wxHTML}
      </div>
    `;
    grid.appendChild(card);
  });

  // 詳細解讀
  let detail = document.getElementById('xiYongDetail').querySelector('ul');
  let dayWX = baziResult.dayGanWX;
  let isStrong = baziResult.isStrong;
  let lines = [];

  const jiList = Array.isArray(xiYong.ji) ? xiYong.ji.filter(Boolean) : [xiYong.ji].filter(Boolean);
  const jiStr = jiList.length > 0 ? (currentLang === 'en' ? jiList.join(', ') : jiList.join('、')) : (currentLang === 'en' ? 'No obvious unfavorable element' : '暫無明顯忌神');

  if (!xiYong.yong) {
    if (currentLang === 'en') {
      lines.push(`<li><strong style="color:${WX_COLORS[xiYong.xi]}">${xiYong.xi} is the Helpful Element</strong>: The Day Master energy is relatively balanced; first take ${xiYong.xi} to harmonize the chart rather than forcing a single favorable element.</li>`);
      lines.push(`<li><strong style="color:var(--fire)">${jiStr}</strong>: For balanced charts, unfavorable elements should not be determined arbitrarily; they should be analyzed in conjunction with 10-year and annual fortune cycles.</li>`);
      lines.push(`<li><strong style="color:var(--accent)">${xiYong.xian} is the Neutral Element</strong>: Can be used as auxiliary reference, depending on the overall chart configuration.</li>`);
    } else {
      lines.push(`<li><strong style="color:${WX_COLORS[xiYong.xi]}">${xiYong.xi}爲喜神</strong>：日主氣勢較為中和，先取${xiYong.xi}調和命局，不強行指定單一用神</li>`);
      lines.push(`<li><strong style="color:var(--fire)">${jiStr}</strong>：中和格局忌神不宜武斷，應結合大運流年再細分取捨</li>`);
      lines.push(`<li><strong style="color:var(--accent)">${xiYong.xian}爲閒神</strong>：可作輔助參考，需視命局配合而定</li>`);
    }
  } else if (isStrong) {
    if (currentLang === 'en') {
      lines.push(`<li><strong style="color:${WX_COLORS[xiYong.yong]}">${xiYong.yong} is the Favorable Element</strong>: ${xiYong.yong} can restrain excessive ${dayWX} and effectively control the stubbornness that comes with an overly strong Day Master, bringing the chart toward balance.</li>`);
      lines.push(`<li><strong style="color:${WX_COLORS[xiYong.xi]}">${xiYong.xi} is the Helpful Element</strong>: ${xiYong.xi} is generated by ${dayWX} and can drain excess energy from the Day Master, transforming it into talent and creativity, enhancing the chart's flow.</li>`);
      lines.push(`<li><strong style="color:var(--fire)">${jiStr} is the Unfavorable Element</strong>: ${jiStr} will further strengthen the Day Master, exacerbating the chart's imbalance, and should be avoided as much as possible.</li>`);
      lines.push(`<li><strong style="color:var(--accent)">${xiYong.xian} is the Neutral Element</strong>: Although ${xiYong.xian} consumes some Day Master energy, its effect is limited and depends on the overall chart configuration.</li>`);
    } else {
      lines.push(`<li><strong style="color:${WX_COLORS[xiYong.yong]}">${xiYong.yong}爲用神</strong>：${xiYong.yong}能剋制過旺之${dayWX}，有效抑制日主過強帶來的剛愎自用之弊，使命局趨於平衡</li>`);
      lines.push(`<li><strong style="color:${WX_COLORS[xiYong.xi]}">${xiYong.xi}爲喜神</strong>：${xiYong.xi}爲${dayWX}所生，能泄化日主過剩之氣，轉化爲才華與創造力，增強命局的流通性</li>`);
      lines.push(`<li><strong style="color:var(--fire)">${jiStr}爲忌神</strong>：${jiStr}會進一步助旺日主，加劇命局失衡，應儘量迴避</li>`);
      lines.push(`<li><strong style="color:var(--accent)">${xiYong.xian}爲閒神</strong>：${xiYong.xian}雖耗日主之力，但作用有限，需視命局配合而定</li>`);
    }
  } else {
    if (currentLang === 'en') {
      lines.push(`<li><strong style="color:${WX_COLORS[xiYong.yong]}">${xiYong.yong} is the Favorable Element</strong>: ${xiYong.yong} belongs to the same ${dayWX} as the Day Master, can directly enhance the Day Master's strength, and is the most effective supporting force.</li>`);
      lines.push(`<li><strong style="color:${WX_COLORS[xiYong.xi]}">${xiYong.xi} is the Helpful Element</strong>: ${xiYong.xi} can generate and support the Day Master ${dayWX}, like a mother nourishing children, bringing warmth and support to the chart.</li>`);
      lines.push(`<li><strong style="color:var(--fire)">${jiStr} is the Unfavorable Element</strong>: ${jiStr} will further consume or suppress the already weak Day Master and should be avoided as much as possible.</li>`);
      lines.push(`<li><strong style="color:var(--accent)">${xiYong.xian} is the Neutral Element</strong>: ${xiYong.xian} consumes Day Master energy but can sometimes stimulate fighting spirit, depending on the fortune cycle cooperation.</li>`);
    } else {
      lines.push(`<li><strong style="color:${WX_COLORS[xiYong.yong]}">${xiYong.yong}爲用神</strong>：${xiYong.yong}與日主同屬${dayWX}，能直接增強日主力量，是最有效的扶助之力</li>`);
      lines.push(`<li><strong style="color:${WX_COLORS[xiYong.xi]}">${xiYong.xi}爲喜神</strong>：${xiYong.xi}能生助日主${dayWX}，如同母親滋養子女，爲命局注入溫暖與支持</li>`);
      lines.push(`<li><strong style="color:var(--fire)">${jiStr}爲忌神</strong>：${jiStr}會進一步消耗或剋制本已偏弱的日主，應儘量避免</li>`);
      lines.push(`<li><strong style="color:var(--accent)">${xiYong.xian}爲閒神</strong>：${xiYong.xian}耗日主之力但有時也可激發鬥志，需視大運配合</li>`);
    }
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
  
  let xiElements = [baziResult.xiYong.xi, getPrimaryLuckyElement(baziResult.xiYong)];
  let jiElements = baziResult.xiYong.ji;
  
  // 展平數組，以防喜用神是數組
  xiElements = xiElements.flat();
  jiElements = jiElements.flat();
  
  let todayDate = new Date();
  
  for (let d = 1; d <= daysInMonth; d++) {
    // 使用優化版算法計算每日吉凶
    const dayFortune = calculateDayFortune(
      year,
      month,
      d,
      {
        dayGan: baziResult.dayGan,
        dayZhi: baziResult.dayZhi,
        monthZhi: baziResult.monthZhi,
        xiYong: baziResult.xiYong
      },
      baziResult.meta ? baziResult.meta.longitude : 120
    );

    let percentScore = dayFortune.percentScore;
    let fortune = dayFortune.fortune;

    // 計算當天的十神
    const solar = Solar.fromYmdHms(year, month, d, 12, 0, 0);
    const lunar = solar.getLunar();
    const bazi = lunar.getEightChar();
    const dGan = TG.indexOf(bazi.getDayGan());
    const dZhi = DZ.indexOf(bazi.getDayZhi());
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
      updateSummary(solar, lunar, bazi, dGan, dZhi, shishen, percentScore, fortune, dayFortune);
      if(isToday) dayCell.classList.add('ring-1', 'ring-accent');
    }
  }
}

function updateSummary(solar, lunar, bazi, dGan, dZhi, shishen, percentScore, fortune, dayFortune) {
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

  // 顯示優化後的詳細分析
  if (dayFortune && dayFortune.details) {
    const details = dayFortune.details;
    let changShengLabel, naYinLabel, solarTimeLabel;

    if (currentLang === 'en') {
      changShengLabel = 'Growth Phase:';
      naYinLabel = 'Na Yin:';
      solarTimeLabel = 'True Solar Time:';
    } else {
      changShengLabel = '長生：';
      naYinLabel = '納音：';
      solarTimeLabel = '真太陽時：';
    }

    let analysisHtml = `
      <div class="text-xs text-accent/70 mt-2 space-y-1">
        <div>${changShengLabel} ${details.changSheng} (${details.changShengScore > 0 ? '+' : ''}${(details.changShengScore * 20).toFixed(0)})</div>
        <div>${naYinLabel} ${translateNaYin(details.naYin)}</div>
        <div>${solarTimeLabel} ${details.trueSolarTime}</div>
      </div>
    `;
    document.getElementById('calSummaryAnalysis').innerHTML = analysisHtml;
  } else {
    document.getElementById('calSummaryAnalysis').innerHTML = '';
  }

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

  // 當日吉神/凶煞（萬年曆取自 lunar-javascript）——屬於日曆視角，
  // 非原局命盤神煞，因此放在這裡、不進 renderProInfo。
  const callLunar = (name, fb) => (lunar && typeof lunar[name] === 'function') ? lunar[name]() : fb;
  const jiShenRaw   = (callLunar('getDayJiShen', []) || []).slice(0, 6);
  const xiongShaRaw = (callLunar('getDayXiongSha', []) || []).slice(0, 6);

  let jiShen, xiongSha;
  if (currentLang === 'en') {
    jiShen = translateStarNames(jiShenRaw).join(', ');
    xiongSha = translateStarNames(xiongShaRaw).join(', ');
  } else {
    jiShen = jiShenRaw.join('、');
    xiongSha = xiongShaRaw.join('、');
  }

  if (jiShen || xiongSha) {
    if (currentLang === 'en') {
      advice += (jiShen   ? ` | Auspicious Stars: ${jiShen}` : '');
      advice += (xiongSha ? ` | Inauspicious Stars: ${xiongSha}` : '');
    } else {
      advice += (jiShen   ? `｜吉神：${jiShen}` : '');
      advice += (xiongSha ? `｜凶煞：${xiongSha}` : '');
    }
  }
  document.getElementById('calSummaryAdvice').textContent = advice;
}

function renderLucky() {
  const tr = value => typeof translateText === 'function' ? translateText(value) : value;
  let xy = baziResult.xiYong;
  const wxKeys = [xy.xi, xy.yong]
    .flat()
    .filter((wx, idx, arr) => wx && LUCKY_DATA[wx] && arr.indexOf(wx) === idx);
  if (!wxKeys.length) wxKeys.push('木');

  // 合併喜神和用神數據
  let dirs = [...new Set(wxKeys.map(wx => LUCKY_DATA[wx].dir))];
  let colors = [...new Set(wxKeys.flatMap(wx => LUCKY_DATA[wx].colors))];
  let nums = [...new Set(wxKeys.flatMap(wx => LUCKY_DATA[wx].nums))];
  let plants = [...new Set(wxKeys.flatMap(wx => LUCKY_DATA[wx].plants))];

  document.getElementById('luckyDir').textContent = dirs.map(tr).join(', ');
  document.getElementById('luckyColor').textContent = colors.map(tr).join(', ');
  document.getElementById('luckyNum').textContent = nums.join(', ');
  document.getElementById('luckyPlant').textContent = plants.map(tr).join(', ');

  // 穿衣指南
  let dress = DRESS_COLORS[wxKeys[0]] || DRESS_COLORS['木'];
  
  function renderSwatches(container, items) {
    container.innerHTML = items.map(it => 
      `<div class="flex flex-col items-center gap-1">
        <div class="color-swatch" style="background:${it.c}"></div>
        <span class="text-xs text-accent/40">${tr(it.n)}</span>
      </div>`
    ).join('');
  }
  renderSwatches(document.getElementById('dressFirst'), dress.first);
  renderSwatches(document.getElementById('dressSecond'), dress.second);
  renderSwatches(document.getElementById('dressAvoid'), dress.avoid);
  
  document.getElementById('dressAcc').innerHTML = dress.acc.map(a =>
    `<span class="px-3 py-1 rounded-full bg-accent/5 border border-accent/10 text-xs">${tr(a)}</span>`
  ).join('');
}

// ============================
// 主分析流程
// ============================
async function analyze() {
  let dateVal = document.getElementById('inputDate').value;
  let timeVal = document.getElementById('inputTime').value;
  let genderVal = document.getElementById('inputGender').value;
  const longitudeEl = document.getElementById('inputLongitude');
  const useTrueSolarTime = document.getElementById('inputUseTrueSolarTime').checked;
  const dayChangeRule = document.getElementById('inputDayChangeRule').value === '00:00' ? '00:00' : '23:00';
  const baziRules = { useTrueSolarTime, dayChangeRule };
  let errEl = document.getElementById('errorMsg');
  let formEl = document.getElementById('inputForm');
  let btnEl = document.getElementById('btnAnalyze');
  
  const showError = (msg, fieldId) => {
    errEl.textContent = msg;
    errEl.classList.remove('hidden');
    formEl.classList.remove('form-shake');
    void formEl.offsetWidth; // trigger reflow
    formEl.classList.add('form-shake');
    if (fieldId) {
      const field = document.getElementById(fieldId);
      field.classList.add('input-error');
      field.addEventListener('focus', () => field.classList.remove('input-error'), { once: true });
    }
  };

  if (!dateVal) { showError('請選擇出生日期', 'inputDate'); return; }
  if (!timeVal) { showError('請選擇出生時間', 'inputTime'); return; }
  if (!genderVal) { showError('請選擇性別', 'inputGender'); return; }

  const cityVal = document.getElementById('inputCity').value;
  if (!Number.isFinite(parseFloat(longitudeEl.value))) {
    await updateLongitudeFromCity({ silent: true });
  }
  let longitudeVal = parseFloat(longitudeEl.value);
  if (!Number.isFinite(longitudeVal) || longitudeVal < -180 || longitudeVal > 180) { showError('請輸入有效的全球經度（-180 到 180）', 'inputLongitude'); return; }
  errEl.classList.add('hidden');

  // 儲存偏好（僅登入用戶會實際送出請求；錯誤已在 saveUserPreferences 內吞掉，不會阻塞分析動畫）
  const prefs = {
    inputDate: dateVal,
    inputTime: timeVal,
    inputGender: genderVal,
    inputCity: cityVal,
    // 存使用者輸入的原字串而非 String(parseFloat(...))，避免 116.40740 → 116.4074 這種尾零丟失
    inputLongitude: document.getElementById('inputLongitude').value,
    inputUseTrueSolarTime: useTrueSolarTime ? '1' : '0',
    inputDayChangeRule: dayChangeRule
  };
  if (typeof saveUserPreferences === 'function') saveUserPreferences(prefs);

  // 禁用按鈕防連點
  btnEl.disabled = true;
  btnEl.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>解析中...';

  let parts = dateVal.split('-');
  let year = parseInt(parts[0]), month = parseInt(parts[1]), day = parseInt(parts[2]);
  let gender = parseInt(genderVal, 10);
  
  // 顯示加載
  transitionSection(
    document.getElementById('heroSection'),
    document.getElementById('loadingSection')
  );
  
  let msgs = ['正在推演天干地支...', '分析五行生剋...', '測算喜用神...', '生成運勢指南...'];
  let msgIdx = 0;
  let loadText = document.getElementById('loadingText');
  loadText.textContent = msgs[0];
  let loadInterval = setInterval(() => {
    msgIdx = (msgIdx + 1) % msgs.length;
    loadText.textContent = msgs[msgIdx];
  }, 300);
  
  setTimeout(() => {
    let success = false;
    try {
    // 排盤：按使用者選擇的真太陽時與換日規則計算
    let pillars = window.getPillarsUsingLunar(year, month, day, timeVal, longitudeVal, baziRules);
    let yp = pillars[0];
    let mp = pillars[1];
    let dp = pillars[2];
    let hp = pillars[3];
    
    // 五行統計（四柱以月支為主，採位置加權）
    let wxCount = countWuXing(pillars, [1.0, 1.5, 1.2, 1.0]);
    
    // 身強身弱（得令 / 得地 / 得勢）
    let strength = judgeStrength(dp.gan, mp.zhi, wxCount, pillars);
    
    // 三框架 用神（扶抑 / 調候 / 通關）—— 用於讓 getXiYong 在極端季節時優先取 調候
    const frameworks = window.computeYongShenFrameworks ? window.computeYongShenFrameworks({
      dayGan: dp.gan, monthZhi: mp.zhi, strength, wxCount
    }) : null;
    if (frameworks && strength && strength.direction) {
      // 將 strength.direction 注入 frameworks，使 getXiYong 以 direction 判斷
      // 中和 / 強 / 弱，避免 isStrong 在 49/50 的跳變導致喜忌翻轉。
      frameworks._direction = strength.direction;
    }

    // 喜用神
    let xiYong = getXiYong(dp.gan, strength.isStrong, strength.ctrlEl, strength.motherEl, strength.childWX, strength.wealthEl, frameworks);
    
    // 存儲結果
    baziResult = {
      pillars, wxCount, strength, xiYong,
      dayGan: dp.gan,
      dayGanWX: WX_GAN[dp.gan],
      monthZhi: mp.zhi,
      isStrong: strength.isStrong,
      gender,
      frameworks,
      rules: baziRules,
      precision: pillars.meta
    };
    
    calYear = new Date().getFullYear();
    calMonth = new Date().getMonth();
    
    // 渲染所有模塊
    renderPillars(pillars, dp.gan);
    renderPrecisionMeta();
    renderProInfo();
    renderWuXing(wxCount);
    renderStrength(dp.gan, mp.zhi, strength);
    renderTraits(dp.gan, strength.isStrong);
    renderXiYong(xiYong);
    renderCalendar();
    renderLucky();
    
    success = true;
    // 切換顯示
    transitionSection(
      document.getElementById('loadingSection'),
      document.getElementById('resultSection'),
      () => {
        initScrollReveal();
        // 移動端顯示底部導航
        if (window.innerWidth < 768) {
          document.getElementById('bottomNav').classList.remove('hidden');
        }
      }
    );
    document.getElementById('btnReset').classList.remove('hidden');
    
    // 恢復按鈕狀態
    btnEl.disabled = false;
    btnEl.textContent = '開始解析';

    window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error(err);
      errEl.textContent = '排盤失敗，請檢查輸入後重試。';
      errEl.classList.remove('hidden');
      document.getElementById('bottomNav').classList.add('hidden');
      transitionSection(
        document.getElementById('loadingSection'),
        document.getElementById('heroSection')
      );
    } finally {
      clearInterval(loadInterval);
      btnEl.disabled = false;
      btnEl.textContent = '開始解析';
      if (!success) document.getElementById('btnReset').classList.add('hidden');
    }
  }, 1200);
}

// ============================
// 事件綁定
// ============================
document.getElementById('btnAnalyze').addEventListener('click', analyze);

document.getElementById('btnReset').addEventListener('click', () => {
  transitionSection(
    document.getElementById('resultSection'),
    document.getElementById('heroSection')
  );
  document.getElementById('btnReset').classList.add('hidden');
  document.getElementById('btnAnalyze').disabled = false;
  document.getElementById('btnAnalyze').textContent = '開始解析';
  document.getElementById('bottomNav').classList.add('hidden');
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
document.getElementById('inputTime').addEventListener('keydown', e => { if (e.key === 'Enter') analyze(); });
document.getElementById('inputLongitude').addEventListener('keydown', e => { if (e.key === 'Enter') analyze(); });
let cityLookupTimer = null;
let cityLookupRequestId = 0;
const CITY_GEOCODE_ALIASES = {
  '伦敦': 'London',
  '倫敦': 'London',
  '纽约': 'New York',
  '紐約': 'New York',
  '巴黎': 'Paris',
  '东京': 'Tokyo',
  '東京': 'Tokyo',
  '首尔': 'Seoul',
  '首爾': 'Seoul',
  '洛杉矶': 'Los Angeles',
  '洛杉磯': 'Los Angeles'
};

const cityInput = document.getElementById('inputCity');
cityInput.addEventListener('change', () => updateLongitudeFromCity());
cityInput.addEventListener('input', () => {
  window.clearTimeout(cityLookupTimer);
  const longitudeEl = document.getElementById('inputLongitude');
  const localLongitude = findCityLongitude(cityInput.value);
  if (localLongitude != null) {
    longitudeEl.value = localLongitude;
    return;
  }
  longitudeEl.value = '';
  cityLookupTimer = window.setTimeout(() => updateLongitudeFromCity({ silent: true }), 600);
});

function normalizeCityName(name) {
  return String(name || '').trim().replace(/[\s省市县縣區区]/g, '');
}

function findCityLongitude(name) {
  const raw = String(name || '').trim();
  if (!raw) return null;
  if (CITY_LONGITUDES[raw] != null) return CITY_LONGITUDES[raw];
  const normalized = normalizeCityName(raw);
  for (const [city, longitude] of Object.entries(CITY_LONGITUDES)) {
    const c = normalizeCityName(city);
    if (c === normalized || c.endsWith(normalized) || normalized.endsWith(c)) return longitude;
  }
  return null;
}

function getCitySearchName(name) {
  const raw = String(name || '').trim();
  return CITY_GEOCODE_ALIASES[raw] || CITY_GEOCODE_ALIASES[normalizeCityName(raw)] || raw;
}

function pickBestGeocodingResult(results) {
  if (!Array.isArray(results) || results.length === 0) return null;
  return results
    .filter(item => Number.isFinite(Number(item.longitude)))
    .sort((a, b) => (Number(b.population) || 0) - (Number(a.population) || 0))[0] || null;
}

async function fetchCityLongitude(name) {
  const searchName = getCitySearchName(name);
  if (!searchName) return null;
  const params = new URLSearchParams({ name: searchName, count: '10', language: currentLang === 'en' ? 'en' : 'zh', format: 'json' });
  const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`);
  if (!response.ok) return null;
  const data = await response.json();
  const match = pickBestGeocodingResult(data.results);
  if (!match) return null;
  return Number(match.longitude).toFixed(4);
}

async function updateLongitudeFromCity(options = {}) {
  const silent = options.silent === true;
  const requestId = ++cityLookupRequestId;
  const cityEl = document.getElementById('inputCity');
  const longitudeEl = document.getElementById('inputLongitude');
  const localLongitude = findCityLongitude(cityEl.value);
  if (localLongitude != null) {
    longitudeEl.value = localLongitude;
    return true;
  }
  try {
    const longitude = await fetchCityLongitude(cityEl.value);
    if (requestId !== cityLookupRequestId) return false;
    if (longitude == null) {
      if (!silent) showToast('未找到該城市，請手動填寫出生地經度', 'error');
      return false;
    }
    longitudeEl.value = longitude;
    return true;
  } catch (err) {
    if (!silent) showToast('城市經度查詢失敗，請手動填寫出生地經度', 'error');
    return false;
  }
}

function initCityDatalist() {
  const list = document.getElementById('cityList');
  if (!list || typeof CITY_LONGITUDES === 'undefined') return;
  list.innerHTML = Object.keys(CITY_LONGITUDES)
    .sort((a, b) => a.localeCompare(b, 'zh-Hant'))
    .map(city => `<option value="${city}"></option>`)
    .join('');
}

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

  document.querySelectorAll('.reveal, .reveal-left, .reveal-scale').forEach(el => {
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
    showToast(typeof translateText === 'function' ? translateText('已複製，可直接粘貼到朋友圈/社羣。') : '已複製，可直接粘貼到朋友圈/社羣。', 'success');
  } catch (e) {
    // Fallback: use temporary textarea
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try { await navigator.clipboard.writeText(shareText); } catch (_) {
        fallbackCopy(shareText);
      }
    } else {
      fallbackCopy(shareText);
    }
    showToast(typeof translateText === 'function' ? translateText('已複製，可直接粘貼到朋友圈/社羣。') : '已複製，可直接粘貼到朋友圈/社羣。', 'success');
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
  initBottomNav();
  initModalSwipe();
  initCityDatalist();
  updateLongitudeFromCity();

  // 設置默認日期
  let today = new Date();
  let dateStr = today.toISOString().split('T')[0];
  document.getElementById('inputDate').value = dateStr;
});

// ============================
// 底部導航
// ============================
function initBottomNav() {
  const nav = document.getElementById('bottomNav');
  if (!nav) return;

  nav.querySelectorAll('.bottom-nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      nav.querySelectorAll('.bottom-nav-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const section = btn.dataset.section;
      const targets = {
        pillars: '#pillarGrid',
        wuxing: '#wxChart',
        calendar: '#calendarGrid',
        features: '#premiumFeaturesGrid',
        user: null
      };

      if (section === 'user') {
        document.getElementById('btnUser').click();
      } else if (targets[section]) {
        const el = document.querySelector(targets[section]);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

// ============================
// 模態框觸摸下拉關閉
// ============================
function initModalSwipe() {
  const container = document.getElementById('modalContainer');
  if (!container) return;

  let startY = 0, currentY = 0, isDragging = false;

  container.addEventListener('touchstart', (e) => {
    if (window.innerWidth > 640) return;
    const panel = e.target.closest('.modal-panel');
    if (!panel || panel.scrollTop > 0) return;
    startY = e.touches[0].clientY;
    isDragging = true;
    panel.style.transition = 'none';
  }, { passive: true });

  container.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    currentY = e.touches[0].clientY;
    const diff = currentY - startY;
    if (diff > 0) {
      const panel = container.querySelector('.modal-panel.active');
      if (panel) panel.style.transform = `translateY(${diff}px)`;
    }
  }, { passive: true });

  container.addEventListener('touchend', () => {
    if (!isDragging) return;
    isDragging = false;
    const diff = currentY - startY;
    const panel = container.querySelector('.modal-panel.active');
    if (panel) {
      panel.style.transition = '';
      if (diff > 120) {
        closeModals();
      } else {
        panel.style.transform = '';
      }
    }
    currentY = 0;
  });
}


// ============================
// 高級功能邏輯
// ============================

function checkVipBeforeFeature(feature) {
  if (!baziResult) {
    showToast('請先在主頁輸入出生信息進行排盤分析！', 'error');
    return false;
  }
  return true;
}

function showFeature(feature) {
  if (!checkVipBeforeFeature(feature)) return;
  
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
    let yong = getPrimaryLuckyElement(baziResult.xiYong);
    if (Array.isArray(xi)) xi = xi[0];
    if (Array.isArray(yong)) yong = yong[0];
    document.getElementById('numXiYong').textContent = `喜${xi}用${yong}`;
  } else if (feature === 'aiReport') {
    document.getElementById('aiReportIntro').classList.remove('hidden');
    document.getElementById('aiReportGenerating').classList.add('hidden');
    document.getElementById('aiReportResult').classList.add('hidden');
    document.getElementById('aiProgress').style.width = '0%';
  } else if (feature === 'zhijiao') {
    resetZhijiao();
  }
  
  if (feature === 'dayun') {
    renderDaYun();
  } else if (feature === 'wealth') {
    renderWealth();
  }
  
  showModal(feature + 'Modal');
}

function renderDaYun() {
  if (!baziResult?.precision?.eightChar) return;
  const container = document.getElementById('dayunContent');
  const eightChar = baziResult.precision.eightChar;
  const gender = baziResult.gender ?? 1;
  const yun = eightChar.getYun(gender);
  const dayunList = yun.getDaYun();
  const today = new Date();
  const currentYear = today.getFullYear();
  const xiArr = [baziResult.xiYong.xi, getPrimaryLuckyElement(baziResult.xiYong)].flat();
  const jiArr = baziResult.xiYong.ji.flat();

  // 原局四支（字符）用於 大運/流年 × 原局 的 合/沖/刑/害/三合/三會 偵測
  const originZhiChars = (baziResult.pillars || []).map(p => DZ[p.zhi]);
  const PILLAR_LABELS = ['年支','月支','日支','時支'];
  const TAG_STYLE = {
    '六沖': 'bg-fire/15 text-fire border border-fire/30',
    '六合': 'bg-water/15 text-water border border-water/30',
    '六害': 'bg-fire/10 text-fire/80 border border-fire/20',
    '三合': 'bg-wood/15 text-wood border border-wood/30',
    '三會': 'bg-wood/10 text-wood/80 border border-wood/20',
    '刑':   'bg-earth/15 text-earth border border-earth/30'
  };
  const summarizeInteractions = (hits) => {
    if (!hits.length) return '';
    // 類型強度排序：沖 ≥ 刑 > 合 > 害 > 三合 > 三會（依古典子平，沖/刑最為剋應）。
    const WEIGHT = { '六沖': 6, '刑': 5, '六合': 4, '六害': 3, '三合': 2, '三會': 1 };
    const sorted = hits.slice().sort((a, b) => (WEIGHT[b.type] || 0) - (WEIGHT[a.type] || 0));
    const sentence = (hit) => {
      const label = PILLAR_LABELS[hit.pillarIdx] || '';
      switch (hit.type) {
        case '六沖': return `大運支沖${label}，此運變動較大，宜穩守、忌激進。`;
        case '六合': return `大運支與${label}相合，人緣與合作機會增多。`;
        case '六害': return `大運支害${label}，留意口舌是非與小人。`;
        case '三合': return `大運支與${label}三合相助，順勢而為多得貴人。`;
        case '三會': return `大運支與${label}三會成方，同氣相求，動蕩中成勢。`;
        case '刑':   return `大運支刑${label}，宜防訴訟、健康、與親緣摩擦。`;
        default:     return '';
      }
    };
    // 若頭兩個強度相近且落在不同柱位，串接；否則只取最強一句。
    const first = sorted[0];
    const second = sorted.find(h => h !== first && h.pillarIdx !== first.pillarIdx);
    const firstSentence = sentence(first);
    if (!second) return firstSentence;
    const gap = (WEIGHT[first.type] || 0) - (WEIGHT[second.type] || 0);
    if (gap <= 2) {
      const secondSentence = sentence(second);
      if (secondSentence) return `${firstSentence} 另${secondSentence}`;
    }
    return firstSentence;
  };

  let html = `
    <div class="mb-4 p-4 rounded-xl bg-accent/5 border border-accent/10">
      <div class="text-xs text-accent/50 mb-1">起運時間</div>
      <div class="font-serif text-lg text-accent font-bold">${yun.getStartYear()}年 ${yun.getStartMonth()}月 ${yun.getStartDay()}日</div>
      <div class="text-[10px] text-accent/35 mt-1">按${gender === 1 ? '男命' : '女命'}與年干陰陽推算大運順逆。</div>
    </div>`;

  dayunList.slice(1, 9).forEach((dy) => {
    const startYear = dy.getStartYear();
    const liuNianList = dy.getLiuNian();
    const endYear = liuNianList.length ? liuNianList[liuNianList.length - 1].getYear() : startYear + 9;
    const ganZhi = dy.getGanZhi();
    const dGan = TG.indexOf(ganZhi.charAt(0));
    const dZhi = DZ.indexOf(ganZhi.charAt(1));
    const dZhiChar = DZ[dZhi];
    const dyElements = [WX_GAN[dGan], WX_ZHI[dZhi]].filter(Boolean);
    const isXi = dyElements.some(el => xiArr.includes(el));
    const isJi = dyElements.some(el => jiArr.includes(el));
    const isFuture = startYear > currentYear;
    const isCurrent = startYear <= currentYear && endYear >= currentYear;

    let borderColor = 'border-accent/10', bgColor = 'bg-accent/5', textColor = 'text-accent';
    let fortuneLabel = '平';
    if (isXi) { borderColor = 'border-wood/20'; bgColor = 'bg-wood/5'; textColor = 'text-wood'; fortuneLabel = '吉'; }
    if (isJi) { borderColor = 'border-fire/20'; bgColor = 'bg-fire/5'; textColor = 'text-fire'; fortuneLabel = '需慎'; }

    let tag = '';
    if (isCurrent) tag = '<span class="ml-2 px-2 py-0.5 rounded-full bg-accent/20 text-accent text-[10px] font-bold">當前</span>';
    else if (isFuture) tag = '<span class="ml-2 px-2 py-0.5 rounded-full bg-black/30 text-accent/50 text-[10px]">未來</span>';

    // 大運支 × 原局 互動
    const dyHits = (typeof detectBranchInteractions === 'function')
      ? detectBranchInteractions(dZhiChar, originZhiChars)
      : [];
    // 每柱互動 6 類 × 4 柱 最多 24 個 badge；為免佈局爆炸，排序後保留前 6，
    // 其餘折合為 "+N" 提示。排序鍵與 summarizeInteractions 保持一致。
    const BADGE_WEIGHT = { '六沖': 6, '刑': 5, '六合': 4, '六害': 3, '三合': 2, '三會': 1 };
    const dyHitsSorted = dyHits.slice().sort((a, b) => (BADGE_WEIGHT[b.type] || 0) - (BADGE_WEIGHT[a.type] || 0));
    const BADGE_CAP = 6;
    const dyHitsVisible = dyHitsSorted.slice(0, BADGE_CAP);
    const dyHitsOverflow = Math.max(0, dyHitsSorted.length - BADGE_CAP);
    const badgesHTML = dyHitsVisible.length
      ? `<div class="mt-2 flex flex-wrap gap-1.5">${dyHitsVisible.map(h =>
          `<span class="px-1.5 py-0.5 rounded text-[10px] ${TAG_STYLE[h.type] || 'bg-accent/10 text-accent/70 border border-accent/20'}">${h.label}</span>`
        ).join('')}${dyHitsOverflow
          ? `<span class="px-1.5 py-0.5 rounded text-[10px] bg-accent/10 text-accent/60 border border-accent/20">+${dyHitsOverflow}</span>`
          : ''}</div>`
      : '';
    const interactionDesc = summarizeInteractions(dyHitsSorted);

    const baseDesc = isXi
      ? `${ganZhi}大運，干支五行與喜用神呼應，整體更利於順勢發展。`
      : isJi
        ? `${ganZhi}大運，干支五行觸及忌神，宜保守布局，避免高風險決策。`
        : `${ganZhi}大運，五行氣場中性，適合穩扎穩打、逐步積累。`;
    const desc = baseDesc + (interactionDesc ? ` ${interactionDesc}` : '');

    const yearsHtml = liuNianList.slice(0, 10).map(ln => {
      const lnGz = ln.getGanZhi();
      const yGan = TG.indexOf(lnGz.charAt(0));
      const yZhi = DZ.indexOf(lnGz.charAt(1));
      const yZhiChar = DZ[yZhi];
      const yElements = [WX_GAN[yGan], WX_ZHI[yZhi]].filter(Boolean);
      let yScore = 0;
      yElements.forEach(el => {
        if (xiArr.includes(el)) yScore += 1;
        if (jiArr.includes(el)) yScore -= 1;
      });
      let yFortune = '平', yColor = 'text-accent', yBg = 'bg-black/20';
      if (yScore > 0) { yFortune = '吉'; yColor = 'text-wood'; yBg = 'bg-wood/20'; }
      else if (yScore < 0) { yFortune = '慎'; yColor = 'text-fire'; yBg = 'bg-fire/20'; }
      const lnHits = (typeof detectBranchInteractions === 'function')
        ? detectBranchInteractions(yZhiChar, originZhiChars)
        : [];
      const tooltip = lnHits.length ? lnHits.map(h => h.label).join('、') : '';
      const titleAttr = tooltip ? ` title="${tooltip}"` : '';
      const hitDot = lnHits.length ? '<span class="inline-block w-1 h-1 rounded-full bg-accent ml-1 align-middle"></span>' : '';
      return `<div class="${yBg} p-1 rounded ${yColor}"${titleAttr}>${ln.getYear()}<br>${lnGz}<br>${yFortune}${hitDot}</div>`;
    }).join('');

    html += `
      <div class="p-4 border ${borderColor} ${bgColor} rounded-lg">
        <h4 class="font-bold ${textColor} text-sm mb-2">
          <i class="fas fa-${isCurrent ? 'arrow-up' : (isFuture ? 'arrow-right' : 'history')} mr-2"></i>
          ${dy.getStartAge()}歲起 · ${startYear} - ${endYear} (${ganZhi}大運)${tag}
        </h4>
        ${badgesHTML}
        <p class="text-xs text-accent/70 leading-relaxed mt-2">${desc}</p>
        <div class="mt-3 grid grid-cols-5 gap-2 text-center text-[10px]">${yearsHtml}</div>
      </div>`;
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

      // 添加大運流年分析
      if (baziResult) {
        const daYun = calculateDecadeFortune(
          {
            dayGan: baziResult.dayGan,
            solar: baziResult.meta.solar,
            lunar: baziResult.meta.lunar,
            eightChar: baziResult.meta.eightChar
          },
          baziResult.gender === 1 ? 'male' : 'female'
        );

        // 可以在這裡添加大運顯示邏輯
        console.log('十年大運分析：', daYun);
      }
      document.getElementById('aiReportResult').classList.remove('hidden');
      renderAiReportContent();
    }, 500);
  }, 4000);
}

function renderAiReportContent() {
  const container = document.getElementById('aiReportContent');
  const dWX = baziResult.dayGanWX;
  const isS = baziResult.isStrong;
  const luckyWX = getPrimaryLuckyElement(baziResult.xiYong);

  let html = '';

  if (currentLang === 'en') {
    // English version
    html = `
      <h4 class=”text-lg font-serif text-accent font-bold mb-4 border-b border-accent/20 pb-2”>1. Overall Chart Summary</h4>
      <p>Your Day Master is ${dWX}, born in ${DZ[baziResult.monthZhi]} Month. The overall chart belongs to a ${isS ? 'Strong' : 'Weak'} Day Master pattern. The key characteristic of this destiny lies in its inner resilience and potential. ${isS ? 'You naturally possess strong stress resistance and independent spirit, suitable for pioneering work.' : 'You excel at leveraging resources and have a delicate mindset, suitable for playing a core coordinating role in teams.'}</p>

      <h4 class=”text-lg font-serif text-accent font-bold mt-6 mb-4 border-b border-accent/20 pb-2”>2. Wealth and Career Analysis</h4>
      <p>From the wealth vault and fortune cycle trends, your wealth accumulation belongs to a “${baziResult.wxCount['金'] > 1 ? 'Breakthrough' : 'Steady'}” pattern. In the next 3-5 years, you will experience a significant career advancement period. When handling finances, seek professional advice and avoid following trends blindly.</p>
      <p class=”mt-2”><strong>Career Direction:</strong> Your favorable element is ${luckyWX}, making you highly suitable for related industries. In the workplace, you will easily encounter benefactor support, but beware of jealousy from difficult people.</p>

      <h4 class=”text-lg font-serif text-accent font-bold mt-6 mb-4 border-b border-accent/20 pb-2”>3. Relationships and Marriage</h4>
      <p>Your approach to relationships is relatively ${isS ? 'active and assertive' : 'passive and delicate'}. The chart shows that your true love appears in the ${Math.random() > 0.5 ? 'East or Southeast' : 'West or Northwest'}. In marriage, pay attention to communication styles to avoid unnecessary conflicts due to stubbornness.</p>

      <h4 class=”text-lg font-serif text-accent font-bold mt-6 mb-4 border-b border-accent/20 pb-2”>4. Personalized Improvement Guide</h4>
      <ul class=”list-disc pl-5 space-y-2”>
        <li><strong>Lucky Colors:</strong> Wear more clothing in ${LUCKY_DATA[luckyWX].colors.join(', ')} colors.</li>
        <li><strong>Direction Choice:</strong> Your bed head or desk should face ${LUCKY_DATA[luckyWX].dir}.</li>
        <li><strong>Daily Suggestion:</strong> Maintain regular sleep schedule and wear accessories like ${DRESS_COLORS[luckyWX].acc[0]} to enhance your energy field.</li>
      </ul>

      <div class=”mt-6 p-4 bg-accent/10 rounded-lg text-xs text-accent/60”>
        <i class=”fas fa-gift mr-2”></i> Full demo report is free during the promotion period.
      </div>
    `;
  } else {
    // Chinese version
    html = `
      <h4 class=”text-lg font-serif text-accent font-bold mb-4 border-b border-accent/20 pb-2”>一、 命局總評</h4>
      <p>您的日主為${dWX}，生於${DZ[baziResult.monthZhi]}月。整體命局屬於${isS ? '身強' : '身弱'}之格。此命格最大的特點在於其內在的韌性與潛力。${isS ? '您天生具備較強的抗壓能力與獨立精神，適合開創性的工作。' : '您善於借力打力，心思細膩，適合在團隊中發揮核心協調作用。'}</p>

      <h4 class=”text-lg font-serif text-accent font-bold mt-6 mb-4 border-b border-accent/20 pb-2”>二、 財運與事業剖析</h4>
      <p>從財庫與大運走勢來看，您的財富積累屬於”${baziResult.wxCount['金'] > 1 ? '爆發型' : '穩健型'}”。在未來的3-5年內，將會迎來一波較為明顯的事業上升期。建議在處理財務時，多聽取專業人士意見，避免盲目跟風。</p>
      <p class=”mt-2”><strong>事業方向建議：</strong> 您的喜用神為 ${luckyWX}，非常適合從事與之相關的行業。在職場中，您容易遇到貴人提攜，但需注意防範小人嫉妒。</p>

      <h4 class=”text-lg font-serif text-accent font-bold mt-6 mb-4 border-b border-accent/20 pb-2”>三、 婚姻與感情歸宿</h4>
      <p>您的感情觀較為${isS ? '主動且強勢' : '被動且細膩'}。命盤顯示，您的正緣出現在${Math.random() > 0.5 ? '東方或東南方' : '西方或西北方'}。婚姻生活中，需多注意溝通方式，避免因固執己見而產生不必要的摩擦。</p>

      <h4 class=”text-lg font-serif text-accent font-bold mt-6 mb-4 border-b border-accent/20 pb-2”>四、 專屬改運指導</h4>
      <ul class=”list-disc pl-5 space-y-2”>
        <li><strong>色彩開運：</strong> 多穿戴 ${LUCKY_DATA[luckyWX].colors.join('、')} 色的服飾。</li>
        <li><strong>方位選擇：</strong> 床頭或辦公桌宜朝向 ${LUCKY_DATA[luckyWX].dir}。</li>
        <li><strong>日常建議：</strong> 保持規律作息，適當佩戴 ${DRESS_COLORS[luckyWX].acc[0]} 等飾品以增強自身氣場。</li>
      </ul>

      <div class=”mt-6 p-4 bg-accent/10 rounded-lg text-xs text-accent/60”>
        <i class=”fas fa-gift mr-2”></i> 推廣期完整版示範報告已免費開放。
      </div>
    `;
  }

  container.innerHTML = html;
}

function downloadAiReport() {
  const message = currentLang === 'en'
    ? 'Generating PDF, please wait... (demo feature)'
    : '正在生成 PDF，請稍候... (此為演示功能)';
  showToast(message);
}

function tossZhijiao() {
  const btn = document.getElementById('btnToss');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>神明感應中...';
  document.getElementById('zhijiaoResult').classList.add('hidden');
  
  const jL = document.getElementById('jiaoLeft');
  const jR = document.getElementById('jiaoRight');
  
  // 重置动画状态
  jL.style.transform = '';
  jR.style.transform = '';
  
  // 触发抛掷动画
  const container = document.getElementById('jiaoContainer');
  container.classList.remove('tossing');
  void container.offsetWidth; // 触发重绘
  container.classList.add('tossing');
  
  setTimeout(() => {
    container.classList.remove('tossing');
    
    // 随机决定结果
    // 0: 阴面（凸起）, 1: 阳面（平坦）
    const resL = Math.random() > 0.5 ? 1 : 0;
    const resR = Math.random() > 0.5 ? 1 : 0;
    
    // 加上随机的角度让落地看起来更自然
    const rotZL = (Math.random() * 40 - 20) + 'deg';
    const rotZR = (Math.random() * 40 - 20) + 'deg';
    
    // 阳面需要 rotateY(180deg)，阴面 rotateY(0deg)
    jL.style.transform = `rotateY(${resL ? 180 : 0}deg) rotateZ(${rotZL})`;
    jR.style.transform = `rotateY(${resR ? 180 : 0}deg) rotateZ(${rotZR})`;
    
    // 判断结果类型
    let title = '';
    let desc = '';
    let color = '';
    
    if (resL !== resR) {
      title = '聖杯 (允杯)';
      desc = '一平一凸。神明表示贊同、允許、順利。這是一個非常好的兆頭，大膽去做吧！';
      color = 'text-fire';
    } else if (resL === 1 && resR === 1) {
      title = '笑杯';
      desc = '兩平面朝上。神明在笑，表示狀況不明朗、或者問題問得不清楚。建議換個方式再問一次。';
      color = 'text-accent';
    } else {
      title = '陰杯 (怒杯)';
      desc = '兩凸面朝上。神明表示不贊同、不合適、或者時機未到。建議三思而後行，不可強求。';
      color = 'text-water';
    }
    
    const resDiv = document.getElementById('zhijiaoResult');
    document.getElementById('zjTitle').textContent = title;
    document.getElementById('zjTitle').className = `font-serif text-3xl font-bold mb-2 ${color}`;
    document.getElementById('zjDesc').textContent = desc;
    
    resDiv.classList.remove('hidden');
    btn.innerHTML = '<i class="fas fa-hand-sparkles mr-2"></i>誠心擲筊';
    btn.disabled = false;
    
  }, 800); // 等待 CSS 动画结束
}

function resetZhijiao() {
  document.getElementById('zhijiaoResult').classList.add('hidden');
  const jL = document.getElementById('jiaoLeft');
  const jR = document.getElementById('jiaoRight');
  const btn = document.getElementById('btnToss');
  jL.style.transform = '';
  jR.style.transform = '';
  btn.innerHTML = '<i class="fas fa-hand-sparkles mr-2"></i>誠心擲筊';
  btn.disabled = false;
}

function calculateHehun() {
  const otherDate = document.getElementById('hehunDate').value;
  const otherHour = document.getElementById('hehunHour').value;
  
  if (!otherDate || otherHour === "") {
    showToast('請選擇對方的出生日期和時辰', 'error');
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
  let myYong = getPrimaryLuckyElement(baziResult.xiYong);
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

function escapeHTML(value) {
  return String(value).replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));
}

function generateNames() {
  const ln = document.getElementById('lastName').value.trim();
  const safeLn = escapeHTML(ln);
  if(!ln) return showToast('請輸入姓氏', 'error');
  
  const gender = document.getElementById('gender').value;
  const btn = document.querySelector('#qimingModal .btn-primary');
  btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>匹配詩經楚辭...';
  btn.disabled = true;
  
  // 獲取喜用神
  let xi = baziResult.xiYong.xi;
  let yong = getPrimaryLuckyElement(baziResult.xiYong);
  
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
        <div class="text-lg font-serif text-accent mb-1 tracking-widest">${safeLn} ${char1} ${char2}</div>
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

const lazyScriptPromises = {};
function withTimeout(promise, ms, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms))
  ]);
}

function loadScriptOnce(url, globalName) {
  if (globalName && window[globalName]) return Promise.resolve();
  if (lazyScriptPromises[url]) return lazyScriptPromises[url];
  lazyScriptPromises[url] = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${url}`));
    document.head.appendChild(script);
  });
  return lazyScriptPromises[url];
}

async function ensurePosterDependencies() {
  await loadScriptOnce('https://html2canvas.hertzen.com/dist/html2canvas.min.js', 'html2canvas');
  await loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js', 'qrcode');
}

function generateLuckyNum() {
  const btn = document.getElementById('btnGenNum');
  btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>生成中...';
  btn.disabled = true;
  
  setTimeout(() => {
    // 獲取用戶的喜用神五行對應的數字
    let xi = baziResult.xiYong.xi;
    let yong = getPrimaryLuckyElement(baziResult.xiYong);
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
async function generatePoster() {
  if (!checkVipBeforeFeature('poster')) return;

  showModal('posterModal');
  const resultDiv = document.getElementById('posterResult');
  resultDiv.innerHTML = '<div class="py-20 text-center text-accent/50"><i class="fas fa-spinner fa-spin text-3xl mb-2"></i><br>海報生成中...</div>';
  try {
    await ensurePosterDependencies();
  
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

  const posterEl = document.getElementById('posterCanvas');
  const previousStyle = posterEl.getAttribute('style') || '';
  const restoreHiddenClass = posterEl.classList.contains('hidden');
  const restoreOpacityClass = posterEl.classList.contains('opacity-0');
  try {
    posterEl.classList.remove('hidden', 'opacity-0');
    Object.assign(posterEl.style, {
      position: 'fixed',
      left: '-420px',
      top: '0',
      width: '375px',
      opacity: '1',
      visibility: 'visible',
      zIndex: '0',
      pointerEvents: 'none'
    });
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const canvas = await withTimeout(window.html2canvas(posterEl, {
      backgroundColor: '#1a1a2e',
      scale: 2,
      useCORS: true,
      logging: false,
      width: posterEl.offsetWidth,
      height: posterEl.scrollHeight,
      windowWidth: Math.max(document.documentElement.clientWidth, posterEl.offsetWidth),
      windowHeight: Math.max(document.documentElement.clientHeight, posterEl.scrollHeight)
    }), 10000, 'poster generation timed out');
    const img = document.createElement('img');
    img.src = canvas.toDataURL('image/jpeg');
    img.className = 'w-full h-auto shadow-2xl rounded-xl';
    resultDiv.innerHTML = '';
    resultDiv.appendChild(img);
  } finally {
    posterEl.setAttribute('style', previousStyle);
    if (restoreHiddenClass) posterEl.classList.add('hidden');
    if (restoreOpacityClass) posterEl.classList.add('opacity-0');
  }
  } catch (err) {
    console.error(err);
    resultDiv.innerHTML = '<div class="py-20 text-center text-fire"><i class="fas fa-exclamation-triangle text-3xl mb-2"></i><br>海報生成失敗，請稍後重試</div>';
  }
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

// Translate Na Yin values from Chinese to English
function translateNaYin(naYin) {
  if (currentLang !== "en") return naYin;

  const naYinMap = {
    "海中金": "Sea Gold",
    "爐中火": "Furnace Fire",
    "大林木": "Forest Wood",
    "路旁土": "Road Earth",
    "劍鋒金": "Sword Gold",
    "山頭火": "Mountain Fire",
    "澗下水": "Stream Water",
    "城頭土": "Wall Earth",
    "白蠟金": "White Wax Gold",
    "楊柳木": "Willow Wood",
    "泉中水": "Spring Water",
    "屋上土": "Roof Earth",
    "霹靂火": "Thunder Fire",
    "松柏木": "Pine Wood",
    "長流水": "Flowing Water",
    "砂石金": "Gravel Gold",
    "山下火": "Mountain Fire",
    "平地木": "Field Wood",
    "壁上土": "Wall Earth",
    "金箔金": "Gold Foil",
    "覆燈火": "Lamp Fire",
    "天河水": "Heaven River Water",
    "大驛土": "Post Station Earth",
    "釵環金": "Hairpin Gold",
    "桑柘木": "Mulberry Wood",
    "大溪水": "Big Stream Water",
    "沙中土": "Sand Earth",
    "天上火": "Heaven Fire",
    "石榴木": "Pomegranate Wood",
    "大海水": "Ocean Water"
  };

  return naYinMap[naYin] || naYin;
}

// Translate Chinese star names to English
function translateStarNames(starNames) {
  if (currentLang !== "en") return starNames;

  const starMap = {
    // Auspicious Stars
    "天乙貴人": "Tian Yi Noble",
    "文昌貴人": "Wen Chang Noble",
    "華蓋": "Hua Gai (Canopy)",
    "將星": "General Star",
    "祿神": "Lu (Prosperity) Star",
    "羊刃": "Yang Ren (Blade)",
    "金輿": "Jin Yu (Golden Carriage)",
    "天德": "Heavenly Virtue",
    "月德": "Monthly Virtue",
    "天醫": "Heavenly Doctor",
    "太極貴人": "Taiji Noble",
    "福星貴人": "Lucky Star Noble",
    "三奇": "Three Wonders",
    "三合": "Three Harmony",
    "臨官": "Official Position",
    "临官": "Official Position",
    "帝旺": "Imperial Power",
    "長生": "Growth",
    "长生": "Growth",
    "沐浴": "Bath",
    "冠帶": "Crown",
    "冠带": "Crown",
    "養": "Nurture",
    "养": "Nurture",
    "胎": "Conception",
    "胎": "Conception",
    "時陰": "Hour Yin",
    "时阴": "Hour Yin",
    "敬安": "Respectful Peace",
    "除神": "Dispelling Spirit",
    "金匱": "Golden Treasury",
    "金匮": "Golden Treasury",

    // Inauspicious Stars
    "月厭": "Month Hate",
    "月厌": "Month Hate",
    "地火": "Earth Fire",
    "死氣": "Death Qi",
    "死气": "Death Qi",
    "往亡": "Gone and Lost",
    "五離": "Five Separations",
    "五离": "Five Separations",
    "行狠": "Cruel Action",
    "劫煞": "Robbery Spirit",
    "災煞": "Disaster Spirit",
    "歲煞": "Year Spirit",
    "勾絞": "Hook and Twist",
    "孤辰": "Lonely Stem",
    "寡宿": "Widowed Branch",
    "天狗": "Heavenly Dog",
    "白虎": "White Tiger",
    "朱雀": "Vermilion Bird",
    "玄武": "Black Tortoise",
    "病符": "Sickness Token",
    "大耗": "Great Loss",
    "小耗": "Small Loss",
    "破敗": "Broken and Defeated",
    "咸池": "Salty Pool",
    "桃花": "Peach Blossom",
    "空亡": "Void and Extinct"
  };

  return starNames.map(star => starMap[star] || star);
}

// Translate Peng Zu Gan (天干 taboos)
function translatePengZuGan(pengZuGan) {
  if (!pengZuGan) return "";

  const ganMap = {
    "甲不經絡織機虛張": "Jia: Do not engage in weaving or networking (excessive expansion)",
    "乙不祭祀神鬼不尝": "Yi: Do not perform sacrifices to spirits (offerings will not be accepted)",
    "丙不修灶必見火殃": "Bing: Do not repair stoves (fire disaster may occur)",
    "丁不剃頭頭必生瘡": "Ding: Do not cut hair (sores may develop on the head)",
    "戊不伐樹誰克斧頭": "Wu: Do not cut trees (conflict with tools)",
    "己不買豬猡必見瘟": "Ji: Do not buy pigs (disease may occur)",
    "庚不修倉必見凶殃": "Geng: Do not repair granaries (bad omen may appear)",
    "辛不合醬必有瘟疾": "Xin: Do not make sauce (plague or illness may occur)",
    "壬不決水水必反": "Ren: Do not drain water (water will flow back)",
    "癸不詞訟必見凶": "Gui: Do not engage in lawsuits (bad outcome guaranteed)"
  };

  return ganMap[pengZuGan] || pengZuGan;
}

// Translate Peng Zu Zhi (地支 taboos)
function translatePengZuZhi(pengZuZhi) {
  if (!pengZuZhi) return "";

  const zhiMap = {
    "子不問卜自惹禍殃": "Zi: Do not consult divination (will invite disaster)",
    "丑不冠帶主不還鄉": "Chou: Do not wear hats/crowns (will not return home)",
    "寅不祭祀神鬼不尝": "Yin: Do not perform sacrifices (spirits will not accept)",
    "卯不穿井常常更換": "Mao: Do not dig wells (will need constant replacement)",
    "辰不哭泣必主重喪": "Chen: Do not cry (major funeral may occur)",
    "巳不遠行財物伏藏": "Si: Do not travel far (wealth will be hidden/lost)",
    "午不苫蓋屋主更張": "Wu: Do not thatch roofs (house will need reconstruction)",
    "未不服藥毒氣入腸": "Wei: Do not take medicine (poison will enter intestines)",
    "申不安床鬼祟入房": "Shen: Do not arrange beds (ghosts will enter room)",
    "酉不會客賓主相傷": "You: Do not receive guests (both host and guest will be harmed)",
    "戌不吃犬作怪上床": "Xu: Do not eat dog meat (strange things will happen)",
    "亥不嫁娶不利新郎": "Hai: Do not marry (bad for the groom)"
  };

  return zhiMap[pengZuZhi] || pengZuZhi;
}
