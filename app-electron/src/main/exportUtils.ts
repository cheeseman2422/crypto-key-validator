import * as fs from 'fs';
import * as path from 'path';
import { Artifact, Statistics } from '@crypto-validator/core-engine';

export interface ExportOptions {
  format: 'json' | 'csv' | 'html' | 'txt';
  includePrivateKeys: boolean;
  includeBalances: boolean;
  includeMetadata: boolean;
  truncateKeys: boolean;
}

export class ExportManager {
  
  /**
   * Export artifacts to specified format
   */
  static async exportArtifacts(
    artifacts: Artifact[], 
    statistics: Statistics,
    filePath: string, 
    options: ExportOptions
  ): Promise<void> {
    
    switch (options.format) {
      case 'json':
        await this.exportToJSON(artifacts, statistics, filePath, options);
        break;
      case 'csv':
        await this.exportToCSV(artifacts, filePath, options);
        break;
      case 'html':
        await this.exportToHTML(artifacts, statistics, filePath, options);
        break;
      case 'txt':
        await this.exportToTXT(artifacts, statistics, filePath, options);
        break;
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  /**
   * Export to JSON format
   */
  private static async exportToJSON(
    artifacts: Artifact[],
    statistics: Statistics,
    filePath: string,
    options: ExportOptions
  ): Promise<void> {
    const data = {
      exportInfo: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        format: 'json',
        options
      },
      statistics,
      artifacts: artifacts.map(artifact => this.processArtifact(artifact, options))
    };

    await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2));
  }

  /**
   * Export to CSV format
   */
  private static async exportToCSV(
    artifacts: Artifact[],
    filePath: string,
    options: ExportOptions
  ): Promise<void> {
    const headers = [
      'ID',
      'Type',
      'Cryptocurrency',
      'Validation Status',
      'Source Type',
      'Source Path',
      'Confidence',
      'Created At'
    ];

    if (options.includePrivateKeys) {
      headers.push('Raw Data');
    }

    if (options.includeBalances) {
      headers.push('Balance', 'Currency');
    }

    if (options.includeMetadata) {
      headers.push('Address Type', 'Derivation Path');
    }

    const csvRows = [headers.join(',')];

    artifacts.forEach(artifact => {
      const row = [
        artifact.id,
        artifact.type,
        artifact.metadata.cryptocurrency.name,
        artifact.validationStatus,
        artifact.source.type,
        artifact.source.path || '',
        (artifact.metadata.confidence * 100).toFixed(1) + '%',
        artifact.createdAt.toISOString()
      ];

      if (options.includePrivateKeys) {
        const rawData = options.truncateKeys && artifact.raw.length > 100 
          ? artifact.raw.substring(0, 50) + '...' + artifact.raw.substring(artifact.raw.length - 10)
          : artifact.raw;
        row.push(`"${rawData.replace(/"/g, '""')}"`);
      }

      if (options.includeBalances) {
        row.push(artifact.balanceInfo?.balance || '0');
        row.push(artifact.balanceInfo?.currency || '');
      }

      if (options.includeMetadata) {
        row.push(artifact.metadata.addressType || '');
        row.push(artifact.metadata.derivationPath || '');
      }

      csvRows.push(row.join(','));
    });

    await fs.promises.writeFile(filePath, csvRows.join('\n'));
  }

  /**
   * Export to HTML report format
   */
  private static async exportToHTML(
    artifacts: Artifact[],
    statistics: Statistics,
    filePath: string,
    options: ExportOptions
  ): Promise<void> {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CryptoKeyFinder Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 40px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 40px; }
        .logo { color: #4CAF50; font-size: 32px; font-weight: bold; margin-bottom: 10px; }
        .subtitle { color: #666; font-size: 16px; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 40px 0; }
        .stat-card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; border-left: 4px solid #4CAF50; }
        .stat-value { font-size: 28px; font-weight: bold; color: #4CAF50; margin-bottom: 5px; }
        .stat-label { color: #666; font-size: 14px; }
        .artifacts { margin-top: 40px; }
        .artifact { background: white; border: 1px solid #e1e5e9; border-radius: 8px; margin: 20px 0; padding: 20px; }
        .artifact-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
        .artifact-type { font-weight: bold; color: #4CAF50; font-size: 16px; }
        .status { padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; }
        .status-valid { background: #d4edda; color: #155724; }
        .status-invalid { background: #f8d7da; color: #721c24; }
        .status-pending { background: #fff3cd; color: #856404; }
        .artifact-data { font-family: 'Courier New', monospace; background: #f8f9fa; padding: 15px; border-radius: 4px; word-break: break-all; font-size: 13px; margin: 15px 0; }
        .metadata { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; font-size: 14px; color: #666; }
        .balance-highlight { background: linear-gradient(90deg, #d4edda, #c3e6cb); padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #28a745; }
        .footer { text-align: center; margin-top: 40px; padding: 20px; border-top: 1px solid #e1e5e9; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🔐 CryptoKeyFinder</div>
            <div class="subtitle">Cryptocurrency Forensics Report</div>
            <div style="margin-top: 10px; font-size: 14px; color: #999;">
                Generated on ${new Date().toLocaleString()}
            </div>
        </div>

        <div class="stats">
            <div class="stat-card">
                <div class="stat-value">${statistics.totalArtifacts}</div>
                <div class="stat-label">Total Artifacts Found</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${statistics.validArtifacts}</div>
                <div class="stat-label">Valid Artifacts</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${statistics.artifactsWithBalance}</div>
                <div class="stat-label">Artifacts with Balance</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${statistics.totalBalance}</div>
                <div class="stat-label">Total Balance Found</div>
            </div>
        </div>

        <div class="artifacts">
            <h2>Artifact Details</h2>
            ${artifacts.map(artifact => this.generateArtifactHTML(artifact, options)).join('')}
        </div>

        <div class="footer">
            <div>Report generated by CryptoKeyFinder v1.0.0</div>
            <div style="margin-top: 5px;">
                Secure • Offline • Professional Cryptocurrency Forensics
            </div>
        </div>
    </div>
</body>
</html>`;

    await fs.promises.writeFile(filePath, html);
  }

  /**
   * Export to plain text format
   */
  private static async exportToTXT(
    artifacts: Artifact[],
    statistics: Statistics,
    filePath: string,
    options: ExportOptions
  ): Promise<void> {
    const lines = [
      '=====================================',
      '      CRYPTOKEYFINDER REPORT',
      '=====================================',
      '',
      `Generated: ${new Date().toISOString()}`,
      `Format: Plain Text`,
      '',
      '--- SUMMARY STATISTICS ---',
      `Total Artifacts Found: ${statistics.totalArtifacts}`,
      `Valid Artifacts: ${statistics.validArtifacts}`,
      `Artifacts with Balance: ${statistics.artifactsWithBalance}`,
      `Total Balance: ${statistics.totalBalance}`,
      '',
      '--- ARTIFACT DETAILS ---',
      ''
    ];

    artifacts.forEach((artifact, index) => {
      lines.push(`[${index + 1}] ${artifact.type.toUpperCase()}`);
      lines.push(`Cryptocurrency: ${artifact.metadata.cryptocurrency.name}`);
      lines.push(`Status: ${artifact.validationStatus.toUpperCase()}`);
      lines.push(`Source: ${artifact.source.type} ${artifact.source.path ? `(${artifact.source.path})` : ''}`);
      lines.push(`Confidence: ${(artifact.metadata.confidence * 100).toFixed(1)}%`);
      lines.push(`Created: ${artifact.createdAt.toISOString()}`);

      if (options.includePrivateKeys) {
        const rawData = options.truncateKeys && artifact.raw.length > 100 
          ? artifact.raw.substring(0, 50) + '...' + artifact.raw.substring(artifact.raw.length - 10)
          : artifact.raw;
        lines.push(`Data: ${rawData}`);
      }

      if (options.includeBalances && artifact.balanceInfo) {
        lines.push(`Balance: ${artifact.balanceInfo.balance} ${artifact.balanceInfo.currency}`);
      }

      lines.push('');
    });

    lines.push('=====================================');
    lines.push('End of Report');

    await fs.promises.writeFile(filePath, lines.join('\n'));
  }

  /**
   * Generate HTML for individual artifact
   */
  private static generateArtifactHTML(artifact: Artifact, options: ExportOptions): string {
    const rawData = options.truncateKeys && artifact.raw.length > 100 
      ? artifact.raw.substring(0, 50) + '...' + artifact.raw.substring(artifact.raw.length - 10)
      : artifact.raw;

    return `
      <div class="artifact">
        <div class="artifact-header">
          <div class="artifact-type">${artifact.type.replace('_', ' ').toUpperCase()}</div>
          <div class="status status-${artifact.validationStatus}">${artifact.validationStatus.toUpperCase()}</div>
        </div>

        <div class="metadata">
          <div><strong>Cryptocurrency:</strong> ${artifact.metadata.cryptocurrency.name}</div>
          <div><strong>Confidence:</strong> ${(artifact.metadata.confidence * 100).toFixed(1)}%</div>
          <div><strong>Source:</strong> ${artifact.source.type.replace('_', ' ')}</div>
          <div><strong>Created:</strong> ${artifact.createdAt.toLocaleString()}</div>
        </div>

        ${options.includePrivateKeys ? `<div class="artifact-data">${rawData}</div>` : ''}

        ${artifact.balanceInfo && parseFloat(artifact.balanceInfo.balance) > 0 ? `
          <div class="balance-highlight">
            💰 <strong>Balance Found:</strong> ${artifact.balanceInfo.balance} ${artifact.balanceInfo.currency}
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Process artifact based on export options
   */
  private static processArtifact(artifact: Artifact, options: ExportOptions): any {
    const processed: any = {
      id: artifact.id,
      type: artifact.type,
      validationStatus: artifact.validationStatus,
      source: artifact.source,
      metadata: options.includeMetadata ? artifact.metadata : {
        cryptocurrency: artifact.metadata.cryptocurrency,
        confidence: artifact.metadata.confidence
      },
      createdAt: artifact.createdAt,
      updatedAt: artifact.updatedAt
    };

    if (options.includePrivateKeys) {
      processed.raw = options.truncateKeys && artifact.raw.length > 100 
        ? artifact.raw.substring(0, 50) + '...' + artifact.raw.substring(artifact.raw.length - 10)
        : artifact.raw;
    }

    if (options.includeBalances && artifact.balanceInfo) {
      processed.balanceInfo = artifact.balanceInfo;
    }

    return processed;
  }
}
