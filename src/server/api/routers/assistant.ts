import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '~/server/api/trpc';
import { AssistantService } from '~/server/services/assistant.service';
import { ConversationService } from '~/server/services/conversation.service';
import { TRPCError } from '@trpc/server';

export const assistantRouter = createTRPCRouter({
  /**
   * Start a new conversation
   */
  startConversation: protectedProcedure
    .input(
      z.object({
        initialMessage: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const assistantService = new AssistantService(ctx.db);
      
      try {
        const conversation = await assistantService.startConversation(
          ctx.session.user.id,
          input.initialMessage
        );
        
        return conversation;
      } catch (error) {
        console.error('Error starting conversation:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to start conversation',
        });
      }
    }),

  /**
   * Send a message to the assistant
   */
  sendMessage: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        message: z.string().min(1).max(2000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const assistantService = new AssistantService(ctx.db);
      
      try {
        const response = await assistantService.sendMessage(
          input.conversationId,
          ctx.session.user.id,
          input.message
        );
        
        return response;
      } catch (error) {
        console.error('Error sending message:', error);
        
        if (error instanceof TRPCError) {
          throw error;
        }
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to send message',
        });
      }
    }),

  /**
   * Execute an assistant action
   */
  executeAction: protectedProcedure
    .input(
      z.object({
        actionId: z.string(),
        confirmed: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const assistantService = new AssistantService(ctx.db);
      
      try {
        const result = await assistantService.executeAction(
          input.actionId,
          ctx.session.user.id,
          input.confirmed
        );
        
        return result;
      } catch (error) {
        console.error('Error executing action:', error);
        
        if (error instanceof TRPCError) {
          throw error;
        }
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to execute action',
        });
      }
    }),

  /**
   * Get user's conversations
   */
  getConversations: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const conversationService = new ConversationService(ctx.db);
      
      try {
        return await conversationService.getUserConversations(
          ctx.session.user.id,
          input.limit,
          input.offset
        );
      } catch (error) {
        console.error('Error fetching conversations:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch conversations',
        });
      }
    }),

  /**
   * Get a specific conversation with messages
   */
  getConversation: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const assistantService = new AssistantService(ctx.db);
      
      try {
        return await assistantService.getConversation(
          input.conversationId,
          ctx.session.user.id
        );
      } catch (error) {
        console.error('Error fetching conversation:', error);
        
        if (error instanceof TRPCError) {
          throw error;
        }
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch conversation',
        });
      }
    }),

  /**
   * Delete a conversation
   */
  deleteConversation: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const conversationService = new ConversationService(ctx.db);
      
      try {
        return await conversationService.delete(
          input.conversationId,
          ctx.session.user.id
        );
      } catch (error) {
        console.error('Error deleting conversation:', error);
        
        if (error instanceof TRPCError) {
          throw error;
        }
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete conversation',
        });
      }
    }),

  /**
   * Update conversation title
   */
  updateTitle: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        title: z.string().min(1).max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const conversationService = new ConversationService(ctx.db);
      
      try {
        return await conversationService.updateTitle(
          input.conversationId,
          ctx.session.user.id,
          input.title
        );
      } catch (error) {
        console.error('Error updating title:', error);
        
        if (error instanceof TRPCError) {
          throw error;
        }
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update title',
        });
      }
    }),

  /**
   * Search conversations
   */
  searchConversations: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1).max(100),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const conversationService = new ConversationService(ctx.db);
      
      try {
        return await conversationService.search(
          ctx.session.user.id,
          input.query,
          input.limit
        );
      } catch (error) {
        console.error('Error searching conversations:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to search conversations',
        });
      }
    }),

  /**
   * Get conversation statistics
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const conversationService = new ConversationService(ctx.db);
    
    try {
      return await conversationService.getStats(ctx.session.user.id);
    } catch (error) {
      console.error('Error fetching stats:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch statistics',
      });
    }
  }),

  /**
   * Export conversation
   */
  exportConversation: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        format: z.enum(['markdown', 'json']).default('markdown'),
      })
    )
    .query(async ({ ctx, input }) => {
      const conversationService = new ConversationService(ctx.db);
      
      try {
        if (input.format === 'markdown') {
          const markdown = await conversationService.exportConversation(
            input.conversationId,
            ctx.session.user.id
          );
          
          return { format: 'markdown', content: markdown };
        } else {
          const conversation = await conversationService.getConversation(
            input.conversationId,
            ctx.session.user.id
          );
          
          return { format: 'json', content: JSON.stringify(conversation, null, 2) };
        }
      } catch (error) {
        console.error('Error exporting conversation:', error);
        
        if (error instanceof TRPCError) {
          throw error;
        }
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to export conversation',
        });
      }
    }),

  /**
   * Generate conversation summary
   */
  generateSummary: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const conversationService = new ConversationService(ctx.db);
      
      try {
        const summary = await conversationService.generateSummary(
          input.conversationId,
          ctx.session.user.id
        );
        
        // Update conversation with summary
        await ctx.db.conversation.update({
          where: { id: input.conversationId },
          data: { summary },
        });
        
        return { summary };
      } catch (error) {
        console.error('Error generating summary:', error);
        
        if (error instanceof TRPCError) {
          throw error;
        }
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate summary',
        });
      }
    }),

  /**
   * Clear all conversations
   */
  clearAllConversations: protectedProcedure
    .mutation(async ({ ctx }) => {
      const conversationService = new ConversationService(ctx.db);
      
      try {
        return await conversationService.deleteAll(ctx.session.user.id);
      } catch (error) {
        console.error('Error clearing conversations:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to clear conversations',
        });
      }
    }),
});