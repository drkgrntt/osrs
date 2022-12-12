import { JSDOM } from "jsdom";
import { write } from "../database";
import { extractFloat, fetch, immuneToBool, yesNoToBool } from "../utils";

const BASE_URL = "https://oldschool.runescape.wiki";
const RANDOM_PAGE = "Special:Random/main";

const qs = <T extends Element>(dom: JSDOM, selector: string) =>
  dom.window.document.querySelector<T>(selector);

const qsa = <T extends Element>(dom: JSDOM, selector: string) =>
  dom.window.document.querySelectorAll<T>(selector);

export const continuousScrape = () => {
  setTimeout(async () => {
    await scrape();
    continuousScrape();
  }, Math.random() * 60 * 1000 + 200);
};

export const scrape = async (pageName: string = RANDOM_PAGE) => {
  try {
    const url = `${BASE_URL}/w/${pageName}`;

    const response = await fetch(url);
    if (response.status !== 200) throw new Error("Not found.");

    const result = await response.text();

    const dom = new JSDOM(result);

    const scrapedOn = new Date();

    // Title
    const title = qs(dom, "#firstHeading")?.innerHTML;

    // Slug
    const slug = title?.toLowerCase().replace(/\ /g, "_");

    // Info image
    let mainImage = qs<HTMLImageElement>(
      dom,
      ".mw-parser-output .infobox .infobox-image img"
    )?.src;
    if (mainImage) mainImage = `${BASE_URL}${mainImage}`;

    // Image URL
    let textBoxImage = qs<HTMLImageElement>(
      dom,
      ".mw-parser-output .image img"
    )?.src;
    if (textBoxImage) textBoxImage = `${BASE_URL}${textBoxImage}`;
    if (textBoxImage === mainImage) textBoxImage = undefined;

    // Description
    const content = qs(dom, ".mw-parser-output");
    const descriptionElements = [];
    for (const element of Array.from(content?.children ?? [])) {
      if (element.id === "toc") break;
      if (element.nodeName.toLowerCase() === "p")
        descriptionElements.push(element);
    }
    const description = descriptionElements
      .map((element) => element.textContent)
      .join("\n");

    const record: Record<string, any> = {
      scrapedOn,
      slug,
      title,
      mainImage,
      description,
      textBoxImage,
    };

    // References
    if (description.toLowerCase().includes("may refer to:")) {
      const items = content?.querySelectorAll("ul li a") ?? [];
      record.references = [
        ...new Set(Array.from(items).map((li) => li.textContent)),
      ];
    }

    parseInfoBox(dom, record, title);

    const locationsElem = qs(dom, "#Locations");
    if (locationsElem) {
      const table = locationsElem.parentElement?.nextElementSibling;
      const headings = Array.from(table?.querySelectorAll("th") ?? []).map(
        (th) => th?.textContent?.trim().toLowerCase()
      );
      record.locations = Array.from(table?.querySelectorAll("tbody tr") ?? [])
        .map((tr) => {
          const values = Array.from(tr?.querySelectorAll("td") ?? []).map(
            (td) => {
              const anchor = td.querySelector<HTMLAnchorElement>("a");
              if (anchor && anchor.querySelector("img")) {
                return anchor.title.toLowerCase() === "members";
              }
              return td?.textContent;
            }
          );
          if (!values.length) return;
          return headings.reduce<Record<string, any>>((curr, heading, i) => {
            if (!heading || heading === "map") return curr;

            if (heading === "spawns") {
              curr[heading] = extractFloat(values[i] as string);
            } else {
              curr[heading] = values[i];
            }

            return curr;
          }, {});
        })
        .filter(Boolean);
    }

    // Dangerous activity
    record.dangerousActivity = !!qs(dom, ".messagebox.warn")
      ?.textContent?.toLowerCase()
      .includes("this is a dangerous activity");

    parseH2Headers(dom, record);

    await write("item", [record], ["slug"]);

    console.info("Scraped: ", title);

    return record;
  } catch (error) {
    console.error({ error });
    if (error.message === "Not found.") error.status = 404;
    return { error };
  }
};

const contentSectionKeyMap = new Map([
  ["history", "history"],
  ["getting there", "gettingThere"],
  ["features", "features"],
  ["item spawns", "itemSpawns"],
  ["monsters", "monsters"],
  ["trivia", "trivia"],

  // Quests
  ["walkthrough", "walkthrough"],
  ["rewards", "rewards"],
  ["required for completing", "requiredForCompleting"],
]);

/**
 * Mutate the recore with the info found under the h2s
 * @param dom JSDOM object we're looking through
 * @param record The record we're populating
 */
const parseH2Headers = (dom: JSDOM, record: Record<string, any>) => {
  const headers = qsa(dom, "h2");
  headers.forEach((header) => {
    const title = header
      .querySelector(".mw-headline")
      ?.textContent?.trim()
      .toLowerCase();
    if (!title || !Array.from(contentSectionKeyMap.keys()).includes(title))
      return;

    const key = contentSectionKeyMap.get(title);
    if (!key) {
      console.warn(`No key set for heading ${title}`);
      return;
    }

    let content = "";
    let elem = header.nextElementSibling;
    while (elem && elem.nodeName.toLowerCase() !== "h2") {
      switch (elem.nodeName.toLowerCase()) {
        case "p":
          content += `${elem.textContent}\n`;
          break;
        case "ul":
          elem.querySelectorAll("li").forEach((li) => {
            content += `- ${li.textContent}\n`;
          });
          break;
        default:
          console.warn(
            `Potentially missed content for h2 ${title} in a <${elem.nodeName.toLowerCase()}>:`,
            elem.textContent
          );
          break;
      }
      elem = elem.nextElementSibling;
    }

    if (content) {
      record[key] = content;
    }
  });
};

const stringKeys = [
  "size",
  "element",
  "examine",
  "effect",
  "attribute",
  "race",
  "gender",
  "type",
  "tool",
  "trap",
  "league",
  "duration",
  "composer",
  "location",
  "locations",
  "tutorial",
  "quest",
  "room",
  "destroy",
  "seed",
  "plant",
  "cost",
  "crop",
  "category",
  "turael",
  "spira",
  "krystilia",
  "mazchna",
  "role",
  "founder",
  "team",
  "vannaka",
  "chaeldar",
  "amunition",
  "konar",
  "nieve",
  "bait",
  "duradel",
  "facility",
  "monster",
  "spellbook",
  "tier",
  "yield",
  "owner",
  "specialty",
  "patch",
];
const dateKeys = ["removal", "released", "employed"];
const yesNoKeys = [
  "members",
  "aggressive",
  "poisonous",
  "tradeable",
  "bankable",
  "payment",
  "edible",
  "equipable",
  "stackable",
  "stacks in bank",
  "regrow",
  "noteable",
  "flatpackable",
  "retaliation",
];
const immunityKeys = ["poison", "venom", "cannons", "thralls"];
const numberKeys = [
  "participants",
  "value",
  "weight",
  "level",
  "experience",
  "floors",
  "exchange",
];
const commaSeparatedKeys = [
  "skills",
  "options",
  "music",
  "headquarters",
  "inhabitants",
  "hotspot",
  "shop",
  "products",
  "instruments",
];
const aSeparatedKeys = ["teleports"];
const imgSrcKeys = ["icon"];
const imgSrcKeyMap = new Map([
  ["minimap icon", "minimapIcon"],
  ["map icon", "mapIcon"],
]);
const skipKeys = (title?: string) => [
  "advanced data",
  "map",
  "attack bonuses",
  "defence bonuses",
  "other bonuses",
  "aggressive stats",
  "requirements",
  "task amounts",
  "properties",
  "values",
  "grand exchange",
  "combat info",
  "immunities",
  "slayer info",
  "combat stats",
  "defensive stats",
  "rock",
  title?.toLowerCase(),
];

const stringValueMap = new Map([
  ["respawn time", "respawnTime"],
  ["wilderness level", "wildernessLevel"],
  ["reward currency", "rewardCurrency"],
  ["unlock hint", "unlockHint"],
  ["agility course", "agilityCourse"],
  ["quest series", "questSeries"],
  ["growth time", "growthTime"],
  ["other", "otherRequirements"],
  ["furniture name", "furnitureName"],
  ["drain rate", "drainRate"],
  ["combat level", "combatLevel"],
  ["description", "infoDescription"],
  ["required tool", "requiredTool"],
  ["official difficulty", "officialDifficulty"],
  ["fishing spot", "fishingSpot"],
  ["current leader", "currentLeader"],
  ["social media", "socialMedia"],
]);
const yesNoMap = new Map([
  ["quest item", "questItem"],
  ["two handed?", "twoHanded"],
]);
const numberValueMap = new Map([
  ["max hit", "maxHit"],
  ["monster id", "monsterId"],
  ["high alch", "highAlch"],
  ["low alch", "lowAlch"],
  ["buy limit", "buyLimit"],
  ["daily volume", "dailyVolume"],
  ["npc id", "npcId"],
  ["object id", "objectId"],
  ["item id", "itemId"],
  ["seeds per", "seedsPer"],
  ["construction level", "constructionLevel"],
  ["icon id", "iconId"],
  ["icon item id", "iconItemId"],
  ["wikisync id", "wikisyncId"],
  ["level required", "levelRequired"],
  ["agility xp", "agilityXp"],
  ["slayer level", "slayerLevel"],
  ["slayer xp", "slayerXp"],
  ["thieving xp", "thievingXp"],
  ["prayer xp", "prayerXp"],
  ["construction xp", "constructionXp"],
  ["woodcutting xp", "woodcuttingXp"],
  ["firemaking xp", "firemakingXp"],
  ["hunter xp", "hunterXp"],
  ["mining xp", "miningXp"],
  ["casting speed", "castingSpeed"],
  ["base max hit", "baseMaxHit"],
  ["fishing xp", "fishingXp"],
  ["xp bonus", "xpBonusPercent"],
  ["strength xp", "strengthXp"],
  ["push duration", "pushDuration"],
  ["planting xp", "plantingXp"],
  ["checking xp", "checkingXp"],
  ["harvesting xp", "harvestingXp"],
]);
const commaSeparatedValueMap = new Map([
  ["attack style", "attackStyle"],
  ["worn options", "wornOptions"],
  ["also called", "alsoCalled"],
  ["build type", "buildType"],
  ["lead developer(s)", "leadDevelopers"],
]);
const keysForImageTitlesMap = new Map([
  ["assigned by", "assignedBy"],
  ["primary attack style", "primaryAttackStyle"],
  ["uses attack styles", "usesAttackStyles"],
]);

/**
 * Mutate the recore with the info found in the infobox in the dom
 * @param dom JSDOM object we're looking through
 * @param record The record we're populating
 */
const parseInfoBox = (
  dom: JSDOM,
  record: Record<string, any>,
  title?: string
) => {
  let key;
  let imgSrc;

  // Infobox values
  const trs = qsa<HTMLTableRowElement>(dom, ".mw-parser-output .infobox tr");
  trs.forEach((tr) => {
    const type = tr
      .querySelector("th")
      ?.textContent?.toLowerCase()
      .trim() as string;
    const value = tr.querySelector("td")?.textContent?.trim();

    if (!type) return parseCombatStats(tr, record);

    switch (true) {
      // Exact match strings
      case stringKeys.includes(type):
        record[type] = value;
        break;

      // Dates
      case dateKeys.includes(type):
        if (!value) break;
        record[type] = new Date(value);
        break;

      // Yes/no booleans
      case yesNoKeys.includes(type):
        if (!value) break;
        record[type] = yesNoToBool(value);
        break;

      // Immunity boolean values
      case immunityKeys.includes(type):
        record[`${type}Immunity`] = immuneToBool(value);
        break;

      // Exact match number values
      case numberKeys.includes(type):
        if (!value) break;
        record[type] = extractFloat(value);
        break;

      // Comma separated string values
      case commaSeparatedKeys.includes(type):
        record[type] = value?.split(",").map((v) => v.trim());
        break;

      // Images
      case imgSrcKeys.includes(type):
        imgSrc = tr.querySelector("img")?.src;
        record[type] = `${BASE_URL}${imgSrc}`;
        imgSrc = "";
        break;

      // Separate A's
      case aSeparatedKeys.includes(type):
        record[type] = Array.from(tr.querySelectorAll("a")).map(
          (a) => a.textContent
        );
        break;

      // Re-keyed Images
      case Array.from(imgSrcKeyMap.keys()).includes(type):
        key = imgSrcKeyMap.get(type);
        if (!key) {
          console.warn(`No key set for type ${type}`);
          break;
        }
        imgSrc = tr.querySelector("img")?.src;
        record[key] = `${BASE_URL}${imgSrc}`;
        key = "";
        imgSrc = "";
        break;

      // Re-keyed string values
      case Array.from(stringValueMap.keys()).includes(type):
        key = stringValueMap.get(type);
        if (!key) {
          console.warn(`No key set for type ${type}`);
          break;
        }
        record[key] = value;
        key = "";
        break;

      // Re-keyed yes/no boolean values
      case Array.from(yesNoMap.keys()).includes(type):
        if (!value) break;
        key = yesNoMap.get(type);
        if (!key) {
          console.warn(`No key set for type ${type}`);
          break;
        }
        record[key] = yesNoToBool(value);
        key = "";
        break;

      // Re-keyed number values
      case Array.from(numberValueMap.keys()).includes(type):
        if (!value) break;
        key = numberValueMap.get(type);
        if (!key) {
          console.warn(`No key set for type ${type}`);
          break;
        }
        record[key] = extractFloat(value);
        key = "";
        break;

      // Comma-separated re-keyed array values
      case Array.from(commaSeparatedValueMap.keys()).includes(type):
        key = commaSeparatedValueMap.get(type);
        if (!key) {
          console.warn(`No key set for type ${type}`);
          break;
        }
        record[key] = value?.split(",").map((v) => v.trim());
        key = "";
        break;

      // Values as image titles
      case Array.from(keysForImageTitlesMap.keys()).includes(type):
        key = keysForImageTitlesMap.get(type);
        if (!key) {
          console.warn(`No key set for type ${type}`);
          break;
        }
        record[key] = Array.from(
          tr.querySelectorAll<HTMLAnchorElement>("td a") ?? []
        ).map((a) => a?.title?.trim());
        break;

      case type === "animation":
        imgSrc = tr.nextElementSibling?.querySelector("img")?.src;
        record[type] = `${BASE_URL}${imgSrc}`;
        imgSrc = "";
        break;

      case type === "sound effect":
        // TODO: Find it
        // record.soundEffect =
        //   tr.nextElementSibling?.querySelector<HTMLAnchorElement>(
        //     ".credits_box a"
        //   )?.href;
        break;

      // Re-keyed parsed-from-image values
      case type === "attack speed":
        let attackSpeed;
        const attackSpeedSrc = tr.querySelector("img")?.src;
        const [, second] = (attackSpeedSrc ?? "").split(
          "/images/Monster_attack_speed_"
        );
        const [speedStr] = (second ?? "").split(".");
        if (speedStr) attackSpeed = extractFloat(speedStr);
        record.attackSpeed = attackSpeed;
        break;

      case type === "runes":
        const quantities = Array.from(tr.querySelectorAll("sup")).map(
          (sup) => sup.textContent
        );
        record.runes = Array.from(
          tr.querySelectorAll<HTMLAnchorElement>("td a")
        ).map((a, i) => `${quantities[i]} ${a.title}`);
        break;

      // Log skip items
      case skipKeys(title).includes(type):
        break;

      // Default
      default:
        console.warn("Missed info type:", type, ":", value);
        break;
    }
  });
};

const combatStatKeys = [
  "hitpoints",
  "attack",
  "strength",
  "defence",
  "magic",
  "ranged",
];
const aggressiveStatKeyMap = new Map([
  ["monster attack bonus", "attackBonus"],
  ["monster strength bonus", "strengthBonus"],
  ["magic", "magicBonus"],
  ["monster magic strength bonus", "magicStrengthBonus"],
  ["ranged", "rangedBonus"],
  ["monster ranged strength bonus", "rangedStrengthBonus"],
]);
const defensiveStatKeys = ["stab", "slash", "crush", "magic", "ranged"];
const attackBonusKeys = ["stab", "slash", "crush", "magic", "ranged"];
const defenseBonusKeys = ["stab", "slash", "crush", "magic", "ranged"];
const otherBonusKeyMap = new Map([
  ["strength bonus", "strength"],
  ["ranged strength", "rangedStrength"],
  ["magic damage", "magic"],
  ["prayer", "prayer"],
  // ["ammo slot", "ammoSlot"],
]);

/**
 * Mutate the recore with combat stats
 * @param tr The table row being parsed
 * @param record The record we're populating
 */
const parseCombatStats = (
  tr: HTMLTableRowElement,
  record: Record<string, any>
) => {
  const titles = Array.from(
    tr.querySelectorAll<HTMLAnchorElement>("th a") ?? []
  ).map((a) => a?.title?.toLowerCase().trim());

  if (!titles.length) return;

  const category =
    tr.previousElementSibling?.previousElementSibling?.textContent
      ?.trim()
      .toLowerCase();

  const values = Array.from(
    tr.nextElementSibling?.querySelectorAll("td") ?? []
  ).map((td) => td?.textContent?.trim());

  titles.forEach((title, i) => {
    const value = values[i];
    if (!value) return;

    switch (category) {
      case "combat stats":
        if (combatStatKeys.includes(title)) {
          record[title] = extractFloat(value);
        } else {
          console.warn("Missed combat stat:", title);
        }
        break;

      case "aggressive stats":
        if (Array.from(aggressiveStatKeyMap.keys()).includes(title)) {
          const key = aggressiveStatKeyMap.get(title);
          if (!key) {
            console.warn(`No key set for title ${title}`);
            break;
          }
          record[key] = extractFloat(value);
        } else {
          console.warn("Missed aggressive stat:", title);
        }
        break;

      case "defensive stats":
        if (defensiveStatKeys.includes(title)) {
          record[`${title}Defense`] = extractFloat(value);
        } else {
          console.warn("Missed defensive stat:", title);
        }
        break;

      case "attack bonuses":
        if (attackBonusKeys.includes(title)) {
          record[`${title}AttackBonus`] = extractFloat(value);
        } else {
          console.warn("Missed attack bonus:", title);
        }
        break;

      case "defense bonuses":
      case "defence bonuses": // What??? Normalized typo!
        if (defenseBonusKeys.includes(title)) {
          record[`${title}DefenseBonus`] = extractFloat(value);
        } else {
          console.warn("Missed defense bonus:", title);
        }
        break;

      case "other bonuses":
      case "other bonusesslot": // Row includes slot
        if (Array.from(otherBonusKeyMap.keys()).includes(title)) {
          const key = otherBonusKeyMap.get(title);
          if (!key) {
            console.warn(`No key set for title ${title}`);
            break;
          }
          record[`${key}OtherBonus`] = extractFloat(value);
        } else if (title.includes(" slot")) {
          const [slot] = title.trim().split(" ");
          record.slot = slot;
        } else {
          console.warn("Missed other bonus:", title);
        }
        break;

      default:
        console.warn("Missed category:", category);
        break;
    }
  });
};
