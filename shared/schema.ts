import mongoose, { Schema, model } from "mongoose";

// ==================== USERS ====================
const userSchema = new Schema({
  username: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});
export const User = model("User", userSchema);

// ==================== ROOMS ====================
const roomSchema = new Schema({
  name: { type: String, required: true },
  code: {
    type: String,
    required: true,
    unique: true,
    minlength: 6,
    maxlength: 6,
  },
  createdBy: { type: Schema.Types.String, ref: "User" },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  listenerCount: { type: Number, default: 0 },
  members: [
    {
      userId: { type: Schema.Types.String, ref: "User", required: true },
      joinedAt: { type: Date, default: Date.now },
    },
  ],
  queueItems: [
    {
      song: { type: Schema.Types.ObjectId, ref: "Song", required: true },
      username: { type: String, ref: "User", required: true },
      addedBy: { type: Schema.Types.String, ref: "User" },
      upvotes: { type: Number, default: 0 },
      downvotes: { type: Number, default: 0 },
      url: { type: String },
      voters: [
        {
          userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
          voteType: { type: String, enum: ["up", "down"], required: true },
        },
      ],
      isPlaying: { type: Boolean, default: false },
    },
  ],
});

export const Room = model("Room", roomSchema);

// ==================== SONGS ====================
const songSchema = new Schema({
  title: { type: String, required: true },
  artist: { type: String, required: true },
  duration: { type: Number },
  cover: { type: String },
  url: { type: String },
});
export const Song = model("Song", songSchema);

// ==================== QUEUE ITEMS ====================
const queueItemSchema = new Schema({
  roomId: { type: Schema.Types.ObjectId, ref: "Room" },
  songId: { type: Schema.Types.ObjectId, ref: "Song" },
  addedBy: { type: Schema.Types.ObjectId, ref: "User" },
  position: { type: Number, required: true },
  votes: { type: Number, default: 0 },
  isPlaying: { type: Boolean, default: false },
  addedAt: { type: Date, default: Date.now }
});
export const QueueItem = model("QueueItem", queueItemSchema);

// ==================== VOTES ====================
const voteSchema = new Schema({
  queueItemId: { type: Schema.Types.ObjectId, ref: "QueueItem" },
  userId: { type: Schema.Types.ObjectId, ref: "User" },
  voteType: { type: String, enum: ["up", "down"], required: true },
  createdAt: { type: Date, default: Date.now },
});
export const Vote = model("Vote", voteSchema);
