import { useState } from 'react';
import { KeyRound, Clock, Tag, FileJson, Code } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { MarkdownViewer } from '@/components/ui/markdown-editor';
import CodeSidebar from '@/components/CodeSidebar';

interface SessionTabContentProps {
  session: any;
}

export default function SessionTabContent({ session }: SessionTabContentProps) {
  const [showCodeSidebar, setShowCodeSidebar] = useState(false);
  // Early return if session is not provided
  if (!session) {
    return (
      <div className="h-full flex items-center justify-center bg-grey-100 p-6">
        <div className="text-center text-grey-600 max-w-md">
          <p className="text-lg mb-2">Session data not available</p>
          <p className="text-sm">Unable to load session information</p>
        </div>
      </div>
    );
  }

  // Extract product info for header
  const product = session.productName && session.productTag ? {
    name: session.productName,
    tag: session.productTag,
    logo: session.productLogo,
  } : null;

  const formatDuration = (value: number, period: string) => {
    return `${value} ${period}`;
  };

  const formatSchema = (schema: any) => {
    if (typeof schema === 'string') {
      try {
        return JSON.stringify(JSON.parse(schema), null, 2);
      } catch {
        return schema;
      }
    }
    return JSON.stringify(schema, null, 2);
  };

  // Generate SDK code examples for session management
  const generateCodeSections = (language: string) => {
    if (!session) return [];

    const productTag = session.productTag || 'your_product_tag';
    const sessionTag = session.tag;
    const selector = session.selector || 'user_id';

    const sections = [];

    if (language === 'typescript') {
      sections.push({
        title: 'Initialize SDK',
        code: `import { Ductape } from '@ductape/sdk';

const ductape = new Ductape({
  workspace_id: 'your_workspace_id',
  user_id: 'your_user_id',
  token: 'your_auth_token',
  public_key: 'your_public_key'
});

// Initialize product
await ductape.product.init('${productTag}');`,
      });

      sections.push({
        title: 'Create Session',
        code: `// Create a new session for a user
const sessionData = {
  ${selector}: 'user_123',
  // Add other session data according to your schema
};

const result = await ductape.product.session.create({
  tag: '${sessionTag}',
  data: sessionData
});

console.log('Session created:', result);`,
      });

      sections.push({
        title: 'Validate Session',
        code: `// Validate an active session
const isValid = await ductape.product.session.validate({
  tag: '${sessionTag}',
  ${selector}: 'user_123'
});

if (isValid) {
  console.log('Session is valid');
} else {
  console.log('Session is invalid or expired');
}`,
      });

      sections.push({
        title: 'Get Session Data',
        code: `// Retrieve session data
const sessionData = await ductape.product.session.get({
  tag: '${sessionTag}',
  ${selector}: 'user_123'
});

console.log('Session data:', sessionData);`,
      });

      sections.push({
        title: 'Update Session',
        code: `// Update session data
await ductape.product.session.update({
  tag: '${sessionTag}',
  ${selector}: 'user_123',
  data: {
    // Updated session data
    last_activity: new Date().toISOString()
  }
});`,
      });

      sections.push({
        title: 'Delete Session',
        code: `// Delete/logout a session
await ductape.product.session.delete({
  tag: '${sessionTag}',
  ${selector}: 'user_123'
});

console.log('Session deleted');`,
      });
    } else if (language === 'python') {
      sections.push({
        title: 'Initialize SDK',
        code: `from ductape import Ductape

ductape = Ductape(
    workspace_id='your_workspace_id',
    user_id='your_user_id',
    token='your_auth_token',
    public_key='your_public_key'
)

# Initialize product
ductape.product.init('${productTag}')`,
      });

      sections.push({
        title: 'Create Session',
        code: `# Create a new session for a user
session_data = {
    '${selector}': 'user_123',
    # Add other session data according to your schema
}

result = ductape.product.session.create(
    tag='${sessionTag}',
    data=session_data
)

print('Session created:', result)`,
      });

      sections.push({
        title: 'Validate Session',
        code: `# Validate an active session
is_valid = ductape.product.session.validate(
    tag='${sessionTag}',
    ${selector}='user_123'
)

if is_valid:
    print('Session is valid')
else:
    print('Session is invalid or expired')`,
      });

      sections.push({
        title: 'Get Session Data',
        code: `# Retrieve session data
session_data = ductape.product.session.get(
    tag='${sessionTag}',
    ${selector}='user_123'
)

print('Session data:', session_data)`,
      });

      sections.push({
        title: 'Update Session',
        code: `# Update session data
ductape.product.session.update(
    tag='${sessionTag}',
    ${selector}='user_123',
    data={
        # Updated session data
        'last_activity': datetime.now().isoformat()
    }
)`,
      });

      sections.push({
        title: 'Delete Session',
        code: `# Delete/logout a session
ductape.product.session.delete(
    tag='${sessionTag}',
    ${selector}='user_123'
)

print('Session deleted')`,
      });
    }

    return sections;
  };

  return (
    <div className="h-full overflow-auto bg-grey-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Product Context Header */}
        {product && (
          <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20 p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-lg bg-primary flex items-center justify-center text-white text-xl font-semibold flex-shrink-0">
                {product.logo ? (
                  <img
                    src={product.logo}
                    alt={product.name}
                    className="w-full h-full rounded-lg object-cover"
                  />
                ) : (
                  product.name?.split(' ').map((word: string) => word[0]).join('').toUpperCase().slice(0, 2)
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-xl font-bold text-grey">Session for {product.name}</h2>
                  <span className="px-2 py-1 bg-primary/20 text-primary text-xs font-medium rounded">
                    {product.tag}
                  </span>
                </div>
                <p className="text-sm text-grey-600">
                  This session is connected to your product for user authentication
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
              <KeyRound className="h-6 w-6 text-blue-500" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h1 className="text-2xl font-bold text-grey">{session?.name}</h1>
                <Button
                  onClick={() => setShowCodeSidebar(true)}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Code className="h-4 w-4" />
                  <span>Code</span>
                </Button>
              </div>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-sm text-grey-600 flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  <span className="font-mono">{session?.tag}</span>
                </span>
                {session?.expiry !== undefined && session?.period && (
                  <span className="px-2 py-1 rounded text-xs font-medium bg-blue-500/10 text-blue-600 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDuration(session?.expiry, session?.period)}
                  </span>
                )}
                {session?.selector && (
                  <span className="px-2 py-1 rounded text-xs font-medium bg-grey-100 text-grey-600">
                    Selector: {session?.selector}
                  </span>
                )}
              </div>
              {session?.description && (
                <div className="text-sm text-grey-600">
                  <MarkdownViewer content={session?.description} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Session Configuration */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-grey mb-4">Session Configuration</h2>

          <div className="space-y-4">
            {/* Session Name */}
            <div>
              <Label className="text-sm font-semibold text-grey">Session Name</Label>
              <Input
                value={session?.name || ''}
                readOnly
                className="mt-2"
              />
            </div>

            {/* Session Tag */}
            <div>
              <Label className="text-sm font-semibold text-grey">Tag</Label>
              <Input
                value={session?.tag || ''}
                readOnly
                className="mt-2 font-mono"
              />
            </div>

            {/* Expiry and Period */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-semibold text-grey">Expiry Duration</Label>
                <Input
                  value={session?.expiry || 0}
                  readOnly
                  className="mt-2"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold text-grey">Time Period</Label>
                <Input
                  value={session?.period || ''}
                  readOnly
                  className="mt-2"
                />
              </div>
            </div>
            <p className="text-xs text-grey-600">
              Session will expire after {formatDuration(session?.expiry || 0, session?.period || 'MINUTES')}
            </p>

            {/* Selector */}
            <div>
              <Label className="text-sm font-semibold text-grey">Selector</Label>
              <Input
                value={session?.selector || ''}
                readOnly
                className="mt-2"
              />
              <p className="text-xs text-grey-600 mt-1">
                Field used to uniquely identify the session
              </p>
            </div>

            {/* Schema */}
            <div>
              <Label className="text-sm font-semibold text-grey flex items-center gap-2">
                <FileJson className="h-4 w-4" />
                Schema (JSON)
              </Label>
              <textarea
                value={formatSchema(session?.schema || {})}
                readOnly
                className="mt-2 w-full min-h-[200px] px-3 py-2 text-sm text-grey rounded-md border border-grey-400 bg-white resize-none font-mono"
              />
              <p className="text-xs text-grey-600 mt-1">
                JSON schema defining the session data structure
              </p>
            </div>

            {/* Description */}
            {session?.description && (
              <div>
                <Label className="text-sm font-semibold text-grey">Description</Label>
                <div className="mt-2 p-3 rounded-md border border-grey-400 bg-white">
                  <MarkdownViewer content={session?.description} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Session Behavior Info */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-grey mb-4">How Sessions Work</h2>
          <div className="space-y-3 text-sm text-grey-600">
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                1
              </span>
              <div>
                <p className="font-semibold text-grey">Session Creation</p>
                <p className="text-xs">A session is created when a user authenticates, storing session data according to your schema</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                2
              </span>
              <div>
                <p className="font-semibold text-grey">Session Validation</p>
                <p className="text-xs">The selector field is used to uniquely identify and validate active sessions</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                3
              </span>
              <div>
                <p className="font-semibold text-grey">Session Expiry</p>
                <p className="text-xs">Sessions automatically expire after {formatDuration(session?.expiry || 0, session?.period || 'MINUTES')}, requiring re-authentication</p>
              </div>
            </div>
          </div>
        </div>

        {/* Security Benefits */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <KeyRound className="h-5 w-5 text-blue-500" />
              <h3 className="text-sm font-semibold text-grey">Secure Authentication</h3>
            </div>
            <p className="text-xs text-grey-600">
              Sessions provide secure token-based authentication for your users
            </p>
          </div>

          <div className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-orange-500" />
              <h3 className="text-sm font-semibold text-grey">Automatic Expiry</h3>
            </div>
            <p className="text-xs text-grey-600">
              Sessions automatically expire after the configured duration for security
            </p>
          </div>

          <div className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <FileJson className="h-5 w-5 text-green" />
              <h3 className="text-sm font-semibold text-grey">Flexible Schema</h3>
            </div>
            <p className="text-xs text-grey-600">
              Define custom session data structures based on your application needs
            </p>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-grey mb-2">ℹ️ About Sessions</h3>
          <p className="text-xs text-grey-600">
            Sessions manage user authentication state with configurable expiry periods. The selector field uniquely identifies sessions, while the schema defines what data is stored in each session?. Shorter expiry periods provide better security but may require more frequent re-authentication.
          </p>
        </div>
      </div>

      {/* Code Sidebar */}
      {showCodeSidebar && (
        <CodeSidebar
          title={session.name}
          subtitle={`Manage user sessions using the ${session.tag} session`}
          tag={session.tag}
          onClose={() => setShowCodeSidebar(false)}
          generateCodeSections={generateCodeSections}
        />
      )}
    </div>
  );
}

