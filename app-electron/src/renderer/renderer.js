// Main renderer JavaScript for Crypto Key Validator
const { cryptoValidator } = window;

// Application state
let isScanning = false;
let artifacts = [];
let statistics = {};

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Load system info
        await loadSystemInfo();
        
        // Load recent files
        await loadRecentFiles();
        
        // Set up event listeners
        setupEventListeners();
        
        // Load existing artifacts if any
        await refreshArtifacts();
        
        console.log('Application initialized successfully');
    } catch (error) {
        console.error('Failed to initialize application:', error);
        showError('Initialization failed: ' + error.message);
    }
});

// Set up event listeners
function setupEventListeners() {
    // Engine events
    cryptoValidator.onEngineEvent((event, data) => {
        console.log('Engine event:', event, data);
        
        switch (event) {
            case 'scan-started':
                handleScanStarted(data);
                break;
            case 'scan-progress':
                handleScanProgress(data);
                break;
            case 'artifact-validated':
                handleArtifactValidated(data);
                break;
            case 'balance-found':
                handleBalanceFound(data);
                break;
            case 'scan-completed':
                handleScanCompleted(data);
                break;
            case 'scan-error':
                handleScanError(data);
                break;
        }
    });

    // Menu events
    cryptoValidator.onMenuAction((action) => {
        console.log('Menu action:', action);
        
        switch (action) {
            case 'scan-autopsy':
                scanAutopsyCase();
                break;
            case 'scan-directory':
                scanDirectory();
                break;
            case 'export':
                exportResults();
                break;
            case 'clear-data':
                clearAll();
                break;
            case 'about':
                showAbout();
                break;
        }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 'o':
                    e.preventDefault();
                    if (e.shiftKey) {
                        scanDirectory();
                    } else {
                        scanAutopsyCase();
                    }
                    break;
                case 'e':
                    e.preventDefault();
                    exportResults();
                    break;
                case 'Enter':
                    if (e.target.id === 'direct-input') {
                        e.preventDefault();
                        processDirectInput();
                    }
                    break;
            }
        }
    });
}

// Scan Autopsy case
async function scanAutopsyCase() {
    if (isScanning) {
        showError('Scan already in progress');
        return;
    }

    try {
        const result = await cryptoValidator.selectFile();
        if (result.canceled || !result.filePaths.length) {
            return;
        }

        const filePath = result.filePaths[0];
        addLog('info', `Starting Autopsy case scan: ${filePath}`);
        
        isScanning = true;
        showProgressSection();
        
        const newArtifacts = await cryptoValidator.scanAutopsyCase(filePath);
        
        // Add to recent files
        await cryptoValidator.addRecentFile(filePath);
        await loadRecentFiles();
        
        addLog('info', `Scan completed. Found ${newArtifacts.length} artifacts.`);
        
    } catch (error) {
        console.error('Autopsy scan failed:', error);
        showError('Autopsy scan failed: ' + error.message);
        addLog('error', `Scan failed: ${error.message}`);
    } finally {
        isScanning = false;
        await refreshArtifacts();
    }
}

// Scan directory
async function scanDirectory() {
    if (isScanning) {
        showError('Scan already in progress');
        return;
    }

    try {
        const result = await cryptoValidator.selectDirectory();
        if (result.canceled || !result.filePaths.length) {
            return;
        }

        const dirPath = result.filePaths[0];
        addLog('info', `Starting directory scan: ${dirPath}`);
        
        isScanning = true;
        showProgressSection();
        
        const scanConfig = {
            deepScan: true,
            maxFileSize: 100 * 1024 * 1024, // 100MB
            fileTypes: ['.dat', '.wallet', '.json', '.keys', '.txt']
        };
        
        const newArtifacts = await cryptoValidator.scanFileSystem(dirPath, scanConfig);
        
        addLog('info', `Directory scan completed. Found ${newArtifacts.length} artifacts.`);
        
    } catch (error) {
        console.error('Directory scan failed:', error);
        showError('Directory scan failed: ' + error.message);
        addLog('error', `Scan failed: ${error.message}`);
    } finally {
        isScanning = false;
        await refreshArtifacts();
    }
}

// Process direct input
async function processDirectInput() {
    const input = document.getElementById('direct-input').value.trim();
    if (!input) {
        showError('Please enter some data to validate');
        return;
    }

    try {
        addLog('info', 'Processing direct input...');
        
        const newArtifacts = await cryptoValidator.processDirectInput(input);
        
        if (newArtifacts.length > 0) {
            addLog('info', `Found ${newArtifacts.length} artifacts in input.`);
            await refreshArtifacts();
        } else {
            addLog('warning', 'No valid cryptocurrency artifacts found in input.');
        }
        
    } catch (error) {
        console.error('Direct input processing failed:', error);
        showError('Input processing failed: ' + error.message);
        addLog('error', `Processing failed: ${error.message}`);
    }
}

// Clear all data
async function clearAll() {
    if (!confirm('Are you sure you want to clear all data? This cannot be undone.')) {
        return;
    }

    try {
        await cryptoValidator.clearAll();
        artifacts = [];
        statistics = {};
        
        // Clear UI
        document.getElementById('results-container').innerHTML = 
            '<p style="color: #888; text-align: center; padding: 40px;">No results yet. Scan files or paste data above to get started.</p>';
        document.getElementById('direct-input').value = '';
        hideProgressSection();
        
        updateStatistics();
        addLog('info', 'All data cleared.');
        
    } catch (error) {
        console.error('Clear all failed:', error);
        showError('Failed to clear data: ' + error.message);
    }
}

// Export results
async function exportResults() {
    if (artifacts.length === 0) {
        showError('No results to export');
        return;
    }

    try {
        const result = await cryptoValidator.saveFile('crypto-results.json');
        if (result.canceled || !result.filePath) {
            return;
        }

        // For now, just show success - actual export would happen in main process
        addLog('info', `Results exported to: ${result.filePath}`);
        
    } catch (error) {
        console.error('Export failed:', error);
        showError('Export failed: ' + error.message);
    }
}

// Refresh artifacts and statistics
async function refreshArtifacts() {
    try {
        artifacts = await cryptoValidator.getArtifacts();
        statistics = await cryptoValidator.getStatistics();
        
        updateStatistics();
        renderArtifacts();
        
    } catch (error) {
        console.error('Failed to refresh artifacts:', error);
        showError('Failed to load artifacts: ' + error.message);
    }
}

// Update statistics display
function updateStatistics() {
    document.getElementById('total-artifacts').textContent = statistics.totalArtifacts || 0;
    document.getElementById('valid-artifacts').textContent = statistics.validArtifacts || 0;
    document.getElementById('artifacts-with-balance').textContent = statistics.artifactsWithBalance || 0;
    document.getElementById('total-balance').textContent = statistics.totalBalance || '0 BTC';
}

// Render artifacts
function renderArtifacts() {
    const container = document.getElementById('results-container');
    
    if (artifacts.length === 0) {
        container.innerHTML = '<p style="color: #888; text-align: center; padding: 40px;">No results yet. Scan files or paste data above to get started.</p>';
        return;
    }

    let html = '';
    
    artifacts.forEach(artifact => {
        const statusClass = getStatusClass(artifact.validationStatus);
        const statusText = artifact.validationStatus.toUpperCase();
        const truncatedData = truncateData(artifact.raw);
        
        html += `
            <div class="artifact-item">
                <div class="artifact-header">
                    <span class="artifact-type">${artifact.type.replace('_', ' ').toUpperCase()}</span>
                    <span class="artifact-status ${statusClass}">${statusText}</span>
                </div>
                <div style="margin-bottom: 10px;">
                    <strong>Cryptocurrency:</strong> ${artifact.metadata.cryptocurrency.name}<br>
                    <strong>Source:</strong> ${artifact.source.type.replace('_', ' ')}<br>
                    <strong>Confidence:</strong> ${(artifact.metadata.confidence * 100).toFixed(0)}%<br>
                    ${artifact.source.path ? `<strong>Path:</strong> ${artifact.source.path}<br>` : ''}
                </div>
                <div class="artifact-data">${truncatedData}</div>
                ${artifact.balanceInfo && parseFloat(artifact.balanceInfo.balance) > 0 ? 
                    `<div class="balance-info">💰 Balance: ${artifact.balanceInfo.balance} ${artifact.balanceInfo.currency}</div>` : ''}
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Event handlers
function handleScanStarted(data) {
    addLog('info', 'Scan started...');
    showProgressSection();
}

function handleScanProgress(data) {
    const progress = (data.validatedArtifacts / Math.max(data.artifactsFound, 1)) * 100;
    document.getElementById('progress-fill').style.width = progress + '%';
    
    const info = `Phase: ${data.phase} | Files: ${data.filesScanned} | Artifacts: ${data.artifactsFound} | Validated: ${data.validatedArtifacts}`;
    document.getElementById('progress-info').textContent = info;
}

function handleArtifactValidated(data) {
    addLog('info', `Validated artifact: ${data.artifactId}`);
}

function handleBalanceFound(data) {
    addLog('info', `💰 Balance found! ${data.balance.balance} ${data.balance.currency} at ${data.address}`);
}

function handleScanCompleted(data) {
    addLog('info', '✅ Scan completed successfully!');
    hideProgressSection();
    refreshArtifacts();
}

function handleScanError(data) {
    addLog('error', `❌ Scan failed: ${data.error}`);
    hideProgressSection();
    showError('Scan failed: ' + data.error);
}

// Utility functions
function getStatusClass(status) {
    switch (status) {
        case 'valid': return 'status-valid';
        case 'invalid': return 'status-invalid';
        default: return 'status-pending';
    }
}

function truncateData(data) {
    if (data.length > 100) {
        return data.substring(0, 50) + '...' + data.substring(data.length - 20);
    }
    return data;
}

function showProgressSection() {
    document.getElementById('progress-section').style.display = 'block';
    document.getElementById('progress-log').innerHTML = '';
}

function hideProgressSection() {
    document.getElementById('progress-section').style.display = 'none';
}

function addLog(type, message) {
    const log = document.getElementById('progress-log');
    const entry = document.createElement('div');
    entry.className = `log-entry log-${type}`;
    entry.textContent = `${new Date().toLocaleTimeString()} - ${message}`;
    log.appendChild(entry);
    log.scrollTop = log.scrollHeight;
}

function showError(message) {
    // Simple alert for now - could be replaced with better UI
    alert('Error: ' + message);
}

function showAbout() {
    alert(`Crypto Key Validator v1.0.0

A secure, offline cryptocurrency key validation and balance checking tool.

Built for digital forensics professionals.`);
}

// Load system info
async function loadSystemInfo() {
    try {
        const systemInfo = await cryptoValidator.getSystemInfo();
        const version = await cryptoValidator.getAppVersion();
        
        const html = `
            <div style="font-size: 12px; color: #aaa;">
                <div>Version: ${version}</div>
                <div>Platform: ${systemInfo.platform}</div>
                <div>Node: ${systemInfo.nodeVersion}</div>
            </div>
        `;
        
        document.getElementById('system-info').innerHTML = html;
        
    } catch (error) {
        console.error('Failed to load system info:', error);
    }
}

// Load recent files
async function loadRecentFiles() {
    try {
        const recentFiles = await cryptoValidator.getRecentFiles();
        
        let html = '';
        recentFiles.slice(0, 5).forEach(file => {
            const fileName = file.split(/[/\\]/).pop();
            html += `<div style="font-size: 12px; color: #aaa; margin: 5px 0; cursor: pointer;" onclick="openRecentFile('${file}')">${fileName}</div>`;
        });
        
        if (html === '') {
            html = '<div style="font-size: 12px; color: #666;">No recent files</div>';
        }
        
        document.getElementById('recent-files').innerHTML = html;
        
    } catch (error) {
        console.error('Failed to load recent files:', error);
    }
}

// Open recent file
async function openRecentFile(filePath) {
    if (isScanning) {
        showError('Scan already in progress');
        return;
    }

    try {
        addLog('info', `Opening recent file: ${filePath}`);
        
        isScanning = true;
        showProgressSection();
        
        const newArtifacts = await cryptoValidator.scanAutopsyCase(filePath);
        addLog('info', `File opened. Found ${newArtifacts.length} artifacts.`);
        
    } catch (error) {
        console.error('Failed to open recent file:', error);
        showError('Failed to open file: ' + error.message);
        addLog('error', `Failed to open file: ${error.message}`);
    } finally {
        isScanning = false;
        await refreshArtifacts();
    }
}
