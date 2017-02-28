const Joi = require("joi")

module.exports = Joi.object().keys({
    co2: Joi.boolean().required(),
    light: Joi.boolean().required(),
    filter: Joi.boolean().required()
});