# Verse — book recommendations by song

Verse searches a song and matches it to real books.

## Run in Windows Command Prompt

```cmd
git clone https://github.com/coderwriter124/song-to-book-recs.git
cd song-to-book-recs
npm install
npm run dev
```

Open the URL shown by Vite, usually `http://localhost:5173`.

## What it uses

- **Deezer public search:** finds the track, artist, album art, and an official 30-second preview URL that plays in the app when available.
- **Google Books:** searches real book metadata, descriptions, thumbnails, and information links using the song, artist, and inferred mood.
- **Goodreads:** each result includes a Goodreads search link. Verse links to Goodreads rather than scraping it, which is more reliable and respectful of the site.

The app uses public browser requests and does not require an API key for normal low-volume use. Public services can still rate-limit requests, so the starter books appear if a service is unavailable. Full-song playback requires opening the official Deezer track page; the embedded preview is limited to the provider's preview length.
