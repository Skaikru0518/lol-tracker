/**
 * Canonical origin of this deployment.
 *
 * Metadata, the sitemap and robots.txt all have to agree on one hostname. When
 * they pointed at a different origin than the one actually being served, the
 * live site told search engines that the other copy was the canonical one.
 */
export const SITE_URL = "https://summon.vandslab.com";
