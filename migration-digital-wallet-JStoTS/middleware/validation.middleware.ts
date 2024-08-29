import { Request, Response, NextFunction } from 'express';
import { ValidationResult } from 'joi';

// Define a type for the validation function
type ValidationFunction = (data: any) => ValidationResult<any>;

// Create the middleware factory function
const createValidationMiddleware = (validationFunction: ValidationFunction) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        const { error } = validationFunction(req.body);
        if (error) {
            res.status(400).json({ error: error.details[0].message });
            return; // Explicitly return to ensure the function exits here
        }
        next();
    };
};

export default createValidationMiddleware;
