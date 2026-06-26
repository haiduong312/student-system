export function getApiErrorMessage(error: unknown) {
  const message = getResponseMessage(error);
  if (message) {
    return message;
  }

  const statusMessage = getStatusMessage(error);
  if (statusMessage) {
    return statusMessage;
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

function getStatusMessage(error: unknown) {
  if (!isObject(error) || !isObject(error.response)) {
    return null;
  }

  switch (error.response.status) {
    case 401:
      return 'Please sign in again to access this resource.';
    case 400:
      return 'The request cannot be processed. Please check the current profile context and submitted data.';
    case 403:
      return 'You do not have permission to access or update this resource.';
    case 404:
      return 'The requested resource was not found or no longer belongs to the current context.';
    case 409:
      return 'This change conflicts with existing data.';
    default:
      return null;
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}
