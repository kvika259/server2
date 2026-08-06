const { body, param, query, validationResult } = require('express-validator');

function title(){
    return body('title')
    .trim()
    .notEmpty()
    .withMessage("title обязателен")
    .isLength({ min: 3, max: 100 })
    .withMessage('title должен содержать от 3 до 100 символов.')
}

function completed(){
    return body('completed')
    .optional()
    .isBoolean()
    .withMessage('completed должен быть true или false.')
    .toBoolean();
}

function description(){
    return body('description')
    .optional()
    .isString()
    .withMessage('description должен быть строкой.')
    .trim()
    .isLength({ max: 500 })
    .withMessage('description не должен превышать 500 символов.');
}

function taskID (){
    return param('id')
    //.isInt({ min: 1 })
    //.withMessage('id должен быть положительным целым числом.')
    //.toInt();
}

const validateCreateTask = [title(), completed(), description()];
const validateUpdateTask = [title(), completed(), description(), taskID()]
const validateToggleTask = [completed(), taskID()]
const validateGetTask =[taskID()]

const validateGetTasks = [
  query('completed')
    .optional()
    .isBoolean()
    .withMessage('completed в query должен быть true или false.')
    .toBoolean()
];

function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Ошибка валидации.',
      errors: errors.array().map(({ type, value, msg, path, location }) => ({
        type,
        value,
        message: msg,
        field: path,
        location
      }))
    });
  }

  next();
}

module.exports = {
    validateCreateTask,
    validateUpdateTask,
    validateToggleTask,
    validateGetTask,
    validateGetTasks,
    handleValidationErrors
};
