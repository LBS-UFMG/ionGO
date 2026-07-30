<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Ion curation — CatWizDB</title>
<link rel="stylesheet" href="css/bootstrap.min.css">
<link rel="stylesheet" href="css/curate.css">
</head>
<body class="bg-light">
  <div class="container" style="max-width:700px">
    <div class="card shadow-sm mt-5">
      <div class="card-body p-4 p-md-5">
        <h1 class="h3 mb-3">Manual ion curation</h1>
        <p class="text-secondary">
          You will review density boxes (atomic model + map) and decide, for each
          ion, whether it is <b>well annotated</b> (validated) or
          <b>poorly annotated</b> (for check). There are 400 ions; your progress is
          saved and can be resumed.
        </p>

        <div class="border rounded p-3 mb-1 small bg-light">
          <p class="fw-semibold mb-2">How to decide</p>
          <p class="mb-2">
            <span class="text-success fw-bold">&#10003; Well annotated</span> — you think the ion
            is correctly placed: there is map coverage at the ion, and at least the minimum
            coordinating atoms are present and correctly annotated.
          </p>
          <p class="mb-2">
            <span class="text-danger fw-bold">&#9888; Poorly annotated</span> — you think the ion
            may not be correct: there isn't enough map coverage to place it there, or coordinating
            atoms that would justify it are missing. <i>(The map may suggest atoms are nearby, but if
            they were not annotated in the model, mark it poorly annotated.)</i>
          </p>
          <p class="text-secondary mb-0">When in doubt, use your own judgement.</p>
        </div>

        <form action="start" method="post" class="mt-4">
          <?= csrf_field() ?>
          <label for="curator" class="form-label fw-semibold">Enter your name to begin</label>
          <input type="text" id="curator" name="curator" required autofocus
                 autocomplete="off" class="form-control form-control-lg"
                 placeholder="e.g. Rafael">
          <div class="form-text">Please use a single name (e.g. your first name).</div>
          <button type="submit" class="btn btn-primary btn-lg w-100 mt-3">Start &rarr;</button>
        </form>
      </div>
    </div>
  </div>
</body>
</html>
