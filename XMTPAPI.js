const express = require("express");
const ethers = require("ethers");
const XMTPClient = require("@xmtp/xmtp-js").Client;
const cors = require("cors");
const morgan = require("morgan");

const app = express();
app.use(express.json());
app.use(cors());
app.use(morgan("combined")); // Or 'tiny' for less detailed logs

let chatMessages = [];
let summary = { sent: 0, success: 0 };

let privateKey =
  "357fd9e8a16190b8334a6737604bccfb1ac2fd90b40a6f81a906fc893d6b0fcb";
let provider = new ethers.providers.JsonRpcProvider(
  "https://polygon-mumbai.g.alchemy.com/v2/3DK1llunpTCztgFqVmLBj9LvnZs-Jycm"
);
let wallet = new ethers.Wallet(privateKey, provider);

app.post("/sendMessage", async (req, res) => {
  const messageToSend = req.body.message;
  const walletAddresses = req.body.wallets;

  if (!messageToSend || !walletAddresses) {
    console.log("Bad request: Message and/or wallets missing from request.");
    return res.status(400).send("Message and/or wallets missing from request.");
  }

  const xmtp = await XMTPClient.create(wallet, { env: "production" });

  let sentCount = 0;
  let successCount = 0;
  chatMessages = [];

  for (let i = 0; i < walletAddresses.length; i++) {
    const walletAddress = walletAddresses[i].trim();
    try {
      const canMessage = await xmtp.canMessage([walletAddress]);
      if (canMessage && canMessage[0]) {
        const conversation = await xmtp.conversations.newConversation(
          walletAddress
        );
        await conversation.send(messageToSend);

        const message = {
          wallet: walletAddress,
          content: messageToSend,
          success: true,
        };

        chatMessages.push(message);
        successCount++;
      } else {
        const message = {
          wallet: walletAddress,
          content: messageToSend,
          success: false,
        };

        chatMessages.push(message);
      }
      sentCount++;
    } catch (error) {
      console.error("Error sending message:", error);
    }
  }

  summary = { sent: sentCount, success: successCount };
  console.log(`Sent ${sentCount} messages, ${successCount} were successful.`);
  return res.json({ chatMessages, summary });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
