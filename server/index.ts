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
        // Fetch user from DB to get the real username
        const dbUser = await User.findById(userId);

        user = {
          userId,
          username: dbUser?.username || "Unknown",
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

      // Fetch the real room state from DB
      const dbRoom = await Room.findById(roomId)
        .populate("queueItems.song")
        .populate("members.userId", "username")
        .populate("createdBy", "username")
        .populate("history.song")
        .populate("history.addedBy", "username");

      if (dbRoom) {
        // Emit success back to the joining user
        socket.emit("joinedRoom", {
          roomId,
          success: true,
          listenerCount: currentListenerCount,
          room: {
            ...dbRoom.toObject(),
            listenerCount: currentListenerCount,
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
          ...dbRoom.toObject(),
          listenerCount: currentListenerCount,
        });
      }

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
        const room = await Room.findById(roomId)
          .populate("queueItems.song")
          .populate("members.userId", "username")
          .populate("createdBy", "username")
          .populate("history.song")
          .populate("history.addedBy", "username");
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
        // Get the song before removing
        const queueItem = room.queueItems[endedSongIndex];

        // Add to history
        room.history.push({
          song: queueItem.song,
          addedBy: queueItem.addedBy,
          playedAt: new Date()
        });

        // Limit history size
        if (room.history.length > 50) {
          room.history.shift();
        }

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

        // Broadcast update with full population
        const updatedRoom = await Room.findById(roomId)
          .populate("queueItems.song")
          .populate("members.userId", "username")
          .populate("createdBy", "username")
          .populate("history.song")
          .populate("history.addedBy", "username");

        if (updatedRoom) {
          const currentListenerCount = rooms.get(roomId)?.size || 0;
          const roomUpdateData = {
            ...updatedRoom.toObject(),
            listenerCount: currentListenerCount,
          };
          io.to(roomId).emit("roomUpdated", roomUpdateData);
        }
      }
    } catch (error) {
      console.error("Error handling songEnded:", error);
    }
  });

  // Sync playback time
  socket.on("updateTime", (data: { roomId: string; currentTime: number; duration: number }) => {
    const { roomId, currentTime, duration } = data;
    // Broadcast to everyone else in the room (excluding sender)
    socket.to(roomId).emit("timeUpdated", { currentTime, duration });
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
