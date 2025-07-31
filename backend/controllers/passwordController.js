const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Generate password reset token
const generateResetToken = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            // Don't reveal if email exists or not for security
            return res.json({ 
                message: 'If this email exists, a password reset link has been sent.' 
            });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
        
        // Set reset token and expiration (15 minutes)
        user.passwordResetToken = resetTokenHash;
        user.passwordResetExpires = Date.now() + 15 * 60 * 1000;
        await user.save();

        // In production, send email with reset link
        // const resetUrl = `${req.protocol}://${req.get('host')}/api/auth/reset-password/${resetToken}`;
        // await sendResetEmail(user.email, resetUrl);

        console.log(`Password reset token for ${email}: ${resetToken}`); // Remove in production

        res.json({ 
            message: 'If this email exists, a password reset link has been sent.',
            // Remove in production - only for testing
            resetToken: resetToken
        });

    } catch (error) {
        console.error('Password reset request error:', error);
        res.status(500).json({ 
            message: 'Error processing password reset request' 
        });
    }
};

// Reset password with token
const resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        // Hash the token to compare with stored hash
        const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

        // Find user with valid reset token
        const user = await User.findOne({
            passwordResetToken: resetTokenHash,
            passwordResetExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ 
                message: 'Password reset token is invalid or has expired' 
            });
        }

        // Update password
        user.password = password;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();

        // Generate new JWT token
        const jwtToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
            expiresIn: '24h'
        });

        // Set secure cookie
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000
        };

        res.cookie('token', jwtToken, cookieOptions);

        res.json({
            message: 'Password reset successful',
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                avatar: user.avatar,
                bio: user.bio
            },
            token: jwtToken
        });

    } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({ 
            message: 'Error resetting password' 
        });
    }
};

// Change password (for authenticated users)
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;

        const user = await User.findById(userId).select('+password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Verify current password
        const isCurrentPasswordValid = await user.comparePassword(currentPassword);
        if (!isCurrentPasswordValid) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }

        // Update password
        user.password = newPassword;
        await user.save();

        res.json({ message: 'Password changed successfully' });

    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ 
            message: 'Error changing password' 
        });
    }
};

module.exports = {
    generateResetToken,
    resetPassword,
    changePassword
};
