import express from "express";
import fs from "fs";
import path from "path";
import cron from "node-cron";
import fetchUpdate from "./fetchUpdate.js";
import { fileURLToPath } from "url";
import { dirname } from "path";

const app = express();
const port = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

await fetchUpdate();

cron.schedule("0 10 * * *", async () => {
  await fetchUpdate();
});

// Endpoint to get data information
app.get("/data-info", (req, res) => {
  fs.readFile(
    path.join(__dirname, "data", "data-info.json"),
    "utf8",
    (err, data) => {
      if (err) {
        res.status(500).send("Error reading data information");
      } else {
        res.send(JSON.parse(data));
      }
    }
  );
});

// Endpoint to download the latest zip
app.get("/download-latest", (req, res) => {
  fs.readFile(
    path.join(__dirname, "data", "data-info.json"),
    "utf8",
    (err, data) => {
      if (err) {
        res.status(500).send("Error reading data information");
      } else {
        const dataInfo = JSON.parse(data);
        const file = path.join(
          __dirname,
          "data",
          dataInfo.version,
          `${dataInfo.version}.zip`
        );
        res.download(file, (err) => {
          if (err) {
            res.status(500).send("Error downloading the file");
          }
        });
      }
    }
  );
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
