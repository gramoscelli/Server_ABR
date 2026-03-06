/**
 * Date Filter Utilities
 * Helpers for building inclusive date range queries with Sequelize
 *
 * When using DataTypes.DATE (DATETIME) with timezone: '+00:00', dates are stored in UTC.
 * Date strings passed as filter values may be subject to local timezone conversion.
 * These utilities use explicit UTC Date objects to ensure correct inclusive filtering.
 */

const { Op } = require('sequelize');

/**
 * Build a Sequelize where clause for an inclusive date range filter.
 * Uses UTC Date objects to avoid timezone conversion issues.
 *
 * @param {string} start_date - Start date string (YYYY-MM-DD), inclusive
 * @param {string} end_date - End date string (YYYY-MM-DD), inclusive of entire day
 * @returns {Object|null} Sequelize where condition for the date field, or null if no dates provided
 */
function buildDateFilter(start_date, end_date) {
  if (!start_date && !end_date) return null;

  const filter = {};
  if (start_date) {
    filter[Op.gte] = new Date(`${start_date}T00:00:00.000Z`);
  }
  if (end_date) {
    filter[Op.lte] = new Date(`${end_date}T23:59:59.999Z`);
  }
  return filter;
}

module.exports = { buildDateFilter };
