export type WorkMode = 'REMOTE' | 'HYBRID' | 'ONSITE';

export type EmploymentType =
  | 'FULL_TIME'
  | 'PART_TIME'
  | 'CONTRACT'
  | 'INTERNSHIP'
  | 'FREELANCE'
  | 'TEMPORARY';

export type ApplicationStatus =
  | 'SAVED'
  | 'APPLIED'
  | 'VIEWED'
  | 'ASSESSMENT'
  | 'INTERVIEW'
  | 'OFFER'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'WITHDRAWN'
  | 'CLOSED';

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type HistorySource = 'MANUAL' | 'EMAIL' | 'BROWSER_EXTENSION' | 'IMPORT' | 'SYSTEM';

export type ReminderType = 'FOLLOW_UP' | 'STATUS_CHECK' | 'INTERVIEW_PREP' | 'CUSTOM';

export type ReminderStatus = 'PENDING' | 'COMPLETED' | 'DISMISSED' | 'OVERDUE';

export type DocumentCategory =
  | 'RESUME'
  | 'COVER_LETTER'
  | 'OFFER_LETTER'
  | 'APPLICATION_PDF'
  | 'ASSESSMENT_SUBMISSION'
  | 'PORTFOLIO'
  | 'OTHER';

export type SuggestionStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';

export interface User {
  id: string;
  email: string;
  name: string;
  timezone: string;
  settings?: UserSettings;
}

export interface UserSettings {
  id: string;
  emailDetection: boolean;
  autoStatusSuggestions: boolean;
  autoRejectionUpdates: boolean;
  autoInterviewUpdates: boolean;
  autoFollowUpReminders: boolean;
  followUpDays: number;
  highConfidenceAutoUpdate: boolean;
  confidenceThreshold: number;
  emailNotifications: boolean;
  inAppNotifications: boolean;
}

export interface Company {
  id: string;
  name: string;
  website?: string | null;
  logoUrl?: string | null;
}

export interface Application {
  id: string;
  publicId: string;
  userId: string;
  companyId: string;
  jobTitle: string;
  jobId?: string | null;
  jobUrl?: string | null;
  location?: string | null;
  workMode: WorkMode;
  employmentType: EmploymentType;
  source: string;
  appliedAt: string;
  currentStatus: ApplicationStatus;
  priority: Priority;
  salary?: string | null;
  notes?: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  company: Company;
  statusHistory?: ApplicationStatusHistory[];
  reminders?: Reminder[];
  contacts?: Contact[];
  documents?: DocumentItem[];
  suggestions?: AutomationSuggestion[];
  _count?: {
    statusHistory: number;
    contacts: number;
    documents: number;
    reminders: number;
  };
}

export interface ApplicationStatusHistory {
  id: string;
  applicationId: string;
  status: ApplicationStatus;
  timestamp: string;
  source: HistorySource;
  note?: string | null;
  metadata?: {
    reason?: string;
    sender?: string;
    subject?: string;
    confidence?: number;
    previousStatus?: string;
    isCorrected?: boolean;
    correctionReason?: string;
    correctedTo?: string;
    isCorrectionEvent?: boolean;
    originalEventId?: string;
    correctedFrom?: string;
    [key: string]: any;
  } | null;
  createdAt: string;
}

export interface Reminder {
  id: string;
  userId: string;
  applicationId?: string | null;
  type: ReminderType;
  title: string;
  description?: string | null;
  dueAt: string;
  status: ReminderStatus;
  completedAt?: string | null;
  createdAt: string;
  application?: Application;
}

export interface Contact {
  id: string;
  userId: string;
  applicationId?: string | null;
  companyId?: string | null;
  name: string;
  role?: string | null;
  email?: string | null;
  phone?: string | null;
  linkedIn?: string | null;
  notes?: string | null;
  lastContactDate?: string | null;
  company?: Company;
  application?: Application;
}

export interface DocumentItem {
  id: string;
  userId: string;
  applicationId: string;
  name: string;
  fileKey: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  documentCategory: DocumentCategory;
  createdAt: string;
  application?: Application;
}

export interface NotificationItem {
  id: string;
  userId: string;
  applicationId?: string | null;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  readAt?: string | null;
  metadata?: any;
  createdAt: string;
}

export interface AutomationSuggestion {
  id: string;
  userId: string;
  applicationId?: string | null;
  type: string;
  confidence: number;
  status: SuggestionStatus;
  payload: {
    detectedCompany: string;
    detectedRole: string;
    targetStatus?: ApplicationStatus;
    sender?: string;
    subject?: string;
    snippet?: string;
    body?: string | null;
    reason: string;
    confidencePercent?: number;
  };
  createdAt: string;
  resolvedAt?: string | null;
  application?: Application;
}

export interface AuditLogItem {
  id: string;
  userId: string;
  applicationId?: string | null;
  eventType: string;
  payload?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
}

export interface DashboardSummary {
  totalApplications: number;
  activeApplications: number;
  statusCounts: Record<ApplicationStatus, number>;
  needsAttention: {
    overdueFollowUps: number;
    followUpsToday: number;
    pendingSuggestions: number;
  };
  recentActivity: ApplicationStatusHistory[];
}

export interface DetailedAnalytics {
  total: number;
  active: number;
  responseRate: number;
  interviewRate: number;
  offerRate: number;
  avgDaysToFirstResponse: number;
  avgDaysToRejection: number;
  weeklyTrend: Array<{ week: string; count: number }>;
  monthlyTrend: Array<{ month: string; count: number }>;
  sourceBreakdown: Array<{
    source: string;
    total: number;
    responded: number;
    interviews: number;
    offers: number;
    responseRate: number;
  }>;
  statusFunnel: Array<{ stage: string; count: number }>;
}
