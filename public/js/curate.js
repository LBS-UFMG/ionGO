/* Manual curation viewer (3Dmol.js).
 * Loads one ion at a time: model (.cif) + map (.map, CCP4) centred on the ion,
 * a contour slider in sigma units, and two big decision buttons. Saves each
 * judgement and advances. Progress is resumable (server tracks done ids). */

(function () {
  "use strict";

  var BASE = window.BASE_URL || "";   // "" => relative URLs (portable under any base)
  var viewer, voldata = null, iso = null;
  var currentItem = null, sigma = 1, level = 1.5, busy = false, clickLabel = null;

  var elProgress = document.getElementById("progress");
  var elMeta     = document.getElementById("meta");
  var elContour  = document.getElementById("contour");
  var elContourV = document.getElementById("contourVal");
  var btnVal     = document.getElementById("btnValidated");
  var btnChk     = document.getElementById("btnCheck");

  function setButtons(on) {
    btnVal.disabled = !on;
    btnChk.disabled = !on;
  }

  function drawIso(lvl) {
    if (!voldata) return;
    if (iso) { try { viewer.removeShape(iso); } catch (e) {} }
    iso = viewer.addIsosurface(voldata, {
      isoval: lvl * sigma, color: "#2b6cff", opacity: 0.9,
      wireframe: true, linewidth: 1.0
    });
    viewer.render();
  }

  // a deliberately discreet label (small, translucent, muted)
  function subtleLabel(pos, size) {
    return {
      position: pos, fontSize: size || 11, fontColor: "#e6e6e6",
      backgroundColor: "black", backgroundOpacity: 0.28,
      borderThickness: 0.0, inFront: true
    };
  }

  function render(item) {
    viewer.clear();
    voldata = null; iso = null; clickLabel = null;
    var parts = item.id.split("_");            // PDB _ chain+UL _ resno _ ION
    var chain = parts[1].slice(0, -1);
    var resi  = parseInt(parts[2], 10);
    var ionColor = item.ion === "MG" ? 0x2ecc40 : 0x9b59b6;
    var ionScale = 0.32;   // ion rendered as small as a water (Mg and K alike)

    return Promise.all([
      fetch(BASE + item.cif).then(function (r) { return r.text(); }),
      fetch(BASE + item.map).then(function (r) { return r.arrayBuffer(); })
    ]).then(function (res) {
      var model = viewer.addModel(res[0], "cif");
      // every atom visible (waters/ions are non-bonded -> need spheres)
      viewer.setStyle({}, { stick: { radius: 0.14 }, sphere: { scale: 0.20 } });
      // waters prominent (the coordination shell matters for the judgement)
      viewer.setStyle({ resn: ["HOH", "WAT", "DOD"] },
                      { sphere: { scale: 0.32, color: 0xff4d4d } });
      // highlight the target ion (drawn last, on top)
      viewer.setStyle({ chain: chain, resi: resi },
                      { sphere: { scale: 0.22, color: ionColor } });

      var ionSel  = model.selectedAtoms({ chain: chain, resi: resi });
      var ionAtom = ionSel.length ? ionSel[0] : null;
      // dashed contacts + distance labels
      addContacts(model, ionAtom, item.ion);
      // discreet label with the central ion name
      if (ionAtom) {
        viewer.addLabel(item.ion, subtleLabel({ x: ionAtom.x, y: ionAtom.y, z: ionAtom.z }, 13));
      }
      // click any atom -> discreet label: atom name · residue number · chain
      viewer.setClickable({}, true, function (atom) {
        if (clickLabel) { viewer.removeLabel(clickLabel); }
        clickLabel = viewer.addLabel(
          atom.atom + " · " + atom.resn + " " + atom.resi + " · " + atom.chain,
          subtleLabel({ x: atom.x, y: atom.y, z: atom.z }, 12));
        viewer.render();
      });

      voldata = new $3Dmol.VolumeData(res[1], "ccp4");
      drawIso(level);
      viewer.zoomTo({ chain: chain, resi: resi });
      viewer.zoom(0.9);
      viewer.render();
    });
  }

  function addContacts(model, c, ion) {
    if (!c) return;
    var cutoff = ion === "MG" ? 2.6 : 3.5;        // Mg inner sphere / K contact range
    model.selectedAtoms({}).forEach(function (a) {
      if (a.elem === "H" || a.serial === c.serial) return;
      var dx = a.x - c.x, dy = a.y - c.y, dz = a.z - c.z;
      var d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d > 0.3 && d <= cutoff) {
        // dashed CYLINDER (thicker than 3Dmol's thin default line)
        viewer.addCylinder({
          start: { x: c.x, y: c.y, z: c.z },
          end:   { x: a.x, y: a.y, z: a.z },
          radius: 0.05, dashed: true, fromCap: 1, toCap: 1, color: "#ffd500"
        });
        // discreet distance label at the midpoint
        viewer.addLabel(d.toFixed(2), subtleLabel({
          x: (c.x + a.x) / 2, y: (c.y + a.y) / 2, z: (c.z + a.z) / 2 }, 10));
      }
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
    return fetch(BASE + "api/next").then(function (r) { return r.json(); })
      .then(function (r) {
        if (r.finished) {
          progressText(r.done, r.total, false);
          document.querySelector("main").classList.add("hidden");
          document.getElementById("doneScreen").classList.remove("hidden");
          return;
        }
        currentItem = r.item;
        sigma = r.item.sigma || 1;
        progressText(r.done, r.total, true);
        var resTxt = r.item.res ? (r.item.res + " Å") : "res ?";
        elMeta.textContent = r.item.pdb + " · " + resTxt + " · " + r.item.ion + " · " + r.item.id;
        return render(r.item).then(function () { setButtons(true); busy = false; });
      });
  }

  function save(decision) {
    if (busy || !currentItem) return;
    busy = true;
    setButtons(false);
    var body = new URLSearchParams();
    body.set("id", currentItem.id);
    body.set("decision", decision);
    body.set("contour", level.toFixed(1));
    if (window.CSRF_NAME) body.set(window.CSRF_NAME, window.CSRF_HASH);
    fetch(BASE + "api/save", { method: "POST", body: body })
      .then(function () { loadNext(); })
      .catch(function () { busy = false; setButtons(true); });
  }

  // ---- wire up -----------------------------------------------------------
  document.addEventListener("DOMContentLoaded", function () {
    viewer = $3Dmol.createViewer(document.getElementById("viewer"),
                                 { backgroundColor: "black" });
    elContour.addEventListener("input", function () {
      level = parseFloat(elContour.value);
      elContourV.textContent = level.toFixed(1);
      drawIso(level);
    });
    btnVal.addEventListener("click", function () { save("validated"); });
    btnChk.addEventListener("click", function () { save("check"); });
    document.addEventListener("keydown", function (e) {
      if (busy) return;
      if (e.key === "v" || e.key === "V") save("validated");
      if (e.key === "c" || e.key === "C") save("check");
    });
    // element-colour legend popover (footer "?")
    var legendBtn = document.getElementById("legendBtn");
    if (legendBtn && window.bootstrap) {
      new bootstrap.Popover(legendBtn, {
        html: true, sanitize: false,   // our own content; keep the inline colour dots
        trigger: "focus", placement: "top", title: "Element colours",
        content: document.getElementById("legendContent").innerHTML
      });
    }
    loadNext();
  });
})();
