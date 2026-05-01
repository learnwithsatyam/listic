import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  ParseIntPipe,
  ParseUUIDPipe,
  DefaultValuePipe,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { AdminService } from './admin.service';
import { UpdateCreditsDto, ToggleAdminDto, RevenueQueryDto, MonthlyRevenueQueryDto } from './admin.dto';

const MAX_LIMIT = 100;

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ──────────────── Dashboard ────────────────

  @Get('dashboard')
  getDashboard() {
    return this.adminService.getDashboardStats();
  }

  @Get('activity')
  getRecentActivity(
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.adminService.getRecentActivity(Math.min(Math.max(1, limit), MAX_LIMIT));
  }

  // ──────────────── Revenue ────────────────

  @Get('revenue')
  getRevenue(@Query() query: RevenueQueryDto) {
    return this.adminService.getRevenueBreakdown(query.year, query.month);
  }

  @Get('revenue/monthly')
  getMonthlyRevenue(@Query() query: MonthlyRevenueQueryDto) {
    return this.adminService.getMonthlyRevenue(query.year);
  }

  // ──────────────── Users ────────────────

  @Get('users')
  getUsers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search?: string,
  ) {
    return this.adminService.getAllUsers(
      Math.max(1, page),
      Math.min(Math.max(1, limit), MAX_LIMIT),
      search,
    );
  }

  @Get('users/:id')
  async getUserDetail(@Param('id', ParseUUIDPipe) id: string) {
    const user = await this.adminService.getUserDetail(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  @Patch('users/:id/credits')
  async updateCredits(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCreditsDto,
  ) {
    const user = await this.adminService.updateUserCredits(id, dto.credits);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  @Patch('users/:id/admin')
  async toggleAdmin(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ToggleAdminDto,
  ) {
    const user = await this.adminService.toggleAdmin(id, dto.isAdmin);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}
