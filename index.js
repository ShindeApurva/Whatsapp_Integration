import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

const { WEBHOOK_VERIFY_TOKEN, GRAPH_API_TOKEN, PORT } = process.env;

// ----------------------------
// WhatsApp Webhook - POST
// ----------------------------
app.post("/webhook", (req, res) => {
  // Log everything for debugging
  console.log("✅ Incoming webhook message:", JSON.stringify(req.body, null, 2));

  // Respond immediately to WhatsApp to avoid timeout / missing blue tick
  res.sendStatus(200);

  // Extract message safely
  const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  const business_phone_number_id =
    req.body.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;

  if (!message) return; // no message, nothing to process

  // Fire-and-forget internal API call
  (async () => {
    try {
      await axios.post(
        "http://52.187.0.115:80/WhatsAppAPI/ReciveMessage/Messages",
        JSON.stringify(req.body, null, 2),
        {
          headers: { "Content-Type": "application/json" },
          timeout: 3000, // 3s timeout
        }
      );
      console.log("✅ Internal API call successful");
    } catch (error) {
      console.error("⚠️ Internal API call failed:", error.message);
    }
  })();

  // Send read receipt (blue tick) if message is text or template
  if (message.type === "text" || message.type === "template") {
    (async () => {
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
            timeout: 3000,
          }
        );
        console.log("✅ Blue tick (read receipt) sent");
      } catch (error) {
        console.error("⚠️ Failed to send blue tick:", error.message);
      }
    })();
  }
});

// ----------------------------
// WhatsApp Webhook - GET (Verification)
// ----------------------------
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === WEBHOOK_VERIFY_TOKEN) {
    res.status(200).send(challenge);
    console.log("✅ Webhook verified successfully!");
  } else {
    res.sendStatus(403);
  }
});

// ----------------------------
// Health / Root Endpoint
// ----------------------------
app.get("/", (req, res) => {
  res.send(`<pre>Nothing to see here.\nCheckout README.md to start.</pre>`);
});

// ----------------------------
// Start server with dynamic port
// ----------------------------
const listenPort = PORT || 3000;
app.listen(listenPort, () => {
  console.log(`✅ Server is listening on port: ${listenPort}`);
});
