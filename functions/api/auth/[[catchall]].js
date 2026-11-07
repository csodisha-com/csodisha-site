export async function onRequest(context) {
  return new Response(
    JSON.stringify({
      status: "maintenance",
      message: "Authentication services will activate in Release B."
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store"
      }
    }
  );
}
