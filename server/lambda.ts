import { app, initApp } from './index';
// @ts-ignore
import serverless from 'serverless-http';

let handlerInstance: any;

export const handler = async (event: any, context: any) => {
    if (!handlerInstance) {
        // Initialize app but do NOT start listening on port
        try {
            await initApp(false);
            handlerInstance = serverless(app);
        } catch (error: any) {
            console.error("Initialization Error:", error);
            return {
                statusCode: 500,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: "Lambda Initialization Failed",
                    error: error.message,
                    stack: error.stack,
                    env: {
                        DB_CONFIGURED: !!process.env.DATABASE_URL,
                        NODE_ENV: process.env.NODE_ENV
                    }
                })
            };
        }
    }
    return handlerInstance(event, context);
};
