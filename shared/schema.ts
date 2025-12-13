import { Schema, model } from "mongoose";

// Users Schema
const userSchema = new Schema({
  username: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});
export const User = model("User", userSchema);

// Rooms Schema
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
      addedAt: { type: Date, default: Date.now },
    },
  ],
});

export const Room = model("Room", roomSchema);

// Songs Schema
const songSchema = new Schema({
  title: { type: String, required: true },
  artist: { type: String, required: true },
  duration: { type: Number },
  cover: { type: String },
  url: { type: String },
  spotifyId: { type: String, unique: true, sparse: true },
  youtubeId: { type: String },
});
export const Song = model("Song", songSchema);