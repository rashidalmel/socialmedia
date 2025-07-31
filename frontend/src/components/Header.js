import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Header.css';

const Header = ({ onShowCreatePost }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [showMenu, setShowMenu] = useState(false);

    const handleLogout = () => {
        logout();
        setShowMenu(false);
    };

    const handleCreatePost = () => {
        onShowCreatePost();
        setShowMenu(false);
    };

    return (
        <header className="header">
            <div className="header-container">
                <div className="header-left">
                    <h1 className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
                        Blog Media
                    </h1>
                </div>
                
                <div className="header-right">
                    <button 
                        className="home-btn"
                        onClick={() => navigate('/')}
                        title="Home"
                    >
                        🏠 Home
                    </button>
                    <button 
                        className="create-post-btn"
                        onClick={handleCreatePost}
                    >
                        + Add Post
                    </button>
                    
                    <div className="user-menu">
                        <button 
                            className="user-button"
                            onClick={() => setShowMenu(!showMenu)}
                        >
                            <img 
                                src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.username || 'User'}&background=0D8ABC&color=fff`} 
                                alt="User Avatar" 
                                className="user-avatar"
                            />
                            <span className="username">{user?.username}</span>
                            <span className="dropdown-arrow">▼</span>
                        </button>
                        
                        {showMenu && (
                            <div className="dropdown-menu">
                                <div className="user-info">
                                    <img 
                                        src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.username || 'User'}&background=0D8ABC&color=fff`} 
                                        alt="User Avatar" 
                                        className="user-avatar-large"
                                    />
                                    <div>
                                        <div className="user-name">{user?.username}</div>
                                        <div className="user-email">{user?.email}</div>
                                    </div>
                                </div>
                                <hr />
                                <button className="menu-item" onClick={handleCreatePost}>
                                    📝 Create Post
                                </button>
                                <button className="menu-item" onClick={() => { navigate('/my-posts'); setShowMenu(false); }}>
                                    📋 My Posts
                                </button>
                                <hr />
                                <button className="menu-item logout-btn" onClick={handleLogout}>
                                    🚪 Logout
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
