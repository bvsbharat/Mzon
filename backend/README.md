# Agentic News Discovery Backend

A Python FastAPI backend that implements a multi-agent system for intelligent news discovery and social media content optimization, inspired by the Event Hunter AI architecture.

## Features

- **Multi-Agent Architecture**: Specialized agents for news search, content processing, tag filtering, and social media optimization
- **Real-time Updates**: WebSocket streaming for live agent progress updates
- **Intelligent Filtering**: Tag-based relevance scoring and content quality assessment
- **Social Media Optimization**: Automatic content formatting for different platforms
- **Multiple Data Sources**: NewsAPI, RSS feeds, and web scraping integration
- **Content Analysis**: Sentiment analysis, summarization, and trending potential scoring

## Architecture

### Core Components

1. **Agent Orchestrator**: Main coordinator managing the deep agent workflow
2. **Specialized Agents**:
   - `NewsSearchAgent`: Multi-source news discovery
   - `NewsDetailsAgent`: Content extraction and processing
   - `TagFilterAgent`: Intelligent filtering and relevance scoring
   - `SocialContentAgent`: Social media optimization
3. **WebSocket Manager**: Real-time communication with frontend
4. **Cache Manager**: Performance optimization with in-memory caching

## Installation

### Prerequisites

- Python 3.8+
- pip or poetry
- Redis (optional, for production caching)

### Setup

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Create virtual environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\\Scripts\\activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Environment Configuration**:
   Copy `.env.example` to `.env` and configure:
   ```bash
   cp .env.example .env
   ```

   Add your API keys:
   ```env
   # API Keys
   NEWS_API_KEY=your_news_api_key_here
   OPENAI_API_KEY=your_openai_api_key_here
   GEMINI_API_KEY=your_gemini_api_key_here

   # Server Configuration
   HOST=0.0.0.0
   PORT=8000
   DEBUG=True

   # Redis (optional)
   REDIS_URL=redis://localhost:6379
   ```

## Usage

### Starting the Server

```bash
# Development mode with auto-reload
python main.py

# Or using uvicorn directly
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The server will start on `http://localhost:8000`.

### API Endpoints

#### 1. Health Check
```http
GET /
```
Returns server health status.

#### 2. Start News Discovery
```http
POST /api/news/discover
Content-Type: application/json

{
  "tags": ["ai", "technology"],
  "categories": ["technology", "ai"],
  "max_articles": 20,
  "language": "en",
  "country": "us"
}
```

Response:
```json
{
  "session_id": "uuid-string",
  "status": "started",
  "message": "News discovery started. Connect to WebSocket for real-time updates."
}
```

#### 3. WebSocket Updates
```
WS /api/news/stream/{session_id}
```

Real-time updates during the discovery process:
```json
{
  "type": "agent_update",
  "session_id": "uuid-string",
  "update": {
    "agent_name": "NewsSearchAgent",
    "status": "searching",
    "message": "Searching NewsAPI...",
    "progress": 25.0,
    "data": {"articles_found": 15}
  }
}
```

#### 4. Get Processed Results
```http
GET /api/news/processed/{session_id}
```

Returns processed articles with social media optimization.

#### 5. Start Tag Monitoring
```http
POST /api/tags/monitor
Content-Type: application/json

{
  "tags": ["ai", "startup"],
  "interval_minutes": 60
}
```

#### 6. Get Statistics
```http
GET /api/news/stats
```

Returns system statistics including active sessions, processed articles, and performance metrics.

## Frontend Integration

### Basic Usage

```typescript
import {
  startAgenticNewsDiscovery,
  connectToNewsUpdates
} from './services/agenticNewsService';

// Start discovery
const response = await startAgenticNewsDiscovery({
  tags: ['ai', 'machine learning'],
  categories: ['technology'],
  maxArticles: 20
});

// Connect to real-time updates
connectToNewsUpdates(
  response.sessionId,
  (update) => {
    console.log(`${update.agentName}: ${update.message}`);
    setProgress(update.progress || 0);
  },
  (articles) => {
    console.log('Discovery completed!', articles);
    setNewsArticles(articles);
  },
  (error) => {
    console.error('Discovery failed:', error);
  }
);
```

### WebSocket Message Types

- `connection_established`: WebSocket connected
- `agent_update`: Progress update from specific agent
- `discovery_completed`: Final results available
- `error`: Error occurred during processing

## Development

### Adding New Agents

1. Create agent class extending `BaseAgent`:
```python
from agents.base_agent import BaseAgent

class MyCustomAgent(BaseAgent):
    def __init__(self):
        super().__init__("MyCustomAgent")

    async def _setup(self):
        # Initialize agent resources
        pass

    async def execute(self, session_id: str, **kwargs):
        # Implement agent logic
        return {"processed_data": []}
```

2. Add to orchestrator in `services/agent_orchestrator.py`:
```python
custom_agent = MyCustomAgent()
await custom_agent.initialize()
self.deep_agent.add_subagent(custom_agent)
```

### Adding New Data Sources

1. Create utility class in `utils/`:
```python
class MyDataSource:
    async def initialize(self):
        pass

    async def fetch_articles(self, query: str):
        # Implement data fetching
        return articles
```

2. Integrate in `NewsSearchAgent`:
```python
self.my_data_source = MyDataSource()
await self.my_data_source.initialize()
```

## Configuration

### Environment Variables

- `NEWS_API_KEY`: NewsAPI.org API key
- `OPENAI_API_KEY`: OpenAI API key for content processing
- `GEMINI_API_KEY`: Google Gemini API key
- `REDIS_URL`: Redis connection string (optional)
- `RSS_FEEDS`: Comma-separated RSS feed URLs
- `SCRAPING_DOMAINS`: Comma-separated domains to scrape
- `MAX_REQUESTS_PER_MINUTE`: Rate limiting
- `CACHE_EXPIRE_HOURS`: Cache expiration time

### Default RSS Feeds

- O'Reilly Radar
- TechCrunch
- Wired
- Ars Technica
- The Verge
- VentureBeat
- Mashable
- Engadget

### Supported Domains for Scraping

- techcrunch.com
- wired.com
- theverge.com

## Performance Optimization

1. **Caching**: Automatic caching of processed results
2. **Concurrent Processing**: Async operations for all agents
3. **Rate Limiting**: Respects external API limits
4. **Background Tasks**: Non-blocking agent execution

## Error Handling

- Graceful fallbacks when data sources are unavailable
- Comprehensive logging for debugging
- WebSocket error reporting to frontend
- Automatic retry mechanisms for transient failures

## Production Deployment

1. Set `DEBUG=False` in environment
2. Use Redis for caching: `REDIS_URL=redis://your-redis-host:6379`
3. Configure proper CORS origins
4. Use reverse proxy (nginx) for SSL termination
5. Set appropriate rate limits
6. Monitor logs and performance metrics

## API Documentation

Once running, visit `http://localhost:8000/docs` for interactive API documentation (Swagger UI).

## Troubleshooting

### Common Issues

1. **NewsAPI Rate Limits**: Get a free API key from newsapi.org
2. **WebSocket Connections**: Ensure CORS is properly configured
3. **Memory Usage**: Adjust cache settings for large deployments
4. **Agent Failures**: Check logs for specific agent error messages

### Logging

Logs are written to console with INFO level by default. Adjust logging level in `main.py`:

```python
logging.basicConfig(level=logging.DEBUG)  # For detailed logs
```

## Contributing

1. Follow PEP 8 style guidelines
2. Add type hints to all functions
3. Include docstrings for new classes and methods
4. Add tests for new functionality
5. Update this README for new features