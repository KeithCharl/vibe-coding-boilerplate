# Knowledge Base Web Scraping Integration

## Overview

I've enhanced your knowledge base with powerful web scraping capabilities that allow you to add content from both internal and external websites directly to your knowledge base. This creates a unified content repository where both uploaded documents and web-scraped content are searchable together.

## New Features

### 1. **Unified Content Upload Dialog**
- **File Upload Tab**: Traditional document upload (PDF, DOC, DOCX, TXT, MD)
- **Web Content Tab**: New web scraping functionality
- Both content types are stored in the same `documents` table for unified search

### 2. **Web Content Integration**
- Web-scraped content is automatically chunked and embedded using the same process as uploaded files
- Content appears alongside uploaded documents in the Knowledge Base interface
- Visual indicators distinguish web pages from uploaded files (Globe icon vs File icon)
- Original URLs are preserved and clickable

### 3. **Enhanced Knowledge Base Interface**
- **Visual Differentiation**: Web pages show with a blue globe icon
- **URL Display**: Shows the original source URL for web content
- **Unified Search**: Both document and web content are searchable in chat
- **Same Management**: Rename, delete, and view version history for all content types

## Technical Implementation

### New Server Action: `addWebContentToKnowledge`
```typescript
// Location: src/server/actions/content.ts
export async function addWebContentToKnowledge(
  tenantId: string,
  url: string,
  options: {
    waitForDynamic?: boolean;
    generateSummary?: boolean;
  } = {}
)
```

**Features:**
- URL validation and normalization
- Duplicate content detection (24-hour cache)
- Content cleaning and optimization
- Automatic chunking and embedding generation
- Analytics tracking
- Error handling and retry logic

### Enhanced Upload Dialog Component
```typescript
// Location: src/components/upload-document-dialog.tsx
// Now includes tabbed interface for both upload methods
```

**Features:**
- Tabbed interface (File Upload / From Web)
- Real-time validation
- Progress indicators
- Error handling with user feedback
- Success notifications with metadata

### Database Schema Integration
- Uses existing `documents` table
- `fileType: "web-page"` identifies web content
- `fileUrl` stores the original website URL
- Same embedding and chunking process as uploaded files

## Usage Guide

### Adding Web Content to Knowledge Base

1. **Navigate to Knowledge Base**: Go to `/t/[tenantId]/kb`
2. **Click "Add Content"**: Opens the unified upload dialog
3. **Select "From Web" Tab**: Switch to web scraping mode
4. **Enter URL**: Paste the website URL you want to add
5. **Click "Add from Web"**: System will scrape and process the content

### Supported Website Types

**External Websites:**
- Public blogs and articles
- Documentation sites
- News articles
- Product pages
- Any publicly accessible web content

**Internal Websites:**
- Company intranets (if accessible)
- Internal documentation
- Private knowledge bases
- Team wikis

### Content Processing

1. **URL Validation**: Ensures valid and accessible URLs
2. **Web Scraping**: Extracts text content, metadata, and structure
3. **Content Cleaning**: Removes HTML tags, scripts, and formatting
4. **Text Processing**: Normalizes text and removes problematic characters
5. **Chunking**: Splits content into searchable chunks (1000 chars with 200 overlap)
6. **Embedding Generation**: Creates vector embeddings for semantic search
7. **Storage**: Saves to documents table with web-page type

### Smart Features

**Duplicate Detection:**
- Prevents re-scraping the same URL within 24 hours
- Shows notification if content already exists

**Content Optimization:**
- Handles dynamic websites with JavaScript
- Extracts meaningful content while filtering noise
- Preserves structure like headings and links
- Maintains metadata (author, publish date, etc.)

**Error Handling:**
- Graceful handling of inaccessible URLs
- Timeout protection (30 seconds)
- Content size limits (50KB for knowledge base)
- User-friendly error messages

## AI Chat Integration

Web-scraped content is automatically included in AI chat responses:

1. **Semantic Search**: Vector similarity search across all content
2. **Source Attribution**: AI can reference both documents and web pages
3. **Unified Results**: No distinction between uploaded and scraped content
4. **Click-through**: Users can click to view original web sources

## Analytics and Tracking

New analytics events:
- `web_content_added`: Tracks successful web content additions
- Includes metadata like domain, word count, and chunk count
- Integrates with existing analytics dashboard

## Configuration Options

**Scraping Options:**
- `waitForDynamic`: Enable for JavaScript-heavy sites (slower but more complete)
- `generateSummary`: Auto-generate content summaries
- `timeout`: Configurable timeout (default 30s)
- `maxContentLength`: Content size limits (default 50KB)

## Visual Interface Updates

### Knowledge Base Cards
- **Globe Icon**: Blue globe icon for web content
- **File Icon**: Traditional file icon for uploads
- **URL Display**: Shows original URL below description for web content
- **Type Labels**: "Web Page" vs document type

### Upload Dialog
- **Tabbed Interface**: Clean separation of upload methods
- **Form Validation**: Real-time URL validation
- **Progress States**: Loading states and progress indicators
- **Success Feedback**: Detailed success messages with metadata

## Benefits

1. **Unified Knowledge Repository**: All content in one searchable location
2. **Real-time Content**: Keep external content current by re-scraping
3. **Broad Content Sources**: Include any web-accessible content
4. **Seamless User Experience**: No distinction in search and chat
5. **Comprehensive Analytics**: Track usage of both content types
6. **Source Transparency**: Always maintain link to original source

## Future Enhancements

Potential improvements for future releases:
- **Scheduled Re-scraping**: Automatic content updates
- **Bulk URL Import**: Import multiple URLs at once
- **Site Crawling**: Crawl entire websites or sections
- **Content Filtering**: More granular content selection
- **Integration APIs**: Connect with popular tools like Notion, Confluence

This integration transforms your knowledge base from a document repository into a comprehensive content management system that can incorporate any web-accessible information while maintaining the same powerful AI-driven search and chat capabilities. 