import { describe, it, expect, vi, beforeEach } from 'vitest';
import { codeAgentFunction } from '../functions';
import { prisma } from '@/lib/db';
import { getSandbox } from '../utils';
import { pushFiles } from 'packages/adapters/github';

// Mock dependencies
vi.mock('@/lib/db', () => ({
  prisma: {
    project: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    message: {
      create: vi.fn(),
    },
  },
}));

vi.mock('../utils', () => ({
  getSandbox: vi.fn(),
  lastAssistantTextMessageContent: vi.fn(),
}));

vi.mock('packages/adapters/github', () => ({
  pushFiles: vi.fn(),
}));

vi.mock('packages/core/summary/rollingSummary', () => ({
  updateRollingSummary: vi.fn(() => ({
    manifest: { files: {}, routes: [], models: [], env: [] },
    digest: 'mock-digest',
  })),
}));

// Mock Inngest agent kit
vi.mock('@inngest/agent-kit', () => {
  const mockAgent = {
    name: 'mock-agent',
  };
  
  const mockNetwork = {
    run: vi.fn().mockResolvedValue({
      state: {
        data: {
          summary: '<task_summary>Created React component</task_summary>',
          files: {
            'src/components/Hello.tsx': 'export const Hello = () => <div>Hello</div>;',
          },
        },
      },
    }),
  };
  
  return {
    createAgent: vi.fn(() => mockAgent),
    createNetwork: vi.fn(() => mockNetwork),
    createTool: vi.fn(),
    openai: vi.fn(),
  };
});

// Mock Sandbox
vi.mock('@e2b/code-interpreter', () => ({
  Sandbox: {
    create: vi.fn().mockResolvedValue({
      sandboxId: 'test-sandbox-123',
    }),
  },
}));

describe('codeAgentFunction', () => {
  const mockSandbox = {
    sandboxId: 'test-sandbox-123',
    files: {
      write: vi.fn(),
      read: vi.fn(),
    },
    commands: {
      run: vi.fn(),
    },
    getHost: vi.fn(() => 'test-host.e2b.dev'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (getSandbox as any).mockResolvedValue(mockSandbox);
    (prisma.project.findUnique as any).mockResolvedValue({
      id: 'project-123',
      digest: 'existing-digest',
      manifest: {},
      repoUrl: null,
    });
  });

  it('should process frontend generation step', async () => {
    const mockEvent = {
      data: {
        projectId: 'project-123',
        value: 'Create a simple React component',
        stepType: 'frontend',
      },
    };

    const mockStep = {
      run: vi.fn((name, fn) => fn()),
    };

    // Execute the function
    const result = await codeAgentFunction.handler(mockEvent as any, { step: mockStep } as any);

    // Verify the result
    expect(result).toEqual(expect.objectContaining({
      url: 'https://test-host.e2b.dev',
      title: 'Fragment',
      files: {
        'src/components/Hello.tsx': 'export const Hello = () => <div>Hello</div>;',
      },
      summary: '<task_summary>Created React component</task_summary>',
    }));

    // Verify the project was loaded with the right ID
    expect(prisma.project.findUnique).toHaveBeenCalledWith({
      where: { id: 'project-123' },
      select: { id: true, digest: true, manifest: true, repoUrl: true },
    });

    // Verify the message was created
    expect(prisma.message.create).toHaveBeenCalled();
  });

  it('should push to GitHub when repoUrl exists', async () => {
    // Setup project with repoUrl
    (prisma.project.findUnique as any).mockResolvedValue({
      id: 'project-123',
      digest: 'existing-digest',
      manifest: {},
      repoUrl: 'https://github.com/test/repo',
    });

    const mockEvent = {
      data: {
        projectId: 'project-123',
        value: 'Create a simple React component',
      },
    };

    const mockStep = {
      run: vi.fn((name, fn) => fn()),
    };

    // Execute the function
    await codeAgentFunction.handler(mockEvent as any, { step: mockStep } as any);

    // Verify GitHub push was called
    expect(mockStep.run).toHaveBeenCalledWith('push-to-github', expect.any(Function));
    expect(pushFiles).toHaveBeenCalledWith(expect.objectContaining({
      repoUrl: 'https://github.com/test/repo',
      branch: 'main',
      files: expect.any(Object),
      commitMessage: 'chore(builder): auto-sync generated files',
    }));
  });

  it('should handle sandbox creation failure gracefully', async () => {
    // Setup sandbox creation to fail
    (getSandbox as any).mockRejectedValue(new Error('Sandbox creation failed'));

    const mockEvent = {
      data: {
        projectId: 'project-123',
        value: 'Create a component',
      },
    };

    const mockStep = {
      run: vi.fn((name, fn) => {
        if (name === 'get-sandbox-id') {
          throw new Error('Sandbox creation failed');
        }
        return fn();
      }),
    };

    // Execute and expect it to handle the error
    await expect(codeAgentFunction.handler(mockEvent as any, { step: mockStep } as any))
      .rejects.toThrow('Sandbox creation failed');

    // Verify error handling steps were called
    expect(mockStep.run).toHaveBeenCalledWith('get-sandbox-id', expect.any(Function));
  });
});
