# Runs the SlopCheck MCP server over stdio. It has no dependencies: Node 18 or later is all it needs.
FROM node:22-alpine
WORKDIR /app
COPY package.json LICENSE ./
COPY mcp ./mcp
USER node
ENTRYPOINT ["node", "mcp/index.js"]
