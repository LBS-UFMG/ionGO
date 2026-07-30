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

  <main class="container py-2" style="max-width:1000px">
    <div id="viewer"></div>

    <div class="contour d-flex align-items-center gap-2 px-1 mt-2">
      <label for="contour" class="mb-0 small fw-semibold text-nowrap">
        Contour <span id="contourVal" class="text-primary">1.5</span> σ
      </label>
      <input type="range" class="form-range flex-grow-1" id="contour"
             min="0.1" max="5" step="0.05" value="1.5">
      <button type="button" class="btn btn-sm btn-outline-secondary text-nowrap" id="measureBtn"
              data-bs-toggle="tooltip" data-bs-placement="top"
              title="Click here, then click two atoms to measure the distance between them.">📏 Measure distance</button>
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
      Drag to rotate · scroll to zoom · click an atom to see its name &amp; number ·
      target ion highlighted · waters in red ·
      dashed lines = ion contacts, shown automatically for Mg at ≤ 2.6 Å and for K at ≤ 3.2 Å
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

  <div id="doneScreen" class="container hidden" style="max-width:1000px">
    <div class="text-center my-4">
      <h1 class="h4">Done! 🎉 Thank you, <b><?= esc($curator) ?></b>.</h1>
      <p class="fs-5 mb-1"><span id="resPct" class="fw-bold text-primary">–</span> agreement with Cat_Wiz (overall)</p>
      <p class="mb-1" id="resStrat"></p>
      <p class="text-secondary small" id="resSummary"></p>
    </div>

    <div class="alert alert-light border small mb-3">
      <span class="text-success fw-bold">validated</span> — the ion meets the criteria that indicate it really
      belongs there (a well-supported annotation).<br>
      <span class="text-danger fw-bold">for check</span> — one or more criteria were not met, so the decision to
      place the ion there depends on manual curation (questionable annotation).
    </div>

    <!-- review panel (shown when a row is clicked) -->
    <div id="reviewPanel" class="hidden mb-3">
      <button class="btn btn-sm btn-secondary mb-2" id="backToList">&larr; back to the list</button>
      <div class="alert py-2 mb-2 d-flex justify-content-between align-items-center flex-wrap gap-2" id="reviewBanner"></div>
      <div id="reviewViewer" style="width:100%;height:56vh;min-height:340px;background:#000;border-radius:.5rem;position:relative"></div>
      <div class="d-flex align-items-center gap-2 px-1 mt-2">
        <label class="mb-0 small fw-semibold text-nowrap">Contour <span id="rvContourVal" class="text-primary">1.5</span> σ</label>
        <input type="range" class="form-range flex-grow-1" id="rvContour" min="0.1" max="5" step="0.05" value="1.5">
        <button type="button" class="btn btn-sm btn-outline-secondary text-nowrap" id="rvMeasureBtn"
                data-bs-toggle="tooltip" data-bs-placement="top"
                title="Click here, then click two atoms to measure the distance between them.">📏 Measure distance</button>
      </div>
      <div class="card card-body mt-3 small" id="reviewRules"></div>
    </div>

    <!-- results table -->
    <div id="resTableWrap">
      <div class="btn-group btn-group-sm mb-2" id="resFilter" role="group">
        <button type="button" class="btn btn-primary" data-f="all">All</button>
        <button type="button" class="btn btn-outline-primary" data-f="MG">Mg</button>
        <button type="button" class="btn btn-outline-primary" data-f="K">K</button>
      </div>
      <div class="table-responsive">
        <table class="table table-sm table-hover align-middle">
          <thead><tr>
            <th data-sort="i"        style="cursor:pointer">#</th>
            <th data-sort="pdb"      style="cursor:pointer">Structure &#8597;</th>
            <th data-sort="ion"      style="cursor:pointer">Ion &#8597;</th>
            <th data-sort="decision" style="cursor:pointer">Your answer &#8597;</th>
            <th data-sort="catwiz"   style="cursor:pointer">Cat_Wiz &#8597;</th>
            <th data-sort="agree"    style="cursor:pointer">Match &#8597;</th>
            <th></th>
          </tr></thead>
          <tbody id="resTableBody"></tbody>
        </table>
      </div>
    </div>
  </div>

  <script src="js/bootstrap.bundle.min.js"></script>
  <script src="js/curate.js"></script>
</body>
</html>
