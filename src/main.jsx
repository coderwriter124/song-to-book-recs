import React, { useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const STARTER_BOOKS = [
  ['The Night Circus', 'Erin Morgenstern', 'dreamy · cinematic'],
  ['The Song of Achilles', 'Madeline Miller', 'romantic · aching'],
  ['Daisy Jones & The Six', 'Taylor Jenkins Reid', 'rock · electric'],
  ['Tomorrow, and Tomorrow, and Tomorrow', 'Gabrielle Zevin', 'nostalgic · tender'],
  ['A Psalm for the Wild-Built', 'Becky Chambers', 'cozy · hopeful'],
  ['The Seven Husbands of Evelyn Hugo', 'Taylor Jenkins Reid', 'glamorous · dramatic'],
].map(([title, author, tone]) => makeBook({ title, authors: [author], tone, description: `A ${tone.replace('·', 'and')} read for this song’s feeling.` }));

const COLORS = ['plum', 'wine', 'gold', 'sage', 'blue', 'rose'];
const MOODS = ['dreamy', 'heartbreak', 'cozy', 'rock', 'nostalgic', 'main character'];
const MOOD_WORDS = { dreamy: ['dreamy', 'magic', 'wonder'], heartbreak: ['love', 'loss', 'romance'], cozy: ['cozy', 'friendship', 'hope'], rock: ['music', 'fame', 'band'], nostalgic: ['nostalgia', 'memory', 'friendship'], 'main character': ['glamour', 'ambition', 'identity'] };
const clean = (text) => String(text || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
const encode = (text) => encodeURIComponent(text);
const tokens = (text) => text.toLowerCase().split(/[^a-z]+/).filter(Boolean);

function moodFor(text) {
  const words = tokens(text);
  return Object.entries(MOOD_WORDS).map(([mood, terms]) => [mood, terms.reduce((n, term) => n + (words.some((word) => word.includes(term) || term.includes(word)) ? 1 : 0), 0)]).sort((a, b) => b[1] - a[1])[0][0] || 'dreamy';
}
function makeBook(book, index = 0) {
  const query = `${book.title} ${book.authors?.[0] || ''}`;
  return { ...book, color: COLORS[index % COLORS.length], description: clean(book.description || 'A real book selected for this song’s mood.').slice(0, 220), infoLink: book.infoLink || `https://books.google.com/books?q=${encode(query)}`, googleSearch: `https://www.google.com/search?q=${encode(query)}`, goodreads: `https://www.goodreads.com/search?q=${encode(query)}` };
}
async function json(url) { const response = await fetch(url); if (!response.ok) throw new Error(`${response.status}`); return response.json(); }

async function findSong(query) {
  try {
    const data = await json(`/api/deezer/search?q=${encode(query)}&limit=1`);
    const track = data.data?.[0];
    if (track) return { title: track.title, artist: track.artist.name, album: track.album.title, cover: track.album.cover_medium || track.album.cover, preview: track.preview, fullUrl: track.link, source: 'Deezer' };
  } catch { /* Try iTunes below. */ }
  const data = await json(`/api/itunes/search?term=${encode(query)}&entity=song&limit=1`);
  const track = data.results?.[0];
  if (!track) throw new Error('Song not found');
  return { title: track.trackName, artist: track.artistName, album: track.collectionName, cover: track.artworkUrl100?.replace('100x100', '600x600'), preview: track.previewUrl, fullUrl: track.trackViewUrl, source: 'Apple Music preview' };
}

async function findBooks(song, mood) {
  const search = `${song} ${mood}`;
  try {
    const data = await json(`/api/open-library/search.json?q=${encode(search)}&limit=12&fields=title,author_name,first_publish_year,cover_i,key,subject`);
    const books = (data.docs || []).filter((book) => book.title).slice(0, 12).map((book, index) => makeBook({ title: book.title, authors: book.author_name || ['Unknown author'], tone: `${mood} · Open Library match`, description: `${book.title} by ${(book.author_name || ['an unknown author'])[0]} — published ${book.first_publish_year || 'date unavailable'}.`, thumbnail: book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg` : '', infoLink: `https://openlibrary.org${book.key || ''}` }, index));
    if (books.length) return books;
  } catch { /* Try Google Books, then local books. */ }
  try {
    const data = await json(`/api/google-books/books/v1/volumes?q=${encode(search)}&maxResults=12&orderBy=relevance`);
    const books = (data.items || []).filter((item) => item.volumeInfo?.title).slice(0, 12).map((item, index) => { const info = item.volumeInfo; return makeBook({ title: info.title, authors: info.authors || ['Unknown author'], tone: `${mood} · Google Books match`, description: info.description, thumbnail: info.imageLinks?.thumbnail, infoLink: info.infoLink || `https://books.google.com/books?id=${item.id}` }, index); });
    if (books.length) return books;
  } catch { /* Google Books quota is optional. */ }
  return STARTER_BOOKS;
}

export default function App() {
  const [song, setSong] = useState(''); const [track, setTrack] = useState(null); const [results, setResults] = useState(STARTER_BOOKS); const [searched, setSearched] = useState(''); const [loading, setLoading] = useState(false); const [playing, setPlaying] = useState(false); const [message, setMessage] = useState('');
  const [favorites, setFavorites] = useState(() => JSON.parse(localStorage.getItem('verse-favorites') || '[]')); const audioRef = useRef(null); const saved = useMemo(() => new Set(favorites.map((book) => book.title)), [favorites]);

  async function submit(event) {
    event.preventDefault(); if (!song.trim()) return setMessage('Add a song title or artist first.'); setLoading(true); setPlaying(false); setMessage('Finding the song and twelve real book matches…');
    try { const found = await findSong(song.trim()); const mood = moodFor(`${song} ${found.title} ${found.artist}`); const books = await findBooks(`${found.title} ${found.artist}`, mood); setTrack(found); setResults(books); setSearched(song.trim()); setMessage(`Found ${found.title} by ${found.artist}. ${books.length} books loaded from public book data.`); }
    catch (error) { setTrack(null); setResults(STARTER_BOOKS); setSearched(song.trim()); setMessage(`Song search failed (${error.message}). Try the title and artist, or use a different network.`); } finally { setLoading(false); }
  }
  async function toggleAudio() { if (!audioRef.current) return; try { if (audioRef.current.paused) { await audioRef.current.play(); setPlaying(true); } else { audioRef.current.pause(); setPlaying(false); } } catch { setMessage('Use the audio controls to start the preview.'); } }
  function toggle(book) { const next = saved.has(book.title) ? favorites.filter((item) => item.title !== book.title) : [...favorites, book]; setFavorites(next); localStorage.setItem('verse-favorites', JSON.stringify(next)); }

  return <div className="page"><header><a className="logo" href="/"><span>✦</span> verse</a><div className="header-note">books, by feeling <b>♡ {favorites.length}</b></div></header><main>
    <section className="hero"><p className="kicker">A recommendation ritual ✺</p><h1>What does your<br /><i>song</i> want you to read?</h1><p className="intro">Search a song, play a legal preview, and explore up to twelve real books matched to its mood.</p><form onSubmit={submit}><span className="magnify">⌕</span><input value={song} onChange={(e) => setSong(e.target.value)} placeholder="Song title or artist…" aria-label="Song title or artist" /><button disabled={loading}>{loading ? 'Searching…' : <>Find my books <b>→</b></>}</button></form>{message && <p className="message" role="status">{message}</p>}<div className="moods"><span>try a mood</span>{MOODS.map((mood) => <button key={mood} type="button" onClick={() => setSong(mood)}>{mood}</button>)}</div></section>
    {track && <section className="player"><img src={track.cover} alt={`${track.album} cover`} /><div className="track-info"><small>{track.source}</small><strong>{track.title}</strong><span>{track.artist} · {track.album}</span></div>{track.preview ? <><button className="play-button" type="button" onClick={toggleAudio}>{playing ? 'Ⅱ' : '▶'}</button><audio ref={audioRef} controls preload="metadata" src={track.preview} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} /></> : <span className="no-preview">No preview available</span>}<a href={track.fullUrl} target="_blank" rel="noreferrer">Open full song ↗</a></section>}
    <section className="result-head"><div><p className="kicker">{searched ? `For “${searched}”` : 'A little starting point'}</p><h2>Your next chapters</h2></div>{track ? <a className="listen" href={`https://open.spotify.com/search/${encode(track.title + ' ' + track.artist)}`} target="_blank" rel="noreferrer">open in Spotify ↗</a> : <span className="listen">search a song above</span>}</section>
    <section className="grid">{results.map((book, index) => <article className={`card ${book.color || COLORS[index % COLORS.length]}`} key={`${book.title}-${index}`}><div className="card-head"><span>{String(index + 1).padStart(2, '0')}</span><button className="save" onClick={() => toggle(book)} aria-label={`Save ${book.title}`}>{saved.has(book.title) ? '♥' : '♡'}</button></div>{book.thumbnail ? <img className="cover-image" src={book.thumbnail} alt={`Cover of ${book.title}`} onError={(event) => { event.currentTarget.style.display = 'none'; }} /> : <div className="cover"><span>✦</span><strong>{book.title}</strong><small>{book.authors?.[0]}</small></div>}<p className="tone">{book.tone}</p><h3>{book.title}</h3><p>{book.description}</p><p className="authors">by {book.authors?.join(', ')}</p><div className="book-links"><a className="link-button" href={book.infoLink} target="_blank" rel="noreferrer">Book page ↗</a><a className="link-button" href={book.googleSearch} target="_blank" rel="noreferrer">Google ↗</a><a className="link-button" href={book.goodreads} target="_blank" rel="noreferrer">Goodreads ↗</a><button className="save-text" onClick={() => toggle(book)}>{saved.has(book.title) ? 'Saved ✓' : 'Save ＋'}</button></div></article>)}</section>
    <aside><span className="spark">✦</span><div><strong>Why Google Books is not required</strong><p>Google Books can return HTTP 429 when its anonymous quota is exhausted. Verse now uses Open Library first for many real books and covers, then Google Books as an optional fallback. Goodreads does not provide a safe public browser search API, so the app opens Goodreads search links instead of scraping it.</p></div></aside></main><footer><span>Made for curious readers</span><span>Open Library · Deezer · Apple previews · Spotify links</span></footer></div>;
}
createRoot(document.getElementById('root')).render(<App />);
