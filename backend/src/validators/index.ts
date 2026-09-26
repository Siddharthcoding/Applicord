import { z } from 'zod';

// Auth Validators
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().optional(),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  timezone: z.string().optional().default('UTC'),
}).refine((data) => {
  if (data.confirmPassword !== undefined && data.confirmPassword !== data.password) {
    return false;
  }
  return true;
}, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  confirmPassword: z.string().optional(),
}).refine((data) => {
  if (data.confirmPassword !== undefined && data.confirmPassword !== data.newPassword) {
    return false;
  }
  return true;
}, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const updateSettingsSchema = z.object({
  emailDetection: z.boolean().optional(),
  autoStatusSuggestions: z.boolean().optional(),
  autoRejectionUpdates: z.boolean().optional(),
  autoInterviewUpdates: z.boolean().optional(),
  autoFollowUpReminders: z.boolean().optional(),
  followUpDays: z.number().int().min(1).max(90).optional(),
  highConfidenceAutoUpdate: z.boolean().optional(),
  confidenceThreshold: z.number().min(0.5).max(1.0).optional(),
  emailNotifications: z.boolean().optional(),
  inAppNotifications: z.boolean().optional(),
  timezone: z.string().optional(),
});

// Application Validators
export const createApplicationSchema = z.object({
  company: z.string().min(1, 'Company name is required'),
  jobTitle: z.string().min(1, 'Job title is required'),
  appliedAt: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  currentStatus: z.enum([
    'SAVED',
    'APPLIED',
    'VIEWED',
    'ASSESSMENT',
    'INTERVIEW',
    'OFFER',
    'ACCEPTED',
    'REJECTED',
    'WITHDRAWN',
    'CLOSED',
  ]).optional().default('APPLIED'),
  jobId: z.string().optional().nullable(),
  jobUrl: z.string().url('Invalid URL').optional().or(z.literal('')).nullable(),
  location: z.string().optional().nullable(),
  workMode: z.enum(['REMOTE', 'HYBRID', 'ONSITE']).optional().default('HYBRID'),
  employmentType: z.enum([
    'FULL_TIME',
    'PART_TIME',
    'CONTRACT',
    'INTERNSHIP',
    'FREELANCE',
    'TEMPORARY',
  ]).optional().default('FULL_TIME'),
  source: z.string().optional().default('LINKEDIN'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().default('MEDIUM'),
  salary: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  scheduleFollowUp: z.boolean().optional().default(true),
  customFollowUpDays: z.number().int().min(1).max(60).optional(),
  // Optional recruiter contact info provided at creation
  recruiterName: z.string().optional(),
  recruiterEmail: z.string().email().optional().or(z.literal('')),
});

export const updateApplicationSchema = createApplicationSchema.partial().extend({
  isArchived: z.boolean().optional(),
});

export const changeStatusSchema = z.object({
  status: z.enum([
    'SAVED',
    'APPLIED',
    'VIEWED',
    'ASSESSMENT',
    'INTERVIEW',
    'OFFER',
    'ACCEPTED',
    'REJECTED',
    'WITHDRAWN',
    'CLOSED',
  ]),
  source: z.enum(['MANUAL', 'EMAIL', 'BROWSER_EXTENSION', 'IMPORT', 'SYSTEM']).optional().default('MANUAL'),
  timestamp: z.string().datetime().optional(),
  note: z.string().optional().nullable(),
  metadata: z.record(z.any()).optional(),
  scheduleFollowUp: z.boolean().optional(),
});

export const correctStatusSchema = z.object({
  statusHistoryId: z.string().uuid(),
  correctStatus: z.enum([
    'SAVED',
    'APPLIED',
    'VIEWED',
    'ASSESSMENT',
    'INTERVIEW',
    'OFFER',
    'ACCEPTED',
    'REJECTED',
    'WITHDRAWN',
    'CLOSED',
  ]),
  reason: z.string().min(1, 'Correction reason is required'),
});

export const duplicateCheckSchema = z.object({
  company: z.string().min(1),
  jobTitle: z.string().optional(),
  jobId: z.string().optional().nullable(),
  jobUrl: z.string().optional().nullable(),
});

export const bulkActionSchema = z.object({
  applicationIds: z.array(z.string().uuid()).min(1, 'At least one application ID required'),
  action: z.enum(['CHANGE_STATUS', 'ARCHIVE', 'UNARCHIVE', 'DELETE', 'SET_PRIORITY']),
  payload: z.record(z.any()).optional(),
});

// Reminder Validators
export const createReminderSchema = z.object({
  applicationId: z.string().uuid().optional().nullable(),
  type: z.enum(['FOLLOW_UP', 'STATUS_CHECK', 'INTERVIEW_PREP', 'CUSTOM']).optional().default('FOLLOW_UP'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().nullable(),
  dueAt: z.string().datetime({ message: 'Valid ISO date required for dueAt' }),
});

export const updateReminderSchema = createReminderSchema.partial().extend({
  status: z.enum(['PENDING', 'COMPLETED', 'DISMISSED', 'OVERDUE']).optional(),
});

// Contact Validators
export const createContactSchema = z.object({
  applicationId: z.string().uuid().optional().nullable(),
  companyId: z.string().uuid().optional().nullable(),
  companyName: z.string().optional(),
  name: z.string().min(1, 'Contact name is required'),
  role: z.string().optional().nullable(),
  email: z.string().email('Invalid email').optional().or(z.literal('')).nullable(),
  phone: z.string().optional().nullable(),
  linkedIn: z.string().url('Invalid LinkedIn URL').optional().or(z.literal('')).nullable(),
  notes: z.string().optional().nullable(),
  lastContactDate: z.string().datetime().optional().nullable(),
});

export const updateContactSchema = createContactSchema.partial();

// Document Validators
export const createDocumentSchema = z.object({
  applicationId: z.string().uuid('Application ID required'),
  name: z.string().min(1, 'Document name required'),
  documentCategory: z.enum([
    'RESUME',
    'COVER_LETTER',
    'OFFER_LETTER',
    'APPLICATION_PDF',
    'ASSESSMENT_SUBMISSION',
    'PORTFOLIO',
    'OTHER',
  ]).optional().default('RESUME'),
});

// Extension Validators
export const extensionDetectSchema = z.object({
  url: z.string().url(),
  pageTitle: z.string().optional(),
  pageContent: z.string().optional(),
});

export const extensionTrackSchema = z.object({
  company: z.string().min(1),
  jobTitle: z.string().min(1),
  jobUrl: z.string().url().optional().or(z.literal('')),
  jobId: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  workMode: z.enum(['REMOTE', 'HYBRID', 'ONSITE']).optional().default('HYBRID'),
  source: z.string().optional().default('BROWSER_EXTENSION'),
  appliedAt: z.string().datetime().optional(),
  currentStatus: z.enum(['SAVED', 'APPLIED']).optional().default('APPLIED'),
});

// Suggestion Resolve Validator
export const resolveSuggestionSchema = z.object({
  action: z.enum(['ACCEPT', 'REJECT', 'UPDATE_APPLICATION']),
  targetApplicationId: z.string().uuid().optional(),
  notes: z.string().optional(),
  overrides: z
    .object({
      company: z.string().min(1).optional(),
      role: z.string().min(1).optional(),
        status: z
        .enum(['SAVED', 'APPLIED', 'VIEWED', 'ASSESSMENT', 'INTERVIEW', 'OFFER', 'ACCEPTED', 'REJECTED', 'WITHDRAWN', 'CLOSED'])
          .optional(),
        appliedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}(?:T.*)?$/, 'Invalid application date').optional(),
        jobUrl: z.string().url().optional().or(z.literal('')),
        jobId: z.string().max(160).optional(),
        location: z.string().max(200).optional(),
        source: z.string().max(80).optional(),
        workMode: z.enum(['REMOTE', 'HYBRID', 'ONSITE']).optional(),
        priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
        salary: z.string().max(200).optional(),
        recruiterName: z.string().max(150).optional(),
        recruiterEmail: z.string().email().optional().or(z.literal('')),
        notes: z.string().max(5000).optional(),
        scheduleFollowUp: z.boolean().optional(),
        customFollowUpDays: z.number().int().min(1).max(90).optional(),
    })
    .optional(),
});

// Import Validator
export const importRowsSchema = z.object({
  rows: z.array(
    z.object({
      company: z.string().min(1),
      jobTitle: z.string().min(1),
      appliedAt: z.string().optional(),
      status: z.string().optional(),
      source: z.string().optional(),
      location: z.string().optional(),
      jobUrl: z.string().optional(),
      notes: z.string().optional(),
    })
  ).min(1, 'At least one row required'),
});
