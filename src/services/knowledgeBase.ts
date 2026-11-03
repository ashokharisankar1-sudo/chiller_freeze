export interface KnowledgeEntry {
  topic: string;
  keywords: string[];
  description: string;
  quickStart: string;
  commonCommands: string[];
  troubleshooting: string[];
  resources: string[];
  examples: string[];
}

export class KnowledgeBaseService {
  private knowledgeBase: Map<string, KnowledgeEntry> = new Map();

  constructor() {
    this.initializeKnowledgeBase();
  }

  private initializeKnowledgeBase(): void {
    // Playwright
    this.knowledgeBase.set('playwright', {
      topic: 'Playwright',
      keywords: ['playwright', 'e2e', 'end-to-end', 'browser testing', 'automation'],
      description: 'Playwright is a Node.js library for end-to-end testing across all modern browsers (Chromium, Firefox, WebKit). It provides powerful automation capabilities with auto-wait, network interception, and multi-page support.',
      quickStart: `
// Install
npm init playwright@latest

// Basic test
import { test, expect } from '@playwright/test';

test('basic test', async ({ page }) => {
  await page.goto('https://example.com');
  await expect(page).toHaveTitle(/Example/);
});

// Run tests
npx playwright test
`,
      commonCommands: [
        'npx playwright test - Run all tests',
        'npx playwright test --headed - Run with browser visible',
        'npx playwright test --debug - Debug mode',
        'npx playwright codegen - Record new tests',
        'npx playwright show-report - View test report',
        'npx playwright test --project=chromium - Run specific browser'
      ],
      troubleshooting: [
        'Timeout errors: Increase timeout with test.setTimeout(60000)',
        'Element not found: Use page.waitForSelector() or auto-wait',
        'Network issues: Use page.route() to mock/intercept requests',
        'Flaky tests: Add explicit waits or use expect().toBeVisible()',
        'Browser crashes: Update browsers with npx playwright install'
      ],
      resources: [
        'https://playwright.dev/docs/intro',
        'https://playwright.dev/docs/api/class-page',
        'https://playwright.dev/docs/test-assertions'
      ],
      examples: [
        `// Navigate and click
await page.goto('https://example.com');
await page.click('button.submit');

// Fill form
await page.fill('#username', 'testuser');
await page.fill('#password', 'password123');

// Wait for navigation
await Promise.all([
  page.waitForNavigation(),
  page.click('a.link')
]);

// Assert text
await expect(page.locator('h1')).toHaveText('Welcome');`
      ]
    });

    // React
    this.knowledgeBase.set('react', {
      topic: 'React',
      keywords: ['react', 'component', 'jsx', 'hooks', 'useState', 'useEffect'],
      description: 'React is a JavaScript library for building user interfaces. It uses a component-based architecture and virtual DOM for efficient rendering.',
      quickStart: `
// Create React app
npx create-react-app my-app
cd my-app
npm start

// Functional component with hooks
import { useState, useEffect } from 'react';

function MyComponent() {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    document.title = \`Count: \${count}\`;
  }, [count]);
  
  return (
    <button onClick={() => setCount(count + 1)}>
      Count: {count}
    </button>
  );
}
`,
      commonCommands: [
        'npm start - Start development server',
        'npm run build - Create production build',
        'npm test - Run tests',
        'npm run eject - Eject from Create React App'
      ],
      troubleshooting: [
        'Warning: Can\'t perform React state update on unmounted component - Use cleanup in useEffect',
        'Too many re-renders - Check useEffect dependencies',
        'Key prop warning - Add unique key to list items',
        'Props not updating - Check parent component state'
      ],
      resources: [
        'https://react.dev/learn',
        'https://react.dev/reference/react',
        'https://react.dev/reference/react/hooks'
      ],
      examples: [
        `// useState
const [value, setValue] = useState(initialValue);

// useEffect
useEffect(() => {
  // Side effect
  return () => {
    // Cleanup
  };
}, [dependency]);

// useContext
const context = useContext(MyContext);

// useRef
const ref = useRef(null);`
      ]
    });

    // TypeScript
    this.knowledgeBase.set('typescript', {
      topic: 'TypeScript',
      keywords: ['typescript', 'ts', 'type', 'interface', 'generic'],
      description: 'TypeScript is a typed superset of JavaScript that compiles to plain JavaScript. It adds static typing and advanced features to help catch errors at compile time.',
      quickStart: `
// Install TypeScript
npm install -g typescript

// Initialize
tsc --init

// Basic types
let name: string = "John";
let age: number = 30;
let isActive: boolean = true;

// Interface
interface User {
  id: number;
  name: string;
  email?: string; // optional
}

// Function with types
function greet(user: User): string {
  return \`Hello, \${user.name}\`;
}
`,
      commonCommands: [
        'tsc --init - Initialize TypeScript config',
        'tsc file.ts - Compile single file',
        'tsc -p . - Compile project',
        'tsc --watch - Watch mode',
        'tsc --noEmit - Type check only'
      ],
      troubleshooting: [
        'Property does not exist on type - Check interface definition',
        'Type X is not assignable to type Y - Use type assertion or fix types',
        'Cannot find module - Check tsconfig paths or install @types',
        'Generic type requires type arguments - Provide type parameters'
      ],
      resources: [
        'https://www.typescriptlang.org/docs/',
        'https://www.typescriptlang.org/play',
        'https://github.com/typescript-cheatsheets/react'
      ],
      examples: [
        `// Union types
type Status = 'pending' | 'success' | 'error';

// Generics
function identity<T>(arg: T): T {
  return arg;
}

// Type guards
function isString(value: unknown): value is string {
  return typeof value === 'string';
}

// Mapped types
type Readonly<T> = {
  readonly [P in keyof T]: T[P];
};`
      ]
    });

    // Node.js
    this.knowledgeBase.set('nodejs', {
      topic: 'Node.js',
      keywords: ['node', 'nodejs', 'express', 'npm', 'backend', 'server'],
      description: 'Node.js is a JavaScript runtime built on Chrome\'s V8 engine. It allows running JavaScript on the server side and is commonly used for building APIs and web servers.',
      quickStart: `
// Initialize project
npm init -y

// Install Express
npm install express

// Basic server
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
`,
      commonCommands: [
        'node file.js - Run JavaScript file',
        'npm install package - Install package',
        'npm install -g package - Install globally',
        'npm start - Run start script',
        'npm run dev - Run dev script',
        'npm test - Run tests'
      ],
      troubleshooting: [
        'Cannot find module - Run npm install',
        'EADDRINUSE - Port already in use, change port or kill process',
        'ENOMEM - Out of memory, increase Node memory limit',
        'EACCES - Permission denied, check file permissions'
      ],
      resources: [
        'https://nodejs.org/docs/latest/api/',
        'https://expressjs.com/en/guide/routing.html',
        'https://npmjs.com'
      ],
      examples: [
        `// Express routes
app.get('/users', (req, res) => { });
app.post('/users', (req, res) => { });
app.put('/users/:id', (req, res) => { });
app.delete('/users/:id', (req, res) => { });

// Middleware
app.use(express.json());
app.use(cors());

// Async/await
app.get('/data', async (req, res) => {
  try {
    const data = await fetchData();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});`
      ]
    });

    // Git
    this.knowledgeBase.set('git', {
      topic: 'Git',
      keywords: ['git', 'commit', 'push', 'pull', 'branch', 'merge'],
      description: 'Git is a distributed version control system that tracks changes in source code. It enables collaboration, branching, and merging of code changes.',
      quickStart: `
# Initialize repository
git init

# Add files
git add .
git add filename.js

# Commit
git commit -m "Initial commit"

# Push to remote
git remote add origin https://github.com/user/repo.git
git push -u origin main

# Create branch
git checkout -b feature-branch

# Merge branch
git checkout main
git merge feature-branch
`,
      commonCommands: [
        'git status - Check status',
        'git log - View commit history',
        'git diff - Show changes',
        'git stash - Stash changes',
        'git stash pop - Restore stashed changes',
        'git reset --hard HEAD - Discard all changes'
      ],
      troubleshooting: [
        'Merge conflict - Manually resolve conflicts in files',
        'Detached HEAD - Checkout a branch: git checkout main',
        'Failed to push - Pull first: git pull origin main',
        'Changes not staged - Run git add before commit'
      ],
      resources: [
        'https://git-scm.com/doc',
        'https://docs.github.com/en/get-started',
        'https://www.atlassian.com/git/tutorials'
      ],
      examples: [
        `# Undo last commit (keep changes)
git reset --soft HEAD~1

# Undo last commit (discard changes)
git reset --hard HEAD~1

# Rebase onto main
git checkout feature
git rebase main

# Cherry-pick commit
git cherry-pick <commit-hash>

# Show specific commit
git show <commit-hash>`
      ]
    });

    // Docker
    this.knowledgeBase.set('docker', {
      topic: 'Docker',
      keywords: ['docker', 'container', 'dockerfile', 'image', 'compose'],
      description: 'Docker is a platform for developing, shipping, and running applications in containers. Containers package an application with all its dependencies.',
      quickStart: `
# Dockerfile
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]

# Build image
docker build -t myapp .

# Run container
docker run -p 3000:3000 myapp

# Docker Compose
version: '3'
services:
  web:
    build: .
    ports:
      - "3000:3000"
`,
      commonCommands: [
        'docker ps - List running containers',
        'docker images - List images',
        'docker build -t name . - Build image',
        'docker run -p 80:3000 image - Run container',
        'docker-compose up - Start services',
        'docker-compose down - Stop services',
        'docker logs container - View logs'
      ],
      troubleshooting: [
        'Port already in use - Change port mapping or stop conflicting container',
        'Container exits immediately - Check logs: docker logs container',
        'Build fails - Check Dockerfile syntax and paths',
        'Permission denied - Run with sudo or add user to docker group'
      ],
      resources: [
        'https://docs.docker.com/get-started/',
        'https://docs.docker.com/engine/reference/builder/',
        'https://docs.docker.com/compose/'
      ],
      examples: [
        `# Multi-stage build
FROM node:18 AS builder
WORKDIR /app
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html

# Volume mounting
docker run -v $(pwd):/app -p 3000:3000 myapp

# Environment variables
docker run -e NODE_ENV=production myapp

# Network
docker network create mynet
docker run --network mynet myapp`
      ]
    });
  }

  search(query: string): KnowledgeEntry | null {
    const queryLower = query.toLowerCase();
    
    // Direct match
    if (this.knowledgeBase.has(queryLower)) {
      return this.knowledgeBase.get(queryLower)!;
    }

    // Keyword search
    for (const [key, entry] of this.knowledgeBase.entries()) {
      if (entry.keywords.some(keyword => queryLower.includes(keyword))) {
        return entry;
      }
    }

    return null;
  }

  searchByKeywords(keywords: string[]): KnowledgeEntry[] {
    const results: KnowledgeEntry[] = [];
    const seen = new Set<string>();

    keywords.forEach(keyword => {
      const entry = this.search(keyword);
      if (entry && !seen.has(entry.topic)) {
        results.push(entry);
        seen.add(entry.topic);
      }
    });

    return results;
  }

  getErrorSolutions(errorType: string): string[] {
    const solutions: Map<string, string[]> = new Map([
      ['syntax_error', [
        'Check for missing semicolons, brackets, or parentheses',
        'Verify proper indentation and formatting',
        'Look for unclosed strings or template literals',
        'Check for invalid characters in identifiers'
      ]],
      ['type_error', [
        'Verify variable types match expected types',
        'Check function parameter types',
        'Use type assertions if necessary: value as Type',
        'Review interface/type definitions'
      ]],
      ['reference_error', [
        'Variable is not defined - check spelling and scope',
        'Import statement missing - add import',
        'Variable used before declaration - move declaration up',
        'Check for typos in variable names'
      ]],
      ['module_error', [
        'Run npm install to install missing dependencies',
        'Check package.json for the dependency',
        'Verify import path is correct',
        'Check if module is installed globally vs locally'
      ]],
      ['compilation_error', [
        'Check TypeScript configuration (tsconfig.json)',
        'Verify all imports are correct',
        'Check for type mismatches',
        'Run tsc --noEmit to see all errors'
      ]],
      ['test_error', [
        'Check test assertions match expected values',
        'Verify test setup and teardown',
        'Check for async issues - use await properly',
        'Review test data and mocks'
      ]],
      ['undefined_error', [
        'Check if object property exists before accessing',
        'Use optional chaining: obj?.property',
        'Initialize variables before use',
        'Check API response structure'
      ]],
      ['null_error', [
        'Add null checks before accessing properties',
        'Use non-null assertion if sure: obj!.property',
        'Check function return values',
        'Verify database queries return expected data'
      ]]
    ]);

    return solutions.get(errorType) || ['Check the error message for specific details', 'Search for the error online', 'Review recent code changes'];
  }

  getAllTopics(): string[] {
    return Array.from(this.knowledgeBase.keys());
  }

  getEntry(topic: string): KnowledgeEntry | undefined {
    return this.knowledgeBase.get(topic);
  }
}

export const knowledgeBaseService = new KnowledgeBaseService();
