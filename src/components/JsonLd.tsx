// Renders a JSON-LD <script> for structured data. The `<` escape blocks a
// "</script>" break-out if any field ever carries user/catalog text.
//
// `id` is REQUIRED: React 19 duplicates an inline <script> nested in a page
// segment on hydration (the SSR node isn't reconciled, so a second copy is
// appended). A stable `id` makes React treat it as one element and collapse
// the duplicate. The server HTML is single either way, but this keeps the
// hydrated DOM (and Search Console's Products report) clean.
export default function JsonLd({
  id,
  data,
}: {
  id: string;
  data: Record<string, unknown> | Record<string, unknown>[];
}) {
  return (
    <script
      id={id}
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\\u003c'),
      }}
    />
  );
}
