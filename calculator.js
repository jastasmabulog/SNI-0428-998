/**
 * ═══════════════════════════════════════════════════
 * MINYAKITA Sampling Calculator
 * js/calculator.js — Wizard engine & math core
 * ═══════════════════════════════════════════════════
 */

'use strict';

/* ══════════════════════════════════════════════════════
   STATE
══════════════════════════════════════════════════════ */
const S = {
  step: 1,
  kondisi: null,
  lapisan: null,
  nKarton: null,
  nPerKarton: null,
  jenisPrimer: 'botol',
  lastResult: null,
};

/* ══════════════════════════════════════════════════════
   MATH CORE
══════════════════════════════════════════════════════ */

/**
 * Tabel 2 SNI 19-0428-1998 — jumlah karton yang harus diambil.
 * @param {number} n - jumlah karton dalam lot
 */
function hitungKarton(n) {
  if (!n || n < 1) return null;
  if (n <= 10)  return { count: n,  all: true,  rule: `Lot ≤ 10 karton — ambil semua ${n} karton` };
  if (n <= 25)  return { count: 5,  all: false, rule: 'Tabel 2: lot 11–25 — ambil 5 karton' };
  if (n <= 50)  return { count: 7,  all: false, rule: 'Tabel 2: lot 26–50 — ambil 7 karton' };
  if (n <= 100) return { count: 10, all: false, rule: 'Tabel 2: lot 51–100 — ambil 10 karton' };

  const exact = Math.sqrt(n);
  const ceil  = Math.ceil(exact);
  return {
    count: ceil, all: false,
    sqrtExact: exact, sqrtCeil: ceil,
    rule: `Tabel 2: lot >100 — sqrt(${n}) = ${exact.toFixed(4)}, dibulatkan ke atas = ${ceil} karton`,
  };
}

/**
 * Tabel 3 SNI 19-0428-1998 — jumlah kemasan primer untuk contoh.
 * Interpolasi linear digunakan untuk nilai di antara breakpoint tabel.
 * CATATAN: Range 60.001–100.000 tidak didefinisikan SNI → gunakan x = 400 (konservatif).
 * @param {number} total - total kemasan primer dalam lot
 */
function hitungT3(total) {
  const interp = (a, b, xa, xb, v) => Math.round(xa + (v - a) / (b - a) * (xb - xa));
  if (total <= 10000) return { x: 200, src: 'Total ≤ 10.000 — x = 200' };
  if (total <= 15000) return { x: interp(10000, 15000, 200, 225, total), src: 'Interpolasi 10.000–15.000' };
  if (total <= 20000) return { x: interp(15000, 20000, 225, 250, total), src: 'Interpolasi 15.000–20.000' };
  if (total <= 30000) return { x: interp(20000, 30000, 250, 275, total), src: 'Interpolasi 20.000–30.000' };
  if (total <= 35000) return { x: interp(30000, 35000, 275, 288, total), src: 'Interpolasi 30.000–35.000' };
  if (total <= 40000) return { x: interp(35000, 40000, 288, 300, total), src: 'Interpolasi 35.000–40.000' };
  if (total <= 50000) return { x: interp(40000, 50000, 300, 325, total), src: 'Interpolasi 40.000–50.000' };
  if (total <= 60000) return { x: interp(50000, 60000, 325, 350, total), src: 'Interpolasi 50.000–60.000' };
  // > 60.000: range tidak didefinisikan SNI — gunakan x = 400 (konservatif)
  return { x: 400, src: 'Total > 60.000 — x = 400 (konservatif per SNI)' };
}

/** Format angka ke locale id-ID */
function fmt(n) { return Number(n).toLocaleString('id-ID'); }

/** Parse integer positif, return null jika tidak valid */
function parseInt_(v) {
  const s = String(v).trim();
  const n = parseInt(s, 10);
  return (!s || isNaN(n) || n < 1 || String(n) !== s) ? null : n;
}

/* ══════════════════════════════════════════════════════
   DOM HELPERS
══════════════════════════════════════════════════════ */
function el(id) { return document.getElementById(id); }

function setMsg(id, ok, txt) {
  const e = el(id);
  if (e) { e.className = 'msg-field ' + (ok ? 'ok' : 'err'); e.textContent = txt; }
}

function mkCard(title) {
  const d = document.createElement('div');
  d.className = 'card';
  d.innerHTML = `<div class="card-title">${title}</div>`;
  return d;
}

function mkSectionTitle(text) {
  const d = document.createElement('div');
  d.className = 'section-title';
  d.innerHTML = `<span class="dot"></span>${text}`;
  return d;
}

/* ══════════════════════════════════════════════════════
   WIZARD ENGINE
══════════════════════════════════════════════════════ */
function render() {
  updateProgress();
  const w = el('wizard-content');
  w.innerHTML = '';
  const builders = { 1: buildStep1, 2: buildStep2, 3: buildStep3, 4: buildStep4 };
  const fn = builders[S.step] || buildStep1;
  w.appendChild(fn());
}

function updateProgress() {
  for (let i = 1; i <= 4; i++) {
    const dot  = el('dot-' + i);
    const lbl  = el('lbl-' + i);
    const conn = el('conn-' + i);
    const past = i < S.step, cur = i === S.step;

    dot.className   = 'step-dot'   + (past ? ' done' : cur ? ' active' : '');
    lbl.className   = 'step-label' + (past ? ' done' : cur ? ' active' : '');
    dot.textContent = past ? '✓' : String(i);
    if (conn) conn.className = 'step-connector' + (past ? ' done' : '');
  }
}

/* ── Step 1: Kondisi Produk ────────────────────────── */
function buildStep1() {
  const c = mkCard('Langkah 1 dari 3 — Kondisi Produk Saat Pengambilan Contoh');
  c.innerHTML += `
    <div class="question-label">Bagaimana kondisi produk MINYAKITA di lapangan?</div>
    <div class="question-hint">Pilih kondisi yang sesuai dengan situasi penyimpanan di gudang/pabrik produsen.</div>
    <div class="tooltip-box">
      💡 <strong>Apa itu "Tumpukan"?</strong><br>
      Produk yang disusun bertumpuk dalam gudang — karton MINYAKITA yang ditumpuk berlapis di atas palet.
      Kondisi ini paling umum ditemukan di gudang pabrik MINYAKITA.
    </div>
    <div class="option-grid">
      <div class="option-card ${S.kondisi === 'tumpukan'  ? 'selected' : ''}" onclick="S.kondisi='tumpukan'; render()">
        <div class="oc-icon">📦</div>
        <div class="oc-title">Tumpukan</div>
        <div class="oc-desc">Karton disusun bertumpuk di gudang/pabrik produsen. Kondisi paling umum untuk MINYAKITA.</div>
      </div>
      <div class="option-card ${S.kondisi === 'bergerak'  ? 'selected' : ''}" onclick="S.kondisi='bergerak'; render()">
        <div class="oc-icon">🏭</div>
        <div class="oc-title">Berjalan / Conveyor</div>
        <div class="oc-desc">Produk bergerak dari satu titik ke titik lain (conveyor, loading/unloading barang).</div>
      </div>
      <div class="option-card ${S.kondisi === 'curah'     ? 'selected' : ''}" onclick="S.kondisi='curah'; render()">
        <div class="oc-icon">⛏️</div>
        <div class="oc-title">Curah Tertumpuk</div>
        <div class="oc-desc">Produk curah yang tertumpuk (tidak berlaku untuk MINYAKITA terkemas).</div>
      </div>
    </div>
    <div class="btn-row">
      <button class="btn btn-primary"
        onclick="if(S.kondisi){S.step=2;render()}"
        ${!S.kondisi ? 'disabled' : ''}>Lanjut →</button>
    </div>`;
  return c;
}

/* ── Step 2: Data Tumpukan ─────────────────────────── */
function buildStep2() {
  const c = mkCard('Langkah 2 dari 3 — Data Tumpukan Karton');

  if (S.kondisi !== 'tumpukan') {
    c.innerHTML += `
      <div class="alert info">
        ℹ️ Untuk kondisi <em>${S.kondisi === 'bergerak' ? 'Berjalan/Conveyor' : 'Curah Tertumpuk'}</em>,
        koordinasikan prosedur spesifik dengan Tim Pengadaan dan PPK setempat.
      </div>
      <div class="btn-row" style="margin-top:16px">
        <button class="btn btn-ghost" onclick="S.step=1;render()">← Kembali</button>
      </div>`;
    return c;
  }

  c.innerHTML += `
    <div class="question-label">Berapa jumlah karton dan lapisan tumpukan?</div>
    <div class="question-hint">Hitung total karton dalam 1 PO/lot yang akan diperiksa di gudang produsen.</div>
    <div class="tooltip-box">
      💡 <strong>Contoh:</strong> Anda menerima PO untuk 500 karton MINYAKITA 1L @ 12 botol, disusun 2 lapis.
      Masukkan <strong>500 karton</strong> dan pilih <strong>Dua Lapis</strong>.
    </div>
    <div class="select-field">
      <label>Jumlah Lapisan Tumpukan</label>
      <select class="select-wrap" id="sel-lapisan"
        onchange="S.lapisan=this.value; document.getElementById('btn-s2').disabled=!(S.nKarton&&S.lapisan)">
        <option value="">== Pilih ==</option>
        <option value="1" ${S.lapisan === '1' ? 'selected' : ''}>Satu Lapis</option>
        <option value="2" ${S.lapisan === '2' ? 'selected' : ''}>Dua Lapis</option>
        <option value="3" ${S.lapisan === '3' ? 'selected' : ''}>Tiga Lapis</option>
      </select>
    </div>
    <div class="num-field">
      <label>Jumlah Karton / Kemasan Sekunder dalam Lot</label>
      <div class="num-input-wrap">
        <input type="number" id="inp-k" min="1" step="1"
          placeholder="contoh: 500"
          value="${S.nKarton || ''}"
          oninput="onKartonInput(this)">
        <div class="num-unit">karton</div>
      </div>
      <div id="msg-k" class="msg-field ${S.nKarton ? 'ok' : ''}">
        ${S.nKarton ? '✓ ' + fmt(S.nKarton) + ' karton' : ''}
      </div>
    </div>
    <div class="btn-row">
      <button class="btn btn-ghost" onclick="S.step=1;render()">← Kembali</button>
      <button class="btn btn-primary" id="btn-s2"
        onclick="if(S.nKarton&&S.lapisan){S.step=3;render()}"
        ${!(S.nKarton && S.lapisan) ? 'disabled' : ''}>Lanjut →</button>
    </div>`;
  return c;
}

function onKartonInput(inp) {
  const v = parseInt_(inp.value);
  if (!inp.value.trim()) { S.nKarton = null; setMsg('msg-k', false, ''); }
  else if (!v)           { S.nKarton = null; setMsg('msg-k', false, '⚠ Masukkan angka bulat positif.'); }
  else                   { S.nKarton = v;    setMsg('msg-k', true, `✓ ${fmt(v)} karton`); }
  const b = el('btn-s2');
  if (b) b.disabled = !(S.nKarton && S.lapisan);
}

/* ── Step 3: Jenis Kemasan Primer ─────────────────── */
function buildStep3() {
  const c = mkCard('Langkah 3 dari 3 — Jenis dan Isi Kemasan Primer');
  c.innerHTML += `
    <div class="question-label">Berapa isi kemasan primer per karton dan jenisnya?</div>
    <div class="question-hint">Pilih sesuai kondisi fisik kemasan MINYAKITA yang sedang diperiksa.</div>
    <div class="tooltip-box">
      💡 <strong>Standar MINYAKITA:</strong><br>
      Kemasan primer <strong>1 liter</strong> → <strong>12 botol/bantal/pouch per karton</strong><br>
      Kemasan primer <strong>2 liter</strong> → <strong>6 botol/bantal/pouch per karton</strong>
    </div>
    <div class="num-field">
      <label>Jumlah Kemasan Primer per Karton</label>
      <div class="num-input-wrap">
        <input type="number" id="inp-p" min="1" step="1"
          placeholder="contoh: 12"
          value="${S.nPerKarton || ''}"
          oninput="onPerKartonInput(this)">
        <select class="select-unit" id="sel-primer"
          onchange="S.jenisPrimer=this.value">
          <option value="botol"  ${S.jenisPrimer === 'botol'  ? 'selected' : ''}>botol</option>
          <option value="bantal" ${S.jenisPrimer === 'bantal' ? 'selected' : ''}>bantal</option>
          <option value="pouch"  ${S.jenisPrimer === 'pouch'  ? 'selected' : ''}>pouch</option>
        </select>
      </div>
      <div id="msg-p" class="msg-field ${S.nPerKarton ? 'ok' : ''}">
        ${S.nPerKarton ? '✓ ' + fmt(S.nPerKarton) + ' ' + S.jenisPrimer + ' per karton' : ''}
      </div>
    </div>
    <div class="btn-row">
      <button class="btn btn-ghost" onclick="S.step=2;render()">← Kembali</button>
      <button class="btn btn-primary" id="btn-s3"
        onclick="if(S.nPerKarton){S.step=4;render()}"
        ${!S.nPerKarton ? 'disabled' : ''}>Hitung Hasil →</button>
    </div>`;
  return c;
}

function onPerKartonInput(inp) {
  S.jenisPrimer = el('sel-primer') ? el('sel-primer').value : S.jenisPrimer;
  const v = parseInt_(inp.value);
  if (!inp.value.trim()) { S.nPerKarton = null; setMsg('msg-p', false, ''); }
  else if (!v)           { S.nPerKarton = null; setMsg('msg-p', false, '⚠ Angka bulat positif saja.'); }
  else                   { S.nPerKarton = v;    setMsg('msg-p', true, `✓ ${fmt(v)} ${S.jenisPrimer} per karton`); }
  const b = el('btn-s3');
  if (b) b.disabled = !S.nPerKarton;
}

/* ── Step 4: Hasil ─────────────────────────────────── */
function buildStep4() {
  const c   = mkCard('Hasil Perhitungan Pemeriksaan Kemasan');
  const nK  = S.nKarton;
  const nP  = S.nPerKarton;
  const j   = S.jenisPrimer;
  const total = nK * nP;
  const rK  = hitungKarton(nK);
  const rT3 = hitungT3(total);

  // ── Result grid ──
  c.innerHTML += `
    <div class="result-grid">
      <div class="result-stat">
        <div class="rs-label">Total Lot</div>
        <div class="rs-value">${fmt(nK)}</div>
        <div class="rs-unit">karton dalam lot</div>
      </div>
      <div class="result-stat highlight">
        <div class="rs-label">Karton Diambil (Tabel 2)</div>
        <div class="rs-value big">${rK.all ? 'Semua' : fmt(rK.count)}</div>
        <div class="rs-unit">${rK.all ? 'seluruh ' + fmt(nK) + ' karton' : 'dipilih secara acak'}</div>
      </div>
      <div class="result-stat green-stat">
        <div class="rs-label">${j.charAt(0).toUpperCase() + j.slice(1)} Diambil (Tabel 3)</div>
        <div class="rs-value">${fmt(rT3.x)}</div>
        <div class="rs-unit">dari ${fmt(total)} total ${j}</div>
      </div>
    </div>`;

  // ── Math workings ──
  let sqrtLine = '';
  if (rK.sqrtExact !== undefined) {
    const w = rK.sqrtExact % 1 === 0;
    sqrtLine = `<div class="math-line">
      <span style="color:var(--muted)">sqrt(${fmt(nK)})</span>
      <span class="op">=</span>
      <span class="val">${w ? rK.sqrtExact : rK.sqrtExact.toFixed(4)}</span>
      ${!w ? `<span class="op"> → ceiling =</span><span class="val"> ${rK.sqrtCeil}</span>` : ''}
    </div>`;
  }

  c.innerHTML += `
    <div class="math-work">
      <div class="math-line">1 Lot <span class="op">=</span> <span class="val">${fmt(nK)} karton @ ${nP} ${j}</span></div>
      <div class="math-line">Tabel 2 <span class="op">=</span> ${nK > 100 ? `sqrt(${fmt(nK)}) karton` : `${fmt(rK.count)} karton`}</div>
      ${sqrtLine}
      <div class="math-line">Total kemasan kecil <span class="op">=</span> <span class="val">${fmt(nK)} × ${nP} = ${fmt(total)} ${j}</span></div>
      <div class="math-line">Tabel 3 SNI <span class="op">=</span> <span class="val">${fmt(rT3.x)} ${j}</span>
        <em style="color:var(--muted);font-size:11px;margin-left:8px">[${rT3.src}]</em></div>
      <div class="math-line final">
        Dari <span class="val">${fmt(nK)} karton</span> diambil acak
        <span class="res">${fmt(rK.count)} karton</span> → periksa
        <span class="res">${fmt(rT3.x)} ${j}</span>
      </div>
    </div>`;

  // ── Steps ──
  c.appendChild(mkSectionTitle('Langkah Pengambilan Contoh Kemasan'));

  const STEPS = [
    `AM UB Jastasma menerbitkan <strong>Surat Tugas</strong> kepada PPK untuk pemeriksaan di gudang/pabrik produsen.`,
    `Identifikasi lot: <strong>${fmt(nK)} karton</strong> kemasan MINYAKITA (@ ${nP} ${j}/karton), kondisi <strong>tumpukan ${S.lapisan} lapis</strong>.`,
    `PPK membuat denah dan perhitungan tumpukan. Hitung total karton = <strong>${fmt(nK)} karton</strong>.`,
    `${rK.rule}. ${rK.all ? 'Seluruh karton diperiksa.' : `Ambil <strong>${fmt(rK.count)} karton</strong> secara acak menggunakan <em>convenient sampling</em>.`}`,
    `Total kemasan primer: ${fmt(nK)} × ${nP} = <strong>${fmt(total)} ${j}</strong>. Tabel 3 SNI → ambil <strong>${fmt(rT3.x)} ${j}</strong> secara acak.`,
    `Periksa setiap kemasan primer: kondisi (baik/tidak bocor), segel (baik/tidak rusak), label <strong>BPOM/SNI/Halal</strong> (ada dan jelas), expired date (<strong>min. 12 bulan</strong> dari hari ini).`,
    `Periksa kemasan sekunder (karton): kebersihan (bebas tanda kebocoran) dan jumlah isi (sesuai).`,
    `PPK membuat dokumen <strong>HPK</strong> yang memuat hasil pemeriksaan. Jika ada ketidaksesuaian, koordinasi dengan produsen untuk penggantian.`,
    `AM UB Jastasma wilayah produsen mengirimkan <em>soft copy</em> dan <em>hard copy</em> HPK ke wilayah penerima untuk pencatatan pendapatan dan piutang.`,
  ];

  const ul = document.createElement('ul');
  ul.className = 'steps-ol';
  STEPS.forEach(s => {
    const li = document.createElement('li');
    li.innerHTML = s;
    ul.appendChild(li);
  });
  c.appendChild(ul);

  c.innerHTML += `
    <div class="alert success" style="margin-top:16px">
      ✅ <strong>Ringkasan:</strong> Dari <strong>${fmt(nK)} karton</strong>,
      ambil <strong>${rK.all ? 'semua (' + fmt(nK) + ')' : fmt(rK.count) + ' karton'}</strong> secara acak
      → periksa <strong>${fmt(rT3.x)} ${j}</strong> sebagai sampel kemasan primer.
    </div>`;

  // ── PDF + reset ──
  const pdfRow = document.createElement('div');
  pdfRow.className = 'pdf-action-row';
  pdfRow.innerHTML = `
    <button class="btn btn-pdf" id="btn-pdf" onclick="exportPDF()">⬇ Unduh Hasil (PDF)</button>
    <span class="pdf-hint">PDF berisi ringkasan parameter, perhitungan, dan prosedur pemeriksaan kemasan.</span>`;
  c.appendChild(pdfRow);

  const resetRow = document.createElement('div');
  resetRow.style.marginTop = '16px';
  resetRow.innerHTML = `<button class="btn-reset" onclick="resetWizard()">← Mulai perhitungan baru</button>`;
  c.appendChild(resetRow);

  // Store for PDF export
  S.lastResult = { nK, nP, j, total, lapisan: S.lapisan, rK, rT3, steps: STEPS };
  return c;
}

/* ── Reset ─────────────────────────────────────────── */
function resetWizard() {
  S.step = 1;
  S.kondisi = S.lapisan = S.nKarton = S.nPerKarton = S.lastResult = null;
  S.jenisPrimer = 'botol';
  render();
}

/* ── Reference tabs ────────────────────────────────── */
function showRef(btn, id) {
  document.querySelectorAll('.rt-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.rt-btn').forEach(b => b.classList.remove('active'));
  el(id).classList.add('active');
  btn.classList.add('active');
}

/* ── Init ──────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', render);
