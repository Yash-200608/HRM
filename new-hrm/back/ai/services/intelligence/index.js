const { getAttritionRiskIndicators } = require("./attritionRiskService.js");
const { getBurnoutRiskIndicators } = require("./burnoutRiskService.js");
const { getPayrollAnomalies } = require("./payrollAnomalyService.js");
const { getSeatUtilizationAnalysis } = require("./seatUtilizationService.js");

module.exports = {
  getAttritionRiskIndicators,
  getBurnoutRiskIndicators,
  getPayrollAnomalies,
  getSeatUtilizationAnalysis,
};