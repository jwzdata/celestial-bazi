import { state } from './modules/state.js';
import { analyze, initParticles, refreshTip, copyTip, initBottomNav, initModalSwipe } from './modules/form.js';
import { renderCalendar } from './modules/calendar-ui.js';
import { tossZhijiao, resetZhijiao, calculateHehun, generateNames, drawQian, generateLuckyNum, generatePoster, checkVipBeforeFeature, showFeature, generateAiReport, downloadAiReport } from './modules/features-ui.js';
import { updateLongitudeFromCity, initCityDatalist, transitionSection, findCityLongitude } from './modules/utils.js';

window.analyze = analyze;
window.copyTip = copyTip;
window.generateAiReport = generateAiReport;
window.calculateHehun = calculateHehun;
window.tossZhijiao = tossZhijiao;
window.drawQian = drawQian;
window.generateNames = generateNames;
window.generateLuckyNum = generateLuckyNum;
window.generatePoster = generatePoster;
window.showFeature = showFeature;
window.checkVipBeforeFeature = checkVipBeforeFeature;
window.downloadAiReport = downloadAiReport;
window.renderCalendar = renderCalendar;
window.updateLongitudeFromCity = updateLongitudeFromCity;
window.state = state; // Expose state for debugging or backward compatibility

document.addEventListener('DOMContentLoaded', () => {
  initParticles();
  refreshTip();
  initBottomNav();
  initModalSwipe();
  initCityDatalist();
  updateLongitudeFromCity();

  let today = new Date();
  let dateStr = today.toISOString().split('T')[0];
  let inputDateEl = document.getElementById('inputDate');
  if (inputDateEl && !inputDateEl.value) {
    inputDateEl.value = dateStr;
  }
});

const btnAnalyze = document.getElementById('btnAnalyze');
if (btnAnalyze) {
  btnAnalyze.addEventListener('click', analyze);
}

const btnReset = document.getElementById('btnReset');
if (btnReset) {
  btnReset.addEventListener('click', () => {
    transitionSection(
      document.getElementById('resultSection'),
      document.getElementById('heroSection')
    );
    btnReset.classList.add('hidden');
    const analyzeBtn = document.getElementById('btnAnalyze');
    analyzeBtn.disabled = false;
    analyzeBtn.textContent = '開始解析';
    const nav = document.getElementById('bottomNav');
    if (nav) nav.classList.add('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

const calPrev = document.getElementById('calPrev');
if (calPrev) {
  calPrev.addEventListener('click', () => {
    state.calMonth--;
    if (state.calMonth < 0) {
      state.calMonth = 11;
      state.calYear--;
    }
    renderCalendar();
  });
}

const calNext = document.getElementById('calNext');
if (calNext) {
  calNext.addEventListener('click', () => {
    state.calMonth++;
    if (state.calMonth > 11) {
      state.calMonth = 0;
      state.calYear++;
    }
    renderCalendar();
  });
}

const calBackToday = document.getElementById('calBackToday');
if (calBackToday) {
  calBackToday.addEventListener('click', () => {
    state.calYear = new Date().getFullYear();
    state.calMonth = new Date().getMonth();
    renderCalendar();
  });
}

const inputDate = document.getElementById('inputDate');
if (inputDate) inputDate.addEventListener('keydown', e => { if (e.key === 'Enter') analyze(); });

const inputTime = document.getElementById('inputTime');
if (inputTime) inputTime.addEventListener('keydown', e => { if (e.key === 'Enter') analyze(); });

const inputLongitude = document.getElementById('inputLongitude');
if (inputLongitude) inputLongitude.addEventListener('keydown', e => { if (e.key === 'Enter') analyze(); });

const cityInput = document.getElementById('inputCity');
if (cityInput) {
  cityInput.addEventListener('change', () => updateLongitudeFromCity());
  cityInput.addEventListener('input', () => {
    window.clearTimeout(state.cityLookupTimer);
    const longitudeEl = document.getElementById('inputLongitude');
    const localLongitude = findCityLongitude(cityInput.value);
    if (localLongitude != null) {
      longitudeEl.value = localLongitude;
      return;
    }
    longitudeEl.value = '';
    state.cityLookupTimer = window.setTimeout(() => updateLongitudeFromCity({ silent: true }), 600);
  });
}
