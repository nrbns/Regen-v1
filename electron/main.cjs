const path = require('node:path');
require('ts-node').register({
  project: path.join(process.cwd(), 'tsconfig.electron.json'),
  transpileOnly: true,
  compilerOptions: {
    esModuleInterop: true,
    module: 'CommonJS',
    moduleResolution: 'Node',
    target: 'ES2022'
  }
});
require('./main.ts');


