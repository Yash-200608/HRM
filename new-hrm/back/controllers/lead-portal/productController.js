const Product = require("../../models/lead-portal/product");

/**
 * @desc    Add Product
 * @route   POST /api/products
 */
const addProduct = async (req, res) => {
  try {
    const { name, description, price, duration, modules } = req.body;

    if (!name || price === undefined || !duration?.value || !duration?.unit) {
      return res.status(400).json({
        success: false,
        message: "Name, price and duration are required",
      });
    }

    // Check duplicate name
    const existingProduct = await Product.findOne({ name: name.trim() });

    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: "Course with this name already exists",
      });
    }

    const product = await Product.create({
      name: name.trim(),
      description,
      price,
      duration: {
        value: duration.value,
        unit: duration.unit,
      },
      modules: modules || [],
    });

    res.status(201).json({
      success: true,
      message: "Course created successfully",
      data: product,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


/**
 * @desc    Get All Products
 * @route   GET /api/products
 */
const getProducts = async (req, res) => {
  try {

    const products = await Product.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: products.length,
      data: products,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};


/**
 * @desc    Get Product By ID
 * @route   GET /api/products/:id
 */
const getProductById = async (req, res) => {
  try {

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    res.status(200).json({
      success: true,
      data: product,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: "Invalid course ID",
    });

  }
};


/**
 * @desc    Update Product
 * @route   PUT /api/products/:id
 */
const updateProduct = async (req, res) => {
  try {

    const { name, description, price, duration, modules } = req.body;

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Check duplicate name
    if (name && name !== product.name) {

      const existingProduct = await Product.findOne({
        name: name.trim(),
      });

      if (existingProduct) {
        return res.status(400).json({
          success: false,
          message: "Another course with this name already exists",
        });
      }

    }

    product.name = name ?? product.name;
    product.description = description ?? product.description;
    product.price = price ?? product.price;

    if (duration) {
      product.duration = {
        value: duration.value ?? product.duration.value,
        unit: duration.unit ?? product.duration.unit,
      };
    }

    if (modules) {
      product.modules = modules;
    }

    await product.save();

    res.status(200).json({
      success: true,
      message: "Course updated successfully",
      data: product,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};


/**
 * @desc    Delete Product
 * @route   DELETE /api/products/:id
 */
const deleteProduct = async (req, res) => {
  try {

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    await product.deleteOne();

    res.status(200).json({
      success: true,
      message: "Course deleted successfully",
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: "Invalid course ID",
    });

  }
};


module.exports = {
  addProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
};