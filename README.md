# Verse — book recommendations by song

A browser app that turns a song title, artist, or feeling into three book recommendations. It uses a small local mood-matching model, so it needs no AI API key, account, or backend.

## Run in Windows Command Prompt

```cmd
git clone https://github.com/coderwriter124/song-to-book-recs.git
cd song-to-book-recs
npm install
npm run dev
```

Open the URL shown by Vite, usually `http://localhost:5173`.

## Notes

The app cannot legally stream arbitrary commercial songs by itself. The “listen while you read” link opens a YouTube search for the song. A future version could add an official Spotify or YouTube integration with the provider’s permissions.
