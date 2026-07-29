<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Curation — CatWizDB</title>
<link rel="stylesheet" href="css/bootstrap.min.css">
<link rel="stylesheet" href="css/curate.css">
<script src="js/3Dmol-min.js"></script>
<script>
  window.BASE_URL  = "";                       /* relative -> works under any base */
  window.CSRF_NAME = "<?= csrf_token() ?>";
  window.CSRF_HASH = "<?= csrf_hash() ?>";
</script>
</head>
<body class="bg-light">
  <!-- everything the status bar used to hold now lives in the header -->
  <nav class="navbar bg-white border-bottom px-3 py-2 d-flex justify-content-between align-items-center">
    <span class="small text-nowrap">Curator:
      <a href="." class="fw-bold text-decoration-none" title="Change name (back to home)"><?= esc($curator) ?></a>
    </span>
    <span class="font-monospace small text-truncate mx-2 text-secondary" id="meta">Loading…</span>
    <span class="fw-bold text-primary text-nowrap" id="progress">–</span>
  </nav>
  <div class="progress rounded-0" style="height:4px">
    <div class="progress-bar" id="progressBar" style="width:0%"></div>
  </div>

  <main class="container py-2" style="max-width:900px">
    <div id="viewer"></div>

    <div class="contour d-flex align-items-center gap-2 px-1 mt-2">
      <label for="contour" class="mb-0 small fw-semibold text-nowrap">
        Contour <span id="contourVal" class="text-primary">1.5</span> σ
      </label>
      <input type="range" class="form-range flex-grow-1" id="contour"
             min="0.1" max="5" step="0.05" value="1.5">
    </div>

    <div class="row g-2 mt-1">
      <div class="col-6">
        <button id="btnValidated" class="btn btn-success btn-lg big w-100" disabled>
          &#10003; Well annotated<br><small>(validated) &middot; press V</small>
        </button>
      </div>
      <div class="col-6">
        <button id="btnCheck" class="btn btn-danger btn-lg big w-100" disabled>
          &#9888; Poorly annotated<br><small>(for check) &middot; press C</small>
        </button>
      </div>
    </div>

    <div class="hint text-center text-secondary small mt-2">
      Drag to rotate · scroll to zoom · target ion highlighted · waters in red ·
      dashed lines = ion contacts
      <button type="button" class="btn btn-sm btn-outline-secondary rounded-circle py-0 px-2 ms-1"
              id="legendBtn" title="Element colours">?</button>
    </div>

    <div id="legendContent" class="d-none">
      <div class="legend">
        <div><span class="dot" style="background:#e74c3c"></span>red — oxygen</div>
        <div><span class="dot" style="background:#c8c8c8"></span>grey — carbon</div>
        <div><span class="dot" style="background:#3050f8"></span>blue — nitrogen</div>
        <div><span class="dot" style="background:#ff8000"></span>orange — phosphorus</div>
        <div><span class="dot" style="background:#e6c200"></span>yellow — sulfur</div>
        <div><span class="dot" style="background:#2ecc40"></span>green — Mg (target)</div>
        <div><span class="dot" style="background:#9b59b6"></span>purple — K (target)</div>
        <div><span class="dot" style="background:#ff4d4d"></span>red sphere — water</div>
        <div><span class="dot" style="background:#ffd500"></span>gold dashed — ion contact</div>
      </div>
    </div>
  </main>

  <div id="doneScreen" class="container hidden" style="max-width:560px">
    <div class="card shadow-sm mt-5 text-center">
      <div class="card-body p-5">
        <h1 class="h3">Done! 🎉</h1>
        <p class="text-secondary mb-0">You have reviewed every ion. Thank you, <b><?= esc($curator) ?></b>.</p>
      </div>
    </div>
  </div>

  <script src="js/bootstrap.bundle.min.js"></script>
  <script src="js/curate.js"></script>
</body>
</html>
