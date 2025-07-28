import express from "express";
import { check } from "express-validator";
import addressController from "./addressControllers.js";
import authorizeUser from "../../middlewares/authorizeUser.js";
const router = express.Router();


router.post(
  "/",
  [
    check("addressLine1", "Address Line 1 is required").notEmpty(),
    check("city", "City is required").notEmpty(),
    check("state", "State is required").notEmpty(),
    check("postalCode", "Postal Code is required").notEmpty(),
    check("country", "Country is required").notEmpty(),
  ],
  authorizeUser,
  addressController.addAddress
);

router.get(
  "/",
  authorizeUser,
  addressController.getAddresses
);
router.put(
  "/:id",
  [
    check("addressLine1", "Address Line 1 is required").notEmpty(),
    check("city", "City is required").notEmpty(),
    check("state", "State is required").notEmpty(),
    check("postalCode", "Postal Code is required").notEmpty(),
    check("country", "Country is required").notEmpty(),
  ],
  authorizeUser,
  addressController.updateAddress
);
router.delete(
  "/:id",
  authorizeUser,
  addressController.deleteAddress
);

router.get(
  "/:id",
  authorizeUser,
  addressController.getAddressById
);

router.get(
  "/default-address",
  authorizeUser,
  addressController.getDefaultAddress
);

router.put(
  "/default-address/:id",
  authorizeUser,
  addressController.setDefaultAddress
);

// export default router;
 export default router;

