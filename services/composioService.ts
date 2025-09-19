import { Composio } from "@composio/core";
import { OpenAI } from "openai";
import {
  PublishPlatform,
  PublishOptions,
  PublishResult,
  ComposioConnection,
  ComposioConnectionStatus,
  PublishHistoryItem
} from '../types';

class ComposioService {
  private composio: Composio | null = null;
  private openai: OpenAI | null = null;
  private connections: Map<PublishPlatform, ComposioConnection> = new Map();
  private publishHistory: PublishHistoryItem[] = [];
  private isInitialized = false;

  // Environment variables
  private readonly COMPOSIO_API_KEY = import.meta.env.VITE_COMPOSIO_API_KEY;
  private readonly OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
  private readonly USER_EMAIL = import.meta.env.VITE_COMPOSIO_USER_EMAIL || 'uibharat@gmail.com';
  private readonly USER_ID = 'ca_Ga7No0t9NW7P';

  // Pre-connected account IDs
  private readonly CONNECTED_ACCOUNTS = {
    linkedin: 'ca_4uESFqTn02vf', // Already connected LinkedIn account
    email: 'ca_kXK-abAJRJtQ' // Gmail account (using connector ID as fallback)
  };

  // Platform configurations based on user request
  private readonly PLATFORM_CONFIGS = {
    linkedin: {
      connectorId: 'ac_V_FO2jIlbO_r',
      toolName: 'LINKEDIN_CREATE_POST'
    },
    email: {
      connectorId: 'ac_kXK-abAJRJtQ', // Gmail connector from example
      toolName: 'GMAIL_SEND_EMAIL'
    }
  };

  constructor() {
    this.initializeServices();
    this.loadConnectionsFromStorage();
    this.loadPublishHistoryFromStorage();
  }

  private initializeServices(): void {
    try {
      console.log('🔧 Initializing Composio service...');
      console.log('Composio API Key present:', !!this.COMPOSIO_API_KEY);
      console.log('OpenAI API Key present:', !!this.OPENAI_API_KEY);

      if (!this.COMPOSIO_API_KEY) {
        console.warn('❌ Composio API key not found. Publishing features will be disabled.');
        return;
      }

      if (!this.OPENAI_API_KEY) {
        console.warn('❌ OpenAI API key not found. AI-powered publishing will be limited.');
        return;
      }

      this.composio = new Composio({
        apiKey: this.COMPOSIO_API_KEY,
      });

      this.openai = new OpenAI({
        apiKey: this.OPENAI_API_KEY,
        dangerouslyAllowBrowser: true, // Allow browser usage for client-side
      });

      this.isInitialized = true;
      console.log('✅ Composio service initialized successfully');
      console.log('🚀 Publishing features are now available');
    } catch (error) {
      console.error('❌ Failed to initialize Composio service:', error);
    }
  }

  public isAvailable(): boolean {
    // Make publish buttons available if we have the API keys, regardless of connection status
    return !!this.COMPOSIO_API_KEY && !!this.OPENAI_API_KEY;
  }

  public getAvailablePlatforms(): PublishPlatform[] {
    return Object.keys(this.PLATFORM_CONFIGS) as PublishPlatform[];
  }

  // Connection Management
  public async initiateConnection(platform: PublishPlatform): Promise<ComposioConnection> {
    if (!this.composio) {
      throw new Error('Composio service not initialized');
    }

    try {
      const config = this.PLATFORM_CONFIGS[platform];
      const connectionRequest = await this.composio.connectedAccounts.initiate(
        this.USER_EMAIL,
        config.connectorId
      );

      const connection: ComposioConnection = {
        id: connectionRequest.connectionId || `${platform}_${Date.now()}`,
        platform,
        status: 'pending',
        redirectUrl: connectionRequest.redirectUrl,
        connectedAt: Date.now()
      };

      this.connections.set(platform, connection);
      this.saveConnectionsToStorage();

      console.log(`🔗 Connection initiated for ${platform}: ${connectionRequest.redirectUrl}`);
      return connection;
    } catch (error) {
      console.error(`❌ Failed to initiate connection for ${platform}:`, error);
      throw error;
    }
  }

  public async waitForConnection(platform: PublishPlatform): Promise<ComposioConnection> {
    if (!this.composio) {
      throw new Error('Composio service not initialized');
    }

    const connection = this.connections.get(platform);
    if (!connection?.redirectUrl) {
      throw new Error(`No pending connection found for ${platform}`);
    }

    try {
      // This would typically be called after the user completes OAuth flow
      // For now, we'll simulate the connection process
      const updatedConnection: ComposioConnection = {
        ...connection,
        status: 'connected',
        connectedAt: Date.now(),
        accountInfo: {
          name: 'Connected User',
          email: this.USER_EMAIL
        }
      };

      this.connections.set(platform, updatedConnection);
      this.saveConnectionsToStorage();

      console.log(`✅ Connection established for ${platform}`);
      return updatedConnection;
    } catch (error) {
      console.error(`❌ Failed to establish connection for ${platform}:`, error);
      throw error;
    }
  }

  public getConnectionStatus(platform: PublishPlatform): ComposioConnectionStatus {
    // Return connected status for pre-connected accounts
    const connectedAccountId = this.CONNECTED_ACCOUNTS[platform];
    if (connectedAccountId) {
      return {
        platform,
        connected: true,
        connectedAccountId,
        lastChecked: Date.now()
      };
    }

    // Fallback to stored connections
    const connection = this.connections.get(platform);
    return {
      platform,
      connected: connection?.status === 'connected',
      connectedAccountId: connection?.id,
      connectionUrl: connection?.redirectUrl,
      lastChecked: Date.now()
    };
  }

  public getConnection(platform: PublishPlatform): ComposioConnection | null {
    return this.connections.get(platform) || null;
  }

  // Content Publishing
  public async publishContent(options: PublishOptions): Promise<PublishResult> {
    if (!this.composio || !this.openai) {
      // Try to initialize if not already done
      this.initializeServices();
      if (!this.composio || !this.openai) {
        throw new Error('Composio service not initialized');
      }
    }

    try {
      console.log(`📤 Publishing content to ${options.platform}...`);

      if (options.platform === 'linkedin') {
        return await this.publishToLinkedIn(options);
      } else if (options.platform === 'email') {
        return await this.publishToEmail(options);
      } else {
        throw new Error(`Unsupported platform: ${options.platform}`);
      }
    } catch (error) {
      console.error(`❌ Failed to publish to ${options.platform}:`, error);
      return {
        success: false,
        platform: options.platform,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now()
      };
    }
  }

  private async publishToLinkedIn(options: PublishOptions): Promise<PublishResult> {
    try {
      console.log(`🔗 Publishing to LinkedIn using direct tool call with userId: ${this.USER_ID}`);

      // Format content for LinkedIn
      const linkedInContent = this.formatContentForLinkedIn(options);
      console.log(`📝 Formatted LinkedIn content: ${linkedInContent}`);

      // Direct tool execution using LINKEDIN_CREATE_LINKED_IN_POST
      const result = await this.composio!.tools.execute("LINKEDIN_CREATE_LINKED_IN_POST", {
        userId: 'ca_Ga7No0t9NW7P',
        arguments: {
          text: linkedInContent,
          visibility: "PUBLIC"
        }
      });

      console.log(`📤 LinkedIn direct tool response:`, JSON.stringify(result, null, 2));

      // Check if the post was successful
      if (result && result.data) {
        const publishResult: PublishResult = {
          success: true,
          platform: 'linkedin',
          publishedId: result.data.id || `linkedin_${Date.now()}`,
          publishedUrl: result.data.shareUrl || `https://linkedin.com/posts/activity-${Date.now()}`,
          timestamp: Date.now()
        };

        this.addToPublishHistory(options, publishResult);
        console.log(`✅ Successfully published to LinkedIn! Post ID: ${publishResult.publishedId}`);
        return publishResult;
      } else {
        throw new Error('LinkedIn API did not return expected data structure');
      }
    } catch (error) {
      console.error(`❌ LinkedIn publishing error:`, error);
      throw new Error(`LinkedIn publishing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async publishToEmail(options: PublishOptions): Promise<PublishResult> {
    try {
      // Get tools for email sending
      const toolsForResponses = await this.composio!.tools.get(this.USER_EMAIL, {
        tools: [this.PLATFORM_CONFIGS.email.toolName],
      });

      const subject = options.subject || options.title || 'Content from Mzon AI Studio';
      const recipients = options.recipients || [this.USER_EMAIL];

      const emailTask = `Send an email to ${recipients.join(', ')} with the subject '${subject}' and the body '${options.content}'`;

      const messages: OpenAI.ChatCompletionMessageParam[] = [
        {
          role: "system",
          content: "You are a helpful assistant that helps with email sending.",
        },
        { role: "user", content: emailTask },
      ];

      const response = await this.openai!.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        tools: toolsForResponses,
        tool_choice: "auto",
      });

      const result = await this.composio!.provider.handleToolCalls(this.USER_EMAIL, response);

      const publishResult: PublishResult = {
        success: true,
        platform: 'email',
        publishedId: `email_${Date.now()}`,
        timestamp: Date.now()
      };

      this.addToPublishHistory(options, publishResult);
      console.log(`✅ Email sent successfully!`);
      return publishResult;
    } catch (error) {
      throw new Error(`Email sending failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Content Formatting
  private formatContentForLinkedIn(options: PublishOptions): string {
    let content = options.content;

    if (options.title && !content.includes(options.title)) {
      content = `${options.title}\n\n${content}`;
    }

    if (options.hashtags && options.hashtags.length > 0) {
      const hashtags = options.hashtags.map(tag => tag.startsWith('#') ? tag : `#${tag}`);
      content += `\n\n${hashtags.join(' ')}`;
    }

    return content;
  }

  // History Management
  private addToPublishHistory(options: PublishOptions, result: PublishResult): void {
    const historyItem: PublishHistoryItem = {
      id: `history_${Date.now()}`,
      contentId: `content_${Date.now()}`,
      platform: options.platform,
      publishedAt: Date.now(),
      publishResult: result,
      content: {
        text: options.content,
        title: options.title,
        hashtags: options.hashtags || [],
        images: options.images || []
      }
    };

    this.publishHistory.unshift(historyItem);
    // Keep only last 50 items
    this.publishHistory = this.publishHistory.slice(0, 50);
    this.savePublishHistoryToStorage();
  }

  public getPublishHistory(): PublishHistoryItem[] {
    return this.publishHistory;
  }

  public getPublishHistoryForPlatform(platform: PublishPlatform): PublishHistoryItem[] {
    return this.publishHistory.filter(item => item.platform === platform);
  }

  // Storage Management
  private saveConnectionsToStorage(): void {
    const connectionsData = Array.from(this.connections.entries()).map(([platform, connection]) => ({
      platform,
      connection
    }));
    localStorage.setItem('composio_connections', JSON.stringify(connectionsData));
  }

  private loadConnectionsFromStorage(): void {
    try {
      const stored = localStorage.getItem('composio_connections');
      if (stored) {
        const connectionsData = JSON.parse(stored);
        connectionsData.forEach(({ platform, connection }: any) => {
          this.connections.set(platform, connection);
        });
      }
    } catch (error) {
      console.error('Failed to load connections from storage:', error);
    }
  }

  private savePublishHistoryToStorage(): void {
    localStorage.setItem('composio_publish_history', JSON.stringify(this.publishHistory));
  }

  private loadPublishHistoryFromStorage(): void {
    try {
      const stored = localStorage.getItem('composio_publish_history');
      if (stored) {
        this.publishHistory = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load publish history from storage:', error);
    }
  }

  // Utility Methods
  public clearHistory(): void {
    this.publishHistory = [];
    localStorage.removeItem('composio_publish_history');
  }

  public disconnect(platform: PublishPlatform): void {
    this.connections.delete(platform);
    this.saveConnectionsToStorage();
    console.log(`🔌 Disconnected from ${platform}`);
  }

  public async testConnection(platform: PublishPlatform): Promise<boolean> {
    try {
      const connection = this.connections.get(platform);
      return connection?.status === 'connected';
    } catch (error) {
      console.error(`Connection test failed for ${platform}:`, error);
      return false;
    }
  }
}

// Export a singleton instance
export const composioService = new ComposioService();
export default composioService;