(function () {
  const fileInput = document.getElementById('importFile');
  const submitBtn = document.getElementById('importSubmit');
  const preview = document.getElementById('previewContainer');

  if (!fileInput || !submitBtn || !preview) return;

  fileInput.addEventListener('change', handleFileSelect);
  submitBtn.addEventListener('click', handleSubmit);

  function handleFileSelect(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) {
      preview.textContent = '暂无数据，请先上传文件。';
      submitBtn.disabled = true;
      return;
    }

    if (!/\.csv$/i.test(file.name)) {
      preview.textContent = '仅支持 CSV 文件，请重新选择。';
      submitBtn.disabled = true;
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target && e.target.result ? String(e.target.result) : '';
      renderPreview(text, file.name);
      submitBtn.disabled = false;
    };
    reader.onerror = () => {
      preview.textContent = '文件读取失败，请重试。';
      submitBtn.disabled = true;
    };
    reader.readAsText(file, 'utf-8');
  }

  function renderPreview(text, filename) {
    const rows = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (rows.length === 0) {
      preview.textContent = '文件为空，请检查内容后重新上传。';
      submitBtn.disabled = true;
      return;
    }

    const headers = rows[0].split(',').map((h) => h.trim());
    const bodyRows = rows.slice(1, 6).map((row) => row.split(',').map((cell) => cell.trim()));

    const table = document.createElement('table');
    table.className = 'preview-table';

    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    headers.forEach((header) => {
      const th = document.createElement('th');
      th.textContent = header || '-';
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    if (bodyRows.length === 0) {
      const emptyRow = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = headers.length;
      cell.textContent = '无数据行，确认列头是否正确。';
      emptyRow.appendChild(cell);
      tbody.appendChild(emptyRow);
    } else {
      bodyRows.forEach((cells) => {
        const rowEl = document.createElement('tr');
        headers.forEach((_, idx) => {
          const td = document.createElement('td');
          td.textContent = cells[idx] || '-';
          rowEl.appendChild(td);
        });
        tbody.appendChild(rowEl);
      });
    }
    table.appendChild(tbody);

    preview.innerHTML = '';
    const caption = document.createElement('div');
    caption.style.marginBottom = '12px';
    caption.textContent = 预览：（最多展示前 5 行）;
    preview.appendChild(caption);
    preview.appendChild(table);
  }

  function handleSubmit() {
    submitBtn.disabled = true;
    const note = document.createElement('div');
    note.style.marginTop = '12px';
    note.style.color = 'rgba(166, 192, 220, 0.8)';
    note.textContent = '模拟导入完成，数据已送入后台任务队列。';
    preview.appendChild(note);
  }
})();
