// authenticate internal service requests using the shared service token
export async function isAuthorized(request: Request) {
  const token = request.headers.get("x-internal-service-token");

  return (
    !!process.env.INTERNAL_SERVICE_TOKEN &&
    token === process.env.INTERNAL_SERVICE_TOKEN
  );
}
