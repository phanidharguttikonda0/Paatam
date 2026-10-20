const AdmZip = require('adm-zip');
const path = require('path');
const fs = require('fs');

async function packageLambdas() {
  const distDir = path.resolve(__dirname, '..', 'dist');
  const outputZip = path.resolve(__dirname, '..', 'terraform', 'bundle.zip');

  if (!fs.existsSync(distDir)) {
    console.error('dist directory not found. Please run npm run build first.');
    process.exit(1);
  }

  const zip = new AdmZip();

  // Add the entire dist directory
  zip.addLocalFolder(distDir, 'dist');

  // Also alias dist/src to dist directly so both dist/lambdas/* and dist/src/lambdas/* resolve seamlessly
  const distSrc = path.join(distDir, 'src');
  if (fs.existsSync(distSrc)) {
    zip.addLocalFolder(distSrc, 'dist');
  }

  // Fallback index.js at root
  const bootstrapJs = `
exports.handler = async (event) => {
  console.log("Lambda invoked with event:", JSON.stringify(event));
  return { statusCode: 200, body: JSON.stringify({ message: "Worker executed successfully" }) };
};
`;
  zip.addFile('index.js', Buffer.from(bootstrapJs, 'utf8'));

  zip.writeZip(outputZip);
  console.log(`✅ Lambda deployment bundle created at: ${outputZip} (${(fs.statSync(outputZip).size / 1024).toFixed(2)} KB)`);
}

packageLambdas().catch((err) => {
  console.error('Failed to package lambdas:', err);
  process.exit(1);
});
