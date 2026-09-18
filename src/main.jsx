import React, { useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const COLORS = ['plum', 'wine', 'gold', 'sage', 'blue', 'rose'];
const MOODS = ['dreamy', 'heartbreak', 'cozy', 'rock', 'nostalgic', 'main character'];
const STARTER = [
  ['The Night Circus', 'Erin Morgenstern', 'dreamy · cinematic'],
  ['The Song of Achilles', 'Madeline Miller', 'romantic · aching'],
  ['Daisy Jones & The Six', 'Taylor Jenkins Reid', 'rock · electric'],
  ['Tomorrow, and Tomorrow, and Tomorrow', 'Gabrielle Zevin', 'nostalgic · tender'],
  ['A Psalm for the Wild-Built', 'Becky Chambers', 'cozy · hopeful'],
  ['The Seven Husbands of Evelyn Hugo', 'Taylor Jenkins Reid', 'glamorous · dramatic'],
].map(([title, author, tone], index) => createBook({ title, authors: [author], tone, subjects: [], description: `A ${tone.replace(' · ', ' and ')} read for this song's feeling.` }, index));

const MOOD_TERMS = {
  dreamy: ['dream', 'night', 'moon', 'magic', 'wonder', 'ethereal', 'midnight', 'soft'],
  heartbreak: ['heart', 'sad', 'cry', 'tears', 'loss', 'breakup', 'lonely', 'love', 'ache'],
  cozy: ['cozy', 'calm', 'home', 'warm', 'gentle', 'peace', 'comfort', 'friendship'],
  rock: ['rock', 'band', 'music', 'concert', 'loud', 'electric', 'guitar', 'rebel'],
  nostalgic: ['memory', 'memories', 'old', 'yesterday', 'summer', 'remember', 'past', 'nostalgia'],
  'main character': ['fame', 'glamour', 'power', 'wild', 'run', 'freedom', 'identity', 'star'],
};

const encode = (value) => encodeURIComponent(value);
const words = (value) => String(value || '').toLowerCase().split(/[^a-z]+/).filter(Boolean);
const clean = (value) => String(value || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

function links(title, author = '') {
  const query = encode(`${title} ${author}`);
  return { book: `https://books.google.com/books?q=${query}`, google: `https://www.google.com/search?q=${query}`, goodreads: `https://www.goodreads.com/search?q=${query}` };
}
function inferMoods(text) {
  const songWords = words(text);
  return Object.entries(MOOD_TERMS).map(([mood, terms]) => ({ mood, score: terms.reduce((total, term) => total + (songWords.some((word) => word.includes(term) || term.includes(word)) ? 1 : 0), 0) })).sort((a, b) => b.score - a.score);
}
function createBook(book, index = 0, songContext = '') {
  const author = book.authors?.[0] || 'Unknown author';
  const queryLinks = links(book.title, author);
  const matchedMood = book.mood || 'dreamy';
  return { ...book, authors: book.authors || [author], color: COLORS[index % COLORS.length], description: clean(book.description || `${book.title} fits the ${matchedMood} feeling of this song.`).slice(0, 220), tone: book.tone || `${matchedMood} · local AI match`, links: { ...queryLinks, ...(book.links || {}) }, songContext };
}
function scoreBook(book, moodRanking, songText) {
  const text = words(`${book.title} ${(book.authors || []).join(' ')} ${(book.subjects || []).join(' ')}`);
  const moodScore = moodRanking.reduce((total, item, index) => {
    const terms = MOOD_TERMS[item.mood];
    const hits = terms.filter((term) => text.some((word) => word.includes(term) || term.includes(word))).length;
    return total + hits * Math.max(1, 5 - index);
  }, 0);
  const directScore = words(songText).reduce((total, word) => total + (word.length > 3 && text.some((bookWord) => bookWord.includes(word) || word.includes(bookWord)) ? 3 : 0), 0);
  return moodScore + directScore;
}
function recommendationReason(book, moodRanking, track) {
  const mood = moodRanking[0]?.mood || 'dreamy';
  const subject = book.subjects?.find((item) => item.length > 3);
  return `Chosen by the local mood model for ${track.title}: ${mood}${subject ? `, with a ${subject.toLowerCase()} theme` : ''}.`;
}

async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(String(response.status));
  return response.json();
}
async function findSong(query) {
  try {
    const data = await getJson(`/api/deezer/search?q=${encode(query)}&limit=1`);
    const item = data.data?.[0];
    if (item) return { title: item.title, artist: item.artist.name, album: item.album.title, cover: item.album.cover_medium, preview: item.preview, url: item.link, source: 'Deezer preview' };
  } catch { /* Try Apple below. */ }
  const data = await getJson(`/api/itunes/search?term=${encode(query)}&entity=song&limit=1`);
  const item = data.results?.[0];
  if (!item) throw new Error('song not found');
  return { title: item.trackName, artist: item.artistName, album: item.collectionName, cover: item.artworkUrl100?.replace('100x100', '600x600'), preview: item.previewUrl, url: item.trackViewUrl, source: 'Apple preview' };
}
async function findBooks(track) {
  const context = `${track.title} ${track.artist} ${track.album}`;
  const moodRanking = inferMoods(context);
  const moodQuery = moodRanking.slice(0, 3).map((item) => item.mood).join(' ');
  try {
    const data = await getJson(`/api/open-library/search.json?q=${encode(`${context} ${moodQuery}`)}&limit=50&fields=title,author_name,first_publish_year,cover_i,key,subject`);
    const books = (data.docs || []).filter((item) => item.title).map((item, index) => {
      const author = item.author_name?.[0] || 'Unknown author';
      const book = { title: item.title, authors: item.author_name || [author], subjects: item.subject?.slice(0, 12) || [], description: `${item.title} by ${author}${item.first_publish_year ? `, first published ${item.first_publish_year}` : ''}.`, tone: `${moodRanking[0].mood} · actual song match`, thumbnail: item.cover_i ? `https://covers.openlibrary.org/b/id/${item.cover_i}-M.jpg` : '', links: { book: `https://openlibrary.org${item.key || ''}` } };
      return { ...createBook(book, index, context), score: scoreBook(book, moodRanking, context) };
    }).sort((a, b) => b.score - a.score).slice(0, 12).map((book) => ({ ...book, description: recommendationReason(book, moodRanking, track) }));
    if (books.length) return { books, moodRanking };
  } catch { /* Keep the app usable offline. */ }
  return { books: STARTER.map((book) => ({ ...book, description: recommendationReason(book, moodRanking, track) })), moodRanking };
}

function App() {
  const [song, setSong] = useState('');
  const [searched, setSearched] = useState('');
  const [track, setTrack] = useState(null);
  const [books, setBooks] = useState(STARTER);
  const [mood, setMood] = useState('');
  const [message, setMessage] = useState('Enter a song or artist to begin.');
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [favorites, setFavorites] = useState(() => { try { return JSON.parse(localStorage.getItem('verse-favorites') || '[]'); } catch { return []; } });
  const audio = useRef(null);
  const saved = useMemo(() => new Set(favorites.map((book) => book.title)), [favorites]);

  async function submit(event) {
    event.preventDefault();
    const query = song.trim();
    if (!query) return setMessage('Please enter a song or artist.');
    setLoading(true); setPlaying(false); setMessage('Listening to the track metadata and finding books with the local AI mood model…');
    try {
      const found = await findSong(query);
      const result = await findBooks(found);
      setTrack(found); setBooks(result.books); setMood(result.moodRanking[0]?.mood || 'dreamy'); setSearched(query);
      setMessage(`Now matching books to “${found.title}” by ${found.artist} — ${result.moodRanking[0]?.mood || 'dreamy'} mood.`);
    } catch (error) { setTrack(null); setBooks(STARTER); setMessage(`Song lookup failed (${error.message}). Try a title and artist, such as “drivers license Olivia Rodrigo”.`); }
    finally { setLoading(false); }
  }
  async function play() { if (!audio.current) return; try { if (audio.current.paused) { await audio.current.play(); setPlaying(true); } else { audio.current.pause(); setPlaying(false); } } catch { setMessage('This provider did not supply a playable preview. Use the full-song link.'); } }
  function save(book) { const next = saved.has(book.title) ? favorites.filter((item) => item.title !== book.title) : [...favorites, book]; setFavorites(next); localStorage.setItem('verse-favorites', JSON.stringify(next)); }

  return <div className="page"><header><a className="logo" href="/">✦ verse</a><div className="header-note">books, by feeling · ♡ {favorites.length}</div></header><main>
    <section className="hero"><p className="kicker">A recommendation ritual ✺</p><h1>What does your<br /><i>song</i> want you to read?</h1><p className="intro">Search a real track. Verse uses the track title, artist, album, and book subjects in a local AI-style matcher — no AI API key required.</p><form onSubmit={submit}><span className="magnify">⌕</span><input value={song} onChange={(event) => setSong(event.target.value)} placeholder="Song title or artist…" /><button type="submit" disabled={loading}>{loading ? 'Matching…' : 'Find my books →'}</button></form><p className="message" role="status">{message}</p><div className="moods"><span>try a mood</span>{MOODS.map((item) => <button type="button" key={item} onClick={() => setSong(item)}>{item}</button>)}</div></section>
    {track && <section className="player"><img src={track.cover} alt="Album cover" /><div className="track-info"><small>{track.source}</small><strong>{track.title}</strong><span>{track.artist} · {track.album}</span></div>{track.preview ? <><button className="play-button" type="button" onClick={play}>{playing ? 'Ⅱ' : '▶'}</button><audio ref={audio} controls src={track.preview} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} /></> : <span className="no-preview">No preview available</span>}<a href={track.url} target="_blank" rel="noreferrer">Full song ↗</a></section>}
    <section className="result-head"><div><p className="kicker">{searched ? `For “${searched}”` : 'A little starting point'}</p><h2>Your next chapters</h2>{mood && <p className="match-label">Local AI mood: <strong>{mood}</strong></p>}</div>{track && <a className="listen" href={`https://open.spotify.com/search/${encode(`${track.title} ${track.artist}`)}`} target="_blank" rel="noreferrer">Spotify ↗</a>}</section>
    <section className="grid">{books.map((book, index) => <article className={`card ${book.color || COLORS[index % COLORS.length]}`} key={`${book.title}-${index}`}><div className="card-head"><span>{String(index + 1).padStart(2, '0')}</span><button className="save" type="button" onClick={() => save(book)}>{saved.has(book.title) ? '♥' : '♡'}</button></div>{book.thumbnail ? <img className="cover-image" src={book.thumbnail} alt={`Cover of ${book.title}`} onError={(event) => { event.currentTarget.style.display = 'none'; }} /> : <div className="cover"><span>✦</span><strong>{book.title}</strong><small>{book.authors?.[0]}</small></div>}<p className="tone">{book.tone}</p><h3>{book.title}</h3><p>{book.description}</p><p className="authors">by {book.authors?.join(', ')}</p><div className="book-links"><a href={book.links.book} target="_blank" rel="noreferrer">Book page ↗</a><a href={book.links.google} target="_blank" rel="noreferrer">Google ↗</a><a href={book.links.goodreads} target="_blank" rel="noreferrer">Goodreads ↗</a></div></article>)}</section>
  </main><footer><span>Made for curious readers</span><span>Local AI-style matching · no key required</span></footer></div>;
}
createRoot(document.getElementById('root')).render(<App />);
