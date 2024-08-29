import {Request, RequestHandler, Response} from 'express';
import User from '../models/user.model';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import validator from '../utils/validator';
import logger from '../utils/logger';
import config from '../config';
import NotificationService from '../services/notification.service';

interface Params {
    userId: string;
}


export const register = async (req: Request, res: Response): Promise<Response> => {
    const session = await User.startSession();
    session.startTransaction();

    try {
        const {error} = validator.validateUser(req.body);
        if (error) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({error: error.details[0].message});
        }

        const {email, password, firstName, lastName}: {
            email: string;
            password: string;
            firstName: string;
            lastName: string
        } = req.body;

        if (!isValidEmail(email)) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({error: "Invalid email address"});
        }

        let existingUser = await User.findOne({email});
        if (existingUser) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({error: "User already exists"});
        }

        const emailVerificationToken: string = crypto.randomBytes(20).toString('hex');
        const emailVerificationExpires: number = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

        const newUser = new User({
            email,
            password,
            firstName,
            lastName,
            emailVerificationToken,
            emailVerificationExpires
        });

        const verificationURL: string = `${req.protocol}://${req.get('host')}/api/auth/verify-email/${emailVerificationToken}`;

        await newUser.save({session});

        try {
            const notificationService = new NotificationService();
            await notificationService.notifyEmailVerification(newUser, verificationURL);
            logger.info(`Verification email sent successfully to ${newUser.email}`);
        } catch (emailError) {
            logger.error("Error sending verification email:", emailError);
        }

        await session.commitTransaction();
        session.endSession();

        return res.status(201).json({
            message: "User registered successfully. Please check your email to verify your account.",
            user: {
                id: newUser._id,
                email: newUser.email,
                firstName: newUser.firstName,
                lastName: newUser.lastName
            }
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();

        logger.error("Error in user registration:", error);
        return res.status(500).json({
            error: "We encountered an unexpected error during registration. Please try again or contact support if the problem persists.",
        });
    }
};

function isValidEmail(email: string): boolean {
    const emailRegex: RegExp = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return emailRegex.test(email);
}
export const verifyEmail = async (req: Request, res: Response): Promise<Response> => {
    try {
        const user = await User.findOne({
            emailVerificationToken: req.params.token,
            emailVerificationExpires: {$gt: new Date()}
        });

        if (!user) {
            return res.status(400).json({error: "Invalid or expired verification token"});
        }

        user.isEmailVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpires = undefined;
        await user.save();

        if (!config.jwtSecret) {
            throw new Error('JWT secret is not defined in the configuration');
        }

        const token = jwt.sign({id: user._id}, config.jwtSecret, {
            expiresIn: '1d',
        });

        return res.json({
            message: "Email verified successfully",
            token,
            user: {
                id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
            },
        });
    } catch (error) {
        logger.error("Error in email verification:", error);
        return res.status(500).json({error: "Internal server error"});
    }
};

export const login = async (req: Request, res: Response): Promise<Response> => {
    try {
        const {error} = validator.validateLogin(req.body);
        if (error) {
            return res.status(400).json({error: error.details[0].message});
        }

        const {email, password}: { email: string; password: string } = req.body;

        const user = await User.findOne({email});
        if (!user) {
            return res.status(400).json({error: "Invalid email or password"});
        }

        if (!user.isEmailVerified) {
            return res.status(400).json({error: "Please verify your email before logging in. Check your inbox for the verification link."});
        }

        const isMatch: boolean = await user.checkPassword(password);
        if (!isMatch) {
            return res.status(400).json({error: "Invalid email or password"});
        }

        if (!config.jwtSecret) {
            throw new Error('JWT secret is not defined in the configuration');
        }

        const token = jwt.sign({id: user._id}, config.jwtSecret, {
            expiresIn: '1d',
        });

        try {
            const loginTime: string = new Date().toISOString();
            const loginLocation: string = req.ip || 'unknown'; // Ensure loginLocation is a string
            const notificationService = new NotificationService();
            await notificationService.notifyLogin(user, loginTime, loginLocation);
        } catch (notificationError) {
            logger.warn("Failed to send login notification:", notificationError);
            // Log the notification error but don't affect login process
        }

        return res.json({
            token,
            user: {
                id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
            },
        });
    } catch (error: unknown) {
        // Type guard for error handling
        if (error instanceof Error) {
            logger.error("Error in user login:", error);
            return res.status(500).json({
                error: "We're having trouble logging you in right now. Please try again later.",
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        } else {
            // Handle unexpected error type
            logger.error("Unexpected error in user login:", error);
            return res.status(500).json({
                error: "An unexpected error occurred.",
            });
        }
    }
};

export const createAdmin = async (req: Request, res: Response): Promise<Response> => {
    try {
        const {error} = validator.validateUser(req.body);
        if (error) return res.status(400).json({error: error.details[0].message});

        const {email, password, firstName, lastName}: {
            email: string;
            password: string;
            firstName: string;
            lastName: string
        } = req.body;

        let user = await User.findOne({email});
        if (user) return res.status(400).json({error: "User already exists"});

        user = new User({email, password, firstName, lastName, role: "admin"});
        await user.save();

        return res.status(201).json({
            user: {
                id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
            },
        });
    } catch (error) {
        logger.error("Error in admin creation:", error);
        return res.status(500).json({error: "Internal server error"});
    }
};
export const makeAdmin: RequestHandler<{ userId: string }> = async (req, res) => {
  try {
    const { userId } = req.params; // Extract userId from params

    const user = await User.findByIdAndUpdate(
        userId,
        { role: "admin" },
        { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  } catch (error) {
    logger.error("Error in making user admin:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
export const removeAdmin = async (req: Request, res: Response): Promise<Response> => {
    try {
        const {userId} = req.params;

        const user = await User.findByIdAndUpdate(
            userId,
            {role: "user"},
            {new: true}
        ).select("-password");

        if (!user) {
            return res.status(404).json({error: "User not found"});
        }

        return res.json({
            user: {
                id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
            },
        });
    } catch (error) {
        logger.error("Error in removing admin privileges:", error);
        return res.status(500).json({error: "Internal server error"});
    }
};

export const setupAdmin = async (req: Request, res: Response): Promise<Response> => {
    try {
        if (process.env.ALLOW_ADMIN_SETUP !== "true") {
            return res.status(403).json({error: "Admin setup is not allowed"});
        }

        const setupKey: string | undefined = req.headers["x-setup-key"] as string | undefined;
        if (setupKey !== process.env.SETUP_KEY) {
            return res.status(403).json({error: "Invalid setup key"});
        }

        const {error} = validator.validateUser(req.body);
        if (error) return res.status(400).json({error: error.details[0].message});

        const {email, password, firstName, lastName}: {
            email: string;
            password: string;
            firstName: string;
            lastName: string
        } = req.body;

        const adminExists = await User.findOne({role: "admin"});
        if (adminExists) {
            return res.status(400).json({error: "An admin user already exists"});
        }

        const user = new User({
            email,
            password,
            firstName,
            lastName,
            role: "admin",
        });
        await user.save();

        if (!config.jwtSecret) {
            throw new Error("JWT secret is not defined in the configuration");
        }
        const token: string = jwt.sign({id: user._id}, config.jwtSecret, {
            expiresIn: "1d",
        });

        process.env.ALLOW_ADMIN_SETUP = "false";

        return res.status(201).json({
            message: "Admin user created successfully",
            token,
            user: {
                id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
            },
        });
    } catch (error) {
        logger.error("Error in admin setup:", error);
        return res.status(500).json({error: "Internal server error"});
    }
};
