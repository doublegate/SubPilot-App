import { type PrismaClient } from '@prisma/client';
import { TRPCError } from '@trpc/server';

// Function call structure for messages
interface FunctionCall {
  name: string;
  arguments?: Record<string, unknown>;
}

export class ConversationService {
  constructor(private db: PrismaClient) {}

  /**
   * Create a new conversation
   */
  async create(userId: string, title?: string) {
    return this.db.conversation.create({
      data: {
        userId,
        title: title ?? 'New Chat',
        messageCount: 0,
      },
    });
  }

  /**
   * Get user's conversations
   */
  async getUserConversations(userId: string, limit = 20, offset = 0) {
    const [conversations, total] = await Promise.all([
      this.db.conversation.findMany({
        where: { userId },
        orderBy: { lastMessageAt: 'desc' },
        skip: offset,
        take: limit,
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              content: true,
              role: true,
              createdAt: true,
            },
          },
          _count: {
            select: {
              messages: true,
              actions: true,
            },
          },
        },
      }),
      this.db.conversation.count({ where: { userId } }),
    ]);

    return {
      conversations: conversations.map(conv => ({
        id: conv.id,
        title: conv.title,
        lastMessage: conv.messages[0],
        messageCount: conv._count.messages,
        actionCount: conv._count.actions,
        lastMessageAt: conv.lastMessageAt,
        createdAt: conv.createdAt,
      })),
      total,
      hasMore: offset + limit < total,
    };
  }

  /**
   * Get a specific conversation with all messages
   */
  async getConversation(conversationId: string, userId: string) {
    const conversation = await this.db.conversation.findFirst({
      where: { id: conversationId, userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
        actions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!conversation) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Conversation not found',
      });
    }

    return conversation;
  }

  /**
   * Update conversation title
   */
  async updateTitle(conversationId: string, userId: string, title: string) {
    const conversation = await this.db.conversation.findFirst({
      where: { id: conversationId, userId },
    });

    if (!conversation) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Conversation not found',
      });
    }

    return this.db.conversation.update({
      where: { id: conversationId },
      data: { title },
    });
  }

  /**
   * Delete a conversation
   */
  async delete(conversationId: string, userId: string) {
    const conversation = await this.db.conversation.findFirst({
      where: { id: conversationId, userId },
    });

    if (!conversation) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Conversation not found',
      });
    }

    // Delete will cascade to messages and actions
    await this.db.conversation.delete({
      where: { id: conversationId },
    });

    return { success: true };
  }

  /**
   * Delete all conversations for a user
   */
  async deleteAll(userId: string) {
    const result = await this.db.conversation.deleteMany({
      where: { userId },
    });

    return { deletedCount: result.count };
  }

  /**
   * Search conversations
   */
  async search(userId: string, query: string, limit = 20) {
    // Search in conversation titles and message content
    const conversations = await this.db.conversation.findMany({
      where: {
        userId,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          {
            messages: {
              some: {
                content: { contains: query, mode: 'insensitive' },
              },
            },
          },
        ],
      },
      orderBy: { lastMessageAt: 'desc' },
      take: limit,
      include: {
        messages: {
          where: {
            content: { contains: query, mode: 'insensitive' },
          },
          orderBy: { createdAt: 'desc' },
          take: 3,
          select: {
            id: true,
            content: true,
            role: true,
            createdAt: true,
          },
        },
      },
    });

    return conversations.map(conv => ({
      id: conv.id,
      title: conv.title,
      lastMessageAt: conv.lastMessageAt,
      matchedMessages: conv.messages,
    }));
  }

  /**
   * Get conversation statistics
   */
  async getStats(userId: string) {
    const [totalConversations, totalMessages, recentActivity] =
      await Promise.all([
        this.db.conversation.count({ where: { userId } }),
        this.db.message.count({
          where: { conversation: { userId } },
        }),
        this.db.conversation.findMany({
          where: {
            userId,
            lastMessageAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
            },
          },
          select: { id: true },
        }),
      ]);

    const actionStats = await this.db.assistantAction.groupBy({
      by: ['type', 'status'],
      where: { conversation: { userId } },
      _count: true,
    });

    return {
      totalConversations,
      totalMessages,
      conversationsThisWeek: recentActivity.length,
      averageMessagesPerConversation:
        totalConversations > 0
          ? Math.round(totalMessages / totalConversations)
          : 0,
      actionStats: actionStats.reduce(
        (acc, stat) => {
          acc[stat.type] ??= {};
          acc[stat.type]![stat.status] = stat._count;
          return acc;
        },
        {} as Record<string, Record<string, number>>
      ),
    };
  }

  /**
   * Export conversation as markdown
   */
  async exportConversation(
    conversationId: string,
    userId: string
  ): Promise<string> {
    const conversation = await this.db.conversation.findFirst({
      where: { id: conversationId, userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Conversation not found',
      });
    }

    let markdown = `# ${conversation.title ?? 'Conversation'}\n\n`;
    markdown += `Created: ${conversation.createdAt?.toLocaleDateString()}\n`;
    markdown += `Last updated: ${conversation.lastMessageAt?.toLocaleDateString()}\n\n`;
    markdown += '---\n\n';

    for (const message of conversation.messages ?? []) {
      const role = message.role === 'user' ? '**You**' : '**SubPilot AI**';
      const time = message.createdAt.toLocaleTimeString();

      markdown += `${role} (${time}):\n\n`;
      markdown += `${message.content}\n\n`;

      if (message.functionCall) {
        const functionCall = message.functionCall as FunctionCall;
        markdown += `*[Action: ${functionCall.name}]*\n\n`;
      }

      markdown += '---\n\n';
    }

    return markdown;
  }

  /**
   * Generate conversation summary using AI
   */
  async generateSummary(
    conversationId: string,
    userId: string
  ): Promise<string> {
    const conversation = await this.db.conversation.findFirst({
      where: { id: conversationId, userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
        actions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!conversation) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Conversation not found',
      });
    }

    if ((conversation.messages ?? []).length < 4) {
      return 'Conversation too short to summarize';
    }

    // Get key points from the conversation
    const messages = (conversation.messages ?? [])
      .filter((m: any) => m.content.length > 50)
      .slice(0, 10);

    const topics = new Set<string>();
    const actions = new Set<string>();

    // Extract topics and actions
    for (const message of messages) {
      // Simple keyword extraction (could be enhanced with NLP)
      if (message.content.toLowerCase().includes('cancel'))
        topics.add('cancellation');
      if (message.content.toLowerCase().includes('save')) topics.add('savings');
      if (message.content.toLowerCase().includes('analyze'))
        topics.add('analysis');
      if (message.content.toLowerCase().includes('subscription'))
        topics.add('subscriptions');

      if (message.functionCall) {
        const functionCall = message.functionCall as FunctionCall;
        actions.add(functionCall.name);
      }
    }

    // Build summary
    let summary = `Discussed ${Array.from(topics).join(', ')}`;

    if (actions.size > 0) {
      summary += `. Actions taken: ${Array.from(actions).join(', ')}`;
    }

    const actionCount = (conversation.actions ?? []).filter(
      (a) => a.status === 'completed'
    ).length;
    if (actionCount > 0) {
      summary += `. Completed ${actionCount} action${actionCount > 1 ? 's' : ''}`;
    }

    return summary;
  }
}
