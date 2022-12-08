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

    // Infobox values
    const trs = qsa(dom, ".mw-parser-output .infobox tr");
    trs.forEach((tr) => {
      const type = tr.querySelector("th")?.textContent?.toLowerCase();
      const value = tr.querySelector("td")?.textContent;

      if (type) {
        switch (type) {
          // Date values
          case "removal":
          case "released":
            if (!value) break;
            record.released = new Date(value);
            break;

          // yes/no boolean values
          case "members":
          case "aggressive":
          case "poisonous":
          case "tradeable":
          case "bankable":
          case "equipable":
          case "stackable":
          case "noteable":
          case "flatpackable":
            if (!value) break;
            record[type] = yesNoToBool(value);
            break;

          // Re-keyed yes/no boolean values
          case "quest item":
            if (!value) break;
            record.questItem = yesNoToBool(value);
            break;

          // Re-keyed number values
          case "max hit":
            if (!value) break;
            record.maxHit = extractFloat(value);
            break;
          case "combat level":
            if (!value) break;
            record.combat = extractFloat(value);
            break;
          case "monster id":
            if (!value) break;
            record.monsterId = extractFloat(value);
            break;
          case "high alch":
            if (!value) break;
            record.highAlch = extractFloat(value);
            break;
          case "low alch":
            if (!value) break;
            record.lowAlch = extractFloat(value);
            break;
          case "buy limit":
            if (!value) break;
            record.buyLimit = extractFloat(value);
            break;
          case "daily volume":
            if (!value) break;
            record.dailyVolume = extractFloat(value);
            break;
          case "npc id":
            if (!value) break;
            record.npcId = extractFloat(value);
            break;
          case "object id":
            if (!value) break;
            record.objectId = extractFloat(value);
            break;
          case "item id":
            if (!value) break;
            record.itemId = extractFloat(value);
            break;
          case "level required":
            if (!value) break;
            record.levelRequired = extractFloat(value);
            break;
          case "agility xp":
            if (!value) break;
            record.agilityXp = extractFloat(value);
            break;

          // Exact match number values
          case "participants":
          case "value":
          case "weight":
          case "level":
          case "experience":
          case "exchange":
            if (!value) break;
            record[type] = extractFloat(value);
            break;

          // Immunity boolean values
          case "poison":
          case "venom":
          case "cannons":
          case "thralls":
            record[`${type}Immunity`] = immuneToBool(value);
            break;

          // Exact match values
          case "size":
          case "examine":
          case "attribute":
          case "race":
          case "gender":
          case "type":
          case "duration":
          case "composer":
          case "location":
          case "tutorial":
          case "quest":
          case "music":
          case "room":
          case "destroy":
            record[type] = value;
            break;

          // Re-keyed string values
          case "attack style":
            record.attackStyle = value;
            break;
          case "respawn time":
            record.respawnTime = value;
            break;
          case "reward currency":
            record.rewardCurrency = value;
            break;
          case "unlock hint":
            record.unlockHint = value;
            break;
          case "agility course":
            record.agilityCourse = value;
            break;

          // Comma-separated array value
          case "skills":
          case "options":
          case "hotspot":
          case "shop":
            record[type] = value?.split(",").map((v) => v.trim());
            break;

          // Re-keyed parsed-from-image values
          case "attack speed":
            let attackSpeed;
            const attackSpeedSrc = tr.querySelector("img")?.src;
            const [, second] = (attackSpeedSrc ?? "").split(
              "/images/Monster_attack_speed_"
            );
            const [speedStr] = (second ?? "").split(".");
            if (speedStr) attackSpeed = extractFloat(speedStr);
            record.attackSpeed = attackSpeed;
            break;

          // Images
          case "icon":
            const imgSrc = tr.querySelector("img")?.src;
            record[type] = `${BASE_URL}${imgSrc}`;
            break;

          // Default
          default:
            console.log("Missed info type:", type);
            break;
        }

        return;
      }

      // Combat stats
      const titles = Array.from(
        tr.querySelectorAll<HTMLAnchorElement>("th a") ?? []
      ).map((a) => a?.title?.toLowerCase());
      if (titles.length) {
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
              switch (title) {
                case "hitpoints":
                case "attack":
                case "strength":
                case "defence":
                case "magic":
                case "ranged":
                  record[title] = extractFloat(value);
                  break;
                default:
                  console.log("Missed combat stat:", title);
                  break;
              }
              break;

            case "aggressive stats":
              switch (title) {
                case "monster attack bonus":
                  record.attackBonus = extractFloat(value);
                  break;
                case "monster strength bonus":
                  record.strengthBonus = extractFloat(value);
                  break;
                case "magic":
                  record.magicBonus = extractFloat(value);
                  break;
                case "monster magic strength bonus":
                  record.magicStrengthBonus = extractFloat(value);
                  break;
                case "ranged":
                  record.rangedBonus = extractFloat(value);
                  break;
                case "monster ranged strength bonus":
                  record.rangedStrengthBonus = extractFloat(value);
                  break;
                default:
                  console.log("Missed aggressive stat:", title);
                  break;
              }
              break;

            case "defensive stats":
              switch (title) {
                case "stab":
                case "slash":
                case "crush":
                case "magic":
                case "ranged":
                  record[`${title}Defense`] = extractFloat(value);
                  break;
                default:
                  console.log("Missed defensive stat:", title);
                  break;
              }
              break;

            default:
              console.log("Missed category:", category);
              break;
          }
        });
      }
    });

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
