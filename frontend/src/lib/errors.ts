export function getApiErrorMessage(error: unknown) {
  const message = getResponseMessage(error);
  if (message) {
    return message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Something went wrong.';
}

function getResponseMessage(error: unknown) {
  if (!isObject(error) || !isObject(error.response) || !isObject(error.response.data)) {
    return null;
  }

  const message = error.response.data.message;
  if (!message) {
    return null;
  }

  return Array.isArray(message) ? message.map(String).join(', ') : String(message);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}
