const { Telegraf } = require("telegraf");
const FormData = require("form-data");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");

const botToken = "7063107596:AAFL7oGHTJ6eCsms6GbmCDXucBaskCSTezo";
const apyToken =
  "APY0qV3264V8jVV2EkpLE4ly6VQLQCHwBLo375cLmS4dZDGaoZNfyEPa2NLsSwopeiZaV9c13TlUYe";

const bot = new Telegraf(botToken);

bot.on("text", async (ctx) => {
  try {
    const chatId = ctx.chat.id;
    const message = ctx.message.text;
    // Split the message into lines
    const lines = message.split("\n");

    // Initialize an empty object to store key-value pairs
    const data = {};
    if (lines[0] === "/start") {
      return ctx.reply("Send the data in the strict format required only");
    }

    console.log(lines, chatId);
    // Iterate over each line and extract key-value pairs
    lines.forEach((line) => {
      // Split each line at the colon (":") to separate key and value
      const [key, value] = line.split(":");

      // Remove leading and trailing whitespace from the key and value
      const cleanedKey = key.trim();
      const cleanedValue = value.trim();

      // Add the key-value pair to the data object
      data[cleanedKey] = cleanedValue;
    });

    const doc = generateDocument(data);

    const outputFilePath = "../Backup";
    const buf = doc.getZip().generate({ type: "nodebuffer" });

    const docxPath = path.resolve(outputFilePath, `${data.FN} ${data.LN}.docx`);
    fs.writeFileSync(docxPath, buf);

    const form = new FormData();
    form.append(
      "file",
      fs.createReadStream(docxPath),
      `${data.FN} ${data.LN}.docx`
    );

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
        },
      }
    );

    // Send the PDF document back to the user
    // await ctx.replyWithDocument({ source: fs.createReadStream(`${outputFilePath}/${data.FN} ${data.LN}.pdf`) });
    await ctx.reply(response.data.data);
  } catch (error) {
    // Handle the error
    console.error("An error occurred:", error.message);
    // Optionally, send an error message to the user
    ctx.reply("An error occurred while processing your request.");
  }
});

bot.launch();

function generateDocument(data) {
  const content = fs.readFileSync(
    path.resolve(__dirname, "Kaufvertrag Template.docx"),
    "binary"
  );
  const zip = new PizZip(content);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  doc.render({
    FN: data.FN,
    LN: data.LN,
    KP: data.KP,
    KA: data.KA,
    SUM: data.SUM,
    STR: data.STR,
    ADR: data.ADR,
  });

  return doc;
}
