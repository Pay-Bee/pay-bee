/**
 * Seed script — populates games table with hardcoded game data.
 * No external API calls required.
 *
 * Usage:
 *   cd apps/api
 *   npm run seed
 */

import pool from "../src/db/db";
import { createGame } from "../src/services/catalog/catalog.service";

const GAMES = [
  {
    title: "Elden Ring",
    short_description: "Rise, Tarnished, and be guided by grace to brandish the power of the Elden Ring.",
    long_description: "A vast world where open fields with a variety of situations and huge dungeons with complex and three-dimensional designs are seamlessly connected.",
    developer: "FromSoftware",
    publisher: "Bandai Namco",
    genres: ["Action", "RPG"],
    features: ["Single-player", "Online Co-op", "Controller Support"],
    platforms: ["Windows"],
    price_usd: 59.99,
    discount_percent: 10,
    steam_app_id: "1245620",
    thumbnail_url: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1245620/header.jpg",
    hero_image_url: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1245620/capsule_616x353.jpg",
    release_date: "2022-02-25",
  },
  {
    title: "Cyberpunk 2077",
    short_description: "Cyberpunk 2077 is an open-world, action-adventure RPG set in Night City.",
    long_description: "You play as V, a mercenary outlaw going after a one-of-a-kind implant that is the key to immortality.",
    developer: "CD PROJEKT RED",
    publisher: "CD PROJEKT RED",
    genres: ["Action", "RPG"],
    features: ["Single-player", "Controller Support", "Ray Tracing"],
    platforms: ["Windows"] as const,
    price_usd: 49.99,
    discount_percent: 50,
    steam_app_id: "1091500",
    thumbnail_url: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1091500/header.jpg",
    hero_image_url: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1091500/capsule_616x353.jpg",
    release_date: "2020-12-10",
  },
  {
    title: "Red Dead Redemption 2",
    short_description: "America, 1899. The end of the Wild West era has begun.",
    long_description: "Arthur Morgan and the Van der Linde gang are outlaws on the run. With federal agents and the best bounty hunters in the nation massing on their heels, the gang must rob, steal and fight their way across the rugged heartland of America.",
    developer: "Rockstar Games",
    publisher: "Rockstar Games",
    genres: ["Action", "RPG"],
    features: ["Single-player", "Online Multiplayer", "Controller Support"],
    platforms: ["Windows"] as const,
    price_usd: 59.99,
    discount_percent: 0,
    steam_app_id: "1174180",
    thumbnail_url: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1174180/header.jpg",
    hero_image_url: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1174180/capsule_616x353.jpg",
    release_date: "2019-12-05",
  },
  {
    title: "Hades",
    short_description: "Defy the god of the dead as you hack and slash out of the Underworld.",
    long_description: "Hades is a god-like rogue-like dungeon crawler that combines the best aspects of Supergiant's critically acclaimed titles.",
    developer: "Supergiant Games",
    publisher: "Supergiant Games",
    genres: ["Action", "Roguelike", "Indie"],
    features: ["Single-player", "Controller Support", "Cloud Saves"],
    platforms: ["Windows", "MacOS"] as const,
    price_usd: 24.99,
    discount_percent: 20,
    steam_app_id: "1145360",
    thumbnail_url: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1145360/header.jpg",
    hero_image_url: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1145360/capsule_616x353.jpg",
    release_date: "2020-09-17",
  },
  {
    title: "Hollow Knight",
    short_description: "Forge your own path in Hollow Knight, a challenging 2D action-adventure.",
    long_description: "Explore a vast ruined kingdom of insects and heroes. Battle tainted creatures and befriend bizarre bugs, all while unravelling an ancient mystery at the kingdom's core.",
    developer: "Team Cherry",
    publisher: "Team Cherry",
    genres: ["Action", "Indie"],
    features: ["Single-player", "Controller Support"],
    platforms: ["Windows", "MacOS", "Linux"] as const,
    price_usd: 14.99,
    discount_percent: 0,
    steam_app_id: "367520",
    thumbnail_url: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/367520/header.jpg",
    hero_image_url: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/367520/capsule_616x353.jpg",
    release_date: "2017-02-24",
  },
  {
    title: "Stardew Valley",
    short_description: "You've inherited your grandfather's old farm plot in Stardew Valley.",
    long_description: "Armed with hand-me-down tools and a few coins, you set out to begin your new life. Can you learn to live off the land and turn these overgrown fields into a thriving home?",
    developer: "ConcernedApe",
    publisher: "ConcernedApe",
    genres: ["RPG", "Indie"],
    features: ["Single-player", "Online Multiplayer", "Controller Support"],
    platforms: ["Windows", "MacOS", "Linux"] as const,
    price_usd: 14.99,
    discount_percent: 0,
    steam_app_id: "413150",
    thumbnail_url: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/413150/header.jpg",
    hero_image_url: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/413150/capsule_616x353.jpg",
    release_date: "2016-02-26",
  },
  {
    title: "Grand Theft Auto V",
    short_description: "When a young street hustler, a retired bank robber and a terrifying psychopath find themselves entangled with some of the most frightening and deranged elements of the criminal underworld.",
    long_description: "Grand Theft Auto V for PC offers players the option to explore the award-winning world of Los Santos and Blaine County in resolutions of up to 4k and beyond.",
    developer: "Rockstar Games",
    publisher: "Rockstar Games",
    genres: ["Action"],
    features: ["Single-player", "Online Multiplayer", "Controller Support"],
    platforms: ["Windows"] as const,
    price_usd: 29.99,
    discount_percent: 0,
    steam_app_id: "271590",
    thumbnail_url: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/271590/header.jpg",
    hero_image_url: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/271590/capsule_616x353.jpg",
    release_date: "2015-04-14",
  },
  {
    title: "Among Us",
    short_description: "Play online or over local WiFi with 4-15 players as you attempt to prepare your spaceship for departure.",
    long_description: "An online and local party game of teamwork and betrayal for 4-15 players. Play with your friends or get matched with other players online!",
    developer: "Innersloth",
    publisher: "Innersloth",
    genres: ["Indie"],
    features: ["Online Multiplayer", "Local Multiplayer", "Controller Support"],
    platforms: ["Windows"] as const,
    price_usd: 5.00,
    discount_percent: 0,
    steam_app_id: "945360",
    thumbnail_url: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/945360/header.jpg",
    hero_image_url: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/945360/capsule_616x353.jpg",
    release_date: "2018-11-16",
  },
];

async function main() {
  console.log(`[seed] seeding ${GAMES.length} games...`);

  let success = 0;
  let failed = 0;

  for (const game of GAMES) {
    try {
      await createGame(game);
      console.log(`[seed] ✓ ${game.title}`);
      success++;
    } catch (err) {
      console.error(`[seed] ✗ ${game.title}:`, (err as Error).message);
      failed++;
    }
  }

  console.log(`\n[seed] done — ${success} inserted, ${failed} failed`);
  await pool.end();
  console.log("[seed] pool closed");
}

main().catch((err) => {
  console.error("[seed] fatal:", err);
  process.exit(1);
});
