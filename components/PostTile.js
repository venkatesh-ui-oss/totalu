import Link from 'next/link';
import { youtubeId } from '../lib/supabase';

const LABELS = { update: 'Update', photo: 'Photo', video: 'Video', blog: 'Blog' };
const COLORS = { update: '#f2a900', photo: '#8ed1b0', video: '#a9c4ff', blog: '#e4b8ff' };

export default function PostTile({ post }) {
  const yt = post.type === 'video' ? youtubeId(post.media_url || '') : null;
  const date = new Date(post.created_at).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

  let media = null;
  if (post.type === 'photo' && post.media_url) {
    // eslint-disable-next-line @next/next/no-img-element
    media = <img src={post.media_url} alt="" loading="lazy" />;
  } else if (post.type === 'video' && post.media_url) {
    media = (
      <>
        {yt ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`https://img.youtube.com/vi/${yt}/hqdefault.jpg`} alt="" loading="lazy" />
        ) : (
          <video src={`${post.media_url}#t=0.5`} preload="metadata" muted playsInline />
        )}
        <span className="play" aria-hidden="true">▶</span>
      </>
    );
  }

  return (
    <article className="tile">
      <Link href={`/post/${post.id}`} className="tile-hit">
        {media
          ? <span className="tile-media">{media}</span>
          : <span className="tile-bar" style={{ background: COLORS[post.type] }} />}
        <span className="tile-body">
          <span className="post-meta">
            <span className="tag" style={{ background: COLORS[post.type] }}>{LABELS[post.type]}</span>
            {post.visibility === 'members' && <span className="tag tag-members">Members only</span>}
            <time>{date}</time>
          </span>
          <span className="tile-title">{post.title}</span>
          {post.body && <span className="tile-excerpt">{post.body}</span>}
          <span className="tile-more">Read more →</span>
        </span>
      </Link>
    </article>
  );
}
