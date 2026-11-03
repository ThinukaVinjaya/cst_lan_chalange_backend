import { Response } from 'express';

export class ApiResponse<T = any> {
  public success: boolean;
  public message: string;
  public data?: T;
  public meta?: any;

  constructor(message: string = 'Operation successful', data?: T, meta?: any) {
    this.success = true;
    this.message = message;
    if (data !== undefined) {
      this.data = data;
    }
    if (meta !== undefined) {
      this.meta = meta;
    }
  }

  static send<T>(
    res: Response,
    statusCode: number = 200,
    message: string = 'Operation successful',
    data?: T,
    meta?: any
  ): Response {
    return res.status(statusCode).json(new ApiResponse<T>(message, data, meta));
  }
}

