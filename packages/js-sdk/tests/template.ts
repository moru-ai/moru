// Use MORU_TEMPLATE env var or default to "base"
// For local testing with JuiceFS, can set MORU_TEMPLATE=juicefs-vol-test-v2
export const template = process.env.MORU_TEMPLATE || 'base'
