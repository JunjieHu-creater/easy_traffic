export enum VehicleType {
  CAR = 'CAR',
  TRUCK = 'TRUCK'
}

export interface Vehicle {
  id: number;
  x: number;          // Position (m)
  y: number;          // Lateral position (lane index 0-2, continuous for animation)
  lane: number;       // Target lane index (integer)
  v: number;          // Speed (m/s)
  a: number;          // Acceleration (m/s^2)
  length: number;     // Length (m)
  width: number;      // Width (m)
  color: string;      // Color hex
  type: VehicleType;
  laneChangeTimer: number; // Cooldown for lane changes
  laneChangeDirection: -1 | 0 | 1; // -1 left, 1 right, 0 none
  targetSpeed: number; // Desired speed (m/s)
}

export interface SimulationStats {
  count: number;
  avgSpeed: number; // km/h
  density: number;  // veh/km
  flow: number;     // veh/h (estimated)
  points: {k: number, q: number}[]; // For Fundamental Diagram (k=density, q=flow)
}

export interface SimulationConfig {
  inflowRate: number; // veh/h
  timeScale: number;
  truckRatio: number; // 0-1
  isPaused: boolean;
  roadLength: number; // meters
  
  // Advanced Physics Parameters
  politeness: number; // MOBIL 'p' factor (0=egoistic, 1=altruistic)
  safeTimeGap: number; // IDM 'T' (seconds)
  maxAccel: number; // IDM 'a' (m/s^2)
  accelerationNoise: number; // 0-1 magnitude of random noise
}