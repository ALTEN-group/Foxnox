import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

const base = process.env.VITEPRESS_BASE || (process.env.NODE_ENV === 'production' ? '/' : '/docs/')

export default withMermaid(defineConfig({
  title: 'Foxnox',
  description: 'Password and account-security service storing credentials, 2FA, recovery tokens and trusted devices',
  base,
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: `${base}favicon.svg` }],
  ],
  themeConfig: {
    logo: '/logo.svg',
    siteTitle: false,
    sidebar: [
      {
        items: [
          { text: 'Overview', link: '/guide/overview' },
        ],
      },
      {
        text: 'Deployment',
        items: [
          { text: 'Docker Compose', link: '/guide/deployment' },
          { text: 'Environment Variables', link: '/guide/configuration' },
          { text: 'Integration', link: '/guide/integration' },
          { text: 'Troubleshooting', link: '/guide/troubleshooting' },
        ],
      },
      {
        text: 'API Reference',
        items: [
          { text: 'Passwords', link: '/guide/api-passwords' },
          { text: 'Tokens', link: '/guide/api-tokens' },
          { text: 'Policies', link: '/guide/api-policies' },
          { text: 'Trusted Devices', link: '/guide/api-trusted-devices' },
          { text: 'Login Challenges', link: '/guide/api-challenges' },
        ],
      },
      {
        text: 'Account Workflows',
        items: [
          { text: 'How Workflows Work', link: '/guide/workflows' },
          {
            text: 'Recovery',
            collapsed: false,
            items: [
              { text: 'Password Recovery', link: '/guide/workflow-recover' },
              { text: 'Account Unlock', link: '/guide/workflow-unlock' },
              { text: 'Lost 2FA Recovery', link: '/guide/workflow-account-recover' },
              { text: 'Security Questions', link: '/guide/workflow-security-questions' },
            ],
          },
          {
            text: 'Login Steps',
            collapsed: false,
            items: [
              { text: 'Two-Factor Authentication', link: '/guide/workflow-twofa' },
              { text: 'Expired Password', link: '/guide/workflow-password-expired' },
              { text: 'Trusted Devices', link: '/guide/workflow-trusted-devices' },
            ],
          },
          { text: 'Branding', link: '/guide/branding' },
        ],
      },
      {
        text: 'Architecture',
        items: [
          { text: 'Request Flow', link: '/guide/architecture' },
          { text: 'Data Model', link: '/guide/data-model' },
          { text: 'Frontend Integration', link: '/guide/frontend' },
        ],
      },
    ],
    socialLinks: [],
    footer: {
      message: 'Published and maintained by DW Techs',
    },
  },
}))
