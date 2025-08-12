import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

const { WEBHOOK_VERIFY_TOKEN, GRAPH_API_TOKEN, PORT } = process.env;

app.post("/webhook", async (req, res) => {
  console.log("Incoming webhook message:", JSON.stringify(req.body, null, 2));

  const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

  if (message?.type === "text") {
    const business_phone_number_id =
      req.body.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;
    const bodyPost = JSON.stringify(req.body, null, 2);

    // Fire-and-forget to your API
    (async () => {
      try {
        await axios.post(
          "http://52.187.0.115:80/WhatsAppAPI/ReciveMessage/Messages",
          bodyPost,
          {
            headers: { "Content-Type": "application/json" },
            timeout: 3000, // 3s timeout so it doesn't hang
          }
        );
        console.log("Internal API call successful");
      } catch (error) {
        console.error("Internal API call failed:", error.message);
      }
    })();

    // Send read receipt to WhatsApp
    try {
      await axios.post(
        `https://graph.facebook.com/v22.0/${business_phone_number_id}/messages`,
        {
          messaging_product: "whatsapp",
          status: "read",
          message_id: message.id,
        },
        {
          headers: { Authorization: `Bearer ${GRAPH_API_TOKEN}` },
        }
      );
      console.log("Blue tick (read receipt) sent");
    } catch (error) {
      console.error("Failed to send blue tick:", error.message);
    }
  }

  // Respond to WhatsApp immediately to avoid timeout
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
  res.send(`<pre>Nothing to see here.\nCheckout README.md to start.</pre>`);
});

app.listen(PORT || 3000, () => {
  console.log(`Server is listening on port: ${PORT || 3000}`);
});
