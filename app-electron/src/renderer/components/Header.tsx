import React from 'react';
import { Statistics } from '../hooks/useAppState';

interface HeaderProps {
  statistics: Statistics;
}

export function Header({ statistics }: HeaderProps) {
  return (
    <div className="bg-crypto-gray border-b border-crypto-light p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-crypto-primary mb-2">
          Crypto Key Validator
        </h1>
        <p className="text-gray-400">
          Validate Bitcoin keys and artifacts offline
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="text-2xl font-bold text-crypto-primary">
            {statistics.totalArtifacts}
          </div>
          <div className="text-sm text-gray-400">Total Artifacts</div>
        </div>
        
        <div className="card p-4">
          <div className="text-2xl font-bold text-crypto-success">
            {statistics.validArtifacts}
          </div>
          <div className="text-sm text-gray-400">Valid</div>
        </div>
        
        <div className="card p-4">
          <div className="text-2xl font-bold text-crypto-warning">
            {statistics.artifactsWithBalance}
          </div>
          <div className="text-sm text-gray-400">Private Keys</div>
        </div>
        
        <div className="card p-4">
          <div className="text-2xl font-bold text-crypto-accent">
            {statistics.totalBalance}
          </div>
          <div className="text-sm text-gray-400">Mode</div>
        </div>
      </div>
    </div>
  );
}
