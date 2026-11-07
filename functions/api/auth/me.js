export async function onRequestGet(context) {
  return new Response(
    JSON.stringify({
      authenticated: false,
      user: null,
      message: "Guest session active."
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
