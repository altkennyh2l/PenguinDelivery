import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function validateChartDB(data) {
  // Type checks
  if (!Array.isArray(data)) {
    console.log("Error: Root element should be an array");
    return false;
  }

  let validCount = 0;
  for (const element of data) {
    if (typeof element !== "object" || Array.isArray(element)) {
      console.log("Error: Each element in the array should be an object");
      return false;
    }

    if (!validateMeta(element.meta)) {
      console.log("Error: Invalid meta data in element");
      return false;
    }

    if (!validateDataClass(element.data)) {
      console.log("Error: Invalid data in element");
      return false;
    }

    console.log(`Element ${element.meta.title} passes the check`);
    validCount++;
  }

  console.log(`Total valid elements: ${validCount}`);
  return true;
}

function validateMeta(meta) {
  if (typeof meta !== "object" || Array.isArray(meta)) {
    return false;
  }

  if (
    typeof meta.id !== "string" ||
    typeof meta.title !== "string" ||
    typeof meta.genre !== "string" ||
    typeof meta.artist !== "string" ||
    typeof meta.release !== "string" ||
    typeof meta.bpm !== "number" ||
    typeof meta.officialID !== "string" ||
    typeof meta.jacket !== "string"
  ) {
    return false;
  }

  return true;
}

function validateDataClass(data) {
  if (typeof data !== "object" || Array.isArray(data)) {
    return false;
  }

  for (const key of ["bas", "adv", "exp", "mas"]) {
    if (data[key] && !validateAdv(data[key])) {
      return false;
    }
  }

  if (data.we && !validateWe(data.we)) {
    return false;
  }

  return true;
}

function validateAdv(adv) {
  if (typeof adv !== "object" || Array.isArray(adv)) {
    return false;
  }

  if (
    typeof adv.level !== "string" ||
    typeof adv.const !== "number" ||
    typeof adv.maxcombo !== "number" ||
    typeof adv.isConstUnknown !== "number"
  ) {
    return false;
  }

  return true;
}

function validateWe(we) {
  if (typeof we !== "object" || Array.isArray(we)) {
    return false;
  }

  if (
    typeof we.level !== "number" ||
    typeof we.const !== "number" ||
    typeof we.maxcombo !== "number" ||
    typeof we.isConstUnknown !== "number" ||
    typeof we.weStar !== "string" ||
    typeof we.weKanji !== "string"
  ) {
    return false;
  }

  return true;
}

const chartDBJSONPath = path.join(
  __dirname,
  "data",
  "20230611134739",
  "ChartDB.json"
);
const data = JSON.parse(fs.readFileSync(chartDBJSONPath, "utf8"));
console.log(
  validateChartDB(data) ? "The JSON is valid" : "The JSON is invalid"
);
