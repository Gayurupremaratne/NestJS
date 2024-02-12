import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@prisma-orm/prisma.service';
import { Passes, Prisma, Stage } from '@prisma/client';
import { StageDatabaseDto } from './dto/stage-database.dto';
import { GetStageDto } from './dto/get-stage-dto';
import { StageSortTypes } from '@common/constants/stage-sort.constants';
import { PaginateFunction, PaginatedResult, paginator, sanitizeObject } from '@common/helpers';
import validator from 'validator';
import * as Sentry from '@sentry/node';

@Injectable()
export class StageRepository {
  constructor(private prisma: PrismaService) {}
  async distanceConditions(distanceRangesArray: string[]): Promise<string> {
    // Generate the conditions for each distance range
    const distanceConditions = distanceRangesArray.map((range) => {
      const [min, max] = range.includes('-') ? range.split('-') : [range, range];

      const isMinFloat = validator.isFloat(min);
      const isMaxFloat = validator.isFloat(max);

      const minDistance = parseFloat(min);
      const maxDistance = parseFloat(max);

      let condition = null;

      if (isMinFloat && isMaxFloat && minDistance < maxDistance) {
        condition = `s.distance >= ${min} AND s.distance <= ${max}`;
      } else if (isMinFloat) {
        condition = `s.distance >= ${min}`;
      }

      return condition;
    });

    // Filter out null conditions (invalid ranges) and combine the distance conditions using 'OR'
    const validDistanceConditions = distanceConditions.filter((condition) => condition !== null);
    const distanceCondition = validDistanceConditions.join(' OR ');

    return distanceCondition;
  }

  async getStageCustomfilterConditions(
    difficulty?: string,
    tagTdsArray?: string[],
    distanceRangesArray?: string[],
    familyFriendly?: string,
    peopleInteraction?: string,
    status?: string,
  ): Promise<string[]> {
    const conditions = [];

    if (tagTdsArray?.length > 0) {
      conditions.push(
        `s.id IN (SELECT stage_id FROM stage_tag_associations WHERE stage_tag_id IN (${tagTdsArray
          .map((tag) => `'${tag}'`)
          .join(', ')}))`,
      );
    }

    if (difficulty) {
      conditions.push(`s.difficulty_type = '${difficulty}'`);
    }

    if (distanceRangesArray?.length > 0) {
      const distanceCondition = await this.distanceConditions(distanceRangesArray);

      // Add the distance condition to the overall conditions
      conditions.push(`(${distanceCondition})`);
    }

    if (familyFriendly) {
      conditions.push(`s.family_friendly_status = '${familyFriendly}'`);
    }

    if (peopleInteraction) {
      conditions.push(`s.people_interaction = '${peopleInteraction}'`);
    }

    if (status && status !== 'all') {
      const statusType = status === 'open';
      conditions.push(`s.open = '${statusType}'`);
    }

    return conditions;
  }

  getAllStagesOrderClause(sort: string, query: Prisma.Sql) {
    // Check if sortBy starts with "-" for descending order
    const isDescending = sort.startsWith('-');

    // Extract the column name from sortBy (remove "-" if present)
    const columnName = isDescending ? sort.slice(1) : sort;

    // Use a template string to construct the SQL query
    const sortOrder = isDescending ? Prisma.sql`DESC` : Prisma.sql`ASC`;

    switch (columnName) {
      case StageSortTypes.POPULAR:
        query = Prisma.sql`${query} ORDER BY (
          CASE WHEN s.reviews_count IS NULL OR s.reviews_count = 0 THEN 1
          ELSE (CAST(s.cumulative_reviews AS FLOAT) / CAST(s.reviews_count AS FLOAT))
          END
        ) DESC`;
        break;
      case 'number':
        query = Prisma.sql`${query} ORDER BY s.number ${sortOrder}`;
        break;
      case 'difficultyType':
        query = Prisma.sql`${query} ORDER BY CAST(s.difficulty_type AS CHAR) ${sortOrder}`;
        break;
      case 'distance':
        query = Prisma.sql`${query} ORDER BY s.distance ${sortOrder}`;
        break;
      case 'status':
        // Need to reverse since this is a boolean column
        const statusSortOrder = isDescending ? Prisma.sql`ASC` : Prisma.sql`DESC`;
        query = Prisma.sql`${query} ORDER BY s.open ${statusSortOrder}`;
        break;
      default:
        // Default to sorting by stages
        query = Prisma.sql`${query} ORDER BY s.number ASC`;
        break;
    }
    return query;
  }

  async getAllStages(userId: string, getStageDto?: GetStageDto): Promise<PaginatedResult<Stage>> {
    const {
      difficulty,
      tagIds,
      distanceRanges,
      familyFriendly,
      peopleInteraction,
      status = 'all',
      sort = StageSortTypes.STAGE,
      perPage: limit,
      pageNumber: page,
    } = typeof getStageDto !== 'undefined' ? sanitizeObject<GetStageDto>(getStageDto) : undefined;

    const tagTdsArray = tagIds ? tagIds.split(',').map((tag) => validator.trim(tag)) : undefined;
    const distanceRangesArray = distanceRanges ? distanceRanges.split(',') : undefined;
    const pageNumber = Number(page) || 1;
    const perPage = Number(limit) || 10;
    const offset = (pageNumber - 1) * perPage;

    let conditions = [];

    conditions = await this.getStageCustomfilterConditions(
      difficulty,
      tagTdsArray,
      distanceRangesArray,
      familyFriendly,
      peopleInteraction,
      status,
    );

    // Combine conditions using 'AND'
    const whereClause = conditions.join(' AND ');

    let query = Prisma.sql`SELECT
      s.id,
      s.distance,
      s.open,
      s.number,
      s.reviews_count as "reviewsCount",
      s.cumulative_reviews as "cumulativeReviews",
      s.estimated_duration as "estimatedDuration",
      s.open_time as "openTime",
      s.close_time as "closeTime",
      s.elevation_gain as "elevationGain",
      s.difficulty_type as "difficultyType",
      s.kml_file_key as "kmlFileKey",
      s.start_point as "startPoint",
      s.end_point as "endPoint",
      s.maximum_altitude as "maximumAltitude",
      s.family_friendly_status as "familyFriendly",
      s.people_interaction as "peopleInteraction",
      (
        SELECT JSON_AGG(json_build_object(
          'id', st.id,
          'name', stt.name,
          'locale', stt.locale_id
        ))
        FROM stage_tag_associations sta_sub
        LEFT JOIN stage_tags st ON sta_sub.stage_tag_id = st.id
        LEFT JOIN stage_tag_translations stt ON st.id = stt.stage_tag_id
        WHERE sta_sub.stage_id = s.id
      ) as "tags",
      (
        SELECT JSON_AGG(media_key)
        FROM (
          SELECT media_key
          FROM stage_media sm
          WHERE sm.stage_id = s.id and sm.media_type in ('MAIN_IMAGE', 'SUPPLIMENTARY_IMAGE')
          LIMIT 6
          ) subquery
      ) AS "stageMedia",
      (
        SELECT media_key
        FROM (
          SELECT media_key
          FROM stage_media sm
          WHERE sm.stage_id = s.id and sm.media_type = 'ELEVATION_GRAPH_IMAGE'
          order by sm.created_at desc
          LIMIT 1
          ) subquery
      ) AS "elevationImageKey",
      (
        SELECT media_key
        FROM (
          SELECT media_key
          FROM stage_media sm
          WHERE sm.stage_id = s.id and sm.media_type = 'MAIN_IMAGE'
          order by sm.created_at desc
          LIMIT 1
          ) subquery
      ) AS "mainImageKey",
      (
        SELECT JSON_AGG(json_build_object(
          'localeId', stt.locale_id,
          'stageHead', stt.stage_head,
          'stageTail', stt.stage_tail,
          'description', stt.description
        ))
        FROM stage_translations stt
        WHERE stt.stage_id = s.id
      ) as "translations",
      (
        SELECT JSON_AGG(json_build_object(
          'localeId', rt.locale_id,
          'regionId', str_sub.region_id,
          'name', rt.name,
          'localeId', rt.locale_id
        ))
        FROM stage_regions str_sub
        LEFT JOIN region_translations rt ON str_sub.region_id = rt.region_id
        WHERE str_sub.stage_id = s.id
      ) as "regions",
      EXISTS (
        SELECT 1
        FROM user_favourite_stages usf
        WHERE usf.stage_id = s.id AND usf.user_id = ${userId}::uuid
      ) as "isFavorite",
      s.updated_at as "updatedAt",
      s.created_at as "createdAt",
      COUNT(CASE WHEN sr.rating = 1 THEN 1 ELSE NULL END)::int as "ratingOneCount",
      COUNT(CASE WHEN sr.rating = 2 THEN 1 ELSE NULL END)::int as "ratingTwoCount",
      COUNT(CASE WHEN sr.rating = 3 THEN 1 ELSE NULL END)::int as "ratingThreeCount",
      COUNT(CASE WHEN sr.rating = 4 THEN 1 ELSE NULL END)::int as "ratingFourCount",
      COUNT(CASE WHEN sr.rating = 5 THEN 1 ELSE NULL END)::int as "ratingFiveCount"
    FROM
      stages s
    LEFT JOIN
      stage_reviews sr ON s.id = sr.stage_id
  `;
    const hasConditions = conditions.length > 0;
    // Add the WHERE clause only if conditions are present
    if (hasConditions) {
      query = Prisma.sql`${query} WHERE ${Prisma.raw(whereClause)}`;
    }

    // Add grouping by stage ID
    query = Prisma.sql`${query} GROUP BY s.id`;

    query = this.getAllStagesOrderClause(sort, query);

    query = Prisma.sql`${query} LIMIT ${perPage} OFFSET ${offset};`;

    const stages = await this.prisma.$queryRaw<Stage[]>(query);

    // Construct the totalQuery without LIMIT and OFFSET
    let totalQuery = Prisma.sql`SELECT COUNT(*)::int as total FROM stages s`;

    // Add the WHERE clause only if conditions are present
    if (hasConditions) {
      totalQuery = Prisma.sql`${totalQuery} WHERE ${Prisma.raw(whereClause)}`;
    }

    const totalResult = await this.prisma.$queryRaw<number>(totalQuery);

    const total = totalResult[0].total;
    const lastPage = Math.ceil(total / perPage);

    const paginationMeta = {
      total,
      lastPage,
      currentPage: pageNumber,
      perPage,
      prev: pageNumber > 1 ? pageNumber - 1 : null,
      next: pageNumber < lastPage ? pageNumber + 1 : null,
    };

    return {
      data: stages,
      meta: paginationMeta,
    };
  }

  async getStage(id: string, userId?: string): Promise<Stage | null> {
    const stage = await this.prisma.$queryRaw<Stage[]>`SELECT
      s.id,
      s.distance,
      s.open,
      s.number,
      s.reviews_count as "reviewsCount",
      s.cumulative_reviews as "cumulativeReviews",
      s.estimated_duration as "estimatedDuration",
      s.open_time as "openTime",
      s.close_time as "closeTime",
      s.elevation_gain as "elevationGain",
      s.difficulty_type as "difficultyType",
      s.kml_file_key as "kmlFileKey",
      s.start_point as "startPoint",
      s.end_point as "endPoint",
      s.maximum_altitude as "maximumAltitude",
      s.family_friendly_status as "familyFriendly",
      s.people_interaction as "peopleInteraction",
      (
        SELECT JSON_AGG(json_build_object(
          'id', st.id,
          'name', stt.name,
          'locale', stt.locale_id
        ))
        FROM stage_tag_associations sta_sub
        LEFT JOIN stage_tags st ON sta_sub.stage_tag_id = st.id
        LEFT JOIN stage_tag_translations stt ON st.id = stt.stage_tag_id
        WHERE sta_sub.stage_id = s.id
      ) as "tags",
      (
        SELECT JSON_AGG(media_key)
        FROM (
          SELECT media_key
          FROM stage_media sm
          WHERE sm.stage_id = s.id and sm.media_type in ('MAIN_IMAGE', 'SUPPLIMENTARY_IMAGE')
          LIMIT 6
          ) subquery
      ) AS "stageMedia",
      (
        SELECT media_key
        FROM (
          SELECT media_key
          FROM stage_media sm
          WHERE sm.stage_id = s.id and sm.media_type = 'ELEVATION_GRAPH_IMAGE'
          order by sm.created_at desc
          LIMIT 1
          ) subquery
      ) AS "elevationImageKey",
      (
        SELECT media_key
        FROM (
          SELECT media_key
          FROM stage_media sm
          WHERE sm.stage_id = s.id and sm.media_type = 'MAIN_IMAGE'
          order by sm.created_at desc
          LIMIT 1
          ) subquery
      ) AS "mainImageKey",
      (
        SELECT JSON_AGG(json_build_object(
          'localeId', stt.locale_id,
          'stageHead', stt.stage_head,
          'stageTail', stt.stage_tail,
          'description', stt.description
        ))
        FROM stage_translations stt
        WHERE stt.stage_id = s.id
      ) as "translations",
      (
        SELECT JSON_AGG(json_build_object(
          'localeId', rt.locale_id,
          'regionId', str_sub.region_id,
          'name', rt.name
        ))
        FROM stage_regions str_sub
        LEFT JOIN region_translations rt ON str_sub.region_id = rt.region_id
        WHERE str_sub.stage_id = s.id
      ) as "regions",
      EXISTS (
        SELECT 1
        FROM user_favourite_stages usf
        WHERE usf.stage_id = s.id AND usf.user_id = ${userId}::uuid
      ) as "isFavorite",
      s.updated_at as "updatedAt",
      s.created_at as "createdAt",
      COUNT(CASE WHEN sr.rating = 1 THEN 1 ELSE NULL END)::int as "ratingOneCount",
      COUNT(CASE WHEN sr.rating = 2 THEN 1 ELSE NULL END)::int as "ratingTwoCount",
      COUNT(CASE WHEN sr.rating = 3 THEN 1 ELSE NULL END)::int as "ratingThreeCount",
      COUNT(CASE WHEN sr.rating = 4 THEN 1 ELSE NULL END)::int as "ratingFourCount",
      COUNT(CASE WHEN sr.rating = 5 THEN 1 ELSE NULL END)::int as "ratingFiveCount"
    FROM
      stages s
    LEFT JOIN
      stage_reviews sr ON s.id = sr.stage_id
    WHERE s.id = ${id}::uuid
    GROUP BY s.id
    LIMIT 1`;
    if (stage.length === 0) throw new NotFoundException();
    return stage[0];
  }

  async createStage(data: StageDatabaseDto): Promise<Stage> {
    try {
      return await this.prisma.stage.create({
        data: { ...data, startPoint: [], endPoint: [] },
      });
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'stage' }, level: 'error' });
      throw new InternalServerErrorException();
    }
  }

  async updateStage(id: string, data: StageDatabaseDto): Promise<Stage> {
    try {
      return await this.prisma.stage.update({
        where: { id },
        data,
      });
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'stage' }, level: 'error' });
      throw new InternalServerErrorException();
    }
  }

  async deleteStage(id: string): Promise<string> {
    const stage = await this.prisma.stage.delete({ where: { id } });
    return stage.id;
  }

  async getTopPopularStages(userId: string): Promise<Stage[]> {
    const stages = await this.prisma.$queryRaw<Stage[]>`
    SELECT
      s.id,
      s.distance,
      s.open,
      s.number,
      s.reviews_count as "reviewsCount",
      s.cumulative_reviews as "cumulativeReviews",
      s.estimated_duration as "estimatedDuration",
      s.open_time as "openTime",
      s.close_time as "closeTime",
      s.elevation_gain as "elevationGain",
      s.kml_file_key as "kmlFileKey",
      s.start_point as "startPoint",
      s.end_point as "endPoint",
      s.maximum_altitude as "maximumAltitude",
      s.difficulty_type as "difficultyType",
      s.family_friendly_status as "familyFriendly",
      s.people_interaction as "peopleInteraction",
      (
        SELECT JSON_AGG(json_build_object(
          'id', st.id,
          'name', stt.name,
          'locale', stt.locale_id
        ))
        FROM stage_tag_associations sta_sub
        LEFT JOIN stage_tags st ON sta_sub.stage_tag_id = st.id
        LEFT JOIN stage_tag_translations stt ON st.id = stt.stage_tag_id
        WHERE sta_sub.stage_id = s.id
      ) as "tags",
      (
        SELECT JSON_AGG(media_key)
        FROM (
          SELECT media_key
          FROM stage_media sm
          WHERE sm.stage_id = s.id AND sm.media_type = 'MAIN_IMAGE'
          ) subquery
      ) AS "stageMedia",
      (
        SELECT media_key
        FROM (
          SELECT media_key
          FROM stage_media sm
          WHERE sm.stage_id = s.id and sm.media_type = 'ELEVATION_GRAPH_IMAGE'
          order by sm.created_at desc
          LIMIT 1
          ) subquery
      ) AS "elevationImageKey",
      (
        SELECT media_key
        FROM (
          SELECT media_key
          FROM stage_media sm
          WHERE sm.stage_id = s.id and sm.media_type = 'MAIN_IMAGE'
          order by sm.created_at desc
          LIMIT 1
          ) subquery
      ) AS "mainImageKey",
      (
        SELECT JSON_AGG(json_build_object(
          'localeId', stt.locale_id,
          'stageHead', stt.stage_head,
          'stageTail', stt.stage_tail,
          'description', stt.description
        ))
        FROM stage_translations stt
        WHERE stt.stage_id = s.id
      ) as "translations",
      (
        SELECT JSON_AGG(json_build_object(
          'localeId', rt.locale_id,
          'regionId', str_sub.region_id,
          'name', rt.name
        ))
        FROM stage_regions str_sub
        LEFT JOIN region_translations rt ON str_sub.region_id = rt.region_id
        WHERE str_sub.stage_id = s.id
      ) as "regions",
      EXISTS (
        SELECT 1
        FROM user_favourite_stages usf
        WHERE usf.stage_id = s.id AND usf.user_id = ${userId}::uuid
      ) as "isFavorite",
      s.updated_at as "updatedAt",
      s.created_at as "createdAt"
    FROM
      stages s
    LEFT JOIN
      stage_reviews sr ON s.id = sr.stage_id
    WHERE
      (s.reviews_count >= 10
      OR (
        s.reviews_count < 10
        AND NOT EXISTS (SELECT 1 FROM stages WHERE reviews_count >= 10)
      )) AND s.open = true -- Filter for open stages
    GROUP BY
      s.id
    ORDER BY
      CASE
        WHEN s.reviews_count >= 10 THEN -- Order by cumulativeReviews / reviewsCount in descending order when there are such stages
          CAST(s.cumulative_reviews AS FLOAT) / NULLIF(CAST(s.reviews_count AS FLOAT), 0)
      ELSE
        NULL
      END DESC,
      CASE
        WHEN s.reviews_count < 10 THEN -- Order by s.number in ascending order when there are no such stages
          s.number
        ELSE
          NULL
      END ASC
    LIMIT 10;
  `;

    return stages;
  }

  async getActivatedUsersByStage(
    stageId: string,
    perPage: number,
    pageNumber: number,
    field?: string,
    value?: string,
    reservedFor?: string,
  ): Promise<PaginatedResult<Passes>> {
    const paginate: PaginateFunction = paginator({ perPage });

    const whereCondition: Record<string, any> = {
      stageId,
      activated: true,
    };

    if (field && value) {
      whereCondition.user = {
        [field]: {
          contains: value,
          mode: 'insensitive', // Perform case-insensitive search
        },
      };
    }

    if (reservedFor) {
      // Parse the reservedFor string into a Date object
      const reservedForDate = new Date(reservedFor);

      // Check if parsing was successful
      if (!isNaN(reservedForDate.getTime())) {
        whereCondition.reservedFor = reservedForDate;
      }
    }

    return await paginate(
      this.prisma.passes,
      {
        where: whereCondition,
        include: {
          user: true,
          userTrailTracking: true,
        },
        orderBy: { createdAt: 'desc' },
      },
      {
        page: pageNumber,
      },
    );
  }

  async getStagesWithSameStageNumber(stageNumber: number): Promise<number> {
    return await this.prisma.stage.count({ where: { number: stageNumber } });
  }
}
