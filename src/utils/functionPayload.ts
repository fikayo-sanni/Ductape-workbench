/** Historical function activity can contain metadata without captured arguments/results. */
export function functionPayload(data: unknown): unknown {
  let payload = data;
  for (let i = 0; i < 2 && typeof payload === 'string'; i++) {
    try { payload = JSON.parse(payload); } catch { break; }
  }
  if (payload && typeof payload === 'object' && ('input' in payload || 'output' in payload || 'output_unavailable' in payload)) return payload;
  return {
    payload_unavailable: true,
    reason: payload == null
      ? 'No retained payload was returned for this exact activity record. Contract publication does not capture execution samples.'
      : 'This activity record has no captured input/output fields. They cannot be reconstructed from its definition schema.',
    ...(payload && typeof payload === 'object' ? { metadata: payload } : {}),
  };
}
