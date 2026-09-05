export function GET() {
  return Response.json(
    {
      service: "datetime.store",
      status: "ok",
      mode: process.env.NEXT_PUBLIC_APP_MODE ?? "test",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
