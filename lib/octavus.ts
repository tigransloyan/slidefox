import 'server-only';
import { OctavusClient } from '@octavus/server-sdk';

export const octavus = new OctavusClient({
  baseUrl: process.env.OCTAVUS_API_URL!,
  apiKey: process.env.OCTAVUS_API_KEY!,
});

export const AGENT_ID = process.env.OCTAVUS_AGENT_ID!;
