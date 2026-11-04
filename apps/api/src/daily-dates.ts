export const dailyDates = (from: Date, to: Date): string[] => {
  const dates: string[] = [];
  const cursor = new Date(from);
  cursor.setUTCHours(0, 0, 0, 0);

  while (cursor <= to) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
};
