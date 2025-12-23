
const { handler } = require('./dist/index.cjs');

console.log("Starting local Lambda test (CJS)...");

// Mock Lambda Context
const context = {
    getRemainingTimeInMillis: () => 3000,
};

// Mock API Gateway Event
const event = {
    httpMethod: 'GET',
    path: '/',
    headers: {},
    requestContext: {}
};

(async () => {
    try {
        const response = await handler(event, context);
        console.log("Response:", JSON.stringify(response, null, 2));
    } catch (error) {
        console.error("CRITICAL TEST FAILURE:", error);
    }
})();
