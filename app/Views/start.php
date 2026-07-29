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
  <div class="container" style="max-width:560px">
    <div class="card shadow-sm mt-5">
      <div class="card-body p-4 p-md-5">
        <h1 class="h3 mb-3">Manual ion curation</h1>
        <p class="text-secondary">
          You will review density boxes (atomic model + map) and decide, for each
          ion, whether it is <b>well annotated</b> (validated) or
          <b>poorly annotated</b> (for check). There are 400 ions; your progress is
          saved and can be resumed.
        </p>
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
