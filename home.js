// Home: tomorrow's alarm for the visitor's city, worked out live with sun.js, and every
// section that repeats it. Defaults are the app's: sunrise, 30 min before, window 5:30 to 8:00.
const state = { city: homeCity(), anchor: 'sunrise', offset: -30, earliest: 330, latest: 480, day: 0, here: null };
const place = () => state.here || cityPlace(state.city);
const dayName = (y, m, d) => new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' });
// The app's rule: anchor plus offset, held inside the wake window; with no sun event, the latest time.
function alarmFor(y, m, d, p, anchor = state.anchor) {
  const ev = sunEvent(y, m, d, p.lat, p.lon, ALT[anchor], true);
  if (ev === null) return { min: state.latest, ev: null, held: 'polar' };
  const min = minutesInZone(ev, p.tz) + state.offset;
  if (min < state.earliest) return { min: state.earliest, ev, held: 'early' };
  if (min > state.latest) return { min: state.latest, ev, held: 'late' };
  return { min, ev, held: null };
}
function render() {
  const p = place();
  const [y, m, d] = dateInZone(1 + state.day, p.tz);
  const a = alarmFor(y, m, d, p);
  const t = hm(a.min);
  $('[data-f="time"]').textContent = t.t; $('[data-f="ampm"]').textContent = t.ap;
  $('[data-f="day"]').textContent = (state.day === 0 ? 'Tomorrow, ' : '') + dayName(y, m, d);
  $('[data-f="label"]').textContent = state.day === 0 ? 'Next alarm' : `In ${state.day + 1} days`;
  $('[data-f="sun"]').textContent = a.ev === null ? `no ${NAME[state.anchor]} that day` : `${NAME[state.anchor]} ${hm(minutesInZone(a.ev, p.tz)).t}`;
  // the reel: the mornings either side of this one
  const around = (o) => { const [Y, M, D] = dateInZone(1 + state.day + o, p.tz); const r = hm(alarmFor(Y, M, D, p).min); return [dayName(Y, M, D), `${r.t} ${r.ap}`]; };
  const [pd, pt] = around(-1), [nd, nt] = around(1);
  $('[data-f="prevday"]').textContent = state.day === 0 ? `This morning, ${pd}` : pd; $('[data-f="prevtime"]').textContent = pt;
  $('[data-f="nextday"]').textContent = nd; $('[data-f="nexttime"]').textContent = nt;
  const w = `${hm(state.earliest).t} to ${hm(state.latest).t}`;
  $('[data-f="note"]').innerHTML = a.held === 'early' ? `<b>Held at ${hm(state.earliest).t}</b>, the earliest in your window.` : a.held === 'late' ? `<b>Held at ${hm(state.latest).t}</b>, the latest in your window.` : a.held === 'polar' ? `<b>No ${NAME[state.anchor]} here that day.</b> Rings at the latest in your window.` : `Inside your window, ${w}.`;
  const off = Math.abs(state.offset);
  $('[data-f="offset"]').textContent = state.offset === 0 ? `At ${NAME[state.anchor]}` : `${off} min ${state.offset < 0 ? 'before' : 'after'} ${NAME[state.anchor]}`;
  $$('.seg button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.anchor === state.anchor)));
  $$('[data-step]').forEach((b) => { b.disabled = (+b.dataset.step < 0 && state.day === 0) || (+b.dataset.step > 0 && state.day === 6); });
  // pick your light: tomorrow's time for each anchor
  const [ty, tm, td] = dateInZone(1, p.tz);
  for (const k of Object.keys(ALT)) { const ev = sunEvent(ty, tm, td, p.lat, p.lon, ALT[k], true); $(`[data-t="${k}"]`).textContent = ev === null ? 'none' : hm(minutesInZone(ev, p.tz)).t; }
  $$('input[name="anchor"]').forEach((i) => { i.checked = i.value === state.anchor; });
  // the alarm in the other fragments
  const tomorrow = alarmFor(ty, tm, td, p); const tt = hm(tomorrow.min);
  $('[data-f2="alarm"]').textContent = tt.t; $('[data-f2="alarm2"]').textContent = tt.t;
  $('[data-f2="rule"]').textContent = $('[data-f="offset"]').textContent;
  // the app's defaults: an 8-hour sleep goal, wind-down 30 minutes before bed
  $('[data-f2="bed"]').textContent = hm((tomorrow.min - 480 + 1440) % 1440).t; $('[data-f2="wind"]').textContent = hm((tomorrow.min - 510 + 1440) % 1440).t;
  fillSky(p);
  // one alarm, all year
  const yr = ty; const days = [[3, 20, 'March'], [6, 21, 'June'], [9, 22, 'September'], [12, 21, 'December']];
  const lines = ['In March it rings at %t.', 'In June, %t.', 'By September, %t.', 'And in December, %t.'];
  days.forEach(([mm, dd, name], i) => {
    const r = alarmFor(yr, mm, dd, p); const h = hm(r.min);
    const sr = sunEvent(yr, mm, dd, p.lat, p.lon, ALT[state.anchor], true);
    $(`[data-s="${i}d"]`).textContent = `${dd} ${name}`;
    $(`[data-s="${i}c"]`).innerHTML = `${h.t}<small> ${h.ap}</small>`;
    $(`[data-s="${i}s"]`).textContent = sr === null ? `No ${NAME[state.anchor]}` : `${NAME[state.anchor][0].toUpperCase() + NAME[state.anchor].slice(1)} ${hm(minutesInZone(sr, p.tz)).t}`;
    $(`[data-s="${i}t"]`).textContent = r.held === 'early' ? `In ${name} the window holds it at ${h.t}.` : r.held === 'late' || r.held === 'polar' ? `In ${name} it waits until ${h.t}.` : lines[i].replace('%t', h.t);
  });
  drawYear(p, yr);
}
function drawYear(p, yr) {
  const W = 320, X0 = 52, top = 8, bottom = 148, lo = 240, hi = 600; // 4:00 to 10:00, plotted right of the labels
  const y = (min) => top + (bottom - top) * (1 - (Math.min(Math.max(min, lo), hi) - lo) / (hi - lo));
  let sun = '', al = '';
  for (let i = 0; i < 365; i += 3) {
    const dt = new Date(Date.UTC(yr, 0, 1 + i)); const [Y, M, D] = [dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate()];
    const ev = sunEvent(Y, M, D, p.lat, p.lon, ALT[state.anchor], true); const x = X0 + (i / 364) * (W - X0);
    if (ev !== null) sun += `${sun ? 'L' : 'M'}${x.toFixed(1)} ${y(minutesInZone(ev, p.tz)).toFixed(1)}`;
    al += `${al ? 'L' : 'M'}${x.toFixed(1)} ${y(alarmFor(Y, M, D, p).min).toFixed(1)}`;
  }
  const yE = y(state.earliest), yL = y(state.latest);
  const ticks = [300, 420, 540].map((t) => `<text x="0" y="${y(t) + 4}" fill="#b8bad0" font-size="12">${hm(t).t} AM</text>`).join('');
  const months = ['J','F','M','A','M','J','J','A','S','O','N','D'].map((s, i) => `<text x="${X0 + (i + 0.5) * (W - X0) / 12}" y="166" fill="#b8bad0" font-size="12" text-anchor="middle">${s}</text>`).join('');
  $('#year').innerHTML = `<rect x="${X0}" y="${yL}" width="${W - X0}" height="${yE - yL}" fill="#9eb3fa" opacity=".16"/>${ticks}<path d="${sun}" fill="none" stroke="#fa9e3d" stroke-width="2.5"/><path d="${al}" fill="none" stroke="#fff" stroke-width="2.5"/>${months}`;
}
// the clock turns over when a control changes it
function update() { const c = $('.clock'); c.classList.add('tick'); setTimeout(() => { render(); c.classList.remove('tick'); }, 170); }

// controls
const sel = $('#city');
sel.innerHTML = '';
CITIES.forEach((c, i) => sel.add(new Option(c[0], i)));
sel.value = state.city;
sel.addEventListener('change', () => { state.city = +sel.value; state.here = null; $('#here').textContent = 'Use my location'; update(); });
const here = $('#here');
if (!navigator.geolocation) here.hidden = true;
here.addEventListener('click', () => {
  navigator.geolocation.getCurrentPosition((pos) => {
    state.here = { name: 'your location', lat: pos.coords.latitude, lon: pos.coords.longitude, tz: Intl.DateTimeFormat().resolvedOptions().timeZone };
    here.textContent = 'Your location'; update();
  }, () => { here.textContent = 'Location unavailable'; });
});
$$('.seg button').forEach((b) => b.addEventListener('click', () => { state.anchor = b.dataset.anchor; update(); }));
$$('input[name="anchor"]').forEach((i) => i.addEventListener('change', () => { state.anchor = i.value; update(); }));
$$('[data-off]').forEach((b) => b.addEventListener('click', () => { state.offset = Math.max(-120, Math.min(120, state.offset + +b.dataset.off)); update(); }));
$$('[data-step]').forEach((b) => b.addEventListener('click', () => { state.day = Math.max(0, Math.min(6, state.day + +b.dataset.step)); update(); }));
render();

// entrances, once per part
const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
$$('.rise').forEach((el) => io.observe(el));
const v = $('video'); if (matchMedia('(prefers-reduced-motion: reduce)').matches && v) { v.removeAttribute('autoplay'); v.pause(); }
