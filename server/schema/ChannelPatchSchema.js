const Joi = require("joi")

module.exports = Joi.object().keys({
    co2: Joi.boolean().optional(),
    light: Joi.boolean().optional(),
    filter: Joi.boolean().optional()
});