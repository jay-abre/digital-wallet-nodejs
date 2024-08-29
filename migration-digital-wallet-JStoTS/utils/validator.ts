import Joi, { ObjectSchema, ValidationResult } from 'joi';

// Define interfaces for validation inputs
interface IUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

interface ILoginData {
  email: string;
  password: string;
}

interface IWalletCreation {
  userId: string;
  email: string;
  initialBalance?: number;
}

interface ITransaction {
  type: 'deposit' | 'withdraw' | 'transfer';
  amount: number;
  fromUserId?: string;
  toUserId?: string;
  currency?: string;
}

// Define the validator object with typed methods
const validator = {
  validateUser(user: IUser): ValidationResult<IUser> {
    const schema: ObjectSchema<IUser> = Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().min(8).required(),
      firstName: Joi.string().min(2).max(50).required(),
      lastName: Joi.string().min(2).max(50).required()
    });
    return schema.validate(user);
  },

  validateLogin(data: ILoginData): ValidationResult<ILoginData> {
    const schema: ObjectSchema<ILoginData> = Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().required()
    });
    return schema.validate(data);
  },

  validateWalletCreation(data: IWalletCreation): ValidationResult<IWalletCreation> {
    const schema: ObjectSchema<IWalletCreation> = Joi.object({
      userId: Joi.string().required(),
      email: Joi.string().required(),
      initialBalance: Joi.number().min(0).default(0)
    });
    return schema.validate(data);
  },

  validateTransaction(transaction: ITransaction): ValidationResult<ITransaction> {
    const schema: ObjectSchema<ITransaction> = Joi.object({
      type: Joi.string().valid('deposit', 'withdraw', 'transfer').required(),
      amount: Joi.number().positive().required(),
      fromUserId: Joi.string().when('type', { is: 'transfer', then: Joi.required() }),
      toUserId: Joi.string().when('type', { is: 'transfer', then: Joi.required() }),
      currency: Joi.string().default('USD')
    });
    return schema.validate(transaction);
  },

  validateAmount(amount: number): ValidationResult<number> {
    return Joi.number().positive().validate(amount);
  },

  validateId(id: string): ValidationResult<string> {
    return Joi.string().required().validate(id);
  },

  validateEmail(email: string): ValidationResult<string> {
    return Joi.string().email().required().validate(email);
  }
};

export default validator;
