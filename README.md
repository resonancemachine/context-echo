# Context Echo

Context Echo is a lightweight Model Context Protocol (MCP) memory server that stores user context (Entities, Relations, Facts) as a structured knowledge graph in local JSON files. It provides persistent memory for AI agents, allowing them to retain information across different sessions.

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

To use Context Echo with a local MCP client, you need to point the client to the compiled `dist/index.js` file using absolute paths.

### Standard Configuration

In your client's MCP settings (e.g., `claude_desktop_config.json`), add:

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

### Running with TOME

1. Ensure the project is built: `npm run build`.
2. In TOME, add a new MCP server.
3. Select "Stdio" transport.
4. Set Command to `node`.
5. Set Arguments to the absolute path of `dist/index.js`.

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

### Publishing to Smithery

To publish your MCP server to the Smithery registry so others can discover and install it:

1.  **Prepare a Dockerfile**: Smithery uses Docker to build and run your server in the cloud. Create a `Dockerfile` in the root (if not already present).
2.  **Push to GitHub**: Ensure your project is pushed to a public GitHub repository.
3.  **Deploy from Smithery Dashboard**:
    - Go to [smithery.ai/deploy](https://smithery.ai/deploy).
    - Select **"From GitHub"**.
    - Choose your repository and follow the configuration steps.
4.  **CLI Deployment**: Alternatively, you can use the CLI:
    ```bash
    npx @smithery/cli deploy
    ```

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
