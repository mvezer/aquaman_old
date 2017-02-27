const Joi = require("joi")

module.exports = {
    validate: function (buffer, schema) {
        return new Promise((resolve, reject) => {
            Joi.validate(buffer, schema, (error, value) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(buffer);
                }
            })
        });
    }

}