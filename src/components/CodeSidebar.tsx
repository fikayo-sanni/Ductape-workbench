import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Code, X, Copy, ChevronDown, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

interface CodeSection {
  title: string;
  code: string;
}

interface CodeSidebarProps {
  title: string;
  subtitle?: string;
  tag?: string;
  onClose: () => void;
  generateCodeSections: (language: string, env?: string) => CodeSection[];
  environments?: Array<{ slug: string; env_name?: string }>;
  additionalControls?: React.ReactNode;
  additionalControlsAfterSection?: string; // Section title after which to render additionalControls
  onSectionAction?: (sectionTitle: string) => React.ReactNode;
  sectionFooter?: (sectionTitle: string) => React.ReactNode;
}

export default function CodeSidebar({
  title,
  subtitle,
  tag,
  onClose,
  generateCodeSections,
  environments = [],
  additionalControls,
  additionalControlsAfterSection,
  onSectionAction,
  sectionFooter,
}: CodeSidebarProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<string>('typescript');
  const [selectedEnv, setSelectedEnv] = useState<string>(
    environments[0]?.slug || 'prd'
  );
  const [showInitialize, setShowInitialize] = useState(false);
  const [showTransactions, setShowTransactions] = useState(false);
  const [showConnection, setShowConnection] = useState(false);

  const sections = generateCodeSections(selectedLanguage, selectedEnv);

  const copySection = (code: string, sectionTitle: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`${sectionTitle} copied to clipboard`);
  };

  return (
    <div className="fixed top-0 right-0 h-full w-[600px] bg-white shadow-2xl border-l border-grey-300 z-50 overflow-y-auto">
      <div className="sticky top-0 bg-white border-b border-grey-300 p-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-grey flex items-center gap-2">
          <Code className="w-5 h-5" />
          Code Examples
        </h3>
        <Button onClick={onClose} variant="ghost" size="sm">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="p-4 space-y-6">
        {/* Component Details */}
        <div>
          <h4 className="text-lg font-bold text-grey mb-2">{title}</h4>
          {tag && (
            <span className="text-xs px-2 py-1 bg-primary/15 text-primary rounded font-mono">
              {tag}
            </span>
          )}
          {subtitle && (
            <p className="text-sm text-grey-600 mt-2">{subtitle}</p>
          )}
        </div>

        {/* Environment Selector */}
        {environments.length > 0 && (
          <div>
            <Label className="text-sm font-semibold text-grey-700 mb-2 block">
              Environment
            </Label>
            <Select value={selectedEnv} onValueChange={setSelectedEnv}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {environments.map((env) => (
                  <SelectItem key={env.slug} value={env.slug}>
                    {env.env_name || env.slug}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Language Selector */}
        <div>
          <Label className="text-sm font-semibold text-grey-700 mb-2 block">
            Language
          </Label>
          <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="typescript">TypeScript</SelectItem>
              <SelectItem value="javascript">JavaScript</SelectItem>
              <SelectItem value="python" disabled>Python</SelectItem>
              <SelectItem value="java" disabled>Java / Spring Boot</SelectItem>
              <SelectItem value="ruby" disabled>Ruby on Rails</SelectItem>
              <SelectItem value="php" disabled>PHP</SelectItem>
              <SelectItem value="kotlin" disabled>Kotlin</SelectItem>
              <SelectItem value="go" disabled>Golang</SelectItem>
              <SelectItem value="csharp" disabled>C# / ASP.NET</SelectItem>
              <SelectItem value="rust" disabled>Rust</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Additional Controls (before sections) */}
        {additionalControls && !additionalControlsAfterSection && (
          <div className="border-t border-grey-300 pt-4">
            {additionalControls}
          </div>
        )}

        {/* Code Sections */}
        <div className="space-y-4">
          {sections.map((section, index) => {
            const isInitialize = section.title.toLowerCase().includes('init');
            const isTransaction = section.title.toLowerCase().includes('transaction');
            const isConnection = section.title.toLowerCase().includes('connection');
            const isCollapsible = isInitialize || isTransaction || isConnection;
            const isHidden = (isInitialize && !showInitialize) || (isTransaction && !showTransactions) || (isConnection && !showConnection);
            const shouldRenderControlsAfter = additionalControlsAfterSection === section.title;

            return (
              <>
                <div key={index} className="space-y-2">
                  {isCollapsible ? (
                    <button
                      onClick={() => {
                        if (isInitialize) {
                          setShowInitialize(!showInitialize);
                        } else if (isTransaction) {
                          setShowTransactions(!showTransactions);
                        } else if (isConnection) {
                          setShowConnection(!showConnection);
                        }
                      }}
                      className="flex items-center gap-2 text-sm font-semibold text-grey-700 hover:text-primary transition-colors"
                    >
                      {(isInitialize && showInitialize) || (isTransaction && showTransactions) || (isConnection && showConnection) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      {section.title}
                    </button>
                  ) : (
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-semibold text-grey-700">
                        {section.title}
                      </Label>
                      <div className="flex items-center gap-2">
                        {onSectionAction && onSectionAction(section.title)}
                        <Button
                          onClick={() => copySection(section.code, section.title)}
                          variant="outline"
                          size="sm"
                          className="gap-2 h-7 px-2 text-xs"
                        >
                          <Copy className="h-3 w-3" />
                          Copy
                        </Button>
                      </div>
                    </div>
                  )}

                  {!isHidden && (
                    <>
                      {sectionFooter && sectionFooter(section.title)}
                      <Textarea
                        value={section.code}
                        readOnly
                        className="font-mono text-sm bg-grey-50 resize-none"
                        rows={section.code.split('\n').length}
                      />
                    </>
                  )}
                </div>

                {/* Render additional controls after this section if specified */}
                {shouldRenderControlsAfter && additionalControls && (
                  <div className="border-t border-grey-300 pt-4 mt-4">
                    {additionalControls}
                  </div>
                )}
              </>
            );
          })}
        </div>
      </div>
    </div>
  );
}
