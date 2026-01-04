const parseXmltvTimestamp = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const match = trimmed.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/);
  if (!match) {
    return null;
  }
  const [, year, month, day, hour, minute, second] = match;
  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  ).getTime();
};

export const getEpgProgress = (
  start: string,
  end: string,
  nowMs = Date.now(),
) => {
  const startMs = parseXmltvTimestamp(start);
  const endMs = parseXmltvTimestamp(end);
  if (!startMs || !endMs || endMs <= startMs) {
    return null;
  }
  if (nowMs < startMs || nowMs > endMs) {
    return null;
  }
  return Math.min(1, Math.max(0, (nowMs - startMs) / (endMs - startMs)));
};
