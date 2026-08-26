export class AppError extends Error {
  readonly statusCode: number;
  readonly status: "fail" | "error" | "not_found" | "unauthorized";

  constructor(message: string, statusCode: number, status: AppError["status"] = "error") {
    super(message);
    this.statusCode = statusCode;
    this.status = status;
  }

  static notFound(message: string) {
    return new AppError(message, 404, "not_found");
  }

  static badRequest(message: string) {
    return new AppError(message, 400, "fail");
  }

  static unauthorized(message = "Non authentifié") {
    return new AppError(message, 401, "unauthorized");
  }

  static forbidden(message = "Accès refusé") {
    return new AppError(message, 403, "unauthorized");
  }

  static conflict(message: string) {
    return new AppError(message, 409, "fail");
  }
}
