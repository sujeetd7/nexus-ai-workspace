export class ApiResponse {
  static success(data: unknown, message?: string) {
    return {
      success: true,
      message,
      data,
    };
  }

  static created(data: unknown, message = "Created successfully") {
    return {
      success: true,
      message,
      data,
    };
  }

  static deleted(message = "Deleted successfully") {
    return {
      success: true,
      message,
    };
  }
}
