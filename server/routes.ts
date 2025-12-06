import type { Express } from "express";
import {
  createServer,
  IncomingMessage,
  ServerResponse,
  type Server,
} from "http";
// import { storage } from "./storage";
import { User, Room, Song, QueueItem, Vote } from "@shared/schema";
import { v4 as uuidv4 } from "uuid";
import mongoose from "mongoose";
import { log } from "./vite";
import axios from "axios";
import qs from "qs";

export async function getSpotifyToken() {
  const tokenUrl = "https://accounts.spotify.com/api/token";

  const data = qs.stringify({
    grant_type: "client_credentials"
  });

  const headers = {
    "Content-Type": "application/x-www-form-urlencoded",
    "Authorization":
      "Basic " +
      Buffer.from(
        process.env.SPOTIFY_CLIENT_ID +
        ":" +
        process.env.SPOTIFY_CLIENT_SECRET
      ).toString("base64")
  };

  const response = await axios.post(tokenUrl, data, { headers });
  console.log(response.data.access_token);
  return response.data.access_token;
}

function generateRoomCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
import { Server as SocketIOServer } from "socket.io";
import { connectedUsers, rooms } from "./state";

export async function registerRoutes(
  app: Express,
  server: Server<typeof IncomingMessage, typeof ServerResponse>,
  io: SocketIOServer
): Promise<Server> {
  app.get("/api/rooms/:roomId", async (req, res) => {
    try {
      const { roomId } = req.params;
      const room = await Room.findById(roomId).populate("queueItems.song");
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }
      res.json(room);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch room" });
    }
  });

  app.get("/spotify-token-test", async (req, res) => {
    try {
      const token = await getSpotifyToken();
      console.log(token);
      res.json({ token });
    } catch (err: any) {
      console.error(err?.response?.data || err.message);
      res.status(500).json({ error: "Failed to fetch token" });
    }
  });

  app.get("/search", async (req, res) => {
    try {
      const query = req.query.q;

      if (!query) {
        return res.json({ tracks: [] });
      }

      // 1. Get access token
      const token = await getSpotifyToken();

      // 2. Call Spotify Search API
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      const response = await axios.get("https://api.spotify.com/v1/search", {
        headers: {
          Authorization: `Bearer ${token}`
        },
        params: {
          q: query,
          type: "track",
          limit: 10,
          offset: offset
        }
      });

      // 3. Format results
      const tracks = response.data.tracks.items.map((track: any) => ({
        id: track.id,
        name: track.name,
        artists: track.artists.map((a: any) => a.name),
        album: track.album.name,
        image: track.album.images[0]?.url,
        preview_url: track.preview_url,
        duration: track.duration_ms
      }));
      res.json({ tracks });
    } catch (error: any) {
      console.error(error?.response?.data || error.message);
      res.status(500).json({ error: "Failed to search songs" });
    }
  });

  // ✅ JOIN ROOM
  app.post("/api/rooms/code/:code", async (req, res) => {
    try {
      const room = await Room.findOne({ code: req.params.code }); // search by code field
      const { username } = req.body;

      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }

      if (!username) {
        return res.status(400).json({
          message: "Username is required",
        });
      }

      const user = new User({
        username: username,
        createdAt: new Date(),
      });

      const savedUser = await user.save();

      await Room.updateOne(
        { code: req.params.code }, // filter by code
        {
          $push: {
            members: {
              userId: savedUser._id,
              joinedAt: new Date(),
            },
          },
        }
      );

      const updatedRoom = await Room.findOne({ code: req.params.code }); // Fetch the updated room
      res.json({ room: updatedRoom, userId: savedUser._id });
    } catch (error) {
      console.error("Error fetching room:", error);
      res.status(500).json({ message: "Failed to fetch room" });
    }
  });

  // ✅ CREATE ROOM
  app.post("/api/rooms", async (req, res) => {
    try {
      const { name, username } = req.body;

      if (!name || !username) {
        return res.status(400).json({
          message: "Name and username are required",
        });
      }

      // Create the user
      const user = new User({
        username: username,
        createdAt: new Date(),
      });

      const savedUser = await user.save();

      const roomMembers = [
        {
          userId: savedUser._id,
          joinedAt: new Date(),
        },
      ];

      // Create the room
      const room = new Room({
        name: name,
        code: generateRoomCode(),
        createdBy: savedUser._id,
        isActive: true,
        listenerCount: 0, // Start at 0 - WebSocket will handle active listeners
        members: roomMembers,
        createdAt: new Date(),
      });

      const savedRoom = await room.save();

      // Populate the room data
      await savedRoom.populate([
        { path: "createdBy", select: "username email" },
        { path: "members.userId", select: "username email" },
      ]);

      // Send response first
      res.status(201).json({
        success: true,
        room: savedRoom,
        userId: savedUser._id, // Return just the ID, not the whole user object
      });

      // WebSocket notifications (after response is sent)
      // Note: Only emit to relevant users, not globally

      // Optionally notify about room creation (if you have a global rooms list)
      io.emit("roomCreated", {
        room: {
          id: savedRoom._id,
          name: savedRoom.name,
          code: savedRoom.code,
          createdBy: savedRoom.createdBy,
          memberCount: savedRoom.members.length,
          createdAt: savedRoom.createdAt,
        },
      });

      // The creator will join via WebSocket when they navigate to the room
      // No need to emit roomInvitation to the creator here since they're immediately joining

      console.log(
        `Room created: ${savedRoom.name} (${savedRoom.code}) by ${savedUser.username}`
      );
    } catch (error) {
      console.error("Error creating room:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create room",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });
  app.post("/api/rooms/:roomId/join", async (req, res) => {
    try {
      const { userId } = req.body;
      const roomId = req.params.roomId;

      const room = await Room.findById(roomId);
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }

      // Check if user is already a member
      const isMember = room.members.some(m => m.userId.toString() === userId);
      if (!isMember) {
        await Room.findByIdAndUpdate(roomId, {
          $push: {
            members: {
              userId: userId,
              joinedAt: new Date()
            }
          }
        });
      }

      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ message: "Failed to join room" });
    }
  });

  app.post("/api/rooms/:roomId/leave", async (req, res) => {
    try {
      const { userId } = req.body;
      const { roomId } = req.params;

      // Validate required fields
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      if (!roomId) {
        return res.status(400).json({ message: "Room ID is required" });
      }

      // Check if room exists
      const room = await Room.findById(roomId);
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }

      // Check if user is actually in the room
      const userInRoom = room.members.find(
        (member) => member.userId.toString() === userId.toString()
      );
      if (!userInRoom) {
        return res
          .status(400)
          .json({ message: "User is not a member of this room" });
      }

      // Remove user from room members
      const updatedRoom = await Room.findByIdAndUpdate(
        roomId,
        { $pull: { members: { userId: userId } } },
        { new: true }
      );

      if (!updatedRoom) {
        return res.status(404).json({ message: "Failed to update room" });
      }

      // If room is empty, delete it
      if (updatedRoom.members.length === 0) {
        await Room.findByIdAndDelete(roomId);

        // Notify via WebSocket that room was deleted
        io.to(roomId).emit("roomDeleted", { roomId });
      } else {
        // Notify remaining members about updated room
        const currentListenerCount = rooms.get(roomId)?.size || 0;

        // Explicitly re-fetch to ensure population works correctly
        const finalRoom = await Room.findById(roomId).populate("queueItems.song");

        if (finalRoom) {
          io.to(roomId).emit("roomUpdated", {
            ...finalRoom.toObject(),
            listenerCount: currentListenerCount,
          });
        }
      }

      // Delete the user from database
      const deletedUser = await User.findByIdAndDelete(userId);
      if (!deletedUser) {
        console.warn(
          `⚠️ User ${userId} not found in database during leave operation`
        );
      } else {
        console.log(`✅ User deleted:`, deletedUser.username);
      }

      res.status(200).json({
        success: true,
        message: "Successfully left room",
      });
    } catch (error) {
      console.error("💥 Error leaving room:", error);
      console.error(
        "Error stack:",
        error instanceof Error ? error.stack : "Unknown error"
      );
      res.status(500).json({
        success: false,
        message: "Failed to leave room",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });
  // Song routes
  app.get("/api/songs/search", async (req, res) => {
    // await Song.insertMany([
    //   {
    //     title: "P-POP CULTURE",
    //     artist: "Karan Aujla",
    //     duration: 212,
    //     cover: "/covers/p-pop_culture.jpg",
    //     url: "/songs/p-pop_culture.mp3",
    //   },
    //   {
    //     title: "At Peace",
    //     artist: "Karan Aujla",
    //     duration: 173,
    //     cover: "/covers/at_peace.jpg",
    //     url: "/songs/at_peace.mp3",
    //   },
    //   {
    //     title: "52 Bars",
    //     artist: "Karan Aujla",
    //     duration: 222,
    //     cover: "/covers/52_bars.jpg",
    //     url: "/songs/52_bars.mp3",
    //   },
    //   {
    //     title: "Courtside",
    //     artist: "Karan Aujla",
    //     duration: 172,
    //     cover: "/covers/courtside.jpg",
    //     url: "/songs/courtside.mp3",
    //   },
    //   {
    //     title: "winning speech",
    //     artist: "Karan Aujla",
    //     duration: 238,
    //     cover: "/covers/winning_speech.jpg",
    //     url: "/songs/winning_speech.mp3",
    //   },
    // ]);

    try {
      const { q } = req.query;
      if (!q || typeof q !== "string") {
        return res.status(400).json({ message: "Search query required" });
      }

      // Case-insensitive partial match on title or artist
      const songs = await Song.find({
        $or: [
          { title: { $regex: q, $options: "i" } },
          { artist: { $regex: q, $options: "i" } },
        ],
      }).limit(10); // optional: limit results
      console.log(songs);
      res.json(songs);
    } catch (error) {
      res.status(500).json({ message: "Search failed" });
    }
  });

  app.delete("/api/queue/:queueItemId", async (req, res) => {
    try {
      const { queueItemId } = req.params;
      const { userId } = req.body; // Expect userId in body

      // Find room containing this queue item
      const room = await Room.findOne({ "queueItems._id": queueItemId });

      if (!room) {
        return res.status(404).json({ message: "Queue item not found" });
      }

      const queueItem = room.queueItems.id(queueItemId);
      if (!queueItem) {
        return res.status(404).json({ message: "Queue item not found" });
      }

      // Verify ownership
      // Check addedBy first, fallback to username check if addedBy is missing (legacy items)
      // We need to fetch the user to check username if we fallback
      let isOwner = false;
      if (queueItem.addedBy) {
        isOwner = queueItem.addedBy.toString() === userId;
      } else {
        // Fallback: fetch user and compare usernames
        const user = await User.findById(userId);
        if (user && user.username === queueItem.username) {
          isOwner = true;
        }
      }

      const isPlaying = queueItem.isPlaying;

      if (!isOwner) {
        return res.status(403).json({ message: "You can only delete your own songs" });
      }

      // Remove the item
      room.queueItems.pull({ _id: queueItemId });

      // If the deleted song was playing, promote the next one
      if (isPlaying && room.queueItems.length > 0) {
        // Sort by votes to find next best song
        room.queueItems.sort((a, b) => {
          const scoreA = (a.upvotes || 0) - (a.downvotes || 0);
          const scoreB = (b.upvotes || 0) - (b.downvotes || 0);
          return scoreB - scoreA;
        });

        // Play the first one
        room.queueItems[0].isPlaying = true;
      }

      await room.save();

      // Emit update with the new state (including new playing song if applicable)
      const updatedRoom = await Room.findById(room._id).populate("queueItems.song");
      io.to(room._id.toString()).emit("roomUpdated", updatedRoom);

      res.json({ success: true });
    } catch (error) {
      console.error("Delete song error:", error);
      res.status(500).json({ message: "Failed to remove from queue" });
    }
  });
  // Add song to queue (HTTP endpoint)
  app.post("/api/rooms/:roomId/queue", async (req, res) => {
    try {
      const roomId = req.params.roomId;
      const { songId, addedBy, spotifyId, title, artist, cover, duration, url } = req.body;

      const user = await User.findById(addedBy);
      if (!addedBy || !user) {
        return res.status(400).json({ message: "addedBy is required and user must exist" });
      }

      let song;

      // Logic to find or create song
      if (spotifyId) {
        song = await Song.findOne({ spotifyId });
        if (!song) {
          // Create new song if it doesn't exist
          if (!title || !artist) {
            return res.status(400).json({ message: "Missing song metadata for creation" });
          }
          song = new Song({
            title,
            artist,
            cover,
            duration,
            url,
            spotifyId
          });
          await song.save();
        }
      } else if (songId) {
        // Fallback to legacy Mongo ID lookup
        song = await Song.findById(songId);
      }

      if (!song) {
        return res.status(404).json({ message: "Song not found" });
      }

      const finalSongId = song._id;

      // Determine if a song is already playing in this room
      const existingRoom = await Room.findById(roomId);
      const hasPlayingSong = existingRoom?.queueItems?.some((item) => item.isPlaying);

      const updatedRoom = await Room.findByIdAndUpdate(
        roomId,
        {
          $push: {
            queueItems: {
              song: finalSongId,
              username: user.username,
              addedBy: user._id,
              upvotes: 0,
              downvotes: 0,
              voters: [],
              isPlaying: !hasPlayingSong,
            },
          },
        },
        { new: true }
      ).populate("queueItems.song");

      if (!updatedRoom) {
        return res.status(404).json({ message: "Room not found" });
      }

      const currentListenerCount = rooms.get(roomId)?.size || 0;
      const songAddedData = {
        type: "SONG_ADDED",
        roomId,
        queueItems: updatedRoom.queueItems,
        newSong: {
          songId: finalSongId,
          username: user.username,
          song: song,
          addedBy: addedBy,
          upvotes: 0,
          downvotes: 0,
          voters: [],
        },
        listenerCount: currentListenerCount,
      };

      io.to(roomId).emit("songAdded", songAddedData);

      const roomUpdateData = {
        ...updatedRoom.toObject(),
        listenerCount: currentListenerCount,
        members: Array.from(rooms.get(roomId) || []).map((socketId) => {
          const memberUser = connectedUsers.get(socketId);
          return { userId: memberUser?.userId, username: memberUser?.username, socketId };
        }),
      };

      io.to(roomId).emit("roomUpdated", roomUpdateData);

      res.json({ message: "Song added to queue successfully", queueItems: updatedRoom.queueItems });
    } catch (error) {
      console.error("Error adding song to queue:", error);
      res.status(500).json({ message: "Failed to add song to queue" });
    }
  });
  
  app.post("/api/queue/:queueItemId/vote", async (req, res) => {
    try {
      const { queueItemId } = req.params;
      const { userId, voteType, roomId } = req.body;

      const room = await Room.findOne({ _id: roomId });
      if (!room) return res.status(404).json({ message: "Room not found" });

      const queueItem = room.queueItems.id(queueItemId);
      if (!queueItem) return res.status(404).json({ message: "Queue item not found" });

      const existingVote = queueItem.voters.find(v => v.userId.toString() === userId);
      if (existingVote) {
        if (existingVote.voteType !== voteType) {
          if (existingVote.voteType === "up") queueItem.upvotes -= 1;
          else queueItem.downvotes -= 1;

          existingVote.voteType = voteType;
          if (voteType === "up") queueItem.upvotes += 1;
          else queueItem.downvotes += 1;
        }
      } else {
        queueItem.voters.push({ userId, voteType });
        if (voteType === "up") queueItem.upvotes += 1;
        else queueItem.downvotes += 1;
      }

      await room.save();
      await room.populate("queueItems.song");

      // Emit to everyone in room
      io.to(roomId).emit("voteUpdated", {
        roomId,
        queueItems: room.queueItems.map(q => q.toObject()),
        updatedQueueItem: queueItem.toObject(),
        votedBy: { userId },
        voteType,
      });

      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to record vote" });
    }
  });


  app.delete("/api/queue/:queueItemId/vote", async (req, res) => {
    try {
      const { userId, roomId } = req.body;
      const { queueItemId } = req.params;

      const room = await Room.findById(roomId);
      if (!room) return res.status(404).json({ message: "Room not found" });

      const queueItem = room.queueItems.id(queueItemId);
      if (!queueItem) return res.status(404).json({ message: "Queue item not found" });

      // Remove the vote
      const voteIndex = queueItem.voters.findIndex(v => v.userId.toString() === userId);
      if (voteIndex > -1) {
        const vote = queueItem.voters[voteIndex];
        if (vote.voteType === "up") queueItem.upvotes -= 1;
        else queueItem.downvotes -= 1;

        queueItem.voters.splice(voteIndex, 1);
        await room.save();

        // Emit update
        const updatedRoom = await Room.findById(roomId).populate("queueItems.song");
        if (updatedRoom) {
          io.to(roomId).emit("voteUpdated", {
            roomId,
            queueItems: updatedRoom.queueItems,
            updatedQueueItem: queueItem
          });
        }
      }

      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ message: "Failed to remove vote" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
