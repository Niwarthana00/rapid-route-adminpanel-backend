export const errorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    console.error(`[Error] ${req.method} ${req.originalUrl}:`, err);
    res.status(statusCode).json({
        error: message,
        status: statusCode,
        path: req.originalUrl,
        timestamp: new Date().toISOString(),
    });
};
