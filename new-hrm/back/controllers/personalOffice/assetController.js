const Asset = require("../../models/personalOffice/assetModel.js");
const AssetCheckout = require("../../models/personalOffice/assetCheckoutModel.js");
const { recordAuditEvent } = require("../../service/auditService.js");
const {
  assertAssetAvailableForCheckout,
  resolveCheckoutStatus,
} = require("../../service/assetCheckoutService.js");

async function listAssets(req, res) {
  const filter = { companyId: req.user.companyId };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.category) filter.category = req.query.category;

  const assets = await Asset.find(filter)
    .populate("assignedTo", "fullName email")
    .sort({ updatedAt: -1 });

  return res.json({ data: assets });
}

async function createAsset(req, res) {
  const { name, category, serialNumber, assignedTo, status, purchaseDate, notes } = req.body;
  if (!name || !category) {
    return res.status(400).json({ message: "name and category are required" });
  }

  const asset = await Asset.create({
    companyId: req.user.companyId,
    name,
    category,
    serialNumber,
    assignedTo: assignedTo || null,
    status: assignedTo ? "ASSIGNED" : status || "AVAILABLE",
    purchaseDate,
    notes,
    createdBy: req.user.id,
  });

  await recordAuditEvent({
    actorId: req.user.id,
    actorRole: req.user.role,
    companyId: req.user.companyId,
    action: "asset.created",
    resourceType: "Asset",
    resourceId: String(asset._id),
    correlationId: req.correlationId,
  });

  return res.status(201).json({ data: asset });
}

async function updateAsset(req, res) {
  const asset = await Asset.findOne({ _id: req.params.id, companyId: req.user.companyId });
  if (!asset) {
    return res.status(404).json({ message: "Asset not found" });
  }

  const updates = req.body || {};
  if (updates.name != null) asset.name = updates.name;
  if (updates.category != null) asset.category = updates.category;
  if (updates.serialNumber != null) asset.serialNumber = updates.serialNumber;
  if (updates.assignedTo !== undefined) asset.assignedTo = updates.assignedTo || null;
  if (updates.status != null) asset.status = updates.status;
  if (updates.purchaseDate !== undefined) asset.purchaseDate = updates.purchaseDate;
  if (updates.notes != null) asset.notes = updates.notes;

  if (asset.assignedTo && asset.status === "AVAILABLE") {
    asset.status = "ASSIGNED";
  }

  await asset.save();
  return res.json({ data: asset });
}

async function retireAsset(req, res) {
  const asset = await Asset.findOneAndUpdate(
    { _id: req.params.id, companyId: req.user.companyId },
    { status: "RETIRED", assignedTo: null },
    { new: true }
  );

  if (!asset) {
    return res.status(404).json({ message: "Asset not found" });
  }

  return res.json({ data: asset });
}

async function checkoutAsset(req, res) {
  const { employeeId, dueAt, notes, conditionOut } = req.body;
  if (!employeeId) {
    return res.status(400).json({ message: "employeeId is required" });
  }

  const asset = await Asset.findOne({ _id: req.params.id, companyId: req.user.companyId });
  assertAssetAvailableForCheckout(asset);

  const openCheckout = await AssetCheckout.findOne({
    assetId: asset._id,
    companyId: req.user.companyId,
    returnedAt: null,
  });

  if (openCheckout) {
    return res.status(409).json({ message: "Asset already has an open checkout" });
  }

  asset.assignedTo = employeeId;
  asset.status = "ASSIGNED";
  await asset.save();

  const checkout = await AssetCheckout.create({
    companyId: req.user.companyId,
    assetId: asset._id,
    employeeId,
    dueAt: dueAt || null,
    notes: notes || "",
    conditionOut: conditionOut || "GOOD",
    performedBy: req.user.id,
    status: resolveCheckoutStatus({ dueAt, returnedAt: null }),
  });

  await recordAuditEvent({
    actorId: req.user.id,
    actorRole: req.user.role,
    companyId: req.user.companyId,
    action: "asset.checked_out",
    resourceType: "Asset",
    resourceId: String(asset._id),
    metadata: { employeeId, checkoutId: String(checkout._id) },
    correlationId: req.correlationId,
  });

  return res.status(201).json({ data: { asset, checkout } });
}

async function returnAsset(req, res) {
  const { conditionIn, notes } = req.body;
  const asset = await Asset.findOne({ _id: req.params.id, companyId: req.user.companyId });
  if (!asset) {
    return res.status(404).json({ message: "Asset not found" });
  }

  const checkout = await AssetCheckout.findOne({
    assetId: asset._id,
    companyId: req.user.companyId,
    returnedAt: null,
  }).sort({ checkedOutAt: -1 });

  if (!checkout) {
    return res.status(404).json({ message: "No open checkout found for this asset" });
  }

  checkout.returnedAt = new Date();
  checkout.conditionIn = conditionIn || "GOOD";
  if (notes) checkout.notes = `${checkout.notes || ""} ${notes}`.trim();
  checkout.status = "RETURNED";
  await checkout.save();

  asset.assignedTo = null;
  asset.status = "AVAILABLE";
  await asset.save();

  await recordAuditEvent({
    actorId: req.user.id,
    actorRole: req.user.role,
    companyId: req.user.companyId,
    action: "asset.returned",
    resourceType: "Asset",
    resourceId: String(asset._id),
    metadata: { checkoutId: String(checkout._id) },
    correlationId: req.correlationId,
  });

  return res.json({ data: { asset, checkout } });
}

async function listCheckoutHistory(req, res) {
  const history = await AssetCheckout.find({
    companyId: req.user.companyId,
    assetId: req.params.id,
  })
    .populate("employeeId", "fullName email")
    .populate("performedBy", "username email")
    .sort({ checkedOutAt: -1 });

  return res.json({ data: history });
}

module.exports = {
  listAssets,
  createAsset,
  updateAsset,
  retireAsset,
  checkoutAsset,
  returnAsset,
  listCheckoutHistory,
};