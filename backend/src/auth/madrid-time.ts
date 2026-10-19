const TIME_ZONE = 'Europe/Madrid';

const DAY_KEY = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const DAY_LABEL = new Intl.DateTimeFormat('es-ES', {
  timeZone: TIME_ZONE,
  day: 'numeric',
  month: 'short',
});

export function madridDay(date = new Date()) {
  return DAY_KEY.format(date);
}

export function madridDayLabel(day: string) {
  return DAY_LABEL.format(new Date(`${day}T12:00:00Z`));
}

export function madridDayStart(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  const zoned = Date.UTC(
    pick('year'),
    pick('month') - 1,
    pick('day'),
    pick('hour'),
    pick('minute'),
    pick('second'),
  );
  const offset = zoned - date.getTime();
  return new Date(Date.UTC(pick('year'), pick('month') - 1, pick('day')) - offset);
}

export function recentMadridDays(count: number, now = new Date()) {
  const days: string[] = [];
  const cursor = new Date(now);
  while (days.length < count) {
    const day = madridDay(cursor);
    if (days[0] !== day) days.unshift(day);
    cursor.setTime(cursor.getTime() - 12 * 60 * 60 * 1000);
  }
  return days;
}

export function madridDaysAgo(count: number, now = new Date()) {
  const days = recentMadridDays(count, now);
  return madridDayStart(new Date(`${days[0]}T12:00:00Z`));
}
