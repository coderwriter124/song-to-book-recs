import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const BOOKS = [
  { title: 'The Night Circus', author: 'Erin Morgenstern', tags: ['dreamy', 'cinematic', 'mysterious', 'magic'], description: 'A midnight circus, impossible wonders, and a love story that feels like a secret.', tone: 'dreamy · cinematic', color: 'plum' },
  { title: 'The Song of Achilles', author: 'Madeline Miller', tags: ['heartbreak', 'romantic', 'epic', 'sad'], description: 'A tender myth about love, fate, and the kind of ache that stays with you.', tone: 'romantic · aching', color: 'wine' },
  { title: 'Daisy Jones & The Six', author: 'Taylor Jenkins Reid', tags: ['rock', 'music', 'messy', 'electric'], description: 'Backstage secrets, complicated people, and a band that sounds like trouble.', tone: 'rock · electric', color: 'gold' },
  { title: 'A Psalm for the Wild-Built', author: 'Becky Chambers', tags: ['cozy', 'hopeful', 'soft', 'peaceful'], description: 'A gentle journey through tea, friendship, and what it means to live well.', tone: 'cozy · hopeful', color: 'sage' },
  { title: 'Tomorrow, and Tomorrow, and Tomorrow', author: 'Gabrielle Zevin', tags: ['nostalgic', 'tender', 'friendship', 'electric'], description: 'A luminous story about friendship, creativity, and the games we play together.', tone: 'nostalgic · tender', color: 'blue' },
  { title: 'The Seven Husbands of Evelyn Hugo', author: 'Taylor Jenkins Reid', tags: ['glamorous', 'bittersweet', 'dramatic', 'fame'], description: 'Old Hollywood glamour, hidden truths, and a life big enough for a whole soundtrack.', tone: 'glamorous · dramatic', color: 'rose' },
];

const MOODS = ['dreamy', 'heartbreak', 'cozy', 'rock', 'nostalgic', 'main character'];
function tokens(text) { return text.toLowerCase().split(/[^a-z]+/).filter(Boolean); }
function getMatches(song) {
  const words = tokens(song);
  return [...BOOKS].map((book) => ({ ...book, score: book.tags.reduce((total, tag) => total + (words.some((word) => word.includes(tag) || tag.includes(word)) ? 5 : 0), 0) + (words.length % 3) })).sort((a, b) => b.score - a.score).slice(0, 3);
}

export default function App() {
  const [song, setSong] = useState('');
  const [results, setResults] = useState(BOOKS.slice(0, 3));
  const [searched, setSearched] = useState('');
  const [favorites, setFavorites] = useState(() => JSON.parse(localStorage.getItem('verse-favorites') || '[]'));
  const saved = useMemo(() => new Set(favorites.map((book) => book.title)), [favorites]);

  function submit(event) {
    event.preventDefault();
    if (!song.trim()) return;
    setResults(getMatches(song));
    setSearched(song.trim());
  }
  function toggle(book) {
    const next = saved.has(book.title) ? favorites.filter((item) => item.title !== book.title) : [...favorites, book];
    setFavorites(next); localStorage.setItem('verse-favorites', JSON.stringify(next));
  }
  const musicUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searched || song || 'music')}`;

  return <div className="page">
    <header><a className="logo" href="/"><span>✦</span> verse</a><div className="header-note">books, by feeling <b>♡ {favorites.length}</b></div></header>
    <main>
      <section className="hero"><p className="kicker">A recommendation ritual ✺</p><h1>What does your<br /><i>song</i> want you to read?</h1><p className="intro">Tell us what you’re listening to. We’ll follow the feeling and find three books waiting on the other side.</p>
        <form onSubmit={submit}><span className="magnify">⌕</span><input value={song} onChange={(e) => setSong(e.target.value)} placeholder="Song title, artist, or a feeling…" aria-label="Song title, artist, or feeling" /><button>Find my books <b>→</b></button></form>
        <div className="moods"><span>try a mood</span>{MOODS.map((mood) => <button key={mood} type="button" onClick={() => setSong(mood)}>{mood}</button>)}</div>
      </section>
      <section className="result-head"><div><p className="kicker">{searched ? `For “${searched}”` : 'A little starting point'}</p><h2>Your next three chapters</h2></div><a className="listen" href={musicUrl} target="_blank" rel="noreferrer">◉ listen while you read ↗</a></section>
      <section className="grid">{results.map((book, index) => <article className={`card ${book.color}`} key={book.title}><div className="card-head"><span>0{index + 1}</span><button className="save" onClick={() => toggle(book)} aria-label={`Save ${book.title}`}>{saved.has(book.title) ? '♥' : '♡'}</button></div><div className="cover"><span>✦</span><strong>{book.title}</strong><small>{book.author}</small></div><p className="tone">{book.tone}</p><h3>{book.title}</h3><p>{book.description}</p><button className="save-text" onClick={() => toggle(book)}>{saved.has(book.title) ? 'Saved to your shelf ✓' : 'Save to my shelf ＋'}</button></article>)}</section>
      <aside><span className="spark">✦</span><div><strong>How the magic works</strong><p>Verse uses a small local mood-matching model in your browser. No API key, account, or song data leaving your device.</p></div></aside>
    </main>
    <footer><span>Made for curious readers</span><span>Private by default · free forever</span></footer>
  </div>;
}

createRoot(document.getElementById('root')).render(<App />);
