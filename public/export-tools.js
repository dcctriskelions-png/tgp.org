/* Downloads for reports: PDF, Word (.doc) and Excel (.xlsx).
   One small "document" description is turned into whichever format is chosen:
     model = { title, subtitle, landscape: false, blocks: [
                 { h: 'Section heading' },
                 { kv: [['Label', 'Value'], ...] },          // label / value lines
                 { p: 'Paragraph text (line breaks are kept)' },
                 { note: 'small grey text' },
                 { table: { head: ['A', 'B'], rows: [['1', '2'], ...] } } ] }
   PDF uses jsPDF + AutoTable and Excel uses SheetJS, both loaded from cdnjs only when needed.
   If a library cannot be loaded, PDF falls back to the browser's print dialog ("Save as PDF") and Excel to a .csv file.
   Word needs no library. */
(function (w) {
  var ORG = 'Tau Gamma Phi & Tau Gamma Sigma - Dipolog City Council';
  var LIBS = {
    jspdf: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    autotable: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js',
    xlsx: 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
  };
  var loading = {};

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function loadScript(url) {
    if (loading[url]) return loading[url];
    loading[url] = new Promise(function (ok, fail) {
      var s = document.createElement('script'); s.src = url; s.async = true;
      s.onload = ok; s.onerror = function () { delete loading[url]; fail(new Error('Could not load ' + url)); };
      document.head.appendChild(s);
    });
    return loading[url];
  }
  function safeName(n) { return String(n || 'export').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120) || 'export'; }
  function save(blob, name) {
    var url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name; a.style.display = 'none';
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 4000);
  }
  // jsPDF's built-in fonts cover Western letters only: swap typographic characters for plain ones
  function pdfText(s) {
    return String(s == null ? '' : s).replace(/[–—]/g, '-').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/…/g, '...').replace(/[^\x09\x0A\x0D\x20-\x7E -ÿ]/g, '?');
  }

  /* ---------- HTML (Word and print) ---------- */
  function bodyHtml(m) {
    var h = '<p class="org">' + esc(ORG) + '</p><h1>' + esc(m.title) + '</h1>' + (m.subtitle ? '<p class="sub">' + esc(m.subtitle) + '</p>' : '');
    (m.blocks || []).forEach(function (b) {
      if (b.h) h += '<h2>' + esc(b.h) + '</h2>';
      else if (b.kv) h += '<table class="kv">' + b.kv.map(function (r) { return '<tr><td class="k">' + esc(r[0]) + '</td><td>' + esc(r[1]).replace(/\n/g, '<br>') + '</td></tr>'; }).join('') + '</table>';
      else if (b.p != null) h += '<p class="txt">' + esc(b.p).replace(/\r?\n/g, '<br>') + '</p>';
      else if (b.note) h += '<p class="note">' + esc(b.note) + '</p>';
      else if (b.table) {
        h += '<table class="grid"><thead><tr>' + b.table.head.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
          (b.table.rows.length ? b.table.rows.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + esc(c) + '</td>'; }).join('') + '</tr>'; }).join('')
            : '<tr><td colspan="' + b.table.head.length + '"><i>' + esc(b.table.empty || 'No records.') + '</i></td></tr>') + '</tbody></table>';
      }
    });
    return h;
  }
  var CSS = 'body{font-family:Calibri,Arial,sans-serif;font-size:11pt;color:#111}' +
    '.org{font-size:9pt;letter-spacing:.08em;text-transform:uppercase;color:#6b5a22;margin:0 0 4pt;font-weight:bold}' +
    'h1{font-size:19pt;margin:0 0 4pt}h2{font-size:12.5pt;margin:16pt 0 6pt;padding-bottom:2pt;border-bottom:1.5pt solid #b08d1e}' +
    '.sub{color:#555;margin:0 0 10pt;font-size:10pt}.txt{margin:4pt 0;line-height:1.45}.note{color:#666;font-size:9pt;font-style:italic;margin:6pt 0}' +
    'table{border-collapse:collapse;width:100%}table.kv td{padding:3pt 8pt 3pt 0;vertical-align:top;border:0}table.kv td.k{width:28%;font-weight:bold;color:#444}' +
    'table.grid th{background:#1b1b1e;color:#f1d879;text-align:left;font-size:9.5pt;padding:4pt 6pt;border:1px solid #444}' +
    'table.grid td{font-size:9.5pt;padding:3pt 6pt;border:1px solid #999;vertical-align:top}';

  function wordHtml(m) {
    var size = m.landscape ? '11.69in 8.27in' : '8.27in 11.69in';
    return '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>' + esc(m.title) + '</title>' +
      '<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->' +
      '<style>@page Section1{size:' + size + ';margin:0.7in 0.7in 0.7in 0.7in;' + (m.landscape ? 'mso-page-orientation:landscape;' : '') + '}div.Section1{page:Section1}' + CSS + '</style></head><body><div class="Section1">' + bodyHtml(m) + '</div></body></html>';
  }
  w.tgpWord = function (model, fileName) {
    save(new Blob(['﻿', wordHtml(model)], { type: 'application/msword' }), safeName(fileName) + '.doc');
    return Promise.resolve();
  };

  /* ---------- PDF ---------- */
  function printFallback(m) {                          // no PDF library: the browser's own "Save as PDF" through the print dialog
    var f = document.createElement('iframe');
    f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    document.body.appendChild(f);
    var d = f.contentWindow.document;
    d.open(); d.write('<!doctype html><html><head><meta charset="utf-8"><title>' + esc(m.title) + '</title><style>@page{size:A4 ' + (m.landscape ? 'landscape' : 'portrait') + ';margin:14mm}' + CSS + '</style></head><body>' + bodyHtml(m) + '</body></html>'); d.close();
    setTimeout(function () { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) {} setTimeout(function () { f.remove(); }, 60000); }, 400);
  }
  w.tgpPdf = function (model, fileName) {
    return loadScript(LIBS.jspdf).then(function () { return loadScript(LIBS.autotable); }).then(function () {
      var J = w.jspdf.jsPDF, doc = new J({ orientation: model.landscape ? 'landscape' : 'portrait', unit: 'pt', format: 'a4' });
      var W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), M = 40, y = M;
      function room(n) { if (y + n > H - M - 14) { doc.addPage(); y = M; } }
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(107, 90, 34);
      doc.text(pdfText(ORG).toUpperCase(), M, y); y += 20;
      doc.setFontSize(19); doc.setTextColor(17, 17, 17);
      doc.splitTextToSize(pdfText(model.title), W - 2 * M).forEach(function (ln) { doc.text(ln, M, y); y += 23; });
      if (model.subtitle) { doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(90, 90, 90); doc.text(pdfText(model.subtitle), M, y); y += 14; }
      doc.setDrawColor(176, 141, 30); doc.setLineWidth(1.5); doc.line(M, y, W - M, y); y += 14;
      (model.blocks || []).forEach(function (b) {
        if (b.h) {
          room(34); y += 8; doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(17, 17, 17);
          doc.text(pdfText(b.h), M, y); y += 5; doc.setDrawColor(176, 141, 30); doc.setLineWidth(.8); doc.line(M, y, W - M, y); y += 14;
        } else if (b.kv) {
          doc.setFontSize(10);
          b.kv.forEach(function (r) {
            var lines = doc.splitTextToSize(pdfText(r[1]) || '-', W - 2 * M - 130);
            room(lines.length * 13 + 4);
            doc.setFont('helvetica', 'bold'); doc.setTextColor(70, 70, 70); doc.text(pdfText(r[0]), M, y);
            doc.setFont('helvetica', 'normal'); doc.setTextColor(17, 17, 17); doc.text(lines, M + 130, y);
            y += lines.length * 13 + 3;
          });
          y += 4;
        } else if (b.p != null) {
          doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(17, 17, 17);
          doc.splitTextToSize(pdfText(b.p) || '-', W - 2 * M).forEach(function (ln) { room(14); doc.text(ln, M, y); y += 13.5; });
          y += 4;
        } else if (b.note) {
          doc.setFont('helvetica', 'italic'); doc.setFontSize(8.5); doc.setTextColor(110, 110, 110);
          doc.splitTextToSize(pdfText(b.note), W - 2 * M).forEach(function (ln) { room(12); doc.text(ln, M, y); y += 11; });
          y += 3;
        } else if (b.table) {
          var rows = b.table.rows.length ? b.table.rows : [[{ content: b.table.empty || 'No records.', colSpan: b.table.head.length, styles: { fontStyle: 'italic' } }]];
          doc.autoTable({
            startY: y, margin: { left: M, right: M, bottom: M }, theme: 'grid',
            head: [b.table.head.map(pdfText)], body: rows.map(function (r) { return r.map(function (c) { return typeof c === 'object' && c ? c : pdfText(c); }); }),
            styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 3, lineColor: [150, 150, 150], lineWidth: .4, overflow: 'linebreak' },
            headStyles: { fillColor: [27, 27, 30], textColor: [241, 216, 121], fontSize: 8, halign: 'left' },
            alternateRowStyles: { fillColor: [250, 249, 244] }
          });
          y = doc.lastAutoTable.finalY + 12;
        }
      });
      var n = doc.getNumberOfPages();
      for (var i = 1; i <= n; i++) {
        doc.setPage(i); doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(130, 130, 130);
        doc.text('Page ' + i + ' of ' + n, W - M, H - 20, { align: 'right' });
        doc.text(pdfText(ORG), M, H - 20);
      }
      save(doc.output('blob'), safeName(fileName) + '.pdf');
    }).catch(function (err) {
      if (w.console) console.warn('PDF library not available, using the print dialog instead:', err);
      printFallback(model);
    });
  };

  /* ---------- Excel ---------- */
  // sheets: [{ name: 'Sheet name', rows: [[header...], [row...], ...] }]
  w.tgpXlsx = function (sheets, fileName) {
    return loadScript(LIBS.xlsx).then(function () {
      var X = w.XLSX, wb = X.utils.book_new(), used = {};
      sheets.forEach(function (sh, i) {
        var nm = String(sh.name || 'Sheet' + (i + 1)).replace(/[\[\]:*?\/\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 31) || 'Sheet' + (i + 1), base = nm, k = 2;
        while (used[nm.toLowerCase()]) { nm = base.slice(0, 28) + ' ' + k++; }
        used[nm.toLowerCase()] = 1;
        var ws = X.utils.aoa_to_sheet(sh.rows);
        var widths = (sh.rows[0] || []).map(function (_, c) { var mx = 8; sh.rows.forEach(function (r) { mx = Math.max(mx, String(r[c] == null ? '' : r[c]).length); }); return { wch: Math.min(mx + 2, 45) }; });
        ws['!cols'] = widths;
        X.utils.book_append_sheet(wb, ws, nm);
      });
      save(new Blob([X.write(wb, { bookType: 'xlsx', type: 'array' })], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), safeName(fileName) + '.xlsx');
    }).catch(function (err) {
      if (w.console) console.warn('Excel library not available, saving a .csv instead:', err);
      var csv = [];
      sheets.forEach(function (sh) {
        if (sheets.length > 1) csv.push('"' + String(sh.name).replace(/"/g, '""') + '"');
        sh.rows.forEach(function (r) { csv.push(r.map(function (c) { return '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"'; }).join(',')); });
        if (sheets.length > 1) csv.push('');
      });
      save(new Blob(['﻿' + csv.join('\r\n')], { type: 'text/csv;charset=utf-8' }), safeName(fileName) + '.csv');
    });
  };
})(window);
