import { JSDOM } from "jsdom";
import { write } from "../database";
import { extractFloat, fetch, immuneToBool, yesNoToBool } from "../utils";

const BASE_URL = "https://oldschool.runescape.wiki";
const RANDOM_PAGE = `${BASE_URL}/w/Special:Random/main`;
// const ME_PAGE = `${BASE_URL}/w/Me`;
// const MAN_PAGE = `${BASE_URL}/w/Man`;
// const FIRE_ELEMENTAL_PAGE = `${BASE_URL}/w/Fire_elemental`;

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

export const scrape = async () => {
  try {
    const result = await (await fetch(RANDOM_PAGE)).text();
    // const result = await (await fetch(MAN_PAGE)).text();
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

    await write("item", [record], ["slug"]);

    console.log("Scraped: ", title);

    return record;
  } catch (error) {
    return { error };
  }
};

const stringKeys = [
  "size",
  "examine",
  "attribute",
  "race",
  "gender",
  "type",
  "duration",
  "composer",
  "location",
  "tutorial",
  "quest",
  "room",
  "destroy",
];
const dateKeys = ["removal", "released"];
const yesNoKeys = [
  "members",
  "aggressive",
  "poisonous",
  "tradeable",
  "bankable",
  "equipable",
  "stackable",
  "noteable",
  "flatpackable",
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
  "inhabitants",
  "hotspot",
  "shop",
];
const imgSrcKeys = ["icon"];
const skipKeys = (title?: string) => [
  "advanced data",
  "map",
  title?.toLowerCase(),
];

const stringValueMap = new Map([
  ["respawn time", "respawnTime"],
  ["reward currency", "rewardCurrency"],
  ["unlock hint", "unlockHint"],
  ["agility course", "agilityCourse"],
  ["quest series", "questSeries"],
]);
const yesNoMap = new Map([["quest item", "questItem"]]);
const numberValueMap = new Map([
  ["max hit", "maxHit"],
  ["combat level", "combat"],
  ["monster id", "monsterId"],
  ["high alch", "highAlch"],
  ["low alch", "lowAlch"],
  ["buy limit", "buyLimit"],
  ["daily volume", "dailyVolume"],
  ["npc id", "npcId"],
  ["object id", "objectId"],
  ["item id", "itemId"],
  ["level required", "levelRequired"],
  ["agility xp", "agilityXp"],
]);
const commaSeparatedValueMap = new Map([["attack style", "attackStyle"]]);

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

  // Infobox values
  const trs = qsa<HTMLTableRowElement>(dom, ".mw-parser-output .infobox tr");
  trs.forEach((tr) => {
    const type = tr.querySelector("th")?.textContent?.toLowerCase() as string;
    const value = tr.querySelector("td")?.textContent;

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
        const imgSrc = tr.querySelector("img")?.src;
        record[type] = `${BASE_URL}${imgSrc}`;
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

      // Log skip items
      case skipKeys(title).includes(type):
        break;

      // Default
      default:
        console.log("Missed info type:", type);
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
const defensiveStatKeys = ["stab", "slash", "crush", "magic", "ranged"];
const aggressiveStatKeyMap = new Map([
  ["monster attack bonus", "attackBonus"],
  ["monster strength bonus", "strengthBonus"],
  ["magic", "magicBonus"],
  ["monster magic strength bonus", "magicStrengthBonus"],
  ["ranged", "rangedBonus"],
  ["monster ranged strength bonus", "rangedStrengthBonus"],
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
  ).map((a) => a?.title?.toLowerCase());

  if (!titles.length) return;

  const category =
    tr.previousElementSibling?.previousElementSibling?.textContent
      ?.trim()
      .toLowerCase();

  const values = Array.from(
    tr.nextElementSibling?.querySelectorAll("td") ?? []
  ).map((td) => td?.textContent);

  titles.forEach((title, i) => {
    const value = values[i];
    if (!value) return;

    switch (category) {
      case "combat stats":
        if (combatStatKeys.includes(title)) {
          record[title] = extractFloat(value);
        } else {
          console.log("Missed combat stat:", title);
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
        }
        break;

      case "defensive stats":
        if (defensiveStatKeys.includes(title)) {
          record[`${title}Defense`] = extractFloat(value);
        } else {
          console.log("Missed defensive stat:", title);
        }
        break;

      default:
        console.log("Missed category:", category);
        break;
    }
  });
};
