import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const STARTER_BOOKS = [
  { title: 'The Night Circus', authors: ['Erin Morgenstern'], description: 'A midnight circus, impossible wonders, and a love story that feels like a secret.', tone: 'dreamy · cinematic', color: 'plum', infoLink: 'https://books.google.com/' },
  { title: 'The Song of Achilles', authors: ['Madeline Miller'], description: 'A tender myth about love, fate, and the kind of ache that stays with you.', tone: 'romantic · aching', color: 'wine', infoLink: 'https://books.google.com/' },
  { title: 'Daisy Jones & The Six', authors: ['Taylor Jenkins Reid'], description: 'Backstage secrets, complicated people, and a band that sounds like trouble.', tone: 'rock · electric', color: 'gold', infoLink: 'https://books.google.com/' },
];
const COLORS = ['plum', 'wine', 'gold', 'sage', 'blue', 'rose'];
const MOODS = ['dreamy', 'heartbreak', 'cozy', 'rock', 'nostalgic', 'main character'];
const MOOD_WORDS = { dreamy: ['dreamy', 'magic', 'wonder'], heartbreak: ['love', 'loss', 'romance'], cozy: ['cozy', 'friendship', 'hope'], rock: ['music', 'fame', 'band'], nostalgic: ['nostalgia', 'memory', 'friendship'], 'main character': ['glamour', 'ambition', 'identity'] };

const tokens = (text) => text.toLowerCase().split(/[^a-z]+/).filter(Boolean);
function inferMood(text) {
  const words = tokens(text);
  const scores = Object.entries(MOOD_WORDS).map(([mood, terms]) => [mood, terms.reduce((n, term) => n + (words.some((word) => word.includes(term) || term.includes(word)) ? 1 : 0), 0)]);
  return scores.sort((a, b) => b[1] - a[1])[0][0] || 'dreamy';
}

async function searchDeezer(song) {
  const response = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(song)}&limit=1`);
  if (!response.ok) throw new Error('Song search failed');
  const data = await response.json();
  if (!data.data?.length) throw new Error('Song not found');
  const track = data.data[0];
  return { title: track.title, artist: track.artist.name, album: track.album.title, cover: track.album.cover_medium, preview: track.preview, deezerUrl: track.link };
}

async function searchGoogleBooks(song, mood) {
  const query = `${song} ${mood}`;
  const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=10&orderBy=relevance`);
  if (!response.ok) throw new Error('Book search failed');
  const data = await response.json();
  return (data.items || []).filter((item) => item.volumeInfo?.title).slice(0, 3).map((item, index) => {
    const info = item.volumeInfo;
    const title = info.title;
    const authors = info.authors || ['Unknown author'];
    return { title, authors, description: (info.description || `A ${mood} read selected from Google Books for this song.`).replace(/<[^>]*>/g, '').slice(0, 190), tone: `${mood} · song match`, color: COLORS[index], infoLink: info.infoLink || `https://books.google.com/books?id=${item.id}`, goodreads: `https://www.goodreads.com/search?q=${encodeURIComponent(`${title} ${authors[0]}`)}`, thumbnail: info.imageLinks?.thumbnail };
  });
}

export default function App() {
  const [song, setSong] = useState('');
  const [track, setTrack] = useState(null);
  const [results, setResults] = useState(STARTER_BOOKS);
  const [searched, setSearched] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [favorites, setFavorites] = useState(() => JSON.parse(localStorage.getItem('verse-favorites') || '[]'));
  const saved = useMemo(() => new Set(favorites.map((book) => book.title)), [favorites]);

  async function submit(event) {
    event.preventDefault();
    if (!song.trim()) return setMessage('Add a song title or artist first.');
    setLoading(true); setMessage('Finding the song, then matching its feeling to real books…');
    try {
      const foundTrack = await searchDeezer(song.trim());
      const mood = inferMood(`${song} ${foundTrack.title} ${foundTrack.artist}`);
      const books = await searchGoogleBooks(`${foundTrack.title} ${foundTrack.artist}`, mood);
      setTrack(foundTrack); setResults(books.length ? books : STARTER_BOOKS); setSearched(song.trim());
      setMessage(`Matched “${foundTrack.title}” by ${foundTrack.artist} with ${mood} books from Google Books.`);
    } catch {
      setTrack(null); setResults(STARTER_BOOKS); setSearched(song.trim());
      setMessage('I could not reach the public music/book services. Showing starter matches instead.');
    } finally { setLoading(false); }
  }
  function toggle(book) {
    const next = saved.has(book.title) ? favorites.filter((item) => item.title !== book.title) : [...favorites, book];
    setFavorites(next); localStorage.setItem('verse-favorites', JSON.stringify(next));
  }

  return <div className="page">
    <header><a className="logo" href="/"><span>✦</span> verse</a><div className="header-note">books, by feeling <b>♡ {favorites.length}</b></div></header>
    <main>
      <section className="hero"><p className="kicker">A recommendation ritual ✺</p><h1>What does your<br /><i>song</i> want you to read?</h1><p className="intro">Tell us what you’re listening to. We’ll find the real song, play a preview, and match its feeling to books from Google Books.</p>
        <form onSubmit={submit}><span className="magnify">⌕</span><input value={song} onChange={(e) => setSong(e.target.value)} placeholder="Song title, artist, or a feeling…" aria-label="Song title, artist, or feeling" /><button disabled={loading}>{loading ? 'Matching…' : <>Find my books <b>→</b></>}</button></form>
        {message && <p className="message" role="status">{message}</p>}
        <div className="moods"><span>try a mood</span>{MOODS.map((mood) => <button key={mood} type="button" onClick={() => setSong(mood)}>{mood}</button>)}</div>
      </section>
      {track && <section className="player"><img src={track.cover} alt="" /><div><small>now found</small><strong>{track.title}</strong><span>{track.artist} · {track.album}</span></div>{track.preview ? <audio controls src={track.preview}>Your browser does not support audio.</audio> : <a href={track.deezerUrl} target="_blank" rel="noreferrer">Open song ↗</a>}</section>}
      <section className="result-head"><div><p className="kicker">{searched ? `For “${searched}”` : 'A little starting point'}</p><h2>Your next three chapters</h2></div>{track ? <a className="listen" href={track.deezerUrl} target="_blank" rel="noreferrer">open full song ↗</a> : <span className="listen">preview a song above</span>}</section>
      <section className="grid">{results.map((book, index) => <article className={`card ${book.color || COLORS[index]}`} key={`${book.title}-${index}`}><div className="card-head"><span>0{index + 1}</span><button className="save" onClick={() => toggle(book)} aria-label={`Save ${book.title}`}>{saved.has(book.title) ? '♥' : '♡'}</button></div>{book.thumbnail ? <img className="cover-image" src={book.thumbnail} alt="" /> : <div className="cover"><span>✦</span><strong>{book.title}</strong><small>{book.authors?.[0]}</small></div>}<p className="tone">{book.tone}</p><h3>{book.title}</h3><p>{book.description}</p><div className="book-links"><a href={book.infoLink} target="_blank" rel="noreferrer">Google Books ↗</a>{book.goodreads && <a href={book.goodreads} target="_blank" rel="noreferrer">Goodreads ↗</a>}<button className="save-text" onClick={() => toggle(book)}>{saved.has(book.title) ? 'Saved ✓' : 'Save ＋'}</button></div></article>)}</section>
      <aside><span className="spark">✦</span><div><strong>How the magic works</strong><p>Verse searches Deezer for the real song and a legal 30-second preview, then searches Google Books using the song, artist, and inferred mood. Goodreads links open Goodreads search results rather than scraping the site.</p></div></aside>
    </main>
    <footer><span>Made for curious readers</span><span>Deezer previews · Google Books · Goodreads links</span></footer>
  </div>;
}

createRoot(document.getElementById('root')).render(<App />);
