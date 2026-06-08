// leadService.js
const Lead = require("../models/lead-portal/lead");

const createLead = async (leadData) => {
    try {
        // Prepare lead data object only with provided fields
        const data = {};
        if (leadData.name) data.name = leadData.name;
        if (leadData.email) data.email = leadData.email?.toLowerCase();
        if (leadData.phone) data.phone = leadData.phone;
        if (leadData.product) data.product = leadData.product;
        if (leadData.price) data.price = leadData.price;
        if (leadData.source) data.source = leadData.source;

        data.status = "new";

        // Check duplicate if email + product provided
        if (data.email && data.product) {
            const existing = await Lead.findOne({
                email: data.email,
                product: data.product,
            });
            if (existing) {
                return { success: false, message: "This user has already purchased this product." };
            }
        }

        const lead = await Lead.create(data);
        return { success: true, message: "Lead created successfully", data: lead };
    } catch (error) {
        return { success: false, message: error.message };
    }
};

module.exports = { createLead };