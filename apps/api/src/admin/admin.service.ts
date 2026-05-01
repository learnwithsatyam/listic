import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual } from 'typeorm';
import { User } from '../users/user.entity';
import { Payment } from '../payments/payment.entity';
import { ImageProject } from '../images/entities/image-project.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(Payment)
    private readonly paymentsRepo: Repository<Payment>,
    @InjectRepository(ImageProject)
    private readonly projectsRepo: Repository<ImageProject>,
  ) {}

  // ──────────────── Dashboard Overview ────────────────

  async getDashboardStats() {
    const [totalUsers, totalPayments, totalProjects] = await Promise.all([
      this.usersRepo.count(),
      this.paymentsRepo.find({ where: { status: 'captured' } }),
      this.projectsRepo.count(),
    ]);

    const totalRevenuePaise = totalPayments.reduce((sum: number, p: Payment) => sum + p.amountPaise, 0);
    const totalCreditsGranted = totalPayments.reduce((sum: number, p: Payment) => sum + p.credits, 0);

    const completedProjects = await this.projectsRepo.count({ where: { status: 'completed' } });
    const failedProjects = await this.projectsRepo.count({ where: { status: 'failed' } });
    const processingProjects = await this.projectsRepo.count({ where: { status: 'processing' } });

    // Users registered in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newUsersLast30 = await this.usersRepo.count({
      where: { createdAt: MoreThanOrEqual(thirtyDaysAgo) },
    });

    // Revenue last 30 days
    const recentPayments = await this.paymentsRepo.find({
      where: { status: 'captured', createdAt: MoreThanOrEqual(thirtyDaysAgo) },
    });
    const revenueLast30Paise = recentPayments.reduce((sum: number, p: Payment) => sum + p.amountPaise, 0);

    // Paying users (users who have made at least one payment)
    const payingUsersResult = await this.paymentsRepo
      .createQueryBuilder('payment')
      .select('COUNT(DISTINCT payment.userId)', 'count')
      .where('payment.status = :status', { status: 'captured' })
      .getRawOne();
    const payingUsers = parseInt(payingUsersResult?.count || '0', 10);

    return {
      totalUsers,
      newUsersLast30,
      payingUsers,
      totalRevenueInr: totalRevenuePaise / 100,
      revenueLast30Inr: revenueLast30Paise / 100,
      totalPayments: totalPayments.length,
      totalCreditsGranted,
      totalProjects,
      completedProjects,
      failedProjects,
      processingProjects,
    };
  }

  // ──────────────── Revenue Analytics ────────────────

  async getRevenueBreakdown(year?: number, month?: number) {
    let query = this.paymentsRepo.createQueryBuilder('payment')
      .where('payment.status = :status', { status: 'captured' });

    if (year && month) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59, 999);
      query = query.andWhere('payment.createdAt BETWEEN :start AND :end', { start, end });
    } else if (year) {
      const start = new Date(year, 0, 1);
      const end = new Date(year, 11, 31, 23, 59, 59, 999);
      query = query.andWhere('payment.createdAt BETWEEN :start AND :end', { start, end });
    }

    const payments = await query.orderBy('payment.createdAt', 'DESC').getMany();

    const totalRevenuePaise = payments.reduce((sum: number, p: Payment) => sum + p.amountPaise, 0);
    const totalCredits = payments.reduce((sum: number, p: Payment) => sum + p.credits, 0);

    // Breakdown by tier
    const tierBreakdown: Record<string, { count: number; revenueInr: number; credits: number }> = {};
    for (const p of payments) {
      if (!tierBreakdown[p.tierSlug]) {
        tierBreakdown[p.tierSlug] = { count: 0, revenueInr: 0, credits: 0 };
      }
      tierBreakdown[p.tierSlug].count++;
      tierBreakdown[p.tierSlug].revenueInr += p.amountPaise / 100;
      tierBreakdown[p.tierSlug].credits += p.credits;
    }

    return {
      totalRevenueInr: totalRevenuePaise / 100,
      totalPayments: payments.length,
      totalCredits,
      tierBreakdown,
      payments: payments.map((p: Payment) => ({
        id: p.id,
        userId: p.userId,
        razorpayPaymentId: p.razorpayPaymentId,
        razorpayOrderId: p.razorpayOrderId,
        tierSlug: p.tierSlug,
        tierName: p.tierName,
        credits: p.credits,
        amountInr: p.amountPaise / 100,
        currency: p.currency,
        status: p.status,
        createdAt: p.createdAt,
      })),
    };
  }

  async getMonthlyRevenue(year?: number) {
    const targetYear = year || new Date().getFullYear();
    const months: { month: number; revenueInr: number; payments: number; credits: number }[] = [];

    for (let m = 1; m <= 12; m++) {
      const start = new Date(targetYear, m - 1, 1);
      const end = new Date(targetYear, m, 0, 23, 59, 59, 999);

      const monthPayments = await this.paymentsRepo.find({
        where: {
          status: 'captured',
          createdAt: Between(start, end),
        },
      });

      months.push({
        month: m,
        revenueInr: monthPayments.reduce((s: number, p: Payment) => s + p.amountPaise, 0) / 100,
        payments: monthPayments.length,
        credits: monthPayments.reduce((s: number, p: Payment) => s + p.credits, 0),
      });
    }

    return { year: targetYear, months };
  }

  // ──────────────── Users Management ────────────────

  async getAllUsers(page = 1, limit = 20, search?: string) {
    let query = this.usersRepo.createQueryBuilder('user')
      .select([
        'user.id', 'user.email', 'user.name', 'user.creditsRemaining',
        'user.isAdmin', 'user.createdAt', 'user.updatedAt',
      ]);

    if (search) {
      query = query.where(
        'user.email ILIKE :search OR user.name ILIKE :search',
        { search: `%${search}%` },
      );
    }

    const [users, total] = await query
      .orderBy('user.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUserDetail(userId: string) {
    const user = await this.usersRepo.findOne({
      where: { id: userId },
      select: ['id', 'email', 'name', 'creditsRemaining', 'isAdmin', 'createdAt', 'updatedAt'],
    });

    if (!user) return null;

    const [payments, projects] = await Promise.all([
      this.paymentsRepo.find({
        where: { userId },
        order: { createdAt: 'DESC' },
      }),
      this.projectsRepo.find({
        where: { userId },
        order: { createdAt: 'DESC' },
      }),
    ]);

    const totalSpentPaise = payments
      .filter((p: Payment) => p.status === 'captured')
      .reduce((sum: number, p: Payment) => sum + p.amountPaise, 0);
    const totalCreditsEver = payments
      .filter((p: Payment) => p.status === 'captured')
      .reduce((sum: number, p: Payment) => sum + p.credits, 0);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      creditsRemaining: user.creditsRemaining,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      totalSpentInr: totalSpentPaise / 100,
      totalCreditsEver,
      payments: payments.map((p: Payment) => ({
        id: p.id,
        razorpayPaymentId: p.razorpayPaymentId,
        tierSlug: p.tierSlug,
        tierName: p.tierName,
        credits: p.credits,
        amountInr: p.amountPaise / 100,
        status: p.status,
        createdAt: p.createdAt,
      })),
      projects: projects.map((p: ImageProject) => ({
        id: p.id,
        productName: p.productName,
        productCategory: p.productCategory,
        status: p.status,
        targetPlatforms: p.targetPlatforms,
        createdAt: p.createdAt,
      })),
    };
  }

  async updateUserCredits(userId: string, credits: number) {
    const capped = Math.min(Math.max(0, credits), 100000);
    await this.usersRepo.update(userId, { creditsRemaining: capped });
    return this.usersRepo.findOne({
      where: { id: userId },
      select: ['id', 'email', 'name', 'creditsRemaining'],
    });
  }

  async toggleAdmin(userId: string, isAdmin: boolean) {
    await this.usersRepo.update(userId, { isAdmin });
    return this.usersRepo.findOne({
      where: { id: userId },
      select: ['id', 'email', 'name', 'isAdmin'],
    });
  }

  // ──────────────── Recent Activity ────────────────

  async getRecentActivity(limit = 20) {
    const [recentUsers, recentPayments, recentProjects] = await Promise.all([
      this.usersRepo.find({
        select: ['id', 'email', 'name', 'createdAt'],
        order: { createdAt: 'DESC' },
        take: limit,
      }),
      this.paymentsRepo
        .createQueryBuilder('payment')
        .leftJoin('payment.user', 'user')
        .addSelect(['user.email', 'user.name'])
        .orderBy('payment.createdAt', 'DESC')
        .take(limit)
        .getMany(),
      this.projectsRepo
        .createQueryBuilder('project')
        .leftJoin('project.user', 'user')
        .addSelect(['user.email'])
        .orderBy('project.createdAt', 'DESC')
        .take(limit)
        .getMany(),
    ]);

    return {
      recentUsers,
      recentPayments: recentPayments.map((p: Payment) => ({
        id: p.id,
        userEmail: p.user?.email,
        userName: p.user?.name,
        userId: p.userId,
        tierName: p.tierName,
        amountInr: p.amountPaise / 100,
        status: p.status,
        createdAt: p.createdAt,
      })),
      recentProjects: recentProjects.map((p: ImageProject) => ({
        id: p.id,
        userEmail: p.user?.email,
        productName: p.productName,
        status: p.status,
        createdAt: p.createdAt,
      })),
    };
  }
}
