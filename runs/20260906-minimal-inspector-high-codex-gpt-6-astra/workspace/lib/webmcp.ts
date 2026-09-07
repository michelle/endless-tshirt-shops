type Context = {
  registerTool: (
    tool: {
      name: string;
      description: string;
      inputSchema: object;
      annotations: object;
      execute: (input: unknown) => unknown;
    },
    options: { signal: AbortSignal },
  ) => void | Promise<void>;
};
export function configureShirtTool(
  configure: (fit: string, size: string) => void,
) {
  const context = (document as Document & { modelContext?: Context })
    .modelContext;
  if (!context) return;
  const controller = new AbortController();
  Promise.resolve(
    context.registerTool(
      {
        name: 'configure_datetime_tee',
        description:
          'Choose the fit and size on the product page. Does not start checkout or make a payment.',
        inputSchema: {
          type: 'object',
          properties: {
            fit: { type: 'string', enum: ['unisex', 'fitted'] },
            size: { type: 'string', enum: ['S', 'M', 'L', 'XL'] },
          },
          required: ['fit', 'size'],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute: async (input: unknown) => {
          const v = input as { fit: string; size: string };
          if (
            !v ||
            !['unisex', 'fitted'].includes(v.fit) ||
            !['S', 'M', 'L', 'XL'].includes(v.size)
          )
            throw new Error('Choose an available fit and size.');
          configure(v.fit, v.size);
          await new Promise<void>((resolve) =>
            requestAnimationFrame(() => resolve()),
          );
          return { fit: v.fit, size: v.size };
        },
      },
      { signal: controller.signal },
    ),
  ).catch(() => {});
  return () => controller.abort();
}
