import type { MetadataRoute } from "next";

import { blogPosts } from "@/content/blog/posts";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://www.doctrinally.ai";

  const mostRecentPost = [...blogPosts].sort((a, b) =>
    b.publishedAt.localeCompare(a.publishedAt),
  )[0];

  const blogIndexLastModified = mostRecentPost
    ? new Date(mostRecentPost.publishedAt)
    : new Date();

  const blogPostUrls: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.publishedAt),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: blogIndexLastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...blogPostUrls,
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date("2026-04-04"),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date("2026-04-04"),
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];
}
