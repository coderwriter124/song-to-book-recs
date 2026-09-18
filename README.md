# Verse — song-to-book recommendations

Verse searches a song, plays an available legal preview, and loads many real books with covers and links.

## Run in Windows Command Prompt

```cmd
cd /d C:\Users\priya\song-to-book-recs
git pull origin main
npm install
npm run dev
```

Open `http://localhost:5173`.

## What changed

- **Google Books 429 fixed:** Google Books is now optional. The app uses Open Library first, which provides real book records and cover images without a Google API quota.
- **Many books:** up to 12 real Open Library results are shown.
- **Song playback:** Deezer is tried first; iTunes/Apple’s public preview endpoint is used as a fallback. Both provide short previews only when the provider has one.
- **Spotify:** the app opens an official Spotify search link. Spotify does not allow full songs to play in an unauthenticated custom app; full playback requires Spotify’s official SDK, a Spotify account, and user authorization.
- **Goodreads:** Goodreads links are provided for every result. Goodreads does not offer a dependable public browser search API, so the app does not scrape Goodreads.

If one public service is rate-limited or unavailable, the app falls back instead of stopping at the Google Books quota error.
