<?php

namespace App\Controllers;

use CodeIgniter\Controller;

/**
 * Manual curation experiment for CatWizDB ions.
 *
 * Flow: the curator types a name (index/start), then curate() shows one ion at a
 * time in a 3Dmol viewer (model + map) with a contour slider and two big buttons
 * (Validated / For check). The frontend calls /api/next and /api/save; responses
 * are appended per-curator to writable/responses/<name>.jsonl so a session can be
 * resumed. The true labels live in writable/curation_key.json and are never sent
 * to the browser.
 */
class Curation extends Controller
{
    private function manifest(): array
    {
        return json_decode(file_get_contents(FCPATH . 'data/curation_manifest.json'), true) ?: [];
    }

    private function safe(string $name): string
    {
        return preg_replace('/[^A-Za-z0-9_-]+/', '_', trim($name));
    }

    private function responseFile(string $name): string
    {
        // one CSV per curator, in public/data (as requested)
        return FCPATH . 'data/' . $this->safe($name) . '.csv';
    }

    /** ids this curator has already judged (for resume + progress). */
    private function doneIds(string $name): array
    {
        $f = $this->responseFile($name);
        if (! is_file($f)) {
            return [];
        }
        $ids = [];
        if (($h = fopen($f, 'r')) !== false) {
            fgetcsv($h);                                   // skip header row
            while (($row = fgetcsv($h)) !== false) {
                if (isset($row[1]) && $row[1] !== '') {    // column 1 = id
                    $ids[$row[1]] = true;
                }
            }
            fclose($h);
        }
        return $ids;
    }

    // ---- pages -------------------------------------------------------------

    public function index()
    {
        return view('start');
    }

    public function start()
    {
        $name = trim((string) $this->request->getPost('curator'));
        if ($name === '') {
            return view('start');
        }
        session()->set('curator', $name);
        // Relative redirect ("curate", not an absolute base_url) so it works under
        // any host / subpath without configuring baseURL. From POST /start the
        // browser resolves "curate" to /curate (or /subpath/curate).
        return $this->response->setStatusCode(303)->setHeader('Location', 'curate');
    }

    public function curate()
    {
        $name = session()->get('curator');
        if (! $name) {
            return view('start');           // no name yet -> show the name form
        }
        return view('curate', ['curator' => $name]);
    }

    // ---- api ---------------------------------------------------------------

    /** GET: next un-judged ion for this curator, plus progress. */
    public function next()
    {
        $name = session()->get('curator');
        if (! $name) {
            return $this->response->setStatusCode(403)->setJSON(['error' => 'no session']);
        }
        $manifest = $this->manifest();
        $done     = $this->doneIds($name);
        foreach ($manifest as $item) {
            if (! isset($done[$item['id']])) {
                return $this->response->setJSON([
                    'item'  => $item,
                    'done'  => count($done),
                    'total' => count($manifest),
                ]);
            }
        }
        return $this->response->setJSON([
            'finished' => true,
            'done'     => count($done),
            'total'    => count($manifest),
        ]);
    }

    /** POST: store one judgement, return updated progress. */
    public function save()
    {
        $name = session()->get('curator');
        if (! $name) {
            return $this->response->setStatusCode(403)->setJSON(['error' => 'no session']);
        }
        $id       = (string) $this->request->getPost('id');
        $decision = (string) $this->request->getPost('decision');   // 'validated' | 'check'
        $contour  = (string) $this->request->getPost('contour');
        if ($id === '' || ! in_array($decision, ['validated', 'check'], true)) {
            return $this->response->setStatusCode(400)->setJSON(['error' => 'bad input']);
        }
        $file = $this->responseFile($name);
        $isNew = ! is_file($file);
        if (($h = fopen($file, 'a')) !== false) {
            flock($h, LOCK_EX);
            if ($isNew) {
                fputcsv($h, ['curator', 'id', 'decision', 'contour', 'timestamp']);
            }
            fputcsv($h, [$name, $id, $decision, $contour, date('c')]);
            flock($h, LOCK_UN);
            fclose($h);
        }
        return $this->response->setJSON(['ok' => true]);
    }
}
