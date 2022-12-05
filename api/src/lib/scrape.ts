import { JSDOM } from "jsdom";
import { write } from "../database";
import { fetch, immuneToBool, yesNoToBool } from "../utils";

const BASE_URL = "https://oldschool.runescape.wiki";
const RANDOM_PAGE = `${BASE_URL}/w/Special:Random/main`;
// const ME_PAGE = "https://oldschool.runescape.wiki/w/Me";
// const FIRE_ELEMENTAL_PAGE = "https://oldschool.runescape.wiki/w/Fire_elemental";

const qs = <T extends Element>(dom: JSDOM, selector: string) =>
  dom.window.document.querySelector<T>(selector);

const qsa = <T extends Element>(dom: JSDOM, selector: string) =>
  dom.window.document.querySelectorAll<T>(selector);

export const continuousScrape = () => {
  setTimeout(async () => {
    await scrape();
    continuousScrape();
  }, Math.random() * 60 * 1000);
};

export const scrape = async () => {
  const result = await (await fetch(RANDOM_PAGE)).text();
  // const result = await (await fetch(FIRE_ELEMENTAL_PAGE)).text();
  const dom = new JSDOM(result);

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
    slug,
    title,
    mainImage,
    description,
    textBoxImage,
  };

  const trs = qsa(dom, ".mw-parser-output .infobox tr");
  trs.forEach((tr) => {
    const type = tr.querySelector("th")?.textContent?.toLowerCase();
    const value = tr.querySelector("td")?.textContent;

    if (type) {
      switch (type) {
        case "released":
          if (!value) break;
          record.released = new Date(value);
          break;
        case "members":
        case "aggressive":
        case "poisonous":
          if (!value) break;
          record[type] = yesNoToBool(value);
          break;
        case "max hit":
          if (!value) break;
          record.maxHit = parseFloat(value);
          break;
        case "combat level":
          if (!value) break;
          record.combat = parseFloat(value);
          break;
        case "monster id":
          if (!value) break;
          record.monsterId = parseFloat(value);
          break;
        case "poison":
        case "venom":
        case "cannons":
        case "thralls":
          record[`${type}Immunity`] = immuneToBool(value);
          break;
        case "size":
        case "examine":
        case "attribute":
          record[type] = value;
          break;
        case "attack style":
          record.attackStyle = value;
          break;
        case "respawn time":
          record.respawnTime = value;
          break;
        case "attack speed":
          let attackSpeed;
          const attackSpeedSrc = tr.querySelector("img")?.src;
          const [, second] = (attackSpeedSrc ?? "").split(
            "/images/Monster_attack_speed_"
          );
          const [speedStr] = (second ?? "").split(".");
          if (speedStr) attackSpeed = parseFloat(speedStr);
          record.attackSpeed = attackSpeed;
          break;
        default:
          console.log("Missed info type:", type);
          break;
      }

      return;
    }

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
                record[title] = parseFloat(value);
                break;
              default:
                console.log("Missed combat stat:", title);
                break;
            }
            break;
          case "aggressive stats":
            switch (title) {
              case "monster attack bonus":
                record.attackBonus = parseFloat(value);
                break;
              case "monster strength bonus":
                record.strengthBonus = parseFloat(value);
                break;
              case "magic":
                record.magicBonus = parseFloat(value);
                break;
              case "monster magic strength bonus":
                record.magicStrengthBonus = parseFloat(value);
                break;
              case "ranged":
                record.rangedBonus = parseFloat(value);
                break;
              case "monster ranged strength bonus":
                record.rangedStrengthBonus = parseFloat(value);
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
                record[`${title}Defense`] = parseFloat(value);
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

  await write("item", [record], ["slug"]);

  console.log("Scraped: ", title);

  return record;
};
