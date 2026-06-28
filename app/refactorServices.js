import fs from 'fs';
import path from 'path';

const servicesDir = 'c:/Users/juzzy/Projects/Digi Leagues Gaming 2026/app/src/services';
const files = fs.readdirSync(servicesDir).filter(f => f.endsWith('.ts'));

files.forEach(file => {
  const filePath = path.join(servicesDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  let originalContent = content;
  
  // Only add if not present
  if (!content.includes("handleServiceError")) {
    const importStatement = "import { handleServiceError } from '../utils/errorHandler';\n";
    content = importStatement + content;
  }
  
  // We want to find catch blocks and inject handleServiceError before the return statement.
  // E.g. catch (err: any) { return { data: null, error: err } }
  // OR catch (err) { return [] }
  const serviceName = file.replace('.ts', '');
  
  content = content.replace(/catch\s*\(\s*([a-zA-Z0-9_]+)(?:\s*:\s*any)?\s*\)\s*\{([\s\S]*?)\}/g, (match, errName, catchBody) => {
    // Check if it already has handleServiceError
    if (catchBody.includes('handleServiceError')) {
      return match;
    }
    
    // Check if there is an existing console.error
    let newBody = catchBody.replace(/console\.error\([^)]+\);?/g, '');
    
    newBody = `\n    handleServiceError(${errName}, '${serviceName}');` + newBody;
    
    return `catch (${errName}: any) {${newBody}}`;
  });

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${file}`);
  }
});
