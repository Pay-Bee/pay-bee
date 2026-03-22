import cron from "node-cron";
import { runSteamScraper } from "./steam-scraper.job";

let isRunning = false;

async function run(): Promise<void> {
  if (isRunning) return;
  isRunning = true;
  console.log("[scraper] starting steam top sellers job");
  try {
    await runSteamScraper();
  } catch (err) {
    console.error("[scraper] job failed:", err);
  } finally {
    isRunning = false;
  }
}

export function triggerScraper(): boolean {
  if (isRunning) return false;
  void run();
  return true;
}

export function startScheduler(): void {
  const schedule = process.env.STEAM_SCRAPER_CRON ?? "0 0 * * *";

  cron.schedule(schedule, () => {
    if (isRunning) {
      console.log("[scraper] previous job still running, skipping this tick");
      return;
    }
    void run();
  });

  console.log(`[scraper] scheduled — ${schedule}`);
}
