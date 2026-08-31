import { Request, Response, NextFunction } from 'express';
import { query } from '../config/database.js';

export const getPassengers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tier, search } = req.query;
    let sql = `
      SELECT 
        p.id,
        p.full_name AS "fullName",
        p.phone,
        p.email,
        COALESCE(pl.tier, 'BRONZE') AS tier,
        COALESCE(pl.total_trips, 0) AS "totalTrips",
        COALESCE(pl.total_spent::NUMERIC, 0) AS "totalSpentLkr",
        COALESCE(pl.points_balance, 0) AS "loyaltyPoints",
        p.created_at::DATE::TEXT AS "joinedAt"
      FROM core.passengers p
      LEFT JOIN core.passenger_loyalty pl ON pl.passenger_id = p.id
      WHERE p.deleted_at IS NULL
    `;

    const params: any[] = [];
    if (tier) {
      params.push(tier);
      sql += ` AND pl.tier = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (p.full_name ILIKE $${params.length} OR p.phone ILIKE $${params.length} OR p.email ILIKE $${params.length})`;
    }

    sql += ` ORDER BY COALESCE(pl.total_spent, 0) DESC, p.created_at DESC LIMIT 100`;
    const result = await query(sql, params);

    res.json(
      result.rows.map((row) => ({
        ...row,
        totalTrips: Number(row.totalTrips || 0),
        totalSpentLkr: Number(row.totalSpentLkr || 0),
        loyaltyPoints: Number(row.loyaltyPoints || 0),
      }))
    );
  } catch (error) {
    next(error);
  }
};
