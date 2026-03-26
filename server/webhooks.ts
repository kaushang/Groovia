import { Webhook } from "svix";
import express from "express";
import { RegisteredUser } from "@shared/schema";

export const clerkWebhookRouter = express.Router();

// express.raw must be used to get the raw body string for svix verification
clerkWebhookRouter.post("/clerk", express.raw({ type: "application/json" }), async (req, res) => {
  const SIGNING_SECRET = process.env.SIGNING_SECRET;

  if (!SIGNING_SECRET) {
    console.error("Missing SIGNING_SECRET in environment variables.");
    return res.status(400).json({ error: "Missing SIGNING_SECRET" });
  }

  const svix_id = req.headers["svix-id"] as string;
  const svix_timestamp = req.headers["svix-timestamp"] as string;
  const svix_signature = req.headers["svix-signature"] as string;

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return res.status(400).json({ error: "Missing SVIX headers" });
  }

  const payload = req.body;
  const body = payload.toString("utf8");
  const wh = new Webhook(SIGNING_SECRET);

  let evt: any;
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    });
  } catch (err: any) {
    console.error("Clerk Webhook verification failed:", err.message);
    return res.status(400).json({ error: "Invalid webhook signature" });
  }

  const { id } = evt.data;
  const eventType = evt.type;

  console.log(`Received Clerk Webhook: ${eventType} for user ${id}`);

  if (eventType === "user.created") {
    const { email_addresses, first_name, last_name, image_url } = evt.data;
    const email = email_addresses && email_addresses.length > 0 ? email_addresses[0].email_address : "";

    try {
      // Check if user already exists
      const existingUser = await RegisteredUser.findOne({ clerkId: id });
      if (!existingUser) {
        const newUser = new RegisteredUser({
          clerkId: id,
          email: email,
          firstName: first_name || "",
          lastName: last_name || "",
          imageUrl: image_url || "",
          friends: [],
          favoriteSongs: [],
        });
        await newUser.save();
        console.log(`✅ RegisteredUser document created for ${email}`);
      }
    } catch (dbError) {
      console.error("❌ Error saving RegisteredUser to database:", dbError);
    }
  }

  if (eventType === "user.updated") {
    const { email_addresses, first_name, last_name, image_url } = evt.data;
    const email = email_addresses && email_addresses.length > 0 ? email_addresses[0].email_address : "";

    try {
      await RegisteredUser.findOneAndUpdate(
        { clerkId: id },
        {
          email: email,
          firstName: first_name || "",
          lastName: last_name || "",
          imageUrl: image_url || "",
        }
      );
      console.log(`🔁 RegisteredUser document updated for ${email}`);
    } catch (dbError) {
      console.error("❌ Error updating RegisteredUser in database:", dbError);
    }
  }

  if (eventType === "user.deleted") {
    try {
      await RegisteredUser.findOneAndDelete({ clerkId: id });
      console.log(`🗑️ RegisteredUser document deleted for ${id}`);
    } catch (dbError) {
      console.error("❌ Error deleting RegisteredUser from database:", dbError);
    }
  }

  res.status(200).json({ success: true });
});
