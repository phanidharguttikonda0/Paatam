const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const AdmZip = require('adm-zip');

async function buildAndPackageLambdas() {
  const rootDir = path.resolve(__dirname, '..');
  const tempBuildDir = path.resolve(rootDir, '.temp_lambda_build');
  const outputZip = path.resolve(rootDir, 'terraform', 'bundle.zip');

  console.log('🚀 [LAMBDA PACKAGER] Starting clean Lambda build with esbuild...');

  if (fs.existsSync(tempBuildDir)) {
    fs.rmSync(tempBuildDir, { recursive: true, force: true });
  }
  fs.mkdirSync(path.join(tempBuildDir, 'dist', 'lambdas'), { recursive: true });

  const lambdas = [
    { entry: 'src/lambdas/assignmentOcr.lambda.ts', out: 'dist/lambdas/assignmentOcr.js' },
    { entry: 'src/lambdas/bulkSplit.lambda.ts', out: 'dist/lambdas/bulkSplit.js' },
    { entry: 'src/lambdas/paperOcr.lambda.ts', out: 'dist/lambdas/paperOcr.js' },
    { entry: 'src/lambdas/paperEvaluation.lambda.ts', out: 'dist/lambdas/paperEvaluation.js' },
    { entry: 'src/lambdas/sweeper.lambda.ts', out: 'dist/lambdas/sweeper.js' },
  ];

  // 1. Bundle each lambda with esbuild
  for (const lambda of lambdas) {
    const entryPath = path.resolve(rootDir, lambda.entry);
    const outPath = path.resolve(tempBuildDir, lambda.out);
    console.log(`📦 Bundling ${lambda.entry} -> ${lambda.out}...`);

    execSync(
      `npx esbuild "${entryPath}" --bundle --platform=node --target=node20 --outfile="${outPath}"`,
      { cwd: rootDir, stdio: 'inherit' }
    );
  }

  // 2. Add Prisma query engine binary (RHEL OpenSSL 3.0.x for Amazon Linux 2023) and schema
  const prismaClientDir = path.resolve(rootDir, 'node_modules', '.prisma', 'client');
  const engineFile = 'libquery_engine-rhel-openssl-3.0.x.so.node';
  const engineSource = path.join(prismaClientDir, engineFile);
  const schemaSource = path.resolve(rootDir, 'prisma', 'schema.prisma');

  if (fs.existsSync(engineSource)) {
    console.log(`📄 Copying Prisma engine binary: ${engineFile}...`);
    fs.copyFileSync(engineSource, path.join(tempBuildDir, engineFile));
    fs.copyFileSync(engineSource, path.join(tempBuildDir, 'dist', 'lambdas', engineFile));
  } else {
    console.warn(`⚠️ Warning: Prisma engine ${engineFile} not found in ${prismaClientDir}`);
  }

  if (fs.existsSync(schemaSource)) {
    fs.copyFileSync(schemaSource, path.join(tempBuildDir, 'schema.prisma'));
    fs.copyFileSync(schemaSource, path.join(tempBuildDir, 'dist', 'lambdas', 'schema.prisma'));
  }

  // 3. Create transparent dispatcher at root index.js
  const rootDispatcherJs = `// ============================================================================
// Paatam AI Engine - Serverless Lambda Dispatcher
// ============================================================================
const assignmentOcr = require('./dist/lambdas/assignmentOcr');
const bulkSplit = require('./dist/lambdas/bulkSplit');
const paperOcr = require('./dist/lambdas/paperOcr');
const paperEvaluation = require('./dist/lambdas/paperEvaluation');
const sweeper = require('./dist/lambdas/sweeper');

// Direct function exports
exports.assignmentOcr = assignmentOcr.handler;
exports.bulkSplit = bulkSplit.handler;
exports.paperOcr = paperOcr.handler;
exports.paperEvaluation = paperEvaluation.handler;
exports.sweeper = sweeper.handler;

// Universal Dispatcher (Auto-detects caller function name)
exports.handler = async (event, context) => {
  const functionName = context?.functionName || '';
  console.log(\`[LAMBDA DISPATCHER] Handling execution for function: \${functionName}\`);

  if (functionName.includes('assignment-ocr')) {
    return assignmentOcr.handler(event, context);
  } else if (functionName.includes('bulk-split')) {
    return bulkSplit.handler(event, context);
  } else if (functionName.includes('paper-ocr')) {
    return paperOcr.handler(event, context);
  } else if (functionName.includes('paper-evaluation')) {
    return paperEvaluation.handler(event, context);
  } else if (functionName.includes('sweeper')) {
    return sweeper.handler(event, context);
  }

  console.warn(\`[LAMBDA DISPATCHER] Unmatched function name: \${functionName}\`);
  return { statusCode: 200, body: 'Default dispatch executed' };
};
`;
  fs.writeFileSync(path.join(tempBuildDir, 'index.js'), rootDispatcherJs, 'utf8');

  // 4. Create ZIP bundle
  console.log(`🗜️ Packaging deployment zip to: ${outputZip}...`);
  const zip = new AdmZip();
  zip.addLocalFolder(tempBuildDir);
  zip.writeZip(outputZip);

  const stats = fs.statSync(outputZip);
  console.log(`✅ [LAMBDA PACKAGER] bundle.zip successfully created! (${(stats.size / (1024 * 1024)).toFixed(2)} MB)`);

  // Clean up temporary build dir
  fs.rmSync(tempBuildDir, { recursive: true, force: true });
}

buildAndPackageLambdas().catch((err) => {
  console.error('❌ Failed to package lambdas:', err);
  process.exit(1);
});
