/**
 * ═══════════════════════════════════════════════════
 * MINYAKITA Sampling Calculator
 * js/pdf-export.js — PDF generation via html2canvas + jsPDF
 * ═══════════════════════════════════════════════════
 *
 * Depends on:
 *   - jsPDF      (loaded via CDN in index.html)
 *   - html2canvas (loaded via CDN in index.html)
 *   - S & fmt()  from calculator.js
 */

'use strict';

/* ══════════════════════════════════════════════════════
   PDF TEMPLATE BUILDER
   Constructs clean light HTML that html2canvas will render.
══════════════════════════════════════════════════════ */

function buildPDFTemplate(r) {
  const now = new Date();
  const tgl = now.toLocaleDateString('id-ID', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const jam = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  // Optional sqrt detail row
  const sqrtLine = r.rK.sqrtExact !== undefined
    ? `<div class="pdf-math-row">
         <div class="pmr-key">Tabel 2 — Detail sqrt(n)</div>
         <div class="pmr-eq">=</div>
         <div class="pmr-val">sqrt(${fmt(r.nK)}) = ${r.rK.sqrtExact.toFixed(4)} → dibulatkan ke atas = ${r.rK.sqrtCeil}</div>
       </div>`
    : '';

  // Build numbered steps HTML
  const stepsHTML = r.steps.map((s, i) => `
    <div class="pdf-step">
      <div class="pdf-step-num">${String(i + 1).padStart(2, '0')}</div>
      <div class="pdf-step-text">${s}</div>
    </div>`).join('');

  return `
<div id="pdf-template-inner" style="width:794px;background:#fff;font-family:'IBM Plex Sans',system-ui,sans-serif;color:#1e293b;">

  <div class="pdf-page">

    <!-- ── Header ── -->
    <div class="pdf-header">
      <div class="pdf-header-badge">Laporan Hasil Pemeriksaan Kemasan Minyakita</div>
      <div class="pdf-header-title">SNI 19-0428-1998</div>
      <div class="pdf-header-sub">Petunjuk Pengambilan Contoh Padatan — Kemasan MINYAKITA Tumpukan</div>
      <div class="pdf-header-meta">
        <div>Dicetak: ${tgl}</div>
        <div>Pukul: ${jam} WIB</div>
        <div class="pdf-header-stamp">UB Jastasma — Perum BULOG</div>
      </div>
    </div>

    <div class="pdf-body">

      <!-- ── Parameter Input ── -->
      <div class="pdf-section-head">
        <div class="pdf-section-dot"></div>
        <div class="pdf-section-label">Parameter Input</div>
        <div class="pdf-section-line"></div>
      </div>
      <table class="pdf-info-table">
        <tr><td>Kondisi Produk</td><td>Tumpukan</td></tr>
        <tr><td>Jumlah Lapisan</td><td>${r.lapisan} Lapis</td></tr>
        <tr><td>Total Karton dalam Lot</td><td>${fmt(r.nK)} karton</td></tr>
        <tr><td>Kemasan Primer per Karton</td><td>${fmt(r.nP)} ${r.j} / karton</td></tr>
        <tr><td>Total Kemasan Primer</td><td>${fmt(r.total)} ${r.j}</td></tr>
      </table>

      <!-- ── Hasil Perhitungan ── -->
      <div class="pdf-section-head">
        <div class="pdf-section-dot"></div>
        <div class="pdf-section-label">Hasil Perhitungan</div>
        <div class="pdf-section-line"></div>
      </div>
      <div class="pdf-stats">
        <div class="pdf-stat gray">
          <div class="pdf-stat-label">Total Lot</div>
          <div class="pdf-stat-value">${fmt(r.nK)}</div>
          <div class="pdf-stat-unit">karton dalam lot</div>
        </div>
        <div class="pdf-stat blue">
          <div class="pdf-stat-label">Karton Diambil (Tabel 2)</div>
          <div class="pdf-stat-value">${r.rK.all ? 'Semua' : fmt(r.rK.count)}</div>
          <div class="pdf-stat-unit">${r.rK.all ? 'seluruh ' + fmt(r.nK) + ' karton' : 'dipilih secara acak'}</div>
        </div>
        <div class="pdf-stat green">
          <div class="pdf-stat-label">${r.j.charAt(0).toUpperCase() + r.j.slice(1)} Diambil (Tabel 3)</div>
          <div class="pdf-stat-value">${fmt(r.rT3.x)}</div>
          <div class="pdf-stat-unit">dari ${fmt(r.total)} total ${r.j}</div>
        </div>
      </div>

      <!-- ── Cara Perhitungan ── -->
      <div class="pdf-section-head">
        <div class="pdf-section-dot"></div>
        <div class="pdf-section-label">Cara Perhitungan</div>
        <div class="pdf-section-line"></div>
      </div>
      <div class="pdf-math">
        <div class="pdf-math-row">
          <div class="pmr-key">1 Lot</div>
          <div class="pmr-eq">=</div>
          <div class="pmr-val">${fmt(r.nK)} karton @ ${r.nP} ${r.j}/karton</div>
        </div>
        <div class="pdf-math-row">
          <div class="pmr-key">Tabel 2 — Karton diambil</div>
          <div class="pmr-eq">=</div>
          <div class="pmr-val">${r.nK > 100 ? `sqrt(${fmt(r.nK)}) karton` : `${fmt(r.rK.count)} karton`}</div>
        </div>
        ${sqrtLine}
        <div class="pdf-math-row">
          <div class="pmr-key">Total kemasan primer</div>
          <div class="pmr-eq">=</div>
          <div class="pmr-val">${fmt(r.nK)} x ${r.nP} = ${fmt(r.total)} ${r.j}</div>
        </div>
        <div class="pdf-math-row">
          <div class="pmr-key">Tabel 3 — ${r.j.charAt(0).toUpperCase() + r.j.slice(1)} diambil</div>
          <div class="pmr-eq">=</div>
          <div class="pmr-val">${fmt(r.rT3.x)} ${r.j} &nbsp;<span style="color:#94a3b8;font-size:10px">[${r.rT3.src}]</span></div>
        </div>
        <div class="pdf-math-row pmr-final">
          <div class="pmr-key">Kesimpulan</div>
          <div class="pmr-eq">=</div>
          <div class="pmr-val">Dari ${fmt(r.rK.count)} karton acak, ambil ${fmt(r.rT3.x)} ${r.j}</div>
        </div>
      </div>

      <!-- ── Prosedur ── -->
      <div class="pdf-section-head">
        <div class="pdf-section-dot"></div>
        <div class="pdf-section-label">Prosedur Pengambilan Contoh</div>
        <div class="pdf-section-line"></div>
      </div>
      <div class="pdf-steps">${stepsHTML}</div>

      <!-- ── Parameter Kemasan ── -->
      <div class="pdf-section-head">
        <div class="pdf-section-dot"></div>
        <div class="pdf-section-label">Parameter Pemeriksaan Kemasan</div>
        <div class="pdf-section-line"></div>
      </div>
      <table class="pdf-param-table">
        <thead>
          <tr><th>Kemasan</th><th>Parameter</th><th>Standar Kualitas</th></tr>
        </thead>
        <tbody>
          <tr>
            <td><span class="pdf-param-badge sekunder">Sekunder</span></td>
            <td>Kebersihan</td>
            <td>Bebas dari tanda kebocoran</td>
          </tr>
          <tr>
            <td><span class="pdf-param-badge sekunder">Sekunder</span></td>
            <td>Jumlah isi</td>
            <td>Sesuai</td>
          </tr>
          <tr>
            <td><span class="pdf-param-badge primer">Primer</span></td>
            <td>Kondisi kemasan</td>
            <td>Baik / tidak bocor</td>
          </tr>
          <tr>
            <td><span class="pdf-param-badge primer">Primer</span></td>
            <td>Segel / sealer kemasan</td>
            <td>Baik / tidak rusak</td>
          </tr>
          <tr>
            <td><span class="pdf-param-badge primer">Primer</span></td>
            <td>Label BPOM, SNI dan Halal</td>
            <td>Ada dan jelas terbaca</td>
          </tr>
          <tr>
            <td><span class="pdf-param-badge primer">Primer</span></td>
            <td>Expired date</td>
            <td>Minimal 12 bulan dari tanggal pemeriksaan</td>
          </tr>
        </tbody>
      </table>

      <!-- ── Summary ── -->
      <div class="pdf-summary">
        <div class="pdf-summary-icon">✅</div>
        <div class="pdf-summary-text">
          <strong>Ringkasan:</strong> Dari <strong>${fmt(r.nK)} karton</strong>,
          ambil <strong>${r.rK.all ? 'semua (' + fmt(r.nK) + ')' : fmt(r.rK.count) + ' karton'}</strong>
          secara acak menggunakan <em>convenient sampling</em> →
          periksa <strong>${fmt(r.rT3.x)} ${r.j}</strong> sebagai sampel kemasan primer
          sesuai SNI 19-0428-1998.
        </div>
      </div>

    </div><!-- /pdf-body -->

    <!-- ── Footer ── -->
    <div class="pdf-footer">
      <div class="pdf-footer-left">
        <div>Referensi: SNI 19-0428-1998 — Petunjuk Pengambilan Contoh Padatan, BSN Jakarta 1998</div>
        <div>Mekanisme: SDI UB Jastasma No. SDI-263/DB400/XI/11112025</div>
        <div style="color:#e05c2a">Kalkulator Kemasan MINYAKITA — UB Jastasma Perum BULOG</div>
      </div>
      <div class="pdf-footer-right">
        <div class="pdf-footer-page">Halaman 1 dari 1</div>
      </div>
    </div>

  </div><!-- /pdf-page -->

</div>`;
}

/* ══════════════════════════════════════════════════════
   EXPORT FUNCTION
   1. Inject template HTML into #pdf-template (offscreen)
   2. Capture with html2canvas at 2x scale
   3. Slice into A4 pages in jsPDF
   4. Save PDF
══════════════════════════════════════════════════════ */

async function exportPDF() {
  const r = S.lastResult;
  if (!r) {
    alert('Selesaikan perhitungan terlebih dahulu.');
    return;
  }

  const btn = document.getElementById('btn-pdf');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Membuat PDF...'; }

  try {
    // 1. Inject template
    const tmpl = document.getElementById('pdf-template');
    tmpl.innerHTML = buildPDFTemplate(r);

    // 2. Wait for fonts and layout to settle
    await new Promise(res => setTimeout(res, 600));

    // 3. Capture with html2canvas
    const inner = document.getElementById('pdf-template-inner');
    const canvas = await html2canvas(inner, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    // 4. Build jsPDF document (A4)
    const { jsPDF } = window.jspdf || window;
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

    const A4_W_MM   = 210;
    const A4_H_MM   = 297;
    const imgWidthMM  = A4_W_MM;
    const imgHeightMM = (canvas.height / canvas.width) * A4_W_MM;

    if (imgHeightMM <= A4_H_MM) {
      // Content fits on a single page
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      doc.addImage(imgData, 'JPEG', 0, 0, imgWidthMM, imgHeightMM);
    } else {
      // Slice canvas into multiple A4 pages
      const pageHeightPx = Math.floor(canvas.width * (A4_H_MM / A4_W_MM));
      let yOffset = 0;
      let pageNum = 0;

      while (yOffset < canvas.height) {
        const sliceH = Math.min(pageHeightPx, canvas.height - yOffset);

        const pageCanvas = document.createElement('canvas');
        pageCanvas.width  = canvas.width;
        pageCanvas.height = sliceH;
        const ctx2 = pageCanvas.getContext('2d');
        ctx2.fillStyle = '#ffffff';
        ctx2.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        ctx2.drawImage(canvas, 0, yOffset, canvas.width, sliceH, 0, 0, canvas.width, sliceH);

        if (pageNum > 0) doc.addPage();
        const sliceHmm  = (sliceH / canvas.width) * A4_W_MM;
        const imgData2  = pageCanvas.toDataURL('image/jpeg', 0.95);
        doc.addImage(imgData2, 'JPEG', 0, 0, imgWidthMM, sliceHmm);

        yOffset += pageHeightPx;
        pageNum++;
      }
    }

    // 5. Save file
    const dateStr = new Date().toISOString().slice(0, 10);
    doc.save(`MINYAKITA_Sampling_${dateStr}.pdf`);

  } catch (err) {
    console.error(err);
    alert('Gagal membuat PDF: ' + err.message);
  } finally {
    // Cleanup offscreen template
    document.getElementById('pdf-template').innerHTML = '';
    if (btn) { btn.disabled = false; btn.textContent = '⬇ Unduh Hasil (PDF)'; }
  }
}
