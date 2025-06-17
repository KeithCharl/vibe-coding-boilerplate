# Web Authentication Guide

This guide helps you extract authentication information to access protected internal websites and applications.

## 🍪 Session Cookies (Most Common)

**Best for:** Confluence, Jira, SharePoint, company wikis

### How to get session cookies:

1. **Open your browser** and navigate to the protected site
2. **Log in normally** with your credentials
3. **Open Developer Tools** (F12 or Right-click → Inspect)
4. **Go to Network tab** and refresh the page
5. **Click on any request** to the site
6. **Find the Request Headers section**
7. **Copy the Cookie header value**

**Example format:**
```
JSESSIONID=1A2B3C4D5E; ATLASSIAN_SECURITY_TOKEN=xyz789; confluence.browse.space.key=KB
```

### Browser-specific instructions:

**Chrome/Edge:**
- F12 → Network → Refresh page → Click any request → Headers → Cookie

**Firefox:**
- F12 → Network → Refresh page → Click any request → Headers → Cookie

**Safari:**
- Develop → Show Web Inspector → Network → Refresh → Click request → Headers

## 🔑 Confluence API (Recommended)

**Best for:** Atlassian Confluence instances

### How to get API token:

1. **Go to your Confluence instance**
2. **Click your profile picture** → Settings
3. **Go to "API tokens"** or "Personal Access Tokens"
4. **Click "Create token"**
5. **Give it a name** (e.g., "Knowledge Base Scraper")
6. **Copy the generated token**

**Confluence Cloud URL format:**
```
https://yourcompany.atlassian.net/wiki/spaces/SPACE/pages/123456/Page+Title
```

## 🛡️ Basic Authentication

**Best for:** Internal company tools, legacy systems

- **Username:** Your login username
- **Password:** Your login password

⚠️ **Security Note:** Only use this for trusted internal systems.

## 📋 Custom Headers

**Best for:** APIs with bearer tokens, custom authentication

### Common header examples:

**Bearer Token:**
```json
{
  "Authorization": "Bearer your-api-token-here"
}
```

**API Key:**
```json
{
  "X-API-Key": "your-api-key",
  "Authorization": "Bearer token"
}
```

**Custom Auth:**
```json
{
  "X-Auth-Token": "token",
  "X-User-ID": "userid"
}
```

## 🔒 Security Best Practices

1. **Use API tokens when available** - More secure than passwords
2. **Don't share authentication data** - Keep tokens private
3. **Rotate tokens regularly** - Create new ones periodically
4. **Use least privilege** - Only give minimum required permissions
5. **Check token expiration** - Some tokens expire after time

## 🛠️ Troubleshooting

### "Authentication required" error:
- ✅ Check that you're logged in to the site in your browser
- ✅ Verify cookie format: `name=value; name2=value2`
- ✅ Make sure cookies haven't expired

### "Access forbidden" error:
- ✅ Check user permissions on the specific page/space
- ✅ Verify the URL is correct and accessible
- ✅ Try accessing the page manually in your browser first

### Confluence API errors:
- ✅ Ensure API token has read permissions
- ✅ Check that the page ID exists in the URL
- ✅ Verify base URL format is correct

### "Page redirected to login":
- ✅ Session may have expired - get fresh cookies
- ✅ Check if the site requires specific headers
- ✅ Try using a different authentication method

---

💡 **Tip:** Start with session cookies for most internal sites, then try API tokens for better long-term reliability. 