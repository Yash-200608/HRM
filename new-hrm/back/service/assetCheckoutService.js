function resolveCheckoutStatus(checkout, now = new Date()) {
  if (checkout.returnedAt) {
    return "RETURNED";
  }

  if (checkout.dueAt && new Date(checkout.dueAt) < now) {
    return "OVERDUE";
  }

  return "OPEN";
}

function assertAssetAvailableForCheckout(asset) {
  if (!asset) {
    const error = new Error("Asset not found");
    error.status = 404;
    throw error;
  }

  if (asset.status === "RETIRED" || asset.status === "MAINTENANCE") {
    const error = new Error(`Asset is ${asset.status.toLowerCase()} and cannot be checked out`);
    error.status = 409;
    throw error;
  }

  if (asset.assignedTo) {
    const error = new Error("Asset is already checked out");
    error.status = 409;
    throw error;
  }
}

module.exports = {
  assertAssetAvailableForCheckout,
  resolveCheckoutStatus,
};