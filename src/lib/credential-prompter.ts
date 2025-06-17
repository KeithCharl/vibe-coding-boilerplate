import { Page } from 'playwright';
import { isExternalCredentialSite } from './internal-sso-auth';

export interface CredentialPromptResult {
  shouldPrompt: boolean;
  domain: string;
  loginPageDetected: boolean;
  suggestedFields?: {
    usernameSelector?: string;
    passwordSelector?: string;
    submitSelector?: string;
    formSelector?: string;
  };
  loginMethod?: 'form' | 'saml' | 'oauth' | 'unknown';
  error?: string;
}

/**
 * Common login page indicators
 */
const LOGIN_PAGE_INDICATORS = [
  // Text indicators
  /sign\s*in/i,
  /log\s*in/i,
  /login/i,
  /authentication/i,
  /credentials/i,
  /username/i,
  /password/i,
  /email.*password/i,
  
  // URL patterns
  /\/login/i,
  /\/signin/i,
  /\/auth/i,
  /\/authentication/i,
  /\/sso/i,
];

/**
 * Common form field selectors for different sites
 */
const SITE_SPECIFIC_SELECTORS: Record<string, {
  username: string[];
  password: string[];
  submit: string[];
  form?: string;
}> = {
  'support.sap.com': {
    username: ['#j_username', '[name="j_username"]', '[name="username"]', '#username'],
    password: ['#j_password', '[name="j_password"]', '[name="password"]', '#password'],
    submit: ['#logOnFormSubmit', '[type="submit"]', 'button[type="submit"]'],
    form: '#logonForm'
  },
  'launchpad.support.sap.com': {
    username: ['#j_username', '[name="j_username"]', '[name="username"]'],
    password: ['#j_password', '[name="j_password"]', '[name="password"]'],
    submit: ['#logOnFormSubmit', '[type="submit"]'],
    form: '#logonForm'
  },
  'me.sap.com': {
    username: ['#j_username', '[name="username"]', '#username'],
    password: ['#j_password', '[name="password"]', '#password'],
    submit: ['[type="submit"]', 'button[type="submit"]'],
  },
  'salesforce.com': {
    username: ['#username', '[name="username"]'],
    password: ['#password', '[name="password"]'],
    submit: ['#Login', '[name="Login"]', '[type="submit"]'],
  },
  'servicenow.com': {
    username: ['#user_name', '[name="user_name"]', '[name="username"]'],
    password: ['#user_password', '[name="user_password"]', '[name="password"]'],
    submit: ['#sysverb_login', '[type="submit"]'],
  },
};

/**
 * Generic form field selectors
 */
const GENERIC_SELECTORS = {
  username: [
    '[name="username"]',
    '[name="email"]',
    '[name="user"]',
    '[name="login"]',
    '[type="email"]',
    '#username',
    '#email',
    '#user',
    '#login',
    '.username',
    '.email',
    '[placeholder*="username" i]',
    '[placeholder*="email" i]',
    '[aria-label*="username" i]',
    '[aria-label*="email" i]',
  ],
  password: [
    '[name="password"]',
    '[name="passwd"]',
    '[name="pass"]',
    '[type="password"]',
    '#password',
    '#passwd',
    '#pass',
    '.password',
    '[placeholder*="password" i]',
    '[aria-label*="password" i]',
  ],
  submit: [
    '[type="submit"]',
    'button[type="submit"]',
    'input[type="submit"]',
    'button:has-text("Sign In")',
    'button:has-text("Log In")',
    'button:has-text("Login")',
    'button:has-text("Submit")',
    '.login-button',
    '.signin-button',
    '.submit-button',
  ],
};

/**
 * Detect if the current page is a login page and analyze its structure
 */
export async function detectLoginPage(page: Page, url: string): Promise<CredentialPromptResult> {
  const domain = new URL(url).hostname.toLowerCase();
  
  try {
    // Wait for page to load
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    
    // Get page content and title
    const title = await page.title();
    const pageText = await page.textContent('body') || '';
    const pageUrl = page.url();
    
    // Check if this looks like a login page
    const hasLoginIndicators = LOGIN_PAGE_INDICATORS.some(pattern => 
      pattern.test(title) || pattern.test(pageText) || pattern.test(pageUrl)
    );
    
    if (!hasLoginIndicators) {
      return {
        shouldPrompt: false,
        domain,
        loginPageDetected: false,
      };
    }
    
    console.log(`🔍 Login page detected for ${domain}`);
    
    // Determine login method
    const loginMethod = await determineLoginMethod(page);
    
    // If it's not a form-based login, we can't help much
    if (loginMethod !== 'form') {
      return {
        shouldPrompt: true,
        domain,
        loginPageDetected: true,
        loginMethod,
        error: `Login method "${loginMethod}" is not supported for automated authentication.`
      };
    }
    
    // Find form fields
    const suggestedFields = await findFormFields(page, domain);
    
    if (!suggestedFields.usernameSelector || !suggestedFields.passwordSelector) {
      return {
        shouldPrompt: true,
        domain,
        loginPageDetected: true,
        loginMethod,
        error: 'Could not locate username or password fields on the login form.'
      };
    }
    
    return {
      shouldPrompt: true,
      domain,
      loginPageDetected: true,
      loginMethod,
      suggestedFields,
    };
    
  } catch (error: any) {
    console.error(`Failed to analyze login page for ${domain}:`, error.message);
    
    return {
      shouldPrompt: isExternalCredentialSite(url),
      domain,
      loginPageDetected: false,
      error: `Failed to analyze page: ${error.message}`,
    };
  }
}

/**
 * Determine the type of login method being used
 */
async function determineLoginMethod(page: Page): Promise<'form' | 'saml' | 'oauth' | 'unknown'> {
  try {
    // Check for SAML indicators
    const hasSamlIndicators = await page.evaluate(() => {
      const text = document.body.textContent || '';
      const samlPatterns = [
        /saml/i,
        /single.*sign.*on/i,
        /sso/i,
        /identity.*provider/i,
        /federation/i,
      ];
      return samlPatterns.some(pattern => pattern.test(text));
    });
    
    if (hasSamlIndicators) {
      return 'saml';
    }
    
    // Check for OAuth indicators
    const hasOAuthIndicators = await page.evaluate(() => {
      const text = document.body.textContent || '';
      const links = Array.from(document.querySelectorAll('a')).map(a => a.href);
      const oauthPatterns = [
        /oauth/i,
        /google.*sign.*in/i,
        /microsoft.*sign.*in/i,
        /github.*sign.*in/i,
      ];
      return oauthPatterns.some(pattern => 
        pattern.test(text) || links.some(link => pattern.test(link))
      );
    });
    
    if (hasOAuthIndicators) {
      return 'oauth';
    }
    
    // Check for form-based login
    const hasFormFields = await page.evaluate(() => {
      const forms = document.querySelectorAll('form');
      if (forms.length === 0) return false;
      
      for (const form of forms) {
        const hasPasswordField = form.querySelector('[type="password"]');
        const hasUsernameField = form.querySelector('[type="email"], [name*="username"], [name*="email"], [name*="user"]');
        
        if (hasPasswordField && hasUsernameField) {
          return true;
        }
      }
      
      return false;
    });
    
    if (hasFormFields) {
      return 'form';
    }
    
    return 'unknown';
    
  } catch (error) {
    console.error('Failed to determine login method:', error);
    return 'unknown';
  }
}

/**
 * Find form field selectors on the page
 */
async function findFormFields(page: Page, domain: string): Promise<{
  usernameSelector?: string;
  passwordSelector?: string;
  submitSelector?: string;
  formSelector?: string;
}> {
  try {
    // Get site-specific selectors if available
    const siteSelectors = Object.keys(SITE_SPECIFIC_SELECTORS).find(siteDomain => 
      domain.includes(siteDomain)
    );
    
    const selectorsToTry = siteSelectors 
      ? SITE_SPECIFIC_SELECTORS[siteSelectors]
      : null;
    
    const result: any = {};
    
    // Find username field
    if (selectorsToTry) {
      for (const selector of selectorsToTry.username) {
        const element = await page.$(selector);
        if (element) {
          result.usernameSelector = selector;
          break;
        }
      }
    }
    
    if (!result.usernameSelector) {
      for (const selector of GENERIC_SELECTORS.username) {
        const element = await page.$(selector);
        if (element) {
          result.usernameSelector = selector;
          break;
        }
      }
    }
    
    // Find password field
    if (selectorsToTry) {
      for (const selector of selectorsToTry.password) {
        const element = await page.$(selector);
        if (element) {
          result.passwordSelector = selector;
          break;
        }
      }
    }
    
    if (!result.passwordSelector) {
      for (const selector of GENERIC_SELECTORS.password) {
        const element = await page.$(selector);
        if (element) {
          result.passwordSelector = selector;
          break;
        }
      }
    }
    
    // Find submit button
    if (selectorsToTry) {
      for (const selector of selectorsToTry.submit) {
        const element = await page.$(selector);
        if (element) {
          result.submitSelector = selector;
          break;
        }
      }
    }
    
    if (!result.submitSelector) {
      for (const selector of GENERIC_SELECTORS.submit) {
        const element = await page.$(selector);
        if (element) {
          result.submitSelector = selector;
          break;
        }
      }
    }
    
    // Find form selector
    if (selectorsToTry?.form) {
      const formElement = await page.$(selectorsToTry.form);
      if (formElement) {
        result.formSelector = selectorsToTry.form;
      }
    }
    
    if (!result.formSelector && result.usernameSelector) {
      // Try to find the parent form
      const form = await page.evaluate((usernameSelector) => {
        const usernameField = document.querySelector(usernameSelector);
        if (usernameField) {
          const form = usernameField.closest('form');
          if (form) {
            // Try to generate a selector for the form
            if (form.id) return `#${form.id}`;
            if (form.className) return `.${form.className.split(' ')[0]}`;
            return 'form';
          }
        }
        return null;
      }, result.usernameSelector);
      
      if (form) {
        result.formSelector = form;
      }
    }
    
    return result;
    
  } catch (error) {
    console.error('Failed to find form fields:', error);
    return {};
  }
}

/**
 * Check if we should prompt for credentials based on error patterns
 */
export function shouldPromptForCredentials(url: string, error: string): boolean {
  // Check if it's an external site that we know requires credentials
  if (isExternalCredentialSite(url)) {
    return true;
  }
  
  // Check error patterns that indicate authentication is needed
  const authErrorPatterns = [
    /login/i,
    /signin/i,
    /authenticate/i,
    /unauthorized/i,
    /access.*denied/i,
    /permission.*denied/i,
    /401/,
    /403/,
    /redirected.*login/i,
  ];
  
  return authErrorPatterns.some(pattern => pattern.test(error));
}

/**
 * Generate credential prompt message for external sites
 */
export function generateCredentialPrompt(domain: string, loginMethod?: string): string {
  const baseMessage = `Authentication required for ${domain}.`;
  
  switch (loginMethod) {
    case 'saml':
      return `${baseMessage} This site uses SAML/SSO authentication. Please configure SSO credentials in the Credentials Manager.`;
    case 'oauth':
      return `${baseMessage} This site uses OAuth authentication. Please configure OAuth credentials in the Credentials Manager.`;
    case 'form':
      return `${baseMessage} Please provide username and password credentials in the Credentials Manager.`;
    default:
      return `${baseMessage} Please configure appropriate credentials in the Credentials Manager.`;
  }
} 