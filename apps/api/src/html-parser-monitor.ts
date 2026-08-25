export type BangumiHtmlParser =
  | 'blogs'
  | 'indexes'
  | 'people'
  | 'tags'
  | 'wiki';

export function createHtmlParseFailureLog({
  page,
  parser,
  url,
}: {
  page?: number;
  parser: BangumiHtmlParser;
  url: string;
}) {
  const source = new URL(url);

  return {
    event: 'bangumi_html_parse_failure',
    host: source.host,
    page,
    parser,
    path: source.pathname,
  } as const;
}

export function reportHtmlParseFailure(
  input: Parameters<typeof createHtmlParseFailureLog>[0],
) {
  console.error(JSON.stringify(createHtmlParseFailureLog(input)));
}
