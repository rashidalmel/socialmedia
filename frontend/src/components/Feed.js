import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import Header from './Header';
import CreatePost from './CreatePost';
import PostCard from './PostCard';
import './Feed.css';

const Feed = () => {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreatePost, setShowCreatePost] = useState(false);
    const [error, setError] = useState('');
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    useEffect(() => {
        fetchPosts();
    }, []);

    const fetchPosts = async (pageNum = 1, reset = false) => {
        try {
            setLoading(true);
            const response = await api.get(`/api/posts?page=${pageNum}&limit=10`);
            const { posts: newPosts, totalPages } = response.data;
            
            if (reset) {
                setPosts(newPosts);
            } else {
                setPosts(prev => pageNum === 1 ? newPosts : [...prev, ...newPosts]);
            }
            
            setHasMore(pageNum < totalPages);
            setPage(pageNum);
        } catch (error) {
            setError('Failed to load posts');
            console.error('Error fetching posts:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePostCreated = () => {
        // Refetch posts from backend to ensure latest feed
        fetchPosts(1, true);
    }

    const handlePostUpdate = (updatedPost) => {
        setPosts(prev => prev.map(post => 
            post._id === updatedPost._id ? updatedPost : post
        ));
    };

    const loadMore = () => {
        if (!loading && hasMore) {
            fetchPosts(page + 1);
        }
    };

    if (loading && posts.length === 0) {
        return (
            <div className="feed-container">
                <Header onShowCreatePost={() => setShowCreatePost(true)} />
                <div className="feed-content">
                    <div className="loading-container">
                        <div className="loading-spinner"></div>
                        <p>Loading posts...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="feed-container">
            <Header onShowCreatePost={() => setShowCreatePost(true)} />
            
            <div className="feed-content">
                <div className="feed-main">
                    {error && (
                        <div className="error-banner">
                            <p>{error}</p>
                            <button 
                                onClick={() => {
                                    setError('');
                                    fetchPosts(1, true);
                                }}
                                className="retry-btn"
                            >
                                Retry
                            </button>
                        </div>
                    )}

                    {posts.length === 0 && !loading ? (
                        <div className="no-posts">
                            <div className="no-posts-icon">📝</div>
                            <h3>No posts yet</h3>
                            <p>Be the first to share something amazing!</p>
                            <button 
                                className="create-first-post-btn"
                                onClick={() => setShowCreatePost(true)}
                            >
                                Create Your First Post
                            </button>
                        </div>
                    ) : (
                        <div className="posts-container">
                            {posts.map(post => (
                                <PostCard 
                                    key={post._id} 
                                    post={post} 
                                    onPostUpdate={handlePostUpdate}
                                />
                            ))}
                            
                            {hasMore && (
                                <div className="load-more-container">
                                    <button 
                                        onClick={loadMore}
                                        className="load-more-btn"
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <>
                                                <div className="loading-spinner small"></div>
                                                Loading...
                                            </>
                                        ) : (
                                            'Load More Posts'
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="feed-sidebar">
                    <div className="sidebar-card">
                        <h3>Welcome to Blog Media</h3>
                        <p>Share your thoughts, connect with others, and discover amazing content from our community!</p>
                        <div className="sidebar-stats">
                            <div className="stat">
                                <span className="stat-number">{posts.length}</span>
                                <span className="stat-label">Posts</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="sidebar-card">
                        <h3>Quick Actions</h3>
                        <button 
                            className="sidebar-action-btn"
                            onClick={() => setShowCreatePost(true)}
                        >
                            ✏️ Write a Post
                        </button>
                        <button 
                            className="sidebar-action-btn"
                            onClick={() => fetchPosts(1, true)}
                        >
                            🔄 Refresh Feed
                        </button>
                    </div>
                </div>
            </div>

            {showCreatePost && (
                <CreatePost 
                    onClose={() => setShowCreatePost(false)}
                    onPostCreated={handlePostCreated}
                />
            )}
        </div>
    );
};

export default Feed;
