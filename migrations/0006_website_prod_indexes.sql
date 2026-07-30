-- Production indexes for public-site analytics and published blog lists.
CREATE INDEX IF NOT EXISTS "website_form_submission_siteId_idx"
  ON "website_form_submission" ("siteId");

CREATE INDEX IF NOT EXISTS "website_blog_post_siteId_status_idx"
  ON "website_blog_post" ("siteId", "status");
