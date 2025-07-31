const express = require('express');
const {
    getAllPosts,
    getPost,
    createPost,
    updatePost,
    deletePost,
    likePost,
    addComment,
    getUserPosts
} = require('../controllers/postController');
const auth = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/posts
// @desc    Get all posts
// @access  Public
router.get('/', getAllPosts);

// @route   GET /api/posts/my
// @desc    Get user's posts
// @access  Private
router.get('/my', auth, getUserPosts);

// @route   GET /api/posts/:id
// @desc    Get single post
// @access  Public
router.get('/:id', getPost);

// @route   POST /api/posts
// @desc    Create post
// @access  Private
router.post('/', auth, createPost);

// @route   PUT /api/posts/:id
// @desc    Update post
// @access  Private
router.put('/:id', auth, updatePost);

// @route   DELETE /api/posts/:id
// @desc    Delete post
// @access  Private
router.delete('/:id', auth, deletePost);

// @route   POST /api/posts/:id/like
// @desc    Like/Unlike post
// @access  Private
router.post('/:id/like', auth, likePost);

// @route   POST /api/posts/:id/comment
// @desc    Add comment to post
// @access  Private
router.post('/:id/comment', auth, addComment);

module.exports = router;
