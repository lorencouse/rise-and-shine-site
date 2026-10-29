// Sunrise maths shared by every page: the NOAA method the app's SolarCalculator uses,
// the cities the visitor can pick, and the footer's "next sunrise" tile.
document.documentElement.classList.add('js');

const RAD = Math.PI / 180;
// Returns the event as UTC ms, or null in polar day or night.
function sunEvent(y, m, d, lat, lon, altitude, rising) {
  const jd0 = Date.UTC(y, m - 1, d) / 86400000 + 2440587.5;
  let minutes = 720 - 4 * lon;
  for (let i = 0; i < 3; i++) {
    const T = (jd0 + minutes / 1440 - 2451545) / 36525;
    const L0 = ((280.46646 + T * (36000.76983 + T * 0.0003032)) % 360 + 360) % 360;
    const M = 357.52911 + T * (35999.05029 - 0.0001537 * T);
    const e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
    const C = Math.sin(M * RAD) * (1.914602 - T * (0.004817 + 0.000014 * T)) + Math.sin(2 * M * RAD) * (0.019993 - 0.000101 * T) + Math.sin(3 * M * RAD) * 0.000289;
    const omega = 125.04 - 1934.136 * T;
    const lambda = L0 + C - 0.00569 - 0.00478 * Math.sin(omega * RAD);
    const eps = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60 + 0.00256 * Math.cos(omega * RAD);
    const decl = Math.asin(Math.sin(eps * RAD) * Math.sin(lambda * RAD));
    const yv = Math.tan(eps * RAD / 2) ** 2;
    const eqTime = 4 / RAD * (yv * Math.sin(2 * L0 * RAD) - 2 * e * Math.sin(M * RAD) + 4 * e * yv * Math.sin(M * RAD) * Math.cos(2 * L0 * RAD) - 0.5 * yv * yv * Math.sin(4 * L0 * RAD) - 1.25 * e * e * Math.sin(2 * M * RAD));
    const cosH = (Math.sin(altitude * RAD) - Math.sin(lat * RAD) * Math.sin(decl)) / (Math.cos(lat * RAD) * Math.cos(decl));
    if (cosH > 1 || cosH < -1) return null;
    const noon = 720 - 4 * lon - eqTime;
    minutes = rising ? noon - 4 * Math.acos(cosH) / RAD : noon + 4 * Math.acos(cosH) / RAD;
  }
  return Date.UTC(y, m - 1, d) + minutes * 60000;
}
const ALT = { firstLight: -18, dawn: -6, sunrise: -0.833 };
const NAME = { firstLight: 'first light', dawn: 'dawn', sunrise: 'sunrise' };
const CITIES = [
  ['San Francisco', 37.7749, -122.4194, 'America/Los_Angeles'], ['Los Angeles', 34.0522, -118.2437, 'America/Los_Angeles'],
  ['Seattle', 47.6062, -122.3321, 'America/Los_Angeles'], ['Denver', 39.7392, -104.9903, 'America/Denver'],
  ['Phoenix', 33.4484, -112.074, 'America/Phoenix'], ['Chicago', 41.8781, -87.6298, 'America/Chicago'],
  ['New York', 40.7128, -74.006, 'America/New_York'], ['Toronto', 43.6532, -79.3832, 'America/Toronto'],
  ['Honolulu', 21.3069, -157.8583, 'Pacific/Honolulu'], ['Anchorage', 61.2181, -149.9003, 'America/Anchorage'],
  ['Mexico City', 19.4326, -99.1332, 'America/Mexico_City'], ['São Paulo', -23.5505, -46.6333, 'America/Sao_Paulo'],
  ['London', 51.5074, -0.1278, 'Europe/London'], ['Paris', 48.8566, 2.3522, 'Europe/Paris'],
  ['Berlin', 52.52, 13.405, 'Europe/Berlin'], ['Stockholm', 59.3293, 18.0686, 'Europe/Stockholm'],
  ['Reykjavík', 64.1466, -21.9426, 'Atlantic/Reykjavik'], ['Tromsø', 69.6492, 18.9553, 'Europe/Oslo'],
  ['Madrid', 40.4168, -3.7038, 'Europe/Madrid'], ['Cairo', 30.0444, 31.2357, 'Africa/Cairo'],
  ['Dubai', 25.2048, 55.2708, 'Asia/Dubai'], ['Mumbai', 19.076, 72.8777, 'Asia/Kolkata'],
  ['Singapore', 1.3521, 103.8198, 'Asia/Singapore'], ['Tokyo', 35.6762, 139.6503, 'Asia/Tokyo'],
  ['Sydney', -33.8688, 151.2093, 'Australia/Sydney'], ['Auckland', -36.8485, 174.7633, 'Pacific/Auckland'],
];
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
function parts(ms, tz) {
  const o = {}; for (const p of new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true, weekday: 'short' }).formatToParts(ms)) o[p.type] = p.value; return o;
}
function minutesInZone(ms, tz) { const p = parts(ms, tz); let h = +p.hour % 12; if (p.dayPeriod === 'PM') h += 12; return h * 60 + +p.minute; }
function hm(min) { const h = Math.floor(min / 60), m = min % 60; return { t: `${h % 12 || 12}:${String(m).padStart(2, '0')}`, ap: h < 12 ? 'AM' : 'PM' }; }
function dateInZone(offsetDays, tz) { const p = parts(Date.now(), tz); const d = new Date(Date.UTC(+p.year, +p.month - 1, +p.day + offsetDays)); return [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()]; }
// The visitor's city: the one in their time zone, else one whose clock reads the same now, else San Francisco.
function homeCity() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const exact = CITIES.findIndex((c) => c[3] === tz);
    if (exact >= 0) return exact;
    const now = Date.now(), here = minutesInZone(now, tz);
    const same = CITIES.findIndex((c) => minutesInZone(now, c[3]) === here);
    if (same >= 0) return same;
  } catch {}
  return 0;
}
const cityPlace = (i) => ({ name: CITIES[i][0], lat: CITIES[i][1], lon: CITIES[i][2], tz: CITIES[i][3] });
// The footer tile, on every page. Home calls it again when the visitor picks another city.
function fillSky(p = cityPlace(homeCity())) {
  const tile = $('[data-sky]'); if (!tile) return;
  const [y, m, d] = dateInZone(1, p.tz);
  const rise = sunEvent(y, m, d, p.lat, p.lon, ALT.sunrise, true);
  $('[data-sky="city"]').textContent = p.name;
  $('[data-sky="next"]').textContent = rise === null ? 'No sunrise tomorrow' : `${hm(minutesInZone(rise, p.tz)).t} ${hm(minutesInZone(rise, p.tz)).ap}`;
  tile.hidden = false;
}
document.addEventListener('DOMContentLoaded', () => fillSky());
