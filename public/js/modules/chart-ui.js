import { state } from './state.js';
import { getShiShen, getShiShenForHiddenStems, computeChartShenSha, computeYongShenFrameworks } from '../bazi.js';
import { getChangSheng, WX_COLORS, WX_GAN, WX_ZHI, CANG_GAN, TG, DZ, NA_YIN, WX_LIST, WX_ICONS, TRAITS, CAREER, LUCKY_DATA, DRESS_COLORS } from '../data.js';
import { translateNaYin, translateStarNames, translatePengZuGan, translatePengZuZhi, formatLongitudeDisplay } from './utils.js';

export function renderPillars(pillars, dayGan) {
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
    const hiddenShiShen = getShiShenForHiddenStems(dayGan, p.zhi);
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

export function renderPrecisionMeta() {
  if (!state.baziResult?.precision) return;
  const meta = state.baziResult.precision;
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
    ['起運性別', state.baziResult.gender === 1 ? '男命' : '女命', '用於大運順逆']
  ];
  grid.innerHTML = items.map(([label, value, hint]) => `
    <div class="precision-card glass-card p-4">
      <div class="text-[10px] text-accent/40 tracking-widest mb-1">${label}</div>
      <div class="font-serif text-lg text-accent font-bold">${value}</div>
      <div class="text-[10px] text-accent/35 mt-1">${hint}</div>
    </div>
  `).join('');
}

export function renderProInfo() {
  if (!state.baziResult?.precision) return;
  const meta = state.baziResult.precision;
  const eightChar = meta.eightChar;
  const lunar = meta.lunar;
  const grid = document.getElementById('proInfoGrid');
  if (!grid || !eightChar || !lunar) return;

  const call = (obj, method, fallback = '') => (obj && typeof obj[method] === 'function') ? obj[method]() : fallback;
  const naYin = [call(eightChar, 'getYearNaYin'), call(eightChar, 'getMonthNaYin'), call(eightChar, 'getDayNaYin'), call(eightChar, 'getTimeNaYin')].join(' · ');
  const xunKong = [call(eightChar, 'getYearXunKong'), call(eightChar, 'getMonthXunKong'), call(eightChar, 'getDayXunKong'), call(eightChar, 'getTimeXunKong')].join(' · ');
  let pengZu;
  if (window.currentLang === 'en') {
    const pengZuGan = translatePengZuGan(call(lunar, 'getPengZuGan', ''));
    const pengZuZhi = translatePengZuZhi(call(lunar, 'getPengZuZhi', ''));
    pengZu = `${pengZuGan}; ${pengZuZhi}`;
  } else {
    pengZu = `${call(lunar, 'getPengZuGan')}；${call(lunar, 'getPengZuZhi')}`;
  }

  const pillarLabels = ['年支','月支','日支','時支'];
  const REF_LABEL = { year: '起於年支', day: '起於日支', both: '年/日支皆起' };
  let shenShaHTML = '<span class="text-accent/40">—</span>';
  if (Array.isArray(state.baziResult.pillars)) {
    const ss = computeChartShenSha(state.baziResult.pillars);
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

export function renderWuXing(wxCount) {
  const chart = document.getElementById('wxChart');
  const legend = document.getElementById('wxLegend');
  const center = document.getElementById('wxCenterNum');
  
  let total = Object.values(wxCount).reduce((s, v) => s + v, 0);
  center.textContent = Math.round(total);
  
  let r = 80, cx = 100, cy = 100, C = 2 * Math.PI * r;
  chart.innerHTML = '';
  
  let startOffset = 0;
  WX_LIST.forEach(wx => {
    let pct = wxCount[wx] / total;
    let len = pct * C;
    let gap = 4;
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

export function renderStrength(dayGan, monthZhi, strength) {
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
  let text = '';

  if (window.currentLang === 'en') {
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

  const host = document.getElementById('strengthText').parentElement;
  let detail = document.getElementById('strengthDetail');
  if (!detail) {
    detail = document.createElement('div');
    detail.id = 'strengthDetail';
    detail.className = 'mt-4 grid gap-2 text-xs text-accent/70';
    host.appendChild(detail);
  }
  let pillarLabels, diLabel, shiLabel, lingLabel, inSeasonLabel, rootedLabel, supportedLabel;

  if (window.currentLang === 'en') {
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
    inSeasonLabel = 'In-season:'; rootedLabel = 'Rooted:'; supportedLabel = 'Supported:';
  } else {
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
    inSeasonLabel = '得令：'; rootedLabel = '得地：'; supportedLabel = '得勢：';
  }

  detail.innerHTML = `
    <div class="flex gap-2"><span class="text-accent/50 shrink-0">${inSeasonLabel}</span><span>${lingLabel}</span></div>
    <div class="flex gap-2"><span class="text-accent/50 shrink-0">${rootedLabel}</span><span>${diLabel}</span></div>
    <div class="flex gap-2"><span class="text-accent/50 shrink-0">${supportedLabel}</span><span>${shiLabel}</span></div>
  `;
}

export function renderTraits(dayGan, isStrong) {
  let wx = WX_GAN[dayGan];
  let pList = document.getElementById('personalityList');
  let cList = document.getElementById('careerList');
  let traits = TRAITS[wx][isStrong ? 'strong' : 'weak'];
  let career = CAREER[wx][isStrong ? 'strong' : 'weak'];
  const tr = value => typeof window.translateText === 'function' ? window.translateText(value) : value;
  pList.innerHTML = traits.map(t => `<li class="flex gap-2"><span class="text-accent/30 mt-0.5">•</span><span>${tr(t)}</span></li>`).join('');
  cList.innerHTML = career.map(t => `<li class="flex gap-2"><span class="text-accent/30 mt-0.5">•</span><span>${tr(t)}</span></li>`).join('');
}

export function getPrimaryLuckyElement(xiYong) {
  return [xiYong.yong, xiYong.xi, xiYong.ji, xiYong.xian]
    .flat()
    .find(wx => wx && LUCKY_DATA[wx]) || '木';
}

export function renderXiYong(xiYong) {
  const grid = document.getElementById('xiYongGrid');

  if (state.baziResult) {
    const frameworks = computeYongShenFrameworks({
      dayGan: state.baziResult.dayGan,
      monthZhi: state.baziResult.monthZhi,
      strength: state.baziResult.strength,
      wxCount: state.baziResult.wxCount
    });
    state.baziResult.frameworks = frameworks;
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
    const showNotes = (typeof window.currentLang === 'undefined' || window.currentLang === 'zh');
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

  let detail = document.getElementById('xiYongDetail').querySelector('ul');
  let dayWX = state.baziResult.dayGanWX;
  let isStrong = state.baziResult.isStrong;
  let lines = [];

  const jiList = Array.isArray(xiYong.ji) ? xiYong.ji.filter(Boolean) : [xiYong.ji].filter(Boolean);
  const jiStr = jiList.length > 0 ? (window.currentLang === 'en' ? jiList.join(', ') : jiList.join('、')) : (window.currentLang === 'en' ? 'No obvious unfavorable element' : '暫無明顯忌神');

  if (!xiYong.yong) {
    if (window.currentLang === 'en') {
      lines.push(`<li><strong style="color:${WX_COLORS[xiYong.xi]}">${xiYong.xi} is the Helpful Element</strong>: The Day Master energy is relatively balanced; first take ${xiYong.xi} to harmonize the chart rather than forcing a single favorable element.</li>`);
      lines.push(`<li><strong style="color:var(--fire)">${jiStr}</strong>: For balanced charts, unfavorable elements should not be determined arbitrarily; they should be analyzed in conjunction with 10-year and annual fortune cycles.</li>`);
      lines.push(`<li><strong style="color:var(--accent)">${xiYong.xian} is the Neutral Element</strong>: Can be used as auxiliary reference, depending on the overall chart configuration.</li>`);
    } else {
      lines.push(`<li><strong style="color:${WX_COLORS[xiYong.xi]}">${xiYong.xi}爲喜神</strong>：日主氣勢較為中和，先取${xiYong.xi}調和命局，不強行指定單一用神</li>`);
      lines.push(`<li><strong style="color:var(--fire)">${jiStr}</strong>：中和格局忌神不宜武斷，應結合大運流年再細分取捨</li>`);
      lines.push(`<li><strong style="color:var(--accent)">${xiYong.xian}爲閒神</strong>：可作輔助參考，需視命局配合而定</li>`);
    }
  } else if (isStrong) {
    if (window.currentLang === 'en') {
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
    if (window.currentLang === 'en') {
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

export function renderLucky() {
  const tr = value => typeof window.translateText === 'function' ? window.translateText(value) : value;
  let xy = state.baziResult.xiYong;
  const wxKeys = [xy.xi, xy.yong]
    .flat()
    .filter((wx, idx, arr) => wx && LUCKY_DATA[wx] && arr.indexOf(wx) === idx);
  if (!wxKeys.length) wxKeys.push('木');

  let dirs = [...new Set(wxKeys.map(wx => LUCKY_DATA[wx].dir))];
  let colors = [...new Set(wxKeys.flatMap(wx => LUCKY_DATA[wx].colors))];
  let nums = [...new Set(wxKeys.flatMap(wx => LUCKY_DATA[wx].nums))];
  let plants = [...new Set(wxKeys.flatMap(wx => LUCKY_DATA[wx].plants))];

  document.getElementById('luckyDir').textContent = dirs.map(tr).join(', ');
  document.getElementById('luckyColor').textContent = colors.map(tr).join(', ');
  document.getElementById('luckyNum').textContent = nums.join(', ');
  document.getElementById('luckyPlant').textContent = plants.map(tr).join(', ');

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
