const { Telegraf } = require("telegraf");
const dotenv = require("dotenv");
const FormData = require("form-data");
const axios = require("axios");
const AWS = require("aws-sdk");
const fs = require("fs");
const path = require("path");
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");

dotenv.config({ path: "./.env" });

const botToken = process.env.BOT_TOKEN;
const apyToken = process.env.APY_KEY;

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: "eu-north-1",
});

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
    console.log(message);
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

    const outputFilePath = path.join(__dirname, "..", "Drafts");
    const buf = doc.getZip().generate({ type: "nodebuffer" });

    const fileName = `${data.FN} ${data.LN} ${chatId} ${timeNow}.docx`;

    // Step 1: Upload to S3
    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: `drafts/${fileName}`,
      Body: buf,
      ContentType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    };

    await s3.upload(params).promise();
    console.log("Docx File Uploaded to S3");

    const form = new FormData();
    form.append("file", buf, fileName);

    // let timeNow = Date.now();

    // const docxPath = path.resolve(
    //   outputFilePath,
    //   `${data.FN} ${data.LN} ${chatId} ${timeNow}.docx`
    // );
    // fs.writeFileSync(docxPath, buf);
    // console.log("Docx File Created");
    // const form = new FormData();
    // form.append(
    //   "file",
    //   fs.createReadStream(docxPath),
    //   `${data.FN} ${data.LN} ${chatId} ${timeNow}.docx`
    // );

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
    console.log("File Converted To PDF");
    // Send the PDF document back to the user
    // await ctx.replyWithDocument({ source: fs.createReadStream(`${outputFilePath}/${data.FN} ${data.LN}.pdf`) });
    await ctx.reply(response.data.data);
    console.log("Link Sent To Client");
    await ctx.forwardMessage(151781831, ctx.message.chat.id, ctx.message.text);
    console.log("Message Sent To Server");
    console.log("____________________________");
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
