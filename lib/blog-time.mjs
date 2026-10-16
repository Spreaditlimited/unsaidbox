export const blogTimeZone = "Europe/London";
export function publicationFields(value, timeZone = blogTimeZone) {
  if (!value) return { date: "", time: "09:00" };
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(value)).map(x => [x.type, x.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}
export function scheduledInstant(date, time, timeZone = blogTimeZone) {
  if (!["UTC", blogTimeZone].includes(timeZone)) throw new Error("Choose a supported publication timezone.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) throw new Error("Enter a date as YYYY-MM-DD and time as HH:MM.");
  const iso = `${date}T${time}:00.000Z`;
  const naive = new Date(iso);
  if (!Number.isFinite(naive.getTime()) || naive.toISOString() !== iso) throw new Error("Enter a valid publication date and time.");
  if (timeZone === "UTC") return naive;
  // London uses GMT or BST. Match local wall-clock fields, rejecting missing/repeated DST times.
  const candidates = [0, -3600000].map(offset => new Date(naive.getTime() + offset)).filter(value => {
    const fields = publicationFields(value, timeZone);
    return fields.date === date && fields.time === time;
  });
  if (candidates.length !== 1) throw new Error("That UK time is missing or occurs twice because the clocks change. Choose a time after 02:00.");
  return candidates[0];
}
export function publicationLabel(value) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: blogTimeZone, day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZoneName: "short" }).format(new Date(value));
}
