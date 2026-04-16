import React from 'react';

type AgentType =
  | 'ingestion'
  | 'enrichment'
  | 'scoping'
  | 'proposal'
  | 'crm_sync'
  | 'orchestrator'
  | 'system';

interface ActivityIconProps {
  agentType: AgentType;
  size?: 'sm' | 'md' | 'lg';
}

const agentConfig = {
  ingestion: { emoji: '📥', color: 'bg-blue-500', label: 'Ingestion' },
  enrichment: { emoji: '🔍', color: 'bg-purple-500', label: 'Enrichment' },
  scoping: { emoji: '📏', color: 'bg-yellow-500', label: 'Scoping' },
  proposal: { emoji: '📄', color: 'bg-orange-500', label: 'Proposal' },
  crm_sync: { emoji: '🔄', color: 'bg-green-500', label: 'CRM Sync' },
  orchestrator: { emoji: '🤖', color: 'bg-gray-500', label: 'Orchestrator' },
  system: { emoji: '⚙️', color: 'bg-gray-400', label: 'System' },
};

export function ActivityIcon({ agentType, size = 'md' }: ActivityIconProps) {
  const config = agentConfig[agentType] || agentConfig.system;

  const sizeClasses = {
    sm: 'w-6 h-6 text-sm',
    md: 'w-8 h-8 text-base',
    lg: 'w-10 h-10 text-lg',
  };

  return (
    <div
      className={`${sizeClasses[size]} ${config.color} rounded-full flex items-center justify-center text-white`}
      title={config.label}
    >
      {config.emoji}
    </div>
  );
}
