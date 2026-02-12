# Context Echo

Context Echo is a lightweight Model Context Protocol (MCP) memory server that stores user context (Entities, Relations, Facts) as a structured knowledge graph in local JSON files. It provides persistent memory for AI agents, allowing them to retain information across different sessions. It uses the **Streamable HTTP** transport protocol, enabling it to be hosted in the cloud and accessed via public HTTPS URLs.

## Features

- **Entity Tracking**: Store and retrieve specific entities with types and metadata.
- **Relation Mapping**: Link entities together with typed relationships and weights.
- **Fact Recording**: Store factual statements with confidence scores and timestamps.
- **Local Persistence**: Data is saved to `./memory/{userId}.json` using Zod for robust validation.
- **MCP Native**: Implements `memory.add`, `memory.query`, and `memory.summarize` tools.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS version recommended)
- npm or pnpm

### Installation

```bash
# Clone the repository (if applicable)
# cd context-echo

# Install dependencies
npm install
```

### Building the Project

```bash
npm run build
```

The compiled files will be located in the `dist` directory.

## Running Tests

You can run the integration tests to verify the storage and tool logic:

```bash
# Test the storage layer (file I/O and validation)
npx tsx src/scripts/test-storage.ts

# Test the MCP tools logic (add, query, summarize)
npx tsx src/scripts/test-tools.ts
```

## MCP Client Integration (e.g., TOME, Claude Desktop)

To use Context Echo with a local MCP client, you can run the server locally and point the client to its HTTP endpoint.

### Standard Configuration

The server runs on port 3000 by default and exposes:
- **MCP Endpoint**: `http://localhost:3000/mcp`
- **Health Check**: `http://localhost:3000/healthz` (Returns `{"status": "ok"}`)

1. **Start the server locally**: `npm start`
2. **In your client's MCP settings** (e.g., `claude_desktop_config.json`), use the `sse` transport:

```json
{
  "mcpServers": {
    "context-echo": {
      "command": "node",
      "args": ["/absolute/path/to/context-echo/dist/index.js"]
    }
  }
}
```
*Note: While the server uses HTTP/SSE, it can still be executed via CLI as shown above for local testing.*

### Running with TOME (HTTP Mode)

1. Ensure the project is built: `npm run build`.
2. Start the server: `npm start`.
3. In TOME, add a new MCP server.
4. Select "SSE" transport.
5. Set the URL to `http://localhost:3000/mcp`.

### Running with OpenCode

To add Context Echo to OpenCode, use the following CLI command:

```bash
opencode mcp add
```

This will launch an interactive guide. When prompted for the local server details:
- **Command**: `node`
- **Arguments**: `/absolute/path/to/context-echo/dist/index.js`
- **Name**: `context-echo`

## Smithery Integration

Context Echo is ready to be used with [Smithery](https://smithery.ai).

### Local Development

To run the server locally with hot-reloading and a testing interface:

```bash
npx @smithery/cli dev
```

#### Loading Environment Variables
If you need to load variables from a `.env` file (like `SMITHERY_API_KEY`) while running the dev server, use the following command to pass the key explicitly:

```bash
export $(cat .env | xargs) && npx @smithery/cli dev --key $SMITHERY_API_KEY
```

Or using `dotenv-cli`:
```bash
npx dotenv-cli -- sh -c 'npx @smithery/cli dev --key $SMITHERY_API_KEY'
```

### Publishing to Smithery

To publish your MCP server to the Smithery registry so others can discover and install it:

1.  **Prepare for HTTP**: The server is already configured to use `Streamable-http` transport.
2.  **Expose Port**: Ensure your cloud provider (e.g., Render, Fly.io, Heroku) uses port `3000`.
3.  **Push to GitHub**: Ensure your project is pushed to your GitHub repository.
4.  **Publish via CLI**:
    ```bash
    npx @smithery/cli publish --key $SMITHERY_API_KEY --name @your-namespace/context-echo
    ```
5.  **Configure in Smithery**:
    - Go to your server on [smithery.ai](https://smithery.ai).
    - Under **Deployment**, set the **Public HTTP URL** to your cloud deployment address (e.g., `https://context-echo.onrender.com/mcp`).

Once published, users can install your server globally using:
```bash
npx @smithery/cli install context-echo --client claude
```

## Project Structure

- `src/index.ts`: MCP server implementation and tool handlers.
- `src/storage.ts`: Filesystem persistence logic.
- `src/types.ts`: Zod schemas and TypeScript interfaces.
- `memory/`: (Ignored by git) Local storage directory for user JSON files.
- `smithery.yaml`: Smithery tool definitions.

## License

ISC
