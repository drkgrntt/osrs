import { RequestInfo, RequestInit } from "node-fetch";

const _importDynamic = new Function("modulePath", "return import(modulePath)");

export const fetch = async (url: RequestInfo, init?: RequestInit) => {
  const { default: fetch } = await _importDynamic("node-fetch");
  return fetch(url, init);
};

export const yesNoToBool = (yesNo?: string | null) => {
  if (!yesNo) return undefined;
  if (yesNo.toLowerCase() === "yes") return true;
  if (yesNo.toLowerCase() === "no") return false;
  return undefined;
};

export const immuneToBool = (yesNo?: string | null) => {
  if (!yesNo) return undefined;
  if (yesNo.toLowerCase() === "not immune") return false;
  if (yesNo.toLowerCase() === "immune") return true;
  return undefined;
};
