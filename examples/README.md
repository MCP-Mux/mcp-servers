# MCP Server Definition Examples

This directory contains example server definitions demonstrating various features and configurations of the MCP server definition schema.

## Available Examples

### 1. [complete-example.json](./complete-example.json)
**Comprehensive Feature Showcase**

Demonstrates all available schema fields including:
- Local (stdio) transport with command execution
- API key authentication
- Multiple input fields with obtain instructions
- Complete publisher information
- Badge system (official, verified, featured)
- Installation metadata with prerequisites
- Rich media content (screenshots, video, banner)
- Full capabilities configuration

**Use this as a template when creating fully-featured server definitions.**

---

### 2. [remote-hosted-example.json](./remote-hosted-example.json)
**Cloud/Remote Server Pattern**

Key features:
- HTTP transport (remote endpoint)
- OAuth authentication
- `hosting_type: "remote"` - runs in cloud, no local installation
- Easy installation (no prerequisites)
- Minimal setup time

**Use this pattern for SaaS/cloud-hosted MCP servers.**

---

### 3. [sponsored-example.json](./sponsored-example.json)
**Sponsored Server Listing**

Demonstrates commercial/sponsored features:
- Sponsored badge and metadata
- Complete sponsorship information (name, logo, campaign tracking)
- Commercial license
- Popular badge
- Marketing-focused media content

**Use this pattern for sponsored server listings and commercial offerings.**

---

### 4. [read-only-example.json](./read-only-example.json)
**Safe Read-Only Server**

Key features:
- `read_only_mode: true` capability - no destructive actions
- `optional_api_key` auth - works without auth, enhanced with key
- Documentation/search use case
- Remote hosted with no prerequisites
- Minimal configuration for quick adoption

**Use this pattern for documentation, search, and knowledge-base servers that don't modify data.**

---

## Schema Features Comparison

| Feature | Complete | Remote | Sponsored | Read-Only |
|---------|----------|--------|-----------|-----------|
| **Transport** | stdio | http | http | http |
| **Hosting Type** | local | remote | remote | remote |
| **Auth Type** | api_key | oauth | api_key | optional_api_key |
| **Read-Only** | ❌ | ❌ | ❌ | ✅ |
| **Badges** | 3 badges | 2 badges | 3 badges | 2 badges |
| **Sponsored** | ❌ | ❌ | ✅ | ❌ |
| **Media** | Full (3 SS + video + banner) | Partial | Full | Partial |
| **Prerequisites** | Node.js 18+ | None | None | None |
| **Difficulty** | moderate | easy | easy | easy |

---

## Field Reference

### Required Fields
- `id` - Unique identifier in reverse-domain notation
- `name` - Display name
- `transport` - Transport configuration (stdio or http)

### Recommended Fields
- `description` - What the server does
- `logo` - HTTP(S) URL to a logo image (PNG/SVG). Emoji are not accepted. Legacy `icon` field name is still supported.
- `categories` - For discoverability
- `badges` - Trust indicators (official, verified, featured, sponsored, popular)
- `hosting_type` - local, remote, or hybrid
- `license` - SPDX license identifier
- `installation` - Difficulty, prerequisites, estimated time
- `capabilities` - Supported features (tools, resources, prompts, read_only_mode)
- `publisher` - Publisher information with verification status
- `links` - Repository, homepage, documentation

### Optional Enhanced Fields
- `media` - Screenshots, demo video, banner image
- `sponsored` - Sponsorship details (if applicable)
- `changelog_url` - Link to version history
- `platforms` - Supported platforms (default: ["all"])

---

## Creating Your Server Definition

1. **Choose a template** based on your server type:
   - Local CLI tool → Use `complete-example.json`
   - Cloud/SaaS API → Use `remote-hosted-example.json`
   - Documentation/Search → Use `read-only-example.json`
   - Sponsored listing → Use `sponsored-example.json`

2. **Validate against schema**:
   ```bash
   # Install a JSON schema validator
   npm install -g ajv-cli
   
   # Validate your definition
   ajv validate -s ../schemas/server-definition.schema.json -d your-server.json
   ```

3. **Test locally** with McpMux before submitting

4. **Submit via Pull Request** to the mcp-servers repository

---

## Badge Guidelines

| Badge | Criteria |
|-------|----------|
| `official` | Created/maintained by the service's official team |
| `verified` | Publisher identity verified, domain ownership confirmed |
| `featured` | Highlighted by McpMux team for quality/popularity |
| `sponsored` | Commercial sponsored listing |
| `popular` | High usage metrics (downloads, stars) |

---

## Best Practices

### Logos
- Provide an HTTP(S) URL to a PNG/SVG logo — emoji are not accepted
- Prefer GitHub avatars (`https://avatars.githubusercontent.com/u/<id>?v=4`) or official brand URLs
- Recommended size: 128x128px or 256x256px
- The field name is `logo`; the legacy `icon` field name is still supported but discouraged

### Screenshots
- Max 5 screenshots
- Use clear, high-resolution images
- Show actual functionality
- Recommended size: 1200x800px

### Banners
- For featured display on homepage
- Recommended size: 1200x400px
- Professional design with clear branding

### Descriptions
- Keep under 150 characters
- Focus on user value, not implementation
- Avoid marketing hype
- Be specific about capabilities

### Installation Difficulty
- **Easy**: Click and go, no prerequisites
- **Moderate**: 1-2 prerequisites (Node.js, Docker)
- **Advanced**: Multiple dependencies, complex setup, compilation

---

## Questions?

See the [main schema documentation](../schemas/README.md) or contact the McpMux team.
