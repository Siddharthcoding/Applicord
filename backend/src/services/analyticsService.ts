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
      recentActivity,
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
      // Recent status changes
      prisma.applicationStatusHistory.findMany({
        where: {
          application: { userId },
        },
        orderBy: { timestamp: 'desc' },
        take: 8,
        include: {
          application: {
            include: { company: true },
          },
        },
      }),
    ]);

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
    const applications = await prisma.application.findMany({
      where: { userId },
      include: {
        company: true,
        statusHistory: {
          orderBy: { timestamp: 'asc' },
        },
      },
    });

    const total = applications.length;
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

    let respondedCount = 0;
    let interviewCount = 0;
    let offerCount = 0;
    let rejectedCount = 0;

    let totalDaysToFirstResponse = 0;
    let firstResponseInstances = 0;

    let totalDaysToRejection = 0;
    let rejectionInstances = 0;

    const sourceStats: Record<string, { total: number; responded: number; interviews: number; offers: number }> = {};
    const weeklyData: Record<string, number> = {};
    const monthlyData: Record<string, number> = {};

    applications.forEach(app => {
      // 1. Velocity (Weekly / Monthly applied counts)
      const date = new Date(app.appliedAt);
      const year = date.getFullYear();
      const month = `${year}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      // Simple ISO week string
      const firstJan = new Date(date.getFullYear(), 0, 1);
      const weekNum = Math.ceil(((date.getTime() - firstJan.getTime()) / 86400000 + firstJan.getDay() + 1) / 7);
      const weekStr = `${year}-W${String(weekNum).padStart(2, '0')}`;

      monthlyData[month] = (monthlyData[month] || 0) + 1;
      weeklyData[weekStr] = (weeklyData[weekStr] || 0) + 1;

      // 2. Source initialization
      const src = app.source || 'OTHER';
      if (!sourceStats[src]) {
        sourceStats[src] = { total: 0, responded: 0, interviews: 0, offers: 0 };
      }
      sourceStats[src].total += 1;

      // 3. Status History Traversal for Precise Analytics
      const history = app.statusHistory;
      const appliedEvent = history.find(h => h.status === 'APPLIED') || history[0];
      const appliedTime = appliedEvent ? new Date(appliedEvent.timestamp).getTime() : new Date(app.appliedAt).getTime();

      // Find first response event (VIEWED, ASSESSMENT, INTERVIEW, OFFER, or REJECTED)
      const responseEvent = history.find(h => ['VIEWED', 'ASSESSMENT', 'INTERVIEW', 'OFFER', 'REJECTED'].includes(h.status));
      if (responseEvent) {
        respondedCount++;
        sourceStats[src].responded += 1;
        const responseTime = new Date(responseEvent.timestamp).getTime();
        const diffDays = Math.max((responseTime - appliedTime) / (1000 * 60 * 60 * 24), 0);
        totalDaysToFirstResponse += diffDays;
        firstResponseInstances++;
      }

      // Check if reached interview
      const hasInterview = history.some(h => h.status === 'INTERVIEW');
      if (hasInterview || app.currentStatus === 'INTERVIEW') {
        interviewCount++;
        sourceStats[src].interviews += 1;
      }

      // Check if reached offer
      const hasOffer = history.some(h => h.status === 'OFFER' || h.status === 'ACCEPTED');
      if (hasOffer || app.currentStatus === 'OFFER' || app.currentStatus === 'ACCEPTED') {
        offerCount++;
        sourceStats[src].offers += 1;
      }

      // Check rejection timing
      const rejectionEvent = history.find(h => h.status === 'REJECTED');
      if (rejectionEvent) {
        rejectedCount++;
        const rejTime = new Date(rejectionEvent.timestamp).getTime();
        const diffDays = Math.max((rejTime - appliedTime) / (1000 * 60 * 60 * 24), 0);
        totalDaysToRejection += diffDays;
        rejectionInstances++;
      }
    });

    const responseRate = Math.round((respondedCount / total) * 100);
    const interviewRate = Math.round((interviewCount / total) * 100);
    const offerRate = Math.round((offerCount / total) * 100);

    const avgDaysToFirstResponse = firstResponseInstances > 0
      ? Number((totalDaysToFirstResponse / firstResponseInstances).toFixed(1))
      : 0;

    const avgDaysToRejection = rejectionInstances > 0
      ? Number((totalDaysToRejection / rejectionInstances).toFixed(1))
      : 0;

    // Convert source stats to array
    const sourceBreakdown = Object.keys(sourceStats).map(key => ({
      source: key,
      total: sourceStats[key].total,
      responded: sourceStats[key].responded,
      interviews: sourceStats[key].interviews,
      offers: sourceStats[key].offers,
      responseRate: Math.round((sourceStats[key].responded / sourceStats[key].total) * 100),
    })).sort((a, b) => b.total - a.total);

    // Convert trends
    const weeklyTrend = Object.keys(weeklyData).sort().slice(-12).map(key => ({
      week: key,
      count: weeklyData[key],
    }));

    const monthlyTrend = Object.keys(monthlyData).sort().slice(-6).map(key => ({
      month: key,
      count: monthlyData[key],
    }));

    // Status Funnel
    const statusFunnel = [
      { stage: 'Applied', count: total },
      { stage: 'Responded', count: respondedCount },
      { stage: 'Interview', count: interviewCount },
      { stage: 'Offer', count: offerCount },
    ];

    return {
      total,
      active: applications.filter(a => !['REJECTED', 'WITHDRAWN', 'ACCEPTED', 'CLOSED'].includes(a.currentStatus) && !a.isArchived).length,
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
