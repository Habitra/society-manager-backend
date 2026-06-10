import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../tenant/tenant-context.service';

@Injectable()
export class VendorsRatingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  /**
   * Calculates the overall dynamic rating for a vendor based on:
   * 1. Resident Feedback (40% weight)
   * 2. Admin Rating (30% weight)
   * 3. SLA Performance Metrics (15% weight)
   * 4. Completion Time Metrics (15% weight)
   */
  async calculateVendorRating(vendorId: string): Promise<number> {
    const communityId = this.tenantContext.communityId;

    // 1. Fetch Feedback
    const feedbacks = await this.prisma.vendorFeedback.findMany({
      where: { communityId, vendorId },
    });

    let residentRatingSum = 0;
    let residentRatingCount = 0;
    let adminRatingSum = 0;
    let adminRatingCount = 0;

    feedbacks.forEach((fb) => {
      const rating = Number(fb.rating);
      if (fb.source === 'RESIDENT') {
        residentRatingSum += rating;
        residentRatingCount++;
      } else if (fb.source === 'ADMIN') {
        adminRatingSum += rating;
        adminRatingCount++;
      }
    });

    const avgResidentRating = residentRatingCount > 0 ? residentRatingSum / residentRatingCount : null;
    const avgAdminRating = adminRatingCount > 0 ? adminRatingSum / adminRatingCount : null;

    // 2. Fetch Performance Metrics
    const metrics = await this.prisma.vendorPerformanceMetric.findMany({
      where: { communityId, vendorId },
    });

    let slaScore = 5; // Default perfect score
    let completionScore = 5; // Default perfect score

    let slaBreaches = 0;
    let totalSlaMeasured = 0;

    metrics.forEach((m) => {
      if (m.metricType === 'SLA_BREACH') {
        totalSlaMeasured++;
        if (Number(m.metricValue) > 0) {
          slaBreaches++;
        }
      } else if (m.metricType === 'COMPLETION_DELAY_DAYS') {
        // e.g., deduction for delay
        const delay = Number(m.metricValue);
        if (delay > 0) {
          completionScore -= (delay * 0.5); // Penalty per day
        }
      }
    });

    // Calculate SLA Score: 100% adherence = 5.0, 0% = 0.0
    if (totalSlaMeasured > 0) {
      const adherence = (totalSlaMeasured - slaBreaches) / totalSlaMeasured;
      slaScore = adherence * 5;
    }

    completionScore = Math.max(0, Math.min(5, completionScore)); // Clamp between 0 and 5

    // 3. Weighted Average Calculation
    let finalRating = 0;
    let totalWeight = 0;

    if (avgResidentRating !== null) {
      finalRating += avgResidentRating * 0.40;
      totalWeight += 0.40;
    }
    if (avgAdminRating !== null) {
      finalRating += avgAdminRating * 0.30;
      totalWeight += 0.30;
    }
    
    // SLA and Completion always factor in
    finalRating += slaScore * 0.15;
    totalWeight += 0.15;
    
    finalRating += completionScore * 0.15;
    totalWeight += 0.15;

    // Normalize if we lack some feedback types
    if (totalWeight > 0) {
      finalRating = finalRating / totalWeight;
    } else {
      finalRating = 0; // No data available
    }

    return parseFloat(finalRating.toFixed(2));
  }

  /**
   * Get Ratings for all vendors in a community
   */
  async getAllVendorRatings() {
    const communityId = this.tenantContext.communityId;
    const vendors = await this.prisma.vendor.findMany({
      where: { communityId },
      select: { id: true, name: true, category: true },
    });

    const ratings = await Promise.all(
      vendors.map(async (vendor) => {
        const rating = await this.calculateVendorRating(vendor.id);
        return {
          vendorId: vendor.id,
          vendorName: vendor.name,
          category: vendor.category,
          rating,
        };
      })
    );

    return ratings.sort((a, b) => b.rating - a.rating);
  }
}
