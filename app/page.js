'use client';
import { useEffect, useState } from 'react';
import { supabase, SITE_NAME } from '../lib/supabase';
import PostTile from '../components/PostTile';
import PostCard from '../components/PostCard';

const FILTERS = [
  ['all', 'All'],
  ['update', 'Updates'],
  ['photo', 'Photos'],
  ['video', 'Videos'],
  ['blog', 'Blogs'],
];

function Modal({ post, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={post.title}>
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        <PostCard post={post} />
      </div>
    </div>
  );
}

export default function Home() {
  const [posts, setPosts] = useState([]);
  const [settings, setSettings] = useState({});
  const [filter, setFilter] = useState('all');
  const [state, setState] = useState('loading');
  const [open, setOpen] = useState(null);

  useEffect(() => {
    function load() {
      supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .then(({ data, error }) => {
          if (error) return setState('error');
          setPosts(data);
          setState('ready');
        });
    }
    load();
    supabase.from('settings').select('*').then(({ data }) => {
      const m = {};
      (data || []).forEach((r) => { m[r.key] = r.value; });
      setSettings(m);
    });
    // Reload when someone signs in or out, so members see members-only posts
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => sub.subscription.unsubscribe();
  }, []);

  const shown = filter === 'all' ? posts : posts.filter((p) => p.type === filter);
  const heroStyle = settings.hero_image ? { backgroundImage: `url("${settings.hero_image}")` } : undefined;

  return (
    <>
      <section className="hero" style={heroStyle}>
        <div className="hero-inner">
          <h1>{settings.hero_title || SITE_NAME}</h1>
          <p>{settings.hero_tagline || 'News, photos, videos and stories from our community.'}</p>
        </div>
      </section>

      <div className="wrap wide">
        <nav className="filters" aria-label="Filter posts">
          {FILTERS.map(([key, label]) => (
            <button key={key} className={filter === key ? 'chip on' : 'chip'} onClick={() => setFilter(key)}>
              {label}
            </button>
          ))}
        </nav>

        {state === 'loading' && <p className="note">Loading posts…</p>}
        {state === 'error' && <p className="note">Couldn’t load posts. Check your Supabase settings.</p>}
        {state === 'ready' && shown.length === 0 && (
          <p className="note">Nothing here yet. New posts will appear as soon as the admin publishes them.</p>
        )}
        <div className="grid">
          {shown.map((p) => <PostTile key={p.id} post={p} onOpen={setOpen} />)}
        </div>
      </div>

      {open && <Modal post={open} onClose={() => setOpen(null)} />}
    </>
  );
}
