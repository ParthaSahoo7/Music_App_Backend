const successResponse = (data = {}, message = 'Success', code = 200, meta = null) => {
  const response = {
    success: true,
    message,
    code,
    data,
  };

  if (meta) response.meta = meta;

  return response;
};

const errorResponse = (error = {}, code = 500) => {
  return {
    success: false,
    message: error.message || 'Internal Server Error',
    code,
  };
};

module.exports = { successResponse, errorResponse };