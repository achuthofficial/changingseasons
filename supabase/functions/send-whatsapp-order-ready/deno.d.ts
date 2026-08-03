// Ambient typing for the Deno global this Edge Function runs under on
// Supabase. Editor-only — has no effect on the actual deployed function or
// on this repo's own Vite/Node build.
declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void
  env: { get: (key: string) => string | undefined }
}
