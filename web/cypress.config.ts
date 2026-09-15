import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:9003',
  },
  video: false,
  viewportWidth: 1400,
});
