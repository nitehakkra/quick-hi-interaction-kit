
#!/bin/bash

# Install dependencies
npm ci

# Build the React application
npm run build

# Install production dependencies for the server
npm ci --only=production
