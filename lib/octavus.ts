import 'server-only';
import { OctavusClient } from '@octavus/server-sdk';

let _octavus: OctavusClient | null = null;

export function getOctavus(): OctavusClient {
  if (!_octavus) {
    _octavus = new OctavusClient({
      baseUrl: process.env.OCTAVUS_API_URL!,
      apiKey: process.env.OCTAVUS_API_KEY!,
    });
  }
  return _octavus;
}

export const AGENT_ID = process.env.OCTAVUS_AGENT_ID!;
