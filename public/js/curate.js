/* Manual curation viewer (3Dmol.js).
 * Loads one ion at a time: model (.cif) + map (.map, CCP4) centred on the ion,
 * a contour slider, decision buttons, a distance-measure tool, and an end-of-run
 * results/debrief screen comparing the curator to Cat_Wiz. */

(function () {
  "use strict";

  var BASE = window.BASE_URL || "";
  var viewer, voldata = null, iso = null;
  var currentItem = null, sigma = 1, level = 1.5, busy = false;
  var clickLabel = null, clickViewer = null;
  var measureMode = false, measureFirst = null, measureMarker = null;
  var reviewViewer = null, rvVol = null, rvIso = null, rvSigma = 1, rvLevel = 1.5;

  var elProgress = document.getElementById("progress");
  var elMeta     = document.getElementById("meta");
  var elContour  = document.getElementById("contour");
  var elContourV = document.getElementById("contourVal");
  var btnVal     = document.getElementById("btnValidated");
  var btnChk     = document.getElementById("btnCheck");

  function setButtons(on) { btnVal.disabled = !on; btnChk.disabled = !on; }

  // a deliberately discreet label (small, translucent, muted)
  function subtleLabel(pos, size) {
    return { position: pos, fontSize: size || 11, fontColor: "#e6e6e6",
             backgroundColor: "black", backgroundOpacity: 0.28, borderThickness: 0.0, inFront: true };
  }
  function measLabel(pos) {
    return { position: pos, fontSize: 12, fontColor: "#00e5ff",
             backgroundColor: "black", backgroundOpacity: 0.45, borderThickness: 0.0, inFront: true };
  }
  function dist(a, b) {
    var dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  function mid(a, b) { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 }; }

  function drawIso(lvl) {
    if (!voldata) return;
    if (iso) { try { viewer.removeShape(iso); } catch (e) {} }
    iso = viewer.addIsosurface(voldata, { isoval: lvl * sigma, color: "#2b6cff",
      opacity: 0.9, wireframe: true, linewidth: 1.0 });
    viewer.render();
  }

  // dashed contacts (ion -> coordinating atoms) + distance labels, on any viewer
  function addContacts(vwr, model, c, ion) {
    if (!c) return;
    var cutoff = ion === "MG" ? 2.6 : 3.2;
    model.selectedAtoms({}).forEach(function (a) {
      if (a.elem === "H" || a.serial === c.serial) return;
      var d = dist(a, c);
      if (d > 0.3 && d <= cutoff) {
        vwr.addCylinder({ start: { x: c.x, y: c.y, z: c.z }, end: { x: a.x, y: a.y, z: a.z },
          radius: 0.05, dashed: true, fromCap: 1, toCap: 1, color: "#ffd500" });
        vwr.addLabel(d.toFixed(2), subtleLabel(mid(c, a), 10));
      }
    });
  }

  // click handler: measure mode (main viewer) OR atom-info (any viewer)
  function makeClickHandler(vwr, allowMeasure) {
    return function (atom) {
      if (allowMeasure && measureMode) {
        if (!measureFirst) {
          measureFirst = atom;
          measureMarker = vwr.addSphere({ center: { x: atom.x, y: atom.y, z: atom.z },
            radius: 0.28, color: "cyan", opacity: 0.55 });
          vwr.render();
        } else {
          var md = dist(measureFirst, atom);
          if (atom.serial === measureFirst.serial || md < 0.01) return;   // same atom -> no 0.00 Å
          vwr.addCylinder({ start: { x: measureFirst.x, y: measureFirst.y, z: measureFirst.z },
            end: { x: atom.x, y: atom.y, z: atom.z }, radius: 0.045, dashed: true,
            fromCap: 1, toCap: 1, color: "#00e5ff" });
          vwr.addLabel(md.toFixed(2) + " Å", measLabel(mid(measureFirst, atom)));
          if (measureMarker) { try { vwr.removeShape(measureMarker); } catch (e) {} measureMarker = null; }
          measureFirst = null; vwr.render();
        }
        return;
      }
      if (clickLabel && clickViewer) { try { clickViewer.removeLabel(clickLabel); } catch (e) {} }
      clickLabel = vwr.addLabel(atom.atom + " · " + atom.resn + " " + atom.resi + " · " + atom.chain,
        subtleLabel({ x: atom.x, y: atom.y, z: atom.z }, 12));
      clickViewer = vwr;
      vwr.render();
    };
  }

  // shared scene painter (model + waters + target ion + contacts + ion label)
  function paint(vwr, item, allowMeasure) {
    var parts = item.id.split("_");
    var chain = parts[1].slice(0, -1);
    var resi  = parseInt(parts[2], 10);
    var ionColor = item.ion === "MG" ? 0x2ecc40 : 0x9b59b6;

    var model = vwr.addModel(item._cif, "cif");
    vwr.setStyle({}, { stick: { radius: 0.14 }, sphere: { scale: 0.20 } });
    vwr.setStyle({ resn: ["HOH", "WAT", "DOD"] }, { sphere: { scale: 0.32, color: 0xff4d4d } });
    // target ion: SAME size as the residue atom balls (scale 0.20), only recoloured
    vwr.setStyle({ chain: chain, resi: resi }, { sphere: { scale: 0.20, color: ionColor } });

    var ionSel = model.selectedAtoms({ chain: chain, resi: resi });
    var ionAtom = ionSel.length ? ionSel[0] : null;
    addContacts(vwr, model, ionAtom, item.ion);
    if (ionAtom) vwr.addLabel(item.ion, subtleLabel({ x: ionAtom.x, y: ionAtom.y, z: ionAtom.z }, 13));
    vwr.setClickable({}, true, makeClickHandler(vwr, allowMeasure));
    return { chain: chain, resi: resi };
  }

  function render(item) {
    viewer.clear();
    voldata = null; iso = null; clickLabel = null; measureFirst = null; measureMarker = null;
    return Promise.all([
      fetch(BASE + item.cif).then(function (r) { return r.text(); }),
      fetch(BASE + item.map).then(function (r) { return r.arrayBuffer(); })
    ]).then(function (res) {
      item._cif = res[0];
      var sel = paint(viewer, item, true);
      voldata = new $3Dmol.VolumeData(res[1], "ccp4");
      drawIso(level);
      viewer.zoomTo({ chain: sel.chain, resi: sel.resi }); viewer.zoom(0.9); viewer.render();
    });
  }

  function progressText(done, total, current) {
    elProgress.textContent = (current ? (done + 1) : done) + " / " + total;
    var bar = document.getElementById("progressBar");
    if (bar && total) bar.style.width = (100 * done / total) + "%";
  }

  function loadNext() {
    setButtons(false);
    elMeta.textContent = "Carregando…";
    return fetch(BASE + "api/next").then(function (r) { return r.json(); }).then(function (r) {
      if (r.finished) { progressText(r.done, r.total, false); showResults(); return; }
      currentItem = r.item; sigma = r.item.sigma || 1;
      progressText(r.done, r.total, true);
      var resTxt = r.item.res ? (r.item.res + " Å") : "res ?";
      elMeta.textContent = r.item.pdb + " · " + resTxt + " · " + r.item.ion + " · " + r.item.id;
      return render(r.item).then(function () { setButtons(true); busy = false; });
    });
  }

  function save(decision) {
    if (busy || !currentItem) return;
    busy = true; setButtons(false);
    var body = new URLSearchParams();
    body.set("id", currentItem.id); body.set("decision", decision); body.set("contour", level.toFixed(1));
    if (window.CSRF_NAME) body.set(window.CSRF_NAME, window.CSRF_HASH);
    fetch(BASE + "api/save", { method: "POST", body: body })
      .then(function () { loadNext(); })
      .catch(function () { busy = false; setButtons(true); });
  }

  // ---- results / review ---------------------------------------------------
  // turn the review-viewer measure tool off and restore the button's look
  function resetReviewMeasure() {
    measureMode = false; measureFirst = null;
    if (measureMarker && reviewViewer) { try { reviewViewer.removeShape(measureMarker); } catch (e) {} }
    measureMarker = null;
    var b = document.getElementById("rvMeasureBtn");
    if (b) { b.classList.remove("btn-primary"); b.classList.add("btn-outline-secondary"); }
  }

  function rvDrawIso(lvl) {
    if (!rvVol) return;
    if (rvIso) { try { reviewViewer.removeShape(rvIso); } catch (e) {} }
    rvIso = reviewViewer.addIsosurface(rvVol, { isoval: lvl * rvSigma, color: "#2b6cff",
      opacity: 0.9, wireframe: true, linewidth: 1.0 });
    reviewViewer.render();
  }

  function reviewIon(it) {
    document.getElementById("resTableWrap").classList.add("hidden");
    document.getElementById("reviewPanel").classList.remove("hidden");
    var banner = document.getElementById("reviewBanner");
    banner.className = "alert py-2 mb-2 d-flex justify-content-between align-items-center flex-wrap gap-2 " +
      (it.agree ? "alert-success" : "alert-danger");
    banner.innerHTML = "<span><b>" + it.pdb + "</b> · " + it.ion + " · " + it.id + "</span>" +
      "<span>Your answer: <b>" + it.decision + "</b> &nbsp;|&nbsp; Cat_Wiz: <b>" + it.catwiz + "</b> &nbsp;" +
      (it.agree ? "✓ agree" : "✗ differ") + "</span>";
    document.getElementById("reviewRules").innerHTML = ruleText(it.ion);
    resetReviewMeasure();               // start with the measure tool off
    window.scrollTo(0, 0);
    if (!reviewViewer) reviewViewer = $3Dmol.createViewer(document.getElementById("reviewViewer"), { backgroundColor: "black" });
    reviewViewer.clear(); rvVol = null; rvIso = null; rvSigma = it.sigma || 1;
    Promise.all([
      fetch(BASE + it.cif).then(function (r) { return r.text(); }),
      fetch(BASE + it.map).then(function (r) { return r.arrayBuffer(); })
    ]).then(function (res) {
      it._cif = res[0];
      var sel = paint(reviewViewer, it, true);   // allow the distance-measure tool here too
      rvVol = new $3Dmol.VolumeData(res[1], "ccp4");
      rvDrawIso(rvLevel);
      reviewViewer.zoomTo({ chain: sel.chain, resi: sel.resi }); reviewViewer.zoom(0.9); reviewViewer.render();
    });
  }

  var resItems = [], resFilter = "all", resSort = { key: "i", dir: 1 }, resWired = false;

  // the Cat_Wiz classification rules, shown under the review viewer
  function ruleText(ion) {
    if (ion === "MG") {
      return "<b>How Cat_Wiz classifies Mg²⁺</b> — ligands counted in distance bins " +
        "&lt;2.3 / 2.3–2.6 / 2.6–3.2 Å:<br>" +
        "&bull; <span class='text-success fw-bold'>validated</span>: exactly <b>6 ligands at &lt;2.3 Å</b> " +
        "(octahedral, CN 6/0/0), supported by the map.<br>" +
        "&bull; <span class='text-danger fw-bold'>for check</span>: not 6 short ligands — too few, ligands at " +
        "longer distances, or no map coverage (e.g. CN 5/1/0, 2/0/0, 0/0/0).";
    }
    return "<b>How Cat_Wiz classifies K⁺</b> — ligands counted in distance bins " +
      "&lt;2.3 / 2.3–2.6 / 2.6–3.2 Å:<br>" +
      "&bull; <span class='text-success fw-bold'>validated</span>: all contacts in the <b>2.6–3.2 Å</b> range " +
      "(none closer than 2.6 Å; CN 0/0/N), consistent with the larger K⁺.<br>" +
      "&bull; <span class='text-danger fw-bold'>for check</span>: a contact too short (<b>2.3–2.6 Å</b>, a " +
      "divalent-like distance) or no coordination (e.g. CN 0/1/N, 0/0/0).";
  }

  function renderResTable() {
    var tb = document.getElementById("resTableBody");
    var rows = resItems.filter(function (it) { return resFilter === "all" || it.ion === resFilter; });
    var k = resSort.key, dir = resSort.dir;
    rows.sort(function (a, b) { return (a[k] < b[k]) ? -dir : (a[k] > b[k]) ? dir : 0; });
    tb.innerHTML = "";
    rows.forEach(function (it) {
      var tr = document.createElement("tr");
      if (!it.agree) tr.className = "table-danger";
      tr.innerHTML = "<td>" + (it.i + 1) + "</td><td>" + it.pdb + "</td><td>" + it.ion + "</td>" +
        "<td>" + it.decision + "</td><td>" + it.catwiz + "</td>" +
        "<td>" + (it.agree ? '<span class="text-success">✓</span>' : '<span class="text-danger">✗</span>') + "</td>" +
        '<td><button class="btn btn-sm btn-outline-primary">review</button></td>';
      tr.querySelector("button").addEventListener("click", function () { reviewIon(it); });
      tb.appendChild(tr);
    });
  }

  function showResults() {
    fetch(BASE + "api/results").then(function (r) { return r.json(); }).then(function (d) {
      document.getElementById("resPct").textContent = d.pct + "%";
      // stratified agreement by ion x Cat_Wiz class (validated / check)
      var by = {};
      d.items.forEach(function (it, i) {
        it.i = i;                                   // stable index for the "#" column
        var kk = it.ion + "|" + it.catwiz;
        (by[kk] = by[kk] || { a: 0, t: 0 });
        by[kk].t++; if (it.agree) by[kk].a++;
      });
      function cell(ion, cls) {
        var o = by[ion + "|" + cls] || { a: 0, t: 0 };
        var pc = o.t ? Math.round(100 * o.a / o.t) : 0;
        return "<b class='text-primary'>" + pc + "%</b> (" + o.a + "/" + o.t + ")";
      }
      document.getElementById("resStrat").innerHTML =
        "Mg — validated " + cell("MG", "validated") + " · check " + cell("MG", "check") + "<br>" +
        "K — validated " + cell("K", "validated") + " · check " + cell("K", "check");
      document.getElementById("resSummary").textContent =
        d.agree + " of " + d.total + " match Cat_Wiz · " + (d.total - d.agree) +
        " differ. Filter/sort the table, click a row to review.";
      resItems = d.items;
      renderResTable();
      if (!resWired) {
        resWired = true;
        Array.prototype.forEach.call(document.querySelectorAll("#resFilter button"), function (b) {
          b.addEventListener("click", function () {
            resFilter = b.getAttribute("data-f");
            Array.prototype.forEach.call(document.querySelectorAll("#resFilter button"), function (x) {
              x.classList.toggle("btn-primary", x === b);
              x.classList.toggle("btn-outline-primary", x !== b);
            });
            renderResTable();
          });
        });
        Array.prototype.forEach.call(document.querySelectorAll("th[data-sort]"), function (th) {
          th.addEventListener("click", function () {
            var key = th.getAttribute("data-sort");
            resSort.dir = (resSort.key === key) ? -resSort.dir : 1;
            resSort.key = key;
            renderResTable();
          });
        });
      }
      document.querySelector("main").classList.add("hidden");
      document.getElementById("doneScreen").classList.remove("hidden");
    });
  }

  // ---- wire up ------------------------------------------------------------
  document.addEventListener("DOMContentLoaded", function () {
    viewer = $3Dmol.createViewer(document.getElementById("viewer"), { backgroundColor: "black" });
    elContour.addEventListener("input", function () {
      level = parseFloat(elContour.value); elContourV.textContent = level.toFixed(1); drawIso(level);
    });
    btnVal.addEventListener("click", function () { save("validated"); });
    btnChk.addEventListener("click", function () { save("check"); });
    document.addEventListener("keydown", function (e) {
      if (busy) return;
      if (e.key === "v" || e.key === "V") save("validated");
      if (e.key === "c" || e.key === "C") save("check");
    });

    // distance-measure toggle
    var measureBtn = document.getElementById("measureBtn");
    if (measureBtn) {
      measureBtn.addEventListener("click", function () {
        measureMode = !measureMode;
        measureBtn.classList.toggle("btn-primary", measureMode);
        measureBtn.classList.toggle("btn-outline-secondary", !measureMode);
        if (!measureMode && measureMarker) { try { viewer.removeShape(measureMarker); } catch (e) {} measureMarker = null; measureFirst = null; viewer.render(); }
      });
    }

    // colour-legend popover
    var legendBtn = document.getElementById("legendBtn");
    if (legendBtn && window.bootstrap) {
      new bootstrap.Popover(legendBtn, { html: true, sanitize: false, trigger: "focus",
        placement: "top", title: "Element colours",
        content: document.getElementById("legendContent").innerHTML });
    }
    // enable Bootstrap tooltips (e.g. the "Measure distance" button)
    if (window.bootstrap) {
      Array.prototype.forEach.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'), function (el) {
        new bootstrap.Tooltip(el);
      });
    }

    // results: back-to-list + review contour slider
    var backBtn = document.getElementById("backToList");
    if (backBtn) backBtn.addEventListener("click", function () {
      resetReviewMeasure();
      document.getElementById("reviewPanel").classList.add("hidden");
      document.getElementById("resTableWrap").classList.remove("hidden");
    });

    // distance-measure toggle for the final review viewer
    var rvMeasureBtn = document.getElementById("rvMeasureBtn");
    if (rvMeasureBtn) {
      rvMeasureBtn.addEventListener("click", function () {
        measureMode = !measureMode;
        rvMeasureBtn.classList.toggle("btn-primary", measureMode);
        rvMeasureBtn.classList.toggle("btn-outline-secondary", !measureMode);
        if (!measureMode && measureMarker && reviewViewer) {
          try { reviewViewer.removeShape(measureMarker); } catch (e) {}
          measureMarker = null; measureFirst = null; reviewViewer.render();
        }
      });
    }
    var rvSlider = document.getElementById("rvContour");
    if (rvSlider) rvSlider.addEventListener("input", function () {
      rvLevel = parseFloat(rvSlider.value);
      document.getElementById("rvContourVal").textContent = rvLevel.toFixed(1);
      rvDrawIso(rvLevel);
    });

    loadNext();
  });
})();
