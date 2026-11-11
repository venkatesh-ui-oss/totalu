'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase, youtubeId } from '../../../lib/supabase';
import PostTile from '../../../components/PostTile';

const LABELS = { update: 'Update', photo: 'Photo', video: 'Video', blog: 'Blog' };
const COLORS = { update: '#f2a900', photo: '#8ed1b0', video: '#a9c4ff', blog: '#e4b8ff' };

export default function PostPage() {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [more, setMore] = useState([]);
  const [state, setState] = useState('loading');
  const [url, setUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setUrl(window.location.href);
    function load() {
      supabase.from('posts').select('*').eq('id', id).maybeSingle().then(({ data, error }) => {
        if (error) return setState('error');
        if (!data) return setState('missing');
        setPost(data);
        setState('ready');
        document.title = data.title;
      });
      supabase.from('posts').select('*').neq('id', id)
        .order('created_at', { ascending: false }).limit(3)
        .then(({ data }) => setMore(data || []));
    }
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => sub.subscription.unsubscribe();
  }, [id]);

  if (state === 'loading') return <div className="wrap read"><p className="note">Loading…</p></div>;
  if (state === 'error') return <div className="wrap read"><p className="note">Couldn’t load this post.</p></div>;
  if (state === 'missing') {
    return (
      <div className="wrap read">
        <a href="/" className="back">← All posts</a>
        <h1 className="article-title">Post not found</h1>
        <p className="note">This post may have been removed, or it is for signed-in members only.</p>
        <p><a href="/admin">Sign in</a></p>
      </div>
    );
  }

  const yt = post.type === 'video' ? youtubeId(post.media_url || '') : null;
  const date = new Date(post.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const words = (post.body || '').trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 200));
  const paragraphs = (post.body || '').split(/\n\s*\n/).filter((t) => t.trim());
  const text = encodeURIComponent(`${post.title} ${url}`);

  async function copy() {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  }

  return (
    <>
      <article className="wrap read">
        <a href="/" className="back">← All posts</a>
        <div className="post-meta">
          <span className="tag" style={{ background: COLORS[post.type] }}>{LABELS[post.type]}</span>
          {post.visibility === 'members' && <span className="tag tag-members">Members only</span>}
          <time>{date}</time>
          {post.type === 'blog' && <span>· {minutes} min read</span>}
        </div>
        <h1 className="article-title">{post.title}</h1>

        {post.type === 'photo' && post.media_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="article-media" src={post.media_url} alt={post.title} />
        )}
        {post.type === 'video' && post.media_url && (
          yt ? (
            <div className="video-wrap">
              <iframe src={`https://www.youtube.com/embed/${yt}`} title={post.title} allowFullScreen />
            </div>
          ) : (
            <video className="article-media" src={post.media_url} controls preload="metadata" />
          )
        )}

        <div className="article-body">
          {paragraphs.map((t, i) => <p key={i}>{t}</p>)}
        </div>

        <div className="share">
          <span>Share:</span>
          <a className="btn-ghost" href={`https://wa.me/?text=${text}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
          <a className="btn-ghost" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer">Facebook</a>
          <button className="btn-ghost" onClick={copy}>{copied ? 'Link copied' : 'Copy link'}</button>
        </div>
      </article>

      {more.length > 0 && (
        <section className="wrap wide more">
          <h2 className="section">More from the community</h2>
          <div className="grid">
            {more.map((p) => <PostTile key={p.id} post={p} />)}
          </div>
        </section>
      )}
    </>
  );
}
