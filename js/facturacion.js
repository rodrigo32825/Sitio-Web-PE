(() => {
  const form = document.querySelector('#request-form');
  const rows = document.querySelector('#expense-rows');
  const details = document.querySelector('#detail-pages');
  const payLink = document.querySelector('#p-pay-link');
  const paymentUrlBlock = document.querySelector('#p-payment-url');
  const paymentUrl = document.querySelector('#p-pay-url');
  const fieldNames = ['folio','fecha','periodo','destino','concepto','cliente','atencion','correoCliente',
    'emisor','rfc','telefono','domicilio','correoEmisor','enlacePago','cargo','ajuste',
    'banco','beneficiario','clabe','cuenta','swift','direccionBanco'];
  const money = cents => (cents / 100).toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 });
  const cents = value => Math.round((Number(value) || 0) * 100);
  const field = name => form.elements.namedItem(name);
  const value = name => field(name).value.trim();
  const put = (id, text) => { document.getElementById(id).textContent = text || ''; };

  function addRow(data = {}) {
    const row = document.createElement('div');
    row.className = 'expense-row';
    row.innerHTML = '<label>Fecha<input data-field="date" placeholder="08 Sep"></label>' +
      '<label>Tipo<input data-field="category" list="expense-types" placeholder="Flights"></label>' +
      '<label>Descripción<input data-field="description" placeholder="Descripción del gasto"></label>' +
      '<label>Ciudad<input data-field="city" placeholder="Ciudad"></label>' +
      '<label>MXN<input data-field="amount" type="number" min="0.01" step="0.01" placeholder="0.00"></label>' +
      '<button type="button" class="remove-row" aria-label="Quitar este gasto">×</button>';
    for (const input of row.querySelectorAll('input')) input.value = data[input.dataset.field] ?? '';
    rows.append(row);
    render();
  }

  function expenses() {
    return Array.from(rows.querySelectorAll('.expense-row')).map(row => {
      const get = name => row.querySelector(`[data-field="${name}"]`).value.trim();
      return { date:get('date'), category:get('category'), description:get('description'), city:get('city'), amount:get('amount') };
    }).filter(row => Object.values(row).some(Boolean));
  }

  function safeUrl(raw) {
    try { const url = new URL(raw); return url.protocol === 'https:' ? url.href : ''; }
    catch { return ''; }
  }

  function fillSummary(items, subtotal, fee, adjustment, total) {
    const grouped = new Map();
    for (const item of items) {
      const category = item.category || 'Other expenses';
      grouped.set(category, (grouped.get(category) || 0) + cents(item.amount));
    }
    const categories = Array.from(grouped.keys());
    if (categories.length > 5) {
      const other = categories.slice(4).reduce((sum, name) => sum + grouped.get(name), 0);
      categories.splice(4);
      grouped.set('Other categories', other);
      categories.push('Other categories');
    }
    const container = document.querySelector('#p-summary-rows');
    container.replaceChildren();
    for (const name of categories) {
      const div = document.createElement('div');
      div.className = 'summary-row';
      const title = document.createElement('span'); title.textContent = name;
      const amount = document.createElement('strong'); amount.textContent = money(grouped.get(name));
      div.append(title, amount); container.append(div);
    }
    put('p-subtotal', money(subtotal));
    put('p-cargo', money(fee));
    put('p-ajuste', money(adjustment));
    put('p-total', `MXN ${money(total)}`);
    document.querySelector('#editor-total').textContent = `MXN ${money(total)}`;
  }

  function detailPage(items, index, count, numbers, folio, period) {
    const page = document.createElement('article');
    page.className = 'sheet detail-sheet';
    page.innerHTML = '<div class="sheet-accent"></div>' +
      '<div class="sheet-head detail-head"><img src="./assets/Home/logo_eva.png" alt="Proyecto EVA"><div><h2>EXPENSE DETAILS</h2><p class="detail-ref"></p></div></div>' +
      '<div class="detail-lead"><strong>Itemized travel and event expenses</strong><span>All amounts in MXN</span></div>' +
      '<table class="detail-table"><colgroup><col><col><col><col><col></colgroup><thead><tr><th>DATE</th><th>TYPE</th><th>DESCRIPTION</th><th>CITY</th><th>MXN</th></tr></thead><tbody></tbody></table>' +
      '<div class="detail-totals"></div><footer class="sheet-footer"><strong>PROYECTOEVA.MX</strong><span class="detail-email"></span><span class="detail-pages"></span></footer>';
    page.querySelector('.detail-ref').textContent = [folio, period].filter(Boolean).join(' / ');
    page.querySelector('.detail-email').textContent = value('correoEmisor');
    page.querySelector('.detail-pages').textContent = `${index + 2} / ${count + 1}`;
    const tbody = page.querySelector('tbody');
    for (const item of items) {
      const tr = document.createElement('tr');
      for (const data of [item.date, item.category, item.description, item.city, money(cents(item.amount))]) {
        const td = document.createElement('td'); td.textContent = data; tr.append(td);
      }
      tbody.append(tr);
    }
    const bottom = page.querySelector('.detail-totals');
    if (index === count - 1) {
      for (const [css, label, amount] of [
        ['detail-subtotal','EXPENSE SUBTOTAL',numbers.subtotal],
        ['detail-fee','Payment processing fee',numbers.fee],
        ['detail-fee','Rounding adjustment',numbers.adjustment],
        ['detail-total','TOTAL DUE (MXN)',numbers.total]
      ]) {
        const line = document.createElement('div'); line.className = css;
        const title = document.createElement('span'); title.textContent = label;
        const figure = document.createElement('strong'); figure.textContent = money(amount);
        line.append(title, figure); bottom.append(line);
      }
    } else {
      const note = document.createElement('p'); note.className = 'detail-continued'; note.textContent = 'Continued on the next page →'; bottom.append(note);
    }
    return page;
  }

  function render() {
    const items = expenses();
    const subtotal = items.reduce((sum, item) => sum + cents(item.amount), 0);
    const fee = cents(value('cargo'));
    const adjustment = cents(value('ajuste'));
    const total = subtotal + fee + adjustment;
    put('p-folio', value('folio'));
    put('p-heading-folio', value('folio') || '—');
    document.title = value('folio') ? `Invoice ${value('folio')} | Proyecto EVA` : 'Invoice | Proyecto EVA';
    const date = value('fecha');
    put('p-fecha', date ? new Intl.DateTimeFormat('en-GB', { day:'2-digit', month:'long', year:'numeric', timeZone:'UTC' }).format(new Date(`${date}T12:00:00Z`)) : '');
    document.querySelector('#p-periodo').textContent = value('periodo') ? ` / ${value('periodo').toUpperCase()}` : '';
    put('p-emisor', value('emisor')); put('p-rfc', value('rfc') ? `RFC ${value('rfc')}` : '');
    put('p-domicilio', value('domicilio')); put('p-telefono', value('telefono'));
    put('p-cliente', value('cliente')); put('p-atencion', value('atencion') ? `Attn: ${value('atencion')}` : '');
    put('p-correoCliente', value('correoCliente'));
    put('p-concepto', value('concepto').toUpperCase()); put('p-destino', value('destino').toUpperCase());
    put('p-correoEmisor', value('correoEmisor'));
    for (const name of ['banco','beneficiario','clabe','cuenta','swift','direccionBanco']) put(`p-${name}`, value(name));
    document.querySelector('#p-payment').classList.toggle('no-bank', !value('banco') && !value('clabe'));
    const url = safeUrl(value('enlacePago'));
    if (url) {
      payLink.href = url;
      paymentUrl.href = url;
      paymentUrl.textContent = url;
    } else {
      payLink.removeAttribute('href');
      paymentUrl.removeAttribute('href');
      paymentUrl.textContent = '';
    }
    payLink.classList.toggle('is-disabled', !url);
    paymentUrlBlock.hidden = !url;
    fillSummary(items, subtotal, fee, adjustment, total);
    const pageCount = Math.max(1, Math.ceil(items.length / 20));
    document.querySelector('.p-page-count').textContent = pageCount + 1;
    const pages = [];
    for (let i = 0; i < pageCount; i++) pages.push(detailPage(items.slice(i * 20, (i + 1) * 20), i, pageCount, { subtotal, fee, adjustment, total }, value('folio'), value('periodo')));
    details.replaceChildren(...pages);
  }

  async function printRequest() {
    if (!form.reportValidity()) return;
    if (!safeUrl(value('enlacePago'))) { alert('Agrega un enlace de pago válido que comience con https://.'); field('enlacePago').focus(); return; }
    const items = expenses();
    if (!items.length || items.some(item => !item.date || !item.category || !item.description || !item.city || cents(item.amount) <= 0)) {
      alert('Completa la fecha, tipo, descripción, ciudad e importe de cada gasto.'); return;
    }
    if (value('banco') || value('clabe')) {
      if (!value('banco') || !value('beneficiario') || !value('clabe')) { alert('Completa banco, beneficiario y CLABE para ofrecer transferencia; o deja esos campos vacíos.'); return; }
    }
    const total = items.reduce((sum, item) => sum + cents(item.amount), 0) + cents(value('cargo')) + cents(value('ajuste'));
    if (total <= 0) { alert('El total debe ser mayor a cero.'); return; }
    if (typeof html2pdf !== 'function') {
      alert('No se pudo cargar el generador de PDF. Actualiza la página e inténtalo de nuevo.'); return;
    }
    render();
    const button = document.querySelector('#print-button');
    const printable = document.querySelector('#print-area');
    const filename = `${value('folio').replace(/[^a-z0-9_-]/gi, '_') || 'Invoice_EVA'}.pdf`;
    button.disabled = true;
    printable.classList.add('pdf-export');
    try {
      await document.fonts.ready;
      await html2pdf().set({
        margin: 0,
        filename,
        image: { type:'jpeg', quality:0.98 },
        html2canvas: { scale:2, useCORS:true, backgroundColor:'#fff' },
        jsPDF: { unit:'pt', format:'letter', orientation:'portrait' },
        enableLinks: true,
        pagebreak: { mode:[], before:'.detail-sheet' }
      }).from(printable).save();
    } catch (error) {
      alert('No pude descargar el PDF. Actualiza la página y vuelve a intentarlo.');
    } finally {
      printable.classList.remove('pdf-export');
      button.disabled = false;
    }
  }

  form.addEventListener('input', render);
  rows.addEventListener('click', event => {
    if (event.target.closest('.remove-row')) { event.target.closest('.expense-row').remove(); render(); }
  });
  document.querySelector('#add-row').addEventListener('click', () => addRow());
  document.querySelector('#print-button').addEventListener('click', printRequest);
  document.querySelector('#paste-button').addEventListener('click', () => {
    const lines = document.querySelector('#bulk-input').value.trim().split(/\r?\n/).filter(Boolean);
    let added = 0;
    for (const line of lines) {
      const parts = line.split('\t').map(part => part.trim());
      if (/^(fecha|date)$/i.test(parts[0])) continue;
      if (parts.length < 5) continue;
      const amount = parts[4].replace(/[^\d.\-]/g, '');
      if (!amount || !Number.isFinite(Number(amount)) || Number(amount) <= 0) continue;
      addRow({ date:parts[0], category:parts[1], description:parts[2], city:parts[3], amount });
      added++;
    }
    if (!added) { alert('No encontré renglones válidos. Copia cinco columnas separadas por tabulaciones desde Excel.'); return; }
    if (rows.children.length > 1 && !rows.firstElementChild.querySelector('[data-field="amount"]').value) rows.firstElementChild.remove();
    document.querySelector('#bulk-input').value = '';
    render();
  });
  document.querySelector('#save-button').addEventListener('click', () => {
    const data = { version:1, fields:Object.fromEntries(fieldNames.map(name => [name, value(name)])), expenses:expenses() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type:'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `${value('folio').replace(/[^a-z0-9_-]/gi,'_') || 'Invoice_EVA'}.json`;
    link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  document.querySelector('#load-file').addEventListener('change', async event => {
    const file = event.target.files[0]; if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (data.version !== 1 || !data.fields || !Array.isArray(data.expenses) || data.expenses.length > 200) throw new Error('Formato no compatible');
      for (const name of fieldNames) if (typeof data.fields[name] === 'string') field(name).value = data.fields[name];
      rows.replaceChildren();
      for (const item of data.expenses) addRow(item);
      if (!data.expenses.length) addRow();
      render();
    } catch { alert('No pude leer este borrador. Usa un archivo JSON descargado desde este formulario.'); }
    event.target.value = '';
  });
  document.querySelector('#new-button').addEventListener('click', () => {
    if (!confirm('¿Crear una solicitud nueva? Descarga un borrador antes si necesitas conservar esta.')) return;
    form.reset(); field('fecha').value = todayIso; rows.replaceChildren(); addRow(); render();
  });

  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  field('fecha').value = todayIso;
  addRow();
})();
