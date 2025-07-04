import { EventEmitter } from 'events';
import { getJobQueue } from './job-queue';
import { Parser } from 'expr-eval';

// Workflow interfaces
export interface WorkflowStep {
  id: string;
  name: string;
  type: 'task' | 'condition' | 'parallel' | 'wait';
  config: any;
  nextSteps?: string[];
  onSuccess?: string[];
  onFailure?: string[];
  timeout?: number;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  version: string;
  steps: WorkflowStep[];
  startStep: string;
  variables?: Record<string, any>;
}

export interface WorkflowInstance {
  id: string;
  definitionId: string;
  userId: string;
  status: 'running' | 'completed' | 'failed' | 'paused' | 'cancelled';
  currentStep?: string;
  variables: Record<string, any>;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  history: WorkflowStepExecution[];
}

export interface WorkflowStepExecution {
  stepId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt: Date;
  completedAt?: Date;
  input?: any;
  output?: any;
  error?: string;
  retryCount: number;
}

// Simple in-memory workflow engine
class SimpleWorkflowEngine extends EventEmitter {
  private definitions = new Map<string, WorkflowDefinition>();
  private instances = new Map<string, WorkflowInstance>();
  private stepProcessors = new Map<
    string,
    (step: WorkflowStep, instance: WorkflowInstance) => Promise<any>
  >();
  private jobQueue = getJobQueue();

  constructor() {
    super();
    this.setMaxListeners(1000);
    this.setupDefaultStepProcessors();
  }

  /**
   * Register a workflow definition
   */
  registerWorkflow(definition: WorkflowDefinition): void {
    this.definitions.set(definition.id, definition);
    console.log(`[WorkflowEngine] Registered workflow: ${definition.id}`);
  }

  /**
   * Start a workflow instance
   */
  async startWorkflow(
    definitionId: string,
    userId: string,
    variables: Record<string, any> = {}
  ): Promise<string> {
    const definition = this.definitions.get(definitionId);

    if (!definition) {
      throw new Error(`Workflow definition not found: ${definitionId}`);
    }

    const instanceId = `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const instance: WorkflowInstance = {
      id: instanceId,
      definitionId,
      userId,
      status: 'running',
      currentStep: definition.startStep,
      variables: { ...definition.variables, ...variables },
      startedAt: new Date(),
      history: [],
    };

    this.instances.set(instanceId, instance);

    console.log(`[WorkflowEngine] Started workflow instance: ${instanceId}`);

    // Start executing the workflow
    setImmediate(() => this.executeWorkflow(instanceId));

    this.emit('workflow.started', { instanceId, definitionId, userId });

    return instanceId;
  }

  /**
   * Get workflow instance status
   */
  getWorkflowStatus(instanceId: string): WorkflowInstance | null {
    return this.instances.get(instanceId) || null;
  }

  /**
   * Cancel a workflow instance
   */
  async cancelWorkflow(instanceId: string): Promise<boolean> {
    const instance = this.instances.get(instanceId);

    if (!instance || instance.status !== 'running') {
      return false;
    }

    instance.status = 'cancelled';
    instance.completedAt = new Date();

    console.log(`[WorkflowEngine] Cancelled workflow instance: ${instanceId}`);

    this.emit('workflow.cancelled', { instanceId, userId: instance.userId });

    return true;
  }

  /**
   * Execute workflow steps
   */
  private async executeWorkflow(instanceId: string): Promise<void> {
    const instance = this.instances.get(instanceId);

    if (!instance || instance.status !== 'running') {
      return;
    }

    const definition = this.definitions.get(instance.definitionId);

    if (!definition) {
      this.failWorkflow(instance, 'Workflow definition not found');
      return;
    }

    try {
      while (instance.status === 'running' && instance.currentStep) {
        const step = definition.steps.find(s => s.id === instance.currentStep);

        if (!step) {
          this.failWorkflow(
            instance,
            `Step not found: ${instance.currentStep}`
          );
          return;
        }

        const stepExecution = await this.executeStep(step, instance);
        instance.history.push(stepExecution);

        if (stepExecution.status === 'failed') {
          // Handle step failure
          const nextSteps = step.onFailure || [];
          if (nextSteps.length === 0) {
            this.failWorkflow(
              instance,
              `Step failed: ${step.id} - ${stepExecution.error}`
            );
            return;
          }
          instance.currentStep = nextSteps[0]; // Take first failure path
        } else if (stepExecution.status === 'completed') {
          // Handle step success
          const nextSteps = step.onSuccess || step.nextSteps || [];
          if (nextSteps.length === 0) {
            // No more steps, workflow completed
            this.completeWorkflow(instance);
            return;
          }
          instance.currentStep = nextSteps[0]; // Take first success path
        }

        // Update instance
        this.instances.set(instanceId, instance);

        // Emit progress event
        this.emit('workflow.progress', {
          instanceId,
          currentStep: instance.currentStep,
          stepCompleted: stepExecution.stepId,
          status: stepExecution.status,
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown workflow error';
      this.failWorkflow(instance, errorMessage);
    }
  }

  /**
   * Execute a single workflow step
   */
  private async executeStep(
    step: WorkflowStep,
    instance: WorkflowInstance
  ): Promise<WorkflowStepExecution> {
    const execution: WorkflowStepExecution = {
      stepId: step.id,
      status: 'running',
      startedAt: new Date(),
      retryCount: 0,
    };

    console.log(
      `[WorkflowEngine] Executing step: ${step.id} in workflow ${instance.id}`
    );

    try {
      const processor = this.stepProcessors.get(step.type);

      if (!processor) {
        throw new Error(`No processor found for step type: ${step.type}`);
      }

      // Set timeout if specified
      let result;
      if (step.timeout) {
        result = await Promise.race([
          processor(step, instance),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error(`Step timed out after ${step.timeout}ms`)),
              step.timeout
            )
          ),
        ]);
      } else {
        result = await processor(step, instance);
      }

      execution.status = 'completed';
      execution.output = result;
      execution.completedAt = new Date();

      console.log(`[WorkflowEngine] Step ${step.id} completed successfully`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown step error';

      execution.status = 'failed';
      execution.error = errorMessage;
      execution.completedAt = new Date();

      console.error(`[WorkflowEngine] Step ${step.id} failed:`, errorMessage);
    }

    return execution;
  }

  /**
   * Complete a workflow instance
   */
  private completeWorkflow(instance: WorkflowInstance): void {
    instance.status = 'completed';
    instance.completedAt = new Date();
    instance.currentStep = undefined;

    console.log(`[WorkflowEngine] Workflow completed: ${instance.id}`);

    this.emit('workflow.completed', {
      instanceId: instance.id,
      userId: instance.userId,
      duration: instance.completedAt.getTime() - instance.startedAt.getTime(),
      status: 'completed',
    });
  }

  /**
   * Fail a workflow instance
   */
  private failWorkflow(instance: WorkflowInstance, error: string): void {
    instance.status = 'failed';
    instance.error = error;
    instance.completedAt = new Date();
    instance.currentStep = undefined;

    console.error(
      `[WorkflowEngine] Workflow failed: ${instance.id} - ${error}`
    );

    this.emit('workflow.failed', {
      instanceId: instance.id,
      userId: instance.userId,
      error,
      duration: instance.completedAt.getTime() - instance.startedAt.getTime(),
    });
  }

  /**
   * Register a step processor
   */
  registerStepProcessor(
    stepType: string,
    processor: (step: WorkflowStep, instance: WorkflowInstance) => Promise<any>
  ): void {
    this.stepProcessors.set(stepType, processor);
    console.log(`[WorkflowEngine] Registered step processor: ${stepType}`);
  }

  /**
   * Setup default step processors
   */
  private setupDefaultStepProcessors(): void {
    // Task step processor
    this.registerStepProcessor('task', async (step, instance) => {
      const { jobType, jobData } = step.config;

      if (!jobType) {
        throw new Error('Task step requires jobType in config');
      }

      // Queue a job and wait for completion
      const jobId = await this.jobQueue.addJob(jobType, {
        ...jobData,
        workflowInstanceId: instance.id,
        stepId: step.id,
        variables: instance.variables,
      });

      // Wait for job completion
      return new Promise((resolve, reject) => {
        const checkJob = () => {
          const job = this.jobQueue.getJob(jobId);

          if (!job) {
            reject(new Error('Job not found'));
            return;
          }

          if (job.status === 'completed') {
            resolve((job as any).result || { success: true });
          } else if (job.status === 'failed') {
            reject(new Error(job.error || 'Job failed'));
          } else {
            // Job still processing, check again
            setTimeout(checkJob, 1000);
          }
        };

        checkJob();
      });
    });

    // Condition step processor
    this.registerStepProcessor('condition', async (step, instance) => {
      const { expression, trueStep, falseStep } = step.config;

      // Simple expression evaluation (in production, use a proper expression engine)
      const result = this.evaluateCondition(expression, instance.variables);

      return {
        conditionResult: result,
        nextStep: result ? trueStep : falseStep,
      };
    });

    // Wait step processor
    this.registerStepProcessor('wait', async (step, instance) => {
      const { duration } = step.config;

      if (typeof duration === 'number' && duration > 0) {
        await new Promise(resolve => setTimeout(resolve, duration));
      }

      return { waited: duration };
    });

    // Parallel step processor (simplified)
    this.registerStepProcessor('parallel', async (step, instance) => {
      const { parallelSteps } = step.config;

      if (!Array.isArray(parallelSteps)) {
        throw new Error('Parallel step requires parallelSteps array in config');
      }

      // Execute all parallel steps concurrently
      const results = await Promise.allSettled(
        parallelSteps.map(async (stepId: string) => {
          const definition = this.definitions.get(instance.definitionId);
          const parallelStep = definition?.steps.find(s => s.id === stepId);

          if (!parallelStep) {
            throw new Error(`Parallel step not found: ${stepId}`);
          }

          return this.executeStep(parallelStep, instance);
        })
      );

      return {
        parallelResults: results.map((result, index) => ({
          stepId: parallelSteps[index],
          status: result.status,
          value: result.status === 'fulfilled' ? result.value : undefined,
          error: result.status === 'rejected' ? result.reason : undefined,
        })),
      };
    });
  }

  /**
   * Simple condition evaluation
   */
  private evaluateCondition(
    expression: string,
    variables: Record<string, any>
  ): boolean {
    try {
      // Use safe expression parser instead of eval
      const parser = new Parser();

      // Parse the expression and evaluate with variables
      const expr = parser.parse(expression);
      const result = expr.evaluate(variables);

      return Boolean(result);
    } catch (error) {
      console.error('[WorkflowEngine] Error evaluating condition:', error);
      return false;
    }
  }

  /**
   * Get workflow statistics
   */
  getStats(): {
    totalWorkflows: number;
    running: number;
    completed: number;
    failed: number;
    cancelled: number;
  } {
    const instances = Array.from(this.instances.values());

    return {
      totalWorkflows: instances.length,
      running: instances.filter(i => i.status === 'running').length,
      completed: instances.filter(i => i.status === 'completed').length,
      failed: instances.filter(i => i.status === 'failed').length,
      cancelled: instances.filter(i => i.status === 'cancelled').length,
    };
  }

  /**
   * Cleanup old workflow instances
   */
  cleanupOldInstances(maxAge: number = 7 * 24 * 60 * 60 * 1000): number {
    // Default 7 days
    const cutoffTime = Date.now() - maxAge;
    let cleanedCount = 0;

    for (const [instanceId, instance] of this.instances.entries()) {
      if (
        instance.status !== 'running' &&
        instance.completedAt &&
        instance.completedAt.getTime() < cutoffTime
      ) {
        this.instances.delete(instanceId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(
        `[WorkflowEngine] Cleaned up ${cleanedCount} old workflow instances`
      );
    }

    return cleanedCount;
  }
}

// Global workflow engine instance
const globalWorkflowEngine = new SimpleWorkflowEngine();

/**
 * Get the global workflow engine instance
 */
export function getWorkflowEngine(): SimpleWorkflowEngine {
  return globalWorkflowEngine;
}

// Setup automatic cleanup every 24 hours
setInterval(
  () => {
    globalWorkflowEngine.cleanupOldInstances();
  },
  24 * 60 * 60 * 1000
); // 24 hours

// Register default cancellation workflow
globalWorkflowEngine.registerWorkflow({
  id: 'cancellation.full_process',
  name: 'Full Cancellation Process',
  description:
    'Complete cancellation workflow with validation, attempt, and confirmation',
  version: '1.0.0',
  startStep: 'validate',
  steps: [
    {
      id: 'validate',
      name: 'Validate Cancellation Request',
      type: 'task',
      config: {
        jobType: 'cancellation.validate',
      },
      nextSteps: ['attempt'],
      onFailure: ['fail'],
    },
    {
      id: 'attempt',
      name: 'Attempt Cancellation',
      type: 'task',
      config: {
        jobType: 'cancellation.attempt',
      },
      timeout: 300000, // 5 minutes
      nextSteps: ['confirm'],
      onFailure: ['retry_check'],
    },
    {
      id: 'retry_check',
      name: 'Check if Retry Needed',
      type: 'condition',
      config: {
        expression: 'retryCount < maxRetries',
        trueStep: 'wait_retry',
        falseStep: 'manual_fallback',
      },
    },
    {
      id: 'wait_retry',
      name: 'Wait Before Retry',
      type: 'wait',
      config: {
        duration: 60000, // 1 minute
      },
      nextSteps: ['attempt'],
    },
    {
      id: 'manual_fallback',
      name: 'Generate Manual Instructions',
      type: 'task',
      config: {
        jobType: 'cancellation.manual_instructions',
      },
      nextSteps: ['complete'],
    },
    {
      id: 'confirm',
      name: 'Confirm Cancellation',
      type: 'task',
      config: {
        jobType: 'cancellation.confirm',
      },
      nextSteps: ['complete'],
      onFailure: ['fail'],
    },
    {
      id: 'complete',
      name: 'Complete Workflow',
      type: 'task',
      config: {
        jobType: 'cancellation.complete',
      },
    },
    {
      id: 'fail',
      name: 'Handle Failure',
      type: 'task',
      config: {
        jobType: 'cancellation.handle_failure',
      },
    },
  ],
  variables: {
    maxRetries: 3,
    retryCount: 0,
  },
});
