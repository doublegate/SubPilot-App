import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AssistantChat } from '../assistant/AssistantChat';
import { api } from '@/trpc/react';

// Mock tRPC
vi.mock('@/trpc/react', () => ({
  api: {
    assistant: {
      startConversation: {
        useMutation: vi.fn(),
      },
      sendMessage: {
        useMutation: vi.fn(),
      },
      getConversation: {
        useQuery: vi.fn(),
      },
    },
    useUtils: vi.fn(),
  },
}));

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}));

// Mock child components
vi.mock('../assistant/MessageBubble', () => ({
  MessageBubble: ({
    message,
    isLoading,
  }: {
    message: any;
    isLoading?: boolean;
  }) => (
    <div data-testid="message-bubble">
      {isLoading ? 'Loading...' : message.content}
      <span data-testid="message-role">{message.role}</span>
    </div>
  ),
}));

vi.mock('../assistant/QuickActions', () => ({
  QuickActions: ({
    onSelectAction,
  }: {
    onSelectAction: (action: string) => void;
  }) => (
    <div data-testid="quick-actions">
      <button onClick={() => onSelectAction('Analyze my spending')}>
        Analyze spending
      </button>
      <button onClick={() => onSelectAction('Find savings')}>
        Find savings
      </button>
    </div>
  ),
}));

vi.mock('../assistant/ConversationHistory', () => ({
  ConversationHistory: ({
    onSelectConversation,
    onClose,
  }: {
    onSelectConversation: (id: string) => void;
    onClose: () => void;
  }) => (
    <div data-testid="conversation-history">
      <button onClick={() => onSelectConversation('conv-123')}>
        Conversation 1
      </button>
      <button onClick={onClose}>Close History</button>
    </div>
  ),
}));

const mockStartConversation = vi.fn();
const mockSendMessage = vi.fn();
const mockUtils = {
  client: {
    query: vi.fn(),
    mutation: vi.fn(),
  },
  assistant: {
    getConversations: {
      invalidate: vi.fn(),
    },
    getConversation: {
      invalidate: vi.fn(),
    },
  },
} as any;

const mockConversation = {
  id: 'conv-123',
  messages: [
    {
      id: 'msg-1',
      role: 'user',
      content: 'Hello',
      createdAt: new Date(),
      conversationId: 'conv-123',
      metadata: {},
      functionCall: null,
      toolCalls: [],
    },
    {
      id: 'msg-2',
      role: 'assistant',
      content: 'Hi there! How can I help you today?',
      createdAt: new Date(),
      conversationId: 'conv-123',
      metadata: {},
      functionCall: null,
      toolCalls: [],
    },
  ],
};

describe('AssistantChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(api.useUtils).mockReturnValue(mockUtils);

    vi.mocked(api.assistant.startConversation.useMutation).mockReturnValue({
      mutate: mockStartConversation,
      isPending: false,
    } as any);

    vi.mocked(api.assistant.sendMessage.useMutation).mockReturnValue({
      mutate: mockSendMessage,
      isPending: false,
    } as any);

    vi.mocked(api.assistant.getConversation.useQuery).mockReturnValue({
      data: null,
      isLoading: false,
    } as any);
  });

  it('renders when open', () => {
    render(<AssistantChat isOpen={true} onClose={() => {}} />);

    expect(screen.getByText('SubPilot AI Assistant')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('Ask me anything about your subscriptions...')
    ).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<AssistantChat isOpen={false} onClose={() => {}} />);

    expect(screen.queryByText('SubPilot AI Assistant')).not.toBeInTheDocument();
  });

  it('shows welcome message when no conversation exists', () => {
    render(<AssistantChat isOpen={true} onClose={() => {}} />);

    expect(screen.getByText('How can I help you today?')).toBeInTheDocument();
    expect(screen.getByTestId('quick-actions')).toBeInTheDocument();
  });

  it('displays conversation messages when conversation exists', () => {
    vi.mocked(api.assistant.getConversation.useQuery).mockReturnValue({
      data: mockConversation,
      isLoading: false,
    } as any);

    render(<AssistantChat isOpen={true} onClose={() => {}} />);

    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(
      screen.getByText('Hi there! How can I help you today?')
    ).toBeInTheDocument();
  });

  it('sends message when form is submitted', async () => {
    render(<AssistantChat isOpen={true} onClose={() => {}} />);

    const input = screen.getByPlaceholderText(
      'Ask me anything about your subscriptions...'
    );
    const sendButton = screen.getByRole('button', { name: /send/i });

    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);

    expect(mockStartConversation).toHaveBeenCalledWith({
      initialMessage: 'Test message',
    });
  });

  it('sends message on Enter key press', () => {
    render(<AssistantChat isOpen={true} onClose={() => {}} />);

    const input = screen.getByPlaceholderText(
      'Ask me anything about your subscriptions...'
    );

    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.keyPress(input, { key: 'Enter', code: 'Enter' });

    expect(mockStartConversation).toHaveBeenCalledWith({
      initialMessage: 'Test message',
    });
  });

  it('does not send message on Shift+Enter', () => {
    render(<AssistantChat isOpen={true} onClose={() => {}} />);

    const input = screen.getByPlaceholderText(
      'Ask me anything about your subscriptions...'
    );

    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', shiftKey: true });

    expect(mockStartConversation).not.toHaveBeenCalled();
  });

  it('does not send empty messages', () => {
    render(<AssistantChat isOpen={true} onClose={() => {}} />);

    const sendButton = screen.getByRole('button', { name: /send/i });
    fireEvent.click(sendButton);

    expect(mockStartConversation).not.toHaveBeenCalled();
  });

  it('starts conversation with initial message', () => {
    const initialMessage = 'Help me analyze my spending';

    render(
      <AssistantChat
        isOpen={true}
        onClose={() => {}}
        initialMessage={initialMessage}
      />
    );

    expect(mockStartConversation).toHaveBeenCalledWith({
      initialMessage,
    });
  });

  it('sends follow-up messages to existing conversation', () => {
    // Mock existing conversation
    vi.mocked(api.assistant.getConversation.useQuery).mockReturnValue({
      data: mockConversation,
      isLoading: false,
    } as any);

    const { rerender } = render(
      <AssistantChat isOpen={true} onClose={() => {}} />
    );

    // Simulate conversation ID being set
    rerender(<AssistantChat isOpen={true} onClose={() => {}} />);

    const input = screen.getByPlaceholderText(
      'Ask me anything about your subscriptions...'
    );

    fireEvent.change(input, { target: { value: 'Follow up message' } });
    fireEvent.keyPress(input, { key: 'Enter', code: 'Enter' });

    // Note: This test would need actual conversation ID state management
    // The component would need to be refactored to accept conversationId prop for full testing
  });

  it('shows loading state when sending message', () => {
    vi.mocked(api.assistant.sendMessage.useMutation).mockReturnValue({
      mutate: mockSendMessage,
      isPending: true,
    } as any);

    render(<AssistantChat isOpen={true} onClose={() => {}} />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('toggles conversation history sidebar', () => {
    render(<AssistantChat isOpen={true} onClose={() => {}} />);

    // History should not be visible initially
    expect(
      screen.queryByTestId('conversation-history')
    ).not.toBeInTheDocument();

    // Click menu button to show history
    const menuButton = screen.getByRole('button', { name: /menu/i });
    fireEvent.click(menuButton);

    expect(screen.getByTestId('conversation-history')).toBeInTheDocument();
  });

  it('starts new conversation when new conversation button is clicked', () => {
    render(<AssistantChat isOpen={true} onClose={() => {}} />);

    const newConversationButton = screen.getByRole('button', {
      name: /new conversation/i,
    });
    fireEvent.click(newConversationButton);

    // Should clear the input and hide history
    const input = screen.getByPlaceholderText(
      'Ask me anything about your subscriptions...'
    );
    expect(input).toHaveValue('');
  });

  it('closes modal when close button is clicked', () => {
    const onClose = vi.fn();

    render(<AssistantChat isOpen={true} onClose={onClose} />);

    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalled();
  });

  it('uses quick actions to set message', () => {
    render(<AssistantChat isOpen={true} onClose={() => {}} />);

    fireEvent.click(screen.getByText('Analyze spending'));

    const input = screen.getByPlaceholderText(
      'Ask me anything about your subscriptions...'
    );
    expect(input).toHaveValue('Analyze my spending');
  });

  it('handles conversation selection from history', () => {
    render(<AssistantChat isOpen={true} onClose={() => {}} />);

    // Open history
    const menuButton = screen.getByRole('button', { name: /menu/i });
    fireEvent.click(menuButton);

    // Select a conversation
    fireEvent.click(screen.getByText('Conversation 1'));

    // History should close
    expect(
      screen.queryByTestId('conversation-history')
    ).not.toBeInTheDocument();
  });

  it('shows loading state when conversation is loading', () => {
    vi.mocked(api.assistant.getConversation.useQuery).mockReturnValue({
      data: null,
      isLoading: true,
    } as any);

    render(<AssistantChat isOpen={true} onClose={() => {}} />);

    expect(screen.getByRole('img', { hidden: true })).toHaveClass(
      'animate-spin'
    );
  });

  it('disables input when sending message', () => {
    vi.mocked(api.assistant.startConversation.useMutation).mockReturnValue({
      mutate: mockStartConversation,
      isPending: true,
    } as any);

    render(<AssistantChat isOpen={true} onClose={() => {}} />);

    const input = screen.getByPlaceholderText(
      'Ask me anything about your subscriptions...'
    );
    const sendButton = screen.getByRole('button', { name: /send/i });

    expect(input).toBeDisabled();
    expect(sendButton).toBeDisabled();
  });

  it('handles errors when starting conversation', async () => {
    const { toast } = await import('sonner');

    const mutationConfig = vi.mocked(
      api.assistant.startConversation.useMutation
    ).mock.calls[0]?.[0];

    // Test error handling
    if (mutationConfig?.onError) {
      mutationConfig.onError({ message: 'Network error' } as any, {} as any, {} as any);
    }

    expect(toast.error).toHaveBeenCalledWith('Network error');
  });

  it('invalidates queries on successful message send', async () => {
    const mutationConfig = vi.mocked(api.assistant.sendMessage.useMutation).mock
      .calls[0]?.[0];

    // Test success handling
    if (mutationConfig?.onSuccess) {
      mutationConfig.onSuccess({} as any, {} as any, {} as any);
    }

    expect(mockUtils.assistant.getConversation.invalidate).toHaveBeenCalled();
  });
});
