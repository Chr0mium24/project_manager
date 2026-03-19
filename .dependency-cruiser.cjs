module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      from: { path: '^(apps|packages|scripts)/' },
      to: { circular: true },
    },
    {
      name: 'packages-must-not-import-apps',
      severity: 'error',
      from: { path: '^packages/' },
      to: { path: '^apps/' },
    },
    {
      name: 'scripts-must-not-import-apps',
      severity: 'error',
      from: { path: '^scripts/' },
      to: { path: '^apps/' },
    },
    {
      name: 'no-runtime-import-from-validation',
      severity: 'error',
      from: { path: '^(apps|packages|scripts)/' },
      to: { path: '^validation/' },
    },
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    exclude: '^(content-repo|storage|tmp)/',
    tsConfig: {
      fileName: 'tsconfig.eslint.json',
    },
  },
};
