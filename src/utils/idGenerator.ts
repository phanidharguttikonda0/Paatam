import { Sonyflake } from 'sonyflake';
import os from 'os';

/**
 * Derives a machine ID based on the lower 16 bits of the local private IP address.
 * This ensures that ECS containers in the same VPC do not collide.
 */
function getMachineIdFromIp(): number {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    const iface = interfaces[name];
    if (!iface) continue;

    for (const alias of iface) {
      if (alias.family === 'IPv4' && !alias.internal) {
        // e.g. '192.168.1.100' -> split into [192, 168, 1, 100]
        const parts = alias.address.split('.').map(Number);
        if (parts.length === 4) {
          // Take the lower 16 bits: (parts[2] << 8) + parts[3]
          return (parts[2] << 8) + parts[3];
        }
      }
    }
  }
  return Math.floor(Math.random() * 65535); // Fallback for local dev without external IP
}

// Initialize Sonyflake
const sonyflake = new Sonyflake({
  machineId: getMachineIdFromIp(),
  // Custom startTime (e.g., Oct 1, 2026) to maximize ID lifespan
  startTime: Date.UTC(2026, 9, 1),
});

export const idGenerator = {
  /**
   * Generates a 64-bit unique BigInt ID using the Sonyflake algorithm.
   */
  nextId(): bigint {
    return BigInt(sonyflake.nextId());
  }
};
