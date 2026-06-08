const Lead = require("../../models/lead-portal/lead");
const Payment = require("../../models/lead-portal/Payment");
const {createLead} = require("../../service/leadService");

const addLead = async (req, res) => {
   const result = await createLead(req.body);

    if (!result.success) {
        return res.status(400).json(result);
    }

    res.status(201).json(result);
};
/**
 * @desc    Get All Leads
 * @route   GET /api/leads
 */
const getLeads = async (req, res) => {
  try {
    const { currentMonth } = req.query; // expected format: "YYYY-MM" e.g., "2026-03"

    let filter = {};

    if (currentMonth) {
      const [yearStr, monthStr] = currentMonth.split("-");
      const year = parseInt(yearStr);
      const month = parseInt(monthStr);

      if (!isNaN(year) && !isNaN(month)) {
        const startDate = new Date(year, month - 1, 1); // 0-indexed month
        const endDate = new Date(year, month, 1); // first day of next month

        filter.createdAt = { $gte: startDate, $lt: endDate };
      }
    }

    const leads = await Lead.find(filter)
      .populate("product")
      .populate("payment")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: leads.length,
      data: leads,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
/**
 * @desc    Get Single Lead
 * @route   GET /api/leads/:id
 */
const getLeadById = async (req, res) => {
    try {
        const lead = await Lead.findById(req.params.id).populate("productId");

        if (!lead) {
            return res.status(404).json({
                success: false,
                message: "Lead not found",
            });
        }

        res.status(200).json({
            success: true,
            data: lead,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * @desc    Update Lead
 * @route   PUT /api/leads/:id
 */
const updateLead = async (req, res) => {
    try {
        const lead = await Lead.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!lead) {
            return res.status(404).json({
                success: false,
                message: "Lead not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Lead updated successfully",
            data: lead,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * @desc    Delete Lead
 * @route   DELETE /api/leads/:id
 */
const deleteLead = async (req, res) => {
    try {
        const lead = await Lead.findByIdAndDelete(req.params.id);

        if (!lead) {
            return res.status(404).json({
                success: false,
                message: "Lead not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Lead deleted successfully",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

const updateLeadStatus = async (req, res) => {
    try {
        const { id, status } = req.body;
        const lead = await Lead.findByIdAndUpdate(
            id,
            { status },
            { new: true, runValidators: true }
        );

        if (!lead) {
            return res.status(404).json({
                success: false,
                message: "Lead not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Lead status updated successfully",
            data: lead,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};




const addPayment = async (req, res) => {
  try {
    const { leadId, amountPaid, paymentMode, finalPrice, joinDate } = req.body;

    // Required fields validation
    if (!leadId || finalPrice === undefined || !joinDate) {
      return res.status(400).json({
        message: "leadId, finalPrice and joinDate fields are required.",
      });
    }

    const lead = await Lead.findById(leadId);
    if (!lead) {
      return res.status(404).json({ message: "Lead Not Found." });
    }

    // amountPaid optional
    let numericAmount = 0;

    if (amountPaid !== undefined && amountPaid !== "") {
      numericAmount = Number(amountPaid);

      if (isNaN(numericAmount) || numericAmount < 0) {
        return res.status(400).json({ message: "Invalid amountPaid value." });
      }
    }

    // Determine paymentStatus
    let paymentStatus;

    if (numericAmount === 0) {
      paymentStatus = "pending";
    } else if (numericAmount < lead.price) {
      paymentStatus = "partial";
    } else {
      paymentStatus = "paid";
    }

    // Create payment object
    const paymentData = {
      lead: leadId,
      paymentStatus,
      finalPrice:finalPrice
    };

    // Optional fields add only if present
    if (numericAmount > 0) {
      paymentData.amountPaid = numericAmount;
    }

    if (paymentMode) {
      paymentData.paymentMode = paymentMode;
    }
    if(joinDate) {
        paymentData.joinDate = joinDate;
    }

    const payment = new Payment(paymentData);

    await payment.save();

    // Update Lead
    lead.payment = payment._id;
    lead.status = "enrolled";
    await lead.save();

    return res.status(201).json({
      success: true,
      message: "Payment Added Successfully",
      data: payment,
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


const updatePaymentStatus = async(req,res) => {
     try{
        const {leadId, paymentId, status} = req.body;
        if (!leadId || !paymentId || !status) {
      return res.status(400).json({
        message: "leadId, paymentId or status fields are required.",
      });
    }

    const lead = await Payment.findOneAndUpdate({_id:paymentId, lead:leadId},{$set:{paymentStatus: status}},{ new: true });
    if (!lead) {
      return res.status(404).json({ message: "Lead Not Found." });
    }
    res.status(200).json({message:"Payment Status Updated Successfully."})
     }
     catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

module.exports = {
    addLead,
    getLeads,
    getLeadById,
    updateLead,
    deleteLead,
    updateLeadStatus,
    addPayment,
    updatePaymentStatus
};
