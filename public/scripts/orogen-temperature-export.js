/*
 * orogen-temperature-export.js
 *
 * Run from the Orogen DevTools console (orogen.studio) to export the
 * current Inspect -> Temperature (Summer) field as a flat 4096x2048
 * equirectangular PNG. Orogen does not expose this in its built-in
 * Export pipeline (which only handles biome / koppen / heightmap /
 * landmask), so we re-render the per-region temperature data ourselves.
 *
 * Loader (paste into Orogen DevTools console):
 *
 *   document.head.appendChild(Object.assign(
 *     document.createElement('script'),
 *     { src: 'https://possible-earths.onrender.com/scripts/orogen-temperature-export.js' }
 *   ));
 *
 * Pre-reqs: build a planet, run climate, then load this script.
 */
(async () => {
  let state;
  for (const path of ['/js/state.js', './js/state.js']) {
    try { state = (await import(path)).state; break; } catch (e) {}
  }
  if (!state || !state.curData) {
    console.error('[temperature-export] could not find state.curData. Build a planet and run climate first.');
    return;
  }

  const cur = state.curData;
  const dl = cur.debugLayers || {};
  const tempArr = dl.tempSummer || cur.r_temperature_summer;
  if (!tempArr) {
    console.error('[temperature-export] no temperature data found.');
    console.log('  curData keys:', Object.keys(cur));
    console.log('  debugLayers keys:', Object.keys(dl));
    return;
  }

  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < tempArr.length; i++) {
    const v = tempArr[i];
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  console.log('[temperature-export] tempSummer:', tempArr.length, 'regions, range', lo.toFixed(3), '..', hi.toFixed(3));

  const mesh = cur.mesh, r_xyz = cur.r_xyz, t_xyz = cur.t_xyz;
  if (!mesh || !r_xyz || !t_xyz) {
    console.error('[temperature-export] missing mesh / r_xyz / t_xyz on curData.');
    return;
  }

  // Color stops (normalized [0,1] = -45 C .. +45 C):
  // deep blue -> cyan -> green -> yellow -> orange -> deep red
  const stops = [
    [0.00, [0.06, 0.11, 0.40]],
    [0.30, [0.18, 0.50, 0.80]],
    [0.45, [0.40, 0.78, 0.45]],
    [0.55, [0.95, 0.92, 0.30]],
    [0.65, [0.96, 0.50, 0.18]],
    [1.00, [0.55, 0.06, 0.06]],
  ];
  const tempColor = (t) => {
    if (t <= 0) return stops[0][1];
    if (t >= 1) return stops[stops.length - 1][1];
    for (let i = 0; i < stops.length - 1; i++) {
      if (t <= stops[i + 1][0]) {
        const u = (t - stops[i][0]) / (stops[i + 1][0] - stops[i][0]);
        const a = stops[i][1], b = stops[i + 1][1];
        return [a[0] + u * (b[0] - a[0]), a[1] + u * (b[1] - a[1]), a[2] + u * (b[2] - a[2])];
      }
    }
  };

  const W = 4096, H = 2048, PI = Math.PI;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);

  const project = (x, y, z) => {
    const lon = Math.atan2(x, z);
    const lat = Math.asin(Math.max(-1, Math.min(1, y)));
    return [(lon + PI) / (2 * PI) * W, (PI / 2 - lat) / PI * H];
  };

  const numSides = mesh.numSides;
  let drawn = 0, wrapSkipped = 0;
  for (let s = 0; s < numSides; s++) {
    const r  = mesh.s_begin_r(s);
    const t1 = mesh.s_inner_t(s);
    const t2 = mesh.s_outer_t(s);
    const p0 = project(r_xyz[3*r],  r_xyz[3*r+1],  r_xyz[3*r+2]);
    const p1 = project(t_xyz[3*t1], t_xyz[3*t1+1], t_xyz[3*t1+2]);
    const p2 = project(t_xyz[3*t2], t_xyz[3*t2+1], t_xyz[3*t2+2]);
    const xMax = Math.max(p0[0], p1[0], p2[0]);
    const xMin = Math.min(p0[0], p1[0], p2[0]);
    if (xMax - xMin > W / 2) { wrapSkipped++; continue; }
    const c = tempColor(tempArr[r]);
    ctx.fillStyle = 'rgb(' + ((c[0]*255)|0) + ',' + ((c[1]*255)|0) + ',' + ((c[2]*255)|0) + ')';
    ctx.beginPath();
    ctx.moveTo(p0[0], p0[1]);
    ctx.lineTo(p1[0], p1[1]);
    ctx.lineTo(p2[0], p2[1]);
    ctx.closePath();
    ctx.fill();
    drawn++;
  }
  console.log('[temperature-export] drew', drawn, 'of', numSides, 'triangles; skipped', wrapSkipped, 'antimeridian-wrap.');

  cv.toBlob((blob) => {
    if (!blob) { console.error('[temperature-export] toBlob returned null.'); return; }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = prompt('Save as:', 'after-temperature.png') || 'after-temperature.png';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    console.log('[temperature-export] saved', blob.size, 'bytes');
  }, 'image/png');
})();
