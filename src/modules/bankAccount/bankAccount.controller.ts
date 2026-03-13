import { Request, Response, NextFunction } from 'express';
import BankAccount from './bankAccount.model.js';
import Restaurant from '../restaurant/restaurant.model.js';

// @desc    List bank accounts for the current owner (their restaurant)
// @route   GET /api/v1/bank-accounts
// @access  Private/Owner
export const getMyBankAccounts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const restaurant = await Restaurant.findOne({ owner: req.user!._id });
    if (!restaurant) {
      return res.status(200).json({ success: true, data: [], count: 0 });
    }

    const accounts = await BankAccount.find({ owner: req.user!._id })
      .populate('restaurant', 'name')
      .sort({ isPrimary: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: accounts.length,
      data: accounts,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add a bank account
// @route   POST /api/v1/bank-accounts
// @access  Private/Owner
export const createBankAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const restaurant = await Restaurant.findOne({ owner: req.user!._id });
    if (!restaurant) {
      return res.status(400).json({
        success: false,
        message: 'Create a restaurant first before adding bank accounts.',
      });
    }

    const { accountHolderName, bankName, accountNumber, ifscCode, upiId, isPrimary } = req.body;

    if (!accountHolderName || !bankName || !accountNumber || !ifscCode) {
      return res.status(400).json({
        success: false,
        message: 'accountHolderName, bankName, accountNumber, and ifscCode are required.',
      });
    }

    const account = await BankAccount.create({
      owner: req.user!._id,
      restaurant: restaurant._id,
      accountHolderName: accountHolderName.trim(),
      bankName: bankName.trim(),
      accountNumber: String(accountNumber).trim(),
      ifscCode: String(ifscCode).trim().toUpperCase(),
      upiId: upiId ? String(upiId).trim() : undefined,
      isPrimary: !!isPrimary,
    });

    if (account.isPrimary) {
      await BankAccount.updateMany(
        { owner: req.user!._id, _id: { $ne: account._id } },
        { $set: { isPrimary: false } }
      );
    }

    res.status(201).json({
      success: true,
      data: account,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a bank account
// @route   PUT /api/v1/bank-accounts/:id
// @access  Private/Owner
export const updateBankAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let account = await BankAccount.findById(req.params.id);

    if (!account) {
      return res.status(404).json({ success: false, message: 'Bank account not found' });
    }

    if (account.owner.toString() !== req.user!._id.toString()) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    const { accountHolderName, bankName, accountNumber, ifscCode, upiId, isPrimary } = req.body;

    if (accountHolderName != null) account.accountHolderName = accountHolderName.trim();
    if (bankName != null) account.bankName = bankName.trim();
    if (accountNumber != null) account.accountNumber = String(accountNumber).trim();
    if (ifscCode != null) account.ifscCode = String(ifscCode).trim().toUpperCase();
    if (upiId !== undefined) account.upiId = upiId ? String(upiId).trim() : '';
    if (isPrimary !== undefined) account.isPrimary = !!isPrimary;

    await account.save();

    if (account.isPrimary) {
      await BankAccount.updateMany(
        { owner: req.user!._id, _id: { $ne: account._id } },
        { $set: { isPrimary: false } }
      );
    }

    res.status(200).json({
      success: true,
      data: account,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a bank account
// @route   DELETE /api/v1/bank-accounts/:id
// @access  Private/Owner
export const deleteBankAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const account = await BankAccount.findById(req.params.id);

    if (!account) {
      return res.status(404).json({ success: false, message: 'Bank account not found' });
    }

    if (account.owner.toString() !== req.user!._id.toString()) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    const Withdrawal = (await import('../withdrawal/withdrawal.model.js')).default;
    const hasPending = await Withdrawal.exists({
      bankAccount: account._id,
      status: 'pending',
    });

    if (hasPending) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete bank account with pending withdrawal requests.',
      });
    }

    await account.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};
