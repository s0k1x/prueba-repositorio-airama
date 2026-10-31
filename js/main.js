/* Airama Propiedades — interacción del sitio */
(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // Cartera de ejemplo. Sustituir por los datos reales (API, CMS o JSON).
  // ---------------------------------------------------------------------------
  var PROPS = [
    { ref: "AIR-2417", op: "venta", zona: "Marbella", tipo: "Villa", badge: "Exclusiva",
      title: "Villa contemporánea en Sierra Blanca", price: 6950000,
      m2: 812, parcela: 2400, dorm: 6, banos: 7, energia: "A", scene: "sea", seed: 21,
      photo: "https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1600&q=75",
      desc: "Arquitectura de líneas puras en la urbanización más reservada de Marbella. Salón a doble altura abierto a la piscina infinita, spa con sauna, bodega y vistas despejadas al Mediterráneo y a Gibraltar." },
    { ref: "AIR-2391", op: "venta", zona: "Madrid", tipo: "Ático", badge: "Novedad",
      title: "Ático con terraza en Almagro", price: 3400000,
      m2: 286, terraza: 110, dorm: 4, banos: 4, energia: "B", scene: "city", seed: 8,
      photo: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=75",
      desc: "Última planta de un edificio de 1912 rehabilitado. Terraza de 110 m² con vistas a las cúpulas del centro, cocina de autor y dos plazas de garaje." },
    { ref: "AIR-2388", op: "venta", zona: "Mallorca", tipo: "Finca",
      title: "Finca de piedra en Deià", price: 4750000,
      m2: 540, parcela: 18000, dorm: 5, banos: 5, energia: "C", scene: "country", seed: 4,
      photo: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=75",
      desc: "Casa mallorquina del siglo XVIII entre olivos centenarios y bancales de piedra seca. Torre de defensa restaurada, piscina de agua salada y licencia de alquiler vacacional." },
    { ref: "AIR-2402", op: "venta", zona: "Barcelona", tipo: "Piso",
      title: "Piso modernista en el Eixample", price: 1980000,
      m2: 238, dorm: 4, banos: 3, energia: "D", scene: "city", seed: 15,
      photo: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=75",
      desc: "Planta noble de una finca de 1904 con techos de 4,2 metros, mosaico hidráulico original y galería acristalada orientada a un patio de manzana ajardinado." },
    { ref: "AIR-2410", op: "venta", zona: "Madrid", tipo: "Villa",
      title: "Casa con jardín en La Moraleja", price: 5200000,
      m2: 980, parcela: 3100, dorm: 7, banos: 8, energia: "B", scene: "country", seed: 30,
      photo: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=75",
      desc: "Vivienda familiar en parcela llana con jardín maduro, pista de pádel, casa de invitados y garaje para cinco coches. A diez minutos de los colegios internacionales." },
    { ref: "AIR-2405", op: "venta", zona: "Marbella", tipo: "Ático",
      title: "Ático en primera línea, Golden Mile", price: 2850000,
      m2: 214, terraza: 95, dorm: 3, banos: 3, energia: "A", scene: "sea", seed: 2,
      photo: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=75",
      desc: "Ático frente a la playa en un complejo con seguridad 24 horas. Terraza envolvente con jacuzzi y acceso directo al paseo marítimo." },
    { ref: "AIR-2420", op: "alquiler", zona: "Mallorca", tipo: "Villa", badge: "Disponible",
      title: "Villa frente al mar en Port d'Andratx", price: 18500,
      m2: 420, parcela: 1500, dorm: 5, banos: 5, energia: "A", scene: "sea", seed: 12,
      photo: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=75",
      desc: "Alquiler de larga temporada, amueblada. Embarcadero privado, piscina climatizada y vistas al puerto. Contrato mínimo de doce meses." },
    { ref: "AIR-2399", op: "alquiler", zona: "Madrid", tipo: "Piso",
      title: "Piso señorial en el barrio de Salamanca", price: 9800,
      m2: 265, dorm: 4, banos: 3, energia: "C", scene: "city", seed: 27,
      photo: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=75",
      desc: "Exterior a la calle Velázquez, con balcones corridos, suelos de roble en espiga y portería física. Se alquila sin muebles." }
  ];

  var PRICE_OPTIONS = {
    venta: [["", "Sin límite"], ["1500000", "1.500.000 €"], ["3000000", "3.000.000 €"], ["5000000", "5.000.000 €"], ["8000000", "8.000.000 €"]],
    alquiler: [["", "Sin límite"], ["5000", "5.000 €/mes"], ["10000", "10.000 €/mes"], ["20000", "20.000 €/mes"]]
  };

  var state = { op: "venta", zona: "", tipo: "", max: 0, dorm: 0 };
  var nf = new Intl.NumberFormat("es-ES");
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function fmtPrice(p) { return nf.format(p.price) + (p.op === "alquiler" ? " €/mes" : " €"); }

  // ---------------------------------------------------------------------------
  // Escenas generadas: sustituyen a la fotografía mientras no cargue una real.
  // ---------------------------------------------------------------------------
  function rng(seed) {
    var a = seed * 2654435761 >>> 0;
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  var SKIES = [
    ["#33506a", "#b98d74", "#efc9a0"], // atardecer
    ["#6f9ac0", "#b8d2e2", "#eef1e8"], // mediodía
    ["#1f2d45", "#5f6789", "#e0a47c"], // anochecer
    ["#86a7bd", "#d7dcd2", "#f3e2c4"]  // mañana
  ];

  function drawScene(cv) {
    var rect = cv.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(rect.width * dpr);
    cv.height = Math.round(rect.height * dpr);
    var ctx = cv.getContext("2d");
    var w = cv.width, h = cv.height;
    var seed = +cv.dataset.seed || 1, kind = cv.dataset.scene || "sea";
    var r = rng(seed);
    var sky = SKIES[seed % SKIES.length];
    var dusk = sky === SKIES[0] || sky === SKIES[2];
    var hy = h * (kind === "city" ? 0.7 : 0.6);

    var g = ctx.createLinearGradient(0, 0, 0, hy);
    g.addColorStop(0, sky[0]); g.addColorStop(0.65, sky[1]); g.addColorStop(1, sky[2]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, hy + 2);

    var sx = w * (0.2 + r() * 0.6), sy = hy - h * (0.08 + r() * 0.12);
    var sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, w * 0.35);
    sg.addColorStop(0, "rgba(255,236,200,0.85)"); sg.addColorStop(0.15, "rgba(255,220,170,0.35)"); sg.addColorStop(1, "rgba(255,220,170,0)");
    ctx.fillStyle = sg; ctx.fillRect(0, 0, w, hy);

    if (kind === "sea") {
      ctx.fillStyle = "rgba(90,105,120,0.55)";
      ctx.beginPath(); ctx.moveTo(0, hy);
      for (var x = 0; x <= w; x += w / 12) ctx.lineTo(x, hy - h * 0.03 * Math.sin(x / w * 3 + seed) - h * 0.015);
      ctx.lineTo(w, hy); ctx.fill();
      var sea = ctx.createLinearGradient(0, hy, 0, h);
      sea.addColorStop(0, dusk ? "#5c6f80" : "#4f86a3"); sea.addColorStop(1, dusk ? "#22323f" : "#1f4a5f");
      ctx.fillStyle = sea; ctx.fillRect(0, hy, w, h - hy);
      ctx.strokeStyle = "rgba(255,230,190,0.35)"; ctx.lineWidth = Math.max(1, h / 400);
      for (var i = 0; i < 26; i++) {
        var ly = hy + (h - hy) * Math.pow(r(), 1.6) * 0.5, lw = w * (0.02 + r() * 0.08);
        ctx.beginPath(); ctx.moveTo(sx - lw / 2 + (r() - .5) * w * .2, ly); ctx.lineTo(sx + lw / 2 + (r() - .5) * w * .2, ly); ctx.stroke();
      }
    } else if (kind === "country") {
      var hills = dusk ? ["#6c6a63", "#4f5649", "#3a4236"] : ["#93a08b", "#6f8064", "#55654b"];
      hills.forEach(function (c, k) {
        ctx.fillStyle = c; ctx.beginPath();
        var base = hy + k * h * 0.06; ctx.moveTo(0, h);
        for (var x = 0; x <= w; x += w / 20) ctx.lineTo(x, base - h * (0.05 + 0.04 * k) * Math.sin(x / w * (2 + k) + seed * (k + 1)) - h * 0.04);
        ctx.lineTo(w, h); ctx.fill();
      });
    } else {
      // skyline
      ctx.fillStyle = dusk ? "#3d4252" : "#8a95a0";
      var x0 = 0;
      while (x0 < w) {
        var bw = w * (0.03 + r() * 0.06), bh = h * (0.08 + r() * 0.22);
        ctx.fillRect(x0, hy - bh, bw, bh + 2);
        if (r() > 0.75) { ctx.beginPath(); ctx.arc(x0 + bw / 2, hy - bh, bw / 2, Math.PI, 0); ctx.fill(); }
        x0 += bw + w * 0.004;
      }
      if (dusk) {
        ctx.fillStyle = "rgba(255,210,140,0.7)";
        for (var j = 0; j < 140; j++) ctx.fillRect(r() * w, hy - r() * h * 0.28, w * 0.004, h * 0.006);
      }
      ctx.fillStyle = dusk ? "#2a2e36" : "#c9c4b8"; ctx.fillRect(0, hy, w, h - hy);
    }

    // Arquitectura en primer plano
    var gy = kind === "city" ? h * 0.86 : h * 0.84;
    var wall = dusk ? "#e7e2d8" : "#f6f4ee";
    var shade = dusk ? "#b9b4aa" : "#d6d3cb";
    var glass = dusk ? "#2b3238" : "#3b4a52";
    var glow = "rgba(255,200,130," + (dusk ? 0.85 : 0.25) + ")";

    if (kind === "city") {
      // terraza de ático: barandilla de vidrio, jardineras y pérgola
      ctx.fillStyle = dusk ? "#4a4440" : "#a99f92"; ctx.fillRect(0, gy, w, h - gy);
      ctx.fillStyle = "rgba(200,220,225,0.18)"; ctx.fillRect(0, gy - h * 0.08, w, h * 0.08);
      ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.fillRect(0, gy - h * 0.08, w, Math.max(1, h / 300));
      ctx.fillStyle = dusk ? "#2b2a28" : "#5a564f";
      ctx.fillRect(w * 0.05, 0, w * 0.015, gy);
      ctx.fillRect(w * 0.05, h * 0.06, w * 0.5, h * 0.018);
      for (var p = 0; p < 9; p++) ctx.fillRect(w * 0.08 + p * w * 0.055, h * 0.06, w * 0.006, h * 0.05);
      for (var q = 0; q < 3; q++) {
        var px = w * (0.6 + q * 0.12);
        ctx.fillStyle = dusk ? "#3d3833" : "#8c8275"; ctx.fillRect(px, gy - h * 0.05, w * 0.08, h * 0.05);
        ctx.fillStyle = dusk ? "#2f4033" : "#5d7552";
        ctx.beginPath(); ctx.ellipse(px + w * 0.04, gy - h * 0.08, w * 0.045, h * 0.05, 0, 0, Math.PI * 2); ctx.fill();
      }
    } else {
      var bx = w * (0.14 + r() * 0.08), bw2 = w * 0.62, b1 = h * 0.16, b2 = h * 0.13;
      // planta baja
      ctx.fillStyle = wall; ctx.fillRect(bx, gy - b1, bw2, b1);
      ctx.fillStyle = glass; ctx.fillRect(bx + bw2 * 0.08, gy - b1 * 0.82, bw2 * 0.6, b1 * 0.82);
      ctx.fillStyle = glow; ctx.fillRect(bx + bw2 * 0.12, gy - b1 * 0.7, bw2 * 0.22, b1 * 0.7);
      ctx.fillRect(bx + bw2 * 0.4, gy - b1 * 0.7, bw2 * 0.16, b1 * 0.7);
      // planta alta en voladizo
      var ux = bx + bw2 * 0.28;
      ctx.fillStyle = wall; ctx.fillRect(ux, gy - b1 - b2, bw2 * 0.86, b2);
      ctx.fillStyle = shade; ctx.fillRect(ux, gy - b1, bw2 * 0.86, h * 0.012);
      ctx.fillStyle = glass; ctx.fillRect(ux + bw2 * 0.06, gy - b1 - b2 * 0.78, bw2 * 0.7, b2 * 0.6);
      ctx.fillStyle = glow; ctx.fillRect(ux + bw2 * 0.5, gy - b1 - b2 * 0.7, bw2 * 0.18, b2 * 0.5);
      ctx.fillStyle = wall; ctx.fillRect(ux - bw2 * 0.04, gy - b1 - b2 - h * 0.012, bw2 * 0.98, h * 0.014);
      // suelo y piscina
      ctx.fillStyle = dusk ? "#cfc6b6" : "#e6e0d3"; ctx.fillRect(0, gy, w, h - gy);
      var pool = ctx.createLinearGradient(0, gy, 0, h);
      pool.addColorStop(0, dusk ? "#3d7d8a" : "#58b3c4"); pool.addColorStop(1, dusk ? "#21505c" : "#2f8aa0");
      ctx.fillStyle = pool; ctx.fillRect(w * 0.08, gy + (h - gy) * 0.3, w * 0.7, (h - gy) * 0.45);
      ctx.fillStyle = "rgba(255,255,255,0.25)"; ctx.fillRect(w * 0.08, gy + (h - gy) * 0.3, w * 0.7, Math.max(1, h / 300));
      // vegetación
      var tree = dusk ? "#2b3528" : "#45573b";
      for (var t = 0; t < 3; t++) {
        var tx = t === 0 ? bx - w * 0.05 : bx + bw2 + w * (0.06 + t * 0.06), th = h * (0.22 + r() * 0.1);
        ctx.fillStyle = tree; ctx.beginPath();
        ctx.ellipse(tx, gy - th / 2, w * 0.014, th / 2, 0, 0, Math.PI * 2); ctx.fill();
      }
    }

    // velo de grano fotográfico
    var vg = ctx.createLinearGradient(0, 0, 0, h);
    vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.12)");
    ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);
  }

  function loadPhoto(img) {
    if (!img || !img.dataset.src || img.src) return;
    img.addEventListener("load", function () { img.classList.add("is-loaded"); });
    img.addEventListener("error", function () { img.remove(); });
    img.src = img.dataset.src;
  }

  function mediaHTML(p) {
    return '<canvas data-scene="' + p.scene + '" data-seed="' + p.seed + '"></canvas>' +
      '<img data-src="' + p.photo + '" alt="' + p.title + '" loading="lazy">';
  }

  var ro = "ResizeObserver" in window ? new ResizeObserver(function (entries) {
    entries.forEach(function (e) { drawScene(e.target); });
  }) : null;
  function initMedia(root) {
    $$("canvas[data-scene]", root).forEach(function (cv) {
      drawScene(cv);
      if (ro) ro.observe(cv);
    });
    $$("img[data-src]", root).forEach(loadPhoto);
  }

  // ---------------------------------------------------------------------------
  // Listado y filtros
  // ---------------------------------------------------------------------------
  var listEl = $("#listings"), countEl = $("#results-count");

  function specsHTML(p) {
    var s = ['<span>' + nf.format(p.m2) + ' m² const.</span>'];
    if (p.parcela) s.push('<span>Parcela ' + nf.format(p.parcela) + ' m²</span>');
    if (p.terraza) s.push('<span>Terraza ' + nf.format(p.terraza) + ' m²</span>');
    s.push('<span>' + p.dorm + ' dorm.</span>', '<span>' + p.banos + ' baños</span>');
    s.push('<span title="Certificado energético">CEE <i class="energy" data-e="' + p.energia + '">' + p.energia + '</i></span>');
    return s.join("");
  }

  function render() {
    var items = PROPS.filter(function (p) {
      return p.op === state.op &&
        (!state.zona || p.zona === state.zona) &&
        (!state.tipo || p.tipo === state.tipo) &&
        (!state.max || p.price <= state.max) &&
        p.dorm >= state.dorm;
    });
    countEl.textContent = items.length === 1 ? "1 propiedad" : items.length + " propiedades";
    if (!items.length) {
      listEl.innerHTML = '<p class="empty">No hay propiedades publicadas con estos criterios. Escríbenos: muchas viviendas se venden sin anunciarse.</p>';
      return;
    }
    listEl.innerHTML = items.map(function (p) {
      return '<article class="listing" data-ref="' + p.ref + '">' +
        '<div class="media">' + mediaHTML(p) +
        (p.badge ? '<span class="listing__badge">' + p.badge + '</span>' : '') + '</div>' +
        '<div class="listing__meta"><span>' + p.zona + ' · ' + p.tipo + '</span><span class="ref">Ref. ' + p.ref + '</span></div>' +
        '<h3><button type="button">' + p.title + '</button></h3>' +
        '<div class="listing__price">' + fmtPrice(p) + '</div>' +
        '<div class="specs">' + specsHTML(p) + '</div>' +
        '</article>';
    }).join("");
    initMedia(listEl);
  }

  function setOp(op) {
    state.op = op;
    $$(".search__tab").forEach(function (t) { t.setAttribute("aria-selected", String(t.dataset.op === op)); });
    var sel = $("#s-precio");
    sel.innerHTML = PRICE_OPTIONS[op].map(function (o) { return '<option value="' + o[0] + '">' + o[1] + '</option>'; }).join("");
    state.max = 0;
    $("#prop-title").textContent = op === "venta" ? "Propiedades destacadas" : "Propiedades en alquiler";
  }

  function setZona(z) {
    state.zona = z;
    $$("#filters .chip").forEach(function (c) { c.setAttribute("aria-pressed", String(c.dataset.zona === z)); });
    $("#s-zona").value = z;
  }

  $$(".search__tab").forEach(function (t) {
    t.addEventListener("click", function () { setOp(t.dataset.op); render(); });
  });
  $("#search").addEventListener("submit", function (e) {
    e.preventDefault();
    setZona($("#s-zona").value);
    state.tipo = $("#s-tipo").value;
    state.max = +$("#s-precio").value || 0;
    state.dorm = +$("#s-dorm").value || 0;
    render();
    $("#propiedades").scrollIntoView({ behavior: "smooth" });
  });
  $$("#filters .chip").forEach(function (c) {
    c.addEventListener("click", function () { setZona(c.dataset.zona); render(); });
  });
  $$("a[data-op]").forEach(function (a) {
    a.addEventListener("click", function () { setOp(a.dataset.op); render(); });
  });

  // ---------------------------------------------------------------------------
  // Ficha de propiedad
  // ---------------------------------------------------------------------------
  var sheet = $("#sheet"), current = null;
  function openSheet(ref) {
    var p = PROPS.filter(function (x) { return x.ref === ref; })[0];
    if (!p) return;
    current = p;
    $("#sheet-zona").textContent = p.zona + " · " + p.tipo;
    $("#sheet-ref").textContent = "Ref. " + p.ref;
    $("#sheet-title").textContent = p.title;
    $("#sheet-price").textContent = fmtPrice(p);
    $("#sheet-desc").textContent = p.desc;
    var rows = [["Superficie construida", nf.format(p.m2) + " m²"]];
    if (p.parcela) rows.push(["Parcela", nf.format(p.parcela) + " m²"]);
    if (p.terraza) rows.push(["Terraza", nf.format(p.terraza) + " m²"]);
    rows.push(["Dormitorios", p.dorm], ["Baños", p.banos], ["Certificado energético", p.energia]);
    if (p.op === "venta") rows.push(["Precio por m²", nf.format(Math.round(p.price / p.m2)) + " €/m²"]);
    $("#sheet-specs").innerHTML = rows.map(function (r) { return "<div><dt>" + r[0] + "</dt><dd>" + r[1] + "</dd></div>"; }).join("");
    var m = $("#sheet-media"); m.innerHTML = mediaHTML(p);
    if (typeof sheet.showModal === "function") sheet.showModal(); else sheet.setAttribute("open", "");
    requestAnimationFrame(function () { initMedia(m); });
  }
  function closeSheet() { if (sheet.open) sheet.close ? sheet.close() : sheet.removeAttribute("open"); }

  listEl.addEventListener("click", function (e) {
    var card = e.target.closest(".listing");
    if (card) openSheet(card.dataset.ref);
  });
  $("#sheet-close").addEventListener("click", closeSheet);
  sheet.addEventListener("click", function (e) { if (e.target === sheet) closeSheet(); });
  $("#sheet-cta").addEventListener("click", function () {
    if (!current) return;
    $("#c-ref").value = current.ref;
    var zona = $("#c-zona"); zona.value = current.zona;
    var radio = $('input[name="interes"][value="' + (current.op === "venta" ? "Comprar" : "Alquilar") + '"]');
    if (radio) radio.checked = true;
    $("#c-msg").value = "Me gustaría visitar «" + current.title + "».";
    closeSheet();
  });

  $$("a[data-interes]").forEach(function (a) {
    a.addEventListener("click", function () {
      var radio = $('input[name="interes"][value="' + a.dataset.interes + '"]');
      if (radio) radio.checked = true;
    });
  });

  // ---------------------------------------------------------------------------
  // Formulario de contacto
  // ---------------------------------------------------------------------------
  var form = $("#contact-form"), status = $("#form-status");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var ok = true;
    var checks = [
      ["#c-nombre", function (v) { return v.trim().length > 1; }, "Escribe tu nombre."],
      ["#c-email", function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }, "Revisa el correo: falta la @ o el dominio."]
    ];
    checks.forEach(function (c) {
      var el = $(c[0]), hint = $('.hint[data-for="' + el.id + '"]');
      var valid = c[1](el.value);
      hint.textContent = valid ? "" : c[2];
      el.setAttribute("aria-invalid", String(!valid));
      if (!valid && ok) { el.focus(); ok = false; }
    });
    if (!$("#c-rgpd").checked) {
      status.hidden = false;
      status.textContent = "Para enviar la solicitud, acepta la política de privacidad.";
      return;
    }
    if (!ok) return;
    var data = Object.fromEntries(new FormData(form).entries());
    // Conecta aquí tu servicio de envío (CRM, correo transaccional, Formspree…):
    // fetch("/api/contacto", { method: "POST", body: JSON.stringify(data) })
    status.hidden = false;
    status.textContent = "Gracias, " + data.nombre.trim() + ". Tu solicitud está lista para enviarse; en esta versión de demostración aún no hay un servicio de envío conectado.";
  });

  // ---------------------------------------------------------------------------
  // Menú móvil
  // ---------------------------------------------------------------------------
  var header = $(".site-header"), toggle = $("#menu-toggle");
  toggle.addEventListener("click", function () {
    var open = header.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  $$("#nav a").forEach(function (a) {
    a.addEventListener("click", function () { header.classList.remove("is-open"); toggle.setAttribute("aria-expanded", "false"); });
  });

  // Arranque
  setOp("venta");
  render();
  initMedia(document);
})();
