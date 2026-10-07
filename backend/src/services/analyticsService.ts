import { prisma } from '../config/prisma';
import { ApplicationStatus } from '@prisma/client';

export const analyticsService = {
  async getDashboardSummary(userId: string) {
    const [
      totalCount,
      activeCount,
      statusCountsRaw,
      overdueReminders,
      todayReminders,
      pendingSuggestions,
      userApplicationIds,
    ] = await Promise.all([
      // Total count
      prisma.application.count({ where: { userId } }),
      // Active count (not archived and not in terminal states)
      prisma.application.count({
        where: {
          userId,
          isArchived: false,
          currentStatus: {
            notIn: ['REJECTED', 'WITHDRAWN', 'ACCEPTED', 'CLOSED'],
          },
        },
      }),
      // Status breakdown
      prisma.application.groupBy({
        by: ['currentStatus'],
        where: { userId, isArchived: false },
        _count: { id: true },
      }),
      // Overdue reminders
      prisma.reminder.count({
        where: {
          userId,
          status: 'PENDING',
          dueAt: { lt: new Date() },
        },
      }),
      // Reminders due today
      prisma.reminder.count({
        where: {
          userId,
          status: 'PENDING',
          dueAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lte: new Date(new Date().setHours(23, 59, 59, 999)),
          },
        },
      }),
      // Pending suggestions
      prisma.automationSuggestion.count({
        where: { userId, status: 'PENDING' },
      }),
      // Fetch user's applicationIds to filter status history directly (indexed)
      // instead of using a nested relational filter that forces a slow join
      prisma.application.findMany({
        where: { userId },
        select: { id: true },
      }),
    ]);

    // Recent status changes — query by applicationId directly (uses applicationId index)
    const appIds = userApplicationIds.map((a) => a.id);
    const recentActivity = appIds.length > 0
      ? await prisma.applicationStatusHistory.findMany({
          where: { applicationId: { in: appIds } },
          orderBy: { timestamp: 'desc' },
          take: 8,
          include: {
            application: {
              include: { company: true },
            },
          },
        })
      : [];

    const statusCounts: Record<ApplicationStatus, number> = {
      SAVED: 0,
      APPLIED: 0,
      VIEWED: 0,
      ASSESSMENT: 0,
      INTERVIEW: 0,
      OFFER: 0,
      ACCEPTED: 0,
      REJECTED: 0,
      WITHDRAWN: 0,
      CLOSED: 0,
    };

    statusCountsRaw.forEach(item => {
      statusCounts[item.currentStatus] = item._count.id;
    });

    return {
      totalApplications: totalCount,
      activeApplications: activeCount,
      statusCounts,
      needsAttention: {
        overdueFollowUps: overdueReminders,
        followUpsToday: todayReminders,
        pendingSuggestions,
      },
      recentActivity,
    };
  },

  async getDetailedAnalytics(userId: string) {
    // Use DB-side aggregation instead of pulling all rows into Node.js memory.
    // All independent queries run in parallel via Promise.all.
    const [
      total,
      activeCount,
      statusGroupCounts,
      sourceGroupCounts,
      monthlyApplications,
      weeklyApplications,
    ] = await Promise.all([
      // Total applications
      prisma.application.count({ where: { userId } }),

      // Active (non-terminal, non-archived)
      prisma.application.count({
        where: {
          userId,
          isArchived: false,
          currentStatus: { notIn: ['REJECTED', 'WITHDRAWN', 'ACCEPTED', 'CLOSED'] },
        },
      }),

      // Status breakdown (DB groupBy — no row fetching)
      prisma.application.groupBy({
        by: ['currentStatus'],
        where: { userId },
        _count: { id: true },
      }),

      // Source breakdown (DB groupBy — no row fetching)
      prisma.application.groupBy({
        by: ['source'],
        where: { userId },
        _count: { id: true },
      }),

      // Monthly applied count — fully aggregated in Postgres (last 12 months)
      prisma.$queryRaw<{ month: string; count: bigint }[]>`
        SELECT
          to_char(DATE_TRUNC('month', "appliedAt"), 'YYYY-MM') AS month,
          COUNT(*) AS count
        FROM applications
        WHERE "userId" = ${userId}
          AND "appliedAt" >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', "appliedAt")
        ORDER BY DATE_TRUNC('month', "appliedAt") ASC
      `,

      // Weekly applied count — fully aggregated in Postgres (last 12 weeks)
      prisma.$queryRaw<{ week: string; count: bigint }[]>`
        SELECT
          to_char(DATE_TRUNC('week', "appliedAt"), 'IYYY-"W"IW') AS week,
          COUNT(*) AS count
        FROM applications
        WHERE "userId" = ${userId}
          AND "appliedAt" >= NOW() - INTERVAL '12 weeks'
        GROUP BY DATE_TRUNC('week', "appliedAt")
        ORDER BY DATE_TRUNC('week', "appliedAt") ASC
      `,
    ]);

    if (total === 0) {
      return {
        total: 0,
        active: 0,
        responseRate: 0,
        interviewRate: 0,
        offerRate: 0,
        avgDaysToFirstResponse: 0,
        avgDaysToRejection: 0,
        weeklyTrend: [],
        monthlyTrend: [],
        sourceBreakdown: [],
        statusFunnel: [],
      };
    }

    // Derive counts from the DB-side groupBy results (no in-process row iteration)
    const statusMap: Record<string, number> = {};
    statusGroupCounts.forEach(row => {
      statusMap[row.currentStatus] = row._count.id;
    });

    const respondedCount =
      (statusMap['VIEWED'] || 0) +
      (statusMap['ASSESSMENT'] || 0) +
      (statusMap['INTERVIEW'] || 0) +
      (statusMap['OFFER'] || 0) +
      (statusMap['ACCEPTED'] || 0) +
      (statusMap['REJECTED'] || 0);

    const interviewCount =
      (statusMap['INTERVIEW'] || 0) +
      (statusMap['OFFER'] || 0) +
      (statusMap['ACCEPTED'] || 0);

    const offerCount = (statusMap['OFFER'] || 0) + (statusMap['ACCEPTED'] || 0);

    const responseRate = Math.round((respondedCount / total) * 100);
    const interviewRate = Math.round((interviewCount / total) * 100);
    const offerRate = Math.round((offerCount / total) * 100);

    // Avg days computed via SQL JOIN — no row fetching, runs in parallel
    const [avgResponseRaw, avgRejectionRaw] = await Promise.all([
      prisma.$queryRaw<{ avg_days: number | null }[]>`
        SELECT AVG(
          EXTRACT(EPOCH FROM (h_resp."timestamp" - h_applied."timestamp")) / 86400
        ) AS avg_days
        FROM application_status_history h_applied
        JOIN application_status_history h_resp
          ON h_resp."applicationId" = h_applied."applicationId"
        JOIN applications a
          ON a.id = h_applied."applicationId"
        WHERE a."userId" = ${userId}
          AND h_applied.status = 'APPLIED'
          AND h_resp.status IN ('VIEWED', 'ASSESSMENT', 'INTERVIEW', 'OFFER', 'REJECTED')
          AND h_resp."timestamp" > h_applied."timestamp"
      `,
      prisma.$queryRaw<{ avg_days: number | null }[]>`
        SELECT AVG(
          EXTRACT(EPOCH FROM (h_rej."timestamp" - h_applied."timestamp")) / 86400
        ) AS avg_days
        FROM application_status_history h_applied
        JOIN application_status_history h_rej
          ON h_rej."applicationId" = h_applied."applicationId"
        JOIN applications a
          ON a.id = h_applied."applicationId"
        WHERE a."userId" = ${userId}
          AND h_applied.status = 'APPLIED'
          AND h_rej.status = 'REJECTED'
          AND h_rej."timestamp" > h_applied."timestamp"
      `,
    ]);

    const avgDaysToFirstResponse = avgResponseRaw[0]?.avg_days
      ? Number(Number(avgResponseRaw[0].avg_days).toFixed(1))
      : 0;

    const avgDaysToRejection = avgRejectionRaw[0]?.avg_days
      ? Number(Number(avgRejectionRaw[0].avg_days).toFixed(1))
      : 0;

    const sourceBreakdown = sourceGroupCounts.map(row => ({
      source: row.source,
      total: row._count.id,
      responded: 0,
      interviews: 0,
      offers: 0,
      responseRate: 0,
    })).sort((a, b) => b.total - a.total);

    const weeklyTrend = weeklyApplications.map(row => ({
      week: row.week,
      count: Number(row.count),
    }));

    const monthlyTrend = monthlyApplications.map(row => ({
      month: row.month,
      count: Number(row.count),
    }));

    const statusFunnel = [
      { stage: 'Applied', count: total },
      { stage: 'Responded', count: respondedCount },
      { stage: 'Interview', count: interviewCount },
      { stage: 'Offer', count: offerCount },
    ];

    return {
      total,
      active: activeCount,
      responseRate,
      interviewRate,
      offerRate,
      avgDaysToFirstResponse,
      avgDaysToRejection,
      weeklyTrend,
      monthlyTrend,
      sourceBreakdown,
      statusFunnel,
    };
  },
};
