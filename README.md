# Groovia 🎵

Groovia is a collaborative music listening platform that brings people together through shared playlists. It solves the "who has the aux?" problem by allowing users to create rooms where everyone can contribute to the music queue in real-time.

## 🚀 Project Overview & Problem Solved

**The Problem:**
In social gatherings (virtual or physical) or shared workspaces, music control is often centralized to one person. If someone wants to hear a song, they have to ask the host. There is no democratic way to decide what plays next, leading to designated "DJs" and passive listeners.

**The Solution:**
Groovia provides a democratic music experience.
- **Create a Room:** A host creates a room and shares a simple 6-character code.
- **Join & Collaborate:** Friends join the room, search for their favorite songs, and add them to a shared queue.
- **Vote:** Users can upvote or downvote songs in the queue, ensuring the group's favorite tracks play first.
- **Synced Playback:** The music plays from the host's device, but the "Now Playing" status is synced across all connected devices in real-time.

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** React (Vite)
- **Language:** TypeScript
- **Styling:** Tailwind CSS, Radix UI
- **State/Data Fetching:** Tanstack Query (React Query)
- **Routing:** Wouter
- **Real-time:** Socket.io-client

### Backend
- **Runtime:** Node.js
- **Framework:** Express
- **Real-time:** Socket.io (WebSockets for instant queue updates, user joins, votes)
- **Database Helper:** Mongoose

### Database
- **Database:** MongoDB
- **Architecture:** User-centric and Room-based document model.

---

## 💾 Database Architecture

The project uses **MongoDB** with Mongoose for schema modeling. The architecture is designed to handle real-time social interactions efficiently.

### Key Collections & Schemas

1.  **Users**
    *   Simple identity management using usernames.
    *   Tracks account creation time.

2.  **Rooms**
    *   The core entity of the application.
    *   **Members:** An array tracking who is currently in the room.
    *   **Queue System:** Contains an embedded list of **QueueItems**. This array holds the state of the playlist, including which song is playing, who added it, and its current vote score.

3.  **Songs**
    *   Acts as a cache for music metadata.
    *   Stores `spotifyId`, `title`, `artist`, `cover` URL, and `duration`.
    *   Prevents redundant API calls if a song is added frequently.

4.  **Votes**
    *   Tracks user engagement on specific songs.
    *   Stores `userId`, `queueItemId`, and `voteType` (up/down).
    *   Used to calculate the "score" of a song to reorder the queue dynamically.

---

## 🔗 API Integration

Groovia cleverly combines two powerful APIs to provide the best user experience: **Spotify for Data** and **YouTube for Playback**.

### 1. Spotify API 🎧
**Why is it used?**
Spotify maintains one of the most comprehensive and well-structured databases of music metadata (Song Titles, Artist Names, Album Art, Duration) in the world.

### 2. YouTube API 📺
**Why is it used?**
While Spotify is great for data, its playback SDK limits streaming to Premium users or imposes varying restrictions. YouTube provides a universally accessible playback source.

---

## 🏁 Overall

Groovia creates a seamless, democratic, and engaging social music experience. By leveraging the **robust metadata of Spotify** and the **accessible streaming power of YouTube**, combined with real-time **WebSocket synchronization**, it ensures the party never stops and everyone gets a say in the playlist.

It's not just a music player; it's a social platform for music lovers.
