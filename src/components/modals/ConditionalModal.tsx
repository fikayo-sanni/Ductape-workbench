/**
 * Conditional Modal - Configure Loop and Check Conditions
 *
 * Allows users to set up conditional logic for events in the feature builder
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, CheckCircle2, Info, Plus } from 'lucide-react';
import { IFeatureInput } from '@ductape/sdk/dist/types';

interface Component {
  id: string;
  name: string;
  type: string;
}

interface Sequence {
  id: string;
  name: string;
  components: string[];
}

interface ConditionalConfig {
  type: 'loop' | 'check' | '';
  valueSource: 'index' | 'input' | 'sequence' | '';
  inputKey?: string;
  sequenceId?: string;
  eventId?: string;
  valueKey?: string;
  operator?: '>' | '<' | '>=' | '<=' | '==' | '!=';
  compareValue?: string;
  iter?: number;
  init?: number;
}

interface ConditionalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: ConditionalConfig) => void;
  currentConfig: ConditionalConfig | null;
  componentName: string;
  featureInputs: Record<string, IFeatureInput>;
  sequences: Sequence[];
  selectedComponents: Component[];
  componentIndex: number; // To determine if this is the first sequence
  onAddInput?: (input: IFeatureInput) => void;
}

export default function ConditionalModal({
  isOpen,
  onClose,
  onSave,
  currentConfig,
  componentName,
  featureInputs,
  sequences,
  selectedComponents,
  componentIndex,
  onAddInput
}: ConditionalModalProps) {
  const [config, setConfig] = useState<ConditionalConfig>(
    currentConfig || {
      type: '',
      valueSource: '',
      init: 0,
      iter: 1,
      operator: '<'
    }
  );

  const [showAddInput, setShowAddInput] = useState(false);
  const [newInputName, setNewInputName] = useState('');
  const [newInputType, setNewInputType] = useState('number');
  const [newInputMinLength, setNewInputMinLength] = useState<number>(0);
  const [newInputMaxLength, setNewInputMaxLength] = useState<number>(100);

  useEffect(() => {
    if (currentConfig) {
      setConfig(currentConfig);
    }
  }, [currentConfig]);

  // Get numeric inputs
  const numericInputs = Object.entries(featureInputs).filter(([_, input]) =>
    input.type === 'number' || input.type === 'float' || input.type === 'double'
  );

  // Get array inputs
  const arrayInputs = Object.entries(featureInputs).filter(([_key, input]) =>
    input.type?.startsWith('array')
  );
  // Suppress unused variable warning
  void arrayInputs;

  // Find which sequence the current component belongs to
  const currentComponent = selectedComponents[componentIndex];
  const currentSequenceIndex = sequences.findIndex(seq =>
    seq.components.includes(currentComponent?.id)
  );

  // Check if this is the first event in its sequence
  const currentSequence = sequences[currentSequenceIndex];
  const isFirstEventInSequence = currentSequence &&
    currentSequence.components.indexOf(currentComponent?.id) === 0;

  // Get available sequences for selection (only sequences that come before the current sequence)
  const availableSequences = sequences.filter((_seq, idx) => {
    // Only show sequences that come before the current event's sequence
    return idx < currentSequenceIndex;
  });

  const handleSave = () => {
    // Validate required fields
    if (!config.type) return;

    if (config.type === 'loop' || config.type === 'check') {
      if (!config.valueSource) return;

      if (config.valueSource === 'input' && !config.inputKey) return;
      if (config.valueSource === 'sequence' && (!config.sequenceId || !config.eventId || !config.valueKey)) return;
      if (config.type === 'check' && (!config.operator || !config.compareValue)) return;
    }

    onSave(config);
    onClose();
  };

  const handleAddNewInput = () => {
    if (!newInputName.trim()) return;

    const newInput: any = {
      name: newInputName,
      type: newInputType,
      required: true,
      minlength: newInputMinLength,
      maxlength: newInputMaxLength,
    };

    onAddInput?.(newInput);
    setConfig({ ...config, inputKey: newInputName });
    setShowAddInput(false);
    setNewInputName('');
    setNewInputMinLength(0);
    setNewInputMaxLength(100);
  };

  const getComparisonValue = () => {
    if (!config.valueSource) return '';

    if (config.valueSource === 'index') {
      return '$Index';
    } else if (config.valueSource === 'input' && config.inputKey) {
      const input = featureInputs[config.inputKey];
      // Check if it's an array type to wrap with $Length
      if (input && input.type?.startsWith('array')) {
        return `$Length{$Input{${config.inputKey}}}`;
      }
      return `$Input{${config.inputKey}}`;
    } else if (config.valueSource === 'sequence' && config.sequenceId && config.eventId && config.valueKey) {
      const valueRef = `$Sequence{${config.sequenceId}:${config.eventId}:${config.valueKey}}`;
      // Check if it's an array type to wrap with $Length
      // TODO: Get the actual output type from the event's action schema
      const isArray = config.valueKey === 'data'; // Simplified - should check actual output schema
      return isArray ? `$Length{${valueRef}}` : valueRef;
    }
    return '';
  };

  const getPreviewExpression = () => {
    const value = getComparisonValue();
    if (!value) return '';

    if (config.type === 'loop') {
      return `${value} ${config.operator || '<'} ${config.compareValue || '10'}`;
    } else if (config.type === 'check') {
      return `${value} ${config.operator || '>'} ${config.compareValue || '0'}`;
    }
    return '';
  };

  const isOperatorAllowed = (op: string) => {
    // Numeric operators only for numeric values
    const numericOps = ['>', '<', '>=', '<='];
    if (numericOps.includes(op)) {
      if (config.valueSource === 'index') return true;
      if (config.valueSource === 'input') {
        const input = featureInputs[config.inputKey || ''];
        return input && ['number', 'float', 'double'].includes(input.type);
      }
      if (config.valueSource === 'sequence') {
        // TODO: Check actual output type
        return true; // Simplified
      }
    }
    return true; // ==, != work for all types
  };

  // Get the data type of the currently selected value source
  const getValueSourceType = (): string => {
    if (config.valueSource === 'index') {
      return 'number';
    } else if (config.valueSource === 'input' && config.inputKey) {
      const input = featureInputs[config.inputKey];
      if (input) {
        // If it's an array, the length comparison is numeric
        if (input.type?.startsWith('array')) {
          return 'number';
        }
        return input.type || 'string';
      }
    } else if (config.valueSource === 'sequence') {
      // TODO: Get actual type from sequence output schema
      // For now, assume numeric if checking array length
      return 'number';
    }
    return 'string';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 gap-0 flex flex-col overflow-hidden">
        {/* Header - Fixed */}
        <div className="px-6 pt-6 pb-4 border-b border-grey-400">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-primary" />
              Configure Condition for {componentName}
            </DialogTitle>
            <DialogDescription>
              Add conditional logic to control when and how this event executes
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Condition Type */}
          <div>
            <Label className="required">Condition Type</Label>
            <Select
              value={config.type}
              onValueChange={(value: 'loop' | 'check' | '') => {
                setConfig({
                  ...config,
                  type: value,
                  valueSource: value === 'loop' ? 'index' : '',
                  operator: value === 'loop' ? '<' : '>',
                  init: 0,
                  iter: 1
                });
              }}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select condition type..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="loop">
                  <div className="flex flex-col py-1">
                    <span className="font-medium">Loop</span>
                    <span className="text-xs text-grey-500">Repeat this event multiple times</span>
                  </div>
                </SelectItem>
                <SelectItem value="check">
                  <div className="flex flex-col py-1">
                    <span className="font-medium">Check</span>
                    <span className="text-xs text-grey-500">Skip this event if condition fails</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {config.type && (
            <>
              {/* Value Source */}
              <div>
                <Label className="required">Value Source</Label>
                <Select
                  value={config.valueSource}
                  onValueChange={(value: 'index' | 'input' | 'sequence') => {
                    setConfig({
                      ...config,
                      valueSource: value,
                      inputKey: undefined,
                      sequenceId: undefined,
                      eventId: undefined,
                      valueKey: undefined
                    });
                  }}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Choose where the value comes from..." />
                  </SelectTrigger>
                  <SelectContent>
                    {config.type === 'loop' && (
                      <SelectItem value="index">
                        <div className="flex flex-col py-1">
                          <span className="font-medium">Index</span>
                          <span className="text-xs text-grey-500">Simple counter (0, 1, 2...)</span>
                        </div>
                      </SelectItem>
                    )}
                    <SelectItem value="input">
                      <div className="flex flex-col py-1">
                        <span className="font-medium">Input</span>
                        <span className="text-xs text-grey-500">Use a feature input value</span>
                      </div>
                    </SelectItem>
                    {!isFirstEventInSequence && availableSequences.length > 0 && (
                      <SelectItem value="sequence">
                        <div className="flex flex-col py-1">
                          <span className="font-medium">Sequence</span>
                          <span className="text-xs text-grey-500">Use output from a previous sequence</span>
                        </div>
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {(isFirstEventInSequence || availableSequences.length === 0) && config.type === 'check' && (
                  <p className="text-xs text-orange-600 mt-2 flex items-start gap-1">
                    <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    {availableSequences.length === 0
                      ? 'No previous sequences available'
                      : 'Sequence source is not available for the first event in a sequence'}
                  </p>
                )}
              </div>

              {/* INDEX Configuration */}
              {config.valueSource === 'index' && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-4">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                    <div className="text-sm text-blue-900">
                      <strong>Index Mode:</strong> Creates a simple counter that increments with each iteration.
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm">Initial Value</Label>
                      <Input
                        type="number"
                        value={config.init}
                        onChange={(e) => setConfig({ ...config, init: parseInt(e.target.value) || 0 })}
                        className="mt-2"
                      />
                      <p className="text-xs text-grey-600 mt-1">Starting value for $Index</p>
                    </div>
                    <div>
                      <Label className="text-sm">Iteration Step</Label>
                      <Input
                        type="number"
                        value={config.iter}
                        onChange={(e) => setConfig({ ...config, iter: parseInt(e.target.value) || 1 })}
                        className="mt-2"
                      />
                      <p className="text-xs text-grey-600 mt-1">Increment by this amount</p>
                    </div>
                  </div>
                </div>
              )}

              {/* INPUT Configuration */}
              {config.valueSource === 'input' && (
                <div className="space-y-4">
                  <div>
                    <Label className="required">Select Input</Label>
                    <Select
                      value={config.inputKey}
                      onValueChange={(value) => {
                        if (value === '__ADD_NEW__') {
                          setShowAddInput(true);
                        } else {
                          const selectedInput = featureInputs[value];
                          const updates: Partial<ConditionalConfig> = { inputKey: value };

                          // Auto-set defaults for boolean inputs
                          if (selectedInput && selectedInput.type === 'boolean') {
                            updates.operator = '==';
                            updates.compareValue = 'true';
                          }

                          setConfig({ ...config, ...updates });
                        }
                      }}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Choose an input..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(config.type === 'loop' ? numericInputs : Object.entries(featureInputs)).map(([key, input]) => (
                          <SelectItem key={key} value={key}>
                            <div className="flex items-center gap-2">
                              <code className="text-xs">$Input{'{' + key + '}'}</code>
                              <span className="text-xs text-grey-500">({input.type})</span>
                            </div>
                          </SelectItem>
                        ))}
                        <SelectItem value="__ADD_NEW__" className="border-t">
                          <div className="flex items-center gap-2 text-primary">
                            <Plus className="h-3 w-3" />
                            <span className="font-medium">Add New Input</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {showAddInput && (
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-semibold">Add New Input</Label>
                        <Button size="sm" variant="ghost" onClick={() => {
                          setShowAddInput(false);
                          setNewInputName('');
                          setNewInputType('number');
                          setNewInputMinLength(0);
                          setNewInputMaxLength(100);
                        }}>Cancel</Button>
                      </div>
                      <div>
                        <Label className="text-xs required">Input Name</Label>
                        <Input
                          value={newInputName}
                          onChange={(e) => setNewInputName(e.target.value)}
                          placeholder="e.g., count"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs required">Data Type</Label>
                        <Select value={newInputType} onValueChange={setNewInputType}>
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="number">Number (integer)</SelectItem>
                            <SelectItem value="float">Float</SelectItem>
                            <SelectItem value="double">Double</SelectItem>
                            <SelectItem value="string">String</SelectItem>
                            <SelectItem value="boolean">Boolean</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs required">Min Length</Label>
                          <Input
                            type="number"
                            value={newInputMinLength}
                            onChange={(e) => setNewInputMinLength(parseInt(e.target.value) || 0)}
                            placeholder="0"
                            className="mt-1"
                            min={0}
                          />
                        </div>
                        <div>
                          <Label className="text-xs required">Max Length</Label>
                          <Input
                            type="number"
                            value={newInputMaxLength}
                            onChange={(e) => setNewInputMaxLength(parseInt(e.target.value) || 100)}
                            placeholder="100"
                            className="mt-1"
                            min={1}
                          />
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={handleAddNewInput}
                        className="w-full"
                        disabled={!newInputName.trim() || newInputMinLength < 0 || newInputMaxLength < 1 || newInputMaxLength < newInputMinLength}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Input
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* SEQUENCE Configuration */}
              {config.valueSource === 'sequence' && (
                <div className="space-y-4">
                  <div className="p-3 bg-purple-50 rounded border border-purple-200 text-sm text-purple-900">
                    <Info className="h-4 w-4 inline mr-2" />
                    Select a previous sequence, then an event, then a value from that event's output
                  </div>

                  {/* Step 1: Select Sequence */}
                  <div>
                    <Label className="required">1. Select Sequence</Label>
                    <Select
                      value={config.sequenceId}
                      onValueChange={(value) => {
                        setConfig({
                          ...config,
                          sequenceId: value,
                          eventId: undefined,
                          valueKey: undefined
                        });
                      }}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Choose a sequence..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSequences.length === 0 ? (
                          <div className="px-2 py-3 text-sm text-grey-500 text-center">
                            No previous sequences available
                          </div>
                        ) : (
                          availableSequences.map(seq => (
                            <SelectItem key={seq.id} value={seq.id}>
                              {seq.name} ({seq.components.length} events)
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Step 2: Select Event from Sequence */}
                  {config.sequenceId && (
                    <div>
                      <Label className="required">2. Select Event</Label>
                      <Select
                        value={config.eventId}
                        onValueChange={(value) => {
                          setConfig({
                            ...config,
                            eventId: value,
                            valueKey: undefined
                          });
                        }}
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Choose an event..." />
                        </SelectTrigger>
                        <SelectContent>
                          {(() => {
                            const sequence = sequences.find(s => s.id === config.sequenceId);
                            if (!sequence) return null;

                            return sequence.components.map(compId => {
                              const comp = selectedComponents.find(c => c.id === compId);
                              if (!comp) return null;

                              return (
                                <SelectItem key={compId} value={compId}>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{comp.name}</span>
                                    <span className="text-xs text-grey-500">({comp.type})</span>
                                  </div>
                                </SelectItem>
                              );
                            });
                          })()}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Step 3: Select Value/Output from Event */}
                  {config.sequenceId && config.eventId && (
                    <div>
                      <Label className="required">3. Select Output Value</Label>
                      <Select
                        value={config.valueKey}
                        onValueChange={(value) => {
                          setConfig({ ...config, valueKey: value });
                        }}
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Choose an output value..." />
                        </SelectTrigger>
                        <SelectContent>
                          {(() => {
                            const event = selectedComponents.find(c => c.id === config.eventId);
                            if (!event) return null;

                            // Get the component's output schema based on type
                            // For action-based components, we need to look at the action's output schema
                            const outputs: Array<{ key: string; type: string; label: string }> = [];

                            // TODO: This needs to be populated based on the actual component's action output schema
                            // For now, showing placeholder structure
                            if (event.type === 'Applications' || event.type === 'Databases' || event.type === 'Storage') {
                              // These would come from the action's output schema
                              outputs.push(
                                { key: 'response', type: 'object', label: 'Response' },
                                { key: 'status', type: 'number', label: 'Status Code' },
                                { key: 'data', type: 'array', label: 'Data Array' }
                              );
                            }

                            // Filter based on condition type
                            const filteredOutputs = outputs.filter(output => {
                              if (config.type === 'loop') {
                                // For loops, show numeric and array types
                                return ['number', 'float', 'double'].includes(output.type) ||
                                       output.type.startsWith('array');
                              }
                              return true; // For checks, show all
                            });

                            if (filteredOutputs.length === 0) {
                              return (
                                <div className="px-2 py-3 text-sm text-grey-500 text-center">
                                  No compatible output values found
                                </div>
                              );
                            }

                            return filteredOutputs.map(output => (
                              <SelectItem key={output.key} value={output.key}>
                                <div className="flex items-center gap-2">
                                  <code className="text-xs">{output.label}</code>
                                  <span className="text-xs text-grey-500">({output.type})</span>
                                  {output.type.startsWith('array') && (
                                    <span className="text-xs text-purple-600">→ $Length</span>
                                  )}
                                </div>
                              </SelectItem>
                            ));
                          })()}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-grey-500 mt-2">
                        {(() => {
                          if (!config.valueKey) return 'Select a value to continue';

                          // Check if selected value is an array type
                          const _event = selectedComponents.find(c => c.id === config.eventId);
                          // TODO: Get actual type from action schema
                          const isArray = config.valueKey === 'data'; // Simplified check
                          void _event; // Suppress unused variable warning

                          if (isArray) {
                            return '✓ Array type - will automatically use $Length{} wrapper';
                          }
                          return '✓ Numeric value selected';
                        })()}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Operator and Compare Value */}

              {config.valueSource && (
                <div className="space-y-4 p-4 bg-grey-50 rounded-lg border">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="required">Operator</Label>
                      <Select
                        value={config.operator}
                        onValueChange={(value: any) => setConfig({ ...config, operator: value })}
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="<" disabled={!isOperatorAllowed('<')}>Less than (&lt;)</SelectItem>
                          <SelectItem value="<=" disabled={!isOperatorAllowed('<=')}>Less than or equal (&lt;=)</SelectItem>
                          <SelectItem value=">" disabled={!isOperatorAllowed('>')}>Greater than (&gt;)</SelectItem>
                          <SelectItem value=">=" disabled={!isOperatorAllowed('>=')}>Greater than or equal (&gt;=)</SelectItem>
                          <SelectItem value="==">Equal (==)</SelectItem>
                          <SelectItem value="!=">Not equal (!=)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="required">Compare Value</Label>
                      {(() => {
                        const valueType = getValueSourceType();

                        if (valueType === 'boolean') {
                          return (
                            <Select
                              value={config.compareValue || 'true'}
                              onValueChange={(value) => setConfig({ ...config, compareValue: value })}
                            >
                              <SelectTrigger className="mt-2">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="true">true</SelectItem>
                                <SelectItem value="false">false</SelectItem>
                              </SelectContent>
                            </Select>
                          );
                        } else if (['number', 'float', 'double'].includes(valueType)) {
                          return (
                            <Input
                              type="number"
                              value={config.compareValue || ''}
                              onChange={(e) => setConfig({ ...config, compareValue: e.target.value })}
                              placeholder="e.g., 10"
                              className="mt-2"
                            />
                          );
                        } else {
                          return (
                            <Input
                              type="text"
                              value={config.compareValue || ''}
                              onChange={(e) => setConfig({ ...config, compareValue: e.target.value })}
                              placeholder="e.g., active"
                              className="mt-2"
                            />
                          );
                        }
                      })()}
                    </div>
                  </div>

                  {/* Preview */}
                  <div className="mt-4 p-3 bg-white rounded border">
                    <Label className="text-xs text-grey-600 mb-2 block">Preview Expression:</Label>
                    <code className="text-sm font-mono text-primary">{getPreviewExpression() || 'Configure all fields to see preview'}</code>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer - Fixed */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-grey-400 bg-grey-50">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={!config.type || !config.valueSource ||
              (config.valueSource === 'input' && !config.inputKey) ||
              (config.valueSource === 'sequence' && (!config.sequenceId || !config.eventId || !config.valueKey)) ||
              !config.operator || !config.compareValue
            }
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Save Condition
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
