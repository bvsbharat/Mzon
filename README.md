# Mzon - AI Content & News Intelligence Platform

<div align="center">
  <h3>🚀 AI-Powered Content Creation with Real-Time News Intelligence</h3>
  <p>Generate trending, data-driven content across multiple social media platforms</p>
</div>

## 🌟 Overview

Mzon is an innovative AI-powered content creation platform that combines real-time news intelligence with intelligent content generation. Built for the [MCP AI Agents Hackathon](https://mcp-ai-agents-hackathon.devpost.com/), it enables businesses to automatically create engaging, timely content across Instagram, LinkedIn, Facebook, and other social platforms.

## ✨ Key Features

- **🔥 Real-Time News Intelligence**: Powered by Bright Data for live news feeds
- **🤖 AI Content Generation**: Multi-platform content creation with platform-specific formatting
- **📱 Social Media Mockups**: Preview content across Instagram, LinkedIn, Facebook, Twitter, TikTok, and YouTube
- **🔐 Secure Authentication**: Passwordless auth with Stytch integration
- **☁️ Cloud Storage**: S3 integration with secure proxy service
- **🎙️ Voice Integration**: Voice-to-content conversion with Gladia.io
- **📊 Campaign Management**: Comprehensive campaign studio for multi-platform management
- **🎨 Asset Library**: Centralized asset management with cloud storage

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development
- **TailwindCSS** for modern UI
- **React Context** for state management

### Backend
- **Python FastAPI** for high-performance APIs
- **S3 Proxy Service** for secure file operations
- **Bright Data Integration** for news intelligence
- **Composio Service** for external integrations

### External Services
- **[Stytch](https://stytch.com/)** - Authentication
- **[Gladia.io](https://www.gladia.io)** - Voice processing
- **[Qodo.ai](https://www.qodo.ai/)** - Code intelligence
- **[TigerData](https://www.tigerdata.com/)** & **[Redis](https://redis.io/)** - Data storage
- **[Apify](https://console.apify.com/)** - Web crawling
- **[HoneyHive.ai](https://www.honeyhive.ai/)** - AI observability
- **[Speakeasy](https://www.speakeasy.com/)** - API management

## 🚀 Quick Start

### Prerequisites
- Node.js (v18+)
- Python 3.8+
- Git

### Frontend Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Environment Configuration:**
   Create `.env.local` file:
   ```env
   GEMINI_API_KEY=your_gemini_api_key
   VITE_API_BASE_URL=http://localhost:8000
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Create virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Environment Configuration:**
   Create `.env` file in backend directory:
   ```env
   BRIGHTDATA_API_TOKEN=your_bright_data_token
   AWS_ACCESS_KEY_ID=your_aws_access_key
   AWS_SECRET_ACCESS_KEY=your_aws_secret_key
   AWS_REGION=us-east-1
   S3_BUCKET_NAME=mascotly-ai
   ```

5. **Start backend server:**
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```

## 📁 Project Structure

```
Mzon/
├── components/           # React components
│   ├── PlatformMockups/ # Social media platform mockups
│   ├── auth/           # Authentication components
│   ├── icons/          # Icon components
│   └── ui/             # UI components
├── services/           # Frontend services
├── views/              # Main application views
├── contexts/           # React contexts
├── backend/            # Python FastAPI backend
│   ├── routes/         # API routes
│   ├── services/       # Backend services
│   └── main.py         # FastAPI application
└── README.md
```

## 🔧 Configuration

### S3 Setup
The application uses S3 for asset storage with a proxy service to handle CORS issues. See [S3-CONFIGURATION-STATUS.md](S3-CONFIGURATION-STATUS.md) for detailed setup instructions.

### Authentication
Authentication is handled through Stytch. See [README-AUTH.md](README-AUTH.md) for authentication setup details.

### News Intelligence
Real-time news data is provided by Bright Data. The service automatically falls back to demo mode if API credentials are not configured.

## 🚧 Key Challenges Solved

1. **CORS Issues**: Implemented backend S3 proxy to bypass browser restrictions
2. **API Integration**: Fixed Bright Data service configuration for real news data  
3. **Authentication**: Integrated secure passwordless authentication
4. **Multi-Platform Content**: Created platform-specific templates and mockups
5. **Real-time Data**: Built efficient crawling pipeline for comprehensive market awareness

## 🎯 Use Cases

- **Content Marketers**: Generate trending content based on real-time news
- **Social Media Managers**: Create platform-specific content at scale
- **Businesses**: Maintain consistent brand presence across multiple platforms
- **Agencies**: Manage multiple client campaigns efficiently

## 🔮 Roadmap

- [ ] Machine Learning Pipeline for content performance analytics
- [ ] Multi-language support for global content creation
- [ ] Advanced scheduling and automation features
- [ ] Comprehensive analytics dashboard
- [ ] Integration with more social media platforms

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built for the [MCP AI Agents Hackathon](https://mcp-ai-agents-hackathon.devpost.com/)
- Inspired by [Marketing Assets Generator](https://github.com/pratiektripathi/marketing-assets-generator)
- Event discovery concepts from [Event Hunter AI](https://dev.to/meirk-codes/building-event-hunter-ai-a-multi-agent-system-for-intelligent-event-discovery-1cij)

---

<div align="center">
  <p>Made with ❤️ for the MCP AI Agents Hackathon</p>
</div>
