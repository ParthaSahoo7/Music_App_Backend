import express from 'express';
import { check } from 'express-validator';
import authorizeUser from '../../middlewares/authorizeUser.js';
import storeController from './storeController.js'
// Define the router
const router = express.Router();

// create product

router.post(
  '/create-product',
  authorizeUser,
  [
    check('name', 'Product name is required').notEmpty(),
    check('price', 'Product price is required').isNumeric(),
    check('description', 'Product description is required').notEmpty(),
    check('category', 'Product category is required').notEmpty(),
  ],
  storeController.createProductController
);
// update product
router.put(
  '/update-product/:id',
  authorizeUser,
  [
    check('name', 'Product name is required').notEmpty(),
    check('price', 'Product price is required').isNumeric(),
    check('description', 'Product description is required').notEmpty(),
    check('category', 'Product category is required').notEmpty(),
  ],
  storeController.updateProductController
);
// delete product
router.delete(
  '/delete-product/:id',
  authorizeUser,
  storeController.deleteProductController
);
// get all product
router.get(
  '/products',
  authorizeUser,
  storeController.getAllProductsController
);
// get product by id
router.get(
  '/product/:id',
  authorizeUser,
  storeController.getProductByIdController
);

// get cart
router.get(
  '/cart',
  authorizeUser,
  storeController.getCartController
);

// add product to cart
router.post(
  '/add-to-cart',
  authorizeUser,
  [
    check('productId', 'Product ID is required').notEmpty(),
    check('quantity', 'Quantity is required').isNumeric(),
  ],
  storeController.addToCartController
);
// remove product from cart
router.delete(
  '/remove-from-cart/:productId',
  authorizeUser,
  storeController.removeFromCartController
);
// checkout cart
router.post(
  '/checkout',
  authorizeUser,
  storeController.checkoutController
);
// get order history
router.get(
  '/order-history',
  authorizeUser,
  storeController.getOrderHistoryController
);
// get order details
router.get(
  '/order/:orderId',
  authorizeUser,
  storeController.getOrderByIdController
);



// export the router
export default router;
