/**
 * Which nightly database backups to delete.
 *
 * Keeps every backup from the last 30 days, plus the first backup of each
 * month for ever. Backups are folders named by date, like "2026-11-14".
 *
 * Run by the backup workflow with Node's built-in TypeScript support:
 *   rclone lsf --dirs-only r2:bucket/db | node scripts/backup/retention.ts 2026-11-14
 * It prints one folder name per line to delete.
 */

export const KEEP_DAYS = 30;

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseDay(name: string): number | null {
  const match = DATE.exec(name.replace(/\/$/, ""));
  if (!match) return null;
  const [, y, m, d] = match.map(Number);
  const time = Date.UTC(y, m - 1, d);
  // Reject impossible dates like 2026-02-31.
  return new Date(time).getUTCDate() === d ? time : null;
}

export function backupsToDelete(folders: string[], today: string): string[] {
  const todayTime = parseDay(today);
  if (todayTime === null) throw new Error(`Invalid date: ${today}`);
  const cutoff = todayTime - (KEEP_DAYS - 1) * 86_400_000;

  const dated = folders
    .map((folder) => ({
      folder: folder.replace(/\/$/, ""),
      time: parseDay(folder),
    }))
    .filter((b): b is { folder: string; time: number } => b.time !== null)
    .sort((a, b) => a.time - b.time);

  // The earliest backup in each month is that month's keeper.
  const monthlyKeepers = new Set<string>();
  const seenMonths = new Set<string>();
  for (const { folder } of dated) {
    const month = folder.slice(0, 7);
    if (!seenMonths.has(month)) {
      seenMonths.add(month);
      monthlyKeepers.add(folder);
    }
  }

  return dated
    .filter(({ folder, time }) => time < cutoff && !monthlyKeepers.has(folder))
    .map(({ folder }) => folder);
}

// Command-line use: folder names on stdin, today's date as the argument.
if (import.meta.main) {
  const today = process.argv[2] ?? new Date().toISOString().slice(0, 10);
  const input = await new Response(
    process.stdin as unknown as ReadableStream,
  ).text();
  const folders = input
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  for (const folder of backupsToDelete(folders, today)) console.log(folder);
}
