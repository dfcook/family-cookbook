import { describe, expect, test } from "vitest";
import { backupsToDelete } from "./retention";

/** Every day from `from` to `to`, inclusive, as YYYY-MM-DD. */
function days(from: string, to: string): string[] {
  const out: string[] = [];
  for (let t = Date.parse(from); t <= Date.parse(to); t += 86_400_000) {
    out.push(new Date(t).toISOString().slice(0, 10));
  }
  return out;
}

describe("backupsToDelete", () => {
  test("keeps the last 30 days, including today", () => {
    const folders = days("2026-11-01", "2026-11-30");
    expect(backupsToDelete(folders, "2026-11-30")).toEqual([]);
  });

  test("deletes older nightlies but keeps the first of each month", () => {
    const folders = days("2026-09-01", "2026-11-30");
    const deleted = backupsToDelete(folders, "2026-11-30");

    // Kept: 1 Sep, 1 Oct (monthly) and 1 to 30 Nov (last 30 days).
    const kept = folders.filter((f) => !deleted.includes(f));
    expect(kept).toEqual([
      "2026-09-01",
      "2026-10-01",
      ...days("2026-11-01", "2026-11-30"),
    ]);
  });

  test("the 30-day window crosses month ends correctly", () => {
    const folders = days("2026-10-01", "2026-11-14");
    const kept = folders.filter(
      (f) => !backupsToDelete(folders, "2026-11-14").includes(f),
    );
    // 30 days back from 14 Nov is 16 Oct; 1 Oct stays as October's keeper.
    expect(kept).toEqual(["2026-10-01", ...days("2026-10-16", "2026-11-14")]);
  });

  test("if a month's first night was missed, its earliest backup is kept instead", () => {
    const folders = ["2026-08-03", "2026-08-04", "2026-11-14"];
    expect(backupsToDelete(folders, "2026-11-14")).toEqual(["2026-08-04"]);
  });

  test("ignores anything that isn't a dated folder, and trailing slashes", () => {
    const folders = [
      "2026-01-01/",
      "2026-01-02/",
      "notes/",
      "2026-02-31/",
      "latest",
    ];
    expect(backupsToDelete(folders, "2026-11-14")).toEqual(["2026-01-02"]);
  });

  test("rejects a bad 'today'", () => {
    expect(() => backupsToDelete([], "yesterday")).toThrow();
  });
});
