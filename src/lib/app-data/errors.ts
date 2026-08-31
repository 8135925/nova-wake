export class AppDataError extends Error {
  constructor(
    message: string,
    public readonly code: string = "APP_DATA_ERROR",
  ) {
    super(message);
    this.name = "AppDataError";
  }
}

export class AppDataNotConnectedError extends AppDataError {
  constructor(message = "App data connector is not connected") {
    super(message, "NOT_CONNECTED");
    this.name = "AppDataNotConnectedError";
  }
}
