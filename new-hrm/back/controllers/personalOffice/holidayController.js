const Holiday = require("../../models/personalOffice/Holiday");

// ==============================
// CREATE
// ==============================

exports.createHoliday = async (req, res) => {
  const holiday = await Holiday.create({
    companyId: req.user.companyId,
    name: req.body.name,
    date: req.body.date,
    remark: req.body.remark,
  });

  res.json(holiday);
};

exports.getHolidays = async (req, res) => {
  const holidays = await Holiday.find({
    companyId: req.user.companyId,
  });

  res.json(holidays);
};
// ==============================
// UPDATE
// ==============================
exports.updateHoliday = async (req, res) => {
  try {
    const holiday = await Holiday.findByIdAndUpdate(
      req.params.id,
      {
        title: req.body.title,
        date: req.body.date,
        remark: req.body.remark,
      },
      { new: true }
    );

    res.json(holiday);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ==============================
// DELETE
// ==============================
exports.deleteHoliday = async (req, res) => {
  try {
    await Holiday.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};