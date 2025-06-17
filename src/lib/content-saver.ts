import fs from 'fs/promises';
import path from 'path';
import { ScrapedContent } from './web-scraper';
import { ScrapedPage } from './enhanced-web-scraper';

export interface SavedContent {
  id: string;
  source: string;
  url: string;
  title: string;
  content: string;
  timestamp: Date;
  metadata: {
    domain: string;
    contentType: 'public' | 'internal' | 'credential-based';
    authMethod?: 'sso' | 'credentials' | 'none';
    wordCount: number;
    links: string[];
    images: string[];
    headings: string[];
    description?: string;
    [key: string]: any;
  };
  filePath: string;
}

/**
 * Save scraped content to organized directories with timestamps
 */
export async function saveScrapedContent(
  content: ScrapedContent,
  authMethod: 'sso' | 'credentials' | 'none' = 'none'
): Promise<SavedContent> {
  const domain = new URL(content.url).hostname;
  const timestamp = new Date();
  const id = generateContentId(content.url, timestamp);
  
  // Determine content type based on domain and auth method
  const contentType = determineContentType(content.url, authMethod);
  
  // Create directory structure: /scraped/{domain}/{year}/{month}/
  const baseDir = path.join(process.cwd(), 'scraped');
  const sourceDir = path.join(baseDir, sanitizeDomainName(domain));
  const yearDir = path.join(sourceDir, timestamp.getFullYear().toString());
  const monthDir = path.join(yearDir, (timestamp.getMonth() + 1).toString().padStart(2, '0'));
  
  // Ensure directories exist
  await fs.mkdir(monthDir, { recursive: true });
  
  // Create filename with timestamp
  const fileName = `${timestamp.getTime()}_${sanitizeFileName(content.title || 'untitled')}.json`;
  const filePath = path.join(monthDir, fileName);
  
  // Prepare saved content object
  const savedContent: SavedContent = {
    id,
    source: domain,
    url: content.url,
    title: content.title,
    content: content.content,
    timestamp,
    metadata: {
      domain,
      contentType,
      authMethod,
      wordCount: content.metadata.wordCount,
      links: content.metadata.links,
      images: content.metadata.images,
      headings: content.metadata.headings,
      description: content.metadata.description,
      keywords: content.metadata.keywords,
      author: content.metadata.author,
      publishedDate: content.metadata.publishedDate,
      language: content.metadata.language,
    },
    filePath,
  };
  
  // Save to file
  await fs.writeFile(filePath, JSON.stringify(savedContent, null, 2), 'utf-8');
  
  console.log(`💾 Saved content: ${filePath}`);
  return savedContent;
}

/**
 * Save enhanced scraped page content
 */
export async function saveEnhancedScrapedPage(
  page: ScrapedPage,
  authMethod: 'sso' | 'credentials' | 'none' = 'none'
): Promise<SavedContent> {
  const scrapedContent: ScrapedContent = {
    url: page.url,
    title: page.title,
    content: page.content,
    metadata: {
      domain: page.metadata.domain,
      links: page.metadata.links,
      images: page.metadata.images,
      headings: page.metadata.headings,
      description: page.metadata.description,
      keywords: page.metadata.keywords,
      author: page.metadata.author,
      publishedDate: page.metadata.publishedDate,
      wordCount: page.metadata.wordCount,
      language: page.metadata.language,
    }
  };
  
  return await saveScrapedContent(scrapedContent, authMethod);
}

/**
 * Get saved content by domain and date range
 */
export async function getSavedContent(
  domain?: string,
  startDate?: Date,
  endDate?: Date
): Promise<SavedContent[]> {
  const baseDir = path.join(process.cwd(), 'scraped');
  const results: SavedContent[] = [];
  
  try {
    const domains = domain ? [sanitizeDomainName(domain)] : await fs.readdir(baseDir);
    
    for (const domainDir of domains) {
      const domainPath = path.join(baseDir, domainDir);
      const stat = await fs.stat(domainPath);
      
      if (!stat.isDirectory()) continue;
      
      const years = await fs.readdir(domainPath);
      for (const year of years) {
        const yearPath = path.join(domainPath, year);
        const yearStat = await fs.stat(yearPath);
        
        if (!yearStat.isDirectory()) continue;
        
        const months = await fs.readdir(yearPath);
        for (const month of months) {
          const monthPath = path.join(yearPath, month);
          const monthStat = await fs.stat(monthPath);
          
          if (!monthStat.isDirectory()) continue;
          
          const files = await fs.readdir(monthPath);
          for (const file of files) {
            if (!file.endsWith('.json')) continue;
            
            const filePath = path.join(monthPath, file);
            try {
              const content = await fs.readFile(filePath, 'utf-8');
              const savedContent: SavedContent = JSON.parse(content);
              
              // Filter by date range if specified
              const contentDate = new Date(savedContent.timestamp);
              if (startDate && contentDate < startDate) continue;
              if (endDate && contentDate > endDate) continue;
              
              results.push(savedContent);
            } catch (error) {
              console.error(`Failed to parse saved content: ${filePath}`, error);
            }
          }
        }
      }
    }
    
    // Sort by timestamp (newest first)
    results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
  } catch (error) {
    console.error('Failed to get saved content:', error);
  }
  
  return results;
}

/**
 * Delete old saved content (cleanup)
 */
export async function cleanupOldContent(olderThanDays: number = 90): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
  
  const baseDir = path.join(process.cwd(), 'scraped');
  let deletedCount = 0;
  
  try {
    const domains = await fs.readdir(baseDir);
    
    for (const domainDir of domains) {
      const domainPath = path.join(baseDir, domainDir);
      const stat = await fs.stat(domainPath);
      
      if (!stat.isDirectory()) continue;
      
      const years = await fs.readdir(domainPath);
      for (const year of years) {
        const yearPath = path.join(domainPath, year);
        const yearStat = await fs.stat(yearPath);
        
        if (!yearStat.isDirectory()) continue;
        
        const months = await fs.readdir(yearPath);
        for (const month of months) {
          const monthPath = path.join(yearPath, month);
          const monthStat = await fs.stat(monthPath);
          
          if (!monthStat.isDirectory()) continue;
          
          const files = await fs.readdir(monthPath);
          for (const file of files) {
            if (!file.endsWith('.json')) continue;
            
            const filePath = path.join(monthPath, file);
            try {
              const content = await fs.readFile(filePath, 'utf-8');
              const savedContent: SavedContent = JSON.parse(content);
              
              if (new Date(savedContent.timestamp) < cutoffDate) {
                await fs.unlink(filePath);
                deletedCount++;
                console.log(`🗑️ Deleted old content: ${filePath}`);
              }
            } catch (error) {
              console.error(`Failed to process file for cleanup: ${filePath}`, error);
            }
          }
          
          // Remove empty directories
          try {
            const remainingFiles = await fs.readdir(monthPath);
            if (remainingFiles.length === 0) {
              await fs.rmdir(monthPath);
            }
          } catch (error) {
            // Directory not empty or other error, ignore
          }
        }
      }
    }
    
  } catch (error) {
    console.error('Failed to cleanup old content:', error);
  }
  
  console.log(`🧹 Cleaned up ${deletedCount} old content files`);
  return deletedCount;
}

/**
 * Determine content type based on URL and authentication method
 */
function determineContentType(url: string, authMethod: 'sso' | 'credentials' | 'none'): 'public' | 'internal' | 'credential-based' {
  if (authMethod === 'sso') {
    return 'internal';
  } else if (authMethod === 'credentials') {
    return 'credential-based';
  } else {
    // Check if URL patterns suggest it's internal vs public
    const domain = new URL(url).hostname.toLowerCase();
    const internalPatterns = [
      /\.company\.com$/,
      /\.sharepoint\.com$/,
      /\.atlassian\.net$/,
      /\.corp\./,
      /\.internal$/,
      /\.intranet$/,
      /\.local$/,
    ];
    
    if (internalPatterns.some(pattern => pattern.test(domain))) {
      return 'internal';
    }
    
    return 'public';
  }
}

/**
 * Generate unique content ID
 */
function generateContentId(url: string, timestamp: Date): string {
  const domain = new URL(url).hostname;
  const timeStr = timestamp.getTime().toString();
  const hash = Buffer.from(`${domain}:${url}:${timeStr}`).toString('base64').slice(0, 8);
  return `${domain}_${timeStr}_${hash}`;
}

/**
 * Sanitize domain name for use as directory name
 */
function sanitizeDomainName(domain: string): string {
  return domain
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/^\.+|\.+$/g, '')
    .toLowerCase();
}

/**
 * Sanitize filename
 */
function sanitizeFileName(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9\s-_.]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 100); // Limit length
} 