export type RichTextBlock =
  | { type: 'text'; value: string }
  | { type: 'quote'; value: string }
  | { type: 'image'; value: string };
