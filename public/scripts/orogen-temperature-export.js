/*
 * orogen-temperature-export.js
 *
 * Exports the current Inspect -> Temperature (Summer) field from
 * Orogen as a flat 4096x2048 equirectangular PNG. Orogen's built-in
 * Export pipeline does not include temperature, so we re-render the
 * per-region data ourselves.
 *
 * Loader (paste in the Orogen DevTools console after a planet has
 * been built and climate has been computed):
 *
 *   document.head.appendChild(Object.assign(
 *     document.createElement('script'),
 *     { src: 'https://possible-earths.onrender.com/scripts/orogen-temperature-export.js' }
 *   ));
 *
 * This script is hosted on possible-earths.onrender.com, so dynamic
 * import() called from here would resolve module specifiers against
 * THAT origin (404'ing). To get document-base resolution, the loader
 * below builds the actual logic as an inline <script> element on the
 * orogen.studio page; inline scripts resolve imports against the
 * document base URL.
 */

(function loader() {
  // The function whose .toString() becomes the inline script body.
  // Self-contained — does not capture any outer scope.
  async function logic() {
    var TAG = '[temperature-export]';
    var state;
    try {
      state = (await import('/js/state.js')).state;
    } catch (err) {
      console.error(TAG, 'failed to import /js/state.js:', err);
      return;
    }
    if (!state) {
      console.error(TAG, 'state.js loaded but the state export is missing.');
      return;
    }
    console.log(TAG, 'state keys:', Object.keys(state));
    if (!state.curData) {
      console.error(TAG, 'state.curData is empty.');
      console.log('  state.climateComputed:', state.climateComputed);
      console.log('  state.importedHeightmap:', state.importedHeightmap);
      console.log('  Make sure you imported a heightmap and clicked Run Climate.');
      return;
    }
    var cur = state.curData;
    console.log(TAG, 'state.curData keys:', Object.keys(cur));

    var tempArr = cur.r_temperature_summer
      || (cur.debugLayers && cur.debugLayers.tempSummer);
    if (!tempArr) {
      console.error(TAG, 'no temperature data on curData.');
      if (cur.debugLayers) {
        console.log('  debugLayers keys:', Object.keys(cur.debugLayers));
      }
      console.log('  Climate may not be computed yet — try clicking Run Climate.');
      return;
    }

    var lo = Infinity, hi = -Infinity;
    for (var i = 0; i < tempArr.length; i++) {
      var v = tempArr[i];
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    console.log(TAG, 'tempSummer:', tempArr.length, 'regions, range',
                lo.toFixed(3), '..', hi.toFixed(3));

    var mesh = cur.mesh;
    var r_xyz = cur.r_xyz;
    var t_xyz = cur.t_xyz;
    if (!mesh || !r_xyz || !t_xyz) {
      console.error(TAG, 'missing mesh / r_xyz / t_xyz on state.curData.');
      console.log('  mesh:', !!mesh, 'r_xyz:', !!r_xyz, 't_xyz:', !!t_xyz);
      return;
    }

    // Color stops, normalized [0,1] mapping -45 C .. +45 C:
    // deep blue -> cyan -> green -> yellow -> orange -> deep red.
    var stops = [
      [0.00, [0.06, 0.11, 0.40]],
      [0.30, [0.18, 0.50, 0.80]],
      [0.45, [0.40, 0.78, 0.45]],
      [0.55, [0.95, 0.92, 0.30]],
      [0.65, [0.96, 0.50, 0.18]],
      [1.00, [0.55, 0.06, 0.06]]
    ];
    function tempColor(t) {
      if (t <= 0) return stops[0][1];
      if (t >= 1) return stops[stops.length - 1][1];
      for (var k = 0; k < stops.length - 1; k++) {
        if (t <= stops[k + 1][0]) {
          var u = (t - stops[k][0]) / (stops[k + 1][0] - stops[k][0]);
          var a = stops[k][1];
          var b = stops[k + 1][1];
          return [
            a[0] + u * (b[0] - a[0]),
            a[1] + u * (b[1] - a[1]),
            a[2] + u * (b[2] - a[2])
          ];
        }
      }
      return stops[stops.length - 1][1];
    }

    var W = 4096, H = 2048, PI = Math.PI;
    var cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    var ctx = cv.getContext('2d');
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    function project(x, y, z) {
      var lon = Math.atan2(x, z);
      var lat = Math.asin(Math.max(-1, Math.min(1, y)));
      return [
        (lon + PI) / (2 * PI) * W,
        (PI / 2 - lat) / PI * H
      ];
    }

    var numSides = mesh.numSides;
    var drawn = 0, wrapSkipped = 0;
    for (var s = 0; s < numSides; s++) {
      var r = mesh.s_begin_r(s);
      var t1 = mesh.s_inner_t(s);
      var t2 = mesh.s_outer_t(s);
      var p0 = project(r_xyz[3 * r], r_xyz[3 * r + 1], r_xyz[3 * r + 2]);
      var p1 = project(t_xyz[3 * t1], t_xyz[3 * t1 + 1], t_xyz[3 * t1 + 2]);
      var p2 = project(t_xyz[3 * t2], t_xyz[3 * t2 + 1], t_xyz[3 * t2 + 2]);
      var xMax = Math.max(p0[0], p1[0], p2[0]);
      var xMin = Math.min(p0[0], p1[0], p2[0]);
      if (xMax - xMin > W / 2) { wrapSkipped++; continue; }
      var c = tempColor(tempArr[r]);
      ctx.fillStyle = 'rgb('
        + ((c[0] * 255) | 0) + ','
        + ((c[1] * 255) | 0) + ','
        + ((c[2] * 255) | 0) + ')';
      ctx.beginPath();
      ctx.moveTo(p0[0], p0[1]);
      ctx.lineTo(p1[0], p1[1]);
      ctx.lineTo(p2[0], p2[1]);
      ctx.closePath();
      ctx.fill();
      drawn++;
    }
    console.log(TAG, 'drew', drawn, 'of', numSides,
                'triangles; skipped', wrapSkipped, 'antimeridian-wrap.');

    cv.toBlob(function (blob) {
      if (!blob) {
        console.error(TAG, 'toBlob returned null.');
        return;
      }
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = prompt('Save as:', 'after-temperature.png') || 'after-temperature.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      console.log(TAG, 'saved', blob.size, 'bytes.');
    }, 'image/png');
  }

  // Inline-script trick: stamp the function source into a <script>
  // element that lives in the document. Imports inside that element
  // resolve against the orogen.studio document base URL, not against
  // possible-earths.onrender.com (where this loader lives).
  var s = document.createElement('script');
  s.textContent = '(' + logic.toString() + ')();';
  document.body.appendChild(s);
  s.remove();
  console.log('[temperature-export] loaded; running inline...');
})();
