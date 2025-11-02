const path = require('node:path');
require('ts-node').register({
  project: path.join(process.cwd(), 'tsconfig.electron.json'),
  transpileOnly: true,
  compilerOptions: { esModuleInterop: true }
});
require('./main.ts');


