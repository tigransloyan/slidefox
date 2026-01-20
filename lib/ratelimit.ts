import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Create Redis client from environment variables (auto-populated by Vercel integration)
const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

// Rate limit: 20 requests per hour per IP
// Adjust these values based on your expected usage and cost tolerance
export const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, '1 h'),
  analytics: true,
  prefix: 'slidefox',
});
