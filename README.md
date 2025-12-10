# Groovia 🎵

Groovia is a shared music queue platform that brings people together by enabling them to listen to music in a collaborative and democratic manner. It's a place where everyone has a say and a chance to shape the perfect playlist.
It removes the hassle of passing the phone around and repeatedly asking someone to play your song by allowing everyone to search and add their favourite songs into the shared queue directly from their own phones.

## 🚀 Project Overview & Problem Solved

**The Problem:**

In social gatherings or shared workspaces, when people decide to listen to music, two genuine problems arise. Music control is often centralized to one person, forcing everyone else to ask the host to play their favorite songs repeatedly. Additionally, there is no fair or democratic way to decide what plays next, leading to designated “DJs” and passive listeners, ultimately resulting in disengagement.

**The Solution:**

- Groovia creates a truly democratic music experience by allowing a host to create a room and share a simple, unique 6-character code. Friends can join from their own devices, search for their favourite songs, and add them directly to the shared queue.
- The queue continuously reorders based on user votes, ensuring the group’s top choices rise to the top.
- Music streams from the host’s device while the song’s playback progress stays synced across all connected devices.

**All this, without asking anyone their phone or requesting anyone to play your favorite music.**


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


## 🔗 API Integration

Groovia cleverly combines two powerful APIs to provide the best user experience: **Spotify for Data** and **YouTube for Playback**.

### 1. Spotify API 🎧
**Why is it used?**
Spotify maintains one of the most comprehensive and well-structured databases of music metadata (Song Titles, Artist Names, Album Art, Duration) in the world.

### 2. YouTube API 📺
**Why is it used?**
While Spotify is great for data, its playback SDK limits streaming to Premium users or imposes varying restrictions. YouTube provides a universally accessible playback source.


## 🏁 Overall

Groovia creates a seamless, democratic, and engaging social music experience. By leveraging the **robust metadata of Spotify** and the **accessible streaming power of YouTube**, combined with real-time **WebSocket synchronization**, it ensures the party never stops and everyone gets a say in the playlist.

It's not just a music player; it's a social platform for music lovers.