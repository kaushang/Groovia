import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();
import connectDB from "./config/db.ts";
import { Room, Song, User } from "@shared/schema.ts";
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const server = createServer(app);

// Initialize Socket.io with the HTTP server
const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Connect DB
connectDB();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use("/covers", express.static(path.join(__dirname, "public/covers")));
app.use("/songs", express.static(path.join(__dirname, "public/songs")));

// Your existing logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// WebSocket connection management
import { connectedUsers, rooms } from "./state";

// WebSocket event handlers
io.on("connection", (socket) => {
  log(`WebSocket: User connected ${socket.id}`);

  socket.on("joinRoom", async (data: { roomId: string; userId: string }) => {
    try {
      const { roomId, userId } = data;

      socket.join(roomId);

      for (const [socketId, memberUser] of Array.from(
        connectedUsers.entries()
      )) {
        if (memberUser.userId === userId && socketId !== socket.id) {
          memberUser.rooms.forEach((rid: any) => {
            const room = rooms.get(rid);
            if (room) {
              room.delete(socketId);
              if (room.size === 0) rooms.delete(rid);
            }
          });
          connectedUsers.delete(socketId);
        }
      }

      // Check if user was already in this room before (for toast filtering)
      const alreadyInRoom = Array.from(rooms.get(roomId) || []).some(
        (socketId) => {
          const memberUser = connectedUsers.get(socketId);
          return memberUser?.userId === userId;
        }
      );

      // Register (or update) this socket
      let user = connectedUsers.get(socket.id);
      if (!user) {
        user = {
          userId,
          username: "Unknown", // Ideally fetch from DB
          socketId: socket.id,
          rooms: new Set(),
        };
        connectedUsers.set(socket.id, user);
      }
      user.rooms.add(roomId);

      // Track room membership
      if (!rooms.has(roomId)) {
        rooms.set(roomId, new Set());
      }
      rooms.get(roomId)!.add(socket.id);

      // ✅ Correct listener count
      const currentListenerCount = rooms.get(roomId)!.size;

      // Emit success back to the joining user
      socket.emit("joinedRoom", {
        roomId,
        success: true,
        listenerCount: currentListenerCount,
        room: {
          roomId,
          listenerCount: currentListenerCount,
          members: Array.from(rooms.get(roomId) || []).map((socketId) => {
            const memberUser = connectedUsers.get(socketId);
            return {
              userId: memberUser?.userId,
              username: memberUser?.username,
              socketId,
            };
          }),
        },
      });

      // ✅ Only notify others if this is a *brand new user*, not reload
      if (!alreadyInRoom) {
        socket.to(roomId).emit("userJoined", {
          user: {
            userId: user.userId,
            username: user.username,
            socketId: socket.id,
          },
          userId: user.userId,
          roomId,
        });
      }

      // ✅ Always sync absolute state for everyone
      io.to(roomId).emit("roomUpdated", {
        roomId,
        listenerCount: currentListenerCount,
        members: Array.from(rooms.get(roomId) || []).map((socketId) => {
          const memberUser = connectedUsers.get(socketId);
          return {
            userId: memberUser?.userId,
            username: memberUser?.username,
            socketId,
          };
        }),
      });

      // log(`WebSocket: User ${userId} (${user.username}) joined room ${roomId}`);
    } catch (error) {
      console.error("Error joining room:", error);
      socket.emit("joinRoomError", {
        message: "Failed to join room",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Handle leaving rooms via WebSocket
  socket.on("leaveRoom", async (data: { roomId: string; userId: string }) => {
    try {
      const { roomId, userId } = data;

      // Get user info before removing
      const user = connectedUsers.get(socket.id);

      // Leave the socket room
      socket.leave(roomId);

      // Remove from tracking maps
      if (rooms.has(roomId)) {
        const roomSockets = rooms.get(roomId)!;
        const wasInRoom = roomSockets.has(socket.id);
        roomSockets.delete(socket.id);
      }

      // Remove room from user's rooms set
      if (user && user.rooms.has(roomId)) {
        user.rooms.delete(roomId);
      }

      // Get current listener count after removal
      const currentListenerCount = rooms.get(roomId)?.size || 0;

      // Notify other users in the room about user leaving
      const userLeftData = {
        user: user
          ? {
              userId: user.userId,
              username: user.username,
              socketId: socket.id,
            }
          : { userId },
        roomId: roomId,
      };

      socket.to(roomId).emit("userLeft", userLeftData);

      // Send updated listener count to remaining users
      try {
        const room = await Room.findById(roomId).populate("queueItems.song");
        if (room) {
          const roomUpdateData = {
            ...room.toObject(),
            listenerCount: currentListenerCount,
          };
          socket.to(roomId).emit("roomUpdated", roomUpdateData);
        } else {
        }
      } catch (dbError) {
        console.error("💥 Error fetching room for update:", dbError);
      }
    } catch (error) {
      console.error("💥 Error in WebSocket leaveRoom:", error);
      if (error instanceof Error) {
        console.error("Error stack:", error.stack);
      }
    }
  });

  // Handle song addition via WebSocket
  socket.on(
    "addSongToQueue",
    async (data: { roomId: string; songId: string; userId: string }) => {
      try {
        const { roomId, songId, userId } = data;

        // Get user info from connected users
        const user = connectedUsers.get(socket.id);

        // Validate that user is connected and in the room
        if (!user || !user.rooms.has(roomId)) {
          socket.emit("songAddError", {
            message: "User not in room",
            error: "You must be in the room to add songs",
          });
          return;
        }

        // Validate required fields
        if (!songId || !userId || !roomId) {
          socket.emit("songAddError", {
            message: "Missing required fields",
            error: "songId, userId, and roomId are required",
          });
          return;
        }

        // Find user and song in database
        const [dbUser, song] = await Promise.all([
          User.findById(userId),
          Song.findById(songId),
        ]);

        if (!dbUser) {
          socket.emit("songAddError", {
            message: "User not found",
            error: "User does not exist",
          });
          return;
        }

        if (!song) {
          socket.emit("songAddError", {
            message: "Song not found",
            error: "Song does not exist",
          });
          return;
        }

        // Check if there is already a playing song
        const existingRoom = await Room.findById(roomId);
        const hasPlayingSong = existingRoom?.queueItems?.some((item) => item.isPlaying);

        // Update the room with the new queue item
        const updatedRoom = await Room.findByIdAndUpdate(
          roomId,
          {
            $push: {
              queueItems: {
                song: songId,
                username: dbUser.username,
                upvotes: 0,
                downvotes: 0,
                voters: [],
                isPlaying: !hasPlayingSong, // Auto-play if no song is playing
              },
            },
          },
          { new: true }
        ).populate("queueItems.song");

        if (!updatedRoom) {
          socket.emit("songAddError", {
            message: "Room not found",
            error: "Room does not exist",
          });
          return;
        }

        // Get current listener count
        const currentListenerCount = rooms.get(roomId)?.size || 0;

        // Prepare song addition data
        const songAddedData = {
          type: "SONG_ADDED",
          roomId,
          queueItems: updatedRoom.queueItems,
          newSong: {
            songId,
            username: dbUser.username,
            song: song,
            addedBy: userId,
            upvotes: 0,
            downvotes: 0,
            voters: [],
          },
          addedBy: {
            userId: user.userId,
            username: dbUser.username,
            socketId: socket.id,
          },
          listenerCount: currentListenerCount,
        };

        // Emit success back to the user who added the song
        socket.emit("songAddedSuccess", {
          ...songAddedData,
          message: "Song added to queue successfully",
        });

        // Notify other users in the room about the song addition
        socket.to(roomId).emit("songAdded", songAddedData);

        // Also emit updated room state to all users (including queue)
        const roomUpdateData = {
          ...updatedRoom.toObject(),
          listenerCount: currentListenerCount,
          members: Array.from(rooms.get(roomId) || []).map((socketId) => {
            const memberUser = connectedUsers.get(socketId);
            return {
              userId: memberUser?.userId,
              username: memberUser?.username,
              socketId,
            };
          }),
        };

        io.to(roomId).emit("roomUpdated", roomUpdateData);

        log(
          `WebSocket: User ${userId} (${dbUser.username}) added song ${song.title} to room ${roomId}`
        );
      } catch (error) {
        console.error("💥 Error in WebSocket addSongToQueue:", error);
        socket.emit("songAddError", {
          message: "Failed to add song to queue",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );
  socket.on(
    "voteOnSong",
    async (data: {
      roomId: string;
      queueItemId: string;
      userId: string;
      voteType: "up" | "down";
    }) => {
      console.log(11);
      try {
        const { roomId, queueItemId, userId, voteType } = data;
        console.log(22);
        
        // Get user info from connected users
        const user = connectedUsers.get(socket.id);
        console.log(33);
        
        // Validate that user is connected and in the room
        if (!user || !user.rooms.has(roomId)) {
          console.log(44);
          socket.emit("voteError", {
            message: "User not in room",
            error: "You must be in the room to vote",
          });
          return;
        }
        console.log(55);
        
        // Validate required fields
        if (!queueItemId || !userId || !roomId || !voteType) {
          console.log(66);
          socket.emit("voteError", {
            message: "Missing required fields",
            error: "queueItemId, userId, roomId, and voteType are required",
          });
          return;
        }
        console.log(77);
        
        // Validate vote type
        if (!["up", "down"].includes(voteType)) {
          console.log(88);
          socket.emit("voteError", {
            message: "Invalid vote type",
            error: "Vote type must be 'up' or 'down'",
          });
          return;
        }
        console.log(99);
        
        // Find user in database
        const dbUser = await User.findById(userId);
        if (!dbUser) {
          console.log(11);
          socket.emit("voteError", {
            message: "User not found",
            error: "User does not exist",
          });
          return;
        }
        console.log(22);
        
        // Find the room and queue item
        const room = await Room.findOne({
          _id: roomId,
          "queueItems._id": queueItemId,
        }).populate("queueItems.song");
        console.log(33);
        
        if (!room) {
          console.log(44);
          socket.emit("voteError", {
            message: "Room or queue item not found",
            error: "Invalid room or queue item",
          });
          return;
        }
        console.log(55);
        
        const queueItem = room.queueItems.id(queueItemId);
        if (!queueItem) {
          console.log(66);
          socket.emit("voteError", {
            message: "Queue item not found",
            error: "Queue item does not exist",
          });
          return;
        }
        console.log(77);
        
        // Get song title for notifications
        const songTitle = (queueItem.song as any)?.title || "Unknown Song";
        console.log(88);
        
        // Check if this user already voted
        const existingVote = queueItem.voters.find(
          (v) => v.userId.toString() === userId
        );
        console.log(99);
        
        if (existingVote) {
          console.log(11);
          // User already voted → adjust counts if switching vote
          if (existingVote.voteType !== voteType) {
            if (existingVote.voteType === "up") {
              queueItem.upvotes -= 1;
            } else {
              queueItem.downvotes -= 1;
            }
            
            existingVote.voteType = voteType;
            
            if (voteType === "up") {
              queueItem.upvotes += 1;
            } else {
              queueItem.downvotes += 1;
            }
          }
        } else {
          console.log(22);
          // New vote
          queueItem.voters.push({ userId, voteType });
          if (voteType === "up") {
            queueItem.upvotes += 1;
          } else {
            queueItem.downvotes += 1;
          }
        }
        
        console.log(33);
        // Save the updated room
        await room.save();
        
        // Re-populate to ensure we have full data
        await room.populate("queueItems.song");
        
        console.log(44);
        // Get current listener count
        const currentListenerCount = rooms.get(roomId)?.size || 0;
        const plainQueueItems = room.queueItems.map((qi) => qi.toObject());
        const plainQueueItem = queueItem.toObject();
        
        console.log(55);
        // Prepare vote update data
        const voteUpdateData = {
          type: "VOTE_UPDATED",
          roomId,
          queueItemId,
          queueItems: plainQueueItems,
          voteType,
          songTitle,
          votedBy: {
            userId: user.userId,
            username: dbUser.username,
            socketId: socket.id,
          },
          updatedQueueItem: queueItem,
          listenerCount: currentListenerCount,
        };
        
        console.log(66);
        // Emit success back to the user who voted
        socket.emit("voteSuccess", {
          ...voteUpdateData,
          message: "Vote recorded successfully",
        });
        console.log(77);
        
        // Notify other users in the room about the vote
        io.to(roomId).emit("voteUpdated", voteUpdateData);

        console.log(88);
        
        log(
          `WebSocket: User ${userId} (${dbUser.username}) voted ${voteType} on song "${songTitle}" in room ${roomId}`
        );
        console.log(99);
      } catch (error) {
        console.log(1010);
        console.error("💥 Error in WebSocket voteOnSong:", error);
        socket.emit("voteError", {
          message: "Failed to record vote",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );
  socket.on("songEnded", async (data: { roomId: string; songId: string }) => {
    try {
      const { roomId, songId } = data;
      
      // Find the room
      const room = await Room.findById(roomId);
      if (!room) return;

      // Find the song that ended
      const endedSongIndex = room.queueItems.findIndex(
        (item) => item.song?.toString() === songId || item._id?.toString() === songId
      );

      if (endedSongIndex !== -1) {
        // Remove the ended song
        room.queueItems.splice(endedSongIndex, 1);

        // If there are more songs, play the next one
        if (room.queueItems.length > 0) {
          // Sort by votes (descending) to pick the next best song
           room.queueItems.sort((a, b) => {
            const scoreA = (a.upvotes || 0) - (a.downvotes || 0);
            const scoreB = (b.upvotes || 0) - (b.downvotes || 0);
            return scoreB - scoreA;
          });
          
          // Set the first one to playing
          room.queueItems[0].isPlaying = true;
        }
        
        await room.save();
        await room.populate("queueItems.song");

        // Broadcast update
        const currentListenerCount = rooms.get(roomId)?.size || 0;
        const roomUpdateData = {
          ...room.toObject(),
          listenerCount: currentListenerCount,
          members: Array.from(rooms.get(roomId) || []).map((socketId) => {
            const memberUser = connectedUsers.get(socketId);
            return {
              userId: memberUser?.userId,
              username: memberUser?.username,
              socketId,
            };
          }),
        };

        io.to(roomId).emit("roomUpdated", roomUpdateData);
      }
    } catch (error) {
      console.error("Error handling songEnded:", error);
    }
  });
});

// Add WebSocket-related API endpoints
app.get("/api/websocket/stats", (req, res) => {
  res.json({
    connectedUsers: connectedUsers.size,
    activeRooms: Array.from(rooms.keys()),
    roomDetails: Object.fromEntries(
      Array.from(rooms.entries()).map(([roomName, users]) => [
        roomName,
        {
          userCount: users.size,
          users: Array.from(users).map(
            (socketId) => connectedUsers.get(socketId)?.username || "Unknown"
          ),
        },
      ])
    ),
  });
});

(async () => {
  // Pass the HTTP server to registerRoutes instead of just the app
  await registerRoutes(app, server, io);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Setup Vite with the HTTP server
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`Server is live on: http://localhost:${port}`);
    }
  );
})();

// Graceful shutdown
process.on("SIGINT", () => {
  log("\nShutting down server...");
  io.close(() => {
    server.close(() => {
      log("Server and WebSocket connections closed");
      process.exit(0);
    });
  });
});

// Export io instance for use in routes if needed
export { io, connectedUsers, rooms };
