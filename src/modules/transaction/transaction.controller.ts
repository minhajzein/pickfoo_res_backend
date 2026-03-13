import { Request, Response, NextFunction } from 'express';
import Transaction from './transaction.model.js';

// @desc    Get all transactions for owner (credit/debit history)
// @route   GET /api/v1/transactions
// @access  Private/Owner
export const getMyTransactions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const transactions = await Transaction.find({ owner: req.user!._id })
      .populate('restaurant', 'name')
      .populate('order', 'status')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get transaction stats for dashboard (total revenue, counts)
// @route   GET /api/v1/transactions/stats
// @access  Private/Owner
export const getTransactionStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await Transaction.aggregate([
      { $match: { owner: req.user!._id, status: 'success', type: 'credit' } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
          totalTransactions: { $sum: 1 },
        },
      },
    ]);

    const result = stats[0] || { totalRevenue: 0, totalTransactions: 0 };

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get wallet summary (credits, debits, balance) for owner
// @route   GET /api/v1/transactions/wallet-summary
// @access  Private/Owner
export const getWalletSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await Transaction.aggregate([
      { $match: { owner: req.user!._id, status: 'success' } },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
        },
      },
    ]);

    let credit = 0;
    let debit = 0;

    for (const row of rows) {
      if (row._id === 'credit') credit = row.total;
      if (row._id === 'debit' || row._id === 'payout') debit += row.total;
    }

    const balance = credit - debit;

    res.status(200).json({
      success: true,
      data: {
        totalCredit: credit,
        totalDebit: debit,
        balance,
      },
    });
  } catch (error) {
    next(error);
  }
};

