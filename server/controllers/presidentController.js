const President = require('../models/President');

/* The categories the President page filters by. Anything else is filed under
   "Other" rather than refused, so a typo never loses a speech. */
const SPEECH_CATEGORIES = ['Inaugural', 'Keynote', 'Conference', 'Lecture', 'Interview', 'Statement', 'Other'];
const cleanSpeech = (s) => {
  const cat = SPEECH_CATEGORIES.find(c => c.toLowerCase() === String(s.category || '').trim().toLowerCase());
  const tags = (Array.isArray(s.tags) ? s.tags : String(s.tags || '').split(','))
    .map(t => String(t).trim()).filter(Boolean).slice(0, 8);
  return { ...s, category: cat || 'Other', tags };
};


/* ── PUBLIC: get president data ── */
exports.getPresident = async (req, res) => {
  try {
    let president = await President.findOne({ _singleton: 'president' });

    // If no record yet, return default values by creating the seed doc
    if (!president) {
      president = await President.create({ _singleton: 'president' });
    }

    res.json(president);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/* ── ADMIN: update president data (upsert) ── */
exports.updatePresident = async (req, res) => {
  try {
    const {
      name, title, tenure, linkedIn,
      photo, backgroundImage,
      paragraph1, paragraph2, quote,
      speechTitle, speechSubtitle, speechBody,
      speeches,
    } = req.body;

    const president = await President.findOneAndUpdate(
      { _singleton: 'president' },
      {
        name, title, tenure, linkedIn,
        photo, backgroundImage,
        paragraph1, paragraph2, quote,
        ...(speechTitle !== undefined && { speechTitle }),
        ...(speechSubtitle !== undefined && { speechSubtitle }),
        ...(speechBody !== undefined && { speechBody }),
        /* Untitled rows are dropped rather than rejected: the admin form adds
           an empty row before it is filled, and saving mid-edit should not 500. */
        ...(Array.isArray(speeches) && { speeches: speeches.filter(s => s && String(s.title || '').trim()).map(cleanSpeech) }),
        updatedBy: req.admin._id,
      },
      { new: true, upsert: true, runValidators: false }
    );

    res.json(president);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
