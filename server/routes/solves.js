import express from 'express';
import { body, param, validationResult } from 'express-validator';
import SolveHistory from '../models/SolveHistory.js';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Validation middleware for creating a solve
const validateSolve = [
  body('initialCubeState')
    .notEmpty().withMessage('Initial cube state is required')
    .custom((state) => {
      const faces = ['U', 'D', 'F', 'B', 'L', 'R'];
      const isValid = faces.every(face => 
        Array.isArray(state[face]) && state[face].length === 9
      );
      if (!isValid) {
        throw new Error('Invalid cube state format');
      }
      return true;
    }),
  body('solution')
    .isArray().withMessage('Solution must be an array'),
  body('moveCount')
    .isInt({ min: 0 }).withMessage('Move count must be a non-negative integer')
];

/**
 * @route   POST /api/solves
 * @desc    Save a new solve to history
 * @access  Private
 */
router.post('/', authenticate, validateSolve, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
        errors: errors.array()
      });
    }

    const { initialCubeState, solution, moveCount, solveTime, completed } = req.body;

    // Create new solve record
    const solve = new SolveHistory({
      userId: req.user.id,
      initialCubeState,
      solution,
      moveCount,
      solveTime: solveTime || null,
      completed: completed || false,
      completedAt: completed ? new Date() : null
    });

    await solve.save();

    // Update user's solve count if completed
    if (completed) {
      await User.findByIdAndUpdate(req.user.id, {
        $inc: { solveCount: 1 }
      });
    }

    res.status(201).json({
      success: true,
      message: 'Solve saved successfully',
      data: {
        id: solve._id,
        moveCount: solve.moveCount,
        completed: solve.completed,
        createdAt: solve.createdAt
      }
    });
  } catch (error) {
    console.error('Save solve error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save solve'
    });
  }
});

/**
 * @route   GET /api/solves
 * @desc    Get user's solve history
 * @access  Private
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [solves, total] = await Promise.all([
      SolveHistory.find({ userId: req.user.id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('moveCount solveTime completed createdAt completedAt'),
      SolveHistory.countDocuments({ userId: req.user.id })
    ]);

    res.json({
      success: true,
      data: {
        solves,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          hasMore: skip + solves.length < total
        }
      }
    });
  } catch (error) {
    console.error('Get solves error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve solve history'
    });
  }
});

/**
 * @route   GET /api/solves/stats
 * @desc    Get user's solving statistics
 * @access  Private
 */
router.get('/stats', authenticate, async (req, res) => {
  try {
    const stats = await SolveHistory.getUserStats(req.user.id);
    
    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentActivity = await SolveHistory.aggregate([
      { 
        $match: { 
          userId: req.user.id,
          completed: true,
          createdAt: { $gte: sevenDaysAgo }
        } 
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
          avgMoves: { $avg: '$moveCount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      data: {
        ...stats,
        recentActivity
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve statistics'
    });
  }
});

/**
 * @route   GET /api/solves/:id
 * @desc    Get a specific solve by ID
 * @access  Private
 */
router.get('/:id', authenticate, [
  param('id').isMongoId().withMessage('Invalid solve ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg
      });
    }

    const solve = await SolveHistory.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!solve) {
      return res.status(404).json({
        success: false,
        message: 'Solve not found'
      });
    }

    res.json({
      success: true,
      data: solve
    });
  } catch (error) {
    console.error('Get solve error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve solve'
    });
  }
});

/**
 * @route   PATCH /api/solves/:id/complete
 * @desc    Mark a solve as completed
 * @access  Private
 */
router.patch('/:id/complete', authenticate, [
  param('id').isMongoId().withMessage('Invalid solve ID'),
  body('solveTime').optional().isInt({ min: 0 }).withMessage('Solve time must be a non-negative integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg
      });
    }

    const solve = await SolveHistory.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!solve) {
      return res.status(404).json({
        success: false,
        message: 'Solve not found'
      });
    }

    if (solve.completed) {
      return res.status(400).json({
        success: false,
        message: 'Solve is already completed'
      });
    }

    await solve.markCompleted(req.body.solveTime);

    // Update user's solve count
    await User.findByIdAndUpdate(req.user.id, {
      $inc: { solveCount: 1 }
    });

    res.json({
      success: true,
      message: 'Solve marked as completed',
      data: {
        id: solve._id,
        completed: solve.completed,
        completedAt: solve.completedAt,
        solveTime: solve.solveTime
      }
    });
  } catch (error) {
    console.error('Complete solve error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete solve'
    });
  }
});

/**
 * @route   DELETE /api/solves/:id
 * @desc    Delete a solve from history
 * @access  Private
 */
router.delete('/:id', authenticate, [
  param('id').isMongoId().withMessage('Invalid solve ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg
      });
    }

    const solve = await SolveHistory.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!solve) {
      return res.status(404).json({
        success: false,
        message: 'Solve not found'
      });
    }

    // Decrement solve count if it was completed
    if (solve.completed) {
      await User.findByIdAndUpdate(req.user.id, {
        $inc: { solveCount: -1 }
      });
    }

    res.json({
      success: true,
      message: 'Solve deleted successfully'
    });
  } catch (error) {
    console.error('Delete solve error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete solve'
    });
  }
});

export default router;
