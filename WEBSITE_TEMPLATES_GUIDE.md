# 🎯 Website Templates for Intelligent Web Scraping

## Overview

The **Website Template System** provides predefined, intelligent scraping configurations for different types of websites. Instead of manually configuring scraping parameters, you can select templates optimized for specific website categories like documentation sites, corporate websites, e-commerce platforms, and more.

## 🚀 Key Features

### **🤖 Auto-Detection**
- Automatically suggests the best template based on URL patterns
- Analyzes domain and path structure to recommend optimal settings
- Fallback to corporate template for unknown site types

### **🎯 Predefined Templates**
- **📚 Documentation Deep Dive**: Technical docs, APIs, guides
- **🏢 Corporate Site Complete**: Company websites, services, products
- **⚡ Custom Aggressive**: Maximum depth scraping for unknown sites

### **🔧 Intelligent Configuration**
- Template-specific content selectors for better extraction
- Optimized crawling depths and page limits
- Customized delay patterns and robots.txt respect
- Enhanced error handling and authentication support

## 📋 Available Templates

### **📚 Documentation Deep Dive**
**Best For**: API docs, technical guides, developer documentation
- **Max Depth**: 5 levels
- **Max Pages**: 100 pages
- **Delay**: 1 second between requests
- **Special Features**:
  - Prioritizes `main`, `article`, `.docs-content` selectors
  - Follows `/docs/`, `/api/`, `/guide/` patterns
  - Extracts code examples and technical content
  - Respects robots.txt

**URL Patterns**: 
- `docs.example.com`
- `example.com/documentation/`
- `api.example.com`

### **🏢 Corporate Site Complete**  
**Best For**: Company websites, business services, corporate content
- **Max Depth**: 4 levels
- **Max Pages**: 150 pages
- **Delay**: 2 seconds between requests
- **Special Features**:
  - Targets `.hero-content`, `.product-info`, `.service-description`
  - Follows `/products/`, `/services/`, `/about/` patterns
  - Extracts corporate news and press releases
  - Enhanced timeout for slow corporate sites

**URL Patterns**:
- Corporate domains
- `/products/`, `/services/`, `/solutions/`
- Company homepages

### **⚡ Custom Aggressive**
**Best For**: Unknown sites, maximum coverage scraping
- **Max Depth**: 8 levels ⚠️
- **Max Pages**: 1000 pages ⚠️
- **Delay**: 3 seconds between requests
- **Special Features**:
  - Does NOT respect robots.txt
  - Maximum content extraction
  - Extended timeouts (60 seconds)
  - Comprehensive error recovery

**⚠️ Warning**: Use responsibly - this template can generate heavy server load

## 🔨 How to Use Templates

### **1. Auto-Detection (Recommended)**
```typescript
// The system automatically selects the best template
const result = await enhancedWebScraper.crawlWithAutoTemplate('https://docs.example.com');
```

### **2. Specific Template Selection**
```typescript
// Use a specific template
const result = await enhancedWebScraper.crawlWithTemplate(
  'https://api.example.com', 
  'documentation-deep'
);
```

### **3. Via UI Template Selector**
1. Navigate to **Enhanced Web Analysis**
2. Enter your URL
3. Select template from dropdown:
   - **🤖 Auto-Detect Template** (recommended)
   - **📚 Documentation Deep Dive**
   - **🏢 Corporate Site Complete**  
   - **⚡ Custom Aggressive**
4. Review template settings
5. Click **Start Enhanced Analysis**

## 🛠️ Template Configuration Details

### **Content Extraction Priority**
Each template uses optimized CSS selectors:

```typescript
// Documentation Template
contentPriority: [
  'main',
  'article', 
  '.documentation',
  '.docs-content',
  '.api-docs',
  '.markdown-body'
]

// Corporate Template  
contentPriority: [
  'main',
  'article',
  '.hero-content',
  '.product-info', 
  '.service-description',
  '.news-content'
]
```

### **URL Pattern Matching**
Templates intelligently follow relevant links:

```typescript
// Documentation patterns
followPatterns: [
  '*/docs/*',
  '*/api/*', 
  '*/guide/*',
  '*/reference/*'
]

// Corporate patterns
followPatterns: [
  '*/products/*',
  '*/services/*',
  '*/about/*',
  '*/news/*'
]
```

### **Enhanced Metadata Extraction**
Templates extract relevant metadata:

- **Documentation**: Authors, publish dates, code examples
- **Corporate**: Product info, service descriptions, company news
- **Aggressive**: Everything available

## 🎛️ Advanced Configuration

### **Custom Template Creation**
```typescript
import { createCustomTemplate } from '@/lib/website-templates';

const myTemplate = createCustomTemplate(
  'E-commerce Site',
  4, // maxDepth
  200, // maxPages  
  ['/product/', '/category/'], // includePatterns
  ['/cart/', '/checkout/'] // excludePatterns
);
```

### **Template-Specific Behaviors**
```typescript
behaviors: {
  respectRobots: true,        // Follow robots.txt
  delayBetweenRequests: 1000, // Milliseconds delay
  retryFailedPages: true,     // Retry on failures
  skipDuplicateContent: true, // Avoid duplicate content
  extractImages: true,        // Extract image references
  extractDownloads: true      // Extract downloadable files
}
```

## 📊 Performance Optimization

### **Recommended Settings by Site Type**

| Site Type | Template | Max Depth | Max Pages | Delay | Robots.txt |
|-----------|----------|-----------|-----------|-------|------------|
| Documentation | 📚 Deep Dive | 5 | 100 | 1s | ✅ Respect |
| Corporate | 🏢 Complete | 4 | 150 | 2s | ✅ Respect |  
| Unknown | ⚡ Aggressive | 8 | 1000 | 3s | ❌ Ignore |

### **Best Practices**

1. **Start with Auto-Detection**: Let the system choose the optimal template
2. **Use Conservative Settings**: Start with lower depth/pages for unknown sites
3. **Respect Rate Limits**: Increase delays for slower sites
4. **Monitor Performance**: Watch for timeouts and adjust accordingly
5. **Review Results**: Check extraction quality and adjust selectors if needed

## 🔐 Authentication Integration

Templates work seamlessly with the **Enhanced Credential System**:

### **Supported Authentication Methods**
- **🍪 Cookie Authentication**: Session cookies from browser
- **🔑 Basic Authentication**: Username/password
- **📝 Form Authentication**: Automated form filling
- **🎫 Header Authentication**: API tokens, bearer tokens
- **🔐 SSO Integration**: Internal domain authentication

### **Template-Specific Auth Handling**
```typescript
// Templates automatically detect authentication requirements
const template = getTemplateById('documentation-deep');
template.crawlOptions.enableCredentialPrompting = true;

// Corporate sites often need authentication
if (template.category === 'corporate' && isInternalDomain(url)) {
  // Prompt for credentials or use existing ones
}
```

## 🎯 Template Selection Logic

### **Auto-Detection Algorithm**
```typescript
function suggestTemplateForUrl(url: string): WebsiteTemplate {
  const domain = url.hostname.toLowerCase();
  const path = url.pathname.toLowerCase();

  // Documentation sites
  if (domain.includes('docs') || path.includes('/docs/')) {
    return getTemplateById('documentation-deep');
  }
  
  // Default to corporate template
  return getTemplateById('corporate-comprehensive');
}
```

### **Manual Override Options**
1. **Template Dropdown**: Select specific template in UI
2. **Custom Configuration**: Define your own rules
3. **API Parameter**: Pass `templateId` to scraping functions

## 📈 Results and Analytics

### **Template Performance Metrics**
- **Success Rate**: Percentage of pages successfully scraped
- **Content Quality**: Amount and relevance of extracted text
- **Authentication Success**: Successful credential usage
- **Error Analysis**: Common failure patterns

### **Template Effectiveness Indicators**
- **High Success Rate**: Template selectors work well
- **Rich Content Extraction**: Good content/noise ratio
- **Efficient Crawling**: Finds relevant pages quickly
- **Minimal Errors**: Few authentication or timeout issues

## 🆘 Troubleshooting

### **Common Issues**

#### **Low Content Extraction**
- **Problem**: Template extracting very little text
- **Solution**: Try different template or custom selectors
- **Example**: Switch from Corporate to Aggressive template

#### **Authentication Failures**  
- **Problem**: Many "authentication required" errors
- **Solution**: Configure credentials in Credentials Manager
- **Example**: Add cookie authentication for internal sites

#### **Timeout Errors**
- **Problem**: Pages timing out during scraping
- **Solution**: Increase timeout or reduce concurrency
- **Example**: Corporate sites may need 45-60 second timeouts

#### **Robots.txt Blocking**
- **Problem**: Many pages blocked by robots.txt
- **Solution**: Use Custom Aggressive template (use responsibly)
- **Example**: Some sites have overly restrictive robots.txt

### **Template Debugging**
1. **Check Template Selection**: Verify correct template is auto-selected
2. **Review Content Selectors**: Ensure selectors match site structure
3. **Test URL Patterns**: Confirm follow patterns include relevant links
4. **Monitor Delays**: Adjust timing for site responsiveness
5. **Examine Errors**: Look for patterns in failed pages

## 🔮 Future Enhancements

### **Planned Template Additions**
- **📰 News & Blog Aggressive**: Optimized for news sites and blogs
- **🛒 E-commerce Catalog**: Product and pricing extraction
- **📖 Wiki Knowledge Base**: Wikipedia and wiki-style sites
- **🌐 Social Platform**: Public social media content
- **🎓 Educational Content**: Universities and learning platforms

### **Advanced Features Coming**
- **🤖 AI-Powered Template Generation**: Create templates from site analysis
- **📊 Dynamic Template Optimization**: Self-improving based on results
- **🔄 Template Versioning**: Track template changes and improvements
- **📈 Performance Analytics**: Detailed template effectiveness metrics

## 💡 Pro Tips

1. **Test on Sample Pages**: Try templates on a few pages before full crawls
2. **Monitor Resource Usage**: Watch server load during aggressive scraping  
3. **Combine with Scheduling**: Use templates with scheduled jobs for monitoring
4. **Leverage Change Detection**: Templates work great with change tracking
5. **Document Custom Configs**: Save and share effective custom templates

---

**Need Help?** The template system is designed to make web scraping more intelligent and efficient. Start with auto-detection and adjust based on your specific needs! 