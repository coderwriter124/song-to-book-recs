# Verse — book recommendations by song

Verse searches a real song, plays an available Deezer preview, and finds real books through Google Books.

## Run in Windows Command Prompt

```cmd
git clone https://github.com/coderwriter124/song-to-book-recs.git
cd song-to-book-recs
npm install
npm run dev
```

Open `http://localhost:5173`.

## Features

- Deezer live track search with album art, artist, album, and preview URL.
- A visible Play button plus native audio controls. Browsers require a click before audio can start; full songs are not available through the public preview endpoint.
- Google Books results with **Google Books**, **Google search**, and Goodreads buttons on every card.
- Real book titles, authors, descriptions, and covers when Google Books supplies them.
- Starter books and working search links when a public service is unavailable.

The app makes public browser requests without an API key. Services may rate-limit requests. Goodreads is linked through search results rather than scraped.
