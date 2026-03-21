/**
 * Konggest — Dynamic Sitemap Generator
 * Next.js App Router sitemap.
 */
export default function sitemap() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://konggest.vercel.app';

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ];
}
