import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";

export interface InternalSSOConfig {
  domain: string;
  ssoEndpoint?: string;
  tokenEndpoint?: string;
  supportedProviders: Array<'google' | 'office365' | 'okta' | 'custom'>;
  customHeaders?: Record<string, string>;
  useSessionCookies?: boolean;
}

export interface InternalSSOCredentials {
  accessToken?: string;
  idToken?: string;
  sessionCookies?: Array<{ name: string; value: string; domain?: string; path?: string }>;
  headers?: Record<string, string>;
}

/**
 * Common internal domain patterns that likely support SSO
 */
const INTERNAL_DOMAIN_PATTERNS = [
  /.*\.company\.com$/,  // User's specific company domain pattern
  /.*\.sharepoint\.com$/,
  /.*\.onmicrosoft\.com$/,
  /.*\.teams\.microsoft\.com$/,
  /.*\.office\.com$/,
  /.*\.outlook\.com$/,
  /.*\.atlassian\.net$/,
  /.*\.atlassian\.com$/,
  /.*\.google\.com$/,
  /.*\.gsuite\.com$/,
  /.*\.corp\./,
  /.*\.internal$/,
  /.*\.intranet$/,
  /.*\.local$/,
];

/**
 * Known external sites that require credential authentication
 */
const EXTERNAL_CREDENTIAL_PATTERNS = [
  /.*launchpad\.support\.sap\.com$/,
  /.*\.support\.sap\.com$/,
  /.*me\.sap\.com$/,
  /.*\.salesforce\.com$/,
  /.*\.oracle\.com$/,
  /.*\.aws\.amazon\.com$/,
  /.*\.azure\.microsoft\.com$/,
  /.*\.servicenow\.com$/,
  /.*\.zendesk\.com$/,
  /.*\.freshdesk\.com$/,
];

/**
 * Well-known SSO configurations for popular internal platforms
 */
const WELL_KNOWN_SSO_CONFIGS: Record<string, InternalSSOConfig> = {
  'company.com': {
    domain: 'company.com',
    supportedProviders: ['google', 'office365', 'okta'],
    useSessionCookies: true,
    customHeaders: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    }
  },
  'sharepoint.com': {
    domain: 'sharepoint.com',
    supportedProviders: ['google', 'office365'],
    useSessionCookies: true,
    customHeaders: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    }
  },
  'onmicrosoft.com': {
    domain: 'onmicrosoft.com',
    supportedProviders: ['office365', 'google'],
    useSessionCookies: true,
  },
  'atlassian.net': {
    domain: 'atlassian.net',
    supportedProviders: ['google', 'office365'],
    useSessionCookies: true,
  },
  'atlassian.com': {
    domain: 'atlassian.com',
    supportedProviders: ['google', 'office365'],
    useSessionCookies: true,
  },
  'google.com': {
    domain: 'google.com',
    supportedProviders: ['google'],
    useSessionCookies: true,
  },
};

/**
 * Check if a domain is likely an internal website that supports SSO
 */
export function isInternalDomain(url: string): boolean {
  try {
    const domain = new URL(url).hostname.toLowerCase();
    
    // Check against known internal patterns
    return INTERNAL_DOMAIN_PATTERNS.some(pattern => pattern.test(domain)) ||
           Object.keys(WELL_KNOWN_SSO_CONFIGS).some(knownDomain => domain.includes(knownDomain));
  } catch {
    return false;
  }
}

/**
 * Check if a domain requires external credential authentication
 */
export function isExternalCredentialSite(url: string): boolean {
  try {
    const domain = new URL(url).hostname.toLowerCase();
    return EXTERNAL_CREDENTIAL_PATTERNS.some(pattern => pattern.test(domain));
  } catch {
    return false;
  }
}

/**
 * Get SSO configuration for a domain
 */
export function getInternalSSOConfig(url: string): InternalSSOConfig | null {
  try {
    const domain = new URL(url).hostname.toLowerCase();
    
    // Check for well-known configurations
    for (const [knownDomain, config] of Object.entries(WELL_KNOWN_SSO_CONFIGS)) {
      if (domain.includes(knownDomain)) {
        return { ...config, domain };
      }
    }
    
    // Check if it matches internal patterns
    if (isInternalDomain(url)) {
      return {
        domain,
        supportedProviders: ['google', 'office365', 'custom'],
        useSessionCookies: true,
        customHeaders: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        }
      };
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Generate SSO credentials using the current user session
 */
export async function generateInternalSSOCredentials(
  url: string, 
  ssoConfig: InternalSSOConfig
): Promise<InternalSSOCredentials | null> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      console.log('No active session found for SSO authentication');
      return null;
    }

    const domain = new URL(url).hostname;
    const credentials: InternalSSOCredentials = {};

    // Add session-based headers
    credentials.headers = {
      ...ssoConfig.customHeaders,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': url,
      'Origin': `https://${domain}`,
    };

    // For Google-based domains, try to use Google SSO patterns
    if (ssoConfig.supportedProviders.includes('google') && session.user.email) {
      credentials.headers = {
        ...credentials.headers,
        'X-Goog-AuthUser': '0',
        'X-Goog-PageId': 'none',
      };

      // Note: Real session cookies would need to be provided by the user
      // The server cannot access browser session cookies due to security restrictions
      if (ssoConfig.useSessionCookies) {
        console.log(`⚠️  SSO session cookies required for ${domain} but cannot be automatically retrieved. User needs to configure credentials manually.`);
      }
    }

    // For Office 365/Microsoft domains
    if (ssoConfig.supportedProviders.includes('office365') && domain.includes('microsoft') || domain.includes('sharepoint') || domain.includes('office')) {
      credentials.headers = {
        ...credentials.headers,
        'X-MS-ApiVersion': '2.0',
        'X-MS-Client-Request-Id': generateUUID(),
      };
    }

    // For Atlassian domains
    if (ssoConfig.supportedProviders.includes('google') && (domain.includes('atlassian'))) {
      credentials.headers = {
        ...credentials.headers,
        'X-Atlassian-Token': 'no-check',
      };
    }

    // Server-side SSO has fundamental limitations - we cannot access browser session cookies
    // The headers we generate are just common headers, not actual authentication tokens
    // We should be honest that we can't do real SSO authentication from the server
    
    console.log(`❌ Cannot perform automatic SSO for ${domain}.`);
    console.log(`   Reason: Server environment cannot access browser session cookies or real authentication tokens.`);
    console.log(`   Solution: Please configure credentials manually in the Credentials Manager.`);
    console.log(`   For Atlassian sites: Copy session cookies from your browser (F12 → Application → Cookies).`);
    
    return null;

  } catch (error) {
    console.error('Failed to generate SSO credentials:', error);
    return null;
  }
}

/**
 * Attempt automatic SSO authentication for internal websites
 */
export async function attemptInternalSSO(url: string): Promise<{
  shouldUseSSO: boolean;
  credentials?: InternalSSOCredentials;
  config?: InternalSSOConfig;
}> {
  // Check if this is an internal domain
  if (!isInternalDomain(url)) {
    return { shouldUseSSO: false };
  }

  const ssoConfig = getInternalSSOConfig(url);
  if (!ssoConfig) {
    return { shouldUseSSO: false };
  }

  const credentials = await generateInternalSSOCredentials(url, ssoConfig);
  if (!credentials) {
    return { shouldUseSSO: false };
  }

  return {
    shouldUseSSO: true,
    credentials,
    config: ssoConfig,
  };
}

/**
 * Generate a UUID for request IDs
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Check if authentication failed and suggest SSO setup
 */
export function suggestSSOSetup(url: string, error: string): {
  isAuthError: boolean;
  suggestion?: string;
  ssoConfig?: InternalSSOConfig;
  needsCredentials?: boolean;
} {
  const authErrorPatterns = [
    /login/i,
    /signin/i,
    /authenticate/i,
    /unauthorized/i,
    /access.*denied/i,
    /permission.*denied/i,
    /401/,
    /403/,
  ];

  const isAuthError = authErrorPatterns.some(pattern => pattern.test(error));
  
  if (!isAuthError) {
    return { isAuthError: false };
  }

  const ssoConfig = getInternalSSOConfig(url);
  const isExternal = isExternalCredentialSite(url);
  const domain = new URL(url).hostname;

  let suggestion = '';
  let needsCredentials = false;

  if (ssoConfig) {
    suggestion = `This appears to be an internal ${domain} website that requires authentication. ` +
                `The system can attempt automatic SSO authentication using your current session. ` +
                `Supported providers: ${ssoConfig.supportedProviders.join(', ')}.`;
  } else if (isExternal) {
    suggestion = `This external website (${domain}) requires authentication. ` +
                `Please provide credentials in the Credentials Manager for automatic login.`;
    needsCredentials = true;
  } else {
    suggestion = `This website requires authentication. If this is an internal company website, ` +
                `you may need to configure SSO credentials in the Credentials Manager.`;
    needsCredentials = true;
  }

  return {
    isAuthError: true,
    suggestion,
    ssoConfig: ssoConfig || undefined,
    needsCredentials,
  };
} 