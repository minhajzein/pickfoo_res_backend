import { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from 'express';
import jwt, { Secret } from 'jsonwebtoken';
import User from '../user/user.model.js';
import PendingUser from '../user/pendingUser.model.js';
import { sendEmail, getOTPTemplate } from '../../utils/sendEmail.js';
import crypto from 'crypto';


const generateAccessToken = (id: string) => {
  return jwt.sign({ id }, process.env.JWT_SECRET as Secret, {
    expiresIn: '15m',
  });
};

const generateRefreshToken = (id: string) => {
  return jwt.sign({ id }, process.env.REFRESH_TOKEN_SECRET as Secret, {
    expiresIn: '7d',
  });
};

const sendTokenResponse = (user: any, statusCode: number, res: ExpressResponse) => {
  const accessToken = generateAccessToken(user._id.toString());
  const refreshToken = generateRefreshToken(user._id.toString());

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: (process.env.NODE_ENV === 'production' ? 'none' : 'lax') as 'none' | 'lax' | 'strict',
  };

  const accessCookieOptions = {
    ...cookieOptions,
    expires: new Date(Date.now() + 15 * 60 * 1000), // 15 mins
  };

  const refreshCookieOptions = {
    ...cookieOptions,
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  };

  res
    .status(statusCode)
    .cookie('accessToken', accessToken, accessCookieOptions)
    .cookie('refreshToken', refreshToken, refreshCookieOptions)
    .json({
      success: true,
      accessToken, // for script/API clients that cannot use cookies
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture,
      },
    });
};

// @desc    Register user
// @route   POST /api/v1/auth/register
// @access  Public
export const register = async (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
  try {
    const { name, email, password, role, profilePicture } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    // Prevent registration of admins through this portal
    if (role === 'admin') {
      return res.status(400).json({ success: false, message: 'Cannot register as an admin through this portal' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

    // Update or create pending user
    await PendingUser.findOneAndUpdate(
      { email },
      {
        name,
        email,
        password, // stored plain, will be hashed on actual User.create
        role: role || 'owner',
        profilePicture: profilePicture || '',
        otp: otpHash,
        otpExpires: new Date(Date.now() + 10 * 60 * 1000), // 10 mins
      },
      { upsert: true, new: true }
    );

    try {
      await sendEmail({
        email,
        subject: 'Email Verification - PickFoo',
        html: getOTPTemplate(otp, name),
      });

      res.status(200).json({
        success: true,
        message: 'OTP sent to your email. Please verify to complete registration.',
        email,
      });
    } catch (error) {
      console.error('Email send failed:', error);
      res.status(200).json({
        success: true,
        message: 'Pending account created but failed to send verification email. Please try resending OTP.',
        email,
      });
    }
  } catch (error: any) {
    next(error);
  }
};

// @desc    Verify email OTP
// @route   POST /api/v1/auth/verify-email
// @access  Public
export const verifyEmail = async (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Please provide email and OTP' });
    }

    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

    const pendingUser = await PendingUser.findOne({
      email,
      otp: otpHash,
      otpExpires: { $gt: new Date() },
    });

    if (!pendingUser) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    // Now create the actual user
    const user = await User.create({
      name: pendingUser.name,
      email: pendingUser.email,
      password: pendingUser.password, // already hashed
      role: pendingUser.role,
      profilePicture: pendingUser.profilePicture,
      isVerified: true,
    });

    // Delete the pending user
    await PendingUser.deleteOne({ _id: pendingUser._id });

    sendTokenResponse(user, 201, res);
  } catch (error: any) {
    next(error);
  }
};

// @desc    Resend verification OTP
// @route   POST /api/v1/auth/resend-otp
// @access  Public
export const resendOTP = async (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
  try {
    const { email } = req.body;

    const pendingUser = await PendingUser.findOne({ email });

    if (!pendingUser) {
      return res.status(404).json({ success: false, message: 'No pending registration found for this email' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

    pendingUser.otp = otpHash;
    pendingUser.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await pendingUser.save();

    await sendEmail({
      email: pendingUser.email,
      subject: 'Email Verification - PickFoo',
      html: getOTPTemplate(otp, pendingUser.name),
    });

    res.status(200).json({
      success: true,
      message: 'OTP resent to email',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
export const login = async (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check if password matches
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.isVerified) {
      return res.status(401).json({
        success: false,
        message: 'Please verify your email before logging in',
        notVerified: true,
        email: user.email,
      });
    }

    sendTokenResponse(user, 200, res);
  } catch (error: any) {
    next(error);
  }
};

// @desc    Log user out / clear cookies
// @route   GET /api/v1/auth/logout
// @access  Private
export const logout = async (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: (process.env.NODE_ENV === 'production' ? 'none' : 'lax') as 'none' | 'lax' | 'strict',
    expires: new Date(0),
  };

  res.cookie('accessToken', 'none', cookieOptions);
  res.cookie('refreshToken', 'none', cookieOptions);

  res.status(200).json({
    success: true,
    data: {},
  });
};

// @desc    Refresh Access Token
// @route   POST /api/v1/auth/refresh-token
// @access  Public
export const refreshToken = async (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ success: false, message: 'No refresh token provided' });
    }

    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET as Secret) as { id: string };
    
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    const accessToken = generateAccessToken(user._id.toString());
    
    const accessCookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: (process.env.NODE_ENV === 'production' ? 'none' : 'lax') as 'none' | 'lax' | 'strict',
      expires: new Date(Date.now() + 15 * 60 * 1000), // 15 mins
    };

    res
      .status(200)
      .cookie('accessToken', accessToken, accessCookieOptions)
      .json({
        success: true,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          profilePicture: user.profilePicture,
        },
      });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }
};

// @desc    Get current logged in user
// @route   GET /api/v1/auth/me
// @access  Private
export const getMe = async (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route',
      });
    }

    res.status(200).json({
      success: true,
      user: req.user,
    });
  } catch (error: any) {
    next(error);
  }
};
