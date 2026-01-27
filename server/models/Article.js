const database = require('../config/database');
const logger = require('../utils/logger');

class Article {
    // Create article
    static async create(articleData) {
        const {
            headline,
            sub_headline,
            summary,
            body,
            slug,
            featured_image_url,
            featured_image_caption,
            featured_image_alt,
            featured_image_credit,
            category_id,
            author_id,
            language = 'en',
            location_tag,
            source_attribution,
            seo_title,
            seo_description,
            is_opinion = false,
            status = 'draft',
            scheduled_publish_at = null,
        } = articleData;

        // Calculate reading time (average 200 words per minute)
        const wordCount = body.split(/\s+/).length;
        const reading_time = Math.ceil(wordCount / 200);

        const result = await database.run(
            `INSERT INTO articles (
        headline, sub_headline, summary, body, slug, 
        featured_image_url, featured_image_caption, featured_image_alt, featured_image_credit,
        category_id, author_id, language, location_tag, source_attribution,
        seo_title, seo_description, is_opinion, reading_time, status, scheduled_publish_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                headline, sub_headline, summary, body, slug,
                featured_image_url, featured_image_caption, featured_image_alt, featured_image_credit,
                category_id, author_id, language, location_tag, source_attribution,
                seo_title || headline, seo_description || summary, is_opinion ? 1 : 0, reading_time, status, scheduled_publish_at
            ]
        );

        // Create initial version
        await database.run(
            'INSERT INTO article_versions (article_id, version_number, headline, body, changed_by) VALUES (?, ?, ?, ?, ?)',
            [result.lastID, 1, headline, body, author_id]
        );

        return await this.findById(result.lastID);
    }

    // Find article by ID
    static async findById(id, includeUnpublished = false) {
        let query = `
      SELECT a.*, 
             c.name as category_name, c.slug as category_slug,
             u.full_name as author_name, u.username as author_username,
             e.full_name as editor_name
      FROM articles a
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN users u ON a.author_id = u.id
      LEFT JOIN users e ON a.editor_id = e.id
      WHERE a.id = ?
    `;

        if (!includeUnpublished) {
            query += ' AND a.status = "published"';
        }

        const article = await database.get(query, [id]);

        if (article) {
            // Get tags
            article.tags = await database.all(
                `SELECT t.* FROM tags t
         INNER JOIN article_tags at ON t.id = at.tag_id
         WHERE at.article_id = ?`,
                [id]
            );
        }

        return article;
    }

    // Find article by slug
    static async findBySlug(slug, includeUnpublished = false) {
        let query = `
      SELECT a.*, 
             c.name as category_name, c.slug as category_slug,
             u.full_name as author_name, u.username as author_username,
             e.full_name as editor_name
      FROM articles a
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN users u ON a.author_id = u.id
      LEFT JOIN users e ON a.editor_id = e.id
      WHERE a.slug = ?
    `;

        if (!includeUnpublished) {
            query += ' AND a.status = "published"';
        }

        const article = await database.get(query, [slug]);

        if (article) {
            article.tags = await database.all(
                `SELECT t.* FROM tags t
         INNER JOIN article_tags at ON t.id = at.tag_id
         WHERE at.article_id = ?`,
                [article.id]
            );
        }

        return article;
    }

    // List articles with filters
    static async findAll(filters = {}) {
        let query = `
      SELECT a.id, a.headline, a.sub_headline, a.summary, a.slug,
             a.featured_image_url, a.featured_image_alt,
             a.category_id, a.author_id, a.status, a.is_breaking, a.is_pinned, a.is_featured,
             a.view_count, a.comment_count, a.reading_time, a.published_at, a.created_at,
             c.name as category_name, c.slug as category_slug,
             u.full_name as author_name, u.username as author_username
      FROM articles a
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN users u ON a.author_id = u.id
      WHERE 1=1
    `;

        const params = [];

        if (filters.status) {
            query += ' AND a.status = ?';
            params.push(filters.status);
        } else if (!filters.includeUnpublished) {
            // Default public view: Published only
            query += ' AND a.status = "published"';

            // If scheduling check is enabled (for public view)
            if (filters.checkSchedule) {
                query += ' AND (a.scheduled_publish_at IS NULL OR a.scheduled_publish_at <= datetime("now"))';
            }
        }

        if (filters.category_id) {
            query += ' AND a.category_id = ?';
            params.push(filters.category_id);
        }

        if (filters.author_id) {
            query += ' AND a.author_id = ?';
            params.push(filters.author_id);
        }

        if (filters.is_breaking !== undefined) {
            query += ' AND a.is_breaking = ?';
            params.push(filters.is_breaking ? 1 : 0);
        }

        if (filters.is_featured !== undefined) {
            query += ' AND a.is_featured = ?';
            params.push(filters.is_featured ? 1 : 0);
        }

        if (filters.is_pinned !== undefined) {
            query += ' AND a.is_pinned = ?';
            params.push(filters.is_pinned ? 1 : 0);
        }

        if (filters.search) {
            query += ' AND (a.headline LIKE ? OR a.summary LIKE ? OR a.body LIKE ?)';
            const searchTerm = `%${filters.search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        // Ordering
        if (filters.is_pinned) {
            query += ' ORDER BY a.is_pinned DESC, ';
        } else {
            query += ' ORDER BY ';
        }

        query += filters.orderBy || 'a.published_at DESC';

        // Pagination
        const limit = filters.limit || 20;
        const offset = filters.offset || 0;
        query += ' LIMIT ? OFFSET ?';
        params.push(limit, offset);

        return await database.all(query, params);
    }

    // Update article
    static async update(id, updates, userId) {
        const allowedFields = [
            'headline', 'sub_headline', 'summary', 'body', 'slug',
            'featured_image_url', 'featured_image_caption', 'featured_image_alt', 'featured_image_credit',
            'category_id', 'language', 'location_tag', 'source_attribution',
            'seo_title', 'seo_description', 'is_breaking', 'is_pinned', 'is_featured',
            'is_opinion', 'is_fact_checked', 'editor_id', 'scheduled_publish_at'
        ];

        const fields = [];
        const values = [];

        for (const [key, value] of Object.entries(updates)) {
            if (allowedFields.includes(key)) {
                fields.push(`${key} = ?`);
                values.push(value);
            }
        }

        if (fields.length === 0) {
            throw new Error('No valid fields to update');
        }

        // Recalculate reading time if body changed
        if (updates.body) {
            const wordCount = updates.body.split(/\s+/).length;
            const reading_time = Math.ceil(wordCount / 200);
            fields.push('reading_time = ?');
            values.push(reading_time);
        }

        values.push(id);

        await database.run(
            `UPDATE articles SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            values
        );

        // Create new version if content changed
        if (updates.headline || updates.body) {
            const article = await database.get('SELECT * FROM articles WHERE id = ?', [id]);
            const lastVersion = await database.get(
                'SELECT MAX(version_number) as max_version FROM article_versions WHERE article_id = ?',
                [id]
            );
            const newVersion = (lastVersion?.max_version || 0) + 1;

            await database.run(
                'INSERT INTO article_versions (article_id, version_number, headline, body, changed_by) VALUES (?, ?, ?, ?, ?)',
                [id, newVersion, article.headline, article.body, userId]
            );
        }

        return await this.findById(id, true);
    }

    // Change article status
    static async changeStatus(id, status, userId) {
        const validStatuses = ['draft', 'pending', 'approved', 'published', 'archived', 'rejected'];

        if (!validStatuses.includes(status)) {
            throw new Error('Invalid status');
        }

        const updates = { status };

        // Set published_at when publishing
        if (status === 'published') {
            const article = await database.get('SELECT published_at FROM articles WHERE id = ?', [id]);
            if (!article.published_at) {
                updates.published_at = new Date().toISOString();
            }
        }

        if (status === 'approved' || status === 'published') {
            updates.editor_id = userId;
        }

        await this.update(id, updates, userId);
    }

    // Delete article
    static async delete(id) {
        await database.run('DELETE FROM articles WHERE id = ?', [id]);
    }

    // Add tags to article
    static async addTags(articleId, tagIds) {
        for (const tagId of tagIds) {
            await database.run(
                'INSERT OR IGNORE INTO article_tags (article_id, tag_id) VALUES (?, ?)',
                [articleId, tagId]
            );

            // Increment tag usage count
            await database.run(
                'UPDATE tags SET usage_count = usage_count + 1 WHERE id = ?',
                [tagId]
            );
        }
    }

    // Remove tags from article
    static async removeTags(articleId, tagIds) {
        for (const tagId of tagIds) {
            await database.run(
                'DELETE FROM article_tags WHERE article_id = ? AND tag_id = ?',
                [articleId, tagId]
            );

            // Decrement tag usage count
            await database.run(
                'UPDATE tags SET usage_count = usage_count - 1 WHERE id = ?',
                [tagId]
            );
        }
    }

    // Increment view count
    static async incrementViews(id) {
        await database.run(
            'UPDATE articles SET view_count = view_count + 1 WHERE id = ?',
            [id]
        );
    }

    // Get article versions
    static async getVersions(articleId) {
        return await database.all(
            `SELECT av.*, u.full_name as changed_by_name
       FROM article_versions av
       LEFT JOIN users u ON av.changed_by = u.id
       WHERE av.article_id = ?
       ORDER BY av.version_number DESC`,
            [articleId]
        );
    }

    // Schedule article
    static async schedule(id, publishAt, unpublishAt = null) {
        await database.run(
            'UPDATE articles SET scheduled_publish_at = ?, scheduled_unpublish_at = ? WHERE id = ?',
            [publishAt, unpublishAt, id]
        );
    }

    // Get scheduled articles that should be published
    static async getScheduledToPublish() {
        const now = new Date().toISOString();
        return await database.all(
            `SELECT * FROM articles 
       WHERE status = 'approved' 
       AND scheduled_publish_at IS NOT NULL 
       AND scheduled_publish_at <= ?`,
            [now]
        );
    }

    // Get published articles that should be unpublished
    static async getScheduledToUnpublish() {
        const now = new Date().toISOString();
        return await database.all(
            `SELECT * FROM articles 
       WHERE status = 'published' 
       AND scheduled_unpublish_at IS NOT NULL 
       AND scheduled_unpublish_at <= ?`,
            [now]
        );
    }
}

module.exports = Article;
