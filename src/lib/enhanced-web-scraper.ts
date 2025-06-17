import * as cheerio from 'cheerio';
import { chromium, Browser, Page } from 'playwright';
import CryptoJS from 'crypto-js';
import { diffWords } from 'diff';
import { attemptInternalSSO, isInternalDomain, suggestSSOSetup, isExternalCredentialSite } from './internal-sso-auth';
import { saveEnhancedScrapedPage } from './content-saver';
import { detectLoginPage, shouldPromptForCredentials, generateCredentialPrompt } from './credential-prompter';
import { WebsiteTemplate, getTemplateById, suggestTemplateForUrl } from './website-templates';

export interface AuthConfig {
  type: 'basic' | 'form' | 'cookie' | 'header' | 'sso';
  credentials: {
    username?: string;
    password?: string;
    headers?: Record<string, string>;
    cookies?: Array<{ name: string; value: string; domain?: string; path?: string }>;
    formSelector?: string;
    usernameField?: string;
    passwordField?: string;
    submitButton?: string;
    ssoProvider?: string;
    ssoToken?: string;
  };
}

export interface CrawlOptions {
  maxDepth: number;
  maxPages: number;
  includePatterns?: string[];
  excludePatterns?: string[];
  waitForDynamic?: boolean;
  timeout?: number;
  delayBetweenRequests?: number;
  respectRobots?: boolean;
  saveContent?: boolean;
  enableCredentialPrompting?: boolean;
}

export interface ScrapedPage {
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
    depth: number;
    parentUrl?: string;
    contentType?: 'public' | 'internal' | 'credential-based';
    authMethod?: 'sso' | 'credentials' | 'none';
  };
  contentHash: string;
  timestamp: Date;
  savedFilePath?: string;
}

export interface CrawlResult {
  baseUrl: string;
  pages: ScrapedPage[];
  summary: {
    totalPages: number;
    successfulPages: number;
    failedPages: number;
    errors: Array<{ url: string; error: string; needsCredentials?: boolean; loginMethod?: string }>;
    startTime: Date;
    endTime: Date;
    duration: number;
    savedContent?: number;
    authenticationAttempts: {
      sso: number;
      credentials: number;
      failed: number;
    };
  };
}

export class EnhancedWebScraper {
  private browser: Browser | null = null;
  private visitedUrls = new Set<string>();
  private failedUrls = new Set<string>();
  private authAttempts = { sso: 0, credentials: 0, failed: 0 };

  constructor(private authConfig?: AuthConfig) {}

  /**
   * Encrypt sensitive credentials for storage
   */
  static encryptCredentials(credentials: AuthConfig['credentials'], secretKey: string): string {
    return CryptoJS.AES.encrypt(JSON.stringify(credentials), secretKey).toString();
  }

  /**
   * Decrypt credentials for use
   */
  static decryptCredentials(encryptedCredentials: string, secretKey: string): AuthConfig['credentials'] {
    const bytes = CryptoJS.AES.decrypt(encryptedCredentials, secretKey);
    return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
  }

  /**
   * Generate content hash for change detection
   */
  static generateContentHash(content: string): string {
    return CryptoJS.SHA256(content).toString();
  }

  /**
   * Compare two content strings and return change percentage
   */
  static calculateContentChanges(oldContent: string, newContent: string): {
    changePercentage: number;
    changeSummary: string;
    hasSignificantChanges: boolean;
  } {
    if (oldContent === newContent) {
      return {
        changePercentage: 0,
        changeSummary: 'No changes detected',
        hasSignificantChanges: false,
      };
    }

    const diff = diffWords(oldContent, newContent);
    let addedWords = 0;
    let removedWords = 0;
    let totalWords = 0;

    diff.forEach(part => {
      const wordCount = part.value.split(/\s+/).length;
      totalWords += wordCount;
      
      if (part.added) {
        addedWords += wordCount;
      } else if (part.removed) {
        removedWords += wordCount;
      }
    });

    const changePercentage = ((addedWords + removedWords) / totalWords) * 100;
    const hasSignificantChanges = changePercentage > 5; // Consider 5% change as significant

    const changeSummary = [
      addedWords > 0 ? `+${addedWords} words added` : '',
      removedWords > 0 ? `-${removedWords} words removed` : '',
    ].filter(Boolean).join(', ') || 'Minor changes detected';

    return {
      changePercentage: Math.round(changePercentage * 100) / 100,
      changeSummary,
      hasSignificantChanges,
    };
  }

  /**
   * Crawl a website using a predefined template
   */
  async crawlWithTemplate(baseUrl: string, templateId: string): Promise<CrawlResult> {
    const template = getTemplateById(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    console.log(`🎯 Using template: ${template.name} for ${baseUrl}`);
    
    // Apply template-specific options
    const options: CrawlOptions = {
      ...template.crawlOptions,
      includePatterns: template.urlPatterns.include,
      excludePatterns: template.urlPatterns.exclude,
    };

    return this.crawlWebsite(baseUrl, options, template);
  }

  /**
   * Auto-detect and crawl with the best template for a URL
   */
  async crawlWithAutoTemplate(baseUrl: string): Promise<CrawlResult> {
    const template = suggestTemplateForUrl(baseUrl);
    console.log(`🤖 Auto-selected template: ${template.name} for ${baseUrl}`);
    
    return this.crawlWithTemplate(baseUrl, template.id);
  }

  /**
   * Crawl a website recursively with authentication support
   */
  async crawlWebsite(baseUrl: string, options: CrawlOptions, template?: WebsiteTemplate): Promise<CrawlResult> {
    const startTime = new Date();
    const pages: ScrapedPage[] = [];
    const errors: Array<{ url: string; error: string; needsCredentials?: boolean; loginMethod?: string }> = [];
    let savedContentCount = 0;
    
    this.visitedUrls.clear();
    this.failedUrls.clear();
    this.authAttempts = { sso: 0, credentials: 0, failed: 0 };

    try {
      console.log(`🕷️ Starting crawl of ${baseUrl} with max depth ${options.maxDepth}`);
      
      // Check for automatic SSO authentication for internal domains
      if (!this.authConfig && isInternalDomain(baseUrl)) {
        console.log(`🔐 Detected internal domain: ${baseUrl}`);
        console.log(`❌ Internal domain requires authentication. Please configure credentials manually in the Credentials Manager.`);
        
        // Provide helpful guidance
        const domain = new URL(baseUrl).hostname;
        let authGuide = '';
        
        if (domain.includes('atlassian')) {
          authGuide = 'For Atlassian sites: Use Cookie authentication with session cookies from your browser (F12 → Application → Cookies)';
        } else if (domain.includes('sharepoint') || domain.includes('office') || domain.includes('microsoft')) {
          authGuide = 'For SharePoint/Office 365: Use Cookie authentication with FedAuth cookies from your browser';
        } else if (domain.includes('google')) {
          authGuide = 'For Google sites: Use Cookie authentication with SAPISID/APISID cookies from your browser';
        } else {
          authGuide = 'For internal sites: Use Cookie authentication with session cookies from your browser (F12 → Developer Tools)';
        }
        
        errors.push({
          url: baseUrl,
          error: `Internal domain detected: ${domain}. Authentication required but no credentials configured.\n\n💡 ${authGuide}.\n\nPlease configure credentials in the Credentials Manager.`,
          needsCredentials: true,
          loginMethod: 'cookie'
        });
        
        return {
          baseUrl,
          pages,
          summary: {
            totalPages: 0,
            successfulPages: 0,
            failedPages: 1,
            errors,
            startTime,
            endTime: new Date(),
            duration: Date.now() - startTime.getTime(),
            authenticationAttempts: this.authAttempts,
          },
        };
      }
      
      await this.initializeBrowser();
      await this.setupAuthentication();

      const urlsToProcess: Array<{ url: string; depth: number; parentUrl?: string }> = [{ url: baseUrl, depth: 0, parentUrl: undefined }];
      let processedCount = 0;

      while (urlsToProcess.length > 0 && processedCount < options.maxPages) {
        const { url, depth, parentUrl } = urlsToProcess.shift()!;

        if (this.visitedUrls.has(url) || this.failedUrls.has(url)) {
          continue;
        }

        if (depth > options.maxDepth) {
          continue;
        }

                 if (!this.shouldProcessUrl(url, baseUrl, options, template)) {
          continue;
        }

        try {
          console.log(`📄 Processing ${url} (depth: ${depth})`);
          
          const page = await this.scrapePage(url, depth, parentUrl, options, template);
          pages.push(page);
          processedCount++;

          // Save content to file if enabled
          if (options.saveContent && page.content) {
            try {
              const authMethod = this.determineAuthMethod(url);
              const savedContent = await saveEnhancedScrapedPage(page, authMethod);
              page.savedFilePath = savedContent.filePath;
              savedContentCount++;
              console.log(`💾 Content saved: ${savedContent.filePath}`);
            } catch (saveError: any) {
              console.warn(`Failed to save content for ${url}:`, saveError.message);
            }
          }

          // Extract child URLs for further crawling
          if (depth < options.maxDepth) {
            const childUrls = this.extractChildUrls(page, baseUrl, options);
            childUrls.forEach(childUrl => {
              if (!this.visitedUrls.has(childUrl) && !this.failedUrls.has(childUrl)) {
                urlsToProcess.push({ url: childUrl, depth: depth + 1, parentUrl: url });
              }
            });
          }

          // Respect rate limiting
          if (options.delayBetweenRequests && options.delayBetweenRequests > 0) {
            await new Promise(resolve => setTimeout(resolve, options.delayBetweenRequests));
          }

        } catch (error: any) {
          console.error(`❌ Failed to scrape ${url}:`, error.message);
          
          const errorInfo = await this.analyzeError(url, error.message, options);
          errors.push(errorInfo);
          this.failedUrls.add(url);
          
          if (errorInfo.needsCredentials) {
            this.authAttempts.failed++;
          }
        }
      }

    } finally {
      await this.cleanup();
    }

    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();

    return {
      baseUrl,
      pages,
      summary: {
        totalPages: pages.length + errors.length,
        successfulPages: pages.length,
        failedPages: errors.length,
        errors,
        startTime,
        endTime,
        duration,
        savedContent: savedContentCount,
        authenticationAttempts: this.authAttempts,
      },
    };
  }

  /**
   * Analyze error and provide helpful suggestions
   */
  private async analyzeError(
    url: string, 
    errorMessage: string, 
    options: CrawlOptions
  ): Promise<{ url: string; error: string; needsCredentials?: boolean; loginMethod?: string }> {
    // Check if this is an authentication error
    const ssoSuggestion = suggestSSOSetup(url, errorMessage);
    
    if (ssoSuggestion.isAuthError) {
      const needsCredentials = ssoSuggestion.needsCredentials || false;
      let enhancedMessage = errorMessage;
      
      if (ssoSuggestion.suggestion) {
        enhancedMessage += `\n\n💡 ${ssoSuggestion.suggestion}`;
      }
      
      // For external sites, try to detect login method if credential prompting is enabled
      if (needsCredentials && options.enableCredentialPrompting && isExternalCredentialSite(url)) {
        try {
          // This would require additional browser context to analyze the login page
          const domain = new URL(url).hostname;
          const promptMessage = generateCredentialPrompt(domain, 'form');
          enhancedMessage += `\n\n🔑 ${promptMessage}`;
          
          return {
            url,
            error: enhancedMessage,
            needsCredentials: true,
            loginMethod: 'form',
          };
        } catch (analysisError) {
          console.warn(`Failed to analyze login page for ${url}:`, analysisError);
        }
      }
      
      return {
        url,
        error: enhancedMessage,
        needsCredentials,
      };
    }
    
    return { url, error: errorMessage };
  }

  /**
   * Determine authentication method used for a URL
   */
  private determineAuthMethod(url: string): 'sso' | 'credentials' | 'none' {
    if (this.authConfig?.type === 'sso' || isInternalDomain(url)) {
      return 'sso';
    } else if (this.authConfig && ['basic', 'form', 'cookie', 'header'].includes(this.authConfig.type)) {
      return 'credentials';
    }
    return 'none';
  }

  /**
   * Initialize browser with appropriate settings
   */
  private async initializeBrowser(): Promise<void> {
    this.browser = await chromium.launch({
      headless: true,
      timeout: 30000,
    });
  }

  /**
   * Setup authentication based on configuration
   */
  private async setupAuthentication(): Promise<void> {
    if (!this.authConfig || !this.browser) return;

    const context = await this.browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
    });

    // Setup different authentication types
    switch (this.authConfig.type) {
      case 'basic':
        if (this.authConfig.credentials.username && this.authConfig.credentials.password) {
          await context.setHTTPCredentials({
            username: this.authConfig.credentials.username,
            password: this.authConfig.credentials.password,
          });
          this.authAttempts.credentials++;
        }
        break;

      case 'header':
        if (this.authConfig.credentials.headers) {
          await context.setExtraHTTPHeaders(this.authConfig.credentials.headers);
          this.authAttempts.credentials++;
        }
        break;

      case 'cookie':
        if (this.authConfig.credentials.cookies) {
          await context.addCookies(this.authConfig.credentials.cookies.map(cookie => ({
            name: cookie.name,
            value: cookie.value,
            domain: cookie.domain || new URL(this.authConfig?.credentials.username || '').hostname,
            path: cookie.path || '/',
          })));
          this.authAttempts.credentials++;
        }
        break;

      case 'sso':
        // Handle SSO authentication with headers and cookies
        if (this.authConfig.credentials.headers) {
          await context.setExtraHTTPHeaders(this.authConfig.credentials.headers);
        }
        if (this.authConfig.credentials.cookies) {
          await context.addCookies(this.authConfig.credentials.cookies.map(cookie => ({
            name: cookie.name,
            value: cookie.value,
            domain: cookie.domain || '',
            path: cookie.path || '/',
          })));
        }
        break;
    }

    // Store the context for later use
    (this as any).context = context;
  }

  /**
   * Scrape a single page with enhanced error handling
   */
     private async scrapePage(url: string, depth: number, parentUrl?: string, options?: CrawlOptions, template?: WebsiteTemplate): Promise<ScrapedPage> {
    if (!this.browser) throw new Error('Browser not initialized');

    const context = (this as any).context || await this.browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

      // Check for login page and handle credential prompting
      if (options?.enableCredentialPrompting) {
        const loginDetection = await detectLoginPage(page, url);
        if (loginDetection.loginPageDetected && loginDetection.shouldPrompt) {
          console.log(`🔍 Login page detected for ${url}, method: ${loginDetection.loginMethod}`);
          
          // If we have form-based auth config, try to use it
          if (loginDetection.loginMethod === 'form' && this.authConfig?.type === 'form') {
            await this.handleFormAuthentication(page);
          } else {
            throw new Error(`Login page detected but no matching authentication configured. ${generateCredentialPrompt(new URL(url).hostname, loginDetection.loginMethod)}`);
          }
        }
      }

      // Handle form-based authentication if needed
      if (this.authConfig?.type === 'form' && this.authConfig.credentials.formSelector) {
        await this.handleFormAuthentication(page);
      }

      const html = await page.content();
      
      // Use enhanced Cheerio for better content extraction
      const $ = cheerio.load(html);
      
      // Extract structured data using Cheerio's advanced features
             const content = this.cleanTextContent(html, template);
       const title = await page.title() || $('title').text() || $('h1').first().text() || 'Untitled';
       const metadata = this.extractMetadata(html, url, depth, parentUrl, template);
      const contentHash = EnhancedWebScraper.generateContentHash(content);
      
      console.log(`📄 Enhanced extraction for ${url}: ${content.length} chars, ${metadata.links.length} links, ${metadata.images.length} images`);

      // Add authentication and content type metadata
      metadata.authMethod = this.determineAuthMethod(url);
      metadata.contentType = this.determineContentType(url, metadata.authMethod);

      this.visitedUrls.add(url);

      return {
        url,
        title,
        content,
        metadata,
        contentHash,
        timestamp: new Date(),
      };

    } finally {
      await page.close();
    }
  }

  /**
   * Determine content type based on URL and authentication
   */
  private determineContentType(url: string, authMethod: 'sso' | 'credentials' | 'none'): 'public' | 'internal' | 'credential-based' {
    if (authMethod === 'sso') {
      return 'internal';
    } else if (authMethod === 'credentials') {
      return 'credential-based';
    } else if (isInternalDomain(url)) {
      return 'internal';
    }
    return 'public';
  }

  /**
   * Handle form-based authentication with enhanced field detection
   */
  private async handleFormAuthentication(page: Page): Promise<void> {
    if (!this.authConfig?.credentials.formSelector) return;

    const {
      formSelector,
      usernameField,
      passwordField,
      submitButton,
      username,
      password,
    } = this.authConfig.credentials;

    try {
      // Wait for form to be available
      await page.waitForSelector(formSelector, { timeout: 10000 });

      // Fill username
      if (usernameField && username) {
        await page.fill(usernameField, username);
        console.log(`✅ Filled username field: ${usernameField}`);
      }

      // Fill password
      if (passwordField && password) {
        await page.fill(passwordField, password);
        console.log(`✅ Filled password field: ${passwordField}`);
      }

      // Submit form
      if (submitButton) {
        await page.click(submitButton);
        console.log(`✅ Clicked submit button: ${submitButton}`);
      } else {
        await page.press(passwordField || usernameField || `${formSelector} input`, 'Enter');
        console.log(`✅ Submitted form via Enter key`);
      }

      // Wait for navigation or content change
      await page.waitForLoadState('networkidle', { timeout: 10000 });
      
      // Check if we're still on a login page (login loop detection)
      const currentUrl = page.url();
      if (currentUrl.includes('/login') || currentUrl.includes('/signin')) {
        console.warn(`⚠️ Still on login page after authentication attempt: ${currentUrl}`);
        throw new Error('Authentication failed - still on login page. Please check credentials.');
      }

      console.log(`✅ Form authentication completed for ${page.url()}`);

    } catch (error: any) {
      console.error(`❌ Form authentication failed:`, error.message);
      throw new Error(`Form authentication failed: ${error.message}`);
    }
  }

  /**
   * Check if URL should be processed
   */
     private shouldProcessUrl(url: string, baseUrl: string, options: CrawlOptions, template?: WebsiteTemplate): boolean {
    try {
      const urlObj = new URL(url);
      const baseUrlObj = new URL(baseUrl);

      // Only process URLs from the same domain
      if (urlObj.hostname !== baseUrlObj.hostname) {
        return false;
      }

      // Check include patterns
      if (options.includePatterns && options.includePatterns.length > 0) {
        const matches = options.includePatterns.some(pattern => {
          const regex = new RegExp(pattern);
          return regex.test(url);
        });
        if (!matches) return false;
      }

      // Check exclude patterns
      if (options.excludePatterns && options.excludePatterns.length > 0) {
        const matches = options.excludePatterns.some(pattern => {
          const regex = new RegExp(pattern);
          return regex.test(url);
        });
        if (matches) return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Extract child URLs from scraped page
   */
  private extractChildUrls(page: ScrapedPage, baseUrl: string, options: CrawlOptions): string[] {
    const baseUrlObj = new URL(baseUrl);
    const childUrls: string[] = [];

    for (const link of page.metadata.links) {
      try {
        const linkUrl = new URL(link, baseUrl);
        
        // Only include links from the same domain
        if (linkUrl.hostname === baseUrlObj.hostname) {
          const normalizedUrl = linkUrl.href.split('#')[0]; // Remove fragments
          if (!this.visitedUrls.has(normalizedUrl) && !this.failedUrls.has(normalizedUrl)) {
            childUrls.push(normalizedUrl);
          }
        }
      } catch (error) {
        // Invalid URL, skip
      }
    }

    return [...new Set(childUrls)]; // Remove duplicates
  }

     /**
    * Clean and extract text content from HTML using enhanced Cheerio
    */
   private cleanTextContent(html: string, template?: WebsiteTemplate): string {
    const $ = cheerio.load(html);
    
         // Remove unwanted elements using template-specific selectors if available
     const excludeElements = template?.selectors.excludeElements || 
       ['script', 'style', 'nav', 'header', 'footer', 'aside', '.nav', '.navigation', '.menu', '.advertisement', '.ads', '.cookie-banner'];
     $(excludeElements.join(', ')).remove();
     
     // Use template-specific content selectors or fallback to default
     const contentSelectors = template?.selectors.contentPriority || [
       'article',
       'main', 
       '.content',
       '.post-content',
       '.entry-content',
       '.article-content',
       '#content',
      '#main-content',
      '.main-content'
    ];
    
    let mainContent = '';
    
    // Try to find main content using priority selectors
    for (const selector of contentSelectors) {
      const element = $(selector);
      if (element.length > 0 && element.text().trim().length > 100) {
        mainContent = element.text().trim();
        break;
      }
    }
    
    // Fallback to body if no main content found
    if (!mainContent) {
      mainContent = $('body').text().trim();
    }
    
    // Clean up whitespace and normalize text
    return mainContent
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();
  }

  /**
   * Extract metadata from HTML using enhanced Cheerio extraction
   */
     private extractMetadata(html: string, url: string, depth: number, parentUrl?: string, template?: WebsiteTemplate): ScrapedPage['metadata'] {
    const $ = cheerio.load(html);
    const domain = new URL(url).hostname;
    
    // Enhanced metadata extraction with multiple fallbacks
    const description = $('meta[name="description"]').attr('content') ||
      $('meta[property="og:description"]').attr('content') ||
      $('meta[name="twitter:description"]').attr('content') ||
      $('meta[property="article:description"]').attr('content');
    
    const keywords = $('meta[name="keywords"]').attr('content') ||
      $('meta[property="article:tag"]').attr('content');
      
    const author = $('meta[name="author"]').attr('content') ||
      $('meta[property="article:author"]').attr('content') ||
      $('meta[name="twitter:creator"]').attr('content') ||
      $('[rel="author"]').text().trim();
      
    const publishedDate = $('meta[property="article:published_time"]').attr('content') ||
      $('meta[name="date"]').attr('content') ||
      $('time[datetime]').attr('datetime') ||
      $('meta[property="og:updated_time"]').attr('content');
      
    const language = $('html').attr('lang') || 
      $('meta[http-equiv="content-language"]').attr('content') ||
      $('meta[name="language"]').attr('content');
    
    // Enhanced link extraction with validation
    const links: string[] = [];
    $('a[href]').each((_, element) => {
      const href = $(element).attr('href');
      if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
        try {
          const fullUrl = new URL(href, url).href;
          // Only include HTTP/HTTPS URLs
          if (fullUrl.startsWith('http://') || fullUrl.startsWith('https://')) {
            links.push(fullUrl);
          }
        } catch (error) {
          // Invalid URL, skip
        }
      }
    });
    
    // Enhanced image extraction with multiple sources
    const images: string[] = [];
    $('img[src], img[data-src], img[data-lazy-src]').each((_, element) => {
      const src = $(element).attr('src') || 
                  $(element).attr('data-src') || 
                  $(element).attr('data-lazy-src');
      if (src) {
        try {
          const fullUrl = new URL(src, url).href;
          if (fullUrl.startsWith('http://') || fullUrl.startsWith('https://')) {
            images.push(fullUrl);
          }
        } catch (error) {
          // Invalid URL, skip
        }
      }
    });
    
    // Enhanced heading extraction with structure
    const headings: string[] = [];
    $('h1, h2, h3, h4, h5, h6').each((_, element) => {
      const text = $(element).text().trim();
      const level = $(element).prop('tagName')?.toLowerCase();
      if (text && level) {
        headings.push(`${level.toUpperCase()}: ${text}`);
      }
    });
    
    const content = this.cleanTextContent(html);
    
    return {
      domain,
      links: [...new Set(links)],
      images: [...new Set(images)],
      headings,
      description,
      keywords,
      author,
      publishedDate,
      wordCount: content.split(/\s+/).filter(word => word.length > 0).length,
      language,
      depth,
      parentUrl,
    };
  }

  /**
   * Cleanup resources
   */
  private async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
} 