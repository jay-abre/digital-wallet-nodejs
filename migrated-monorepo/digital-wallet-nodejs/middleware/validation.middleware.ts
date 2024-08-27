import { Request, Response, NextFunction } from 'express';

const createValidationMiddleware = (validationFunction: (data: any) => { error?: { details: { message: string }[] } }) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const { error } = validationFunction(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }
        next();
    };
};

export default createValidationMiddleware;