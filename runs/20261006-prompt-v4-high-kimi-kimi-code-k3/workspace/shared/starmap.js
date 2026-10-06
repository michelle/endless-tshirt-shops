/*
 * Written in the Stars — personalized star-chart generator.
 * Isomorphic: runs in the browser (window.StarMap) and in Node (module.exports).
 * Produces an SVG string for a given moment + place + text.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.StarMap = factory();
})(typeof self !== "undefined" ? self : this, function () {
  var DEG = Math.PI / 180;

  // Julian date from a JS Date (UTC)
  function julianDate(date) {
    return date.getTime() / 86400000 + 2440587.5;
  }

  // Local sidereal time in degrees for a given instant + east-positive longitude
  function localSiderealDeg(date, lonDeg) {
    var d = julianDate(date) - 2451545.0; // days since J2000.0
    var gmst = 280.46061837 + 360.98564736629 * d; // degrees
    var lst = (gmst + lonDeg) % 360;
    return lst < 0 ? lst + 360 : lst;
  }

  // Equatorial (RA/Dec, degrees, J2000) -> horizontal (alt/az, degrees) for observer
  function toHorizontal(raDeg, decDeg, latDeg, lstDeg) {
    var ha = (lstDeg - raDeg) * DEG;
    var dec = decDeg * DEG;
    var lat = latDeg * DEG;
    var sinAlt = Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(lat) * Math.cos(ha);
    var alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
    var az = Math.atan2(
      Math.sin(ha),
      Math.cos(ha) * Math.sin(lat) - Math.tan(dec) * Math.cos(lat)
    );
    // az from atan2 is measured from the south, westward; convert to from-north, eastward
    var azN = az / DEG + 180;
    if (azN >= 360) azN -= 360;
    return { alt: alt / DEG, az: azN };
  }

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  // Format "March 14, 1997 · 21:30" style date
  function formatDate(date) {
    var months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    var mo = months[date.getUTCMonth()];
    var hh = String(date.getUTCHours()).padStart(2, "0");
    var mm = String(date.getUTCMinutes()).padStart(2, "0");
    return mo + " " + date.getUTCDate() + ", " + date.getUTCFullYear() + " · " + hh + ":" + mm;
  }

  function formatCoords(lat, lon) {
    var la = Math.abs(lat).toFixed(2) + "° " + (lat >= 0 ? "N" : "S");
    var lo = Math.abs(lon).toFixed(2) + "° " + (lon >= 0 ? "E" : "W");
    return la + " · " + lo;
  }

  /**
   * Generate the star-chart SVG.
   * opts: { date: Date (UTC instant), lat, lon, title, subtitle, place, ink: "#hex", data: {stars, constellations} }
   * Canvas is 1500 x 1800 units (rendered to 4500 x 5400 px for print).
   */
  function generate(opts) {
    var ink = opts.ink || "#f2ead8";
    var W = 1500, H = 1800;
    var cx = W / 2, cy = 760, R = 640;
    var date = opts.date;
    var lst = localSiderealDeg(date, opts.lon);

    // Emits text either as an SVG <text> element (browser preview, system fonts)
    // or as vector paths via opts.textToPath (server print files, embedded fonts).
    function text(s, x, y, o) {
      if (opts.textToPath) {
        return opts.textToPath(s, {
          x: x, y: y, size: o.size, font: o.font || "serif", spacing: o.spacing || 0,
          fill: ink, opacity: o.opacity === undefined ? 1 : o.opacity, central: !!o.central,
        });
      }
      var fam = o.font === "sans"
        ? "'Crimson Text', Georgia, serif"
        : o.font === "italic" ? "'Crimson Text', Georgia, serif" : "Marcellus, Georgia, 'Times New Roman', serif";
      return '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" fill="' + ink + '"' +
        (o.opacity !== undefined && o.opacity < 1 ? ' fill-opacity="' + o.opacity + '"' : "") +
        ' font-family="' + fam + '"' + (o.font === "italic" ? ' font-style="italic"' : "") +
        ' font-size="' + o.size + '" text-anchor="middle"' +
        (o.central ? ' dominant-baseline="central"' : "") +
        ' letter-spacing="' + (o.spacing || 0) + '">' + esc(s) + "</text>";
    }

    function project(raDeg, decDeg) {
      var h = toHorizontal(raDeg, decDeg, opts.lat, lst);
      if (h.alt < 0) return null;
      var r = R * (90 - h.alt) / 90;
      var a = h.az * DEG;
      return { x: cx + r * Math.sin(a), y: cy - r * Math.cos(a), alt: h.alt };
    }

    var out = [];
    out.push('<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + " " + H + '">');

    // ---- star chart ----
    var clip = '<clipPath id="sky"><circle cx="' + cx + '" cy="' + cy + '" r="' + R + '"/></clipPath>';
    out.push("<defs>" + clip + "</defs>");
    out.push('<g clip-path="url(#sky)">');

    // constellation lines
    out.push('<g stroke="' + ink + '" stroke-opacity="0.35" stroke-width="2.2" fill="none" stroke-linecap="round">');
    var cons = opts.data.constellations;
    for (var key in cons) {
      var segs = cons[key];
      for (var i = 0; i < segs.length; i++) {
        var d = "";
        var started = false;
        for (var j = 0; j < segs[i].length; j++) {
          var p = project(segs[i][j][0], segs[i][j][1]);
          if (!p) { started = false; continue; }
          d += (started ? " L" : "M") + p.x.toFixed(1) + " " + p.y.toFixed(1);
          started = true;
        }
        if (d) out.push('<path d="' + d + '"/>');
      }
    }
    out.push("</g>");

    // stars — radius mapped from magnitude, brightest get a soft halo
    var stars = opts.data.stars;
    var dots = [];
    for (var s = 0; s < stars.length; s++) {
      var st = stars[s];
      var pp = project(st[0], st[1]);
      if (!pp) continue;
      var mag = st[2];
      var r = 1.0 + (5.6 - mag) * 1.55;
      if (r > 7.5) r = 7.5;
      dots.push({ x: pp.x, y: pp.y, r: r, mag: mag });
    }
    // bright halos first
    out.push('<g fill="' + ink + '" fill-opacity="0.16">');
    for (var b = 0; b < dots.length; b++) {
      if (dots[b].mag <= 2.0) {
        out.push('<circle cx="' + dots[b].x.toFixed(1) + '" cy="' + dots[b].y.toFixed(1) + '" r="' + (dots[b].r * 3).toFixed(1) + '"/>');
      }
    }
    out.push("</g>");
    out.push('<g fill="' + ink + '">');
    for (var k = 0; k < dots.length; k++) {
      out.push('<circle cx="' + dots[k].x.toFixed(1) + '" cy="' + dots[k].y.toFixed(1) + '" r="' + dots[k].r.toFixed(1) + '"/>');
    }
    out.push("</g>");
    out.push("</g>"); // end clip

    // chart furniture: rings, ticks, cardinal letters
    out.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + R + '" fill="none" stroke="' + ink + '" stroke-width="3.5"/>');
    out.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + (R + 26) + '" fill="none" stroke="' + ink + '" stroke-width="1.4" stroke-opacity="0.7"/>');
    // 72 tick marks
    var ticks = [];
    for (var t = 0; t < 72; t++) {
      var ang = t * 5 * DEG;
      var len = t % 18 === 0 ? 20 : t % 6 === 0 ? 13 : 7;
      var r1 = R + 26, r2 = R + 26 + len;
      ticks.push('<line x1="' + (cx + r1 * Math.sin(ang)).toFixed(1) + '" y1="' + (cy - r1 * Math.cos(ang)).toFixed(1) +
        '" x2="' + (cx + r2 * Math.sin(ang)).toFixed(1) + '" y2="' + (cy - r2 * Math.cos(ang)).toFixed(1) + '"/>');
    }
    out.push('<g stroke="' + ink + '" stroke-width="1.6" stroke-opacity="0.7">' + ticks.join("") + "</g>");
    // cardinal letters
    var cards = [["N", 0], ["E", 90], ["S", 180], ["W", 270]];
    for (var c = 0; c < 4; c++) {
      var ca = cards[c][1] * DEG;
      var rr = R + 62;
      out.push(text(cards[c][0], cx + rr * Math.sin(ca), cy - rr * Math.cos(ca), { size: 34, spacing: 2, central: true }));
    }

    // ---- typography ----
    var title = (opts.title || "").toUpperCase().trim();
    var subtitle = (opts.subtitle || "").trim();
    // show the wall-clock time at the chosen place (solar-time offset from longitude)
    var offsetHours = Math.max(-12, Math.min(14, Math.round(opts.lon / 15)));
    var localDate = new Date(date.getTime() + offsetHours * 3600e3);
    var meta = formatDate(localDate).toUpperCase();
    var where = ((opts.place || "").trim() ? opts.place.trim().toUpperCase() + "  ·  " : "") + formatCoords(opts.lat, opts.lon);

    if (title) {
      // shrink font for long titles
      var fs = title.length > 26 ? 52 : title.length > 16 ? 64 : 78;
      out.push(text(title, cx, 1560, { size: fs, spacing: 10 }));
    }
    if (subtitle) {
      out.push(text(subtitle, cx, 1614, { size: 34, spacing: 3, font: "italic", opacity: 0.85 }));
    }
    out.push(text(meta, cx, 1686, { size: 26, spacing: 6, font: "sans", opacity: 0.9 }));
    out.push(text(where, cx, 1728, { size: 22, spacing: 5, font: "sans", opacity: 0.7 }));

    out.push("</svg>");
    return out.join("\n");
  }

  return { generate: generate, localSiderealDeg: localSiderealDeg, toHorizontal: toHorizontal };
});
