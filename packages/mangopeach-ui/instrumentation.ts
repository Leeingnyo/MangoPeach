export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('Starting server instrumentation, ensuring core is initialized...');
    // By importing the core module, we trigger the singleton initialization.
    await import('@/lib/core');
  }
}
