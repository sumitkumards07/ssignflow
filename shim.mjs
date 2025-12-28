let handler;
try {
    console.log("Shim: Attempting to import index.cjs...");
    const mod = await import('./index.cjs');
    handler = mod.handler;
    console.log("Shim: Successfully imported index.js");
} catch (e) {
    console.error("Shim: CRITICAL INIT ERROR:", e);
    handler = async () => ({
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            message: "Lambda Init Failed",
            error: e.message,
            stack: e.stack,
            details: "The application crashed during the initialization phase (module loading)."
        })
    });
}
export { handler };
