module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'no-app-import-from-package',
      severity: 'error',
      from: { path: '^packages/' },
      to: { path: '^apps/' },
    },
    {
      name: 'no-private-cross-module-imports',
      severity: 'error',
      from: { path: '^(apps|packages)/' },
      to: { path: '^(apps|packages)/.+/(src|internal)/', pathNot: '^(apps|packages)/[^/]+/(src/index|public/)' },
    },
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    tsConfig: {
      fileName: 'tsconfig.base.json',
    },
  },
};
