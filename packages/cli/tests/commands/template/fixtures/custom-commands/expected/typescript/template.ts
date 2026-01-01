import { Template } from '@moru-ai/core'

export const template = Template()
  .fromImage('node:18')
  .setUser('root')
  .setWorkdir('/')
  .setWorkdir('/app')
  .copy('server.js', '.')
  .setUser('user')
  .setStartCmd('sudo node server.js', 'curl -f http://localhost:3000/health || exit 1')