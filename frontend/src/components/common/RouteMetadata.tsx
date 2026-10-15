import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ROUTE_META: Record<string, { title: string; description: string }> = {
  '/': {
    title: 'Applicord — Intelligent Job Application Tracker & Career Workspace',
    description: 'A calm, intelligent workspace for tracking job applications, email signals, interview timelines, and follow-ups.',
  },
  '/landing': {
    title: 'Applicord — Intelligent Job Application Tracker & Career Workspace',
    description: 'A calm, intelligent workspace for tracking job applications, email signals, interview timelines, and follow-ups. Connect Gmail with read-only AI signals and replace messy spreadsheets.',
  },
  '/login': {
    title: 'Log In — Applicord',
    description: 'Log into your Applicord workspace to view your job applications, interviews, and automated email signals.',
  },
  '/register': {
    title: 'Create an Account — Applicord',
    description: 'Begin your organized job search with Applicord. Track applications, connect Gmail signals, and stay ahead of deadlines.',
  },
  '/forgot-password': {
    title: 'Forgot Password — Applicord',
    description: 'Reset your password to regain access to your Applicord job search workspace.',
  },
  '/reset-password': {
    title: 'Reset Password — Applicord',
    description: 'Set a new secure password for your Applicord account.',
  },
  '/privacy': {
    title: 'Privacy Policy — Applicord',
    description: 'Read how Applicord protects your privacy, uses encrypted tokens, and complies with Google Limited Use policies.',
  },
  '/terms': {
    title: 'Terms of Service — Applicord',
    description: 'Review the terms and conditions for using Applicord as your career application workspace.',
  },
  '/dashboard': {
    title: 'Dashboard — Applicord',
    description: 'Your career search command center: upcoming interviews, follow-ups due, recent activity, and pipeline metrics.',
  },
  '/applications': {
    title: 'Job Applications — Applicord',
    description: 'Browse, filter, and manage all your tracked job applications and statuses in one place.',
  },
  '/kanban': {
    title: 'Pipeline Board — Applicord',
    description: 'Visual drag-and-drop Kanban board for managing your job application lifecycle from Saved to Offer.',
  },
  '/calendar': {
    title: 'Calendar & Deadlines — Applicord',
    description: 'Interactive schedule showing interviews, assessment deadlines, and recruiter follow-ups.',
  },
  '/automation': {
    title: 'Automation & Email Signals — Applicord',
    description: 'Review AI-detected application confirmations, interview invitations, and status suggestions from your connected Gmail.',
  },
  '/analytics': {
    title: 'Analytics & Insights — Applicord',
    description: 'Comprehensive metrics, response rates, interview conversion funnels, and career momentum insights.',
  },
  '/contacts': {
    title: 'Recruiter Contacts — Applicord',
    description: 'Organize hiring managers, recruiters, and referrers linked to your target applications.',
  },
  '/documents': {
    title: 'Documents & Resumes — Applicord',
    description: 'Manage version-controlled resumes, tailored cover letters, and application attachments.',
  },
  '/import-export': {
    title: 'Import & Export Data — Applicord',
    description: 'Export your complete application history to CSV or JSON, or migrate from other platforms.',
  },
  '/settings': {
    title: 'Settings — Applicord',
    description: 'Manage your profile, email integrations, notification preferences, and account security.',
  },
};

export const RouteMetadata: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;
    let meta = ROUTE_META[path];

    // Handle dynamic nested routes like /applications/:id
    if (!meta && path.startsWith('/applications/')) {
      meta = {
        title: 'Application Details — Applicord',
        description: 'View full timeline, notes, contacts, and status updates for this job application.',
      };
    }

    if (!meta) {
      meta = {
        title: 'Applicord — Every opportunity, in rhythm.',
        description: 'A calm, intelligent workspace for tracking job applications, email signals, and follow-ups.',
      };
    }

    // Update document title
    document.title = meta.title;

    // Update or create meta description tag
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', meta.description);

    // Update og:title and og:description
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', meta.title);

    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', meta.description);

    const twTitle = document.querySelector('meta[name="twitter:title"]');
    if (twTitle) twTitle.setAttribute('content', meta.title);

    const twDesc = document.querySelector('meta[name="twitter:description"]');
    if (twDesc) twDesc.setAttribute('content', meta.description);
  }, [location.pathname]);

  return null;
};
