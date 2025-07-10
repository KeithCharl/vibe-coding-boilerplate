"use server";

import * as cheerio from 'cheerio';
import { db } from "@/server/db";
import { documents, analytics } from "@/server/db/schema";
import { eq, and, desc, like, inArray } from "drizzle-orm";
import { requireAuth } from "./auth";
import { chunkAndEmbedDocument } from "@/lib/embeddings";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";

interface WebScrapingOptions {
  url: string;
  useCheerio?: boolean;
  extractStructuredData?: boolean;
  followLinks?: boolean;
  maxDepth?: number;
  selectors?: {
    title?: string;
    content?: string;
    metadata?: string;
    navigation?: string;
  };
}

interface AIAnalysisResult {
  summary: string;
  tags: string[];
  category: string;
  confidence: number;
  keyInsights: string[];
  suggestedActions: string[];
}

interface KnowledgeGap {
  id: string;
  title: string;
  description: string;
  confidence: number;
  relatedTopics: string[];
  suggestedSources: string[];
}

/**
 * Enhanced web scraping using Cheerio with structured data extraction
 */
export async function scrapeWebContent(
  tenantId: string,
  options: WebScrapingOptions
): Promise<{
  success: boolean;
  data?: {
    title: string;
    content: string;
    metadata: Record<string, any>;
    extractedData: Record<string, any>;
    links: string[];
  };
  error?: string;
}> {
  const operationId = logger.startOperation("web_scraping", { tenantId, url: options.url });
  
  try {
    const user = await requireAuth(tenantId, "contributor");
    logger.debug("Starting enhanced web scraping", { url: options.url, tenantId, operationId });

    // Fetch the web page
    const response = await fetch(options.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; KnowledgeBaseAgent/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${options.url}: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract basic information
    const title = $(options.selectors?.title || 'title').first().text().trim() || 
                 $('h1').first().text().trim() || 
                 'Untitled Document';

    // Enhanced content extraction using Cheerio
    let content = '';
    if (options.selectors?.content) {
      content = $(options.selectors.content).text();
    } else {
      // Smart content extraction - remove navigation, ads, etc.
      $('nav, .nav, .navigation, .menu, .sidebar, .footer, .header, .ad, .advertisement, script, style, noscript').remove();
      
      // Try to find main content area
      const mainSelectors = ['main', '[role="main"]', '.main', '.content', '.post', '.article', 'article'];
      let mainContent = '';
      
      for (const selector of mainSelectors) {
        const element = $(selector);
        if (element.length > 0 && element.text().trim().length > 100) {
          mainContent = element.text();
          break;
        }
      }
      
      content = mainContent || $('body').text();
    }

    // Clean and normalize content
    content = content
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .trim();

    // Extract metadata using Cheerio
    const metadata: Record<string, any> = {};
    
    // Meta tags
    $('meta').each((_, element) => {
      const name = $(element).attr('name') || $(element).attr('property');
      const content = $(element).attr('content');
      if (name && content) {
        metadata[name] = content;
      }
    });

    // Structured data extraction
    const extractedData: Record<string, any> = {};
    
    if (options.extractStructuredData) {
      // Extract JSON-LD structured data
      $('script[type="application/ld+json"]').each((_, element) => {
        try {
          const jsonLd = JSON.parse($(element).html() || '{}');
          extractedData.jsonLd = jsonLd;
        } catch (e) {
          logger.debug("Failed to parse JSON-LD", { error: e, operationId });
        }
      });

      // Extract tables
      const tables: any[] = [];
      $('table').each((_, table) => {
        const tableData: string[][] = [];
        $(table).find('tr').each((_, row) => {
          const rowData: string[] = [];
          $(row).find('td, th').each((_, cell) => {
            rowData.push($(cell).text().trim());
          });
          if (rowData.length > 0) {
            tableData.push(rowData);
          }
        });
        if (tableData.length > 0) {
          tables.push(tableData);
        }
      });
      extractedData.tables = tables;

      // Extract lists
      const lists: string[][] = [];
      $('ul, ol').each((_, list) => {
        const listItems: string[] = [];
        $(list).find('li').each((_, item) => {
          listItems.push($(item).text().trim());
        });
        if (listItems.length > 0) {
          lists.push(listItems);
        }
      });
      extractedData.lists = lists;

      // Extract headings structure
      const headings: Array<{ level: number; text: string }> = [];
      $('h1, h2, h3, h4, h5, h6').each((_, heading) => {
        const level = parseInt(heading.tagName.charAt(1));
        const text = $(heading).text().trim();
        if (text) {
          headings.push({ level, text });
        }
      });
      extractedData.headings = headings;
    }

    // Extract links
    const links: string[] = [];
    if (options.followLinks) {
      $('a[href]').each((_, link) => {
        const href = $(link).attr('href');
        if (href && (href.startsWith('http') || href.startsWith('/'))) {
          try {
            const fullUrl = new URL(href, options.url).toString();
            links.push(fullUrl);
          } catch (e) {
            // Invalid URL, skip
          }
        }
      });
    }

    logger.debug("Web scraping completed", { 
      contentLength: content.length, 
      linksFound: links.length,
      tablesExtracted: extractedData.tables?.length || 0,
      operationId 
    });

    logger.endOperation(operationId, "web_scraping", { 
      success: true, 
      contentLength: content.length 
    });

    return {
      success: true,
      data: {
        title,
        content,
        metadata,
        extractedData,
        links: links.slice(0, 50) // Limit to prevent overwhelming
      }
    };

  } catch (error) {
    logger.error("Web scraping failed", { 
      error: error instanceof Error ? error.message : String(error),
      url: options.url,
      tenantId,
      operationId 
    });

    logger.endOperation(operationId, "web_scraping", { success: false, error: String(error) });

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
}

/**
 * Add web content to knowledge base using enhanced Cheerio extraction
 */
export async function addWebContentToKnowledgeBase(
  tenantId: string,
  url: string,
  options: {
    title?: string;
    extractStructuredData?: boolean;
    autoTag?: boolean;
    generateSummary?: boolean;
  } = {}
) {
  const operationId = logger.startOperation("web_content_ingestion", { tenantId, url });
  
  try {
    const user = await requireAuth(tenantId, "contributor");

    // Scrape the web content
    const scrapingResult = await scrapeWebContent(tenantId, {
      url,
      useCheerio: true,
      extractStructuredData: options.extractStructuredData || true,
      followLinks: false
    });

    if (!scrapingResult.success || !scrapingResult.data) {
      throw new Error(scrapingResult.error || "Failed to scrape web content");
    }

    const { title, content, metadata, extractedData } = scrapingResult.data;
    const documentName = options.title || title || new URL(url).hostname;

    if (!content || content.length < 50) {
      throw new Error("Insufficient content extracted from the web page");
    }

    // Generate embeddings for the content
    logger.debug("Generating embeddings for web content", { contentLength: content.length, operationId });
    const chunks = await chunkAndEmbedDocument(content, {
      fileName: documentName,
      fileType: 'web-page',
      tenantId,
      sourceUrl: url,
      metadata: {
        ...metadata,
        extractedData,
        scrapedAt: new Date().toISOString()
      }
    });

    if (chunks.length === 0) {
      throw new Error("Failed to process web content into chunks");
    }

    // Store document chunks in database
    const documentInserts = chunks.map((chunk, index) => ({
      tenantId,
      name: index === 0 ? documentName : `${documentName} (chunk ${index + 1})`,
      content: chunk.content.replace(/\0/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ').trim(),
      fileUrl: url,
      fileType: 'web-page',
      fileSize: content.length,
      chunkIndex: index,
      embedding: chunk.embedding,
      uploadedBy: user.id,
      // Store structured data in a metadata field (if your schema supports it)
      summary: options.generateSummary ? content.substring(0, 500) + "..." : undefined,
    }));

    logger.debug("Inserting web content chunks into database", { chunkCount: documentInserts.length, operationId });
    const insertedDocs = await db
      .insert(documents)
      .values(documentInserts)
      .returning();

    // Log analytics
    await db.insert(analytics).values({
      tenantId,
      userId: user.id,
      eventType: "web_scraping",
      eventData: {
        documentId: insertedDocs[0]?.id,
        sourceUrl: url,
        contentLength: content.length,
        chunksCreated: chunks.length,
        extractedTables: extractedData.tables?.length || 0,
        extractedLists: extractedData.lists?.length || 0,
      },
    });

    revalidatePath(`/t/${tenantId}/kb`);
    revalidatePath(`/t/${tenantId}/kb/agent`);
    
    logger.endOperation(operationId, "web_content_ingestion", { 
      success: true, 
      documentId: insertedDocs[0]?.id,
      chunksCreated: chunks.length 
    });

    return { 
      success: true, 
      documentId: insertedDocs[0]?.id,
      chunksCreated: chunks.length,
      extractedData
    };

  } catch (error) {
    logger.error("Web content ingestion failed", { 
      error: error instanceof Error ? error.message : String(error),
      url,
      tenantId,
      operationId 
    });

    logger.endOperation(operationId, "web_content_ingestion", { success: false, error: String(error) });
    throw error;
  }
}

/**
 * Simulate AI analysis of documents (placeholder for real AI integration)
 */
export async function analyzeDocumentWithAI(
  tenantId: string,
  documentId: string
): Promise<AIAnalysisResult> {
  const user = await requireAuth(tenantId, "viewer");
  
  // Get document content
  const [document] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.tenantId, tenantId), eq(documents.id, documentId)))
    .limit(1);

  if (!document) {
    throw new Error("Document not found");
  }

  // Simulate AI analysis (in real implementation, this would call OpenAI/other AI services)
  const mockAnalysis: AIAnalysisResult = {
    summary: `AI-generated summary of ${document.name}. This document contains valuable information about ${document.fileType === 'web-page' ? 'web content' : 'uploaded document'} with key insights extracted automatically.`,
    tags: [
      document.fileType || 'unknown',
      'ai-analyzed',
      'knowledge-base',
      ...(document.content?.includes('DORA') ? ['dora', 'metrics'] : []),
      ...(document.content?.includes('deployment') ? ['deployment', 'devops'] : []),
      ...(document.content?.includes('performance') ? ['performance', 'monitoring'] : [])
    ].slice(0, 8),
    category: document.fileType === 'web-page' ? 'Web Resources' : 'Documents',
    confidence: Math.floor(85 + Math.random() * 15),
    keyInsights: [
      'Content quality is high with clear structure',
      'Contains actionable insights for implementation',
      'Well-aligned with current knowledge base topics',
      'Potential for cross-referencing with existing documents'
    ],
    suggestedActions: [
      'Add relevant tags for better discoverability',
      'Create connections to related documents',
      'Extract key metrics for dashboard display',
      'Schedule for periodic content review'
    ]
  };

  // Log analytics
  await db.insert(analytics).values({
    tenantId,
    userId: user.id,
    eventType: "ai_analysis",
    eventData: {
      documentId,
      analysisType: "content_analysis",
      confidence: mockAnalysis.confidence,
      tagsGenerated: mockAnalysis.tags.length,
    },
  });

  return mockAnalysis;
}

/**
 * Detect knowledge gaps in the knowledge base
 */
export async function detectKnowledgeGaps(
  tenantId: string
): Promise<KnowledgeGap[]> {
  const user = await requireAuth(tenantId, "viewer");

  // Get all documents to analyze
  const docs = await db
    .select()
    .from(documents)
    .where(eq(documents.tenantId, tenantId));

  // Simulate knowledge gap detection
  const mockGaps: KnowledgeGap[] = [
    {
      id: '1',
      title: 'DORA Implementation Guides Missing',
      description: 'Your knowledge base contains DORA research but lacks practical implementation guides for the four key metrics.',
      confidence: 92,
      relatedTopics: ['dora', 'metrics', 'implementation', 'devops'],
      suggestedSources: [
        'https://dora.dev/guides/',
        'https://cloud.google.com/blog/products/devops-sre/using-the-four-keys-to-measure-your-devops-performance',
        'https://github.com/GoogleCloudPlatform/fourkeys'
      ]
    },
    {
      id: '2',
      title: 'Deployment Automation Best Practices',
      description: 'Limited content on modern deployment automation tools and practices.',
      confidence: 88,
      relatedTopics: ['deployment', 'automation', 'ci-cd', 'best-practices'],
      suggestedSources: [
        'https://docs.github.com/en/actions',
        'https://www.jenkins.io/doc/book/pipeline/',
        'https://kubernetes.io/docs/concepts/workloads/controllers/deployment/'
      ]
    },
    {
      id: '3',
      title: 'Performance Monitoring Strategies',
      description: 'Comprehensive monitoring and observability strategies are underrepresented.',
      confidence: 85,
      relatedTopics: ['monitoring', 'observability', 'performance', 'metrics'],
      suggestedSources: [
        'https://prometheus.io/docs/introduction/overview/',
        'https://grafana.com/docs/',
        'https://opentelemetry.io/docs/'
      ]
    }
  ];

  // Log analytics
  await db.insert(analytics).values({
    tenantId,
    userId: user.id,
    eventType: "knowledge_gap_analysis",
    eventData: {
      documentsAnalyzed: docs.length,
      gapsDetected: mockGaps.length,
      analysisTimestamp: new Date().toISOString(),
    },
  });

  return mockGaps;
}

/**
 * Auto-tag documents using AI analysis
 */
export async function autoTagDocuments(tenantId: string) {
  const user = await requireAuth(tenantId, "contributor");

  // Get documents without tags (or with minimal tags)
  const docs = await db
    .select()
    .from(documents)
    .where(eq(documents.tenantId, tenantId))
    .limit(10); // Process in batches

  let processedCount = 0;
  
  for (const doc of docs) {
    if (doc.content) {
      // Simulate AI tagging based on content analysis
      const content = doc.content.toLowerCase();
      const tags: string[] = [];

      // Simple keyword-based tagging (in real implementation, use AI)
      if (content.includes('dora')) tags.push('dora');
      if (content.includes('metric')) tags.push('metrics');
      if (content.includes('deployment')) tags.push('deployment');
      if (content.includes('performance')) tags.push('performance');
      if (content.includes('monitoring')) tags.push('monitoring');
      if (content.includes('automation')) tags.push('automation');
      if (content.includes('ci/cd') || content.includes('cicd')) tags.push('ci-cd');
      if (content.includes('kubernetes')) tags.push('kubernetes');
      if (content.includes('docker')) tags.push('docker');
      if (content.includes('devops')) tags.push('devops');

      // Add file type tag
      if (doc.fileType) tags.push(doc.fileType);

      if (tags.length > 0) {
        // In a real implementation, you'd update a tags field in the documents table
        // For now, we'll just log the analytics
        processedCount++;
      }
    }
  }

  // Log analytics
  await db.insert(analytics).values({
    tenantId,
    userId: user.id,
    eventType: "auto_tagging",
    eventData: {
      documentsProcessed: processedCount,
      totalDocuments: docs.length,
      processingTimestamp: new Date().toISOString(),
    },
  });

  revalidatePath(`/t/${tenantId}/kb/agent`);
  
  return {
    success: true,
    processedDocuments: processedCount,
    totalDocuments: docs.length
  };
} 