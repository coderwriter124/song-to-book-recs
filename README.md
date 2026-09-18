# Verse — song-to-book recommendations

Verse finds a real song, plays an available legal preview, and recommends real books based on that actual track's title, artist, album, and Open Library subject metadata.

## Run

```cmd
cd /d C:\Users\priya\song-to-book-recs
git pull origin main
npm install
npm run dev
```

Open the Vite URL, usually `http://localhost:5173`.

## How the no-key AI system works

The app does not pretend that a browser can understand a full copyrighted audio file or lyrics without a provider. After the song is found, it builds a signal from the actual track title, artist, and album. It then:

1. Infers several mood signals locally from those words.
2. Searches Open Library for up to 50 candidate books using the real track metadata and moods.
3. Scores every candidate against its title, author, and Open Library subjects.
4. Sorts the strongest 12 matches and explains the mood match on each card.

This is a small deterministic, AI-style recommendation model that needs no AI API key. Open Library supplies real books and covers. Goodreads links open Goodreads search pages rather than scraping Goodreads.

A preview player is included when Deezer or Apple provides a preview URL. Full-song Spotify playback requires Spotify authorization and its official SDK; the app provides a Spotify search link instead.
