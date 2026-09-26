import { Response, NextFunction } from 'express';
import { contactService } from '../services/contactService';
import { createContactSchema, updateContactSchema } from '../validators';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../middleware/auth';

export const contactController = {
  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const validated = createContactSchema.parse(req.body);
      const contact = await contactService.createContact(userId, validated);
      return sendSuccess(res, contact, 'Contact added', 201);
    } catch (err) {
      next(err);
    }
  },

  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { applicationId, companyId, search } = req.query;

      const contacts = await contactService.listContacts(userId, {
        applicationId: applicationId as string,
        companyId: companyId as string,
        search: search as string,
      });

      return sendSuccess(res, contacts);
    } catch (err) {
      next(err);
    }
  },

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const id = req.params.id;
      const validated = updateContactSchema.parse(req.body);
      const updated = await contactService.updateContact(userId, id, validated);
      return sendSuccess(res, updated, 'Contact updated');
    } catch (err) {
      next(err);
    }
  },

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const id = req.params.id;
      await contactService.deleteContact(userId, id);
      return sendSuccess(res, null, 'Contact deleted');
    } catch (err) {
      next(err);
    }
  },
};
