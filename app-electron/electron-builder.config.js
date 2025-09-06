module.exports = {
  appId: 'com.crypto-key-validator',
  productName: 'Crypto Key Validator',
  copyright: 'Copyright © 2025 Crypto Key Validator',
  
  directories: {
    output: 'release',
    buildResources: 'build-assets'
  },
  
  files: [
    "dist/main/main.js",
    "dist/preload/preload.js",
    "dist/renderer/**/*",
    "node_modules/**/*",
    "package.json"
  ],
  
  extraResources: [
    {
      from: 'dist',
      to: 'dist',
      filter: ['**/*']
    },
    {
      from: '../assets',
      to: 'assets',
      filter: ['**/*']
    }
  ],
  
  mac: {
    category: 'public.app-category.utilities',
    target: [
      { target: 'dmg', arch: ['x64', 'arm64'] }
    ],
    icon: 'build-assets/icon.icns',
    darkModeSupport: true,
    hardenedRuntime: true,
    gatekeeperAssess: false,
    entitlements: 'build-assets/entitlements.mac.plist',
    entitlementsInherit: 'build-assets/entitlements.mac.plist'
  },
  
  win: {
    target: [
      { target: 'nsis', arch: ['x64', 'ia32'] },
      { target: 'portable', arch: ['x64'] }
    ],
    icon: 'build-assets/icon.ico',
  publisherName: 'Crypto Key Validator',
    requestedExecutionLevel: 'asInvoker'
  },
  
  linux: {
    target: [
      { target: 'AppImage', arch: ['x64'] },
      { target: 'deb', arch: ['x64'] },
      { target: 'tar.xz', arch: ['x64'] }
    ],
    icon: 'build-assets/icon.png',
    category: 'Utility'
  },
  
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
  shortcutName: 'Crypto Key Validator'
  },
  
  dmg: {
  title: 'Crypto Key Validator ${version}',
    icon: 'build-assets/icon.icns',
    background: 'build-assets/dmg-background.png',
    window: {
      width: 540,
      height: 380
    },
    contents: [
      {
        x: 140,
        y: 180,
        type: 'file'
      },
      {
        x: 400,
        y: 180,
        type: 'link',
        path: '/Applications'
      }
    ]
  },
  
  publish: null, // Disable auto-publish for now
  
  beforeBuild: async (context) => {
    // Any pre-build scripts here
  }
};
