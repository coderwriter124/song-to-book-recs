import React, { useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const STARTER_BOOKS = [
  { title: 'The Night Circus', authors: ['Erin Morgenstern'], description: 'A midnight circus, impossible wonders, and a love story that feels like a secret.', tone: 'dreamy · cinematic', color: 'plum', infoLink: 'https://books.google.com/books?q=The+Night+Circus+Erin+Morgenstern', googleSearch: 'https://www.google.com/search?q=The+Night+Circus+Erin+Morgenstern', goodreads: 'https://www.goodreads.com/search?q=The+Night+Circus+Erin+Morgenstern' },
  { title: 'The Song of Achilles', authors: ['Madeline Miller'], description: 'A tender myth about love, fate, and the kind of ache that stays with you.', tone: 'romantic · aching', color: 'wine', infoLink: 'https://books.google.com/books?q=The+Song+of+Achilles+Madeline+Miller', googleSearch: 'https://www.google.com/search?q=The+Song+of+Achilles+Madeline+Miller', goodreads: 'https://www.goodreads.com/search?q=The+Song+of+Achilles+Madeline+Miller' },
  { title: 'Daisy Jones & The Six', authors: ['Taylor Jenkins Reid'], description: 'Backstage secrets, complicated people, and a band that sounds like trouble.', tone: 'rock · electric', color: 'gold', infoLink: 'https://books.google.com/books?q=Daisy+Jones+and+The+Six', googleSearch: 'https://www.google.com/search?q=Daisy+Jones+and+The+Six', goodreads: 'https://www.goodreads.com/search?q=Daisy+Jones+and+The+Six' },
];

const COLORS = ['plum', 'wine', 'gold', 'sage', 'blue', 'rose'];
const MOODS = ['dreamy', 'heartbreak', 'cozy', 'rock', 'nostalgic', 'main character'];
const MOOD_WORDS = {
  dreamy: ['dreamy', 'magic', 'wonder'],
  heartbreak: ['love', 'loss', 'romance'],
  cozy: ['cozy', 'friendship', 'hope'],
  rock: ['music', 'fame', 'band'],
  nostalgic: ['nostalgia', 'memory', 'friendship'],
  'main character': ['glamour', 'ambition', 'identity'],
};

const tokens = (text) => text.toLowerCase().split(/[^a-z]+/).filter(Boolean);

function inferMood(text) {
  const words = tokens(text);
  return Object.entries(MOOD_WORDS)
    .map(([mood, terms]) => [mood, terms.reduce((n, term) => n + (words.some((word) => word.includes(term) || term.includes(word)) ? 1 : 0), 0)])
    .sort((a, b) => b[1] - a[1])[0][0] || 'dreamy';
}

async function requestJson(url) {
  const response = await fetch(url, { credentials: 'omit' });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Request failed (${response.status}): ${text.slice(0, 160)}`);
  }
  return response.json();
}

async function searchDeezer(song) {
  const url = `/api/deezer/search?q=${encodeURIComponent(song)}&limit=1`;
  const data = await requestJson(url);
  if (!data.data?.length) throw new Error('Song not found');
  const track = data.data[0];
  return {
    id: track.id,
    title: track.title,
    artist: track.artist.name,
    album: track.album.title,
    cover: track.album.cover_medium || track.album.cover,
    preview: track.preview,
    deezerUrl: track.link,
  };
}

async function searchGoogleBooks(song, mood) {
  const query = `${song} ${mood}`;
  const url = `/api/google-books/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=10&orderBy=relevance`;
  const data = await requestJson(url);
  return (data.items || []).filter((item) => item.volumeInfo?.title).slice(0, 3).map((item, index) => {
    const info = item.volumeInfo;
    const title = info.title;
    const authors = info.authors || ['Unknown author'];
    const search = encodeURIComponent(`${title} ${authors[0]}`);
    return {
      title,
      authors,
      description: (info.description || `A ${mood} read selected from Google Books for this song.`).replace(/<[^>]*>/g, '').slice(0, 190),
      tone: `${mood} · Google Books match`,
      color: COLORS[index],
      infoLink: info.infoLink || `https://books.google.com/books?id=${item.id}`,
      googleSearch: `https://www.google.com/search?q=${search}`,
      goodreads: `https://www.goodreads.com/search?q=${search}`,
      thumbnail: info.imageLinks?.thumbnail,
    };
  });
}

export default function App() {
  const [song, setSong] = useState('');
  const [track, setTrack] = useState(null);
  const [results, setResults] = useState(STARTER_BOOKS);
  const [searched, setSearched] = useState('');
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [message, setMessage] = useState('');
  const [favorites, setFavorites] = useState(() => JSON.parse(localStorage.getItem('verse-favorites') || '[]'));
  const audioRef = useRef(null);
  const saved = useMemo(() => new Set(favorites.map((book) => book.title)), [favorites]);

  async function submit(event) {
    event.preventDefault();
    if (!song.trim()) return setMessage('Add a song title or artist first.');

    setLoading(true);
    setMessage('Finding the song and matching real books…');
    setPlaying(false);

    try {
      const foundTrack = await searchDeezer(song.trim());
      const mood = inferMood(`${song} ${foundTrack.title} ${foundTrack.artist}`);
      const books = await searchGoogleBooks(`${foundTrack.title} ${foundTrack.artist}`, mood);

      setTrack(foundTrack);
      setResults(books.length ? books : STARTER_BOOKS);
      setSearched(song.trim());
      setMessage(`Found “${foundTrack.title}” by ${foundTrack.artist}. Results are matched from Google Books.`);
    } catch (error) {
      setTrack(null);
      setResults(STARTER_BOOKS);
      setSearched(song.trim());
      setMessage(`Could not reach Deezer or Google Books (${error.message}). Starter books and working search links are shown.`);
    } finally {
      setLoading(false);
    }
  }

  async function toggleAudio() {
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      try {
        await audioRef.current.play();
        setPlaying(true);
      } catch {
        setMessage('Click the audio controls to start playback. Your browser requires a user interaction.');
      }
    } else {
      audioRef.current.pause();
      setPlaying(false);
    }
  }

  function toggle(book) {
    const next = saved.has(book.title)
      ? favorites.filter((item) => item.title !== book.title)
      : [...favorites, book];

    setFavorites(next);
    localStorage.setItem('verse-favorites', JSON.stringify(next));
  }

  return (
    <div className="page">
      <header>
        <a className="logo" href="/"><span>✦</span> verse</a>
        <div className="header-note">books, by feeling <b>♡ {favorites.length}</b></div>
      </header>

      <main>
        <section className="hero">
          <p className="kicker">A recommendation ritual ✺</p>
          <h1>What does your<br /><i>song</i> want you to read?</h1>
          <p className="intro">Tell us what you’re listening to. We’ll find the real song, play a preview, and match its feeling to real books.</p>

          <form onSubmit={submit}>
            <span className="magnify">⌕</span>
            <input value={song} onChange={(e) => setSong(e.target.value)} placeholder="Song title, artist, or a feeling…" aria-label="Song title, artist, or feeling" />
            <button disabled={loading}>{loading ? 'Matching…' : <>Find my books <b>→</b></>}</button>
          </form>

          {message && <p className="message" role="status">{message}</p>}

          <div className="moods">
            <span>try a mood</span>
            {MOODS.map((mood) => (
              <button key={mood} type="button" onClick={() => setSong(mood)}>{mood}</button>
            ))}
          </div>
        </section>

        {track && (
          <section className="player">
            <img src={track.cover} alt={`${track.album} cover`} />
            <div className="track-info">
              <small>song found</small>
              <strong>{track.title}</strong>
              <span>{track.artist} · {track.album}</span>
            </div>

            {track.preview ? (
              <>
                <button className="play-button" type="button" onClick={toggleAudio}>{playing ? 'Ⅱ' : '▶'}</button>
                <audio ref={audioRef} controls preload="none" src={track.preview} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} />
              </>
            ) : (
              <span className="no-preview">No preview available</span>
            )}

            <a href={track.deezerUrl} target="_blank" rel="noreferrer">Full song ↗</a>
          </section>
        )}

        <section className="result-head">
          <div>
            <p className="kicker">{searched ? `For “${searched}”` : 'A little starting point'}</p>
            <h2>Your next three chapters</h2>
          </div>
          {track ? <a className="listen" href={track.deezerUrl} target="_blank" rel="noreferrer">open full song ↗</a> : <span className="listen">search a song above</span>}
        </section>

        <section className="grid">
          {results.map((book, index) => (
            <article className={`card ${book.color || COLORS[index]}`} key={`${book.title}-${index}`}>
              <div className="card-head">
                <span>0{index + 1}</span>
                <button className="save" onClick={() => toggle(book)} aria-label={`Save ${book.title}`}>{saved.has(book.title) ? '♥' : '♡'}</button>
              </div>

              {book.thumbnail ? (
                <img className="cover-image" src={book.thumbnail} alt={`Cover of ${book.title}`} />
              ) : (
                <div className="cover">
                  <span>✦</span>
                  <strong>{book.title}</strong>
                  <small>{book.authors?.[0]}</small>
                </div>
              )}

              <p className="tone">{book.tone}</p>
              <h3>{book.title}</h3>
              <p>{book.description}</p>

              <div className="book-links">
                <a className="link-button" href={book.infoLink} target="_blank" rel="noreferrer">Google Books ↗</a>
                <a className="link-button" href={book.googleSearch || book.infoLink} target="_blank" rel="noreferrer">Google search ↗</a>
                <a className="link-button" href={book.goodreads} target="_blank" rel="noreferrer">Goodreads ↗</a>
                <button className="save-text" onClick={() => toggle(book)}>{saved.has(book.title) ? 'Saved ✓' : 'Save ＋'}</button>
              </div>
            </article>
          ))}
        </section>

        <aside>
          <span className="spark">✦</span>
          <div>
            <strong>How the magic works</strong>
            <p>Verse searches Deezer for a legal preview, then Google Books for real titles, descriptions, covers, and links. Goodreads links open Goodreads search results instead of scraping the site.</p>
          </div>
        </aside>
      </main>

      <footer>
        <span>Made for curious readers</span>
        <span>Deezer previews · Google Books · Goodreads links</span>
      </footer>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
