import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

const { WEBHOOK_VERIFY_TOKEN, GRAPH_API_TOKEN, PORT } = process.env;

app.post("/webhook", async (req, res) => {
  console.log("Incoming webhook message:", JSON.stringify(req.body, null, 2));

  const message = req.body.entry?.[0]?.changes[0]?.value?.messages?.[0];

  if (message?.type === "text") {
    const business_phone_number_id =
      req.body.entry?.[0].changes?.[0].value?.metadata?.phone_number_id;

    let bodyPost = JSON.stringify(req.body, null, 2);

    try {
      // Send incoming message to your API
      await axios.post(
        "http://52.187.0.115:49656/WhatsAppAPI/ReciveMessage/Messages",
        bodyPost,
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      // Mark the message as read
      await axios({
        method: "POST",
        url: `https://graph.facebook.com/v22.0/${business_phone_number_id}/messages`,
        headers: { Authorization: `Bearer ${GRAPH_API_TOKEN}` },
        data: {
          messaging_product: "whatsapp",
          status: "read",
          message_id: message.id,
        },
      });
    } catch (error) {
      console.error("Error handling webhook:", error.message);
    }
  }

  res.sendStatus(200);
});

app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === WEBHOOK_VERIFY_TOKEN) {
    res.status(200).send(challenge);
    console.log("Webhook verified successfully!");
  } else {
    res.sendStatus(403);
  }
});

app.get("/", (req, res) => {
  res.send(`<pre>Nothing to see here.
Checkout README.md to start.</pre>`);
});

app.listen(PORT || 3000, () => {
  console.log(`Server is listening on port: ${PORT || 3000}`);
});
