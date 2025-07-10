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
    contentType?: string;
    lastModified?: string;
    canonical?: string;
    ogImage?: string;
    ogType?: string;
    twitterCard?: string;
    schemaData?: any[];
    readingTime?: number;
  };
}

export interface ScrapeOptions {
  waitForDynamic?: boolean;
  timeout?: number;
  maxContentLength?: number;
  extractSchema?: boolean;
  extractReadability?: boolean;
  preserveFormatting?: boolean;
  // Authentication options
  auth?: {
    type: 'cookies' | 'headers' | 'basic' | 'confluence-api';
    cookies?: Array<{ name: string; value: string; domain?: string; path?: string }>;
    headers?: Record<string, string>;
    username?: string;
    password?: string;
    token?: string; // For API tokens
    confluenceSpace?: string; // For Confluence API
  };
}

const DEFAULT_OPTIONS: Required<Omit<ScrapeOptions, 'auth'>> & { auth?: ScrapeOptions['auth'] } = {
  waitForDynamic: false,
  timeout: 30000,
  maxContentLength: 20000,
  extractSchema: true,
  extractReadability: true,
  preserveFormatting: false,
};

/**
 * Sanitize and fix common URL input issues
 */
export function sanitizeUrl(input: string): string {
  if (!input || typeof input !== 'string') {
    throw new Error('URL is required');
  }

  // Trim whitespace
  let url = input.trim();
  
  if (!url) {
    throw new Error('URL cannot be empty');
  }

  // Remove any internal whitespace that could break the URL
  url = url.replace(/\s+/g, '');
  
  // Fix common protocol typos first
  // Fix https// or http// (missing colon)
  url = url.replace(/^https?\/\//, (match) => {
    return match.includes('https') ? 'https://' : 'http://';
  });
  
  // Fix http:/ or https:/ (missing one slash)
  url = url.replace(/^https?:\/([^\/])/, (match, char) => {
    return match.includes('https') ? `https://${char}` : `http://${char}`;
  });
  
  // Add protocol if missing
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    // Default to HTTPS for security
    url = 'https://' + url;
  }
  
  return url;
}

/**
 * Validate URL format and accessibility
 */
export function validateUrl(url: string): { valid: boolean; error?: string; sanitizedUrl?: string } {
  try {
    // First try to sanitize the URL
    const sanitizedUrl = sanitizeUrl(url);
    
    // Check for obvious malformed patterns before URL parsing
    if (sanitizedUrl.includes('https://https://') || sanitizedUrl.includes('http://http://') ||
        sanitizedUrl.includes('https://http://') || sanitizedUrl.includes('http://https://')) {
      return { 
        valid: false, 
        error: 'Invalid URL format detected. Please check your URL and ensure it starts with http:// or https:// (not both).' 
      };
    }
    
    // Now validate the sanitized URL
    const urlObj = new URL(sanitizedUrl);
    
    // Check for supported protocols
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return { valid: false, error: 'Only HTTP and HTTPS URLs are supported' };
    }
    
    // Check for invalid hostnames
    if (!urlObj.hostname || urlObj.hostname.length === 0) {
      return { valid: false, error: 'Invalid hostname' };
    }
    
    // Check for localhost or private IPs for security
    if (urlObj.hostname === 'localhost' || 
        urlObj.hostname.startsWith('192.168.') ||
        urlObj.hostname.startsWith('10.') ||
        urlObj.hostname.startsWith('172.')) {
      // Allow but warn about private networks
      console.warn(`⚠️ Accessing private network: ${urlObj.hostname}`);
    }
    
    return { valid: true, sanitizedUrl };
  } catch (error: any) {
    // Provide more specific error messages
    let errorMessage = 'Invalid URL format';
    
    if (error.message.includes('Invalid URL')) {
      if (url.includes('//') && !url.includes('://')) {
        errorMessage = 'Invalid URL format. Did you mean to include ":" after "https" or "http"? Example: https://domain.com';
      } else {
        errorMessage = 'Invalid URL format. Please check the URL and try again. Example: https://domain.com';
      }
    } else if (error.message.includes('protocol')) {
      errorMessage = 'URL must start with http:// or https://';
    }
    
    return { valid: false, error: errorMessage };
  }
}

/**
 * Normalize URL for consistent processing
 */
function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    // Remove fragments and normalize
    urlObj.hash = '';
    return urlObj.toString();
  } catch {
    return url;
  }
}

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return 'unknown-domain';
  }
}

/**
 * Enhanced Cheerio-based scraping with structured data extraction
 */
async function scrapeWithCheerio(url: string, options: ScrapeOptions): Promise<ScrapedContent> {
  console.log(`🔍 Scraping ${url} with enhanced Cheerio...`);
  
  try {
    // Set up request options with authentication
    const requestOptions: any = {
      timeout: options.timeout || DEFAULT_OPTIONS.timeout,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0',
      },
    };

    // Add authentication headers
    if (options.auth?.type === 'headers' && options.auth.headers) {
      Object.assign(requestOptions.headers, options.auth.headers);
    }

    if (options.auth?.type === 'basic' && options.auth.username && options.auth.password) {
      const credentials = Buffer.from(`${options.auth.username}:${options.auth.password}`).toString('base64');
      requestOptions.headers['Authorization'] = `Basic ${credentials}`;
    }

    // Handle cookies for authentication
    if (options.auth?.type === 'cookies' && options.auth.cookies) {
      const cookieHeader = options.auth.cookies
        .map(cookie => `${cookie.name}=${cookie.value}`)
        .join('; ');
      if (cookieHeader) {
        requestOptions.headers['Cookie'] = cookieHeader;
      }
    }

    // Use Cheerio's fromURL method for efficient scraping
    console.log(`🌐 Fetching HTML from ${url}...`);
    const $ = await cheerio.fromURL(url, requestOptions);

    console.log(`📄 HTML loaded, extracting structured data...`);

    // Use Cheerio's extract method for structured data extraction
    const extractedData = $.extract({
      title: {
        selector: 'title',
        value: 'text',
      },
      metaTitle: {
        selector: 'meta[property="og:title"], meta[name="twitter:title"]',
        value: 'content',
      },
      description: {
        selector: 'meta[name="description"], meta[property="og:description"], meta[name="twitter:description"]',
        value: 'content',
      },
      keywords: {
        selector: 'meta[name="keywords"]',
        value: 'content',
      },
      author: {
        selector: 'meta[name="author"], meta[property="article:author"], .author, [rel="author"]',
        value: 'text',
      },
      publishedDate: {
        selector: 'meta[property="article:published_time"], meta[name="date"], time[datetime], .published-date',
        value: (el: any) => $(el).attr('datetime') || $(el).attr('content') || $(el).text(),
      },
      lastModified: {
        selector: 'meta[property="article:modified_time"], meta[name="last-modified"]',
        value: 'content',
      },
      language: {
        selector: 'html',
        value: 'lang',
      },
      canonical: {
        selector: 'link[rel="canonical"]',
        value: 'href',
      },
      ogImage: {
        selector: 'meta[property="og:image"]',
        value: 'content',
      },
      ogType: {
        selector: 'meta[property="og:type"]',
        value: 'content',
      },
      twitterCard: {
        selector: 'meta[name="twitter:card"]',
        value: 'content',
      },
      headings: [
        {
          selector: 'h1, h2, h3, h4, h5, h6',
          value: 'text',
        },
      ],
      links: [
        {
          selector: 'a[href]',
          value: {
            href: 'href',
            text: 'text',
            title: 'title',
          },
        },
      ],
      images: [
        {
          selector: 'img[src]',
          value: {
            src: 'src',
            alt: 'alt',
            title: 'title',
            width: 'width',
            height: 'height',
          },
        },
      ],
    });

    console.log(`🧹 Cleaning and processing text content...`);

    // Extract and clean main content using the improved content cleaning function
    const cleanContent = cleanTextContent($, options.preserveFormatting);
    
    if (!cleanContent || cleanContent.length < 10) {
      console.warn(`⚠️ Very little content extracted from ${url}: ${cleanContent.length} characters`);
      console.log(`Raw body text length: ${$('body').text().trim().length}`);
    } else {
      console.log(`✅ Extracted ${cleanContent.length} characters of clean content`);
    }

    // Truncate content if needed
    let finalContent = cleanContent;
    if (cleanContent.length > (options.maxContentLength || DEFAULT_OPTIONS.maxContentLength)) {
      finalContent = cleanContent.substring(0, options.maxContentLength || DEFAULT_OPTIONS.maxContentLength);
      console.log(`✂️ Content truncated from ${cleanContent.length} to ${finalContent.length} characters`);
    }

    // Extract JSON-LD structured data if requested
    let schemaData: any[] = [];
    if (options.extractSchema) {
      console.log(`🔍 Extracting JSON-LD structured data...`);
      $('script[type="application/ld+json"]').each((_, element) => {
        try {
          const jsonText = $(element).html();
          if (jsonText) {
            const parsedData = JSON.parse(jsonText);
            schemaData.push(parsedData);
          }
        } catch (error) {
          // Ignore invalid JSON-LD
        }
      });
      console.log(`📊 Found ${schemaData.length} JSON-LD schemas`);
    }

    // Process and normalize extracted data
    const processedLinks = Array.isArray(extractedData.links) 
      ? extractedData.links
          .map((link: any) => {
            if (!link?.href) return null;
            try {
              return new URL(link.href, url).href;
            } catch {
              return null;
            }
          })
          .filter((link): link is string => Boolean(link))
          .slice(0, 50)
      : [];

    const processedImages = Array.isArray(extractedData.images)
      ? extractedData.images
          .map((img: any) => {
            if (!img?.src) return null;
            try {
              return new URL(img.src, url).href;
            } catch {
              return null;
            }
          })
          .filter((img): img is string => Boolean(img))
          .slice(0, 20)
      : [];

    const processedHeadings = Array.isArray(extractedData.headings)
      ? extractedData.headings
          .map((heading: any) => typeof heading === 'string' ? heading.trim() : heading?.text?.trim())
          .filter((heading): heading is string => Boolean(heading))
          .slice(0, 20)
      : [];

    // Calculate reading time (average 200 words per minute)
    const wordCount = finalContent.split(/\s+/).filter(word => word.length > 0).length;
    const readingTime = Math.ceil(wordCount / 200);

    console.log(`📈 Content metrics: ${wordCount} words, ${readingTime} min read, ${processedLinks.length} links, ${processedImages.length} images, ${processedHeadings.length} headings`);

    // Determine final title
    const metaTitle = Array.isArray(extractedData.metaTitle) ? extractedData.metaTitle[0] : extractedData.metaTitle;
    const title = Array.isArray(extractedData.title) ? extractedData.title[0] : extractedData.title;
    const finalTitle = metaTitle || title || 'Untitled Page';

    const metadata: ScrapedContent['metadata'] = {
      domain: extractDomain(url),
      links: [...new Set(processedLinks)],
      images: [...new Set(processedImages)],
      headings: processedHeadings,
      description: Array.isArray(extractedData.description) ? extractedData.description[0] : extractedData.description,
      keywords: Array.isArray(extractedData.keywords) ? extractedData.keywords[0] : extractedData.keywords,
      author: Array.isArray(extractedData.author) ? extractedData.author[0] : extractedData.author,
      publishedDate: Array.isArray(extractedData.publishedDate) ? extractedData.publishedDate[0] : extractedData.publishedDate,
      lastModified: Array.isArray(extractedData.lastModified) ? extractedData.lastModified[0] : extractedData.lastModified,
      wordCount,
      language: Array.isArray(extractedData.language) ? extractedData.language[0] : extractedData.language,
      canonical: Array.isArray(extractedData.canonical) ? extractedData.canonical[0] : extractedData.canonical,
      ogImage: Array.isArray(extractedData.ogImage) ? extractedData.ogImage[0] : extractedData.ogImage,
      ogType: Array.isArray(extractedData.ogType) ? extractedData.ogType[0] : extractedData.ogType,
      twitterCard: Array.isArray(extractedData.twitterCard) ? extractedData.twitterCard[0] : extractedData.twitterCard,
      schemaData: schemaData.length > 0 ? schemaData : undefined,
      readingTime,
      contentType: 'text/html',
    };

    console.log(`🎉 Successfully scraped ${url}: "${finalTitle}" with ${finalContent.length} characters`);

    return {
      url,
      title: (finalTitle || 'Untitled Page').trim(),
      content: finalContent,
      metadata,
    };

  } catch (error: any) {
    console.error(`❌ Cheerio scraping failed for ${url}:`, error.message);
    
    // Handle specific error cases
    if (error.code === 'ENOTFOUND') {
      throw new Error('Website not found. Please check the URL.');
    }
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Connection refused. The website may be down.');
    }
    if (error.code === 'ETIMEDOUT' || error.name === 'TimeoutError') {
      throw new Error('Request timed out. The website is taking too long to respond.');
    }
    if (error.response?.status === 401) {
      throw new Error('Authentication required. Please provide valid credentials.');
    }
    if (error.response?.status === 403) {
      throw new Error('Access forbidden. You may not have permission to access this content.');
    }
    if (error.response?.status === 404) {
      throw new Error('Page not found. The URL may be incorrect or the page may have been moved.');
    }
    if (error.response?.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    if (error.response?.status >= 500) {
      throw new Error('Server error. The website is experiencing technical difficulties.');
    }
    
    throw new Error(`Failed to scrape content: ${error.message}`);
  }
}

/**
 * Enhanced text cleaning with better content extraction
 */
function cleanTextContent($: cheerio.CheerioAPI, preserveFormatting: boolean = false): string {
  // Clone the document to avoid modifying the original
  const $clone = cheerio.load($.html());
  
  // Remove unwanted elements
  $clone('script, style, noscript, iframe, object, embed, form, input, button, select, textarea').remove();
  $clone('nav, header, footer, aside, .nav, .navigation, .menu, .sidebar, .ads, .advertisement').remove();
  $clone('.cookie-banner, .cookie-notice, .gdpr-banner, .popup, .modal, .overlay').remove();
  $clone('[role="navigation"], [role="banner"], [role="contentinfo"], [role="complementary"]').remove();
  
  // Get main content areas in order of preference
  let content = '';
  const contentSelectors = [
    'article',
    'main',
    '[role="main"]',
    '.content',
    '.post-content',
    '.entry-content',
    '.article-content',
    '.page-content',
    '#content',
    '#main',
    '.container .row .col', // Common Bootstrap pattern
    'body'
  ];

  for (const selector of contentSelectors) {
    const element = $clone(selector).first();
    if (element.length && element.text().trim().length > 100) {
      content = element.text();
      break;
    }
  }

  if (!content) {
    content = $clone('body').text();
  }

  if (preserveFormatting) {
    // Preserve some formatting by replacing common elements with markers
    $clone('p').after('\n\n');
    $clone('br').replaceWith('\n');
    $clone('h1, h2, h3, h4, h5, h6').each((_, el) => {
      const tagName = $clone(el).prop('tagName');
      const level = '#'.repeat(parseInt((tagName || 'H1').charAt(1)));
      $clone(el).replaceWith(`\n\n${level} ${$clone(el).text()}\n\n`);
    });
    $clone('li').each((_, el) => {
      $clone(el).replaceWith(`\n• ${$clone(el).text()}`);
    });
    content = $clone('body').text();
  }

  // Clean up the text
  return content
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/\n\s*\n\s*\n/g, '\n\n') // Remove excessive line breaks
    .replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\uFFFF]/g, ' ') // Remove non-printable characters but keep Unicode
    .trim();
}

/**
 * Dynamic scraping fallback using Playwright for JavaScript-heavy sites
 */
async function scrapeDynamic(url: string, options: ScrapeOptions): Promise<ScrapedContent> {
  let browser: Browser | null = null;

  try {
    console.log(`🎭 Launching browser for dynamic scraping...`);
    browser = await chromium.launch({
      headless: true,
      timeout: options.timeout || DEFAULT_OPTIONS.timeout,
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      extraHTTPHeaders: (options.auth?.type === 'headers' && options.auth.headers) ? options.auth.headers : {},
    });

    // Add authentication cookies if provided
    if (options.auth?.type === 'cookies' && options.auth.cookies) {
      await context.addCookies(options.auth.cookies.map(cookie => ({
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain || extractDomain(url),
        path: cookie.path || '/',
      })));
    }

    // Set up HTTP authentication if provided
    if (options.auth?.type === 'basic' && options.auth.username && options.auth.password) {
      await context.setHTTPCredentials({
        username: options.auth.username,
        password: options.auth.password,
      });
    }

    const page = await context.newPage();

    console.log(`🌐 Navigating to ${url}...`);
    await page.goto(url, { 
      waitUntil: 'networkidle', 
      timeout: options.timeout || DEFAULT_OPTIONS.timeout 
    });

    // Check for authentication redirects or login forms
    const currentUrl = page.url();
    if (currentUrl.includes('/login') || currentUrl.includes('/auth') || currentUrl.includes('/signin')) {
      throw new Error('Page redirected to login. Authentication may be required.');
    }

    // Wait for dynamic content if requested
    if (options.waitForDynamic) {
      console.log(`⏳ Waiting for dynamic content...`);
      await page.waitForTimeout(3000); // Give more time for JS to load
      
      // Wait for common content indicators
      try {
        await page.waitForSelector('article, main, .content, .post-content', { timeout: 5000 });
      } catch {
        // Continue if content selectors not found
      }
    }

    const html = await page.content();
    
    // Use Cheerio to parse the rendered HTML
    const $ = cheerio.load(html);
    const content = cleanTextContent($, options.preserveFormatting);
    
    let finalContent = content;
    if (content.length > (options.maxContentLength || DEFAULT_OPTIONS.maxContentLength)) {
      finalContent = content.substring(0, options.maxContentLength || DEFAULT_OPTIONS.maxContentLength);
    }

    const metadata = extractMetadataFromHTML($, url, options);
    const title = extractTitleFromHTML($);

    return {
      url,
      title,
      content: finalContent,
      metadata,
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Extract metadata from parsed HTML (for dynamic scraping)
 */
function extractMetadataFromHTML($: cheerio.CheerioAPI, url: string, options: ScrapeOptions): ScrapedContent['metadata'] {
  const domain = extractDomain(url);
  
  // Extract basic metadata
  const description = $('meta[name="description"]').attr('content') ||
    $('meta[property="og:description"]').attr('content') ||
    $('meta[name="twitter:description"]').attr('content');
  
  const keywords = $('meta[name="keywords"]').attr('content');
  const author = $('meta[name="author"]').attr('content') ||
    $('meta[property="article:author"]').attr('content') ||
    $('.author').first().text().trim();
  
  const publishedDate = $('meta[property="article:published_time"]').attr('content') ||
    $('meta[name="date"]').attr('content') ||
    $('time[datetime]').attr('datetime');
  
  const language = $('html').attr('lang') || 
    $('meta[http-equiv="content-language"]').attr('content');
  
  // Extract links with full URLs
  const links: string[] = [];
  $('a[href]').each((_, element) => {
    const href = $(element).attr('href');
    if (href) {
      try {
        const fullUrl = new URL(href, url).href;
        links.push(fullUrl);
      } catch {
        // Invalid URL, skip
      }
    }
  });
  
  // Extract images with full URLs
  const images: string[] = [];
  $('img[src]').each((_, element) => {
    const src = $(element).attr('src');
    if (src) {
      try {
        const fullUrl = new URL(src, url).href;
        images.push(fullUrl);
      } catch {
        // Invalid URL, skip
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

  // Extract structured data if requested
  let schemaData: any[] = [];
  if (options.extractSchema) {
    $('script[type="application/ld+json"]').each((_, element) => {
      try {
        const jsonText = $(element).html();
        if (jsonText) {
          const parsedData = JSON.parse(jsonText);
          schemaData.push(parsedData);
        }
      } catch (error) {
        // Ignore invalid JSON-LD
      }
    });
  }
  
  const content = cleanTextContent($, options.preserveFormatting);
  const wordCount = content.split(/\s+/).length;
  
  return {
    domain,
    links: [...new Set(links)].slice(0, 50),
    images: [...new Set(images)].slice(0, 20),
    headings: headings.slice(0, 20),
    description,
    keywords,
    author,
    publishedDate,
    wordCount,
    language,
    canonical: $('link[rel="canonical"]').attr('href'),
    ogImage: $('meta[property="og:image"]').attr('content'),
    ogType: $('meta[property="og:type"]').attr('content'),
    twitterCard: $('meta[name="twitter:card"]').attr('content'),
    schemaData: schemaData.length > 0 ? schemaData : undefined,
    readingTime: Math.ceil(wordCount / 200),
    contentType: 'text/html',
  };
}

/**
 * Extract title from parsed HTML
 */
function extractTitleFromHTML($: cheerio.CheerioAPI): string {
  return $('meta[property="og:title"]').attr('content') ||
         $('meta[name="twitter:title"]').attr('content') ||
         $('title').text().trim() || 
         $('h1').first().text().trim() || 
         'Untitled Page';
}

/**
 * Scrape Confluence content using API
 */
async function scrapeConfluenceAPI(url: string, options: ScrapeOptions): Promise<ScrapedContent> {
  if (!options.auth?.token) {
    throw new Error('Confluence API token is required');
  }

  try {
    // Extract page ID from Confluence URL
    const pageIdMatch = url.match(/pages\/(\d+)/);
    if (!pageIdMatch) {
      throw new Error('Could not extract page ID from Confluence URL');
    }

    const pageId = pageIdMatch[1];
    const baseUrl = url.split('/wiki/')[0];
    const apiUrl = `${baseUrl}/wiki/rest/api/content/${pageId}?expand=body.storage,space,version`;

    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${options.auth.token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid Confluence API token');
      }
      if (response.status === 404) {
        throw new Error('Confluence page not found');
      }
      throw new Error(`Confluence API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract content from Confluence storage format
    const storageContent = data.body?.storage?.value || '';
    const content = cleanConfluenceContent(storageContent);
    
    const metadata: ScrapedContent['metadata'] = {
      domain: extractDomain(url),
      links: [],
      images: [],
      headings: extractConfluenceHeadings(storageContent),
      author: data.version?.by?.displayName,
      publishedDate: data.version?.when,
      wordCount: content.split(/\s+/).length,
      language: 'en', // Default for Confluence
      contentType: 'confluence',
      readingTime: Math.ceil(content.split(/\s+/).length / 200),
    };

    return {
      url,
      title: data.title || 'Confluence Page',
      content,
      metadata,
    };
      } catch (error: any) {
      console.error('Confluence API scraping failed:', error);
      throw new Error(`Failed to scrape Confluence page: ${error.message}`);
    }
}

/**
 * Clean Confluence storage format content
 */
function cleanConfluenceContent(storageContent: string): string {
  // Remove Confluence-specific markup
  return storageContent
    .replace(/<ac:structured-macro[^>]*>[\s\S]*?<\/ac:structured-macro>/g, '') // Remove macros
    .replace(/<ac:image[^>]*>[\s\S]*?<\/ac:image>/g, '') // Remove images
    .replace(/<ac:link[^>]*>([\s\S]*?)<\/ac:link>/g, '$1') // Extract link text
    .replace(/<[^>]*>/g, ' ') // Remove remaining HTML tags
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Extract headings from Confluence content
 */
function extractConfluenceHeadings(storageContent: string): string[] {
  const headings: string[] = [];
  const headingMatches = storageContent.match(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi);
  
  if (headingMatches) {
    headingMatches.forEach(match => {
      const text = match.replace(/<[^>]*>/g, '').trim();
      if (text) {
        headings.push(text);
      }
    });
  }
  
  return headings;
}

/**
 * Enhanced main scraping function with intelligent fallback strategy
 */
export async function scrapeWebsite(
  url: string, 
  options: ScrapeOptions = {}
): Promise<ScrapedContent> {
  const normalizedUrl = normalizeUrl(url);
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  
  try {
    // Use Confluence API if specified
    if (mergedOptions.auth?.type === 'confluence-api') {
      return await scrapeConfluenceAPI(normalizedUrl, mergedOptions);
    }
    
    // For dynamic content requests, go straight to browser
    if (mergedOptions.waitForDynamic) {
      console.log(`🎭 Using dynamic scraping for ${normalizedUrl} (user requested)`);
      return await scrapeDynamic(normalizedUrl, mergedOptions);
    }
    
    // Try enhanced Cheerio scraping first (faster and more efficient)
    try {
      return await scrapeWithCheerio(normalizedUrl, mergedOptions);
    } catch (error: any) {
      // If authentication error or client error, don't retry with dynamic
      if (error.message.includes('Authentication') || 
          error.message.includes('forbidden') ||
          error.message.includes('401') ||
          error.message.includes('403')) {
        throw error;
      }
      
      console.log(`🔄 Cheerio scraping failed for ${normalizedUrl}, falling back to dynamic scraping...`);
      console.log(`Error: ${error.message}`);
      
      // Use dynamic scraping as fallback for JavaScript-heavy sites
      return await scrapeDynamic(normalizedUrl, mergedOptions);
    }
    
  } catch (error: any) {
    throw new Error(`Failed to scrape ${normalizedUrl}: ${error.message}`);
  }
}