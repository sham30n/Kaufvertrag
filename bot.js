"use strict";

const path = require("path");
const fs = require("fs");
const TelegramBot = require("node-telegram-bot-api");
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const axios = require("axios");
const FormData = require("form-data");
// const { convertDocToPDF } = require("./converterDocToPDF");

const botToken = "7063107596:AAFL7oGHTJ6eCsms6GbmCDXucBaskCSTezo"; // Replace with your bot token obtained from BotFather
const apyToken =
  "APY0qV3264V8jVV2EkpLE4ly6VQLQCHwBLo375cLmS4dZDGaoZNfyEPa2NLsSwopeiZaV9c13TlUYe";

// Load the docx file as binary content
const content = fs.readFileSync(
  path.resolve(__dirname, "Kaufvertrag Template.docx"),
  "binary"
);
// Unzip the content of the file
const zip = new PizZip(content);
const doc = new Docxtemplater(zip, {
  paragraphLoop: true,
  linebreaks: true,
});

const bot = new TelegramBot(botToken, { polling: true });

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const message = msg.text;
  // Split the message into lines
  const lines = message.split("\n");

  // Initialize an empty object to store key-value pairs
  const data = {};
  if (lines[0] === "/start") {
    return bot.sendMessage(
      chatId,
      "Send the data in the strict format required only"
    );
  } else {
    // Iterate over each line and extract key-value pairs
    lines.forEach((line) => {
      console.log(line, chatId);
      // Split each line at the colon (":") to separate key and value
      const [key, value] = line.split(":");

      // Remove leading and trailing whitespace from the key and value
      const cleanedKey = key.trim();
      const cleanedValue = value.trim();

      // Add the key-value pair to the data object
      data[cleanedKey] = cleanedValue;
    });
  }
  doc.render({
    FN: data.FN,
    LN: data.LN,
    KP: data.KP,
    KA: data.KA,
    SUM: data.SUM,
    STR: data.STR,
    ADR: data.ADR,
  });

  const outputFilePath = "../Backup";
  const buf = doc.getZip().generate({ type: "nodebuffer" });

  fs.writeFileSync(
    path.resolve(outputFilePath, `${data.FN} ${data.LN}.docx`),
    buf
  );

  const docxPath = `${outputFilePath}/${data.FN} ${data.LN}.docx`;
  let pdfPath = `${outputFilePath}/${data.FN} ${data.LN}.pdf`;

  const form = new FormData();

  form.append("file", fs.readFileSync(docxPath), `${data.FN} ${data.LN}.docx`);

  const response = await axios.post(
    "https://api.apyhub.com/convert/word-file/pdf-url",
    form,
    {
      params: {
        output: `${data.FN} ${data.LN}.pdf`,
        landscape: "false",
      },
      headers: {
        ...form.getHeaders(),
        "apy-token": apyToken,
        "content-type": "multipart/form-data",
      },
    }
  );

  // Send the PDF document back to the user
  bot.sendDocument(151781831, docxPath);
  bot.sendMessage(chatId, response.data.data);
});
