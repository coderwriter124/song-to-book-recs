import React, { useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const COLORS = ['plum', 'wine', 'gold', 'sage', 'blue', 'rose'];
const MOODS = ['dreamy', 'heartbreak', 'cozy', 'rock', 'nostalgic', 'main character'];
const STARTER_BOOKS = [
  ['The Night Circus', 'Erin Morgenstern', 'dreamy · cinematic'],
  ['The Song of Achilles', 'Madeline Miller', 'romantic · aching'],
  ['Daisy Jones & The Six', 'Taylor Jenkins Reid', 'rock · electric'],
  ['Tomorrow, and Tomorrow, and Tomorrow', 'Gabrielle Zevin', 'nostalgic · tender'],
  ['A Psalm for the Wild-Built', 'Becky Chambers', 'cozy · hopeful'],
  ['The Seven Husbands of Evelyn Hugo', 'Taylor Jenkins Reid', 'glamorous · dramatic'],
].map(([title, author, tone], index) => ({ title, authors: [author], tone, color: COLORS[index], description: `A ${tone.replace(' · ', ' and ')} read for this song's feeling.`, cover: '', links: makeLinks(title, author) }));

function makeLinks(title, author = '') {
  const query = encodeURIComponent(`${title} ${author}`);
  return { book: `https://books.google.com/books?q=${query}`, google: `https://www.google.com/search?q=${query}`, goodreads: `https://www.goodreads.com/search?q=${query}` };
}
function safeSavedBooks() { try { return JSON.parse(localStorage.getItem('verse-favorites') || '[]'); } catch { return []; } }
function clean(value) { return String(value || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim(); }
function moodFor(value) { const text = value.toLowerCase(); if (/heart|sad|cry|drivers license|traitor/.test(text)) return 'heartbreak'; if (/rock|band|concert/.test(text)) return 'rock'; if (/cozy|calm|soft/.test(text)) return 'cozy'; if (/dream|night|magic/.test(text)) return 'dreamy'; return 'nostalgic'; }
async function getJson(url) { const response = await fetch(url); if (!response.ok) throw new Error(String(response.status)); return response.json(); }

async function findSong(query) {
  try {
    const data = await getJson(`/api/deezer/search?q=${encodeURIComponent(query)}&limit=1`);
    const item = data.data?.[0];
    if (item) return { title: item.title, artist: item.artist.name, album: item.album.title, cover: item.album.cover_medium, preview: item.preview, url: item.link, source: 'Deezer preview' };
  } catch {}
  const data = await getJson(`/api/itunes/search?term=${encodeURIComponent(query)}&entity=song&limit=1`);
  const item = data.results?.[0];
  if (!item) throw new Error('song not found');
  return { title: item.trackName, artist: item.artistName, album: item.collectionName, cover: item.artworkUrl100?.replace('100x100', '600x600'), preview: item.previewUrl, url: item.trackViewUrl, source: 'Apple preview' };
}

async function findBooks(song, mood) {
  const query = encodeURIComponent(`${song} ${mood}`);
  try {
    const data = await getJson(`/api/open-library/search.json?q=${query}&limit=12`);
    const books = (data.docs || []).filter((item) => item.title).slice(0, 12).map((item, index) => {
      const author = item.author_name?.[0] || 'Unknown author';
      return { title: item.title, authors: item.author_name || [author], tone: `${mood} · Open Library`, color: COLORS[index % COLORS.length], description: `${item.title} by ${author}${item.first_publish_year ? `, first published ${item.first_publish_year}` : ''}.`, cover: item.cover_i ? `https://covers.openlibrary.org/b/id/${item.cover_i}-M.jpg` : '', links: { book: `https://openlibrary.org${item.key || ''}`, ...makeLinks(item.title, author) } };
    });
    if (books.length) return books;
  } catch {}
  return STARTER_BOOKS;
}

function App() {
  const [song, setSong] = useState('');
  const [searched, setSearched] = useState('');
  const [track, setTrack] = useState(null);
  const [books, setBooks] = useState(STARTER_BOOKS);
  const [message, setMessage] = useState('Enter a song or artist to begin.');
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [favorites, setFavorites] = useState(safeSavedBooks);
  const audio = useRef(null);
  const saved = useMemo(() => new Set(favorites.map((book) => book.title)), [favorites]);

  async function submit(event) {
    event.preventDefault();
    const query = song.trim();
    if (!query) { setMessage('Please enter a song or artist.'); return; }
    setLoading(true); setMessage('Searching for the song and book matches…'); setPlaying(false);
    try {
      const found = await findSong(query);
      const matches = await findBooks(`${found.title} ${found.artist}`, moodFor(`${query} ${found.title}`));
      setTrack(found); setBooks(matches); setSearched(query); setMessage(`Found “${found.title}” by ${found.artist}.`);
    } catch (error) { setMessage(`Could not find that song (${error.message}). Starter books are shown; try “Olivia Rodrigo”.`); setTrack(null); setBooks(STARTER_BOOKS); }
    finally { setLoading(false); }
  }
  async function play() { if (!audio.current) return; try { if (audio.current.paused) { await audio.current.play(); setPlaying(true); } else { audio.current.pause(); setPlaying(false); } } catch { setMessage('This song has no playable preview. Use the full-song link instead.'); } }
  function save(book) { const next = saved.has(book.title) ? favorites.filter((item) => item.title !== book.title) : [...favorites, book]; setFavorites(next); localStorage.setItem('verse-favorites', JSON.stringify(next)); }

  return <div className="page"><header><a className="logo" href="/">✦ verse</a><div className="header-note">books, by feeling · ♡ {favorites.length}</div></header><main>
    <section className="hero"><p className="kicker">A recommendation ritual ✺</p><h1>What does your<br /><i>song</i> want you to read?</h1><p className="intro">Find a song, play its available preview, and discover real books with real covers.</p><form onSubmit={submit}><span className="magnify">⌕</span><input value={song} onChange={(event) => setSong(event.target.value)} placeholder="Song title or artist…" /><button type="submit" disabled={loading}>{loading ? 'Searching…' : 'Find my books →'}</button></form><p className="message" role="status">{message}</p><div className="moods"><span>try a mood</span>{MOODS.map((mood) => <button type="button" key={mood} onClick={() => setSong(mood)}>{mood}</button>)}</div></section>
    {track && <section className="player"><img src={track.cover} alt="Album cover" /><div className="track-info"><small>{track.source}</small><strong>{track.title}</strong><span>{track.artist} · {track.album}</span></div>{track.preview ? <><button className="play-button" type="button" onClick={play}>{playing ? 'Ⅱ' : '▶'}</button><audio ref={audio} controls src={track.preview} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} /></> : <span className="no-preview">No preview available</span>}<a href={track.url} target="_blank" rel="noreferrer">Full song ↗</a></section>}
    <section className="result-head"><div><p className="kicker">{searched ? `For “${searched}”` : 'A little starting point'}</p><h2>Your next chapters</h2></div>{track && <a className="listen" href={`https://open.spotify.com/search/${encodeURIComponent(track.title + ' ' + track.artist)}`} target="_blank" rel="noreferrer">Spotify ↗</a>}</section>
    <section className="grid">{books.map((book, index) => <article className={`card ${book.color || COLORS[index % COLORS.length]}`} key={`${book.title}-${index}`}><div className="card-head"><span>{String(index + 1).padStart(2, '0')}</span><button className="save" type="button" onClick={() => save(book)}>{saved.has(book.title) ? '♥' : '♡'}</button></div>{book.cover ? <img className="cover-image" src={book.cover} alt={`Cover of ${book.title}`} onError={(event) => { event.currentTarget.style.display = 'none'; }} /> : <div className="cover"><span>✦</span><strong>{book.title}</strong><small>{book.authors[0]}</small></div>}<p className="tone">{book.tone}</p><h3>{book.title}</h3><p>{book.description}</p><p className="authors">by {book.authors.join(', ')}</p><div className="book-links"><a href={book.links.book} target="_blank" rel="noreferrer">Book page ↗</a><a href={book.links.google} target="_blank" rel="noreferrer">Google ↗</a><a href={book.links.goodreads} target="_blank" rel="noreferrer">Goodreads ↗</a></div></article>)}</section>
  </main><footer><span>Made for curious readers</span><span>Open Library · Deezer · Apple · Spotify</span></footer></div>;
}

createRoot(document.getElementById('root')).render(<App />);
