const express = require('express');
const jwt = require('jsonwebtoken');
const { User, Rider, Customer, Agent } = require('../models');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { phoneNumber, email, password, firstName, lastName, role } = req.body;

    // Validate input
    if (!phoneNumber || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      where: {
        $or: [{ phoneNumber }, { email }]
      }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this phone number or email already exists'
      });
    }

    // Create user
    const user = await User.create({
      phoneNumber,
      email,
      password,
      firstName,
      lastName,
      role: role || 'customer'
    });

    // Create profile based on role
    if (role === 'rider') {
      await Rider.create({ userId: user.id });
    } else if (role === 'customer') {
      await Customer.create({ userId: user.id });
    } else if (role === 'agent') {
      // Agent requires stage assignment, done later
      await Agent.create({ userId: user.id, stageId: null });
    }

    // Generate token
    const token = generateToken(user.id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: user.getPublicProfile(),
        token
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Error registering user',
      error: error.message
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { phoneNumber, password } = req.body;

    if (!phoneNumber || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide phone number and password'
      });
    }

    const user = await User.findOne({ where: { phoneNumber } });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Update last login
    await user.update({ lastLogin: new Date() });

    const token = generateToken(user.id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: user.getPublicProfile(),
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging in',
      error: error.message
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      include: [
        { model: Rider, as: 'riderProfile' },
        { model: Customer, as: 'customerProfile' },
        { model: Agent, as: 'agentProfile' }
      ]
    });

    res.json({
      success: true,
      data: {
        user: user.getPublicProfile(),
        profile: user.riderProfile || user.customerProfile || user.agentProfile
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user data',
      error: error.message
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user (clear device token)
// @access  Private
router.post('/logout', authenticate, async (req, res) => {
  try {
    await req.user.update({ deviceToken: null });

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging out',
      error: error.message
    });
  }
});

module.exports = router;
