import { GatewayApiError } from "../ai-task-api.ts";

export type AdminAccessAvailability = "available" | "loading" | "unavailable" | "unknown";

function describeGatewayError(error: GatewayApiError, fallbackMessage: string): string {
  if (error.errorCode === "auth-not-configured") {
    return "This server is not configured for admin mode. Add PROJECT_MANAGER_ADMIN_TOKEN in the gateway before using management actions.";
  }
  if (error.errorCode === "unauthorized") {
    return "The admin token was rejected. Check the bearer token and try again.";
  }

  return fallbackMessage;
}

export function describeAdminSessionError(error: unknown): {
  availability: AdminAccessAvailability;
  message: string;
} {
  if (error instanceof GatewayApiError) {
    return {
      availability: error.errorCode === "auth-not-configured" ? "unavailable" : "available",
      message: describeGatewayError(error, "Unable to verify the admin token right now.")
    };
  }

  return {
    availability: "unknown",
    message: error instanceof Error ? error.message : "Unable to verify the admin token right now."
  };
}

export function describeProtectedActionError(error: unknown, fallbackMessage: string): string {
  if (error instanceof GatewayApiError) {
    return describeGatewayError(error, fallbackMessage);
  }

  return error instanceof Error ? error.message : fallbackMessage;
}
