import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import './PostCard.css';

const PostCard = ({ post, onPostUpdate, onPostDeleted, showDeleteButton = false }) => {
    const { user } = useAuth();
    const [liked, setLiked] = useState(false);

    useEffect(() => {
        // This hook ensures the liked status is correctly set when the user data is loaded,
        // or when the likes on the post change.
        if (user) {
            // Handle both populated and non-populated like structures
            const isLiked = post.likes.some(like => {
                // If like.user is populated (has _id property), compare _id
                if (like.user?._id) {
                    return like.user._id === user._id || like.user._id === user.id;
                }
                // If like.user is just an ObjectId string, compare directly
                return like.user === user._id || like.user === user.id;
            });
            setLiked(isLiked);
        } else {
            setLiked(false);
        }
    }, [user, post.likes]);
    const [likeCount, setLikeCount] = useState((post.likes || []).length);
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState(post.comments || []);
    const [newComment, setNewComment] = useState('');
    const [commentLoading, setCommentLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const handleLike = async () => {
        try {
            const response = await api.post(`/api/posts/${post._id}/like`);
            
            // Update local state immediately
            setLiked(response.data.isLiked);
            setLikeCount(response.data.likes);
            
            // Update the parent component's post data to prevent reset
            if (onPostUpdate) {
                const updatedPost = {
                    ...post,
                    likes: response.data.isLiked
                        ? [...post.likes, { user: user._id || user.id }]
                        : post.likes.filter(like => {
                            // Handle both populated and non-populated structures
                            if (like.user?._id) {
                                return like.user._id !== user._id && like.user._id !== user.id;
                            }
                            return like.user !== user._id && like.user !== user.id;
                        })
                };
                onPostUpdate(updatedPost);
            }
        } catch (error) {
            console.error('Error liking post:', error);
        }
    };

    const handleAddComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        setCommentLoading(true);
        try {
            const response = await api.post(`/api/posts/${post._id}/comment`, {
                text: newComment
            });
            setComments([...comments, response.data.comment]);
            setNewComment('');
        } catch (error) {
            console.error('Error adding comment:', error);
        } finally {
            setCommentLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
            return;
        }

        setDeleteLoading(true);
        try {
            await api.delete(`/api/posts/${post._id}`);
            if (onPostDeleted) {
                onPostDeleted(post._id);
            }
        } catch (error) {
            console.error('Error deleting post:', error);
            alert('Failed to delete post. Please try again.');
        } finally {
            setDeleteLoading(false);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatTags = (tags) => {
        if (!tags || tags.length === 0) return null;
        return tags.map(tag => `#${tag}`).join(' ');
    };

    return (
        <article className="post-card">
            <div className="post-header">
                <div className="author-info">
                    <img 
                        src={post.author?.avatar || `https://ui-avatars.com/api/?name=${post.author?.username || 'User'}&background=0D8ABC&color=fff`} 
                        alt="Author Avatar" 
                        className="author-avatar"
                    />
                    <div className="author-details">
                        <h3 className="author-name">{post.author?.username}</h3>
                        <span className="post-date">{formatDate(post.createdAt)}</span>
                    </div>
                </div>
                {(showDeleteButton && post.author?._id === user?._id) && (
                    <div className="post-actions-header">
                        <button 
                            className="delete-btn"
                            onClick={handleDelete}
                            disabled={deleteLoading}
                            title="Delete post"
                        >
                            {deleteLoading ? '...' : '🗑️'}
                        </button>
                    </div>
                )}
            </div>

            <div className="post-content">
                <h2 className="post-title">{post.title}</h2>
                <p className="post-text">{post.content}</p>
                
                {post.image && (
                    <div className="post-image-container">
                        <img 
                            src={post.image} 
                            alt="Post content" 
                            className="post-image"
                            onError={(e) => {
                                e.target.style.display = 'none';
                            }}
                        />
                    </div>
                )}

                {post.tags && post.tags.length > 0 && (
                    <div className="post-tags">
                        {post.tags.map((tag, index) => (
                            <span key={index} className="tag">#{tag}</span>
                        ))}
                    </div>
                )}
            </div>

            <div className="post-actions">
                <button 
                    className={`action-btn like-btn ${liked ? 'liked' : ''}`}
                    onClick={handleLike}
                >
                    <span className="action-icon">{liked ? '❤️' : '🤍'}</span>
                    <span className="action-text">{likeCount} {likeCount === 1 ? 'Like' : 'Likes'}</span>
                </button>

                <button 
                    className="action-btn comment-btn"
                    onClick={() => setShowComments(!showComments)}
                >
                    <span className="action-icon">💬</span>
                    <span className="action-text">{comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}</span>
                </button>
            </div>

            {showComments && (
                <div className="comments-section">
                    <form onSubmit={handleAddComment} className="comment-form">
                        <div className="comment-input-container">
                            <img 
                                src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.username || 'User'}&background=0D8ABC&color=fff`} 
                                alt="Your Avatar" 
                                className="comment-avatar"
                            />
                            <input
                                type="text"
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Write a comment..."
                                className="comment-input"
                                maxLength={500}
                            />
                            <button 
                                type="submit" 
                                className="comment-submit"
                                disabled={!newComment.trim() || commentLoading}
                            >
                                {commentLoading ? '...' : 'Post'}
                            </button>
                        </div>
                    </form>

                    <div className="comments-list">
                        {comments.map((comment, index) => (
                            <div key={index} className="comment">
                                <div className="comment-content">
                                    <div className="comment-header">
                                        <span className="comment-author">{comment.user?.username}</span>
                                        <span className="comment-date">{formatDate(comment.createdAt)}</span>
                                    </div>
                                    <p className="comment-text">{comment.text}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </article>
    );
};

export default PostCard;
