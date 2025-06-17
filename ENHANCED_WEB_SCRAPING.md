# Enhanced Web Scraping System

## Overview

This enhanced web scraping system provides comprehensive capabilities for automated website content extraction, authentication handling, scheduling, and change tracking. It extends the existing basic web analysis functionality with enterprise-grade features.

## Features

### 🔐 Authentication Support
- **HTTP Basic Authentication**: Standard username/password authentication
- **Form-based Authentication**: Automated form login with custom selectors
- **Cookie Authentication**: Session-based authentication using cookies
- **Header Authentication**: API key and token-based authentication
- **SSO Integration**: Single Sign-On token support for enterprise systems
- **Credential Encryption**: All credentials are encrypted using AES encryption before storage

### 🕷️ Advanced Web Crawling
- **Recursive Crawling**: Navigate through child pages with configurable depth limits
- **URL Pattern Filtering**: Include/exclude patterns using regex for precise content targeting
- **Rate Limiting**: Configurable delays between requests to respect server resources
- **Dynamic Content Support**: JavaScript rendering with Playwright for SPA applications
- **Content Change Detection**: SHA-256 hashing to identify content modifications
- **Metadata Extraction**: Comprehensive extraction of page metadata, links, and images

### ⏰ Automated Scheduling
- **Cron-based Scheduling**: Flexible scheduling using cron expressions
- **Job Management**: Create, edit, pause, and delete scraping jobs
- **Execution History**: Detailed logs of job runs with success/failure tracking
- **Background Processing**: Non-blocking job execution with status monitoring
- **Automatic Retries**: Built-in retry logic for failed scraping attempts

### 📊 Change Tracking & Versioning
- **Content Versioning**: Maintain historical versions of scraped content
- **Change Detection**: Automatic identification of content modifications
- **Change Logging**: Detailed logs of what changed, when, and by how much
- **Diff Visualization**: Side-by-side comparison of content versions
- **Change Statistics**: Metrics on change frequency and impact

### 🗄️ Knowledge Base Integration
- **Automatic Document Creation**: Scraped content automatically added to knowledge base
- **Embedding Generation**: Vector embeddings for AI-powered search
- **Content Chunking**: Intelligent text segmentation for optimal retrieval
- **Metadata Preservation**: Rich metadata maintained throughout the pipeline

## System Architecture

### Database Schema

The system introduces several new database tables:

#### `web_scraping_credentials`
Stores encrypted authentication credentials for protected websites.

#### `web_scraping_jobs`
Defines scheduled scraping jobs with configuration and scheduling information.

#### `web_analysis_documents`
Enhanced version of web analysis with versioning and relationship tracking.

#### `web_analysis_changes`
Logs all content changes with detailed change information.

#### `web_scraping_job_runs`
Tracks execution history and statistics for each job run.

### Key Components

#### Enhanced Web Scraper (`src/lib/enhanced-web-scraper.ts`)
- Core crawling engine with authentication support
- Content extraction and metadata processing
- Change detection algorithms
- Recursive crawling with pattern filtering

#### Job Scheduler (`src/lib/job-scheduler.ts`)
- Cron-based job scheduling system
- Background job execution
- Error handling and recovery
- Job lifecycle management

#### Server Actions (`src/server/actions/enhanced-web-scraping.ts`)
- Credential management operations
- Job CRUD operations
- Change tracking queries
- Manual job execution

#### UI Components
- **Credentials Manager**: Secure credential storage and management
- **Scraping Jobs Manager**: Job creation, editing, and monitoring
- **Changes Tracker**: Change history and diff visualization
- **Enhanced Dashboard**: Comprehensive overview and statistics

## User Interface

### Enhanced Web Analysis Page
Access via: `/t/[tenantId]/web-analysis/enhanced`

The enhanced interface provides four main sections:

1. **Overview**: System statistics and recent activity
2. **Credentials**: Authentication credential management
3. **Scraping Jobs**: Automated job configuration and monitoring
4. **Changes**: Content change tracking and history

### Quick Start Guide

1. **Set up Authentication Credentials**
   - Navigate to the Credentials tab
   - Add authentication details for protected sites
   - Choose appropriate authentication method

2. **Create a Scraping Job**
   - Go to the Scraping Jobs tab
   - Define the base URL and crawling parameters
   - Set up scheduling using cron expressions
   - Optionally assign authentication credentials

3. **Monitor Changes**
   - Check the Changes tab for content updates
   - View detailed diffs and change statistics
   - Track content evolution over time

## Configuration

### Environment Variables

```env
# Required for credential encryption
CREDENTIAL_ENCRYPTION_KEY=your-secret-key-here

# Database connection (already configured)
POSTGRES_URL=your-postgres-url
```

### Cron Expression Examples

- `0 2 * * *` - Daily at 2 AM
- `0 */6 * * *` - Every 6 hours
- `0 2 * * 0` - Weekly on Sunday at 2 AM
- `0 2 1 * *` - Monthly on the 1st at 2 AM

## Security Considerations

- All credentials are encrypted using AES encryption
- Database queries use parameterized statements
- Authentication is required for all operations
- Rate limiting prevents server overload
- Input validation prevents injection attacks

## Performance Features

- **Efficient Crawling**: Configurable rate limiting and connection pooling
- **Vector Search**: Embedded content for fast semantic search
- **Change Detection**: Optimized content hashing for quick comparisons
- **Background Processing**: Non-blocking job execution
- **Database Indexing**: Optimized indexes for fast queries

## Monitoring & Analytics

The system provides comprehensive monitoring:

- Job execution statistics
- Success/failure rates
- Content change metrics
- System performance data
- Error tracking and logging

## Integration Points

### Knowledge Base
- Automatic document creation
- Vector embedding generation
- Metadata preservation
- Search integration

### Chat System
- Scraped content available for AI responses
- Contextual information from web sources
- Real-time content updates

### Analytics
- Usage tracking
- Performance metrics
- Change statistics
- User activity monitoring

## Extensibility

The system is designed for easy extension:

- **New Authentication Methods**: Add support for additional auth protocols
- **Custom Extractors**: Implement specialized content extraction logic
- **Integration Hooks**: Connect with external systems and APIs
- **Workflow Automation**: Build complex content processing pipelines

## Troubleshooting

### Common Issues

1. **Authentication Failures**
   - Verify credentials are correctly configured
   - Check for expired tokens or sessions
   - Ensure proper selectors for form-based auth

2. **Crawling Issues**
   - Verify URL patterns and filters
   - Check for rate limiting or IP blocking
   - Ensure JavaScript rendering is enabled for SPAs

3. **Scheduling Problems**
   - Validate cron expressions
   - Check job active status
   - Monitor system resources

### Debugging

- Enable detailed logging in job scheduler
- Check job run history for error messages
- Monitor system resources during execution
- Review change logs for unexpected modifications

## Migration Guide

If migrating from the basic web analysis system:

1. Run database migrations: `npm run db:migrate`
2. Set up credential encryption key
3. Migrate existing analyses to new schema
4. Configure authentication for protected sites
5. Set up automated jobs to replace manual processes

## Future Enhancements

Planned improvements include:

- Advanced content filtering and processing
- Machine learning-based change detection
- Integration with external monitoring systems
- Advanced scheduling with dependencies
- Content quality scoring and validation
- Multi-site cross-referencing and linking

## Support

For issues or questions:

1. Check the troubleshooting section
2. Review system logs and job execution history
3. Verify configuration and permissions
4. Contact system administrators for assistance

---

This enhanced web scraping system provides a robust foundation for automated content monitoring and knowledge base maintenance, with enterprise-grade security, reliability, and scalability features. 