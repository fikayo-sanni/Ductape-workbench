import { useState } from 'react';
import { useWorkbenchStore } from '@/stores/workbench-store';
import { Button } from './ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { SdkLanguage } from '@/types';

export default function CodeGenerator() {
  const { currentRequestId, requests } = useWorkbenchStore();
  const [language, setLanguage] = useState<SdkLanguage>('typescript');
  const [copied, setCopied] = useState(false);

  const currentRequest = requests.find(r => r.id === currentRequestId);

  if (!currentRequest) return null;

  const generateCode = (): string => {
    const enabledHeaders = currentRequest.headers.filter(h => h.enabled);
    const enabledParams = currentRequest.queryParams.filter(p => p.enabled);

    switch (language) {
      case 'typescript':
        return generateTypeScriptCode(enabledHeaders, enabledParams);
      case 'python':
        return generatePythonCode(enabledHeaders, enabledParams);
      case 'go':
        return generateGoCode(enabledHeaders, enabledParams);
      case 'java':
        return generateJavaCode(enabledHeaders, enabledParams);
      default:
        return '';
    }
  };

  const generateTypeScriptCode = (headers: typeof currentRequest.headers, params: typeof currentRequest.queryParams) => {
    const headersObj = headers.reduce((acc, h) => {
      if (h.key) acc[h.key] = h.value;
      return acc;
    }, {} as Record<string, string>);

    const paramsObj = params.reduce((acc, p) => {
      if (p.key) acc[p.key] = p.value;
      return acc;
    }, {} as Record<string, string>);

    let code = `import { Ductape } from '@ductape/sdk';\n\n`;
    code += `// Initialize Ductape SDK\n`;
    code += `const ductape = new Ductape({\n`;
    code += `  apiKey: process.env.DUCTAPE_API_KEY,\n`;
    code += `});\n\n`;

    code += `async function ${currentRequest.name.replace(/\s+/g, '')}() {\n`;
    code += `  try {\n`;

    if (currentRequest.method === 'GET') {
      code += `    const response = await ductape.http.get('${currentRequest.url}'`;
      if (headers.length > 0 || params.length > 0) {
        code += `, {\n`;
        if (headers.length > 0) {
          code += `      headers: ${JSON.stringify(headersObj, null, 6)},\n`;
        }
        if (params.length > 0) {
          code += `      params: ${JSON.stringify(paramsObj, null, 6)},\n`;
        }
        code += `    }`;
      }
      code += `);\n`;
    } else {
      code += `    const response = await ductape.http.${currentRequest.method.toLowerCase()}(\n`;
      code += `      '${currentRequest.url}',\n`;

      if (currentRequest.body.json) {
        try {
          const bodyObj = JSON.parse(currentRequest.body.json);
          code += `      ${JSON.stringify(bodyObj, null, 6)},\n`;
        } catch {
          code += `      ${currentRequest.body.json},\n`;
        }
      } else {
        code += `      {},\n`;
      }

      if (headers.length > 0) {
        code += `      {\n`;
        code += `        headers: ${JSON.stringify(headersObj, null, 8)}\n`;
        code += `      }\n`;
      }
      code += `    );\n`;
    }

    code += `\n    console.log('Response:', response.data);\n`;
    code += `    return response.data;\n`;
    code += `  } catch (error) {\n`;
    code += `    console.error('Error:', error);\n`;
    code += `    throw error;\n`;
    code += `  }\n`;
    code += `}\n\n`;
    code += `// Execute the request\n`;
    code += `${currentRequest.name.replace(/\s+/g, '')}();`;

    return code;
  };

  const generatePythonCode = (headers: typeof currentRequest.headers, params: typeof currentRequest.queryParams) => {
    const headersObj = headers.reduce((acc, h) => {
      if (h.key) acc[h.key] = h.value;
      return acc;
    }, {} as Record<string, string>);

    const paramsObj = params.reduce((acc, p) => {
      if (p.key) acc[p.key] = p.value;
      return acc;
    }, {} as Record<string, string>);

    let code = `from ductape import Ductape\nimport os\n\n`;
    code += `# Initialize Ductape SDK\n`;
    code += `ductape = Ductape(\n`;
    code += `    api_key=os.environ.get('DUCTAPE_API_KEY')\n`;
    code += `)\n\n`;

    code += `def ${currentRequest.name.replace(/\s+/g, '_').toLowerCase()}():\n`;
    code += `    try:\n`;

    if (currentRequest.method === 'GET') {
      code += `        response = ductape.http.get(\n`;
      code += `            '${currentRequest.url}'`;
      if (headers.length > 0 || params.length > 0) {
        code += `,\n`;
        if (headers.length > 0) {
          code += `            headers=${JSON.stringify(headersObj)},\n`;
        }
        if (params.length > 0) {
          code += `            params=${JSON.stringify(paramsObj)},\n`;
        }
      }
      code += `\n        )\n`;
    } else {
      code += `        response = ductape.http.${currentRequest.method.toLowerCase()}(\n`;
      code += `            '${currentRequest.url}',\n`;

      if (currentRequest.body.json) {
        code += `            data=${currentRequest.body.json},\n`;
      }

      if (headers.length > 0) {
        code += `            headers=${JSON.stringify(headersObj)}\n`;
      }
      code += `        )\n`;
    }

    code += `\n        print('Response:', response.json())\n`;
    code += `        return response.json()\n`;
    code += `    except Exception as error:\n`;
    code += `        print('Error:', error)\n`;
    code += `        raise\n\n`;
    code += `# Execute the request\n`;
    code += `${currentRequest.name.replace(/\s+/g, '_').toLowerCase()}()`;

    return code;
  };

  const generateGoCode = (headers: typeof currentRequest.headers, _params: typeof currentRequest.queryParams) => {
    let code = `package main\n\n`;
    code += `import (\n`;
    code += `    "fmt"\n`;
    code += `    "os"\n`;
    code += `    "github.com/ductape/ductape-go"\n`;
    code += `)\n\n`;

    code += `func main() {\n`;
    code += `    // Initialize Ductape SDK\n`;
    code += `    client := ductape.NewClient(os.Getenv("DUCTAPE_API_KEY"))\n\n`;

    code += `    // Prepare headers\n`;
    code += `    headers := map[string]string{\n`;
    headers.forEach(h => {
      if (h.key) {
        code += `        "${h.key}": "${h.value}",\n`;
      }
    });
    code += `    }\n\n`;

    if (currentRequest.method === 'GET') {
      code += `    // Make GET request\n`;
      code += `    resp, err := client.HTTP.Get("${currentRequest.url}", headers)\n`;
    } else {
      code += `    // Prepare request body\n`;
      if (currentRequest.body.json) {
        code += `    body := []byte(\`${currentRequest.body.json}\`)\n\n`;
      } else {
        code += `    body := []byte("{}")\n\n`;
      }
      code += `    // Make ${currentRequest.method} request\n`;
      code += `    resp, err := client.HTTP.${currentRequest.method[0] + currentRequest.method.slice(1).toLowerCase()}("${currentRequest.url}", body, headers)\n`;
    }

    code += `    if err != nil {\n`;
    code += `        fmt.Println("Error:", err)\n`;
    code += `        return\n`;
    code += `    }\n\n`;
    code += `    fmt.Println("Response:", resp)\n`;
    code += `}`;

    return code;
  };

  const generateJavaCode = (headers: typeof currentRequest.headers, _params: typeof currentRequest.queryParams) => {
    let code = `import com.ductape.Ductape;\n`;
    code += `import com.ductape.http.HTTPClient;\n\n`;

    code += `public class DuctapeRequest {\n`;
    code += `    public static void main(String[] args) {\n`;
    code += `        // Initialize Ductape SDK\n`;
    code += `        Ductape ductape = new Ductape(System.getenv("DUCTAPE_API_KEY"));\n`;
    code += `        HTTPClient http = ductape.getHTTP();\n\n`;

    code += `        try {\n`;
    code += `            // Prepare headers\n`;
    code += `            Map<String, String> headers = new HashMap<>();\n`;
    headers.forEach(h => {
      if (h.key) {
        code += `            headers.put("${h.key}", "${h.value}");\n`;
      }
    });
    code += `\n`;

    if (currentRequest.method === 'GET') {
      code += `            // Make GET request\n`;
      code += `            Response response = http.get("${currentRequest.url}", headers);\n`;
    } else {
      code += `            // Prepare request body\n`;
      if (currentRequest.body.json) {
        code += `            String body = "${currentRequest.body.json.replace(/\n/g, ' ').replace(/"/g, '\\"')}";\n\n`;
      } else {
        code += `            String body = "{}";\n\n`;
      }
      code += `            // Make ${currentRequest.method} request\n`;
      code += `            Response response = http.${currentRequest.method.toLowerCase()}("${currentRequest.url}", body, headers);\n`;
    }

    code += `\n            System.out.println("Response: " + response.getData());\n`;
    code += `        } catch (Exception e) {\n`;
    code += `            System.err.println("Error: " + e.getMessage());\n`;
    code += `            e.printStackTrace();\n`;
    code += `        }\n`;
    code += `    }\n`;
    code += `}`;

    return code;
  };

  const generatedCode = generateCode();

  const copyCode = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    toast.success('Code copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-grey">Generate Code with Ductape SDK</h3>
          <p className="text-xs text-grey-600">
            Generate ready-to-use code for your request using the Ductape SDK
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={copyCode}>
          {copied ? (
            <Check className="h-4 w-4 mr-1" />
          ) : (
            <Copy className="h-4 w-4 mr-1" />
          )}
          Copy Code
        </Button>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-grey-600">Language</label>
        <Select value={language} onValueChange={(val) => setLanguage(val as SdkLanguage)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="typescript">TypeScript</SelectItem>
            <SelectItem value="python">Python</SelectItem>
            <SelectItem value="go">Go</SelectItem>
            <SelectItem value="java">Java</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-grey-600">Generated Code</label>
        <pre className="p-4 bg-grey-100 border border-grey-400 rounded-md overflow-auto text-xs font-mono max-h-[500px]">
          {generatedCode}
        </pre>
      </div>

      <div className="p-3 bg-blue-300 border border-primary/20 rounded-md">
        <p className="text-xs text-grey-600">
          <strong>Note:</strong> Make sure you have the Ductape SDK installed and configured with your API key.
          Visit the{' '}
          <a href="#" className="text-primary underline">
            Ductape documentation
          </a>{' '}
          for installation instructions.
        </p>
      </div>
    </div>
  );
}
