#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Emoji to log level mapping
const emojiMappings = {
  '🚀': { level: 'info', method: 'startOperation' },
  '✅': { level: 'info', method: 'info' },
  '📋': { level: 'debug', method: 'debug' },
  '📊': { level: 'debug', method: 'debug' },
  '📚': { level: 'debug', method: 'debug' },
  '🕸️': { level: 'info', method: 'web.analysisStart' },
  '🔄': { level: 'debug', method: 'debug' },
  '🕷️': { level: 'info', method: 'web.scrapeStart' },
  '🧠': { level: 'debug', method: 'debug' },
  '🎉': { level: 'info', method: 'endOperation' },
  '💾': { level: 'debug', method: 'database.query' },
  '📄': { level: 'debug', method: 'debug' },
  '☁️': { level: 'debug', method: 'debug' },
  '🔐': { level: 'debug', method: 'debug' },
  '❌': { level: 'error', method: 'error' },
  '⚠️': { level: 'warn', method: 'warn' },
  '📁': { level: 'debug', method: 'debug' },
  '📝': { level: 'info', method: 'info' },
  '🗑️': { level: 'info', method: 'info' },
  '🔍': { level: 'debug', method: 'debug' },
  '🌐': { level: 'debug', method: 'debug' },
  '🎭': { level: 'debug', method: 'debug' },
  '⏳': { level: 'debug', method: 'debug' },
  '🧹': { level: 'debug', method: 'debug' },
};

// Professional message templates
const messageTemplates = {
  'Starting upload for tenantId': 'Document upload started',
  'User authenticated': 'User authenticated for operation',
  'File details': 'File validation completed',
  'Uploading to Vercel Blob': 'Uploading file to blob storage',
  'Blob uploaded': 'File uploaded to blob storage',
  'PDF content extracted': 'PDF content extracted successfully',
  'Text content extracted': 'Text content extracted successfully',
  'Content analysis': 'Content analysis completed',
  'Generating embeddings': 'Generating embeddings for content',
  'Generated .* chunks with embeddings': 'Embeddings generated successfully',
  'Inserting .* documents into database': 'Inserting documents into database',
  'Documents inserted': 'Documents inserted successfully',
  'Upload completed successfully': 'Document upload completed',
  'Getting documents for tenantId': 'Retrieving documents for tenant',
  'Found .* document chunks from database': 'Retrieved document chunks from database',
  'Returning .* grouped documents': 'Document retrieval completed',
  'Starting analysis for URL': 'Web analysis started',
  'Created pending analysis record': 'Created pending analysis record',
  'Scraping website': 'Web scraping started',
  'Scraped .* characters from': 'Web scraping completed',
  'Generating embedding for': 'Generating embedding for scraped content',
  'Generated embedding with .* chunks': 'Embedding generation completed',
  'Analysis completed successfully': 'Web analysis completed',
  'Upload error': 'Document upload failed',
  'Analysis failed': 'Web analysis failed',
};

function findFilesToProcess(dir, extensions = ['.ts', '.tsx', '.js', '.jsx']) {
  const files = [];
  
  function scanDirectory(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Skip node_modules and .git directories
        if (!['node_modules', '.git', '.next', 'dist', 'build'].includes(item)) {
          scanDirectory(fullPath);
        }
      } else if (extensions.some(ext => item.endsWith(ext))) {
        files.push(fullPath);
      }
    }
  }
  
  scanDirectory(dir);
  return files;
}

function extractEmojiFromString(str) {
  const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
  const matches = str.match(emojiRegex);
  return matches ? matches[0] : null;
}

function generateProfessionalLog(originalLine, emoji, message) {
  const mapping = emojiMappings[emoji];
  if (!mapping) return null;
  
  // Clean the message
  let cleanMessage = message
    .replace(/[🚀✅📋📊📚🕸️🔄🕷️🧠🎉💾📄☁️🔐❌⚠️📁📝🗑️🔍🌐🎭⏳🧹]/g, '')
    .trim();
  
  // Apply message templates
  for (const [pattern, replacement] of Object.entries(messageTemplates)) {
    const regex = new RegExp(pattern, 'i');
    if (regex.test(cleanMessage)) {
      cleanMessage = replacement;
      break;
    }
  }
  
  // Generate the new log statement
  if (mapping.method.includes('.')) {
    // Structured logging method
    const [category, method] = mapping.method.split('.');
    return `logger.${category}.${method}(/* parameters based on context */);`;
  } else if (mapping.method === 'startOperation') {
    return `const operationId = logger.startOperation("operation_name", { /* context */ });`;
  } else if (mapping.method === 'endOperation') {
    return `logger.endOperation(operationId, "operation_name", { /* results */ });`;
  } else {
    return `logger.${mapping.method}("${cleanMessage}", { /* context */ });`;
  }
}

function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const changes = [];
  
  let hasImport = content.includes('import { logger }');
  let needsImport = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check for console.log with emojis
    if (line.includes('console.log') || line.includes('console.error') || line.includes('console.warn')) {
      const emoji = extractEmojiFromString(line);
      if (emoji && emojiMappings[emoji]) {
        const message = line.match(/console\.(log|error|warn)\s*\(\s*[`"'](.+?)[`"']/)?.[2] || '';
        const newLog = generateProfessionalLog(line, emoji, message);
        
        if (newLog) {
          changes.push({
            lineNumber: i + 1,
            original: line.trim(),
            suggested: newLog,
            emoji: emoji
          });
          needsImport = true;
        }
      }
    }
  }
  
  return {
    filePath,
    changes,
    needsImport: needsImport && !hasImport
  };
}

function generateReport(results) {
  console.log('\n🔄 LOGGING MIGRATION REPORT');
  console.log('=====================================\n');
  
  const totalFiles = results.length;
  const filesWithChanges = results.filter(r => r.changes.length > 0).length;
  const totalChanges = results.reduce((sum, r) => sum + r.changes.length, 0);
  
  console.log(`📊 Summary:`);
  console.log(`   Files scanned: ${totalFiles}`);
  console.log(`   Files needing changes: ${filesWithChanges}`);
  console.log(`   Total emoji logs found: ${totalChanges}\n`);
  
  if (filesWithChanges === 0) {
    console.log('✅ No emoji-based console.log statements found!\n');
    return;
  }
  
  console.log('📋 Files needing migration:\n');
  
  for (const result of results) {
    if (result.changes.length === 0) continue;
    
    console.log(`📁 ${result.filePath}`);
    
    if (result.needsImport) {
      console.log(`   ⚠️  Add import: import { logger } from "@/lib/logger";`);
    }
    
    for (const change of result.changes) {
      console.log(`   Line ${change.lineNumber}: ${change.emoji}`);
      console.log(`   OLD: ${change.original}`);
      console.log(`   NEW: ${change.suggested}`);
      console.log('');
    }
  }
  
  console.log('\n📝 Next Steps:');
  console.log('1. Review the suggested changes above');
  console.log('2. Add logger imports where needed');
  console.log('3. Replace console.log statements with professional logging');
  console.log('4. Add appropriate context objects with tenantId, operationId, etc.');
  console.log('5. Test the new logging output\n');
  
  console.log('💡 Tip: Use environment variable LOG_LEVEL to control verbosity:');
  console.log('   - ERROR: Only errors');
  console.log('   - WARN: Warnings and errors');
  console.log('   - INFO: Info, warnings, and errors (production default)');
  console.log('   - DEBUG: Debug and above (development default)');
  console.log('   - TRACE: All log levels\n');
}

// Main execution
function main() {
  const srcDir = path.join(process.cwd(), 'src');
  
  if (!fs.existsSync(srcDir)) {
    console.error('❌ src directory not found. Run this script from your project root.');
    process.exit(1);
  }
  
  console.log('🔍 Scanning for emoji-based console.log statements...\n');
  
  const files = findFilesToProcess(srcDir);
  const results = files.map(processFile);
  
  generateReport(results);
}

if (require.main === module) {
  main();
}

module.exports = { findFilesToProcess, processFile, generateReport }; 