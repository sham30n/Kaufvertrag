const { Telegraf } = require("telegraf");
const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");

const botToken = "7063107596:AAFL7oGHTJ6eCsms6GbmCDXucBaskCSTezo";
const apyToken =
  "APY0CDAeZvnZmg1CB9XtkCE7FSzMDmuRoK8ExKbjSTkjeE23gEvFJ1NozonsSmTccmqH";
const apiUrl = "https://api.apyhub.com/convert/word-file/pdf-url";

const bot = new Telegraf(botToken);

bot.on("text", async (ctx) => {
  try {
    const chatId = ctx.chat.id;
    const message = ctx.message.text;

    const lines = message.split("\n");
    const data = {};

    if (lines[0] === "/start") {
      return ctx.reply("Send the data in the strict format required only");
    }

    console.log(message);

    lines.forEach((line) => {
      const [key, value] = line.split(":");
      const cleanedKey = key.trim();
      const cleanedValue = value.trim();
      data[cleanedKey] = cleanedValue;
    });

    const doc = generateDocument(data);
    const buf = doc.getZip().generate({ type: "nodebuffer" });
    const timeNow = Date.now();
    const fileName = `${data.FN} ${data.LN} ${chatId} ${timeNow}.docx`;
    const outputFilePath = "./docxFiles";

    const docxPath = path.resolve(outputFilePath, fileName);
    fs.writeFileSync(docxPath, buf);
    console.log("Docx File Created");

    const form = new FormData();
    form.append("file", fs.createReadStream(docxPath), fileName);

    const response = await axios.post(apiUrl, form, {
      params: {
        output: `${data.FN} ${data.LN} ${chatId} ${timeNow}.pdf`,
        landscape: "false",
      },
      headers: {
        ...form.getHeaders(),
        "apy-token": apyToken,
      },
    });
    console.log("File Converted");

    await ctx.reply(response.data.data); // Send the URL back to the user
    console.log("Link Sent To Client");

    setTimeout(() => {
      fs.unlink(docxPath, (err) => {
        if (err) {
          console.error("Error deleting DOCX file:", err.message);
        } else {
          console.log("DOCX file deleted:", docxPath);
        }
      });
    }, 10000);

    await ctx.forwardMessage(151781831, ctx.message.chat.id, ctx.message.text);
    console.log("Message Sent To Server");
    console.log("____________________________");
  } catch (error) {
    console.error("An error occurred:", error.message);
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
