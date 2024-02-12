import { Injectable } from '@nestjs/common';
import { Badge, UserAwardedBadge } from '@prisma/client';
import { UpdateBadgeDto } from './dto/update-badge.dto';
import { BadgeRepository } from './badge.repository';
import { PaginatedResult } from '@common/helpers';
import { CreateBadgeDto } from './dto/create-badge.dto';
import { GetAllBadgeDto } from './dto/all-badge.dto';

@Injectable()
export class BadgeService {
  constructor(private badgeRepository: BadgeRepository) {}

  async createBadge(createBadgeDto: CreateBadgeDto): Promise<Badge> {
    return await this.badgeRepository.createBadge(createBadgeDto);
  }

  async getLoggedUserLatestBadge(userId: string): Promise<Badge> {
    return await this.badgeRepository.getLoggedUserLatestBadge(userId);
  }

  async getAllBadges(data: GetAllBadgeDto): Promise<PaginatedResult<Badge>> {
    return await this.badgeRepository.getAllBadges(data);
  }

  async getAllBadgesEn(data: GetAllBadgeDto): Promise<PaginatedResult<Badge>> {
    return await this.badgeRepository.getAllBadgesEn(data);
  }

  async getBadge(id: string): Promise<Badge> {
    return await this.badgeRepository.getBadge(id);
  }

  async updateBadge(id: string, updateBadgeDto: UpdateBadgeDto): Promise<Badge> {
    return await this.badgeRepository.updateBadge(id, updateBadgeDto);
  }

  async deleteBadge(id: string): Promise<Badge> {
    return await this.badgeRepository.deleteBadge(id);
  }

  async assignManualBadgeToUser(userId: string, badgeId: string): Promise<UserAwardedBadge> {
    return await this.badgeRepository.assignManualBadgeToUser(userId, badgeId);
  }

  async getUserBadges(userId: string): Promise<UserAwardedBadge[]> {
    return await this.badgeRepository.getUserBadges(userId);
  }

  async deleteUserAssignedBadge(id: string): Promise<UserAwardedBadge> {
    return await this.badgeRepository.deleteUserAssignedBadge(id);
  }

  async getBadgeByStageId(stageId: string): Promise<Badge> {
    return await this.badgeRepository.getBadgeByStageId(stageId);
  }
}
