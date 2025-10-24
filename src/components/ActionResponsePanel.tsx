import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

interface ActionResponsePanelProps {
  action: any;
}

export default function ActionResponsePanel({ action }: ActionResponsePanelProps) {
  // Future: Will be used for switching between multiple response examples
  // const [activeResponse, setActiveResponse] = useState(0);

  // Get success and error responses
  const successResponses = action.responses?.filter((r: any) => r.success) || [];
  const errorResponses = action.responses?.filter((r: any) => !r.success) || [];

  const renderResponseFields = (fields: any[]) => {
    if (!fields || fields.length === 0) return null;

    return (
      <div className="space-y-2">
        {fields.map((field: any, index: number) => (
          <div key={index} className="border-l-2 border-grey-400 pl-3 py-1">
            <div className="flex items-center gap-2">
              <code className="text-sm font-semibold text-grey">{field.key}</code>
              <span className="text-xs text-grey-600">{field.type}</span>
              {field.required && (
                <span className="text-xs text-red">required</span>
              )}
            </div>
            {field.description && (
              <p className="text-xs text-grey-600 mt-1">{field.description}</p>
            )}
            {field.data && field.data.length > 0 && (
              <div className="ml-4 mt-2">{renderResponseFields(field.data)}</div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderSampleJson = (sample: string) => {
    try {
      const parsed = JSON.parse(sample);
      return (
        <pre className="bg-grey-100 p-4 rounded border border-grey-400 overflow-auto text-xs">
          <code>{JSON.stringify(parsed, null, 2)}</code>
        </pre>
      );
    } catch {
      return (
        <pre className="bg-grey-100 p-4 rounded border border-grey-400 overflow-auto text-xs">
          <code>{sample}</code>
        </pre>
      );
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-6 border-b border-grey-400">
        <h2 className="text-lg font-semibold text-grey">Response</h2>
        <p className="text-sm text-grey-600">Expected response format and structure</p>
      </div>

      {/* Response Content */}
      <div className="flex-1 overflow-auto">
        <Tabs defaultValue="success" className="h-full flex flex-col">
          <TabsList className="w-full justify-start px-6 border-b border-grey-400">
            <TabsTrigger value="success">
              Success Responses ({successResponses.length})
            </TabsTrigger>
            <TabsTrigger value="error">
              Error Responses ({errorResponses.length})
            </TabsTrigger>
          </TabsList>

          {/* Success Responses */}
          <TabsContent value="success" className="flex-1 p-6 overflow-auto">
            {successResponses.length > 0 ? (
              <div className="space-y-6">
                {successResponses.map((response: any, index: number) => (
                  <div key={index} className="border border-green rounded-lg p-4">
                    {/* Status Code */}
                    {response.status_code && (
                      <div className="mb-4">
                        <span className="px-3 py-1 rounded bg-green/10 text-green font-medium text-sm">
                          {response.status_code}
                        </span>
                      </div>
                    )}

                    {/* Sample Response */}
                    {response.body?.sample && (
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold text-grey mb-2">Sample Response</h4>
                        {renderSampleJson(response.body.sample)}
                      </div>
                    )}

                    {/* Response Fields */}
                    {response.body?.data && response.body.data.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-grey mb-2">Response Fields</h4>
                        {renderResponseFields(response.body.data)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-grey-600 py-12">
                <p>No success response defined for this action</p>
              </div>
            )}
          </TabsContent>

          {/* Error Responses */}
          <TabsContent value="error" className="flex-1 p-6 overflow-auto">
            {errorResponses.length > 0 ? (
              <div className="space-y-6">
                {errorResponses.map((response: any, index: number) => (
                  <div key={index} className="border border-red rounded-lg p-4">
                    {/* Status Code */}
                    {response.status_code && (
                      <div className="mb-4">
                        <span className="px-3 py-1 rounded bg-red/10 text-red font-medium text-sm">
                          {response.status_code}
                        </span>
                      </div>
                    )}

                    {/* Sample Response */}
                    {response.body?.sample && (
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold text-grey mb-2">Sample Response</h4>
                        {renderSampleJson(response.body.sample)}
                      </div>
                    )}

                    {/* Response Fields */}
                    {response.body?.data && response.body.data.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-grey mb-2">Response Fields</h4>
                        {renderResponseFields(response.body.data)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-grey-600 py-12">
                <p>No error response defined for this action</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Live Response Area (for actual execution results) */}
      <div className="border-t border-grey-400 p-6 bg-grey-50">
        <h3 className="text-sm font-semibold text-grey mb-2">Live Response</h3>
        <div className="bg-white border border-grey-400 rounded p-4 text-center text-grey-600 text-sm">
          Execute the action to see the live response here
        </div>
      </div>
    </div>
  );
}
