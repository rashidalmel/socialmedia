const Post = require('../models/Post');
const User = require('../models/User');

// Get all posts
const getAllPosts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Only populate author for the feed, not comments.user
        const posts = await Post.find()
            .populate('author', 'username avatar')
            .select('title content author image tags likes comments createdAt updatedAt')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        // Add isLiked for each post based on current user
        const userId = req.user ? req.user.id || req.user._id : null;
        const postsWithCounts = posts.map(post => {
            let isLiked = false;
            if (userId) {
                isLiked = post.likes.some(like => {
                    if (like.user?._id) {
                        return like.user._id.toString() === userId.toString();
                    }
                    return like.user.toString() === userId.toString();
                });
            }
            // Only send last 2 comments for feed, and only user id (not full user object)
            const recentComments = (post.comments || []).slice(-2).map(comment => ({
                _id: comment._id,
                user: comment.user,
                text: comment.text,
                createdAt: comment.createdAt
            }));
            return {
                _id: post._id,
                title: post.title,
                content: post.content,
                author: post.author,
                image: post.image,
                tags: post.tags,
                createdAt: post.createdAt,
                updatedAt: post.updatedAt,
                likesCount: post.likes?.length || 0,
                commentsCount: post.comments?.length || 0,
                isLiked,
                comments: recentComments
            };
        });

        const total = await Post.countDocuments();

        res.json({
            posts: postsWithCounts,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            total
        });
    } catch (error) {
        res.status(500).json({ 
            message: 'Server error', 
            error: error.message 
        });
    }
};

// Get single post
const getPost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id)
            .populate('author', 'username avatar')
            .populate('comments.user', 'username avatar');

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        res.json(post);
    } catch (error) {
        res.status(500).json({ 
            message: 'Server error', 
            error: error.message 
        });
    }
};

// Create post
const createPost = async (req, res) => {
    try {
        const { title, content, image, tags } = req.body;

        const post = new Post({
            title,
            content,
            image,
            author: req.user.id,
            tags: tags ? tags.split(',').map(tag => tag.trim()) : []
        });

        await post.save();
        await post.populate('author', 'username avatar');

        res.status(201).json({
            message: 'Post created successfully',
            post
        });
    } catch (error) {
        res.status(500).json({ 
            message: 'Server error', 
            error: error.message 
        });
    }
};

// Update post
const updatePost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        // Check if user is the author
        if (post.author.toString() !== req.user.id.toString()) {
            return res.status(403).json({ message: 'Not authorized to update this post' });
        }

        const { title, content, image, tags } = req.body;

        post.title = title || post.title;
        post.content = content || post.content;
        post.image = image || post.image;
        post.tags = tags ? tags.split(',').map(tag => tag.trim()) : post.tags;

        await post.save();
        await post.populate('author', 'username avatar');

        res.json({
            message: 'Post updated successfully',
            post
        });
    } catch (error) {
        res.status(500).json({ 
            message: 'Server error', 
            error: error.message 
        });
    }
};

// Delete post
const deletePost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        // Check if user is the author
        if (post.author.toString() !== req.user.id.toString()) {
            return res.status(403).json({ message: 'Not authorized to delete this post' });
        }

        await Post.findByIdAndDelete(req.params.id);

        res.json({ message: 'Post deleted successfully' });
    } catch (error) {
        res.status(500).json({ 
            message: 'Server error', 
            error: error.message 
        });
    }
};

// Like/Unlike post
const likePost = async (req, res) => {
    try {
        const postId = req.params.id;
        const userId = req.user.id;

        // Use atomic update and return the updated document
        let updatedPost = await Post.findOneAndUpdate(
            { _id: postId, 'likes.user': userId },
            { $pull: { likes: { user: userId } } },
            { new: true }
        ).select('likes');

        let isLiked;
        // If updatedPost is null, user hasn't liked yet, so like it
        if (!updatedPost) {
            updatedPost = await Post.findByIdAndUpdate(
                postId,
                { $push: { likes: { user: userId } } },
                { new: true }
            ).select('likes');
            isLiked = true;
        } else {
            isLiked = false;
        }

        res.json({
            message: isLiked ? 'Post liked' : 'Post unliked',
            likes: updatedPost.likes.length,
            isLiked,
            postId
        });
    } catch (error) {
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
};

// Add comment
const addComment = async (req, res) => {
    try {
        const { text } = req.body;
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        const newComment = {
            user: req.user.id,
            text
        };

        post.comments.push(newComment);
        await post.save();
        await post.populate('comments.user', 'username avatar');

        res.status(201).json({
            message: 'Comment added successfully',
            comment: post.comments[post.comments.length - 1]
        });
    } catch (error) {
        res.status(500).json({ 
            message: 'Server error', 
            error: error.message 
        });
    }
};

// Get user's posts
const getUserPosts = async (req, res) => {
    try {
        const posts = await Post.find({ author: req.user.id })
            .populate('author', 'username avatar')
            .select('title content author image tags likes comments createdAt updatedAt')
            .sort({ createdAt: -1 });

        // Transform posts to maintain frontend compatibility
        const postsWithCounts = posts.map(post => ({
            _id: post._id,
            title: post.title,
            content: post.content,
            author: post.author,
            image: post.image,
            tags: post.tags,
            createdAt: post.createdAt,
            updatedAt: post.updatedAt,
            // Keep likes structure for frontend compatibility
            likes: post.likes || [],
            comments: post.comments || [],
            likesCount: post.likes?.length || 0,
            commentsCount: post.comments?.length || 0
        }));

        res.json(postsWithCounts);
    } catch (error) {
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
};

module.exports = {
    getAllPosts,
    getPost,
    createPost,
    updatePost,
    deletePost,
    likePost,
    addComment,
    getUserPosts
};
