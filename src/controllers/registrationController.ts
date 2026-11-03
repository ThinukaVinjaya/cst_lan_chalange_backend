import { Request, Response, NextFunction } from 'express';
import { submitRegistration, getPublicRegistration } from '../services/registrationService';
import { ApiResponse } from '../utils/ApiResponse';
import { RegistrationSubmitSchema } from '../utils/validators';
import { ApiError } from '../utils/ApiError';

export const handleRegistrationSubmit = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let payload = req.body;

    // If submitted via multipart/form-data with a JSON field `data`
    if (typeof payload.data === 'string') {
      try {
        payload = JSON.parse(payload.data);
      } catch (e) {
        throw ApiError.badRequest('Invalid JSON payload in form data');
      }
    }

    // Validate using Zod
    const validated = await RegistrationSubmitSchema.parseAsync(payload);

    const fileBuffer = req.file?.buffer;
    const ipAddress =
      (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';

    const { registration, confirmationCode } = await submitRegistration(
      validated,
      fileBuffer,
      ipAddress
    );

    ApiResponse.send(
      res,
      201,
      'Registration submitted successfully! Your squad is pending administrative review.',
      {
        registrationNumber: confirmationCode,
        teamName: registration.teamName,
        teamTag: registration.teamTag,
        status: registration.status,
        createdAt: registration.createdAt,
      }
    );
  } catch (error) {
    next(error);
  }
};

export const handleGetRegistrationStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await getPublicRegistration(id);
    ApiResponse.send(res, 200, 'Registration retrieved', result);
  } catch (error) {
    next(error);
  }
};

