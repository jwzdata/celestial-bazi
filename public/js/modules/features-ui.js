import { state } from './state.js';
import { countWuXing, calculateDecadeFortune, getShiShen, detectBranchInteractions } from '../bazi.js';
import { TG, DZ, WX_GAN, WX_ZHI, WX_COLORS, LUCKY_DATA, DRESS_COLORS } from '../data.js';
import { ensurePosterDependencies, generateQRCode, withTimeout, escapeHTML } from './utils.js';
import { getPrimaryLuckyElement } from './chart-ui.js';

export function checkVipBeforeFeature(feature) {
  if (!state.baziResult) {
    window.showToast('請先在主頁輸入出生信息進行排盤分析！', 'error');
    return false;
  }
  return true;
}

export function showFeature(feature) {
  if (!checkVipBeforeFeature(feature)) return;
  
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
  } else if (feature === 'chouqian') {
    document.getElementById('qianTong').classList.remove('hidden');
    document.getElementById('qianResult').classList.add('hidden');
  } else if (feature === 'luckynum') {
    document.getElementById('numResult').classList.add('hidden');
    document.getElementById('btnGenNum').classList.remove('hidden');
    
    let xi = state.baziResult.xiYong.xi;
    let yong = getPrimaryLuckyElement(state.baziResult.xiYong);
    if (Array.isArray(xi)) xi = xi[0];
    if (Array.isArray(yong)) yong = yong[0];
    document.getElementById('numXiYong').textContent = \`喜\${xi}用\${yong}\`;
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
  
  window.showModal(feature + 'Modal');
}

export function renderDaYun() {
  if (!state.baziResult?.precision?.eightChar) return;
  const container = document.getElementById('dayunContent');
  const eightChar = state.baziResult.precision.eightChar;
  const gender = state.baziResult.gender ?? 1;
  const yun = eightChar.getYun(gender);
  const dayunList = yun.getDaYun();
  const today = new Date();
  const currentYear = today.getFullYear();
  const xiArr = [state.baziResult.xiYong.xi, getPrimaryLuckyElement(state.baziResult.xiYong)].flat();
  const jiArr = state.baziResult.xiYong.ji.flat();

  const originZhiChars = (state.baziResult.pillars || []).map(p => DZ[p.zhi]);
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
    const WEIGHT = { '六沖': 6, '刑': 5, '六合': 4, '六害': 3, '三合': 2, '三會': 1 };
    const sorted = hits.slice().sort((a, b) => (WEIGHT[b.type] || 0) - (WEIGHT[a.type] || 0));
    const sentence = (hit) => {
      const label = PILLAR_LABELS[hit.pillarIdx] || '';
      switch (hit.type) {
        case '六沖': return \`大運支沖\${label}，此運變動較大，宜穩守、忌激進。\`;
        case '六合': return \`大運支與\${label}相合，人緣與合作機會增多。\`;
        case '六害': return \`大運支害\${label}，留意口舌是非與小人。\`;
        case '三合': return \`大運支與\${label}三合相助，順勢而為多得貴人。\`;
        case '三會': return \`大運支與\${label}三會成方，同氣相求，動蕩中成勢。\`;
        case '刑':   return \`大運支刑\${label}，宜防訴訟、健康、與親緣摩擦。\`;
        default:     return '';
      }
    };
    const first = sorted[0];
    const second = sorted.find(h => h !== first && h.pillarIdx !== first.pillarIdx);
    const firstSentence = sentence(first);
    if (!second) return firstSentence;
    const gap = (WEIGHT[first.type] || 0) - (WEIGHT[second.type] || 0);
    if (gap <= 2) {
      const secondSentence = sentence(second);
      if (secondSentence) return \`\${firstSentence} 另\${secondSentence}\`;
    }
    return firstSentence;
  };

  let html = \`
    <div class="mb-4 p-4 rounded-xl bg-accent/5 border border-accent/10">
      <div class="text-xs text-accent/50 mb-1">起運時間</div>
      <div class="font-serif text-lg text-accent font-bold">\${yun.getStartYear()}年 \${yun.getStartMonth()}月 \${yun.getStartDay()}日</div>
      <div class="text-[10px] text-accent/35 mt-1">按\${gender === 1 ? '男命' : '女命'}與年干陰陽推算大運順逆。</div>
    </div>\`;

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

    const dyHits = detectBranchInteractions(dZhiChar, originZhiChars);
    const BADGE_WEIGHT = { '六沖': 6, '刑': 5, '六合': 4, '六害': 3, '三合': 2, '三會': 1 };
    const dyHitsSorted = dyHits.slice().sort((a, b) => (BADGE_WEIGHT[b.type] || 0) - (BADGE_WEIGHT[a.type] || 0));
    const BADGE_CAP = 6;
    const dyHitsVisible = dyHitsSorted.slice(0, BADGE_CAP);
    const dyHitsOverflow = Math.max(0, dyHitsSorted.length - BADGE_CAP);
    const badgesHTML = dyHitsVisible.length
      ? \`<div class="mt-2 flex flex-wrap gap-1.5">\${dyHitsVisible.map(h =>
          \`<span class="px-1.5 py-0.5 rounded text-[10px] \${TAG_STYLE[h.type] || 'bg-accent/10 text-accent/70 border border-accent/20'}>\${h.label}</span>\`
        ).join('')}\${dyHitsOverflow
          ? \`<span class="px-1.5 py-0.5 rounded text-[10px] bg-accent/10 text-accent/60 border border-accent/20">+\${dyHitsOverflow}</span>\`
          : ''}</div>\`
      : '';
    const interactionDesc = summarizeInteractions(dyHitsSorted);

    const baseDesc = isXi
      ? \`\${ganZhi}大運，干支五行與喜用神呼應，整體更利於順勢發展。\`
      : isJi
        ? \`\${ganZhi}大運，干支五行觸及忌神，宜保守布局，避免高風險決策。\`
        : \`\${ganZhi}大運，五行氣場中性，適合穩扎穩打、逐步積累。\`;
    const desc = baseDesc + (interactionDesc ? \` \${interactionDesc}\` : '');

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
      const lnHits = detectBranchInteractions(yZhiChar, originZhiChars);
      const tooltip = lnHits.length ? lnHits.map(h => h.label).join('、') : '';
      const titleAttr = tooltip ? \` title="\${tooltip}"\` : '';
      const hitDot = lnHits.length ? '<span class="inline-block w-1 h-1 rounded-full bg-accent ml-1 align-middle"></span>' : '';
      return \`<div class="\${yBg} p-1 rounded \${yColor}"\${titleAttr}>\${ln.getYear()}<br>\${lnGz}<br>\${yFortune}\${hitDot}</div>\`;
    }).join('');

    html += \`
      <div class="p-4 border \${borderColor} \${bgColor} rounded-lg">
        <h4 class="font-bold \${textColor} text-sm mb-2">
          <i class="fas fa-\${isCurrent ? 'arrow-up' : (isFuture ? 'arrow-right' : 'history')} mr-2"></i>
          \${dy.getStartAge()}歲起 · \${startYear} - \${endYear} (\${ganZhi}大運)\${tag}
        </h4>
        \${badgesHTML}
        <p class="text-xs text-accent/70 leading-relaxed mt-2">\${desc}</p>
        <div class="mt-3 grid grid-cols-5 gap-2 text-center text-[10px]">\${yearsHtml}</div>
      </div>\`;
  });

  container.innerHTML = html || '<p class="text-center text-accent/50 text-sm">請先進行排盤分析</p>';
}

export function renderWealth() {
  if (!state.baziResult) return;
  const container = document.getElementById('wealthContent');
  
  const dayWX = state.baziResult.dayGanWX;
  let wealthWX = '';
  if (dayWX === '金') wealthWX = '木';
  if (dayWX === '木') wealthWX = '土';
  if (dayWX === '水') wealthWX = '火';
  if (dayWX === '火') wealthWX = '金';
  if (dayWX === '土') wealthWX = '水';

  const wealthCount = state.baziResult.wxCount[wealthWX] || 0;
  
  const kuList = ['辰', '戌', '丑', '未'];
  let myKu = [];
  state.baziResult.pillars.forEach(p => {
    let zhi = DZ[p.zhi];
    if (kuList.includes(zhi)) {
      myKu.push(zhi);
    }
  });

  let score = 60;
  if (wealthCount > 0) score += 15;
  if (wealthCount > 1) score += 10;
  score += myKu.length * 5;
  
  if (state.baziResult.isStrong && wealthCount > 0) score += 10;
  if (!state.baziResult.isStrong && wealthCount > 2) score -= 10;
  
  score = Math.min(99, Math.max(40, score));

  let levelText = score >= 85 ? '大富之命' : (score >= 70 ? '中富之命' : '小富安康');
  let levelColor = score >= 85 ? 'text-fire' : 'text-accent';

  let kuHtml = '';
  if (myKu.length > 0) {
    kuHtml = \`您的命局自帶財庫：<span class="font-bold text-earth">\${myKu.join('、')}</span>，擅長守財，晚年易有豐厚積累。\`;
  } else {
    kuHtml = \`您的命局暫無明現財庫，建議養成儲蓄習慣，或通過購置固定資產來守住財富。\`;
  }

  let advice = '';
  if (wealthWX === '金') advice = '適合金融、五金、汽車、珠寶等行業。投資偏向穩健的理財產品。';
  if (wealthWX === '木') advice = '適合教育、文化、林業、醫療等行業。投資可考慮長期持有的資產。';
  if (wealthWX === '水') advice = '適合物流、貿易、互聯網、餐飲等流動性強的行業。求財需靈活應變。';
  if (wealthWX === '火') advice = '適合科技、互聯網、電力、美業等行業。投資眼光獨到，適合新興領域。';
  if (wealthWX === '土') advice = '適合房地產、農業、建築、礦產等實體行業。投資以固定資產爲佳。';

  let html = \`
    <div class="text-center mb-6">
      <div class="inline-block relative">
        <svg width="120" height="120" viewBox="0 0 120 120" class="transform -rotate-90">
          <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,215,0,0.1)" stroke-width="8"></circle>
          <circle cx="60" cy="60" r="50" fill="none" stroke="var(--fire)" stroke-width="8" stroke-dasharray="\${score * 3.14} 400"></circle>
        </svg>
        <div class="absolute inset-0 flex flex-col items-center justify-center">
          <span class="text-3xl font-bold \${levelColor}">\${score}</span>
          <span class="text-[10px] text-accent/50">財富指數</span>
        </div>
      </div>
      <div class="mt-2 text-sm font-bold \${levelColor}">\${levelText}</div>
    </div>

    <div class="bg-black/20 p-4 rounded-xl mb-4 border border-accent/10">
      <h4 class="text-accent text-sm font-bold mb-2"><i class="fas fa-search-dollar mr-2"></i>財星解析</h4>
      <p class="text-xs text-accent/80 leading-relaxed mb-2">您的財星五行爲：<span class="font-bold text-accent" style="color:\${WX_COLORS[wealthWX]}">\${wealthWX}</span>。命局中財星數量為 \${Math.round(wealthCount)}。</p>
      <p class="text-xs text-accent/80 leading-relaxed">\${state.baziResult.isStrong ? '您屬於「身強」能擔財，只要努力打拼，多能獲得豐厚回報。' : '您屬於「身弱」，求財不宜貪大求快，適合團隊合作或借力打力。'}</p>
    </div>

    <div class="bg-black/20 p-4 rounded-xl mb-4 border border-accent/10">
      <h4 class="text-accent text-sm font-bold mb-2"><i class="fas fa-box-open mr-2"></i>財庫分析</h4>
      <p class="text-xs text-accent/80 leading-relaxed">\${kuHtml}</p>
    </div>

    <div class="bg-black/20 p-4 rounded-xl border border-accent/10">
      <h4 class="text-accent text-sm font-bold mb-2"><i class="fas fa-chart-line mr-2"></i>求財方向</h4>
      <p class="text-xs text-accent/80 leading-relaxed">\${advice}</p>
    </div>
  \`;

  container.innerHTML = html;
}

export function generateAiReport() {
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

      if (state.baziResult) {
        const daYun = calculateDecadeFortune(
          {
            dayGan: state.baziResult.dayGan,
            solar: state.baziResult.meta.solar,
            lunar: state.baziResult.meta.lunar,
            eightChar: state.baziResult.meta.eightChar
          },
          state.baziResult.gender === 1 ? 'male' : 'female'
        );
      }
      document.getElementById('aiReportResult').classList.remove('hidden');
      renderAiReportContent();
    }, 500);
  }, 4000);
}

export function renderAiReportContent() {
  const container = document.getElementById('aiReportContent');
  const dWX = state.baziResult.dayGanWX;
  const isS = state.baziResult.isStrong;
  const luckyWX = getPrimaryLuckyElement(state.baziResult.xiYong);

  let html = '';

  if (window.currentLang === 'en') {
    html = \`
      <h4 class="text-lg font-serif text-accent font-bold mb-4 border-b border-accent/20 pb-2">1. Overall Chart Summary</h4>
      <p>Your Day Master is \${dWX}, born in \${DZ[state.baziResult.monthZhi]} Month. The overall chart belongs to a \${isS ? 'Strong' : 'Weak'} Day Master pattern. The key characteristic of this destiny lies in its inner resilience and potential. \${isS ? 'You naturally possess strong stress resistance and independent spirit, suitable for pioneering work.' : 'You excel at leveraging resources and have a delicate mindset, suitable for playing a core coordinating role in teams.'}</p>

      <h4 class="text-lg font-serif text-accent font-bold mt-6 mb-4 border-b border-accent/20 pb-2">2. Wealth and Career Analysis</h4>
      <p>From the wealth vault and fortune cycle trends, your wealth accumulation belongs to a “\${state.baziResult.wxCount['金'] > 1 ? 'Breakthrough' : 'Steady'}” pattern. In the next 3-5 years, you will experience a significant career advancement period. When handling finances, seek professional advice and avoid following trends blindly.</p>
      <p class="mt-2"><strong>Career Direction:</strong> Your favorable element is \${luckyWX}, making you highly suitable for related industries. In the workplace, you will easily encounter benefactor support, but beware of jealousy from difficult people.</p>

      <h4 class="text-lg font-serif text-accent font-bold mt-6 mb-4 border-b border-accent/20 pb-2">3. Relationships and Marriage</h4>
      <p>Your approach to relationships is relatively \${isS ? 'active and assertive' : 'passive and delicate'}. The chart shows that your true love appears in the \${Math.random() > 0.5 ? 'East or Southeast' : 'West or Northwest'}. In marriage, pay attention to communication styles to avoid unnecessary conflicts due to stubbornness.</p>

      <h4 class="text-lg font-serif text-accent font-bold mt-6 mb-4 border-b border-accent/20 pb-2">4. Personalized Improvement Guide</h4>
      <ul class="list-disc pl-5 space-y-2">
        <li><strong>Lucky Colors:</strong> Wear more clothing in \${LUCKY_DATA[luckyWX].colors.join(', ')} colors.</li>
        <li><strong>Direction Choice:</strong> Your bed head or desk should face \${LUCKY_DATA[luckyWX].dir}.</li>
        <li><strong>Daily Suggestion:</strong> Maintain regular sleep schedule and wear accessories like \${DRESS_COLORS[luckyWX].acc[0]} to enhance your energy field.</li>
      </ul>

      <div class="mt-6 p-4 bg-accent/10 rounded-lg text-xs text-accent/60">
        <i class="fas fa-gift mr-2"></i> Full demo report is free during the promotion period.
      </div>
    \`;
  } else {
    html = \`
      <h4 class="text-lg font-serif text-accent font-bold mb-4 border-b border-accent/20 pb-2">一、 命局總評</h4>
      <p>您的日主為\${dWX}，生於\${DZ[state.baziResult.monthZhi]}月。整體命局屬於\${isS ? '身強' : '身弱'}之格。此命格最大的特點在於其內在的韌性與潛力。\${isS ? '您天生具備較強的抗壓能力與獨立精神，適合開創性的工作。' : '您善於借力打力，心思細膩，適合在團隊中發揮核心協調作用。'}</p>

      <h4 class="text-lg font-serif text-accent font-bold mt-6 mb-4 border-b border-accent/20 pb-2">二、 財運與事業剖析</h4>
      <p>從財庫與大運走勢來看，您的財富積累屬於”\${state.baziResult.wxCount['金'] > 1 ? '爆發型' : '穩健型'}”。在未來的3-5年內，將會迎來一波較為明顯的事業上升期。建議在處理財務時，多聽取專業人士意見，避免盲目跟風。</p>
      <p class="mt-2"><strong>事業方向建議：</strong> 您的喜用神為 \${luckyWX}，非常適合從事與之相關的行業。在職場中，您容易遇到貴人提攜，但需注意防範小人嫉妒。</p>

      <h4 class="text-lg font-serif text-accent font-bold mt-6 mb-4 border-b border-accent/20 pb-2">三、 婚姻與感情歸宿</h4>
      <p>您的感情觀較為\${isS ? '主動且強勢' : '被動且細膩'}。命盤顯示，您的正緣出現在\${Math.random() > 0.5 ? '東方或東南方' : '西方或西北方'}。婚姻生活中，需多注意溝通方式，避免因固執己見而產生不必要的摩擦。</p>

      <h4 class="text-lg font-serif text-accent font-bold mt-6 mb-4 border-b border-accent/20 pb-2">四、 專屬改運指導</h4>
      <ul class="list-disc pl-5 space-y-2">
        <li><strong>色彩開運：</strong> 多穿戴 \${LUCKY_DATA[luckyWX].colors.join('、')} 色的服飾。</li>
        <li><strong>方位選擇：</strong> 床頭或辦公桌宜朝向 \${LUCKY_DATA[luckyWX].dir}。</li>
        <li><strong>日常建議：</strong> 保持規律作息，適當佩戴 \${DRESS_COLORS[luckyWX].acc[0]} 等飾品以增強自身氣場。</li>
      </ul>

      <div class="mt-6 p-4 bg-accent/10 rounded-lg text-xs text-accent/60">
        <i class="fas fa-gift mr-2"></i> 推廣期完整版示範報告已免費開放。
      </div>
    \`;
  }

  container.innerHTML = html;
}

export function downloadAiReport() {
  const message = window.currentLang === 'en'
    ? 'Generating PDF, please wait... (demo feature)'
    : '正在生成 PDF，請稍候... (此為演示功能)';
  window.showToast(message);
}

export function tossZhijiao() {
  const btn = document.getElementById('btnToss');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>神明感應中...';
  document.getElementById('zhijiaoResult').classList.add('hidden');
  
  const jL = document.getElementById('jiaoLeft');
  const jR = document.getElementById('jiaoRight');
  
  jL.style.transform = '';
  jR.style.transform = '';
  
  const container = document.getElementById('jiaoContainer');
  container.classList.remove('tossing');
  void container.offsetWidth;
  container.classList.add('tossing');
  
  setTimeout(() => {
    container.classList.remove('tossing');
    
    const resL = Math.random() > 0.5 ? 1 : 0;
    const resR = Math.random() > 0.5 ? 1 : 0;
    
    const rotZL = (Math.random() * 40 - 20) + 'deg';
    const rotZR = (Math.random() * 40 - 20) + 'deg';
    
    jL.style.transform = \`rotateY(\${resL ? 180 : 0}deg) rotateZ(\${rotZL})\`;
    jR.style.transform = \`rotateY(\${resR ? 180 : 0}deg) rotateZ(\${rotZR})\`;
    
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
    document.getElementById('zjTitle').className = \`font-serif text-3xl font-bold mb-2 \${color}\`;
    document.getElementById('zjDesc').textContent = desc;
    
    resDiv.classList.remove('hidden');
    btn.innerHTML = '<i class="fas fa-hand-sparkles mr-2"></i>誠心擲筊';
    btn.disabled = false;
    
  }, 800);
}

export function resetZhijiao() {
  document.getElementById('zhijiaoResult').classList.add('hidden');
  const jL = document.getElementById('jiaoLeft');
  const jR = document.getElementById('jiaoRight');
  const btn = document.getElementById('btnToss');
  jL.style.transform = '';
  jR.style.transform = '';
  btn.innerHTML = '<i class="fas fa-hand-sparkles mr-2"></i>誠心擲筊';
  btn.disabled = false;
}

export function calculateHehun() {
  const otherDate = document.getElementById('hehunDate').value;
  const otherHour = document.getElementById('hehunHour').value;
  
  if (!otherDate || otherHour === "") {
    window.showToast('請選擇對方的出生日期和時辰', 'error');
    return;
  }
  
  const btn = document.querySelector('#hehunModal .btn-primary');
  btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>測算中...';
  btn.disabled = true;
  
  let parts = otherDate.split('-');
  let year = parseInt(parts[0]), month = parseInt(parts[1]), day = parseInt(parts[2]);
  let hourZhi = parseInt(otherHour);
  
  let otherPillars = window.getPillarsUsingLunar(year, month, day, hourZhi);
  let otherWxCount = countWuXing(otherPillars);
  
  let maxWx = '木';
  let maxVal = 0;
  for (let wx in otherWxCount) {
    if (otherWxCount[wx] > maxVal) {
      maxVal = otherWxCount[wx];
      maxWx = wx;
    }
  }
  
  let myMaxWx = '木';
  let myMaxVal = 0;
  for (let wx in state.baziResult.wxCount) {
    if (state.baziResult.wxCount[wx] > myMaxVal) {
      myMaxVal = state.baziResult.wxCount[wx];
      myMaxWx = wx;
    }
  }
  
  let score = 60;
  let desc = "";
  
  let myXi = state.baziResult.xiYong.xi;
  let myYong = getPrimaryLuckyElement(state.baziResult.xiYong);
  if (Array.isArray(myXi)) myXi = myXi[0];
  if (Array.isArray(myYong)) myYong = myYong[0];
  
  if (maxWx === myXi || maxWx === myYong) {
    score += 25;
    desc = \`對方八字\${maxWx}旺，正好是您的喜用神，能爲您帶來極大的幫助與好運。\`;
  } else if (state.baziResult.xiYong.ji.includes(maxWx)) {
    score -= 15;
    desc = \`對方八字\${maxWx}旺，恰爲您的忌神，相處中可能會有一些摩擦，需要多包容。\`;
  } else {
    score += 10;
    desc = \`雙方五行相對平衡，屬於平穩互助的組合。\`;
  }
  
  score += Math.floor(Math.random() * 10) - 5;
  score = Math.max(40, Math.min(99, score));
  
  let level = score >= 80 ? "上等婚" : (score >= 60 ? "中等婚" : "下等婚");
  
  setTimeout(() => {
    const resDiv = document.getElementById('hehunResult');
    resDiv.innerHTML = \`
      <div class="flex justify-center items-center gap-4 mb-4">
        <div class="text-center"><div class="w-10 h-10 rounded-full bg-black/20 border border-accent/30 text-accent flex items-center justify-center mx-auto mb-1">我</div><span class="text-xs text-accent/70">\${myMaxWx}旺</span></div>
        <div class="text-2xl text-fire animate-pulse"><i class="fas fa-heart"></i></div>
        <div class="text-center"><div class="w-10 h-10 rounded-full bg-black/20 border border-accent/30 text-accent flex items-center justify-center mx-auto mb-1">Ta</div><span class="text-xs text-accent/70">\${maxWx}旺</span></div>
      </div>
      <p class="text-center text-sm text-accent mb-2">契合度：<span class="font-bold text-xl text-fire">\${score}%</span> (\${level})</p>
      <p class="text-xs text-accent/60 text-justify leading-relaxed">\${desc}</p>
    \`;
    
    resDiv.classList.remove('hidden');
    btn.innerHTML = '<i class="fas fa-check mr-2"></i>測算完成';
  }, 1500);
}

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

export function generateNames() {
  const ln = document.getElementById('lastName').value.trim();
  const safeLn = escapeHTML(ln);
  if(!ln) return window.showToast('請輸入姓氏', 'error');
  
  const gender = document.getElementById('gender').value;
  const btn = document.querySelector('#qimingModal .btn-primary');
  btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>匹配詩經楚辭...';
  btn.disabled = true;
  
  let xi = state.baziResult.xiYong.xi;
  let yong = getPrimaryLuckyElement(state.baziResult.xiYong);
  
  if (Array.isArray(xi)) xi = xi[0];
  if (Array.isArray(yong)) yong = yong[0];
  
  let primaryWx = NAME_DICT[xi] ? xi : '木';
  let secondaryWx = NAME_DICT[yong] ? yong : '水';

  const xiYongText = document.getElementById('qimingXiYongText');
  xiYongText.innerHTML = \`
    <span style="color:\${WX_COLORS[primaryWx]}">\${primaryWx}</span> 
    <span style="color:\${WX_COLORS[secondaryWx]}">\${secondaryWx}</span>
  \`;
  
  const generateCard = (wx1, wx2) => {
    const list1 = NAME_DICT[wx1][gender] || NAME_DICT['木']['男'];
    const list2 = NAME_DICT[wx2][gender] || NAME_DICT['水']['男'];
    
    const char1 = list1[Math.floor(Math.random() * list1.length)];
    const char2 = list2[Math.floor(Math.random() * list2.length)];
    
    const borderColor = WX_COLORS[wx1];
    
    return \`
      <div class="p-3 bg-black/20 rounded border text-center" style="border-color:\${borderColor}40">
        <div class="text-lg font-serif text-accent mb-1 tracking-widest">\${safeLn} \${char1} \${char2}</div>
        <div class="text-[10px] flex justify-center gap-2">
          <span style="color:\${WX_COLORS[wx1]}">\${wx1}</span>
          <span style="color:\${WX_COLORS[wx2]}">\${wx2}</span>
        </div>
      </div>
    \`;
  };

  const cardsContainer = document.getElementById('qimingCards');
  cardsContainer.innerHTML = '';
  
  setTimeout(() => {
    let html = '';
    html += generateCard(primaryWx, secondaryWx);
    html += generateCard(secondaryWx, primaryWx);
    html += generateCard(primaryWx, primaryWx);
    html += generateCard(secondaryWx, secondaryWx);
    
    cardsContainer.innerHTML = html;
    
    document.getElementById('qimingResult').classList.remove('hidden');
    btn.innerHTML = '<i class="fas fa-check mr-2"></i>生成完畢';
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-magic mr-2"></i>換一批';
  }, 1000);
}

export function drawQian() {
  const tong = document.getElementById('qianTong');
  tong.classList.add('form-shake');
  
  setTimeout(() => {
    tong.classList.remove('form-shake');
    tong.classList.add('hidden');
    
    const qianData = [
      { t: '上上籤', p: '春風得意馬蹄疾，一日看盡長安花。', e: '今日運勢極旺，五行能量與您完美契合。所求之事多能順遂，適合大膽推進核心計劃。' },
      { t: '上吉籤', p: '乘風破浪會有時，直掛雲帆濟滄海。', e: '今日您的貴人運強勁，雖有小波折，但最終都能化險爲夷，逢凶化吉。' },
      { t: '中吉籤', p: '有心栽花花不開，無心插柳柳成蔭。', e: '今日不宜強求，順其自然反而會有意外之喜。適合做一些輕鬆的籌備工作。' },
      { t: '中平籤', p: '行到水窮處，坐看雲起時。', e: '今日運勢平穩，五行能量無大沖大合。適合靜心學習、覆盤，不宜做重大決策。' },
      { t: '下下籤', p: '路漫漫其修遠兮，吾將上下而求索。', e: '今日流日干支與您命局有所沖剋。建議保持低調，少說話多做事，避免與人發生口角。' }
    ];
    
    const result = qianData[Math.floor(Math.random() * qianData.length)];
    
    const tr = typeof window.translateText === 'function' ? window.translateText : t => t;
    document.getElementById('qianTitle').textContent = tr(result.t);
    document.getElementById('qianTitle').className = \`font-serif text-3xl font-bold mb-2 \${result.t.includes('下') ? 'text-fire' : 'text-accent'}\`;
    document.getElementById('qianPoem').textContent = tr(result.p);
    const explainPrefix = tr('解析：');
    const explainContent = tr(result.e);
    document.getElementById('qianExplain').textContent = explainPrefix + explainContent;
    
    document.getElementById('qianResult').classList.remove('hidden');
  }, 800);
}

export function generateLuckyNum() {
  const btn = document.getElementById('btnGenNum');
  btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>生成中...';
  btn.disabled = true;
  
  setTimeout(() => {
    let xi = state.baziResult.xiYong.xi;
    let yong = getPrimaryLuckyElement(state.baziResult.xiYong);
    if (Array.isArray(xi)) xi = xi[0];
    if (Array.isArray(yong)) yong = yong[0];
    
    const wxNums = {
      '水': [1, 6], '火': [2, 7], '木': [3, 8], '金': [4, 9], '土': [5, 0]
    };
    
    let pool = [...(wxNums[xi] || []), ...(wxNums[yong] || []), 0,1,2,3,4,5,6,7,8,9];
    
    let nums = [];
    for(let i=0; i<6; i++) {
      nums.push(pool[Math.floor(Math.random() * pool.length)]);
    }
    
    const container = document.getElementById('numBalls');
    container.innerHTML = nums.map(n => 
      \`<div class="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-earth text-bg flex items-center justify-center font-bold text-xl shadow-[0_0_15px_rgba(255,215,0,0.5)] transform hover:scale-110 transition-transform cursor-default">\${n}</div>\`
    ).join('');
    
    btn.classList.add('hidden');
    document.getElementById('numResult').classList.remove('hidden');
    
    btn.innerHTML = '<i class="fas fa-dice mr-2"></i>點擊生成';
    btn.disabled = false;
  }, 600);
}

export async function generatePoster() {
  if (!checkVipBeforeFeature('poster')) return;

  window.showModal('posterModal');
  const resultDiv = document.getElementById('posterResult');
  resultDiv.innerHTML = '<div class="py-20 text-center text-accent/50"><i class="fas fa-spinner fa-spin text-3xl mb-2"></i><br>海報生成中...</div>';
  try {
    await ensurePosterDependencies();
  
    document.getElementById('posterDayMaster').textContent = TG[state.baziResult.dayGan] + WX_GAN[state.baziResult.dayGan];
    document.getElementById('posterStrength').textContent = state.baziResult.strength.isStrong ? '身強' : '身弱';
    document.getElementById('posterDesc').textContent = document.getElementById('strengthText').textContent.substring(0, 80) + '...';
    
    const inviteCode = (typeof window.currentUser !== 'undefined' && window.currentUser) ? window.currentUser.invite_code : 'DEMO';
    const refLink = encodeURIComponent(\`\${window.location.origin}/?ref=\${inviteCode}\`);
    
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
