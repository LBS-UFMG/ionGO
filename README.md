# Manual curation web app (CodeIgniter 4.6)

A curator types their name, then judges 400 ions one at a time in a 3Dmol viewer
(atomic model + density map), moving a contour slider and clicking **Bem anotado
(validated)** or **Mal anotado (for check)**. Each click saves the judgement and
loads the next ion. Progress is per-curator and resumable.

The **400 ions** = 300 Mg + 100 K, half `validated` / half `check` (by Cat_Wiz),
drawn from the 100 structures in `data/cmm/cmm_validation_sample_100.tsv`. The
true labels are **not** sent to the browser (no bias).

## Files
```
app/Controllers/Curation.php     pages (index/start/curate) + api (next/save)
app/Config/Routes.php            5 routes (merge into your project's Routes.php)
app/Views/start.php              name entry
app/Views/curate.php             viewer page
public/js/3Dmol-min.js           bundled viewer library (no CDN)
public/js/curate.js              viewer + slider + buttons + save/next
public/css/curate.css
public/data/curation_manifest.json   400 ions, NO labels (id, pdb, ion, files, sigma)
public/data/ions/<id>.cif|.map       the 800 per-ion crops (model + native map)
writable/curation_key.json           id -> {ion, true_label}  (server-side only)
public/data/<curator>.csv            one CSV per curator (created at runtime)
```

## Deploy on your CI4 4.6 server
1. Copy `app/*` and `public/*` into your CodeIgniter project (merge, don't clobber
   an existing `Routes.php` — just add the 5 `$routes` lines).
2. `app.baseURL` does **not** need configuring — the app uses relative URLs on
   the client and a relative redirect, so it works at the domain root or under a
   subpath as-is. (Set it only if you add code that calls `base_url()`.)
3. Make `public/data/` writable by the web server (results are written there as
   `<curator>.csv`). `writable/curation_key.json` holds the true labels server-side.
   Note: `public/data/` is web-served, so the result CSVs are downloadable by URL.
4. **CSRF:** this app POSTs to `api/save`. Easiest is to leave CSRF off (CI4
   default) for this internal tool. If you enable it, either exclude `api/*` from
   the csrf filter **or** set `public bool $regenerate = false;` in
   `app/Config/Security.php` (otherwise the token rotates and repeated POSTs fail).
   The frontend already sends the token field when present.
5. Visit the app URL → type a name → curate.

Each judgement is appended to `public/data/<curator>.csv`:
```csv
curator,id,decision,contour,timestamp
Rafael,7K00_AU_1669_MG,validated,1.5,2026-07-29T10:11:12+00:00
```

## Analysis
When curators are done, keep their `<curator>.csv` files in
`manual_curation/public/data/` and run:
```
python3 case_study/analyze_curation.py
```
It reports, per curator: agreement with Cat_Wiz, sensitivity/specificity treating
`validated` as positive, and a confusion matrix; plus inter-curator agreement if
more than one curated.

## Map alignment
The per-ion maps are the native crops (CCP4, referencing the original cell via
NxSTART). Alignment was verified in **both ChimeraX and 3Dmol** — the density
isosurface sits on the highlighted central ion, with the surrounding
model in ball-and-stick.
