function firstLogicalRow(text) {
  let quoted = false;
  let row = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') {
        row += '""';
        i++;
        continue;
      }
      quoted = !quoted;
      row += ch;
      continue;
    }
    if (!quoted && (ch === '\n' || ch === '\r')) break;
    row += ch;
  }
  return row;
}

function countUnquoted(row, delimiter) {
  let quoted = false;
  let count = 0;
  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (ch === '"') {
      if (quoted && row[i + 1] === '"') {
        i++;
        continue;
      }
      quoted = !quoted;
    } else if (!quoted && ch === delimiter) {
      count++;
    }
  }
  return count;
}

export function detectDelimiter(text) {
  const row = firstLogicalRow(text.replace(/^\uFEFF/, ''));
  const candidates = [',', ';', '\t'];
  const ranked = candidates
    .map(delimiter => ({ delimiter, count: countUnquoted(row, delimiter) }))
    .sort((a, b) => b.count - a.count);
  if (!ranked[0] || ranked[0].count === 0) throw new Error('CSV_DELIMITER_NOT_DETECTED');
  return ranked[0].delimiter;
}

export function parseCsv(text, { delimiter = null, strictColumns = false } = {}) {
  if (typeof text !== 'string') throw new TypeError('CSV_TEXT_REQUIRED');
  const input = text.replace(/^\uFEFF/, '');
  const sep = delimiter || detectDelimiter(input);
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  const finishField = () => {
    row.push(field);
    field = '';
  };
  const finishRow = () => {
    if (!(row.length === 1 && row[0] === '' && rows.length > 0)) rows.push(row);
    row = [];
  };

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      quoted = true;
    } else if (ch === sep) {
      finishField();
    } else if (ch === '\n') {
      finishField();
      finishRow();
    } else if (ch === '\r') {
      finishField();
      if (input[i + 1] === '\n') i++;
      finishRow();
    } else {
      field += ch;
    }
  }

  if (quoted) throw new Error('CSV_UNCLOSED_QUOTE');
  if (field.length > 0 || row.length > 0) {
    finishField();
    finishRow();
  }
  if (rows.length === 0) throw new Error('CSV_EMPTY');

  const headers = rows[0].map(value => value.trim());
  if (headers.length < 2) throw new Error('CSV_HEADER_TOO_SHORT');
  const records = [];
  const diagnostics = [];
  for (let i = 1; i < rows.length; i++) {
    const values = rows[i];
    if (values.every(value => value.trim() === '')) continue;
    if (values.length !== headers.length) {
      diagnostics.push({
        code: 'CSV_COLUMN_COUNT_MISMATCH',
        row_number: i + 1,
        expected: headers.length,
        actual: values.length
      });
      if (strictColumns) continue;
    }
    const record = {};
    for (let j = 0; j < headers.length; j++) record[headers[j]] = values[j] ?? '';
    records.push({ row_number: i + 1, record });
  }
  return { delimiter: sep, headers, records, diagnostics };
}
