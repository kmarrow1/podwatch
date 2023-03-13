import Joi from 'joi';

export interface EnvSchema {
  PODWATCH_SERVICE_ACCOUNT_TOKEN: string | undefined;
  PODWATCH_PORT: string | undefined;
  KUBERNETES_SERVICE_HOST: string | undefined;
  KUBERNETES_SERVICE_PORT: string | undefined;
  PODWATCH_CUSTOM_SERVER_URL: string | undefined;
  PODWATCH_CLIENT_ID: string | undefined;
  PODWATCH_CLIENT_SECRET: string | undefined;
}

const envSchema = Joi.object({
  PODWATCH_SERVICE_ACCOUNT_TOKEN: Joi.string().when('KUBERNETES_SERVICE_HOST', {
    is: Joi.exist(),
    then: Joi.optional().empty().warning('external.host', {}).messages({
      'external.host':
        'Environment variable PODWATCH_SERVICE_ACCOUNT_TOKEN is not required when running inside the cluster',
    }),
    otherwise: Joi.required().messages({
      'any.only':
        'Environment variable PODWATCH_SERVICE_ACCOUNT_TOKEN is required when running outside the cluster.',
    }),
  }),
  PODWATCH_PORT: Joi.string().when('KUBERNETES_SERVICE_HOST', {
    is: Joi.exist(),
    then: Joi.optional().empty().warning('external.host', {}).messages({
      'external.host':
        'Environment variable PODWATCH_SERVICE_ACCOUNT_PORT is not required when running inside the cluster',
    }),
    otherwise: Joi.required().messages({
      'any.only':
        'Environment variable PODWATCH_SERVICE_ACCOUNT_PORT is required when running outside the cluster.',
    }),
  }),
  KUBERNETES_SERVICE_HOST: Joi.string().optional(),
  KUBERNETES_SERVICE_PORT: Joi.string().optional(),
  PODWATCH_CUSTOM_SERVER_URL: Joi.string().optional(),
  PODWATCH_CLIENT_ID: Joi.string().when('PODWATCH_CUSTOM_SERVER_URL', {
    is: Joi.exist(),
    then: Joi.optional().empty().warning('custom.server', {}).messages({
      'custom.server':
        'The use of a custom server negates the need for a PODWATCH_CLIENT_ID environment variable. If you instead meant to use the Podwatch Web Service, please unset the PODWATCH_CUSTOM_SERVER_URL environment variable.',
    }),
    otherwise: Joi.required().messages({
      'any.only': 'Please set the PODWATCH_CLIENT_ID environment variable.',
    }),
  }),
  PODWATCH_CLIENT_SECRET: Joi.string().when('PODWATCH_CUSTOM_SERVER_URL', {
    is: Joi.exist(),
    then: Joi.optional().empty().warning('custom.server', {}).messages({
      'custom.server':
        'The use of a custom server negates the need for a PODWATCH_CLIENT_SECRET environment variable. If you instead meant to use the Podwatch Web Service, please unset the PODWATCH_CUSTOM_SERVER_URL environment variable.',
    }),
    otherwise: Joi.required().messages({
      'any.only': 'Please set the PODWATCH_CLIENT_SECRET environment variable.',
    }),
  }),
})
  .and('KUBERNETES_SERVICE_HOST', 'KUBERNETES_SERVICE_PORT')
  .and('PODWATCH_CLIENT_ID', 'PODWATCH_CLIENT_SECRET')
  .and('PODWATCH_SERVICE_ACCOUNT_TOKEN', 'PODWATCH_PORT');

export default envSchema;
