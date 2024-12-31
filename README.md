# Hoshi Backend

A powerful AI agent platform built with Node.js and TypeScript that enables the creation and extension of AI agents through a modular extension system. The platform allows AI agents to interact with various services and APIs, expanding their capabilities beyond basic language processing.

## 🤖 Overview

Hoshi is designed to enhance AI agents by providing them with real-world capabilities through extensions. Each extension adds new abilities to the agents, such as:
- Web interaction and data collection
- Social media management
- Content management
- Document handling
- Search capabilities
- Time-based operations

## 🚀 Features

### Core Platform
- Modular extension system for expanding agent capabilities
- Real-time communication through WebSocket
- Database integration for persistent storage
- LangChain integration for AI/LLM orchestration

### Available Extensions

- **Website Crawler**: Enables agents to interact with web content
  - Screenshot capture
  - Content extraction
  - Automated navigation

- **WordPress Integration**: Gives agents CMS management abilities
  - Content creation and management
  - Category and tag handling
  - Post status control
  - Content analysis

- **Social Media Management**
  - X (Twitter) posting and interaction
  - LinkedIn automation
  - Social content scheduling

- **Document Processing**
  - Google Docs integration
  - Content analysis
  - Document management

- **Utility Extensions**
  - DateTime handling
  - Tavily AI-powered search
  - More utilities for enhanced agent capabilities

## 🛠️ Tech Stack

- Node.js & TypeScript
- Express.js for API endpoints
- Socket.IO for real-time agent communication
- Prisma for database management
- LangChain for AI/LLM integrations
- Puppeteer for web automation
- Various service-specific APIs

## 📋 Prerequisites

- Node.js (Latest LTS version)
- PostgreSQL database
- API keys for:
  - OpenAI or other LLM providers
  - Social media platforms
  - Other integrated services

## 🔧 Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/hoshi-backend.git
cd hoshi-backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file with the following variables (adjust as needed):
```
DATABASE_URL="postgresql://..."
OPENAI_API_KEY="..."
# Add other required API keys for extensions
```

4. Run database migrations:
```bash
npm run migrate
```

5. Start the development server:
```bash
npm run dev
```

## 🔌 Creating Extensions

Extensions are modular components that add new capabilities to AI agents. Each extension should:
- Be placed in the `extensions/` directory
- Export tools that agents can use
- Include proper TypeScript types
- Provide clear documentation of its capabilities

## 🧪 Testing

Run the test suite:
```bash
npm test
```

## 📝 License

ISC License

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to add new extensions or improve existing ones. 