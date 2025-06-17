import { CrawlOptions } from './enhanced-web-scraper';

export interface WebsiteTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'documentation' | 'ecommerce' | 'news' | 'corporate' | 'blog' | 'wiki' | 'social' | 'custom';
  crawlOptions: CrawlOptions;
  selectors: {
    contentPriority: string[];
    excludeElements: string[];
    linkPatterns: string[];
    titleSelectors: string[];
    descriptionSelectors: string[];
  };
  urlPatterns: {
    include: string[];
    exclude: string[];
    followPatterns: string[];
  };
  metadata: {
    detectArticles: boolean;
    extractAuthors: boolean;
    extractDates: boolean;
    extractCategories: boolean;
    extractTags: boolean;
  };
  behaviors: {
    respectRobots: boolean;
    delayBetweenRequests: number;
    retryFailedPages: boolean;
    skipDuplicateContent: boolean;
    extractImages: boolean;
    extractDownloads: boolean;
  };
}

export const WEBSITE_TEMPLATES: WebsiteTemplate[] = [
  {
    id: 'documentation-deep',
    name: '📚 Documentation Deep Dive',
    description: 'Comprehensive scraping for documentation sites, APIs, guides, and technical content',
    icon: '📚',
    category: 'documentation',
    crawlOptions: {
      maxDepth: 5,
      maxPages: 100,
      waitForDynamic: true,
      timeout: 30000,
      delayBetweenRequests: 1000,
      respectRobots: true,
      saveContent: true,
      enableCredentialPrompting: true,
    },
    selectors: {
      contentPriority: [
        'main',
        'article',
        '.content',
        '.documentation',
        '.docs-content',
        '.guide-content',
        '.api-docs',
        '.markdown-body',
        '#content',
        '.post-content'
      ],
      excludeElements: [
        'nav',
        'header',
        'footer',
        '.sidebar',
        '.navigation',
        '.breadcrumb',
        '.table-of-contents',
        '.search',
        '.comments',
        '.social-share'
      ],
      linkPatterns: [
        '/docs/',
        '/documentation/',
        '/guide/',
        '/api/',
        '/reference/',
        '/tutorial/',
        '/help/',
        '/manual/',
        '/wiki/'
      ],
      titleSelectors: ['h1', '.page-title', '.doc-title', 'title'],
      descriptionSelectors: [
        'meta[name="description"]',
        '.description',
        '.summary',
        '.lead'
      ]
    },
    urlPatterns: {
      include: ['docs', 'documentation', 'guide', 'api', 'reference', 'tutorial', 'help', 'manual', 'wiki'],
      exclude: ['login', 'register', 'admin', 'dashboard', 'profile', 'settings'],
      followPatterns: [
        '*/docs/*',
        '*/documentation/*',
        '*/guide/*',
        '*/api/*',
        '*/reference/*',
        '*/tutorial/*',
        '*/help/*',
        '*/manual/*',
        '*/wiki/*'
      ]
    },
    metadata: {
      detectArticles: true,
      extractAuthors: true,
      extractDates: true,
      extractCategories: true,
      extractTags: true,
    },
    behaviors: {
      respectRobots: true,
      delayBetweenRequests: 1000,
      retryFailedPages: true,
      skipDuplicateContent: true,
      extractImages: true,
      extractDownloads: true,
    }
  },

  {
    id: 'corporate-comprehensive',
    name: '🏢 Corporate Site Complete',
    description: 'Full corporate website analysis including products, services, news, and resources',
    icon: '🏢',
    category: 'corporate',
    crawlOptions: {
      maxDepth: 4,
      maxPages: 150,
      waitForDynamic: true,
      timeout: 45000,
      delayBetweenRequests: 2000,
      respectRobots: true,
      saveContent: true,
      enableCredentialPrompting: true,
    },
    selectors: {
      contentPriority: [
        'main',
        'article',
        '.content',
        '.page-content',
        '.main-content',
        '.hero-content',
        '.product-info',
        '.service-description',
        '.news-content',
        '#content'
      ],
      excludeElements: [
        'nav',
        'header',
        'footer',
        '.cookie-banner',
        '.chat-widget',
        '.social-media',
        '.advertisement',
        '.popup',
        '.modal'
      ],
      linkPatterns: [
        '/products/',
        '/services/',
        '/solutions/',
        '/about/',
        '/news/',
        '/press/',
        '/resources/',
        '/support/',
        '/contact/',
        '/careers/'
      ],
      titleSelectors: ['h1', '.page-title', '.hero-title', 'title'],
      descriptionSelectors: [
        'meta[name="description"]',
        '.page-description',
        '.hero-description',
        '.summary'
      ]
    },
    urlPatterns: {
      include: ['products', 'services', 'solutions', 'about', 'news', 'press', 'resources', 'support', 'careers'],
      exclude: ['login', 'register', 'admin', 'checkout', 'cart', 'account'],
      followPatterns: [
        '*/products/*',
        '*/services/*',
        '*/solutions/*',
        '*/about/*',
        '*/news/*',
        '*/press/*',
        '*/resources/*',
        '*/support/*',
        '*/careers/*'
      ]
    },
    metadata: {
      detectArticles: true,
      extractAuthors: true,
      extractDates: true,
      extractCategories: true,
      extractTags: false,
    },
    behaviors: {
      respectRobots: true,
      delayBetweenRequests: 2000,
      retryFailedPages: true,
      skipDuplicateContent: true,
      extractImages: true,
      extractDownloads: true,
    }
  },

  {
    id: 'news-blog-aggressive',
    name: '📰 News & Blog Aggressive',
    description: 'Comprehensive news site and blog scraping with article extraction',
    icon: '📰',
    category: 'news',
    crawlOptions: {
      maxDepth: 3,
      maxPages: 200,
      waitForDynamic: true,
      timeout: 20000,
      delayBetweenRequests: 800,
      respectRobots: true,
      saveContent: true,
      enableCredentialPrompting: false,
    },
    selectors: {
      contentPriority: [
        'article',
        '.article-content',
        '.post-content',
        '.entry-content',
        '.news-content',
        '.blog-content',
        'main',
        '.content'
      ],
      excludeElements: [
        'nav',
        'header',
        'footer',
        '.sidebar',
        '.comments',
        '.social-share',
        '.related-articles',
        '.advertisement',
        '.newsletter-signup'
      ],
      linkPatterns: [
        '/article/',
        '/post/',
        '/news/',
        '/blog/',
        '/story/',
        '/category/',
        '/tag/',
        '/archive/'
      ],
      titleSelectors: ['h1', '.article-title', '.post-title', '.headline'],
      descriptionSelectors: [
        'meta[name="description"]',
        '.article-summary',
        '.excerpt',
        '.lead'
      ]
    },
    urlPatterns: {
      include: ['article', 'post', 'news', 'blog', 'story', 'category', 'tag'],
      exclude: ['login', 'register', 'subscribe', 'newsletter', 'admin'],
      followPatterns: [
        '*/article/*',
        '*/post/*',
        '*/news/*',
        '*/blog/*',
        '*/story/*',
        '*/category/*',
        '*/tag/*'
      ]
    },
    metadata: {
      detectArticles: true,
      extractAuthors: true,
      extractDates: true,
      extractCategories: true,
      extractTags: true,
    },
    behaviors: {
      respectRobots: true,
      delayBetweenRequests: 800,
      retryFailedPages: true,
      skipDuplicateContent: true,
      extractImages: true,
      extractDownloads: false,
    }
  },

  {
    id: 'ecommerce-catalog',
    name: '🛒 E-commerce Catalog',
    description: 'Product catalog scraping with pricing, descriptions, and specifications',
    icon: '🛒',
    category: 'ecommerce',
    crawlOptions: {
      maxDepth: 4,
      maxPages: 300,
      waitForDynamic: true,
      timeout: 30000,
      delayBetweenRequests: 1500,
      respectRobots: true,
      saveContent: true,
      enableCredentialPrompting: false,
    },
    selectors: {
      contentPriority: [
        '.product-content',
        '.product-description',
        '.product-details',
        '.item-description',
        'main',
        '.content',
        '.catalog-content'
      ],
      excludeElements: [
        'nav',
        'header',
        'footer',
        '.cart',
        '.checkout',
        '.reviews',
        '.recommendations',
        '.social-share',
        '.advertisement'
      ],
      linkPatterns: [
        '/product/',
        '/item/',
        '/catalog/',
        '/category/',
        '/shop/',
        '/store/',
        '/collection/'
      ],
      titleSelectors: ['h1', '.product-title', '.item-title', '.product-name'],
      descriptionSelectors: [
        'meta[name="description"]',
        '.product-description',
        '.product-summary',
        '.item-description'
      ]
    },
    urlPatterns: {
      include: ['product', 'item', 'catalog', 'category', 'shop', 'store', 'collection'],
      exclude: ['cart', 'checkout', 'payment', 'account', 'login', 'register'],
      followPatterns: [
        '*/product/*',
        '*/item/*',
        '*/catalog/*',
        '*/category/*',
        '*/shop/*',
        '*/store/*',
        '*/collection/*'
      ]
    },
    metadata: {
      detectArticles: false,
      extractAuthors: false,
      extractDates: false,
      extractCategories: true,
      extractTags: true,
    },
    behaviors: {
      respectRobots: true,
      delayBetweenRequests: 1500,
      retryFailedPages: true,
      skipDuplicateContent: true,
      extractImages: true,
      extractDownloads: false,
    }
  },

  {
    id: 'wiki-knowledge',
    name: '📖 Wiki Knowledge Base',
    description: 'Comprehensive wiki and knowledge base scraping with cross-references',
    icon: '📖',
    category: 'wiki',
    crawlOptions: {
      maxDepth: 6,
      maxPages: 500,
      waitForDynamic: false,
      timeout: 25000,
      delayBetweenRequests: 500,
      respectRobots: true,
      saveContent: true,
      enableCredentialPrompting: true,
    },
    selectors: {
      contentPriority: [
        '.mw-content-text',
        '.wiki-content',
        '#content',
        'main',
        'article',
        '.page-content',
        '.entry-content'
      ],
      excludeElements: [
        'nav',
        'header',
        'footer',
        '.sidebar',
        '.navigation',
        '.toc',
        '.references',
        '.infobox',
        '.navbox'
      ],
      linkPatterns: [
        '/wiki/',
        '/page/',
        '/article/',
        '/entry/',
        '/topic/',
        '/category/',
        '/namespace/'
      ],
      titleSelectors: ['h1', '.firstHeading', '.page-title', 'title'],
      descriptionSelectors: [
        'meta[name="description"]',
        '.page-summary',
        '.description'
      ]
    },
    urlPatterns: {
      include: ['wiki', 'page', 'article', 'entry', 'topic', 'category'],
      exclude: ['talk', 'user', 'special', 'help', 'template'],
      followPatterns: [
        '*/wiki/*',
        '*/page/*',
        '*/article/*',
        '*/entry/*',
        '*/topic/*',
        '*/category/*'
      ]
    },
    metadata: {
      detectArticles: true,
      extractAuthors: true,
      extractDates: true,
      extractCategories: true,
      extractTags: true,
    },
    behaviors: {
      respectRobots: true,
      delayBetweenRequests: 500,
      retryFailedPages: true,
      skipDuplicateContent: true,
      extractImages: true,
      extractDownloads: true,
    }
  },

  {
    id: 'social-platform',
    name: '🌐 Social Platform',
    description: 'Social media and community platform scraping (public content only)',
    icon: '🌐',
    category: 'social',
    crawlOptions: {
      maxDepth: 3,
      maxPages: 100,
      waitForDynamic: true,
      timeout: 15000,
      delayBetweenRequests: 2000,
      respectRobots: true,
      saveContent: true,
      enableCredentialPrompting: true,
    },
    selectors: {
      contentPriority: [
        '.post-content',
        '.message-content',
        '.comment-content',
        '.status-content',
        'main',
        '.content',
        'article'
      ],
      excludeElements: [
        'nav',
        'header',
        'footer',
        '.sidebar',
        '.advertisement',
        '.suggested-content',
        '.social-actions',
        '.share-buttons'
      ],
      linkPatterns: [
        '/post/',
        '/status/',
        '/profile/',
        '/user/',
        '/topic/',
        '/discussion/',
        '/thread/'
      ],
      titleSelectors: ['h1', '.post-title', '.status-title', 'title'],
      descriptionSelectors: [
        'meta[name="description"]',
        '.post-summary',
        '.description'
      ]
    },
    urlPatterns: {
      include: ['post', 'status', 'profile', 'user', 'topic', 'discussion', 'thread'],
      exclude: ['login', 'register', 'settings', 'private', 'admin'],
      followPatterns: [
        '*/post/*',
        '*/status/*',
        '*/profile/*',
        '*/user/*',
        '*/topic/*',
        '*/discussion/*',
        '*/thread/*'
      ]
    },
    metadata: {
      detectArticles: true,
      extractAuthors: true,
      extractDates: true,
      extractCategories: false,
      extractTags: true,
    },
    behaviors: {
      respectRobots: true,
      delayBetweenRequests: 2000,
      retryFailedPages: false,
      skipDuplicateContent: true,
      extractImages: false,
      extractDownloads: false,
    }
  },

  {
    id: 'custom-aggressive',
    name: '⚡ Custom Aggressive',
    description: 'Maximum depth scraping for unknown sites - use with caution',
    icon: '⚡',
    category: 'custom',
    crawlOptions: {
      maxDepth: 8,
      maxPages: 1000,
      waitForDynamic: true,
      timeout: 60000,
      delayBetweenRequests: 3000,
      respectRobots: false,
      saveContent: true,
      enableCredentialPrompting: true,
    },
    selectors: {
      contentPriority: [
        'main',
        'article',
        '.content',
        '.main-content',
        '.page-content',
        '#content',
        '.entry-content',
        '.post-content',
        'body'
      ],
      excludeElements: [
        'nav',
        'header',
        'footer',
        'script',
        'style',
        '.advertisement',
        '.popup',
        '.modal',
        '.cookie-banner'
      ],
      linkPatterns: ['*'],
      titleSelectors: ['h1', '.title', '.page-title', 'title'],
      descriptionSelectors: [
        'meta[name="description"]',
        '.description',
        '.summary'
      ]
    },
    urlPatterns: {
      include: ['*'],
      exclude: ['javascript:', 'mailto:', 'tel:', '#', 'data:'],
      followPatterns: ['*']
    },
    metadata: {
      detectArticles: true,
      extractAuthors: true,
      extractDates: true,
      extractCategories: true,
      extractTags: true,
    },
    behaviors: {
      respectRobots: false,
      delayBetweenRequests: 3000,
      retryFailedPages: true,
      skipDuplicateContent: true,
      extractImages: true,
      extractDownloads: true,
    }
  }
];

export function getTemplateById(id: string): WebsiteTemplate | undefined {
  return WEBSITE_TEMPLATES.find(template => template.id === id);
}

export function getTemplatesByCategory(category: WebsiteTemplate['category']): WebsiteTemplate[] {
  return WEBSITE_TEMPLATES.filter(template => template.category === category);
}

export function suggestTemplateForUrl(url: string): WebsiteTemplate {
  const domain = new URL(url).hostname.toLowerCase();
  const path = new URL(url).pathname.toLowerCase();

  // Documentation sites
  if (domain.includes('docs') || path.includes('/docs/') || 
      domain.includes('documentation') || path.includes('/documentation/')) {
    return getTemplateById('documentation-deep')!;
  }

  // Wiki sites
  if (domain.includes('wiki') || path.includes('/wiki/') ||
      domain.includes('wikipedia') || domain.includes('confluence')) {
    return getTemplateById('wiki-knowledge')!;
  }

  // E-commerce sites
  if (domain.includes('shop') || domain.includes('store') ||
      path.includes('/product/') || path.includes('/catalog/') ||
      domain.includes('amazon') || domain.includes('ebay') ||
      domain.includes('etsy') || domain.includes('shopify')) {
    return getTemplateById('ecommerce-catalog')!;
  }

  // News and blog sites
  if (domain.includes('news') || domain.includes('blog') ||
      path.includes('/blog/') || path.includes('/news/') ||
      path.includes('/article/') || path.includes('/post/')) {
    return getTemplateById('news-blog-aggressive')!;
  }

  // Social platforms
  if (domain.includes('reddit') || domain.includes('forum') ||
      domain.includes('community') || domain.includes('discord') ||
      path.includes('/forum/') || path.includes('/community/')) {
    return getTemplateById('social-platform')!;
  }

  // Corporate sites (default)
  return getTemplateById('corporate-comprehensive')!;
}

export function createCustomTemplate(
  name: string,
  maxDepth: number,
  maxPages: number,
  includePatterns: string[] = [],
  excludePatterns: string[] = []
): WebsiteTemplate {
  return {
    id: `custom-${Date.now()}`,
    name: `🔧 ${name}`,
    description: `Custom template: ${name}`,
    icon: '🔧',
    category: 'custom',
    crawlOptions: {
      maxDepth,
      maxPages,
      includePatterns,
      excludePatterns,
      waitForDynamic: true,
      timeout: 30000,
      delayBetweenRequests: 1500,
      respectRobots: true,
      saveContent: true,
      enableCredentialPrompting: true,
    },
    selectors: {
      contentPriority: ['main', 'article', '.content', '#content', 'body'],
      excludeElements: ['nav', 'header', 'footer', 'script', 'style'],
      linkPatterns: includePatterns.length > 0 ? includePatterns : ['*'],
      titleSelectors: ['h1', '.title', 'title'],
      descriptionSelectors: ['meta[name="description"]', '.description']
    },
    urlPatterns: {
      include: includePatterns,
      exclude: excludePatterns,
      followPatterns: includePatterns.length > 0 ? includePatterns : ['*']
    },
    metadata: {
      detectArticles: true,
      extractAuthors: true,
      extractDates: true,
      extractCategories: true,
      extractTags: true,
    },
    behaviors: {
      respectRobots: true,
      delayBetweenRequests: 1500,
      retryFailedPages: true,
      skipDuplicateContent: true,
      extractImages: true,
      extractDownloads: true,
    }
  };
} 