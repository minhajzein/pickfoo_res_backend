import express, { Router } from 'express';
import {
  register,
  login,
  logout,
  getMe,
  verifyEmail,
  resendOTP,
  refreshToken,
  requestProfileChangeOTP,
  verifyProfileChangeOTP,
} from './auth.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';

const router: Router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh-token', refreshToken);
router.post('/verify-email', verifyEmail);
router.post('/resend-otp', resendOTP);
router.get('/logout', logout);
router.get('/me', protect, getMe);
router.post('/profile-change/request-otp', protect, requestProfileChangeOTP);
router.post('/profile-change/verify-otp', protect, verifyProfileChangeOTP);

export default router;
