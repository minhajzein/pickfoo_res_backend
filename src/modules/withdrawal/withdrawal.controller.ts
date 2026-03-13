import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Withdrawal from './withdrawal.model.js';
import BankAccount from '../bankAccount/bankAccount.model.js';
import Restaurant from '../restaurant/restaurant.model.js';
import Transaction from '../transaction/transaction.model.js';

async function getWalletBalance(ownerId: mongoose.Types.ObjectId): Promise<number> {
  const rows = await Transaction.aggregate([
    { $match: { owner: ownerId, status: 'success' } },
    { $group: { _id: '$type', total: { $sum: '$amount' } } },
  ]);
  let credit = 0;
  let debit = 0;
  for (const row of rows) {
    if (row._id === 'credit') credit = row.total;
    if (row._id === 'debit' || row._id === 'payout') debit += row.total;
  }
  return credit - debit;
}

// @desc    List withdrawal requests for the current owner
// @route   GET /api/v1/withdrawals
// @access  Private/Owner
export const getMyWithdrawals = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const withdrawals = await Withdrawal.find({ owner: req.user!._id })
      .populate('restaurant', 'name')
      .populate('bankAccount', 'accountHolderName bankName accountNumber ifscCode')
      .sort({ requestedAt: -1 });

    res.status(200).json({
      success: true,
      count: withdrawals.length,
      data: withdrawals,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a withdrawal request (admin will approve and pay)
// @route   POST /api/v1/withdrawals
// @access  Private/Owner
export const createWithdrawal = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const restaurant = await Restaurant.findOne({ owner: req.user!._id });
    if (!restaurant) {
      return res.status(400).json({
        success: false,
        message: 'Restaurant not found.',
      });
    }

    const { bankAccountId, amount } = req.body as { bankAccountId?: string; amount?: number };

    if (!bankAccountId || !amount || amount < 1) {
      return res.status(400).json({
        success: false,
        message: 'bankAccountId and amount (min 1) are required.',
      });
    }

    const bankAccount = await BankAccount.findById(bankAccountId);
    if (!bankAccount) {
      return res.status(404).json({ success: false, message: 'Bank account not found' });
    }
    if (bankAccount.owner.toString() !== req.user!._id.toString()) {
      return res.status(401).json({ success: false, message: 'Not authorized for this bank account' });
    }

    const balance = await getWalletBalance(req.user!._id);
    if (amount > balance) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance. Available: ${balance}`,
      });
    }

    const withdrawal = await Withdrawal.create({
      owner: req.user!._id,
      restaurant: restaurant._id,
      bankAccount: bankAccount._id,
      amount,
      status: 'pending',
    });

    const populated = await Withdrawal.findById(withdrawal._id)
      .populate('restaurant', 'name')
      .populate('bankAccount', 'accountHolderName bankName accountNumber ifscCode');

    res.status(201).json({
      success: true,
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};
