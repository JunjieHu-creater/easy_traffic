import { Vehicle, VehicleType, SimulationStats, SimulationConfig } from '../types';

// Physics Constants
const LANE_WIDTH = 3.5; // meters
const DT = 1 / 60; // Integration step (s)
const IDM_DELTA = 4;
const JAM_DISTANCE = 2; // m
const COMFORT_DECEL = 2.0; // m/s^2 (b)
const MOBIL_THRESHOLD = 0.1; // a_thr (switching threshold)
const MOBIL_BIAS = 0.2; // Right lane bias (keep right directive)

export class TrafficModel {
  vehicles: Vehicle[] = [];
  roadLength: number = 5000;
  lanes: number = 3;
  nextId: number = 1;
  timeSinceLastSpawn: number = 0;
  fdPoints: {k: number, q: number}[] = []; // History for Fundamental Diagram
  statsTimer: number = 0;
  
  // Incident management
  blockedLane: number | null = null;
  blockedLocation: number | null = null;

  constructor(roadLength: number = 5000) {
    this.roadLength = roadLength;
  }

  reset() {
    this.vehicles = [];
    this.nextId = 1;
    this.timeSinceLastSpawn = 0;
    this.blockedLane = null;
    this.blockedLocation = null;
    this.fdPoints = [];
  }

  triggerAccident() {
    const candidate = this.vehicles.find(v => v.lane === 1 && v.x > 1000 && v.x < 4000);
    if (candidate) {
      candidate.v = 0;
      candidate.color = '#ef4444'; 
      this.blockedLane = candidate.lane;
      this.blockedLocation = candidate.x;
      (candidate as any).isCrashed = true;
      setTimeout(() => {
        if (candidate) {
            (candidate as any).isCrashed = false;
            // Restore color based on type
            candidate.color = candidate.type === VehicleType.TRUCK ? '#a78bfa' : this.getCarColor(candidate.targetSpeed);
        }
        this.blockedLane = null;
        this.blockedLocation = null;
      }, 8000); // 8 seconds blockage
    }
  }

  getLeader(vehicle: Vehicle, targetLane: number): Vehicle | null {
    let minDist = Infinity;
    let leader: Vehicle | null = null;
    
    // Optimization: Vehicles are sorted by X descending in step()
    
    for (const other of this.vehicles) {
      if (other.id === vehicle.id) continue;
      if (other.lane !== targetLane) continue;
      
      let dist = other.x - vehicle.x;
      if (dist > 0 && dist < minDist) {
        minDist = dist;
        leader = other;
      }
    }
    return leader;
  }

  getFollower(vehicle: Vehicle, targetLane: number): Vehicle | null {
    let minDist = Infinity;
    let follower: Vehicle | null = null;
    
    for (const other of this.vehicles) {
      if (other.id === vehicle.id) continue;
      if (other.lane !== targetLane) continue;
      
      let dist = vehicle.x - other.x;
      if (dist > 0 && dist < minDist) {
        minDist = dist;
        follower = other;
      }
    }
    return follower;
  }

  // Intelligent Driver Model (IDM)
  calculateAcceleration(
      v: number, 
      vLeader: number | null, 
      gap: number | null, 
      desiredSpeed: number,
      config: SimulationConfig
  ): number {
    const { maxAccel, safeTimeGap } = config;
    
    // Free road term
    const a_free = maxAccel * (1 - Math.pow(v / desiredSpeed, IDM_DELTA));
    
    if (gap === null || vLeader === null) return a_free;

    // Interaction term
    const delta_v = v - vLeader;
    const s_star = JAM_DISTANCE + v * safeTimeGap + (v * delta_v) / (2 * Math.sqrt(maxAccel * COMFORT_DECEL));
    
    // Prevent division by zero or negative gap issues physically (crash)
    const effectiveGap = Math.max(0.1, gap);
    const a_int = -maxAccel * Math.pow(s_star / effectiveGap, 2);

    return a_free + a_int;
  }

  step(config: SimulationConfig) {
    const dt = DT * config.timeScale;
    
    // Sort vehicles by position (descending)
    this.vehicles.sort((a, b) => b.x - a.x);

    // 1. Calculate accelerations and Lane Changes
    for (const veh of this.vehicles) {
      if ((veh as any).isCrashed) {
        veh.a = 0;
        veh.v = 0;
        continue;
      }

      const leader = this.getLeader(veh, veh.lane);
      const gap = leader ? leader.x - veh.x - leader.length : null;
      const vLeader = leader ? leader.v : null;

      // Current acceleration (IDM)
      let accCurrent = this.calculateAcceleration(veh.v, vLeader, gap, veh.targetSpeed, config);
      
      // Add Perceptual Noise (Key for Ghost Jams)
      // Random fluctuation in acceleration to simulate human inability to hold perfect constant speed
      if (config.accelerationNoise > 0 && veh.v > 1) {
         accCurrent += (Math.random() - 0.5) * config.accelerationNoise;
      }

      veh.a = accCurrent;

      // MOBIL Lane Change Logic
      if (veh.laneChangeTimer <= 0) {
        this.checkLaneChange(veh, accCurrent, config);
      } else {
        veh.laneChangeTimer -= dt;
      }
    }

    // 2. Integration (Euler)
    for (let i = this.vehicles.length - 1; i >= 0; i--) {
      const veh = this.vehicles[i];
      
      veh.v += veh.a * dt;
      if (veh.v < 0) veh.v = 0; // No reversing
      
      veh.x += veh.v * dt;

      // Visual lane interpolation
      if (Math.abs(veh.y - veh.lane) > 0.05) {
        const dir = Math.sign(veh.lane - veh.y);
        veh.y += dir * 2.5 * dt; // Lateral speed ~2.5 m/s
      } else {
        veh.y = veh.lane;
        veh.laneChangeDirection = 0; // Reset signal when change complete
      }

      // Despawn
      if (veh.x > this.roadLength) {
        this.vehicles.splice(i, 1);
      }
    }

    // 3. Spawning
    this.handleSpawning(dt, config);
    
    // 4. Data Collection for Fundamental Diagram (approx every 1 sec sim time)
    this.statsTimer += dt;
    if (this.statsTimer > 1.0) {
        const stats = this.getStats();
        if (stats.count > 0) {
            this.fdPoints.push({ k: stats.density, q: stats.flow });
            if (this.fdPoints.length > 200) this.fdPoints.shift(); // Keep last 200 points
        }
        this.statsTimer = 0;
    }
  }

  checkLaneChange(veh: Vehicle, accCurrent: number, config: SimulationConfig) {
    // MOBIL Algorithm
    // Criterion: (a_c_new - a_c_old) + p * ( (a_n_new - a_n_old) + (a_o_new - a_o_old) ) > threshold
    
    const candidates = [];
    if (veh.lane > 0) candidates.push(veh.lane - 1);
    if (veh.lane < this.lanes - 1) candidates.push(veh.lane + 1);

    for (const targetLane of candidates) {
      const newLeader = this.getLeader(veh, targetLane);
      const newFollower = this.getFollower(veh, targetLane);
      const oldFollower = this.getFollower(veh, veh.lane);

      // 1. Safety Criterion: New follower deceleration must not exceed safe limit
      // "Respect the safe deceleration b_safe" (e.g., -4 m/s^2)
      if (newFollower) {
        const gapBack = veh.x - newFollower.x - veh.length;
        const accFollowerNew = this.calculateAcceleration(
            newFollower.v, veh.v, gapBack, newFollower.targetSpeed, config
        );
        if (accFollowerNew < -3.0) continue; // Too dangerous for new follower
      }

      // 2. Incentive Criterion
      const gapNew = newLeader ? newLeader.x - veh.x - newLeader.length : null;
      const vNewLeader = newLeader ? newLeader.v : null;
      const accNew = this.calculateAcceleration(veh.v, vNewLeader, gapNew, veh.targetSpeed, config);
      
      // Ego incentive
      const egoBenefit = accNew - accCurrent;

      // Politeness: How much do we hurt/help the old follower?
      let politenessTerm = 0;
      if (oldFollower) {
         // Current accel of old follower (with me as leader)
         const gapOld = veh.x - oldFollower.x - veh.length;
         const accOldFollowerCurr = this.calculateAcceleration(oldFollower.v, veh.v, gapOld, oldFollower.targetSpeed, config);
         
         // New accel of old follower (with my current leader becoming their leader)
         const myLeader = this.getLeader(veh, veh.lane); // My current leader
         const gapOldFuture = myLeader ? myLeader.x - oldFollower.x - myLeader.length : null;
         const vMyLeader = myLeader ? myLeader.v : null;
         const accOldFollowerNew = this.calculateAcceleration(oldFollower.v, vMyLeader, gapOldFuture, oldFollower.targetSpeed, config);
         
         politenessTerm = accOldFollowerNew - accOldFollowerCurr;
      }
      
      // Add politeness of new follower? Usually MOBIL considers both back vehicles. 
      // Simplified: Just consider the gap created behind.

      let totalIncentive = egoBenefit + config.politeness * politenessTerm;

      // Right lane bias (European rules)
      if (targetLane > veh.lane) totalIncentive += MOBIL_BIAS; 
      if (targetLane < veh.lane) totalIncentive -= MOBIL_BIAS;

      if (totalIncentive > MOBIL_THRESHOLD) {
        veh.lane = targetLane;
        veh.laneChangeTimer = 3.0; // 3 seconds cooldown
        veh.laneChangeDirection = (targetLane > veh.y) ? 1 : -1;
        return; 
      }
    }
  }

  handleSpawning(dt: number, config: SimulationConfig) {
    this.timeSinceLastSpawn += dt;
    const { inflowRate, truckRatio } = config;
    
    // Dynamic Inflow logic
    const spawnRatePerSec = inflowRate / 3600;
    const avgInterarrivalTime = 1 / spawnRatePerSec;

    if (this.timeSinceLastSpawn > (Math.random() * 0.4 + 0.8) * avgInterarrivalTime) { // Slightly more regular than pure Poisson to maximize flow
      
      // Try to spawn in the lane with most space
      const lanes = [0, 1, 2];
      // Check last car position in each lane
      const lastPos = lanes.map(l => {
          const last = this.vehicles.filter(v => v.lane === l).reduce((prev, curr) => (prev && prev.x < curr.x) ? prev : curr, null as Vehicle | null);
          return last ? last.x : Infinity;
      });

      // Prefer lane with largest distance from start (emptiest at entry)
      const bestLane = lanes.reduce((i, j) => (lastPos[i] > lastPos[j] ? i : j));
      
      if (lastPos[bestLane] > 40) { // Ensure clear entry
           this.spawnVehicle(bestLane, truckRatio, config);
           this.timeSinceLastSpawn = 0;
      }
    }
  }

  spawnVehicle(lane: number, truckRatio: number, config: SimulationConfig) {
    const isTruck = Math.random() < truckRatio;
    // Trucks slower: 85km/h +- 5. Cars: 120km/h +- 10.
    const speedKmH = isTruck ? (85 + (Math.random()-0.5)*10) : (110 + (Math.random()-0.5)*20);
    const targetSpeed = speedKmH / 3.6;

    this.vehicles.push({
      id: this.nextId++,
      x: 0,
      y: lane,
      lane: lane,
      v: targetSpeed * 0.9, // Enter near target speed
      a: 0,
      length: isTruck ? 14 : 4.5,
      width: isTruck ? 2.6 : 2.0,
      type: isTruck ? VehicleType.TRUCK : VehicleType.CAR,
      color: isTruck ? '#a78bfa' : this.getCarColor(targetSpeed), // Purple-ish trucks
      laneChangeTimer: 0,
      laneChangeDirection: 0,
      targetSpeed: targetSpeed
    });
  }

  getCarColor(targetSpeed: number): string {
    // Academic visualization: Color by Desired Speed (Aggressiveness)
    // Fast (Cyan) -> Slow (Yellow/Orange)
    if (targetSpeed > 32) return '#06b6d4'; // Cyan (Fast)
    if (targetSpeed > 28) return '#10b981'; // Green
    return '#f59e0b'; // Amber (Slow)
  }

  getStats(): SimulationStats {
    const count = this.vehicles.length;
    // Return copy of points to avoid mutating React state
    if (count === 0) return { count: 0, avgSpeed: 0, density: 0, flow: 0, points: [...this.fdPoints] };

    const totalV = this.vehicles.reduce((sum, v) => sum + v.v, 0);
    const avgV = (totalV / count) * 3.6; // km/h
    
    // Density: veh / km
    const density = count / (this.roadLength / 1000);
    
    // Flow q = k * v (Hydrodynamic relation)
    const flow = density * avgV; 

    return {
      count,
      avgSpeed: avgV,
      density,
      flow,
      points: [...this.fdPoints] // Return shallow copy!
    };
  }
}