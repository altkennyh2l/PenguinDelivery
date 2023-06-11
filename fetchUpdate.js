import fsPromises from "fs/promises";
import fs from "fs";
import fetch from "node-fetch";
import archiver from "archiver";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function fetchJson(url) {
  const response = await fetch(url);
  console.log("[ChartDB Bundle Update] Fetching JSON from url: " + url);
  return response.json();
}

async function writeJsonFile(filePath, data) {
  console.log("[ChartDB Bundle Update] Writing JSON file at: " + filePath);
  await fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

async function updateJsonFile(timestamp) {
  const dataInfoPath = path.join(__dirname, "data", "data-info.json");
  let info;

  console.log(
    "[ChartDB Bundle Update] Reading existing data-info.json at: " +
      dataInfoPath
  );

  try {
    info = JSON.parse(await fs.readFileSync(dataInfoPath, "utf-8"));
  } catch (err) {
    info = {};
  }

  info.version = timestamp;
  info.last_updated = new Date().toISOString();
  await writeJsonFile(dataInfoPath, info);
}

async function createBundle(outputPath, timestamp) {
  console.log("[ChartDB Bundle Update] Creating bundle for: " + outputPath);

  const output = fs.createWriteStream(`${outputPath}/${timestamp}.zip`);
  const archive = archiver("zip");

  archive.directory(outputPath, false);
  archive.pipe(output);
  archive.finalize();
}

async function processCharts(chartDB, officialChartDB, outputPath) {
  console.log("[ChartDB Bundle Update] Processing chartDB data");

  let updatedChartDB = [];
  for (const element of chartDB) {
    if (element.meta.genre != "WORLD'S END") {
      let title = element.meta.title;
      let referenceOfficialDBItem = officialChartDB.find((obj) => {
        return obj.title === title;
      });

      if (!referenceOfficialDBItem) continue; // if no official ID found, skip this item.

      element.meta.officialID = referenceOfficialDBItem.id;
      element.meta.jacket = referenceOfficialDBItem.image;

      for (const [key, val] of Object.entries(element.data)) {
        element.data[key].level = val.level.toString().replace(/\.5$/u, "+");
      }

      await fetch(
        `${process.env.URL_OFFICIAL_IMG}${referenceOfficialDBItem.image}`
      ).then((res) =>
        res.body.pipe(
          fs.createWriteStream(
            path.join(outputPath, "jacket", `${referenceOfficialDBItem.id}.jpg`)
          )
        )
      );

      updatedChartDB.push(element); // add element to the updatedChartDB if it has a corresponding official ID.
    } else {
      let title = element.meta.title.slice(0, -3);
      let referenceOfficialDBItem = officialChartDB.find((obj) => {
        return obj.title === title && obj.we_star != 0;
      });

      if (!referenceOfficialDBItem) {
        continue;
      }

      element.meta.officialID = referenceOfficialDBItem.id;
      element.meta.jacket = referenceOfficialDBItem.image;
      element.data.WE.WE_Star = referenceOfficialDBItem.we_star;
      element.data.WE.we_kanji = referenceOfficialDBItem.we_kanji;

      await fetch(
        `${process.env.URL_OFFICIAL_IMG}${referenceOfficialDBItem.image}`
      ).then((res) =>
        res.body.pipe(
          fs.createWriteStream(
            path.join(outputPath, "jacket", `${referenceOfficialDBItem.id}.jpg`)
          )
        )
      );

      updatedChartDB.push(element); // add element to the updatedChartDB if it has a corresponding official ID.
    }
  }
  await writeJsonFile(path.join(outputPath, "ChartDB.json"), updatedChartDB);
}

function deleteFolderRecursive(folderPath) {
  if (fs.existsSync(folderPath)) {
    fs.readdirSync(folderPath).forEach((file) => {
      const curPath = path.join(folderPath, file);

      if (fs.lstatSync(curPath).isDirectory()) {
        deleteFolderRecursive(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    });
  }
}

function createTextFile(outputPath) {
  const filePath = path.join(outputPath, "IMPORTANT_README.txt");
  const acknowledgementText = `
  Acknowledgement:
  
  This .zip file is intended solely for use within the iOS application "UniSupport" and should not be obtained or accessed outside of its designated purpose.
  
  All contents included in this data bundle have been collected from the internet. The original sources of these contents are publicly accessible.
  
  All rights to the contents within this bundle belong to their respective rights holders and/or creators. The inclusion of these contents in this bundle does not imply any ownership or endorsement by the creators or rights holders.
  
  This data bundle, the accompanying website, and the "UniSupport" application are unofficial and completely unrelated to Sega Corporation (株式会社セガ) or any companies affiliated with it.
  
  By accessing or utilizing this data bundle, you acknowledge and agree to the terms mentioned above.
  `;

  fs.writeFileSync(filePath, acknowledgementText);
}

function getDateTimeString() {
  var currentDate = new Date();
  var isoString = currentDate.toISOString();

  var dateTimeString = isoString.replace(/\D/g, "");
  dateTimeString = dateTimeString.slice(0, 14);

  return dateTimeString;
}

function compareJSONFiles(ver1, ver2) {
  const file1 = path.join(__dirname, "data", ver1, "ChartDB.json");
  const file2 = path.join(__dirname, "data", ver2, "ChartDB.json");

  // Read the contents of the JSON files
  const data1 = fs.readFileSync(file1);
  const data2 = fs.readFileSync(file2);

  // Parse JSON data into JavaScript objects
  const obj1 = JSON.parse(data1);
  const obj2 = JSON.parse(data2);

  // Compare the objects for equality
  const areEqual = deepEqual(obj1, obj2);

  return areEqual;
}

function deepEqual(obj1, obj2) {
  // Check if both objects are of the same type
  if (typeof obj1 !== typeof obj2) {
    return false;
  }

  // Compare the keys of the objects
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) {
    return false;
  }

  for (let key of keys1) {
    // Recursively compare nested objects and arrays
    if (typeof obj1[key] === "object" && typeof obj2[key] === "object") {
      if (!deepEqual(obj1[key], obj2[key])) {
        return false;
      }
    }
    // Compare non-object values
    else if (obj1[key] !== obj2[key]) {
      return false;
    }
  }

  return true;
}

function clearOldData() {
  const folderPath = path.join(__dirname, "data");

  // Get a list of all subfolders
  const subfolders = fs
    .readdirSync(folderPath, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

  // Sort the subfolders in ascending order
  subfolders.sort();

  // Check if there are more than 5 subfolders
  if (subfolders.length > 5) {
    const oldestFolder = subfolders[0];
    const oldestFolderPath = path.join(folderPath, oldestFolder);

    // Recursively delete the oldest folder and its contents
    fs.rmdirSync(oldestFolderPath, { recursive: true });

    console.log(
      `[ChartDB Bundle Update] Removed old data bundle: ${oldestFolderPath}`
    );
  }
}

export default async function main() {
  console.log("[ChartDB Bundle Update] Starting update process");
  const timestamp = getDateTimeString();
  const outputPath = path.join(__dirname, "data", timestamp);

  // Create the output directory
  await fsPromises.mkdir(outputPath, { recursive: true });

  // Create the jacket subdirectory
  const jacketPath = path.join(outputPath, "jacket");
  await fsPromises.mkdir(jacketPath, { recursive: true });

  createTextFile(outputPath);

  const chartDB = await fetchJson(process.env.REQUEST_URL);
  const officialChartDB = await fetchJson(process.env.URL_OFFICIAL_JSON);

  console.log("[ChartDB Bundle Update] Processing charts and writing jackets");
  await processCharts(chartDB, officialChartDB, outputPath);

  const jsonData = chartDB;

  let latestVersion;
  const filePath = path.join(__dirname, "data", "data-info.json");

  try {
    const data = await fs.readFileSync(filePath, "utf8");
    latestVersion = JSON.parse(data).version;
  } catch (err) {
    latestVersion = "0";
  }

  if (latestVersion === "0") {
    console.log(
      "[ChartDB Bundle Update] Creating new bundle for: " + outputPath
    );
    await createBundle(outputPath, timestamp);
    await updateJsonFile(timestamp);
  } else {
    console.log(
      `[ChartDB Bundle Update] Checking difference between this and the latest version: ${latestVersion}`
    );

    const noDiff = compareJSONFiles(latestVersion, timestamp);

    if (!noDiff) {
      console.log(
        "[ChartDB Bundle Update] Creating updated bundle for: " + outputPath
      );
      await createBundle(outputPath, timestamp);
      await updateJsonFile(timestamp);
    } else {
      deleteFolderRecursive(outputPath);
      console.log(
        `[ChartDB Bundle Update] Fetch result is identical to the latest content, deleted folder: ${outputPath}`
      );
    }
  }
  // clearOldData();
  console.log("[ChartDB Bundle Update] Finished update process");
}
