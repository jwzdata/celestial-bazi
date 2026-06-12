// ============================
// 紫微斗数UI交互逻辑
// ============================

// 确保依赖已加载
import { generateZiweiChart } from './algorithm.js';
import { ZIWEI_CONSTANTS } from './constants.js';
const ZIWEI_UI_ALGORITHM = { generateZiweiChart };
const ZIWEI_UI_CONSTANTS = ZIWEI_CONSTANTS;

// 全局状态
let currentZiweiChart = null;

// UI初始化
function initZiweiUI() {
  console.log('初始化紫微斗数UI...');

  // 绑定表单提交事件
  const form = document.getElementById('ziweiForm');
  if (form) {
    form.addEventListener('submit', handleFormSubmit);
  }

  // 绑定操作按钮事件
  bindActionButtons();

  // 初始化城市数据（复用八字项目的数据）
  initCityData();

  console.log('紫微斗数UI初始化完成');
}

// 绑定操作按钮事件
function bindActionButtons() {
  const downloadBtn = document.getElementById('ziweiDownload');
  const shareBtn = document.getElementById('ziweiShare');
  const recalculateBtn = document.getElementById('ziweiReCalculate');

  if (downloadBtn) {
    downloadBtn.addEventListener('click', handleDownload);
  }

  if (shareBtn) {
    shareBtn.addEventListener('click', handleShare);
  }

  if (recalculateBtn) {
    recalculateBtn.addEventListener('click', handleRecalculate);
  }
}

// 初始化城市数据
function initCityData() {
  const cityInput = document.getElementById('ziweiCity');
  const longitudeInput = document.getElementById('ziweiLongitude');

  if (cityInput && longitudeInput) {
    // 检查是否有八字项目的城市数据
    if (typeof CITY_LONGITUDES !== 'undefined') {
      cityInput.addEventListener('change', function() {
        const city = this.value.trim();
        if (CITY_LONGITUDES[city] && !longitudeInput.value) {
          longitudeInput.value = CITY_LONGITUDES[city];
        }
      });
    }
  }
}

// 处理表单提交
async function handleFormSubmit(e) {
  e.preventDefault();

  // 显示加载状态
  showLoading(true);
  hideResult();

  try {
    // 获取表单数据
    const formData = getFormData();

    // 验证数据
    if (!validateFormData(formData)) {
      throw new Error('请填写完整的出生信息');
    }

    // 计算紫微斗数命盘
    const chart = await calculateZiweiChart(formData);

    // 显示结果
    displayZiweiResult(chart);

  } catch (error) {
    console.error('紫微斗数计算失败:', error);
    alert('计算失败: ' + error.message);
  } finally {
    showLoading(false);
  }
}

// 获取表单数据
function getFormData() {
  const dateInput = document.getElementById('ziweiDate');
  const timeInput = document.getElementById('ziweiTime');
  const genderInputs = document.querySelectorAll('input[name="gender"]');
  const cityInput = document.getElementById('ziweiCity');
  const longitudeInput = document.getElementById('ziweiLongitude');
  const nameInput = document.getElementById('ziweiName');

  // 解析日期和时间
  const [year, month, day] = dateInput.value.split('-').map(Number);
  const [hourStr, minuteStr] = timeInput.value.split(':');
  const hour = parseInt(hourStr);

  // 获取性别
  let gender = 'male';
  genderInputs.forEach(input => {
    if (input.checked) gender = input.value;
  });

  // 计算时辰（地支索引）
  const shichenIndex = getShichenIndex(hour, parseInt(minuteStr));

  return {
    year,
    month,
    day,
    hour: shichenIndex,
    gender,
    name: nameInput.value.trim(),
    city: cityInput.value.trim(),
    longitude: longitudeInput.value ? parseFloat(longitudeInput.value) : undefined
  };
}

// 获取时辰索引
function getShichenIndex(hour, minute) {
  const totalMinutes = hour * 60 + minute;

  // 时辰对应表
  const shichenRanges = [
    { start: 23 * 60, end: 1 * 60 + 59, index: 0 },   // 子时 23:00-01:59
    { start: 1 * 60, end: 3 * 60 + 59, index: 1 },    // 丑时 01:00-03:59
    { start: 3 * 60, end: 5 * 60 + 59, index: 2 },    // 寅时 03:00-05:59
    { start: 5 * 60, end: 7 * 60 + 59, index: 3 },    // 卯时 05:00-07:59
    { start: 7 * 60, end: 9 * 60 + 59, index: 4 },    // 辰时 07:00-09:59
    { start: 9 * 60, end: 11 * 60 + 59, index: 5 },   // 巳时 09:00-11:59
    { start: 11 * 60, end: 13 * 60 + 59, index: 6 },  // 午时 11:00-13:59
    { start: 13 * 60, end: 15 * 60 + 59, index: 7 },  // 未时 13:00-15:59
    { start: 15 * 60, end: 17 * 60 + 59, index: 8 },  // 申时 15:00-17:59
    { start: 17 * 60, end: 19 * 60 + 59, index: 9 },  // 酉时 17:00-19:59
    { start: 19 * 60, end: 21 * 60 + 59, index: 10 }, // 戌时 19:00-21:59
    { start: 21 * 60, end: 23 * 60 + 59, index: 11 }  // 亥时 21:00-23:59
  ];

  // 处理跨日的子时
  if (totalMinutes >= 23 * 60 || totalMinutes <= 1 * 60 + 59) {
    return 0;
  }

  for (const range of shichenRanges) {
    if (totalMinutes >= range.start && totalMinutes <= range.end) {
      return range.index;
    }
  }

  return 6; // 默认午时
}

// 验证表单数据
function validateFormData(data) {
  return data.year && data.month && data.day && data.hour !== undefined;
}

// 计算紫微斗数命盘
async function calculateZiweiChart(formData) {
  try {
    // 尝试使用完整算法
    const chart = ZIWEI_UI_ALGORITHM.generateZiweiChart(formData);

    // 如果iztro不可用，使用简化算法
    if (chart.error && chart.error.includes('iztro')) {
      console.warn('iztro不可用，使用简化算法');
      return ZIWEI_UI_ALGORITHM.generateSimpleZiweiChart(formData);
    }

    return chart;
  } catch (error) {
    console.warn('完整算法失败，使用简化算法:', error);
    return ZIWEI_UI_ALGORITHM.generateSimpleZiweiChart(formData);
  }
}

// 显示加载状态
function showLoading(show) {
  const loadingEl = document.getElementById('ziweiLoading');
  const formSection = document.querySelector('.ziwei-form-section');

  if (loadingEl) {
    loadingEl.style.display = show ? 'block' : 'none';
  }

  if (formSection) {
    formSection.style.display = show ? 'none' : 'block';
  }
}

// 显示结果
function displayZiweiResult(chart) {
  currentZiweiChart = chart;

  // 显示结果区域
  const resultEl = document.getElementById('ziweiResult');
  if (resultEl) {
    resultEl.style.display = 'flex';
  }

  // 填充基本信息
  displayBasicInfo(chart);

  // 生成命盘图
  displayZiweiChart(chart);

  // 显示格局分析
  displayPatterns(chart);

  // 显示大限信息
  displayDaXian(chart);
}

// 隐藏结果
function hideResult() {
  const resultEl = document.getElementById('ziweiResult');
  if (resultEl) {
    resultEl.style.display = 'none';
  }
}

// 显示基本信息
function displayBasicInfo(chart) {
  const contentEl = document.getElementById('ziweiInfoContent');
  if (!contentEl) return;

  const birth = chart.birthInfo;
  const lunar = chart.lunarInfo;

  let html = `
    <div class="ziwei-info-grid">
      <div class="ziwei-info-item">
        <span class="ziwei-info-label">姓名：</span>
        <span class="ziwei-info-value">${birth.name || '未填写'}</span>
      </div>
      <div class="ziwei-info-item">
        <span class="ziwei-info-label">性别：</span>
        <span class="ziwei-info-value">${birth.gender === 'male' ? '男' : '女'}</span>
      </div>
      <div class="ziwei-info-item">
        <span class="ziwei-info-label">公历生日：</span>
        <span class="ziwei-info-value">${birth.year}年${birth.month}月${birth.day}日</span>
      </div>
      <div class="ziwei-info-item">
        <span class="ziwei-info-label">农历生日：</span>
        <span class="ziwei-info-value">${lunar.lunarYear}年${lunar.lunarMonth}月${lunar.lunarDay}日</span>
      </div>
      <div class="ziwei-info-item">
        <span class="ziwei-info-label">五行局：</span>
        <span class="ziwei-info-value">${chart.wuxingJuName}</span>
      </div>
      <div class="ziwei-info-item">
        <span class="ziwei-info-label">当前年龄：</span>
        <span class="ziwei-info-value">${chart.currentAge}岁</span>
      </div>
    </div>
  `;

  if (chart.isSimple) {
    html += `
      <div class="ziwei-warning">
        <p>⚠️ 当前使用简化算法，完整功能需要iztro库支持</p>
      </div>
    `;
  }

  contentEl.innerHTML = html;
}

// 生成命盘图
function displayZiweiChart(chart) {
  const chartEl = document.getElementById('ziweiChart');
  if (!chartEl) return;

  // 紫微斗数命盘布局（4x4外围十二宫，中间四格为天盘信息区）
  const layout = [
    5, 6, 7, 8,
    4, null, null, 9,
    3, null, null, 10,
    2, 1, 0, 11,
  ];

  let html = '<div class="ziwei-chart">';

  for (let i = 0; i < layout.length; i++) {
    const palaceIndex = layout[i];
    if (palaceIndex === null) {
      if (i === 5) {
        html += `
          <div class="ziwei-chart-center" aria-label="命盘摘要">
            <div class="ziwei-center-title">${chart.wuxingJuName}</div>
            <div class="ziwei-center-meta">命宫：${ZIWEI_UI_CONSTANTS.BRANCHES[chart.mingGongBranch]} · 身宫：${ZIWEI_UI_CONSTANTS.BRANCHES[chart.shenGongBranch]}</div>
            <div class="ziwei-center-meta">当前年龄：${chart.currentAge}岁</div>
          </div>
        `;
      }
      continue;
    }

    const palace = chart.palaces[palaceIndex];

    if (!palace) continue;

    const isMingGong = palace.isMingGong;
    const isShenGong = palace.isShenGong;
    const stemChar = ZIWEI_UI_CONSTANTS.STEMS[palace.stem];

    let palaceClass = 'ziwei-palace';
    if (isMingGong) palaceClass += ' ziwei-palace-minggong';
    if (isShenGong) palaceClass += ' ziwei-palace-shengong';

    html += `<div class="${palaceClass}">`;
    html += `<div class="ziwei-palace-name">${palace.name}</div>`;
    html += `<div class="ziwei-palace-stem">${stemChar}</div>`;

    if (palace.isEmpty) {
      html += `<div class="ziwei-palace-empty">空宫</div>`;
      if (palace.borrowedStars && palace.borrowedStars.length > 0) {
        html += `<div class="ziwei-palace-borrowed">借自${palace.borrowedFromName}</div>`;
      }
    } else {
      
      html += `<div class="ziwei-palace-stars">`;
      palace.stars.forEach(star => {
        let brightnessStr = '';
        if (star.type === 'major' && ZIWEI_UI_CONSTANTS.STAR_BRIGHTNESS && ZIWEI_UI_CONSTANTS.STAR_BRIGHTNESS[star.name]) {
           const bList = ZIWEI_UI_CONSTANTS.STAR_BRIGHTNESS[star.name];
           const b = bList[ZW.BRANCHES.indexOf(palace.branch)];
           if (b) brightnessStr = `<span class="ziwei-brightness">${b}</span>`;
        }
        
        let sihuaStr = star.siHua ? `<span class="ziwei-sihua ziwei-sihua-${star.siHua}">[${star.siHua}]</span>` : '';
        const starClass = `ziwei-star ziwei-star-${star.type}`;
        html += `<span class="${starClass}">${star.name}${brightnessStr}${sihuaStr}</span>`;
      });
      html += `</div>`;
      
      if (palace.selfSihua && palace.selfSihua.length > 0) {
        html += `<div class="ziwei-palace-self-sihua">自化: ${palace.selfSihua.map(s => s.siHua).join(',')}</div>`;
      }

    }

    html += `</div>`;
  }

  html += '</div>';
  chartEl.innerHTML = html;
}


// 显示格局分析
function displayPatterns(chart) {
  const patternsEl = document.getElementById('ziweiPatterns');
  if (!patternsEl) return;

  const patterns = chart.patterns || [];

  if (patterns.length === 0) {
    patternsEl.innerHTML = '<p class="ziwei-no-patterns">暂未识别到特殊格局</p>';
    return;
  }

  let html = '';
  patterns.forEach(pattern => {
    const levelClass = pattern.level === 'auspicious' ? 'ziwei-pattern-good' : (pattern.level === 'inauspicious' ? 'ziwei-pattern-bad' : 'ziwei-pattern-neutral');
    const brokenHtml = pattern.broken ? '<span class="ziwei-pattern-broken">（有破格）</span>' : '';
    html += `
      <div class="ziwei-pattern ${levelClass}">
        <div class="ziwei-pattern-name">${pattern.name}${brokenHtml}</div>
        <div class="ziwei-pattern-description">${pattern.description}</div>
      </div>
    `;
  });

  // 追加显示六线分析
  if (chart.axes && chart.axes.length > 0) {
    html += '<h4 class="ziwei-section-subtitle">宫位六线分析</h4><div class="ziwei-axes-container">';
    chart.axes.forEach(axis => {
      if (!axis.p1) return;
      const stars1 = axis.p1.stars.map(s => s.name).join(' ');
      const stars2 = axis.p2.stars.map(s => s.name).join(' ');
      html += `
        <div class="ziwei-axis-item">
          <div class="ziwei-axis-name">${axis.name}</div>
          <div class="ziwei-axis-desc">${axis.p1.name} [${stars1 || '空'}] ↔ ${axis.p2.name} [${stars2 || '空'}]</div>
        </div>
      `;
    });
    html += '</div>';
  }

  patternsEl.innerHTML = html;
}




// 显示大限信息
function displayDaXian(chart) {
  const daxianEl = document.getElementById('ziweiDaXian');
  if (!daxianEl) return;

  const daxians = chart.daXians || [];

  if (daxians.length === 0) {
    daxianEl.innerHTML = '<p class="ziwei-no-daxian">大限信息暂不可用</p>';
    return;
  }

  let html = '';
  daxians.forEach((daxian, index) => {
    const isCurrent = index === chart.currentDaXianIndex;
    const itemClass = isCurrent ? 'ziwei-daxian-item ziwei-daxian-current' : 'ziwei-daxian-item';

    html += `
      <div class="${itemClass}">
        <div class="ziwei-daxian-info">
          <div class="ziwei-daxian-age">${daxian.startAge}岁 - ${daxian.endAge}岁</div>
          <div class="ziwei-daxian-palace">${daxian.palaceName}</div>
        </div>
        ${isCurrent ? '<div class="ziwei-daxian-status">当前大限</div>' : ''}
      </div>
    `;
  });

  daxianEl.innerHTML = html;
}

// 处理下载
function handleDownload() {
  if (!currentZiweiChart) {
    alert('暂无命盘数据可下载');
    return;
  }

  // 简单的文本导出
  const data = JSON.stringify(currentZiweiChart, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `紫微斗数命盘_${currentZiweiChart.birthInfo.name || '匿名'}_${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// 处理分享
function handleShare() {
  if (!currentZiweiChart) {
    alert('暂无命盘数据可分享');
    return;
  }

  const text = `我的紫微斗数命盘分析 - 来自星曜命理`;

  if (navigator.share) {
    navigator.share({
      title: '紫微斗数命盘',
      text: text,
      url: window.location.href
    });
  } else {
    // 复制到剪贴板
    navigator.clipboard.writeText(text + ' ' + window.location.href).then(() => {
      alert('分享链接已复制到剪贴板');
    });
  }
}

// 处理重新计算
function handleRecalculate() {
  hideResult();
  showLoading(false);

  // 滚动到表单
  const formSection = document.querySelector('.ziwei-form-section');
  if (formSection) {
    formSection.scrollIntoView({ behavior: 'smooth' });
  }
}

// 导出UI函数
window.ZIWEI_UI = {
  initZiweiUI,
  calculateZiweiChart,
  displayZiweiResult
};

// 页面加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initZiweiUI);
} else {
  initZiweiUI();
}

window.initZiweiUI = initZiweiUI;
