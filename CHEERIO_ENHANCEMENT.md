# Enhanced Cheerio Web Scraping

## Overview

The web scraping capabilities have been significantly enhanced using Cheerio's advanced features. This update leverages Cheerio's `fromURL` and `extract` methods for more efficient, accurate, and comprehensive content extraction with **content preview** and **knowledge base integration**.

## Key Improvements

### 1. Advanced Structured Data Extraction

The new implementation uses Cheerio's `extract` method to systematically pull structured data:

```typescript
const extractedData = $.extract({
  title: { selector: 'title', value: 'text' },
  metaTitle: { selector: 'meta[property="og:title"]', value: 'content' },
  description: { selector: 'meta[name="description"]', value: 'content' },
  headings: [{ selector: 'h1, h2, h3, h4, h5, h6', value: 'text' }],
  links: [{ selector: 'a[href]', value: { href: 'href', text: 'text' } }],
  // ... and much more
});
```

### 2. Enhanced Metadata Collection

The scraper now extracts comprehensive metadata including:

- **SEO Data**: Meta descriptions, keywords, Open Graph tags, Twitter cards
- **Content Structure**: Headings, links, images with full URL resolution
- **Publishing Info**: Author, publish date, last modified date, language
- **Rich Snippets**: JSON-LD structured data extraction
- **Reading Metrics**: Word count, estimated reading time
- **Technical Data**: Canonical URLs, content type, schema markup

### 3. Improved Content Cleaning

The new text cleaning algorithm:

- **Intelligent Content Selection**: Prioritizes `<article>`, `<main>`, and content-specific containers
- **Better Noise Removal**: Removes navigation, advertisements, cookie banners, and popups
- **Formatting Preservation**: Optional markdown-style formatting for headings and lists
- **Unicode Support**: Proper handling of international characters
- **Structure Awareness**: Maintains content hierarchy and relationships

### 4. Intelligent Fallback Strategy

```typescript
// 1. Try enhanced Cheerio scraping first (fast & efficient)
return await scrapeWithCheerio(url, options);

// 2. Fall back to Playwright for JS-heavy sites if needed
return await scrapeDynamic(url, options);
```

### 5. Enhanced Error Handling

More specific error messages and handling:

- **Network Issues**: ENOTFOUND, ECONNREFUSED, ETIMEDOUT
- **HTTP Errors**: 401 (Authentication), 403 (Forbidden), 404 (Not Found), 429 (Rate Limit)
- **Server Errors**: 5xx status codes with appropriate messaging
- **Content Issues**: Graceful handling of malformed HTML and invalid JSON-LD

## 🆕 New Features

### Content Preview System

**Preview Before Saving**: Users can now preview extracted content before adding it to their knowledge base.

#### Features:
- **Full Content Preview**: Shows title, summary, and complete extracted text
- **Metadata Display**: Quick stats (reading time, word count, links, images)
- **Copy Functionality**: One-click copying of title, content, or metadata
- **Expandable View**: Toggle between preview and full content view
- **Visual Indicators**: Color-coded sections for different content types

```typescript
// Example preview structure
interface ContentPreview {
  title: string;
  summary?: string;
  content: string;
  metadata: {
    readingTime: number;
    wordCount: number;
    links: string[];
    images: string[];
    // ... more metadata
  };
}
```

### Knowledge Base Integration

**Direct Save to KB**: Seamless integration with the knowledge base system.

#### Features:
- **One-Click Save**: Save analyzed content directly to knowledge base
- **Chunking & Embedding**: Automatic content processing for AI search
- **Progress Feedback**: Real-time status updates during save process
- **Duplicate Detection**: Prevents saving the same URL multiple times
- **Batch Processing**: Efficiently handles large content chunks

```typescript
// Example save process
const saveResult = await addWebContentToKnowledge(tenantId, url, {
  waitForDynamic: false,
  generateSummary: true,
});

// Returns: { success: true, chunksCount: 5, documentId: "..." }
```

### JSON-LD Structured Data Extraction

Automatically extracts and parses JSON-LD structured data:

```typescript
// Extracts schema.org markup for:
// - Articles, BlogPosts, NewsArticles
// - Products, Organizations, People
// - Events, Reviews, FAQs
// - And any other structured data
```

### Reading Time Calculation

Estimates reading time based on average reading speed (200 words/minute).

### Comprehensive Link and Image Processing

- **Full URL Resolution**: Relative URLs converted to absolute
- **Deduplication**: Removes duplicate links and images
- **Metadata Extraction**: Alt text, titles, dimensions for images

### Advanced Content Selectors

Prioritized content extraction using:
1. `<article>` tags
2. `<main>` content areas
3. `[role="main"]` elements
4. Common content class patterns
5. Fallback to `<body>` content

## User Interface Enhancements

### 1. Enhanced Analysis Form

The standard web analysis form now includes:

- **Real-time Preview**: Immediate content preview after analysis
- **Save Integration**: Direct save to knowledge base from preview
- **Quick Stats**: Reading time, word count, links, and images at a glance
- **Copy Functionality**: Easy copying of titles and content
- **Visual Feedback**: Progress indicators and status updates

### 2. Advanced Demo Interface

The Enhanced Cheerio Demo provides:

- **Comprehensive Metadata View**: All extracted metadata with icons and descriptions
- **Schema Data Viewer**: JSON-LD structured data with copy functionality
- **Link & Image Lists**: Clickable lists of extracted resources
- **Interactive Elements**: Hover effects and action buttons
- **Export Options**: Copy individual fields or entire datasets

### 3. Content Management

- **Preview Cards**: Rich content cards with metadata
- **Action Buttons**: Save, copy, visit original, and more
- **Status Indicators**: Visual feedback for analysis and save states
- **Responsive Design**: Works on all screen sizes

## Usage Examples

### Basic Enhanced Scraping with Preview

```typescript
import { scrapeWebsite } from '@/lib/web-scraper';

const result = await scrapeWebsite('https://example.com', {
  extractSchema: true,
  preserveFormatting: false,
  maxContentLength: 20000
});

console.log(result.metadata.readingTime); // "5 minutes"
console.log(result.metadata.schemaData); // [{ @type: "Article", ... }]
```

### Analysis with Knowledge Base Save

```typescript
// 1. Analyze content
const analysis = await analyzeUrl(tenantId, url, {
  waitForDynamic: false,
  generateSummary: true,
});

// 2. Preview content (UI shows preview)
// User reviews title, summary, content, metadata

// 3. Save to knowledge base
const saveResult = await addWebContentToKnowledge(tenantId, url, {
  waitForDynamic: false,
  generateSummary: true,
});

console.log(`Saved ${saveResult.chunksCount} chunks to KB`);
```

### Authenticated Scraping

```typescript
const result = await scrapeWebsite('https://internal-site.com', {
  auth: {
    type: 'headers',
    headers: { 'Authorization': 'Bearer token123' }
  }
});
```

### Dynamic Content Scraping

```typescript
const result = await scrapeWebsite('https://spa-app.com', {
  waitForDynamic: true, // Uses Playwright fallback
  timeout: 30000
});
```

## Performance Improvements

1. **Faster Initial Load**: Cheerio's `fromURL` is significantly faster than Playwright for static content
2. **Reduced Resource Usage**: No browser overhead for simple HTML parsing
3. **Intelligent Caching**: Better content deduplication and processing
4. **Parallel Processing**: Multiple data extraction operations run concurrently
5. **Optimized UI**: Efficient rendering of large metadata sets and content previews

## Workflow Integration

### Standard Analysis Workflow

1. **Enter URL**: User inputs website URL in analysis form
2. **Configure Options**: Set dynamic content loading and summary generation
3. **Analyze**: System extracts content using enhanced Cheerio scraper
4. **Preview**: User reviews extracted content, metadata, and AI summary
5. **Save**: One-click save to knowledge base with chunking and embedding
6. **Feedback**: Real-time progress updates and success confirmation

### Advanced Demo Workflow

1. **Test Extraction**: Use the demo interface to test extraction capabilities
2. **Explore Metadata**: View comprehensive metadata and structured data
3. **Inspect Content**: Examine cleaned content and formatting options
4. **Export Data**: Copy specific fields or complete datasets
5. **Save to KB**: Direct integration with knowledge base system

## Backward Compatibility

The enhanced scraper maintains full backward compatibility:

- **Same API**: No changes to function signatures
- **Fallback Strategy**: Automatically falls back to Playwright when needed
- **Error Handling**: Improved but consistent error messaging
- **Authentication**: All existing auth methods still supported

## Testing the Enhancement

### Using the Enhanced Demo

1. Navigate to **Web Analysis** → **Enhanced Cheerio Demo** tab
2. Enter a URL to test (e.g., `https://example.com`)
3. Configure extraction options
4. Analyze and review comprehensive results
5. Test save functionality to knowledge base

### Using Standard Analysis

1. Go to **Web Analysis** → **Standard Analysis** tab
2. Enter URL and configure options
3. Click "Analyze Website"
4. Review content preview with metadata
5. Click "Save to Knowledge Base" to add content

## Configuration Options

### ScrapeOptions Interface

```typescript
interface ScrapeOptions {
  waitForDynamic?: boolean;     // Force Playwright usage
  timeout?: number;             // Request timeout (default: 30s)
  maxContentLength?: number;    // Content truncation limit
  extractSchema?: boolean;      // Extract JSON-LD data
  preserveFormatting?: boolean; // Maintain text structure
  auth?: AuthOptions;           // Authentication config
}
```

### Enhanced Metadata

The new metadata structure includes:

- `readingTime`: Estimated reading time in minutes
- `schemaData`: Array of JSON-LD structured data objects
- `canonical`: Canonical URL from meta tags
- `ogImage`, `ogType`, `twitterCard`: Social media metadata
- `contentType`: Content classification
- `lastModified`: Last modification date

## Migration Notes

No migration is required. The enhanced scraper is a drop-in replacement that:

- Uses the same `scrapeWebsite()` function
- Returns the same data structure (with additional metadata)
- Maintains all existing authentication and configuration options
- Provides better performance and more comprehensive data extraction
- **Adds preview and save functionality** without breaking existing workflows

## Future Enhancements

Planned improvements include:

1. **Batch Analysis**: Analyze multiple URLs simultaneously
2. **Scheduled Scraping**: Automated periodic content updates
3. **Content Comparison**: Track changes in web content over time
4. **Custom Selectors**: User-defined content extraction patterns
5. **Export Formats**: Multiple export options (JSON, CSV, markdown)
6. **Advanced Filtering**: Filter content by type, date, or metadata
7. **Integration APIs**: Connect with external content management systems 