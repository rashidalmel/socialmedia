import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import Header from './Header';
import CreatePost from './CreatePost';
import PostCard from './PostCard';
import { useAuth } from '../contexts/AuthContext';
import './MyPosts.css';


const MyPosts = () => {
    const { user } = useAuth();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreatePost, setShowCreatePost] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchMyPosts();
    }, []);

    const fetchMyPosts = async () => {
        try {
            setLoading(true);
            console.log('Fetching my posts...');
            const response = await api.get('/api/posts/my');
            console.log('Fetched my posts:', response.data.length, 'posts');
            setPosts(response.data);
        } catch (error) {
            setError('Failed to load your posts');
            console.error('Error fetching my posts:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePostCreated = (newPost) => {
        // Immediately add the new post to the top of my posts for instant feedback
        if (newPost) {
            console.log('Adding new post to my posts immediately:', newPost);
            // Transform the post to match the expected structure
            const transformedPost = {
                ...newPost,
                likesCount: newPost.likes?.length || 0,
                commentsCount: newPost.comments?.length || 0,
                likes: newPost.likes || [],
                comments: newPost.comments || []
            };
            setPosts(prev => [transformedPost, ...prev]);
        }
        
        // Also refetch user's posts from backend to ensure latest view
        console.log('Post created, refetching my posts...');
        setTimeout(() => {
            fetchMyPosts();
        }, 1000);
    }

    const handlePostUpdate = (updatedPost) => {
        setPosts(prev => prev.map(post => 
            post._id === updatedPost._id ? updatedPost : post
        ));
    };

    const handlePostDeleted = (deletedPostId) => {
        console.log('Post deleted, removing from my posts:', deletedPostId);
        console.log('Current my posts before deletion:', posts.map(p => p._id));
        
        // Immediately update the state with the filtered posts
        const updatedPosts = posts.filter(post => post._id !== deletedPostId);
        console.log('My posts after deletion:', updatedPosts.map(p => p._id));
        setPosts(updatedPosts);
        
        // Force a refresh of the user's posts after a short delay to ensure UI is in sync
        setTimeout(() => {
            console.log('Refreshing my posts after deletion...');
            fetchMyPosts();
        }, 1000);
    };

    if (loading) {
        return (
            <div className="my-posts-container">
                <Header onShowCreatePost={() => setShowCreatePost(true)} />
                <div className="my-posts-content">
                    <div className="loading-container">
                        <div className="loading-spinner"></div>
                        <p>Loading your posts...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="my-posts-container">
            <Header onShowCreatePost={() => setShowCreatePost(true)} />
            
            <div className="my-posts-content">
                <div className="my-posts-header">
                    <div className="page-title">
                        <h1>My Posts</h1>
                        <p>Manage all your blog posts in one place</p>
                    </div>
                    <div className="posts-stats">
                        <div className="stat-card">
                            <span className="stat-number">{posts.length}</span>
                            <span className="stat-label">Total Posts</span>
                        </div>
                        <div className="stat-card">
                            <span className="stat-number">
                                {posts.reduce((total, post) => total + post.likes.length, 0)}
                            </span>
                            <span className="stat-label">Total Likes</span>
                        </div>
                        <div className="stat-card">
                            <span className="stat-number">
                                {posts.reduce((total, post) => total + (post.comments?.length || 0), 0)}
                            </span>
                            <span className="stat-label">Total Comments</span>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="error-banner">
                        <p>{error}</p>
                        <button 
                            onClick={() => {
                                setError('');
                                fetchMyPosts();
                            }}
                            className="retry-btn"
                        >
                            Retry
                        </button>
                    </div>
                )}

                <div className="my-posts-main">
                    {posts.length === 0 ? (
                        <div className="no-posts">
                            <div className="no-posts-icon">📝</div>
                            <h3>You haven't created any posts yet</h3>
                            <p>Start sharing your thoughts and ideas with the world!</p>
                            <button 
                                className="create-first-post-btn"
                                onClick={() => setShowCreatePost(true)}
                            >
                                Create Your First Post
                            </button>
                        </div>
                    ) : (
                        <div className="posts-grid">
                            {posts.map(post => (
                                <PostCard 
                                    key={post._id} 
                                    post={post} 
                                    onPostUpdate={handlePostUpdate}
                                    onPostDeleted={handlePostDeleted}
                                    showDeleteButton={true}
                                />
                            ))}
                        </div>
                    )}
                </div>

                <div className="floating-action">
                    <button 
                        className="fab"
                        onClick={() => setShowCreatePost(true)}
                        title="Create New Post"
                    >
                        +
                    </button>
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

export default MyPosts;
