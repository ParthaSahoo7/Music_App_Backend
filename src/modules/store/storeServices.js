import Product from "../../models/Products.js";
import Cart from "../../models/Cart.js";
import Order from "../../models/Order.js";
import Address from "../../models/Address.js";

// create product service
const createProduct = async (productData, log) => {
  log.info("Creating product", { productData });
  try {
    const product = await Product.create(productData);
    log.info("Product created successfully", { productId: product.id });
    return product;
  } catch (error) {
    log.error("Error creating product", { error: error.message });
    throw new Error("Internal server error");
  }
};

// update product service
const updateProduct = async (id, productData, log) => {
  log.info("Updating product", { id, productData });
  try {
    const product = await Product.findByIdAndUpdate(id, productData, { new: true });
    if (!product) {
      log.warn("Product not found", { id });
      throw new Error("Product not found");
    }
    log.info("Product updated successfully", { productId: product.id });
    return product;
  } catch (error) {
    log.error("Error updating product", { error: error.message });
    throw new Error("Internal server error");
  }
};

// delete product service
const deleteProduct = async (id, log) => {
  log.info("Deleting product", { id });
  try {
    const result = await Product.findByIdAndDelete(id);
    if (!result) {
      log.warn("Product not found", { id });
      throw new Error("Product not found");
    }
    log.info("Product deleted successfully", { id });
    return true;
  } catch (error) {
    log.error("Error deleting product", { error: error.message });
    throw new Error("Internal server error");
  }
};

// get all products service
const getAllProducts = async (log) => {
  log.info("Fetching all products");
  try {
    const products = await Product.find();
    if (!products || products.length === 0) {
      log.warn("No products found");
      throw new Error("No products found");
    }
    log.info("Products fetched successfully", { count: products.length });
    return products;
  } catch (error) {
    log.error("Error fetching products", { error: error.message });
    throw new Error("Internal server error");
  }
};

// get product by id service
const getProductById = async (id, log) => {
  log.info("Fetching product by ID", { id });
  try {
    const product = await Product.findById(id);
    if (!product) {
      log.warn("Product not found", { id });
      throw new Error("Product not found");
    }
    log.info("Product fetched successfully", { productId: product.id });
    return product;
  } catch (error) {
    log.error("Error fetching product", { error: error.message });
    throw new Error("Internal server error");
  }
};

// get cart service
const getCart = async (userId, log) => {
  log.info("Fetching cart for user", { userId });
  console.log("Fetching cart for user", userId);
  if (!userId) {
    log.error("User ID is required to fetch cart"); 
    throw new Error("User ID is required to fetch cart");
  }
  try {
    const cart = await Cart.findOne({ user: userId }).populate('items.product');
    console.log("Cart fetched for user", userId, cart);
    if (!cart) {
      log.warn("Cart not found for user", { userId });
      throw new Error("Cart not found");
    }
    log.info("Cart fetched successfully", { userId, cartId: cart.id });
    return cart;
  } catch (error) {
    console.error("Error fetching cart", error);
    log.error("Error fetching cart", { error: error.message });
    throw new Error("Internal server error");
  }
};

// add product to cart service
const addToCart = async (userId, { productId, quantity }, log) => {
  log.info("Adding product to cart", { userId, productId, quantity });
  try {
    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      log.info("Creating new cart for user", { userId });
      cart = await Cart.create({ user: userId, items: [] });
    }
    const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);
    if (itemIndex > -1) {
      log.info("Updating existing cart item", { userId, productId });
      cart.items[itemIndex].quantity += quantity;
    } else {
      log.info("Adding new item to cart", { userId, productId });
      cart.items.push({ product: productId, quantity });
    }
    await cart.save();
    log.info("Product added to cart successfully", { userId, cartId: cart.id });
    return cart;
  } catch (error) {
    log.error("Error adding product to cart", { error: error.message });
    throw new Error("Internal server error");
  }
};

// remove product from cart service
const removeFromCart = async (userId, productId, log) => {
  log.info("Removing product from cart", { userId, productId });
  try {
    const cart = await Cart.findOneAndUpdate(
      { user: userId },
      { $pull: { items: { product: productId } } },
      { new: true }
    );
    if (!cart) {
      log.warn("Cart not found for user", { userId });
      throw new Error("Cart not found");
    }
    log.info("Product removed from cart successfully", { userId, cartId: cart.id });
    return cart;
  } catch (error) {
    log.error("Error removing product from cart", { error: error.message });
    throw new Error("Internal server error");
  }
};

// get address by user id service
const getAddressByUserId = async (userId, log) => {
  log.info("Fetching address for user", { userId });
  try {
    const address = await Address.findOne({ user: userId });
    if (!address) {
      log.warn("Address not found for user", { userId });
      throw new Error("Address not found");
    }
    log.info("Address fetched successfully", { userId, addressId: address.id });
    return address;
  } catch (error) {
    log.error("Error fetching address", { error: error.message });
    throw new Error("Internal server error");
  }
};

// get order by id service
const getOrderById = async (orderId, log) => {
  log.info("Fetching order by ID", { orderId });
  try {
    const order = await Order.findById(orderId).populate('items.product');
    if (!order) {
      log.warn("Order not found", { orderId });
      throw new Error("Order not found");
    }
    log.info("Order fetched successfully", { orderId: order.id });
    return order;
  } catch (error) {
    log.error("Error fetching order", { error: error.message });
    throw new Error("Internal server error");
  }
};

// get order history by user id service
const getOrderHistory = async (userId, log) => {
  log.info("Fetching order history for user", { userId });
  try {
    const orders = await Order.find({ user: userId }).populate('items.product');
    if (!orders || orders.length === 0) {
      log.warn("No orders found for user", { userId });
      throw new Error("No orders found");
    }
    log.info("Order history fetched successfully", { userId, count: orders.length });
    return orders;
  } catch (error) {
    log.error("Error fetching order history", { error: error.message });
    throw new Error("Internal server error");
  }
};

// checkout service
const checkout = async (userId, log) => {
  log.info("Checking out cart for user", { userId });
  try {
    const cart = await getCart(userId, log);
    if (!cart || cart.items.length === 0) {
      log.warn("Cart is empty for user", { userId });
      throw new Error("Cart is empty");
    }
    const order = await Order.create({
      user: userId,
      items: cart.items,
      total: cart.items.reduce((total, item) => total + (item.product.price * item.quantity), 0),
    });
    // Clear the cart after checkout
    await Cart.findOneAndUpdate({ user: userId }, { items: [] });
    log.info("Checkout successful", { orderId: order.id, userId });
    return order;
  } catch (error) {
    log.error("Error during checkout", { error: error.message });
    throw new Error("Internal server error");
  }
};

export default {
  createProduct,
  updateProduct,
  deleteProduct,
  getAllProducts,
  getProductById,
  getCart,
  addToCart,
  removeFromCart,
  getAddressByUserId,
  getOrderById,
  getOrderHistory,
  checkout,
};