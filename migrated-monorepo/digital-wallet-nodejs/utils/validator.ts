import Joi from 'joi';

const validator = {
  validateUser(user: { email: string; password: string; firstName: string; lastName: string }) {
    const schema = Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().min(8).required(),
      firstName: Joi.string().min(2).max(50).required(),
      lastName: Joi.string().min(2).max(50).required()
    });
    return schema.validate(user);
  },

  validateLogin(data: { email: string; password: string }) {
    const schema = Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().required()
    });
    return schema.validate(data);
  },

  validateWalletCreation(data: { userId: string; email: string; initialBalance: number }) {
    const schema = Joi.object({
      userId: Joi.string().required(),
      email: Joi.string().required(),
      initialBalance: Joi.number().min(0).default(0)
    });
    return schema.validate(data);
  },

  validateTransaction(transaction: { type: string; amount: number; fromUserId?: string; toUserId?: string; currency?: string }) {
    const schema = Joi.object({
      type: Joi.string().valid('deposit', 'withdraw', 'transfer').required(),
      amount: Joi.number().positive().required(),
      fromUserId: Joi.string().when('type', { is: 'transfer', then: Joi.required() }),
      toUserId: Joi.string().when('type', { is: 'transfer', then: Joi.required() }),
      currency: Joi.string().default('USD')
    });
    return schema.validate(transaction);
  },

  validateAmount(amount: number) {
    return Joi.number().positive().validate(amount);
  },

  validateId(id: string) {
    return Joi.string().required().validate(id);
  },

  validateEmail(email: string) {
    return Joi.string().email().required().validate(email);
  }
};

export default validator;