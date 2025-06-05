import * as cheerio from 'cheerio';
import { chromium, Browser, Page } from 'playwright';

export interface ScrapedContent {
  url: string;
  title: string;
  content: string;
  metadata: {
    domain: string;
    links: string[];
    images: string[];
    headings: string[];
    description?: string;
    keywords?: string;
    author?: string;
    publishedDate?: string;
    wordCount: number;
    language?: string;
  };
}

export interface ScrapeOptions {
  waitForDynamic?: boolean;
  timeout?: number;
  userAgent?: string;
  extractImages?: boolean;
  extractLinks?: boolean;
  maxContentLength?: number;
}

const DEFAULT_OPTIONS: ScrapeOptions = {
  waitForDynamic: false,
  timeout: 30000,
  userAgent: 'bAssist-WebScraper/1.0',
  extractImages: true,
  extractLinks: true,
  maxContentLength: 50000, // Limit content to prevent massive texts
};

/**
 * Validate and normalize URL
 */
function normalizeUrl(url: string): string {
  try {
    // Add protocol if missing
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    const urlObj = new URL(url);
    return urlObj.toString();
  } catch (error) {
    throw new Error(`Invalid URL: ${url}`);
  }
}

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

/**
 * Clean and extract text content from HTML
 */
function cleanTextContent(html: string): string {
  const $ = cheerio.load(html);
  
  // Remove script and style elements
  $('script, style, nav, footer, header, aside, .ads, .advertisement, .sidebar').remove();
  
  // Get main content areas preferentially
  const contentSelectors = [
    'main',
    'article',
    '[role="main"]',
    '.main-content',
    '.content',
    '.post',
    '.entry-content',
    'body'
  ];
  
  let content = '';
  for (const selector of contentSelectors) {
    const element = $(selector).first();
    if (element.length && element.text().trim().length > 100) {
      content = element.text();
      break;
    }
  }
  
  // Fallback to body if no content found
  if (!content) {
    content = $('body').text();
  }
  
  // Clean up whitespace
  return content
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim();
}

/**
 * Extract metadata from HTML
 */
function extractMetadata(html: string, url: string): ScrapedContent['metadata'] {
  const $ = cheerio.load(html);
  const domain = extractDomain(url);
  
  // Extract title
  const title = $('title').text().trim() || 
    $('meta[property="og:title"]').attr('content') || 
    $('meta[name="twitter:title"]').attr('content') || 
    $('h1').first().text().trim();
  
  // Extract description
  const description = $('meta[name="description"]').attr('content') ||
    $('meta[property="og:description"]').attr('content') ||
    $('meta[name="twitter:description"]').attr('content');
  
  // Extract keywords
  const keywords = $('meta[name="keywords"]').attr('content');
  
  // Extract author
  const author = $('meta[name="author"]').attr('content') ||
    $('meta[property="article:author"]').attr('content') ||
    $('.author').first().text().trim();
  
  // Extract published date
  const publishedDate = $('meta[property="article:published_time"]').attr('content') ||
    $('meta[name="date"]').attr('content') ||
    $('time[datetime]').attr('datetime');
  
  // Extract language
  const language = $('html').attr('lang') || 
    $('meta[http-equiv="content-language"]').attr('content');
  
  // Extract links
  const links: string[] = [];
  $('a[href]').each((_, element) => {
    const href = $(element).attr('href');
    if (href && href.startsWith('http')) {
      links.push(href);
    }
  });
  
  // Extract images
  const images: string[] = [];
  $('img[src]').each((_, element) => {
    const src = $(element).attr('src');
    if (src) {
      if (src.startsWith('http')) {
        images.push(src);
      } else if (src.startsWith('/')) {
        images.push(`https://${domain}${src}`);
      }
    }
  });
  
  // Extract headings
  const headings: string[] = [];
  $('h1, h2, h3, h4, h5, h6').each((_, element) => {
    const text = $(element).text().trim();
    if (text) {
      headings.push(text);
    }
  });
  
  const content = cleanTextContent(html);
  
  return {
    domain,
    links: [...new Set(links)].slice(0, 50), // Dedupe and limit
    images: [...new Set(images)].slice(0, 20), // Dedupe and limit
    headings: headings.slice(0, 20), // Limit headings
    description,
    keywords,
    author,
    publishedDate,
    wordCount: content.split(/\s+/).length,
    language,
  };
}

/**
 * Scrape static content using fetch and Cheerio
 */
async function scrapeStatic(url: string, options: ScrapeOptions): Promise<ScrapedContent> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': options.userAgent || DEFAULT_OPTIONS.userAgent!,
    },
    signal: AbortSignal.timeout(options.timeout || DEFAULT_OPTIONS.timeout!),
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) {
    throw new Error(`Unsupported content type: ${contentType}`);
  }
  
  const html = await response.text();
  const metadata = extractMetadata(html, url);
  const content = cleanTextContent(html);
  const title = cheerio.load(html)('title').text().trim() || metadata.domain;
  
  return {
    url,
    title,
    content: content.slice(0, options.maxContentLength || DEFAULT_OPTIONS.maxContentLength!),
    metadata,
  };
}

/**
 * Scrape dynamic content using Playwright
 */
async function scrapeDynamic(url: string, options: ScrapeOptions): Promise<ScrapedContent> {
  let browser: Browser | null = null;
  let page: Page | null = null;
  
  try {
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage({
      userAgent: options.userAgent || DEFAULT_OPTIONS.userAgent!
    });
    
    // Navigate to page and wait for content
    await page.goto(url, { 
      waitUntil: 'networkidle',
      timeout: options.timeout || DEFAULT_OPTIONS.timeout!
    });
    
    // Wait a bit more for dynamic content to load
    await page.waitForTimeout(2000);
    
    // Get page content
    const html = await page.content();
    const title = await page.title();
    
    const metadata = extractMetadata(html, url);
    const content = cleanTextContent(html);
    
    return {
      url,
      title: title || metadata.domain,
      content: content.slice(0, options.maxContentLength || DEFAULT_OPTIONS.maxContentLength!),
      metadata,
    };
  } finally {
    if (page) await page.close();
    if (browser) await browser.close();
  }
}

/**
 * Main scraping function that determines the best approach
 */
export async function scrapeWebsite(
  url: string, 
  options: Partial<ScrapeOptions> = {}
): Promise<ScrapedContent> {
  const normalizedUrl = normalizeUrl(url);
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  
  try {
    // Try static scraping first (faster and more efficient)
    if (!mergedOptions.waitForDynamic) {
      try {
        return await scrapeStatic(normalizedUrl, mergedOptions);
      } catch (error) {
        console.log(`Static scraping failed for ${normalizedUrl}, trying dynamic...`);
        // Fall back to dynamic scraping
      }
    }
    
    // Use dynamic scraping for JavaScript-heavy sites
    return await scrapeDynamic(normalizedUrl, mergedOptions);
    
  } catch (error: any) {
    throw new Error(`Failed to scrape ${normalizedUrl}: ${error.message}`);
  }
}

/**
 * Validate if URL is safe to scrape
 */
export function validateUrl(url: string): { valid: boolean; error?: string } {
  try {
    const normalizedUrl = normalizeUrl(url);
    const urlObj = new URL(normalizedUrl);
    
    // Block potentially harmful or inappropriate domains
    const blockedDomains = [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      '192.168.',
      '10.',
      '172.16.',
      '172.17.',
      '172.18.',
      '172.19.',
      '172.20.',
      '172.21.',
      '172.22.',
      '172.23.',
      '172.24.',
      '172.25.',
      '172.26.',
      '172.27.',
      '172.28.',
      '172.29.',
      '172.30.',
      '172.31.',
    ];
    
    for (const blocked of blockedDomains) {
      if (urlObj.hostname.includes(blocked)) {
        return {
          valid: false,
          error: 'Private/local URLs are not allowed for security reasons'
        };
      }
    }
    
    // Only allow HTTP/HTTPS
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return {
        valid: false,
        error: 'Only HTTP and HTTPS URLs are supported'
      };
    }
    
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: 'Invalid URL format'
    };
  }
} 