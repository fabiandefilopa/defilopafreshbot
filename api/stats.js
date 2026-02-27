/**
 * Bot Statistics Endpoint
 * Access: https://defilo.vercel.app/api/stats
 */

// Shared metrics with webhook.js
import { getMetrics } from './webhook.js';

export default async function handler(req, res) {
  try {
    const metrics = getMetrics();
    const uptime = process.uptime ? process.uptime() : 0;

    const stats = {
      status: 'running',
      uptime_seconds: Math.floor(uptime),
      uptime_readable: formatUptime(uptime),
      metrics: {
        total_requests: metrics.requestCount,
        active_users: metrics.activeUsers.size,
        last_request: metrics.lastRequestTime
          ? new Date(metrics.lastRequestTime).toISOString()
          : 'Never',
        time_since_last_request_ms: metrics.lastRequestTime
          ? Date.now() - metrics.lastRequestTime
          : null
      },
      users: Array.from(metrics.activeUsers).map(userId => ({
        user_id: userId,
        requests: metrics.requestsPerUser.get(userId) || 0
      })),
      health: {
        status: metrics.lastRequestTime && (Date.now() - metrics.lastRequestTime) < 300000
          ? 'healthy'
          : 'idle',
        message: metrics.lastRequestTime && (Date.now() - metrics.lastRequestTime) < 300000
          ? 'Bot is active and responding'
          : 'Bot is idle (no requests in last 5 minutes)'
      }
    };

    res.status(200).json(stats);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get stats',
      message: error.message
    });
  }
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
}
