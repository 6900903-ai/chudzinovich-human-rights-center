import { createHash } from 'node:crypto';

export function normalizeWhitespace(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim();
}

export function normalizeForMatch(value) {
  return normalizeWhitespace(value)
    .toLocaleLowerCase('ru')
    .replace(/ё/g, 'е')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[’'`]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

const MONTHS = new Map(Object.entries({
  january: 1, jan: 1, январь: 1, января: 1, студзень: 1, студзеня: 1,
  february: 2, feb: 2, февраль: 2, февраля: 2, люты: 2, лютага: 2,
  march: 3, mar: 3, март: 3, марта: 3, сакавік: 3, сакавіка: 3,
  april: 4, apr: 4, апрель: 4, апреля: 4, красавік: 4, красавіка: 4,
  may: 5, май: 5, мая: 5, травень: 5, траўня: 5,
  june: 6, jun: 6, июнь: 6, июня: 6, чэрвень: 6, чэрвеня: 6,
  july: 7, jul: 7, июль: 7, июля: 7, ліпень: 7, ліпеня: 7,
  august: 8, aug: 8, август: 8, августа: 8, жнівень: 8, жніўня: 8,
  september: 9, sep: 9, sept: 9, сентябрь: 9, сентября: 9, верасень: 9, верасня: 9,
  october: 10, oct: 10, октябрь: 10, октября: 10, кастрычнік: 10, кастрычніка: 10,
  november: 11, nov: 11, ноябрь: 11, ноября: 11, лістапад: 11, лістапада: 11,
  december: 12, dec: 12, декабрь: 12, декабря: 12, снежань: 12, снежня: 12
}));

function pad2(value) {
  return String(value).padStart(2, '0');
}

function validDateParts(year, month, day) {
  if (year < 1900 || year > 2200 || month < 1 || month > 12 || day < 1 || day > 31) return false;
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

export function parsePartialDate(value) {
  const raw = normalizeWhitespace(value);
  if (!raw || /^(unknown|неизвестно|невядома|—|-|n\/?a)$/iu.test(raw)) {
    return { raw, value: null, precision: 'unknown', parse_state: 'UNKNOWN' };
  }

  let m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    const [, y, mo, d] = m;
    if (validDateParts(Number(y), Number(mo), Number(d))) {
      return { raw, value: `${y}-${mo}-${d}`, precision: 'day', parse_state: 'PARSED' };
    }
  }

  m = raw.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (m) {
    const [, d, mo, y] = m;
    if (validDateParts(Number(y), Number(mo), Number(d))) {
      return { raw, value: `${y}-${pad2(mo)}-${pad2(d)}`, precision: 'day', parse_state: 'PARSED' };
    }
  }

  m = raw.match(/^(\d{4})-(\d{2})$/);
  if (m) {
    const [, y, mo] = m;
    if (Number(mo) >= 1 && Number(mo) <= 12) {
      return { raw, value: `${y}-${mo}`, precision: 'month', parse_state: 'PARSED' };
    }
  }

  m = raw.match(/^(\d{4})$/);
  if (m) return { raw, value: m[1], precision: 'year', parse_state: 'PARSED' };

  const lower = raw.toLocaleLowerCase('ru').replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
  m = lower.match(/^(\d{1,2})\s+([\p{L}.]+)\s+(\d{4})$/u);
  if (m) {
    const day = Number(m[1]);
    const month = MONTHS.get(m[2].replace(/\.$/, ''));
    const year = Number(m[3]);
    if (month && validDateParts(year, month, day)) {
      return { raw, value: `${year}-${pad2(month)}-${pad2(day)}`, precision: 'day', parse_state: 'PARSED' };
    }
  }

  m = lower.match(/^([\p{L}.]+)\s+(\d{4})$/u);
  if (m) {
    const month = MONTHS.get(m[1].replace(/\.$/, ''));
    const year = Number(m[2]);
    if (month) return { raw, value: `${year}-${pad2(month)}`, precision: 'month', parse_state: 'PARSED' };
  }

  return { raw, value: null, precision: 'unknown', parse_state: 'UNPARSED' };
}

export function extractCriminalArticles(value) {
  const text = normalizeWhitespace(value).replace(/\n/g, ' ');
  const out = new Set();
  const patterns = [
    /(?:part\s+\d+\s+of\s+)?art(?:icle)?\.?\s*(\d+(?:[-–]\d+)?)/giu,
    /(?:ч\.\s*\d+\s*)?ст\.?\s*(\d+(?:[-–]\d+)?)/giu,
    /(?:ч\.\s*\d+\s*)?арт\.?\s*(\d+(?:[-–]\d+)?)/giu
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) out.add(match[1].replace('–', '-'));
  }
  return [...out];
}

export function stableIdentityKey({ name, birthDate }) {
  const normalizedName = normalizeForMatch(name);
  const birth = birthDate?.value || '';
  const material = `${normalizedName}|${birth}`;
  return createHash('sha256').update(material, 'utf8').digest('hex');
}
