import { EmailClassification } from '@prisma/client';
import type { AIExtractionResult } from './aiEntityExtractorService';

export interface ClassificationResult {
  classification: EmailClassification;
  confidence: number;
  detectedCompany?: string;
  detectedRole?: string;
  reason: string;
  extractedDetails: {
    dates?: string[];
    assessmentDeadline?: string;
    interviewType?: string;
    links?: string[];
  };
}

// Map AI status strings to Prisma EmailClassification enum values
function mapAIStatusToClassification(status: AIExtractionResult['status']): EmailClassification | null {
  const map: Record<string, EmailClassification> = {
    APPLIED: EmailClassification.APPLICATION_CONFIRMATION,
    APPLICATION_CONFIRMATION: EmailClassification.APPLICATION_CONFIRMATION,
    APPLICATION_VIEWED: EmailClassification.APPLICATION_VIEWED,
    ASSESSMENT: EmailClassification.ASSESSMENT,
    INTERVIEW: EmailClassification.INTERVIEW,
    OFFER: EmailClassification.OFFER,
    REJECTED: EmailClassification.REJECTION,
    RECRUITER_CONTACT: EmailClassification.RECRUITER_CONTACT,
  };
  return map[status] ?? null;
}

export const emailClassificationService = {
  classify(
    email: {
      sender: string;
      subject: string;
      snippet: string;
      body?: string;
    },
    aiResult?: AIExtractionResult | null,
  ): ClassificationResult {
    const fullText = `${email.subject} ${email.snippet} ${email.body || ''}`.toLowerCase();
    const sender = email.sender.toLowerCase();
    const subject = email.subject.toLowerCase();

    const originalSubject = email.subject;
    const originalSender = email.sender;

    // 0. Use AI extraction result if provided with sufficient confidence
    if (aiResult && aiResult.confidence >= 0.75 && aiResult.status !== 'OTHER') {
      const aiClassification = mapAIStatusToClassification(aiResult.status);
      if (aiClassification) {
        // Supplement missing AI fields with regex extraction
        const regexCompany = this.extractCompany(originalSender, originalSubject, fullText);
        const regexRole = this.extractRole(originalSubject, fullText);
        return {
          classification: aiClassification,
          confidence: aiResult.confidence,
          detectedCompany: aiResult.company || regexCompany,
          detectedRole: aiResult.role || regexRole,
          reason: `AI: ${aiResult.reason}`,
          extractedDetails: {},
        };
      }
    }

    // 1. Check for Rejection

    const rejectionKeywords = [
      'unfortunately',
      'after careful consideration',
      'after careful review',
      'not moving forward',
      'will not be moving forward',
      'not be moving forward',
      'we will not be moving forward',
      'decided not to advance',
      'not to advance your candidacy',
      'not advancing your application',
      'not advancing your candidacy',
      'decided not to proceed',
      'unable to move forward',
      'unable to offer you',
      'unable to offer an interview',
      'decided to pursue other',
      'pursue other candidates',
      'pursue other applicants',
      'chosen to pursue other',
      'decided to move forward with other',
      'moving forward with other candidates',
      'impressed with your background, but',
      'not selected for this role',
      'not selected for the position',
      'not been selected',
      'position has been filled',
      'position has been closed',
      'other candidates whose qualifications',
      'other candidates whose profile',
      'regret to inform you',
      'we regret to inform',
      'we have decided not to',
      'have decided not to move forward',
      'moving in another direction',
      'wish you the best in your job search',
      'wish you the best in your career',
      'wish you luck in your job search',
      'future endeavors',
    ];
    let rejectionScore = 0;
    rejectionKeywords.forEach(kw => {
      if (fullText.includes(kw)) rejectionScore += 1;
    });
    if (rejectionScore >= 1) {
      const confidence = Math.min(0.85 + rejectionScore * 0.05, 0.99);
      return {
        classification: EmailClassification.REJECTION,
        confidence,
        detectedCompany: this.extractCompany(originalSender, originalSubject, fullText),
        detectedRole: this.extractRole(originalSubject, fullText),
        reason: 'Detected rejection notification phrasing in message content',
        extractedDetails: {},
      };
    }

    // 2. Check for Offer
    const offerKeywords = [
      'offer of employment',
      'job offer',
      'pleased to offer you the position',
      'formal offer',
      'offer letter attached',
      'congratulations on your offer',
      'extend an offer',
    ];
    let offerScore = 0;
    offerKeywords.forEach(kw => {
      if (fullText.includes(kw)) offerScore += 1;
    });
    if (offerScore >= 1) {
      return {
        classification: EmailClassification.OFFER,
        confidence: 0.95,
        detectedCompany: this.extractCompany(originalSender, originalSubject, fullText),
        detectedRole: this.extractRole(originalSubject, fullText),
        reason: 'Detected formal offer language and compensation/offer terms',
        extractedDetails: {},
      };
    }

    // 3. Check for Interview Invitation
    const interviewKeywords = [
      'interview invitation',
      'schedule an interview',
      'invite you to interview',
      'technical interview',
      'phone screen',
      'zoom meeting',
      'google meet',
      'calendar invite',
      'next round of interviews',
      'next round of the interview',
      'next round of our',
      'chat with our engineering lead',
      'speak with the hiring team',
      'interview with',
      'schedule a call',
      'select a time for your interview',
      'next steps in our hiring process',
      'next steps in the interview',
      'would like to invite you',
      'move forward to the next round',
      'shortlisted for',
      'advancing to the next stage',
      'connect for a brief call',
      'discuss the role',
      'schedule a quick chat',
    ];
    let interviewScore = 0;
    interviewKeywords.forEach(kw => {
      if (fullText.includes(kw)) interviewScore += 1;
    });
    if (interviewScore >= 1) {
      const confidence = Math.min(0.80 + interviewScore * 0.08, 0.98);
      return {
        classification: EmailClassification.INTERVIEW,
        confidence,
        detectedCompany: this.extractCompany(originalSender, originalSubject, fullText),
        detectedRole: this.extractRole(originalSubject, fullText),
        reason: 'Detected interview scheduling request or meeting coordination',
        extractedDetails: {},
      };
    }

    // 4. Check for Assessment
    const assessmentKeywords = [
      'coding assessment',
      'technical assessment',
      'hackerrank',
      'codesignal',
      'codility',
      'online test',
      'complete the assessment',
      'timed challenge',
      'take-home assignment',
      'assessment invitation',
      'skills assessment',
      'online technical challenge',
      'online challenge',
      'pre-interview assessment',
      'online assessment invitation',
      'complete the challenge',
    ];
    let assessmentScore = 0;
    assessmentKeywords.forEach(kw => {
      if (fullText.includes(kw)) assessmentScore += 1;
    });
    if (assessmentScore >= 1) {
      return {
        classification: EmailClassification.ASSESSMENT,
        confidence: 0.92,
        detectedCompany: this.extractCompany(originalSender, originalSubject, fullText),
        detectedRole: this.extractRole(originalSubject, fullText),
        reason: 'Detected online assessment/coding challenge invitation',
        extractedDetails: {},
      };
    }

    // 5. Check for Application Viewed
    const viewedKeywords = [
      'application has been viewed',
      'viewed your application',
      'application was reviewed',
      'recruiter reviewed your resume',
    ];
    if (viewedKeywords.some(kw => fullText.includes(kw))) {
      return {
        classification: EmailClassification.APPLICATION_VIEWED,
        confidence: 0.88,
        detectedCompany: this.extractCompany(originalSender, originalSubject, fullText),
        detectedRole: this.extractRole(originalSubject, fullText),
        reason: 'Detected application viewed or status update notification',
        extractedDetails: {},
      };
    }

    // 6. Check for Application Confirmation
    const confirmationKeywords = [
      'thank you for applying',
      'application received',
      'received your application',
      'we have received your resume',
      'application confirmation',
      'thanks for applying to',
      'applied to',
      'your application for',
      'successfully submitted your application',
    ];
    let confirmScore = 0;
    confirmationKeywords.forEach(kw => {
      if (fullText.includes(kw)) confirmScore += 1;
    });
    if (confirmScore >= 1) {
      return {
        classification: EmailClassification.APPLICATION_CONFIRMATION,
        confidence: 0.90,
        detectedCompany: this.extractCompany(originalSender, originalSubject, fullText),
        detectedRole: this.extractRole(originalSubject, fullText),
        reason: 'Detected job application submission receipt or confirmation',
        extractedDetails: {},
      };
    }

    // 7. Check for Recruiter Contact
    const recruiterKeywords = [
      'recruiter at',
      'talent acquisition',
      'came across your profile',
      'hiring for a role',
      'open position',
    ];
    if (recruiterKeywords.some(kw => fullText.includes(kw))) {
      return {
        classification: EmailClassification.RECRUITER_CONTACT,
        confidence: 0.75,
        detectedCompany: this.extractCompany(originalSender, originalSubject, fullText),
        detectedRole: this.extractRole(originalSubject, fullText),
        reason: 'Detected recruiter outreach communication',
        extractedDetails: {},
      };
    }

    // Default: Irrelevant
    return {
      classification: EmailClassification.IRRELEVANT,
      confidence: 0.2,
      reason: 'General email not containing actionable job application signals',
      extractedDetails: {},
    };
  },

  extractCompany(sender: string, subject: string, fullText: string): string | undefined {
    // 1. From subject "Amazon application: Status update" or "Google Application: Next Steps"
    const appPrefixMatch = subject.match(/^([A-Za-z0-9\s&]+?)\s+application(?:\s*[:|-]|\s+status|\s+update|$)/i);
    if (appPrefixMatch && appPrefixMatch[1] && appPrefixMatch[1].length < 30) {
      const raw = appPrefixMatch[1].trim();
      return raw.charAt(0).toUpperCase() + raw.slice(1);
    }

    // 2. From subject "Applying to [Company]", "Application at [Company]", "[Company] - Application"
    const atMatch = subject.match(/(?:at|with|to)\s+([A-Za-z0-9\s&]+?)(?:\s+for|\s+team|\s+careers|\s+recruiting|[!:,.-]|$)/i);
    if (atMatch && atMatch[1] && atMatch[1].length < 30) {
      const raw = atMatch[1].trim();
      return raw.charAt(0).toUpperCase() + raw.slice(1);
    }

    const companyPrefixMatch = subject.match(/^([A-Za-z0-9\s&]+?)\s*[-:|]\s*(?:Application|Interview|Update|Thanks)/i);
    if (companyPrefixMatch && companyPrefixMatch[1] && companyPrefixMatch[1].length < 30) {
      const raw = companyPrefixMatch[1].trim();
      return raw.charAt(0).toUpperCase() + raw.slice(1);
    }

    // 3. From text: "position at [Company]" or "Thank you for your interest in [Company]"
    const textCompanyMatch = fullText.match(/(?:position at|interest in|team at|careers at)\s+([A-Z][A-Za-z0-9\s&]+?)(?:[!:,.-]|\s+and|\s+is|$)/);
    if (textCompanyMatch && textCompanyMatch[1] && textCompanyMatch[1].length < 30) {
      return textCompanyMatch[1].trim();
    }

    // 4. From sender domain: e.g. jobs@microsoft.com, recruiting@stripe.com, noreply@mail.amazon.jobs
    const emailMatch = sender.match(/@([a-zA-Z0-9.-]+)/);
    if (emailMatch) {
      const domain = emailMatch[1].toLowerCase();
      const ignoreDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'greenhouse.io', 'lever.co', 'myworkday.com', 'smartrecruiters.com'];
      if (!ignoreDomains.includes(domain)) {
        const parts = domain.split('.');
        const subdomainBlacklist = ['mail', 'email', 'emails', 'mailer', 'bounce', 'notifications', 'notification', 'recruiting', 'talent', 'careers', 'jobs', 'e', 'system', 'no-reply', 'noreply', 'auth'];
        let candidate = parts[0];
        if (subdomainBlacklist.includes(candidate) && parts.length > 2) {
          candidate = parts[1];
        }
        if (candidate && candidate.length > 2) {
          return candidate.charAt(0).toUpperCase() + candidate.slice(1);
        }
      }
    }

    return undefined;
  },

  extractRole(subject: string, fullText: string): string | undefined {
    // 1. Check known industry role titles first
    const commonRoles = [
      'Software Development Engineer I',
      'Software Dev Engineer I',
      'Senior Software Engineer',
      'Software Engineer',
      'Frontend Engineer',
      'Backend Engineer',
      'Full Stack Developer',
      'DevOps Engineer',
      'Data Scientist',
      'Product Manager',
      'Engineering Manager',
      'UI/UX Designer',
    ];

    for (const role of commonRoles) {
      if (fullText.includes(role.toLowerCase())) {
        return role;
      }
    }

    // 2. From subject
    const forMatch = subject.match(/(?:for|role of|position of)\s+([A-Z][A-Za-z0-9\s&/-]+?)(?:\s+at|\s+with|[!:,.-]|$)/i);
    if (forMatch && forMatch[1] && forMatch[1].length < 50) {
      return forMatch[1].trim();
    }

    // 3. From body
    const bodyRoleMatch = fullText.match(/(?:position of|role of|applying for the|for the position of|for the role of|application for the)\s+([A-Za-z0-9\s&/-]+?)(?:\s*\(ID|\s+position|\s+role|\s+at Amazon|\s+at Google|\s+at|[!:,.-]|$)/i);
    if (bodyRoleMatch && bodyRoleMatch[1] && bodyRoleMatch[1].trim().length > 3 && bodyRoleMatch[1].trim().length < 60) {
      let extracted = bodyRoleMatch[1].trim();
      extracted = extracted.replace(/^(?:position of|role of|applying for the|for the position of|for the role of|application for the)\s+/i, '');
      if (!['a', 'the', 'this', 'our'].includes(extracted.toLowerCase())) {
        return extracted;
      }
    }

    return undefined;
  },
};
