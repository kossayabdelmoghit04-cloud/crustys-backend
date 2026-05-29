import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';

export const validate = (schema: AnyZodObject) => (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        status: 'fail',
        message: 'Erreur de validation des données',
        errors: error.errors.map((err) => ({
          field: err.path.slice(1).join('.'), // Remove "body", "query", etc. from path if possible, or format it
          message: err.message,
        })),
      });
    }
    next(error);
  }
};
