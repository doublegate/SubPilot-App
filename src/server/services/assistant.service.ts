import { type PrismaClient } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { openAIClient, type ChatMessage } from '~/server/lib/openai-client';
import { z } from 'zod';

// Assistant action types
export const ASSISTANT_ACTIONS = {
  ANALYZE_SPENDING: 'analyze_spending',
  CANCEL_SUBSCRIPTION: 'cancel_subscription',
  FIND_SAVINGS: 'find_savings',
  GET_SUBSCRIPTION_INFO: 'get_subscription_info',
  SET_REMINDER: 'set_reminder',
  EXPLAIN_CHARGE: 'explain_charge',
  SUGGEST_ALTERNATIVES: 'suggest_alternatives',
  EXPORT_DATA: 'export_data',
} as const;

export type AssistantAction = (typeof ASSISTANT_ACTIONS)[keyof typeof ASSISTANT_ACTIONS];

// Function definitions for OpenAI
const ASSISTANT_FUNCTIONS = [
  {
    name: 'analyzeSpending',
    description: 'Analyze user spending patterns and provide insights',
    parameters: {
      type: 'object',
      properties: {
        timeframe: {
          type: 'string',
          enum: ['month', 'quarter', 'year', 'all'],
          description: 'Time period to analyze',
        },
        category: {
          type: 'string',
          description: 'Optional specific category to focus on',
        },
      },
      required: ['timeframe'],
    },
  },
  {
    name: 'cancelSubscription',
    description: 'Initiate cancellation process for a subscription',
    parameters: {
      type: 'object',
      properties: {
        subscriptionId: {
          type: 'string',
          description: 'ID of the subscription to cancel',
        },
        reason: {
          type: 'string',
          description: 'Reason for cancellation',
        },
      },
      required: ['subscriptionId'],
    },
  },
  {
    name: 'findSavings',
    description: 'Find opportunities to save money on subscriptions',
    parameters: {
      type: 'object',
      properties: {
        threshold: {
          type: 'number',
          description: 'Minimum monthly savings amount to consider',
        },
      },
    },
  },
  {
    name: 'getSubscriptionInfo',
    description: 'Get detailed information about a specific subscription',
    parameters: {
      type: 'object',
      properties: {
        subscriptionId: {
          type: 'string',
          description: 'ID of the subscription',
        },
      },
      required: ['subscriptionId'],
    },
  },
  {
    name: 'setReminder',
    description: 'Set a reminder for a subscription-related task',
    parameters: {
      type: 'object',
      properties: {
        subscriptionId: {
          type: 'string',
          description: 'ID of the subscription',
        },
        reminderType: {
          type: 'string',
          enum: ['cancel', 'review', 'negotiate', 'custom'],
          description: 'Type of reminder',
        },
        date: {
          type: 'string',
          description: 'When to remind (ISO date)',
        },
        message: {
          type: 'string',
          description: 'Custom reminder message',
        },
      },
      required: ['reminderType', 'date'],
    },
  },
  {
    name: 'explainCharge',
    description: 'Explain what a specific charge or transaction is for',
    parameters: {
      type: 'object',
      properties: {
        transactionId: {
          type: 'string',
          description: 'ID of the transaction to explain',
        },
      },
      required: ['transactionId'],
    },
  },
  {
    name: 'suggestAlternatives',
    description: 'Suggest cheaper alternatives to a subscription',
    parameters: {
      type: 'object',
      properties: {
        subscriptionId: {
          type: 'string',
          description: 'ID of the subscription to find alternatives for',
        },
      },
      required: ['subscriptionId'],
    },
  },
];

export class AssistantService {
  constructor(private db: PrismaClient) {}

  /**
   * Start a new conversation
   */
  async startConversation(userId: string, initialMessage?: string) {
    const conversation = await this.db.conversation.create({
      data: {
        userId,
        title: initialMessage ? this.generateTitle(initialMessage) : 'New Chat',
        messageCount: 0,
      },
    });

    if (initialMessage) {
      await this.sendMessage(conversation.id, userId, initialMessage);
    }

    return conversation;
  }

  /**
   * Send a message in a conversation
   */
  async sendMessage(conversationId: string, userId: string, content: string) {
    // Verify conversation belongs to user
    const conversation = await this.db.conversation.findFirst({
      where: { id: conversationId, userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 10, // Last 10 messages for context
        },
      },
    });

    if (!conversation) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Conversation not found',
      });
    }

    // Create user message
    const userMessage = await this.db.message.create({
      data: {
        conversationId,
        role: 'user',
        content,
      },
    });

    // Build conversation context
    const context = await this.buildContext(userId);
    const messages = this.buildMessageHistory(conversation.messages, content);

    // Get AI response
    const systemPrompt = this.buildSystemPrompt(context);
    const response = await openAIClient.chatCompletion(messages, userId, {
      systemPrompt,
      functions: ASSISTANT_FUNCTIONS,
    });

    // Handle function calls
    let actionId: string | undefined;
    if (response.functionCall) {
      const action = await this.createAction(
        conversationId,
        response.functionCall.name,
        response.functionCall.arguments
      );
      actionId = action.id;

      // Generate a user-friendly message about the action
      response.content = this.generateActionMessage(
        response.functionCall.name,
        response.functionCall.arguments,
        response.content
      );
    }

    // Create assistant message
    const assistantMessage = await this.db.message.create({
      data: {
        conversationId,
        role: 'assistant',
        content: response.content,
        metadata: {
          model: 'gpt-4o',
          usage: response.usage,
          actionId,
        },
        functionCall: response.functionCall ? {
          name: response.functionCall.name,
          arguments: response.functionCall.arguments as any,
        } : undefined,
      },
    });

    // Update conversation
    await this.db.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: new Date(),
        messageCount: { increment: 2 },
        title: conversation.messageCount === 0 
          ? this.generateTitle(content) 
          : conversation.title,
      },
    });

    return {
      message: assistantMessage,
      action: actionId ? await this.db.assistantAction.findUnique({
        where: { id: actionId },
      }) : null,
    };
  }

  /**
   * Execute an assistant action
   */
  async executeAction(actionId: string, userId: string, confirmed = false) {
    const action = await this.db.assistantAction.findFirst({
      where: {
        id: actionId,
        conversation: { userId },
      },
    });

    if (!action) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Action not found',
      });
    }

    if (action.status !== 'pending') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Action already processed',
      });
    }

    if (action.requiresConfirmation && !confirmed) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Action requires confirmation',
      });
    }

    // Update action status
    await this.db.assistantAction.update({
      where: { id: actionId },
      data: {
        status: 'executing',
        userConfirmed: confirmed,
        userConfirmedAt: confirmed ? new Date() : null,
        executedAt: new Date(),
      },
    });

    try {
      // Execute the action based on type
      const result = await this.executeActionByType(
        action.type as AssistantAction,
        action.parameters as Record<string, unknown>,
        userId
      );

      // Update action with result
      await this.db.assistantAction.update({
        where: { id: actionId },
        data: {
          status: 'completed',
          completedAt: new Date(),
          result: result as any,
        },
      });

      return result;
    } catch (error) {
      // Update action with error
      await this.db.assistantAction.update({
        where: { id: actionId },
        data: {
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      throw error;
    }
  }

  /**
   * Get conversation history
   */
  async getConversations(userId: string, limit = 20) {
    return this.db.conversation.findMany({
      where: { userId },
      orderBy: { lastMessageAt: 'desc' },
      take: limit,
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: {
          select: { messages: true },
        },
      },
    });
  }

  /**
   * Get conversation with messages
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
   * Delete a conversation
   */
  async deleteConversation(conversationId: string, userId: string) {
    const conversation = await this.db.conversation.findFirst({
      where: { id: conversationId, userId },
    });

    if (!conversation) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Conversation not found',
      });
    }

    await this.db.conversation.delete({
      where: { id: conversationId },
    });

    return { success: true };
  }

  /**
   * Build context for the assistant
   */
  private async buildContext(userId: string) {
    // Get user's subscriptions
    const subscriptions = await this.db.subscription.findMany({
      where: { userId, isActive: true },
      include: {
        transactions: {
          orderBy: { date: 'desc' },
          take: 3,
        },
      },
    });

    // Get spending summary
    const totalSpending = subscriptions.reduce(
      (sum, sub) => sum + Number(sub.amount),
      0
    );

    // Get recent notifications
    const notifications = await this.db.notification.findMany({
      where: { userId, read: false },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    return {
      subscriptionCount: subscriptions.length,
      totalMonthlySpending: totalSpending,
      subscriptions: subscriptions.map(sub => ({
        id: sub.id,
        name: sub.name,
        amount: Number(sub.amount),
        frequency: sub.frequency,
        category: sub.category,
        nextBilling: sub.nextBilling,
        status: sub.status,
      })),
      recentNotifications: notifications.map(n => ({
        type: n.type,
        title: n.title,
        message: n.message,
      })),
    };
  }

  /**
   * Build system prompt for the assistant
   */
  private buildSystemPrompt(context: any) {
    return `You are SubPilot AI, a helpful subscription management assistant. You help users manage, analyze, and optimize their recurring subscriptions.

Current user context:
- Active subscriptions: ${context.subscriptionCount}
- Monthly spending: $${context.totalMonthlySpending.toFixed(2)}
- Recent notifications: ${context.recentNotifications.length}

Available subscriptions:
${context.subscriptions.map((sub: any) => `- ${sub.name}: $${sub.amount}/${sub.frequency} (${sub.category})`).join('\n')}

Your capabilities:
1. Analyze spending patterns and provide insights
2. Help cancel unwanted subscriptions
3. Find opportunities to save money
4. Explain charges and transactions
5. Suggest cheaper alternatives
6. Set reminders for subscription management
7. Answer questions about subscriptions

Guidelines:
- Be helpful and conversational
- Always ask for confirmation before taking actions
- Provide specific, actionable advice
- Be honest about limitations
- Respect user privacy
- Focus on helping users save money and stay organized

When users ask about specific subscriptions, use the subscription IDs provided in the context.
If you need to take an action, use the appropriate function.`;
  }

  /**
   * Build message history for the API
   */
  private buildMessageHistory(
    messages: Array<{ role: string; content: string }>,
    newMessage: string
  ): ChatMessage[] {
    const history: ChatMessage[] = messages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    history.push({ role: 'user', content: newMessage });

    return history;
  }

  /**
   * Generate a title for the conversation
   */
  private generateTitle(message: string): string {
    // Simple title generation - could be enhanced with AI
    const words = message.split(' ').slice(0, 5);
    return words.join(' ') + (words.length < message.split(' ').length ? '...' : '');
  }

  /**
   * Create an action record
   */
  private async createAction(
    conversationId: string,
    type: string,
    parameters: Record<string, unknown>
  ) {
    // Determine if confirmation is required
    const requiresConfirmation = ['cancelSubscription', 'setReminder'].includes(type);

    return this.db.assistantAction.create({
      data: {
        conversationId,
        type,
        parameters: parameters as any,
        requiresConfirmation,
        targetResource: parameters.subscriptionId as string | undefined,
      },
    });
  }

  /**
   * Generate user-friendly message for actions
   */
  private generateActionMessage(
    functionName: string,
    args: Record<string, unknown>,
    aiResponse: string
  ): string {
    let actionMessage = '';

    switch (functionName) {
      case 'cancelSubscription':
        actionMessage = `I can help you cancel this subscription. Would you like me to proceed with the cancellation?`;
        break;
      case 'analyzeSpending':
        actionMessage = `I'll analyze your spending patterns for you.`;
        break;
      case 'findSavings':
        actionMessage = `Let me find some ways you can save money on your subscriptions.`;
        break;
      case 'setReminder':
        actionMessage = `I'll set a reminder for you.`;
        break;
      default:
        actionMessage = `I'll help you with that.`;
    }

    return aiResponse || actionMessage;
  }

  /**
   * Execute specific action types
   */
  private async executeActionByType(
    type: AssistantAction,
    parameters: Record<string, unknown>,
    userId: string
  ): Promise<any> {
    switch (type) {
      case ASSISTANT_ACTIONS.ANALYZE_SPENDING:
        return this.analyzeSpending(userId, parameters);
      
      case ASSISTANT_ACTIONS.CANCEL_SUBSCRIPTION:
        return this.initiateCancellation(
          parameters.subscriptionId as string,
          userId,
          parameters.reason as string
        );
      
      case ASSISTANT_ACTIONS.FIND_SAVINGS:
        return this.findSavingOpportunities(
          userId,
          parameters.threshold as number
        );
      
      case ASSISTANT_ACTIONS.GET_SUBSCRIPTION_INFO:
        return this.getSubscriptionDetails(
          parameters.subscriptionId as string,
          userId
        );
      
      case ASSISTANT_ACTIONS.SET_REMINDER:
        return this.createReminder(userId, parameters);
      
      case ASSISTANT_ACTIONS.EXPLAIN_CHARGE:
        return this.explainTransaction(
          parameters.transactionId as string,
          userId
        );
      
      case ASSISTANT_ACTIONS.SUGGEST_ALTERNATIVES:
        return this.suggestAlternatives(
          parameters.subscriptionId as string,
          userId
        );
      
      default:
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Unknown action type: ${type}`,
        });
    }
  }

  /**
   * Analyze user spending
   */
  private async analyzeSpending(
    userId: string,
    params: Record<string, unknown>
  ) {
    const timeframe = params.timeframe as string;
    const category = params.category as string | undefined;

    // Get date range
    const now = new Date();
    let startDate = new Date();
    
    switch (timeframe) {
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'all':
        startDate = new Date(0);
        break;
    }

    // Get subscriptions
    const subscriptions = await this.db.subscription.findMany({
      where: {
        userId,
        createdAt: { gte: startDate },
        ...(category ? { category } : {}),
      },
      include: {
        transactions: {
          where: { date: { gte: startDate } },
        },
      },
    });

    // Calculate metrics
    const totalSpending = subscriptions.reduce(
      (sum, sub) => sum + Number(sub.amount),
      0
    );
    const avgSpending = totalSpending / subscriptions.length || 0;
    
    const byCategory = subscriptions.reduce((acc, sub) => {
      const cat = sub.category ?? 'other';
      if (!acc[cat]) acc[cat] = { count: 0, total: 0 };
      acc[cat]!.count++;
      acc[cat]!.total += Number(sub.amount);
      return acc;
    }, {} as Record<string, { count: number; total: number }>);

    return {
      timeframe,
      totalSpending,
      averagePerSubscription: avgSpending,
      subscriptionCount: subscriptions.length,
      byCategory,
      topExpenses: subscriptions
        .sort((a, b) => Number(b.amount) - Number(a.amount))
        .slice(0, 5)
        .map(s => ({ name: s.name, amount: Number(s.amount) })),
    };
  }

  /**
   * Initiate subscription cancellation
   */
  private async initiateCancellation(
    subscriptionId: string,
    userId: string,
    reason?: string
  ) {
    const subscription = await this.db.subscription.findFirst({
      where: { id: subscriptionId, userId },
    });

    if (!subscription) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Subscription not found',
      });
    }

    // Create cancellation request
    const request = await this.db.cancellationRequest.create({
      data: {
        userId,
        subscriptionId,
        method: 'manual',
        userNotes: reason,
      },
    });

    return {
      requestId: request.id,
      subscription: {
        name: subscription.name,
        amount: Number(subscription.amount),
      },
      status: 'initiated',
      message: 'Cancellation request created. You can track its progress in the cancellations section.',
    };
  }

  /**
   * Find saving opportunities
   */
  private async findSavingOpportunities(
    userId: string,
    threshold = 0
  ) {
    const subscriptions = await this.db.subscription.findMany({
      where: { userId, isActive: true },
      include: {
        transactions: {
          orderBy: { date: 'desc' },
          take: 6,
        },
      },
    });

    const opportunities = [];

    for (const sub of subscriptions) {
      const amount = Number(sub.amount);
      
      // Unused subscriptions (no recent transactions)
      const lastTransaction = sub.transactions[0];
      const daysSinceLastUse = lastTransaction
        ? Math.floor((Date.now() - lastTransaction.date.getTime()) / (1000 * 60 * 60 * 24))
        : 999;
      
      if (daysSinceLastUse > 60 && amount >= threshold) {
        opportunities.push({
          type: 'unused',
          subscription: sub.name,
          amount,
          savingAmount: amount,
          reason: `Not used in ${daysSinceLastUse} days`,
          confidence: 0.9,
        });
      }

      // Duplicate services
      const similar = subscriptions.filter(
        s => s.id !== sub.id && 
        s.category === sub.category && 
        s.isActive
      );
      
      if (similar.length > 0 && amount >= threshold) {
        opportunities.push({
          type: 'duplicate',
          subscription: sub.name,
          amount,
          savingAmount: amount,
          reason: `Similar to ${similar[0]!.name}`,
          confidence: 0.7,
        });
      }

      // High cost relative to category average
      if (sub.category) {
        const categoryAvg = subscriptions
          .filter(s => s.category === sub.category)
          .reduce((sum, s) => sum + Number(s.amount), 0) / 
          subscriptions.filter(s => s.category === sub.category).length;
        
        if (amount > categoryAvg * 1.5 && amount >= threshold) {
          opportunities.push({
            type: 'expensive',
            subscription: sub.name,
            amount,
            savingAmount: amount - categoryAvg,
            reason: `${Math.round((amount / categoryAvg - 1) * 100)}% above category average`,
            confidence: 0.6,
          });
        }
      }
    }

    // Sort by saving amount
    opportunities.sort((a, b) => b.savingAmount - a.savingAmount);

    const totalSavings = opportunities.reduce((sum, opp) => sum + opp.savingAmount, 0);

    return {
      opportunities: opportunities.slice(0, 10),
      totalPotentialSavings: totalSavings,
      count: opportunities.length,
    };
  }

  /**
   * Get detailed subscription information
   */
  private async getSubscriptionDetails(
    subscriptionId: string,
    userId: string
  ) {
    const subscription = await this.db.subscription.findFirst({
      where: { id: subscriptionId, userId },
      include: {
        transactions: {
          orderBy: { date: 'desc' },
          take: 12,
        },
        history: {
          orderBy: { billingDate: 'desc' },
          take: 12,
        },
        cancellationRequests: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!subscription) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Subscription not found',
      });
    }

    // Calculate usage statistics
    const usageStats = {
      totalSpent: subscription.transactions.reduce(
        (sum, t) => sum + Number(t.amount),
        0
      ),
      averageMonthly: Number(subscription.amount),
      transactionCount: subscription.transactions.length,
      lastUsed: subscription.transactions[0]?.date,
      daysActive: Math.floor(
        (Date.now() - subscription.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      ),
    };

    return {
      subscription: {
        id: subscription.id,
        name: subscription.name,
        description: subscription.description,
        amount: Number(subscription.amount),
        frequency: subscription.frequency,
        category: subscription.category,
        status: subscription.status,
        nextBilling: subscription.nextBilling,
        createdAt: subscription.createdAt,
      },
      usage: usageStats,
      recentTransactions: subscription.transactions.slice(0, 5),
      billingHistory: subscription.history,
      hasCancellationRequest: subscription.cancellationRequests.length > 0,
    };
  }

  /**
   * Create a reminder
   */
  private async createReminder(
    userId: string,
    params: Record<string, unknown>
  ) {
    const reminderType = params.reminderType as string;
    const date = new Date(params.date as string);
    const message = params.message as string | undefined;
    const subscriptionId = params.subscriptionId as string | undefined;

    // Create notification
    const notification = await this.db.notification.create({
      data: {
        userId,
        subscriptionId,
        type: `reminder_${reminderType}`,
        title: `Reminder: ${reminderType}`,
        message: message ?? `It's time to ${reminderType} your subscription`,
        scheduledFor: date,
      },
    });

    return {
      reminderId: notification.id,
      scheduledFor: date,
      type: reminderType,
      message: notification.message,
    };
  }

  /**
   * Explain a transaction
   */
  private async explainTransaction(
    transactionId: string,
    userId: string
  ) {
    const transaction = await this.db.transaction.findFirst({
      where: { id: transactionId, userId },
      include: {
        subscription: true,
        bankAccount: true,
      },
    });

    if (!transaction) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Transaction not found',
      });
    }

    return {
      transaction: {
        id: transaction.id,
        amount: Number(transaction.amount),
        date: transaction.date,
        description: transaction.description,
        merchantName: transaction.merchantName,
        category: transaction.category,
      },
      subscription: transaction.subscription ? {
        name: transaction.subscription.name,
        frequency: transaction.subscription.frequency,
        status: transaction.subscription.status,
      } : null,
      account: {
        name: transaction.bankAccount.name,
        type: transaction.bankAccount.type,
      },
      explanation: transaction.subscription
        ? `This is a recurring charge for ${transaction.subscription.name}, billed ${transaction.subscription.frequency}.`
        : `This appears to be a one-time charge from ${transaction.merchantName ?? 'Unknown merchant'}.`,
    };
  }

  /**
   * Suggest alternatives to a subscription
   */
  private async suggestAlternatives(
    subscriptionId: string,
    userId: string
  ) {
    const subscription = await this.db.subscription.findFirst({
      where: { id: subscriptionId, userId },
    });

    if (!subscription) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Subscription not found',
      });
    }

    // This would ideally use a database of alternatives
    // For now, we'll provide category-based suggestions
    const alternatives = this.getAlternativesByCategory(
      subscription.category ?? 'other',
      subscription.name,
      Number(subscription.amount)
    );

    return {
      currentSubscription: {
        name: subscription.name,
        amount: Number(subscription.amount),
        category: subscription.category,
      },
      alternatives,
      potentialSavings: alternatives.length > 0
        ? Number(subscription.amount) - alternatives[0]!.price
        : 0,
    };
  }

  /**
   * Get alternatives by category (mock data - would be database-driven)
   */
  private getAlternativesByCategory(
    category: string,
    currentService: string,
    currentPrice: number
  ) {
    const alternatives: Array<{
      name: string;
      price: number;
      features: string[];
      pros: string[];
      cons: string[];
    }> = [];

    // Mock alternatives based on category
    switch (category) {
      case 'streaming':
        if (currentService.toLowerCase().includes('netflix')) {
          alternatives.push(
            {
              name: 'Hulu (Ad-supported)',
              price: 7.99,
              features: ['Thousands of shows', 'Next-day TV', 'Original content'],
              pros: ['Cheaper', 'Good TV selection'],
              cons: ['Has ads', 'Smaller movie library'],
            },
            {
              name: 'Peacock Premium',
              price: 5.99,
              features: ['NBC content', 'Live sports', 'Movies'],
              pros: ['Very affordable', 'Live TV included'],
              cons: ['Limited content', 'Has ads'],
            }
          );
        }
        break;
      
      case 'music':
        if (currentService.toLowerCase().includes('spotify')) {
          alternatives.push(
            {
              name: 'YouTube Music',
              price: 9.99,
              features: ['Music videos', 'Offline play', 'No ads'],
              pros: ['Includes YouTube Premium', 'Great discovery'],
              cons: ['Less curated playlists'],
            },
            {
              name: 'Apple Music',
              price: 10.99,
              features: ['Lossless audio', 'Spatial audio', 'Large library'],
              pros: ['High quality audio', 'Good integration with Apple'],
              cons: ['No free tier'],
            }
          );
        }
        break;
      
      case 'software':
        alternatives.push({
          name: 'Open Source Alternative',
          price: 0,
          features: ['Community support', 'Free forever', 'Customizable'],
          pros: ['Free', 'No vendor lock-in'],
          cons: ['Less support', 'May lack features'],
        });
        break;
    }

    // Filter alternatives cheaper than current
    return alternatives
      .filter(alt => alt.price < currentPrice)
      .sort((a, b) => a.price - b.price);
  }
}