import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { auditService } from './auditService';
import { config } from '../config';
import { logger } from '../utils/logger';
import { mailService } from './mailService';

export const authService = {
  async register(data: { email: string; password: string; name: string; timezone?: string }) {
    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existing) {
      const error: any = new Error('An account with this email already exists');
      error.statusCode = 409;
      throw error;
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(data.password, salt);

    const user = await prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash,
        name: data.name,
        timezone: data.timezone || 'UTC',
        settings: {
          create: {
            emailDetection: true,
            autoStatusSuggestions: true,
            autoRejectionUpdates: false,
            autoInterviewUpdates: true,
            autoFollowUpReminders: true,
            followUpDays: 7,
            highConfidenceAutoUpdate: false,
            confidenceThreshold: 0.85,
            emailNotifications: false,
            inAppNotifications: true,
          },
        },
      },
      include: {
        settings: true,
      },
    });

    const tokenPayload = { userId: user.id, email: user.email };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    await auditService.log({
      userId: user.id,
      eventType: 'USER_REGISTERED',
      payload: { email: user.email },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        timezone: user.timezone,
        settings: user.settings,
      },
      accessToken,
      refreshToken,
    };
  },

  async login(data: { email: string; password: string }) {
    const user = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
      include: {
        settings: true,
      },
    });

    if (!user) {
      const error: any = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    const isMatch = await bcrypt.compare(data.password, user.passwordHash);
    if (!isMatch) {
      const error: any = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    const tokenPayload = { userId: user.id, email: user.email };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    await auditService.log({
      userId: user.id,
      eventType: 'USER_LOGGED_IN',
      payload: { email: user.email },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        timezone: user.timezone,
        settings: user.settings,
      },
      accessToken,
      refreshToken,
    };
  },

  async refreshToken(refreshToken: string) {
    try {
      const payload = verifyRefreshToken(refreshToken);
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, email: true },
      });

      if (!user) {
        const error: any = new Error('Invalid user');
        error.statusCode = 401;
        throw error;
      }

      const newAccessToken = generateAccessToken({ userId: user.id, email: user.email });
      const newRefreshToken = generateRefreshToken({ userId: user.id, email: user.email });

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch {
      const error: any = new Error('Invalid or expired refresh token');
      error.statusCode = 401;
      throw error;
    }
  },

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        timezone: true,
        createdAt: true,
        settings: true,
      },
    });

    if (!user) {
      const error: any = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    return user;
  },

  async updateSettings(userId: string, data: any) {
    const { timezone, ...settingsData } = data;

    if (timezone) {
      await prisma.user.update({
        where: { id: userId },
        data: { timezone },
      });
    }

    const updated = await prisma.userSettings.upsert({
      where: { userId },
      update: settingsData,
      create: {
        userId,
        ...settingsData,
      },
    });

    await auditService.log({
      userId,
      eventType: 'SETTINGS_UPDATED',
      payload: data,
    });

    return updated;
  },

  async deleteAccount(userId: string) {
    // Cascades all relations cleanly as specified in schema
    await prisma.user.delete({
      where: { id: userId },
    });

    return { success: true };
  },

  async forgotPassword(email: string, frontendOrigin = config.frontendUrl) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // Return ambiguous success to prevent user email enumeration
      return {
        message: 'If an account exists with this email, a password reset link has been generated.',
      };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordExpires: resetExpires,
      },
    });

    await auditService.log({
      userId: user.id,
      eventType: 'PASSWORD_RESET_REQUESTED',
      payload: { email: user.email },
    });

    const resetUrl = `${frontendOrigin.replace(/\/$/, '')}/reset-password?token=${resetToken}`;
    logger.info('[Auth] Password reset token generated', { email: user.email });

    // Send email asynchronously via Nodemailer
    try {
      const emailSent = await mailService.sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetUrl,
        expiresMinutes: 60,
      });
      if (!emailSent) {
        logger.error('[Auth] Password reset email delivery was not accepted by the mail transport', undefined, {
          email: user.email,
        });
      }
    } catch (mailErr: any) {
      logger.error('[Auth] Failed to dispatch password reset email', mailErr, { email: user.email });
    }

    return {
      message: 'If an account exists with this email, a password reset link has been generated.',
      resetToken: config.nodeEnv === 'development' ? resetToken : undefined,
      resetUrl: config.nodeEnv === 'development' ? resetUrl : undefined,
    };
  },

  async resetPassword(token: string, newPassword: string) {
    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      const error: any = new Error('Invalid or expired password reset link.');
      error.statusCode = 400;
      throw error;
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    await auditService.log({
      userId: user.id,
      eventType: 'PASSWORD_RESET_COMPLETED',
      payload: { email: user.email },
    });

    return { success: true, message: 'Password has been successfully reset. You can now log in.' };
  },
};
