// @ts-check
import { defineConfig } from 'astro/config';

import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://fest.marcelperez.co',
  integrations: [preact({ compat: true }), sitemap()],

  vite: {
    plugins: [tailwindcss()]
  }
});