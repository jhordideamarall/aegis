import { MetadataRoute } from "next";
import { isFeatureUpdatesTableMissing, normalizeFeatureUpdate } from "@/lib/featureUpdates";
import { marketingPageSlugs } from "@/lib/marketingPages";
import { getSiteUrl } from "@/lib/site";
import { supabaseAdmin } from "@/lib/supabase";

const baseUrl = getSiteUrl();

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const publicRoutes = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/setup`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.5,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    },
    {
      url: `${baseUrl}/updates`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }
  ];

  const marketingRoutes = marketingPageSlugs.map((slug) => ({
    url: `${baseUrl}/${slug}`,
    lastModified: new Date(),
    changeFrequency: slug === 'blog' || slug === 'docs' || slug === 'features' ? ("weekly" as const) : ("monthly" as const),
    priority: slug.startsWith('pos-') || slug === 'cloud-pos-system' || slug === 'pos-indonesia' ? 0.8 : 0.7,
  }));

  const { data, error } = await supabaseAdmin
    .from('feature_updates')
    .select('slug, published_at, updated_at, status, highlights, id, title, version, summary, content, featured, email_sent_at, email_recipient_count, email_last_error, created_by_email, created_at')
    .eq('status', 'published')
    .order('published_at', { ascending: false });

  const featureUpdateRoutes = error
    ? (isFeatureUpdatesTableMissing(error) ? [] : [])
    : (data || []).map((row) => {
        const update = normalizeFeatureUpdate(row)

        return {
          url: `${baseUrl}/updates/${update.slug}`,
          lastModified: new Date(update.updated_at || update.published_at || update.created_at),
          changeFrequency: "weekly" as const,
          priority: 0.7,
        }
      });

  return [...publicRoutes, ...marketingRoutes, ...featureUpdateRoutes];
}
