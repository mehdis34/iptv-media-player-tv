type BufferLike = {
  from: (value: string, encoding: string) => { toString: (encoding: string) => string };
};

const decodeBase64 = (value: string) => {
  if (typeof globalThis.atob === 'function') {
    try {
      return globalThis.atob(value);
    } catch {
      return null;
    }
  }

  const buffer = (globalThis as { Buffer?: BufferLike }).Buffer;
  if (buffer) {
    try {
      return buffer.from(value, 'base64').toString('utf8');
    } catch {
      return null;
    }
  }

  return null;
};

export const decodeEpgText = (value?: string | number | null) => {
  if (value == null) {
    return '';
  }
  const raw = String(value).trim();
  if (!raw) {
    return '';
  }
  if (!/^[A-Za-z0-9+/=]+$/.test(raw) || raw.length % 4 !== 0) {
    return raw;
  }
  const decoded = decodeBase64(raw);
  if (!decoded) {
    return raw;
  }
  const trimmed = decoded.trim();
  if (!trimmed) {
    return raw;
  }
  const nonPrintableRatio =
    trimmed.replace(/[\x20-\x7E\u00A0-\u00FF]/g, '').length / trimmed.length;
  return nonPrintableRatio > 0.3 ? raw : trimmed;
};

export const normalizeXmltvName = (value?: string | number | null) =>
  decodeEpgText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
