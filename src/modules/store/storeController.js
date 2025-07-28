import { validationResult } from "express-validator";
import storeService from "./storeServices.js";
import {
  successResponse,
  errorResponse,
} from "../../utils/responseTemplate.js";
import { createRequestLogger } from "../../utils/requestLogger.js";

// create product controller
const createProductController = async (req, res) => {
  const log = createRequestLogger(req);
  log.info("Creating product", { body: req.body });
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    log.error("Validation errors", { errors: errors.array() });
    return res.status(400).json(errorResponse({ message: "Validation failed", errors: errors.array() }, 400));
  }

  try {
    const product = await storeService.createProduct(req.body, log);
    log.info("Product created successfully", { productId: product.id });
    return res.status(201).json(successResponse(product, "Product created successfully", 201));
  } catch (error) {
    log.error("Error creating product", { error: error.message });
    return res.status(500).json(errorResponse({ message: error.message }, 500));
  }
};

// update product controller
const updateProductController = async (req, res) => {
  const log = createRequestLogger(req);
  log.info("Updating product", { id: req.params.id, body: req.body });
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    log.error("Validation errors", { errors: errors.array() });
    return res.status(400).json(errorResponse({ message: "Validation failed", errors: errors.array() }, 400));
  }

  try {
    const product = await storeService.updateProduct(req.params.id, req.body, log);
    if (!product) {
      log.warn("Product not found", { id: req.params.id });
      return res.status(404).json(errorResponse({ message: "Product not found" }, 404));
    }
    log.info("Product updated successfully", { productId: product.id });
    return res.status(200).json(successResponse(product, "Product updated successfully", 200));
  } catch (error) {
    log.error("Error updating product", { error: error.message });
    return res.status(500).json(errorResponse({ message: error.message }, 500));
  }
};

// delete product controller
const deleteProductController = async (req, res) => {
  const log = createRequestLogger(req);
  log.info("Deleting product", { id: req.params.id });
  try {
    const result = await storeService.deleteProduct(req.params.id, log);
    if (!result) {
      log.warn("Product not found", { id: req.params.id });
      return res.status(404).json(errorResponse({ message: "Product not found" }, 404));
    }
    log.info("Product deleted successfully", { id: req.params.id });
    return res.status(200).json(successResponse({}, "Product deleted successfully", 200));
  } catch (error) {
    log.error("Error deleting product", { error: error.message });
    return res.status(500).json(errorResponse({ message: error.message }, 500));
  }
};

// get all products controller
const getAllProductsController = async (req, res) => {
  const log = createRequestLogger(req);
  log.info("Fetching all products");
  try {
    const products = await storeService.getAllProducts(log);
    if (!products || products.length === 0) {
      log.warn("No products found");
      return res.status(404).json(errorResponse({ message: "No products found" }, 404));
    }
    log.info("Products fetched successfully", { count: products.length });
    return res.status(200).json(successResponse(products, "Products fetched successfully", 200));
  } catch (error) {
    log.error("Error fetching products", { error: error.message });
    return res.status(500).json(errorResponse({ message: "Failed to fetch products. Please try again." }, 500));
  }
};

// get product by id controller
const getProductByIdController = async (req, res) => {
  const log = createRequestLogger(req);
  log.info("Fetching product by ID", { id: req.params.id });
  try {
    const product = await storeService.getProductById(req.params.id, log);
    if (!product) {
      log.warn("Product not found", { id: req.params.id });
      return res.status(404).json(errorResponse({ message: "Product not found" }, 404));
    }
    log.info("Product fetched successfully", { productId: product.id });
    return res.status(200).json(successResponse(product, "Product fetched successfully", 200));
  } catch (error) {
    log.error("Error fetching product", { error: error.message });
    return res.status(500).json(errorResponse({ message: error.message }, 500));
  }
};

// add to cart controller
const addToCartController = async (req, res) => {
  const log = createRequestLogger(req);
  log.info("Adding product to cart", { body: req.body });
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    log.error("Validation errors", { errors: errors.array() });
    return res.status(400).json(errorResponse({ message: "Validation failed", errors: errors.array() }, 400));
  }

  try {
    const cart = await storeService.addToCart(req.user.userId, req.body, log);
    log.info("Product added to cart successfully", { userId: req.user.userId });
    return res.status(200).json(successResponse(cart, "Product added to cart successfully", 200));
  } catch (error) {
    log.error("Error adding product to cart", { error: error.message });
    return res.status(500).json(errorResponse({ message: error.message }, 500));
  }
};

// remove from cart controller
const removeFromCartController = async (req, res) => {
  const log = createRequestLogger(req);
  log.info("Removing product from cart", { productId: req.params.productId });

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    log.error("Validation errors", { errors: errors.array() });
    return res.status(400).json(errorResponse({ message: "Validation failed", errors: errors.array() }, 400));
  }
  try {
    const cart = await storeService.removeFromCart(req.user.userId, req.params.productId, log);
    if (!cart) {
      log.warn("Product not found in cart", { productId: req.params.productId });
      return res.status(404).json(errorResponse({ message: "Product not found in cart" }, 404));
    }
    log.info("Product removed from cart successfully", { userId: req.user.userId });
    return res.status(200).json(successResponse(cart, "Product removed from cart successfully", 200));
  } catch (error) {
    log.error("Error removing product from cart", { error: error.message });
    return res.status(500).json(errorResponse({ message: error.message }, 500));
  }
};

// get cart controller
const getCartController = async (req, res) => {
  const log = createRequestLogger(req);
  
  log.info("Fetching cart for user", { userId: req.user.userId });
  try {
    const cart = await storeService.getCart(req.user.userId, log);
    if (!cart) {
      log.warn("Cart not found for user", { userId: req.user.userId });
      return res.status(404).json(errorResponse({ message: "Cart not found" }, 404));
    }
    log.info("Cart fetched successfully", { userId: req.user.userId });
    return res.status(200).json(successResponse(cart, "Cart fetched successfully", 200));
  } catch (error) {
    console.log("Error fetching cart", error);
    log.error("Error fetching cart", { error: error.message });
    return res.status(500).json(errorResponse({ message: error.message }, 500));
  }
};

// checkout controller
const checkoutController = async (req, res) => {
  const log = createRequestLogger(req);
  log.info("Checking out cart for user", { userId: req.user.userId });
  try {
    const order = await storeService.checkout(req.user.userId, log);
    if (!order) {
      log.warn("Cart is empty for user", { userId: req.user.userId });
      return res.status(400).json(errorResponse({ message: "Cart is empty" }, 400));
    }
    log.info("Checkout successful", { orderId: order.id, userId: req.user.userId });
    return res.status(200).json(successResponse(order, "Checkout successful", 200));
  } catch (error) {
    log.error("Error during checkout", { error: error.message });
    return res.status(500).json(errorResponse({ message: error.message }, 500));
  }
};

// get order history controller
const getOrderHistoryController = async (req, res) => {
  const log = createRequestLogger(req);
  log.info("Fetching order history for user", { userId: req.user.userId });
  try {
    const orders = await storeService.getOrderHistory(req.user.userId, log);
    if (!orders || orders.length === 0) {
      log.warn("No orders found for user", { userId: req.user.userId });
      return res.status(404).json(errorResponse({ message: "No orders found" }, 404));
    }
    log.info("Order history fetched successfully", { userId: req.user.userId, count: orders.length });
    return res.status(200).json(successResponse(orders, "Order history fetched successfully", 200));
  } catch (error) {
    log.error("Error fetching order history", { error: error.message });
    return res.status(500).json(errorResponse({ message: error.message }, 500));
  }
};

// get order by id controller
const getOrderByIdController = async (req, res) => {
  const log = createRequestLogger(req);
  log.info("Fetching order by ID", { orderId: req.params.orderId });
  try {
    const order = await storeService.getOrderById(req.params.orderId, log);
    if (!order) {
      log.warn("Order not found", { orderId: req.params.orderId });
      return res.status(404).json(errorResponse({ message: "Order not found" }, 404));
    }
    log.info("Order fetched successfully", { orderId: order.id });
    return res.status(200).json(successResponse(order, "Order fetched successfully", 200));
  } catch (error) {
    log.error("Error fetching order", { error: error.message });
    return res.status(500).json(errorResponse({ message: error.message }, 500));
  }
};

export default {
  createProductController,
  updateProductController,
  deleteProductController,
  getAllProductsController,
  getProductByIdController,
  addToCartController,
  removeFromCartController,
  getCartController,
  checkoutController,
  getOrderHistoryController,
  getOrderByIdController,
};