import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  updateSettingsSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validators';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../middleware/auth';
import { config } from '../config';

const getTrustedFrontendOrigin = (req: Request): string => {
  const origin = req.get('origin');
  if (!origin) return config.frontendUrl;

  try {
    const url = new URL(origin);
    const isLocalhost = /^(localhost|127\.0\.0\.1)$/.test(url.hostname);
    const isConfiguredFrontend = url.origin === config.frontendUrl;
    if (url.protocol.match(/^https?:$/) && (isConfiguredFrontend || (config.nodeEnv !== 'production' && isLocalhost))) {
      return url.origin;
    }
  } catch {
    // Fall back to the configured frontend URL for malformed origins.
  }

  return config.frontendUrl;
};

export const authController = {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = registerSchema.parse(req.body);
      const result = await authService.register(validated);
      return sendSuccess(res, result, 'User registered successfully', 201);
    } catch (err) {
      next(err);
    }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = loginSchema.parse(req.body);
      const result = await authService.login(validated);
      return sendSuccess(res, result, 'Login successful');
    } catch (err) {
      next(err);
    }
  },

  async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = refreshTokenSchema.parse(req.body);
      const result = await authService.refreshToken(validated.refreshToken);
      return sendSuccess(res, result, 'Tokens refreshed');
    } catch (err) {
      next(err);
    }
  },

  async getProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const user = await authService.getProfile(userId);
      return sendSuccess(res, user);
    } catch (err) {
      next(err);
    }
  },

  async updateSettings(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const validated = updateSettingsSchema.parse(req.body);
      const updated = await authService.updateSettings(userId, validated);
      return sendSuccess(res, updated, 'Settings updated successfully');
    } catch (err) {
      next(err);
    }
  },

  async deleteAccount(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      await authService.deleteAccount(userId);
      return sendSuccess(res, null, 'Account and all associated career data deleted successfully');
    } catch (err) {
      next(err);
    }
  },

  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = forgotPasswordSchema.parse(req.body);
      const result = await authService.forgotPassword(validated.email, getTrustedFrontendOrigin(req));
      return sendSuccess(res, result, result.message);
    } catch (err) {
      next(err);
    }
  },

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = resetPasswordSchema.parse(req.body);
      const result = await authService.resetPassword(validated.token, validated.newPassword);
      return sendSuccess(res, result, result.message);
    } catch (err) {
      next(err);
    }
  },
};
