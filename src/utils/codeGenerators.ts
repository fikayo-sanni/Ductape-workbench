/**
 * Code generation utilities for Ductape SDK
 * Generates code snippets for workflows, jobs, quota, fallback, healthcheck, and intelligence
 */

export type SdkLanguage = 'typescript' | 'python' | 'go' | 'java';

// ==================== WORKFLOW CODE GENERATORS ====================

export interface WorkflowCodeGenOptions {
  product: string;
  tag: string;
  name: string;
  steps: Array<{
    tag: string;
    type: string;
    app?: string;
    event: string;
    input: Record<string, unknown>;
  }>;
  env?: string;
}

export function generateWorkflowCode(options: WorkflowCodeGenOptions, language: SdkLanguage = 'typescript'): string {
  switch (language) {
    case 'typescript':
      return generateWorkflowTypeScript(options);
    case 'python':
      return generateWorkflowPython(options);
    case 'go':
      return generateWorkflowGo(options);
    case 'java':
      return generateWorkflowJava(options);
    default:
      return '';
  }
}

function generateWorkflowTypeScript(options: WorkflowCodeGenOptions): string {
  const { product, tag, name, steps, env = 'production' } = options;

  let code = `import Ductape from '@ductape/sdk';\n\n`;
  code += `// Initialize Ductape SDK\n`;
  code += `const ductape = new Ductape({\n`;
  code += `  accessKey: process.env.DUCTAPE_ACCESS_KEY!,\n`;
  code += `  env_type: 'production'\n`;
  code += `});\n\n`;

  code += `async function execute${name.replace(/[^a-zA-Z0-9]/g, '')}Workflow() {\n`;
  code += `  try {\n`;
  code += `    // Execute workflow\n`;
  code += `    const result = await ductape.workflow.run({\n`;
  code += `      product: '${product}',\n`;
  code += `      env: '${env}',\n`;
  code += `      tag: '${tag}',\n`;
  code += `      input: {\n`;
  code += `        // Add your input data here\n`;
  code += `      }\n`;
  code += `    });\n\n`;
  code += `    console.log('Workflow execution result:', result);\n`;
  code += `    return result;\n`;
  code += `  } catch (error) {\n`;
  code += `    console.error('Workflow execution failed:', error);\n`;
  code += `    throw error;\n`;
  code += `  }\n`;
  code += `}\n\n`;
  code += `// Execute the workflow\n`;
  code += `execute${name.replace(/[^a-zA-Z0-9]/g, '')}Workflow();`;

  return code;
}

function generateWorkflowPython(options: WorkflowCodeGenOptions): string {
  const { product, tag, name, env = 'production' } = options;

  let code = `from ductape import Ductape\nimport os\n\n`;
  code += `# Initialize Ductape SDK\n`;
  code += `ductape = Ductape(\n`;
  code += `    accessKey=os.environ.get('DUCTAPE_ACCESS_KEY'),\n`;
  code += `    env_type='production'\n`;
  code += `)\n\n`;

  code += `def execute_${name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_workflow():\n`;
  code += `    try:\n`;
  code += `        # Execute workflow\n`;
  code += `        result = ductape.workflow.run(\n`;
  code += `            product='${product}',\n`;
  code += `            env='${env}',\n`;
  code += `            tag='${tag}',\n`;
  code += `            input={\n`;
  code += `                # Add your input data here\n`;
  code += `            }\n`;
  code += `        )\n\n`;
  code += `        print('Workflow execution result:', result)\n`;
  code += `        return result\n`;
  code += `    except Exception as error:\n`;
  code += `        print('Workflow execution failed:', error)\n`;
  code += `        raise\n\n`;
  code += `# Execute the workflow\n`;
  code += `execute_${name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_workflow()`;

  return code;
}

function generateWorkflowGo(options: WorkflowCodeGenOptions): string {
  const { product, tag, name, env = 'production' } = options;

  let code = `package main\n\n`;
  code += `import (\n`;
  code += `    "fmt"\n`;
  code += `    "os"\n`;
  code += `    "github.com/ductape/ductape-go"\n`;
  code += `)\n\n`;
  code += `func main() {\n`;
  code += `    // Initialize Ductape SDK\n`;
  code += `    client := ductape.NewClient(os.Getenv("DUCTAPE_ACCESS_KEY"))\n\n`;
  code += `    // Execute workflow\n`;
  code += `    result, err := client.Workflow.Run(ductape.WorkflowRunOptions{\n`;
  code += `        Product: "${product}",\n`;
  code += `        Env: "${env}",\n`;
  code += `        Tag: "${tag}",\n`;
  code += `        Input: map[string]interface{}{\n`;
  code += `            // Add your input data here\n`;
  code += `        },\n`;
  code += `    })\n\n`;
  code += `    if err != nil {\n`;
  code += `        fmt.Println("Workflow execution failed:", err)\n`;
  code += `        return\n`;
  code += `    }\n\n`;
  code += `    fmt.Println("Workflow execution result:", result)\n`;
  code += `}`;

  return code;
}

function generateWorkflowJava(options: WorkflowCodeGenOptions): string {
  const { product, tag, env = 'production' } = options;

  let code = `import com.ductape.Ductape;\n`;
  code += `import com.ductape.workflow.WorkflowService;\n`;
  code += `import java.util.HashMap;\n`;
  code += `import java.util.Map;\n\n`;
  code += `public class WorkflowExecutor {\n`;
  code += `    public static void main(String[] args) {\n`;
  code += `        // Initialize Ductape SDK\n`;
  code += `        Ductape ductape = new Ductape(System.getenv("DUCTAPE_ACCESS_KEY"));\n`;
  code += `        WorkflowService workflow = ductape.getWorkflow();\n\n`;
  code += `        try {\n`;
  code += `            // Execute workflow\n`;
  code += `            Map<String, Object> input = new HashMap<>();\n`;
  code += `            // Add your input data here\n\n`;
  code += `            Object result = workflow.run("${product}", "${env}", "${tag}", input);\n`;
  code += `            System.out.println("Workflow execution result: " + result);\n`;
  code += `        } catch (Exception e) {\n`;
  code += `            System.err.println("Workflow execution failed: " + e.getMessage());\n`;
  code += `            e.printStackTrace();\n`;
  code += `        }\n`;
  code += `    }\n`;
  code += `}`;

  return code;
}

// ==================== JOB CODE GENERATORS ====================

export interface JobCodeGenOptions {
  product: string;
  tag: string;
  name: string;
  type: string;
  app?: string;
  event: string;
  env?: string;
  schedule?: {
    delay?: number;
    cron?: string;
  };
}

export function generateJobCode(options: JobCodeGenOptions, language: SdkLanguage = 'typescript'): string {
  switch (language) {
    case 'typescript':
      return generateJobTypeScript(options);
    case 'python':
      return generateJobPython(options);
    case 'go':
      return generateJobGo(options);
    case 'java':
      return generateJobJava(options);
    default:
      return '';
  }
}

function generateJobTypeScript(options: JobCodeGenOptions): string {
  const { product, event, app, env = 'production', schedule } = options;

  let code = `import Ductape from '@ductape/sdk';\n\n`;
  code += `// Initialize Ductape SDK\n`;
  code += `const ductape = new Ductape({\n`;
  code += `  accessKey: process.env.DUCTAPE_ACCESS_KEY!,\n`;
  code += `  env_type: 'production'\n`;
  code += `});\n\n`;

  code += `async function dispatchJob() {\n`;
  code += `  try {\n`;
  code += `    // Dispatch job for deferred execution\n`;
  code += `    const result = await ductape.action.dispatch({\n`;
  code += `      product: '${product}',\n`;
  code += `      env: '${env}',\n`;
  code += `      app: '${app}',\n`;
  code += `      event: '${event}',\n`;
  code += `      input: {\n`;
  code += `        // Add your input data here\n`;
  code += `      }`;

  if (schedule) {
    code += `,\n      schedule: {\n`;
    if (schedule.delay) {
      code += `        delay: ${schedule.delay}, // Delay in milliseconds\n`;
    }
    if (schedule.cron) {
      code += `        cron: '${schedule.cron}', // Cron expression\n`;
    }
    code += `      }`;
  }

  code += `\n    });\n\n`;
  code += `    console.log('Job dispatched:', result.jobId);\n`;
  code += `    return result;\n`;
  code += `  } catch (error) {\n`;
  code += `    console.error('Job dispatch failed:', error);\n`;
  code += `    throw error;\n`;
  code += `  }\n`;
  code += `}\n\n`;
  code += `// Dispatch the job\n`;
  code += `dispatchJob();`;

  return code;
}

function generateJobPython(options: JobCodeGenOptions): string {
  const { product, event, app, env = 'production', schedule } = options;

  let code = `from ductape import Ductape\nimport os\n\n`;
  code += `# Initialize Ductape SDK\n`;
  code += `ductape = Ductape(\n`;
  code += `    accessKey=os.environ.get('DUCTAPE_ACCESS_KEY'),\n`;
  code += `    env_type='production'\n`;
  code += `)\n\n`;

  code += `def dispatch_job():\n`;
  code += `    try:\n`;
  code += `        # Dispatch job for deferred execution\n`;
  code += `        result = ductape.action.dispatch(\n`;
  code += `            product='${product}',\n`;
  code += `            env='${env}',\n`;
  code += `            app='${app}',\n`;
  code += `            event='${event}',\n`;
  code += `            input={\n`;
  code += `                # Add your input data here\n`;
  code += `            }`;

  if (schedule) {
    code += `,\n            schedule={\n`;
    if (schedule.delay) {
      code += `                'delay': ${schedule.delay},  # Delay in milliseconds\n`;
    }
    if (schedule.cron) {
      code += `                'cron': '${schedule.cron}',  # Cron expression\n`;
    }
    code += `            }`;
  }

  code += `\n        )\n\n`;
  code += `        print('Job dispatched:', result['jobId'])\n`;
  code += `        return result\n`;
  code += `    except Exception as error:\n`;
  code += `        print('Job dispatch failed:', error)\n`;
  code += `        raise\n\n`;
  code += `# Dispatch the job\n`;
  code += `dispatch_job()`;

  return code;
}

function generateJobGo(options: JobCodeGenOptions): string {
  const { product, event, app, env = 'production' } = options;

  let code = `package main\n\n`;
  code += `import (\n`;
  code += `    "fmt"\n`;
  code += `    "os"\n`;
  code += `    "github.com/ductape/ductape-go"\n`;
  code += `)\n\n`;
  code += `func main() {\n`;
  code += `    // Initialize Ductape SDK\n`;
  code += `    client := ductape.NewClient(os.Getenv("DUCTAPE_ACCESS_KEY"))\n\n`;
  code += `    // Dispatch job\n`;
  code += `    result, err := client.Action.Dispatch(ductape.ActionDispatchOptions{\n`;
  code += `        Product: "${product}",\n`;
  code += `        Env: "${env}",\n`;
  code += `        App: "${app}",\n`;
  code += `        Event: "${event}",\n`;
  code += `        Input: map[string]interface{}{\n`;
  code += `            // Add your input data here\n`;
  code += `        },\n`;
  code += `    })\n\n`;
  code += `    if err != nil {\n`;
  code += `        fmt.Println("Job dispatch failed:", err)\n`;
  code += `        return\n`;
  code += `    }\n\n`;
  code += `    fmt.Println("Job dispatched:", result.JobID)\n`;
  code += `}`;

  return code;
}

function generateJobJava(options: JobCodeGenOptions): string {
  const { product, event, app, env = 'production' } = options;

  let code = `import com.ductape.Ductape;\n`;
  code += `import com.ductape.action.ActionService;\n`;
  code += `import java.util.HashMap;\n`;
  code += `import java.util.Map;\n\n`;
  code += `public class JobDispatcher {\n`;
  code += `    public static void main(String[] args) {\n`;
  code += `        // Initialize Ductape SDK\n`;
  code += `        Ductape ductape = new Ductape(System.getenv("DUCTAPE_ACCESS_KEY"));\n`;
  code += `        ActionService action = ductape.getAction();\n\n`;
  code += `        try {\n`;
  code += `            // Dispatch job\n`;
  code += `            Map<String, Object> input = new HashMap<>();\n`;
  code += `            // Add your input data here\n\n`;
  code += `            Object result = action.dispatch("${product}", "${env}", "${app}", "${event}", input);\n`;
  code += `            System.out.println("Job dispatched: " + result);\n`;
  code += `        } catch (Exception e) {\n`;
  code += `            System.err.println("Job dispatch failed: " + e.getMessage());\n`;
  code += `            e.printStackTrace();\n`;
  code += `        }\n`;
  code += `    }\n`;
  code += `}`;

  return code;
}

// ==================== QUOTA CODE GENERATORS ====================

export interface QuotaCodeGenOptions {
  product: string;
  tag: string;
  name: string;
  env?: string;
}

export function generateQuotaCode(options: QuotaCodeGenOptions, language: SdkLanguage = 'typescript'): string {
  switch (language) {
    case 'typescript':
      return generateQuotaTypeScript(options);
    case 'python':
      return generateQuotaPython(options);
    case 'go':
      return generateQuotaGo(options);
    case 'java':
      return generateQuotaJava(options);
    default:
      return '';
  }
}

function generateQuotaTypeScript(options: QuotaCodeGenOptions): string {
  const { product, tag, name, env = 'production' } = options;

  let code = `import Ductape from '@ductape/sdk';\n\n`;
  code += `// Initialize Ductape SDK\n`;
  code += `const ductape = new Ductape({\n`;
  code += `  accessKey: process.env.DUCTAPE_ACCESS_KEY!,\n`;
  code += `  env_type: 'production'\n`;
  code += `});\n\n`;

  code += `async function execute${name.replace(/[^a-zA-Z0-9]/g, '')}Quota() {\n`;
  code += `  try {\n`;
  code += `    // Execute quota with weighted distribution\n`;
  code += `    const result = await ductape.quota.run({\n`;
  code += `      product: '${product}',\n`;
  code += `      env: '${env}',\n`;
  code += `      tag: '${tag}',\n`;
  code += `      input: {\n`;
  code += `        // Add your input data here\n`;
  code += `      }\n`;
  code += `    });\n\n`;
  code += `    console.log('Quota execution result:', result);\n`;
  code += `    return result;\n`;
  code += `  } catch (error) {\n`;
  code += `    console.error('Quota execution failed:', error);\n`;
  code += `    throw error;\n`;
  code += `  }\n`;
  code += `}\n\n`;
  code += `// Execute the quota\n`;
  code += `execute${name.replace(/[^a-zA-Z0-9]/g, '')}Quota();`;

  return code;
}

function generateQuotaPython(options: QuotaCodeGenOptions): string {
  const { product, tag, name, env = 'production' } = options;

  let code = `from ductape import Ductape\nimport os\n\n`;
  code += `# Initialize Ductape SDK\n`;
  code += `ductape = Ductape(\n`;
  code += `    accessKey=os.environ.get('DUCTAPE_ACCESS_KEY'),\n`;
  code += `    env_type='production'\n`;
  code += `)\n\n`;

  code += `def execute_${name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_quota():\n`;
  code += `    try:\n`;
  code += `        # Execute quota with weighted distribution\n`;
  code += `        result = ductape.quota.run(\n`;
  code += `            product='${product}',\n`;
  code += `            env='${env}',\n`;
  code += `            tag='${tag}',\n`;
  code += `            input={\n`;
  code += `                # Add your input data here\n`;
  code += `            }\n`;
  code += `        )\n\n`;
  code += `        print('Quota execution result:', result)\n`;
  code += `        return result\n`;
  code += `    except Exception as error:\n`;
  code += `        print('Quota execution failed:', error)\n`;
  code += `        raise\n\n`;
  code += `# Execute the quota\n`;
  code += `execute_${name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_quota()`;

  return code;
}

function generateQuotaGo(options: QuotaCodeGenOptions): string {
  const { product, tag, env = 'production' } = options;

  let code = `package main\n\n`;
  code += `import (\n`;
  code += `    "fmt"\n`;
  code += `    "os"\n`;
  code += `    "github.com/ductape/ductape-go"\n`;
  code += `)\n\n`;
  code += `func main() {\n`;
  code += `    // Initialize Ductape SDK\n`;
  code += `    client := ductape.NewClient(os.Getenv("DUCTAPE_ACCESS_KEY"))\n\n`;
  code += `    // Execute quota\n`;
  code += `    result, err := client.Quota.Run(ductape.QuotaRunOptions{\n`;
  code += `        Product: "${product}",\n`;
  code += `        Env: "${env}",\n`;
  code += `        Tag: "${tag}",\n`;
  code += `        Input: map[string]interface{}{\n`;
  code += `            // Add your input data here\n`;
  code += `        },\n`;
  code += `    })\n\n`;
  code += `    if err != nil {\n`;
  code += `        fmt.Println("Quota execution failed:", err)\n`;
  code += `        return\n`;
  code += `    }\n\n`;
  code += `    fmt.Println("Quota execution result:", result)\n`;
  code += `}`;

  return code;
}

function generateQuotaJava(options: QuotaCodeGenOptions): string {
  const { product, tag, env = 'production' } = options;

  let code = `import com.ductape.Ductape;\n`;
  code += `import com.ductape.quota.QuotaService;\n`;
  code += `import java.util.HashMap;\n`;
  code += `import java.util.Map;\n\n`;
  code += `public class QuotaExecutor {\n`;
  code += `    public static void main(String[] args) {\n`;
  code += `        // Initialize Ductape SDK\n`;
  code += `        Ductape ductape = new Ductape(System.getenv("DUCTAPE_ACCESS_KEY"));\n`;
  code += `        QuotaService quota = ductape.getQuota();\n\n`;
  code += `        try {\n`;
  code += `            // Execute quota\n`;
  code += `            Map<String, Object> input = new HashMap<>();\n`;
  code += `            // Add your input data here\n\n`;
  code += `            Object result = quota.run("${product}", "${env}", "${tag}", input);\n`;
  code += `            System.out.println("Quota execution result: " + result);\n`;
  code += `        } catch (Exception e) {\n`;
  code += `            System.err.println("Quota execution failed: " + e.getMessage());\n`;
  code += `            e.printStackTrace();\n`;
  code += `        }\n`;
  code += `    }\n`;
  code += `}`;

  return code;
}

// ==================== FALLBACK CODE GENERATORS ====================

export interface FallbackCodeGenOptions {
  product: string;
  tag: string;
  name: string;
  env?: string;
}

export function generateFallbackCode(options: FallbackCodeGenOptions, language: SdkLanguage = 'typescript'): string {
  switch (language) {
    case 'typescript':
      return generateFallbackTypeScript(options);
    case 'python':
      return generateFallbackPython(options);
    case 'go':
      return generateFallbackGo(options);
    case 'java':
      return generateFallbackJava(options);
    default:
      return '';
  }
}

function generateFallbackTypeScript(options: FallbackCodeGenOptions): string {
  const { product, tag, name, env = 'production' } = options;

  let code = `import Ductape from '@ductape/sdk';\n\n`;
  code += `// Initialize Ductape SDK\n`;
  code += `const ductape = new Ductape({\n`;
  code += `  accessKey: process.env.DUCTAPE_ACCESS_KEY!,\n`;
  code += `  env_type: 'production'\n`;
  code += `});\n\n`;

  code += `async function execute${name.replace(/[^a-zA-Z0-9]/g, '')}Fallback() {\n`;
  code += `  try {\n`;
  code += `    // Execute fallback with sequential failover\n`;
  code += `    const result = await ductape.fallback.run({\n`;
  code += `      product: '${product}',\n`;
  code += `      env: '${env}',\n`;
  code += `      tag: '${tag}',\n`;
  code += `      input: {\n`;
  code += `        // Add your input data here\n`;
  code += `      }\n`;
  code += `    });\n\n`;
  code += `    console.log('Fallback execution result:', result);\n`;
  code += `    return result;\n`;
  code += `  } catch (error) {\n`;
  code += `    console.error('Fallback execution failed:', error);\n`;
  code += `    throw error;\n`;
  code += `  }\n`;
  code += `}\n\n`;
  code += `// Execute the fallback\n`;
  code += `execute${name.replace(/[^a-zA-Z0-9]/g, '')}Fallback();`;

  return code;
}

function generateFallbackPython(options: FallbackCodeGenOptions): string {
  const { product, tag, name, env = 'production' } = options;

  let code = `from ductape import Ductape\nimport os\n\n`;
  code += `# Initialize Ductape SDK\n`;
  code += `ductape = Ductape(\n`;
  code += `    accessKey=os.environ.get('DUCTAPE_ACCESS_KEY'),\n`;
  code += `    env_type='production'\n`;
  code += `)\n\n`;

  code += `def execute_${name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_fallback():\n`;
  code += `    try:\n`;
  code += `        # Execute fallback with sequential failover\n`;
  code += `        result = ductape.fallback.run(\n`;
  code += `            product='${product}',\n`;
  code += `            env='${env}',\n`;
  code += `            tag='${tag}',\n`;
  code += `            input={\n`;
  code += `                # Add your input data here\n`;
  code += `            }\n`;
  code += `        )\n\n`;
  code += `        print('Fallback execution result:', result)\n`;
  code += `        return result\n`;
  code += `    except Exception as error:\n`;
  code += `        print('Fallback execution failed:', error)\n`;
  code += `        raise\n\n`;
  code += `# Execute the fallback\n`;
  code += `execute_${name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_fallback()`;

  return code;
}

function generateFallbackGo(options: FallbackCodeGenOptions): string {
  const { product, tag, env = 'production' } = options;

  let code = `package main\n\n`;
  code += `import (\n`;
  code += `    "fmt"\n`;
  code += `    "os"\n`;
  code += `    "github.com/ductape/ductape-go"\n`;
  code += `)\n\n`;
  code += `func main() {\n`;
  code += `    // Initialize Ductape SDK\n`;
  code += `    client := ductape.NewClient(os.Getenv("DUCTAPE_ACCESS_KEY"))\n\n`;
  code += `    // Execute fallback\n`;
  code += `    result, err := client.Fallback.Run(ductape.FallbackRunOptions{\n`;
  code += `        Product: "${product}",\n`;
  code += `        Env: "${env}",\n`;
  code += `        Tag: "${tag}",\n`;
  code += `        Input: map[string]interface{}{\n`;
  code += `            // Add your input data here\n`;
  code += `        },\n`;
  code += `    })\n\n`;
  code += `    if err != nil {\n`;
  code += `        fmt.Println("Fallback execution failed:", err)\n`;
  code += `        return\n`;
  code += `    }\n\n`;
  code += `    fmt.Println("Fallback execution result:", result)\n`;
  code += `}`;

  return code;
}

function generateFallbackJava(options: FallbackCodeGenOptions): string {
  const { product, tag, env = 'production' } = options;

  let code = `import com.ductape.Ductape;\n`;
  code += `import com.ductape.fallback.FallbackService;\n`;
  code += `import java.util.HashMap;\n`;
  code += `import java.util.Map;\n\n`;
  code += `public class FallbackExecutor {\n`;
  code += `    public static void main(String[] args) {\n`;
  code += `        // Initialize Ductape SDK\n`;
  code += `        Ductape ductape = new Ductape(System.getenv("DUCTAPE_ACCESS_KEY"));\n`;
  code += `        FallbackService fallback = ductape.getFallback();\n\n`;
  code += `        try {\n`;
  code += `            // Execute fallback\n`;
  code += `            Map<String, Object> input = new HashMap<>();\n`;
  code += `            // Add your input data here\n\n`;
  code += `            Object result = fallback.run("${product}", "${env}", "${tag}", input);\n`;
  code += `            System.out.println("Fallback execution result: " + result);\n`;
  code += `        } catch (Exception e) {\n`;
  code += `            System.err.println("Fallback execution failed: " + e.getMessage());\n`;
  code += `            e.printStackTrace();\n`;
  code += `        }\n`;
  code += `    }\n`;
  code += `}`;

  return code;
}

// ==================== HEALTHCHECK CODE GENERATORS ====================

export interface HealthcheckCodeGenOptions {
  product: string;
  tag: string;
  name: string;
  env?: string;
}

export function generateHealthcheckCode(options: HealthcheckCodeGenOptions, language: SdkLanguage = 'typescript'): string {
  switch (language) {
    case 'typescript':
      return generateHealthcheckTypeScript(options);
    case 'python':
      return generateHealthcheckPython(options);
    case 'go':
      return generateHealthcheckGo(options);
    case 'java':
      return generateHealthcheckJava(options);
    default:
      return '';
  }
}

function generateHealthcheckTypeScript(options: HealthcheckCodeGenOptions): string {
  const { product, tag, env = 'production' } = options;

  let code = `import Ductape from '@ductape/sdk';\n\n`;
  code += `// Initialize Ductape SDK\n`;
  code += `const ductape = new Ductape({\n`;
  code += `  accessKey: process.env.DUCTAPE_ACCESS_KEY!,\n`;
  code += `  env_type: 'production'\n`;
  code += `});\n\n`;

  code += `async function checkHealth() {\n`;
  code += `  try {\n`;
  code += `    // Get healthcheck status\n`;
  code += `    const status = await ductape.health.status({\n`;
  code += `      product: '${product}',\n`;
  code += `      env: '${env}',\n`;
  code += `      tag: '${tag}'\n`;
  code += `    });\n\n`;
  code += `    console.log('Health status:', status);\n\n`;
  code += `    // Manually trigger a healthcheck run\n`;
  code += `    const result = await ductape.health.run({\n`;
  code += `      product: '${product}',\n`;
  code += `      env: '${env}',\n`;
  code += `      tag: '${tag}'\n`;
  code += `    });\n\n`;
  code += `    console.log('Healthcheck result:', result);\n`;
  code += `    return result;\n`;
  code += `  } catch (error) {\n`;
  code += `    console.error('Healthcheck failed:', error);\n`;
  code += `    throw error;\n`;
  code += `  }\n`;
  code += `}\n\n`;
  code += `// Check health\n`;
  code += `checkHealth();`;

  return code;
}

function generateHealthcheckPython(options: HealthcheckCodeGenOptions): string {
  const { product, tag, env = 'production' } = options;

  let code = `from ductape import Ductape\nimport os\n\n`;
  code += `# Initialize Ductape SDK\n`;
  code += `ductape = Ductape(\n`;
  code += `    accessKey=os.environ.get('DUCTAPE_ACCESS_KEY'),\n`;
  code += `    env_type='production'\n`;
  code += `)\n\n`;

  code += `def check_health():\n`;
  code += `    try:\n`;
  code += `        # Get healthcheck status\n`;
  code += `        status = ductape.health.status(\n`;
  code += `            product='${product}',\n`;
  code += `            env='${env}',\n`;
  code += `            tag='${tag}'\n`;
  code += `        )\n\n`;
  code += `        print('Health status:', status)\n\n`;
  code += `        # Manually trigger a healthcheck run\n`;
  code += `        result = ductape.health.run(\n`;
  code += `            product='${product}',\n`;
  code += `            env='${env}',\n`;
  code += `            tag='${tag}'\n`;
  code += `        )\n\n`;
  code += `        print('Healthcheck result:', result)\n`;
  code += `        return result\n`;
  code += `    except Exception as error:\n`;
  code += `        print('Healthcheck failed:', error)\n`;
  code += `        raise\n\n`;
  code += `# Check health\n`;
  code += `check_health()`;

  return code;
}

function generateHealthcheckGo(options: HealthcheckCodeGenOptions): string {
  const { product, tag, env = 'production' } = options;

  let code = `package main\n\n`;
  code += `import (\n`;
  code += `    "fmt"\n`;
  code += `    "os"\n`;
  code += `    "github.com/ductape/ductape-go"\n`;
  code += `)\n\n`;
  code += `func main() {\n`;
  code += `    // Initialize Ductape SDK\n`;
  code += `    client := ductape.NewClient(os.Getenv("DUCTAPE_ACCESS_KEY"))\n\n`;
  code += `    // Get healthcheck status\n`;
  code += `    status, err := client.Health.Status(ductape.HealthStatusOptions{\n`;
  code += `        Product: "${product}",\n`;
  code += `        Env: "${env}",\n`;
  code += `        Tag: "${tag}",\n`;
  code += `    })\n\n`;
  code += `    if err != nil {\n`;
  code += `        fmt.Println("Failed to get health status:", err)\n`;
  code += `        return\n`;
  code += `    }\n\n`;
  code += `    fmt.Println("Health status:", status)\n\n`;
  code += `    // Manually trigger healthcheck\n`;
  code += `    result, err := client.Health.Run(ductape.HealthRunOptions{\n`;
  code += `        Product: "${product}",\n`;
  code += `        Env: "${env}",\n`;
  code += `        Tag: "${tag}",\n`;
  code += `    })\n\n`;
  code += `    if err != nil {\n`;
  code += `        fmt.Println("Healthcheck failed:", err)\n`;
  code += `        return\n`;
  code += `    }\n\n`;
  code += `    fmt.Println("Healthcheck result:", result)\n`;
  code += `}`;

  return code;
}

function generateHealthcheckJava(options: HealthcheckCodeGenOptions): string {
  const { product, tag, env = 'production' } = options;

  let code = `import com.ductape.Ductape;\n`;
  code += `import com.ductape.health.HealthService;\n\n`;
  code += `public class HealthcheckExecutor {\n`;
  code += `    public static void main(String[] args) {\n`;
  code += `        // Initialize Ductape SDK\n`;
  code += `        Ductape ductape = new Ductape(System.getenv("DUCTAPE_ACCESS_KEY"));\n`;
  code += `        HealthService health = ductape.getHealth();\n\n`;
  code += `        try {\n`;
  code += `            // Get healthcheck status\n`;
  code += `            Object status = health.status("${product}", "${env}", "${tag}");\n`;
  code += `            System.out.println("Health status: " + status);\n\n`;
  code += `            // Manually trigger healthcheck\n`;
  code += `            Object result = health.run("${product}", "${env}", "${tag}");\n`;
  code += `            System.out.println("Healthcheck result: " + result);\n`;
  code += `        } catch (Exception e) {\n`;
  code += `            System.err.println("Healthcheck failed: " + e.getMessage());\n`;
  code += `            e.printStackTrace();\n`;
  code += `        }\n`;
  code += `    }\n`;
  code += `}`;

  return code;
}
