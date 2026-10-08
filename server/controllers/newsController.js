const News = require('../models/News');
const { spotlightRefusal } = require('../utils/spotlight');

// Get all news (public)
exports.getAllNews = async (req, res) => {
  try {
    const { page = 1, limit = 12, category, scope, chapter, featured } = req.query;
    const filter = { isPublished: true };
    // ?featured=true: the homepage spotlight (three slots).
    if (featured === 'true') filter.isFeatured = true;

    if (category) filter.category = category;
    if (scope) filter.scope = scope;
    if (chapter) filter.chapter = chapter;

    const news = await News.find(filter)
      .populate('author', 'firstName lastName')
      .populate('chapter', 'name')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await News.countDocuments(filter);

    res.json({ news, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get single news by slug (public)
exports.getNewsBySlug = async (req, res) => {
  try {
    const news = await News.findOne({ slug: req.params.slug })
      .populate('author', 'firstName lastName')
      .populate('chapter', 'name');

    if (!news) return res.status(404).json({ message: 'Article not found' });

    news.views += 1;
    await news.save();

    res.json(news);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create news (admin)
exports.createNews = async (req, res) => {
  try {
    const { title, content, image, category, tags, scope, chapter, isFeatured } = req.body;

    // State admin can only create chapter-scoped news
    if (req.admin.role === 'state_admin') {
      if (scope === 'national') {
        return res.status(403).json({ message: 'State admins can only create chapter news' });
      }
    }

    const refusal = await spotlightRefusal(News, {
      requested: isFeatured, slotFilter: { isPublished: true }, noun: 'news item',
    });
    if (refusal) return res.status(400).json({ message: refusal, code: 'SPOTLIGHT_FULL' });

    const news = await News.create({
      title, content, image, category, isFeatured: !!isFeatured,
      tags: tags || [],
      scope: scope || 'national',
      chapter: chapter || null,
      author: req.admin._id
    });

    res.status(201).json(news);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update news (admin)
exports.updateNews = async (req, res) => {
  try {
    const news = await News.findById(req.params.id);
    if (!news) return res.status(404).json({ message: 'Article not found' });

    // State admin can only edit their chapter's news
    if (req.admin.role === 'state_admin') {
      if (!news.chapter || news.chapter.toString() !== req.admin.assignedChapter?.toString()) {
        return res.status(403).json({ message: 'You can only edit your chapter\'s news' });
      }
    }

    const refusal = await spotlightRefusal(News, {
      requested: req.body.isFeatured, current: news.isFeatured,
      slotFilter: { isPublished: true }, excludeId: news._id, noun: 'news item',
    });
    if (refusal) return res.status(400).json({ message: refusal, code: 'SPOTLIGHT_FULL' });

    Object.assign(news, req.body);
    await news.save();

    res.json(news);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete news (main_admin only)
exports.deleteNews = async (req, res) => {
  try {
    const news = await News.findByIdAndDelete(req.params.id);
    if (!news) return res.status(404).json({ message: 'Article not found' });
    res.json({ message: 'Article deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all news for admin (includes unpublished, scoped)
exports.getAdminNews = async (req, res) => {
  try {
    let filter = {};

    if (req.admin.role === 'state_admin' && req.admin.assignedChapter) {
      filter.chapter = req.admin.assignedChapter;
    }

    const news = await News.find(filter)
      .populate('author', 'firstName lastName')
      .populate('chapter', 'name')
      .sort('-createdAt');

    res.json(news);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
