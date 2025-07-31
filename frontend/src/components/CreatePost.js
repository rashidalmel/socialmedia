import React, { useState } from 'react';
import api from '../utils/api';
import './CreatePost.css';


const CreatePost = ({ onClose, onPostCreated }) => {
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        tags: '',
        image: '' // Add image field
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await api.post('/api/posts', {
                ...formData,
                image: formData.image || '' // Always send image
            });
            onPostCreated(response.data.post);
            onClose();
        } catch (error) {
            setError(error.response?.data?.message || 'Failed to create post');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="create-post-overlay">
            <div className="create-post-modal">
                <div className="modal-header">
                    <h2>Create New Post</h2>
                    <button className="close-btn" onClick={onClose}>✕</button>
                </div>
                
                <form onSubmit={handleSubmit} className="create-post-form">
                    {error && <div className="error-message">{error}</div>}
                    
                    <div className="form-group">
                        <label htmlFor="title">Title *</label>
                        <input
                            type="text"
                            id="title"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            placeholder="Enter your post title..."
                            required
                            maxLength={100}
                        />
                        <span className="char-count">{formData.title.length}/100</span>
                    </div>

                    <div className="form-group">
                        <label htmlFor="content">Content *</label>
                        <textarea
                            id="content"
                            name="content"
                            value={formData.content}
                            onChange={handleChange}
                            placeholder="Share your thoughts..."
                            required
                            rows={8}
                            maxLength={2000}
                        />
                        <span className="char-count">{formData.content.length}/2000</span>
                    </div>

                    <div className="form-group">
                        <label htmlFor="tags">Tags (optional)</label>
                        <input
                            type="text"
                            id="tags"
                            name="tags"
                            value={formData.tags}
                            onChange={handleChange}
                            placeholder="technology, web development, react (separated by commas)"
                        />
                    </div>

                    <div className="form-actions">
                        <button 
                            type="button" 
                            className="cancel-btn" 
                            onClick={onClose}
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            className="submit-btn" 
                            disabled={loading || !formData.title.trim() || !formData.content.trim()}
                        >
                            {loading ? 'Creating...' : 'Create Post'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreatePost;
