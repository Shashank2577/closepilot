import React from 'react';
import { AgentType } from '@closepilot/core';

interface ActivityIconProps {
  agentType: string;
  size?: number;
}

/**
 * Color-coded icon by agent type
 */
export function ActivityIcon({ agentType, size = 24 }: ActivityIconProps) {
  const getIconConfig = (type: string) => {
    switch (type.toLowerCase()) {
      case AgentType.INGESTION:
        return {
          icon: '📥',
          color: 'bg-blue-100 text-blue-700',
          label: 'Ingestion',
        };
      case AgentType.ENRICHMENT:
        return {
          icon: '🔍',
          color: 'bg-purple-100 text-purple-700',
          label: 'Enrichment',
        };
      case AgentType.SCOPING:
        return {
          icon: '📏',
          color: 'bg-green-100 text-green-700',
          label: 'Scoping',
        };
      case AgentType.PROPOSAL:
        return {
          icon: '📄',
          color: 'bg-orange-100 text-orange-700',
          label: 'Proposal',
        };
      case AgentType.CRM_SYNC:
        return {
          icon: '🔄',
          color: 'bg-teal-100 text-teal-700',
          label: 'CRM Sync',
        };
      case AgentType.ORCHESTRATOR:
        return {
          icon: '🎯',
          color: 'bg-red-100 text-red-700',
          label: 'Orchestrator',
        };
      default:
        return {
          icon: '⚙️',
          color: 'bg-gray-100 text-gray-700',
          label: 'Unknown',
        };
    }
  };

  const config = getIconConfig(agentType);

  return (
    <div
      className={`flex items-center justify-center rounded-full ${config.color}`}
      style={{ width: size, height: size }}
      title={config.label}
    >
      <span className="text-sm" role="img" aria-label={config.label}>
        {config.icon}
      </span>
    </div>
  );
}
