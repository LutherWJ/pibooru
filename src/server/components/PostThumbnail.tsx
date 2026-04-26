import type { FC } from 'hono/jsx';
import type { Post } from '../db/schema';

interface PostThumbnailProps {
  post: Post;
  active?: boolean;
}

/**
 * PostThumbnail Component
 * Refactored to match Danbooru's thumbnail style.
 */
export const PostThumbnail: FC<PostThumbnailProps> = ({ post, active }) => {
  const thumbUrl = `/data/thumbs/${post.hash.slice(0, 2)}/${post.hash.slice(2, 4)}/${post.hash}.webp`;
  
  return (
    <article class="post-thumbnail" data-post-id={post.id}>
      <a href={`/post/${post.id}`}>
        <img 
          src={thumbUrl} 
          alt={`Post ${post.id}`}
          loading="lazy"
          title={`Rating: ${post.rating.toUpperCase()} | ${post.width}x${post.height}`}
        />
      </a>
    </article>
  );
};
