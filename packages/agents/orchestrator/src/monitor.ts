import { AgentType } from '@closepilot/core';

/**
 * Agent health status
 */
export enum AgentHealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  CIRCUIT_OPEN = 'circuit_open',
}

/**
 * Agent execution metric
 */
export interface AgentMetric {
  agentType: AgentType;
  executionCount: number;
  successCount: number;
  failureCount: number;
  averageDuration: number;
  lastExecutionTime: Date;
  lastFailureTime?: Date;
  successRate: number;
}

/**
 * Circuit breaker state
 */
export interface CircuitBreakerState {
  agentType: AgentType;
  state: 'closed' | 'open' | 'half_open';
  failureCount: number;
  lastFailureTime?: Date;
  openedAt?: Date;
  threshold: number;
  timeout: number;
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  agentType: AgentType;
  status: AgentHealthStatus;
  timestamp: Date;
  metrics: AgentMetric;
  circuitBreaker: CircuitBreakerState;
  issues: string[];
}

/**
 * System health report
 */
export interface SystemHealthReport {
  timestamp: Date;
  overallStatus: AgentHealthStatus;
  agentHealth: Map<AgentType, HealthCheckResult>;
  summary: {
    totalAgents: number;
    healthyAgents: number;
    degradedAgents: number;
    unhealthyAgents: number;
    circuitOpenAgents: number;
  };
}

/**
 * Agent Health Monitor
 *
 * Monitors agent health, tracks performance metrics,
 * detects failures, and implements circuit breaker pattern.
 */
export class AgentHealthMonitor {
  private metrics: Map<AgentType, AgentMetric>;
  private circuitBreakers: Map<AgentType, CircuitBreakerState>;
  private failureThreshold = 5;
  private circuitBreakerTimeout = 60000; // 1 minute
  private degradationThreshold = 0.8; // 80% success rate

  constructor() {
    this.metrics = new Map();
    this.circuitBreakers = new Map();
    this.initializeMetrics();
  }

  /**
   * Initialize metrics for all agent types
   */
  private initializeMetrics(): void {
    const agentTypes = [
      AgentType.INGESTION,
      AgentType.ENRICHMENT,
      AgentType.SCOPING,
      AgentType.PROPOSAL,
      AgentType.CRM_SYNC,
      AgentType.ORCHESTRATOR,
    ];

    agentTypes.forEach(agentType => {
      this.metrics.set(agentType, {
        agentType,
        executionCount: 0,
        successCount: 0,
        failureCount: 0,
        averageDuration: 0,
        lastExecutionTime: new Date(),
        successRate: 1.0,
      });

      this.circuitBreakers.set(agentType, {
        agentType,
        state: 'closed',
        failureCount: 0,
        threshold: this.failureThreshold,
        timeout: this.circuitBreakerTimeout,
      });
    });
  }

  /**
   * Record agent execution
   */
  recordExecution(
    agentType: AgentType,
    success: boolean,
    duration: number
  ): void {
    const metric = this.metrics.get(agentType);
    if (!metric) return;

    metric.executionCount++;
    metric.lastExecutionTime = new Date();

    if (success) {
      metric.successCount++;
      // Update circuit breaker on success
      this.handleCircuitBreakerSuccess(agentType);
    } else {
      metric.failureCount++;
      metric.lastFailureTime = new Date();
      // Update circuit breaker on failure
      this.handleCircuitBreakerFailure(agentType);
    }

    // Recalculate average duration
    const totalDuration =
      metric.averageDuration * (metric.executionCount - 1) + duration;
    metric.averageDuration = totalDuration / metric.executionCount;

    // Calculate success rate
    metric.successRate =
      metric.executionCount > 0
        ? metric.successCount / metric.executionCount
        : 1.0;

    this.metrics.set(agentType, metric);
  }

  /**
   * Handle circuit breaker success
   */
  private handleCircuitBreakerSuccess(agentType: AgentType): void {
    const breaker = this.circuitBreakers.get(agentType);
    if (!breaker) return;

    if (breaker.state === 'half_open') {
      // Success in half-open state, close the circuit
      breaker.state = 'closed';
      breaker.failureCount = 0;
      this.circuitBreakers.set(agentType, breaker);
    }
  }

  /**
   * Handle circuit breaker failure
   */
  private handleCircuitBreakerFailure(agentType: AgentType): void {
    const breaker = this.circuitBreakers.get(agentType);
    if (!breaker) return;

    breaker.failureCount++;
    breaker.lastFailureTime = new Date();

    if (breaker.failureCount >= breaker.threshold) {
      breaker.state = 'open';
      breaker.openedAt = new Date();
    }

    this.circuitBreakers.set(agentType, breaker);
  }

  /**
   * Check if agent can execute (circuit breaker check)
   */
  canExecute(agentType: AgentType): boolean {
    const breaker = this.circuitBreakers.get(agentType);
    if (!breaker) return true;

    // Check if circuit should reset to half-open
    if (
      breaker.state === 'open' &&
      breaker.openedAt &&
      Date.now() - breaker.openedAt.getTime() > breaker.timeout
    ) {
      breaker.state = 'half_open';
      breaker.failureCount = 0;
      this.circuitBreakers.set(agentType, breaker);
    }

    return breaker.state !== 'open';
  }

  /**
   * Get health status for agent
   */
  getHealthStatus(agentType: AgentType): AgentHealthStatus {
    const metric = this.metrics.get(agentType);
    const breaker = this.circuitBreakers.get(agentType);

    if (!metric || !breaker) {
      return AgentHealthStatus.UNHEALTHY;
    }

    // Check circuit breaker first
    if (breaker.state === 'open') {
      return AgentHealthStatus.CIRCUIT_OPEN;
    }

    // Check success rate
    if (metric.successRate < this.degradationThreshold) {
      return AgentHealthStatus.DEGRADED;
    }

    // Check if recently failed
    if (
      metric.lastFailureTime &&
      Date.now() - metric.lastFailureTime.getTime() < 300000
    ) {
      return AgentHealthStatus.DEGRADED;
    }

    return AgentHealthStatus.HEALTHY;
  }

  /**
   * Perform health check for all agents
   */
  performHealthCheck(): HealthCheckResult[] {
    const results: HealthCheckResult[] = [];

    for (const agentType of this.metrics.keys()) {
      const metric = this.metrics.get(agentType)!;
      const breaker = this.circuitBreakers.get(agentType)!;
      const status = this.getHealthStatus(agentType);

      const issues: string[] = [];

      if (breaker.state === 'open') {
        issues.push(`Circuit breaker open after ${breaker.failureCount} failures`);
      }

      if (metric.successRate < this.degradationThreshold) {
        issues.push(
          `Low success rate: ${(metric.successRate * 100).toFixed(1)}%`
        );
      }

      if (metric.failureCount > 0) {
        issues.push(`${metric.failureCount} failures recorded`);
      }

      results.push({
        agentType,
        status,
        timestamp: new Date(),
        metrics: metric,
        circuitBreaker: breaker,
        issues,
      });
    }

    return results;
  }

  /**
   * Generate system health report
   */
  generateHealthReport(): SystemHealthReport {
    const healthChecks = this.performHealthCheck();

    const agentHealth = new Map<AgentType, HealthCheckResult>();
    let healthyCount = 0;
    let degradedCount = 0;
    let unhealthyCount = 0;
    let circuitOpenCount = 0;

    healthChecks.forEach(check => {
      agentHealth.set(check.agentType, check);

      switch (check.status) {
        case AgentHealthStatus.HEALTHY:
          healthyCount++;
          break;
        case AgentHealthStatus.DEGRADED:
          degradedCount++;
          break;
        case AgentHealthStatus.UNHEALTHY:
          unhealthyCount++;
          break;
        case AgentHealthStatus.CIRCUIT_OPEN:
          circuitOpenCount++;
          break;
      }
    });

    // Determine overall status
    let overallStatus = AgentHealthStatus.HEALTHY;
    if (circuitOpenCount > 0) {
      overallStatus = AgentHealthStatus.CIRCUIT_OPEN;
    } else if (unhealthyCount > 0) {
      overallStatus = AgentHealthStatus.UNHEALTHY;
    } else if (degradedCount > 0) {
      overallStatus = AgentHealthStatus.DEGRADED;
    }

    return {
      timestamp: new Date(),
      overallStatus,
      agentHealth,
      summary: {
        totalAgents: healthChecks.length,
        healthyAgents: healthyCount,
        degradedAgents: degradedCount,
        unhealthyAgents: unhealthyCount,
        circuitOpenAgents: circuitOpenCount,
      },
    };
  }

  /**
   * Get metrics for specific agent
   */
  getAgentMetrics(agentType: AgentType): AgentMetric | undefined {
    return this.metrics.get(agentType);
  }

  /**
   * Get circuit breaker state
   */
  getCircuitBreaker(agentType: AgentType): CircuitBreakerState | undefined {
    return this.circuitBreakers.get(agentType);
  }

  /**
   * Reset circuit breaker for agent
   */
  resetCircuitBreaker(agentType: AgentType): void {
    const breaker = this.circuitBreakers.get(agentType);
    if (breaker) {
      breaker.state = 'closed';
      breaker.failureCount = 0;
      breaker.openedAt = undefined;
      this.circuitBreakers.set(agentType, breaker);
    }
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.initializeMetrics();
  }

  /**
   * Update circuit breaker threshold
   */
  updateCircuitBreakerThreshold(agentType: AgentType, threshold: number): void {
    const breaker = this.circuitBreakers.get(agentType);
    if (breaker) {
      breaker.threshold = threshold;
      this.circuitBreakers.set(agentType, breaker);
    }
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Map<AgentType, AgentMetric> {
    return new Map(this.metrics);
  }
}
