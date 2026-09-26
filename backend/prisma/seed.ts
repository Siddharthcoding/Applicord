import { PrismaClient, ApplicationStatus, WorkMode, EmploymentType, HistorySource, ReminderStatus, DocumentCategory, EmailClassification } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding ApplyLog database with realistic sample data...');

  // 1. Create Demo User
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('Password123!', salt);

  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@applylog.dev' },
    update: {},
    create: {
      email: 'demo@applylog.dev',
      name: 'Alex Developer',
      passwordHash,
      timezone: 'America/New_York',
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
          emailNotifications: true,
          inAppNotifications: true,
        },
      },
    },
  });

  console.log(`Demo User created: ${demoUser.email} (Password: Password123!)`);

  // 2. Companies
  const companies = [
    { name: 'Microsoft', website: 'https://careers.microsoft.com', logoUrl: 'https://logo.clearbit.com/microsoft.com' },
    { name: 'Amazon', website: 'https://amazon.jobs', logoUrl: 'https://logo.clearbit.com/amazon.com' },
    { name: 'Google', website: 'https://careers.google.com', logoUrl: 'https://logo.clearbit.com/google.com' },
    { name: 'Stripe', website: 'https://stripe.com/jobs', logoUrl: 'https://logo.clearbit.com/stripe.com' },
    { name: 'Airbnb', website: 'https://careers.airbnb.com', logoUrl: 'https://logo.clearbit.com/airbnb.com' },
    { name: 'Datadog', website: 'https://careers.datadoghq.com', logoUrl: 'https://logo.clearbit.com/datadoghq.com' },
  ];

  const companyRecords: Record<string, any> = {};
  for (const c of companies) {
    const record = await prisma.company.upsert({
      where: { name: c.name },
      update: {},
      create: c,
    });
    companyRecords[c.name] = record;
  }

  // 3. Application 1: Microsoft - Senior Software Engineer (Stage: INTERVIEW)
  const app1 = await prisma.application.upsert({
    where: { publicId: 'APP-000001' },
    update: {},
    create: {
      publicId: 'APP-000001',
      userId: demoUser.id,
      companyId: companyRecords['Microsoft'].id,
      jobTitle: 'Senior Software Engineer - Cloud Platforms',
      jobId: 'MSFT-184920',
      jobUrl: 'https://careers.microsoft.com/us/en/job/184920/Senior-Software-Engineer',
      location: 'Redmond, WA',
      workMode: WorkMode.HYBRID,
      employmentType: EmploymentType.FULL_TIME,
      source: 'LINKEDIN',
      appliedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), // 20 days ago
      currentStatus: ApplicationStatus.INTERVIEW,
      priority: 'HIGH',
      salary: '$165,000 - $195,000',
      notes: 'Referred by Jordan from Azure team. Tech stack: Go, Kubernetes, Azure.',
      statusHistory: {
        create: [
          {
            status: ApplicationStatus.APPLIED,
            timestamp: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
            source: HistorySource.MANUAL,
            note: 'Application submitted via LinkedIn Easy Apply',
          },
          {
            status: ApplicationStatus.VIEWED,
            timestamp: new Date(Date.now() - 17 * 24 * 60 * 60 * 1000),
            source: HistorySource.EMAIL,
            note: 'Application viewed by Microsoft Recruiting Team',
          },
          {
            status: ApplicationStatus.ASSESSMENT,
            timestamp: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
            source: HistorySource.EMAIL,
            note: 'Completed Codility coding challenge (100% score)',
          },
          {
            status: ApplicationStatus.INTERVIEW,
            timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
            source: HistorySource.EMAIL,
            note: 'System Design & Behavioral Interview scheduled with Engineering Manager',
          },
        ],
      },
      contacts: {
        create: [
          {
            userId: demoUser.id,
            name: 'Sarah Chen',
            role: 'Lead Technical Recruiter',
            email: 'sarah.chen@microsoft.com',
            linkedIn: 'https://linkedin.com/in/sarah-chen-recruiter',
            notes: 'Very responsive. Mentioned hiring for Cloud Scale team.',
          },
        ],
      },
      reminders: {
        create: [
          {
            userId: demoUser.id,
            type: 'FOLLOW_UP',
            title: 'Send post-interview thank you email to Sarah',
            description: 'Send thank you note and reiterate enthusiasm for Azure team.',
            dueAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // Tomorrow
            status: ReminderStatus.PENDING,
          },
        ],
      },
    },
  });

  // 4. Application 2: Stripe - Backend Engineer (Stage: OFFER)
  const app2 = await prisma.application.upsert({
    where: { publicId: 'APP-000002' },
    update: {},
    create: {
      publicId: 'APP-000002',
      userId: demoUser.id,
      companyId: companyRecords['Stripe'].id,
      jobTitle: 'Backend Infrastructure Engineer',
      jobId: 'STRIPE-5501',
      jobUrl: 'https://stripe.com/jobs/5501',
      location: 'Remote, US',
      workMode: WorkMode.REMOTE,
      employmentType: EmploymentType.FULL_TIME,
      source: 'COMPANY_WEBSITE',
      appliedAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
      currentStatus: ApplicationStatus.OFFER,
      priority: 'URGENT',
      salary: '$180,000 + Equity',
      notes: 'Received formal written offer letter. Reviewing equity package.',
      statusHistory: {
        create: [
          {
            status: ApplicationStatus.APPLIED,
            timestamp: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
            source: HistorySource.MANUAL,
            note: 'Applied directly on Stripe careers page',
          },
          {
            status: ApplicationStatus.ASSESSMENT,
            timestamp: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000),
            source: HistorySource.EMAIL,
            note: 'Take-home API development challenge submitted',
          },
          {
            status: ApplicationStatus.INTERVIEW,
            timestamp: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
            source: HistorySource.MANUAL,
            note: 'Onsite virtual loop completed: 4 technical rounds',
          },
          {
            status: ApplicationStatus.OFFER,
            timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            source: HistorySource.EMAIL,
            note: 'Offer package received. Deadline to decide in 10 days.',
          },
        ],
      },
      reminders: {
        create: [
          {
            userId: demoUser.id,
            type: 'CUSTOM',
            title: 'Offer Decision Deadline for Stripe',
            description: 'Compare with upcoming Microsoft round before deciding.',
            dueAt: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
            status: ReminderStatus.PENDING,
          },
        ],
      },
    },
  });

  // 5. Application 3: Amazon - SDE II (Stage: ASSESSMENT)
  const app3 = await prisma.application.upsert({
    where: { publicId: 'APP-000003' },
    update: {},
    create: {
      publicId: 'APP-000003',
      userId: demoUser.id,
      companyId: companyRecords['Amazon'].id,
      jobTitle: 'Software Development Engineer II',
      jobId: 'AMZN-23841',
      jobUrl: 'https://amazon.jobs/en/jobs/23841',
      location: 'Seattle, WA',
      workMode: WorkMode.ONSITE,
      employmentType: EmploymentType.FULL_TIME,
      source: 'REFERRAL',
      appliedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      currentStatus: ApplicationStatus.ASSESSMENT,
      priority: 'MEDIUM',
      notes: 'OA1 & OA2 received on HackerRank.',
      statusHistory: {
        create: [
          {
            status: ApplicationStatus.APPLIED,
            timestamp: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
            source: HistorySource.MANUAL,
            note: 'Employee referral submitted',
          },
          {
            status: ApplicationStatus.ASSESSMENT,
            timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
            source: HistorySource.EMAIL,
            note: 'Online Assessment invitation received via email',
          },
        ],
      },
      reminders: {
        create: [
          {
            userId: demoUser.id,
            type: 'FOLLOW_UP',
            title: 'Complete Amazon Online Assessment',
            description: 'HackerRank test expires in 48 hours.',
            dueAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
            status: ReminderStatus.PENDING,
          },
        ],
      },
    },
  });

  // 6. Application 4: Google - Staff Software Engineer (Stage: REJECTED)
  const app4 = await prisma.application.upsert({
    where: { publicId: 'APP-000004' },
    update: {},
    create: {
      publicId: 'APP-000004',
      userId: demoUser.id,
      companyId: companyRecords['Google'].id,
      jobTitle: 'Software Engineer III - Core Systems',
      jobId: 'GOOG-9921',
      jobUrl: 'https://careers.google.com/jobs/results/9921',
      location: 'Sunnyvale, CA',
      workMode: WorkMode.HYBRID,
      employmentType: EmploymentType.FULL_TIME,
      source: 'LINKEDIN',
      appliedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
      currentStatus: ApplicationStatus.REJECTED,
      priority: 'LOW',
      notes: 'Role was closed due to hiring freeze on team.',
      statusHistory: {
        create: [
          {
            status: ApplicationStatus.APPLIED,
            timestamp: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
            source: HistorySource.MANUAL,
            note: 'Submitted application on Google Careers',
          },
          {
            status: ApplicationStatus.VIEWED,
            timestamp: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000),
            source: HistorySource.EMAIL,
            note: 'Application under review',
          },
          {
            status: ApplicationStatus.REJECTED,
            timestamp: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
            source: HistorySource.EMAIL,
            note: 'Received rejection email: decided to pursue other candidates',
          },
        ],
      },
    },
  });

  // 7. Seed Email Integration & Automation Suggestions
  const integration = await prisma.emailIntegration.upsert({
    where: {
      userId_provider_providerAccountId: {
        userId: demoUser.id,
        provider: 'SIMULATED_INBOX',
        providerAccountId: 'demo@applylog.dev',
      },
    },
    update: {},
    create: {
      userId: demoUser.id,
      provider: 'SIMULATED_INBOX',
      providerAccountId: 'demo@applylog.dev',
      syncStatus: 'SUCCESS',
      isEnabled: true,
      lastSyncAt: new Date(),
    },
  });

  // Pending Suggestion 1: Datadog Interview detected
  await prisma.automationSuggestion.create({
    data: {
      userId: demoUser.id,
      type: 'INTERVIEW_DETECTED',
      confidence: 0.94,
      status: 'PENDING',
      payload: {
        detectedCompany: 'Datadog',
        detectedRole: 'Staff Frontend Engineer',
        targetStatus: 'INTERVIEW',
        sender: 'recruiting@datadoghq.com',
        subject: 'Datadog Technical Screen Invitation - Staff Frontend Engineer',
        snippet: 'Hi Alex, we were very impressed by your background and would love to schedule a 60-minute technical deep dive.',
        reason: 'Detected interview scheduling link in email from Datadog recruiting.',
        confidencePercent: 94,
      },
    },
  });

  // 8. Notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: demoUser.id,
        type: 'STATUS_UPDATE',
        title: 'Status Updated: Stripe',
        message: 'Stripe application moved to OFFER stage.',
        link: `/applications/${app2.id}`,
      },
      {
        userId: demoUser.id,
        type: 'EMAIL_DETECTED',
        title: 'Interview Detected: Datadog',
        message: 'Detected interview invitation from Datadog recruiting. Click to confirm status change.',
        link: '/automation',
      },
      {
        userId: demoUser.id,
        type: 'REMINDER',
        title: 'Follow-up Due Tomorrow',
        message: 'Follow-up with Sarah Chen regarding Microsoft Senior SWE role.',
        link: `/applications/${app1.id}`,
      },
    ],
  });

  console.log('Database seeded successfully with realistic applications, timeline history, and suggestions!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
